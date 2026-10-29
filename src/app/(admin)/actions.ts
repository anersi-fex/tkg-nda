"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireOwner } from "@/lib/auth";
import { cleanEmail, cleanLegalName, freezeDocument } from "@/lib/document";
import { addEvent, createEnvelope, envelopeById, voidEnvelope } from "@/lib/envelopes";
import { requestInfo } from "@/lib/request-info";
import { cleanSettings, loadSettings, saveSettings, type AppSettings } from "@/lib/settings";

export type ActionResult = { ok: true; message?: string } | { ok: false; error: string };
export type FormState = { error: string | null; saved?: boolean };

/** New NDA: freezes today's wording with the company's names and makes the signing link. */
export async function createNda(_prev: FormState, form: FormData): Promise<FormState> {
  await requireOwner();
  const rawName = String(form.get("name") ?? "").trim();
  const nameHint = rawName ? cleanLegalName(rawName) : null;
  if (rawName && !nameHint) return { error: "The name can hold letters, spaces, apostrophes and hyphens only." };
  const emailHint = cleanEmail(String(form.get("email") ?? ""));
  if (emailHint === undefined) return { error: "That email doesn't look right." };
  const note = String(form.get("note") ?? "")
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .trim()
    .slice(0, 120);
  const settings = await loadSettings();
  const doc = freezeDocument({ name: settings.companyName, address: settings.companyAddress, ownerName: settings.ownerName, ownerTitle: settings.ownerTitle });
  let id: string;
  try {
    const env = await createEnvelope({ doc, signerNameHint: nameHint, signerEmailHint: emailHint, note: note || null, issuedBy: settings.ownerName });
    id = env.id;
  } catch (err) {
    console.error(`create_nda_failed ${err instanceof Error ? err.message : "error"}`);
    return { error: "Couldn't save it. Is the database set up? (SETUP.md step 3)" };
  }
  try {
    await addEvent(id, "issued", requestInfo(await headers()), { details: { by: settings.ownerName, company: settings.companyName } });
  } catch (err) {
    // The envelope exists: show it rather than let the owner make a second one.
    console.error(`issued_event_failed envelope=${id} ${err instanceof Error ? err.message : "error"}`);
  }
  revalidatePath("/");
  redirect(`/nda/${id}?new=1`);
}

export async function voidNda(id: string): Promise<ActionResult> {
  await requireOwner();
  const env = await envelopeById(id);
  if (!env) return { ok: false, error: "Not found." };
  const ok = await voidEnvelope(id);
  if (!ok) return { ok: false, error: "This agreement can't be voided any more (already signed or voided)." };
  await addEvent(id, "voided", requestInfo(await headers()), { details: { by: env.issued_by } });
  revalidatePath("/");
  revalidatePath(`/nda/${id}`);
  return { ok: true, message: "Voided. The link no longer works." };
}

export async function saveAppSettings(_prev: FormState, form: FormData): Promise<FormState> {
  await requireOwner();
  const next = cleanSettings(Object.fromEntries(["companyName", "companyAddress", "ownerName", "ownerTitle", "ownerEmail"].map((k) => [k, form.get(k)])) as Partial<Record<keyof AppSettings, unknown>>);
  if (next.ownerEmail && cleanEmail(next.ownerEmail) === undefined) return { error: "That email doesn't look right." };
  try {
    await saveSettings(next);
  } catch {
    return { error: "Couldn't save. Is the database set up?" };
  }
  revalidatePath("/", "layout");
  return { error: null, saved: true };
}
