import Link from "next/link";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { CopyButton } from "@/components/copy-button";
import { Badge, Card, Notice } from "@/components/ui";
import { appBase } from "@/lib/app-url";
import { envelopeById, listEvents, shownStatus, type ShownStatus } from "@/lib/envelopes";
import { eventLabel, timeline } from "@/lib/events";
import { deviceLabel, geoLabel } from "@/lib/request-info";
import { formatStamp } from "@/lib/timezone";
import { VoidButton } from "./void-button";

export const dynamic = "force-dynamic";

const STATUS: Record<ShownStatus, { label: string; tone: "gray" | "blue" | "green" | "amber" | "red"; line: string }> = {
  sent: { label: "Waiting", tone: "amber", line: "The link is ready. Nobody has opened it yet." },
  opened: { label: "Opened", tone: "blue", line: "Opened, not signed yet." },
  completed: { label: "Signed", tone: "green", line: "Signed and sealed. The PDF holds the certificate of completion." },
  voided: { label: "Voided", tone: "gray", line: "Voided. The link no longer works." },
  expired: { label: "Expired", tone: "red", line: "The link expired unsigned (links last two weeks). Issue a new one." },
};

export default async function NdaPage({ params, searchParams }: PageProps<"/nda/[id]">) {
  const { id } = await params;
  const q = await searchParams;
  const env = await envelopeById(id);
  if (!env) notFound();
  const events = await listEvents(env.id);
  const status = shownStatus(env);
  const s = STATUS[status];
  const link = `${await appBase()}/s/${env.token}`;
  const qr = status === "sent" || status === "opened" ? await QRCode.toString(link, { type: "svg", margin: 1, width: 240, color: { dark: "#15171c", light: "#ffffff" } }) : null;
  const headings = new Map(env.doc.sections.map((x) => [x.key, x.heading]));
  const name = env.signer_name ?? env.signer_name_hint ?? "Unnamed";
  const smsBody = encodeURIComponent(`Here is the non-disclosure agreement from ${env.doc.company.name}. Please read and sign it on your phone before your visit: ${link}`);

  return (
    <>
      <Link href="/" className="inline-flex items-center gap-1 text-[13px] font-bold text-accent-text">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M15 6l-6 6 6 6" />
        </svg>
        Agreements
      </Link>
      <div className="mt-2 mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-[26px] leading-tight font-extrabold tracking-[-0.035em] text-gray-900">{name}</h1>
          <p className="mt-0.5 text-[13.5px] text-gray-500">
            {env.doc.title}
            {env.note ? ` · ${env.note}` : ""}
          </p>
        </div>
        <Badge tone={s.tone} className="mt-2 shrink-0">
          {s.label}
        </Badge>
      </div>
      {q.new === "1" && qr && <Notice tone="green">Link made. Hand them your phone, let them scan the code, or text them the link.</Notice>}
      <p className="mt-3 px-1 text-[13.5px] text-gray-600">{s.line}</p>

      {qr && (
        <Card className="mt-4">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
            <div className="shrink-0 rounded-2xl bg-white p-2 shadow-card" style={{ width: 176, height: 176 }} dangerouslySetInnerHTML={{ __html: qr }} aria-label="QR code of the signing link" role="img" />
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-bold tracking-wide text-gray-500 uppercase">Signing link</p>
              <p className="mt-1 font-mono text-[12px] break-all text-gray-700">{link}</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <CopyButton text={link} className="rounded-xl" />
                <a href={`sms:?&body=${smsBody}`} className="inline-flex min-h-11 items-center justify-center rounded-xl border border-line bg-surface px-4 text-sm font-bold text-gray-900 shadow-card">
                  Text it
                </a>
                <Link href={`/s/${env.token}?h=1`} className="col-span-2 inline-flex min-h-11 items-center justify-center rounded-xl bg-tide-strong px-4 text-sm font-bold text-white shadow-glow">
                  Open it here to hand over the phone
                </Link>
              </div>
              <p className="mt-2 text-[12px] text-gray-500">The link works for 14 days from today, once, for this person. Send it a day or more before the visit so they can read it.</p>
            </div>
          </div>
        </Card>
      )}

      {status === "completed" && (
        <Card className="mt-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-bold text-gray-900">Signed copy</p>
              <p className="text-[12.5px] text-gray-500">
                {env.signer_name}
                {env.signer_email ? ` · ${env.signer_email}` : ""} · {env.completed_at ? formatStamp(env.completed_at) : ""}
              </p>
            </div>
            <div className="flex gap-2">
              <a href={`/api/nda/${env.id}/pdf`} target="_blank" rel="noopener" className="inline-flex min-h-11 items-center justify-center rounded-xl bg-tide-strong px-4 text-sm font-bold text-white shadow-glow">
                Open PDF
              </a>
              <a href={`/api/nda/${env.id}/pdf?download=1`} className="inline-flex min-h-11 items-center justify-center rounded-xl border border-line bg-surface px-4 text-sm font-bold text-gray-900 shadow-card">
                Download
              </a>
            </div>
          </div>
          <p className="mt-3 text-[12px] text-gray-500">
            Keep the PDF together with{" "}
            <a href={`/api/nda/${env.id}/record?download=1`} className="font-semibold text-accent-text">
              the record as a file (JSON)
            </a>
            : the agreement text as signed, the hashes and every event.
          </p>
          {(env.document_sha256 || env.pdf_sha256) && (
            <dl className="mt-3 grid gap-1 border-t border-line pt-3 text-[11.5px]">
              {env.document_sha256 && (
                <div>
                  <dt className="font-bold text-gray-500">Agreement SHA-256</dt>
                  <dd className="font-mono break-all text-gray-700">{env.document_sha256}</dd>
                </div>
              )}
              {env.pdf_sha256 && (
                <div>
                  <dt className="font-bold text-gray-500">PDF SHA-256</dt>
                  <dd className="font-mono break-all text-gray-700">{env.pdf_sha256}</dd>
                </div>
              )}
            </dl>
          )}
        </Card>
      )}

      <section className="mt-6">
        <h2 className="mb-2 px-1 text-[13px] font-bold tracking-wide text-gray-500 uppercase">Record of every step</h2>
        <ol className="divide-y divide-line overflow-hidden rounded-[22px] bg-surface shadow-card">
          {timeline(events).map(({ event: e, repeats, lastAt }) => {
            const where = [e.ip ? `IP ${e.ip}` : "", geoLabel(e.geo), deviceLabel(e.user_agent)].filter(Boolean).join(" · ");
            return (
              <li key={e.id} className="px-4 py-3">
                <p className="text-[14px] font-bold text-gray-900">{eventLabel(e, e.section_key ? headings.get(e.section_key) : undefined)}</p>
                <p className="font-mono text-[12px] text-gray-600">{formatStamp(e.at)}</p>
                {where && <p className="text-[12px] text-gray-500">{where}</p>}
                {repeats > 0 && <p className="text-[12px] text-gray-500">Opened again {repeats} more {repeats === 1 ? "time" : "times"} from the same device, last {formatStamp(lastAt)}</p>}
              </li>
            );
          })}
        </ol>
      </section>

      {(status === "sent" || status === "opened") && (
        <div className="mt-6">
          <VoidButton id={env.id} />
        </div>
      )}
      <p className="mt-6 px-1 text-[11.5px] text-gray-500">
        Envelope {env.id} · wording version {env.template_version} · issued by {env.issued_by}
      </p>
    </>
  );
}
