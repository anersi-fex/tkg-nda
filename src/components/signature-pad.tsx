"use client";

import { useEffect, useRef, useState } from "react";
import { Button, cn } from "@/components/ui";
import { initialsOf } from "@/lib/document";

/**
 * Adopting a signature, the way DocuSign does it: type your name and pick a style, or draw with a
 * finger. Either way the result is two PNG images (signature and initials) drawn in the browser,
 * so what the signer saw is exactly what goes on the PDF. Everything here is local until the
 * signer taps "Adopt and continue".
 */
export type Adoption = { method: "typed" | "drawn"; style: string | null; signaturePng: string; initialsPng: string };

export const SIGNATURE_STYLES = [
  { key: "caveat", label: "Caveat", family: "Sig Caveat", className: "font-sig-caveat", weight: 600, scale: 1 },
  { key: "dancing", label: "Dancing Script", family: "Sig Dancing", className: "font-sig-dancing", weight: 600, scale: 0.92 },
  { key: "apple", label: "Homemade Apple", family: "Sig Apple", className: "font-sig-apple", weight: 400, scale: 0.72 },
] as const;
type StyleKey = (typeof SIGNATURE_STYLES)[number]["key"];

const INK = "#15171c";

function renderTyped(text: string, family: string, weight: number, w: number, h: number, scale: number): string {
  const canvas = document.createElement("canvas");
  canvas.width = w * 2;
  canvas.height = h * 2;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas");
  ctx.scale(2, 2);
  let size = Math.round(h * 0.56 * scale);
  const font = (px: number) => `${weight} ${px}px "${family}", cursive`;
  ctx.font = font(size);
  while (size > 12 && ctx.measureText(text).width > w * 0.9) {
    size -= 2;
    ctx.font = font(size);
  }
  ctx.fillStyle = INK;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, w / 2, h / 2 + size * 0.04);
  return canvas.toDataURL("image/png");
}

async function loadFonts() {
  if (!("fonts" in document)) return;
  await Promise.all(SIGNATURE_STYLES.map((s) => document.fonts.load(`${s.weight} 40px "${s.family}"`).catch(() => undefined)));
}

/** A finger-drawing pad; `onChange` says whether anything is drawn. */
function DrawPad({ height, label, padRef, onChange }: { height: number; label: string; padRef: React.RefObject<HTMLCanvasElement | null>; onChange: (hasInk: boolean) => void }) {
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);
  const strokes = useRef(0);

  useEffect(() => {
    const canvas = padRef.current;
    if (!canvas) return;
    const ratio = Math.min(window.devicePixelRatio || 1, 3);
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.round(rect.width * ratio);
    canvas.height = Math.round(rect.height * ratio);
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.scale(ratio, ratio);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.lineWidth = 2.6;
      ctx.strokeStyle = INK;
    }
  }, [padRef]);

  const point = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };
  const down = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    drawing.current = true;
    last.current = point(e);
    const ctx = e.currentTarget.getContext("2d");
    if (ctx && last.current) {
      ctx.beginPath();
      ctx.arc(last.current.x, last.current.y, 1.3, 0, Math.PI * 2);
      ctx.fillStyle = INK;
      ctx.fill();
    }
  };
  const move = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current || !last.current) return;
    const ctx = e.currentTarget.getContext("2d");
    const p = point(e);
    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(last.current.x, last.current.y);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
    }
    last.current = p;
  };
  const up = () => {
    if (!drawing.current) return;
    drawing.current = false;
    last.current = null;
    strokes.current += 1;
    onChange(true);
  };
  const clear = () => {
    const canvas = padRef.current;
    const ctx = canvas?.getContext("2d");
    if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    strokes.current = 0;
    onChange(false);
  };
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-600">{label}</span>
        <button type="button" onClick={clear} className="text-xs font-semibold text-accent-text">
          Clear
        </button>
      </div>
      <canvas
        ref={padRef}
        style={{ height }}
        className="touch-none w-full rounded-xl border border-dashed border-gray-300 bg-paper"
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        onPointerLeave={up}
        aria-label={label}
      />
    </div>
  );
}

