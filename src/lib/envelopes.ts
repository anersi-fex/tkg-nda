import "server-only";
import { db } from "./supabase";
import { newToken } from "./tokens";
import { parseFrozenDocument, type FrozenDocument } from "./document";
import type { AuditEvent, EventKind } from "./events";
import type { RequestInfo } from "./request-info";

/**
 * A signing "envelope": one agreement, one person, one link. Nothing is ever deleted or rewritten:
 * the database refuses (triggers in supabase/migrations/0001_init.sql), so what this module writes
 * is append-only by construction.
 */
export type EnvelopeStatus = "sent" | "opened" | "completed" | "voided";
export type ShownStatus = EnvelopeStatus | "expired";

export type EnvelopeRow = {
  id: string;
  token: string;
  status: EnvelopeStatus;
  document: unknown;
  template_version: string;
  signer_name_hint: string | null;
  signer_email_hint: string | null;
  note: string | null;
  signer_name: string | null;
  signer_email: string | null;
  signature_method: "typed" | "drawn" | null;
  signature_style: string | null;
  signature_png: string | null;
  initials_png: string | null;
  document_sha256: string | null;
  pdf_sha256: string | null;
  issued_by: string;
  created_at: string;
  expires_at: string;
  opened_at: string | null;
  completed_at: string | null;
  voided_at: string | null;
};

export type Envelope = EnvelopeRow & { doc: FrozenDocument };

/** The list screen reads these columns only (no document, no images). */
export type EnvelopeSummary = Pick<
  EnvelopeRow,
  "id" | "status" | "signer_name_hint" | "signer_email_hint" | "note" | "signer_name" | "signer_email" | "created_at" | "expires_at" | "opened_at" | "completed_at" | "voided_at"
>;

export const SUMMARY_COLUMNS = "id,status,signer_name_hint,signer_email_hint,note,signer_name,signer_email,created_at,expires_at,opened_at,completed_at,voided_at";
const EVENT_COLUMNS = "id,kind,section_key,at,ip,user_agent,geo,details";

/** Unsigned links stop working after this many days. */
export const EXPIRES_DAYS = 14;

/** Caps on what one link can write, so a stuck page or a script never fills the record. */
export const MAX_OPENS = 25;
export const MAX_ADOPTIONS = 5;
export const MAX_PDF_VIEWS = 50;

export function shownStatus(e: Pick<EnvelopeRow, "status" | "expires_at">, now = Date.now()): ShownStatus {
  if (e.status === "completed" || e.status === "voided") return e.status;
  if (new Date(e.expires_at).getTime() <= now) return "expired";
  return e.status;
}

/** Whether a signer may still act on this envelope (open, initial, sign). */
export function canSign(e: Pick<EnvelopeRow, "status" | "expires_at">, now = Date.now()): boolean {
  const s = shownStatus(e, now);
  return s === "sent" || s === "opened";
}

function toEnvelope(row: EnvelopeRow): Envelope | null {
  const doc = parseFrozenDocument(row.document);
  if (!doc) return null;
  return { ...row, doc };
}

export async function createEnvelope(input: {
  doc: FrozenDocument;
  signerNameHint: string | null;
  signerEmailHint: string | null;
  note: string | null;
  issuedBy: string;
}): Promise<Envelope> {
  const token = newToken();
  const expires = new Date(Date.now() + EXPIRES_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await db()
    .from("envelopes")
    .insert({
      token,
      document: input.doc,
      template_version: input.doc.version,
      signer_name_hint: input.signerNameHint,
      signer_email_hint: input.signerEmailHint,
      note: input.note,
      issued_by: input.issuedBy,
      expires_at: expires,
    })
    .select("*")
    .single();
  if (error || !data) throw new Error("envelope_insert_failed");
  const env = toEnvelope(data as EnvelopeRow);
  if (!env) throw new Error("envelope_document_invalid");
  return env;
}

export async function envelopeByToken(token: string): Promise<Envelope | null> {
  const { data, error } = await db().from("envelopes").select("*").eq("token", token).maybeSingle();
  if (error) throw new Error("envelope_read_failed");
  if (!data) return null;
  return toEnvelope(data as EnvelopeRow);
}

export async function envelopeById(id: string): Promise<Envelope | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const { data, error } = await db().from("envelopes").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error("envelope_read_failed");
  if (!data) return null;
  return toEnvelope(data as EnvelopeRow);
}

export async function listEnvelopes(limit = 200): Promise<EnvelopeSummary[]> {
  const { data, error } = await db().from("envelopes").select(SUMMARY_COLUMNS).order("created_at", { ascending: false }).limit(limit);
  if (error) throw new Error("envelopes_list_failed");
  return (data ?? []) as EnvelopeSummary[];
}

/** One row per thing that happened, stamped by the database. */
export async function addEvent(
  envelopeId: string,
  kind: EventKind,
  info: RequestInfo | null,
  extra: { sectionKey?: string | null; details?: Record<string, unknown> | null } = {},
): Promise<AuditEvent> {
  const { data, error } = await db()
    .from("events")
    .insert({
      envelope_id: envelopeId,
      kind,
      section_key: extra.sectionKey ?? null,
      ip: info?.ip || null,
      user_agent: info?.userAgent || null,
      geo: info && Object.keys(info.geo).length ? info.geo : null,
      details: extra.details ?? null,
    })
    .select(EVENT_COLUMNS)
    .single();
  if (error || !data) {
    const err = new Error("event_insert_failed") as Error & { code?: string };
    err.code = error?.code;
    throw err;
  }
  return data as AuditEvent;
}

