import { test } from "node:test";
import assert from "node:assert/strict";
import { canonicalAgreement, cleanEmail, cleanLegalName, fillText, filledDocument, freezeDocument, initialSections, initialsOf, normalizeIso, parseFrozenDocument, stableStringify } from "../src/lib/document";
import { NDA_TEMPLATE } from "../src/lib/nda-text";

const company = { name: "The Koka Group, LLC", address: "Troy, Michigan", ownerName: "Anersi Koka", ownerTitle: "Owner" };

test("freezeDocument fills the company placeholders and keeps the signer's", () => {
  const doc = freezeDocument(company);
  const all = [...doc.intro, ...doc.sections.flatMap((s) => s.paragraphs), ...doc.acknowledgment].join("\n");
  assert.ok(!all.includes("{{COMPANY}}"));
  assert.ok(!all.includes("{{COMPANY_ADDRESS}}"));
  assert.ok(!all.includes("{{OWNER_NAME}}"));
  assert.ok(all.includes("{{SIGNER_NAME}}"), "the signer's name is filled later");
  assert.equal(doc.version, NDA_TEMPLATE.version);
  assert.equal(doc.company.name, company.name);
});

test("the template has 5 to 7 sections to initial, unique snake_case keys, no stray placeholders", () => {
  const keys = NDA_TEMPLATE.sections.map((s) => s.key);
  assert.equal(new Set(keys).size, keys.length, "keys are unique");
  for (const k of keys) assert.match(k, /^[a-z][a-z0-9_]*$/);
  const n = NDA_TEMPLATE.sections.filter((s) => s.initial).length;
  assert.ok(n >= 5 && n <= 7, `${n} initial sections`);
  const all = [...NDA_TEMPLATE.intro, ...NDA_TEMPLATE.sections.flatMap((s) => [s.heading, ...s.paragraphs]), ...NDA_TEMPLATE.acknowledgment].join("\n");
  for (const m of all.matchAll(/\{\{([^}]*)\}\}/g)) assert.ok(["COMPANY", "COMPANY_ADDRESS", "OWNER_NAME", "SIGNER_NAME", "EFFECTIVE_DATE"].includes(m[1]), `placeholder ${m[0]}`);
  assert.ok(!/[‘’“”–—]/.test(all), "ASCII punctuation only");
});

test("filledDocument and fillText put the name and date in", () => {
  const doc = filledDocument(freezeDocument(company), { signerName: "Jane Q. Doe", effectiveDate: "October 29, 2026" });
  const all = [...doc.intro, ...doc.sections.flatMap((s) => s.paragraphs)].join("\n");
  assert.ok(all.includes("Jane Q. Doe"));
  assert.ok(!all.includes("{{"));
  assert.equal(fillText("Hi {{SIGNER_NAME}} on {{EFFECTIVE_DATE}}", { signerName: "A", effectiveDate: "B" }), "Hi A on B");
});

test("canonicalAgreement is stable: key order and whitespace never change the hash input", () => {
  const doc = freezeDocument(company);
  const a = canonicalAgreement(doc, { signerName: "Jane Doe", effectiveDate: "October 29, 2026" }, { envelope_id: "x", completed_at: "t" });
  const shuffled = JSON.parse(JSON.stringify({ ...doc, sections: doc.sections.map((s) => ({ initial: s.initial, paragraphs: s.paragraphs, heading: s.heading, key: s.key })) }));
  const b = canonicalAgreement(shuffled, { signerName: "Jane Doe", effectiveDate: "October 29, 2026" }, { completed_at: "t", envelope_id: "x" });
  assert.equal(a, b);
  const c = canonicalAgreement(doc, { signerName: "Jane Doe", effectiveDate: "October 30, 2026" }, { envelope_id: "x", completed_at: "t" });
  assert.notEqual(a, c);
  assert.equal(stableStringify({ b: [1, { d: 2, c: 3 }], a: "x" }), '{"a":"x","b":[1,{"c":3,"d":2}]}');
});

test("parseFrozenDocument accepts what freezeDocument makes and rejects junk", () => {
  const doc = freezeDocument(company);
  const back = parseFrozenDocument(JSON.parse(JSON.stringify(doc)));
  assert.deepEqual(back, doc);
  assert.equal(parseFrozenDocument(null), null);
  assert.equal(parseFrozenDocument({ version: "x" }), null);
  assert.equal(parseFrozenDocument({ ...doc, sections: [{ key: 1 }] }), null);
  assert.equal(initialSections(doc).length, doc.sections.filter((s) => s.initial).length);
});

test("initialsOf, cleanLegalName, cleanEmail", () => {
  assert.equal(initialsOf("Anersi Koka"), "AK");
  assert.equal(initialsOf("  samantha   marty "), "SM");
  assert.equal(initialsOf("Jean-Luc de la Cruz Smith"), "JDL");
  assert.equal(initialsOf("'Olu"), "O");
  assert.equal(cleanLegalName("Jane  Doe"), "Jane Doe");
  assert.equal(cleanLegalName("Zoë O'Brien-Smith Jr."), "Zoë O'Brien-Smith Jr.");
  assert.equal(cleanLegalName("J"), null);
  assert.equal(cleanLegalName("Jane <script>"), null);
  assert.equal(cleanLegalName("1234"), null);
  assert.equal(cleanLegalName("x".repeat(81)), null);
  assert.equal(cleanEmail(""), null);
  assert.equal(cleanEmail(null), null);
  assert.equal(cleanEmail(" Jane@Example.com "), "jane@example.com");
  assert.equal(cleanEmail("nope"), undefined);
  assert.equal(cleanEmail(5), undefined);
});

test("the consent and adoption statements are frozen with the agreement and change its hash", () => {
  const doc = freezeDocument(company);
  assert.ok(doc.consent.includes("Anersi Koka") && !doc.consent.includes("{{"));
  assert.ok(doc.adoption.length > 40);
  const fill = { signerName: "Jane Doe", effectiveDate: "October 29, 2026" };
  const a = canonicalAgreement(doc, fill, {});
  const b = canonicalAgreement({ ...doc, consent: doc.consent + " " }, fill, {});
  assert.notEqual(a, b);
  const back = parseFrozenDocument(JSON.parse(JSON.stringify(doc)));
  assert.equal(back?.consent, doc.consent);
  // An older frozen document without the two statements still parses (as empty strings).
  const older = parseFrozenDocument({ ...JSON.parse(JSON.stringify(doc)), consent: undefined, adoption: undefined });
  assert.equal(older?.consent, "");
});

test("normalizeIso gives one spelling for the same instant, as the app and the database write it", () => {
  assert.equal(normalizeIso("2026-10-29T00:31:51.768Z"), "2026-10-29T00:31:51.768Z");
  assert.equal(normalizeIso("2026-10-29T00:31:51.768+00:00"), "2026-10-29T00:31:51.768Z");
  assert.equal(normalizeIso("2026-10-28T20:31:51.768-04:00"), "2026-10-29T00:31:51.768Z");
  assert.equal(normalizeIso("2026-10-29T00:31:51.768123+00:00"), "2026-10-29T00:31:51.768Z", "microseconds are cut, as JS Date does");
  assert.throws(() => normalizeIso("yesterday"));
});
