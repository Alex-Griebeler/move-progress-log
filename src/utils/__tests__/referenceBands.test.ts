import { describe, expect, it } from "vitest";
import { buildReferenceBands, toneForClassification } from "../referenceBands";

// Subset real do seed PR-8a: VO₂ masculino 20-29 (FRIEND 2015)
const VO2_M_20_29 = [
  { classification: "Muito Fraco", min: 0, max: 32.09 },
  { classification: "Fraco", min: 32.1, max: 40.09 },
  { classification: "Regular", min: 40.1, max: 47.99 },
  { classification: "Bom", min: 48, max: 55.19 },
  { classification: "Excelente", min: 55.2, max: 66.29 },
  { classification: "Superior", min: 66.3, max: 120 },
];

describe("buildReferenceBands", () => {
  it("recorta o domínio em volta das fronteiras reais (não plota 0→120)", () => {
    const r = buildReferenceBands(VO2_M_20_29, 45)!;
    // fronteiras: 32.1 … 66.3 → span 34.2, margem 8.55
    expect(r.min).toBeCloseTo(23.55, 2);
    expect(r.max).toBeCloseTo(74.85, 2);
  });

  it("expande o domínio pra conter valor abaixo da primeira fronteira", () => {
    const r = buildReferenceBands(VO2_M_20_29, 15)!;
    expect(r.min).toBeLessThan(15);
    expect(r.max).toBeGreaterThan(66.3);
  });

  it("expande o domínio pra conter valor acima do topo (marcador não gruda na borda)", () => {
    const r = buildReferenceBands(VO2_M_20_29, 90)!;
    expect(r.max).toBeGreaterThan(90);
  });

  it("nunca produz min negativo", () => {
    const r = buildReferenceBands(VO2_M_20_29, 0)!;
    expect(r.min).toBeGreaterThanOrEqual(0);
  });

  it("as bandas guardam os limites CLÍNICOS reais, não o recorte visual", () => {
    // A barra imprime "label from–to" no rótulo: recortar aqui faria a tela
    // dizer que "Muito Fraco" começa em 23,55 quando começa em 0.
    const r = buildReferenceBands(VO2_M_20_29, 45)!;
    expect(r.bands).toHaveLength(6);
    expect(r.bands[0].from).toBe(0);
    expect(r.bands[0].to).toBe(32.09);
    expect(r.bands[r.bands.length - 1].to).toBe(120);
    // e o domínio de exibição continua recortado
    expect(r.min).toBeGreaterThan(0);
    expect(r.max).toBeLessThan(120);
  });

  it("os limites das bandas espelham exatamente as linhas do banco", () => {
    const r = buildReferenceBands(VO2_M_20_29, 45)!;
    expect(r.bands.map((b) => [b.from, b.to])).toEqual(
      VO2_M_20_29.map((row) => [row.min, row.max]),
    );
  });

  it("preserva a ordem e os rótulos das classes", () => {
    const r = buildReferenceBands([...VO2_M_20_29].reverse(), 45)!;
    expect(r.bands.map((b) => b.label)).toEqual([
      "Muito Fraco",
      "Fraco",
      "Regular",
      "Bom",
      "Excelente",
      "Superior",
    ]);
  });

  it("sem faixas → null (chamador esconde a barra)", () => {
    expect(buildReferenceBands([], 40)).toBeNull();
  });

  it("descarta linhas inválidas (max <= min, NaN)", () => {
    const r = buildReferenceBands(
      [
        { classification: "Bom", min: 10, max: 20 },
        { classification: "Quebrada", min: 30, max: 30 },
        { classification: "NaN", min: Number.NaN, max: 50 },
      ],
      15,
    )!;
    expect(r.bands.map((b) => b.label)).toEqual(["Bom"]);
  });

  it("valor null não afeta o domínio (barra sem marcador)", () => {
    const comValor = buildReferenceBands(VO2_M_20_29, 45)!;
    const semValor = buildReferenceBands(VO2_M_20_29, null)!;
    expect(semValor.min).toBeCloseTo(comValor.min, 5);
    expect(semValor.max).toBeCloseTo(comValor.max, 5);
  });

  it("faixa única (sem fronteira interna) não explode", () => {
    const r = buildReferenceBands([{ classification: "Bom", min: 0, max: 10 }], 5)!;
    expect(r.bands).toHaveLength(1);
    expect(r.max).toBeGreaterThan(r.min);
  });
});

describe("toneForClassification", () => {
  it("mapeia as 6 classes de VO₂", () => {
    expect(toneForClassification("Muito Fraco")).toBe("destructive");
    expect(toneForClassification("Regular")).toBe("warning");
    expect(toneForClassification("Bom")).toBe("success");
    expect(toneForClassification("Superior")).toBe("primary");
  });

  it("mapeia handgrip: Médio é normal (success), não neutro", () => {
    expect(toneForClassification("Muito Baixo")).toBe("destructive");
    expect(toneForClassification("Baixo")).toBe("warning");
    expect(toneForClassification("Médio")).toBe("success");
    expect(toneForClassification("Muito Alto")).toBe("primary");
  });

  it("mapeia sit-to-stand", () => {
    expect(toneForClassification("Alerta")).toBe("destructive");
    expect(toneForClassification("Atenção")).toBe("warning");
  });

  it("classe desconhecida → neutral (nunca explode)", () => {
    expect(toneForClassification("Inventada")).toBe("neutral");
  });
});
