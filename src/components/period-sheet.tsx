import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

import { daysUntilDue, dueDate, MONTHS, periodKey, shiftPeriod, type Period } from "@/lib/period";
import { cn } from "@/lib/utils";

/**
 * Dönem yaprağı: duvar takviminin günlük yaprağı gibi. Büyük kırmızı rakam son teslim
 * günüdür; yaprağın altı bu dönemde kaç mükellefin tamamlandığını gösterir.
 */
export function PeriodSheet({
  period,
  collectionDay,
  totals,
  hrefFor,
  isCurrent,
}: {
  period: Period;
  collectionDay: number;
  totals: { clients: number; complete: number; review: number; missing: number };
  hrefFor: (p: Period) => string;
  isCurrent: boolean;
}) {
  const due = dueDate(period, collectionDay);
  const days = daysUntilDue(period, collectionDay);
  const done = totals.complete;
  const ratio = totals.clients === 0 ? 0 : done / totals.clients;

  const countdown =
    days > 1 ? `${days} gün kaldı` : days === 1 ? "Yarın son gün" : days === 0 ? "Bugün son gün" : `${-days} gün geçti`;

  return (
    <section aria-label="Dönem" className="perforated overflow-hidden rounded-lg border border-rule bg-card shadow-[0_1px_0_var(--rule),0_8px_24px_-16px_oklch(0.25_0.045_262/0.35)]">
      <div className="flex items-center justify-between bg-sunday px-4 pt-4 pb-2.5 text-white sm:px-5">
        <div className="flex items-center gap-1">
          <Link
            href={hrefFor(shiftPeriod(period, -1))}
            className="grid size-8 place-items-center rounded-md transition-colors hover:bg-white/15"
            aria-label="Önceki dönem"
          >
            <ChevronLeft className="size-4" />
          </Link>
          <h1 className="min-w-36 text-center text-base font-bold tracking-wide uppercase [font-stretch:85%]">
            {MONTHS[period.month - 1]} {period.year}
          </h1>
          <Link
            href={hrefFor(shiftPeriod(period, 1))}
            className="grid size-8 place-items-center rounded-md transition-colors hover:bg-white/15"
            aria-label="Sonraki dönem"
          >
            <ChevronRight className="size-4" />
          </Link>
        </div>
        <span className="text-sm font-medium text-white/85">{isCurrent ? "Toplanan dönem" : "Geçmiş dönem"}</span>
      </div>

      <div className="grid grid-cols-[auto_1fr] items-end gap-x-5 gap-y-4 px-4 pt-5 pb-4 sm:grid-cols-[auto_1fr_auto] sm:px-5">
        <div className="flex items-end gap-3">
          <span className="numeral text-[5.5rem] text-sunday sm:text-[6.5rem]" aria-hidden>
            {due.day}
          </span>
          <div className="pb-1.5">
            <p className="text-sm font-semibold text-muted-foreground">
              Son gün {due.day} {MONTHS[due.month - 1]}
            </p>
            <p className={cn("text-xl font-bold", days < 0 ? "text-sunday" : days <= 5 ? "text-review" : "text-foreground")}>{countdown}</p>
          </div>
        </div>

        <dl className="col-span-2 grid grid-cols-3 gap-px self-stretch overflow-hidden rounded-md border border-rule bg-rule sm:col-span-1 sm:col-start-3">
          <Tally label="Tamam" value={totals.complete} className="text-done" />
          <Tally label="Onay bekliyor" value={totals.review} className="text-review" />
          <Tally label="Eksik" value={totals.missing} className="text-sunday" />
        </dl>
      </div>

      <div className="px-4 pb-4 sm:px-5">
        <div className="flex items-baseline justify-between text-sm">
          <span className="font-semibold">
            {done}/{totals.clients} mükellef tamamlandı
          </span>
          <span className="tabular-nums text-muted-foreground">%{Math.round(ratio * 100)}</span>
        </div>
        <div
          className="mt-1.5 grid h-2 gap-0.5"
          style={{ gridTemplateColumns: `repeat(${Math.max(totals.clients, 1)}, minmax(0, 1fr))` }}
          role="img"
          aria-label={`${totals.clients} mükelleften ${done} tanesi tamamlandı`}
        >
          {Array.from({ length: totals.clients }, (_, i) => (
            <span
              key={i}
              className={cn(
                "rounded-[1px]",
                i < done ? "bg-done" : i < done + totals.review ? "bg-review/70" : "bg-sunday/25",
              )}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function Tally({ label, value, className }: { label: string; value: number; className?: string }) {
  return (
    <div className="flex min-w-24 flex-col justify-between gap-2 bg-card px-3 py-2.5">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className={cn("numeral text-4xl", className)}>{value}</dd>
    </div>
  );
}

export function periodHref(base: string) {
  return (p: Period) => `${base}?donem=${periodKey(p)}`;
}
