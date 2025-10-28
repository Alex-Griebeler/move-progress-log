import { useState } from "react";
import { useForm } from "react-hook-form";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Info } from "lucide-react";
import { usePrescriptionAssignments } from "@/hooks/usePrescriptions";
import { useCreateWorkoutSession } from "@/hooks/useWorkoutSessions";

interface AddWorkoutSessionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prescriptionId: string | null;
}

interface SessionFormData {
  student_id: string;
  date: string;
  time: string;
  exercises: Array<{
    exercise_name: string;
    sets?: number;
    reps?: number;
    load_kg?: number;
    load_description?: string;
    load_breakdown?: string;
    observations?: string;
  }>;
}

export function AddWorkoutSessionDialog({ open, onOpenChange, prescriptionId }: AddWorkoutSessionDialogProps) {
  const { data: assignments } = usePrescriptionAssignments(prescriptionId);
  const createSession = useCreateWorkoutSession();
  const [exerciseCount, setExerciseCount] = useState(1);
  
  const form = useForm<SessionFormData>({
    defaultValues: {
      student_id: "",
      date: new Date().toISOString().split('T')[0],
      time: new Date().toTimeString().split(' ')[0].slice(0, 5),
      exercises: [{ exercise_name: "" }],
    },
  });

  const onSubmit = async (data: SessionFormData) => {
    await createSession.mutateAsync({
      student_id: data.student_id,
      date: data.date,
      time: data.time,
      exercises: data.exercises.filter(ex => ex.exercise_name.trim() !== ""),
    });
    form.reset();
    setExerciseCount(1);
    onOpenChange(false);
  };

  const addExercise = () => {
    const currentExercises = form.getValues("exercises");
    form.setValue("exercises", [...currentExercises, { exercise_name: "" }]);
    setExerciseCount(prev => prev + 1);
  };

  const removeExercise = (index: number) => {
    const currentExercises = form.getValues("exercises");
    form.setValue("exercises", currentExercises.filter((_, i) => i !== index));
    setExerciseCount(prev => prev - 1);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Adicionar Sessão de Treino</DialogTitle>
          <DialogDescription>
            Registre os dados da sessão de treino realizada
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="student_id"
              rules={{ required: "Selecione um aluno" }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Aluno</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o aluno" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {assignments?.map((assignment) => (
                        <SelectItem key={assignment.student_id} value={assignment.student_id}>
                          {assignment.student_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="date"
                rules={{ required: "Data é obrigatória" }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="time"
                rules={{ required: "Horário é obrigatório" }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Horário</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold">Exercícios Realizados</h4>
                <Button type="button" variant="outline" size="sm" onClick={addExercise}>
                  Adicionar Exercício
                </Button>
              </div>

              {Array.from({ length: exerciseCount }).map((_, index) => (
                <div key={index} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">Exercício {index + 1}</span>
                    {exerciseCount > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeExercise(index)}
                      >
                        Remover
                      </Button>
                    )}
                  </div>

                  <FormField
                    control={form.control}
                    name={`exercises.${index}.exercise_name`}
                    rules={{ required: "Nome do exercício é obrigatório" }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome do Exercício</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: Supino reto" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-3">
                    <FormField
                      control={form.control}
                      name={`exercises.${index}.sets`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Séries</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="Ex: 3"
                              {...field}
                              onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name={`exercises.${index}.reps`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Repetições</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="Ex: 12"
                              {...field}
                              onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <FormField
                      control={form.control}
                      name={`exercises.${index}.load_kg`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            Carga Total (kg)
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs">
                                  <p className="text-xs">
                                    {form.watch(`exercises.${index}.load_breakdown`) || 
                                    "Use o campo 'Composição da Carga' abaixo para detalhar a montagem"}
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.1"
                              placeholder="Ex: 60.0"
                              {...field}
                              onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name={`exercises.${index}.load_description`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Descrição da Carga</FormLabel>
                          <FormControl>
                            <Input placeholder="Ex: Barra olímpica" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name={`exercises.${index}.load_breakdown`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Composição da Carga (detalhada)</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: 20kg barra + 15kg cada lado + 2,5kg anilha" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name={`exercises.${index}.observations`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Observações</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Observações sobre a execução" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              ))}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createSession.isPending}>
                {createSession.isPending ? "Salvando..." : "Salvar Sessão"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
