import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PSR_MAX, PSR_MIN } from "@/utils/checkin";

/**
 * Formulário do check-in v3 (PR-B2, mocks aprovados 31/08 + v8.2/v8.3):
 * UMA pergunta (PSR 0-10) — chegada em repouso NÃO tem botão; o "Registrar"
 * compacto faz fade dentro de um SLOT RESERVADO de 44px (nada se desloca,
 * nunca — veredito da review de design). Ações secundárias numa quietrow
 * única, fora da trajetória do polegar (ordem ratificada: escala → Registrar
 * → secundárias). Apresentacional puro — a máquina/persistência é do
 * chamador; RTL cobre teclado/estados aqui.
 */
export interface CheckInFormProps {
  psr: number | null;
  onSelectPsr: (psr: number) => void;
  onRegister: () => void;
  onSkip: () => void;
  onAddObservation: () => void;
  saveState: "idle" | "saving" | "saved" | "error";
  /** U4: fingerprint mudou com valor preenchido — pede reconfirmação. */
  staleDataNotice: boolean;
  /** Reconciliação do cold start falhou (v8.1-3). */
  reconciliationFailed: boolean;
  onRetryReconciliation?: () => void;
}

const CheckInForm = ({
  psr,
  onSelectPsr,
  onRegister,
  onSkip,
  onAddObservation,
  saveState,
  staleDataNotice,
  reconciliationFailed,
  onRetryReconciliation,
}: CheckInFormProps) => {
  const values = Array.from({ length: PSR_MAX - PSR_MIN + 1 }, (_, i) => PSR_MIN + i);
  return (
    <div className="mt-1 space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium">Percepção subjetiva de repouso</span>
        <div
          className="flex flex-wrap gap-1.5"
          role="radiogroup"
          aria-label="Percepção subjetiva de repouso, de 0 a 10"
        >
          {values.map((value) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={psr === value}
              onClick={() => onSelectPsr(value)}
              className={cn(
                "h-10 w-9 rounded-md border text-[13px] tabular-nums sm:w-9",
                "min-h-[44px] min-w-[40px] sm:min-h-[40px]",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                psr === value
                  ? "border-foreground bg-foreground font-semibold text-background"
                  : "border-border bg-card text-foreground",
              )}
            >
              {value}
            </button>
          ))}
        </div>
        <span className="text-xs text-muted-foreground">0 exaustão · 10 recuperação total</span>
      </div>

      {staleDataNotice && (
        <p className="text-xs text-warning">
          Os dados do aparelho foram atualizados — confirme o check-in para recalcular a conduta.
        </p>
      )}
      {reconciliationFailed && (
        <p className="text-xs text-warning">
          Não foi possível verificar um check-in anterior.{" "}
          <button type="button" className="underline" onClick={onRetryReconciliation}>
            Tentar novamente
          </button>
        </p>
      )}
      {saveState === "error" && (
        <p className="text-xs text-destructive">Check-in não foi salvo.</p>
      )}

      {/* Slot RESERVADO de 44px: em repouso fica vazio (o botão está ausente
          da árvore, não transparente); ao selecionar, o Registrar faz fade
          aqui dentro — nada na tela se desloca (v8.3). */}
      <div className="mt-3 flex min-h-[44px] items-center">
        {psr !== null && (
          <Button
            size="sm"
            className="h-11 animate-in fade-in-0 duration-150 motion-reduce:animate-none"
            disabled={saveState === "saving"}
            onClick={onRegister}
          >
            {saveState === "saving"
              ? "Registrando…"
              : saveState === "error"
                ? "Tentar registrar novamente"
                : "Registrar"}
          </Button>
        )}
      </div>
      <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
        <button
          type="button"
          className="inline-flex min-h-[44px] items-center hover:text-foreground"
          onClick={onSkip}
        >
          Iniciar sem check-in
        </button>
        <span aria-hidden="true" className="opacity-50">·</span>
        <button
          type="button"
          className="inline-flex min-h-[44px] items-center hover:text-foreground"
          onClick={onAddObservation}
        >
          + Adicionar observação
        </button>
      </div>
    </div>
  );
};

export default CheckInForm;
