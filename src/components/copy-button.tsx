"use client";

import { useState } from "react";
import { Button } from "@/components/ui";

/** Copies text to the clipboard and says so for a moment. */
export function CopyButton({ text, label = "Copy link", className }: { text: string; label?: string; className?: string }) {
  const [done, setDone] = useState(false);
  return (
    <Button
      type="button"
      variant="secondary"
      className={className}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 1800);
        } catch {
          window.prompt("Copy this link:", text);
        }
      }}
    >
      {done ? "Copied" : label}
    </Button>
  );
}
