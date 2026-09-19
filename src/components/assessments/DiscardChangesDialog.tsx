/**
 * Guarda de saída para formulários com dados digitados (revisão UX 18/09,
 * UX-01). Fechar o diálogo — toque fora, Esc ou "Cancelar" — com o
 * formulário sujo abre esta confirmação em vez de descartar na hora.
 *
 * Uso:
 *   const guard = useDiscardGuard({ isDirty, onDiscard: fecharDeVerdade });
 *   <Dialog onOpenChange={(o) => (o ? abrir() : guard.requestClose())}>
 *   ...
 *   {guard.dialog}
 */

import { useCallback, useState, type ReactNode } from "react";

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

interface DiscardChangesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  title?: string;
  description?: string;
  confirmLabel?: string;
}

export const DiscardChangesDialog = ({
  open,
  onOpenChange,
  onConfirm,
  title = "Descartar dados não salvos?",
  description = "O que foi digitado neste formulário será perdido.",
  confirmLabel = "Descartar",
}: DiscardChangesDialogProps) => (
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

interface UseDiscardGuardOptions {
  isDirty: boolean;
  onDiscard: () => void;
  title?: string;
  description?: string;
  confirmLabel?: string;
}

export const useDiscardGuard = ({
  isDirty,
  onDiscard,
  title,
  description,
  confirmLabel,
}: UseDiscardGuardOptions): { requestClose: () => void; dialog: ReactNode } => {
  const [confirmOpen, setConfirmOpen] = useState(false);

  const requestClose = useCallback(() => {
    if (isDirty) {
      setConfirmOpen(true);
      return;
    }
    onDiscard();
  }, [isDirty, onDiscard]);

  const dialog = (
    <DiscardChangesDialog
      open={confirmOpen}
      onOpenChange={setConfirmOpen}
      onConfirm={() => {
        setConfirmOpen(false);
        onDiscard();
      }}
      title={title}
      description={description}
      confirmLabel={confirmLabel}
    />
  );

  return { requestClose, dialog };
};
