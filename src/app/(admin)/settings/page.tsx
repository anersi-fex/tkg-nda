import { Card, PageTitle } from "@/components/ui";
import { emailConfigured } from "@/lib/email";
import { loadSettings } from "@/lib/settings";
import { SettingsForm } from "./settings-form";

export const metadata = { title: "Settings" };
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const settings = await loadSettings();
  return (
    <>
      <PageTitle sub="The names printed on every agreement">Settings</PageTitle>
      <Card>
        <SettingsForm settings={settings} emailConfigured={emailConfigured()} />
      </Card>
    </>
  );
}
