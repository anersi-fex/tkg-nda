import { NextResponse, type NextRequest } from "next/server";
import { requireOwner } from "@/lib/auth";
import { envelopeById, listEvents } from "@/lib/envelopes";

/**
 * The owner's export of one agreement's record as JSON: the envelope (without the signing token
 * and the images), the frozen agreement text, the hashes and every event. For keeping alongside
 * the PDF, as the agreement's own terms ask.
 */
export async function GET(req: NextRequest, ctx: RouteContext<"/api/nda/[id]/record">) {
  try {
    await requireOwner();
  } catch {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { id } = await ctx.params;
  const env = await envelopeById(id);
  if (!env) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const events = await listEvents(env.id);
  const { token: _token, signature_png: _s, initials_png: _i, document: _d, doc, ...rest } = env;
  void _token;
  void _s;
  void _i;
  void _d;
  const body = JSON.stringify(
    {
      exported_at: new Date().toISOString(),
      how_to_verify:
        "agreement_sha256 = SHA-256 of the canonical JSON {agreement: <this agreement with {{SIGNER_NAME}} and {{EFFECTIVE_DATE}} filled>, completed_at: <envelope.completed_at as an ISO instant with milliseconds and Z>, envelope_id, signer_email, template_version}, keys sorted at every level, no spaces (src/lib/document.ts canonicalAgreement, src/lib/signing.ts agreementHash). pdf_sha256 = SHA-256 of the stored PDF bytes. Both are also in the 'sealed' event.",
      envelope: rest,
      agreement: doc,
      events,
    },
    null,
    2,
  );
  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `${req.nextUrl.searchParams.get("download") === "1" ? "attachment" : "inline"}; filename="NDA record ${env.id}.json"`,
      "Cache-Control": "private, no-store",
    },
  });
}
