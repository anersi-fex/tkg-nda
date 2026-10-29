import { NextResponse, type NextRequest } from "next/server";
import { cleanEmail, cleanLegalName, initialSections } from "@/lib/document";
import { addEvent, countEvents, envelopeByToken, listEvents, markOpened, MAX_EVENTS, saveAdoption, shownStatus } from "@/lib/envelopes";
import { CLIENT_EVENT_KINDS, type EventKind } from "@/lib/events";
import { requestInfo } from "@/lib/request-info";
import { tokenLooksValid } from "@/lib/tokens";

/**
 * One tap, one row. The signer's browser reports what happened (opened, consented, adopted,
 * initialed) and the server stamps when, from which address, where and on what device. The body
 * is never trusted beyond the few fields each kind allows.
 */
const PNG_PREFIX = "data:image/png;base64,";
const PNG_MAX_CHARS = 400_000;
const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

function validPng(value: unknown): value is string {
  if (typeof value !== "string" || !value.startsWith(PNG_PREFIX) || value.length > PNG_MAX_CHARS || value.length < PNG_PREFIX.length + 100) return false;
  const head = Buffer.from(value.slice(PNG_PREFIX.length, PNG_PREFIX.length + 16), "base64");
  return PNG_MAGIC.every((b, i) => head[i] === b);
}

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
  if ((await countEvents(env.id)) >= MAX_EVENTS) return json(429, { error: "too_many_events" });

  try {
    switch (kind) {
      case "opened": {
        const ev = await addEvent(env.id, "opened", info, { details: { tz: shortString(details.tz, 60), screen: shortString(details.screen, 30) } });
        await markOpened(env.id);
        return json(200, { ok: true, at: ev.at });
      }
      case "consented": {
        const existing = (await listEvents(env.id)).find((e) => e.kind === "consented");
        if (existing) return json(200, { ok: true, at: existing.at });
        const ev = await addEvent(env.id, "consented", info, { details: { tz: shortString(details.tz, 60) } });
        return json(200, { ok: true, at: ev.at });
      }
      case "adopted": {
        const name = cleanLegalName(details.name);
        if (!name) return json(400, { error: "bad_name" });
        const email = cleanEmail(details.email);
        if (email === undefined) return json(400, { error: "bad_email" });
        const method = details.method === "drawn" ? "drawn" : details.method === "typed" ? "typed" : null;
        if (!method) return json(400, { error: "bad_method" });
        const style = method === "typed" ? shortString(details.style, 40) ?? null : null;
        if (!validPng(details.signaturePng) || !validPng(details.initialsPng)) return json(400, { error: "bad_image" });
        const events = await listEvents(env.id);
        if (!events.some((e) => e.kind === "consented")) return json(409, { error: "not_consented" });
        const saved = await saveAdoption(env.id, { signerName: name, signerEmail: email, method, style, signaturePng: details.signaturePng, initialsPng: details.initialsPng });
        if (!saved) return json(409, { error: "changed" });
        const ev = await addEvent(env.id, "adopted", info, { details: { name, email: email ?? undefined, method, style: style ?? undefined } });
        return json(200, { ok: true, at: ev.at });
      }
      case "initialed": {
        const key = shortString(body.section, 60);
        if (!key || !initialSections(env.doc).some((s) => s.key === key)) return json(400, { error: "bad_section" });
        if (!env.signature_png || !env.signer_name) return json(409, { error: "not_adopted" });
        const existing = (await listEvents(env.id)).find((e) => e.kind === "initialed" && e.section_key === key);
        if (existing) return json(200, { ok: true, at: existing.at });
        const ev = await addEvent(env.id, "initialed", info, { sectionKey: key, details: { name: env.signer_name } });
        return json(200, { ok: true, at: ev.at });
      }
    }
  } catch (err) {
    console.error(`event_failed envelope=${env.id} kind=${kind} ${err instanceof Error ? err.name : "error"}`);
    return json(500, { error: "failed" });
  }
  return json(400, { error: "bad_kind" });
}
