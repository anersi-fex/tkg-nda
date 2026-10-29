import { NextResponse, type NextRequest } from "next/server";
import { initialSections } from "@/lib/document";
import { emailConfigured, sendSignedCopy } from "@/lib/email";
import { addEvent, completeEnvelope, envelopeByToken, listEvents, shownStatus } from "@/lib/envelopes";
import { requestInfo } from "@/lib/request-info";
import { loadSettings } from "@/lib/settings";
import { pdfFilename, sealEnvelope } from "@/lib/signing";
import { formatLongDate, formatStamp } from "@/lib/timezone";
import { tokenLooksValid } from "@/lib/tokens";

/**
 * "Sign and finish": checks that everything was done (consent, an adopted signature, every
 * initial), then one database transaction flips the envelope to completed and records the
 * signing tap ('signed' and 'completed', same instant, the tap's address and device). Then the
 * seal: the agreement's SHA-256, the PDF, its SHA-256, the 'sealed' event. If sealing fails the
 * agreement is still completed and the first download seals it from the same record.
 */
const json = (status: number, body: Record<string, unknown>) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

export async function POST(req: NextRequest, ctx: RouteContext<"/api/sign/[token]/complete">) {
  const { token } = await ctx.params;
  if (!tokenLooksValid(token)) return json(404, { error: "not_found" });
  let env;
  try {
    env = await envelopeByToken(token);
  } catch {
    return json(503, { error: "database" });
  }
  if (!env) return json(404, { error: "not_found" });
  const status = shownStatus(env);
  if (status === "completed") return json(200, { ok: true, already: true, completedAt: env.completed_at });
  if (status !== "sent" && status !== "opened") return json(409, { error: status });

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  // The date the signer read as the Effective Date must be the day they sign (Detroit time).
  if (typeof body.effectiveDate === "string" && body.effectiveDate !== formatLongDate(new Date())) return json(409, { error: "date_changed" });

  let events;
  try {
    events = await listEvents(env.id);
  } catch {
    return json(503, { error: "database" });
  }
  const missing: string[] = [];
  if (!events.some((e) => e.kind === "consented")) missing.push("consent");
  if (!env.signature_png || !env.initials_png || !env.signer_name) missing.push("signature");
  for (const s of initialSections(env.doc)) if (!events.some((e) => e.kind === "initialed" && e.section_key === s.key)) missing.push(s.key);
  if (missing.length) return json(409, { error: "incomplete", missing });

  const info = requestInfo(req.headers);
  let claimed: { completedAt: string } | null;
  try {
    claimed = await completeEnvelope(env.id, info, env.signer_name ?? "");
  } catch (err) {
    console.error(`complete_failed envelope=${env.id} ${err instanceof Error ? err.message : "error"}`);
    return json(503, { error: "database" });
  }
  if (!claimed) {
    // Someone else finished first (a second tap), or the owner voided it meanwhile.
    let again;
    try {
      again = await envelopeByToken(token);
    } catch {
      return json(503, { error: "database" });
    }
    if (again?.status === "completed" && again.completed_at) return json(200, { ok: true, already: true, completedAt: again.completed_at });
    return json(409, { error: again ? shownStatus(again) : "not_found" });
  }
  const sealed = { ...env, status: "completed" as const, completed_at: claimed.completedAt };

  let emailed = false;
  let pdfPending = false;
  try {
    const seal = await sealEnvelope(sealed);
    if (!seal) throw new Error("seal_missing");
    if (emailConfigured()) {
      const settings = await loadSettings();
      const to = [env.signer_email, settings.ownerEmail].filter((x): x is string => !!x);
      if (to.length) {
        emailed = await sendSignedCopy({
          to,
          subject: `${env.doc.title} - signed by ${env.signer_name}`,
          text: `${env.signer_name} signed the ${env.doc.title} with ${env.doc.company.name} on ${formatStamp(claimed.completedAt)}. The signed copy with its certificate of completion is attached. Keep it for your records.`,
          pdf: seal.pdf,
          filename: pdfFilename(sealed),
        });
        await addEvent(env.id, emailed ? "copy_sent" : "copy_failed", null, { details: { recipients: to.length } }).catch(() => undefined);
      }
    }
  } catch (err) {
    // Completed either way; the first download seals it from the same record.
    console.error(`seal_failed envelope=${env.id} ${err instanceof Error ? err.message : "error"}`);
    pdfPending = true;
  }
  return json(200, { ok: true, completedAt: claimed.completedAt, emailed, pdfPending });
}
