import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle, Plus, XCircle } from "lucide-react";

interface ValidationAlertsProps {
  errors: string[];
  warnings: string[];
  /** Called when user clicks "Add unmentioned exercises" */
  onAddUnmentionedExercises?: () => void;
  showAddUnmentioned?: boolean;
}

/**
 * Revisão pós-voz: o que impede salvar (erros) vem antes do que só merece
 * atenção (avisos). Ícone + texto carregam o significado; a cor fica na
 * borda/ícone e o texto sobre fundo tonal é text-foreground (contraste AA).
 */
export function ValidationAlerts({
  errors,
  warnings,
  onAddUnmentionedExercises,
  showAddUnmentioned = false,
}: ValidationAlertsProps) {
  if (errors.length === 0 && warnings.length === 0) {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
        <CheckCircle className="h-4 w-4 text-success" aria-hidden="true" />
        Dados obrigatórios preenchidos.
      </p>
    );
  }

  return (
    <section className="space-y-3" aria-label="Pendências da revisão">
      {errors.length > 0 && (
        <Alert variant="destructive" role="alert">
          <XCircle className="h-4 w-4" aria-hidden="true" />
          <AlertDescription className="text-foreground">
            <p className="font-medium">
              {errors.length === 1 ? "1 pendência impede salvar" : `${errors.length} pendências impedem salvar`}
            </p>
            <ul className="mt-1 list-disc space-y-0.5 pl-4 text-sm">
              {errors.map((err, idx) => (
                <li key={`error-${idx}`}>{err}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {warnings.length > 0 && (
        <Alert className="border-warning/50">
          <AlertTriangle className="h-4 w-4 text-warning" aria-hidden="true" />
          <AlertDescription className="text-foreground">
            <p className="font-medium">
              {warnings.length === 1 ? "1 ponto para conferir" : `${warnings.length} pontos para conferir`}
            </p>
            <ul className="mt-1 list-disc space-y-0.5 pl-4 text-sm">
              {warnings.map((warn, idx) => (
                <li key={`warning-${idx}`}>{warn}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {showAddUnmentioned && onAddUnmentionedExercises && (
        <Button
          variant="outline"
          size="touch"
          className="w-full"
          onClick={onAddUnmentionedExercises}
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Incluir os exercícios não citados para preencher
        </Button>
      )}
    </section>
  );
}
