import "server-only";
import { canonicalAgreement, filledDocument, normalizeIso } from "./document";
import { addEventOnce, listEvents, loadPdf, saveHashes, storePdf, type Envelope } from "./envelopes";
import type { AuditEvent } from "./events";
import { renderAgreementPdf } from "./pdf";
import { sha256Hex } from "./tokens";
import { formatLongDate } from "./timezone";

/**
 * Sealing a completed agreement: the SHA-256 of what was agreed, the PDF, and its SHA-256.
 * Every input is taken from the stored row and the events up to "completed", and every instant
 * is normalized to one spelling, so the seal can be rebuilt and checked later from the record
 * alone. The first stored PDF is the only copy: a rebuild never replaces it.
 */
export function agreementHash(env: Envelope, completedAt: string): string {
  const at = normalizeIso(completedAt);
  const fill = { signerName: env.signer_name ?? "", effectiveDate: formatLongDate(at) };
  return sha256Hex(
    canonicalAgreement(env.doc, fill, {
      envelope_id: env.id,
      signer_email: env.signer_email ?? "",
      completed_at: at,
      template_version: env.template_version,
    }),
  );
}

export async function buildPdf(env: Envelope, events: AuditEvent[], completedAt: string, documentSha256: string): Promise<{ pdf: Uint8Array; sha256: string }> {
  const at = normalizeIso(completedAt);
  const completedIdx = events.findIndex((e) => e.kind === "completed");
  const upTo = completedIdx === -1 ? events : events.slice(0, completedIdx + 1);
  const fill = { signerName: env.signer_name ?? "", effectiveDate: formatLongDate(at) };
  const pdf = await renderAgreementPdf({
    envelopeId: env.id,
    doc: filledDocument(env.doc, fill),
    signerName: env.signer_name ?? "",
    signerEmail: env.signer_email,
    signatureMethod: env.signature_method,
    signaturePng: env.signature_png,
    initialsPng: env.initials_png,
    effectiveDate: fill.effectiveDate,
    completedAt: at,
    issuedAt: env.created_at,
    issuedBy: env.issued_by,
    events: upTo,
    documentSha256,
  });
  return { pdf, sha256: sha256Hex(pdf) };
}

export type Seal = { pdf: Uint8Array; pdfSha256: string; documentSha256: string };

/**
 * Builds the PDF, stores it (first store wins), records the 'sealed' event once and copies the
 * fingerprints onto the envelope. Safe to call twice: the second call returns the first seal.
 */
export async function sealEnvelope(env: Envelope): Promise<Seal | null> {
  if (env.status !== "completed" || !env.completed_at) return null;
  const events = await listEvents(env.id);
  if (!events.some((e) => e.kind === "completed")) return null; // completion still in flight
  const sealedBefore = events.find((e) => e.kind === "sealed");
  const documentSha256 = typeof sealedBefore?.details?.document_sha256 === "string" ? sealedBefore.details.document_sha256 : (env.document_sha256 ?? agreementHash(env, env.completed_at));
  let stored = await loadPdf(env.id);
  if (!stored) {
    const built = await buildPdf(env, events, env.completed_at, documentSha256);
    await storePdf(env.id, built.pdf, built.sha256);
    stored = (await loadPdf(env.id)) ?? built;
  }
  const { event } = await addEventOnce(env.id, "sealed", null, { details: { document_sha256: documentSha256, pdf_sha256: stored.sha256, pdf_bytes: stored.pdf.byteLength } });
  const sealedDoc = typeof event.details?.document_sha256 === "string" ? event.details.document_sha256 : documentSha256;
  const sealedPdf = typeof event.details?.pdf_sha256 === "string" ? event.details.pdf_sha256 : stored.sha256;
  if (env.document_sha256 !== sealedDoc || env.pdf_sha256 !== sealedPdf) {
    try {
      await saveHashes(env.id, { documentSha256: sealedDoc, pdfSha256: sealedPdf });
    } catch (err) {
      console.error(`hashes_save_failed envelope=${env.id} ${err instanceof Error ? err.name : "error"}`);
    }
  }
  return { pdf: stored.pdf, pdfSha256: stored.sha256, documentSha256: sealedDoc };
}

/** The stored PDF of a completed agreement, sealed now if the completion step could not finish it. */
export async function ensurePdf(env: Envelope): Promise<{ pdf: Uint8Array; sha256: string } | null> {
  try {
    const seal = await sealEnvelope(env);
    return seal ? { pdf: seal.pdf, sha256: seal.pdfSha256 } : null;
  } catch (err) {
    console.error(`pdf_ensure_failed envelope=${env.id} ${err instanceof Error ? err.name : "error"}`);
    return null;
  }
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

/** A small page for a phone when the PDF is not ready, instead of raw JSON. */
export function notReadyResponse(): Response {
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Not ready yet</title></head><body style="font-family:-apple-system,system-ui,sans-serif;padding:40px 24px;text-align:center;color:#15171c"><h1 style="font-size:20px">Your copy isn't ready yet</h1><p style="color:#555b69">Give it a few seconds, then go back and tap the button again.</p></body></html>`;
  return new Response(html, { status: 503, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "Retry-After": "5" } });
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
