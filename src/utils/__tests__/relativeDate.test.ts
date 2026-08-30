import { describe, expect, it } from "vitest";
import { daysAgo, formatRelativeDay, parseLocalDate } from "../relativeDate";

// "now" fixo pra determinismo: 26/08/2026 às 21h locais.
const NOW = new Date(2026, 7, 26, 21, 0, 0);

describe("parseLocalDate", () => {
  it("date-only é dia LOCAL, não UTC", () => {
    const d = parseLocalDate("2026-08-26");
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(7);
    expect(d.getDate()).toBe(26);
    expect(d.getHours()).toBe(0);
  });

  it("Date passa direto", () => {
    const d = new Date(2026, 0, 1);
    expect(parseLocalDate(d)).toBe(d);
  });
});

describe("daysAgo / formatRelativeDay", () => {
  it("hoje", () => {
    expect(daysAgo("2026-08-26", NOW)).toBe(0);
    expect(formatRelativeDay("2026-08-26", NOW)).toBe("hoje");
  });

  it("ontem — mesmo à noite (regressão do parse UTC)", () => {
    expect(daysAgo("2026-08-25", NOW)).toBe(1);
    expect(formatRelativeDay("2026-08-25", NOW)).toBe("ontem");
  });

  it("há N dias", () => {
    expect(formatRelativeDay("2026-08-20", NOW)).toBe("há 6 dias");
  });

  it("data futura cai em 'hoje' (nunca 'há -1 dias')", () => {
    expect(formatRelativeDay("2026-08-27", NOW)).toBe("hoje");
  });

  it("atravessa mês corretamente", () => {
    expect(daysAgo("2026-07-31", NOW)).toBe(26);
  });
});

import { daysBetweenDateOnly, shiftDateOnly } from "@/utils/relativeDate";

describe("daysBetweenDateOnly / shiftDateOnly (R8-1/R8-5)", () => {
  it("0 = hoje, 1 = ontem, 2 = anteontem — ancorado na string do produto", () => {
    expect(daysBetweenDateOnly("2026-08-29", "2026-08-29")).toBe(0);
    expect(daysBetweenDateOnly("2026-08-29", "2026-08-28")).toBe(1);
    expect(daysBetweenDateOnly("2026-08-29", "2026-08-27")).toBe(2);
    // vira de mês/ano sem drift (UTC puro, sem fuso do runtime)
    expect(daysBetweenDateOnly("2026-09-01", "2026-08-31")).toBe(1);
    expect(daysBetweenDateOnly("2027-01-01", "2026-12-31")).toBe(1);
  });

  it("shiftDateOnly: janela de 30 dias começa em hoje−29", () => {
    expect(shiftDateOnly("2026-08-29", -29)).toBe("2026-07-31");
    expect(shiftDateOnly("2026-08-31", 1)).toBe("2026-09-01");
  });
});
