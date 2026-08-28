import { Fragment, cloneElement, useState, useEffect } from "react";
import { Card } from "./ui/card";
import { logger } from "@/utils/logger";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Skeleton } from "./ui/skeleton";
import { AlertCircle, Activity, Target } from "lucide-react";
import { OuraMetrics } from "@/hooks/useOuraMetrics";
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
  partitionAlerts,
  stripAlertEmoji,
  type AlertMetric,
} from "@/utils/attentionAlerts";
import {
  SNAPSHOT_ZONE_SHORT,
  formatPrescriptionLine,
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
  onStartTraining?: () => void;
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
  onStartTraining,
}: PersonalizedTrainingDashboardProps) => {
  // 30 dias: é o que a UI promete nos deltas ("vs 30d") — o default do hook
  // era 14 e ninguém percebia a divergência.
  const { baseline } = useOuraBaseline(studentId, 30);
  const { data: latestAcuteMetrics } = useLatestOuraAcuteMetrics(studentId);
  const recommendation = useTrainingRecommendation(latestMetrics, recentMetrics, baseline, undefined, latestAcuteMetrics);
  const { data: loadSuggestions } = useLoadSuggestions(studentId, recommendation);
  const [showAlternatives, setShowAlternatives] = useState(false);
  const { selectedAlternative, setSelectedAlternative } = useTrainingContext();

  // AUD-003: Sincronizar alternativa selecionada com contexto global
  useEffect(() => {
    if (selectedAlternative && recommendation) {
      logger.log('Alternativa persistida:', selectedAlternative);
    }
  }, [selectedAlternative, recommendation]);

  // HERO agnóstico de wearable: score mais recente entre Oura readiness e
  // Whoop recovery (empate → Oura; Whoop PENDING_SCORE pulado).
  const snapshot = buildRecoverySnapshot(recentMetrics, whoopMetrics);

  // Contrato de estados: loading ≠ erro ≠ sem wearable (regra transversal).
  if (isLoading && !snapshot) {
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
          <p>Ainda não há dados de recuperação para {studentName}. Se o wearable já estiver conectado, aguarde a próxima sincronização; caso contrário, conecte Oura ou Whoop na aba correspondente.</p>
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
  const hasOuraRecommendation = ouraIsCurrent && Boolean(latestMetrics && recommendation);
  const sleepDuration = latestMetrics ? formatDuration(latestMetrics.total_sleep_duration) : null;
  const hasAcuteHrv = !!latestAcuteMetrics && latestAcuteMetrics.samples_count_hrv > 0;
  const hasAcuteHr = !!latestAcuteMetrics && latestAcuteMetrics.samples_count_hr_day > 0;

  // Fisiologia de hoje: só métricas PRESENTES entram na grade.
  const physiology: Array<{ key: string; metric?: AlertMetric; tile: JSX.Element }> = [];
  if (ouraIsCurrent && latestMetrics?.sleep_score != null) {
    physiology.push({
      key: "sono",
      metric: "sono",
      tile: (
        <MetricTile
          label="Sono"
          value={latestMetrics.sleep_score}
          delta={baselineDelta(latestMetrics.sleep_score, baseline?.avgSleepScore)}
          footnote={sleepDuration ?? undefined}
        />
      ),
    });
  }
  if (ouraIsCurrent && latestMetrics?.average_sleep_hrv != null) {
    physiology.push({
      key: "hrv",
      metric: "hrv_noturna",
      tile: (
        <MetricTile
          label="HRV noturna"
          value={Math.round(latestMetrics.average_sleep_hrv)}
          unit="ms"
          delta={baselineDelta(latestMetrics.average_sleep_hrv, baseline?.avgHRV)}
        />
      ),
    });
  }
  if (ouraIsCurrent && latestMetrics?.resting_heart_rate != null) {
    physiology.push({
      key: "fcr",
      metric: "fc_repouso",
      tile: (
        <MetricTile
          label="FC repouso"
          value={latestMetrics.resting_heart_rate}
          unit="bpm"
          delta={baselineDelta(latestMetrics.resting_heart_rate, baseline?.avgRHR, { lowerIsBetter: true })}
          footnote="abaixo = melhor"
        />
      ),
    });
  }
  if (ouraIsCurrent && latestMetrics?.temperature_deviation != null) {
    const t = latestMetrics.temperature_deviation;
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
  if (ouraIsCurrent && latestMetrics?.activity_score != null) {
    physiology.push({
      key: "atividade",
      tile: (
        <MetricTile
          label="Atividade"
          value={latestMetrics.activity_score}
          footnote={
            latestMetrics.steps !== null
              ? `${latestMetrics.steps.toLocaleString("pt-BR")} passos`
              : undefined
          }
        />
      ),
    });
  }
  if (ouraIsCurrent && hasAcuteHrv && latestAcuteMetrics?.hrv_night_min != null) {
    physiology.push({
      key: "hrv-aguda",
      metric: "hrv_aguda",
      tile: (
        <MetricTile
          label="HRV mínima (noite)"
          value={Math.round(latestAcuteMetrics.hrv_night_min)}
          unit="ms"
          footnote={
            // Os alertas de HRV aguda podem vir do ÚLTIMO BLOCO da noite,
            // não só da mínima — sem esta linha, o tile marcaria atenção
            // mostrando um número que não é o que disparou o sinal.
            latestAcuteMetrics.hrv_night_last != null
              ? `último bloco: ${Math.round(latestAcuteMetrics.hrv_night_last)} ms`
              : undefined
          }
        />
      ),
    });
  }
  if (ouraIsCurrent && hasAcuteHr && latestAcuteMetrics?.hr_day_avg != null) {
    physiology.push({
      key: "fc-dia",
      metric: "fc_media_dia",
      tile: (
        <MetricTile
          label="FC média (dia)"
          value={Math.round(latestAcuteMetrics.hr_day_avg)}
          unit="bpm"
        />
      ),
    });
  }
  if (ouraIsCurrent && hasAcuteHr && latestAcuteMetrics?.hr_day_max != null) {
    physiology.push({
      key: "fc-pico",
      metric: "fc_pico",
      tile: (
        <MetricTile
          label="FC pico (dia)"
          value={Math.round(latestAcuteMetrics.hr_day_max)}
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
        tile: <MetricTile label="Strain" value={w.day_strain.toFixed(1)} />,
      });
    }
    if (w?.hrv_rmssd != null) {
      physiology.push({
        key: "hrv-whoop",
        tile: <MetricTile label="HRV" value={Math.round(w.hrv_rmssd)} unit="ms" />,
      });
    }
    if (w?.resting_heart_rate != null) {
      physiology.push({
        key: "fcr-whoop",
        tile: <MetricTile label="FC repouso" value={w.resting_heart_rate} unit="bpm" />,
      });
    }
  }

  // Partição dos alertas (R1): só depois de montar os tiles do dia dá pra
  // saber quais sinais têm tile pra morar e quais vão pro card consolidado.
  const renderedTileMetrics = new Set<AlertMetric>(
    physiology.flatMap((p) => (p.metric ? [p.metric] : [])),
  );
  const alertPartition = partitionAlerts(
    hasOuraRecommendation && recommendation ? recommendation.alerts : [],
    renderedTileMetrics,
  );

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
              {snapshot.isStale && (
                <StaleBadge
                  date={snapshot.date}
                  source={snapshot.source === "oura" ? "Oura" : "Whoop"}
                />
              )}
            </div>
            {hasOuraRecommendation ? (
              <>
                <h3 className="text-2xl font-bold text-foreground">
                  {recommendation!.trainingType}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {formatPrescriptionLine(recommendation!.intensity, recommendation!.duration)}
                </p>
                <div className="flex gap-3 pt-2">
                  <Button onClick={() => onStartTraining?.()}>Iniciar Treino</Button>
                  <Button variant="outline" onClick={() => setShowAlternatives(true)}>
                    Ver Alternativas
                  </Button>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                {isLoading
                  ? "Carregando recomendação do dia…"
                  : snapshot.source === "oura"
                    ? "Sem score de prontidão fechado para o dia mais recente — a recomendação automática fica indisponível até a próxima sincronização. Use o histórico da aba Oura para calibrar o treino."
                    : "A recomendação automática de treino usa dados do Oura — este aluno está com Whoop. Use o score acima e o histórico da aba Whoop para calibrar o treino do dia."}
              </p>
            )}
          </div>
        </div>

      </Card>

      {/* Sugestão de carga — o dado mais acionável do coach, logo após o hero */}
      {hasOuraRecommendation && loadSuggestions && loadSuggestions.length > 0 && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold">Sugestão Assistida de Carga</h3>
            <Badge variant="outline">
              Zona {ZONE_LABEL[recommendation.zone] ?? recommendation.zone}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Referência por histórico real do aluno. A sugestão deve ser validada pelo coach antes da execução.
          </p>
          <div className="space-y-3">
            {loadSuggestions.map((item) => (
              <div key={item.exerciseName} className="rounded-lg border p-4 bg-muted/20">
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
                  <Badge variant={item.status === "insufficient" ? "destructive" : "secondary"}>
                    {getSuggestionStatusLabel(item.status)}
                  </Badge>
                </div>
                <details className="mt-3 rounded-md border bg-background/50 px-3 py-2">
                  <summary className="cursor-pointer text-sm font-medium text-primary">
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
                      <p className="font-semibold">{item.incrementKg} kg</p>
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
                </details>
              </div>
            ))}
          </div>
        </Card>
      )}
      {hasOuraRecommendation && loadSuggestions && loadSuggestions.length === 0 && (
        <Card className="p-6">
          <h3 className="text-xl font-bold mb-2">Sugestão Assistida de Carga</h3>
          <p className="text-sm text-muted-foreground">
            Dados insuficientes de histórico para sugerir carga numérica neste momento.
          </p>
        </Card>
      )}

      {/* Protocolos prioritários (readiness crítico) */}
      {hasOuraRecommendation && recommendation?.priorityProtocols && recommendation.priorityProtocols.length > 0 && (
        <Card className="p-6 border-2 border-destructive/50 bg-destructive/5">
          <div className="flex items-center space-x-2 mb-4">
            <AlertCircle className="w-6 h-6 text-destructive" />
            <h3 className="text-xl font-bold text-destructive">
              Protocolos Prioritários de Recuperação
            </h3>
          </div>
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>
              <strong>Situação crítica:</strong> recuperação urgente necessária.
              Os protocolos abaixo são validados cientificamente, com efeitos mensuráveis em 24-72h.
            </AlertDescription>
          </Alert>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recommendation.priorityProtocols.map((protocol) => (
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
              Protocolos selecionados com base em meta-análises peer-reviewed; seguir a
              ordem recomendada. Se o readiness crítico persistir por 3+ dias, encaminhar
              a profissional de saúde.
            </p>
          </div>
        </Card>
      )}

      {/* Atenção hoje (R1): UM card consolidado no lugar da pilha de alertas.
          Regra ratificada: aparece com qualquer CRITICAL, com 2+ sinais, ou
          com sinal sem tile pra morar; 1 sinal leve vive só no tile. */}
      {alertPartition.showAttentionCard && (
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
            Atenção hoje
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
            Fisiologia de hoje
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

      {/* Dialog de alternativas */}
      <AlertDialog open={showAlternatives} onOpenChange={setShowAlternatives}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Alternativas de Treino</AlertDialogTitle>
            <AlertDialogDescription>
              Com base no readiness de <strong>{recommendation?.recoveryScore ?? snapshot.score}</strong>,
              estas são as opções:
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-3 my-4">
            {getTrainingAlternativesForZone(
              // Zona FINAL do motor (já com fadiga/override); score cru só
              // no fallback sem recomendação (ex.: fonte Whoop nesta fase).
              hasOuraRecommendation && recommendation ? recommendation.zone : null,
              snapshot.score,
            ).map((alt, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setSelectedAlternative(alt);
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
