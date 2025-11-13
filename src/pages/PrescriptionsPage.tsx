import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Plus, FolderPlus } from "lucide-react";
import { usePrescriptions } from "@/hooks/usePrescriptions";
import { useFolders, useMovePrescription, useReorderPrescriptions, useDeleteFolder } from "@/hooks/useFolders";
import { CreatePrescriptionDialog } from "@/components/CreatePrescriptionDialog";
import { EditPrescriptionDialog } from "@/components/EditPrescriptionDialog";
import { AssignPrescriptionDialog } from "@/components/AssignPrescriptionDialog";
import { RecordGroupSessionDialog } from "@/components/RecordGroupSessionDialog";
import { CreateFolderDialog } from "@/components/CreateFolderDialog";
import { RenameFolderDialog } from "@/components/RenameFolderDialog";
import { FolderSection } from "@/components/FolderSection";
import { AppHeader } from "@/components/AppHeader";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import EmptyState from "@/components/EmptyState";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { NAV_LABELS } from "@/constants/navigation";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useSEOHead, SEO_PRESETS } from "@/hooks/useSEOHead";
import { StructuredData } from "@/components/StructuredData";
import { getOrganizationSchema, getWebPageSchema, getBreadcrumbSchema } from "@/utils/structuredData";
import { DndContext, DragEndEvent, closestCenter, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
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

export default function PrescriptionsPage() {
  usePageTitle(NAV_LABELS.prescriptions);
  useSEOHead(SEO_PRESETS.private);
  
  const { data: prescriptions, isLoading } = usePrescriptions();
  const { data: folders } = useFolders();
  const movePrescription = useMovePrescription();
  const reorderPrescriptions = useReorderPrescriptions();
  const deleteFolder = useDeleteFolder();

  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [recordGroupDialogOpen, setRecordGroupDialogOpen] = useState(false);
  const [createFolderDialogOpen, setCreateFolderDialogOpen] = useState(false);
  const [renameFolderDialogOpen, setRenameFolderDialogOpen] = useState(false);
  const [deleteFolderDialogOpen, setDeleteFolderDialogOpen] = useState(false);
  
  const [selectedPrescriptionId, setSelectedPrescriptionId] = useState<string | null>(null);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [selectedFolderName, setSelectedFolderName] = useState("");
  const [reopenGroupSession, setReopenGroupSession] = useState<{
    prescriptionId: string;
    date: string;
    time: string;
  } | null>(null);

  // Expanded folders state (persist which folders are open)
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    new Set(["no-folder", ...(folders?.map(f => f.id) || [])])
  );

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Group prescriptions by folder
  const groupedPrescriptions = useMemo(() => {
    if (!prescriptions) return { folders: {}, noFolder: [] };

    const groups: { [key: string]: typeof prescriptions } = {};
    const noFolder: typeof prescriptions = [];

    prescriptions.forEach(prescription => {
      if (prescription.folder_id) {
        if (!groups[prescription.folder_id]) {
          groups[prescription.folder_id] = [];
        }
        groups[prescription.folder_id].push(prescription);
      } else {
        noFolder.push(prescription);
      }
    });

    return { folders: groups, noFolder };
  }, [prescriptions]);

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

  const handleToggleFolder = (folderId: string) => {
    setExpandedFolders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(folderId)) {
        newSet.delete(folderId);
      } else {
        newSet.add(folderId);
      }
      return newSet;
    });
  };

  const handleRenameFolder = (folderId: string, folderName: string) => {
    setSelectedFolderId(folderId);
    setSelectedFolderName(folderName);
    setRenameFolderDialogOpen(true);
  };

  const handleDeleteFolderClick = (folderId: string, folderName: string) => {
    setSelectedFolderId(folderId);
    setSelectedFolderName(folderName);
    setDeleteFolderDialogOpen(true);
  };

  const handleConfirmDeleteFolder = async () => {
    if (selectedFolderId) {
      await deleteFolder.mutateAsync(selectedFolderId);
      setDeleteFolderDialogOpen(false);
      setSelectedFolderId(null);
      setSelectedFolderName("");
    }
  };

  const handleMoveToFolder = (prescriptionId: string) => {
    // Placeholder - will be enhanced with folder selection menu
    console.log("Move to folder:", prescriptionId);
  };

  const handleRemoveFromFolder = async (prescriptionId: string) => {
    const prescription = prescriptions?.find(p => p.id === prescriptionId);
    if (!prescription) return;

    // Get max order_index in no-folder group
    const noFolderPrescriptions = prescriptions?.filter(p => !p.folder_id) || [];
    const maxOrder = noFolderPrescriptions.length > 0
      ? Math.max(...noFolderPrescriptions.map(p => p.order_index))
      : -1;

    await movePrescription.mutateAsync({
      prescriptionId,
      folderId: null,
      orderIndex: maxOrder + 1,
    });
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || !prescriptions) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activePrescription = prescriptions.find(p => p.id === activeId);
    if (!activePrescription) return;

    // Check if dropped on a folder
    const overData = over.data.current;
    if (overData?.type === 'folder') {
      const targetFolderId = overData.folderId;
      
      // Get prescriptions in target folder
      const targetFolderPrescriptions = prescriptions.filter(
        p => (targetFolderId ? p.folder_id === targetFolderId : !p.folder_id)
      );
      
      const maxOrder = targetFolderPrescriptions.length > 0
        ? Math.max(...targetFolderPrescriptions.map(p => p.order_index))
        : -1;

      await movePrescription.mutateAsync({
        prescriptionId: activeId,
        folderId: targetFolderId,
        orderIndex: maxOrder + 1,
      });
      
      return;
    }

    // Reordering within same folder
    if (activeId !== overId) {
      const activePrescription = prescriptions.find(p => p.id === activeId);
      const overPrescription = prescriptions.find(p => p.id === overId);

      if (!activePrescription || !overPrescription) return;

      // Only allow reordering within same folder
      if (activePrescription.folder_id !== overPrescription.folder_id) return;

      const folderPrescriptions = prescriptions.filter(
        p => p.folder_id === activePrescription.folder_id
      );

      const oldIndex = folderPrescriptions.findIndex(p => p.id === activeId);
      const newIndex = folderPrescriptions.findIndex(p => p.id === overId);

      const reordered = arrayMove(folderPrescriptions, oldIndex, newIndex);
      
      // Update order_index for all affected prescriptions
      const updates = reordered.map((prescription, index) => ({
        id: prescription.id,
        order_index: index,
      }));

      await reorderPrescriptions.mutateAsync(updates);
    }
  };

  const hasContent = prescriptions && prescriptions.length > 0;

  return (
    <div id="main-content" className="min-h-screen bg-background p-8" role="main">
      {/* Structured Data */}
      <StructuredData data={getOrganizationSchema()} id="org-schema" />
      <StructuredData 
        data={getWebPageSchema(
          NAV_LABELS.prescriptions,
          "Crie e gerencie prescrições de treino personalizadas com organização em pastas"
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
        <Breadcrumbs items={[{ label: NAV_LABELS.prescriptions }]} />
        
        <AppHeader
          title={NAV_LABELS.prescriptions}
          subtitle={NAV_LABELS.subtitlePrescriptions}
          actions={
            <div className="flex gap-2">
              <Button
                onClick={() => setCreateFolderDialogOpen(true)}
                variant="outline"
                className="gap-2"
                size="lg"
              >
                <FolderPlus className="h-5 w-5" />
                Nova Pasta
              </Button>
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
            </div>
          }
        />

        {isLoading ? (
          <LoadingSpinner text="Carregando prescrições..." />
        ) : hasContent ? (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <div className="space-y-6 animate-fade-in">
              {/* Folders */}
              {folders?.map(folder => (
                <FolderSection
                  key={folder.id}
                  folder={folder}
                  prescriptions={groupedPrescriptions.folders[folder.id] || []}
                  isExpanded={expandedFolders.has(folder.id)}
                  onToggleExpand={() => handleToggleFolder(folder.id)}
                  onRename={() => handleRenameFolder(folder.id, folder.name)}
                  onDelete={() => handleDeleteFolderClick(folder.id, folder.name)}
                  onEdit={handleEdit}
                  onAssign={handleAssign}
                  onAddSession={handleAddSession}
                  onMoveToFolder={handleMoveToFolder}
                  onRemoveFromFolder={handleRemoveFromFolder}
                />
              ))}

              {/* No Folder Section */}
              {groupedPrescriptions.noFolder.length > 0 && (
                <FolderSection
                  folder={null}
                  prescriptions={groupedPrescriptions.noFolder}
                  isExpanded={expandedFolders.has("no-folder")}
                  onToggleExpand={() => handleToggleFolder("no-folder")}
                  onEdit={handleEdit}
                  onAssign={handleAssign}
                  onAddSession={handleAddSession}
                  onMoveToFolder={handleMoveToFolder}
                  onRemoveFromFolder={handleRemoveFromFolder}
                />
              )}
            </div>
          </DndContext>
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

      {/* Dialogs */}
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
      
      <RecordGroupSessionDialog
        open={recordGroupDialogOpen}
        onOpenChange={setRecordGroupDialogOpen}
        prescriptionId={selectedPrescriptionId}
        reopenDate={reopenGroupSession?.date}
        reopenTime={reopenGroupSession?.time}
      />

      <CreateFolderDialog
        open={createFolderDialogOpen}
        onOpenChange={setCreateFolderDialogOpen}
        existingNames={folders?.map(f => f.name) || []}
      />

      <RenameFolderDialog
        open={renameFolderDialogOpen}
        onOpenChange={setRenameFolderDialogOpen}
        folderId={selectedFolderId}
        currentName={selectedFolderName}
        existingNames={folders?.filter(f => f.id !== selectedFolderId).map(f => f.name) || []}
      />

      <AlertDialog open={deleteFolderDialogOpen} onOpenChange={setDeleteFolderDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir pasta "{selectedFolderName}"?</AlertDialogTitle>
            <AlertDialogDescription>
              As prescrições dentro desta pasta serão movidas para "Sem Pasta". Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDeleteFolder}
              className="bg-destructive hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}