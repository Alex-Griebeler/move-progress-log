import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus } from "lucide-react";
import {
  useCreateExercise,
  MOVEMENT_PATTERNS,
  LATERALITY_OPTIONS,
  MOVEMENT_PLANES,
} from "@/hooks/useExercisesLibrary";

export const AddExerciseDialog = () => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [movementPattern, setMovementPattern] = useState("");
  const [laterality, setLaterality] = useState("");
  const [movementPlane, setMovementPlane] = useState("");
  const [description, setDescription] = useState("");

  const createExercise = useCreateExercise();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !movementPattern) {
      return;
    }

    await createExercise.mutateAsync({
      name: name.trim(),
      movement_pattern: movementPattern,
      laterality: laterality || null,
      movement_plane: movementPlane || null,
      description: description.trim() || null,
    });

    // Reset form
    setName("");
    setMovementPattern("");
    setLaterality("");
    setMovementPlane("");
    setDescription("");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Adicionar Exercício
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo Exercício</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome do Exercício *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Agachamento Livre"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="movement-pattern">Padrão de Movimento *</Label>
            <Select value={movementPattern} onValueChange={setMovementPattern} required>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o padrão" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(MOVEMENT_PATTERNS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="laterality">Lateralidade</Label>
            <Select value={laterality} onValueChange={setLaterality}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione (opcional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhum</SelectItem>
                {Object.entries(LATERALITY_OPTIONS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="movement-plane">Plano de Movimento</Label>
            <Select value={movementPlane} onValueChange={setMovementPlane}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione (opcional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhum</SelectItem>
                {Object.entries(MOVEMENT_PLANES).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descrição opcional do exercício"
              rows={3}
            />
          </div>

          <Button type="submit" className="w-full" disabled={createExercise.isPending}>
            {createExercise.isPending ? "Criando..." : "Criar Exercício"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
