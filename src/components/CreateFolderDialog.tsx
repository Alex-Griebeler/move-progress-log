import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreateFolder } from "@/hooks/useFolders";
import { FolderPlus } from "lucide-react";

interface CreateFolderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingNames?: string[];
}

export function CreateFolderDialog({ open, onOpenChange, existingNames = [] }: CreateFolderDialogProps) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const createFolder = useCreateFolder();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

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

    if (existingNames.some(n => n.toLowerCase() === trimmedName.toLowerCase())) {
      setError("Já existe uma pasta com este nome");
      return;
    }

    try {
      await createFolder.mutateAsync(trimmedName);
      setName("");
      onOpenChange(false);
    } catch (err) {
      // Error handled by hook
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setName("");
      setError(null);
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderPlus className="h-5 w-5" />
            Nova Pasta
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
              onClick={() => handleOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={createFolder.isPending || !name.trim()}
            >
              {createFolder.isPending ? "Criando..." : "Criar Pasta"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}