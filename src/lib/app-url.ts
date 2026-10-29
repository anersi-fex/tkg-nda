import "server-only";
import { headers } from "next/headers";

/**
 * The app's address for links it hands out (signing links): APP_URL when set, else the address
 * this request came in on, so links work before APP_URL is set in Vercel.
 */
export async function appBase(): Promise<string> {
  const env = process.env.APP_URL?.trim().replace(/\/$/, "");
  if (env) return env;
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  if (!host) return "";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https");
  return `${proto}://${host}`;
}
