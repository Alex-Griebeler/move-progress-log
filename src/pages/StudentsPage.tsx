import { useState } from "react";
import { useStudents, useDeleteStudent } from "@/hooks/useStudents";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { notify } from "@/lib/notify";
import i18n from "@/i18n/pt-BR.json";
import EmptyState from "@/components/EmptyState";
import { ArrowLeft, Users, Edit, Trash2, Eye, GitCompare, Plus, Link2, Mic, UserPlus, Info, AlertCircle, Search, Shield, NotebookPen } from "lucide-react";
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
} from "@/components/ui/dropdown-menu";
import { useLatestOuraMetrics } from "@/hooks/useOuraMetrics";
import { useStudentImportantObservations } from "@/hooks/useStudentImportantObservations";
import { useOuraConnectionStatus } from "@/hooks/useOuraConnectionStatus";
import type { Student } from "@/hooks/useStudents";
import { AppHeader } from "@/components/AppHeader";
import { Input } from "@/components/ui/input";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { OuraSyncAllButton } from "@/components/OuraSyncAllButton";
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
  const deleteStudent = useDeleteStudent();
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [deletingStudentId, setDeletingStudentId] = useState<string | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [recordingStudentId, setRecordingStudentId] = useState<string | null>(null);
  const [recordingStudentName, setRecordingStudentName] = useState<string>("");
  const [isGroupSessionDialogOpen, setIsGroupSessionDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const handleDelete = async (id: string) => {
    await deleteStudent.mutateAsync(id);
    setDeletingStudentId(null);
  };

  const StudentCard = ({ student }: { student: Student }) => {
    const { data: ouraMetrics } = useLatestOuraMetrics(student.id);
    const { data: importantObservations } = useStudentImportantObservations(student.id);
    const { data: ouraStatus } = useOuraConnectionStatus(student.id);
    const [showObservationsDialog, setShowObservationsDialog] = useState(false);
    
    const readinessScore = ouraMetrics?.readiness_score;
    const hasImportantObservations = importantObservations && importantObservations.length > 0;
    
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

    const calculateIMC = () => {
      if (student.weight_kg && student.height_cm) {
        const heightM = student.height_cm / 100;
        return (student.weight_kg / (heightM * heightM)).toFixed(1);
      }
      return null;
    };

    const getMissingFields = () => {
      const missing: string[] = [];
      
      if (!student.birth_date) missing.push('Data de nascimento');
      if (!student.fitness_level) missing.push('Nível de fitness');
      if (!student.objectives) missing.push('Objetivos');
      if (!student.weight_kg || !student.height_cm) missing.push('Peso/Altura');
      if (!student.max_heart_rate) missing.push('FC Máxima');
      
      return missing;
    };

    const imc = calculateIMC();
    const missingFields = getMissingFields();
    const hasIncompleteData = missingFields.length > 0;

    return (
      <>
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={student.avatar_url || undefined} />
                <AvatarFallback>{student.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <span className="flex-1">{student.name}</span>
            </CardTitle>
            
            <CardDescription className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                {/* Nível de Fitness */}
                {student.fitness_level && (
                  <div className="flex flex-col">
                    <span className="text-xs text-muted-foreground">Nível</span>
                    <Badge variant="outline" className="capitalize w-fit mt-1">
                      {student.fitness_level}
                    </Badge>
                  </div>
                )}
                
                {/* IMC */}
                {imc && (
                  <div className="flex flex-col">
                    <span className="text-xs text-muted-foreground">IMC</span>
                    <span className="text-sm font-semibold mt-1">{imc}</span>
                  </div>
                )}
              </div>

              {/* Readiness Oura Ring - Destaque maior */}
              {readinessScore ? (
                <div className="flex items-center justify-between p-2 rounded-md bg-muted/30">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Prontidão</span>
                    <Badge variant="secondary" className="text-xs">
                      {getReadinessLabel(readinessScore)}
                    </Badge>
                  </div>
                  <span className={`text-xl font-bold ${getReadinessColor(readinessScore)}`}>
                    {readinessScore}%
                  </span>
                </div>
              ) : ouraStatus?.isConnected && ouraStatus.hasIssues ? (
                <div className="flex items-center justify-between p-2 rounded-md bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-500" />
                    <span className="text-xs text-yellow-700 dark:text-yellow-400 font-medium">
                      Problema na sync Oura
                    </span>
                  </div>
                </div>
              ) : ouraStatus?.isConnected ? (
                <div className="flex items-center justify-between p-2 rounded-md bg-muted/20 border border-dashed">
                  <span className="text-xs text-muted-foreground">Aguardando dados Oura</span>
                </div>
              ) : null}
              
              {/* Alerta de Dados Incompletos - Ícone Minimalista */}
              {hasIncompleteData && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => setEditingStudent(student)}
                        className="inline-flex items-center justify-center rounded-full p-1.5 hover:bg-amber-100 dark:hover:bg-amber-950/50 transition-colors"
                        aria-label={`Dados incompletos - Clique para completar dados de ${student.name}`}
                      >
                        <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-500" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <p className="text-xs">Dados incompletos - Clique para completar</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              
              {/* Observações Importantes */}
              {hasImportantObservations && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full h-9 text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:text-amber-500 dark:hover:text-amber-400 dark:hover:bg-amber-950/30 border border-amber-200 dark:border-amber-800"
                  onClick={() => setShowObservationsDialog(true)}
                  aria-label={`Ver ${importantObservations.length} observações importantes de ${student.name}`}
                >
                  <AlertCircle className="h-4 w-4 mr-2" />
                  <span className="text-xs font-medium">
                    {importantObservations.length} observação{importantObservations.length !== 1 ? 'ões' : ''} importante{importantObservations.length !== 1 ? 's' : ''}
                  </span>
                  <Info className="h-3 w-3 ml-2 opacity-70" />
                </Button>
              )}
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <div className="flex gap-2">
              <Button
                variant="default"
                size="sm"
                className="flex-1"
                onClick={() => navigate(ROUTES.studentDetail(student.id))}
                aria-label={`Ver detalhes de ${student.name}`}
              >
                <Eye className="h-4 w-4 mr-2" />
                Detalhes
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="secondary"
                    size="sm"
                    aria-label={`Registrar sessão para ${student.name}`}
                    title="Registrar sessão"
                  >
                    <NotebookPen className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => {
                      setRecordingStudentId(student.id);
                      setRecordingStudentName(student.name);
                    }}
                  >
                    <Mic className="h-4 w-4 mr-2" />
                    Registro por Voz
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      // Abre o dialog de grupo com apenas esse aluno pré-selecionado
                      setIsGroupSessionDialogOpen(true);
                      // TODO: Pre-selecionar esse aluno no dialog
                    }}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Registro Manual
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditingStudent(student)}
                aria-label={`Editar informações de ${student.name}`}
                title="Editar aluno"
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setDeletingStudentId(student.id)}
                aria-label={`Excluir aluno ${student.name}`}
                title="Excluir aluno"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
        
        {/* Dialog de Observações */}
        <StudentObservationsDialog
          open={showObservationsDialog}
          onOpenChange={setShowObservationsDialog}
          studentName={student.name}
          observations={importantObservations || []}
        />
      </>
    );
  };

  const filteredStudents = students?.filter(student =>
    student.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Structured Data para SEO */}
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
      
      <div id="main-content" className="container mx-auto p-6 space-y-6" role="main">
        <Breadcrumbs 
          items={[
            { label: NAV_LABELS.students, href: "/alunos", icon: Users }
          ]}
        />
        
        <AppHeader
          title={NAV_LABELS.students}
          subtitle={NAV_LABELS.subtitleStudents}
          actions={
            <>
              <OuraSyncAllButton />
              {isAdmin && (
                <Link to="/admin/diagnostico-oura">
                  <Button variant="outline" aria-label={NAV_LABELS.adminDiagnostics}>
                    <Shield className="h-4 w-4 mr-2" />
                    {NAV_LABELS.adminDiagnostics}
                  </Button>
                </Link>
              )}
              <Button variant="gradient" onClick={() => setIsAddDialogOpen(true)} aria-label={NAV_LABELS.addStudent}>
                <Plus className="h-4 w-4 mr-2" />
                {NAV_LABELS.addStudent}
              </Button>
              <Button variant="default" onClick={() => setIsGroupSessionDialogOpen(true)} aria-label={NAV_LABELS.groupSession}>
                <UserPlus className="h-4 w-4 mr-2" />
                {NAV_LABELS.groupSession}
              </Button>
              <Button variant="outline" onClick={() => setIsInviteDialogOpen(true)} aria-label={NAV_LABELS.generateInvite}>
                <Link2 className="h-4 w-4 mr-2" />
                {NAV_LABELS.generateInvite}
              </Button>
              <Link to="/alunos-comparacao">
                <Button variant="outline" aria-label={NAV_LABELS.studentsComparison}>
                  <GitCompare className="h-4 w-4 mr-2" />
                  {NAV_LABELS.studentsComparison}
                </Button>
              </Link>
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
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-10 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredStudents && filteredStudents.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredStudents.map((student) => (
              <StudentCard key={student.id} student={student} />
            ))}
          </div>
        ) : searchTerm ? (
          <EmptyState
            icon={<Search className="h-6 w-6" />}
            title={i18n.empty.filtered.title}
            description={i18n.empty.filtered.description}
            secondaryAction={{
              label: i18n.filters.clear,
              onClick: () => setSearchTerm("")
            }}
          />
        ) : (
          <EmptyState
            icon={<Users className="h-6 w-6" />}
            title={i18n.empty.students.title}
            description={i18n.empty.students.description}
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
