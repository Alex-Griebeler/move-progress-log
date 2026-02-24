import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dumbbell, Calendar, TrendingUp, Target, AlertCircle, Activity, Heart, User, Flame, Zap, X } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { format, differenceInYears, differenceInMonths, isToday, isYesterday, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Student } from "@/hooks/useStudents";
import StatCard from "./StatCard";
import TrainingZonesCard from "./TrainingZonesCard";
import { StudentObservationsCard } from "./StudentObservationsCard";
import ProtocolRecommendationsCard from "./ProtocolRecommendationsCard";
import { OuraConnectionStatus } from "./OuraConnectionStatus";
import { OuraRingsSkeleton } from "./skeletons/OuraRingsSkeleton";
import { useOuraTrends } from "@/hooks/useOuraTrends";
import { useMemo, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';

interface StudentOverviewDashboardProps {
  student: Student;
  sessions: any[];
  assignments: any[];
  latestOuraMetrics: any;
  ouraConnection: any;
  onEditStudent: () => void;
  onNavigateToOura: () => void;
}

// Helper functions
const getScoreColor = (score: number | null | undefined) => {
  if (!score) return "text-muted-foreground";
  if (score >= 85) return "text-success";
  if (score >= 70) return "text-warning";
  return "text-destructive";
};

const getScoreLabel = (score: number | null | undefined) => {
  if (!score) return "Sem dados";
  if (score >= 85) return "Ótimo";
  if (score >= 70) return "Bom";
  return "Precisa atenção";
};

const getProgressColor = (score: number | null | undefined) => {
  if (!score) return "#94a3b8";
  if (score >= 85) return "hsl(142 76% 45%)";
  if (score >= 70) return "hsl(48 96% 53%)";
  return "hsl(0 84% 60%)";
};

const calculateAge = (birthDate: string | null) => {
  if (!birthDate) return null;
  return differenceInYears(new Date(), new Date(birthDate));
};

const calculateIMC = (weight: number | null, height: number | null) => {
  if (!weight || !height) return null;
  const heightInMeters = height / 100;
  return Number((weight / (heightInMeters * heightInMeters)).toFixed(1));
};

// Objective icons and styles
const OBJECTIVE_CONFIG: Record<string, { icon: React.ReactNode; className: string; label: string }> = {
  emagrecimento: { 
    icon: <Flame className="h-3.5 w-3.5" />, 
    className: "badge-emagrecimento",
    label: "Emagrecimento"
  },
  hipertrofia: { 
    icon: <Dumbbell className="h-3.5 w-3.5" />, 
    className: "badge-hipertrofia",
    label: "Hipertrofia"
  },
  saude_longevidade: { 
    icon: <Heart className="h-3.5 w-3.5" />, 
    className: "badge-saude",
    label: "Saúde & Longevidade"
  },
  performance_esportiva: { 
    icon: <Zap className="h-3.5 w-3.5" />, 
    className: "badge-performance",
    label: "Performance Esportiva"
  },
  reabilitacao: { 
    icon: <Activity className="h-3.5 w-3.5" />, 
    className: "badge-reabilitacao",
    label: "Reabilitação"
  }
};

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

export const StudentOverviewDashboard = ({
  student,
  sessions,
  assignments,
  latestOuraMetrics,
  ouraConnection,
  onEditStudent,
  onNavigateToOura,
}: StudentOverviewDashboardProps) => {
  const age = useMemo(() => calculateAge(student.birth_date), [student.birth_date]);
  const imc = useMemo(() => calculateIMC(student.weight_kg, student.height_cm), [student.weight_kg, student.height_cm]);
  
  const monthsAtFabrik = useMemo(() => {
    return differenceInMonths(new Date(), new Date(student.created_at));
  }, [student.created_at]);

  // Medical alert dismiss state
  const [medicalAlertDismissed, setMedicalAlertDismissed] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem(`medical-alert-dismissed-${student.id}`);
    if (dismissed === 'true') {
      setMedicalAlertDismissed(true);
    }
  }, [student.id]);

  const handleDismissMedicalAlert = () => {
    localStorage.setItem(`medical-alert-dismissed-${student.id}`, 'true');
    setMedicalAlertDismissed(true);
  };

  // Fetch Oura trends
  const { data: ouraTrends, isLoading: trendsLoading } = useOuraTrends(student.id);

  // Format Oura date
  const ouraDateLabel = useMemo(() => {
    if (!latestOuraMetrics?.date) return null;
    
    const date = parseISO(latestOuraMetrics.date);
    if (isToday(date)) return "Hoje";
    if (isYesterday(date)) return "Ontem";
    return format(date, "d 'de' MMMM", { locale: ptBR });
  }, [latestOuraMetrics?.date]);

  // Key statistics
  const totalSessions = useMemo(() => sessions?.length || 0, [sessions]);
  
  const sessionsThisMonth = useMemo(() => {
    if (!sessions) return 0;
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    return sessions.filter(s => new Date(s.date) >= firstDayOfMonth).length;
  }, [sessions]);

  // Calculate monthly goal and progress
  const monthlyGoal = student.weekly_sessions_proposed ? student.weekly_sessions_proposed * 4 : null;
  const monthlyProgress = monthlyGoal ? (sessionsThisMonth / monthlyGoal) * 100 : undefined;

  const uniqueExercises = useMemo(() => {
    if (!sessions) return 0;
    const exerciseNames = new Set<string>();
    sessions.forEach(session => {
      session.exercises?.forEach((ex: any) => {
        exerciseNames.add(ex.exercise_name);
      });
    });
    return exerciseNames.size;
  }, [sessions]);

  const activePrescriptions = useMemo(() => {
    if (!assignments) return 0;
    const today = new Date().toISOString().split('T')[0];
    return assignments.filter(a => 
      a.start_date <= today && (!a.end_date || a.end_date >= today)
    ).length;
  }, [assignments]);

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-lg"
    >
      {/* Oura Ring Metrics - Premium Ring Progress */}
      <motion.div variants={cardVariants}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-sm">
              <Activity className="h-5 w-5 text-primary" />
              💍 Oura Ring
            </CardTitle>
            <CardDescription>
              {ouraDateLabel || (ouraConnection?.is_active
                ? "Conectado, aguardando dados"
                : "Não conectado"
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {ouraConnection?.is_active ? (
              trendsLoading ? (
                <OuraRingsSkeleton />
              ) : latestOuraMetrics ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-lg">
                  {/* Readiness Ring */}
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex flex-col items-center">
                          <div className="w-24 h-24 mb-sm">
                            <CircularProgressbar
                              value={latestOuraMetrics.readiness_score || 0}
                              text={`${latestOuraMetrics.readiness_score || 0}`}
                              styles={buildStyles({
                                pathColor: getProgressColor(latestOuraMetrics.readiness_score),
                                textColor: 'hsl(var(--foreground))',
                                trailColor: 'hsl(var(--muted))',
                                textSize: '24px',
                              })}
                            />
                          </div>
                          <p className="text-sm font-semibold mb-xs">Prontidão</p>
                          <p className={`text-xs font-medium ${getScoreColor(latestOuraMetrics.readiness_score)}`}>
                            {getScoreLabel(latestOuraMetrics.readiness_score)}
                          </p>
                          {ouraTrends?.readiness && (
                            <Badge variant="secondary" className="mt-xs text-xs">
                              {ouraTrends.readiness.changeLabel}
                            </Badge>
                          )}
                        </div>
                      </TooltipTrigger>
                      {ouraTrends?.readiness && (
                        <TooltipContent>
                          <p className="text-xs">
                            Média 7 dias: {ouraTrends.readiness.average7d} 
                            {ouraTrends.readiness.vsAverage && ` (${ouraTrends.readiness.vsAverage > 0 ? '+' : ''}${ouraTrends.readiness.vsAverage})`}
                          </p>
                        </TooltipContent>
                      )}
                    </Tooltip>
                  </TooltipProvider>

                  {/* Sleep Ring */}
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex flex-col items-center">
                          <div className="w-24 h-24 mb-sm">
                            <CircularProgressbar
                              value={latestOuraMetrics.sleep_score || 0}
                              text={`${latestOuraMetrics.sleep_score || 0}`}
                              styles={buildStyles({
                                pathColor: getProgressColor(latestOuraMetrics.sleep_score),
                                textColor: 'hsl(var(--foreground))',
                                trailColor: 'hsl(var(--muted))',
                                textSize: '24px',
                              })}
                            />
                          </div>
                          <p className="text-sm font-semibold mb-xs">Sono</p>
                          <p className={`text-xs font-medium ${getScoreColor(latestOuraMetrics.sleep_score)}`}>
                            {getScoreLabel(latestOuraMetrics.sleep_score)}
                          </p>
                          {ouraTrends?.sleep && (
                            <Badge variant="secondary" className="mt-xs text-xs">
                              {ouraTrends.sleep.changeLabel}
                            </Badge>
                          )}
                        </div>
                      </TooltipTrigger>
                      {ouraTrends?.sleep && (
                        <TooltipContent>
                          <p className="text-xs">
                            Média 7 dias: {ouraTrends.sleep.average7d}
                            {ouraTrends.sleep.vsAverage && ` (${ouraTrends.sleep.vsAverage > 0 ? '+' : ''}${ouraTrends.sleep.vsAverage})`}
                          </p>
                        </TooltipContent>
                      )}
                    </Tooltip>
                  </TooltipProvider>

                  {/* Activity Ring */}
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex flex-col items-center">
                          <div className="w-24 h-24 mb-sm">
                            <CircularProgressbar
                              value={latestOuraMetrics.activity_score || 0}
                              text={`${latestOuraMetrics.activity_score || 0}`}
                              styles={buildStyles({
                                pathColor: getProgressColor(latestOuraMetrics.activity_score),
                                textColor: 'hsl(var(--foreground))',
                                trailColor: 'hsl(var(--muted))',
                                textSize: '24px',
                              })}
                            />
                          </div>
                          <p className="text-sm font-semibold mb-xs">Atividade</p>
                          <p className={`text-xs font-medium ${getScoreColor(latestOuraMetrics.activity_score)}`}>
                            {getScoreLabel(latestOuraMetrics.activity_score)}
                          </p>
                          {ouraTrends?.activity && (
                            <Badge variant="secondary" className="mt-xs text-xs">
                              {ouraTrends.activity.changeLabel}
                            </Badge>
                          )}
                        </div>
                      </TooltipTrigger>
                      {ouraTrends?.activity && (
                        <TooltipContent>
                          <p className="text-xs">
                            Média 7 dias: {ouraTrends.activity.average7d}
                            {ouraTrends.activity.vsAverage && ` (${ouraTrends.activity.vsAverage > 0 ? '+' : ''}${ouraTrends.activity.vsAverage})`}
                          </p>
                        </TooltipContent>
                      )}
                    </Tooltip>
                  </TooltipProvider>

                  {/* Stress Minutes */}
                  {latestOuraMetrics.stress_high_time !== null && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex flex-col items-center justify-center">
                            <div className="text-display-md text-display-number text-foreground mb-xs">
                              {Math.round((latestOuraMetrics.stress_high_time || 0) / 60)}
                            </div>
                            <p className="text-sm font-semibold mb-xs">Estresse</p>
                            <p className="text-xs text-muted-foreground">minutos alto</p>
                            {ouraTrends?.stress && ouraTrends.stress.changeLabel && (
                              <Badge variant="secondary" className="mt-xs text-xs">
                                {ouraTrends.stress.changeLabel}
                              </Badge>
                            )}
                          </div>
                        </TooltipTrigger>
                        {ouraTrends?.stress && (
                          <TooltipContent>
                            <p className="text-xs">
                              Média 7 dias: {Math.round((ouraTrends.stress.average7d || 0))} min
                            </p>
                          </TooltipContent>
                        )}
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-md">
                  Nenhum dado disponível ainda. Os dados serão sincronizados automaticamente.
                </p>
              )
            ) : (
              <button
                onClick={onNavigateToOura}
                className="w-full p-lg rounded-lg border-2 border-dashed border-muted-foreground/30 hover:border-primary/50 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <Activity className="h-10 w-10 mx-auto mb-sm text-muted-foreground" />
                <p className="text-sm font-semibold">Conectar Oura Ring</p>
                <p className="text-xs text-muted-foreground mt-xs">Clique para configurar</p>
              </button>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Training Statistics - Rich Context */}
      <motion.div 
        variants={cardVariants}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-md"
      >
        <StatCard
          title="Total de Sessões"
          value={totalSessions}
          icon={Dumbbell}
          gradient
          subtitle={`${sessionsThisMonth} este mês`}
        />
        <StatCard
          title="Sessões este Mês"
          value={sessionsThisMonth}
          icon={Calendar}
          subtitle={monthlyGoal ? `Meta: ${monthlyGoal} sessões/mês` : undefined}
          progress={monthlyProgress}
          badge={
            monthlyGoal && sessionsThisMonth >= monthlyGoal 
              ? "🎯 Meta atingida!" 
              : sessionsThisMonth >= (monthlyGoal || 0) * 0.75 
                ? "🔥 Quase lá!" 
                : undefined
          }
        />
        <StatCard
          title="Exercícios Únicos"
          value={uniqueExercises}
          icon={TrendingUp}
          subtitle="Variedade no treinamento"
          badge={uniqueExercises > 50 ? "💪 Alta variedade" : undefined}
        />
        <StatCard
          title="Prescrições Ativas"
          value={activePrescriptions}
          icon={Target}
          subtitle="Planos de treino ativos"
        />
      </motion.div>

      {/* Important Observations */}
      <motion.div variants={cardVariants}>
        <StudentObservationsCard studentId={student.id} />
      </motion.div>

      {/* Training Zones and Protocol Recommendations */}
      <motion.div 
        variants={cardVariants}
        className="grid grid-cols-1 lg:grid-cols-2 gap-md"
      >
        <TrainingZonesCard maxHeartRate={student.max_heart_rate} />
        <ProtocolRecommendationsCard studentId={student.id} />
      </motion.div>

      {/* Medical Considerations - Premium Alert */}
      {(student.limitations || student.injury_history) && !medicalAlertDismissed && (
        <motion.div variants={cardVariants}>
          <Card className="relative overflow-hidden border-2 border-warning/50 bg-gradient-to-br from-warning/5 via-background to-warning/5">
            {/* Subtle Corner Shimmer */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-warning/20 via-transparent to-transparent animate-shimmer pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-warning/20 via-transparent to-transparent animate-shimmer pointer-events-none" />
            
            <CardHeader className="relative z-10">
              <div className="flex items-start justify-between gap-md">
                <CardTitle className="flex items-center gap-sm text-warning-foreground">
                  <div className="p-2 bg-warning/20 rounded-full">
                    <AlertCircle className="h-5 w-5 text-warning animate-pulse-slow" />
                  </div>
                  ⚠️ Considerações Médicas Importantes
                </CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-warning/10"
                  onClick={handleDismissMedicalAlert}
                  aria-label="Dispensar alerta"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-md relative z-10">
              {student.limitations && (
                <div className="p-md rounded-lg bg-background/70 border border-warning/30">
                  <h4 className="text-sm font-semibold mb-sm text-warning-foreground flex items-center gap-xs">
                    <AlertCircle className="h-4 w-4" />
                    Limitações:
                  </h4>
                  <p className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">{student.limitations}</p>
                </div>
              )}
              {student.injury_history && (
                <div className="p-md rounded-lg bg-background/70 border border-warning/30">
                  <h4 className="text-sm font-semibold mb-sm text-warning-foreground flex items-center gap-xs">
                    <AlertCircle className="h-4 w-4" />
                    Histórico de Lesões:
                  </h4>
                  <p className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">{student.injury_history}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}
    </motion.div>
  );
};
