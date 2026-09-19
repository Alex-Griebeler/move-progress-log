import { useState, memo, useMemo } from "react";
import { useStudents, useDeleteStudent } from "@/hooks/useStudents";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import i18n from "@/i18n/pt-BR.json";
import EmptyState from "@/components/EmptyState";
import { StudentCardSkeleton } from "@/components/skeletons/StudentCardSkeleton";
import { Users, Edit, Trash2, GitCompare, Plus, Link2, Mic, UserPlus, Info, AlertCircle, AlertTriangle, CheckCircle2, MinusCircle, Search, Shield, NotebookPen, MoreVertical, RefreshCw, Activity, X, UserX, TrendingDown } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ErrorState } from "@/components/ErrorState";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useStudentsRecoveryToday, type StudentRecoveryToday } from "@/hooks/useStudentsRecoveryToday";
import type { RecoverySnapshot } from "@/utils/recoverySnapshot";
import { sortStudents, type StudentsSortMode } from "@/utils/studentsAttention";

import { Link, useSearchParams } from "react-router-dom";
import { ROUTES } from "@/constants/navigation";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { StudentAvatarImage } from "@/components/StudentAvatarImage";
import { EditStudentDialog } from "@/components/EditStudentDialog";
import { AddStudentDialog } from "@/components/AddStudentDialog";
import { GenerateInviteLinkDialog } from "@/components/GenerateInviteLinkDialog";
import { RecordIndividualSessionDialog } from "@/components/RecordIndividualSessionDialog";
import { RecordGroupSessionDialog } from "@/components/RecordGroupSessionDialog";
import { StudentObservationsDialog } from "@/components/StudentObservationsDialog";
import { SendOuraConnectDialog } from "@/components/SendOuraConnectDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useStudentsCardData, StudentCardData } from "@/hooks/useStudentsCardData";
import { useStudentsActivityFilter, type StudentsActivityFilter } from "@/hooks/useStudentsActivityFilter";
import type { Student } from "@/hooks/useStudents";
import { matchesSearch } from "@/utils/searchNormalize";
import { formatFitnessLevel } from "@/utils/formatStudent";
import { PageLayout } from "@/components/PageLayout";
import { PageHeader } from "@/components/PageHeader";
import { Input } from "@/components/ui/input";

import { useOuraSyncAll } from "@/hooks/useOuraSyncAll";
import { useIsAdmin } from "@/hooks/useUserRole";
import { NAV_LABELS } from "@/constants/navigation";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useSEOHead, SEO_PRESETS } from "@/hooks/useSEOHead";
import { useOpenGraph, FABRIK_OG_DEFAULTS } from "@/hooks/useOpenGraph";
import { getWebPageSchema, getBreadcrumbSchema, getItemListSchema } from "@/utils/structuredData";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// Link "esticado": o nome cobre o card inteiro como área de clique.
const STRETCHED_LINK =
  "after:absolute after:inset-0 after:content-[''] focus-visible:outline-none focus-visible:after:rounded-lg focus-visible:after:ring-2 focus-visible:after:ring-ring";

// Faixa → rótulo + tom + ícone. Mesmas faixas por aparelho do hero da ficha
// (Oura 85/70, Whoop 67/34). A cor nunca vai sozinha: sempre rótulo + ícone.
const ZONE_PRESENTATION: Record<RecoverySnapshot["zone"], { label: string; className: string; icon: typeof CheckCircle2 }> = {
  alta: { label: "Alta", className: "text-success", icon: CheckCircle2 },
  media: { label: "Média", className: "text-warning", icon: MinusCircle },
  baixa: { label: "Baixa", className: "text-destructive", icon: AlertTriangle },
};

const getMissingFields = (student: Student) => {
  const missing: string[] = [];
  if (!student.birth_date) missing.push('Data de nascimento');
  if (!student.fitness_level) missing.push('Nível de condicionamento');
  if (!student.objectives) missing.push('Objetivos');
  if (!student.weight_kg || !student.height_cm) missing.push('Peso e altura');
  if (!student.max_heart_rate) missing.push('FC máxima');
  return missing;
};

