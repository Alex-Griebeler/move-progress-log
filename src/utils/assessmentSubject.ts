import { parseLocalDate } from "@/utils/relativeDate";

/**
 * Resolve SEXO e IDADE pra classificar uma avaliação (PR-8b) — lógica PURA.
 *
 * As faixas de referência são por sexo e faixa etária, então sem esses dois
 * dados não há classificação. A avaliação guarda um snapshot (`sex`,
 * `age_years`) justamente pra não mudar de classe quando o aluno faz
 * aniversário — mas avaliações antigas foram gravadas sem ele.
 *
 * Ordem: snapshot da avaliação → derivado do cadastro do aluno. O derivado
 * usa a idade **na data da avaliação** (calculada do nascimento), não a idade
 * de hoje — um teste de 2 anos atrás pertence à faixa etária de então.
 *
 * `source` acompanha o resultado pra UI poder sinalizar quando o dado não
 * veio do snapshot original.
 */

export type SubjectSex = "M" | "F";

export interface AssessmentSubjectInput {
  /** Snapshot gravado na avaliação. */
  snapshotSex?: string | null;
  snapshotAgeYears?: number | null;
  /** Data da avaliação (YYYY-MM-DD). */
  assessmentDate?: string | null;
  /** Cadastro atual do aluno. */
  studentSex?: string | null;
  studentBirthDate?: string | null;
}

export interface AssessmentSubject {
  sex: SubjectSex | null;
  ageYears: number | null;
  /** "snapshot" = ambos do snapshot; "derived" = algo veio do cadastro. */
  source: "snapshot" | "derived" | "unknown";
}

const normalizeSex = (value?: string | null): SubjectSex | null => {
  if (!value) return null;
  const v = value.trim().toUpperCase();
  if (v === "M" || v === "MASCULINO") return "M";
  if (v === "F" || v === "FEMININO") return "F";
  return null;
};

/** Anos completos entre nascimento e a data de referência. */
export const ageOnDate = (birthDate: string, onDate: string): number | null => {
  if (!birthDate || !onDate) return null;
  const birth = parseLocalDate(birthDate);
  const target = parseLocalDate(onDate);
  if (Number.isNaN(birth.getTime()) || Number.isNaN(target.getTime())) return null;
  if (target < birth) return null;

  let age = target.getFullYear() - birth.getFullYear();
  const hadBirthday =
    target.getMonth() > birth.getMonth() ||
    (target.getMonth() === birth.getMonth() && target.getDate() >= birth.getDate());
  if (!hadBirthday) age -= 1;
  return age >= 0 ? age : null;
};

export const resolveAssessmentSubject = (
  input: AssessmentSubjectInput,
): AssessmentSubject => {
  const snapSex = normalizeSex(input.snapshotSex);
  const snapAge =
    typeof input.snapshotAgeYears === "number" && Number.isFinite(input.snapshotAgeYears)
      ? input.snapshotAgeYears
      : null;

  const sex = snapSex ?? normalizeSex(input.studentSex);
  const ageYears =
    snapAge ??
    (input.studentBirthDate && input.assessmentDate
      ? ageOnDate(input.studentBirthDate, input.assessmentDate)
      : null);

  if (sex === null && ageYears === null) return { sex, ageYears, source: "unknown" };
  const source = snapSex !== null && snapAge !== null ? "snapshot" : "derived";
  return { sex, ageYears, source };
};
