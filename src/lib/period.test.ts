import { describe, expect, it } from "vitest";

import { currentPeriod, daysUntilDue, dueDate, parsePeriodKey, periodKey, shiftPeriod } from "./period";

describe("period", () => {
  it("toplanan dönem bir önceki aydır, yıl başında geriye sarar", () => {
    expect(currentPeriod(new Date("2026-11-02T10:00:00Z"))).toEqual({ year: 2026, month: 10 });
    expect(currentPeriod(new Date("2027-01-05T10:00:00Z"))).toEqual({ year: 2026, month: 12 });
  });

  it("İstanbul saatine göre ay değişir", () => {
    // UTC'de 31 Ekim 22:30 → İstanbul'da 1 Kasım 01:30
    expect(currentPeriod(new Date("2026-10-31T22:30:00Z"))).toEqual({ year: 2026, month: 10 });
  });

  it("son gün takip eden aydadır", () => {
    expect(dueDate({ year: 2026, month: 12 }, 20)).toEqual({ year: 2027, month: 1, day: 20 });
  });

  it("kalan gün negatif olabilir", () => {
    const p = { year: 2026, month: 10 };
    expect(daysUntilDue(p, 20, new Date("2026-11-13T09:00:00Z"))).toBe(7);
    expect(daysUntilDue(p, 20, new Date("2026-11-22T09:00:00Z"))).toBe(-2);
  });

  it("dönem anahtarı gidiş-dönüş", () => {
    const p = shiftPeriod({ year: 2026, month: 3 }, -5);
    expect(p).toEqual({ year: 2025, month: 10 });
    expect(parsePeriodKey(periodKey(p))).toEqual(p);
    expect(parsePeriodKey("2026-13")).toBeNull();
    expect(parsePeriodKey("abc")).toBeNull();
  });
});
