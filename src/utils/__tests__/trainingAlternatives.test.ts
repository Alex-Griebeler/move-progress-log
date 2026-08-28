import { describe, expect, it } from "vitest";
import { getTrainingAlternativesForZone } from "../trainingAlternatives";

describe("getTrainingAlternativesForZone", () => {
  it("cada uma das 5 zonas do motor cai no bloco certo de alternativas", () => {
    expect(getTrainingAlternativesForZone("green_high", 0)[0].type).toMatch(/Desafio Máximo/);
    expect(getTrainingAlternativesForZone("green", 0)[0].type).toMatch(/Treino Completo/);
    expect(getTrainingAlternativesForZone("yellow", 0)[0].type).toMatch(/Redução Moderada/);
    expect(getTrainingAlternativesForZone("orange", 0)[0].type).toMatch(/Recuperação/i);
    expect(getTrainingAlternativesForZone("red", 100)[0].type).not.toMatch(/Desafio/);
  });

  it("zona rebaixada por override mostra alternativas da zona FINAL, não do score", () => {
    // score 90 (seria green_high), mas o motor rebaixou pra green
    const alts = getTrainingAlternativesForZone("green", 90);
    expect(alts[0].type).toMatch(/Treino Completo/);
    expect(alts[0].type).not.toMatch(/Desafio Máximo/);
  });

  it("sem recomendação (fonte Whoop nesta fase): fallback pelo score", () => {
    expect(getTrainingAlternativesForZone(null, 90)[0].type).toMatch(/Desafio Máximo/);
    expect(getTrainingAlternativesForZone(null, 50)[0].type).toMatch(/Redução Moderada/);
  });
});
