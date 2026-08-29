import { useQuery } from "@tanstack/react-query";
import { subDays } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/utils/logger";
import { TrainingRecommendation } from "./useTrainingRecommendation";
import {
  isEligibleStrengthCategory,
  normalizeComparableText,
  decideLoadSuggestion,
} from "./loadSuggestionUtils";

type SuggestionStatus = "automatic" | "assisted" | "blocked" | "insufficient";

export interface LoadSuggestionItem {
  /** Chave estável (id da biblioteca ou nome normalizado) — nome cru repete. */
  key: string;
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
  guardrails: string[];
}

interface ExerciseExecution {
  exerciseLibraryId: string | null;
  exerciseName: string;
  loadKg: number;
  reps: number;
  date: string;
  prescriptionId: string | null;
  observations: string | null;
}

const inferIncrement = (equipmentRequired: string[] | null | undefined): number => {
  const normalized = (equipmentRequired || []).map((item) => normalizeComparableText(item));
  const joined = normalized.join(" ");

  if (joined.includes("kettlebell")) return 2;
  if (joined.includes("halter") || joined.includes("dumbbell")) return 1;
  if (joined.includes("barra") || joined.includes("barbell")) return 2.5;
  if (joined.includes("maquina") || joined.includes("machine") || joined.includes("cabo")) return 5;
  return 0.5;
};

/**
 * Remove menções NEGADAS antes de casar sinais ("sem dor", "nenhum
 * desconforto", "dor resolvida", "não sentiu dor") — a busca crua tratava a
 * negação como sinal presente e reduzia carga indevidamente (auditoria
 * 29/08). Na dúvida (frase ambígua), o sinal permanece — direção segura.
 */
export const stripNegatedMentions = (normalized: string): string =>
  normalized
    .replace(/\b(?:sem|nenhuma?)\s+(?:dor(?:es)?|desconfortos?|lesao|lesoes|compensac\w+|instabilidades?)\b/g, " ")
    .replace(/\bnao\s+(?:ha|houve|teve|sentiu|relatou|apresentou)\s+(?:dor(?:es)?|desconfortos?|compensac\w+|instabilidades?)\b/g, " ")
    .replace(/\bdor(?:es)?\s+(?:resolvida|ausente)s?\b/g, " ");

export const hasPainSignal = (value: string | null | undefined): boolean => {
  if (!value) return false;
  const normalized = stripNegatedMentions(normalizeComparableText(value));
  return (
    normalized.includes("dor") ||
    normalized.includes("pain") ||
    normalized.includes("desconforto") ||
    normalized.includes("lesao")
  );
};

export const hasTechniqueSignal = (value: string | null | undefined): boolean => {
  if (!value) return false;
  const normalized = stripNegatedMentions(normalizeComparableText(value));
  return (
    normalized.includes("tecnica") ||
    normalized.includes("compensacao") ||
    normalized.includes("instavel") ||
    normalized.includes("instabilidade")
  );
};

