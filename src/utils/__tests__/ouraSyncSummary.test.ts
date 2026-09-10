import { describe, expect, it } from "vitest";
import { summarizeSyncAllByStudent } from "../ouraSyncSummary";

describe("summarizeSyncAllByStudent — pares (aluna, data) → alunas", () => {
  it("5 alunas × 3 datas com uma aluna falhando numa data: 4 ok, 1 falha, não 15", () => {
    const results = [];
    const names = ["A", "B", "C", "D", "E"];
    for (const n of names) {
      for (const d of ["2026-09-09", "2026-09-08", "2026-09-07"]) {
        const failed = n === "E" && d === "2026-09-08";
        results.push({
          student_id: n, student_name: n, date: d,
          status: failed ? ("failed" as const) : ("success" as const),
          outcome: failed ? undefined : n === "B" ? "no_data" : d === "2026-09-09" ? "partial" : "complete",
        });
      }
    }
    const s = summarizeSyncAllByStudent(results);
    expect(s.studentsTotal).toBe(5);
    expect(s.studentsOk).toBe(4);
    expect(s.studentsFailed).toBe(1);
    expect(s.failedNames).toEqual(["E"]);
    expect(s.studentsWithData).toBe(4); // B só trouxe no_data
  });

  it("resposta antiga sem outcome/date (edge ainda não publicada) conta alunas mas nenhuma 'com dado'", () => {
    const s = summarizeSyncAllByStudent([
      { student_id: "a", status: "success" },
      { student_id: "b", status: "failed", error: "x" },
    ]);
    expect(s).toEqual({ studentsTotal: 2, studentsOk: 1, studentsFailed: 1, studentsIncomplete: 0, studentsWithData: 0, failedNames: ["b"], incompleteNames: [] });
  });

  it("aluna com data pulada por orçamento é INCOMPLETA, não OK (e não é falha)", () => {
    const s = summarizeSyncAllByStudent([
      { student_id: "a", student_name: "A", date: "2026-09-09", status: "success", outcome: "complete" },
      { student_id: "a", student_name: "A", date: "2026-09-08", status: "skipped" },
      { student_id: "b", student_name: "B", date: "2026-09-09", status: "skipped" },
      { student_id: "b", student_name: "B", date: "2026-09-08", status: "skipped" },
    ]);
    expect(s.studentsOk).toBe(0);
    expect(s.studentsIncomplete).toBe(2);
    expect(s.studentsFailed).toBe(0);
    expect(s.studentsWithData).toBe(1);
    expect(s.incompleteNames).toEqual(["A", "B"]);
  });

  it("vazio", () => {
    expect(summarizeSyncAllByStudent([]).studentsTotal).toBe(0);
  });
});
