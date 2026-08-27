import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity } from "lucide-react";
import { format, isToday, isYesterday, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Student } from "@/hooks/useStudents";
import { StudentObservationsCard } from "./StudentObservationsCard";
import ProtocolRecommendationsCard from "./ProtocolRecommendationsCard";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ScoreRing, MetricTile, WeekBars } from "./metrics";
import type { MetricTone, WeekBarPoint } from "./metrics";
import { assignmentStatus } from "@/utils/assignmentStatus";
import { countUniqueExercises } from "@/utils/uniqueExercises";
import { formatRelativeDay, parseLocalDate } from "@/utils/relativeDate";
import { useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";

interface SessionWithExercises {
  id: string;
  date: string;
  time: string;
  session_type: string;
  is_finalized?: boolean;
  exercises?: Array<{
    exercise_name: string;
    exercise_library_id?: string | null;
    load_kg?: number | null;
    sets?: number | null;
    reps?: number | null;
  }>;
}

interface PrescriptionAssignment {
  id: string;
  start_date: string;
  end_date: string | null;
  prescription_id: string;
}

interface OuraMetricsSnapshot {
  date: string;
  readiness_score: number | null;
  sleep_score: number | null;
  activity_score: number | null;
  stress_high_time: number | null;
  resting_heart_rate: number | null;
  average_sleep_hrv: number | null;
}

interface OuraConnectionInfo {
  is_active: boolean;
  last_sync_at: string | null;
}

interface StudentOverviewDashboardProps {
  student: Student;
  sessions: SessionWithExercises[];
  assignments: PrescriptionAssignment[];
  latestOuraMetrics: OuraMetricsSnapshot | null;
  ouraConnection: OuraConnectionInfo | null;
  onNavigateToOura: () => void;
  isLoading?: boolean;
}

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08
    }
  }
};

const cardVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 15
    }
  }
};

const reducedContainerVariants = {
  hidden: { opacity: 1 },
  visible: { opacity: 1, transition: { duration: 0 } },
};

const reducedCardVariants = {
  hidden: { y: 0, opacity: 1 },
  visible: { y: 0, opacity: 1, transition: { duration: 0 } },
};

const adherenceTone = (percent: number): MetricTone => {
  if (percent >= 75) return "success";
  if (percent >= 40) return "warning";
  return "destructive";
};

