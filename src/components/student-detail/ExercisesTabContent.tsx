import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Check, ChevronsUpDown, Dumbbell, Trophy } from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { cn } from "@/lib/utils";
import { useExerciseHistory } from "@/hooks/useExerciseHistory";
import { buildTopSetSeries, progressionStats } from "@/utils/exerciseProgression";
import { normalizeExerciseSessionName } from "@/utils/exerciseSessionKeys";
import { getMovementPatternLabel } from "@/constants/backToBasics";
import { formatRelativeDay } from "@/utils/relativeDate";
import { formatSessionDate } from "@/utils/sessionDate";
import { DataErrorState, MetricTile } from "@/components/metrics";
import { LazyChart } from "@/components/LazyChart";
import type { useSessionsWithExercises } from "@/hooks/useStudentDetail";

type Sessions = NonNullable<ReturnType<typeof useSessionsWithExercises>["data"]>;

interface ExerciseOption {
  key: string;
  name: string;
  exerciseLibraryId: string | null;
  movementPattern: string | null;
  lastDate: string;
}

interface ExercisesTabContentProps {
  studentId: string;
  sessions: Sessions | undefined;
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
}

const shortDay = (date: string) => {
  const [, m, d] = date.split("-");
  return `${d}/${m}`;
};

const fmtKg = (v: number) => `${v.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} kg`;

/**
 * Aba Exercícios da ficha (PR-7): a série que o hook sempre carregou e a UI
 * jogava fora vira gráfico de progressão (top-set por sessão, PRs marcados),
 * com seletor buscável agrupado por padrão de movimento e stats de janela
 * (4 semanas), no lugar dos 4 agregados vitalícios.
 */
