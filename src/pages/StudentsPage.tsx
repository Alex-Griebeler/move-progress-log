import { useState, memo, useMemo } from "react";
import { useStudents, useDeleteStudent } from "@/hooks/useStudents";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import i18n from "@/i18n/pt-BR.json";
import EmptyState from "@/components/EmptyState";
import { StudentCardSkeleton } from "@/components/skeletons/StudentCardSkeleton";
import { ArrowLeft, Users, Edit, Trash2, Eye, GitCompare, Plus, Link2, Mic, UserPlus, Info, AlertCircle, Search, Shield, NotebookPen, MoreVertical, RefreshCw } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Link, useNavigate } from "react-router-dom";
import { ROUTES } from "@/constants/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { EditStudentDialog } from "@/components/EditStudentDialog";
import { AddStudentDialog } from "@/components/AddStudentDialog";
import { GenerateInviteLinkDialog } from "@/components/GenerateInviteLinkDialog";
import { RecordIndividualSessionDialog } from "@/components/RecordIndividualSessionDialog";
import { RecordGroupSessionDialog } from "@/components/RecordGroupSessionDialog";
import { StudentObservationsDialog } from "@/components/StudentObservationsDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useStudentsCardData, StudentCardData } from "@/hooks/useStudentsCardData";
import type { Student } from "@/hooks/useStudents";
import { AppHeader } from "@/components/AppHeader";
import { Input } from "@/components/ui/input";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { useOuraSyncAll } from "@/hooks/useOuraSyncAll";
import { useIsAdmin } from "@/hooks/useUserRole";
import { NAV_LABELS } from "@/constants/navigation";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useSEOHead, SEO_PRESETS } from "@/hooks/useSEOHead";
import { useOpenGraph, FABRIK_OG_DEFAULTS } from "@/hooks/useOpenGraph";
import { StructuredData } from "@/components/StructuredData";
import { getOrganizationSchema, getWebPageSchema, getBreadcrumbSchema, getItemListSchema } from "@/utils/structuredData";
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

// Funções auxiliares movidas para fora do componente (otimização)
const getReadinessColor = (score: number | null | undefined) => {
  if (!score) return 'text-muted-foreground';
  if (score >= 85) return 'text-green-500';
  if (score >= 70) return 'text-yellow-500';
  return 'text-red-500';
};

const getReadinessLabel = (score: number | null | undefined) => {
  if (!score) return 'Sem dados';
  if (score >= 85) return 'Ótimo';
  if (score >= 70) return 'Bom';
  if (score >= 55) return 'Regular';
  return 'Crítico';
};

const getMissingFields = (student: Student) => {
  const missing: string[] = [];
  if (!student.birth_date) missing.push('Data de nascimento');
  if (!student.fitness_level) missing.push('Nível de fitness');
  if (!student.objectives) missing.push('Objetivos');
  if (!student.weight_kg || !student.height_cm) missing.push('Peso/Altura');
  if (!student.max_heart_rate) missing.push('FC Máxima');
  return missing;
};

// Interface para props do StudentCard
interface StudentCardProps {
  student: Student;
  cardData: StudentCardData | undefined;
  onEdit: (student: Student) => void;
  onDelete: (id: string) => void;
  onRecordSession: (id: string, name: string) => void;
  onOpenGroupSession: () => void;
}

