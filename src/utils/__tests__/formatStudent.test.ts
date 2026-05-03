import { describe, expect, it } from "vitest";
import { formatFitnessLevel } from "../formatStudent";

describe("formatFitnessLevel", () => {
  it("maps the 3 known values to capitalized + accented labels", () => {
    expect(formatFitnessLevel("iniciante")).toBe("Iniciante");
    expect(formatFitnessLevel("intermediario")).toBe("Intermediário");
    expect(formatFitnessLevel("avancado")).toBe("Avançado");
  });

  it("returns empty string for null / undefined / empty (safe to render)", () => {
    expect(formatFitnessLevel(null)).toBe("");
    expect(formatFitnessLevel(undefined)).toBe("");
    expect(formatFitnessLevel("")).toBe("");
  });

  it("returns the raw value for unexpected input — does not mask data drift", () => {
    expect(formatFitnessLevel("expert")).toBe("expert");
    expect(formatFitnessLevel("Avançado")).toBe("Avançado"); // already-formatted passes through
  });
});
