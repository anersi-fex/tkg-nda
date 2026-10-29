import Link from "next/link";
import { DbStatus } from "@/components/db-status";
import { Badge, Card, LinkButton, PageTitle } from "@/components/ui";
import { checkDatabase } from "@/lib/db-health";
import { listEnvelopes, shownStatus, type EnvelopeSummary, type ShownStatus } from "@/lib/envelopes";
import { dbConfigured } from "@/lib/supabase";
import { formatShortStamp } from "@/lib/timezone";

export const dynamic = "force-dynamic";

const STATUS: Record<ShownStatus, { label: string; tone: "gray" | "blue" | "green" | "amber" | "red" }> = {
  sent: { label: "Waiting", tone: "amber" },
  opened: { label: "Opened", tone: "blue" },
  completed: { label: "Signed", tone: "green" },
  voided: { label: "Voided", tone: "gray" },
  expired: { label: "Expired", tone: "red" },
};

export function signerLabel(e: Pick<EnvelopeSummary, "signer_name" | "signer_name_hint">): string {
  return e.signer_name ?? e.signer_name_hint ?? "Unnamed";
}

function Row({ e }: { e: EnvelopeSummary }) {
  const status = shownStatus(e);
  const s = STATUS[status];
  const when = status === "completed" && e.completed_at ? `Signed ${formatShortStamp(e.completed_at)}` : `Issued ${formatShortStamp(e.created_at)}`;
  return (
    <li>
      <Link href={`/nda/${e.id}`} className="flex items-center gap-3 px-4 py-3 transition hover:bg-gray-50">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-bold text-gray-900">{signerLabel(e)}</p>
          <p className="truncate text-[12.5px] text-gray-500">
            {when}
            {e.note ? ` · ${e.note}` : ""}
          </p>
        </div>
        <Badge tone={s.tone}>{s.label}</Badge>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400" aria-hidden>
          <path d="M9 6l6 6-6 6" />
        </svg>
      </Link>
    </li>
  );
}

function Group({ title, items }: { title: string; items: EnvelopeSummary[] }) {
  if (!items.length) return null;
  return (
    <section className="mt-5">
      <h2 className="mb-2 px-1 text-[13px] font-bold tracking-wide text-gray-500 uppercase">{title}</h2>
      <ul className="divide-y divide-line overflow-hidden rounded-[22px] bg-surface shadow-card">
        {items.map((e) => (
          <Row key={e.id} e={e} />
        ))}
      </ul>
    </section>
  );
}

export default async function HomePage() {
  if (!dbConfigured()) {
    return (
      <>
        <PageTitle>Agreements</PageTitle>
        <DbStatus health={await checkDatabase()} />
      </>
    );
  }
  let items: EnvelopeSummary[] = [];
  let failed = false;
  try {
    items = await listEnvelopes();
  } catch {
    failed = true;
  }
  const health = failed ? await checkDatabase() : null;
  const open = items.filter((e) => ["sent", "opened"].includes(shownStatus(e)));
  const signed = items.filter((e) => shownStatus(e) === "completed");
  const closed = items.filter((e) => ["voided", "expired"].includes(shownStatus(e)));
  return (
    <>
      <PageTitle sub={items.length ? `${signed.length} signed · ${open.length} waiting` : "Non-disclosure agreements, signed on a phone"} action={<LinkButton href="/new">New NDA</LinkButton>}>
        Agreements
      </PageTitle>
      {health && <DbStatus health={health} />}
      {!failed && !items.length && (
        <Card className="text-center">
          <p className="text-[15px] font-bold text-gray-900">No agreements yet</p>
          <p className="mt-1 text-[13px] text-gray-600">Tap New NDA, type the person&apos;s name, and hand them the link or the QR code.</p>
        </Card>
      )}
      <Group title="Waiting to sign" items={open} />
      <Group title="Signed" items={signed} />
      <Group title="Voided or expired" items={closed} />
    </>
  );
}
