import { useState } from "react";
import { useStudents, useDeleteStudent } from "@/hooks/useStudents";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ArrowLeft, Users, Edit, Trash2, Eye, GitCompare, Plus, Link2, Mic, UserPlus, Info, AlertCircle } from "lucide-react";
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
  const deleteStudent = useDeleteStudent();
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [deletingStudentId, setDeletingStudentId] = useState<string | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [recordingStudentId, setRecordingStudentId] = useState<string | null>(null);
  const [recordingStudentName, setRecordingStudentName] = useState<string>("");
  const [isGroupSessionDialogOpen, setIsGroupSessionDialogOpen] = useState(false);

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
            
            <CardDescription className="space-y-2">
              {/* Nível de Fitness */}
              {student.fitness_level && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium">Nível:</span>
                  <Badge variant="outline" className="capitalize">
                    {student.fitness_level}
                  </Badge>
                </div>
              )}
              
              {/* Readiness Oura Ring */}
              {readinessScore && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium">Readiness:</span>
                  <span className={`font-bold ${getReadinessColor(readinessScore)}`}>
                    {readinessScore}%
                  </span>
                </div>
              )}
              
              {/* Observações Importantes */}
              {hasImportantObservations && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-3 text-amber-600 hover:text-amber-700 hover:bg-amber-50 border border-amber-200"
                    onClick={() => setShowObservationsDialog(true)}
                  >
                    <AlertCircle className="h-4 w-4 mr-2" />
                    <span className="text-xs font-medium">
                      {importantObservations.length} observação{importantObservations.length !== 1 ? 'ões' : ''}
                    </span>
                    <Info className="h-3 w-3 ml-2 opacity-70" />
                  </Button>
                </div>
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
              >
                <Mic className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditingStudent(student)}
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setDeletingStudentId(student.id)}
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

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 space-y-6">
        <AppHeader
          title="Gestão de Alunos"
          subtitle="Gerencie os dados dos seus alunos"
          actions={
            <>
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
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
            </>
          }
        />

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
        ) : students && students.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {students.map((student) => (
              <StudentCard key={student.id} student={student} />
            ))}
          </div>
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
