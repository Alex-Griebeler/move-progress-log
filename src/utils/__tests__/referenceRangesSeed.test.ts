import { describe, expect, it } from "vitest";
import {
  classifyHandgrip,
  classifyVo2,
  filterRangesBySexAge,
} from "../classification";
import { HANDGRIP_SEED, VO2_SEED } from "../__fixtures__/referenceRangesSeed";

/**
 * Sanidade do seed científico PR-8a (fixture espelha a migração
 * 20260827120000_seed_reference_ranges.sql — mesmos UUIDs e valores).
 *
 * Fontes: FRIEND 2015 (Kaminsky, Mayo Clin Proc, Tabela 3) pro VO₂;
 * Mathiowetz 1985 (Arch Phys Med Rehabil, Tabela 2, mão direita) pro handgrip.
 */

const VO2_CLASSES = ["Muito Fraco", "Fraco", "Regular", "Bom", "Excelente", "Superior"] as const;
const HG_CLASSES = ["Muito Baixo", "Baixo", "Médio", "Alto", "Muito Alto"] as const;

const sexes = ["M", "F"] as const;
const near = (a: number, b: number) => Math.abs(a - b) < 1e-9;

describe("cobertura etária sem buracos por sexo", () => {
  it("VO₂: décadas 20-29 … 70-79 nos dois sexos", () => {
    for (const sex of sexes) {
      const bands = [...new Set(VO2_SEED.filter((r) => r.sex === sex).map((r) => `${r.age_min}-${r.age_max}`))].sort();
      expect(bands).toEqual(["20-29", "30-39", "40-49", "50-59", "60-69", "70-79"]);
    }
  });

  it("handgrip: faixas de 5 anos 20-24 … 70-74 + 75-99 nos dois sexos", () => {
    for (const sex of sexes) {
      const bands = [...new Set(HANDGRIP_SEED.filter((r) => r.sex === sex).map((r) => `${r.age_min}-${r.age_max}`))];
      expect(bands).toHaveLength(12);
      // contiguidade: cada faixa começa onde a anterior terminou + 1
      const sorted = bands.map((b) => b.split("-").map(Number)).sort((a, b) => a[0] - b[0]);
      expect(sorted[0][0]).toBe(20);
      expect(sorted[sorted.length - 1]).toEqual([75, 99]);
      for (let i = 1; i < sorted.length; i++) {
        expect(sorted[i][0]).toBe(sorted[i - 1][1] + 1);
      }
    }
  });

  it("contagens totais: 72 VO₂ (2×6×6) e 120 handgrip (2×12×5)", () => {
    expect(VO2_SEED).toHaveLength(72);
    expect(HANDGRIP_SEED).toHaveLength(120);
  });
});

