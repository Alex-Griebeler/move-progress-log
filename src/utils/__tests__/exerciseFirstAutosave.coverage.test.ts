/**
 * Cobertura do PR: autosave de rascunho no modo manual "Por Exercício".
 *
 * Combina:
 *   1) Verificações source-based no `ExerciseFirstSessionEntry.tsx` para
 *      garantir que o hook `useSessionDraft` está realmente wired
 *      (importado, lendo `lastSaved`/`isSaving`, salvando em useEffect,
 *      limpando só após onSave bem-sucedido, renderizando o histórico).
 *   2) Unit tests dos dois conversores exportados pelo arquivo — única
 *      lógica pura adicionada por este PR.
 *
 * Sem render, sem Postgres, sem alterações em outros fluxos.
 */
import { readFileSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { describe, expect, it } from "vitest";

import {
  exerciseFirstDataToDraftStudentExercises,
  draftStudentExercisesToExerciseFirstData,
} from "../exerciseFirstDraftConversion";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const read = (rel: string) => readFileSync(resolve(__dirname, rel), "utf-8");

const componentSrc = read("../../components/ExerciseFirstSessionEntry.tsx");

describe("ExerciseFirstSessionEntry — autosave de rascunho", () => {
  describe("Wiring do hook useSessionDraft", () => {
    it("importa useSessionDraft, DraftHistoryDialog e o tipo SessionDraft", () => {
      expect(componentSrc).toMatch(
        /import\s*\{\s*useSessionDraft\s*\}\s*from\s*"@\/hooks\/useSessionDraft"/,
      );
      expect(componentSrc).toMatch(
        /import\s*\{\s*DraftHistoryDialog\s*\}\s*from\s*"\.\/DraftHistoryDialog"/,
      );
      expect(componentSrc).toMatch(
        /import\s+type\s*\{\s*SessionDraft\s*\}\s*from\s*"@\/hooks\/useSessionDraftHistory"/,
      );
    });

    it("consome draft, saveDraft, clearDraft, restoreDraft, isSaving, lastSaved", () => {
      expect(componentSrc).toMatch(
        /\{\s*draft,\s*saveDraft,\s*clearDraft,\s*restoreDraft,\s*isSaving,\s*lastSaved\s*\}\s*=\s*useSessionDraft\(/,
      );
    });

    it("usa entityId distinto do modo Por Aluno para não colidir no localStorage", () => {
      expect(componentSrc).toMatch(/useSessionDraft\(draftEntityId\)/);
      expect(componentSrc).toMatch(/exercise-first-\$\{prescriptionId\b/);
    });
  });

  describe("Autosave + restauração", () => {
    it("salva rascunho em useEffect quando data, date, time, trainer, prescriptionId ou selectedStudents mudam", () => {
      // Bloco do useEffect que chama saveDraft com a forma esperada.
      expect(componentSrc).toMatch(
        /saveDraft\(\{[\s\S]*?date,[\s\S]*?time,[\s\S]*?trainer,[\s\S]*?prescriptionId,[\s\S]*?selectedStudents,[\s\S]*?studentExercises:\s*exerciseFirstDataToDraftStudentExercises/,
      );
    });

    it("guarda contra save antes da inicialização real de data", () => {
      expect(componentSrc).toMatch(/if\s*\(Object\.keys\(data\)\.length\s*===\s*0\)\s*return;/);
    });

    it("restaura draft do localStorage em useEffect protegido por ref", () => {
      expect(componentSrc).toMatch(/draftRestoredRef\s*=\s*useRef\(false\)/);
      expect(componentSrc).toMatch(
        /setData\(\s*draftStudentExercisesToExerciseFirstData\(\s*draft\.studentExercises/,
      );
      expect(componentSrc).toContain("draftRestoredRef.current = true");
    });

    it("handler de restaurar do histórico atualiza state e volta ao primeiro exercício", () => {
      expect(componentSrc).toMatch(
        /handleRestoreFromHistory[\s\S]*?restoreDraft\(historicalDraft\)[\s\S]*?setData\([\s\S]*?draftStudentExercisesToExerciseFirstData[\s\S]*?setExerciseIndex\(0\)/,
      );
    });
  });

  describe("clearDraft só após onSave bem-sucedido", () => {
    it("chama clearDraft DEPOIS de await onSave (e não dentro do catch)", () => {
      // Captura o corpo de handleSubmit: clearDraft tem que aparecer após
      // a chamada onSave + antes do catch.
      expect(componentSrc).toMatch(
        /await\s+onSave\(\{\s*studentExercises\s*\}\)[\s\S]*?clearDraft\(\)[\s\S]*?\}\s*catch/,
      );
      // Garante que clearDraft NÃO está no ramo catch.
      const catchSlice = componentSrc.slice(componentSrc.indexOf("} catch"));
      const finallySlice = catchSlice.slice(0, catchSlice.indexOf("} finally"));
      expect(finallySlice).not.toContain("clearDraft");
    });
  });

  describe("UI do indicador e do histórico", () => {
    it("renderiza indicador 'Salvando rascunho...' e 'Rascunho salvo'", () => {
      expect(componentSrc).toContain("Salvando rascunho...");
      expect(componentSrc).toContain("Rascunho salvo ");
    });

    it("expõe botões Histórico e Limpar rascunho", () => {
      expect(componentSrc).toMatch(/setHistoryDialogOpen\(true\)/);
      expect(componentSrc).toContain("Histórico");
      expect(componentSrc).toContain("Limpar rascunho");
      expect(componentSrc).toMatch(/onClick=\{clearDraft\}/);
    });

    it("renderiza <DraftHistoryDialog> wired ao handleRestoreFromHistory", () => {
      expect(componentSrc).toMatch(
        /<DraftHistoryDialog[\s\S]*?onRestoreDraft=\{handleRestoreFromHistory\}/,
      );
    });
  });
});

describe("Conversores de formato (unit)", () => {
  const students = [
    { id: "s1", name: "Aluno 1", weight_kg: 70 },
    { id: "s2", name: "Aluno 2" },
  ];
  const prescription = [
    {
      id: "px1",
      exercise_library_id: "lib1",
      exercise_name: "Agachamento",
      sets: "3",
      reps: "10",
      interval_seconds: 60,
      pse: "7",
      training_method: null,
      observations: null,
    },
    {
      id: "px2",
      exercise_library_id: "lib2",
      exercise_name: "Supino",
      sets: "4",
      reps: "8",
      interval_seconds: 90,
      pse: "8",
      training_method: null,
      observations: null,
    },
  ];

  it("exerciseFirstDataToDraftStudentExercises produz array por aluno na ordem da prescrição", () => {
    const data = {
      s1: {
        0: {
          exercise_library_id: "lib1",
          exercise_name: "Agachamento",
          sets: 3,
          reps: 10,
          reserve_reps: "7",
          load_kg: 50,
          load_breakdown: "50kg",
          observations: "",
        },
        1: {
          exercise_library_id: "lib2",
          exercise_name: "Supino",
          sets: 4,
          reps: 8,
          reserve_reps: "8",
          load_kg: 40,
          load_breakdown: "40kg",
          observations: "barra",
        },
      },
      // s2 sem dados — exercita o caminho de fallback.
      s2: {} as Record<number, never>,
    };
    const out = exerciseFirstDataToDraftStudentExercises(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data as any,
      students,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      prescription as any,
    );

    expect(Object.keys(out).sort()).toEqual(["s1", "s2"]);
    expect(out.s1).toHaveLength(2);
    expect(out.s1[0].exercise_name).toBe("Agachamento");
    expect(out.s1[0].load_breakdown).toBe("50kg");
    expect(out.s1[1].observations).toBe("barra");
    // Fallback do aluno sem dados: ainda gera entradas com prescription defaults.
    expect(out.s2).toHaveLength(2);
    expect(out.s2[0].exercise_name).toBe("Agachamento");
    expect(out.s2[0].load_breakdown).toBe("");
  });

  it("draftStudentExercisesToExerciseFirstData reidrata o mapa e preserva PSE do prescrito", () => {
    const draftStudentExercises = {
      s1: [
        {
          exercise_library_id: "lib1",
          exercise_name: "Agachamento",
          sets: 3,
          reps: 10,
          load_kg: 55,
          load_breakdown: "55kg",
          observations: "ok",
        },
      ],
    };
    const out = draftStudentExercisesToExerciseFirstData(
      draftStudentExercises,
      students,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      prescription as any,
    );

    expect(out.s1[0].load_kg).toBe(55);
    expect(out.s1[0].load_breakdown).toBe("55kg");
    expect(out.s1[0].observations).toBe("ok");
    // PSE não está no draft — vem do default da prescrição.
    expect(out.s1[0].reserve_reps).toBe("7");
    // Posição 1 não está no draft: prescription defaults.
    expect(out.s1[1].exercise_name).toBe("Supino");
    expect(out.s1[1].sets).toBe(4);
    expect(out.s1[1].reps).toBe(8);
    expect(out.s1[1].reserve_reps).toBe("8");
    // s2 inteiramente ausente do draft: rebuild com defaults da prescrição.
    expect(out.s2[0].exercise_name).toBe("Agachamento");
    expect(out.s2[0].sets).toBe(3);
  });

  it("roundtrip mantém todos os campos suportados pelo draft", () => {
    const data = {
      s1: {
        0: {
          exercise_library_id: "lib1",
          exercise_name: "Agachamento",
          sets: 3,
          reps: 10,
          reserve_reps: "7",
          load_kg: 50,
          load_breakdown: "50kg",
          observations: "",
        },
        1: {
          exercise_library_id: "lib2",
          exercise_name: "Supino",
          sets: 4,
          reps: 8,
          reserve_reps: "8",
          load_kg: 40,
          load_breakdown: "40kg",
          observations: "barra",
        },
      },
      s2: {
        0: {
          exercise_library_id: "lib1",
          exercise_name: "Agachamento",
          sets: 3,
          reps: 12,
          reserve_reps: "6",
          load_kg: 30,
          load_breakdown: "30kg",
          observations: "leve",
        },
        1: {
          exercise_library_id: "lib2",
          exercise_name: "Supino",
          sets: 4,
          reps: 8,
          reserve_reps: "7",
          load_kg: 35,
          load_breakdown: "35kg",
          observations: "",
        },
      },
    };
    const draftShape = exerciseFirstDataToDraftStudentExercises(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data as any,
      students,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      prescription as any,
    );
    const restored = draftStudentExercisesToExerciseFirstData(
      draftShape,
      students,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      prescription as any,
    );

    for (const studentId of ["s1", "s2"]) {
      for (const idx of [0, 1]) {
        const before = data[studentId as "s1" | "s2"][idx as 0 | 1];
        const after = restored[studentId][idx];
        expect(after.load_kg).toBe(before.load_kg);
        expect(after.load_breakdown).toBe(before.load_breakdown);
        expect(after.observations).toBe(before.observations);
        expect(after.sets).toBe(before.sets);
        expect(after.reps).toBe(before.reps);
        expect(after.exercise_library_id).toBe(before.exercise_library_id);
        expect(after.exercise_name).toBe(before.exercise_name);
        // reserve_reps não trafega no draft; volta do prescritor.
      }
    }
  });
});
