import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUpdateFolder } from "@/hooks/useFolders";
import { FolderEdit } from "lucide-react";

interface RenameFolderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folderId: string | null;
  currentName: string;
  existingNames?: string[];
}

export function RenameFolderDialog({ 
  open, 
  onOpenChange, 
  folderId, 
  currentName,
  existingNames = [] 
}: RenameFolderDialogProps) {
  const [name, setName] = useState(currentName);
  const [error, setError] = useState<string | null>(null);
  const updateFolder = useUpdateFolder();

  useEffect(() => {
    if (open) {
      setName(currentName);
      setError(null);
    }
  }, [open, currentName]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!folderId) return;

    const trimmedName = name.trim();

    // Validations
    if (!trimmedName) {
      setError("Nome da pasta é obrigatório");
      return;
    }

    if (trimmedName.length > 100) {
      setError("Nome deve ter no máximo 100 caracteres");
      return;
    }

    if (trimmedName.toLowerCase() !== currentName.toLowerCase() &&
        existingNames.some(n => n.toLowerCase() === trimmedName.toLowerCase())) {
      setError("Já existe uma pasta com este nome");
      return;
    }

    try {
      await updateFolder.mutateAsync({ id: folderId, name: trimmedName });
      onOpenChange(false);
    } catch (err) {
      // Error handled by hook
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderEdit className="h-5 w-5" />
            Renomear Pasta
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="folder-name">
                Nome da Pasta <span className="text-destructive">*</span>
              </Label>
              <Input
                id="folder-name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setError(null);
                }}
                placeholder="Ex: Treinos Principais"
                maxLength={100}
                autoFocus
                className={error ? "border-destructive" : ""}
              />
              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}
              <p className="text-xs text-muted-foreground">
                {name.length}/100 caracteres
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={updateFolder.isPending || !name.trim() || name.trim() === currentName}
            >
              {updateFolder.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}