export const StudentOverviewDashboard = ({
  student,
  sessions,
  assignments,
  latestOuraMetrics,
  ouraConnection,
  onNavigateToOura,
  isLoading = false,
}: StudentOverviewDashboardProps) => {
  const shouldReduceMotion = useReducedMotion();
  const activeContainerVariants = shouldReduceMotion ? reducedContainerVariants : containerVariants;
  const activeCardVariants = shouldReduceMotion ? reducedCardVariants : cardVariants;

  const ouraDateLabel = useMemo(() => {
    if (!latestOuraMetrics?.date) return null;
    const date = parseISO(latestOuraMetrics.date);
    if (isToday(date)) return "Hoje";
    if (isYesterday(date)) return "Ontem";
    return format(date, "d 'de' MMMM", { locale: ptBR });
  }, [latestOuraMetrics?.date]);

  const sessionsThisMonth = useMemo(() => {
    if (!sessions) return 0;
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    return sessions.filter((s) => {
      const d = parseLocalDate(s.date);
      // Sessão agendada no futuro não conta como adesão realizada.
      return d >= firstDayOfMonth && d < endOfToday;
    }).length;
  }, [sessions]);

  // Meta mensal honesta: semanas reais por mês (~4,33), não ×4.
  const monthlyGoal = student.weekly_sessions_proposed
    ? Math.round(student.weekly_sessions_proposed * 4.33)
    : null;
  const adherencePercent = monthlyGoal
    ? Math.min(100, Math.round((sessionsThisMonth / monthlyGoal) * 100))
    : null;

  const lastSessionDate = useMemo(() => {
    if (!sessions?.length) return null;
    const today = format(new Date(), "yyyy-MM-dd");
    const past = sessions.filter((s) => s.date <= today);
    if (!past.length) return null;
    return past.reduce((max, s) => (s.date > max ? s.date : max), past[0].date);
  }, [sessions]);

  // Frequência das últimas 4 semanas (semana civil iniciando na segunda).
  const weekBars = useMemo<WeekBarPoint[]>(() => {
    const now = new Date();
    const dayOfWeek = (now.getDay() + 6) % 7; // 0 = segunda
    const currentMonday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek);
    const target = student.weekly_sessions_proposed ?? undefined;

    return [3, 2, 1, 0].map((weeksBack) => {
      const start = new Date(currentMonday);
      start.setDate(start.getDate() - weeksBack * 7);
      const end = new Date(start);
      end.setDate(end.getDate() + 7);
      const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      const value = (sessions ?? []).filter((s) => {
        const d = parseLocalDate(s.date);
        return d >= start && d < end && d < endOfToday;
      }).length;
      return {
        label: format(start, "dd/MM"),
        value,
        target,
      };
    });
  }, [sessions, student.weekly_sessions_proposed]);

  const uniqueExercises30d = useMemo(
    () => countUniqueExercises(sessions, { days: 30 }),
    [sessions],
  );

  const activePrescriptions = useMemo(
    () => (assignments ?? []).filter((a) => assignmentStatus(a) === "vigente").length,
    [assignments],
  );

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full rounded-lg" />
        <Skeleton className="h-40 w-full rounded-lg" />
        <Skeleton className="h-24 w-full rounded-lg" />
      </div>
    );
  }

  return (
    <motion.div
      variants={activeContainerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-lg"
    >
      {/* Card clínico ÚNICO no topo (observações com resolve + cadastro fixo) */}
      <motion.div variants={activeCardVariants}>
        <StudentObservationsCard
          studentId={student.id}
          limitations={student.limitations}
          injuryHistory={student.injury_history}
        />
      </motion.div>

      {/* HERO: adesão do mês */}
      <motion.div variants={activeCardVariants}>
        <Card className="border-l-2 border-l-primary">
          <CardContent className="flex flex-col gap-6 p-6 sm:flex-row sm:items-center">
            {adherencePercent !== null ? (
              <ScoreRing
                value={adherencePercent}
                label="adesão"
                tone={adherenceTone(adherencePercent)}
              />
            ) : (
              <div className="flex h-[150px] w-[150px] shrink-0 items-center justify-center rounded-full border-2 border-dashed border-muted-foreground/30 text-center">
                <span className="px-4 text-xs text-muted-foreground">sem meta semanal definida</span>
              </div>
            )}
            <div className="min-w-0 flex-1 space-y-1">
              <h3 className="text-xl font-bold">
                {sessionsThisMonth}
                {monthlyGoal ? ` de ${monthlyGoal}` : ""} sessões este mês
              </h3>
              <p className="text-sm text-muted-foreground">
                {monthlyGoal
                  ? `Meta: ${student.weekly_sessions_proposed} por semana`
                  : "Defina a meta semanal no cadastro do aluno para acompanhar a adesão."}
              </p>
              <div className="pt-2">
                <p className="mb-1 text-[10.5px] uppercase tracking-widest text-muted-foreground">
                  Últimas 4 semanas
                </p>
                <WeekBars weeks={weekBars} />
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Tiles de suporte */}
      <motion.div
        variants={activeCardVariants}
        className="grid grid-cols-1 gap-3 md:grid-cols-3"
      >
        <MetricTile
          label="Última sessão"
          value={lastSessionDate ? formatRelativeDay(lastSessionDate) : null}
          footnote={lastSessionDate ? format(parseLocalDate(lastSessionDate), "dd/MM/yyyy") : "nenhuma sessão registrada"}
        />
        <MetricTile
          label="Exercícios únicos (30d)"
          value={uniqueExercises30d}
          footnote="variedade no último mês"
        />
        <MetricTile
          label="Prescrições vigentes"
          value={activePrescriptions}
          footnote={activePrescriptions === 0 ? "nenhum plano ativo hoje" : undefined}
        />
      </motion.div>

      {/* Strip Oura compacto (glance + link; a análise vive nas abas donas) */}
      <motion.div variants={activeCardVariants}>
        {ouraConnection?.is_active ? (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between text-base">
                <span className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-primary" />
                  Oura {ouraDateLabel ? `· ${ouraDateLabel.toLowerCase()}` : "· aguardando dados"}
                </span>
                <Button variant="outline" size="sm" onClick={onNavigateToOura}>
                  Abrir histórico
                </Button>
              </CardTitle>
            </CardHeader>
            {latestOuraMetrics && (
              <CardContent className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <MetricTile label="Prontidão" value={latestOuraMetrics.readiness_score} />
                <MetricTile label="Sono" value={latestOuraMetrics.sleep_score} />
                <MetricTile label="Atividade" value={latestOuraMetrics.activity_score} />
                <MetricTile
                  label="Estresse alto"
                  value={
                    latestOuraMetrics.stress_high_time !== null
                      ? `${Math.round(latestOuraMetrics.stress_high_time / 60)}`
                      : null
                  }
                  unit="min"
                />
              </CardContent>
            )}
          </Card>
        ) : (
          <button
            onClick={onNavigateToOura}
            className="flex w-full items-center justify-between rounded-lg border border-dashed border-muted-foreground/30 px-4 py-3 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
          >
            <span className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Oura não conectado
            </span>
            <span className="font-medium text-primary">Conectar</span>
          </button>
        )}
      </motion.div>

      {/* Protocolos de recuperação — fluxo interativo preservado, colapsado */}
      <motion.div variants={activeCardVariants}>
        <Accordion type="single" collapsible>
          <AccordionItem value="protocolos" className="rounded-lg border px-4">
            <AccordionTrigger className="text-sm font-semibold">
              Recomendações de recuperação
            </AccordionTrigger>
            <AccordionContent>
              <ProtocolRecommendationsCard studentId={student.id} />
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </motion.div>
    </motion.div>
  );
};