describe("bandas contíguas dentro de cada sexo+faixa (passo 0.01, sem furo)", () => {
  it("VO₂: 6 classes, 0 → 120, fronteiras crescentes", () => {
    for (const sex of sexes) {
      for (const ageMin of [20, 30, 40, 50, 60, 70]) {
        const rows = VO2_SEED.filter((r) => r.sex === sex && r.age_min === ageMin);
        const ordered = VO2_CLASSES.map((c) => rows.find((r) => r.classification === c)!);
        expect(ordered.every(Boolean)).toBe(true);
        expect(ordered[0].vo2_min).toBe(0);
        expect(ordered[ordered.length - 1].vo2_max).toBe(120);
        for (let i = 1; i < ordered.length; i++) {
          expect(near(ordered[i].vo2_min, ordered[i - 1].vo2_max + 0.01)).toBe(true);
          expect(ordered[i].vo2_min).toBeGreaterThan(ordered[i - 1].vo2_min);
        }
      }
    }
  });

  it("handgrip: 5 classes, 0 → 150, fronteiras crescentes", () => {
    for (const sex of sexes) {
      const ageMins = [...new Set(HANDGRIP_SEED.filter((r) => r.sex === sex).map((r) => r.age_min))];
      for (const ageMin of ageMins) {
        const rows = HANDGRIP_SEED.filter((r) => r.sex === sex && r.age_min === ageMin);
        const ordered = HG_CLASSES.map((c) => rows.find((r) => r.classification === c)!);
        expect(ordered.every(Boolean)).toBe(true);
        expect(ordered[0].kg_min).toBe(0);
        expect(ordered[ordered.length - 1].kg_max).toBe(150);
        for (let i = 1; i < ordered.length; i++) {
          expect(near(ordered[i].kg_min, ordered[i - 1].kg_max + 0.01)).toBe(true);
          expect(ordered[i].kg_min).toBeGreaterThan(ordered[i - 1].kg_min);
        }
      }
    }
  });

  it("todos os valores cabem em numeric(5,2): ≥0, <1000, no máx 2 casas", () => {
    const twoDp = (x: number) => near(Math.round(x * 100) / 100, x);
    for (const r of VO2_SEED) {
      for (const v of [r.vo2_min, r.vo2_max]) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThan(1000);
        expect(twoDp(v)).toBe(true);
      }
    }
    for (const r of HANDGRIP_SEED) {
      for (const v of [r.kg_min, r.kg_max]) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThan(1000);
        expect(twoDp(v)).toBe(true);
      }
    }
  });

  it("UUIDs únicos e estáveis (determinísticos por chave semântica)", () => {
    const ids = [...VO2_SEED, ...HANDGRIP_SEED].map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
    // regressão de estabilidade: se o gerador mudar a derivação de UUID,
    // este teste quebra ANTES de alguém reaplicar a migração com ids novos
    expect(VO2_SEED.find((r) => r.sex === "M" && r.age_min === 20 && r.classification === "Bom")!.id)
      .toBe("054cb8b7-dd8f-5b8d-9316-59f6c30cd649");
  });
});

describe("âncoras da literatura (rastreabilidade verbatim)", () => {
  it("VO₂ M 20-29: Bom começa no p50 (48.0), Superior no p95 (66.3), Muito Fraco termina antes do p10 (32.1)", () => {
    const rows = VO2_SEED.filter((r) => r.sex === "M" && r.age_min === 20);
    expect(rows.find((r) => r.classification === "Bom")!.vo2_min).toBe(48.0);
    expect(rows.find((r) => r.classification === "Superior")!.vo2_min).toBe(66.3);
    expect(rows.find((r) => r.classification === "Muito Fraco")!.vo2_max).toBe(32.09);
  });

  it("VO₂ F 70-79: Superior começa no p95 (24.1)", () => {
    const row = VO2_SEED.find((r) => r.sex === "F" && r.age_min === 70 && r.classification === "Superior")!;
    expect(row.vo2_min).toBe(24.1);
  });

  it("handgrip M 20-24: Médio = média±1DP (121.0±20.6 lb → 45.5–64.19 kg)", () => {
    const row = HANDGRIP_SEED.find((r) => r.sex === "M" && r.age_min === 20 && r.classification === "Médio")!;
    expect(row.kg_min).toBe(45.5);
    expect(row.kg_max).toBe(64.19);
  });

  it("handgrip F 75+: faixa vai até 99 anos e Muito Alto começa em média+2DP (42.6+22 lb → 29.3 kg)", () => {
    const row = HANDGRIP_SEED.find((r) => r.sex === "F" && r.age_min === 75 && r.classification === "Muito Alto")!;
    expect(row.age_max).toBe(99);
    expect(row.kg_min).toBe(29.3);
  });

  // Âncoras extras digitadas direto da Tabela 3 do FRIEND (anti-circularidade:
  // se o gerador corromper uma célula, alguma destas quebra)
  it("cortes FRIEND adicionais: F 40-49 e M 60-69", () => {
    const f40 = VO2_SEED.filter((r) => r.sex === "F" && r.age_min === 40);
    expect(f40.find((r) => r.classification === "Fraco")!.vo2_min).toBe(18.8); // p10
    expect(f40.find((r) => r.classification === "Regular")!.vo2_min).toBe(22.1); // p25
    expect(f40.find((r) => r.classification === "Excelente")!.vo2_min).toBe(32.4); // p75
    const m60 = VO2_SEED.filter((r) => r.sex === "M" && r.age_min === 60);
    expect(m60.find((r) => r.classification === "Bom")!.vo2_min).toBe(28.2); // p50
    expect(m60.find((r) => r.classification === "Superior")!.vo2_min).toBe(43.0); // p95
  });

  it("cortes Mathiowetz adicionais: F 55-59 (57.3±12.5 lb) e M 70-74 (75.3±21.5 lb)", () => {
    const f55 = HANDGRIP_SEED.filter((r) => r.sex === "F" && r.age_min === 55);
    // média−1DP = 44.8 lb → 20.3 kg; média+1DP = 69.8 lb → 31.7 kg
    expect(f55.find((r) => r.classification === "Médio")!.kg_min).toBe(20.3);
    expect(f55.find((r) => r.classification === "Alto")!.kg_min).toBe(31.7);
    const m70 = HANDGRIP_SEED.filter((r) => r.sex === "M" && r.age_min === 70);
    // média−2DP = 32.3 lb → 14.7 kg; média+2DP = 118.3 lb → 53.7 kg
    expect(m70.find((r) => r.classification === "Baixo")!.kg_min).toBe(14.7);
    expect(m70.find((r) => r.classification === "Muito Alto")!.kg_min).toBe(53.7);
  });
});

