import { useState } from "react";
import { useStudents, useDeleteStudent } from "@/hooks/useStudents";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ArrowLeft, Users, Edit, Trash2, Eye, GitCompare, Plus, Link2, Mic, UserPlus, Info, AlertCircle, Search, Shield } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { EditStudentDialog } from "@/components/EditStudentDialog";
import { AddStudentDialog } from "@/components/AddStudentDialog";
import { GenerateInviteLinkDialog } from "@/components/GenerateInviteLinkDialog";
import { RecordIndividualSessionDialog } from "@/components/RecordIndividualSessionDialog";
import { RecordGroupSessionDialog } from "@/components/RecordGroupSessionDialog";
import { StudentObservationsDialog } from "@/components/StudentObservationsDialog";
import { useLatestOuraMetrics } from "@/hooks/useOuraMetrics";
import { useStudentImportantObservations } from "@/hooks/useStudentImportantObservations";
import type { Student } from "@/hooks/useStudents";
import { AppHeader } from "@/components/AppHeader";
import { Input } from "@/components/ui/input";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { OuraSyncAllButton } from "@/components/OuraSyncAllButton";
import { OuraSyncStatusCard } from "@/components/OuraSyncStatusCard";
import { useIsAdmin } from "@/hooks/useUserRole";
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
    try {
      await deleteStudent.mutateAsync(id);
      toast.success("Aluno excluído com sucesso");
      setDeletingStudentId(null);
    } catch (error: any) {
      toast.error(error.message || "Erro ao excluir aluno");
    }
  };

  const StudentCard = ({ student }: { student: Student }) => {
    const { data: ouraMetrics } = useLatestOuraMetrics(student.id);
    const { data: importantObservations } = useStudentImportantObservations(student.id);
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

    const imc = calculateIMC();

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
                <div className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
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
              ) : (
                <div className="flex items-center justify-between p-2 rounded-lg bg-muted/20 border border-dashed">
                  <span className="text-xs text-muted-foreground">Sem dados de prontidão</span>
                </div>
              )}
              
              {/* Observações Importantes */}
              {hasImportantObservations && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full h-9 text-amber-600 hover:text-amber-700 hover:bg-amber-50 border border-amber-200"
                  onClick={() => setShowObservationsDialog(true)}
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
                onClick={() => navigate(`/alunos/${student.id}`)}
                aria-label={`Ver detalhes de ${student.name}`}
              >
                <Eye className="h-4 w-4 mr-2" />
                Detalhes
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setRecordingStudentId(student.id);
                  setRecordingStudentName(student.name);
                }}
                aria-label={`Registrar sessão por voz para ${student.name}`}
                title="Registrar sessão por voz"
              >
                <Mic className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditingStudent(student)}
                aria-label={`Editar dados de ${student.name}`}
                title="Editar aluno"
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setDeletingStudentId(student.id)}
                aria-label={`Excluir ${student.name}`}
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
      <div id="main-content" className="container mx-auto p-6 space-y-6" role="main">
        <Breadcrumbs 
          items={[
            { label: "Alunos", href: "/alunos", icon: Users }
          ]}
        />
        
        <AppHeader
          title="Gestão de Alunos"
          subtitle="Gerencie os dados dos seus alunos"
          actions={
            <>
              <OuraSyncAllButton />
              {isAdmin && (
                <Link to="/admin/diagnostico-oura">
                  <Button variant="outline">
                    <Shield className="h-4 w-4 mr-2" />
                    Diagnóstico API
                  </Button>
                </Link>
              )}
              <Button variant="gradient" onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Aluno
              </Button>
              <Button variant="default" onClick={() => setIsGroupSessionDialogOpen(true)}>
                <UserPlus className="h-4 w-4 mr-2" />
                Sessão em Grupo
              </Button>
              <Button variant="outline" onClick={() => setIsInviteDialogOpen(true)}>
                <Link2 className="h-4 w-4 mr-2" />
                Gerar Link de Convite
              </Button>
              <Link to="/alunos-comparacao">
                <Button variant="outline">
                  <GitCompare className="h-4 w-4 mr-2" />
                  Comparar Alunos
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

        {/* Status da Sincronização Oura */}
        {isAdmin && <OuraSyncStatusCard />}

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
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Search className="h-16 w-16 text-muted-foreground mb-4" />
              <p className="text-xl font-semibold text-muted-foreground">
                Nenhum aluno encontrado
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Tente buscar por outro nome
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Users className="h-16 w-16 text-muted-foreground mb-4" />
              <p className="text-xl font-semibold text-muted-foreground">
                Nenhum aluno cadastrado
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Os alunos são criados automaticamente ao registrar sessões
              </p>
            </CardContent>
          </Card>
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
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este aluno? Esta ação não pode ser desfeita.
              Todas as sessões e exercícios associados serão mantidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingStudentId && handleDelete(deletingStudentId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default StudentsPage;
