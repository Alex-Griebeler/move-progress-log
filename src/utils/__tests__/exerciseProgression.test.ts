import { describe, expect, it } from "vitest";
import { buildTopSetSeries, progressionStats } from "../exerciseProgression";

const NOW = new Date(2026, 7, 27, 12, 0, 0);

const entry = (date: string, load: number | null, volume = 0) => ({
  session_date: date,
  load_kg: load,
  total_volume: volume,
});

describe("buildTopSetSeries", () => {
  it("top-set por dia (maior carga do dia) em ordem ascendente", () => {
    const s = buildTopSetSeries([
      entry("2026-08-10", 40),
      entry("2026-08-10", 50),
      entry("2026-08-03", 45),
    ]);
    expect(s.map((p) => [p.date, p.value])).toEqual([
      ["2026-08-03", 45],
      ["2026-08-10", 50],
    ]);
  });

  it("PR marcado só quando SUPERA o recorde até a data", () => {
    const s = buildTopSetSeries([
      entry("2026-08-03", 45),
      entry("2026-08-10", 50),
      entry("2026-08-17", 48),
      entry("2026-08-24", 50), // empata, não supera
    ]);
    expect(s.map((p) => p.isPr)).toEqual([true, true, false, false]);
  });

  it("sessão sem carga = null (nunca zero fabricado) e não vira PR", () => {
    const s = buildTopSetSeries([entry("2026-08-03", null), entry("2026-08-10", 40)]);
    expect(s[0].value).toBeNull();
    expect(s[0].isPr).toBe(false);
    expect(s[1].isPr).toBe(true);
  });
});

describe("progressionStats", () => {
  it("current = última COM carga; pr = recorde com data", () => {
    const stats = progressionStats(
      [entry("2026-08-24", 50), entry("2026-08-26", null), entry("2026-08-10", 55)],
      NOW,
    );
    expect(stats.current).toEqual({ date: "2026-08-24", loadKg: 50 });
    expect(stats.pr).toEqual({ date: "2026-08-10", loadKg: 55 });
  });

  it("Δ 4 semanas = melhor top-set 0-27d vs 28-55d", () => {
    const stats = progressionStats(
      [entry("2026-08-20", 55), entry("2026-07-10", 50)],
      NOW,
    );
    expect(stats.delta4wPercent).toBe(10);
  });

  it("sem base nas 4 semanas anteriores → delta null", () => {
    const stats = progressionStats([entry("2026-08-20", 55)], NOW);
    expect(stats.delta4wPercent).toBeNull();
  });

  it("volume 4 semanas soma só a janela recente", () => {
    const stats = progressionStats(
      [entry("2026-08-20", 50, 1000), entry("2026-07-01", 50, 999)],
      NOW,
    );
    expect(stats.volume4wKg).toBe(1000);
  });

  it("histórico vazio → tudo null/0 sem explodir", () => {
    const stats = progressionStats([], NOW);
    expect(stats.current).toBeNull();
    expect(stats.pr).toBeNull();
    expect(stats.delta4wPercent).toBeNull();
    expect(stats.volume4wKg).toBe(0);
  });
});
