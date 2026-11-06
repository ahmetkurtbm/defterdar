import { Check, CircleDashed, Clock3, X } from "lucide-react";

import type { BoardStatus } from "@/lib/data";
import { cn } from "@/lib/utils";

export const STATUS_LABELS: Record<BoardStatus, string> = {
  complete: "Tamam",
  review: "Onay bekliyor",
  missing: "Eksik",
  empty: "Hiç gelmedi",
};

const STYLES: Record<BoardStatus, string> = {
  complete: "bg-done-soft text-done",
  review: "bg-review-soft text-review",
  missing: "bg-sunday-soft text-sunday",
  empty: "border border-sunday/40 text-sunday",
};

const ICONS = { complete: Check, review: Clock3, missing: X, empty: CircleDashed };

export function StatusMark({ status, className }: { status: BoardStatus; className?: string }) {
  const Icon = ICONS[status];
  return (
    <span className={cn("inline-flex h-6 items-center gap-1 rounded-sm px-1.5 text-xs font-semibold whitespace-nowrap", STYLES[status], className)}>
      <Icon className="size-3.5" aria-hidden />
      {STATUS_LABELS[status]}
    </span>
  );
}

const DOC_STATUS = {
  pending: { label: "Onay bekliyor", className: "bg-review-soft text-review" },
  accepted: { label: "Onaylandı", className: "bg-done-soft text-done" },
  rejected: { label: "Reddedildi", className: "bg-sunday-soft text-sunday" },
} as const;

export function DocumentStatus({ status }: { status: keyof typeof DOC_STATUS }) {
  const s = DOC_STATUS[status];
  return <span className={cn("inline-flex h-6 items-center rounded-sm px-1.5 text-xs font-semibold whitespace-nowrap", s.className)}>{s.label}</span>;
}
