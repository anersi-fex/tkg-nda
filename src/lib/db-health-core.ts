/**
 * Why the database isn't answering, in plain words, with where to fix it. Pure (no I/O), so it is
 * unit-tested; src/lib/db-health.ts runs the real checks. Never shows a key: only the project's
 * address (not a secret) and what kind of key was given.
 */
export type HealthCode =
  | "ok"
  | "missing_env"
  | "dashboard_url"
  | "bad_url"
  | "publishable_key"
  | "anon_key"
  | "unknown_key"
  | "unreachable"
  | "bad_key"
  | "no_tables"
  | "wrong_project"
  | "permission"
  | "error";

export type Health = { ok: boolean; code: HealthCode; host: string; message: string; fix: string };

const REDEPLOY = "Then in Vercel: Deployments, the top one, the three dots, Redeploy.";
const URL_FIX = `In Supabase: Project Settings > Data API, copy the Project URL (like https://abcd.supabase.co). In Vercel: Settings > Environment Variables, paste it as SUPABASE_URL. ${REDEPLOY}`;
const KEY_FIX = `In Supabase: Project Settings > API Keys, copy the Secret key (starts with sb_secret_). In Vercel: Settings > Environment Variables, paste it as SUPABASE_SERVICE_ROLE_KEY. ${REDEPLOY}`;

export function health(code: HealthCode, host = "", detail = ""): Health {
  const at = host ? ` at ${host}` : "";
  switch (code) {
    case "ok":
      return { ok: true, code, host, message: `Database connected${host ? ` (${host})` : ""}.`, fix: "" };
    case "missing_env":
      return { ok: false, code, host, message: "Vercel doesn't have the database settings yet.", fix: `In Vercel: Settings > Environment Variables, add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY. ${REDEPLOY}` };
    case "dashboard_url":
      return { ok: false, code, host, message: "SUPABASE_URL is the Supabase dashboard's address, not the Project URL.", fix: URL_FIX };
    case "bad_url":
      return { ok: false, code, host, message: "SUPABASE_URL isn't a Supabase project address.", fix: URL_FIX };
    case "publishable_key":
      return { ok: false, code, host, message: "SUPABASE_SERVICE_ROLE_KEY holds the publishable key. The app needs the secret key.", fix: KEY_FIX };
    case "anon_key":
      return { ok: false, code, host, message: "SUPABASE_SERVICE_ROLE_KEY holds the anon (public) key. The app needs the secret key.", fix: KEY_FIX };
    case "unknown_key":
      return { ok: false, code, host, message: "SUPABASE_SERVICE_ROLE_KEY doesn't look like a Supabase key.", fix: KEY_FIX };
    case "unreachable":
      return { ok: false, code, host, message: `Couldn't reach Supabase${at}.`, fix: URL_FIX };
    case "bad_key":
      return { ok: false, code, host, message: `Supabase${at} refused the key. The key and the URL must come from the same project.`, fix: KEY_FIX };
    case "no_tables":
      return { ok: false, code, host, message: `Supabase${at} answered, but Ink's tables aren't there.`, fix: `In Supabase, open the project whose Project URL is ${host || "the one in Vercel"}, then SQL Editor, New query: paste the setup file (step 3) and Run.` };
    case "wrong_project":
      return { ok: false, code, host, message: `Supabase${at} is another app's database, not Ink's.`, fix: `Put the ink project's Project URL and Secret key in Vercel instead. ${REDEPLOY}` };
    case "permission":
      return { ok: false, code, host, message: "The key can't read Ink's tables, so it isn't the secret key.", fix: KEY_FIX };
    case "error":
      return { ok: false, code, host, message: `The database answered with an error${detail ? ` (${detail})` : ""}.`, fix: "Send Claude a screenshot of this screen." };
  }
}

/** "abcd.supabase.co" from the Project URL, else "". */
export function projectHost(url: string | undefined): string {
  if (!url) return "";
  try {
    return new URL(url.trim()).host;
  } catch {
    return "";
  }
}

export type KeyKind = "secret" | "service_role" | "publishable" | "anon" | "unknown";

/** What kind of key it is, from its shape only (a JWT's role claim is not a secret). */
export function keyKind(key: string | undefined): KeyKind {
  const k = (key ?? "").trim();
  if (k.startsWith("sb_secret_")) return "secret";
  if (k.startsWith("sb_publishable_")) return "publishable";
  const parts = k.split(".");
  if (parts.length === 3 && parts[0].startsWith("eyJ")) {
    try {
      const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
      const json = JSON.parse(atob(b64 + "=".repeat((4 - (b64.length % 4)) % 4))) as { role?: unknown };
      if (json.role === "service_role") return "service_role";
      if (json.role === "anon") return "anon";
    } catch {
      return "unknown";
    }
  }
  return "unknown";
}

/** A problem visible from the two settings alone, before any request; null when they look right. */
export function checkConfig(url: string | undefined, key: string | undefined): Health | null {
  if (!url?.trim() || !key?.trim()) return health("missing_env");
  const host = projectHost(url);
  if (!host) return health("bad_url");
  if (/(^|\.)supabase\.com$/i.test(host) || /\/dashboard\//.test(url)) return health("dashboard_url", host);
  const kind = keyKind(key);
  if (kind === "publishable") return health("publishable_key", host);
  if (kind === "anon") return health("anon_key", host);
  if (kind === "unknown") return health("unknown_key", host);
  return null;
}

/** One failed request, read: what the gateway or PostgREST said, mapped to a plain reason. */
export function classifyDbError(err: { code?: string; message?: string } | null, status: number, host: string): Health {
  const code = err?.code ?? "";
  const message = err?.message ?? "";
  if (status === 0 || /^(TypeError|FetchError|AbortError)\b/.test(message) || /ENOTFOUND|ECONNREFUSED|EAI_AGAIN/.test(code + message)) return health("unreachable", host);
  if (code === "PGRST205" || code === "42P01") return health("no_tables", host);
  if (code === "42501") return health("permission", host);
  if (status === 401 || status === 403 || /^PGRST3\d\d$/.test(code) || /invalid api key|jwt/i.test(message)) return health("bad_key", host);
  if (status === 404) return health("bad_url", host);
  return health("error", host, [status || "", code].filter(Boolean).join(" "));
}
