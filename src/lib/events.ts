/** Event kinds in the audit trail and their plain-English labels. Pure, browser-safe. */
export const EVENT_KINDS = ["issued", "opened", "consented", "adopted", "initialed", "signed", "completed", "viewed_pdf", "voided", "copy_sent", "copy_failed"] as const;
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

export function eventLabel(e: { kind: EventKind; section_key?: string | null; details?: Record<string, unknown> | null }, sectionHeading?: string): string {
  switch (e.kind) {
    case "issued":
      return "Agreement issued by the Company";
    case "opened":
      return "Signer opened the agreement";
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
      return "Agreement completed and sealed (PDF made)";
    case "viewed_pdf":
      return "Signer downloaded the signed copy";
    case "voided":
      return "Agreement voided by the Company";
    case "copy_sent":
      return "Signed copy emailed";
    case "copy_failed":
      return "Email of the signed copy failed";
  }
}