describe("integração com os classificadores (semântica de fronteira)", () => {
  it("fronteira pertence à banda superior: VO₂ 48.0 é Bom, 47.99 é Regular (M, 25 anos)", () => {
    const subset = filterRangesBySexAge(VO2_SEED, "M", 25);
    expect(classifyVo2(48.0, subset)).toBe("Bom");
    expect(classifyVo2(47.99, subset)).toBe("Regular");
  });

  it("handgrip na fronteira de −2DP é Baixo, não Muito Baixo (M, 22 anos: 36.2 kg)", () => {
    const subset = filterRangesBySexAge(HANDGRIP_SEED, "M", 22);
    // 121.0 − 2×20.6 = 79.8 lb → 36.2 kg
    expect(classifyHandgrip(36.2, subset)).toBe("Baixo");
    expect(classifyHandgrip(36.19, subset)).toBe("Muito Baixo");
  });

  it("idade fora da cobertura → sem classificação (VO₂ aos 85 anos, grip aos 18)", () => {
    expect(classifyVo2(30, filterRangesBySexAge(VO2_SEED, "M", 85))).toBeNull();
    expect(classifyHandgrip(30, filterRangesBySexAge(HANDGRIP_SEED, "F", 18))).toBeNull();
  });

  it("média com dízima não cai no vão de 0.01 entre bandas (arredondamento interno)", () => {
    const subset = filterRangesBySexAge(HANDGRIP_SEED, "M", 22);
    // M 20-24: Muito Baixo [0, 36.19], Baixo [36.2, ...]. Média (108.58+0+0)/3
    // = 36.1933… fica entre 36.19 e 36.2 sem arredondar → arredonda pra 36.19.
    expect(classifyHandgrip(108.58 / 3, subset)).toBe("Muito Baixo");
    // 108.6/3 = 36.2000…01 em float → arredonda pra 36.2 → Baixo
    expect(classifyHandgrip(108.6 / 3, subset)).toBe("Baixo");
  });

  it("teto: VO₂ 119 e grip 149 ainda classificam no topo", () => {
    expect(classifyVo2(119, filterRangesBySexAge(VO2_SEED, "F", 30))).toBe("Superior");
    expect(classifyHandgrip(149, filterRangesBySexAge(HANDGRIP_SEED, "M", 60))).toBe("Muito Alto");
  });
});
