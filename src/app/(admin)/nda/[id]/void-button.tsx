"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { voidNda, type ActionResult } from "../../actions";
import { Button } from "@/components/ui";

export function VoidButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [result, setResult] = useState<ActionResult | null>(null);
  return (
    <div>
      <Button
        type="button"
        variant="secondary"
        className="w-full rounded-2xl text-red-700"
        disabled={pending}
        onClick={() => {
          if (!window.confirm("Void this agreement? The link stops working. This can't be undone.")) return;
          start(async () => {
            const r = await voidNda(id);
            setResult(r);
            if (r.ok) router.refresh();
          });
        }}
      >
        {pending ? "Voiding..." : "Void this agreement"}
      </Button>
      {result && !result.ok && <p className="mt-2 text-[13px] text-red-700">{result.error}</p>}
    </div>
  );
}
