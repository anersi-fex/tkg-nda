"use client";

import { useState, useTransition } from "react";
import { saveAppSettings, type FormState } from "../actions";
import { Button, Input, Label, Notice } from "@/components/ui";
import type { AppSettings } from "@/lib/settings";

/** Submits through onSubmit + FormData (never a form action prop): React 19 would reset the fields after an action. */
export function SettingsForm({ settings, emailConfigured }: { settings: AppSettings; emailConfigured: boolean }) {
  const [pending, start] = useTransition();
  const [state, setState] = useState<FormState>({ error: null });
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        start(async () => setState(await saveAppSettings({ error: null }, data)));
      }}
    >
      {state.error && <Notice tone="red">{state.error}</Notice>}
      {state.saved && !state.error && <Notice tone="green">Saved. New agreements use these names.</Notice>}
      <div>
        <Label htmlFor="companyName">Company legal name</Label>
        <Input id="companyName" name="companyName" defaultValue={settings.companyName} maxLength={120} required />
        <p className="mt-1 text-[12px] text-gray-500">As registered, for example &quot;The Koka Group, LLC&quot;.</p>
      </div>
      <div>
        <Label htmlFor="companyAddress">Company address</Label>
        <Input id="companyAddress" name="companyAddress" defaultValue={settings.companyAddress} maxLength={200} required />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="ownerName">Your name</Label>
          <Input id="ownerName" name="ownerName" defaultValue={settings.ownerName} maxLength={80} required />
        </div>
        <div>
          <Label htmlFor="ownerTitle">Your title</Label>
          <Input id="ownerTitle" name="ownerTitle" defaultValue={settings.ownerTitle} maxLength={60} />
        </div>
      </div>
      <div>
        <Label htmlFor="ownerEmail">Your email for signed copies (optional)</Label>
        <Input id="ownerEmail" name="ownerEmail" type="email" defaultValue={settings.ownerEmail} maxLength={120} />
        <p className="mt-1 text-[12px] text-gray-500">
          {emailConfigured ? "Email sending is on: each signed PDF is emailed here and to the signer." : "Email sending is off (no RESEND_API_KEY). Signed PDFs are downloaded from the app instead."}
        </p>
      </div>
      <Button type="submit" className="h-12 w-full rounded-2xl text-[15px]" disabled={pending}>
        {pending ? "Saving..." : "Save"}
      </Button>
    </form>
  );
}
