import { ReactNode, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Activity, Info } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useOuraMetrics, spWindowDates, OuraMetrics } from "@/hooks/useOuraMetrics";
import { OuraConnectionCard } from "@/components/OuraConnectionCard";
import { OuraConnectionStatus } from "@/components/OuraConnectionStatus";
import { OuraApiDiagnosticsCard } from "@/components/OuraApiDiagnosticsCard";
import { OuraWorkoutsCard } from "@/components/OuraWorkoutsCard";
import ProtocolRecommendationsCard from "@/components/ProtocolRecommendationsCard";
import ManualProtocolRecommendationDialog from "@/components/ManualProtocolRecommendationDialog";
import { ScoreRing, MetricTile, TrendChart, StaleBadge, DataErrorState } from "@/components/metrics";
import type { TrendPoint } from "@/components/metrics";
import { LazyChart } from "@/components/LazyChart";

type Period = 7 | 30 | 90;

interface OuraTabContentProps {
  studentId: string;
  studentName?: string;
  isAdmin: boolean;
  hasConnection: boolean;
}

const scoreTone = (score: number | null) => {
  if (score === null) return "neutral" as const;
  if (score >= 70) return "success" as const;
  if (score >= 50) return "warning" as const;
  return "destructive" as const;
};

const fmtDuration = (seconds: number | null) => {
  if (seconds === null) return "—";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h${String(m).padStart(2, "0")}`;
};

const fmtMin = (seconds: number | null) => {
  if (seconds === null) return "—";
  return `${Math.round(seconds / 60)} min`;
};

const shortDay = (date: string) => {
  const [, m, d] = date.split("-");
  return `${d}/${m}`;
};

const DAY_SUMMARY_LABEL: Record<string, string> = {
  restored: "Recuperado",
  good: "Bom",
  normal: "Normal",
  stressful: "Estressante",
};

const summaryLabel = (raw: string | null) => {
  if (!raw) return "—";
  return DAY_SUMMARY_LABEL[raw.toLowerCase()] ?? raw;
};

/** Série DENSIFICADA: uma categoria por dia da janela (dia sem linha no
 * banco vira valor null) — sem isso, um buraco de 10 dias ocuparia o mesmo
 * espaço visual de 1 dia no eixo categórico. */
const toTrend = (
  windowDates: string[],
  byDate: Map<string, OuraMetrics>,
  pick: (m: OuraMetrics) => number | null,
): TrendPoint[] =>
  windowDates.map((date) => {
    const m = byDate.get(date);
    return { date, value: m ? pick(m) : null };
  });

/** Último dia que tem o campo pedido preenchido. */
const latestWith = (rows: OuraMetrics[], pick: (m: OuraMetrics) => number | null): OuraMetrics | null =>
  rows.find((m) => pick(m) !== null) ?? null;

interface DayColumn {
  label: string;
  render: (m: OuraMetrics) => ReactNode;
}

const DayTable = ({ rows, columns }: { rows: OuraMetrics[]; columns: DayColumn[] }) => (
  <Card>
    <CardContent className="p-0">
      <div className="max-h-80 overflow-y-auto overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-card">
            <tr className="border-b text-left text-[10.5px] uppercase tracking-widest text-muted-foreground">
              <th className="px-4 py-2 font-medium">Dia</th>
              {columns.map((c) => (
                <th key={c.label} className="px-4 py-2 font-medium">
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((m) => (
              <tr key={m.id} className="border-b last:border-b-0">
                <td className="whitespace-nowrap px-4 py-2 text-muted-foreground">{shortDay(m.date)}</td>
                {columns.map((c) => (
                  <td key={c.label} className="whitespace-nowrap px-4 py-2">
                    {c.render(m)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </CardContent>
  </Card>
);

const chartAxisProps = {
  stroke: "hsl(var(--muted-foreground))",
  fontSize: 10,
  tickLine: false,
  axisLine: false,
} as const;

const chartTooltipStyle = {
  backgroundColor: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 8,
  fontSize: 12,
  color: "hsl(var(--foreground))",
} as const;

/**
 * Aba Oura da ficha (PR-5a do redesign): cada sub-aba vira hero do último
 * dia com dado + TENDÊNCIA no período (7/30/90 dias de calendário) + tabela
 * compacta — substitui as pilhas de 7 cards idênticos por dia. Conexão e
 * diagnóstico descem pro rodapé; protocolos de recuperação moram aqui.
 */
export const OuraTabContent = ({
  studentId,
  studentName,
  isAdmin,
  hasConnection,
}: OuraTabContentProps) => {
  const [period, setPeriod] = useState<Period>(30);
  const { data: metrics, isLoading, isError, refetch } = useOuraMetrics(studentId, {
    days: period,
  });

  const rows = useMemo(() => metrics ?? [], [metrics]);
  const windowDates = useMemo(() => spWindowDates(period), [period]);
  const byDate = useMemo(() => {
    const map = new Map<string, OuraMetrics>();
    for (const m of rows) map.set(m.date, m);
    return map;
  }, [rows]);
  const latestScored = latestWith(rows, (m) => m.readiness_score);

  const sleepPhases = useMemo(
    () =>
      windowDates.map((date) => {
        const m = byDate.get(date);
        return {
          date: shortDay(date),
          Profundo: Number((((m?.deep_sleep_duration ?? 0)) / 3600).toFixed(2)),
          Leve: Number((((m?.light_sleep_duration ?? 0)) / 3600).toFixed(2)),
          REM: Number((((m?.rem_sleep_duration ?? 0)) / 3600).toFixed(2)),
        };
      }),
    [windowDates, byDate],
  );
  const hasSleepPhases = rows.some(
    (m) =>
      m.deep_sleep_duration !== null ||
      m.light_sleep_duration !== null ||
      m.rem_sleep_duration !== null,
  );

  const stressBalance = useMemo(
    () =>
      windowDates.map((date) => {
        const m = byDate.get(date);
        return {
          date: shortDay(date),
          "Estresse alto": Math.round((m?.stress_high_time ?? 0) / 60),
          "Recuperação alta": Math.round((m?.recovery_high_time ?? 0) / 60),
        };
      }),
    [windowDates, byDate],
  );
  const hasStressData = rows.some(
    (m) => m.stress_high_time !== null || m.recovery_high_time !== null,
  );

  const periodToggle = (
    <div className="flex gap-1.5">
      {([7, 30, 90] as Period[]).map((p) => (
        <Button
          key={p}
          variant={period === p ? "secondary" : "outline"}
          size="sm"
          onClick={() => setPeriod(p)}
        >
          {p}d
        </Button>
      ))}
    </div>
  );

  const footer = (
    <Accordion type="single" collapsible>
      <AccordionItem value="conexao" className="rounded-lg border px-4">
        <AccordionTrigger className="text-sm font-semibold">
          Conexão e diagnóstico
        </AccordionTrigger>
        <AccordionContent className="space-y-4">
          <OuraConnectionCard studentId={studentId} studentName={studentName} />
          {!isAdmin && <OuraConnectionStatus studentId={studentId} hasConnection={hasConnection} />}
          {isAdmin && <OuraApiDiagnosticsCard studentId={studentId} />}
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="protocolos" className="mt-3 rounded-lg border px-4">
        <AccordionTrigger className="text-sm font-semibold">
          Recomendações de recuperação
        </AccordionTrigger>
        <AccordionContent>
          <ProtocolRecommendationsCard studentId={studentId} />
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );

  // Header (toggle+protocolo manual) e rodapé (conexão/diag/protocolos)
  // ficam acessíveis em TODOS os estados — erro de métricas não pode
  // esconder o botão de sincronizar nem o fluxo de protocolos.
  let body: ReactNode;
  if (isLoading) {
    body = (
      <div className="space-y-4">
        <Skeleton className="h-40 w-full rounded-lg" />
        <Skeleton className="h-48 w-full rounded-lg" />
      </div>
    );
  } else if (isError) {
    body = <DataErrorState what="as métricas do Oura" onRetry={() => refetch()} />;
  } else if (rows.length === 0) {
    body = (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Activity className="mb-4 h-12 w-12 text-muted-foreground" />
          {hasConnection ? (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Oura conectado, sem dados no período selecionado. Os dados são
                processados após o aluno acordar e sincronizar o anel — use o
                Sincronizar em "Conexão e diagnóstico" abaixo.
              </AlertDescription>
            </Alert>
          ) : (
            <>
              <p className="text-muted-foreground">Nenhuma métrica do Oura disponível</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Conecte o Oura do aluno em "Conexão e diagnóstico" abaixo.
              </p>
            </>
          )}
        </CardContent>
      </Card>
    );
  } else {
    body = null;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {periodToggle}
        <ManualProtocolRecommendationDialog studentId={studentId} />
      </div>

      {body}

      {body === null && (
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Resumo</TabsTrigger>
          <TabsTrigger value="activity">Atividade</TabsTrigger>
          <TabsTrigger value="sleep">Sono</TabsTrigger>
          <TabsTrigger value="stress">Estresse</TabsTrigger>
          <TabsTrigger value="workouts">Treinos</TabsTrigger>
          <TabsTrigger value="advanced">Avançado</TabsTrigger>
        </TabsList>

        {/* RESUMO — prontidão como herói + tendência */}
        <TabsContent value="overview" className="mt-6 space-y-4 animate-fade-in">
          {latestScored && (
            <Card className="border-l-2 border-l-primary">
              <CardContent className="flex flex-col gap-6 p-6 sm:flex-row sm:items-center">
                <ScoreRing
                  value={latestScored.readiness_score}
                  label="prontidão"
                  tone={scoreTone(latestScored.readiness_score)}
                />
                <div className="min-w-0 flex-1 space-y-3">
                  <StaleBadge date={latestScored.date} source="Oura" />
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                    <MetricTile label="Sono" value={latestScored.sleep_score} />
                    <MetricTile
                      label="HRV noturna"
                      value={
                        latestScored.average_sleep_hrv !== null
                          ? Math.round(latestScored.average_sleep_hrv)
                          : null
                      }
                      unit="ms"
                    />
                    <MetricTile
                      label="FC repouso"
                      value={latestScored.resting_heart_rate}
                      unit="bpm"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          <Card>
            <CardContent className="p-4">
              <p className="mb-2 text-[10.5px] uppercase tracking-widest text-muted-foreground">
                Prontidão · últimos {period} dias
              </p>
              <LazyChart height={180}>
                <TrendChart
                  data={toTrend(windowDates, byDate, (m) => m.readiness_score)}
                  kind="line"
                  series={1}
                  height={180}
                  yDomain={[0, 100]}
                />
              </LazyChart>
            </CardContent>
          </Card>
          <DayTable
            rows={rows}
            columns={[
              { label: "Prontidão", render: (m) => m.readiness_score ?? "—" },
              { label: "Sono", render: (m) => m.sleep_score ?? "—" },
              {
                label: "HRV",
                render: (m) =>
                  m.average_sleep_hrv !== null ? `${Math.round(m.average_sleep_hrv)} ms` : "—",
              },
              {
                label: "FCR",
                render: (m) =>
                  m.resting_heart_rate !== null ? `${m.resting_heart_rate} bpm` : "—",
              },
            ]}
          />
        </TabsContent>

        {/* ATIVIDADE */}
        <TabsContent value="activity" className="mt-6 space-y-4 animate-fade-in">
          {(() => {
            const latest = latestWith(rows, (m) => m.activity_score);
            return latest ? (
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <MetricTile
                  label="Atividade"
                  value={latest.activity_score}
                  tone={scoreTone(latest.activity_score)}
                  footnote={shortDay(latest.date)}
                />
                <MetricTile
                  label="Passos"
                  value={latest.steps !== null ? latest.steps.toLocaleString("pt-BR") : null}
                />
                <MetricTile
                  label="Calorias ativas"
                  value={latest.active_calories}
                  unit="kcal"
                />
                <MetricTile label="MET-minutos" value={latest.met_minutes} />
              </div>
            ) : null;
          })()}
          <Card>
            <CardContent className="p-4">
              <p className="mb-2 text-[10.5px] uppercase tracking-widest text-muted-foreground">
                Score de atividade · últimos {period} dias
              </p>
              <LazyChart height={180}>
                <TrendChart
                  data={toTrend(windowDates, byDate, (m) => m.activity_score)}
                  kind="line"
                  series={2}
                  height={180}
                  yDomain={[0, 100]}
                />
              </LazyChart>
            </CardContent>
          </Card>
          <DayTable
            rows={rows}
            columns={[
              { label: "Score", render: (m) => m.activity_score ?? "—" },
              {
                label: "Passos",
                render: (m) => (m.steps !== null ? m.steps.toLocaleString("pt-BR") : "—"),
              },
              {
                label: "Cal. ativas",
                render: (m) => (m.active_calories !== null ? `${m.active_calories} kcal` : "—"),
              },
              { label: "MET-min", render: (m) => m.met_minutes ?? "—" },
            ]}
          />
        </TabsContent>

        {/* SONO */}
        <TabsContent value="sleep" className="mt-6 space-y-4 animate-fade-in">
          {(() => {
            const latest = latestWith(rows, (m) => m.sleep_score);
            return latest ? (
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <MetricTile
                  label="Sono"
                  value={latest.sleep_score}
                  tone={scoreTone(latest.sleep_score)}
                  footnote={shortDay(latest.date)}
                />
                <MetricTile label="Duração" value={fmtDuration(latest.total_sleep_duration)} />
                <MetricTile
                  label="Eficiência"
                  value={latest.sleep_efficiency !== null ? `${latest.sleep_efficiency}%` : null}
                />
                <MetricTile
                  label="FC mínima"
                  value={latest.lowest_heart_rate}
                  unit="bpm"
                />
              </div>
            ) : null;
          })()}
          {hasSleepPhases && (
            <Card>
              <CardContent className="p-4">
                <p className="mb-2 text-[10.5px] uppercase tracking-widest text-muted-foreground">
                  Fases do sono (horas) · últimos {period} dias
                </p>
                <LazyChart height={200}>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={sleepPhases}>
                      <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeOpacity={0.6} />
                      <XAxis dataKey="date" {...chartAxisProps} minTickGap={24} />
                      <YAxis width={30} {...chartAxisProps} />
                      <Tooltip contentStyle={chartTooltipStyle} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Bar dataKey="Profundo" stackId="sono" fill="hsl(var(--chart-1))" maxBarSize={18} />
                      <Bar dataKey="Leve" stackId="sono" fill="hsl(var(--chart-3))" maxBarSize={18} />
                      <Bar dataKey="REM" stackId="sono" fill="hsl(var(--chart-4))" radius={[4, 4, 0, 0]} maxBarSize={18} />
                    </BarChart>
                  </ResponsiveContainer>
                </LazyChart>
              </CardContent>
            </Card>
          )}
          <DayTable
            rows={rows}
            columns={[
              { label: "Score", render: (m) => m.sleep_score ?? "—" },
              { label: "Duração", render: (m) => fmtDuration(m.total_sleep_duration) },
              { label: "Profundo", render: (m) => fmtDuration(m.deep_sleep_duration) },
              { label: "REM", render: (m) => fmtDuration(m.rem_sleep_duration) },
              {
                label: "Efic.",
                render: (m) => (m.sleep_efficiency !== null ? `${m.sleep_efficiency}%` : "—"),
              },
            ]}
          />
        </TabsContent>

        {/* ESTRESSE — balanço por dia em barras empilhadas (mata o gráfico-por-dia) */}
        <TabsContent value="stress" className="mt-6 space-y-4 animate-fade-in">
          {hasStressData ? (
            <Card>
              <CardContent className="p-4">
                <p className="mb-2 text-[10.5px] uppercase tracking-widest text-muted-foreground">
                  Estresse × recuperação (minutos) · últimos {period} dias
                </p>
                <LazyChart height={200}>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={stressBalance}>
                      <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeOpacity={0.6} />
                      <XAxis dataKey="date" {...chartAxisProps} minTickGap={24} />
                      <YAxis width={34} {...chartAxisProps} />
                      <Tooltip contentStyle={chartTooltipStyle} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Bar dataKey="Estresse alto" stackId="s" fill="hsl(var(--chart-1))" maxBarSize={18} />
                      <Bar dataKey="Recuperação alta" stackId="s" fill="hsl(var(--chart-5))" radius={[4, 4, 0, 0]} maxBarSize={18} />
                    </BarChart>
                  </ResponsiveContainer>
                </LazyChart>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                Sem dados de estresse no período.
              </CardContent>
            </Card>
          )}
          <DayTable
            rows={rows}
            columns={[
              { label: "Estresse alto", render: (m) => fmtMin(m.stress_high_time) },
              { label: "Recuperação alta", render: (m) => fmtMin(m.recovery_high_time) },
              {
                label: "Resumo",
                render: (m) => <Badge variant="outline">{summaryLabel(m.day_summary)}</Badge>,
              },
            ]}
          />
        </TabsContent>

        {/* TREINOS — eventos, mantém a lista existente */}
        <TabsContent value="workouts" className="mt-6 space-y-4 animate-fade-in">
          <OuraWorkoutsCard studentId={studentId} limit={20} />
        </TabsContent>

        {/* AVANÇADO */}
        <TabsContent value="advanced" className="mt-6 space-y-4 animate-fade-in">
          {(() => {
            const latestSpo2 = latestWith(rows, (m) => m.spo2_average);
            const latestVo2 = latestWith(rows, (m) => m.vo2_max);
            const latestRes = rows.find((m) => m.resilience_level !== null) ?? null;
            return (
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <MetricTile
                  label="SpO2 médio (sono)"
                  value={latestSpo2?.spo2_average != null ? `${latestSpo2.spo2_average.toFixed(1)}%` : null}
                  tone={
                    latestSpo2?.spo2_average != null && latestSpo2.spo2_average < 95
                      ? "warning"
                      : "neutral"
                  }
                  footnote={latestSpo2 ? shortDay(latestSpo2.date) : undefined}
                />
                <MetricTile
                  label="Dist. respiratório"
                  value={latestWith(rows, (m) => m.breathing_disturbance_index)?.breathing_disturbance_index ?? null}
                  footnote="abaixo = melhor"
                />
                <MetricTile
                  label="Resiliência"
                  value={latestRes?.resilience_level ?? null}
                />
                <MetricTile
                  label="VO2 máx (Oura)"
                  value={latestVo2?.vo2_max ?? null}
                  footnote={
                    latestVo2
                      ? shortDay(latestVo2.date)
                      : "requer treinos cardio com o anel"
                  }
                />
              </div>
            );
          })()}
          <Card>
            <CardContent className="p-4">
              <p className="mb-2 text-[10.5px] uppercase tracking-widest text-muted-foreground">
                SpO2 médio · últimos {period} dias
              </p>
              <LazyChart height={180}>
                <TrendChart
                  data={toTrend(windowDates, byDate, (m) => m.spo2_average)}
                  kind="line"
                  series={5}
                  height={180}
                />
              </LazyChart>
            </CardContent>
          </Card>
          <DayTable
            rows={rows}
            columns={[
              {
                label: "SpO2",
                render: (m) => (m.spo2_average !== null ? `${m.spo2_average.toFixed(1)}%` : "—"),
              },
              { label: "BDI", render: (m) => m.breathing_disturbance_index ?? "—" },
              { label: "Resiliência", render: (m) => m.resilience_level ?? "—" },
            ]}
          />
        </TabsContent>
      </Tabs>
      )}

      {footer}
    </div>
  );
};
