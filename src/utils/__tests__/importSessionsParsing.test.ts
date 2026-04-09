import { describe, expect, it } from "vitest";
import {
  extractCellValue,
  normalizeHeader,
  parseExcelDate,
  parseTime,
  resolveCanonicalHeader,
} from "@/utils/importSessionsParsing";

describe("importSessionsParsing", () => {
  it("normalizes headers with accents and punctuation", () => {
    expect(normalizeHeader("  Observações! ")).toBe("observacoes");
    expect(resolveCanonicalHeader("Nome do Aluno")).toBe("student");
    expect(resolveCanonicalHeader("Exercício")).toBe("exercise");
    expect(resolveCanonicalHeader("Carga (kg)")).toBe("load");
  });

  it("extracts formula result and richText from excel-like cell objects", () => {
    expect(extractCellValue({ result: 42 })).toBe(42);
    expect(
      extractCellValue({
        richText: [{ text: "Supino" }, { text: " Reto" }],
      })
    ).toBe("Supino Reto");
  });

  it("parses valid excel dates and rejects invalid values", () => {
    expect(parseExcelDate("12/03/2026")).toBe("2026-03-12");
    expect(parseExcelDate("2026-03-12T10:30:00")).toBe("2026-03-12");
    expect(parseExcelDate(45363)).toMatch(/^20\d{2}-\d{2}-\d{2}$/);
    expect(parseExcelDate("")).toBeNull();
    expect(parseExcelDate("invalid-date")).toBeNull();
    expect(parseExcelDate(undefined)).toBeNull();
  });

  it("parses 24h, AM/PM and numeric excel time values", () => {
    expect(parseTime("09:30")).toBe("09:30");
    expect(parseTime("9:30 PM")).toBe("21:30");
    expect(parseTime(0.5)).toBe("12:00");
    expect(parseTime(undefined)).toBe("12:00");
  });
});
