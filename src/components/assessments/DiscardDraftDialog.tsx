/**
 * Guarda de saída para formulários com dados digitados (revisão UX 18/09,
 * UX-01). Fechar o diálogo — toque fora, Esc ou "Cancelar" — com o
 * formulário sujo abre esta confirmação em vez de descartar na hora.
 *
 * Uso direto ou via `useDiscardGuard` (./useDiscardGuard):
 *   const guard = useDiscardGuard({ isDirty, onDiscard: fecharDeVerdade });
 *   <Dialog onOpenChange={(o) => (o ? abrir() : guard.requestClose())}>
 *   ...
 *   {guard.dialog}
 */

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
import { buttonVariants } from "@/components/ui/button";

interface DiscardDraftDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  title?: string;
  description?: string;
  confirmLabel?: string;
}

export const DiscardDraftDialog = ({
  open,
  onOpenChange,
  onConfirm,
  title = "Descartar dados não salvos?",
  description = "O que foi digitado neste formulário será perdido.",
  confirmLabel = "Descartar",
}: DiscardDraftDialogProps) => (
  <AlertDialog open={open} onOpenChange={onOpenChange}>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>{title}</AlertDialogTitle>
        <AlertDialogDescription>{description}</AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>Continuar editando</AlertDialogCancel>
        <AlertDialogAction
          className={buttonVariants({ variant: "destructive" })}
          onClick={onConfirm}
        >
          {confirmLabel}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);
