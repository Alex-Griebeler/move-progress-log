import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, Mic, User, Users } from "lucide-react";
import { format } from "date-fns";
import { SessionCard } from "./SessionCard";
import { DataErrorState, WeekBars, TrendChart } from "@/components/metrics";
import type { WeekBarPoint, TrendPoint } from "@/components/metrics";
import { LazyChart } from "@/components/LazyChart";
import { formatSessionTime } from "@/utils/sessionTime";
import { sessionVolume, computeVolumeDeltas, weeklyAggregates, mondayOf } from "@/utils/sessionTrends";
import { parseLocalDate } from "@/utils/relativeDate";
import type { useSessionsWithExercises } from "@/hooks/useStudentDetail";

type Sessions = NonNullable<ReturnType<typeof useSessionsWithExercises>["data"]>;
type Session = Sessions[number];

type TypeFilter = "all" | "individual" | "group";

interface SessionsTabContentProps {
  studentName: string;
  sessions: Sessions | undefined;
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
  weeklyTarget?: number | null;
  onRecordSession: () => void;
  onView: (sessionId: string) => void;
  onEdit: (sessionId: string) => void;
  onReopen: (sessionId: string) => void;
  onFinalize: (sessionId: string) => void;
}

/**
 * Aba Sessões da ficha (PR-6): strip de tendência (frequência + volume por
 * semana) + cards informativos agrupados por semana. WorkoutCard segue no
 * dashboard; aqui o card mostra o que o coach decide sem abrir nada.
 */
export const SessionsTabContent = ({
  studentName,
  sessions,
  isLoading,
  isError,
  refetch,
  weeklyTarget,
  onRecordSession,
  onView,
  onEdit,
  onReopen,
  onFinalize,
}: SessionsTabContentProps) => {
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");

  const all = useMemo(() => sessions ?? [], [sessions]);
  const filtered = useMemo(
    () => all.filter((s) => typeFilter === "all" || s.session_type === typeFilter),
    [all, typeFilter],
  );

  // Δ% de volume vs a sessão anterior do MESMO tipo (util pura testada:
  // empate de data resolve por hora, depois id).
  const volumeDeltas = useMemo(() => computeVolumeDeltas(all), [all]);

  // Strip: últimas 8 semanas (frequência + volume). Semana sem sessão tem
  // volume ZERO real (sabemos que não houve treino) — nunca null/ausente.
  const { weekBars, volumeTrend } = useMemo(() => {
    const aggregates = weeklyAggregates(all, 8);
    const bars: WeekBarPoint[] = aggregates.map((w) => ({
      label: format(w.weekStart, "dd/MM"),
      value: w.sessionCount,
      target: weeklyTarget ?? undefined,
    }));
    const volume: TrendPoint[] = aggregates.map((w) => ({
      date: format(w.weekStart, "yyyy-MM-dd"),
      value: w.totalVolumeKg,
    }));
    return { weekBars: bars, volumeTrend: volume };
  }, [all, weeklyTarget]);

  // Agrupamento por semana (desc), preservando a ordem da query.
  const grouped = useMemo(() => {
    const groups = new Map<string, Session[]>();
    for (const s of filtered) {
      const monday = mondayOf(parseLocalDate(s.date));
      const key = format(monday, "yyyy-MM-dd");
      const list = groups.get(key) ?? [];
      list.push(s);
      groups.set(key, list);
    }
    return Array.from(groups.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filtered]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-28 w-full rounded-lg" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }
  if (isError) {
    return <DataErrorState what="as sessões do aluno" onRetry={refetch} />;
  }

  const counts = {
    all: all.length,
    individual: all.filter((s) => s.session_type === "individual").length,
    group: all.filter((s) => s.session_type === "group").length,
  };

  const filterChips = (
    <div className="flex flex-wrap gap-2">
      {(
        [
          { key: "all", label: "Todas", icon: null, count: counts.all },
          { key: "individual", label: "Individual", icon: <User className="h-3.5 w-3.5" />, count: counts.individual },
          { key: "group", label: "Grupo", icon: <Users className="h-3.5 w-3.5" />, count: counts.group },
        ] as const
      ).map((chip) => (
        <Button
          key={chip.key}
          variant={typeFilter === chip.key ? "secondary" : "outline"}
          size="sm"
          aria-pressed={typeFilter === chip.key}
          onClick={() => setTypeFilter(chip.key)}
          className="gap-1.5"
        >
          {chip.icon}
          {chip.label}
          <Badge variant="outline" className="ml-1">
            {chip.count}
          </Badge>
        </Button>
      ))}
    </div>
  );

  if (all.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center space-y-4 py-12">
          <div className="rounded-full bg-primary/10 p-4">
            <Calendar className="h-12 w-12 text-primary" />
          </div>
          <div className="space-y-2 text-center">
            <h3 className="text-lg font-semibold">Nenhuma sessão registrada</h3>
            <p className="max-w-md text-sm text-muted-foreground">
              Comece registrando a primeira sessão de treino de {studentName}
            </p>
          </div>
          <Button onClick={onRecordSession} className="mt-4 gap-2">
            <Mic className="h-4 w-4" />
            Registrar Primeira Sessão
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Strip de tendência semanal */}
      <Card>
        <CardContent className="grid gap-6 p-4 md:grid-cols-2">
          <div>
            <p className="mb-2 text-[10.5px] uppercase tracking-widest text-muted-foreground">
              Sessões por semana · 8 semanas
            </p>
            <WeekBars weeks={weekBars} />
          </div>
          <div>
            <p className="mb-2 text-[10.5px] uppercase tracking-widest text-muted-foreground">
              Volume por semana (kg)
            </p>
            <LazyChart height={80}>
              <TrendChart data={volumeTrend} kind="bar" series={1} height={80} />
            </LazyChart>
          </div>
        </CardContent>
      </Card>

      {filterChips}

      {filtered.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center space-y-4 py-10">
            <Calendar className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Nenhuma sessão {typeFilter === "individual" ? "individual" : "em grupo"} registrada.
            </p>
            <Button variant="outline" size="sm" onClick={() => setTypeFilter("all")}>
              Ver todas as sessões
            </Button>
          </CardContent>
        </Card>
      ) : (
        grouped.map(([weekKey, weekSessions]) => (
          <div key={weekKey} className="space-y-3">
            <h4 className="text-[10.5px] uppercase tracking-widest text-muted-foreground">
              Semana de {format(parseLocalDate(weekKey), "dd/MM")}
            </h4>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {weekSessions.map((session) => (
                <SessionCard
                  key={session.id}
                  name={session.workout_name || `Treino - ${formatSessionTime(session.time)}`}
                  date={session.date}
                  sessionType={session.session_type as "individual" | "group"}
                  exerciseCount={session.exercises?.length ?? 0}
                  totalVolumeKg={sessionVolume(session)}
                  volumeDeltaPercent={volumeDeltas.get(session.id) ?? null}
                  isFinalized={session.is_finalized}
                  canReopen={session.can_reopen}
                  hasObservations={session.exercises?.some((ex) => !!ex.observations) ?? false}
                  onClick={() => onView(session.id)}
                  onEdit={() => onEdit(session.id)}
                  onReopen={() => onReopen(session.id)}
                  onFinalize={() => onFinalize(session.id)}
                />
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
};
