import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import StatCard from "@/components/StatCard";
import { StudentObservationsCard } from "@/components/StudentObservationsCard";
import ProtocolRecommendationsCard from "@/components/ProtocolRecommendationsCard";
import TrainingZonesCard from "@/components/TrainingZonesCard";
import { 
  User, 
  Calendar, 
  Activity, 
  Dumbbell, 
  FileText, 
  AlertCircle,
  Edit,
  ExternalLink,
  Weight,
  Ruler,
  Heart,
  TrendingUp,
  Moon,
  Zap,
  BrainCircuit
} from "lucide-react";
import { useMemo } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Student } from "@/hooks/useStudents";
import type { OuraMetrics } from "@/hooks/useOuraMetrics";
import type { PrescriptionAssignment } from "@/hooks/usePrescriptions";

interface StudentOverviewDashboardProps {
  student: Student;
  sessions: any[];
  assignments: PrescriptionAssignment[];
  latestOuraMetrics: OuraMetrics | null | undefined;
  ouraConnection: any;
  onEditStudent: () => void;
  onNavigateToOura: () => void;
}

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

const calculateAge = (birthDate: string | null) => {
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

const calculateIMC = (weight: number | null, height: number | null) => {
  if (!weight || !height) return null;
  const heightM = height / 100;
  return (weight / (heightM * heightM)).toFixed(1);
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
  // Cálculos memoizados
  const age = useMemo(() => calculateAge(student.birth_date), [student.birth_date]);
  const imc = useMemo(() => calculateIMC(student.weight_kg, student.height_cm), [student.weight_kg, student.height_cm]);
  
  const stats = useMemo(() => {
    const totalSessions = sessions?.length || 0;
    
    const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const sessionsThisMonth = sessions?.filter(s => new Date(s.date) >= firstDayOfMonth).length || 0;
    
    const uniqueExercises = new Set(
      sessions?.flatMap(s => s.exercises?.map((e: any) => e.exercise_name) || [])
    ).size;
    
    const today = new Date().toISOString().split('T')[0];
    const activePrescriptions = assignments?.filter(a => 
      a.start_date <= today && (!a.end_date || a.end_date >= today)
    ).length || 0;

    return {
      totalSessions,
      sessionsThisMonth,
      uniqueExercises,
      activePrescriptions
    };
  }, [sessions, assignments]);

  const hasLimitations = student.limitations && student.limitations.trim().length > 0;
  const hasInjuryHistory = student.injury_history && student.injury_history.trim().length > 0;

  return (
    <div className="space-y-lg animate-fade-in">
      {/* Row 1: Perfil + Oura + Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-md">
        {/* Card: Perfil Snapshot */}
        <Card className="hover:shadow-premium transition-smooth">
          <CardHeader className="pb-sm">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-sm">
                <User className="h-5 w-5" />
                Perfil do Aluno
              </CardTitle>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={onEditStudent}
                className="h-8 gap-xs"
              >
                <Edit className="h-4 w-4" />
                Editar
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-md">
            {/* Avatar e Nome */}
            <div className="flex items-center gap-sm">
              <Avatar className="h-16 w-16">
                <AvatarImage src={student.avatar_url || undefined} alt={student.name} />
                <AvatarFallback className="text-lg">
                  {student.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold text-base">{student.name}</p>
                {age && <p className="text-sm text-muted-foreground">{age} anos</p>}
              </div>
            </div>

            {/* Métricas Físicas */}
            <div className="grid grid-cols-2 gap-xs text-sm">
              <div className="flex items-center gap-xs">
                <Weight className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Peso:</span>
                <span className="font-medium">
                  {student.weight_kg ? `${student.weight_kg}kg` : "N/A"}
                </span>
              </div>
              <div className="flex items-center gap-xs">
                <Ruler className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Altura:</span>
                <span className="font-medium">
                  {student.height_cm ? `${student.height_cm}cm` : "N/A"}
                </span>
              </div>
              <div className="flex items-center gap-xs">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">IMC:</span>
                <span className="font-medium">{imc || "N/A"}</span>
              </div>
              <div className="flex items-center gap-xs">
                <Heart className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">FCMax:</span>
                <span className="font-medium">
                  {student.max_heart_rate ? `${student.max_heart_rate} bpm` : "N/A"}
                </span>
              </div>
            </div>

            {/* Objetivos */}
            {student.objectives && student.objectives.length > 0 && (
              <div className="space-y-xs">
                <p className="text-sm font-medium">🎯 Objetivos:</p>
                <div className="flex flex-wrap gap-xs">
                  {student.objectives.map((obj, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {obj}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Sessões/Semana e Nível */}
            <div className="grid grid-cols-2 gap-xs text-sm">
              <div>
                <p className="text-muted-foreground text-xs">Sessões/semana:</p>
                <p className="font-medium">
                  {student.weekly_sessions_proposed ? `${student.weekly_sessions_proposed}x` : "N/A"}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Nível:</p>
                <Badge variant="outline" className="mt-1 text-xs">
                  {student.fitness_level || "N/A"}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card: Oura Hoje */}
        <Card className="hover:shadow-premium transition-smooth">
          <CardHeader className="pb-sm">
            <CardTitle className="flex items-center gap-sm">
              💍 Oura Ring
            </CardTitle>
            <CardDescription>
              {latestOuraMetrics 
                ? format(new Date(latestOuraMetrics.date), "dd 'de' MMMM", { locale: ptBR })
                : "Hoje"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!ouraConnection?.is_active ? (
              <Alert className="border-muted">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  Oura Ring não conectado.{" "}
                  <Button variant="link" className="h-auto p-0" onClick={onNavigateToOura}>
                    Conectar agora →
                  </Button>
                </AlertDescription>
              </Alert>
            ) : !latestOuraMetrics ? (
              <Alert className="border-info/20 bg-info/5">
                <AlertCircle className="h-4 w-4 text-info" />
                <AlertDescription className="text-info-foreground text-sm">
                  Aguardando sincronização...
                </AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-sm">
                {/* Readiness */}
                <div className="flex items-center justify-between p-xs rounded-radius-md border transition-smooth hover:bg-accent/5">
                  <div className="flex items-center gap-sm">
                    <Zap className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Prontidão</span>
                  </div>
                  <Badge className={`${getScoreColor(latestOuraMetrics.readiness_score)} border`}>
                    {latestOuraMetrics.readiness_score || "N/A"} · {getScoreLabel(latestOuraMetrics.readiness_score)}
                  </Badge>
                </div>

                {/* Sleep */}
                <div className="flex items-center justify-between p-xs rounded-radius-md border transition-smooth hover:bg-accent/5">
                  <div className="flex items-center gap-sm">
                    <Moon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Sono</span>
                  </div>
                  <Badge className={`${getScoreColor(latestOuraMetrics.sleep_score)} border`}>
                    {latestOuraMetrics.sleep_score || "N/A"} · {getScoreLabel(latestOuraMetrics.sleep_score)}
                  </Badge>
                </div>

                {/* Activity */}
                <div className="flex items-center justify-between p-xs rounded-radius-md border transition-smooth hover:bg-accent/5">
                  <div className="flex items-center gap-sm">
                    <Activity className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Atividade</span>
                  </div>
                  <Badge className={`${getScoreColor(latestOuraMetrics.activity_score)} border`}>
                    {latestOuraMetrics.activity_score || "N/A"} · {getScoreLabel(latestOuraMetrics.activity_score)}
                  </Badge>
                </div>

                {/* Stress */}
                {latestOuraMetrics.stress_high_time !== null && (
                  <div className="flex items-center justify-between p-xs rounded-radius-md border transition-smooth hover:bg-accent/5">
                    <div className="flex items-center gap-sm">
                      <BrainCircuit className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Estresse</span>
                    </div>
                    <Badge className={`${getScoreColor(latestOuraMetrics.stress_high_time > 120 ? 70 : latestOuraMetrics.stress_high_time > 60 ? 85 : 90)} border`}>
                      {Math.round(latestOuraMetrics.stress_high_time / 60)}min · {latestOuraMetrics.stress_high_time > 120 ? "Alto" : latestOuraMetrics.stress_high_time > 60 ? "Médio" : "Baixo"}
                    </Badge>
                  </div>
                )}

                {/* Link para histórico */}
                <Button 
                  variant="link" 
                  className="w-full justify-start h-auto p-0 text-xs"
                  onClick={onNavigateToOura}
                >
                  <ExternalLink className="h-3 w-3 mr-1" />
                  Ver histórico completo
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Card: Stats de Treino (Grid 2x2) */}
        <div className="grid grid-cols-2 gap-md">
          <StatCard
            title="Total"
            value={stats.totalSessions.toString()}
            subtitle="sessões"
            icon={Calendar}
            gradient={true}
          />
          <StatCard
            title="Este Mês"
            value={stats.sessionsThisMonth.toString()}
            subtitle="sessões"
            icon={Activity}
          />
          <StatCard
            title="Exercícios"
            value={stats.uniqueExercises.toString()}
            subtitle="únicos"
            icon={Dumbbell}
          />
          <StatCard
            title="Prescrições"
            value={stats.activePrescriptions.toString()}
            subtitle="ativas"
            icon={FileText}
          />
        </div>
      </div>

      {/* Row 2: Observações Importantes (full-width) */}
      <StudentObservationsCard studentId={student.id} />

      {/* Row 3: Zonas + Recomendações */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
        <TrainingZonesCard maxHeartRate={student.max_heart_rate} />
        <ProtocolRecommendationsCard studentId={student.id} />
      </div>

      {/* Row 4: Considerações Médicas (full-width) */}
      {(hasLimitations || hasInjuryHistory) && (
        <Card className="col-span-full border-warning/50 bg-warning/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-sm text-warning-foreground">
              🩺 Considerações Médicas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-md">
            {hasLimitations && (
              <div className="space-y-xs">
                <p className="font-semibold text-sm flex items-center gap-xs text-warning-foreground">
                  <AlertCircle className="h-4 w-4" />
                  Limitações:
                </p>
                <p className="text-sm text-foreground whitespace-pre-wrap pl-5">
                  {student.limitations}
                </p>
              </div>
            )}
            {hasInjuryHistory && (
              <div className="space-y-xs">
                <p className="font-semibold text-sm flex items-center gap-xs text-warning-foreground">
                  🏥 Histórico de Lesões:
                </p>
                <p className="text-sm text-foreground whitespace-pre-wrap pl-5">
                  {student.injury_history}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
