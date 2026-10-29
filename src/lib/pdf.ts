import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFImage, type PDFPage } from "pdf-lib";
import type { FrozenDocument } from "./document";
import { eventLabel, type AuditEvent } from "./events";
import { deviceLabel, geoLabel } from "./request-info";
import { formatStamp } from "./timezone";

/**
 * The signed agreement as a PDF (US Letter): the agreement text as it was shown, the signer's
 * initials stamped under each initialed section with the time and address they came from, the
 * signature page, the Company's acceptance, and a certificate of completion listing every event.
 * Drawn with the standard fonts (no font files to ship) and the signer's own PNG images.
 * Deterministic: the same inputs give the same bytes, so the stored SHA-256 can be checked later.
 */
export type PdfInput = {
  envelopeId: string;
  doc: FrozenDocument; // already filled (signer name and effective date in the text)
  signerName: string;
  signerEmail: string | null;
  signatureMethod: "typed" | "drawn" | null;
  signaturePng: string | null; // data URL
  initialsPng: string | null; // data URL
  effectiveDate: string; // "October 29, 2026"
  completedAt: string; // ISO
  issuedAt: string; // ISO
  issuedBy: string;
  events: AuditEvent[];
  documentSha256: string;
  /** An unsigned copy for reading or printing before signing: no initials, no signature, no certificate. */
  draft?: boolean;
};

const PAGE_W = 612;
const PAGE_H = 792;
const MARGIN = 54;
const TEXT_W = PAGE_W - MARGIN * 2;
const BODY = 10.5;
const LEADING = 14.6;
const INK = rgb(0.08, 0.09, 0.11);
const MUTED = rgb(0.4, 0.42, 0.47);
const LINE = rgb(0.78, 0.8, 0.84);
const GOLD = rgb(0.79, 0.54, 0);

/** Text the standard fonts can draw (WinAnsi): common Unicode punctuation is folded, the rest becomes "?". */
export function winAnsiSafe(text: string): string {
  return text
    .replace(/[‘’‚′]/g, "'")
    .replace(/[“”„″]/g, '"')
    .replace(/[–—―]/g, "-")
    .replace(/…/g, "...")
    .replace(/[   ]/g, " ")
    .replace(/[•◦⁃]/g, "•")
    .replace(/[^\u0009\u000a -~ -ÿ•€]/g, "?");
}

function wrap(font: PDFFont, size: number, text: string, width: number): string[] {
  const lines: string[] = [];
  for (const rawLine of winAnsiSafe(text).split("\n")) {
    const words = rawLine.split(/\s+/).filter(Boolean);
    let line = "";
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, size) <= width) {
        line = candidate;
        continue;
      }
      if (line) lines.push(line);
      // A single word wider than the line is cut into pieces that fit.
      let piece = "";
      for (const ch of word) {
        if (font.widthOfTextAtSize(piece + ch, size) > width && piece) {
          lines.push(piece);
          piece = ch;
        } else piece += ch;
      }
      line = piece;
    }
    lines.push(line);
  }
  return lines;
}

class Writer {
  page!: PDFPage;
  y = 0;
  constructor(
    readonly pdf: PDFDocument,
    readonly fonts: { regular: PDFFont; bold: PDFFont; italic: PDFFont },
  ) {
    this.newPage();
  }
  newPage() {
    this.page = this.pdf.addPage([PAGE_W, PAGE_H]);
    this.y = PAGE_H - MARGIN;
  }
  /** Room for `height` points, else a new page. */
  ensure(height: number) {
    if (this.y - height < MARGIN + 24) this.newPage();
  }
  gap(h: number) {
    this.y -= h;
  }
  text(text: string, opts: { font?: PDFFont; size?: number; color?: ReturnType<typeof rgb>; leading?: number; x?: number; width?: number; after?: number } = {}) {
    const font = opts.font ?? this.fonts.regular;
    const size = opts.size ?? BODY;
    const leading = opts.leading ?? size * 1.39;
    const x = opts.x ?? MARGIN;
    const width = opts.width ?? PAGE_W - x - MARGIN;
    const lines = wrap(font, size, text, width);
    for (const line of lines) {
      this.ensure(leading);
      this.page.drawText(line, { x, y: this.y - size, size, font, color: opts.color ?? INK });
      this.y -= leading;
    }
    this.y -= opts.after ?? 0;
  }
  rule(color = LINE) {
    this.ensure(8);
    this.page.drawLine({ start: { x: MARGIN, y: this.y - 2 }, end: { x: PAGE_W - MARGIN, y: this.y - 2 }, thickness: 0.6, color });
    this.y -= 8;
  }
  image(img: PDFImage, height: number, x = MARGIN) {
    const scale = height / img.height;
    const width = img.width * scale;
    this.ensure(height);
    this.page.drawImage(img, { x, y: this.y - height, width, height });
    this.y -= height;
    return width;
  }
}

async function embedDataUrl(pdf: PDFDocument, dataUrl: string | null): Promise<PDFImage | null> {
  if (!dataUrl || !dataUrl.startsWith("data:image/png;base64,")) return null;
  try {
    return await pdf.embedPng(Buffer.from(dataUrl.slice("data:image/png;base64,".length), "base64"));
  } catch {
    return null;
  }
}

