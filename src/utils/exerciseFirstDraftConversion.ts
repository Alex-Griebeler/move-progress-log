/**
 * Conversores entre o estado interno do modo manual "Por Exercício"
 * (`Record<studentId, Record<exerciseIndex, ExerciseData>>`) e a forma
 * canônica do rascunho compartilhado em `useSessionDraft`
 * (`Record<studentId, ExerciseDraftRow[]>`).
 *
 * Mantemos os conversores em um módulo puro (sem dependências de
 * `supabase`/React) para que possam ser testados isoladamente — o arquivo
 * `ExerciseFirstSessionEntry.tsx` é grande e arrasta efeitos colaterais
 * (browser-only) ao ser importado em testes.
 */

/**
 * Subset do `PrescriptionExercise` que os conversores realmente leem.
 * Estruturalmente compatível com a interface usada pelo componente.
 */
export interface DraftConversionPrescriptionExercise {
  exercise_library_id?: string | null;
  exercise_name: string;
  sets: string;
  reps: string;
  pse: string | null;
}

/** Subset do `StudentInfo` necessário para os conversores. */
export interface DraftConversionStudent {
  id: string;
}

/** Linha por exercício no estado interno (modo Por Exercício). */
export interface ExerciseFirstEntry {
  exercise_library_id?: string | null;
  exercise_name: string;
  sets: number;
  reps: number;
  reserve_reps: string;
  load_kg: number | null;
  load_breakdown: string;
  observations: string;
  load_kg_manual_override?: boolean;
}

/** Linha do array que o rascunho compartilhado persiste por aluno. */
export interface DraftExerciseRow {
  exercise_library_id?: string | null;
  exercise_name: string;
  sets: number;
  reps: number;
  load_kg: number | null;
  load_breakdown: string;
  observations: string;
}

/** Map por aluno para o estado interno. */
export type ExerciseFirstData = Record<string, Record<number, ExerciseFirstEntry>>;

/** Map por aluno para o rascunho compartilhado. */
export type DraftStudentExercises = Record<string, DraftExerciseRow[]>;

/**
 * Converte o estado por-exercício para a forma canônica do rascunho.
 * Itera `prescriptionExercises` em ordem; campos ausentes recebem defaults
 * da prescrição. `reserve_reps` (PSE) NÃO trafega no rascunho — a forma
 * canônica não tem esse campo (escopo: não alterar o schema do rascunho).
 */
export const exerciseFirstDataToDraftStudentExercises = (
  data: ExerciseFirstData,
  selectedStudents: DraftConversionStudent[],
  prescriptionExercises: DraftConversionPrescriptionExercise[],
): DraftStudentExercises => {
  const out: DraftStudentExercises = {};
  selectedStudents.forEach((student) => {
    out[student.id] = prescriptionExercises.map((px, idx) => {
      const entry = data[student.id]?.[idx];
      return {
        exercise_library_id: entry?.exercise_library_id ?? px.exercise_library_id ?? null,
        exercise_name: entry?.exercise_name ?? px.exercise_name,
        sets: entry?.sets ?? 0,
        reps: entry?.reps ?? 0,
        load_kg: entry?.load_kg ?? null,
        load_breakdown: entry?.load_breakdown ?? "",
        observations: entry?.observations ?? "",
      };
    });
  });
  return out;
};

/**
 * Inverso da função acima: rebuild do mapa por-exercício a partir do
 * rascunho. Quando o rascunho não tem entry para um (aluno, índice), cai
 * para os defaults da prescrição. `reserve_reps` (PSE) volta do
 * `pse` prescrito porque não está no rascunho.
 */
export const draftStudentExercisesToExerciseFirstData = (
  studentExercises: DraftStudentExercises,
  selectedStudents: DraftConversionStudent[],
  prescriptionExercises: DraftConversionPrescriptionExercise[],
): ExerciseFirstData => {
  const out: ExerciseFirstData = {};
  selectedStudents.forEach((student) => {
    const arr = studentExercises[student.id] ?? [];
    out[student.id] = {};
    prescriptionExercises.forEach((px, idx) => {
      const entry = arr[idx];
      out[student.id][idx] = {
        exercise_library_id: entry?.exercise_library_id ?? px.exercise_library_id ?? null,
        exercise_name: entry?.exercise_name ?? px.exercise_name,
        sets: entry?.sets ?? (parseInt(px.sets) || 0),
        reps: entry?.reps ?? (parseInt(px.reps) || 0),
        // reserve_reps (PSE) não está no rascunho — volta da prescrição.
        reserve_reps: px.pse || "",
        load_kg: entry?.load_kg ?? null,
        load_breakdown: entry?.load_breakdown ?? "",
        observations: entry?.observations ?? "",
      };
    });
  });
  return out;
};
