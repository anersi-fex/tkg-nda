"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { clearLoginFailures, loginFlooded, loginThrottled, passwordIsRight, recordLoginFailure } from "@/lib/auth";
import { createSessionToken, ownerPassword, SESSION_COOKIE, SESSION_TTL_SECONDS } from "@/lib/session";
import { safeNextPath } from "@/lib/safe-next";
import { clientIp } from "@/lib/request-info";

export type LoginState = { error: string | null };

export async function login(_prev: LoginState, form: FormData): Promise<LoginState> {
  const password = String(form.get("password") ?? "");
  const next = safeNextPath(String(form.get("next") ?? "/"));
  const ip = clientIp(await headers()) || "unknown";
  if (await loginThrottled(ip)) return { error: "Too many tries. Wait 15 minutes and try again." };
  if (!ownerPassword()) return { error: "The app has no password yet. Add OWNER_PASSWORD in Vercel (see SETUP.md)." };
  if (!passwordIsRight(password)) {
    if (!(await loginFlooded())) await recordLoginFailure(ip);
    return { error: "That password isn't right." };
  }
  await clearLoginFailures(ip);
  const token = await createSessionToken(SESSION_TTL_SECONDS);
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
  redirect(next);
}

export async function logout(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  redirect("/login");
}
