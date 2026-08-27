import { ReactNode, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Activity, RefreshCw } from "lucide-react";
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
import { useWhoopMetrics, WhoopMetrics } from "@/hooks/useWhoopMetrics";
import {
  useWhoopConnection,
  useDisconnectWhoop,
  useSyncWhoop,
} from "@/hooks/useWhoopConnection";
import { spWindowDates, spToday } from "@/hooks/useOuraMetrics";
import { SendWhoopConnectDialog } from "@/components/SendWhoopConnectDialog";
import { ScoreRing, MetricTile, TrendChart, StaleBadge, DataErrorState } from "@/components/metrics";
import type { TrendPoint } from "@/components/metrics";
import { LazyChart } from "@/components/LazyChart";
import { formatRelativeDay } from "@/utils/relativeDate";

type Period = 7 | 30 | 90;

interface WhoopTabContentProps {
  studentId: string;
  studentName: string;
  isAdmin: boolean;
}

/** Faixas oficiais do Whoop já usadas no app (67/34). */
const recoveryTone = (score: number | null) => {
  if (score === null) return "neutral" as const;
  if (score >= 67) return "success" as const;
  if (score >= 34) return "warning" as const;
  return "destructive" as const;
};

const isScored = (m: WhoopMetrics) =>
  m.score_state === null || m.score_state === "SCORED";

