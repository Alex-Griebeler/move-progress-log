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

interface DiscardSessionConfirmProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  /** Frase que diz exatamente o que se perde (ex.: "As 2 gravações transcritas serão descartadas."). */
  description: string;
  title?: string;
  confirmLabel?: string;
}

/**
 * Confirmação antes de sair de um registro de sessão com dados ainda não
 * salvos (gravações transcritas, exercícios digitados). Substitui o
 * window.confirm e o fechamento silencioso pelo X.
 */
export function DiscardSessionConfirm({
  open,
  onOpenChange,
  onConfirm,
  description,
  title = "Descartar o registro?",
  confirmLabel = "Descartar",
}: DiscardSessionConfirmProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Continuar registrando</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
