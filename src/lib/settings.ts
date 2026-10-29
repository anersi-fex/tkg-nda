import "server-only";
import { db, dbConfigured } from "./supabase";

/** The names the agreement prints. The owner edits them in Settings; these are the first values. */
export type AppSettings = {
  companyName: string;
  companyAddress: string;
  ownerName: string;
  ownerTitle: string;
  /** Where the owner's copy of each signed agreement goes (optional; needs RESEND_API_KEY). */
  ownerEmail: string;
};

export const DEFAULT_SETTINGS: AppSettings = {
  companyName: "The Koka Group",
  companyAddress: "Troy, Michigan",
  ownerName: "Anersi Koka",
  ownerTitle: "Owner",
  ownerEmail: "",
};

const LIMITS: Record<keyof AppSettings, number> = { companyName: 120, companyAddress: 200, ownerName: 80, ownerTitle: 60, ownerEmail: 120 };

export function cleanSettings(input: Partial<Record<keyof AppSettings, unknown>>): AppSettings {
  const out = { ...DEFAULT_SETTINGS };
  for (const key of Object.keys(LIMITS) as Array<keyof AppSettings>) {
    const v = input[key];
    if (typeof v === "string") {
      const s = v.replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, LIMITS[key]);
      if (s || key === "ownerEmail") out[key] = s;
    }
  }
  return out;
}

export async function loadSettings(): Promise<AppSettings> {
  if (!dbConfigured()) return DEFAULT_SETTINGS;
  try {
    const { data, error } = await db().from("settings").select("value").eq("key", "app").maybeSingle();
    if (error || !data) return DEFAULT_SETTINGS;
    return cleanSettings((data.value ?? {}) as Partial<AppSettings>);
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettings(next: AppSettings): Promise<void> {
  const { error, status } = await db().from("settings").upsert({ key: "app", value: next, updated_at: new Date().toISOString() });
  if (error) {
    console.error(`settings_save_failed status=${status} code=${error.code ?? ""}`);
    throw new Error("settings_save_failed");
  }
}
