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
