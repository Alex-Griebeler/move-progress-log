import { useParams, useNavigate } from "react-router-dom";
import { ROUTES } from "@/constants/navigation";
import { useStudents } from "@/hooks/useStudents";
import { useStudentPrescriptions, useSessionsWithExercises } from "@/hooks/useStudentDetail";
import { useDeletePrescriptionAssignment } from "@/hooks/usePrescriptions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Calendar, Activity, FileText, TrendingUp, Info, Mic, Users, Trash2, AlertCircle } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Alert, AlertDescription } from "@/components/ui/alert";
import WorkoutCard from "@/components/WorkoutCard";
import ExerciseHistoryCard from "@/components/ExerciseHistoryCard";
import TrainingZonesCard from "@/components/TrainingZonesCard";
import ProtocolRecommendationsCard from "@/components/ProtocolRecommendationsCard";
import { OuraConnectionCard } from "@/components/OuraConnectionCard";
import OuraMetricsCard from "@/components/OuraMetricsCard";
import { OuraSleepDetailCard } from "@/components/OuraSleepDetailCard";
import { OuraActivityCard } from "@/components/OuraActivityCard";
import { OuraWorkoutsCard } from "@/components/OuraWorkoutsCard";
import { OuraStressCard } from "@/components/OuraStressCard";
import { OuraAdvancedMetricsCard } from "@/components/OuraAdvancedMetricsCard";
import { OuraApiDiagnosticsCard } from "@/components/OuraApiDiagnosticsCard";
import { OuraConnectionStatus } from "@/components/OuraConnectionStatus";
import { useIsAdmin } from "@/hooks/useUserRole";
import ManualProtocolRecommendationDialog from "@/components/ManualProtocolRecommendationDialog";
import PersonalizedTrainingDashboard from "@/components/PersonalizedTrainingDashboard";
import { StudentObservationsCard } from "@/components/StudentObservationsCard";
import { RecordIndividualSessionDialog } from "@/components/RecordIndividualSessionDialog";
import { EditSessionDialog } from "@/components/EditSessionDialog";
import { useOuraMetrics, useLatestOuraMetrics } from "@/hooks/useOuraMetrics";
import { useOuraConnection } from "@/hooks/useOuraConnection";
import { useState, useMemo } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useReopenWorkoutSession } from "@/hooks/useWorkoutSessions";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { NAV_LABELS } from "@/constants/navigation";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useSEOHead, SEO_PRESETS } from "@/hooks/useSEOHead";
import { useOpenGraph, FABRIK_OG_DEFAULTS } from "@/hooks/useOpenGraph";
import { StructuredData } from "@/components/StructuredData";
import { getOrganizationSchema, getWebPageSchema, getBreadcrumbSchema, getPersonSchema } from "@/utils/structuredData";

const StudentDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: students, isLoading: loadingStudents } = useStudents();
  const { data: sessions, isLoading: loadingSessions } = useSessionsWithExercises(id!);
  const { data: assignments, isLoading: loadingAssignments } = useStudentPrescriptions(id!);
  const { data: ouraMetrics, isLoading: loadingOuraMetrics } = useOuraMetrics(id!, 30);
  const { data: latestOuraMetrics } = useLatestOuraMetrics(id!);
  const { data: ouraConnection } = useOuraConnection(id!);
  const { isAdmin } = useIsAdmin();
  const [selectedExercise, setSelectedExercise] = useState<string | null>(null);
  const [recordSessionOpen, setRecordSessionOpen] = useState(false);
  const [sessionToReopen, setSessionToReopen] = useState<string | null>(null);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const deleteAssignment = useDeletePrescriptionAssignment();
  const reopenSession = useReopenWorkoutSession();

  const student = students?.find((s) => s.id === id);
  
  // Dynamic page title with student name
  const pageTitle = useMemo(() => {
    return student ? student.name : NAV_LABELS.students;
  }, [student]);
  
  usePageTitle(pageTitle);
  useSEOHead(SEO_PRESETS.private);
  useOpenGraph({
    ...FABRIK_OG_DEFAULTS,
    title: `${pageTitle} · Fabrik Performance`,
    description: student 
      ? `Perfil e acompanhamento de treino de ${student.name} no sistema Fabrik Performance.`
      : 'Perfil de aluno no sistema Fabrik Performance.',
    type: 'profile',
    url: true,
  });

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
          <Button onClick={() => navigate(ROUTES.students)}>Voltar</Button>
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

  // Check for missing student data
  const getMissingFields = () => {
    const missing: string[] = [];
    
    if (!student.birth_date) missing.push('Data de nascimento');
    if (!student.fitness_level) missing.push('Nível de fitness');
    if (!student.objectives) missing.push('Objetivos');
    if (!student.weight_kg || !student.height_cm) missing.push('Peso/Altura');
    if (!student.max_heart_rate) missing.push('FC Máxima');
    
    return missing;
  };

  const missingFields = getMissingFields();
  const hasIncompleteData = missingFields.length > 0;

  return (
    <div id="main-content" className="container mx-auto p-6 space-y-6" role="main">
      {/* Structured Data para SEO */}
      <StructuredData data={getOrganizationSchema()} id="org-schema" />
      <StructuredData 
        data={getWebPageSchema(
          student.name,
          `Perfil completo de ${student.name} - Métricas, sessões de treino, exercícios e dados Oura Ring`
        )} 
        id="webpage-schema" 
      />
      <StructuredData 
        data={getBreadcrumbSchema([
          { label: "Home", href: "/" },
          { label: NAV_LABELS.students, href: "/alunos" },
          { label: student.name }
        ])} 
        id="breadcrumb-schema" 
      />
      <StructuredData 
        data={getPersonSchema({
          name: student.name,
          description: `Aluno da Fabrik Performance${student.objectives ? ` - Objetivos: ${student.objectives}` : ''}`
        })} 
        id="person-schema" 
      />
      
      <Breadcrumbs
        items={[
          { label: NAV_LABELS.students, href: "/alunos", icon: Users },
          { label: student.name }
        ]}
      />
      
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(ROUTES.students)} aria-label="Voltar para lista de alunos">
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
        <div className="flex gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  onClick={() => navigate(ROUTES.studentReports(id!))} 
                  className="gap-2"
                  variant="outline"
                  aria-label="Ver Relatórios"
                >
                  <FileText className="h-4 w-4" />
                  Relatórios
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Visualizar e gerar relatórios periódicos de evolução</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  onClick={() => setRecordSessionOpen(true)} 
                  className="gap-2 animate-pulse hover:animate-none"
                  variant="gradient"
                  aria-label={NAV_LABELS.recordSession}
                >
                  <Mic className="h-4 w-4" />
                  {NAV_LABELS.recordSession}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Grave uma sessão de treino usando sua voz</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Alerta de Dados Incompletos - Detalhado */}
      {hasIncompleteData && (
        <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950/30">
          <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-500" />
          <AlertDescription className="text-amber-800 dark:text-amber-300">
            <span className="font-semibold block mb-1">Dados incompletos detectados</span>
            <span className="text-sm">
              Complete os seguintes campos para melhor análise: <strong>{missingFields.join(', ')}</strong>
            </span>
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="training" className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="training">{NAV_LABELS.tabTraining}</TabsTrigger>
          <TabsTrigger value="overview">{NAV_LABELS.tabOverview}</TabsTrigger>
          <TabsTrigger value="sessions">{NAV_LABELS.tabSessions}</TabsTrigger>
          <TabsTrigger value="exercises">{NAV_LABELS.tabExercises}</TabsTrigger>
          <TabsTrigger value="prescriptions">{NAV_LABELS.tabPrescriptions}</TabsTrigger>
          <TabsTrigger value="oura">{NAV_LABELS.tabOura}</TabsTrigger>
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
                    sessionId={session.id}
                    name={session.workout_name || `Treino - ${session.time}`}
                    exercises={session.exercises?.length || 0}
                    date={session.date}
                    totalVolume={totalVolume}
                    isFinalized={session.is_finalized}
                    canReopen={session.can_reopen}
                    onEdit={() => setEditingSessionId(session.id)}
                    onReopen={() => {
                      reopenSession.mutate(session.id, {
                        onSuccess: () => {
                          setSessionToReopen(session.id);
                          setRecordSessionOpen(true);
                        }
                      });
                    }}
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
                      <div className="flex-1">
                        <CardTitle>{assignment.prescription?.name}</CardTitle>
                        {assignment.prescription?.objective && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {assignment.prescription.objective}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">
                          {new Date(assignment.start_date).toLocaleDateString('pt-BR')}
                        </Badge>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                              aria-label="Excluir atribuição"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem certeza que deseja excluir esta atribuição de prescrição? Esta ação não pode ser desfeita.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteAssignment.mutate(assignment.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
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
          
          {/* Status de conexão discreto apenas para alunos */}
          {!isAdmin && (
            <OuraConnectionStatus 
              studentId={id!} 
              hasConnection={!!ouraConnection} 
            />
          )}
          
          {/* Diagnóstico técnico apenas para admins */}
          {isAdmin && (
            <OuraApiDiagnosticsCard studentId={id!} />
          )}

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
        onOpenChange={(open) => {
          setRecordSessionOpen(open);
          if (!open) setSessionToReopen(null);
        }}
        studentId={id!}
        studentName={student.name}
        existingSessionId={sessionToReopen}
      />

      <EditSessionDialog
        open={!!editingSessionId}
        onOpenChange={(open) => !open && setEditingSessionId(null)}
        sessionId={editingSessionId}
        onSuccess={() => {
          // Refetch sessions after successful edit
          window.location.reload();
        }}
        onReopenForRecording={(sessionId) => {
          setEditingSessionId(null);
          setSessionToReopen(sessionId);
          setRecordSessionOpen(true);
        }}
      />
    </div>
  );
};

export default StudentDetailPage;
