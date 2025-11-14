import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dumbbell, Calendar, TrendingUp, Target, AlertCircle, Activity, Heart, User, Flame, Zap } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { format, differenceInYears, differenceInMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Student } from "@/hooks/useStudents";
import StatCard from "./StatCard";
import TrainingZonesCard from "./TrainingZonesCard";
import { StudentObservationsCard } from "./StudentObservationsCard";
import ProtocolRecommendationsCard from "./ProtocolRecommendationsCard";
import { useMemo } from "react";
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
  return (weight / (heightInMeters * heightInMeters)).toFixed(1);
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

  // Key statistics
  const totalSessions = useMemo(() => sessions?.length || 0, [sessions]);
  
  const sessionsThisMonth = useMemo(() => {
    if (!sessions) return 0;
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    return sessions.filter(s => new Date(s.date) >= firstDayOfMonth).length;
  }, [sessions]);

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
      {/* Profile Snapshot - Hero Treatment */}
      <motion.div variants={cardVariants}>
        <Card className="card-glass-hover bg-gradient-card border-primary/20 overflow-hidden">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-md">
                <Avatar className="h-24 w-24 ring-2 ring-primary/20 ring-offset-2 ring-offset-background">
                  <AvatarImage src={student.avatar_url || undefined} />
                  <AvatarFallback>
                    <User className="h-12 w-12" />
                  </AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="text-3xl font-bold mb-xs">{student.name}</CardTitle>
                  <CardDescription className="text-base">
                    {age ? `${age} anos` : "Idade não informada"}
                    {student.fitness_level && ` • ${student.fitness_level}`}
                  </CardDescription>
                </div>
              </div>
              <button
                onClick={onEditStudent}
                className="text-muted-foreground hover:text-foreground transition-all hover:scale-110"
                aria-label="Editar dados do aluno"
              >
                <Calendar className="h-5 w-5" />
              </button>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-lg">
            {/* Physical Metrics Grid */}
            <div>
              <h4 className="text-sm font-semibold text-muted-foreground mb-sm uppercase tracking-wide">Métricas Físicas</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-sm">
                <div className="text-center p-md rounded-lg bg-background/80 border border-border/50 hover:border-primary/30 transition-colors">
                  <p className="text-display-md text-display-number text-gradient-primary mb-xs">{student.weight_kg || "--"}</p>
                  <p className="text-xs font-medium text-muted-foreground">Peso (kg)</p>
                </div>
                <div className="text-center p-md rounded-lg bg-background/80 border border-border/50 hover:border-primary/30 transition-colors">
                  <p className="text-display-md text-display-number text-gradient-primary mb-xs">{student.height_cm || "--"}</p>
                  <p className="text-xs font-medium text-muted-foreground">Altura (cm)</p>
                </div>
                <div className="text-center p-md rounded-lg bg-background/80 border border-border/50 hover:border-primary/30 transition-colors">
                  <p className="text-display-md text-display-number text-gradient-primary mb-xs">{imc || "--"}</p>
                  <p className="text-xs font-medium text-muted-foreground">IMC</p>
                </div>
                <div className="text-center p-md rounded-lg bg-background/80 border border-border/50 hover:border-primary/30 transition-colors">
                  <p className="text-display-md text-display-number text-gradient-primary mb-xs">{student.max_heart_rate || "--"}</p>
                  <p className="text-xs font-medium text-muted-foreground">FC Máx (bpm)</p>
                </div>
              </div>
            </div>

            {/* Objectives with Rich Badges */}
            {student.objectives && student.objectives.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-muted-foreground mb-sm flex items-center gap-xs uppercase tracking-wide">
                  <Target className="h-4 w-4" />
                  Objetivos
                </h4>
                <div className="flex flex-wrap gap-sm">
                  {student.objectives.map((obj) => {
                    const config = OBJECTIVE_CONFIG[obj] || { 
                      icon: <Target className="h-3.5 w-3.5" />, 
                      className: "",
                      label: obj.replace(/_/g, " ")
                    };
                    return (
                      <Badge 
                        key={obj} 
                        className={`${config.className} flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold`}
                      >
                        {config.icon}
                        {config.label}
                      </Badge>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Training Info */}
            <Separator />
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-xs text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>
                  {student.weekly_sessions_proposed 
                    ? `${student.weekly_sessions_proposed}x por semana`
                    : "Frequência não definida"
                  }
                </span>
              </div>
              {monthsAtFabrik > 0 && (
                <div className="text-muted-foreground font-medium">
                  {monthsAtFabrik} {monthsAtFabrik === 1 ? 'mês' : 'meses'} na Fabrik
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Oura Ring Metrics - Premium Ring Progress */}
      <motion.div variants={cardVariants}>
        <Card className="card-glass-hover bg-gradient-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-sm">
              <Activity className="h-5 w-5 text-primary" />
              💍 Oura Ring
            </CardTitle>
            <CardDescription>
              {latestOuraMetrics?.date 
                ? `Hoje, ${format(new Date(latestOuraMetrics.date), "d 'de' MMMM", { locale: ptBR })}`
                : ouraConnection?.is_active
                  ? "Conectado, aguardando dados"
                  : "Não conectado"
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {ouraConnection?.is_active ? (
              latestOuraMetrics ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-lg">
                  {/* Readiness Ring */}
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
                  </div>

                  {/* Sleep Ring */}
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
                  </div>

                  {/* Activity Ring */}
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
                  </div>

                  {/* Stress Minutes */}
                  {latestOuraMetrics.stress_high_time !== null && (
                    <div className="flex flex-col items-center justify-center">
                      <div className="text-display-md text-display-number text-gradient-primary mb-xs">
                        {Math.round((latestOuraMetrics.stress_high_time || 0) / 60)}
                      </div>
                      <p className="text-sm font-semibold mb-xs">Estresse</p>
                      <p className="text-xs text-muted-foreground">minutos alto</p>
                    </div>
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
        />
        <StatCard
          title="Sessões este Mês"
          value={sessionsThisMonth}
          icon={Calendar}
          subtitle={`Meta: ${student.weekly_sessions_proposed ? student.weekly_sessions_proposed * 4 : '?'} sessões/mês`}
        />
        <StatCard
          title="Exercícios Únicos"
          value={uniqueExercises}
          icon={TrendingUp}
          subtitle="Variedade de exercícios"
        />
        <StatCard
          title="Prescrições Ativas"
          value={activePrescriptions}
          icon={Target}
          subtitle="Atualmente atribuídas"
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
      {(student.limitations || student.injury_history) && (
        <motion.div variants={cardVariants}>
          <Card className="relative overflow-hidden border-2 border-warning bg-gradient-to-br from-warning/5 via-warning/10 to-warning/5">
            {/* Animated shimmer effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-warning/20 to-transparent animate-shimmer" />
            
            <CardHeader className="relative z-10">
              <CardTitle className="flex items-center gap-sm text-warning-foreground">
                <div className="p-2 bg-warning/20 rounded-full">
                  <AlertCircle className="h-6 w-6 text-warning animate-pulse-slow" />
                </div>
                ⚠️ Considerações Médicas Críticas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-md relative z-10">
              {student.limitations && (
                <div className="p-md rounded-lg bg-background/50 border border-warning/20">
                  <h4 className="text-sm font-semibold mb-sm text-warning-foreground flex items-center gap-xs">
                    <AlertCircle className="h-4 w-4" />
                    Limitações:
                  </h4>
                  <p className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">{student.limitations}</p>
                </div>
              )}
              {student.injury_history && (
                <div className="p-md rounded-lg bg-background/50 border border-warning/20">
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
