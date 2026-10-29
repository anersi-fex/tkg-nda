import { NextResponse, type NextRequest } from "next/server";
import { addEvent, countEvents, envelopeByToken, MAX_EVENTS } from "@/lib/envelopes";
import { requestInfo } from "@/lib/request-info";
import { ensurePdf, pdfFilename, pdfResponse } from "@/lib/signing";
import { tokenLooksValid } from "@/lib/tokens";

/** The signer's copy: anyone holding the link to a completed agreement can download it. */
export async function GET(req: NextRequest, ctx: RouteContext<"/api/sign/[token]/pdf">) {
  const { token } = await ctx.params;
  if (!tokenLooksValid(token)) return NextResponse.json({ error: "not_found" }, { status: 404 });
  let env;
  try {
    env = await envelopeByToken(token);
  } catch {
    return NextResponse.json({ error: "database" }, { status: 503 });
  }
  if (!env || env.status !== "completed") return NextResponse.json({ error: "not_found" }, { status: 404 });
  const built = await ensurePdf(env);
  if (!built) return NextResponse.json({ error: "pdf_unavailable" }, { status: 503 });
  try {
    if ((await countEvents(env.id)) < MAX_EVENTS) await addEvent(env.id, "viewed_pdf", requestInfo(req.headers));
  } catch {
    /* the download still goes through */
  }
  return pdfResponse(built.pdf, pdfFilename(env), req.nextUrl.searchParams.get("download") === "1");
}
