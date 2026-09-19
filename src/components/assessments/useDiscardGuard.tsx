/**
 * Hook da guarda de saída (UX-01): com `isDirty`, `requestClose` abre a
 * confirmação em vez de descartar; sem dados, fecha direto.
 */

import { useCallback, useState, type ReactNode } from "react";

import { DiscardDraftDialog } from "./DiscardDraftDialog";

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
    <DiscardDraftDialog
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
