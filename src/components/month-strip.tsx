import Link from "next/link";

import { STATUS_LABELS } from "@/components/status";
import type { BoardStatus } from "@/lib/data";
import { MONTHS, periodKey, type Period } from "@/lib/period";
import { cn } from "@/lib/utils";

// Tamamlanan ay koparılmış yaprak gibi soluk; eksik ay en yüksek sesli hücre.
const CELL: Record<BoardStatus, string> = {
  complete: "bg-done-soft text-done",
  review: "bg-review-soft text-review ring-1 ring-inset ring-review/60",
  missing: "bg-sunday text-white",
  empty: "bg-card text-sunday ring-2 ring-inset ring-sunday",
};

/**
 * 12 aylık şerit: her ay bir takvim yaprağı. Tamamlanan ay soluk, eksik ay kırmızı.
 * Her mükellefte aynı ölçekte durur ki satırlar alt alta karşılaştırılabilsin.
 */
export function MonthStrip({
  strip,
  clientId,
  selected,
}: {
  strip: { period: Period; status: BoardStatus | null }[];
  clientId: string;
  selected?: Period;
}) {
  return (
    <ol className="flex gap-0.5" aria-label="Son 12 dönem">
      {strip.map(({ period, status }) => {
        const isSelected = selected && selected.year === period.year && selected.month === period.month;
        const label = `${MONTHS[period.month - 1]} ${period.year}: ${status ? STATUS_LABELS[status] : "Takip öncesi"}`;
        return (
          <li key={periodKey(period)}>
            <Link
              href={`/mukellefler/${clientId}?donem=${periodKey(period)}`}
              title={label}
              aria-label={label}
              aria-current={isSelected ? "true" : undefined}
              className={cn(
                "flex h-8 w-7 flex-col items-center justify-center rounded-[3px] text-[0.6875rem] leading-none font-bold transition-transform hover:-translate-y-0.5",
                status ? CELL[status] : "border border-dashed border-input",
                isSelected && "outline-2 outline-offset-2 outline-ink",
              )}
            >
              {status ? <span className="[font-stretch:75%]">{MONTHS[period.month - 1].slice(0, 3).toLocaleUpperCase("tr")}</span> : null}
            </Link>
          </li>
        );
      })}
    </ol>
  );
}
