/**
 * The agreement as data (pure, browser-safe). The template (src/lib/nda-text.ts) carries
 * placeholders; an envelope freezes a copy of it with the company's names filled in at the time
 * it is issued, so a later wording change never alters what someone already signed. The
 * signer's name and the effective date are filled when the agreement is shown and when it is
 * completed, and the completed agreement's canonical JSON is hashed (SHA-256) into the record.
 */
import { NDA_TEMPLATE, type NdaTemplate } from "./nda-text";

export type Section = { key: string; heading: string; paragraphs: string[]; initial: boolean };

export type FrozenDocument = {
  version: string;
  title: string;
  intro: string[];
  sections: Section[];
  acknowledgment: string[];
  /** The consent checkbox text and the adoption line, as shown to the signer. */
  consent: string;
  adoption: string;
  company: { name: string; address: string; ownerName: string; ownerTitle: string };
};

export type Fill = { signerName: string; effectiveDate: string };

/** Freeze the current template with the company's names, for a new envelope. */
export function freezeDocument(company: FrozenDocument["company"], template: NdaTemplate = NDA_TEMPLATE): FrozenDocument {
  const fill = (s: string) =>
    s
      .replaceAll("{{COMPANY}}", company.name)
      .replaceAll("{{COMPANY_ADDRESS}}", company.address)
      .replaceAll("{{OWNER_NAME}}", company.ownerName);
  return {
    version: template.version,
    title: template.title,
    intro: template.intro.map(fill),
    sections: template.sections.map((s) => ({ key: s.key, heading: s.heading, paragraphs: s.paragraphs.map(fill), initial: s.initial })),
    acknowledgment: template.acknowledgment.map(fill),
    consent: fill(template.consent),
    adoption: fill(template.adoption),
    company,
  };
}

/** Put the signer's name and the effective date into one piece of text. */
export function fillText(text: string, fill: Fill): string {
  return text.replaceAll("{{SIGNER_NAME}}", fill.signerName).replaceAll("{{EFFECTIVE_DATE}}", fill.effectiveDate);
}

/** The whole agreement with every placeholder filled, as it is shown and printed. */
export function filledDocument(doc: FrozenDocument, fill: Fill): FrozenDocument {
  return {
    ...doc,
    intro: doc.intro.map((p) => fillText(p, fill)),
    sections: doc.sections.map((s) => ({ ...s, paragraphs: s.paragraphs.map((p) => fillText(p, fill)) })),
    acknowledgment: doc.acknowledgment.map((p) => fillText(p, fill)),
  };
}

/** The sections a signer must initial, in order. */
export function initialSections(doc: FrozenDocument): Section[] {
  return doc.sections.filter((s) => s.initial);
}

/**
 * A stable JSON text of what was agreed (the filled agreement plus who signed and when), for the
 * SHA-256 in the record. Keys are sorted so the same agreement always gives the same bytes.
 */
export function canonicalAgreement(doc: FrozenDocument, fill: Fill, extra: Record<string, string>): string {
  const filled = filledDocument(doc, fill);
  return stableStringify({ agreement: filled, ...extra });
}

/** One spelling of an instant (milliseconds, Z), whatever clock or database wrote it, so a hash can be recomputed later. */
export function normalizeIso(value: string | Date): string {
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) throw new Error("bad_instant");
  return d.toISOString();
}

export function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") {
    const o = value as Record<string, unknown>;
    return `{${Object.keys(o)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${stableStringify(o[k])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

/** A frozen document read back from the database: the shape is checked before use. */
export function parseFrozenDocument(value: unknown): FrozenDocument | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  const strings = (x: unknown): x is string[] => Array.isArray(x) && x.every((s) => typeof s === "string");
  if (typeof v.version !== "string" || typeof v.title !== "string" || !strings(v.intro) || !strings(v.acknowledgment) || !Array.isArray(v.sections)) return null;
  const sections: Section[] = [];
  for (const s of v.sections as unknown[]) {
    if (!s || typeof s !== "object") return null;
    const sec = s as Record<string, unknown>;
    if (typeof sec.key !== "string" || typeof sec.heading !== "string" || !strings(sec.paragraphs) || typeof sec.initial !== "boolean") return null;
    sections.push({ key: sec.key, heading: sec.heading, paragraphs: sec.paragraphs, initial: sec.initial });
  }
  const c = (v.company ?? {}) as Record<string, unknown>;
  const str = (x: unknown) => (typeof x === "string" ? x : "");
  return {
    version: v.version,
    title: v.title,
    intro: v.intro,
    sections,
    acknowledgment: v.acknowledgment,
    consent: str(v.consent),
    adoption: str(v.adoption),
    company: { name: str(c.name), address: str(c.address), ownerName: str(c.ownerName), ownerTitle: str(c.ownerTitle) },
  };
}

/** "AK" from "Anersi Koka" (first letters of up to three words). */
export function initialsOf(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 3)
    .map((w) => w.replace(/^[^\p{L}]+/u, "").charAt(0).toUpperCase())
    .join("");
}

/** A legal name as typed: letters, marks, spaces, apostrophes, hyphens and periods, 2 to 80 characters. */
export function cleanLegalName(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const s = input.replace(/\s+/g, " ").trim();
  if (s.length < 2 || s.length > 80) return null;
  if (!/^[\p{L}\p{M}][\p{L}\p{M} .'’-]*$/u.test(s)) return null;
  if (!/\p{L}/u.test(s)) return null;
  return s;
}

export function cleanEmail(input: unknown): string | null | undefined {
  if (input == null || input === "") return null;
  if (typeof input !== "string") return undefined;
  const s = input.trim().toLowerCase();
  if (s.length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s)) return undefined;
  return s;
}
