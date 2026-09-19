import { describe, expect, it } from "vitest";
import { formatDateSP, formatDecimalBR, formatKg, formatNumberBR, formatTimeSP } from "../displayFormat";

describe("displayFormat — pt-BR e fuso do estúdio", () => {
  it("números com vírgula decimal e travessão para ausente", () => {
    expect(formatNumberBR(12.5, 1)).toBe("12,5");
    expect(formatNumberBR(1234.5, 1)).toBe("1.234,5");
    expect(formatNumberBR(null)).toBe("—");
    expect(formatNumberBR(Number.NaN)).toBe("—");
    expect(formatDecimalBR(40)).toBe("40");
    expect(formatDecimalBR(42.5)).toBe("42,5");
  });
  it("carga em kg sem zeros à direita", () => {
    expect(formatKg(40)).toBe("40 kg");
    expect(formatKg(42.5)).toBe("42,5 kg");
    expect(formatKg(undefined)).toBe("—");
  });
  it("hora e data sempre em America/Sao_Paulo", () => {
    // 10:42 UTC = 07:42 em SP (UTC−3)
    expect(formatTimeSP("2026-09-18T10:42:00Z")).toBe("07:42");
    // 01:00 UTC do dia 19 = 22:00 do dia 18 em SP
    expect(formatDateSP("2026-09-19T01:00:00Z")).toBe("18/09");
    expect(formatDateSP("2026-09-19T01:00:00Z", true)).toBe("18/09/2026");
    expect(formatTimeSP("lixo")).toBe("—");
  });
});
