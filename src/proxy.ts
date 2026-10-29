// Next 16 proxy (the middleware successor): an optimistic session gate for the owner's screens.
// Real checks also run in every owner page (requirePage) and every action and route (requireOwner).
// Signing pages (/s/<token>) are public by design: the token in the link is the key.
import { NextResponse, type NextRequest } from "next/server";
import { verifySessionToken, SESSION_COOKIE } from "@/lib/session";
import { safeNextPath } from "@/lib/safe-next";

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  let role: string | null = null;
  try {
    role = await verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value);
  } catch {
    role = null; // a missing secret locks the app; it never shows a 500
  }
  if (pathname === "/login") return role ? NextResponse.redirect(new URL(safeNextPath(request.nextUrl.searchParams.get("next")), request.url)) : NextResponse.next();
  if (!role) {
    const login = new URL("/login", request.url);
    if (pathname !== "/") login.searchParams.set("next", pathname + search);
    return NextResponse.redirect(login);
  }
  return NextResponse.next();
}

export const config = {
  // Everything except: signing pages (/s/...), API routes (they check their own auth), Next
  // internals, and the public files a phone fetches without a session (icons, fonts, manifest).
  matcher: ["/((?!s/|api/|_next/static|_next/image|fonts/|splash/|manifest.webmanifest|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|ico|ttf|woff2?)$).*)"],
};
