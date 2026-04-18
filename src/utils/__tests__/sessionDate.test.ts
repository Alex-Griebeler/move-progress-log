import { describe, expect, it } from "vitest";
import { formatSessionDate } from "@/utils/sessionDate";

describe("formatSessionDate", () => {
  it("formats YYYY-MM-DD without timezone drift", () => {
    expect(formatSessionDate("2026-04-18")).toBe("18/04/2026");
  });

  it("formats DD/MM/YYYY inputs", () => {
    expect(formatSessionDate("18/04/2026")).toBe("18/04/2026");
  });

  it("supports custom format pattern", () => {
    expect(formatSessionDate("2026-04-18", "dd MMM")).toBe("18 abr");
  });

  it("returns fallback for invalid values", () => {
    expect(formatSessionDate("invalid-date")).toBe("--/--/----");
  });
});

