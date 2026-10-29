import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { filledDocument, freezeDocument } from "../src/lib/document";
import type { AuditEvent } from "../src/lib/events";
import { renderAgreementPdf, winAnsiSafe } from "../src/lib/pdf";

// A 1x1 transparent PNG, the smallest valid image, standing in for a signature.
const PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";

const company = { name: "The Koka Group", address: "Troy, Michigan", ownerName: "Anersi Koka", ownerTitle: "Owner" };

function events(doc: ReturnType<typeof freezeDocument>): AuditEvent[] {
  const base = { ip: "203.0.113.9", user_agent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1", geo: { city: "Troy", region: "MI", country: "US" } };
  let id = 1;
  let t = Date.parse("2026-10-29T14:00:00Z");
  const ev = (kind: AuditEvent["kind"], section_key: string | null = null, details: Record<string, unknown> | null = null): AuditEvent => ({ id: id++, kind, section_key, at: new Date((t += 20_000)).toISOString(), details, ...base });
  return [
    ev("issued", null, { by: "Anersi Koka" }),
    ev("opened", null, { tz: "America/Detroit", screen: "393x852" }),
    ev("consented"),
    ev("adopted", null, { name: "Jane Doe", method: "typed", style: "caveat" }),
    ...doc.sections.filter((s) => s.initial).map((s) => ev("initialed", s.key, { name: "Jane Doe" })),
    ev("signed", null, { name: "Jane Doe" }),
    ev("completed", null, { document_sha256: "ab".repeat(32) }),
  ];
}

test("winAnsiSafe folds smart punctuation and never leaves a character Helvetica cannot draw", () => {
  assert.equal(winAnsiSafe("“Hi” – it’s fine…"), '"Hi" - it\'s fine...');
  assert.equal(winAnsiSafe("café § 2 • x"), "café § 2 • x");
  assert.equal(winAnsiSafe("中文 ok"), "?? ok");
});

test("renderAgreementPdf makes a multi-page PDF and the same bytes twice", async () => {
  const frozen = freezeDocument(company);
  const doc = filledDocument(frozen, { signerName: "Jane Doe", effectiveDate: "October 29, 2026" });
  const input = {
    envelopeId: "11111111-2222-3333-4444-555555555555",
    doc,
    signerName: "Jane Doe",
    signerEmail: "jane@example.com",
    signatureMethod: "typed" as const,
    signaturePng: PNG,
    initialsPng: PNG,
    effectiveDate: "October 29, 2026",
    completedAt: "2026-10-29T14:05:00Z",
    issuedAt: "2026-10-29T13:00:00Z",
    issuedBy: "Anersi Koka",
    events: events(frozen),
    documentSha256: "ab".repeat(32),
  };
  const a = await renderAgreementPdf(input);
  const b = await renderAgreementPdf(input);
  assert.ok(a.byteLength > 5000, `pdf has ${a.byteLength} bytes`);
  assert.equal(Buffer.from(a.slice(0, 5)).toString("latin1"), "%PDF-");
  assert.equal(createHash("sha256").update(a).digest("hex"), createHash("sha256").update(b).digest("hex"), "deterministic");
  const text = Buffer.from(a).toString("latin1");
  assert.ok(text.includes("/Type /Page") && (text.match(/\/Type \/Page[^s]/g) ?? []).length >= 2, "at least two pages");
});

test("renderAgreementPdf survives a missing signature image and odd characters", async () => {
  const frozen = freezeDocument({ ...company, name: "Zoë & “Co” — 中" });
  const doc = filledDocument(frozen, { signerName: "José Ñ", effectiveDate: "October 29, 2026" });
  const pdf = await renderAgreementPdf({
    envelopeId: "x",
    doc,
    signerName: "José Ñ",
    signerEmail: null,
    signatureMethod: null,
    signaturePng: null,
    initialsPng: "data:image/png;base64,notreally",
    effectiveDate: "October 29, 2026",
    completedAt: "2026-10-29T14:05:00Z",
    issuedAt: "2026-10-29T13:00:00Z",
    issuedBy: "Anersi Koka",
    events: [],
    documentSha256: "00".repeat(32),
  });
  assert.ok(pdf.byteLength > 1000);
});
