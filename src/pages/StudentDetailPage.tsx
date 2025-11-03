import { useParams, useNavigate } from "react-router-dom";
import { useStudents } from "@/hooks/useStudents";
import { useStudentPrescriptions, useSessionsWithExercises } from "@/hooks/useStudentDetail";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Calendar, Activity, FileText, TrendingUp, Info, Mic } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Alert, AlertDescription } from "@/components/ui/alert";
import WorkoutCard from "@/components/WorkoutCard";
import ExerciseHistoryCard from "@/components/ExerciseHistoryCard";
import TrainingZonesCard from "@/components/TrainingZonesCard";
import ProtocolRecommendationsCard from "@/components/ProtocolRecommendationsCard";
import OuraMetricsCard from "@/components/OuraMetricsCard";
import { OuraConnectionCard } from "@/components/OuraConnectionCard";
import { OuraActivityCard } from "@/components/OuraActivityCard";
import { OuraSleepDetailCard } from "@/components/OuraSleepDetailCard";
import { OuraStressCard } from "@/components/OuraStressCard";
import { OuraWorkoutsCard } from "@/components/OuraWorkoutsCard";
import { OuraAdvancedMetricsCard } from "@/components/OuraAdvancedMetricsCard";
import ManualProtocolRecommendationDialog from "@/components/ManualProtocolRecommendationDialog";
import PersonalizedTrainingDashboard from "@/components/PersonalizedTrainingDashboard";
import { StudentObservationsCard } from "@/components/StudentObservationsCard";
import { RecordIndividualSessionDialog } from "@/components/RecordIndividualSessionDialog";
import { useOuraMetrics, useLatestOuraMetrics } from "@/hooks/useOuraMetrics";
import { useOuraConnection } from "@/hooks/useOuraConnection";
import { useState } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const StudentDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: students, isLoading: loadingStudents } = useStudents();
  const { data: sessions, isLoading: loadingSessions } = useSessionsWithExercises(id!);
  const { data: assignments, isLoading: loadingAssignments } = useStudentPrescriptions(id!);
  const { data: ouraMetrics, isLoading: loadingOuraMetrics } = useOuraMetrics(id!, 30);
  const { data: latestOuraMetrics } = useLatestOuraMetrics(id!);
  const { data: ouraConnection } = useOuraConnection(id!);
  const [selectedExercise, setSelectedExercise] = useState<string | null>(null);
  const [recordSessionOpen, setRecordSessionOpen] = useState(false);

  const student = students?.find((s) => s.id === id);

  if (loadingStudents) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!student) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Aluno não encontrado</h2>
          <Button onClick={() => navigate("/alunos")}>Voltar</Button>
        </div>
      </div>
    );
  }

  // Get unique exercises from all sessions
  const uniqueExercises = Array.from(
    new Set(
      sessions?.flatMap((session) => 
        session.exercises?.map((ex) => ex.exercise_name) || []
      ) || []
    )
  );

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/alunos")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Avatar className="h-16 w-16">
            <AvatarImage src={student.avatar_url || undefined} className="object-cover" />
            <AvatarFallback className="text-2xl">{student.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-3xl font-bold">{student.name}</h1>
            <p className="text-muted-foreground">
              {student.birth_date && (() => {
                const [year, month, day] = student.birth_date.split('-');
                return `Nascimento: ${day}/${month}/${year}`;
              })()}
            </p>
          </div>
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                onClick={() => setRecordSessionOpen(true)} 
                className="gap-2 animate-pulse hover:animate-none"
                variant="gradient"
              >
                <Mic className="h-4 w-4" />
                Registrar Sessão
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Grave uma sessão de treino usando sua voz</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <Tabs defaultValue="training" className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="training">Treino Personalizado</TabsTrigger>
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="sessions">Sessões</TabsTrigger>
          <TabsTrigger value="exercises">Exercícios</TabsTrigger>
          <TabsTrigger value="prescriptions">Prescrições</TabsTrigger>
          <TabsTrigger value="oura">Métricas Oura</TabsTrigger>
        </TabsList>

        <TabsContent value="training" className="space-y-6">
          <PersonalizedTrainingDashboard
            latestMetrics={latestOuraMetrics}
            recentMetrics={ouraMetrics || []}
            studentName={student.name}
            studentId={student.id}
            onStartTraining={() => setRecordSessionOpen(true)}
          />
        </TabsContent>

        <TabsContent value="overview" className="space-y-6">
          <StudentObservationsCard studentId={id!} />
          
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Informações Pessoais
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {(student.weight_kg || student.height_cm) && (
                  <div className="flex gap-4">
                    {student.weight_kg && (
                      <div>
                        <span className="font-semibold">Peso:</span>{" "}
                        <span className="text-muted-foreground">{student.weight_kg} kg</span>
                      </div>
                    )}
                    {student.height_cm && (
                      <div>
                        <span className="font-semibold">Altura:</span>{" "}
                        <span className="text-muted-foreground">{student.height_cm} cm</span>
                      </div>
                    )}
                  </div>
                )}
                {student.fitness_level && (
                  <div>
                    <span className="font-semibold">Nível:</span>{" "}
                    <Badge variant="secondary">{student.fitness_level}</Badge>
                  </div>
                )}
                {student.objectives && (
                  <div>
                    <span className="font-semibold">Objetivos:</span>
                    <p className="text-muted-foreground mt-1">{student.objectives}</p>
                  </div>
                )}
                {student.injury_history && (
                  <div>
                    <span className="font-semibold">Histórico de Lesões:</span>
                    <p className="text-red-500 mt-1">{student.injury_history}</p>
                  </div>
                )}
                {student.limitations && (
                  <div>
                    <span className="font-semibold">Limitações:</span>
                    <p className="text-muted-foreground mt-1">{student.limitations}</p>
                  </div>
                )}
                {student.preferences && (
                  <div>
                    <span className="font-semibold">Preferências:</span>
                    <p className="text-muted-foreground mt-1">{student.preferences}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Estatísticas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Total de Sessões</span>
                  <span className="text-2xl font-bold">{sessions?.length || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Prescrições Ativas</span>
                  <span className="text-2xl font-bold">{assignments?.length || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Exercícios Únicos</span>
                  <span className="text-2xl font-bold">{uniqueExercises.length}</span>
                </div>
                {student.weekly_sessions_proposed && (
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Sessões/Semana</span>
                    <span className="text-2xl font-bold">{student.weekly_sessions_proposed}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <TrainingZonesCard maxHeartRate={student.max_heart_rate} />
            <ProtocolRecommendationsCard studentId={id!} />
          </div>
        </TabsContent>

        <TabsContent value="sessions" className="space-y-4">
          {loadingSessions ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-32" />
              ))}
            </div>
          ) : sessions && sessions.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {sessions.map((session) => {
                const totalVolume = session.exercises?.reduce((sum, ex) => {
                  const volume = ex.reps && ex.load_kg 
                    ? ex.reps * ex.load_kg 
                    : 0;
                  return sum + volume;
                }, 0) || 0;

                return (
                  <WorkoutCard
                    key={session.id}
                    name={`Treino - ${session.time}`}
                    exercises={session.exercises?.length || 0}
                    date={session.date}
                    totalVolume={totalVolume}
                  />
                );
              })}
            </div>
          ) : (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12 space-y-4">
                <div className="rounded-full bg-primary/10 p-4">
                  <Calendar className="h-12 w-12 text-primary" />
                </div>
                <div className="text-center space-y-2">
                  <h3 className="text-lg font-semibold">Nenhuma sessão registrada</h3>
                  <p className="text-muted-foreground text-sm max-w-md">
                    Comece registrando a primeira sessão de treino de {student.name}
                  </p>
                </div>
                <Button 
                  onClick={() => setRecordSessionOpen(true)}
                  variant="gradient"
                  className="gap-2 mt-4"
                >
                  <Mic className="h-4 w-4" />
                  Registrar Primeira Sessão
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="exercises" className="space-y-4">
          <div className="mb-4">
            <h3 className="text-lg font-semibold mb-2">Selecione um exercício para ver o histórico:</h3>
            <div className="flex flex-wrap gap-2">
              {uniqueExercises.map((exercise) => (
                <Button
                  key={exercise}
                  variant={selectedExercise === exercise ? "default" : "outline"}
                  onClick={() => setSelectedExercise(exercise)}
                >
                  {exercise}
                </Button>
              ))}
            </div>
          </div>

          {selectedExercise ? (
            <ExerciseHistoryCard studentId={id!} exerciseName={selectedExercise} />
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <TrendingUp className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Selecione um exercício acima para ver o histórico</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="prescriptions" className="space-y-4">
          {loadingAssignments ? (
            <Skeleton className="h-32" />
          ) : assignments && assignments.length > 0 ? (
            <div className="grid gap-4">
              {assignments.map((assignment) => (
                <Card key={assignment.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle>{assignment.prescription?.name}</CardTitle>
                        {assignment.prescription?.objective && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {assignment.prescription.objective}
                          </p>
                        )}
                      </div>
                      <Badge variant="secondary">
                        {new Date(assignment.start_date).toLocaleDateString('pt-BR')}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {assignment.custom_adaptations && (
                      <div className="mb-2">
                        <span className="font-semibold text-sm">Adaptações:</span>
                        <p className="text-sm text-muted-foreground">
                          {JSON.stringify(assignment.custom_adaptations)}
                        </p>
                      </div>
                    )}
                    {assignment.end_date && (
                      <div className="text-sm text-muted-foreground">
                        Término: {new Date(assignment.end_date).toLocaleDateString('pt-BR')}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Nenhuma prescrição atribuída</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="oura" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-bold">Métricas do Oura Ring</h3>
              <p className="text-muted-foreground">Dados completos de recuperação, atividade e sono</p>
            </div>
            <ManualProtocolRecommendationDialog studentId={id!} />
          </div>

          <OuraConnectionCard studentId={id!} />

          {loadingOuraMetrics ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardContent className="p-6 space-y-4">
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-20 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : ouraMetrics && ouraMetrics.length > 0 ? (
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-6">
                <TabsTrigger value="overview">Visão Geral</TabsTrigger>
                <TabsTrigger value="activity">Atividade</TabsTrigger>
                <TabsTrigger value="sleep">Sono</TabsTrigger>
                <TabsTrigger value="stress">Estresse</TabsTrigger>
                <TabsTrigger value="workouts">Treinos</TabsTrigger>
                <TabsTrigger value="advanced">Avançado</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4 mt-6">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {ouraMetrics.slice(0, 7).map((metrics) => (
                    <OuraMetricsCard key={metrics.id} metrics={metrics} />
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="activity" className="space-y-4 mt-6">
                {ouraMetrics[0] && <OuraActivityCard metrics={ouraMetrics[0]} />}
                {ouraMetrics.length > 1 && (
                  <div className="mt-4">
                    <h4 className="text-lg font-semibold mb-4">Histórico de Atividade</h4>
                    <div className="grid gap-4 md:grid-cols-2">
                      {ouraMetrics.slice(1, 7).map((metrics) => (
                        <OuraActivityCard key={metrics.id} metrics={metrics} />
                      ))}
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="sleep" className="space-y-4 mt-6">
                {ouraMetrics[0] && <OuraSleepDetailCard metrics={ouraMetrics[0]} />}
                {ouraMetrics.length > 1 && (
                  <div className="mt-4">
                    <h4 className="text-lg font-semibold mb-4">Histórico de Sono</h4>
                    <div className="grid gap-4 md:grid-cols-2">
                      {ouraMetrics.slice(1, 7).map((metrics) => (
                        <OuraSleepDetailCard key={metrics.id} metrics={metrics} />
                      ))}
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="stress" className="space-y-4 mt-6">
                {ouraMetrics[0] && <OuraStressCard metrics={ouraMetrics[0]} />}
                {ouraMetrics.length > 1 && (
                  <div className="mt-4">
                    <h4 className="text-lg font-semibold mb-4">Histórico de Estresse</h4>
                    <div className="grid gap-4 md:grid-cols-2">
                      {ouraMetrics.slice(1, 7).map((metrics) => (
                        <OuraStressCard key={metrics.id} metrics={metrics} />
                      ))}
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="workouts" className="space-y-4 mt-6">
                <OuraWorkoutsCard studentId={id!} limit={20} />
              </TabsContent>

              <TabsContent value="advanced" className="space-y-4 mt-6">
                {ouraMetrics[0] && <OuraAdvancedMetricsCard metrics={ouraMetrics[0]} />}
                {ouraMetrics.length > 1 && (
                  <div className="mt-4">
                    <h4 className="text-lg font-semibold mb-4">Histórico de Métricas Avançadas</h4>
                    <div className="grid gap-4 md:grid-cols-2">
                      {ouraMetrics.slice(1, 7).map((metrics) => (
                        <OuraAdvancedMetricsCard key={metrics.id} metrics={metrics} />
                      ))}
                    </div>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Activity className="h-12 w-12 text-muted-foreground mb-4" />
                {ouraConnection ? (
                  <>
                    <Alert className="mb-4">
                      <Info className="h-4 w-4" />
                      <AlertDescription>
                        Oura Ring conectado, mas ainda não há dados disponíveis.
                        Os dados são processados pelo Oura após você acordar e sincronizar seu anel.
                        Use o botão "Sincronizar" acima para buscar novos dados.
                      </AlertDescription>
                    </Alert>
                  </>
                ) : (
                  <>
                    <p className="text-muted-foreground">Nenhuma métrica do Oura Ring disponível</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Conecte o Oura Ring do aluno para visualizar dados de recuperação
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <RecordIndividualSessionDialog
        open={recordSessionOpen}
        onOpenChange={setRecordSessionOpen}
        studentId={id!}
        studentName={student.name}
      />
    </div>
  );
};

export default StudentDetailPage;
