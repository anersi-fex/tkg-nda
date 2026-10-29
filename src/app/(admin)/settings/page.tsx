import { DbStatus } from "@/components/db-status";
import { Card, PageTitle } from "@/components/ui";
import { checkDatabase } from "@/lib/db-health";
import { emailConfigured } from "@/lib/email";
import { loadSettings } from "@/lib/settings";
import { SettingsForm } from "./settings-form";

export const metadata = { title: "Settings" };
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const [settings, health] = await Promise.all([loadSettings(), checkDatabase()]);
  return (
    <>
      <PageTitle sub="The names printed on every agreement">Settings</PageTitle>
      <DbStatus health={health} className="mb-4" />
      <Card>
        <SettingsForm settings={settings} emailConfigured={emailConfigured()} />
      </Card>
    </>
  );
}
