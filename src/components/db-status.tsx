import type { Health } from "@/lib/db-health-core";
import { cn } from "@/components/ui";

/** One line that says whether the database answers, and if not, exactly what to change and where. */
export function DbStatus({ health, className }: { health: Health; className?: string }) {
  if (health.ok) {
    return (
      <div className={cn("flex items-center gap-2 rounded-2xl border border-green-200 bg-green-50 px-3.5 py-2.5 text-sm text-green-900", className)}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M5 12.5l4.5 4.5L19 7.5" />
        </svg>
        {health.message}
      </div>
    );
  }
  return (
    <div role="alert" className={cn("rounded-2xl border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-900", className)}>
      <p className="font-bold">{health.message}</p>
      <p className="mt-1 leading-snug">{health.fix}</p>
    </div>
  );
}
