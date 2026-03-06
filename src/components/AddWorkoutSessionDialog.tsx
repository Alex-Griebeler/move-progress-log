import { useState } from "react";
import { useForm } from "react-hook-form";
import i18n from "@/i18n/pt-BR.json";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Info } from "lucide-react";
import { logger } from "@/utils/logger";
import { usePrescriptionAssignments } from "@/hooks/usePrescriptions";
import { useCreateWorkoutSession } from "@/hooks/useWorkoutSessions";
import { VoiceSessionRecorder } from "./VoiceSessionRecorder";

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

  const handleVoiceData = (voiceData: any) => {
    logger.log("Voice data received:", voiceData);
    
    // Find student by name
    const student = assignments?.find(a => 
      a.student_name?.toLowerCase().includes(voiceData.student_name.toLowerCase())
    );
    
    if (student) {
      form.setValue("student_id", student.student_id);
    }
    
    form.setValue("date", voiceData.date);
    form.setValue("time", voiceData.time);
    
    // Map voice exercises to form format
    const mappedExercises = voiceData.exercises.map((ex: any) => ({
      exercise_name: ex.name,
      reps: ex.reps,
      load_kg: ex.load_kg,
      load_breakdown: ex.load_breakdown || "",
      observations: ex.observations || "",
    }));
    
    form.setValue("exercises", mappedExercises);
    setExerciseCount(mappedExercises.length);
  };

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
    form.setValue("exercises", [...currentExercises, { exercise_name: "", load_breakdown: "" }]);
    setExerciseCount(prev => prev + 1);
  };

  const removeExercise = (index: number) => {
    const currentExercises = form.getValues("exercises");
    form.setValue("exercises", currentExercises.filter((_, i) => i !== index));
    setExerciseCount(prev => prev - 1);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Adicionar Sessão de Treino</DialogTitle>
          <DialogDescription>
            Registre os dados da sessão de treino realizada
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="manual" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="manual">Manual</TabsTrigger>
            <TabsTrigger value="voice">Por Voz</TabsTrigger>
          </TabsList>

          <TabsContent value="voice" className="mt-4">
            <VoiceSessionRecorder onSessionData={handleVoiceData} />
            
            {form.watch("exercises").length > 0 && form.watch("exercises")[0].exercise_name && (
              <div className="mt-4">
                <Button onClick={() => document.getElementById("manual-tab")?.click()}>
                  Ver e Editar Dados
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="manual" id="manual-tab" className="mt-4">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-md">
                <FormField
                  control={form.control}
                  name="student_id"
                  rules={{ required: i18n.errors.selectStudent }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{i18n.forms.student}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={i18n.forms.selectStudent} />
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

                <div className="grid grid-cols-2 gap-md">
                  <FormField
                    control={form.control}
                    name="date"
                    rules={{ required: i18n.errors.dateRequired }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{i18n.forms.date}</FormLabel>
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
                    rules={{ required: i18n.errors.timeRequired }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{i18n.forms.time}</FormLabel>
                        <FormControl>
                          <Input type="time" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="space-y-md">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold">Exercícios Realizados</h4>
                    <Button type="button" variant="outline" size="sm" onClick={addExercise}>
                      Adicionar Exercício
                    </Button>
                  </div>

                  {Array.from({ length: exerciseCount }).map((_, index) => (
                    <div key={index} className="border rounded-radius-lg p-lg space-y-md">
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
                        rules={{ required: i18n.errors.exerciseNameRequired }}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{i18n.forms.exerciseName}</FormLabel>
                            <FormControl>
                              <Input placeholder={i18n.forms.placeholder.exerciseName} {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-2 gap-md">
                        <FormField
                          control={form.control}
                          name={`exercises.${index}.sets`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{i18n.forms.sets}</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  placeholder={i18n.forms.placeholder.sets}
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
                              <FormLabel>{i18n.forms.reps}</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  placeholder={i18n.forms.placeholder.reps}
                                  {...field}
                                  onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-md">
                        <FormField
                          control={form.control}
                          name={`exercises.${index}.load_kg`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="flex items-center gap-sm">
                                {i18n.forms.loadTotal}
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
                                  placeholder={i18n.forms.placeholder.load}
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
                              <FormLabel>{i18n.forms.loadDescription}</FormLabel>
                              <FormControl>
                                <Input placeholder={i18n.forms.placeholder.loadDescription} {...field} />
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
                            <FormLabel>{i18n.forms.loadBreakdown}</FormLabel>
                            <FormControl>
                              <Input placeholder={i18n.forms.placeholder.loadBreakdown} {...field} />
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
                            <FormLabel>{i18n.forms.observations}</FormLabel>
                            <FormControl>
                              <Textarea placeholder={i18n.forms.placeholder.observations} {...field} />
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
                    {i18n.actions.close}
                  </Button>
                  <Button type="submit" disabled={createSession.isPending}>
                    {createSession.isPending ? i18n.feedback.loading : i18n.actions.save}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}