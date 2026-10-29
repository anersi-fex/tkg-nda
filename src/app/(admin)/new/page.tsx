import Link from "next/link";
import { Card, PageTitle } from "@/components/ui";
import { loadSettings } from "@/lib/settings";
import { NewForm } from "./new-form";

export const metadata = { title: "New NDA" };

export default async function NewPage() {
  const settings = await loadSettings();
  return (
    <>
      <PageTitle sub={`Issued by ${settings.companyName}`}>New NDA</PageTitle>
      <Card>
        <NewForm />
      </Card>
      <p className="mt-3 px-1 text-[12.5px] text-gray-500">
        The wording and the company name come from{" "}
        <Link href="/settings" className="font-semibold text-accent-text">
          Settings
        </Link>
        . Each agreement freezes the wording the day you issue it.
      </p>
    </>
  );
}
