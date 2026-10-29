import { NextResponse, type NextRequest } from "next/server";
import { cleanEmail, cleanLegalName, initialSections } from "@/lib/document";
import { addEvent, addEventOnce, countEvents, envelopeByToken, findEvent, markOpened, MAX_ADOPTIONS, MAX_OPENS, saveAdoption, shownStatus } from "@/lib/envelopes";
import { CLIENT_EVENT_KINDS, type EventKind } from "@/lib/events";
import { MAX_INITIALS, MAX_SIGNATURE, pngFits, pngInfo } from "@/lib/png";
import { requestInfo } from "@/lib/request-info";
import { sha256Hex, tokenLooksValid } from "@/lib/tokens";
import { formatLongDate } from "@/lib/timezone";

/**
 * One tap, one row. The signer's browser reports what happened (opened, consented, adopted,
 * initialed) and the server stamps when, from which address, where and on what device. The body
 * is never trusted beyond the few fields each kind allows. Each kind is bounded: opens are capped,
 * consent and each initial happen once (unique indexes), adoption is locked after the first
 * initial, so no holder of the link can fill or freeze the record.
 */
const shortString = (v: unknown, max: number): string | undefined => (typeof v === "string" && v.length > 0 ? v.replace(/[\u0000-\u001f\u007f]/g, "").slice(0, max) : undefined);

const json = (status: number, body: Record<string, unknown>) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

export async function POST(req: NextRequest, ctx: RouteContext<"/api/sign/[token]/event">) {
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
  if (status !== "sent" && status !== "opened") return json(409, { error: status });

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const kind = body?.kind as EventKind | undefined;
  if (!body || !kind || !CLIENT_EVENT_KINDS.includes(kind)) return json(400, { error: "bad_kind" });
  const details = (body.details && typeof body.details === "object" ? body.details : {}) as Record<string, unknown>;
  const info = requestInfo(req.headers);

  try {
    switch (kind) {
      case "opened": {
        // Reloads and link previews are many; the record keeps the first MAX_OPENS and the status flip.
        if ((await countEvents(env.id, "opened")) >= MAX_OPENS) return json(200, { ok: true, at: null });
        const ev = await addEvent(env.id, "opened", info, {
          details: { tz: shortString(details.tz, 60), screen: shortString(details.screen, 30), shown_effective_date: formatLongDate(new Date()), handover: details.handover === true ? true : undefined },
        });
        await markOpened(env.id);
        return json(200, { ok: true, at: ev.at });
      }
      case "consented": {
        const { event } = await addEventOnce(env.id, "consented", info, { details: { tz: shortString(details.tz, 60), consent_sha256: sha256Hex(env.doc.consent) } });
        return json(200, { ok: true, at: event.at });
      }
      case "adopted": {
        const name = cleanLegalName(details.name);
        if (!name) return json(400, { error: "bad_name" });
        const email = cleanEmail(details.email);
        if (email === undefined) return json(400, { error: "bad_email" });
        const method = details.method === "drawn" ? "drawn" : details.method === "typed" ? "typed" : null;
        if (!method) return json(400, { error: "bad_method" });
        const style = method === "typed" ? (shortString(details.style, 40) ?? null) : null;
        const signature = pngInfo(details.signaturePng);
        const initials = pngInfo(details.initialsPng);
        if (!pngFits(signature, MAX_SIGNATURE) || !pngFits(initials, MAX_INITIALS)) return json(400, { error: "bad_image" });
        if (!(await findEvent(env.id, "consented"))) return json(409, { error: "not_consented" });
        // After the first initial the name and the images are part of what was initialed: locked.
        if ((await countEvents(env.id, "initialed")) > 0) return json(409, { error: "locked" });
        if ((await countEvents(env.id, "adopted")) >= MAX_ADOPTIONS) return json(409, { error: "too_many_adoptions" });
        const signaturePng = details.signaturePng as string;
        const initialsPng = details.initialsPng as string;
        const saved = await saveAdoption(env.id, { signerName: name, signerEmail: email, method, style, signaturePng, initialsPng });
        if (!saved) return json(409, { error: "changed" });
        const ev = await addEvent(env.id, "adopted", info, {
          details: {
            name,
            email: email ?? undefined,
            method,
            style: style ?? undefined,
            signature_sha256: sha256Hex(signaturePng),
            initials_sha256: sha256Hex(initialsPng),
            adoption_sha256: sha256Hex(env.doc.adoption),
          },
        });
        return json(200, { ok: true, at: ev.at });
      }
      case "initialed": {
        const key = shortString(body.section, 60);
        if (!key || !initialSections(env.doc).some((s) => s.key === key)) return json(400, { error: "bad_section" });
        if (!env.signature_png || !env.initials_png || !env.signer_name) return json(409, { error: "not_adopted" });
        const { event } = await addEventOnce(env.id, "initialed", info, { sectionKey: key, details: { name: env.signer_name, initials_sha256: sha256Hex(env.initials_png) } });
        return json(200, { ok: true, at: event.at });
      }
    }
  } catch (err) {
    console.error(`event_failed envelope=${env.id} kind=${kind} ${err instanceof Error ? err.message : "error"}`);
    return json(503, { error: "database" });
  }
  return json(400, { error: "bad_kind" });
}
