import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { ROUTES } from "@/constants/navigation";
import { useStudentById } from "@/hooks/useStudents";
import { useStudentPrescriptions, useSessionsWithExercises } from "@/hooks/useStudentDetail";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Calendar, Activity, FileText, TrendingUp, Info, Mic, Users, AlertCircle, User, Filter, Pencil } from "lucide-react";
import { PrescriptionsTabContent } from "@/components/student-detail/PrescriptionsTabContent";
import { OuraTabContent } from "@/components/student-detail/OuraTabContent";
import { WhoopTabContent } from "@/components/student-detail/WhoopTabContent";
import { SessionsTabContent } from "@/components/student-detail/SessionsTabContent";
import { ExercisesTabContent } from "@/components/student-detail/ExercisesTabContent";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { StudentAvatarImage } from "@/components/StudentAvatarImage";
import { Alert, AlertDescription } from "@/components/ui/alert";
import TrainingZonesCard from "@/components/TrainingZonesCard";
import ProtocolRecommendationsCard from "@/components/ProtocolRecommendationsCard";
import { useIsAdmin } from "@/hooks/useUserRole";
import PersonalizedTrainingDashboard from "@/components/PersonalizedTrainingDashboard";
import { RecordIndividualSessionDialog } from "@/components/RecordIndividualSessionDialog";
import { EditSessionDialog } from "@/components/EditSessionDialog";
import { SessionDetailDialog } from "@/components/SessionDetailDialog";
import { EditStudentDialog } from "@/components/EditStudentDialog";
import { StudentOverviewDashboard } from "@/components/StudentOverviewDashboard";
import { AssessmentsTab } from "@/components/assessments/AssessmentsTab";
import { useOuraMetrics, useLatestOuraMetrics } from "@/hooks/useOuraMetrics";
import { useWhoopMetrics } from "@/hooks/useWhoopMetrics";
import { useOuraConnection } from "@/hooks/useOuraConnection";
import { useState, useMemo, useEffect } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useReopenWorkoutSession, useFinalizeWorkoutSession } from "@/hooks/useWorkoutSessions";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { NAV_LABELS } from "@/constants/navigation";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useSEOHead, SEO_PRESETS } from "@/hooks/useSEOHead";
import { useOpenGraph, FABRIK_OG_DEFAULTS } from "@/hooks/useOpenGraph";
import { StructuredData } from "@/components/StructuredData";
import { getOrganizationSchema, getWebPageSchema, getBreadcrumbSchema, getPersonSchema } from "@/utils/structuredData";
import { ErrorState } from "@/components/ErrorState";
import { PageLayout } from "@/components/PageLayout";
import { StudentHeaderSkeleton } from "@/components/skeletons/StudentHeaderSkeleton";
import { getObjectiveLabel } from "@/constants/objectives";
import { formatSessionTime } from "@/utils/sessionTime";
import { formatSessionDate } from "@/utils/sessionDate";
import { formatFitnessLevel } from "@/utils/formatStudent";

// E4.3b — Deep-link read-only: `?tab=<value>` na URL abre direto na aba
// correspondente no primeiro render. Whitelist defensiva pra ignorar valores
// inválidos; comportamento padrão (`training`) preservado quando o param
// estiver ausente ou fora da whitelist.
const VALID_STUDENT_DETAIL_TABS = new Set([
  "training",
  "overview",
  "sessions",
  "exercises",
  "prescriptions",
  "assessments",
  "oura",
  "whoop",
]);

const StudentDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const studentId = id ?? "";
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<string>(() => {
    const requested = searchParams.get("tab");
    return requested && VALID_STUDENT_DETAIL_TABS.has(requested)
      ? requested
      : "training";
  });
  const needsSessions = activeTab === "overview" || activeTab === "sessions" || activeTab === "exercises";
  const needsAssignments = activeTab === "overview" || activeTab === "prescriptions";
  // A aba Oura busca os próprios dados (janela de calendário no OuraTabContent).
  const needsOuraHistory = activeTab === "training";
  // O hero do training é agnóstico de wearable (RecoverySnapshot); a aba
  // Whoop busca a própria janela no WhoopTabContent.
  const needsWhoop = activeTab === "training";
  const needsLatestOura =
    activeTab === "training" || activeTab === "overview" || activeTab === "oura";

  const { data: student, isLoading: loadingStudent } = useStudentById(id ?? null);
  const { data: sessions, isLoading: loadingSessions, isError: sessionsError, refetch: refetchSessions } = useSessionsWithExercises(
    needsSessions ? studentId : ""
  );
  const { data: assignments, isLoading: loadingAssignments, isError: assignmentsError, refetch: refetchAssignments } = useStudentPrescriptions(
    needsAssignments ? studentId : ""
  );
  const { data: ouraMetrics, isLoading: loadingOuraMetrics, isError: ouraMetricsError } = useOuraMetrics(
    needsOuraHistory ? studentId : "",
    30
  );
  const { data: latestOuraMetrics, isLoading: loadingLatestOura } = useLatestOuraMetrics(needsLatestOura ? studentId : "");
  const { data: ouraConnection } = useOuraConnection(studentId);
  const { data: whoopMetrics, isLoading: loadingWhoopMetrics, isError: whoopMetricsError } = useWhoopMetrics(needsWhoop ? studentId : "", 7);
  const { isAdmin } = useIsAdmin();
  const [recordSessionOpen, setRecordSessionOpen] = useState(false);
  const [sessionToReopen, setSessionToReopen] = useState<string | null>(null);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [editStudentOpen, setEditStudentOpen] = useState(false);
  const reopenSession = useReopenWorkoutSession();
  const finalizeSession = useFinalizeWorkoutSession();

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

  // Calculate age (must be before early returns to respect hooks order)
  const age = useMemo(() => {
    if (!student?.birth_date) return null;
    const today = new Date();
    const birthDate = new Date(student.birth_date);
    let calculatedAge = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      calculatedAge--;
    }
    return calculatedAge;
  }, [student?.birth_date]);

  if (loadingStudent) {
    return (
      <PageLayout>
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 w-full" />
      </PageLayout>
    );
  }

  if (!student) {
    return (
      <PageLayout>
        <ErrorState
          title="Aluno não encontrado"
          description="O aluno que você está procurando não existe ou foi removido."
          onRetry={() => navigate(ROUTES.students)}
          retryLabel="Voltar para Alunos"
        />
      </PageLayout>
    );
  }



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
    <PageLayout
      structuredData={[
        { data: getWebPageSchema(student.name, `Perfil completo de ${student.name} - Métricas, sessões de treino, exercícios e dados Oura Ring`), id: "webpage-schema" },
        { data: getBreadcrumbSchema([{ label: "Home", href: "/" }, { label: NAV_LABELS.students, href: "/alunos" }, { label: student.name }]), id: "breadcrumb-schema" },
        { data: getPersonSchema({ name: student.name, description: `Aluno da Fabrik Performance${student.objectives ? ` - Objetivos: ${student.objectives}` : ''}` }), id: "person-schema" },
      ]}
    >
      <Breadcrumbs
        items={[
          { label: NAV_LABELS.students, href: "/alunos", icon: Users },
          { label: student.name }
        ]}
      />
      
      {loadingStudent ? (
        <StudentHeaderSkeleton />
      ) : (
        <Card className="bg-card border border-primary/15 shadow-sm rounded-xl mb-md animate-fade-in">
          <CardContent className="p-lg">
            <div className="flex flex-col md:flex-row items-start justify-between gap-lg">
              {/* Coluna 1: Perfil */}
              <div className="flex gap-md items-start w-full md:w-auto">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => navigate(ROUTES.students)} 
                  aria-label="Voltar para lista de alunos"
                  className="shrink-0"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                
                <Avatar
                  onClick={() => setEditStudentOpen(true)}
                  aria-label="Editar dados do aluno"
                  className="h-20 w-20 md:h-24 md:w-24 ring-4 ring-primary/20 ring-offset-4 ring-offset-background transition-transform duration-300 hover:scale-105 cursor-pointer shrink-0"
                >
                  <StudentAvatarImage avatarUrl={student.avatar_url} className="object-cover" />
                  <AvatarFallback className="text-2xl md:text-3xl font-bold">
                    {student.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                
                <div className="space-y-sm flex-1 min-w-0">
                  <div>
                    <h1 className="text-2xl md:text-3xl font-bold mb-xs break-words leading-tight">{student.name}</h1>
                    <div className="flex items-center gap-xs text-sm text-muted-foreground flex-wrap">
                      <Calendar className="h-4 w-4 shrink-0" />
                      <span>{age} anos</span>
                    </div>
                  </div>
                  
                  {/* Badges Row com stagger animation */}
                  <div className="flex flex-wrap gap-xs">
                    {student.fitness_level && (
                      <Badge
                        variant="secondary"
                        className="gap-xs animate-fade-in"
                        style={{ animationDelay: '0ms' }}
                      >
                        <TrendingUp className="h-3 w-3" />
                        {formatFitnessLevel(student.fitness_level)}
                      </Badge>
                    )}
                    {ouraConnection?.is_active && (
                      <Badge 
                        variant="default" 
                        className="gap-xs animate-fade-in shimmer-border"
                        style={{ animationDelay: '100ms' }}
                      >
                        <Activity className="h-3 w-3 animate-pulse" />
                        Oura Conectado
                      </Badge>
                    )}
                    {student.objectives?.slice(0, 2).map((obj, index) => (
                      <Badge 
                        key={obj}
                        variant="outline" 
                        className="gap-xs animate-fade-in"
                        style={{ animationDelay: `${(index + 2) * 100}ms` }}
                      >
                        {getObjectiveLabel(obj)}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
              
              {/* Coluna 2: Ações */}
              <div className="flex flex-col sm:flex-row gap-sm w-full md:w-auto">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={() => setEditStudentOpen(true)}
                        className="gap-2 w-full sm:w-auto"
                        variant="outline"
                        aria-label="Editar aluno"
                      >
                        <Pencil className="h-4 w-4" />
                        Editar
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Editar dados cadastrais do aluno</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={() => navigate(ROUTES.studentReports(id!))}
                        className="gap-2 w-full sm:w-auto"
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
                       className="gap-2 w-full sm:w-auto"
                        variant="default"
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
          </CardContent>
        </Card>
      )}

      {/* Alerta de Dados Incompletos - Detalhado */}
      {hasIncompleteData && (
        <Alert className="border-warning/30 bg-warning/5">
          <AlertCircle className="h-5 w-5 text-warning" />
          <AlertDescription className="text-foreground">
            <span className="font-semibold block mb-1">Dados incompletos detectados</span>
            <span className="text-sm text-muted-foreground">
              Complete os seguintes campos para melhor análise: <strong className="text-foreground">{missingFields.join(', ')}</strong>
            </span>
            <Button
              variant="outline"
              size="sm"
              className="mt-2 gap-2"
              onClick={() => setEditStudentOpen(true)}
            >
              <Pencil className="h-3.5 w-3.5" />
              Completar cadastro
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList
          aria-label="Seções do perfil do aluno"
          className="flex h-auto w-full justify-start gap-1 overflow-x-auto p-1 sm:grid sm:grid-cols-4 lg:grid-cols-8"
        >
          <TabsTrigger className="min-h-11 min-w-max px-4" value="training">
            {NAV_LABELS.tabTraining}
          </TabsTrigger>
          <TabsTrigger className="min-h-11 min-w-max px-4" value="overview">
            {NAV_LABELS.tabOverview}
          </TabsTrigger>
          <TabsTrigger className="min-h-11 min-w-max px-4" value="sessions">
            {NAV_LABELS.tabSessions}
          </TabsTrigger>
          <TabsTrigger className="min-h-11 min-w-max px-4" value="exercises">
            {NAV_LABELS.tabExercises}
          </TabsTrigger>
          <TabsTrigger className="min-h-11 min-w-max px-4" value="prescriptions">
            {NAV_LABELS.tabPrescriptions}
          </TabsTrigger>
          <TabsTrigger className="min-h-11 min-w-max px-4" value="assessments">
            {NAV_LABELS.tabAssessments}
          </TabsTrigger>
          <TabsTrigger className="min-h-11 min-w-max px-4" value="oura">
            {NAV_LABELS.tabOura}
          </TabsTrigger>
          <TabsTrigger className="min-h-11 min-w-max px-4" value="whoop">
            {NAV_LABELS.tabWhoop}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="training" className="space-y-6 animate-fade-in">
          <PersonalizedTrainingDashboard
            latestMetrics={latestOuraMetrics}
            recentMetrics={ouraMetrics || []}
            whoopMetrics={whoopMetrics || []}
            studentName={student.name}
            studentId={student.id}
            maxHeartRate={student.max_heart_rate}
            isLoading={loadingOuraMetrics || loadingWhoopMetrics || loadingLatestOura}
            isError={ouraMetricsError || whoopMetricsError}
            onStartTraining={() => setRecordSessionOpen(true)}
          />
        </TabsContent>

        <TabsContent value="overview" className="space-y-6 animate-fade-in">
          <StudentOverviewDashboard
            student={student}
            sessions={sessions || []}
            assignments={assignments || []}
            latestOuraMetrics={latestOuraMetrics}
            ouraConnection={ouraConnection}
            onNavigateToOura={() => setActiveTab("oura")}
            isLoading={loadingSessions || loadingAssignments}
          />
        </TabsContent>

        <TabsContent value="sessions" className="space-y-4 animate-fade-in">
          <SessionsTabContent
            studentName={student.name}
            sessions={sessions}
            isLoading={loadingSessions}
            isError={sessionsError}
            refetch={refetchSessions}
            weeklyTarget={student.weekly_sessions_proposed}
            onRecordSession={() => setRecordSessionOpen(true)}
            onView={(sessionId) => setSelectedSessionId(sessionId)}
            onEdit={(sessionId) => setEditingSessionId(sessionId)}
            onReopen={(sessionId) => {
              reopenSession.mutate(sessionId, {
                onSuccess: () => {
                  setSessionToReopen(sessionId);
                  setRecordSessionOpen(true);
                },
              });
            }}
            onFinalize={(sessionId) => finalizeSession.mutate(sessionId)}
          />
        </TabsContent>

        <TabsContent value="exercises" className="space-y-4 animate-fade-in">
          <ExercisesTabContent
            studentId={studentId}
            sessions={sessions}
            isLoading={loadingSessions}
            isError={sessionsError}
            refetch={refetchSessions}
          />
        </TabsContent>

        <TabsContent value="prescriptions" className="space-y-4 animate-fade-in">
          <PrescriptionsTabContent
            studentId={studentId}
            assignments={assignments}
            isLoading={loadingAssignments}
            isError={assignmentsError}
            refetch={refetchAssignments}
          />
        </TabsContent>

        <TabsContent value="assessments" className="space-y-4 animate-fade-in">
          <AssessmentsTab
            studentId={id!}
            studentDefaults={{
              age_years: student.birth_date
                ? Math.floor(
                    (Date.now() - new Date(student.birth_date).getTime()) /
                      (365.25 * 24 * 60 * 60 * 1000),
                  )
                : null,
              weight_kg: student.weight_kg ?? null,
              height_cm: student.height_cm ?? null,
              sex: student.sex === "M" || student.sex === "F" ? student.sex : null,
            }}
          />
        </TabsContent>

        <TabsContent value="oura" className="space-y-6 animate-fade-in">
          <OuraTabContent
            studentId={studentId}
            studentName={student?.name}
            isAdmin={isAdmin}
            hasConnection={!!ouraConnection}
          />
        </TabsContent>

        <TabsContent value="whoop" className="space-y-6 animate-fade-in">
          <WhoopTabContent
            studentId={studentId}
            studentName={student?.name ?? "Aluno"}
            isAdmin={isAdmin}
          />
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
          // Não fazer reload - as queries são invalidadas automaticamente
          setEditingSessionId(null);
        }}
        onReopenForRecording={(sessionId) => {
          setEditingSessionId(null);
          setSessionToReopen(sessionId);
          setRecordSessionOpen(true);
        }}
      />

      <SessionDetailDialog
        sessionId={selectedSessionId}
        open={!!selectedSessionId}
        onOpenChange={(open) => {
          if (!open) setSelectedSessionId(null);
        }}
        onReopenSession={(sessionId) => {
          reopenSession.mutate(sessionId, {
            onSuccess: () => {
              setSessionToReopen(sessionId);
              setRecordSessionOpen(true);
            }
          });
        }}
        onEditSession={(sessionId) => {
          setSelectedSessionId(null);
          setEditingSessionId(sessionId);
        }}
      />

      <EditStudentDialog
        student={student}
        open={editStudentOpen}
        onOpenChange={setEditStudentOpen}
      />
    </PageLayout>
  );
};

export default StudentDetailPage;
