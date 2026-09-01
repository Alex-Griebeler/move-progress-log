import { Fragment, cloneElement, useState, useEffect, useRef } from "react";
import { Card } from "./ui/card";
import { logger } from "@/utils/logger";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Skeleton } from "./ui/skeleton";
import { AlertCircle, Activity, Target } from "lucide-react";
import { OuraMetrics, spToday } from "@/hooks/useOuraMetrics";
import { WhoopMetrics } from "@/hooks/useWhoopMetrics";
import { useTrainingRecommendation } from "@/hooks/useTrainingRecommendation";
import { useOuraBaseline } from "@/hooks/useOuraBaseline";
import { useLatestOuraAcuteMetrics } from "@/hooks/useOuraAcuteMetrics";
import { useLoadSuggestions } from "@/hooks/useLoadSuggestions";
import { useTrainingContext } from "@/contexts/TrainingContext";
import { Alert, AlertDescription } from "./ui/alert";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "./ui/accordion";
import TrainingZonesCard from "./TrainingZonesCard";
import { ScoreRing, MetricTile, StaleBadge, DataErrorState } from "./metrics";
import type { MetricDelta, MetricTone } from "./metrics";
import { buildRecoverySnapshot } from "@/utils/recoverySnapshot";
import { getTrainingAlternativesForZone } from "@/utils/trainingAlternatives";
import {
  buildWhoopRecommendation,
  computeWhoopContext,
  newerUnscoredWhoopDay,
  WHOOP_SYNC_STALE_HOURS,
} from "@/utils/whoopRecommendation";
import { useWhoopConnection, useSyncWhoop } from "@/hooks/useWhoopConnection";
import { useIsAdmin } from "@/hooks/useUserRole";
import {
  computeEffectiveConduct,
  PRESCRIPTION_BY_ZONE,
  ZONE_FROM_LABEL,
  type ConductAlternative,
  type EffectiveConduct,
} from "@/utils/effectiveConduct";
import {
  PERCEPTION_CATEGORY,
  PERCEPTION_TEXT_VERSION_V2,
  parsePerceptionText,
  rememberPerceptionObservation,
  spDayUtcRange,
  upsertPerceptionObservationV2,
  validateRememberedPerception,
} from "@/utils/perceptionObservation";
import {
  derivePerceptionFromPsr,
  hashConductFingerprint,
  normalizePsr,
} from "@/utils/checkin";
import { deriveTrainingHeroState, resolveCheckInState } from "@/utils/trainingHeroState";
import CheckInForm from "@/components/checkin/CheckInForm";
import AddObservationDialog from "@/components/checkin/AddObservationDialog";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { daysBetweenDateOnly, formatRelativeDay, parseLocalDate, shiftDateOnly } from "@/utils/relativeDate";
import {
  partitionAlerts,
  stripAlertEmoji,
  type AlertMetric,
} from "@/utils/attentionAlerts";
import {
  CONDUCT_TONE_BY_ZONE,
  SNAPSHOT_ZONE_SHORT,
  VERDICT_BY_ZONE,
  formatDoseShort,
} from "@/utils/recommendationDisplay";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";

interface PersonalizedTrainingDashboardProps {
  latestMetrics: OuraMetrics | null;
  recentMetrics: OuraMetrics[];
  whoopMetrics?: WhoopMetrics[];
  studentName: string;
  studentId: string;
  maxHeartRate?: number | null;
  isLoading?: boolean;
  isError?: boolean;
  /**
   * Erro ESPECÍFICO da consulta do dia mais recente (useLatestOuraMetrics).
   * Com snapshot presente, um erro só nessa consulta não pode virar nem
   * erro total nem a afirmação "sem score fechado" — é estado próprio.
   */
  latestOuraError?: boolean;
  onStartTraining?: (prescriptionId?: string | null) => void;
}

const ZONE_LABEL: Record<string, string> = {
  green_high: "Verde Alta",
  green: "Verde",
  yellow: "Amarela",
  orange: "Laranja",
  red: "Vermelha",
};

const SOURCE_LABEL: Record<string, string> = {
  last_valid: "Última carga válida",
  best_recent_equivalent: "Melhor recente equivalente",
  same_block: "Última do bloco atual",
  fallback_keep: "Fallback manter carga",
  insufficient: "Dados insuficientes",
};

const SNAPSHOT_TONE: Record<string, MetricTone> = {
  alta: "success",
  media: "warning",
  baixa: "destructive",
};

