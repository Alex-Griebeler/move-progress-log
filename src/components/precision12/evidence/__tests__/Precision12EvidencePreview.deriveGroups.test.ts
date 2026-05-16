/**
 * E5.5 — Testes funcionais da função pura `deriveEvidenceGroups`
 * exportada de `Precision12EvidencePreview`.
 *
 * Foco: cross-join `students` + `assessments` + `responses` —
 * garantir que claims aparecem agrupadas pelo NOME do aluno, e que
 * dados ausentes não quebram a UI.
 */

import { describe, expect, it } from "vitest";

import type {
  CoachConsoleAssessment,
  CoachConsoleQuestionnaire,
  CoachConsoleStudent,
} from "@/utils/precision12CoachConsole";

import { deriveEvidenceGroups } from "@/utils/precision12EvidenceMapping";

function student(
  overrides: Partial<CoachConsoleStudent> = {},
): CoachConsoleStudent {
  return { id: "s1", name: "Alex Griebeler", program_tier: "precision_12", ...overrides };
}

function assessment(
  overrides: Partial<CoachConsoleAssessment> = {},
): CoachConsoleAssessment {
  return {
    id: "a1",
    student_id: "s1",
    assessment_type: "questionnaire_precision12",
    status: "completed",
    assessment_date: "2026-05-13",
    created_at: "2026-05-13T00:00:00Z",
    ...overrides,
  };
}

function response(
  overrides: Partial<CoachConsoleQuestionnaire> = {},
): CoachConsoleQuestionnaire {
  return {
    assessment_id: "a1",
    parq_blocked: true,
    primary_adherence_barrier: null,
    sleep_quality: 5,
    stress_level: 1,
    energy_level: 5,
    consistency_self_rating: "very_consistent",
    life_stability: "stable_organized",
    pain_status: "none",
    uses_medications: false,
    has_medical_condition: false,
    injury_surgery_history: null,
    ...overrides,
  };
}

describe("deriveEvidenceGroups — cross-join básico", () => {
  it("input vazio → []", () => {
    expect(
      deriveEvidenceGroups({ students: [], assessments: [], responses: [] }),
    ).toEqual([]);
  });

  it("response → assessment → student.name", () => {
    const groups = deriveEvidenceGroups({
      students: [student()],
      assessments: [assessment()],
      responses: [response()],
    });
    expect(groups).toHaveLength(1);
    expect(groups[0].studentId).toBe("s1");
    expect(groups[0].studentName).toBe("Alex Griebeler");
    expect(groups[0].claims.length).toBeGreaterThan(0);
  });

  it("response cuja assessment não está na lista → ignora silenciosamente", () => {
    const groups = deriveEvidenceGroups({
      students: [student()],
      assessments: [],
      responses: [response({ assessment_id: "ghost" })],
    });
    expect(groups).toEqual([]);
  });

  it("response sem assessment_id → ignora silenciosamente", () => {
    const groups = deriveEvidenceGroups({
      students: [student()],
      assessments: [assessment()],
      responses: [response({ assessment_id: "" })],
    });
    expect(groups).toEqual([]);
  });

  it("student ausente do mapa → fallback 'aluno desconhecido' (não engole silenciosamente)", () => {
    const groups = deriveEvidenceGroups({
      students: [], // sem o aluno
      assessments: [assessment({ student_id: "s-ghost" })],
      responses: [response()],
    });
    expect(groups).toHaveLength(1);
    expect(groups[0].studentId).toBe("s-ghost");
    expect(groups[0].studentName).toContain("desconhecido");
  });

  it("response que não gera nenhuma claim → não cria grupo", () => {
    // parq_blocked null + sem flags de adesão → 0 claims
    const groups = deriveEvidenceGroups({
      students: [student()],
      assessments: [assessment()],
      responses: [response({ parq_blocked: null })],
    });
    expect(groups).toEqual([]);
  });
});

describe("deriveEvidenceGroups — múltiplos alunos / múltiplas responses", () => {
  it("2 alunos, 1 response cada → 2 grupos com nomes diferentes", () => {
    const groups = deriveEvidenceGroups({
      students: [student(), student({ id: "s2", name: "Ana Paula Prado" })],
      assessments: [
        assessment({ id: "a1", student_id: "s1" }),
        assessment({ id: "a2", student_id: "s2" }),
      ],
      responses: [
        response({ assessment_id: "a1" }),
        response({ assessment_id: "a2" }),
      ],
    });
    expect(groups).toHaveLength(2);
    const names = groups.map((g) => g.studentName).sort();
    expect(names).toEqual(["Alex Griebeler", "Ana Paula Prado"]);
  });

  it("2 responses do mesmo aluno → 1 grupo com claims concatenadas", () => {
    const groups = deriveEvidenceGroups({
      students: [student()],
      assessments: [
        assessment({ id: "a1", student_id: "s1" }),
        assessment({ id: "a2", student_id: "s1" }),
      ],
      responses: [
        response({ assessment_id: "a1", parq_blocked: true }),
        response({
          assessment_id: "a2",
          parq_blocked: false,
          sleep_quality: 1,
          stress_level: 5,
        }),
      ],
    });
    expect(groups).toHaveLength(1);
    expect(groups[0].studentName).toBe("Alex Griebeler");
    const classifications = groups[0].claims.map((c) => c.classification);
    expect(classifications).toContain("PAR-Q positivo (blocked)");
    expect(classifications).toContain("PAR-Q sem sinalizações");
    expect(classifications).toContain("Sono insuficiente");
    expect(classifications).toContain("Estresse alto");
  });
});

describe("deriveEvidenceGroups — imutabilidade", () => {
  it("não muta os arrays de entrada", () => {
    const s = [student()];
    const a = [assessment()];
    const r = [response()];
    const before = JSON.stringify({ s, a, r });
    deriveEvidenceGroups({ students: s, assessments: a, responses: r });
    expect(JSON.stringify({ s, a, r })).toBe(before);
  });
});