/**
 * Kinds that happen once per envelope (consented, sealed) or once per section (initialed): the
 * unique indexes decide, so two taps at the same moment give one row and the second caller gets it.
 */
export async function addEventOnce(
  envelopeId: string,
  kind: EventKind,
  info: RequestInfo | null,
  extra: { sectionKey?: string | null; details?: Record<string, unknown> | null } = {},
): Promise<{ event: AuditEvent; created: boolean }> {
  try {
    return { event: await addEvent(envelopeId, kind, info, extra), created: true };
  } catch (err) {
    if ((err as { code?: string }).code !== "23505") throw err;
    const existing = await findEvent(envelopeId, kind, extra.sectionKey ?? null);
    if (!existing) throw err;
    return { event: existing, created: false };
  }
}

export async function findEvent(envelopeId: string, kind: EventKind, sectionKey: string | null = null): Promise<AuditEvent | null> {
  let q = db().from("events").select(EVENT_COLUMNS).eq("envelope_id", envelopeId).eq("kind", kind);
  if (sectionKey) q = q.eq("section_key", sectionKey);
  const { data, error } = await q.order("id", { ascending: true }).limit(1).maybeSingle();
  if (error) throw new Error("events_read_failed");
  return (data as AuditEvent | null) ?? null;
}

export async function listEvents(envelopeId: string): Promise<AuditEvent[]> {
  const { data, error } = await db().from("events").select(EVENT_COLUMNS).eq("envelope_id", envelopeId).order("at", { ascending: true }).order("id", { ascending: true });
  if (error) throw new Error("events_list_failed");
  return (data ?? []) as AuditEvent[];
}

export async function countEvents(envelopeId: string, kind?: EventKind): Promise<number> {
  let q = db().from("events").select("id", { count: "exact", head: true }).eq("envelope_id", envelopeId);
  if (kind) q = q.eq("kind", kind);
  const { count, error } = await q;
  if (error) throw new Error("events_count_failed");
  return count ?? 0;
}

export async function markOpened(id: string): Promise<void> {
  // Only the first open flips the status; later opens leave opened_at alone.
  await db().from("envelopes").update({ status: "opened", opened_at: new Date().toISOString() }).eq("id", id).eq("status", "sent");
}

export async function saveAdoption(
  id: string,
  a: { signerName: string; signerEmail: string | null; method: "typed" | "drawn"; style: string | null; signaturePng: string; initialsPng: string },
): Promise<boolean> {
  const { data, error } = await db()
    .from("envelopes")
    .update({
      signer_name: a.signerName,
      signer_email: a.signerEmail,
      signature_method: a.method,
      signature_style: a.style,
      signature_png: a.signaturePng,
      initials_png: a.initialsPng,
      status: "opened",
    })
    .eq("id", id)
    .in("status", ["sent", "opened"])
    .select("id");
  if (error) throw new Error("adoption_save_failed");
  return (data?.length ?? 0) === 1;
}

/**
 * "Sign and finish" in one database transaction (complete_envelope in the migration): the status
 * flips once, and the 'signed' and 'completed' events are written with the same instant. Returns
 * null when the envelope was not claimable (already completed, voided); throws on an error.
 */
export async function completeEnvelope(id: string, info: RequestInfo, signerName: string): Promise<{ completedAt: string } | null> {
  const { data, error } = await db().rpc("complete_envelope", {
    p_id: id,
    p_ip: info.ip || null,
    p_user_agent: info.userAgent || null,
    p_geo: Object.keys(info.geo).length ? info.geo : null,
    p_name: signerName,
  });
  if (error) throw new Error("complete_failed");
  const row = (Array.isArray(data) ? data[0] : data) as { completed_at?: string } | undefined;
  if (!row?.completed_at) return null;
  return { completedAt: row.completed_at };
}

/** Written once; the trigger refuses a change, and the same value again is no change. */
export async function saveHashes(id: string, h: { documentSha256: string; pdfSha256: string }): Promise<void> {
  const { error } = await db().from("envelopes").update({ document_sha256: h.documentSha256, pdf_sha256: h.pdfSha256 }).eq("id", id);
  if (error) throw new Error("hashes_save_failed");
}

/** The first store wins; a second (the same bytes, built again) is ignored. */
export async function storePdf(id: string, pdf: Uint8Array, sha256: string): Promise<void> {
  const { error } = await db()
    .from("signed_pdfs")
    .upsert({ envelope_id: id, pdf_base64: Buffer.from(pdf).toString("base64"), sha256, bytes: pdf.byteLength }, { onConflict: "envelope_id", ignoreDuplicates: true });
  if (error) throw new Error("pdf_store_failed");
}

export async function loadPdf(id: string): Promise<{ pdf: Uint8Array; sha256: string } | null> {
  const { data, error } = await db().from("signed_pdfs").select("pdf_base64,sha256").eq("envelope_id", id).maybeSingle();
  if (error) throw new Error("pdf_read_failed");
  if (!data) return null;
  return { pdf: new Uint8Array(Buffer.from(data.pdf_base64 as string, "base64")), sha256: data.sha256 as string };
}

export async function voidEnvelope(id: string): Promise<boolean> {
  const { data, error } = await db().from("envelopes").update({ status: "voided", voided_at: new Date().toISOString() }).eq("id", id).in("status", ["sent", "opened"]).select("id");
  if (error) throw new Error("void_failed");
  return (data?.length ?? 0) === 1;
}
