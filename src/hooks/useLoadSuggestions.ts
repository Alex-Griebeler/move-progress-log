import { useQuery } from "@tanstack/react-query";
import { subDays } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { TrainingRecommendation } from "./useTrainingRecommendation";

type SuggestionStatus = "automatic" | "assisted" | "insufficient";

export interface LoadSuggestionItem {
  exerciseName: string;
  lastLoadKg: number | null;
  referenceLoadKg: number | null;
  referenceReps: number | null;
  suggestedLoadKg: number | null;
  ruleApplied: string;
  adjustmentPercent: number | null;
  source: "last_valid" | "best_recent_equivalent" | "same_block" | "fallback_keep" | "insufficient";
  status: SuggestionStatus;
  incrementKg: number;
}

interface ExerciseExecution {
  exerciseName: string;
  loadKg: number;
  reps: number;
  date: string;
  prescriptionId: string | null;
}

const normalizeComparableText = (value: string): string =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ");

const isEligibleStrengthCategory = (category: string | null | undefined): boolean => {
  if (!category) return false;
  const normalized = normalizeComparableText(category);
  return normalized.includes("forca") || normalized.includes("hipertrofia");
};

const inferIncrement = (equipmentRequired: string[] | null | undefined): number => {
  const normalized = (equipmentRequired || []).map((item) => normalizeComparableText(item));
  const joined = normalized.join(" ");

  if (joined.includes("kettlebell")) return 2;
  if (joined.includes("halter") || joined.includes("dumbbell")) return 1;
  if (joined.includes("barra") || joined.includes("barbell")) return 2.5;
  if (joined.includes("maquina") || joined.includes("machine") || joined.includes("cabo")) return 5;
  return 0.5;
};

const roundToIncrement = (value: number, increment: number): number => {
  if (!Number.isFinite(value) || !Number.isFinite(increment) || increment <= 0) return value;
  return Math.round(value / increment) * increment;
};

