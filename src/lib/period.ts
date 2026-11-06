// Dönem hesapları. Müşavir her ay bir önceki ayın evrakını toplar; ayın evrakı takip eden
// ayın `collectionDay` gününe kadar beklenir. Tüm tarihler İstanbul saatine göredir.

export type Period = { year: number; month: number };

export const MONTHS = [
  "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
  "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık",
] as const;

const TZ = "Europe/Istanbul";

/** İstanbul'daki takvim günü (saat bilgisi olmadan). */
export function istanbulDate(now: Date): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "numeric", day: "numeric" })
    .formatToParts(now);
  const get = (type: string) => Number(parts.find((p) => p.type === type)!.value);
  return { year: get("year"), month: get("month"), day: get("day") };
}

export function shiftPeriod(p: Period, delta: number): Period {
  const index = p.year * 12 + (p.month - 1) + delta;
  return { year: Math.floor(index / 12), month: (index % 12) + 1 };
}

/** Şu an toplanan dönem: bir önceki ay. */
export function currentPeriod(now: Date = new Date()): Period {
  const today = istanbulDate(now);
  return shiftPeriod({ year: today.year, month: today.month }, -1);
}

/** Dönem evrakının son teslim günü (takip eden ayın `collectionDay`'i). */
export function dueDate(p: Period, collectionDay: number): Period & { day: number } {
  const next = shiftPeriod(p, 1);
  return { ...next, day: collectionDay };
}

/** Son teslim gününe kalan gün; geçtiyse negatif. */
export function daysUntilDue(p: Period, collectionDay: number, now: Date = new Date()): number {
  const due = dueDate(p, collectionDay);
  const today = istanbulDate(now);
  const dueUtc = Date.UTC(due.year, due.month - 1, due.day);
  const todayUtc = Date.UTC(today.year, today.month - 1, today.day);
  return Math.round((dueUtc - todayUtc) / 86_400_000);
}

export function periodLabel(p: Period): string {
  return `${MONTHS[p.month - 1]} ${p.year}`;
}

export function periodKey(p: Period): string {
  return `${p.year}-${String(p.month).padStart(2, "0")}`;
}

export function parsePeriodKey(value: string | undefined | null): Period | null {
  const match = /^(\d{4})-(\d{2})$/.exec(value ?? "");
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (year < 2000 || year > 2100 || month < 1 || month > 12) return null;
  return { year, month };
}

export function comparePeriods(a: Period, b: Period): number {
  return a.year * 12 + a.month - (b.year * 12 + b.month);
}
