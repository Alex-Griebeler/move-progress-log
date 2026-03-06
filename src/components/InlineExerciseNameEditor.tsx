import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { AlertTriangle, Pencil } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useDuplicateExerciseCheck } from "@/hooks/useDuplicateExerciseCheck";

interface InlineExerciseNameEditorProps {
  exerciseId: string;
  currentName: string;
  onNameChange: (id: string, newName: string) => void;
}

export const InlineExerciseNameEditor = ({
  exerciseId,
  currentName,
  onNameChange,
}: InlineExerciseNameEditorProps) => {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(currentName);
  const { data: duplicates } = useDuplicateExerciseCheck(editing ? name : "", exerciseId);

  useEffect(() => {
    setName(currentName);
  }, [currentName]);

  const handleBlur = () => {
    const trimmed = name.trim();
    if (trimmed && trimmed !== currentName) {
      onNameChange(exerciseId, trimmed);
    } else {
      setName(currentName);
    }
    setEditing(false);
  };

  if (!editing) {
    return (
      <button
        className="flex items-center gap-1.5 text-left text-sm font-medium hover:text-primary transition-colors group w-full"
        onClick={() => setEditing(true)}
        title="Clique para editar o nome"
      >
        <span className="truncate">{currentName}</span>
        <Pencil className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 shrink-0" />
      </button>
    );
  }

  return (
    <div className="space-y-1">
      <Input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleBlur();
          if (e.key === "Escape") {
            setName(currentName);
            setEditing(false);
          }
        }}
        className="h-8 text-xs w-full"
      />
      {duplicates && duplicates.length > 0 && (
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1 text-xs text-amber-600">
              <AlertTriangle className="h-3 w-3" />
              <span>{duplicates.length} similar(es)</span>
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-xs">
            <p className="font-medium text-xs mb-1">Exercícios similares:</p>
            <ul className="text-xs space-y-0.5">
              {duplicates.map((d) => (
                <li key={d.id}>• {d.name}</li>
              ))}
            </ul>
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  );
};