export const useLoadSuggestions = (
  studentId: string,
  recommendation: TrainingRecommendation | null
) => {
  return useQuery({
    queryKey: ["load-suggestions", studentId, recommendation?.zone, recommendation?.loadDecision],
    enabled: !!studentId && !!recommendation,
    queryFn: async (): Promise<LoadSuggestionItem[]> => {
      if (!recommendation) return [];

      const periodStart = subDays(new Date(), 90).toISOString().slice(0, 10);
      const bestRecentStart = subDays(new Date(), 60).toISOString().slice(0, 10);

      const [{ data: sessions, error: sessionsError }, { data: libraryRows, error: libraryError }] =
        await Promise.all([
          supabase
            .from("workout_sessions")
            .select("id, date, prescription_id, exercises(exercise_name, load_kg, reps)")
            .eq("student_id", studentId)
            .gte("date", periodStart)
            .order("date", { ascending: false }),
          supabase.from("exercises_library").select("name, category, equipment_required"),
        ]);

      if (sessionsError) throw sessionsError;
      if (libraryError) throw libraryError;

      const libraryByName = new Map<
        string,
        { category: string | null; equipmentRequired: string[] | null }
      >();
      for (const row of libraryRows || []) {
        if (!row?.name) continue;
        const key = normalizeComparableText(row.name);
        if (!libraryByName.has(key)) {
          libraryByName.set(key, {
            category: row.category,
            equipmentRequired: Array.isArray(row.equipment_required)
              ? row.equipment_required.filter((item): item is string => typeof item === "string")
              : null,
          });
        }
      }

      const byExercise = new Map<string, ExerciseExecution[]>();
      for (const session of sessions || []) {
        const exerciseRows = Array.isArray(session.exercises) ? session.exercises : [];
        for (const row of exerciseRows) {
          const exerciseName = typeof row.exercise_name === "string" ? row.exercise_name.trim() : "";
          const loadKg = typeof row.load_kg === "number" ? row.load_kg : NaN;
          const reps = typeof row.reps === "number" ? row.reps : NaN;

          if (!exerciseName || !Number.isFinite(loadKg) || loadKg <= 0 || !Number.isFinite(reps) || reps <= 0) {
            continue;
          }

          const key = normalizeComparableText(exerciseName);
          const list = byExercise.get(key) || [];
          list.push({
            exerciseName,
            loadKg,
            reps,
            date: session.date,
            prescriptionId: session.prescription_id,
          });
          byExercise.set(key, list);
        }
      }

      const criticalFlags = recommendation.alerts.some((alert) => alert.level === "CRITICAL");
      const maxExercises = 5;

      const suggestions = [...byExercise.entries()]
        .map(([key, list]) => {
          list.sort((a, b) => (a.date < b.date ? 1 : -1));
          const first = list[0];
          if (!first) return null;

          const libMeta = libraryByName.get(key);
          const eligibleByCategory = isEligibleStrengthCategory(libMeta?.category);
          if (!eligibleByCategory && list.length < 2) return null;

          const referenceReps = first.reps;
          const bestEquivalent = list
            .filter((item) => item.date >= bestRecentStart && Math.abs(item.reps - referenceReps) <= 1)
            .sort((a, b) => b.loadKg - a.loadKg)[0];

          const sameBlock = first.prescriptionId
            ? list.find((item, index) => index > 0 && item.prescriptionId === first.prescriptionId)
            : null;

          const reference = first;
          const source: LoadSuggestionItem["source"] =
            first
              ? "last_valid"
              : bestEquivalent
                ? "best_recent_equivalent"
                : sameBlock
                  ? "same_block"
                  : "insufficient";

          if (!reference || !Number.isFinite(reference.loadKg)) {
            return {
              exerciseName: first?.exerciseName || key,
              lastLoadKg: null,
              referenceLoadKg: null,
              referenceReps: null,
              suggestedLoadKg: null,
              ruleApplied: "Dados insuficientes",
              adjustmentPercent: null,
              source: "insufficient",
              status: "insufficient" as const,
              incrementKg: 0.5,
            };
          }

          const incrementKg = inferIncrement(libMeta?.equipmentRequired);
          let suggestedLoadKg: number | null = reference.loadKg;
          let ruleApplied = "Manter carga";
          let adjustmentPercent: number | null = 0;

          if (recommendation.loadDecision === "increase" && !criticalFlags) {
            adjustmentPercent = recommendation.loadAdjustmentPercent ?? 5;
            suggestedLoadKg = roundToIncrement(
              reference.loadKg * (1 + adjustmentPercent / 100),
              incrementKg
            );
            ruleApplied = `Progressão +${adjustmentPercent}%`;
          } else if (recommendation.loadDecision === "reduce") {
            adjustmentPercent = recommendation.loadAdjustmentPercent ?? -20;
            suggestedLoadKg = roundToIncrement(
              reference.loadKg * (1 + adjustmentPercent / 100),
              incrementKg
            );
            ruleApplied = `Redução ${adjustmentPercent}%`;
          } else if (recommendation.loadDecision === "block") {
            suggestedLoadKg = null;
            adjustmentPercent = null;
            ruleApplied = "Carga bloqueada (recuperação/descanso)";
          } else {
            suggestedLoadKg = roundToIncrement(reference.loadKg, incrementKg);
            ruleApplied = "Manter carga planejada";
          }

          const status: SuggestionStatus =
            recommendation.loadDecision === "maintain" ? "automatic" : "assisted";

          return {
            exerciseName: first.exerciseName,
            lastLoadKg: first.loadKg,
            referenceLoadKg: reference.loadKg,
            referenceReps: reference.reps,
            suggestedLoadKg,
            ruleApplied,
            adjustmentPercent,
            source,
            status,
            incrementKg,
          };
        })
        .filter((item): item is LoadSuggestionItem => !!item)
        .sort((a, b) => {
          const aMissing = a.status === "insufficient" ? 1 : 0;
          const bMissing = b.status === "insufficient" ? 1 : 0;
          if (aMissing !== bMissing) return aMissing - bMissing;
          return (b.referenceLoadKg || 0) - (a.referenceLoadKg || 0);
        })
        .slice(0, maxExercises);

      return suggestions;
    },
    staleTime: 60 * 1000,
  });
};
