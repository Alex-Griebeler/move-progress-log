import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { usePrescriptions } from "@/hooks/usePrescriptions";
import { CreatePrescriptionDialog } from "@/components/CreatePrescriptionDialog";
import { EditPrescriptionDialog } from "@/components/EditPrescriptionDialog";
import { AssignPrescriptionDialog } from "@/components/AssignPrescriptionDialog";
import { AddWorkoutSessionDialog } from "@/components/AddWorkoutSessionDialog";
import { RecordGroupSessionDialog } from "@/components/RecordGroupSessionDialog";
import { EditGroupSessionDialog } from "@/components/EditGroupSessionDialog";
import { AppHeader } from "@/components/AppHeader";
import { PrescriptionCard } from "@/components/PrescriptionCard";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import EmptyState from "@/components/EmptyState";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { NAV_LABELS } from "@/constants/navigation";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useSEOHead, SEO_PRESETS } from "@/hooks/useSEOHead";
import { useOpenGraph, FABRIK_OG_DEFAULTS } from "@/hooks/useOpenGraph";
import { StructuredData } from "@/components/StructuredData";
import { getOrganizationSchema, getWebPageSchema, getBreadcrumbSchema, getTrainingProgramSchema } from "@/utils/structuredData";

export default function PrescriptionsPage() {
  usePageTitle(NAV_LABELS.prescriptions);
  useSEOHead(SEO_PRESETS.private); // Prescrições são privadas
  
  const { data: prescriptions, isLoading } = usePrescriptions();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [sessionDialogOpen, setSessionDialogOpen] = useState(false);
  const [recordGroupDialogOpen, setRecordGroupDialogOpen] = useState(false);
  const [editGroupDialogOpen, setEditGroupDialogOpen] = useState(false);
  const [selectedPrescriptionId, setSelectedPrescriptionId] = useState<string | null>(null);
  const [reopenGroupSession, setReopenGroupSession] = useState<{
    prescriptionId: string;
    date: string;
    time: string;
  } | null>(null);

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
    <div id="main-content" className="min-h-screen bg-background p-8" role="main">
      {/* Structured Data para SEO */}
      <StructuredData data={getOrganizationSchema()} id="org-schema" />
      <StructuredData 
        data={getWebPageSchema(
          NAV_LABELS.prescriptions,
          "Crie e gerencie prescrições de treino personalizadas para seus alunos com exercícios e objetivos específicos"
        )} 
        id="webpage-schema" 
      />
      <StructuredData 
        data={getBreadcrumbSchema([
          { label: "Home", href: "/" },
          { label: NAV_LABELS.prescriptions, href: "/prescricoes" }
        ])} 
        id="breadcrumb-schema" 
      />
      
      <div className="max-w-7xl mx-auto space-y-8">
        <Breadcrumbs
          items={[
            { label: NAV_LABELS.prescriptions }
          ]}
        />
        
        <AppHeader
          title={NAV_LABELS.prescriptions}
          subtitle={NAV_LABELS.subtitlePrescriptions}
          actions={
            <Button
              onClick={() => setCreateDialogOpen(true)}
              variant="gradient"
              className="gap-2"
              size="lg"
              aria-label={NAV_LABELS.newPrescription}
            >
              <Plus className="h-5 w-5" />
              {NAV_LABELS.newPrescription}
            </Button>
          }
        />

        {isLoading ? (
          <LoadingSpinner text="Carregando prescrições..." />
        ) : prescriptions && prescriptions.length > 0 ? (
          <div className="space-y-6 animate-fade-in">
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
          <EmptyState
            icon={<Plus className="h-6 w-6" />}
            title="Nenhuma prescrição criada"
            description="Crie sua primeira prescrição de treino para começar a atribuir exercícios e monitorar o progresso dos seus alunos."
            primaryAction={{
              label: "Criar Primeira Prescrição",
              onClick: () => setCreateDialogOpen(true)
            }}
          />
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
        onOpenChange={(open) => {
          setRecordGroupDialogOpen(open);
          if (!open) setReopenGroupSession(null);
        }}
        prescriptionId={selectedPrescriptionId}
        reopenDate={reopenGroupSession?.date}
        reopenTime={reopenGroupSession?.time}
      />

      <EditGroupSessionDialog
        open={editGroupDialogOpen}
        onOpenChange={setEditGroupDialogOpen}
        prescriptionId={selectedPrescriptionId}
        date={reopenGroupSession?.date || ''}
        time={reopenGroupSession?.time || ''}
        onSuccess={() => {
          window.location.reload();
        }}
        onReopenForRecording={(prescriptionId, date, time) => {
          setEditGroupDialogOpen(false);
          setSelectedPrescriptionId(prescriptionId);
          setReopenGroupSession({ prescriptionId, date, time });
          setRecordGroupDialogOpen(true);
        }}
      />
    </div>
  );
}
