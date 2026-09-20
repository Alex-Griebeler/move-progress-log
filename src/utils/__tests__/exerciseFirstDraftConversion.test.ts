/**
 * Auditoria técnica de 20/09 (fase 4) — a PSE digitada não pode voltar ao
 * valor prescrito ao passar pelo rascunho.
 *
 * `reserve_reps` (PSE executada) não trafegava na forma canônica do rascunho:
 * a volta devolvia a PSE da PRESCRIÇÃO, e era esse valor que ia para o banco.
 */
import { describe, expect, it } from "vitest";
import {
  draftStudentExercisesToExerciseFirstData,
  exerciseFirstDataToDraftStudentExercises,
  type DraftStudentExercises,
  type ExerciseFirstData,
} from "../exerciseFirstDraftConversion";

const students = [{ id: "s1" }];
const prescription = [
  { exercise_library_id: "lib1", exercise_name: "Agachamento", sets: "3", reps: "8", pse: "7" },
];

const dataWithTypedPse: ExerciseFirstData = {
  s1: {
    0: {
      exercise_library_id: "lib1",
      exercise_name: "Agachamento",
      sets: 3,
      reps: 8,
      reserve_reps: "9, últimas duas difíceis",
      load_kg: 40,
      load_breakdown: "2x20",
      observations: "",
    },
  },
};

describe("ida e volta pelo rascunho", () => {
  it("preserva a PSE executada em vez de devolver a prescrita", () => {
    const draft = exerciseFirstDataToDraftStudentExercises(dataWithTypedPse, students, prescription);
    expect(draft.s1[0].reserve_reps).toBe("9, últimas duas difíceis");

    const back = draftStudentExercisesToExerciseFirstData(draft, students, prescription);
    expect(back.s1[0].reserve_reps).toBe("9, últimas duas difíceis");
    expect(back.s1[0].reserve_reps).not.toBe("7");
  });

  it("preserva carga, reps e séries", () => {
    const draft = exerciseFirstDataToDraftStudentExercises(dataWithTypedPse, students, prescription);
    const back = draftStudentExercisesToExerciseFirstData(draft, students, prescription);
    expect(back.s1[0]).toMatchObject({ sets: 3, reps: 8, load_kg: 40, load_breakdown: "2x20" });
  });

  it("PSE apagada de propósito continua apagada", () => {
    const cleared: ExerciseFirstData = {
      s1: { 0: { ...dataWithTypedPse.s1[0], reserve_reps: "" } },
    };
    const draft = exerciseFirstDataToDraftStudentExercises(cleared, students, prescription);
    const back = draftStudentExercisesToExerciseFirstData(draft, students, prescription);
    expect(back.s1[0].reserve_reps).toBe("");
  });

  it("rascunho ANTIGO, sem o campo, cai na PSE prescrita", () => {
    const legacy: DraftStudentExercises = {
      s1: [
        {
          exercise_library_id: "lib1",
          exercise_name: "Agachamento",
          sets: 3,
          reps: 8,
          load_kg: 40,
          load_breakdown: "2x20",
          observations: "",
        },
      ],
    };
    const back = draftStudentExercisesToExerciseFirstData(legacy, students, prescription);
    expect(back.s1[0].reserve_reps).toBe("7");
  });

  it("sem entrada para o exercício, tudo vem da prescrição", () => {
    const back = draftStudentExercisesToExerciseFirstData({ s1: [] }, students, prescription);
    expect(back.s1[0]).toMatchObject({ sets: 3, reps: 8, reserve_reps: "7", load_kg: null });
  });
});
