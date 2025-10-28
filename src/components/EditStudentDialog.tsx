import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
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
  name: z.string().min(1, "Nome é obrigatório"),
  weekly_sessions_proposed: z.coerce.number().min(1, "Mínimo 1 sessão").max(7, "Máximo 7 sessões"),
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
      weekly_sessions_proposed: 2,
    },
  });

  useEffect(() => {
    if (student) {
      form.reset({
        name: student.name,
        weekly_sessions_proposed: student.weekly_sessions_proposed,
      });
    }
  }, [student, form]);

  const onSubmit = async (data: FormData) => {
    if (!student) return;

    try {
      await updateStudent.mutateAsync({
        id: student.id,
        name: data.name,
        weekly_sessions_proposed: data.weekly_sessions_proposed,
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
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome</FormLabel>
                  <FormControl>
                    <Input placeholder="Nome do aluno" {...field} />
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
                  <FormLabel>Sessões por semana (proposta)</FormLabel>
                  <FormControl>
                    <Input type="number" min="1" max="7" {...field} />
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
