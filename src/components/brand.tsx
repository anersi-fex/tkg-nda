import { cn } from "@/components/ui";

/**
 * Ink brand, a sibling of Sales Coach and Scorecard (Tide): a white fountain-pen nib on the
 * graphite-to-slate gradient squircle; the lockup puts "by TKG" (the real TKG letters) under the
 * name. The icons in public/ are drawn from the same geometry by scripts/gen-icons.mjs.
 */
/** The nib on a 1024 canvas: a pointed nib with a slit and a breather hole (cut out, even-odd). Small marks drop the slit. */
export function nibPath(small: boolean): string {
  const body = "M512 112C664 112 772 236 772 408C772 572 630 748 512 912C394 748 252 572 252 408C252 236 360 112 512 112Z";
  if (small) return body;
  const hole = "M512 428C535 428 554 447 554 470C554 493 535 512 512 512C489 512 470 493 470 470C470 447 489 428 512 428Z";
  const slit = "M500 508H524V840L512 862L500 840Z";
  return body + hole + slit;
}

export function InkMark({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("inline-flex shrink-0 items-center justify-center bg-tide", className)}
      style={{ width: size, height: size, borderRadius: Math.round(size * 0.27) }}
    >
      <svg viewBox="0 0 1024 1024" width={size} height={size}>
        <path d={nibPath(size < 40)} fill="#fff" fillRule="evenodd" />
      </svg>
    </span>
  );
}

/** The real TKG letters as a solid shape (aspect 1540 x 734). */
export function TkgMark({ height = 12, className, title = "TKG" }: { height?: number; className?: string; title?: string }) {
  return (
    <svg viewBox="30 30 1540 734" height={height} width={Math.round((height * 1540) / 734)} role="img" aria-label={title} className={cn("block shrink-0 fill-current", className)}>
      <path d="M30 39H542V204H368V684H203V204H30ZM570 41H734V253L887 41H1084V47L865 350L1084 648V682H906L766 491L570 763ZM1569 160A323 323 0 1 0 1305 677H1560V294H1259V458H1396V513H1305A160 160 0 1 1 1449 268Z" />
    </svg>
  );
}

/** Icon + "Ink" + "by TKG". `size` is the icon size; the type scales with it. */
export function InkLockup({ size = 28, className }: { size?: number; className?: string }) {
  const name = Math.round(size * 0.56);
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <InkMark size={size} />
      <span className="flex flex-col leading-none">
        <span className="font-extrabold tracking-[-0.03em] text-gray-900" style={{ fontSize: name }}>
          Ink
        </span>
        <span className="mt-[3px] flex items-center gap-1 text-[10px] font-medium text-gray-500">
          by <TkgMark height={Math.max(8, Math.round(size * 0.3))} className="text-gray-700" />
        </span>
      </span>
    </span>
  );
}
