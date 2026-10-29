"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { SignaturePad, type Adoption } from "@/components/signature-pad";
import { Button, Input, Label, Notice, cn } from "@/components/ui";
import { cleanLegalName, fillText, initialSections, type FrozenDocument } from "@/lib/document";
import type { ShownStatus } from "@/lib/envelopes";
import { formatShortStamp, formatStamp } from "@/lib/timezone";

/**
 * One screen: who you are and consent, your signature, the agreement with a gold tab at the end of
 * each key section, then sign. Every tap goes to the server at once (POST /api/sign/<token>/event),
 * which stamps the time, the address it came from and the device, so the record is written as the
 * signer goes, not at the end. A reload picks up where they were.
 */
type Props = {
  token: string;
  status: ShownStatus;
  doc: FrozenDocument;
  today: string;
  signer: { nameHint: string; emailHint: string; name: string | null; email: string | null; signaturePng: string | null; initialsPng: string | null };
  initialed: Record<string, string>;
  consentedAt: string | null;
  completedAt: string | null;
  emailConfigured: boolean;
};

type Done = { completedAt: string; emailed: boolean; already?: boolean };

export function SignView(props: Props) {
  const { token, doc, today } = props;
  const [name, setName] = useState(props.signer.name ?? props.signer.nameHint);
  const [email, setEmail] = useState(props.signer.email ?? props.signer.emailHint);
  const [consent, setConsent] = useState(!!props.consentedAt);
  const [consentedAt, setConsentedAt] = useState(props.consentedAt);
  const [adoption, setAdoption] = useState<{ signaturePng: string; initialsPng: string; name: string } | null>(
    props.signer.signaturePng && props.signer.initialsPng && props.signer.name ? { signaturePng: props.signer.signaturePng, initialsPng: props.signer.initialsPng, name: props.signer.name } : null,
  );
  const [initialed, setInitialed] = useState<Record<string, string>>(props.initialed);
  const [showPad, setShowPad] = useState(false);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<Done | null>(props.status === "completed" && props.completedAt ? { completedAt: props.completedAt, emailed: false, already: true } : null);
  const [nudge, setNudge] = useState(false);
  const tabRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const topRef = useRef<HTMLDivElement | null>(null);
  const signRef = useRef<HTMLDivElement | null>(null);

  const required = useMemo(() => initialSections(doc), [doc]);
  const remaining = required.filter((s) => !initialed[s.key]);
  const allInitialed = remaining.length === 0;
  const signable = props.status === "sent" || props.status === "opened";
  const fill = { signerName: adoption?.name || cleanLegalName(name) || "the undersigned", effectiveDate: today };

  const post = async (path: string, body: Record<string, unknown>) => {
    const res = await fetch(`/api/sign/${token}/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "omit",
      body: JSON.stringify(body),
    });
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) {
      const code = typeof data.error === "string" ? data.error : "failed";
      if (code === "voided" || code === "expired" || code === "completed" || code === "not_found") {
        window.location.reload();
        throw new Error("This agreement changed. Reloading...");
      }
      const messages: Record<string, string> = {
        bad_name: "Type your full legal name (letters only).",
        bad_email: "That email doesn't look right.",
        bad_image: "The signature image didn't come through. Try again.",
        not_consented: "Check the box to agree to sign electronically first.",
        not_adopted: "Create your signature first.",
        incomplete: "Something is still missing above.",
        too_many_events: "Too many taps from this link. Ask for a new one.",
        database: "The server can't reach its database right now. Try again in a minute.",
      };
      throw new Error(messages[code] ?? "Something went wrong. Try again.");
    }
    return data;
  };

  // The open itself is recorded once the page is really on a screen (link previews never run this).
  useEffect(() => {
    if (!signable) return;
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const screen = `${window.screen.width}x${window.screen.height}`;
    post("event", { kind: "opened", details: { tz, screen } }).catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, signable]);

  const scrollTo = (el: HTMLElement | null) => el?.scrollIntoView({ behavior: "smooth", block: "center" });
  const nextTab = () => (remaining.length ? tabRefs.current[remaining[0].key] : signRef.current);

  const startSignature = async () => {
    setError(null);
    const legal = cleanLegalName(name);
    if (!legal) return setError("Type your full legal name first (first and last).");
    if (!consent) return setError("Check the box to agree to sign electronically.");
    setBusyKey("consent");
    try {
      if (!consentedAt) {
        const r = await post("event", { kind: "consented", details: { tz: Intl.DateTimeFormat().resolvedOptions().timeZone } });
        setConsentedAt(String(r.at));
      }
      setShowPad(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Try again.");
    } finally {
      setBusyKey(null);
    }
  };

  const adopt = async (a: Adoption) => {
    const legal = cleanLegalName(name) ?? "";
    await post("event", { kind: "adopted", details: { name: legal, email: email.trim() || null, method: a.method, style: a.style, signaturePng: a.signaturePng, initialsPng: a.initialsPng } });
    setAdoption({ signaturePng: a.signaturePng, initialsPng: a.initialsPng, name: legal });
    setShowPad(false);
    setTimeout(() => scrollTo(nextTab()), 150);
  };

  const initial = async (key: string) => {
    setError(null);
    if (!adoption) {
      setNudge(true);
      scrollTo(topRef.current);
      setError("Create your signature first, then tap the gold tabs.");
      return;
    }
    if (initialed[key] || busyKey) return;
    setBusyKey(key);
    try {
      const r = await post("event", { kind: "initialed", section: key });
      const at = String(r.at);
      const next = { ...initialed, [key]: at };
      setInitialed(next);
      const left = required.filter((s) => !next[s.key]);
      setTimeout(() => scrollTo(left.length ? tabRefs.current[left[0].key] : signRef.current), 200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Try again.");
    } finally {
      setBusyKey(null);
    }
  };

  const finish = async () => {
    setError(null);
    if (!adoption || !allInitialed) return;
    setBusyKey("finish");
    try {
      const r = await post("complete", {});
      setDone({ completedAt: String(r.completedAt), emailed: r.emailed === true, already: r.already === true });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Try again.");
    } finally {
      setBusyKey(null);
    }
  };

  // --- Not signable: say why ---
  if (props.status === "voided" || props.status === "expired") {
    return (
      <div className="mx-auto w-full max-w-md px-4 pt-16 text-center">
        <h1 className="text-[22px] font-extrabold tracking-[-0.03em] text-gray-900">{props.status === "voided" ? "This agreement was canceled" : "This link has expired"}</h1>
        <p className="mt-2 text-[14px] text-gray-600">
          {props.status === "voided" ? `${doc.company.name} canceled this signing request.` : `Signing links work for two weeks. Ask ${doc.company.ownerName} for a new one.`}
        </p>
      </div>
    );
  }

  // --- Signed ---
  if (done) {
    const sent = email.trim();
    return (
      <div className="mx-auto w-full max-w-md px-4 pt-12">
        <div className="rounded-[28px] bg-surface p-6 text-center shadow-card">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-done text-done-text">
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M5 12.5l4.5 4.5L19 7.5" />
            </svg>
          </div>
          <h1 className="mt-4 text-[24px] font-extrabold tracking-[-0.03em] text-gray-900">Signed</h1>
          <p className="mt-1 text-[14px] text-gray-600">
            {doc.title} with {doc.company.name}, completed {formatStamp(done.completedAt)}.
          </p>
          <a
            href={`/api/sign/${token}/pdf`}
            target="_blank"
            rel="noopener"
            className="mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-2xl bg-tide-strong px-4 text-[15px] font-bold text-white shadow-glow"
          >
            Open your signed copy (PDF)
          </a>
          <a href={`/api/sign/${token}/pdf?download=1`} className="mt-2 inline-flex min-h-11 w-full items-center justify-center rounded-2xl text-sm font-bold text-accent-text">
            Download it
          </a>
          <p className="mt-4 text-[12px] leading-snug text-gray-500">
            {done.emailed && sent ? `A copy was also emailed to ${sent}. ` : ""}
            Keep this link: it opens your signed copy any time. The PDF ends with a certificate listing every step you took, with its time and network address.
          </p>
        </div>
      </div>
    );
  }

  const initialsCount = required.length - remaining.length;

  return (
    <div className="mx-auto w-full max-w-2xl px-4 pt-5 pb-28">
      {/* Header */}
      <div className="px-1">
        <p className="text-[12px] font-bold tracking-wide text-gray-500 uppercase">{doc.company.name}</p>
        <h1 className="mt-1 text-[26px] leading-tight font-extrabold tracking-[-0.03em] text-gray-900">{doc.title}</h1>
        <p className="mt-1 text-[14px] text-gray-600">Please read it, tap the {required.length} gold tabs to initial, and sign at the bottom.</p>
        <a href={`/api/sign/${token}/draft`} target="_blank" rel="noopener" className="mt-1 inline-block text-[13px] font-semibold text-accent-text">
          Open an unsigned copy to read, save or print first
        </a>
      </div>

      {/* Step 1: who you are */}
      <div ref={topRef} className={cn("mt-4 rounded-[22px] bg-surface p-4 shadow-card transition", nudge && !adoption && "ring-2 ring-tab-line")}>
        {adoption ? (
          <div className="flex items-center gap-3">
            <div className="flex h-14 w-36 shrink-0 items-center justify-center rounded-xl bg-paper px-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={adoption.signaturePng} alt={`Signature of ${adoption.name}`} className="max-h-12 max-w-full" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-bold text-gray-500 uppercase">Signing as</p>
              <p className="truncate text-[15px] font-bold text-gray-900">{adoption.name}</p>
              <button type="button" className="mt-0.5 text-[13px] font-semibold text-accent-text" onClick={() => setShowPad(true)}>
                Change signature
              </button>
            </div>
          </div>
        ) : (
          <>
            <p className="text-[12px] font-bold text-gray-500 uppercase">Step 1 of 3</p>
            <h2 className="mt-0.5 text-[17px] font-extrabold tracking-[-0.02em] text-gray-900">Your name</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="name">Full legal name</Label>
                <Input id="name" name="name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="First and last name" maxLength={80} />
              </div>
              <div>
                <Label htmlFor="email">Email for your copy (optional)</Label>
                <Input id="email" name="email" type="email" autoComplete="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" maxLength={120} />
              </div>
            </div>
            <label className="mt-3 flex cursor-pointer items-start gap-3 rounded-xl bg-gray-50 p-3">
              <input type="checkbox" className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--t-accent)]" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
              <span className="text-[13px] leading-snug text-gray-700">
                I agree to sign this agreement electronically and to receive my copy electronically. My typed name, the signature I adopt and each tap I make are my signature, and I understand the time, network address and device of each tap are recorded. I can ask {doc.company.ownerName} for a paper copy at any time.
              </span>
            </label>
            {error && !busyKey && <p className="mt-2 text-[13px] font-medium text-red-700">{error}</p>}
            <Button type="button" className="mt-3 w-full rounded-2xl" onClick={startSignature} disabled={busyKey === "consent"}>
              {busyKey === "consent" ? "One moment..." : "Create my signature"}
            </Button>
          </>
        )}
      </div>

      {/* Step 2: the agreement, on paper */}
      <div className="mt-4 rounded-[22px] bg-paper px-5 py-6 text-paper-text shadow-card sm:px-8 sm:py-8">
        <p className="text-[11px] font-bold tracking-wide text-paper-muted uppercase">{adoption ? "Step 2 of 3: read and initial" : "Step 2 of 3 (after your signature)"}</p>
        <h2 className="mt-2 text-center text-[18px] font-extrabold tracking-[-0.02em]">{doc.title}</h2>
        <p className="mt-1 text-center text-[12px] text-paper-muted">Effective {today}</p>
        <div className="mt-5 space-y-3 text-[14.5px] leading-[1.55]">
          {doc.intro.map((p, i) => (
            <p key={i}>{fillText(p, fill)}</p>
          ))}
        </div>
        {doc.sections.map((s, i) => {
          const at = initialed[s.key];
          const isNext = !!adoption && remaining[0]?.key === s.key;
          return (
            <section key={s.key} className="mt-6">
              <h3 className="text-[15px] font-extrabold">
                {i + 1}. {s.heading}
              </h3>
              <div className="mt-2 space-y-3 text-[14.5px] leading-[1.55]">
                {s.paragraphs.map((p, j) => (
                  <p key={j}>{fillText(p, fill)}</p>
                ))}
              </div>
              {s.initial && (
                <div
                  ref={(el) => {
                    tabRefs.current[s.key] = el;
                  }}
                  className="mt-3 flex justify-end"
                >
                  {at && adoption ? (
                    <div className="flex items-center gap-3 rounded-xl border border-tab-line/60 px-3 py-2" style={{ backgroundColor: "color-mix(in srgb, var(--t-tab) 14%, var(--t-paper))" }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={adoption.initialsPng} alt={`Initials of ${adoption.name}`} className="h-9 w-auto" />
                      <div className="text-[11px] leading-tight text-paper-muted">
                        <div className="font-bold text-paper-text">Initialed</div>
                        <div>{formatShortStamp(at)}</div>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => initial(s.key)}
                      disabled={busyKey === s.key}
                      aria-label={`Initial here: ${s.heading}`}
                      className={cn(
                        "inline-flex min-h-11 items-center gap-2 rounded-xl border border-tab-line bg-tab px-4 text-[14px] font-extrabold text-tab-text shadow-card transition active:scale-[0.98]",
                        isNext && "tab-waiting",
                        !adoption && "opacity-70",
                      )}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                        <path d="M12 20h9" />
                        <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
                      </svg>
                      {busyKey === s.key ? "Saving..." : "Initial here"}
                    </button>
                  )}
                </div>
              )}
            </section>
          );
        })}

        <section className="mt-8">
          <h3 className="text-[15px] font-extrabold">Acknowledgment</h3>
          <ul className="mt-2 list-disc space-y-1.5 pl-5 text-[14.5px] leading-[1.5]">
            {doc.acknowledgment.map((a, i) => (
              <li key={i}>{fillText(a, fill)}</li>
            ))}
          </ul>
        </section>

        {/* Step 3: sign */}
        <section ref={signRef} className="mt-8 border-t border-paper-line pt-6">
          <p className="text-[11px] font-bold tracking-wide text-paper-muted uppercase">Step 3 of 3: sign</p>
          <div className="mt-4 grid gap-6 sm:grid-cols-2">
            <div>
              <p className="text-[11px] font-bold text-paper-muted uppercase">Recipient</p>
              <div className="mt-2 flex h-20 items-end border-b-2 border-paper-text">
                {adoption ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={adoption.signaturePng} alt="Your signature" className="max-h-16" />
                ) : (
                  <span className="pb-2 text-[13px] text-paper-muted">Your signature appears here</span>
                )}
              </div>
              <p className="mt-1.5 text-[13px] font-bold">{fill.signerName}</p>
              <p className="text-[12px] text-paper-muted">Date: {today}</p>
            </div>
            <div>
              <p className="text-[11px] font-bold text-paper-muted uppercase">The Company</p>
              <div className="mt-2 flex h-20 items-end border-b-2 border-paper-text">
                <span className="pb-2 text-[15px] font-bold">{doc.company.name}</span>
              </div>
              <p className="mt-1.5 text-[13px] font-bold">
                By {doc.company.ownerName}
                {doc.company.ownerTitle ? `, ${doc.company.ownerTitle}` : ""}
              </p>
              <p className="text-[12px] text-paper-muted">Issued and accepted electronically</p>
            </div>
          </div>
          {error && busyKey !== "consent" && (
            <div className="mt-4">
              <Notice tone="red">{error}</Notice>
            </div>
          )}
          <Button type="button" className="mt-5 h-13 w-full rounded-2xl text-[16px]" onClick={finish} disabled={!adoption || !allInitialed || busyKey === "finish"}>
            {busyKey === "finish" ? "Sealing your agreement..." : "Sign and finish"}
          </Button>
          {!allInitialed && adoption && (
            <p className="mt-2 text-center text-[12px] text-paper-muted">
              {remaining.length} gold {remaining.length === 1 ? "tab" : "tabs"} left to initial.
            </p>
          )}
          <p className="mt-3 text-center text-[11px] leading-snug text-paper-muted">
            Tapping Sign and finish signs this agreement. The time, your network address and your device are recorded with it, and your copy is made at once.
          </p>
        </section>
      </div>

      {/* Progress bar at the bottom while signing */}
      {adoption && (
        <div className="pb-safe fixed inset-x-0 bottom-0 z-40 px-4">
          <div className="mx-auto flex max-w-2xl items-center gap-3 rounded-2xl bg-surface p-2 pl-4 shadow-float">
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-bold text-gray-900">{allInitialed ? "All initialed" : `${initialsCount} of ${required.length} initialed`}</p>
              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-track">
                <div className="h-full rounded-full bg-tab transition-all" style={{ width: `${Math.round((initialsCount / Math.max(1, required.length)) * 100)}%` }} />
              </div>
            </div>
            {allInitialed ? (
              <Button type="button" className="rounded-xl" onClick={finish} disabled={busyKey === "finish"}>
                Sign and finish
              </Button>
            ) : (
              <Button type="button" variant="gold" className="rounded-xl" onClick={() => scrollTo(nextTab())}>
                Next tab
              </Button>
            )}
          </div>
        </div>
      )}

      {showPad && <SignaturePad name={cleanLegalName(name) ?? name} onAdopt={adopt} onCancel={() => setShowPad(false)} />}
    </div>
  );
}
