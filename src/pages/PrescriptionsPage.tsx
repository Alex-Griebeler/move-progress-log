import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Users, Calendar } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { usePrescriptions } from "@/hooks/usePrescriptions";
import { CreatePrescriptionDialog } from "@/components/CreatePrescriptionDialog";
import { AssignPrescriptionDialog } from "@/components/AssignPrescriptionDialog";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { AppHeader } from "@/components/AppHeader";

export default function PrescriptionsPage() {
  const { data: prescriptions, isLoading } = usePrescriptions();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedPrescriptionId, setSelectedPrescriptionId] = useState<string | null>(null);

  const handleAssign = (prescriptionId: string) => {
    setSelectedPrescriptionId(prescriptionId);
    setAssignDialogOpen(true);
  };

  const getAssignmentBadge = (count: number) => {
    if (count === 0) {
      return (
        <Badge variant="outline" className="gap-1.5 border-destructive/50 text-destructive">
          <div className="h-2 w-2 rounded-full bg-destructive" />
          Não atribuída
        </Badge>
      );
    }
    if (count === 1) {
      return (
        <Badge variant="outline" className="gap-1.5 border-yellow-500/50 text-yellow-600 dark:text-yellow-500">
          <div className="h-2 w-2 rounded-full bg-yellow-500" />
          1 aluno
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="gap-1.5 border-green-500/50 text-green-600 dark:text-green-500">
        <div className="h-2 w-2 rounded-full bg-green-500" />
        {count} alunos
      </Badge>
    );
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <AppHeader
          title="Prescrições de Treino"
          subtitle="Crie e gerencie prescrições de treino para seus alunos"
          actions={
            <Button
              onClick={() => setCreateDialogOpen(true)}
              className="gap-2"
              size="lg"
            >
              <Plus className="h-5 w-5" />
              Nova Prescrição
            </Button>
          }
        />

        {isLoading ? (
          <div className="text-center text-muted-foreground py-12">
            Carregando prescrições...
          </div>
        ) : prescriptions && prescriptions.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {prescriptions.map((prescription) => (
              <Card key={prescription.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-xl truncate">{prescription.name}</CardTitle>
                      {prescription.objective && (
                        <CardDescription className="mt-2 line-clamp-2">
                          {prescription.objective}
                        </CardDescription>
                      )}
                    </div>
                    {getAssignmentBadge(prescription.assigned_students_count || 0)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>
                      Criada em {format(new Date(prescription.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                    </span>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 gap-2"
                      onClick={() => handleAssign(prescription.id)}
                    >
                      <Users className="h-4 w-4" />
                      {prescription.assigned_students_count === 0 ? "Atribuir" : "Gerenciar"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <div className="rounded-full bg-muted p-3 mb-4">
                <Plus className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Nenhuma prescrição criada</h3>
              <p className="text-muted-foreground mb-4">
                Crie sua primeira prescrição de treino para começar
              </p>
              <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Criar Prescrição
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      <CreatePrescriptionDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />

      <AssignPrescriptionDialog
        open={assignDialogOpen}
        onOpenChange={setAssignDialogOpen}
        prescriptionId={selectedPrescriptionId}
      />
    </div>
  );
}
