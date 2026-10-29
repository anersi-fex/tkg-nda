/** Event kinds in the audit trail and their plain-English labels. Pure, browser-safe. */
export const EVENT_KINDS = ["issued", "opened", "consented", "adopted", "initialed", "signed", "completed", "sealed", "viewed_pdf", "voided", "copy_sent", "copy_failed"] as const;
export type EventKind = (typeof EVENT_KINDS)[number];

/** The kinds a signer's browser may report. Everything else is written by the server itself. */
export const CLIENT_EVENT_KINDS: EventKind[] = ["opened", "consented", "adopted", "initialed"];

export type AuditEvent = {
  id: number;
  kind: EventKind;
  section_key: string | null;
  at: string;
  ip: string | null;
  user_agent: string | null;
  geo: Record<string, string> | null;
  details: Record<string, unknown> | null;
};

/** Labels say what is known: a link can be opened by anyone holding it, so "opened" is not "the signer opened". */
export function eventLabel(e: { kind: EventKind; section_key?: string | null; details?: Record<string, unknown> | null }, sectionHeading?: string): string {
  switch (e.kind) {
    case "issued":
      return "Agreement issued by the Company";
    case "opened":
      return e.details?.handover === true ? "The signing link was opened on the Company's device (handed over)" : "The signing link was opened";
    case "consented":
      return "Signer agreed to sign electronically";
    case "adopted": {
      const method = e.details?.method === "drawn" ? "drawn" : "typed";
      return `Signer adopted a ${method} signature and initials`;
    }
    case "initialed":
      return `Signer initialed: ${sectionHeading ?? e.section_key ?? "a section"}`;
    case "signed":
      return "Signer signed the agreement";
    case "completed":
      return "Agreement completed";
    case "sealed":
      return "Agreement sealed: PDF stored, fingerprints recorded";
    case "viewed_pdf":
      return "The signed copy was opened from the signing link";
    case "voided":
      return "Agreement voided by the Company";
    case "copy_sent":
      return "Signed copy emailed";
    case "copy_failed":
      return "Email of the signed copy failed";
  }
}

/** A timeline row: an event, or a run of repeated opens folded into one line. */
export type TimelineItem = { event: AuditEvent; repeats: number; lastAt: string };

/**
 * The record keeps every open, but reading it should not: a run of "opened" rows after the first
 * one folds into "opened again N more times (last ...)". Every other kind stays one row each.
 */
export function timeline(events: AuditEvent[]): TimelineItem[] {
  const out: TimelineItem[] = [];
  for (const e of events) {
    const prev = out[out.length - 1];
    if (e.kind === "opened" && prev && prev.event.kind === "opened" && prev.event.ip === e.ip && prev.event.user_agent === e.user_agent) {
      prev.repeats += 1;
      prev.lastAt = e.at;
      continue;
    }
    out.push({ event: e, repeats: 0, lastAt: e.at });
  }
  return out;
}
