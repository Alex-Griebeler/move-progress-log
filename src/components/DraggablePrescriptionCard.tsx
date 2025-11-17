import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { PrescriptionCard } from "./PrescriptionCard";
import { WorkoutPrescription } from "@/hooks/usePrescriptions";
import { cn } from "@/lib/utils";

interface DraggablePrescriptionCardProps {
  prescription: WorkoutPrescription;
  onEdit: (id: string) => void;
  onAssign: (id: string) => void;
  onAddSession: (id: string) => void;
  onMoveToFolder: (prescriptionId: string, folderId: string) => void;
  onRemoveFromFolder: (prescriptionId: string) => void;
  onDelete?: (prescriptionId: string) => void;
}

export function DraggablePrescriptionCard({
  prescription,
  onEdit,
  onAssign,
  onAddSession,
  onMoveToFolder,
  onRemoveFromFolder,
  onDelete,
}: DraggablePrescriptionCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id: prescription.id,
    data: {
      type: 'prescription',
      prescription,
    }
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative group",
        isDragging && "dragging-active z-50"
      )}
    >
      {/* Drag Handle - sempre visível */}
      <button
        className="absolute left-2 top-1/2 -translate-y-1/2 z-10 cursor-grab active:cursor-grabbing touch-none p-2 hover:bg-accent rounded-md transition-colors opacity-40 group-hover:opacity-100"
        {...attributes}
        {...listeners}
        aria-label={`Reordenar prescrição ${prescription.name}`}
      >
        <GripVertical className="h-6 w-6 text-muted-foreground" />
      </button>

      {/* Card with left padding for drag handle */}
      <div className={cn("pl-12", isDragging && "pointer-events-none")}>
        <PrescriptionCard
          prescription={prescription}
          onEdit={onEdit}
          onAssign={onAssign}
          onAddSession={onAddSession}
          onMoveToFolder={onMoveToFolder}
          onRemoveFromFolder={onRemoveFromFolder}
          onDelete={onDelete}
        />
      </div>
    </div>
  );
}