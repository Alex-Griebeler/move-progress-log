import { describe, expect, it } from "vitest";
import { assignmentStatus, assignmentProgress } from "../assignmentStatus";

const NOW = new Date(2026, 7, 26, 15, 0, 0); // 26/08/2026 local

describe("assignmentStatus", () => {
  it("vigente com período aberto (sem end_date)", () => {
    expect(assignmentStatus({ start_date: "2026-08-01", end_date: null }, NOW)).toBe("vigente");
  });

  it("extremos INCLUSOS: começa hoje e termina hoje = vigente", () => {
    expect(assignmentStatus({ start_date: "2026-08-26", end_date: null }, NOW)).toBe("vigente");
    expect(assignmentStatus({ start_date: "2026-08-01", end_date: "2026-08-26" }, NOW)).toBe("vigente");
  });

  it("futura", () => {
    expect(assignmentStatus({ start_date: "2026-08-27", end_date: null }, NOW)).toBe("futura");
  });

  it("expirada", () => {
    expect(assignmentStatus({ start_date: "2026-07-01", end_date: "2026-08-25" }, NOW)).toBe("expirada");
  });

  it("órfã sem start_date não some: vigente", () => {
    expect(assignmentStatus({ start_date: null, end_date: null }, NOW)).toBe("vigente");
  });
});

describe("assignmentProgress", () => {
  it("null sem end_date (UI mostra 'desde DD/MM')", () => {
    expect(assignmentProgress({ start_date: "2026-08-01", end_date: null }, NOW)).toBeNull();
  });

  it("semana N de M com percent", () => {
    // 8 semanas: 14/07 a 07/09 (56 dias). Em 26/08 = dia 44 → semana 7.
    const p = assignmentProgress({ start_date: "2026-07-14", end_date: "2026-09-07" }, NOW)!;
    expect(p.totalWeeks).toBe(8);
    expect(p.week).toBe(7);
    expect(p.percent).toBeGreaterThan(70);
    expect(p.percent).toBeLessThanOrEqual(100);
  });

  it("clamp: hoje antes do início → percent 0, semana 1", () => {
    const p = assignmentProgress({ start_date: "2026-09-01", end_date: "2026-10-26" }, NOW)!;
    expect(p.week).toBe(1);
    expect(p.percent).toBe(0);
  });

  it("clamp: hoje depois do fim → percent 100, última semana", () => {
    const p = assignmentProgress({ start_date: "2026-06-01", end_date: "2026-06-28" }, NOW)!;
    expect(p.week).toBe(p.totalWeeks);
    expect(p.percent).toBe(100);
  });

  it("end antes do start → null (dado inválido não explode)", () => {
    expect(assignmentProgress({ start_date: "2026-08-10", end_date: "2026-08-01" }, NOW)).toBeNull();
  });
});
