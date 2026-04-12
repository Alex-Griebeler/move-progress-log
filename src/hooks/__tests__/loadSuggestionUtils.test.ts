import { describe, expect, it } from "vitest";
import {
  isEligibleStrengthCategory,
  normalizeComparableText,
} from "../loadSuggestionUtils";

describe("loadSuggestionUtils", () => {
  it("normalizes accents and punctuation", () => {
    expect(normalizeComparableText("  Força/hipertrofia  ")).toBe(
      "forca hipertrofia"
    );
  });

  it("accepts strength and hypertrophy categories", () => {
    expect(isEligibleStrengthCategory("Força")).toBe(true);
    expect(isEligibleStrengthCategory("Hipertrofia")).toBe(true);
    expect(isEligibleStrengthCategory("força e potência")).toBe(true);
  });

  it("rejects non-strength categories", () => {
    expect(isEligibleStrengthCategory("Mobilidade")).toBe(false);
    expect(isEligibleStrengthCategory("Potência")).toBe(false);
    expect(isEligibleStrengthCategory(null)).toBe(false);
  });
});