// Interface para props do StudentCard
interface StudentCardProps {
  student: Student;
  cardData: StudentCardData | undefined;
  recovery: StudentRecoveryToday | undefined;
  /** Estado da consulta da leitura de hoje: erro nunca vira "sem leitura". */
  recoveryStatus: "loading" | "error" | "ready";
  inactive7d: boolean;
  onEdit: (student: Student) => void;
  onDelete: (id: string) => void;
  onRecordSession: (id: string, name: string) => void;
  onOpenGroupSession: () => void;
  onOuraConnect: (id: string, name: string) => void;
}

// Card inteiro navega para a ficha (link "esticado" no nome); os controles
// secundários ficam acima dele (relative z-10) e continuam operáveis.
const StudentCard = memo(({
  student,
  cardData,
  recovery,
  recoveryStatus,
  inactive7d,
  onEdit,
  onDelete,
  onRecordSession,
  onOpenGroupSession,
  onOuraConnect
}: StudentCardProps) => {
  const [showObservationsDialog, setShowObservationsDialog] = useState(false);

  const snapshot = recovery?.snapshot ?? null;
  const importantObservations = cardData?.importantObservations ?? [];
  const ouraStatus = cardData?.ouraStatus ?? { isConnected: false, hasIssues: false };
  const hasWhoop = recovery?.hasWhoop ?? false;
  const hasDevice = ouraStatus.isConnected || hasWhoop;
  const hasImportantObservations = importantObservations.length > 0;

  const missingFields = getMissingFields(student);
  const hasIncompleteData = missingFields.length > 0;
  const zone = snapshot ? ZONE_PRESENTATION[snapshot.zone] : null;
  const ZoneIcon = zone?.icon;

  return (
    <>
      <Card className="card-interactive relative overflow-hidden">
        <CardHeader className="space-y-md pb-md">
          <div className="flex items-start justify-between gap-sm">
            <div className="flex min-w-0 items-center gap-sm">
              <Avatar className="h-12 w-12 shrink-0">
                <StudentAvatarImage avatarUrl={student.avatar_url} />
                <AvatarFallback className="bg-primary/10 text-foreground text-base font-semibold">
                  {student.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              <div className="flex min-w-0 flex-col">
                <CardTitle className="text-h3 truncate">
                  <Link
                    to={ROUTES.studentDetail(student.id)}
                    className={STRETCHED_LINK}
                  >
                    {student.name}
                  </Link>
                </CardTitle>
                {student.fitness_level && (
                  <span className="text-caption text-muted-foreground">
                    {formatFitnessLevel(student.fitness_level)}
                  </span>
                )}
              </div>
            </div>

            <div className="relative z-10 flex shrink-0 items-center gap-1">
              {hasIncompleteData && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => onEdit(student)}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-md text-warning hover:bg-warning/10 transition-colors"
                      aria-label={`Cadastro incompleto: ${missingFields.join(", ")}. Completar cadastro`}
                    >
                      <AlertCircle className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="left" className="max-w-xs">
                    <p className="font-semibold text-xs">Cadastro incompleto</p>
                    <p className="text-xs">{missingFields.join(", ")}</p>
                  </TooltipContent>
                </Tooltip>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label={`Mais ações para ${student.name}`}>
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem onClick={() => onRecordSession(student.id, student.name)}>
                    <Mic className="h-4 w-4 mr-2" />
                    Registro por voz
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onOpenGroupSession}>
                    <NotebookPen className="h-4 w-4 mr-2" />
                    Registro manual
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => onEdit(student)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Editar cadastro
                  </DropdownMenuItem>
                  {!hasDevice && (
                    <DropdownMenuItem onClick={() => onOuraConnect(student.id, student.name)}>
                      <Activity className="h-4 w-4 mr-2" />
                      Enviar link do Oura
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => onDelete(student.id)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Excluir cadastro
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <div className="space-y-sm">
            {snapshot && zone && ZoneIcon ? (
              <div className="flex items-end justify-between border-t border-border/50 pt-sm">
                <div className="flex flex-col">
                  <span className="text-caption text-muted-foreground">
                    {snapshot.source === "oura" ? "Prontidão hoje · Oura" : "Recuperação hoje · Whoop"}
                  </span>
                  {/* Score 0–100 do aparelho, não porcentagem. */}
                  <span className={`text-2xl font-semibold tabular-nums ${zone.className}`}>
                    {snapshot.score}
                  </span>
                </div>
                <span className={`inline-flex items-center gap-1 text-caption font-medium ${zone.className}`}>
                  <ZoneIcon className="h-3.5 w-3.5" aria-hidden="true" />
                  {zone.label}
                </span>
              </div>
            ) : ouraStatus.isConnected && ouraStatus.hasIssues ? (
              <p className="flex items-center gap-1 border-t border-border/50 pt-sm text-caption text-muted-foreground">
                <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
                Oura sem sincronizar
              </p>
            ) : hasDevice || recoveryStatus !== "ready" ? (
              <p className="border-t border-border/50 pt-sm text-caption text-muted-foreground">
                {recoveryStatus === "loading"
                  ? "Carregando leitura de hoje"
                  : recoveryStatus === "error"
                    ? "Leitura de hoje indisponível"
                    : "Sem leitura de hoje"}
              </p>
            ) : null}

            {(inactive7d || hasImportantObservations) && (
              <div className="relative z-10 flex flex-wrap items-center gap-x-sm gap-y-1">
                {inactive7d && (
                  <span className="inline-flex items-center gap-1 text-caption font-medium text-warning">
                    <UserX className="h-3.5 w-3.5" aria-hidden="true" />
                    Sem treinar há 7+ dias
                  </span>
                )}
                {hasImportantObservations && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-10 px-2 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowObservationsDialog(true)}
                  >
                    <Info className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
                    <span className="text-caption">
                      {importantObservations.length} {importantObservations.length === 1 ? 'observação' : 'observações'}
                    </span>
                  </Button>
                )}
              </div>
            )}
          </div>
        </CardHeader>
      </Card>

      <StudentObservationsDialog
        open={showObservationsDialog}
        onOpenChange={setShowObservationsDialog}
        studentName={student.name}
        observations={importantObservations}
      />
    </>
  );
}, (prevProps, nextProps) => {
  return prevProps.student.id === nextProps.student.id &&
    prevProps.student.name === nextProps.student.name &&
    prevProps.student.updated_at === nextProps.student.updated_at &&
    prevProps.cardData === nextProps.cardData &&
    prevProps.recovery === nextProps.recovery &&
    prevProps.recoveryStatus === nextProps.recoveryStatus &&
    prevProps.inactive7d === nextProps.inactive7d;
});

