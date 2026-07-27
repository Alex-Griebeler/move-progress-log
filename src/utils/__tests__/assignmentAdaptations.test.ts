import { describe, expect, it } from "vitest";
import { describeAssignmentAdaptations } from "../assignmentAdaptations";
import type { CustomAdaptation } from "@/hooks/prescriptionMappers";

const adaptation = (over: Partial<CustomAdaptation> = {}): CustomAdaptation => ({
  exercise_library_id: "lib-1",
  adaptation_type: "regressao_1",
  sets: null,
  reps: null,
  interval_seconds: null,
  pse: null,
  observations: null,
  ...over,
});

describe("describeAssignmentAdaptations", () => {
  it("null → null", () => {
    expect(describeAssignmentAdaptations(null)).toBeNull();
  });

  it("agenda completa → dias PT-BR ordenados + horário sem segundos", () => {
    expect(
      describeAssignmentAdaptations({
        weekdays: ["friday", "monday", "wednesday"],
        time: "08:00:00",
      }),
    ).toBe("Seg, Qua, Sex às 08:00");
  });

  it("agenda só com horário", () => {
    expect(describeAssignmentAdaptations({ time: "18:30" })).toBe("às 18:30");
  });

  it("agenda só com dias", () => {
    expect(describeAssignmentAdaptations({ weekdays: ["sunday"] })).toBe("Dom");
  });

  it("agenda vazia → null (chamador esconde o bloco)", () => {
    expect(describeAssignmentAdaptations({})).toBeNull();
    expect(describeAssignmentAdaptations({ weekdays: [] })).toBeNull();
  });

  it("dia desconhecido não explode — passa cru", () => {
    expect(describeAssignmentAdaptations({ weekdays: ["holiday"] })).toBe("holiday");
  });

  it("lista de adaptações por exercício → contagem singular/plural", () => {
    expect(describeAssignmentAdaptations([adaptation()])).toBe("1 exercício adaptado");
    expect(
      describeAssignmentAdaptations([adaptation(), adaptation({ exercise_library_id: "lib-2" })]),
    ).toBe("2 exercícios adaptados");
    expect(describeAssignmentAdaptations([])).toBeNull();
  });

  it("nunca devolve JSON cru (regressão do JSON.stringify)", () => {
    const out = describeAssignmentAdaptations({ weekdays: ["monday"], time: "07:00" });
    expect(out).not.toContain("{");
    expect(out).not.toContain("weekdays");
  });
});