function eventWhere(e: AuditEvent): string {
  const parts = [e.ip ? `IP ${e.ip}` : "", geoLabel(e.geo), deviceLabel(e.user_agent)].filter(Boolean);
  return parts.join(" · ");
}

export async function renderAgreementPdf(input: PdfInput): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const stamp = new Date(input.completedAt);
  pdf.setTitle(`${input.doc.title} - ${input.signerName}`);
  pdf.setAuthor(input.doc.company.name);
  pdf.setSubject(`Signed electronically on ${formatStamp(stamp)}`);
  pdf.setCreator("Ink by TKG");
  pdf.setProducer("Ink by TKG");
  pdf.setCreationDate(stamp);
  pdf.setModificationDate(stamp);

  const fonts = {
    regular: await pdf.embedFont(StandardFonts.Helvetica),
    bold: await pdf.embedFont(StandardFonts.HelveticaBold),
    italic: await pdf.embedFont(StandardFonts.HelveticaOblique),
  };
  const w = new Writer(pdf, fonts);
  const signature = await embedDataUrl(pdf, input.signaturePng);
  const initials = await embedDataUrl(pdf, input.initialsPng);
  const headings = new Map(input.doc.sections.map((s) => [s.key, s.heading]));
  const initialedAt = new Map<string, AuditEvent>();
  for (const e of input.events) if (e.kind === "initialed" && e.section_key && !initialedAt.has(e.section_key)) initialedAt.set(e.section_key, e);
  const signedEvent = input.events.find((e) => e.kind === "signed") ?? null;
  const issuedEvent = input.events.find((e) => e.kind === "issued") ?? null;

  // --- Title block ---
  w.text(input.doc.company.name.toUpperCase(), { font: fonts.bold, size: 9.5, color: MUTED, after: 2 });
  w.text(input.doc.title, { font: fonts.bold, size: 19, leading: 23, after: 4 });
  if (input.draft) {
    w.text("UNSIGNED COPY FOR REVIEW", { font: fonts.bold, size: 10, color: GOLD, after: 2 });
    w.text("This is the agreement as it will be signed. The signed copy adds the initials, the signature and a certificate of completion.", { size: 9, color: MUTED, after: 8 });
  } else {
    w.text(`Effective ${input.effectiveDate}`, { size: 10, color: MUTED, after: 10 });
  }
  w.rule();
  w.gap(6);
  for (const p of input.doc.intro) w.text(p, { leading: LEADING, after: 7 });

  // --- Sections ---
  input.doc.sections.forEach((s, i) => {
    w.ensure(LEADING * 3);
    w.gap(6);
    w.text(`${i + 1}. ${s.heading}`, { font: fonts.bold, size: 11.5, leading: 15, after: 3 });
    for (const p of s.paragraphs) w.text(p, { leading: LEADING, after: 6 });
    if (s.initial && input.draft) {
      w.text("[ Recipient initials here ]", { font: fonts.italic, size: 9, color: GOLD, after: 4 });
    }
    if (s.initial && !input.draft) {
      const ev = initialedAt.get(s.key);
      w.ensure(40);
      const boxTop = w.y;
      const h = 30;
      w.page.drawRectangle({ x: MARGIN, y: boxTop - h, width: TEXT_W, height: h, borderColor: GOLD, borderWidth: 0.8, color: rgb(1, 0.985, 0.94) });
      if (initials) {
        const scale = (h - 8) / initials.height;
        w.page.drawImage(initials, { x: MARGIN + 8, y: boxTop - h + 4, width: initials.width * scale, height: h - 8 });
      }
      const label = ev
        ? `Initialed by ${input.signerName} on ${formatStamp(ev.at)}${ev.ip ? ` from IP ${ev.ip}` : ""}${geoLabel(ev.geo) ? ` (${geoLabel(ev.geo)}, est. from IP)` : ""}`
        : "Not initialed";
      const labelX = MARGIN + 8 + (initials ? (initials.width * (h - 8)) / initials.height + 10 : 0);
      const lines = wrap(fonts.regular, 7.8, label, PAGE_W - MARGIN - labelX - 8);
      let ly = boxTop - 12;
      for (const line of lines.slice(0, 2)) {
        w.page.drawText(line, { x: labelX, y: ly, size: 7.8, font: fonts.regular, color: MUTED });
        ly -= 9.5;
      }
      w.y = boxTop - h - 8;
    }
  });

  // --- Acknowledgment and signatures ---
  w.ensure(120);
  w.gap(8);
  w.text("Acknowledgment", { font: fonts.bold, size: 11.5, leading: 15, after: 3 });
  for (const a of input.doc.acknowledgment) w.text(`•  ${a}`, { leading: LEADING, after: 3, x: MARGIN + 6, width: TEXT_W - 6 });
  w.gap(10);

  w.ensure(150);
  w.text("RECIPIENT", { font: fonts.bold, size: 9.5, color: MUTED, after: 6 });
  if (signature) w.image(signature, 54);
  else w.gap(54);
  w.rule(INK);
  w.text(`${input.signerName}${input.signerEmail ? `  ·  ${input.signerEmail}` : ""}`, { font: fonts.bold, size: 10.5, after: 1 });
  const signedLine = signedEvent
    ? `Signed electronically on ${formatStamp(signedEvent.at)}${eventWhere(signedEvent) ? ` · ${eventWhere(signedEvent)}` : ""}`
    : `Signed electronically on ${formatStamp(stamp)}`;
  w.text(signedLine, { size: 8.5, color: MUTED, after: 1 });
  w.text(`Signature ${input.signatureMethod === "drawn" ? "drawn by hand" : "typed and adopted"} by the signer in the signing app.`, { size: 8.5, color: MUTED, after: 16 });

  w.ensure(90);
  w.text("THE COMPANY", { font: fonts.bold, size: 9.5, color: MUTED, after: 6 });
  w.text(input.doc.company.name, { font: fonts.bold, size: 11, after: 1 });
  w.text(`By ${input.doc.company.ownerName}${input.doc.company.ownerTitle ? `, ${input.doc.company.ownerTitle}` : ""}`, { size: 10, after: 1 });
  const issuedLine = `Issued and accepted electronically on ${formatStamp(issuedEvent?.at ?? input.issuedAt)}${issuedEvent && eventWhere(issuedEvent) ? ` · ${eventWhere(issuedEvent)}` : ""}`;
  w.text(issuedLine, { size: 8.5, color: MUTED, after: 4 });

  // --- Certificate of completion ---
  w.newPage();
  w.text(input.doc.company.name.toUpperCase(), { font: fonts.bold, size: 9.5, color: MUTED, after: 2 });
  w.text("Certificate of Completion", { font: fonts.bold, size: 19, leading: 23, after: 8 });
  w.rule();
  w.gap(6);
  const kv = (k: string, v: string) => {
    w.ensure(LEADING);
    w.page.drawText(k, { x: MARGIN, y: w.y - BODY, size: 9.5, font: fonts.bold, color: MUTED });
    const lines = wrap(fonts.regular, 9.5, v, TEXT_W - 150);
    for (const line of lines) {
      w.ensure(13);
      w.page.drawText(line, { x: MARGIN + 150, y: w.y - BODY, size: 9.5, font: fonts.regular, color: INK });
      w.y -= 13;
    }
    w.y -= 2;
  };
  kv("Document", input.doc.title);
  kv("Envelope ID", input.envelopeId);
  kv("Status", `Completed on ${formatStamp(stamp)}`);
  kv("Signer", `${input.signerName}${input.signerEmail ? ` <${input.signerEmail}>` : ""}`);
  kv("Issued by", `${input.issuedBy} for ${input.doc.company.name}, ${formatStamp(input.issuedAt)}`);
  kv("Agreement text version", input.doc.version);
  kv("Agreement SHA-256", input.documentSha256);
  kv("Time zone", "Times are shown in Eastern Time (America/Detroit). Each event also carries its exact UTC time.");
  w.gap(8);
  w.text(
    "How this was signed: the signer opened a private link made for them, typed their legal name, agreed to sign electronically, adopted a signature and initials, tapped to initial each marked section and tapped to sign. For every tap the server recorded the exact time, the network (IP) address the tap came from, the approximate location of that address and the device and browser used. The agreement text was fixed when the link was issued and its SHA-256 fingerprint is printed above.",
    { size: 9, leading: 12.5, color: MUTED, after: 10 },
  );
  w.text("Timeline", { font: fonts.bold, size: 11.5, leading: 15, after: 4 });
  for (const e of input.events) {
    w.ensure(42);
    const label = eventLabel(e, e.section_key ? headings.get(e.section_key) : undefined);
    w.text(label, { font: fonts.bold, size: 9.5, leading: 12.5 });
    w.text(`${formatStamp(e.at)}  (${new Date(e.at).toISOString()})`, { size: 8.5, leading: 11, color: MUTED });
    const where = eventWhere(e);
    if (where) w.text(where, { size: 8.5, leading: 11, color: MUTED });
    const d = e.details ?? {};
    const extras: string[] = [];
    if (typeof d.tz === "string") extras.push(`browser time zone ${d.tz}`);
    if (typeof d.screen === "string") extras.push(`screen ${d.screen}`);
    if (typeof d.name === "string") extras.push(`name typed: ${d.name}`);
    if (typeof d.style === "string" && d.style) extras.push(`style ${d.style}`);
    if (typeof d.pdf_sha256 === "string") extras.push(`PDF SHA-256 ${d.pdf_sha256}`);
    if (extras.length) w.text(extras.join(" · "), { size: 8.5, leading: 11, color: MUTED });
    w.gap(5);
  }

  // --- Footer on every page ---
  const pages = pdf.getPages();
  pages.forEach((page, i) => {
    const footer = `Envelope ${input.envelopeId} · Agreement SHA-256 ${input.documentSha256} · Page ${i + 1} of ${pages.length}`;
    page.drawText(footer, { x: MARGIN, y: 30, size: 7, font: fonts.regular, color: MUTED });
  });

  return pdf.save({ useObjectStreams: false });
}
