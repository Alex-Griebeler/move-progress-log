import { describe, expect, it } from "vitest";
import { computeVolumeDeltas, sessionVolume, weeklyAggregates } from "../sessionTrends";

const NOW = new Date(2026, 7, 27, 14, 0, 0); // qui 27/08/2026

const sess = (
  id: string,
  date: string,
  time: string,
  loadKg: number,
  type = "individual",
) => ({
  id,
  date,
  time,
  session_type: type,
  exercises: [{ load_kg: loadKg, sets: 1, reps: 10 }],
});

describe("sessionVolume", () => {
  it("load × sets × reps; sem carga estruturada = 0", () => {
    expect(sessionVolume(sess("a", "2026-08-01", "10:00", 50))).toBe(500);
    expect(sessionVolume({ id: "b", date: "2026-08-01", time: "10:00", session_type: "individual", exercises: [{ load_kg: null, sets: 3, reps: 10 }] })).toBe(0);
  });
});

describe("computeVolumeDeltas", () => {
  it("Δ vs anterior do MESMO tipo; primeira = null", () => {
    const deltas = computeVolumeDeltas([
      sess("s2", "2026-08-10", "10:00", 110),
      sess("s1", "2026-08-03", "10:00", 100),
      sess("g1", "2026-08-05", "15:00", 999, "group"),
    ]);
    expect(deltas.get("s1")).toBeNull();
    expect(deltas.get("s2")).toBe(10);
    expect(deltas.get("g1")).toBeNull(); // outro tipo não é base
  });

  it("EMPATE de data resolve por hora (review: entrada desc não pode inverter)", () => {
    // Entrada em ordem DESC de horário (como a query devolve).
    const deltas = computeVolumeDeltas([
      sess("tarde", "2026-08-10", "18:00", 120),
      sess("manha", "2026-08-10", "07:00", 100),
    ]);
    expect(deltas.get("manha")).toBeNull();
    expect(deltas.get("tarde")).toBe(20);
  });

  it("timestamp idêntico: determinístico por id", () => {
    const d1 = computeVolumeDeltas([sess("b", "2026-08-10", "10:00", 200), sess("a", "2026-08-10", "10:00", 100)]);
    const d2 = computeVolumeDeltas([sess("a", "2026-08-10", "10:00", 100), sess("b", "2026-08-10", "10:00", 200)]);
    expect(d1.get("a")).toBe(d2.get("a"));
    expect(d1.get("b")).toBe(d2.get("b"));
  });

  it("anterior ou atual sem carga → null (não fabrica %)", () => {
    const deltas = computeVolumeDeltas([
      sess("s1", "2026-08-03", "10:00", 0),
      sess("s2", "2026-08-10", "10:00", 100),
    ]);
    expect(deltas.get("s2")).toBeNull();
  });
});

describe("weeklyAggregates", () => {
  it("semana sem sessão = ZERO real (não dado ausente)", () => {
    const weeks = weeklyAggregates([sess("a", "2026-08-25", "10:00", 100)], 4, NOW);
    expect(weeks).toHaveLength(4);
    expect(weeks[3].sessionCount).toBe(1); // semana corrente (24/08)
    expect(weeks[3].totalVolumeKg).toBe(1000);
    expect(weeks[0].sessionCount).toBe(0);
    expect(weeks[0].totalVolumeKg).toBe(0);
  });

  it("sessão futura não conta", () => {
    const weeks = weeklyAggregates([sess("f", "2026-08-28", "10:00", 100)], 2, NOW);
    expect(weeks[1].sessionCount).toBe(0);
  });

  it("semanas começam na segunda", () => {
    const weeks = weeklyAggregates([], 1, NOW);
    expect(weeks[0].weekStart.getDay()).toBe(1); // Monday
    expect(weeks[0].weekStart.getDate()).toBe(24);
  });
});
