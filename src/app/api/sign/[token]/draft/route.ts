import { NextResponse, type NextRequest } from "next/server";
import { envelopeByToken } from "@/lib/envelopes";
import { buildDraftPdf, pdfResponse } from "@/lib/signing";
import { tokenLooksValid } from "@/lib/tokens";

/** The unsigned agreement as a PDF, so a signer can read, save or print it before signing. */
export async function GET(req: NextRequest, ctx: RouteContext<"/api/sign/[token]/draft">) {
  const { token } = await ctx.params;
  if (!tokenLooksValid(token)) return NextResponse.json({ error: "not_found" }, { status: 404 });
  let env;
  try {
    env = await envelopeByToken(token);
  } catch {
    return NextResponse.json({ error: "database" }, { status: 503 });
  }
  if (!env) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (env.status === "completed") return NextResponse.redirect(new URL(`/api/sign/${token}/pdf`, req.url));
  try {
    const pdf = await buildDraftPdf(env);
    return pdfResponse(pdf, "NDA - unsigned copy.pdf", req.nextUrl.searchParams.get("download") === "1");
  } catch (err) {
    console.error(`draft_pdf_failed envelope=${env.id} ${err instanceof Error ? err.name : "error"}`);
    return NextResponse.json({ error: "pdf_unavailable" }, { status: 503 });
  }
}
