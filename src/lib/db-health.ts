import "server-only";
import { checkConfig, classifyDbError, health, projectHost, type Health } from "./db-health-core";
import { db } from "./supabase";

/** The tables the migration makes; all must answer for the database to count as Ink's. */
const TABLES = ["envelopes", "events", "signed_pdfs", "settings", "login_attempts"] as const;

/**
 * Checks the two Vercel settings, then reads one row from each of Ink's tables (real selects:
 * a HEAD count can report a missing table as present). A database that has a `settings` table
 * but no `envelopes` is another app's: nothing is written to it.
 */
export async function checkDatabase(): Promise<Health> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const problem = checkConfig(url, key);
  if (problem) return problem;
  const host = projectHost(url);
  try {
    for (const table of TABLES) {
      const { error, status } = await db().from(table).select("*").limit(1);
      if (!error) continue;
      const h = classifyDbError(error, status, host);
      if (h.code === "no_tables" && table === "envelopes") {
        const other = await db().from("settings").select("key").limit(1);
        if (!other.error) return health("wrong_project", host);
      }
      console.error(`db_health table=${table} status=${status} code=${error.code ?? ""}`);
      return h;
    }
    return health("ok", host);
  } catch (err) {
    console.error(`db_health_failed ${err instanceof Error ? err.name : "error"}`);
    return health("unreachable", host);
  }
}
