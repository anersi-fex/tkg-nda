import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { InkLockup } from "@/components/brand";
import { emailConfigured } from "@/lib/email";
import { envelopeByToken, listEvents, shownStatus } from "@/lib/envelopes";
import { formatLongDate } from "@/lib/timezone";
import { tokenLooksValid } from "@/lib/tokens";
import { SignView } from "./sign-view";

/**
 * The signing screen. The link's token is the key: no sign-in. Search engines are told to stay
 * away and the browser sends no referrer, so the token never leaks through a link click.
 */
export const metadata: Metadata = { title: "Sign", robots: { index: false, follow: false }, referrer: "no-referrer" };

export default async function SignPage({ params, searchParams }: PageProps<"/s/[token]">) {
  const { token } = await params;
  const q = await searchParams;
  if (!tokenLooksValid(token)) notFound();
  let env;
  try {
    env = await envelopeByToken(token);
  } catch {
    notFound();
  }
  if (!env) notFound();
  const status = shownStatus(env);
  const events = status === "sent" || status === "opened" ? await listEvents(env.id) : [];
  const initialed: Record<string, string> = {};
  for (const e of events) if (e.kind === "initialed" && e.section_key && !initialed[e.section_key]) initialed[e.section_key] = e.at;
  const consentedAt = events.find((e) => e.kind === "consented")?.at ?? null;

  return (
    <main className="flex flex-1 flex-col">
      <SignView
        token={token}
        status={status}
        doc={env.doc}
        today={formatLongDate(new Date())}
        handover={q.h === "1"}
        signer={{
          nameHint: env.signer_name_hint ?? "",
          emailHint: env.signer_email_hint ?? "",
          name: env.signer_name,
          email: env.signer_email,
          signaturePng: env.signature_png,
          initialsPng: env.initials_png,
        }}
        initialed={initialed}
        consentedAt={consentedAt}
        completedAt={env.completed_at}
        emailConfigured={emailConfigured()}
      />
      <footer className="flex items-center justify-center gap-2 pt-2 pb-8 text-[12px] text-gray-500">
        Signed with <InkLockup size={18} />
      </footer>
    </main>
  );
}