// Componente StudentCard otimizado - recebe dados via props em vez de fazer queries
const StudentCard = memo(({ 
  student, 
  cardData, 
  onEdit, 
  onDelete, 
  onRecordSession,
  onOpenGroupSession 
}: StudentCardProps) => {
  const navigate = useNavigate();
  const [showObservationsDialog, setShowObservationsDialog] = useState(false);
  
  // Dados vindos do batch hook (sem queries individuais)
  const readinessScore = cardData?.ouraMetrics?.readiness_score ?? null;
  const importantObservations = cardData?.importantObservations ?? [];
  const ouraStatus = cardData?.ouraStatus ?? { isConnected: false, hasIssues: false };
  const hasImportantObservations = importantObservations.length > 0;
  
  const missingFields = getMissingFields(student);
  const hasIncompleteData = missingFields.length > 0;

  return (
    <>
      <Card className="card-interactive overflow-hidden">
        <CardHeader className="space-y-md pb-sm">
          <CardTitle className="flex items-center justify-between gap-sm">
            <div className="flex items-center gap-sm">
              <Avatar className="h-16 w-16">
                <AvatarImage src={student.avatar_url || undefined} />
                <AvatarFallback className="bg-primary/10 text-foreground text-lg font-semibold">
                  {student.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <span className="text-lg font-semibold">{student.name}</span>
                {student.fitness_level && (
                  <Badge variant="outline" className="text-xs capitalize w-fit mt-1 opacity-70">
                    {student.fitness_level}
                  </Badge>
                )}
              </div>
            </div>
            
            {hasIncompleteData && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => onEdit(student)}
                      className="inline-flex items-center justify-center rounded-full p-2 hover:bg-warning/10 transition-colors border border-warning/20"
                      aria-label="Dados incompletos - clique para completar"
                    >
                      <AlertCircle className="h-4 w-4 text-warning" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="left" className="max-w-xs">
                    <div className="space-y-2">
                      <p className="font-semibold text-xs">Campos a preencher:</p>
                      <ul className="text-xs space-y-1">
                        {missingFields.map((field) => (
                          <li key={field} className="flex items-start gap-1">
                            <span className="text-warning">•</span>
                            <span>{field}</span>
                          </li>
                        ))}
                      </ul>
                      <p className="text-xs text-muted-foreground italic pt-1">
                        Clique para editar o perfil
                      </p>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </CardTitle>
          
          <CardDescription className="space-y-sm">
            {readinessScore ? (
              <div className="flex items-center justify-between py-sm border-b border-border/50">
                <div className="flex flex-col gap-xs">
                  <span className="text-xs text-muted-foreground uppercase tracking-wide">Prontidão</span>
                  <span className={`text-2xl font-semibold tabular-nums ${getReadinessColor(readinessScore)}`}>
                    {readinessScore}%
                  </span>
                </div>
                <Badge variant="outline" className="text-xs">
                  {getReadinessLabel(readinessScore)}
                </Badge>
              </div>
            ) : ouraStatus.isConnected && ouraStatus.hasIssues ? (
              <Alert className="border-muted bg-transparent py-xs px-sm">
                <AlertCircle className="h-3 w-3 text-muted-foreground" />
                <AlertDescription className="text-xs text-muted-foreground">
                  Dados Oura indisponíveis
                </AlertDescription>
              </Alert>
            ) : ouraStatus.isConnected ? (
              <div className="flex items-center justify-between py-xs px-sm rounded-md border border-dashed">
                <span className="text-xs text-muted-foreground">Aguardando dados Oura</span>
              </div>
            ) : null}
            
            {hasImportantObservations && (
              <Button
                variant="outline"
                size="sm"
                className="w-full h-9 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                onClick={() => setShowObservationsDialog(true)}
                aria-label={`Ver ${importantObservations.length} observações importantes`}
              >
                <Info className="h-3 w-3 mr-2" />
                <span className="text-xs">
                  {importantObservations.length} observação{importantObservations.length !== 1 ? 'ões' : ''}
                </span>
              </Button>
            )}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="pt-sm pb-md">
          <div className="flex gap-xs">
            <Button
              variant="default"
              size="default"
              className="flex-1 shadow-sm hover:shadow-md transition-shadow"
              onClick={() => navigate(ROUTES.studentDetail(student.id))}
              aria-label={`Ver detalhes de ${student.name}`}
            >
              <Eye className="h-4 w-4 mr-2" />
              Detalhes
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" aria-label="Mais ações">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={() => onRecordSession(student.id, student.name)}>
                  <Mic className="h-4 w-4 mr-2" />
                  Registro por Voz
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onOpenGroupSession}>
                  <NotebookPen className="h-4 w-4 mr-2" />
                  Registro Manual
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onEdit(student)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Editar Aluno
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onDelete(student.id)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Excluir Aluno
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
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
    prevProps.cardData === nextProps.cardData;
});

StudentCard.displayName = 'StudentCard';

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
  
  const navigate = useNavigate();
  const { data: students, isLoading } = useStudents();
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

  // Batch hook - busca dados de todos os alunos em 3 queries em vez de N*3
  const studentIds = useMemo(() => students?.map(s => s.id) ?? [], [students]);
  const { data: studentsCardData } = useStudentsCardData(studentIds);

  const handleDelete = async (id: string) => {
    await deleteStudent.mutateAsync(id);
    setDeletingStudentId(null);
  };

  const handleRecordSession = (id: string, name: string) => {
    setRecordingStudentId(id);
    setRecordingStudentName(name);
  };

  const filteredStudents = students?.filter(student =>
    student.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background animate-fade-in">
      <StructuredData data={getOrganizationSchema()} id="org-schema" />
      <StructuredData 
        data={getWebPageSchema(
          NAV_LABELS.students,
          "Gerencie os dados dos seus alunos, acompanhe métricas Oura Ring e registre sessões de treino"
        )} 
        id="webpage-schema" 
      />
      <StructuredData 
        data={getBreadcrumbSchema([
          { label: "Home", href: "/" },
          { label: NAV_LABELS.students, href: "/alunos" }
        ])} 
        id="breadcrumb-schema" 
      />
      {students && students.length > 0 && (
        <StructuredData 
          data={getItemListSchema(
            students.map(s => ({ name: s.name, url: `/alunos/${s.id}` })),
            "Lista de Alunos"
          )} 
          id="students-list-schema" 
        />
      )}
      
      <div id="main-content" className="container mx-auto p-lg space-y-lg" role="main">
        <Breadcrumbs 
          items={[
            { label: NAV_LABELS.students, href: "/alunos", icon: Users }
          ]}
        />
        
        <AppHeader
          title={NAV_LABELS.students}
          actions={
            <>
              <Button variant="default" onClick={() => setIsAddDialogOpen(true)} aria-label={NAV_LABELS.addStudent}>
                <Plus className="h-4 w-4 mr-2" />
                {NAV_LABELS.addStudent}
              </Button>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" aria-label="Mais ações">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-popover">
                  <DropdownMenuItem 
                    onClick={() => syncAll()}
                    disabled={isSyncing}
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
                    {isSyncing ? 'Sincronizando...' : 'Sincronizar Todos Agora'}
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

              <Link to="/">
                <Button variant="ghost" size="icon" aria-label="Voltar para página inicial">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
            </>
          }
        />

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Buscar aluno por nome..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {isLoading ? (
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
                onEdit={setEditingStudent}
                onDelete={setDeletingStudentId}
                onRecordSession={handleRecordSession}
                onOpenGroupSession={() => setIsGroupSessionDialogOpen(true)}
              />
            ))}
          </div>
        ) : searchTerm ? (
          <EmptyState
            icon={<Search className="h-6 w-6" />}
            title="Nenhum aluno encontrado"
            description="Nenhum aluno corresponde aos termos de busca. Verifique a ortografia ou limpe a busca para ver todos os alunos cadastrados."
            primaryAction={{
              label: "Limpar busca",
              onClick: () => setSearchTerm(""),
            }}
          />
        ) : (
          <EmptyState
            icon={<Users className="h-6 w-6" />}
            title="Adicione seu primeiro aluno"
            description="Cadastre alunos para começar a criar prescrições personalizadas, registrar sessões de treino e acompanhar a evolução com dados do Oura Ring. Seu hub completo de gestão de alunos."
            primaryAction={{
              label: i18n.actions.create,
              onClick: () => setIsAddDialogOpen(true)
            }}
            secondaryAction={{
              label: i18n.actions.import,
              onClick: () => setIsInviteDialogOpen(true)
            }}
          />
        )}
      </div>

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
    </div>
  );
};

export default StudentsPage;