StudentCard.displayName = 'StudentCard';

const INACTIVE_7D_FILTER: StudentsActivityFilter = { kind: "inactive", days: 7 };

// Componente principal da página
const StudentsPage = () => {
  usePageTitle(NAV_LABELS.students);
  useSEOHead(SEO_PRESETS.private);
  useOpenGraph({
    ...FABRIK_OG_DEFAULTS,
    title: `${NAV_LABELS.students} · Fabrik Performance`,
    description: 'Gestão de alunos e acompanhamento de treinos personalizados no sistema Fabrik Performance.',
    type: 'website',
    url: true,
  });
  
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: students, isLoading, isError, refetch } = useStudents();
  const { isAdmin } = useIsAdmin();
  const { mutate: syncAll, isPending: isSyncing } = useOuraSyncAll();
  const deleteStudent = useDeleteStudent();
  
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [deletingStudentId, setDeletingStudentId] = useState<string | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [recordingStudentId, setRecordingStudentId] = useState<string | null>(null);
  const [recordingStudentName, setRecordingStudentName] = useState<string>("");
  const [isGroupSessionDialogOpen, setIsGroupSessionDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [ouraConnectStudentId, setOuraConnectStudentId] = useState<string | null>(null);
  const [ouraConnectStudentName, setOuraConnectStudentName] = useState<string>("");
  // Padrão: quem precisa de atenção primeiro; A–Z como alternativa.
  const [sortMode, setSortMode] = useState<StudentsSortMode>("attention");

  // Batch hook - busca dados de todos os alunos em 3 queries em vez de N*3
  const studentIds = useMemo(() => students?.map(s => s.id) ?? [], [students]);
  const { data: studentsCardData } = useStudentsCardData(studentIds);
  const {
    data: recoveryToday,
    isLoading: isRecoveryLoading,
    isError: isRecoveryError,
  } = useStudentsRecoveryToday(studentIds);
  const recoveryStatus: "loading" | "error" | "ready" = isRecoveryError
    ? "error"
    : isRecoveryLoading
      ? "loading"
      : "ready";
  // Mesma RPC do KPI "Sem treinar há 7+ dias" da home.
  const { data: inactive7dSet } = useStudentsActivityFilter(INACTIVE_7D_FILTER);

  // Drill-down filter from dashboard KPIs (?inactive=N | ?dropping=true)
  const activityFilter = useMemo<StudentsActivityFilter>(() => {
    const inactiveParam = searchParams.get("inactive");
    const droppingParam = searchParams.get("dropping");
    if (inactiveParam) {
      const days = Number.parseInt(inactiveParam, 10);
      if (Number.isFinite(days) && days > 0) {
        return { kind: "inactive", days };
      }
    }
    if (droppingParam === "true") {
      return { kind: "dropping" };
    }
    return { kind: "none" };
  }, [searchParams]);

  const {
    data: activityFilterSet,
    isLoading: isActivityFilterLoading,
    isError: isActivityFilterError,
  } = useStudentsActivityFilter(activityFilter);

  const clearActivityFilter = () => {
    const next = new URLSearchParams(searchParams);
    next.delete("inactive");
    next.delete("dropping");
    setSearchParams(next, { replace: true });
  };

  const handleDelete = async (id: string) => {
    await deleteStudent.mutateAsync(id);
    setDeletingStudentId(null);
  };

  const handleRecordSession = (id: string, name: string) => {
    setRecordingStudentId(id);
    setRecordingStudentName(name);
  };

  // While the activity filter is loading, hide the full list to avoid the
  // flash of "all students" before the drill-down narrows it down.
  const isApplyingActivityFilter =
    activityFilter.kind !== "none" && isActivityFilterLoading;

  const filteredStudents = useMemo(() => {
    const matching = (students ?? []).filter(student => {
      const matchesName = matchesSearch(student.name, searchTerm);
      const matchesActivity = activityFilterSet ? activityFilterSet.has(student.id) : true;
      return matchesName && matchesActivity;
    });
    return sortStudents(matching, sortMode, (student) => {
      const observations = studentsCardData?.[student.id]?.importantObservations ?? [];
      return {
        zone: recoveryToday?.[student.id]?.snapshot?.zone ?? null,
        inactive7d: inactive7dSet?.has(student.id) ?? false,
        highSeverityObservations: observations.filter((o) => o.severity === "alta").length,
        openObservations: observations.length,
      };
    });
  }, [students, searchTerm, activityFilterSet, sortMode, studentsCardData, recoveryToday, inactive7dSet]);
  const totalStudents = students?.length ?? 0;

  const activityFilterCount = activityFilterSet?.size ?? null;
  const activityFilterLabel =
    activityFilter.kind === "inactive"
      ? `Sem treinar há ${activityFilter.days}+ dias`
      : activityFilter.kind === "dropping"
        ? "Frequência caindo"
        : null;
  const ActivityFilterIcon =
    activityFilter.kind === "inactive"
      ? UserX
      : activityFilter.kind === "dropping"
        ? TrendingDown
        : null;

  return (
    <PageLayout
      structuredData={[
        { data: getWebPageSchema(NAV_LABELS.students, "Gerencie os dados dos seus alunos, acompanhe métricas Oura Ring e registre sessões de treino"), id: "webpage-schema" },
        { data: getBreadcrumbSchema([{ label: "Home", href: "/" }, { label: NAV_LABELS.students, href: "/alunos" }]), id: "breadcrumb-schema" },
        ...(students && students.length > 0 ? [{ data: getItemListSchema(students.map(s => ({ name: s.name, url: `/alunos/${s.id}` })), "Lista de Alunos"), id: "students-list-schema" }] : []),
      ]}
    >
        <PageHeader
          title={NAV_LABELS.students}
          breadcrumbs={[{ label: NAV_LABELS.students, href: "/alunos", icon: Users }]}
          actions={
            <>
              <Button variant="default" onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
                {NAV_LABELS.addStudent}
              </Button>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" aria-label="Mais ações da lista">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-popover">
                  <DropdownMenuItem 
                    onClick={() => syncAll()}
                    disabled={isSyncing}
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
                    {isSyncing ? 'Sincronizando…' : 'Sincronizar Oura de todos'}
                  </DropdownMenuItem>
                  
                  {isAdmin && (
                    <DropdownMenuItem asChild>
                      <Link to="/admin/diagnostico-oura" className="flex items-center w-full">
                        <Shield className="h-4 w-4 mr-2" />
                        {NAV_LABELS.adminDiagnostics}
                      </Link>
                    </DropdownMenuItem>
                  )}
                  
                  <DropdownMenuItem onClick={() => setIsGroupSessionDialogOpen(true)}>
                    <UserPlus className="h-4 w-4 mr-2" />
                    {NAV_LABELS.groupSession}
                  </DropdownMenuItem>
                  
                  <DropdownMenuItem onClick={() => setIsInviteDialogOpen(true)}>
                    <Link2 className="h-4 w-4 mr-2" />
                    {NAV_LABELS.generateInvite}
                  </DropdownMenuItem>
                  
                  <DropdownMenuItem asChild>
                    <Link to="/alunos-comparacao" className="flex items-center w-full">
                      <GitCompare className="h-4 w-4 mr-2" />
                      {NAV_LABELS.studentsComparison}
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          }
        />

        <div className="flex flex-col gap-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <Input
              type="search"
              placeholder="Buscar por nome"
              aria-label="Buscar por nome"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex items-center gap-sm">
            {!isLoading && !isError && totalStudents > 0 && (
              <span className="text-caption text-muted-foreground tabular-nums" aria-live="polite">
                {filteredStudents.length === totalStudents
                  ? `${totalStudents} ${totalStudents === 1 ? "cadastro" : "cadastros"}`
                  : `${filteredStudents.length} de ${totalStudents}`}
              </span>
            )}
            <ToggleGroup
              type="single"
              value={sortMode}
              onValueChange={(value) => value && setSortMode(value as StudentsSortMode)}
              aria-label="Ordenar lista"
              className="rounded-md border p-0.5"
            >
              <ToggleGroupItem value="attention" className="h-10 px-3 text-sm">
                Atenção primeiro
              </ToggleGroupItem>
              <ToggleGroupItem value="alpha" className="h-10 px-3 text-sm">
                A–Z
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
          {sortMode === "attention" && recoveryStatus === "error" && (
            <p className="text-caption text-muted-foreground" role="status">
              Leituras de hoje indisponíveis. A ordem por atenção considera só treinos e observações.
            </p>
          )}
        </div>

        {activityFilterLabel && ActivityFilterIcon && (
          <div
            className={`flex items-center gap-sm rounded-md border px-md py-sm text-sm ${
              isActivityFilterError
                ? "border-destructive/30 bg-destructive/5"
                : "border-warning/30 bg-warning/5"
            }`}
          >
            <ActivityFilterIcon
              className={`h-4 w-4 ${isActivityFilterError ? "text-destructive" : "text-warning"}`}
              aria-hidden="true"
            />
            <span className="font-medium">
              {isActivityFilterError
                ? "Não foi possível aplicar o filtro da página inicial"
                : isApplyingActivityFilter
                  ? `Aplicando filtro: ${activityFilterLabel.toLowerCase()}…`
                  : activityFilterCount !== null
                    ? `${activityFilterCount} aluno${activityFilterCount === 1 ? "" : "s"}: ${activityFilterLabel.toLowerCase()}`
                    : `Filtro ativo: ${activityFilterLabel.toLowerCase()}`}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearActivityFilter}
              className="ml-auto h-10 px-sm"
            >
              <X className="h-3 w-3 mr-1" aria-hidden="true" />
              Limpar filtro
            </Button>
          </div>
        )}

        {isError ? (
          // Erro de rede/permissão nunca vira "adicione o primeiro".
          <ErrorState
            title={i18n.modules.students.errorLoad}
            description="Verifique a conexão e tente de novo. Nenhum cadastro foi alterado."
            onRetry={() => refetch()}
          />
        ) : isLoading || isApplyingActivityFilter || (sortMode === "attention" && recoveryStatus === "loading") ? (
          <div className="grid gap-md md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <StudentCardSkeleton key={i} />
            ))}
          </div>
        ) : filteredStudents && filteredStudents.length > 0 ? (
          <div className="grid gap-md md:grid-cols-2 lg:grid-cols-3">
            {filteredStudents.map((student) => (
              <StudentCard 
                key={student.id} 
                student={student}
                cardData={studentsCardData?.[student.id]}
                recovery={recoveryToday?.[student.id]}
                recoveryStatus={recoveryStatus}
                inactive7d={inactive7dSet?.has(student.id) ?? false}
                onEdit={setEditingStudent}
                onDelete={setDeletingStudentId}
                onRecordSession={handleRecordSession}
                onOpenGroupSession={() => setIsGroupSessionDialogOpen(true)}
                onOuraConnect={(id, name) => {
                  setOuraConnectStudentId(id);
                  setOuraConnectStudentName(name);
                }}
              />
            ))}
          </div>
        ) : searchTerm ? (
          <EmptyState
            icon={<Search className="h-6 w-6" />}
            title="Nenhum aluno encontrado"
            description="Confira a grafia ou limpe a busca para ver todos os cadastros."
            primaryAction={{
              label: "Limpar busca",
              onClick: () => setSearchTerm(""),
            }}
          />
        ) : activityFilter.kind !== "none" ? (
          <EmptyState
            icon={<Users className="h-6 w-6" />}
            title="Nenhum cadastro neste filtro"
            description={
              activityFilter.kind === "inactive"
                ? `Todos registraram sessão nos últimos ${activityFilter.days} dias.`
                : "Nenhuma frequência em queda nas últimas 4 semanas."
            }
            primaryAction={{
              label: "Limpar filtro",
              onClick: clearActivityFilter,
            }}
          />
        ) : (
          <EmptyState
            icon={<Users className="h-6 w-6" />}
            title="Nenhum cadastro ainda"
            description="Cadastre diretamente ou envie um link de convite para a pessoa preencher."
            primaryAction={{
              label: NAV_LABELS.addStudent,
              onClick: () => setIsAddDialogOpen(true)
            }}
            secondaryAction={{
              label: NAV_LABELS.generateInvite,
              onClick: () => setIsInviteDialogOpen(true)
            }}
          />
        )}

      <AddStudentDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
      />

      <EditStudentDialog
        student={editingStudent}
        open={!!editingStudent}
        onOpenChange={(open) => !open && setEditingStudent(null)}
      />

      <GenerateInviteLinkDialog
        open={isInviteDialogOpen}
        onOpenChange={setIsInviteDialogOpen}
      />

      <RecordIndividualSessionDialog
        open={!!recordingStudentId}
        onOpenChange={(open) => {
          if (!open) {
            setRecordingStudentId(null);
            setRecordingStudentName("");
          }
        }}
        studentId={recordingStudentId || ""}
        studentName={recordingStudentName}
      />

      <RecordGroupSessionDialog
        open={isGroupSessionDialogOpen}
        onOpenChange={setIsGroupSessionDialogOpen}
        prescriptionId={null}
      />

      <AlertDialog open={!!deletingStudentId} onOpenChange={(open) => !open && setDeletingStudentId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{i18n.modules.students.confirmDelete}</AlertDialogTitle>
            <AlertDialogDescription>
              {i18n.modules.students.deleteWarning}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{i18n.actions.cancel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingStudentId && handleDelete(deletingStudentId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {i18n.actions.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {ouraConnectStudentId && (
        <SendOuraConnectDialog
          open={!!ouraConnectStudentId}
          onOpenChange={(open) => {
            if (!open) {
              setOuraConnectStudentId(null);
              setOuraConnectStudentName("");
            }
          }}
          studentId={ouraConnectStudentId}
          studentName={ouraConnectStudentName}
        />
      )}
    </PageLayout>
  );
};

export default StudentsPage;
