import { describe, expect, it } from "vitest";

import { formatPhone, normalizePhone } from "./phone";
import { reminderMessage } from "./reminder";

describe("phone", () => {
  it.each([
    ["0532 111 22 33", "905321112233"],
    ["+90 (532) 111-22-33", "905321112233"],
    ["5321112233", "905321112233"],
  ])("%s", (raw, expected) => expect(normalizePhone(raw)).toBe(expected));

  it("sabit hat ve eksik numarayı reddeder", () => {
    expect(normalizePhone("0212 111 22 33")).toBeNull();
    expect(normalizePhone("0532 111")).toBeNull();
  });

  it("okunur biçim", () => expect(formatPhone("905321112233")).toBe("0532 111 22 33"));
});

describe("reminderMessage", () => {
  it("eksikleri ve son günü yazar", () => {
    const text = reminderMessage({
      contactName: "Mehmet",
      officeName: "Demo Mali Müşavirlik",
      period: { year: 2026, month: 10 },
      collectionDay: 20,
      missing: ["Alış faturaları", "Z raporları"],
      link: "https://x.test/y/abc",
    });
    expect(text).toContain("Merhaba Mehmet,");
    expect(text).toContain("Ekim 2026 dönemi");
    expect(text).toContain("• Z raporları");
    expect(text).toContain("Son gün: 20 Kasım");
  });
});
