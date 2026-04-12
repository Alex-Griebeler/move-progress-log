import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { notify } from "@/lib/notify";
import { logger } from "@/utils/logger";
import { buildErrorDescription } from "@/utils/errorParsing";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { UserCog, Loader2, KeyRound, AlertTriangle } from "lucide-react";

const editUserSchema = z.object({
  fullName: z.string().min(3, "Nome deve ter pelo menos 3 caracteres").max(100),
  email: z.string().email("Email inválido"),
  role: z.enum(["admin", "moderator", "user"]),
  newPassword: z.string().optional(),
});

type EditUserFormValues = z.infer<typeof editUserSchema>;

interface UserToEdit {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'moderator' | 'user';
}

interface EditUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserToEdit | null;
  currentUserId: string;
  onSuccess: () => void;
}

const roleLabels: Record<string, string> = {
  admin: "Administrador",
  moderator: "Treinador",
  user: "Aluno",
};

export function EditUserDialog({ open, onOpenChange, user, currentUserId, onSuccess }: EditUserDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showRoleConfirm, setShowRoleConfirm] = useState(false);
  const [pendingRole, setPendingRole] = useState<'admin' | 'moderator' | 'user' | null>(null);

  const form = useForm<EditUserFormValues>({
    resolver: zodResolver(editUserSchema),
    values: user ? {
      fullName: user.full_name,
      email: user.email,
      role: user.role,
      newPassword: "",
    } : undefined,
  });

  const handleRoleChange = (newRole: 'admin' | 'moderator' | 'user') => {
    // Se está tentando alterar role de admin, pedir confirmação
    if (user?.role === 'admin' && newRole !== 'admin') {
      setPendingRole(newRole);
      setShowRoleConfirm(true);
    } else {
      form.setValue('role', newRole);
    }
  };

  const confirmRoleChange = () => {
    if (pendingRole) {
      form.setValue('role', pendingRole);
    }
    setShowRoleConfirm(false);
    setPendingRole(null);
  };

  const onSubmit = async (values: EditUserFormValues) => {
    if (!user) return;

    // Validação: impedir que admin remova seu próprio role
    if (user.id === currentUserId && values.role !== 'admin') {
      notify.error("Ação não permitida", {
        description: "Você não pode remover seu próprio perfil de administrador",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      logger.log("Updating user with data:", {
        userId: user.id,
        fullName: values.fullName,
        email: values.email,
        role: values.role,
      });

      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error("Você precisa estar autenticado para editar usuários");
      }

      const { data, error } = await supabase.functions.invoke("admin-update-user", {
        body: {
          userId: user.id,
          fullName: values.fullName,
          email: values.email,
          role: values.role,
          newPassword: values.newPassword || undefined,
        },
      });

      logger.log("Response from admin-update-user:", { data, error });

      if (error) {
        logger.error("Edge function error:", error);
        throw error;
      }

      if (data?.error) {
        logger.error("Data error:", data.error);
        throw new Error(data.error);
      }

      notify.success("Usuário atualizado com sucesso!");
      onOpenChange(false);
      onSuccess();
    } catch (error: unknown) {
      logger.error("Error updating user:", error);
      notify.error("Erro ao atualizar usuário", {
        description: buildErrorDescription(error) || "Tente novamente mais tarde",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async () => {
    if (!user) return;

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      notify.success("Email de reset enviado!", {
        description: `Um link de redefinição foi enviado para ${user.email}`,
      });
    } catch (error: unknown) {
      logger.error("Error sending reset email:", error);
      notify.error("Erro ao enviar email", {
        description: buildErrorDescription(error) || "Tente novamente mais tarde",
      });
    }
  };

  if (!user) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCog className="h-5 w-5" />
              Editar Usuário
            </DialogTitle>
            <DialogDescription>
              Atualize as informações do usuário {user.full_name}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome Completo *</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email *</FormLabel>
                    <FormControl>
                      <Input type="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Perfil *</FormLabel>
                    <Select 
                      value={field.value} 
                      onValueChange={handleRoleChange}
                      disabled={user.id === currentUserId}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="admin">{roleLabels.admin}</SelectItem>
                        <SelectItem value="moderator">{roleLabels.moderator}</SelectItem>
                        <SelectItem value="user">{roleLabels.user}</SelectItem>
                      </SelectContent>
                    </Select>
                    {user.id === currentUserId && (
                      <FormDescription>
                        Você não pode alterar seu próprio perfil
                      </FormDescription>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nova Senha (opcional)</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Deixe vazio para não alterar" {...field} />
                    </FormControl>
                    <FormDescription>
                      Somente preencha se deseja alterar a senha
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex items-center gap-sm p-md bg-muted rounded-radius-lg">
                <KeyRound className="h-4 w-4 text-muted-foreground" />
                <div className="flex-1 text-sm">
                  Ou envie um email de redefinição de senha
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleResetPassword}
                >
                  Enviar Email
                </Button>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isSubmitting}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Salvar Alterações
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showRoleConfirm} onOpenChange={setShowRoleConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Confirmar Alteração de Perfil
            </AlertDialogTitle>
            <AlertDialogDescription>
              Você está prestes a remover o perfil de <strong>Administrador</strong> deste usuário.
              Esta ação afetará as permissões do usuário no sistema.
              <br /><br />
              Tem certeza que deseja continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRoleChange}>
              Confirmar Alteração
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
