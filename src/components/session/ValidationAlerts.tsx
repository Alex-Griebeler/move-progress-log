import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle, Plus, XCircle } from "lucide-react";

interface ValidationAlertsProps {
  errors: string[];
  warnings: string[];
  /** Called when user clicks "Add unmentioned exercises" */
  onAddUnmentionedExercises?: () => void;
  showAddUnmentioned?: boolean;
}

export function ValidationAlerts({
  errors,
  warnings,
  onAddUnmentionedExercises,
  showAddUnmentioned = false,
}: ValidationAlertsProps) {
  if (errors.length === 0 && warnings.length === 0) {
    return (
      <Alert className="border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-800">
        <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-500" />
        <AlertTitle className="text-green-900 dark:text-green-100">Tudo pronto!</AlertTitle>
        <AlertDescription className="text-green-800 dark:text-green-200">
          Todos os dados críticos foram preenchidos corretamente.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2 text-amber-900 dark:text-amber-100">
          <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-500" />
          Alertas de Validação
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {errors.length > 0 && (
          <div className="space-y-2">
            {errors.map((err, idx) => (
              <Alert key={`error-${idx}`} variant="destructive" className="py-2">
                <XCircle className="h-4 w-4" />
                <AlertDescription className="text-sm">{err}</AlertDescription>
              </Alert>
            ))}
          </div>
        )}

        {warnings.length > 0 && (
          <div className="space-y-2">
            {warnings.map((warn, idx) => (
              <Alert
                key={`warning-${idx}`}
                className="border-amber-300 bg-amber-100 dark:bg-amber-950/50 dark:border-amber-700 py-2"
              >
                <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-500" />
                <AlertDescription className="text-sm text-amber-900 dark:text-amber-200">
                  {warn}
                </AlertDescription>
              </Alert>
            ))}
          </div>
        )}

        {showAddUnmentioned && onAddUnmentionedExercises && (
          <Button
            variant="outline"
            size="sm"
            className="mt-2 w-full border-amber-400 text-amber-900 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-100 dark:hover:bg-amber-900/30"
            onClick={onAddUnmentionedExercises}
          >
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Exercícios Não Mencionados para Edição
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
