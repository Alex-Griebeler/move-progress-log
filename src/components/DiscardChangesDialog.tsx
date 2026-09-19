/**
 * Confirmação antes de perder dados de formulário (régua 6 / brief de
 * execução: "saída de formulário com dados → AlertDialog").
 * Uso: o diálogo do formulário intercepta o fechamento quando há alteração
 * e abre este; "Descartar" fecha de fato, "Continuar editando" volta.
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

interface DiscardChangesDialogProps {
  open: boolean;
  onKeepEditing: () => void;
  onDiscard: () => void;
}

export function DiscardChangesDialog({ open, onKeepEditing, onDiscard }: DiscardChangesDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={(next) => !next && onKeepEditing()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Descartar o que foi preenchido?</AlertDialogTitle>
          <AlertDialogDescription>
            As alterações deste formulário ainda não foram salvas e serão perdidas.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onKeepEditing}>Continuar editando</AlertDialogCancel>
          <AlertDialogAction
            onClick={onDiscard}
            className="bg-destructive text-destructive-foreground"
          >
            Descartar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