export const useLoadSuggestions = (
  studentId: string,
  recommendation: TrainingRecommendation | null
) => {
  const recommendationKey = recommendation
    ? [
        recommendation.zone,
        recommendation.loadDecision,
        recommendation.loadAdjustmentPercent ?? "na",
        recommendation.overrideApplied ? "override" : "normal",
        recommendation.alerts.map((alert) => alert.level).join(","),
      ].join("|")
    : "none";

  return useQuery({
    queryKey: ["load-suggestions", studentId, recommendationKey],
    enabled: !!studentId && !!recommendation,
    refetchOnWindowFocus: false,
    queryFn: async (): Promise<LoadSuggestionItem[]> => {
      if (!recommendation) return [];

      const periodStart = subDays(new Date(), 90).toISOString().slice(0, 10);

      const [{ data: sessions, error: sessionsError }, { data: libraryRows, error: libraryError }] =
        await Promise.all([
          supabase
            .from("workout_sessions")
            .select("id, date, created_at, prescription_id, exercises(exercise_library_id, exercise_name, load_kg, reps, observations)")
            .eq("student_id", studentId)
            .gte("date", periodStart)
            // 2º critério estável: duas sessões no MESMO dia alternavam a
            // referência conforme a ordem do join (auditoria 29/08).
            .order("date", { ascending: false })
            .order("created_at", { ascending: false }),
          supabase.from("exercises_library").select("id, name, category, equipment_required"),
        ]);

      if (sessionsError) throw sessionsError;
      if (libraryError) throw libraryError;

      const libraryById = new Map<
        string,
        { category: string | null; equipmentRequired: string[] | null }
      >();
      const libraryByName = new Map<
        string,
        { category: string | null; equipmentRequired: string[] | null }
      >();
      for (const row of libraryRows || []) {
        if (!row?.name) continue;
        const meta = {
          category: row.category,
          equipmentRequired: Array.isArray(row.equipment_required)
            ? row.equipment_required.filter((item): item is string => typeof item === "string")
            : null,
        };
        libraryById.set(row.id, meta);
        const key = normalizeComparableText(row.name);
        if (!libraryByName.has(key)) {
          libraryByName.set(key, meta);
        }
      }

      const byExercise = new Map<string, ExerciseExecution[]>();
      for (const session of sessions || []) {
        const exerciseRows = Array.isArray(session.exercises) ? session.exercises : [];
        for (const row of exerciseRows) {
          const exerciseLibraryId =
            typeof row.exercise_library_id === "string" ? row.exercise_library_id : null;
          const exerciseName = typeof row.exercise_name === "string" ? row.exercise_name.trim() : "";
          const loadKg = typeof row.load_kg === "number" ? row.load_kg : NaN;
          const reps = typeof row.reps === "number" ? row.reps : NaN;

          if (!exerciseName || !Number.isFinite(loadKg) || loadKg <= 0 || !Number.isFinite(reps) || reps <= 0) {
            continue;
          }

          const key = exerciseLibraryId
            ? `id:${exerciseLibraryId}`
            : `name:${normalizeComparableText(exerciseName)}`;
          const list = byExercise.get(key) || [];
          list.push({
            exerciseLibraryId,
            exerciseName,
            loadKg,
            reps,
            date: session.date,
            prescriptionId: session.prescription_id,
            observations: typeof row.observations === "string" ? row.observations : null,
          });
          byExercise.set(key, list);
        }
      }

      const criticalFlags = recommendation.alerts.some((alert) => alert.level === "CRITICAL");
      const maxExercises = 5;

      const suggestions: LoadSuggestionItem[] = ([...byExercise.entries()]
        .map(([key, list]): LoadSuggestionItem | null => {
          list.sort((a, b) => (a.date === b.date ? 0 : a.date < b.date ? 1 : -1));
          const first = list[0];
          if (!first) return null;

          const libMeta = first.exerciseLibraryId
            ? libraryById.get(first.exerciseLibraryId)
            : libraryByName.get(normalizeComparableText(first.exerciseName));
          const eligibleByCategory = isEligibleStrengthCategory(libMeta?.category);
          if (!eligibleByCategory) return null;

          // A referência é SEMPRE a última execução válida: toda entrada da
          // lista já passou pelo filtro de ingestão (carga e reps finitas e
          // positivas), então `first` existe e é utilizável por construção.
          // A cadeia antiga `first || bestEquivalent || sameBlock` era código
          // morto que fazia a UI PARECER ter fontes alternativas — os tipos
          // "best_recent_equivalent"/"same_block" ficam reservados pra
          // seleção mais esperta na fase de normalização (R3+).
          const reference = first;
          const source: LoadSuggestionItem["source"] = "last_valid";

          if (!Number.isFinite(reference.loadKg)) {
            return {
              key,
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
              guardrails: [],
            };
          }

          const incrementKg = inferIncrement(libMeta?.equipmentRequired);
          // Janela CLÍNICA de 30 dias (auditoria 29/08): "as 3 últimas
          // execuções" deixava dor de 89 dias atrás travando a carga de quem
          // treina pouco E ignorava dor recente na 4ª execução de quem
          // treina muito.
          const guardrailCutoff = subDays(new Date(), 30).toISOString().slice(0, 10);
          const recentObservations = list
            .filter((item) => item.date >= guardrailCutoff)
            .map((item) => item.observations);
          const hasPainOrJointWarning = recentObservations.some((obs) => hasPainSignal(obs));
          const hasTechniqueWarning = recentObservations.some((obs) => hasTechniqueSignal(obs));
          const guardrails: string[] = [];

          const decision = decideLoadSuggestion({
            referenceLoadKg: reference.loadKg,
            incrementKg,
            loadDecision: recommendation.loadDecision,
            authorizedPercent: recommendation.loadAdjustmentPercent,
            hasPainOrJointWarning,
            hasTechniqueWarning,
            criticalFlags,
          });
          const suggestedLoadKg = decision.suggestedLoadKg;
          const adjustmentPercent = decision.adjustmentPercent;
          const ruleApplied = decision.ruleApplied;
          guardrails.push(...decision.guardrails);

          const status: SuggestionStatus =
            recommendation.loadDecision === "block"
              ? "blocked"
              : recommendation.loadDecision === "maintain" && !hasPainOrJointWarning && !hasTechniqueWarning
                ? "automatic"
                : "assisted";

          return {
            key,
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
            guardrails,
          };
        })
        .filter((item): item is LoadSuggestionItem => item !== null && item !== undefined)
        .sort((a, b) => {
          const aMissing = a.status === "insufficient" ? 1 : 0;
          const bMissing = b.status === "insufficient" ? 1 : 0;
          if (aMissing !== bMissing) return aMissing - bMissing;
          return (b.referenceLoadKg || 0) - (a.referenceLoadKg || 0);
        })
        .slice(0, maxExercises)) as LoadSuggestionItem[];

      logger.info("[load-suggestions] generated", {
        studentId,
        zone: recommendation.zone,
        decision: recommendation.loadDecision,
        suggestions: suggestions.length,
        assisted: suggestions.filter((item) => item.status === "assisted").length,
        insufficient: suggestions.filter((item) => item.status === "insufficient").length,
        guardrailsTriggered: suggestions.filter((item) => item.guardrails.length > 0).length,
      });

      return suggestions;
    },
    staleTime: 60 * 1000,
  });
};
