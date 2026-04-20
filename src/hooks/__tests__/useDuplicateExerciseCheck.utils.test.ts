import { describe, expect, it } from "vitest";
import { findDuplicateCandidates } from "../duplicateExerciseUtils";

describe("findDuplicateCandidates", () => {
  const rows = [
    { id: "1", name: "Agachamento Livre" },
    { id: "2", name: "Agachamento Búlgaro" },
    { id: "3", name: "Supino Reto" },
  ];

  it("matches accents using normalized text", () => {
    const result = findDuplicateCandidates(rows, "agachamento bulgaro");
    expect(result).toEqual([{ id: "2", name: "Agachamento Búlgaro" }]);
  });

  it("matches when input is longer than the existing exercise name", () => {
    const result = findDuplicateCandidates(rows, "supino reto com barra");
    expect(result).toEqual([{ id: "3", name: "Supino Reto" }]);
  });

  it("excludes the current exercise id when editing", () => {
    const result = findDuplicateCandidates(rows, "agachamento", "1");
    expect(result.map((item) => item.id)).toEqual(["2"]);
  });

  it("returns empty for short query", () => {
    const result = findDuplicateCandidates(rows, "ag");
    expect(result).toEqual([]);
  });
});
