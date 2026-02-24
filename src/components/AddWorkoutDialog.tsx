import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Dumbbell, X, Clock, Loader2, FileEdit } from "lucide-react";
import { toast } from "sonner";
import { useGetOrCreateStudent } from "@/hooks/useStudents";
import { useCreateWorkout } from "@/hooks/useWorkouts";

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
  
  const getOrCreateStudent = useGetOrCreateStudent();
  const createWorkout = useCreateWorkout();

  const addExercise = () => {
    setExercises([...exercises, { exercise: "", load: "", reps: 0, observations: "" }]);
  };

  const removeExercise = (index: number) => {
    setExercises(exercises.filter((_, i) => i !== index));
  };

  // Conversão automática de lb para kg (1 lb = 0.45 kg)
  const convertLoadToKg = (loadString: string): string => {
    // Detecta padrões como "15 lb", "15lb", "15 lbs"
    const lbPattern = /(\d+(?:\.\d+)?)\s*lbs?/gi;
    
    let converted = loadString;
    let match;
    
    while ((match = lbPattern.exec(loadString)) !== null) {
      const lbValue = parseFloat(match[1]);
      const kgValue = (lbValue * 0.4536).toFixed(1);
      converted = converted.replace(match[0], `${kgValue} kg`);
    }
    
    return converted;
  };

  const updateExercise = (index: number, field: keyof Exercise, value: string | number) => {
    const updated = [...exercises];
    
    // Se for o campo de carga e for string, aplicar conversão automática
    if (field === 'load' && typeof value === 'string') {
      value = convertLoadToKg(value);
    }
    
    updated[index] = { ...updated[index], [field]: value };
    setExercises(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!studentName.trim()) {
      toast.error("Por favor, preencha o nome do aluno");
      return;
    }

    const validExercises = exercises.filter(ex => ex.exercise.trim() && ex.load.trim());
    if (validExercises.length === 0) {
      toast.error("Adicione pelo menos um exercício completo com carga");
      return;
    }

    try {
      // Buscar ou criar aluno
      const student = await getOrCreateStudent.mutateAsync(studentName);
      
      // Criar sessão e exercícios
      await createWorkout.mutateAsync({
        studentId: student.id,
        date,
        time,
        exercises: validExercises,
      });
      
      toast.success(`✅ Sessão registrada com sucesso!`, {
        description: `${validExercises.length} exercícios foram salvos para ${studentName}.`
      });
      
      // Reset form
      setStudentName("");
      setDate(new Date().toISOString().split('T')[0]);
      setTime(new Date().toTimeString().slice(0, 5));
      setExercises([{ exercise: "", load: "", reps: 0, observations: "" }]);
      setOpen(false);
      onWorkoutAdded();
    } catch (error: any) {
      console.error("Erro ao registrar sessão:", error);
      
      // Detectar erro de duplicata
      if (error.message?.includes('duplicate key') || error.code === '23505') {
        toast.error("Sessão duplicada", {
          description: "Já existe uma sessão registrada para este aluno neste horário. Altere a data/hora ou edite a sessão existente."
        });
      } else if (error.message?.includes('network')) {
        toast.error("Erro de conexão", {
          description: "Verifique sua internet e tente novamente."
        });
      } else {
        toast.error("Erro ao registrar sessão", {
          description: error.message || "Tente novamente ou contate o suporte."
        });
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="default" className="gap-sm">
          <FileEdit className="h-5 w-5" />
          Registrar Sessão
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-sm">
            <Dumbbell className="h-6 w-6 text-primary" />
            Registrar Sessão de Treino (Manual)
          </DialogTitle>
          <DialogDescription>
            Padrão Fabrik Performance - registre apenas a maior carga de cada exercício
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-lg">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-md">
            <div className="space-y-sm">
              <Label htmlFor="student-name">Nome do Aluno</Label>
              <Input
                id="student-name"
                placeholder="Nome completo"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
              />
            </div>
            <div className="space-y-sm">
              <Label htmlFor="date">Data</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="space-y-sm">
              <Label htmlFor="time" className="flex items-center gap-xs">
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

          <div className="space-y-md">
            <div className="flex items-center justify-between">
              <Label className="text-base-lg">Exercícios</Label>
              <Button type="button" variant="outline" size="sm" onClick={addExercise}>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar
              </Button>
            </div>

            {exercises.map((exercise, index) => (
              <div key={index} className="p-lg border rounded-radius-lg space-y-md relative bg-muted/30">
                {exercises.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute top-sm right-sm h-6 w-6"
                    onClick={() => removeExercise(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
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
                      placeholder="Ex: 15 lb + 2 kg ou (10kg + 10kg) + barra 15kg"
                      value={exercise.load}
                      onChange={(e) => updateExercise(index, "load", e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      💡 Digite "lb" que converto automaticamente para kg (1 lb = 0,45 kg)
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
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

          <Button 
            type="submit" 
            variant="default" 
            className="w-full"
            disabled={getOrCreateStudent.isPending || createWorkout.isPending}
          >
            {(getOrCreateStudent.isPending || createWorkout.isPending) ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              'Salvar Sessão'
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddWorkoutDialog;
