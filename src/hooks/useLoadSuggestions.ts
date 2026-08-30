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
import { assignmentStatus } from "@/utils/assignmentStatus";

type SuggestionStatus = "automatic" | "assisted" | "blocked" | "insufficient";

/**
 * R8c (decisão 3, ratificada): a sugestão é escopada pela PRESCRIÇÃO
 * VIGENTE. Modos:
 * - "prescription": plano vigente escolhido — itens na ORDEM do plano.
 * - "selection_required": >1 vigente e nenhuma escolhida — sem escolha
 *   silenciosa (itens vazios até o coach escolher).
 * - "fallback_recent": ZERO vigentes — top por peso dos últimos 90 dias
 *   (comportamento antigo), com nota visível.
 * - "suspended": erro ao consultar as atribuições — erro parcial suspende
 *   ação (NUNCA cai no fallback como se não houvesse prescrição).
 */
export interface LoadSuggestionsResult {
  mode: "prescription" | "selection_required" | "fallback_recent" | "suspended";
  prescriptionId: string | null;
  prescriptionName: string | null;
  availablePrescriptions: Array<{ id: string; name: string }>;
  fallbackReason: string | null;
  items: LoadSuggestionItem[];
}

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
  /** "cadastrado" = min_increment_kg da biblioteca; "inferido" = heurística
   *  por equipamento (o coach precisa saber quando foi chute). */
  incrementSource: "cadastrado" | "inferido";
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
  // "tecnica" sozinha NÃO é sinal ("técnica excelente" bloqueava progressão
  // — revisão R7); só a menção com qualificador negativo conta.
  return (
    /\btecnica\s+(?:ruim|comprometida|falhou|quebrou|instavel)\b/.test(normalized) ||
    /\b(?:falha|quebra|perda)\s+d?[aeo]?\s*tecnica\b/.test(normalized) ||
    normalized.includes("compensacao") ||
    normalized.includes("instavel") ||
    normalized.includes("instabilidade")
  );
};

