import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { timingSafeEqual, createHash } from "crypto";
import { verifySessionToken, SESSION_COOKIE, ownerPassword, type Role } from "./session";
import { db } from "./supabase";

/**
 * Session checks. proxy.ts is only an optimistic gate (Next 16): every owner page calls
 * requirePage() and every server action and owner route handler calls requireOwner() before
 * touching data. Signing pages (/s/<token>) and their API are gated by the token, not a session.
 */
export async function currentRole(): Promise<Role | null> {
  try {
    const store = await cookies();
    return await verifySessionToken(store.get(SESSION_COOKIE)?.value);
  } catch {
    return null;
  }
}

/** Pages and layouts: bounce to /login without a valid session. */
export async function requirePage(): Promise<Role> {
  const role = await currentRole();
  if (!role) redirect("/login");
  return role;
}

/** Server actions and route handlers: throw instead of redirecting. */
export async function requireOwner(): Promise<Role> {
  const role = await currentRole();
  if (!role) throw new Error("Not signed in");
  return role;
}

/** Whether a typed password is the owner's, in constant time (both sides hashed first, so lengths never leak). */
export function passwordIsRight(supplied: string): boolean {
  const expected = ownerPassword();
  if (!supplied || !expected) return false;
  const a = createHash("sha256").update(supplied).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

// Login throttle: a per-instance map plus a shared per-address count in login_attempts (holds
// across serverless instances). A flood cap across every address only stops the table from
// growing; it never refuses a right password, so strangers cannot lock the owner out.
const WINDOW_MS = 15 * 60 * 1000;
const MAX_PER_IP = 10;
const MAX_GLOBAL = 500;
const failures = new Map<string, { count: number; resetAt: number }>();

const since = () => new Date(Date.now() - WINDOW_MS).toISOString();

export async function loginThrottled(ip: string): Promise<boolean> {
  const entry = failures.get(ip);
  if (entry && entry.resetAt >= Date.now() && entry.count >= MAX_PER_IP) return true;
  try {
    const mine = await db().from("login_attempts").select("id", { count: "exact", head: true }).gte("at", since()).eq("ip", ip.slice(0, 64));
    return !mine.error && mine.count != null && mine.count >= MAX_PER_IP;
  } catch {
    return false;
  }
}

/** True while the whole table is being flooded: wrong passwords are refused without a new row. */
export async function loginFlooded(): Promise<boolean> {
  try {
    const all = await db().from("login_attempts").select("id", { count: "exact", head: true }).gte("at", since());
    return !all.error && all.count != null && all.count >= MAX_GLOBAL;
  } catch {
    return false;
  }
}

export async function recordLoginFailure(ip: string): Promise<void> {
  const now = Date.now();
  const entry = failures.get(ip);
  if (!entry || entry.resetAt < now) failures.set(ip, { count: 1, resetAt: now + WINDOW_MS });
  else {
    entry.count += 1;
    entry.resetAt = now + WINDOW_MS;
  }
  if (failures.size > 5000) for (const [k, v] of failures) if (v.resetAt < now) failures.delete(k);
  try {
    await db().from("login_attempts").insert({ ip: ip.slice(0, 64) });
  } catch {
    /* best effort */
  }
}

/** A right password clears that address's count (here and in the table), so an earlier typo never counts. */
export async function clearLoginFailures(ip: string): Promise<void> {
  failures.delete(ip);
  try {
    await db().from("login_attempts").delete().eq("ip", ip.slice(0, 64));
  } catch {
    /* best effort */
  }
}
