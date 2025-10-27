import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Dumbbell, X, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Exercise {
  exercise: string;
  load: string;
  reps: number;
  observations: string;
}

const AddWorkoutDialog = ({ onWorkoutAdded }: { onWorkoutAdded: () => void }) => {
  const [open, setOpen] = useState(false);
  const [studentName, setStudentName] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState(new Date().toTimeString().slice(0, 5));
  const [exercises, setExercises] = useState<Exercise[]>([
    { exercise: "", load: "", reps: 0, observations: "" }
  ]);
  const { toast } = useToast();

  const addExercise = () => {
    setExercises([...exercises, { exercise: "", load: "", reps: 0, observations: "" }]);
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
    
    if (!studentName.trim() || exercises.some(ex => !ex.exercise.trim())) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha o nome do aluno e dos exercícios",
        variant: "destructive",
      });
      return;
    }

    // Aqui você salvaria no backend/Lovable Cloud
    toast({
      title: "Sessão registrada",
      description: `${studentName} - ${exercises.length} exercícios`,
    });
    
    setStudentName("");
    setDate(new Date().toISOString().split('T')[0]);
    setTime(new Date().toTimeString().slice(0, 5));
    setExercises([{ exercise: "", load: "", reps: 0, observations: "" }]);
    setOpen(false);
    onWorkoutAdded();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="gradient" size="lg" className="gap-2">
          <Plus className="h-5 w-5" />
          Registrar Sessão
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <Dumbbell className="h-6 w-6 text-primary" />
            Registrar Sessão de Treino
          </DialogTitle>
          <DialogDescription>
            Padrão Fabrik Performance - registre apenas a maior carga de cada exercício
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="student-name">Nome do Aluno</Label>
              <Input
                id="student-name"
                placeholder="Nome completo"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date">Data</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="time" className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Horário
              </Label>
              <Input
                id="time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
              />
            </div>
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
              <div key={index} className="p-4 border rounded-lg space-y-3 relative bg-muted/30">
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
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor={`exercise-${index}`} className="text-xs font-medium">
                      Exercício
                    </Label>
                    <Input
                      id={`exercise-${index}`}
                      placeholder="Ex: Afundo (pegada taça)"
                      value={exercise.exercise}
                      onChange={(e) => updateExercise(index, "exercise", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor={`load-${index}`} className="text-xs font-medium">
                      Carga (kg) - Maior da sessão
                    </Label>
                    <Input
                      id={`load-${index}`}
                      placeholder="Ex: (10kg + 10kg) + barra 15kg = 35,0kg"
                      value={exercise.load}
                      onChange={(e) => updateExercise(index, "load", e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor={`reps-${index}`} className="text-xs font-medium">Nº Repetições</Label>
                    <Input
                      id={`reps-${index}`}
                      type="number"
                      min="1"
                      placeholder="Ex: 10"
                      value={exercise.reps || ""}
                      onChange={(e) => updateExercise(index, "reps", parseInt(e.target.value) || 0)}
                    />
                  </div>
                  <div>
                    <Label htmlFor={`observations-${index}`} className="text-xs font-medium">
                      Observações
                    </Label>
                    <Input
                      id={`observations-${index}`}
                      placeholder="Ex: carga submáxima, boa execução"
                      value={exercise.observations}
                      onChange={(e) => updateExercise(index, "observations", e.target.value)}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <Button type="submit" variant="gradient" className="w-full" size="lg">
            Registrar Sessão
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddWorkoutDialog;