export const useLoadSuggestions = (
  studentId: string,
  recommendation: TrainingRecommendation | null,
  selectedPrescriptionId: string | null = null,
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
    queryKey: ["load-suggestions", studentId, recommendationKey, selectedPrescriptionId ?? "auto"],
    enabled: !!studentId && !!recommendation,
    refetchOnWindowFocus: false,
    queryFn: async (): Promise<LoadSuggestionsResult> => {
      const empty = (mode: LoadSuggestionsResult["mode"], extra: Partial<LoadSuggestionsResult> = {}): LoadSuggestionsResult => ({
        mode, prescriptionId: null, prescriptionName: null,
        availablePrescriptions: [], fallbackReason: null, items: [], ...extra,
      });
      if (!recommendation) return empty("fallback_recent");

      // ── atribuições vigentes (erro aqui NÃO cai no fallback) ──────────
      const { data: assignmentRows, error: assignmentsError } = await supabase
        .from("prescription_assignments")
        .select("prescription_id, start_date, end_date, custom_adaptations, prescriptions(name)")
        .eq("student_id", studentId);
      if (assignmentsError) {
        logger.warn("[load-suggestions] atribuições indisponíveis — sugestão suspensa", { assignmentsError });
        return empty("suspended", { fallbackReason: "erro ao consultar prescrições" });
      }
      const vigentes = (assignmentRows ?? []).filter((a) =>
        assignmentStatus({ start_date: a.start_date, end_date: a.end_date }) === "vigente",
      );
      const availablePrescriptions = vigentes.map((a) => ({
        id: a.prescription_id as string,
        name: ((a.prescriptions as { name?: string } | null)?.name ?? "Prescrição") as string,
      }));

      let chosen: (typeof vigentes)[number] | null = null;
      if (vigentes.length === 1) {
        chosen = vigentes[0];
      } else if (vigentes.length > 1) {
        chosen = vigentes.find((a) => a.prescription_id === selectedPrescriptionId) ?? null;
        if (!chosen) return empty("selection_required", { availablePrescriptions });
      }

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
          supabase.from("exercises_library").select("id, name, category, equipment_required, min_increment_kg"),
        ]);

      if (sessionsError) throw sessionsError;
      if (libraryError) throw libraryError;

      type LibraryMeta = {
        category: string | null;
        equipmentRequired: string[] | null;
        minIncrementKg: number | null;
        name: string;
      };
      const libraryById = new Map<string, LibraryMeta>();
      const libraryByName = new Map<string, LibraryMeta>();
      const libraryIdByName = new Map<string, string>();
      for (const row of libraryRows || []) {
        if (!row?.name) continue;
        const meta: LibraryMeta = {
          category: row.category,
          name: row.name,
          minIncrementKg: typeof row.min_increment_kg === "number" ? row.min_increment_kg : null,
          equipmentRequired: Array.isArray(row.equipment_required)
            ? row.equipment_required.filter((item): item is string => typeof item === "string")
            : null,
        };
        libraryById.set(row.id, meta);
        const key = normalizeComparableText(row.name);
        if (!libraryByName.has(key)) {
          libraryByName.set(key, meta);
        }
        if (!libraryIdByName.has(key)) {
          libraryIdByName.set(key, row.id);
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

          // Reconciliação (revisão R7): execução antiga sem id, cujo nome
          // casa com a biblioteca, entra no MESMO grupo do id canônico —
          // senão o mesmo exercício aparecia 2× com histórico fragmentado.
          const normalizedName = normalizeComparableText(exerciseName);
          const canonicalId = exerciseLibraryId ?? libraryIdByName.get(normalizedName) ?? null;
          const key = canonicalId ? `id:${canonicalId}` : `name:${normalizedName}`;
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

      const buildItem = (
        key: string,
        exerciseName: string,
        libMeta: LibraryMeta | undefined,
        list: ExerciseExecution[] | undefined,
        planNote: string | null,
      ): LoadSuggestionItem => {
        const incrementFromLibrary = libMeta?.minIncrementKg ?? null;
        const incrementKg = incrementFromLibrary ?? inferIncrement(libMeta?.equipmentRequired);
        const incrementSource: LoadSuggestionItem["incrementSource"] =
          incrementFromLibrary !== null ? "cadastrado" : "inferido";
        const sorted = (list ?? []).slice().sort((a, b) => (a.date === b.date ? 0 : a.date < b.date ? 1 : -1));
        const reference = sorted[0];
        if (!reference) {
          return {
            key, exerciseName,
            lastLoadKg: null, referenceLoadKg: null, referenceReps: null, suggestedLoadKg: null,
            ruleApplied: "Primeira execução — definir carga com a aluna",
            adjustmentPercent: null, source: "insufficient", status: "insufficient",
            incrementKg, incrementSource,
            guardrails: planNote ? [planNote] : [],
          };
        }
        const guardrailCutoff = subDays(new Date(), 30).toISOString().slice(0, 10);
        const recentObservations = sorted
          .filter((item) => item.date >= guardrailCutoff)
          .map((item) => item.observations);
        const hasPainOrJointWarning = recentObservations.some((obs) => hasPainSignal(obs));
        const hasTechniqueWarning = recentObservations.some((obs) => hasTechniqueSignal(obs));
        const guardrails: string[] = planNote ? [planNote] : [];
        const decision = decideLoadSuggestion({
          referenceLoadKg: reference.loadKg,
          incrementKg,
          loadDecision: recommendation.loadDecision,
          authorizedPercent: recommendation.loadAdjustmentPercent,
          hasPainOrJointWarning,
          hasTechniqueWarning,
          criticalFlags,
        });
        guardrails.push(...decision.guardrails);
        const status: SuggestionStatus =
          recommendation.loadDecision === "block"
            ? "blocked"
            : recommendation.loadDecision === "maintain" && !hasPainOrJointWarning && !hasTechniqueWarning
              ? "automatic"
              : "assisted";
        return {
          key, exerciseName,
          lastLoadKg: reference.loadKg,
          referenceLoadKg: reference.loadKg,
          referenceReps: reference.reps,
          suggestedLoadKg: decision.suggestedLoadKg,
          ruleApplied: decision.ruleApplied,
          adjustmentPercent: decision.adjustmentPercent,
          source: "last_valid", status, incrementKg, incrementSource, guardrails,
        };
      };

      // ── MODO PRESCRIÇÃO: itens do plano vigente, na ORDEM do plano ─────
      if (chosen) {
        const { data: planRows, error: planError } = await supabase
          .from("prescription_exercises")
          .select("exercise_library_id, order_index, should_track")
          .eq("prescription_id", chosen.prescription_id)
          .order("order_index", { ascending: true });
        if (planError) {
          logger.warn("[load-suggestions] plano indisponível — sugestão suspensa", { planError });
          return empty("suspended", { fallbackReason: "erro ao consultar o plano" });
        }
        const adaptations = Array.isArray(chosen.custom_adaptations)
          ? (chosen.custom_adaptations as Array<{ exercise_library_id?: string }>)
          : [];
        const seen = new Set<string>();
        const items: LoadSuggestionItem[] = [];
        for (const planRow of planRows ?? []) {
          if (planRow.should_track === false) continue; // não rastreável não sugere carga
          const libId = typeof planRow.exercise_library_id === "string" ? planRow.exercise_library_id : null;
          if (!libId || seen.has(libId)) continue; // repetido no plano → 1ª ocorrência
          seen.add(libId);
          const libMeta = libraryById.get(libId);
          if (!libMeta) continue; // exercício removido da biblioteca
          if (!isEligibleStrengthCategory(libMeta.category)) continue;
          const planNote = adaptations.some((a) => a.exercise_library_id === libId)
            ? "Adaptação individual nesta prescrição — confira séries/reps na atribuição."
            : null;
          items.push(buildItem(`id:${libId}`, libMeta.name, libMeta, byExercise.get(`id:${libId}`), planNote));
        }
        logger.info("[load-suggestions] plano vigente", {
          studentId, prescriptionId: chosen.prescription_id, itens: items.length,
        });
        return {
          mode: "prescription",
          prescriptionId: chosen.prescription_id as string,
          prescriptionName: availablePrescriptions.find((p) => p.id === chosen!.prescription_id)?.name ?? null,
          availablePrescriptions,
          fallbackReason: null,
          items,
        };
      }

      // ── FALLBACK (ZERO vigentes): top por peso dos últimos 90 dias ────
      const fallbackItems = ([...byExercise.entries()]
        .map(([key, list]) => {
          const first = list[0];
          if (!first) return null;
          const libMeta = first.exerciseLibraryId
            ? libraryById.get(first.exerciseLibraryId)
            : libraryByName.get(normalizeComparableText(first.exerciseName));
          if (!isEligibleStrengthCategory(libMeta?.category)) return null;
          return buildItem(key, first.exerciseName, libMeta, list, null);
        })
        .filter((item): item is LoadSuggestionItem => item !== null)
        .sort((a, b) => {
          const aMissing = a.status === "insufficient" ? 1 : 0;
          const bMissing = b.status === "insufficient" ? 1 : 0;
          if (aMissing !== bMissing) return aMissing - bMissing;
          return (b.referenceLoadKg || 0) - (a.referenceLoadKg || 0);
        })
        .slice(0, maxExercises)) as LoadSuggestionItem[];

      logger.info("[load-suggestions] fallback sem prescrição vigente", {
        studentId,
        zone: recommendation.zone,
        decision: recommendation.loadDecision,
        suggestions: fallbackItems.length,
      });

      return {
        mode: "fallback_recent",
        prescriptionId: null,
        prescriptionName: null,
        availablePrescriptions,
        fallbackReason: "sem prescrição vigente — mostrando exercícios recentes",
        items: fallbackItems,
      };
    },
    staleTime: 60 * 1000,
  });
};
