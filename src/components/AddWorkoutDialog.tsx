import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Dumbbell, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Exercise {
  name: string;
  sets: number;
  reps: number;
  weight: number;
}

const AddWorkoutDialog = ({ onWorkoutAdded }: { onWorkoutAdded: () => void }) => {
  const [open, setOpen] = useState(false);
  const [workoutName, setWorkoutName] = useState("");
  const [exercises, setExercises] = useState<Exercise[]>([
    { name: "", sets: 3, reps: 10, weight: 0 }
  ]);
  const { toast } = useToast();

  const addExercise = () => {
    setExercises([...exercises, { name: "", sets: 3, reps: 10, weight: 0 }]);
  };

  const removeExercise = (index: number) => {
    setExercises(exercises.filter((_, i) => i !== index));
  };

  const updateExercise = (index: number, field: keyof Exercise, value: string | number) => {
    const updated = [...exercises];
    updated[index] = { ...updated[index], [field]: value };
    setExercises(updated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!workoutName.trim() || exercises.some(ex => !ex.name.trim())) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha o nome do treino e dos exercícios",
        variant: "destructive",
      });
      return;
    }

    // Aqui você salvaria no backend/localStorage
    toast({
      title: "Treino adicionado! 💪",
      description: `${workoutName} com ${exercises.length} exercícios`,
    });
    
    setWorkoutName("");
    setExercises([{ name: "", sets: 3, reps: 10, weight: 0 }]);
    setOpen(false);
    onWorkoutAdded();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="gradient" size="lg" className="gap-2">
          <Plus className="h-5 w-5" />
          Novo Treino
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <Dumbbell className="h-6 w-6 text-primary" />
            Adicionar Treino
          </DialogTitle>
          <DialogDescription>
            Registre seus exercícios, séries, repetições e peso
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="workout-name">Nome do Treino</Label>
            <Input
              id="workout-name"
              placeholder="Ex: Treino A - Peito e Tríceps"
              value={workoutName}
              onChange={(e) => setWorkoutName(e.target.value)}
            />
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base">Exercícios</Label>
              <Button type="button" variant="outline" size="sm" onClick={addExercise}>
                <Plus className="h-4 w-4 mr-1" />
                Adicionar
              </Button>
            </div>

            {exercises.map((exercise, index) => (
              <div key={index} className="p-4 border rounded-lg space-y-3 relative bg-secondary/30">
                {exercises.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 h-6 w-6"
                    onClick={() => removeExercise(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
                
                <div>
                  <Label htmlFor={`exercise-${index}`} className="text-xs">Exercício</Label>
                  <Input
                    id={`exercise-${index}`}
                    placeholder="Ex: Supino reto"
                    value={exercise.name}
                    onChange={(e) => updateExercise(index, "name", e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label htmlFor={`sets-${index}`} className="text-xs">Séries</Label>
                    <Input
                      id={`sets-${index}`}
                      type="number"
                      min="1"
                      value={exercise.sets}
                      onChange={(e) => updateExercise(index, "sets", parseInt(e.target.value) || 1)}
                    />
                  </div>
                  <div>
                    <Label htmlFor={`reps-${index}`} className="text-xs">Reps</Label>
                    <Input
                      id={`reps-${index}`}
                      type="number"
                      min="1"
                      value={exercise.reps}
                      onChange={(e) => updateExercise(index, "reps", parseInt(e.target.value) || 1)}
                    />
                  </div>
                  <div>
                    <Label htmlFor={`weight-${index}`} className="text-xs">Peso (kg)</Label>
                    <Input
                      id={`weight-${index}`}
                      type="number"
                      min="0"
                      step="0.5"
                      value={exercise.weight}
                      onChange={(e) => updateExercise(index, "weight", parseFloat(e.target.value) || 0)}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <Button type="submit" variant="gradient" className="w-full" size="lg">
            Salvar Treino
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddWorkoutDialog;
