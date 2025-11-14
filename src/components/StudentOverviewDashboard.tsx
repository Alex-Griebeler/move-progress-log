import { useMemo } from "react";
import { Calendar, Activity, Dumbbell, FileText, User, Weight, Ruler, Heart, Target, CalendarDays, TrendingUp, AlertCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { StatCard } from "@/components/StatCard";
import { StudentObservationsCard } from "@/components/StudentObservationsCard";
import { TrainingZonesCard } from "@/components/TrainingZonesCard";
import { ProtocolRecommendationsCard } from "@/components/ProtocolRecommendationsCard";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { getObjectiveLabel } from "@/constants/objectives";
import type { Tables } from "@/integrations/supabase/types";

type Student = Tables<"students">;
type WorkoutSession = Tables<"workout_sessions">;
type PrescriptionAssignment = Tables<"prescription_assignments">;
type OuraMetrics = Tables<"oura_metrics">;
type OuraConnection = Tables<"oura_connections">;

interface StudentOverviewDashboardProps {
  student: Student;
  sessions: WorkoutSession[];
  assignments: PrescriptionAssignment[];
  latestOuraMetrics?: OuraMetrics;
  ouraConnection?: OuraConnection;
  onEditStudent: () => void;
  onNavigateToOura: () => void;
}

const calculateAge = (birthDate: string | null): number | null => {
  if (!birthDate) return null;
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
};

const calculateIMC = (weight: number | null, height: number | null): string | null => {
  if (!weight || !height) return null;
  const heightInMeters = height / 100;
  const imc = weight / (heightInMeters * heightInMeters);
  return imc.toFixed(1);
};

const getScoreColor = (score: number | null) => {
  if (!score) return "bg-muted text-muted-foreground border-muted";
  if (score >= 85) return "bg-success/10 text-success border-success/20";
  if (score >= 70) return "bg-warning/10 text-warning border-warning/20";
  return "bg-destructive/10 text-destructive border-destructive/20";
};

const getScoreLabel = (score: number | null) => {
  if (!score) return "N/A";
  if (score >= 85) return "Ótimo";
  if (score >= 70) return "Bom";
  return "Atenção";
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

  const stats = useMemo(() => {
    const totalSessions = sessions?.length || 0;
    
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const sessionsThisMonth = sessions?.filter(s => new Date(s.date) >= firstDayOfMonth).length || 0;
    
    // Count unique exercise names from all sessions
    const uniqueExercises = new Set<string>();
    sessions?.forEach(session => {
      // Note: exercises would need to be fetched separately in real implementation
      // For now, we'll use a placeholder
    });
    
    const today = new Date().toISOString().split('T')[0];
    const activePrescriptions = assignments?.filter(a => 
      a.start_date <= today && (!a.end_date || a.end_date >= today)
    ).length || 0;

    return {
      totalSessions,
      sessionsThisMonth,
      uniqueExercises: 0, // Placeholder - would need exercise data
      activePrescriptions,
    };
  }, [sessions, assignments]);

  return (
    <div className="space-y-lg animate-fade-in">
      {/* Row 1: Perfil + Oura + Stats (3 cols) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-md">
        {/* Card: Perfil Snapshot */}
        <Card className="hover:shadow-premium transition-smooth">
          <CardHeader className="pb-sm flex flex-row items-start justify-between">
            <div className="flex items-center gap-sm">
              <User className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Perfil do Aluno</CardTitle>
            </div>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={onEditStudent}
              aria-label="Editar perfil do aluno"
            >
              Editar
            </Button>
          </CardHeader>
          <CardContent className="space-y-md">
            <div className="flex items-center gap-sm">
              <Avatar className="h-16 w-16">
                <AvatarImage src={student.avatar_url || undefined} alt={student.name} />
                <AvatarFallback className="bg-primary/10 text-primary text-xl">
                  {student.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold text-foreground">{student.name}</p>
                {age && <p className="text-sm text-muted-foreground">{age} anos</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-xs text-sm">
              <div className="flex items-center gap-xs text-muted-foreground">
                <Weight className="h-4 w-4" />
                <span>{student.weight_kg ? `${student.weight_kg}kg` : "N/A"}</span>
              </div>
              <div className="flex items-center gap-xs text-muted-foreground">
                <Ruler className="h-4 w-4" />
                <span>{student.height_cm ? `${student.height_cm}cm` : "N/A"}</span>
              </div>
              <div className="flex items-center gap-xs text-muted-foreground">
                <Activity className="h-4 w-4" />
                <span>IMC: {imc || "N/A"}</span>
              </div>
              <div className="flex items-center gap-xs text-muted-foreground">
                <Heart className="h-4 w-4" />
                <span>{student.max_heart_rate ? `${student.max_heart_rate} bpm` : "N/A"}</span>
              </div>
            </div>

            {student.objectives && student.objectives.length > 0 && (
              <div className="space-y-xs">
                <p className="text-sm font-medium text-foreground flex items-center gap-xs">
                  <Target className="h-4 w-4" />
                  Objetivos:
                </p>
                <div className="flex flex-wrap gap-xs">
                  {student.objectives.map((obj) => (
                    <Badge 
                      key={obj} 
                      variant="secondary" 
                      className="text-xs"
                    >
                      {getObjectiveLabel(obj)}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-xs text-sm pt-xs border-t border-border">
              <div className="flex items-center gap-xs text-muted-foreground">
                <CalendarDays className="h-4 w-4" />
                <span>{student.weekly_sessions_proposed || 0}x/semana</span>
              </div>
              <div className="flex items-center gap-xs text-muted-foreground">
                <TrendingUp className="h-4 w-4" />
                <span className="capitalize">{student.fitness_level || "N/A"}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card: Oura Hoje */}
        <Card className="hover:shadow-premium transition-smooth">
          <CardHeader className="pb-sm">
            <div className="flex items-center gap-sm">
              <span className="text-2xl">💍</span>
              <div>
                <CardTitle className="text-lg">Oura Ring</CardTitle>
                {latestOuraMetrics && (
                  <CardDescription className="text-xs">
                    {format(new Date(latestOuraMetrics.date), "dd/MM/yyyy", { locale: ptBR })}
                  </CardDescription>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-sm">
            {!ouraConnection?.is_active ? (
              <Alert className="border-muted">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  Oura Ring não conectado.{" "}
                  <Button 
                    variant="link" 
                    className="p-0 h-auto text-sm"
                    onClick={onNavigateToOura}
                  >
                    Conectar agora →
                  </Button>
                </AlertDescription>
              </Alert>
            ) : !latestOuraMetrics ? (
              <Alert className="border-info/20 bg-info/5">
                <AlertCircle className="h-4 w-4 text-info" />
                <AlertDescription className="text-sm text-info-foreground">
                  Aguardando sincronização do Oura Ring...
                </AlertDescription>
              </Alert>
            ) : (
              <>
                <div className="space-y-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">🟢 Prontidão</span>
                    <div className="flex items-center gap-xs">
                      <Badge className={getScoreColor(latestOuraMetrics.readiness_score)}>
                        {latestOuraMetrics.readiness_score || "N/A"}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {getScoreLabel(latestOuraMetrics.readiness_score)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">🌙 Sono</span>
                    <div className="flex items-center gap-xs">
                      <Badge className={getScoreColor(latestOuraMetrics.sleep_score)}>
                        {latestOuraMetrics.sleep_score || "N/A"}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {getScoreLabel(latestOuraMetrics.sleep_score)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">🏃 Atividade</span>
                    <div className="flex items-center gap-xs">
                      <Badge className={getScoreColor(latestOuraMetrics.activity_score)}>
                        {latestOuraMetrics.activity_score || "N/A"}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {getScoreLabel(latestOuraMetrics.activity_score)}
                      </span>
                    </div>
                  </div>

                  {latestOuraMetrics.stress_high_time !== null && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">😰 Estresse</span>
                      <div className="flex items-center gap-xs">
                        <Badge className={
                          latestOuraMetrics.stress_high_time < 180 
                            ? "bg-success/10 text-success border-success/20"
                            : latestOuraMetrics.stress_high_time < 300
                            ? "bg-warning/10 text-warning border-warning/20"
                            : "bg-destructive/10 text-destructive border-destructive/20"
                        }>
                          {Math.round(latestOuraMetrics.stress_high_time)} min
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {latestOuraMetrics.stress_high_time < 180 ? "Baixo" : 
                           latestOuraMetrics.stress_high_time < 300 ? "Moderado" : "Alto"}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="w-full text-xs"
                  onClick={onNavigateToOura}
                >
                  ℹ️ Ver histórico completo →
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* Card: Stats Treino (grid 2x2 interno) */}
        <div className="grid grid-cols-2 gap-md">
          <StatCard
            title="Total"
            value={stats.totalSessions}
            subtitle="sessões"
            icon={Calendar}
            gradient={true}
          />
          <StatCard
            title="Este Mês"
            value={stats.sessionsThisMonth}
            subtitle="sessões"
            icon={Activity}
          />
          <StatCard
            title="Exercícios"
            value={stats.uniqueExercises}
            subtitle="únicos"
            icon={Dumbbell}
          />
          <StatCard
            title="Prescrições"
            value={stats.activePrescriptions}
            subtitle="ativas"
            icon={FileText}
          />
        </div>
      </div>

      {/* Row 2: Observações Importantes (full-width) */}
      <StudentObservationsCard 
        studentId={student.id}
        className="col-span-full"
      />

      {/* Row 3: Zonas + Recomendações (2 cols) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
        <TrainingZonesCard maxHeartRate={student.max_heart_rate} />
        <ProtocolRecommendationsCard studentId={student.id} />
      </div>

      {/* Row 4: Considerações Médicas (full-width) */}
      {(student.limitations || student.injury_history) && (
        <Card className="col-span-full border-warning/50 bg-warning/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-sm text-warning-foreground">
              <AlertCircle className="h-5 w-5" />
              Considerações Médicas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-md">
            {student.limitations && (
              <div className="space-y-xs">
                <p className="text-sm font-semibold text-foreground">⚠️ Limitações:</p>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap pl-md">
                  {student.limitations}
                </p>
              </div>
            )}

            {student.injury_history && (
              <div className="space-y-xs">
                <p className="text-sm font-semibold text-foreground">🏥 Histórico de Lesões:</p>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap pl-md">
                  {student.injury_history}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {!student.limitations && !student.injury_history && (
        <Card className="col-span-full border-muted bg-muted/5">
          <CardContent className="py-md">
            <p className="text-sm text-muted-foreground text-center">
              ✅ Nenhuma consideração médica registrada
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
