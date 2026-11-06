import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { classifyByName } from "./classify";
import { DEFAULT_DOCUMENT_TYPES } from "./document-types";

const codes = new Set<string>(DEFAULT_DOCUMENT_TYPES.map((t) => t.code));

describe("classifyByName", () => {
  it.each([
    ["Ekim_hesap_ekstresi.pdf", "banka_ekstresi"],
    ["z raporu 12.10.jpg", "z_raporu"],
    ["satis-faturalari-ekim.zip", "satis_faturasi"],
    ["IMG_fatura_shell.jpg", "alis_faturasi"],
    ["kira-makbuzu.png", "kira_makbuzu"],
  ])("%s → %s", (name, code) => {
    expect(classifyByName(name, codes).code).toBe(code);
  });

  it("tanınmayan ad için tür önermez", () => {
    expect(classifyByName("IMG_2026.jpg", codes)).toMatchObject({ code: null, confidence: 0 });
  });

  it("ofiste olmayan türü önermez", () => {
    expect(classifyByName("ekstre.pdf", new Set(["alis_faturasi"])).code).toBeNull();
  });
});
