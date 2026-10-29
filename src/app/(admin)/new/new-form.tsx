"use client";

import { useActionState } from "react";
import { createNda, type FormState } from "../actions";
import { Button, Input, Label, Notice } from "@/components/ui";

export function NewForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(createNda, { error: null });
  return (
    <form action={action} className="space-y-4">
      {state.error && <Notice tone="red">{state.error}</Notice>}
      <div>
        <Label htmlFor="name">Who is signing? (optional)</Label>
        <Input id="name" name="name" autoComplete="off" placeholder="First and last name" maxLength={80} autoFocus />
        <p className="mt-1 text-[12px] text-gray-500">They confirm or fix it when they sign.</p>
      </div>
      <div>
        <Label htmlFor="email">Their email (optional)</Label>
        <Input id="email" name="email" type="email" inputMode="email" autoComplete="off" placeholder="For their signed copy" maxLength={120} />
      </div>
      <div>
        <Label htmlFor="note">Note to yourself (optional)</Label>
        <Input id="note" name="note" placeholder="Office visit, Oct 30" maxLength={120} />
      </div>
      <Button type="submit" className="h-12 w-full rounded-2xl text-[15px]" disabled={pending}>
        {pending ? "Making the link..." : "Make the signing link"}
      </Button>
    </form>
  );
}
