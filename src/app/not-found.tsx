import Link from "next/link";
import { InkLockup } from "@/components/brand";

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-10 text-center">
      <InkLockup size={44} />
      <h1 className="mt-6 text-[22px] font-extrabold tracking-[-0.03em] text-gray-900">That page isn&apos;t here</h1>
      <p className="mt-2 max-w-sm text-[14px] text-gray-600">If you were sent a signing link, ask the person who sent it for a new one.</p>
      <Link href="/" className="mt-6 text-sm font-bold text-accent-text">
        Home
      </Link>
    </main>
  );
}
