import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useUpdateStudent } from "@/hooks/useStudents";
import type { Student } from "@/hooks/useStudents";

const formSchema = z.object({
  name: z.string().min(1, "Nome completo é obrigatório"),
  birth_date: z.string().optional(),
  weekly_sessions_proposed: z.coerce.number().min(1, "Mínimo 1 sessão").max(7, "Máximo 7 sessões"),
  objectives: z.string().optional(),
  limitations: z.string().optional(),
  preferences: z.string().optional(),
  max_heart_rate: z.coerce.number().optional().nullable(),
  injury_history: z.string().optional(),
  fitness_level: z.enum(['iniciante', 'intermediario', 'avancado']).optional().nullable(),
});

type FormData = z.infer<typeof formSchema>;

interface EditStudentDialogProps {
  student: Student | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const EditStudentDialog = ({ student, open, onOpenChange }: EditStudentDialogProps) => {
  const updateStudent = useUpdateStudent();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      birth_date: "",
      weekly_sessions_proposed: 2,
      objectives: "",
      limitations: "",
      preferences: "",
      max_heart_rate: null,
      injury_history: "",
      fitness_level: null,
    },
  });

  useEffect(() => {
    if (student) {
      form.reset({
        name: student.name,
        birth_date: student.birth_date || "",
        weekly_sessions_proposed: student.weekly_sessions_proposed,
        objectives: student.objectives || "",
        limitations: student.limitations || "",
        preferences: student.preferences || "",
        max_heart_rate: student.max_heart_rate,
        injury_history: student.injury_history || "",
        fitness_level: student.fitness_level,
      });
    }
  }, [student, form]);

  const onSubmit = async (data: FormData) => {
    if (!student) return;

    try {
      // Auto-calcular frequência cardíaca máxima se não informada e tiver data de nascimento
      let maxHeartRate = data.max_heart_rate;
      if (!maxHeartRate && data.birth_date) {
        const birthYear = new Date(data.birth_date).getFullYear();
        const age = new Date().getFullYear() - birthYear;
        maxHeartRate = 220 - age;
      }

      await updateStudent.mutateAsync({
        id: student.id,
        name: data.name,
        birth_date: data.birth_date || null,
        weekly_sessions_proposed: data.weekly_sessions_proposed,
        objectives: data.objectives || null,
        limitations: data.limitations || null,
        preferences: data.preferences || null,
        max_heart_rate: maxHeartRate,
        injury_history: data.injury_history || null,
        fitness_level: data.fitness_level || null,
      });
      toast.success("Aluno atualizado com sucesso");
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || "Erro ao atualizar aluno");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Editar Aluno</DialogTitle>
          <DialogDescription>
            Atualize os dados do aluno
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome Completo</FormLabel>
                  <FormControl>
                    <Input placeholder="Nome completo do aluno" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="birth_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data de Nascimento</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="weekly_sessions_proposed"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sessões/semana</FormLabel>
                    <FormControl>
                      <Input type="number" min="1" max="7" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="fitness_level"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nível de Condicionamento</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || undefined}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o nível" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="iniciante">Iniciante</SelectItem>
                      <SelectItem value="intermediario">Intermediário</SelectItem>
                      <SelectItem value="avancado">Avançado</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="max_heart_rate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>FC Máx. (bpm)</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      placeholder="Se vazio, usa fórmula 220-idade" 
                      {...field} 
                      value={field.value || ""}
                      onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="objectives"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Objetivos</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Ex: Hipertrofia, emagrecimento, condicionamento..."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="limitations"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Limitações</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Ex: Dor no joelho, problemas na lombar..."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="injury_history"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Histórico de Lesões</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Descreva lesões anteriores relevantes..."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="preferences"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Preferências</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Ex: Prefere treinos curtos, gosta de exercícios com peso livre..."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="gradient"
                className="flex-1"
                disabled={updateStudent.isPending}
              >
                {updateStudent.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  "Salvar"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
