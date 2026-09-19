import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { ROUTES } from "@/constants/navigation";
import { useStudentById } from "@/hooks/useStudents";
import { useStudentPrescriptions, useSessionsWithExercises } from "@/hooks/useStudentDetail";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Calendar, Activity, FileText, TrendingUp, Mic, Users, Pencil } from "lucide-react";
import { PrescriptionsTabContent } from "@/components/student-detail/PrescriptionsTabContent";
import { OuraTabContent } from "@/components/student-detail/OuraTabContent";
import { WhoopTabContent } from "@/components/student-detail/WhoopTabContent";
import { SessionsTabContent } from "@/components/student-detail/SessionsTabContent";
import { ExercisesTabContent } from "@/components/student-detail/ExercisesTabContent";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { StudentAvatarImage } from "@/components/StudentAvatarImage";
import { useIsAdmin } from "@/hooks/useUserRole";
import PersonalizedTrainingDashboard from "@/components/PersonalizedTrainingDashboard";
import { RecordIndividualSessionDialog } from "@/components/RecordIndividualSessionDialog";
import { EditSessionDialog } from "@/components/EditSessionDialog";
import { SessionDetailDialog } from "@/components/SessionDetailDialog";
import { EditStudentDialog } from "@/components/EditStudentDialog";
import { StudentOverviewDashboard } from "@/components/StudentOverviewDashboard";
import { AssessmentsTab } from "@/components/assessments/AssessmentsTab";
import { useOuraMetrics, useLatestOuraMetrics, spToday } from "@/hooks/useOuraMetrics";
import { linkPerceptionToSession } from "@/utils/perceptionObservation";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useWhoopMetrics } from "@/hooks/useWhoopMetrics";
import { WHOOP_RECOMMENDATION_WINDOW_DAYS } from "@/utils/whoopRecommendation";
import { useOuraConnection } from "@/hooks/useOuraConnection";
import { useWhoopConnection } from "@/hooks/useWhoopConnection";
import { useState, useMemo, useEffect } from "react";
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
  // Pré-publish R5: falha de vínculo do check-in à sessão não pode ser invisível.
  const { toast: linkToast } = useToast();
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

  const {
    data: student,
    isLoading: loadingStudent,
    error: studentError,
    refetch: refetchStudent,
  } = useStudentById(id ?? null);
  const { data: sessions, isLoading: loadingSessions, isError: sessionsError, refetch: refetchSessions } = useSessionsWithExercises(
    needsSessions ? studentId : ""
  );
  const { data: assignments, isLoading: loadingAssignments, isError: assignmentsError, refetch: refetchAssignments } = useStudentPrescriptions(
    needsAssignments ? studentId : ""
  );
  // R8-5 (ratificado 29/08): 30 DIAS de calendário, não 30 linhas — com sync
  // esparso, 30 linhas atravessavam meses e 7 scores antigos liberavam a
  // recomendação como se fossem recentes. Consequência aceita: aluna com
  // sync ruim vê "sem recomendação" (que é a verdade clínica).
  const { data: ouraMetrics, isLoading: loadingOuraMetrics, isError: ouraMetricsError, refetch: refetchOuraMetrics } = useOuraMetrics(
    needsOuraHistory ? studentId : "",
    { days: 30 }
  );
  const { data: latestOuraMetrics, isLoading: loadingLatestOura, isError: latestOuraError, refetch: refetchLatestOura } = useLatestOuraMetrics(needsLatestOura ? studentId : "");
  const { data: ouraConnection } = useOuraConnection(studentId);
  // Mesma chave de cache que o dashboard já consulta — só para o selo do
  // aparelho no header (UX-20: aluna só-Whoop também é sinalizada).
  const { data: whoopConnection } = useWhoopConnection(studentId);
  // R5: a recomendação Whoop precisa do baseline de 30 dias ANTERIORES ao
  // DIA DO SNAPSHOT — que pode estar dias atrás de hoje (a query ancora em
  // hoje). 90 dias cobrem snapshot de até 59 dias atrás; do 60º em diante o
  // baseline é descartado pelo guard de truncamento (not_evaluated), nunca
  // calculado com número errado.
  const { data: whoopMetrics, isLoading: loadingWhoopMetrics, isError: whoopMetricsError, refetch: refetchWhoopMetrics } = useWhoopMetrics(needsWhoop ? studentId : "", { days: WHOOP_RECOMMENDATION_WINDOW_DAYS });
  const { isAdmin } = useIsAdmin();
  const [recordSessionOpen, setRecordSessionOpen] = useState(false);
  // R8c: prescrição que alimentou a sugestão de carga → pré-seleção da sessão.
  const [sessionPrescriptionId, setSessionPrescriptionId] = useState<string | null>(null);
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
        <StudentHeaderSkeleton />
        <Skeleton className="h-64 w-full rounded-lg" />
      </PageLayout>
    );
  }

  // Erro de rede ≠ cadastro inexistente (PGRST116 = .single() sem linha).
  const studentNotFound =
    !studentError || (studentError as { code?: string }).code === "PGRST116";
  if (!student && !studentNotFound) {
    return (
      <PageLayout>
        <ErrorState
          title="Não foi possível carregar o cadastro"
          description="Verifique a conexão e tente novamente."
          onRetry={() => void refetchStudent()}
        />
      </PageLayout>
    );
  }

  if (!student) {
    return (
      <PageLayout>
        <ErrorState
          title="Cadastro não encontrado"
          description="Este cadastro não existe ou foi removido."
          onRetry={() => navigate(ROUTES.students)}
          retryLabel="Voltar para a lista"
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
    if (!student.max_heart_rate) missing.push('FC máxima');
    
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
      
      {/* Header — UX 18/09: sem motion decorativa (UX-16), avatar não é uma
          segunda porta de edição só para mouse (UX-19), sem tooltips que
          repetem o rótulo (UX-23), cadastro incompleto numa linha (UX-18) e
          um único CTA primário de sessão por tela (UX-02, ver abaixo). */}
      <Card className="bg-card border border-primary/15 shadow-sm rounded-xl mb-md">
        <CardContent className="p-lg">
          <div className="flex flex-col md:flex-row items-start justify-between gap-lg">
            {/* Coluna 1: Perfil */}
            <div className="flex gap-md items-start w-full md:w-auto">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate(ROUTES.students)}
                aria-label="Voltar para a lista de alunos"
                className="h-10 w-10 shrink-0"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>

              <Avatar className="h-20 w-20 md:h-24 md:w-24 ring-4 ring-primary/20 ring-offset-4 ring-offset-background shrink-0 self-center m-2">
                <StudentAvatarImage avatarUrl={student.avatar_url} className="object-cover" />
                <AvatarFallback className="text-2xl md:text-3xl font-bold" aria-hidden="true">
                  {student.name.charAt(0)}
                </AvatarFallback>
              </Avatar>

              <div className="space-y-sm flex-1 min-w-0">
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold mb-xs break-words leading-tight">{student.name}</h1>
                  {age !== null && (
                    <div className="flex items-center gap-xs text-sm text-muted-foreground flex-wrap">
                      <Calendar className="h-4 w-4 shrink-0" aria-hidden="true" />
                      <span>{age} anos</span>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-xs">
                  {student.fitness_level && (
                    <Badge variant="secondary" className="gap-xs">
                      <TrendingUp className="h-3 w-3" aria-hidden="true" />
                      {formatFitnessLevel(student.fitness_level)}
                    </Badge>
                  )}
                  {(ouraConnection?.is_active || whoopConnection?.is_active) && (
                    <Badge variant="outline" className="gap-xs">
                      <Activity className="h-3 w-3" aria-hidden="true" />
                      {ouraConnection?.is_active && whoopConnection?.is_active
                        ? "Oura e Whoop conectados"
                        : ouraConnection?.is_active
                          ? "Oura conectado"
                          : "Whoop conectado"}
                    </Badge>
                  )}
                  {student.objectives?.slice(0, 2).map((obj) => (
                    <Badge key={obj} variant="outline">
                      {getObjectiveLabel(obj)}
                    </Badge>
                  ))}
                </div>

                {hasIncompleteData && (
                  <p className="flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground">
                    <span>
                      Cadastro incompleto:{" "}
                      <span className="text-foreground">{missingFields.join(", ")}</span>
                    </span>
                    <button
                      type="button"
                      className="inline-flex min-h-10 items-center text-primary underline-offset-4 hover:underline"
                      onClick={() => setEditStudentOpen(true)}
                    >
                      Completar cadastro
                    </button>
                  </p>
                )}
              </div>
            </div>

            {/* Coluna 2: Ações. UX-02 (decisão registrada 19/09): na aba
                Treinamento o CTA primário de sessão é o "Iniciar treino" do
                hero (respeita check-in, conduta e prescrição escopada) — o
                "Registrar sessão" do header vira outline e nunca compete. Nas
                outras abas ele mantém o visual atual. */}
            <div className="flex flex-col sm:flex-row gap-sm w-full md:w-auto">
              <Button
                onClick={() => setEditStudentOpen(true)}
                className="gap-2 w-full sm:w-auto"
                variant="outline"
              >
                <Pencil className="h-4 w-4" aria-hidden="true" />
                Editar
              </Button>

              <Button
                onClick={() => navigate(ROUTES.studentReports(id!))}
                className="gap-2 w-full sm:w-auto"
                variant="outline"
              >
                <FileText className="h-4 w-4" aria-hidden="true" />
                Relatórios
              </Button>

              <Button
                onClick={() => setRecordSessionOpen(true)}
                className="gap-2 w-full sm:w-auto"
                variant={activeTab === "training" ? "outline" : "default"}
              >
                <Mic className="h-4 w-4" aria-hidden="true" />
                {NAV_LABELS.recordSession}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
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

        <TabsContent value="training" className="space-y-6 animate-in fade-in-0 duration-150 motion-reduce:animate-none">
          <PersonalizedTrainingDashboard
            latestMetrics={latestOuraMetrics}
            recentMetrics={ouraMetrics || []}
            whoopMetrics={whoopMetrics || []}
            studentName={student.name}
            studentId={student.id}
            maxHeartRate={student.max_heart_rate}
            isLoading={loadingOuraMetrics || loadingWhoopMetrics || loadingLatestOura}
            // latestOuraError TAMBÉM suspende ação: com histórico cacheado e
            // latest falhando, a fonte decidida pode estar errada (Codex R7).
            isError={ouraMetricsError || whoopMetricsError || latestOuraError}
            latestOuraError={latestOuraError}
            onRetry={() => {
              void refetchOuraMetrics();
              void refetchWhoopMetrics();
              void refetchLatestOura();
            }}
            hasOuraConnection={ouraConnection === undefined ? null : Boolean(ouraConnection)}
            onConnectDevice={(device) => setActiveTab(device)}
            onStartTraining={(prescriptionId) => {
              setSessionPrescriptionId(prescriptionId ?? null);
              setRecordSessionOpen(true);
            }}
          />
        </TabsContent>

        <TabsContent value="overview" className="space-y-6 animate-in fade-in-0 duration-150 motion-reduce:animate-none">
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

        <TabsContent value="sessions" className="space-y-4 animate-in fade-in-0 duration-150 motion-reduce:animate-none">
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

        <TabsContent value="exercises" className="space-y-4 animate-in fade-in-0 duration-150 motion-reduce:animate-none">
          <ExercisesTabContent
            studentId={studentId}
            sessions={sessions}
            isLoading={loadingSessions}
            isError={sessionsError}
            refetch={refetchSessions}
          />
        </TabsContent>

        <TabsContent value="prescriptions" className="space-y-4 animate-in fade-in-0 duration-150 motion-reduce:animate-none">
          <PrescriptionsTabContent
            studentId={studentId}
            assignments={assignments}
            isLoading={loadingAssignments}
            isError={assignmentsError}
            refetch={refetchAssignments}
          />
        </TabsContent>

        <TabsContent value="assessments" className="space-y-4 animate-in fade-in-0 duration-150 motion-reduce:animate-none">
          <AssessmentsTab
            studentId={id!}
            studentBirthDate={student.birth_date ?? null}
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

        <TabsContent value="oura" className="space-y-6 animate-in fade-in-0 duration-150 motion-reduce:animate-none">
          <OuraTabContent
            studentId={studentId}
            studentName={student?.name}
            isAdmin={isAdmin}
            hasConnection={!!ouraConnection}
          />
        </TabsContent>

        <TabsContent value="whoop" className="space-y-6 animate-in fade-in-0 duration-150 motion-reduce:animate-none">
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
          if (!open) {
            setSessionToReopen(null);
            // R8c: a prescrição do fluxo de treino não vaza pra próxima
            // abertura por outro CTA ("Gravar sessão" administrativo).
            setSessionPrescriptionId(null);
          }
        }}
        studentId={id!}
        studentName={student.name}
        existingSessionId={sessionToReopen}
        initialPrescriptionId={sessionPrescriptionId}
        onSessionCreated={(sessionId, sessionDate) => {
          // R8b: a percepção REGISTRADA do dia vincula pelo ID exato à
          // PRIMEIRA sessão criada — e só quando a DATA da sessão é o mesmo
          // dia da percepção (sessão retroativa não herda a percepção de
          // hoje); session_id não-nulo nunca é sobrescrito.
          void linkPerceptionToSession(supabase, id!, sessionId, sessionDate).then((result) => {
            if (result === "error") {
              linkToast({
                title: "Check-in não foi vinculado à sessão",
                description: "A sessão foi criada; o vínculo tenta de novo na próxima sessão do dia.",
                variant: "destructive",
              });
            }
          });
        }}
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
