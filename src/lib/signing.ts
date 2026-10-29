import "server-only";
import { canonicalAgreement, filledDocument } from "./document";
import { addEvent, listEvents, loadPdf, saveHashes, storePdf, type Envelope } from "./envelopes";
import type { AuditEvent } from "./events";
import { renderAgreementPdf } from "./pdf";
import { sha256Hex } from "./tokens";
import { formatLongDate } from "./timezone";

/**
 * Sealing a completed agreement: the SHA-256 of what was agreed, the PDF, and its SHA-256.
 * The PDF is built from the events up to and including "completed", so building it again later
 * (if the first attempt failed) gives the same bytes and the same fingerprint.
 */
export function agreementHash(env: Envelope, completedAt: string): string {
  const fill = { signerName: env.signer_name ?? "", effectiveDate: formatLongDate(completedAt) };
  return sha256Hex(
    canonicalAgreement(env.doc, fill, {
      envelope_id: env.id,
      signer_email: env.signer_email ?? "",
      completed_at: completedAt,
      template_version: env.template_version,
    }),
  );
}

export async function buildPdf(env: Envelope, events: AuditEvent[], completedAt: string, documentSha256: string): Promise<{ pdf: Uint8Array; sha256: string }> {
  const completedIdx = events.findIndex((e) => e.kind === "completed");
  const upTo = completedIdx === -1 ? events : events.slice(0, completedIdx + 1);
  const fill = { signerName: env.signer_name ?? "", effectiveDate: formatLongDate(completedAt) };
  const pdf = await renderAgreementPdf({
    envelopeId: env.id,
    doc: filledDocument(env.doc, fill),
    signerName: env.signer_name ?? "",
    signerEmail: env.signer_email,
    signatureMethod: env.signature_method,
    signaturePng: env.signature_png,
    initialsPng: env.initials_png,
    effectiveDate: fill.effectiveDate,
    completedAt,
    issuedAt: env.created_at,
    issuedBy: env.issued_by,
    events: upTo,
    documentSha256,
  });
  return { pdf, sha256: sha256Hex(pdf) };
}

/** The stored PDF of a completed agreement, made now if the completion step could not store it. */
export async function ensurePdf(env: Envelope): Promise<{ pdf: Uint8Array; sha256: string } | null> {
  if (env.status !== "completed" || !env.completed_at) return null;
  const stored = await loadPdf(env.id);
  if (stored) return stored;
  const events = await listEvents(env.id);
  const documentSha256 = env.document_sha256 ?? agreementHash(env, env.completed_at);
  let built: { pdf: Uint8Array; sha256: string };
  try {
    built = await buildPdf(env, events, env.completed_at, documentSha256);
  } catch (err) {
    console.error(`pdf_build_failed envelope=${env.id} ${err instanceof Error ? err.name : "error"}`);
    return null;
  }
  try {
    await storePdf(env.id, built.pdf, built.sha256);
    await saveHashes(env.id, { documentSha256, pdfSha256: built.sha256 });
  } catch (err) {
    console.error(`pdf_store_failed envelope=${env.id} ${err instanceof Error ? err.name : "error"}`);
  }
  if (!events.some((e) => e.kind === "completed")) {
    try {
      await addEvent(env.id, "completed", null, { details: { document_sha256: documentSha256, late: true } });
    } catch {
      /* the PDF still exists */
    }
  }
  return built;
}

/** "NDA - Jane Doe.pdf": ASCII only, so every browser keeps the name. */
export function pdfFilename(env: Envelope): string {
  const name = (env.signer_name ?? "signed")
    .normalize("NFKD")
    .replace(/[^\x20-\x7e]/g, "")
    .replace(/[^A-Za-z0-9 .'-]/g, "")
    .trim()
    .slice(0, 60);
  return `NDA - ${name || "signed"}.pdf`;
}

export function pdfResponse(pdf: Uint8Array, filename: string, download: boolean): Response {
  return new Response(pdf.slice().buffer as ArrayBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Length": String(pdf.byteLength),
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${filename}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

/** An unsigned copy of the agreement for reading or printing before signing (no record, no seal). */
export async function buildDraftPdf(env: Envelope): Promise<Uint8Array> {
  const today = new Date();
  const fill = { signerName: env.signer_name ?? env.signer_name_hint ?? "Recipient", effectiveDate: formatLongDate(today) };
  return renderAgreementPdf({
    envelopeId: env.id,
    doc: filledDocument(env.doc, fill),
    signerName: fill.signerName,
    signerEmail: null,
    signatureMethod: null,
    signaturePng: null,
    initialsPng: null,
    effectiveDate: fill.effectiveDate,
    completedAt: env.created_at,
    issuedAt: env.created_at,
    issuedBy: env.issued_by,
    events: [],
    documentSha256: "",
    draft: true,
  });
}