const fmtSleep = (seconds: number | null) => {
  if (seconds === null) return "—";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h${String(m).padStart(2, "0")}`;
};

const shortDay = (date: string) => {
  const [, m, d] = date.split("-");
  return `${d}/${m}`;
};

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
 * Aba Whoop da ficha (PR-5b): mesmo esqueleto do Oura — hero do último dia
 * FECHADO (score_state) + tendências no período + tabela com TODOS os
 * campos sincronizados (12 deles nunca apareciam na UI). Conexão no rodapé.
 */
export const WhoopTabContent = ({ studentId, studentName, isAdmin }: WhoopTabContentProps) => {
  const [period, setPeriod] = useState<Period>(30);
  const [connectOpen, setConnectOpen] = useState(false);
  const { data: connection, isLoading: loadingConnection, isError: connectionError, refetch: refetchConnection } = useWhoopConnection(studentId);
  const { data: metrics, isLoading, isError, refetch } = useWhoopMetrics(studentId, {
    days: period,
  });
  const disconnectWhoop = useDisconnectWhoop();
  const syncWhoop = useSyncWhoop();

  const rows = useMemo(() => metrics ?? [], [metrics]);
  const today = spToday();
  const windowDates = useMemo(() => spWindowDates(period), [period, today]);
  const byDate = useMemo(() => {
    const map = new Map<string, WhoopMetrics>();
    for (const m of rows) map.set(m.date, m);
    return map;
  }, [rows]);

  const latestScored = rows.find((m) => isScored(m) && m.recovery_score !== null) ?? null;
  const latestPending = rows.find((m) => m.score_state === "PENDING_SCORE") ?? null;

  // Ausência de dado NUNCA vira zero (lição da revisão fria do 5a).
  // requireScored só vale pro RECOVERY: strain e sono de um dia com score
  // pendente são dados válidos (o Whoop fecha o recovery depois).
  const toTrend = (
    pick: (m: WhoopMetrics) => number | null,
    opts: { requireScored?: boolean } = {},
  ): TrendPoint[] =>
    windowDates.map((date) => {
      const m = byDate.get(date);
      if (!m) return { date, value: null };
      if (opts.requireScored && !isScored(m)) return { date, value: null };
      return { date, value: pick(m) };
    });

  const sleepStages = useMemo(
    () =>
      windowDates.map((date) => {
        const m = byDate.get(date);
        const hours = (v: number | null | undefined) =>
          v === null || v === undefined ? null : Number((v / 3600).toFixed(2));
        return {
          date: shortDay(date),
          Profundo: hours(m?.deep_sleep_duration),
          Leve: hours(m?.light_sleep_duration),
          REM: hours(m?.rem_sleep_duration),
        };
      }),
    [windowDates, byDate],
  );
  const hasSleepStages = rows.some(
    (m) =>
      m.deep_sleep_duration !== null ||
      m.light_sleep_duration !== null ||
      m.rem_sleep_duration !== null,
  );

  const periodToggle = (
    <div className="flex gap-1.5">
      {([7, 30, 90] as Period[]).map((p) => (
        <Button
          key={p}
          variant={period === p ? "secondary" : "outline"}
          size="sm"
          aria-pressed={period === p}
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
        <AccordionTrigger className="text-sm font-semibold">Conexão Whoop</AccordionTrigger>
        <AccordionContent>
          {loadingConnection ? (
            <Skeleton className="h-10 w-full rounded-md" />
          ) : connection ? (
            <div className="flex flex-wrap items-center justify-between gap-3 py-1">
              <div>
                <p className="font-medium">Whoop conectado</p>
                <p className="text-sm text-muted-foreground">
                  {connection.last_sync_at
                    ? `Última sincronização: ${formatRelativeDay(new Date(connection.last_sync_at))} às ${new Date(connection.last_sync_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`
                    : "Aguardando primeira sincronização"}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => disconnectWhoop.mutate(studentId)}
                disabled={disconnectWhoop.isPending}
              >
                Desconectar
              </Button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3 py-1">
              <p className="text-sm text-muted-foreground">
                Gere um link para o aluno autorizar o compartilhamento dos dados.
              </p>
              <Button size="sm" onClick={() => setConnectOpen(true)}>
                <Activity className="mr-2 h-4 w-4" />
                Conectar Whoop
              </Button>
            </div>
          )}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );

  // Conexão carregando ≠ não conectado (fix do flash 'Conectar Whoop').
  let body: ReactNode;
  if (loadingConnection || (isLoading && rows.length === 0)) {
    body = (
      <div className="space-y-4">
        <Skeleton className="h-40 w-full rounded-lg" />
        <Skeleton className="h-48 w-full rounded-lg" />
      </div>
    );
  } else if (connectionError) {
    // Falha ao CONSULTAR a conexão não é desconexão — mostrar "Conectar"
    // aqui levaria o coach a gerar novo OAuth pra aluna ainda conectada.
    body = <DataErrorState what="o status da conexão Whoop" onRetry={() => refetchConnection()} />;
  } else if (isError) {
    body = <DataErrorState what="as métricas do Whoop" onRetry={() => refetch()} />;
  } else if (!connection) {
    body = (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <Activity className="mb-4 h-12 w-12 text-muted-foreground" />
          <p className="font-medium">Whoop não conectado</p>
          <p className="mb-4 mt-2 text-sm text-muted-foreground">
            Gere um link para o aluno autorizar o compartilhamento dos dados do Whoop.
          </p>
          <Button onClick={() => setConnectOpen(true)}>
            <Activity className="mr-2 h-4 w-4" />
            Conectar Whoop
          </Button>
        </CardContent>
      </Card>
    );
  } else if (rows.length === 0) {
    body = (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Activity className="mb-4 h-12 w-12 text-muted-foreground" />
          <p className="text-muted-foreground">Sem dados do Whoop no período selecionado</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Os dados aparecem após a sincronização — o sync roda 3x ao dia
            {isAdmin ? ", ou use o Sincronizar acima" : ""}.
          </p>
        </CardContent>
      </Card>
    );
  } else {
    body = (
      <div className="space-y-4">
        {latestScored && (
          <Card className="border-l-2 border-l-primary">
            <CardContent className="flex flex-col gap-6 p-6 sm:flex-row sm:items-center">
              <ScoreRing
                value={latestScored.recovery_score}
                label="recovery"
                tone={recoveryTone(latestScored.recovery_score)}
              />
              <div className="min-w-0 flex-1 space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <StaleBadge date={latestScored.date} source="Whoop" />
                  {latestPending && latestPending.date > latestScored.date && (
                    <Badge variant="outline" className="font-normal text-muted-foreground">
                      score de {shortDay(latestPending.date)} em processamento
                    </Badge>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  <MetricTile
                    label="Strain"
                    value={latestScored.day_strain !== null ? latestScored.day_strain.toFixed(1) : null}
                  />
                  <MetricTile
                    label="HRV"
                    value={latestScored.hrv_rmssd !== null ? Math.round(latestScored.hrv_rmssd) : null}
                    unit="ms"
                  />
                  <MetricTile
                    label="FC repouso"
                    value={latestScored.resting_heart_rate}
                    unit="bpm"
                  />
                  <MetricTile
                    label="Sono"
                    value={fmtSleep(latestScored.total_sleep_duration)}
                    footnote={
                      latestScored.sleep_performance !== null
                        ? `${latestScored.sleep_performance}% da necessidade`
                        : undefined
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardContent className="p-4">
              <p className="mb-2 text-[10.5px] uppercase tracking-widest text-muted-foreground">
                Recovery · últimos {period} dias
              </p>
              <LazyChart height={170}>
                <TrendChart
                  data={toTrend((m) => m.recovery_score, { requireScored: true })}
                  kind="line"
                  series={1}
                  height={170}
                  yDomain={[0, 100]}
                />
              </LazyChart>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="mb-2 text-[10.5px] uppercase tracking-widest text-muted-foreground">
                Strain · últimos {period} dias
              </p>
              <LazyChart height={170}>
                <TrendChart
                  data={toTrend((m) => m.day_strain)}
                  kind="line"
                  series={2}
                  height={170}
                  yDomain={[0, 21]}
                />
              </LazyChart>
            </CardContent>
          </Card>
        </div>

        {hasSleepStages && (
          <Card>
            <CardContent className="p-4">
              <p className="mb-2 text-[10.5px] uppercase tracking-widest text-muted-foreground">
                Fases do sono (horas) · últimos {period} dias
              </p>
              <LazyChart height={200}>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={sleepStages}>
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

        <Card>
          <CardContent className="p-0">
            <div className="max-h-80 overflow-y-auto overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-card">
                  <tr className="border-b text-left text-[10.5px] uppercase tracking-widest text-muted-foreground">
                    {["Dia", "Recovery", "Strain", "HRV", "FCR", "Sono", "Efic.", "FR", "SpO2", "Temp. pele", "Despertares", "Status"].map((h) => (
                      <th key={h} className="px-4 py-2 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((m) => (
                    <tr key={m.id} className="border-b last:border-b-0">
                      <td className="whitespace-nowrap px-4 py-2 text-muted-foreground">{shortDay(m.date)}</td>
                      <td className="px-4 py-2">{m.recovery_score !== null ? `${m.recovery_score}%` : "—"}</td>
                      <td className="px-4 py-2">{m.day_strain !== null ? m.day_strain.toFixed(1) : "—"}</td>
                      <td className="whitespace-nowrap px-4 py-2">{m.hrv_rmssd !== null ? `${Math.round(m.hrv_rmssd)} ms` : "—"}</td>
                      <td className="whitespace-nowrap px-4 py-2">{m.resting_heart_rate !== null ? `${m.resting_heart_rate} bpm` : "—"}</td>
                      <td className="whitespace-nowrap px-4 py-2">{fmtSleep(m.total_sleep_duration)}</td>
                      <td className="px-4 py-2">{m.sleep_efficiency !== null ? `${Math.round(m.sleep_efficiency)}%` : "—"}</td>
                      <td className="whitespace-nowrap px-4 py-2">{m.respiratory_rate !== null ? `${m.respiratory_rate.toFixed(1)}/min` : "—"}</td>
                      <td className="px-4 py-2">{m.spo2 !== null ? `${m.spo2.toFixed(1)}%` : "—"}</td>
                      <td className="whitespace-nowrap px-4 py-2">{m.skin_temp !== null ? `${m.skin_temp.toFixed(1)}°C` : "—"}</td>
                      <td className="px-4 py-2">{m.disturbance_count ?? "—"}</td>
                      <td className="px-4 py-2">
                        {m.score_state === "PENDING_SCORE" && (
                          <Badge variant="outline" className="font-normal text-muted-foreground">
                            processando
                          </Badge>
                        )}
                        {m.score_state === "UNSCORABLE" && (
                          <Badge variant="outline" className="font-normal text-warning">
                            não pontuável
                          </Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {periodToggle}
        {isAdmin && connection && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => syncWhoop.mutate(studentId)}
            disabled={syncWhoop.isPending}
            className="gap-2"
          >
            <RefreshCw className={syncWhoop.isPending ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
            {syncWhoop.isPending ? "Sincronizando..." : "Sincronizar agora"}
          </Button>
        )}
      </div>

      {body}

      {footer}

      <SendWhoopConnectDialog
        open={connectOpen}
        onOpenChange={setConnectOpen}
        studentId={studentId}
        studentName={studentName}
      />
    </div>
  );
};
