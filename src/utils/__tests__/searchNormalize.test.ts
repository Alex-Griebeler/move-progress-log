import { describe, expect, it } from "vitest";
import { matchesSearch, normalizeForSearch } from "../searchNormalize";

describe("normalizeForSearch", () => {
  it("strips Portuguese accents", () => {
    expect(normalizeForSearch("João")).toBe("joao");
    expect(normalizeForSearch("São Paulo")).toBe("sao paulo");
    expect(normalizeForSearch("Açaí")).toBe("acai");
    expect(normalizeForSearch("Conceição")).toBe("conceicao");
  });

  it("strips other diacritics (acute, grave, circumflex, tilde, diaeresis)", () => {
    expect(normalizeForSearch("café")).toBe("cafe");
    expect(normalizeForSearch("àvó")).toBe("avo");
    expect(normalizeForSearch("ônibus")).toBe("onibus");
    expect(normalizeForSearch("naïve")).toBe("naive");
  });

  it("lower-cases ASCII", () => {
    expect(normalizeForSearch("JOAQUIM")).toBe("joaquim");
    expect(normalizeForSearch("MaRiA")).toBe("maria");
  });

  it("handles null/undefined/empty without throwing", () => {
    expect(normalizeForSearch(null)).toBe("");
    expect(normalizeForSearch(undefined)).toBe("");
    expect(normalizeForSearch("")).toBe("");
  });
});

describe("matchesSearch", () => {
  it("matches partial accented name with unaccented query (the bug Alex reported)", () => {
    expect(matchesSearch("João", "joa")).toBe(true);
    expect(matchesSearch("João da Silva", "joa")).toBe(true);
    expect(matchesSearch("João", "Joã")).toBe(true);
    expect(matchesSearch("Conceição", "concei")).toBe(true);
  });

  it("matches when accented query targets unaccented haystack too", () => {
    // robustness in both directions
    expect(matchesSearch("Joao", "João")).toBe(true);
  });

  it("is case-insensitive", () => {
    expect(matchesSearch("JOÃO", "joa")).toBe(true);
    expect(matchesSearch("joão", "JOA")).toBe(true);
  });

  it("empty needle matches everything", () => {
    expect(matchesSearch("João", "")).toBe(true);
    expect(matchesSearch("João", null)).toBe(true);
    expect(matchesSearch("João", undefined)).toBe(true);
  });

  it("null/undefined haystack does not match non-empty needle", () => {
    expect(matchesSearch(null, "joa")).toBe(false);
    expect(matchesSearch(undefined, "joa")).toBe(false);
  });

  it("non-matching substring returns false", () => {
    expect(matchesSearch("João", "pedro")).toBe(false);
    expect(matchesSearch("Maria", "joa")).toBe(false);
  });
});
