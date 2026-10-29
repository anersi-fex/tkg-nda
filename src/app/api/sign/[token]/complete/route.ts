import { NextResponse, type NextRequest } from "next/server";
import { initialSections } from "@/lib/document";
import { emailConfigured, sendSignedCopy } from "@/lib/email";
import { addEvent, claimCompletion, envelopeByToken, listEvents, saveHashes, shownStatus, storePdf } from "@/lib/envelopes";
import { requestInfo } from "@/lib/request-info";
import { loadSettings } from "@/lib/settings";
import { agreementHash, buildPdf, pdfFilename } from "@/lib/signing";
import { formatStamp } from "@/lib/timezone";
import { tokenLooksValid } from "@/lib/tokens";

/**
 * "Sign and finish": checks that everything was done (consent, an adopted signature, every
 * initial), records the signature tap, seals the agreement (SHA-256 of the text as agreed), makes
 * and stores the PDF, and emails copies when email is set up. Two taps at once: one wins.
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

  const events = await listEvents(env.id);
  const missing: string[] = [];
  if (!events.some((e) => e.kind === "consented")) missing.push("consent");
  if (!env.signature_png || !env.initials_png || !env.signer_name) missing.push("signature");
  for (const s of initialSections(env.doc)) if (!events.some((e) => e.kind === "initialed" && e.section_key === s.key)) missing.push(s.key);
  if (missing.length) return json(409, { error: "incomplete", missing });

  const info = requestInfo(req.headers);
  const completedAt = new Date().toISOString();
  if (!(await claimCompletion(env.id, completedAt))) {
    const again = await envelopeByToken(token);
    return json(200, { ok: true, already: true, completedAt: again?.completed_at ?? completedAt });
  }
  const sealed = { ...env, status: "completed" as const, completed_at: completedAt };

  let emailed = false;
  try {
    const signed = await addEvent(env.id, "signed", info, { details: { name: env.signer_name } });
    const documentSha256 = agreementHash(sealed, completedAt);
    const completed = await addEvent(env.id, "completed", info, { details: { document_sha256: documentSha256 } });
    const { pdf, sha256 } = await buildPdf(sealed, [...events, signed, completed], completedAt, documentSha256);
    await storePdf(env.id, pdf, sha256);
    await saveHashes(env.id, { documentSha256, pdfSha256: sha256 });

    if (emailConfigured()) {
      const settings = await loadSettings();
      const to = [env.signer_email, settings.ownerEmail].filter((x): x is string => !!x);
      if (to.length) {
        emailed = await sendSignedCopy({
          to,
          subject: `${env.doc.title} - signed by ${env.signer_name}`,
          text: `${env.signer_name} signed the ${env.doc.title} with ${env.doc.company.name} on ${formatStamp(completedAt)}. The signed copy with its certificate of completion is attached. Keep it for your records.`,
          pdf,
          filename: pdfFilename(sealed),
        });
        await addEvent(env.id, emailed ? "copy_sent" : "copy_failed", null, { details: { recipients: to.length } });
      }
    }
  } catch (err) {
    // The agreement is completed either way; the PDF is made again on the first download.
    console.error(`complete_failed envelope=${env.id} ${err instanceof Error ? err.name : "error"}`);
    return json(200, { ok: true, completedAt, emailed: false, pdfPending: true });
  }
  return json(200, { ok: true, completedAt, emailed });
}