export const ExercisesTabContent = ({
  studentId,
  sessions,
  isLoading,
  isError,
  refetch,
}: ExercisesTabContentProps) => {
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const defaultApplied = useRef(false);

  // Opções canônicas (mesma consolidação de sempre: id > nome normalizado),
  // enriquecidas com padrão de movimento e última execução; ordenadas por
  // recência — a mais recente é o default.
  const options = useMemo<ExerciseOption[]>(() => {
    const byKey = new Map<string, ExerciseOption>();
    const canonicalByName = new Map<string, string>();
    for (const session of sessions ?? []) {
      for (const ex of session.exercises ?? []) {
        if (!ex.exercise_name) continue;
        const norm = normalizeExerciseSessionName(ex.exercise_name);
        const key = ex.exercise_library_id ? `id:${ex.exercise_library_id}` : `name:${norm}`;
        if (ex.exercise_library_id && !canonicalByName.has(norm)) {
          canonicalByName.set(norm, key);
        }
        const existing = byKey.get(key);
        const pattern =
          (ex as { exercises_library?: { movement_pattern: string | null } | null })
            .exercises_library?.movement_pattern ?? null;
        if (!existing) {
          byKey.set(key, {
            key,
            name: ex.exercise_name,
            exerciseLibraryId: ex.exercise_library_id ?? null,
            movementPattern: pattern,
            lastDate: session.date,
          });
        } else if (session.date > existing.lastDate) {
          existing.lastDate = session.date;
          if (pattern) existing.movementPattern = pattern;
        }
      }
    }
    // Linha legada por nome não duplica opção que já existe por id.
    for (const [key, option] of Array.from(byKey.entries())) {
      if (!option.exerciseLibraryId) {
        const norm = normalizeExerciseSessionName(option.name);
        const canonical = canonicalByName.get(norm);
        if (canonical && canonical !== key) byKey.delete(key);
      }
    }
    return Array.from(byKey.values()).sort((a, b) => b.lastDate.localeCompare(a.lastDate));
  }, [sessions]);

  // Default = exercício mais recente, aplicado UMA vez (ref-guard) — nunca
  // sobrescreve escolha do usuário.
  useEffect(() => {
    if (defaultApplied.current || options.length === 0) return;
    setSelectedKey(options[0].key);
    defaultApplied.current = true;
  }, [options]);

  const selected = options.find((o) => o.key === selectedKey) ?? null;

  const {
    data: history,
    isLoading: loadingHistory,
    isError: historyError,
    refetch: refetchHistory,
  } = useExerciseHistory(studentId, selected?.name ?? "", selected?.exerciseLibraryId);

  const series = useMemo(() => buildTopSetSeries(history ?? []), [history]);
  const stats = useMemo(() => progressionStats(history ?? []), [history]);

  const grouped = useMemo(() => {
    const groups = new Map<string, ExerciseOption[]>();
    for (const o of options) {
      const label = o.movementPattern ? getMovementPatternLabel(o.movementPattern) : "Sem padrão";
      const list = groups.get(label) ?? [];
      list.push(o);
      groups.set(label, list);
    }
    return Array.from(groups.entries()).sort((a, b) => a[0].localeCompare(b[0], "pt-BR"));
  }, [options]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-72 rounded-md" />
        <Skeleton className="h-48 w-full rounded-lg" />
      </div>
    );
  }
  if (isError) {
    return <DataErrorState what="os exercícios do aluno" onRetry={refetch} />;
  }
  if (options.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Dumbbell className="mb-4 h-12 w-12 text-muted-foreground" />
          <p className="text-muted-foreground">Nenhum exercício registrado ainda</p>
          <p className="mt-2 text-sm text-muted-foreground">
            O histórico aparece após a primeira sessão com exercícios.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Seletor buscável agrupado por padrão de movimento */}
      <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={pickerOpen}
            className="w-full justify-between sm:w-96"
          >
            <span className="truncate">{selected?.name ?? "Escolher exercício..."}</span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <Command>
            <CommandInput placeholder="Buscar exercício..." />
            <CommandList>
              <CommandEmpty>Nenhum exercício encontrado.</CommandEmpty>
              {grouped.map(([patternLabel, list]) => (
                <CommandGroup key={patternLabel} heading={patternLabel}>
                  {list.map((o) => (
                    <CommandItem
                      key={o.key}
                      value={`${o.name} ${patternLabel}`}
                      onSelect={() => {
                        setSelectedKey(o.key);
                        setPickerOpen(false);
                      }}
                    >
                      <Check
                        className={cn("mr-2 h-4 w-4", selectedKey === o.key ? "opacity-100" : "opacity-0")}
                      />
                      <span className="flex-1 truncate">{o.name}</span>
                      <span className="ml-2 text-xs text-muted-foreground">
                        {formatRelativeDay(o.lastDate)}
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              ))}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {loadingHistory ? (
        <Skeleton className="h-64 w-full rounded-lg" />
      ) : historyError ? (
        <DataErrorState what="o histórico deste exercício" onRetry={() => refetchHistory()} />
      ) : (
        <>
          {/* Tiles de janela */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <MetricTile
              label="Carga atual"
              value={stats.current ? fmtKg(stats.current.loadKg) : null}
              footnote={stats.current ? formatSessionDate(stats.current.date) : "sem carga registrada"}
            />
            <MetricTile
              label="Recorde (PR)"
              value={stats.pr ? fmtKg(stats.pr.loadKg) : null}
              tone={stats.pr ? "primary" : "neutral"}
              footnote={stats.pr ? formatSessionDate(stats.pr.date) : undefined}
            />
            <MetricTile
              label="Tendência 4 semanas"
              value={stats.delta4wPercent !== null ? `${stats.delta4wPercent > 0 ? "+" : ""}${stats.delta4wPercent}%` : null}
              delta={
                stats.delta4wPercent !== null
                  ? {
                      text: "vs 4 sem. anteriores",
                      direction: stats.delta4wPercent > 0 ? "up" : stats.delta4wPercent < 0 ? "down" : "flat",
                      positive: stats.delta4wPercent >= 0,
                    }
                  : undefined
              }
              footnote={stats.delta4wPercent === null ? "sem base de comparação" : undefined}
            />
            <MetricTile
              label="Volume 4 semanas"
              value={stats.volume4wKg > 0 ? fmtKg(stats.volume4wKg) : null}
              footnote={stats.volume4wKg === 0 ? "sem treino na janela" : undefined}
            />
          </div>

          {/* Progressão de carga com PRs marcados */}
          {series.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-[10.5px] uppercase tracking-widest text-muted-foreground">
                    Top-set por sessão (kg)
                  </p>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Trophy className="h-3 w-3 text-primary" aria-hidden="true" /> = recorde na data
                  </span>
                </div>
                <LazyChart height={200}>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={series}>
                      <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeOpacity={0.6} />
                      <XAxis
                        dataKey="date"
                        tickFormatter={shortDay}
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={10}
                        tickLine={false}
                        axisLine={false}
                        minTickGap={24}
                      />
                      <YAxis
                        width={34}
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={10}
                        tickLine={false}
                        axisLine={false}
                        domain={["auto", "auto"]}
                      />
                      <Tooltip
                        formatter={(v: number) => [`${v} kg`, "top-set"]}
                        labelFormatter={(l: string) => shortDay(l)}
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: 8,
                          fontSize: 12,
                          color: "hsl(var(--foreground))",
                        }}
                      />
                      <Line
                        dataKey="value"
                        stroke="hsl(var(--chart-1))"
                        strokeWidth={2}
                        connectNulls
                        activeDot={{ r: 4 }}
                        dot={(props: { cx?: number; cy?: number; payload?: { isPr?: boolean } }) =>
                          props.payload?.isPr && props.cx !== undefined && props.cy !== undefined ? (
                            <circle
                              key={`pr-${props.cx}-${props.cy}`}
                              cx={props.cx}
                              cy={props.cy}
                              r={4}
                              fill="hsl(var(--primary))"
                              stroke="hsl(var(--card))"
                              strokeWidth={2}
                            />
                          ) : (
                            <g key={`nopr-${props.cx}-${props.cy}`} />
                          )
                        }
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </LazyChart>
              </CardContent>
            </Card>
          )}

          {/* Sessões do exercício */}
          <Card>
            <CardContent className="p-0">
              <div className="max-h-80 overflow-y-auto overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-card">
                    <tr className="border-b text-left text-[10.5px] uppercase tracking-widest text-muted-foreground">
                      <th className="px-4 py-2 font-medium">Dia</th>
                      <th className="px-4 py-2 font-medium">Séries × Reps</th>
                      <th className="px-4 py-2 font-medium">Carga</th>
                      <th className="px-4 py-2 font-medium">Volume</th>
                      <th className="px-4 py-2 font-medium">Obs.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(history ?? []).map((h) => (
                      <tr key={h.id} className="border-b last:border-b-0">
                        <td className="whitespace-nowrap px-4 py-2 text-muted-foreground">
                          {h.session_date ? shortDay(h.session_date) : "—"}
                        </td>
                        <td className="whitespace-nowrap px-4 py-2">
                          {h.sets ?? "—"} × {h.reps ?? "—"}
                        </td>
                        <td className="whitespace-nowrap px-4 py-2">
                          {h.load_kg != null ? fmtKg(h.load_kg) : h.load_description ?? "—"}
                        </td>
                        <td className="whitespace-nowrap px-4 py-2 text-muted-foreground">
                          {h.total_volume != null ? fmtKg(h.total_volume) : "—"}
                        </td>
                        <td className="max-w-[220px] truncate px-4 py-2 text-muted-foreground" title={h.observations ?? undefined}>
                          {h.observations ?? "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {options.length > 0 && (
        <Badge variant="outline" className="font-normal text-muted-foreground">
          {options.length} exercícios no histórico
        </Badge>
      )}
    </div>
  );
};