const formatDuration = (seconds: number | null) => {
  if (seconds === null) return null;
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${minutes}min`;
};

const formatLoad = (value: number | null | undefined) => {
  if (value === null || value === undefined) return "--";
  return `${value.toFixed(1)} kg`;
};

const formatAdjustmentPercent = (value: number | null) => {
  if (value === null) return "--";
  return `${value > 0 ? "+" : ""}${value}%`;
};

const getSuggestionStatusLabel = (status: string) => {
  if (status === "automatic") return "Sugestão automática";
  if (status === "assisted") return "Sugestão assistida";
  if (status === "blocked") return "Carga bloqueada hoje";
  if (status === "suspended") return "Adaptação a resolver";
  return "Dados insuficientes";
};

// Alternativas por faixa de readiness (conteúdo de domínio pré-existente;
// apresentação sem emoji — coerência ratificada).

const PersonalizedTrainingDashboard = ({
  latestMetrics,
  recentMetrics,
  whoopMetrics = [],
  studentName,
  studentId,
  maxHeartRate,
  isLoading = false,
  isError = false,
  latestOuraError = false,
  onStartTraining,
}: PersonalizedTrainingDashboardProps) => {
  // 30 dias: é o que a UI promete nos deltas ("vs 30d") — o default do hook
  // era 14 e ninguém percebia a divergência.
  const { data: latestAcuteMetrics } = useLatestOuraAcuteMetrics(studentId);
  const { data: whoopConnection, isError: whoopConnectionError } = useWhoopConnection(studentId);
  const syncWhoop = useSyncWhoop();
  const { isAdmin } = useIsAdmin();
  // R8d: relógio de 60s pro contexto Whoop — sem ele, tela aberta ficava
  // "fresh" pra sempre (Date.now() no render só muda com outro render). A
  // virada fresh→stale muda o fingerprint e invalida a modulação registrada
  // (gate clínico mudou) — comportamento desejado, sem loop (só o timer
  // atualiza o relógio).
  const [whoopClockMs, setWhoopClockMs] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setWhoopClockMs(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);
  // R5 — a FONTE é decidida ANTES de qualquer consumo: o snapshot escolhe
  // {source, date} e todo o resto (recomendação, tiles, carga, alertas) casa
  // com esse par. Nunca misturar hero Whoop de hoje com recomendação Oura
  // antiga — nem anel de um dia com prescrição de outro.
  // latestMetrics participa da DECISÃO da fonte: com cache defasado do
  // histórico, o dia Oura mais novo podia existir só na query "latest" e o
  // snapshot escolheria Whoop de ontem por cima de Oura de hoje.
  // R8-5: o latest (busca de até 90 linhas) só participa da DECISÃO da
  // fonte se estiver DENTRO da janela de 30 dias — fora dela, ele furava a
  // consequência ratificada ("sync esparso → sem recomendação").
  const ouraWindowStart = shiftDateOnly(spToday(), -29);
  const latestInWindow =
    latestMetrics && latestMetrics.date >= ouraWindowStart ? latestMetrics : null;
  const earlySnapshot = buildRecoverySnapshot(
    latestInWindow ? [latestInWindow, ...recentMetrics] : recentMetrics,
    whoopMetrics,
  );
  // latestMetrics vem de query com cache próprio e pode estar um dia à
  // frente (ou atrás) do snapshot — a linha Oura consumida por prescrição e
  // tiles é a do DIA do snapshot, com latestMetrics só como fallback.
  const ouraDayRow =
    earlySnapshot?.source === "oura"
      ? recentMetrics.find((m) => m.date === earlySnapshot.date) ?? latestInWindow
      : latestMetrics;
  // Baseline ancorado no DIA do snapshot (auditoria 29/08): a RPC antiga
  // ancorava em CURRENT_DATE e incluía o próprio dia e linhas futuras.
  const { baseline } = useOuraBaseline(
    studentId,
    30,
    earlySnapshot?.source === "oura" ? earlySnapshot.date : undefined,
  );
  const recommendation = useTrainingRecommendation(ouraDayRow, recentMetrics, baseline, undefined, latestAcuteMetrics);
  const whoopRec =
    earlySnapshot?.source === "whoop"
      // spToday() do RENDER pode estar até 1 dia à frente do anchor da query
      // (virada de meia-noite SP antes do refetch da nova key). Direção
      // conservadora: coverageStart estimado ≥ real → o guard nunca aceita
      // baseline truncado; no pior caso descarta um válido no limite dos 59
      // dias, até a próxima reavaliação da query key.
      ? buildWhoopRecommendation(whoopMetrics, earlySnapshot.date, spToday())
      : null;
  const activeRecommendation =
    earlySnapshot?.source === "whoop"
      ? whoopRec?.recommendation ?? null
      : recommendation;
  const [showAlternatives, setShowAlternatives] = useState(false);
  const {
    selectedAlternative: rawSelectedAlternative,
    setSelectedAlternative,
    conductAssessment,
    setConductAssessment,
    checkInRecord,
    setCheckInRecord,
  } = useTrainingContext();
  const { toast } = useToast();
  const [liveAnnouncement, setLiveAnnouncement] = useState("");
  const [showObservationDialog, setShowObservationDialog] = useState(false);
  const conductRegionRef = useRef<HTMLDivElement | null>(null);
  const lastRegisteredVerdictRef = useRef<string | null>(null);
  const skipHintShownRef = useRef(false);
  // Escolha de alternativa é estado GLOBAL: sem casar {studentId, date},
  // a seleção da aluna A aparecia no hero da aluna B (revisão R7).
  const selectedAlternative =
    rawSelectedAlternative &&
    rawSelectedAlternative.studentId === studentId &&
    rawSelectedAlternative.date === earlySnapshot?.date
      ? rawSelectedAlternative
      : null;
  // (o casamento com o fingerprint acontece adiante, depois de calculá-lo)

  // ── R8b: CONDUTA EFETIVA (percepção da aluna + alternativa) ────────────
  // Fingerprint COMPLETO: mudou score/zona/carga/override/CRITICAL/contexto,
  // a modulação registrada é invalidada na tela (o histórico fica no banco).
  const criticalSignature = activeRecommendation
    ? activeRecommendation.alerts
        .filter((a) => a.kind === "fisiologico" && a.level === "CRITICAL")
        // métrica+mensagem: a mensagem carrega o VALOR medido — sono caindo
        // de 6h pra 3h com a mesma zona também invalida a modulação (fria).
        .map((a) => `${a.metric ?? "?"}:${a.message}`)
        .sort()
        .join(";")
    : "";
  // R8d: contexto REAL de freshness/strain (o fail-closed da R8b sai de
  // cena). Erro na consulta da conexão → unavailable (veto de elevação,
  // nunca piso); strain do DIA do snapshot; alerta só com snapshot de hoje.
  const whoopDayRow =
    earlySnapshot?.source === "whoop"
      ? whoopMetrics.find((w) => w.date === earlySnapshot.date) ?? null
      : null;
  const whoopCtx =
    earlySnapshot?.source === "whoop"
      ? computeWhoopContext({
          lastSyncAt: whoopConnection?.last_sync_at ?? null,
          connectionUnavailable: whoopConnectionError || whoopConnection === undefined,
          dayStrain: whoopDayRow?.day_strain ?? null,
          snapshotIsToday: earlySnapshot.date === spToday(),
          nowMs: whoopClockMs,
        })
      : null;
  const whoopConductContext = whoopCtx
    ? ({ freshness: whoopCtx.freshness, strain: whoopCtx.strain } as const)
    : null;
  const conductFingerprint = earlySnapshot && activeRecommendation
    ? [
        studentId, earlySnapshot.source, earlySnapshot.date, earlySnapshot.score,
        activeRecommendation.zone, activeRecommendation.loadDecision,
        activeRecommendation.loadAdjustmentPercent ?? "na",
        activeRecommendation.overrideApplied ? "ov" : "-", criticalSignature,
        whoopConductContext ? `${whoopConductContext.freshness}/${whoopConductContext.strain}` : "na",
      ].join("|")
    : null;
  // Escopo por fingerprint: avaliação registrada só vale pra recomendação
  // que a originou. O VALOR do PSR de um fingerprint antigo do MESMO aluno é
  // preservado como RASCUNHO pra reconfirmação (U4) — nunca alimenta o funil.
  const assessment =
    conductAssessment && conductFingerprint && conductAssessment.fingerprint === conductFingerprint
      ? conductAssessment
      : null;
  const psrDraft =
    !assessment &&
    conductAssessment &&
    conductAssessment.studentId === studentId &&
    conductAssessment.psr !== null
      ? conductAssessment.psr
      : null;
  // Máquina do check-in (parte síncrona) ANTES do funil: o PSR só modula a
  // conduta quando o check-in está REGISTRADO — rascunho selecionado e não
  // commitado nunca alimenta o funil (fix da review B2: skip pós-seleção
  // revela a conduta OBJETIVA, como o oráculo manda).
  const todaySp = spToday();
  const scopedCheckInRecord =
    checkInRecord && checkInRecord.studentId === studentId ? checkInRecord : null;
  const checkInState = resolveCheckInState(
    scopedCheckInRecord
      ? {
          state: scopedCheckInRecord.state,
          conductFingerprint: scopedCheckInRecord.conductFingerprint,
          spDay: scopedCheckInRecord.spDay,
        }
      : null,
    conductFingerprint,
    todaySp,
  );
  const registeredPsr =
    checkInState === "done" ? normalizePsr(assessment?.psr ?? null) : null;
  const perception = derivePerceptionFromPsr(
    registeredPsr,
    earlySnapshot?.score ?? 0,
  );
  // Alternativa também é MODULAÇÃO: fingerprint diferente = recomendação
  // mudou → a escolha antiga é limpa (não aplicada) — revisão R8b.
  const scopedAlternative =
    selectedAlternative && selectedAlternative.fingerprint === conductFingerprint
      ? selectedAlternative
      : null;
  const conductAlternative: ConductAlternative | null =
    scopedAlternative && typeof scopedAlternative.targetZone === "number"
      ? {
          type: scopedAlternative.type,
          description: scopedAlternative.description,
          targetZone: scopedAlternative.targetZone,
          targetLoadDecision: scopedAlternative.targetLoadDecision ?? "block",
          targetAdjustmentPercent: scopedAlternative.targetAdjustmentPercent ?? null,
        }
      : null;
  const conduct: EffectiveConduct | null =
    activeRecommendation && earlySnapshot
      ? computeEffectiveConduct({
          base: activeRecommendation,
          source: earlySnapshot.source,
          score: earlySnapshot.score,
          perception,
          alternative: conductAlternative,
          whoopContext: whoopConductContext,
          hasPartialError: isError,
        })
      : null;
  // A carga assistida segue a CONDUTA (zona/decisão efetivas), nunca a base
  // quando há modulação — o motor original permanece intocado.
  const conductRecommendation =
    activeRecommendation && conduct && conduct.modulated
      ? {
          ...activeRecommendation,
          zone: (Object.entries(ZONE_FROM_LABEL).find(([, z]) => z === conduct.effectiveZone)?.[0] ??
            activeRecommendation.zone) as typeof activeRecommendation.zone,
          loadDecision: conduct.effectiveLoadDecision,
          loadAdjustmentPercent: conduct.effectiveLoadAdjustmentPercent,
        }
      : activeRecommendation;
  const [selectedLoadPrescriptionId, setSelectedLoadPrescriptionId] = useState<string | null>(null);
  const {
    data: loadResult,
    isLoading: loadSuggestionsLoading,
    isError: loadSuggestionsError,
  } = useLoadSuggestions(
    studentId,
    conduct?.suspended ? null : conductRecommendation,
    selectedLoadPrescriptionId,
  );
  const loadSuggestions = loadResult?.items;
  // R8c: a MESMA prescrição das sugestões vai pro prescription_id da sessão.
  const activePrescriptionId = loadResult?.prescriptionId ?? null;
  // Caso 18 da matriz + revisão: sessão só inicia com o ESCOPO resolvido
  // (plano vigente ou fallback declarado) — carregando/erro/suspenso não
  // viram sessão livre silenciosamente.
  const prescriptionSelectionPending = loadResult?.mode === "selection_required";
  // loadSuggestionsError junto: refetch falho MANTÉM data antiga no cache
  // (isError=true + data velha) — escopo velho não pode iniciar sessão.
  const sessionScopeResolved =
    !loadSuggestionsError &&
    (loadResult?.mode === "prescription" || loadResult?.mode === "fallback_recent");

  // Check-in v3: selecionar um número da escala atualiza o PSR (escopo =
  // fingerprint). Invalidação SÍNCRONA (fria R8b, mantida): mudança muda a
  // conduta; save em voo da versão anterior não volta como "Registrado".
  const setPsr = (psr: number) => {
    if (!conductFingerprint || !earlySnapshot) return;
    closeColdStart();
    conductVersionRef.current += 1;
    setPerceptionSaveState("idle");
    setConductAssessment({
      studentId,
      source: earlySnapshot.source,
      snapshotDate: earlySnapshot.date,
      fingerprint: conductFingerprint,
      psr,
    });
  };
  const [perceptionSaveState, setPerceptionSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  // "Registrado" não vale mais quando a CONDUTA muda: fingerprint novo ou
  // alternativa escolhida depois (fria R8b; check-in v3: as mudanças internas
  // são só o PSR, que bumpa sincronamente no setPsr).
  const conductVersionRef = useRef(0);
  useEffect(() => {
    // Mudanças EXTERNAS de conduta (fingerprint novo, alternativa) também
    // carimbam o token — a mudança interna (PSR) já bumpa SINCRONAMENTE no
    // setPsr.
    conductVersionRef.current += 1;
    setPerceptionSaveState("idle");
  }, [conductFingerprint, scopedAlternative?.type]);
  // Vínculo pendente só vale enquanto a recomendação E a avaliação que o
  // originaram existem (assessmentFingerprint composto — v8.1/B3): mudou o
  // PSR depois do registro → o link automático morre; a observação fica.
  const linkFingerprint = conductFingerprint
    ? `${conductFingerprint}#psr=${assessment?.psr ?? "null"}`
    : null;
  useEffect(() => {
    validateRememberedPerception(studentId, linkFingerprint);
  }, [studentId, linkFingerprint]);
  const persistPerception = async (conductTypeOverride?: string) => {
    if (!earlySnapshot || !activeRecommendation || !conduct || !conductFingerprint) return;
    closeColdStart();
    const validPsr = normalizePsr(assessment?.psr ?? null);
    // "Registrar exige PSR respondido" (v7): sem override, PSR inválido
    // aborta. O registro de DIA DE DESCANSO (override) pode acontecer
    // pós-skip: grava o evento SEM forjar um check-in "done" (fix B2-3).
    if (!conductTypeOverride && validPsr === null) {
      setPerceptionSaveState("error");
      return;
    }
    // Conduta PROSPECTIVA do commit (fix B2-p1 rodada 3): no momento do
    // Registrar o estado ainda é pending (rascunho não modula a tela) — o
    // REGISTRO precisa gravar a conduta que o PSR commitado produz, senão o
    // banco diz "manter" e a tela revela "reduzir". O override (rest-day)
    // registra o estado exibido, que já é pós-done/skip.
    const prospectivePerception = conductTypeOverride
      ? perception
      : derivePerceptionFromPsr(validPsr, earlySnapshot.score);
    const prospectiveConduct = conductTypeOverride
      ? conduct
      : computeEffectiveConduct({
          base: activeRecommendation,
          source: earlySnapshot.source,
          score: earlySnapshot.score,
          perception: prospectivePerception,
          alternative: conductAlternative,
          whoopContext: whoopConductContext,
          hasPartialError: isError,
        });
    // Dia do REGISTRO capturado antes de qualquer await: virada de meia-noite
    // entre o upsert e o remember gravava num dia e lembrava noutro (fria R8b).
    const registrationDay = spToday();
    const startedVersion = conductVersionRef.current;
    // Delta pro anúncio pós-registro (U8): veredito ANTES desta gravação.
    const previousVerdict = lastRegisteredVerdictRef.current;
    const registeredAtIso = new Date().toISOString();
    setPerceptionSaveState("saving");
    try {
      const { data: userData } = await supabase.auth.getUser();
      const actorId = userData?.user?.id ?? null;
      if (!actorId) {
        // Contrato: created_by = coach autenticado — sem sessão de auth
        // válida o registro NÃO acontece (revisão R8b).
        logger.error("[percepcao] sem usuário autenticado — registro abortado");
        setPerceptionSaveState("error");
        return;
      }
      const observationId = await upsertPerceptionObservationV2(supabase, studentId, {
        source: earlySnapshot.source,
        score: earlySnapshot.score,
        // Override: persiste o PSR EXIBIDO (registeredPsr) — pós-skip é null e
        // o registro de descanso nunca reidrata "done" (fix rodada 4).
        psr: conductTypeOverride ? registeredPsr : validPsr,
        conductFingerprintHash: hashConductFingerprint(conductFingerprint),
        registeredAtIso,
        baseZoneLabel: activeRecommendation.zone,
        perception: prospectivePerception,
        conductType: conductTypeOverride ?? prospectiveConduct.prescription.trainingType,
        vetoes: prospectiveConduct.appliedVetoes,
        spDay: registrationDay,
        snapshotDate: earlySnapshot.date,
        registeredAtDisplay: new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }),
        actorId,
      });
      if (conductVersionRef.current !== startedVersion) {
        // A conduta mudou enquanto a gravação estava em voo: a observação
        // ficou no banco (histórico legítimo), mas nem o vínculo automático
        // nem o "Registrado" valem pra conduta NOVA. Toast identificado (U11).
        toast({ title: `Check-in de ${studentName} registrado`, description: "A conduta mudou depois do registro — confira a tela." });
        return;
      }
      if (!conductTypeOverride) {
        // Vínculo automático é do CHECK-IN commitado — o registro de
        // descanso (override) não entra no remember/link (fix B2-p1-3).
        rememberPerceptionObservation(
          studentId,
          registrationDay,
          observationId,
          `${conductFingerprint}#psr=${assessment?.psr ?? "null"}`,
        );
      }
      setPerceptionSaveState("saved");
      // SÓ o commit normal com PSR válido vira "done" — o rest-day
      // (override, alcançável pós-skip) nunca forja check-in (fix B2-p1-2).
      if (!conductTypeOverride && validPsr !== null) {
        setCheckInRecord({
          studentId,
          state: "done",
          conductFingerprint,
          spDay: registrationDay,
          registeredAtIso,
        });
      }
      const newVerdict = VERDICT_BY_ZONE[prospectiveConduct.effectiveZone];
      lastRegisteredVerdictRef.current = newVerdict;
      if (previousVerdict && previousVerdict !== newVerdict) {
        toast({ title: `Conduta atualizada: ${previousVerdict} → ${newVerdict}` });
      }
      // U15: live curto + foco na REGIÃO da conduta (a região lê o conteúdo).
      setLiveAnnouncement("Check-in registrado");
      requestAnimationFrame(() => conductRegionRef.current?.focus());
    } catch (e) {
      logger.error("[percepcao] falha ao registrar", e);
      if (conductVersionRef.current === startedVersion) {
        setPerceptionSaveState("error");
        toast({
          title: `Check-in de ${studentName} não foi salvo`,
          description: "Verifique a conexão e tente registrar novamente.",
          variant: "destructive",
        });
      }
    }
  };

  // ── Check-in v3: efeitos da máquina (a parte síncrona vive antes do
  // funil). Destruição ATÔMICA: fingerprint/dia divergente APAGA o registro
  // (nunca "esconde") — A→B→A não ressuscita na montagem corrente. ──
  useEffect(() => {
    if (!scopedCheckInRecord) return;
    if (
      scopedCheckInRecord.conductFingerprint !== conductFingerprint ||
      scopedCheckInRecord.spDay !== todaySp
    ) {
      setCheckInRecord(null);
    }
  }, [scopedCheckInRecord, conductFingerprint, todaySp, setCheckInRecord]);

  // Reidratação de COLD START (U3/v8.1): o registro v2 persistido de HOJE com
  // fingerprint EXATO reidrata "done". Roda UMA vez por aluna nesta montagem
  // (rehydratedRef) — resposta tardia de query nunca restaura um estado que a
  // montagem corrente já destruiu (guardrail do GO).
  const rehydratedRef = useRef<string | null>(null);
  // Janela de cold-start (fix da review B2-1): aberta SÓ até a primeira
  // transição de fingerprint, interação do coach ou aplicação da resposta.
  // Fechou → resposta tardia da query NUNCA escreve estado (A→B→A morto).
  const coldStartRef = useRef<{ student: string; fingerprint: string; open: boolean } | null>(null);
  if (conductFingerprint && (coldStartRef.current === null || coldStartRef.current.student !== studentId)) {
    coldStartRef.current = { student: studentId, fingerprint: conductFingerprint, open: true };
  }
  if (
    coldStartRef.current &&
    conductFingerprint &&
    coldStartRef.current.fingerprint !== conductFingerprint
  ) {
    coldStartRef.current.open = false; // transição observada — janela fecha pra sempre
  }
  const closeColdStart = () => {
    if (coldStartRef.current) coldStartRef.current.open = false;
  };
  const [reconciliationFailed, setReconciliationFailed] = useState(false);
  const rehydration = useQuery({
    queryKey: ["checkin-rehydrate", studentId, todaySp],
    enabled: !!studentId && !!conductFingerprint && rehydratedRef.current !== studentId,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const { startIso, endIso } = spDayUtcRange(todaySp);
      const { data, error } = await supabase
        .from("student_observations")
        .select("id, observation_text, created_at")
        .eq("student_id", studentId)
        .contains("categories", [PERCEPTION_CATEGORY])
        .gte("created_at", startIso)
        .lt("created_at", endIso)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  useEffect(() => {
    if (!conductFingerprint || !earlySnapshot) return;
    if (rehydratedRef.current === studentId) return;
    if (rehydration.isLoading) return;
    rehydratedRef.current = studentId;
    // Janela fechada (transição/interação durante o voo da query) → a
    // resposta é DESCARTADA integralmente (guardrail do GO: query tardia
    // nunca restaura estado que a montagem destruiu).
    if (!coldStartRef.current?.open || coldStartRef.current.fingerprint !== conductFingerprint) {
      return;
    }
    if (rehydration.isError) {
      setReconciliationFailed(true);
      return;
    }
    setReconciliationFailed(false);
    const expectedHash = hashConductFingerprint(conductFingerprint);
    for (const row of rehydration.data ?? []) {
      const parsed = parsePerceptionText(String(row.observation_text ?? ""));
      if (parsed.version !== PERCEPTION_TEXT_VERSION_V2) continue; // v1 NUNCA reidrata
      const f = parsed.fields;
      if (f.fingerprint !== expectedHash) continue;
      if (f.fonte !== earlySnapshot.source) continue;
      const psr = normalizePsr(f.psr === "nao_informado" ? null : Number(f.psr));
      if (psr === null) continue; // done exige PSR válido (fix B2-3)
      closeColdStart(); // resposta aplicada — janela cumprida
      setCheckInRecord({
        studentId,
        state: "done",
        conductFingerprint,
        spDay: todaySp,
        registeredAtIso: f.registrado_iso ?? null,
      });
      setConductAssessment({
        studentId,
        source: earlySnapshot.source,
        snapshotDate: earlySnapshot.date,
        fingerprint: conductFingerprint,
        psr,
      });
      lastRegisteredVerdictRef.current = null;
      break;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rehydration.isLoading, rehydration.isError, rehydration.data, conductFingerprint, studentId]);

  // Reconciliação do cold start é ESTADO VISÍVEL (skeleton) — a chegada não
  // pisca "pendente" enquanto a query verifica um registro do dia (U3/B2-2).
  const reconciling =
    Boolean(coldStartRef.current?.open) &&
    rehydration.isLoading &&
    rehydratedRef.current !== studentId;

  const skipCheckIn = () => {
    if (!conductFingerprint) return;
    closeColdStart();
    setCheckInRecord({
      studentId,
      state: "skipped",
      conductFingerprint,
      spDay: todaySp,
      registeredAtIso: null,
    });
    if (!skipHintShownRef.current) {
      skipHintShownRef.current = true;
      toast({ title: "Check-in pulado", description: "Você pode fazê-lo depois pela linha do check-in." });
    }
  };
  const reopenCheckIn = () => setCheckInRecord(null); // Editar/Fazer: valor do PSR fica como rascunho

  // "registrado 08:10 · Refazer" quando o registro tem >3h (U14) — mesmo
  // limiar do stale do Whoop; recalcula com o relógio de 60s existente.
  const registeredAtMs = scopedCheckInRecord?.registeredAtIso
    ? new Date(scopedCheckInRecord.registeredAtIso).getTime()
    : null;
  const checkInIsOld =
    registeredAtMs !== null &&
    Number.isFinite(registeredAtMs) &&
    whoopClockMs - registeredAtMs > 3 * 3_600_000;
  const registeredAtDisplay =
    registeredAtMs !== null && Number.isFinite(registeredAtMs)
      ? new Date(registeredAtMs).toLocaleTimeString("pt-BR", {
          hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo",
        })
      : null;

  // AUD-003: Sincronizar alternativa selecionada com contexto global
  useEffect(() => {
    if (selectedAlternative && activeRecommendation) {
      logger.log('Alternativa persistida:', selectedAlternative);
    }
  }, [selectedAlternative, activeRecommendation]);

  // HERO agnóstico de wearable: score mais recente entre Oura readiness e
  // Whoop recovery (empate → Oura; Whoop PENDING_SCORE pulado).
  const snapshot = earlySnapshot;

  // Dia Whoop mais novo que o exibido ainda processando (PENDING/UNSCORABLE):
  // o snapshot pula esses dias. Dois usos — sem NENHUM dia fechado, o estado
  // vazio ganha mensagem própria; com hero Whoop de um dia anterior, uma nota
  // explícita ("hoje pendente + ontem fechado" não dispara isStale).
  const unscoredWhoopDay = newerUnscoredWhoopDay(whoopMetrics, snapshot?.date ?? null);
  const whoopStillProcessing = !snapshot && unscoredWhoopDay !== null;
  const whoopPendingNote =
    snapshot?.source === "whoop" && unscoredWhoopDay !== null
      ? unscoredWhoopDay.state === "pending"
        ? `O recovery de ${formatRelativeDay(unscoredWhoopDay.date)} ainda está processando no Whoop — mostrando o último dia fechado.`
        : `O Whoop não conseguiu pontuar ${formatRelativeDay(unscoredWhoopDay.date)} (dado insuficiente no aparelho) — mostrando o último dia fechado.`
      : null;

  // Contrato de estados: loading ≠ erro ≠ sem wearable (regra transversal).
  // isLoading é o OR do primeiro load das consultas Oura E Whoop: decidir a
  // fonte com metade do dado no ar mostrava prescrição Oura de ontem por um
  // instante e trocava pra Whoop de hoje (auditoria 29/08). Refetches não
  // passam por aqui (isLoading ≠ isFetching).
  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-48 w-full rounded-lg" />
        <Skeleton className="h-24 w-full rounded-lg" />
      </div>
    );
  }
  if (isError && !snapshot) {
    return <DataErrorState what="os dados de recuperação" />;
  }
  if (!snapshot) {
    return (
      <Card className="p-6">
        <div className="text-center text-muted-foreground">
          <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>
            {whoopStillProcessing
              ? unscoredWhoopDay?.state === "pending"
                ? `O Whoop de ${studentName} sincronizou, mas o recovery do dia ainda está sendo processado pelo aparelho — a recomendação aparece quando o score fechar.`
                : `O Whoop de ${studentName} sincronizou, mas não conseguiu pontuar o recovery do dia (dado insuficiente no aparelho).`
              : `Ainda não há dados de recuperação para ${studentName}. Se o wearable já estiver conectado, aguarde a próxima sincronização; caso contrário, conecte Oura ou Whoop na aba correspondente.`}
          </p>
        </div>
      </Card>
    );
  }

  // Deltas vs baseline: SÓ HRV/FCR/sono, e só com baseline mínimo real
  // (defaults populacionais não são "baseline da aluna").
  const baselineDelta = (
    current: number | null | undefined,
    avg: number | null | undefined,
    opts: { decimals?: number; lowerIsBetter?: boolean } = {},
  ): MetricDelta | undefined => {
    if (!baseline?.hasMinimumData) return undefined;
    if (current === null || current === undefined || avg === null || avg === undefined) return undefined;
    const diff = current - avg;
    const rounded = Number(diff.toFixed(opts.decimals ?? 0));
    if (rounded === 0) return { text: "na média 30d", direction: "flat" };
    const direction = rounded > 0 ? "up" : "down";
    const positive = opts.lowerIsBetter ? rounded < 0 : rounded > 0;
    return { text: `${rounded > 0 ? "+" : ""}${rounded} vs 30d`, direction, positive };
  };

  // Conteúdo derivado de Oura (recomendação, carga, protocolos, alertas e
  // fisiologia Oura) SÓ renderiza quando o próprio hero é Oura — senão a
  // tela misturaria hero Whoop de hoje com análise de um Oura antigo.
  const ouraIsCurrent = snapshot.source === "oura";
  // Idade ÚNICA do snapshot no calendário do produto (spToday/SP): gate do
  // StaleBadge, badge D−1 e rótulos datados usam o MESMO relógio — misturar
  // com o isStale do runtime dava badge errado fora do fuso SP (revisão R8a).
  const snapshotAgeDays = daysBetweenDateOnly(spToday(), snapshot.date);
  const snapshotIsStale = snapshotAgeDays >= 2;
  // "hoje" só quando é hoje: com snapshot stale, os títulos carregam a data
  // real — "Fisiologia de hoje" com dado de 3 dias atrás mentia (auditoria
  // 29/08; a prescrição continuar visível é decisão ratificada, o rótulo é
  // que precisa ser honesto).
  const snapshotDayLabel = snapshotIsStale
    ? parseLocalDate(snapshot.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })
    : null;
  const hasOuraRecommendation = ouraIsCurrent && Boolean(ouraDayRow && recommendation);
  // R5: gate único da fonte ativa — Oura mantém o caminho histórico; Whoop
  // usa a recomendação montada pelo par {source, date} do snapshot.
  const hasActiveRecommendation = ouraIsCurrent
    ? hasOuraRecommendation
    : Boolean(activeRecommendation);
  // Com uma das consultas de wearable em ERRO, a decisão da fonte pode
  // estar errada (um dia mais novo pode existir na fonte que falhou) — o
  // hero fica informativo, mas prescrição/carga/CTA suspendem até
  // recarregar (revisão R7).
  const hasActionableRecommendation = hasActiveRecommendation && !isError;
  const sleepDuration = ouraDayRow ? formatDuration(ouraDayRow.total_sleep_duration) : null;
  // Agudas do MESMO dia do snapshot — regra que o adapter já aplica pra
  // recomendação; sem ela os tiles mostrariam agudas de 28/08 sob hero de
  // 27/08.
  const acuteDayRow =
    latestAcuteMetrics && latestAcuteMetrics.date === snapshot.date ? latestAcuteMetrics : null;
  const hasAcuteHrv = !!acuteDayRow && acuteDayRow.samples_count_hrv > 0;
  const hasAcuteHr = !!acuteDayRow && acuteDayRow.samples_count_hr_day > 0;

  // Fisiologia de hoje: só métricas PRESENTES entram na grade.
  const physiology: Array<{ key: string; metric?: AlertMetric; tile: JSX.Element }> = [];
  if (ouraIsCurrent && ouraDayRow?.sleep_score != null) {
    physiology.push({
      key: "sono",
      metric: "sono",
      tile: (
        <MetricTile
          label="Sono"
          value={ouraDayRow.sleep_score}
          delta={baselineDelta(ouraDayRow.sleep_score, baseline?.avgSleepScore)}
          footnote={sleepDuration ?? undefined}
        />
      ),
    });
  }
  if (ouraIsCurrent && ouraDayRow?.average_sleep_hrv != null) {
    physiology.push({
      key: "hrv",
      metric: "hrv_noturna",
      tile: (
        <MetricTile
          label="HRV noturna"
          value={Math.round(ouraDayRow.average_sleep_hrv)}
          unit="ms"
          delta={baselineDelta(ouraDayRow.average_sleep_hrv, baseline?.avgHRV)}
        />
      ),
    });
  }
  if (ouraIsCurrent && ouraDayRow?.resting_heart_rate != null) {
    physiology.push({
      key: "fcr",
      metric: "fc_repouso",
      tile: (
        <MetricTile
          label="FC repouso"
          value={ouraDayRow.resting_heart_rate}
          unit="bpm"
          delta={baselineDelta(ouraDayRow.resting_heart_rate, baseline?.avgRHR, { lowerIsBetter: true })}
          footnote="abaixo = melhor"
        />
      ),
    });
  }
  if (ouraIsCurrent && ouraDayRow?.temperature_deviation != null) {
    const t = ouraDayRow.temperature_deviation;
    physiology.push({
      key: "temp",
      tile: (
        <MetricTile
          label="Temperatura"
          value={`${t > 0 ? "+" : ""}${t.toFixed(1)}`}
          unit="°C"
          tone={Math.abs(t) >= 0.5 ? "warning" : "neutral"}
          footnote="desvio vs pessoal"
        />
      ),
    });
  }
  if (ouraIsCurrent && ouraDayRow?.activity_score != null) {
    physiology.push({
      key: "atividade",
      tile: (
        <MetricTile
          label="Atividade"
          value={ouraDayRow.activity_score}
          footnote={
            ouraDayRow.steps !== null
              ? `${ouraDayRow.steps.toLocaleString("pt-BR")} passos`
              : undefined
          }
        />
      ),
    });
  }
  if (ouraIsCurrent && hasAcuteHrv && acuteDayRow?.hrv_night_min != null) {
    physiology.push({
      key: "hrv-aguda",
      metric: "hrv_aguda",
      tile: (
        <MetricTile
          label="HRV mínima (noite)"
          value={Math.round(acuteDayRow.hrv_night_min)}
          unit="ms"
          footnote={
            // Os alertas de HRV aguda podem vir do ÚLTIMO BLOCO da noite,
            // não só da mínima — sem esta linha, o tile marcaria atenção
            // mostrando um número que não é o que disparou o sinal.
            acuteDayRow.hrv_night_last != null
              ? `último bloco: ${Math.round(acuteDayRow.hrv_night_last)} ms`
              : undefined
          }
        />
      ),
    });
  }
  if (ouraIsCurrent && hasAcuteHr && acuteDayRow?.hr_day_avg != null) {
    physiology.push({
      key: "fc-dia",
      metric: "fc_media_dia",
      tile: (
        <MetricTile
          label="FC média (dia)"
          value={Math.round(acuteDayRow.hr_day_avg)}
          unit="bpm"
        />
      ),
    });
  }
  if (ouraIsCurrent && hasAcuteHr && acuteDayRow?.hr_day_max != null) {
    physiology.push({
      key: "fc-pico",
      metric: "fc_pico",
      tile: (
        <MetricTile
          label="FC pico (dia)"
          value={Math.round(acuteDayRow.hr_day_max)}
          unit="bpm"
        />
      ),
    });
  }
  if (snapshot.source === "whoop") {
    const w = whoopMetrics.find((m) => m.date === snapshot.date);
    if (w?.day_strain != null) {
      physiology.push({
        key: "strain",
        metric: "strain",
        tile: <MetricTile label="Strain" value={w.day_strain.toFixed(1)} />,
      });
    }
    if (w?.hrv_rmssd != null) {
      physiology.push({
        key: "hrv-whoop",
        metric: "hrv_noturna",
        tile: <MetricTile label="HRV" value={Math.round(w.hrv_rmssd)} unit="ms" />,
      });
    }
    if (w?.resting_heart_rate != null) {
      physiology.push({
        key: "fcr-whoop",
        metric: "fc_repouso",
        tile: <MetricTile label="FC repouso" value={w.resting_heart_rate} unit="bpm" />,
      });
    }
    if (w?.sleep_performance != null) {
      physiology.push({
        key: "sono-whoop",
        metric: "sono",
        tile: (
          <MetricTile
            label="Sono (performance)"
            value={Math.round(w.sleep_performance)}
            footnote={
              // O alerta de sono fala de DURAÇÃO — o rodapé mostra o número
              // que dispara o sinal, junto do score do aparelho.
              w.total_sleep_duration != null
                ? formatDuration(w.total_sleep_duration) ?? undefined
                : undefined
            }
          />
        ),
      });
    }
  }

  // Partição dos alertas (R1): só depois de montar os tiles do dia dá pra
  // saber quais sinais têm tile pra morar e quais vão pro card consolidado.
  const renderedTileMetrics = new Set<AlertMetric>(
    physiology.flatMap((p) => (p.metric ? [p.metric] : [])),
  );
  const alertPartition = partitionAlerts(
    [
      ...(hasActionableRecommendation && activeRecommendation ? activeRecommendation.alerts : []),
      ...(hasActionableRecommendation && whoopCtx?.strainAlert ? [whoopCtx.strainAlert] : []),
    ],
    renderedTileMetrics,
  );

  // ── Máquina VISUAL do hero (E1/v7): a composição decide o que renderiza;
  // precedência testada em trainingHeroState (loading/erro-total/empty já
  // saíram nos early returns acima). ──
  const heroState = deriveTrainingHeroState({
    loading: false,
    totalError: false,
    hasSnapshot: true,
    hasRecommendation: hasActiveRecommendation,
    partialError: isError,
    checkIn: checkInState,
    effectiveZone: conduct?.effectiveZone ?? null,
    hasPriorityProtocols: Boolean(activeRecommendation?.priorityProtocols?.length),
    multiVigentePending: prescriptionSelectionPending,
    psrOnlyMode: false, // PR-C2
  });
  const baseZoneNumber = activeRecommendation
    ? ZONE_FROM_LABEL[activeRecommendation.zone]
    : null;
  const conductTone = conduct ? CONDUCT_TONE_BY_ZONE[conduct.effectiveZone] : "ok";
  // "Conduta cresce E coloriza só quando DESVIA do planejado" (regra dos
  // mocks): desvio = zona efetiva ≤2 OU modulação aplicada.
  const conductDeviates = conduct ? conduct.effectiveZone <= 2 || conduct.modulated : false;
  // Frase causal do DELTA REAL (U10/v8.1) — nunca mapa fixo de PSR.
  const perceptionChangedZone =
    !!conduct && baseZoneNumber !== null &&
    conduct.effectiveZone !== baseZoneNumber && conduct.appliedAlternative === null;
  const causalLine =
    perceptionChangedZone && assessment?.psr != null && baseZoneNumber !== null && conduct
      ? `PSR ${assessment.psr} ${conduct.effectiveZone < baseZoneNumber ? "rebaixou" : "elevou"}: ${VERDICT_BY_ZONE[baseZoneNumber]} → ${VERDICT_BY_ZONE[conduct.effectiveZone]}`
      : null;
  const modulationEyebrow = conduct?.appliedAlternative
    ? "Alternativa escolhida"
    : perceptionChangedZone
      ? "Ajuste por percepção"
      : null;
  // P8/E8: títulos datados NEUTROS pra qualquer snapshot ≠ hoje ("Fisiologia
  // · ontem"); o AVISO âmbar continua só ≥2 dias (decisão 1b intocada).
  const sectionDayLabel =
    snapshotAgeDays === 0
      ? null
      : snapshotAgeDays === 1
        ? "ontem"
        : parseLocalDate(snapshot.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });

  return (
    <div className="space-y-6">
      {/* HERO — um único score de recuperação. Fonte/data só aparecem quando
          o dado está velho (decisão ratificada 28/08); o tom da zona e o
          rótulo curto carregam a interpretação no fluxo normal. */}
      <Card className="border-l-2 border-l-primary p-6">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
          <ScoreRing
            value={snapshot.score}
            label={snapshot.source === "oura" ? "prontidão" : "recovery"}
            tone={SNAPSHOT_TONE[snapshot.zone]}
          />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="font-normal">
                {SNAPSHOT_ZONE_SHORT[snapshot.source][snapshot.zone]}
              </Badge>
              {/* Origem/data só quando o dado está velho (2+ dias) — aí ela
                  vira informação de decisão; no fluxo normal era ruído. */}
              {snapshotIsStale && (
                <StaleBadge
                  date={snapshot.date}
                  source={snapshot.source === "oura" ? "Oura" : "Whoop"}
                  ageDays={snapshotAgeDays}
                />
              )}
              {/* R8-1 (decisão 1b): D−1 ganha marca NEUTRA — informação sem
                  alarme; o tom de alerta continua reservado ao isStale (2+
                  dias, ratificado na R1). Dia ancorado no calendário do
                  produto (spToday = America/Sao_Paulo). */}
              {!snapshotIsStale && snapshotAgeDays === 1 && (
                <Badge variant="outline" className="font-normal text-muted-foreground">
                  {snapshot.source === "oura" ? "Oura" : "Whoop"} · ontem
                </Badge>
              )}
              {/* R8d visual: sync mora na MESMA linha dos badges — menos uma
                  fileira antes do título; unavailable ⇒ syncDisplay null, os
                  dois estados nunca coexistem. */}
              {snapshot.source === "whoop" && whoopCtx?.syncDisplay && (
                <span className="text-xs text-muted-foreground">
                  Dados sincronizados às {whoopCtx.syncDisplay}
                  {whoopCtx.freshness === "stale" && (
                    <span className="text-warning">
                      {" "}— desatualizado para decisão pré-sessão (&gt;{WHOOP_SYNC_STALE_HOURS}h)
                    </span>
                  )}
                  {whoopCtx.freshness === "stale" && isAdmin && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="ml-1 h-6 px-2 text-xs"
                      disabled={syncWhoop.isPending}
                      onClick={() => syncWhoop.mutate(studentId)}
                    >
                      {syncWhoop.isPending ? "Sincronizando…" : "Sincronizar agora"}
                    </Button>
                  )}
                </span>
              )}
            </div>
            {/* "Hoje pendente + ontem fechado" não dispara isStale (2 dias) —
                sem esta linha, a prescrição de ontem passaria por atual. */}
            {snapshotDayLabel && (
              <p className="text-xs text-warning">
                Conduta calculada para {snapshotDayLabel} — não é a leitura de hoje.
              </p>
            )}
            {snapshot.source === "whoop" && whoopCtx?.freshness === "unavailable" && (
              <p className="text-xs text-warning">
                Estado da sincronização do Whoop indisponível — freshness e strain não
                entram na decisão de hoje.
              </p>
            )}
            {whoopPendingNote && (
              <p className="text-xs text-muted-foreground">{whoopPendingNote}</p>
            )}
            {/* Fonte decidida com uma das consultas em erro: o hero pode não
                ser o dado mais novo — dizer isso é obrigação (auditoria 29/08). */}
            {isError && (
              <p className="text-xs text-warning">
                Parte dos dados de wearable não carregou — a fonte exibida pode não ser a mais
                recente. Recarregue a página para confirmar.
              </p>
            )}
            <span className="sr-only" role="status">
              {`Recomendação por ${snapshot.source === "oura" ? "Oura" : "Whoop"}, dia ${snapshot.date}${activeRecommendation ? `: ${activeRecommendation.trainingType}` : ""}`}
            </span>
            {hasActionableRecommendation ? (
              <>
                {/* ── FLUXO EM DOIS TEMPOS (v7, mocks aprovados 31/08):
                    chegada = check-in; a conduta é a RESPOSTA do check-in e
                    só aparece pós registro/skip. ── */}
                {heroState.composition === "arrival" && reconciling && (
                  <div className="mt-2 space-y-2">
                    <Skeleton className="h-10 w-full max-w-md rounded-md" />
                    <Skeleton className="h-11 w-32 rounded-md" />
                  </div>
                )}
                {heroState.composition === "arrival" && !reconciling && (
                  <CheckInForm
                    psr={assessment?.psr ?? psrDraft}
                    onSelectPsr={setPsr}
                    onRegister={() => void persistPerception()}
                    onSkip={skipCheckIn}
                    onAddObservation={() => setShowObservationDialog(true)}
                    saveState={perceptionSaveState}
                    staleDataNotice={psrDraft !== null}
                    reconciliationFailed={reconciliationFailed}
                    onRetryReconciliation={() => {
                      rehydratedRef.current = null;
                      setReconciliationFailed(false);
                      void rehydration.refetch();
                    }}
                  />
                )}

                {/* Conduta como FRASE (cresce e coloriza só no desvio);
                    região focável pós-registro (U15). */}
                {heroState.showConduct && conduct && (
                  <div ref={conductRegionRef} tabIndex={-1} className="outline-none" aria-label="Conduta do dia">
                    {modulationEyebrow && (
                      <p className="text-xs font-semibold text-muted-foreground">{modulationEyebrow}</p>
                    )}
                    <p className="mt-1 flex flex-wrap items-baseline gap-2">
                      <span
                        aria-hidden="true"
                        className={`h-2 w-2 shrink-0 self-center rounded-full ${
                          conductTone === "ok" ? "bg-success" : conductTone === "warn" ? "bg-warning" : "bg-destructive"
                        }`}
                      />
                      <span
                        className={
                          conductDeviates
                            ? `text-xl font-semibold tracking-tight ${
                                conductTone === "warn" ? "text-warning" : conductTone === "bad" ? "text-destructive" : ""
                              }`
                            : "text-[15px] font-semibold"
                        }
                      >
                        {VERDICT_BY_ZONE[conduct.effectiveZone]}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        · {formatDoseShort(conduct.prescription.intensity, conduct.prescription.duration)}
                      </span>
                    </p>
                    {causalLine && <p className="mt-1 text-xs text-muted-foreground">{causalLine}</p>}
                    {conduct.modulated && baseZoneNumber !== null && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Recomendação do aparelho: {VERDICT_BY_ZONE[baseZoneNumber]} ·{" "}
                        {formatDoseShort(activeRecommendation!.intensity, activeRecommendation!.duration)}
                      </p>
                    )}
                    {conduct.appliedVetoes.length > 0 && (
                      <ul className="mt-1 space-y-0.5">
                        {conduct.appliedVetoes.map((v, i) => (
                          <li key={i} className="text-xs text-muted-foreground">• {v}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}

                {/* Linha do check-in pós-reveal: colapsada (done) ou skip com
                    porta aberta ("Fazer check-in"); observação disponível o
                    dia todo (U5). */}
                {heroState.composition !== "arrival" && !heroState.showCheckInForm && (
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-muted-foreground">
                    {checkInState === "done" ? (
                      <>
                        <span>
                          Check-in: <span className="font-medium text-foreground">PSR {assessment?.psr ?? "—"}</span>
                          {checkInIsOld && registeredAtDisplay ? ` · registrado ${registeredAtDisplay}` : ""}
                        </span>
                        <button type="button" className="min-h-[44px] text-primary" onClick={reopenCheckIn}>
                          {checkInIsOld ? "Refazer" : "Editar check-in"}
                        </button>
                      </>
                    ) : (
                      <>
                        <span>Check-in: não realizado</span>
                        <button type="button" className="min-h-[44px] text-primary" onClick={reopenCheckIn}>
                          Fazer check-in
                        </button>
                      </>
                    )}
                    <span aria-hidden="true" className="opacity-50">·</span>
                    <button
                      type="button"
                      className="min-h-[44px] text-primary"
                      onClick={() => setShowObservationDialog(true)}
                    >
                      + Observação
                    </button>
                  </div>
                )}

                {/* CTA por composição (máquina E1) */}
                {heroState.primaryAction === "register_rest" && (
                  <div className="flex flex-wrap items-center gap-3 pt-3">
                    <Button
                      disabled={perceptionSaveState === "saving"}
                      onClick={() => void persistPerception("Dia de descanso registrado")}
                    >
                      Registrar dia de descanso
                    </Button>
                    <Button variant="ghost" onClick={() => setShowAlternatives(true)}>
                      Ver alternativas
                    </Button>
                  </div>
                )}
                {(heroState.primaryAction === "start" || heroState.primaryAction === "start_disabled") && (
                  <div className="flex flex-col gap-2 pt-3">
                    {/* Multi-vigente: seletor mora AQUI, antes do CTA — lugar
                        ÚNICO (v5.1-2); o card de carga mostra só a faixa. */}
                    {prescriptionSelectionPending && loadResult?.mode === "selection_required" && (
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs text-warning">Escolha a prescrição do dia:</span>
                        {loadResult.availablePrescriptions.map((p) => (
                          <Button
                            key={p.id}
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedLoadPrescriptionId(p.id)}
                          >
                            {p.name}
                          </Button>
                        ))}
                      </div>
                    )}
                    {!sessionScopeResolved && !prescriptionSelectionPending && (
                      <p className="text-xs text-muted-foreground">
                        {loadSuggestionsError || loadResult?.mode === "suspended"
                          ? "Prescrições indisponíveis — recarregue antes de iniciar."
                          : "Carregando prescrições…"}
                      </p>
                    )}
                    <div className="flex items-center gap-3">
                      <Button
                        disabled={heroState.primaryAction === "start_disabled" || !sessionScopeResolved}
                        onClick={() => onStartTraining?.(activePrescriptionId)}
                      >
                        Iniciar treino
                      </Button>
                      <Button variant="ghost" onClick={() => setShowAlternatives(true)}>
                        Ver alternativas
                      </Button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                {isLoading
                  ? "Carregando recomendação do dia…"
                  : isError
                    ? "Recomendação suspensa: parte dos dados de wearable não carregou e a fonte do dia pode estar errada. Recarregue a página."
                    : snapshot.source === "oura" && latestOuraError
                    ? "Não foi possível carregar o score do dia — a recomendação fica indisponível. Recarregue a página para tentar de novo."
                    : snapshot.source === "oura"
                      ? "Sem score de prontidão fechado para o dia mais recente — a recomendação automática fica indisponível até a próxima sincronização. Use o histórico da aba Oura para calibrar o treino."
                      : "Sem recovery utilizável para o dia mais recente — use o histórico da aba Whoop para calibrar o treino do dia."}
              </p>
            )}
          </div>
        </div>

      </Card>

      {/* Sugestão de carga — só APÓS o check-in/skip (fluxo em dois tempos:
          a carga depende da conduta; antes dela, vazaria a decisão). */}
      {heroState.showLoads && hasActionableRecommendation && loadResult?.mode === "selection_required" && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-2">Sugestões de carga</h3>
          <p className="text-sm text-muted-foreground">
            Aguardando a escolha da prescrição do dia (no topo, junto do botão de treino).
          </p>
        </Card>
      )}
      {heroState.showLoads && hasActionableRecommendation && loadResult?.mode === "suspended" && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-2">Sugestões de carga</h3>
          <p className="text-sm text-muted-foreground">
            Suspensa: {loadResult.fallbackReason ?? "erro ao consultar prescrições"} — recarregue a
            página. (Erro não vira “sem prescrição”.)
          </p>
        </Card>
      )}
      {heroState.showLoads && hasActionableRecommendation && loadSuggestions && loadSuggestions.length > 0 && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Sugestões de carga</h3>
            <Badge variant="outline">
              Zona {ZONE_LABEL[conductRecommendation!.zone] ?? conductRecommendation!.zone}
            </Badge>
          </div>
          {loadResult?.mode === "prescription" && (
            <p className="text-sm text-muted-foreground mb-3">
              Plano vigente: <strong>{loadResult.prescriptionName ?? "prescrição"}</strong> — exercícios
              na ordem do plano.
              {loadResult.fallbackReason ? ` ${loadResult.fallbackReason.replace(/\.$/, "")}.` : ""}
            </p>
          )}
          {loadSuggestionsError && (
            <p className="text-sm text-warning mb-3">
              Falha ao atualizar — estas sugestões podem estar desatualizadas. Recarregue antes
              de usar.
            </p>
          )}
          {loadResult?.mode === "fallback_recent" && (
            <p className="text-sm text-warning mb-3">
              {loadResult.fallbackReason} (top por peso, 90 dias).
            </p>
          )}
          <p className="text-xs text-muted-foreground mb-4">
            Referência por histórico real do aluno. A sugestão deve ser validada pelo coach antes da execução.
          </p>
          {/* Passe visual: lista única com divisores no lugar de caixa por
              exercício (caixa-em-caixa deixava o card pesado). */}
          <div className="divide-y rounded-lg border">
            {loadSuggestions.map((item) => (
              <div key={item.key} className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h4 className="font-semibold">{item.exerciseName}</h4>
                    <p className="text-sm text-muted-foreground">
                      {formatLoad(item.lastLoadKg)}
                      <span className="mx-2 text-muted-foreground/60">→</span>
                      <span className="font-semibold text-foreground">
                        {formatLoad(item.suggestedLoadKg)}
                      </span>
                      {item.adjustmentPercent !== null && (
                        <span className="ml-2 text-xs font-semibold text-primary">
                          {formatAdjustmentPercent(item.adjustmentPercent)}
                        </span>
                      )}
                    </p>
                  </div>
                  <Badge
                    variant={
                      item.status === "insufficient" || item.status === "blocked" || item.status === "suspended"
                        ? "destructive"
                        : "secondary"
                    }
                  >
                    {getSuggestionStatusLabel(item.status)}
                  </Badge>
                </div>
                <details className="mt-2">
                  <summary className="cursor-pointer text-xs font-medium text-primary">
                    Ver detalhes da regra
                  </summary>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-sm md:grid-cols-4">
                    <div>
                      <p className="text-muted-foreground">Regra aplicada</p>
                      <p className="font-semibold">{item.ruleApplied}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Referência</p>
                      <p className="font-semibold">
                        {formatLoad(item.referenceLoadKg)} @ {item.referenceReps ?? "--"} reps
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Incremento</p>
                      <p className="font-semibold">
                        {item.incrementKg} kg{" "}
                        <span className="font-normal text-muted-foreground">
                          ({item.incrementSource === "cadastrado" ? "cadastrado na biblioteca" : "inferido do equipamento"})
                        </span>
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Fonte</p>
                      <p className="font-semibold">{SOURCE_LABEL[item.source] ?? item.source}</p>
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {item.guardrails.includes("pain_recent") && (
                      <Badge variant="destructive">Guardrail: dor recente</Badge>
                    )}
                    {item.guardrails.includes("technique_inconsistent") && (
                      <Badge variant="outline">Guardrail: técnica inconsistente</Badge>
                    )}
                  </div>
                  {/* Notas textuais (ex.: adaptação individual) — códigos
                      conhecidos viram badge acima; o resto é frase visível. */}
                  {item.guardrails
                    .filter((g) => g !== "pain_recent" && g !== "technique_inconsistent")
                    .map((g, i) => (
                      <p key={i} className="mt-1 text-xs text-muted-foreground">{g}</p>
                    ))}
                </details>
              </div>
            ))}
          </div>
        </Card>
      )}
      {heroState.showLoads && hasActionableRecommendation && loadSuggestionsLoading && !loadResult && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-2">Sugestões de carga</h3>
          <Skeleton className="h-16 w-full rounded-lg" />
        </Card>
      )}
      {heroState.showLoads && hasActionableRecommendation && loadSuggestionsError && !loadResult && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-2">Sugestões de carga</h3>
          <p className="text-sm text-muted-foreground">
            Não foi possível calcular as sugestões de carga — recarregue a página para tentar de
            novo. (Sem sugestão não significa sem exercício elegível.)
          </p>
        </Card>
      )}
      {heroState.showLoads && hasActionableRecommendation && sessionScopeResolved && loadSuggestions && loadSuggestions.length === 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-2">Sugestões de carga</h3>
          <p className="text-sm text-muted-foreground">
            {loadResult?.fallbackReason
              ? `Sem sugestões: ${loadResult.fallbackReason}.`
              : "Dados insuficientes de histórico para sugerir carga numérica neste momento."}
          </p>
        </Card>
      )}

      {/* Protocolos prioritários (readiness crítico) */}
      {heroState.composition === "recovery_block" && hasActionableRecommendation && activeRecommendation?.priorityProtocols && activeRecommendation.priorityProtocols.length > 0 && (
        <Card className="p-6 border-2 border-destructive/50 bg-destructive/5">
          <div className="flex items-center space-x-2 mb-4">
            <AlertCircle className="w-6 h-6 text-destructive" />
            <h3 className="text-xl font-bold text-destructive">
              Protocolos Prioritários de Recuperação
            </h3>
          </div>
          {/* Absorção (E1/v5.1): os sinais que iriam pro card "Atenção" moram
              AQUI no dia de recuperação — uma superfície só, críticos
              primeiro. */}
          {alertPartition.attention.length > 0 && (
            <ul className="mb-4 space-y-1.5 text-sm">
              {[...alertPartition.attention]
                .sort((a, b) => (a.level === "CRITICAL" ? -1 : 0) - (b.level === "CRITICAL" ? -1 : 0))
                .map((alert, idx) => (
                  <li key={idx} className="flex gap-2 text-muted-foreground">
                    <span
                      aria-hidden="true"
                      className={
                        alert.level === "CRITICAL"
                          ? "mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-destructive"
                          : "mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-warning"
                      }
                    />
                    <span>{stripAlertEmoji(alert.message)}</span>
                  </li>
                ))}
            </ul>
          )}
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>
              <strong>Dia de recuperação:</strong> treino não é recomendado{" "}
              {snapshotDayLabel ? `no dia avaliado (${snapshotDayLabel})` : "hoje"}. Os
              protocolos abaixo são as condutas sugeridas pra esse dia.
            </AlertDescription>
          </Alert>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeRecommendation!.priorityProtocols!.map((protocol) => (
              <div
                key={protocol.order}
                className="p-5 rounded-lg border-2 border-muted bg-background hover:border-primary/50 transition-colors"
              >
                <div className="flex items-center space-x-2 mb-3">
                  <Badge variant="outline" className="text-lg font-bold">
                    {protocol.order}
                  </Badge>
                  <h4 className="text-lg font-bold">{protocol.name}</h4>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Duração:</span>
                    <span className="font-semibold">{protocol.duration}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Melhor horário:</span>
                    <span className="font-semibold">{protocol.timing}</span>
                  </div>
                  <div className="mt-3 pt-3 border-t">
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {protocol.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 p-4 bg-muted/30 rounded-lg">
            <p className="text-sm text-muted-foreground">
              Seguir a ordem sugerida. Se o quadro persistir por 3 ou mais dias,
              encaminhar a profissional de saúde.
            </p>
          </div>
        </Card>
      )}

      {/* Atenção hoje (R1): UM card consolidado no lugar da pilha de alertas.
          Regra ratificada: aparece com qualquer CRITICAL, com 2+ sinais, ou
          com sinal sem tile pra morar; 1 sinal leve vive só no tile. */}
      {alertPartition.showAttentionCard && heroState.composition !== "recovery_block" && (
        <Card
          role="region"
          aria-labelledby="attention-today-title"
          className={
            alertPartition.attention.some((a) => a.level === "CRITICAL")
              ? "border-destructive/50 p-4"
              : "border-warning/50 p-4"
          }
        >
          <h3
            id="attention-today-title"
            className="mb-2 flex items-center gap-2 text-base font-semibold"
          >
            <AlertCircle
              aria-hidden="true"
              className={
                alertPartition.attention.some((a) => a.level === "CRITICAL")
                  ? "h-4 w-4 text-destructive"
                  : "h-4 w-4 text-warning"
              }
            />
            {sectionDayLabel ? `Atenção · ${sectionDayLabel}` : "Atenção hoje"}
          </h3>
          <ul className="space-y-1.5 text-sm text-muted-foreground">
            {alertPartition.attention.map((alert, idx) => (
              <li key={idx} className="flex gap-2">
                <span
                  aria-hidden="true"
                  className={
                    alert.level === "CRITICAL"
                      ? "mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-destructive"
                      : alert.level === "WARNING"
                        ? "mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-warning"
                        : "mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground"
                  }
                />
                <span>{stripAlertEmoji(alert.message)}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Notas de onboarding (histórico/baseline em construção): informação,
          não atenção — uma linha discreta, nunca card. */}
      {alertPartition.onboardingNotes.length > 0 && (
        <div className="space-y-1">
          {alertPartition.onboardingNotes.map((note, idx) => (
            <p key={idx} className="text-xs text-muted-foreground">
              {note}
            </p>
          ))}
        </div>
      )}

      {/* Fisiologia de hoje — só métricas presentes; deltas vs baseline 30d */}
      {physiology.length > 0 && (
        <div>
          <h3 className="mb-3 flex items-center gap-2 text-base font-semibold">
            <Activity className="h-4 w-4 text-primary" />
            {sectionDayLabel ? `Fisiologia · ${sectionDayLabel}` : "Fisiologia de hoje"}
          </h3>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
            {physiology.map((p) => {
              const tileAlert = p.metric ? alertPartition.byTile.get(p.metric) : undefined;
              return (
                <Fragment key={p.key}>
                  {tileAlert ? cloneElement(p.tile, { alert: tileAlert }) : p.tile}
                </Fragment>
              );
            })}
          </div>
        </div>
      )}

      {/* Zonas de FC — referência estática, colapsada */}
      {maxHeartRate ? (
        <Accordion type="single" collapsible>
          <AccordionItem value="zonas" className="rounded-lg border px-4">
            <AccordionTrigger className="text-sm font-semibold">
              <span className="flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" />
                Zonas de frequência cardíaca (FCmáx {maxHeartRate} bpm)
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <TrainingZonesCard maxHeartRate={maxHeartRate} />
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      ) : null}

      {/* Live region curta (U15): a conduta é lida pela REGIÃO focada. */}
      <span aria-live="polite" className="sr-only">{liveAnnouncement}</span>

      <AddObservationDialog
        open={showObservationDialog}
        onOpenChange={setShowObservationDialog}
        studentId={studentId}
        studentName={studentName}
      />

      {/* Dialog de alternativas */}
      <AlertDialog open={showAlternatives} onOpenChange={setShowAlternatives}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Alternativas de Treino</AlertDialogTitle>
            <AlertDialogDescription>
              Com base no {snapshot.source === "oura" ? "readiness" : "recovery"} de{" "}
              <strong>{activeRecommendation?.recoveryScore ?? snapshot.score}</strong>,
              estas são as opções:
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-3 my-4">
            {getTrainingAlternativesForZone(
              // Zona FINAL do motor (já com fadiga/override); score cru só
              // no fallback raro sem recomendação da fonte ativa.
              hasActionableRecommendation && activeRecommendation ? activeRecommendation.zone : null,
              snapshot.score,
            ).map((alt, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setSelectedAlternative({ ...alt, studentId, date: snapshot.date, fingerprint: conductFingerprint ?? undefined });
                  setShowAlternatives(false);
                }}
                className="w-full p-4 border rounded-lg hover:bg-muted/50 transition-colors text-left focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                aria-label={`Selecionar alternativa: ${alt.type}`}
              >
                <h4 className="font-semibold text-base">{alt.type}</h4>
                <p className="text-sm text-muted-foreground mt-1">{alt.description}</p>
              </button>
            ))}
          </div>
          <AlertDialogFooter>
            <AlertDialogAction>Entendi</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default PersonalizedTrainingDashboard;
