import { NextResponse, type NextRequest } from "next/server";
import { requireOwner } from "@/lib/auth";
import { envelopeById } from "@/lib/envelopes";
import { ensurePdf, pdfFilename, pdfResponse } from "@/lib/signing";

/** The Company's copy, for the signed-in owner. */
export async function GET(req: NextRequest, ctx: RouteContext<"/api/nda/[id]/pdf">) {
  try {
    await requireOwner();
  } catch {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { id } = await ctx.params;
  const env = await envelopeById(id);
  if (!env || env.status !== "completed") return NextResponse.json({ error: "not_found" }, { status: 404 });
  const built = await ensurePdf(env);
  if (!built) return NextResponse.json({ error: "pdf_unavailable" }, { status: 503 });
  return pdfResponse(built.pdf, pdfFilename(env), req.nextUrl.searchParams.get("download") === "1");
}
