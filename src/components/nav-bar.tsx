"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { InkLockup } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/components/ui";

/** The owner's header: the lockup, and an initials menu (theme, Settings, Sign out). */
export function NavBar({ initials, onLogout }: { initials: string; onLogout: () => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-ink/95 backdrop-blur-sm">
      <div className="mx-auto flex h-[60px] max-w-3xl items-center justify-between px-4">
        <Link href="/" className="rounded-xl" aria-label="Home">
          <InkLockup size={32} />
        </Link>
        <div ref={ref} className="relative">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-haspopup="menu"
            aria-expanded={open}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-tide text-sm font-extrabold text-white shadow-card"
          >
            {initials}
          </button>
          {open && (
            <div role="menu" className={cn("absolute right-0 mt-2 w-60 rounded-2xl bg-surface p-2 shadow-float")}>
              <ThemeToggle className="mb-2" />
              <Link href="/settings" role="menuitem" onClick={() => setOpen(false)} className="block rounded-xl px-3 py-2.5 text-sm font-semibold text-gray-900 hover:bg-gray-50">
                Settings
              </Link>
              <form action={onLogout}>
                <button type="submit" role="menuitem" className="block w-full rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-gray-900 hover:bg-gray-50">
                  Sign out
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