export function SignaturePad({ name, onAdopt, onCancel }: { name: string; onAdopt: (a: Adoption) => Promise<void>; onCancel: () => void }) {
  const [tab, setTab] = useState<"type" | "draw">("type");
  const [style, setStyle] = useState<StyleKey>("caveat");
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSig, setHasSig] = useState(false);
  const [hasInit, setHasInit] = useState(false);
  const sigPad = useRef<HTMLCanvasElement | null>(null);
  const initPad = useRef<HTMLCanvasElement | null>(null);
  const initials = initialsOf(name);

  useEffect(() => {
    let alive = true;
    loadFonts().then(() => {
      if (alive) setReady(true);
    });
    return () => {
      alive = false;
    };
  }, []);

  const adopt = async () => {
    setError(null);
    setBusy(true);
    try {
      await loadFonts();
      if (tab === "type") {
        const s = SIGNATURE_STYLES.find((x) => x.key === style)!;
        const signaturePng = renderTyped(name, s.family, s.weight, 600, 200, s.scale);
        const initialsPng = renderTyped(initials, s.family, s.weight, 240, 160, s.scale);
        await onAdopt({ method: "typed", style: s.key, signaturePng, initialsPng });
      } else {
        if (!hasSig || !sigPad.current) throw new Error("Draw your signature first.");
        const signaturePng = sigPad.current.toDataURL("image/png");
        const s = SIGNATURE_STYLES[0];
        const initialsPng = hasInit && initPad.current ? initPad.current.toDataURL("image/png") : renderTyped(initials, s.family, s.weight, 240, 160, s.scale);
        await onAdopt({ method: "drawn", style: null, signaturePng, initialsPng });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Try again.");
      setBusy(false);
    }
  };

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="adopt-title" className="fixed inset-0 z-50 flex items-end justify-center bg-gray-900/50 sm:items-center">
      <div className="pb-safe w-full max-w-lg rounded-t-[28px] bg-surface p-5 shadow-float sm:rounded-[28px]">
        <h2 id="adopt-title" className="text-[20px] font-extrabold tracking-[-0.02em] text-gray-900">
          Your signature
        </h2>
        <p className="mt-1 text-[13px] text-gray-600">Pick a style, or draw it with your finger. It becomes your signature and initials on this agreement.</p>

        <div role="tablist" className="mt-4 grid grid-cols-2 gap-1 rounded-xl bg-track p-1">
          {(["type", "draw"] as const).map((t) => (
            <button
              key={t}
              role="tab"
              type="button"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              className={cn("min-h-10 rounded-lg text-sm font-semibold transition", tab === t ? "bg-segment text-gray-900 shadow-card" : "text-gray-600")}
            >
              {t === "type" ? "Type" : "Draw"}
            </button>
          ))}
        </div>

        {tab === "type" ? (
          <div className="mt-4 space-y-2" role="radiogroup" aria-label="Signature style">
            {SIGNATURE_STYLES.map((s) => (
              <button
                key={s.key}
                type="button"
                role="radio"
                aria-checked={style === s.key}
                onClick={() => setStyle(s.key)}
                className={cn(
                  "flex w-full items-center justify-between gap-3 rounded-2xl border bg-paper px-4 py-3 text-left text-paper-text transition",
                  style === s.key ? "border-accent ring-2 ring-tint" : "border-paper-line",
                )}
              >
                <span className={cn(s.className, "min-w-0 truncate leading-none")} style={{ fontSize: Math.round(34 * s.scale) }}>
                  {ready ? name : " "}
                </span>
                <span className={cn(s.className, "shrink-0 rounded-lg border border-paper-line px-2 py-1 leading-none")} style={{ fontSize: Math.round(22 * s.scale) }}>
                  {ready ? initials : " "}
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            <DrawPad height={150} label="Signature" padRef={sigPad} onChange={setHasSig} />
            <DrawPad height={96} label={`Initials (${initials}) - optional, typed if left blank`} padRef={initPad} onChange={setHasInit} />
          </div>
        )}

        {error && <p className="mt-3 text-[13px] font-medium text-red-700">{error}</p>}
        <p className="mt-4 text-[12px] leading-snug text-gray-500">
          By tapping Adopt and continue, I agree that this is my electronic signature and initials, with the same legal effect as my handwriting.
        </p>
        <div className="mt-3 flex gap-2">
          <Button type="button" variant="secondary" className="flex-1 rounded-2xl" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
          <Button type="button" className="flex-[2] rounded-2xl" onClick={adopt} disabled={busy || !ready || (tab === "draw" && !hasSig)}>
            {busy ? "Saving..." : "Adopt and continue"}
          </Button>
        </div>
      </div>
    </div>
  );
}
