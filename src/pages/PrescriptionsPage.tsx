import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { usePrescriptions } from "@/hooks/usePrescriptions";
import { CreatePrescriptionDialog } from "@/components/CreatePrescriptionDialog";
import { EditPrescriptionDialog } from "@/components/EditPrescriptionDialog";
import { AssignPrescriptionDialog } from "@/components/AssignPrescriptionDialog";
import { AddWorkoutSessionDialog } from "@/components/AddWorkoutSessionDialog";
import { RecordGroupSessionDialog } from "@/components/RecordGroupSessionDialog";
import { AppHeader } from "@/components/AppHeader";
import { PrescriptionCard } from "@/components/PrescriptionCard";

export default function PrescriptionsPage() {
  const { data: prescriptions, isLoading } = usePrescriptions();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [sessionDialogOpen, setSessionDialogOpen] = useState(false);
  const [recordGroupDialogOpen, setRecordGroupDialogOpen] = useState(false);
  const [selectedPrescriptionId, setSelectedPrescriptionId] = useState<string | null>(null);

  const handleEdit = (prescriptionId: string) => {
    setSelectedPrescriptionId(prescriptionId);
    setEditDialogOpen(true);
  };

  const handleAssign = (prescriptionId: string) => {
    setSelectedPrescriptionId(prescriptionId);
    setAssignDialogOpen(true);
  };

  const handleAddSession = (prescriptionId: string) => {
    setSelectedPrescriptionId(prescriptionId);
    setRecordGroupDialogOpen(true);
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
          <div className="space-y-6">
            {prescriptions.map((prescription) => (
              <PrescriptionCard
                key={prescription.id}
                prescription={prescription}
                onEdit={handleEdit}
                onAssign={handleAssign}
                onAddSession={handleAddSession}
              />
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

      <EditPrescriptionDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        prescriptionId={selectedPrescriptionId}
      />

      <AssignPrescriptionDialog
        open={assignDialogOpen}
        onOpenChange={setAssignDialogOpen}
        prescriptionId={selectedPrescriptionId}
      />

      <AddWorkoutSessionDialog
        open={sessionDialogOpen}
        onOpenChange={setSessionDialogOpen}
        prescriptionId={selectedPrescriptionId}
      />

      <RecordGroupSessionDialog
        open={recordGroupDialogOpen}
        onOpenChange={setRecordGroupDialogOpen}
        prescriptionId={selectedPrescriptionId}
      />
    </div>
  );
}
