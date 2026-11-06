"use client";

import { Lock, LockOpen } from "lucide-react";
import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import { setPeriodClosed } from "@/lib/actions/office";

/** Eksik olsa bile müşavirin dönemi "tamam" sayması (ör. mükellefin o ay satışı yok). */
export function PeriodCloseButton({ clientId, periodKey, closed }: { clientId: string; periodKey: string; closed: boolean }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button variant="ghost" size="sm" disabled={pending} onClick={() => startTransition(() => setPeriodClosed(clientId, periodKey, !closed))}>
      {closed ? <LockOpen aria-hidden /> : <Lock aria-hidden />}
      {closed ? "Dönemi yeniden aç" : "Dönemi tamam say"}
    </Button>
  );
}
