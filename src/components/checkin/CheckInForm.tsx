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
const PSR_VALUES = Array.from({ length: PSR_MAX - PSR_MIN + 1 }, (_, i) => PSR_MIN + i);

export interface CheckInFormProps {
  psr: number | null;
  onSelectPsr: (psr: number) => void;
  onRegister: () => void;
  onSkip: () => void;
  onAddObservation: () => void;
  saveState: "idle" | "saving" | "saved" | "error";
  /** U4: fingerprint mudou com valor preenchido — pede reconfirmação. */
  staleDataNotice: boolean;
  /** U8: reaberto via Editar/Fazer — a conduta só atualiza com novo registro. */
  editNotice?: boolean;
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
  editNotice = false,
  reconciliationFailed,
  onRetryReconciliation,
}: CheckInFormProps) => {
  // Radiogroup de verdade (review B2 parte 2): roving tabindex + setas —
  // Tab entra uma vez; setas movem a seleção.
  const handleKeyDown = (event: React.KeyboardEvent, value: number) => {
    // Padrão ARIA de radiogroup (revisão final-7): direita/BAIXO avançam,
    // esquerda/CIMA retrocedem.
    const up = event.key === "ArrowRight" || event.key === "ArrowDown";
    const down = event.key === "ArrowLeft" || event.key === "ArrowUp";
    if (!up && !down) return;
    // FRIA-9: a tecla é SEMPRE consumida dentro do grupo — no limite (0/10)
    // nada muda, mas a página não rola.
    event.preventDefault();
    const next = up ? Math.min(PSR_MAX, value + 1) : Math.max(PSR_MIN, value - 1);
    if (next === value) return;
    onSelectPsr(next);
    const group = event.currentTarget.parentElement;
    const target = group?.querySelector<HTMLButtonElement>(`[data-psr="${next}"]`);
    target?.focus();
  };
  const tabStop = psr ?? PSR_MIN;
  return (
    // Grade responsiva (revisão final-6): no desktop o rótulo ocupa a 1ª
    // coluna e escala/âncora/slot/quietrow alinham na 2ª (mock 01); no
    // mobile tudo empilha, Registrar full-width e quietrow centrada.
    <div className="mt-1 grid gap-x-3 gap-y-2 sm:grid-cols-[auto_1fr] sm:items-start">
      <span className="text-sm font-medium sm:pt-2.5">Percepção subjetiva de repouso</span>
      <div className="space-y-2">
        <div
          className="flex flex-wrap gap-1.5"
          role="radiogroup"
          aria-label="Percepção subjetiva de repouso, de 0 a 10"
        >
          {PSR_VALUES.map((value) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={psr === value}
              data-psr={value}
              tabIndex={value === tabStop ? 0 : -1}
              onClick={() => onSelectPsr(value)}
              onKeyDown={(e) => handleKeyDown(e, value)}
              className={cn(
                "rounded-md border text-[13px] tabular-nums",
                "min-h-[44px] min-w-[44px] sm:min-h-[40px] sm:min-w-[36px]",
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
        <span className="block text-xs text-muted-foreground">0 exaustão · 10 recuperação total</span>
      </div>

      <div className="space-y-2 sm:col-start-2">
      {staleDataNotice && (
        <p className="text-xs text-warning">
          Os dados do aparelho foram atualizados — confirme o check-in para recalcular a conduta.
        </p>
      )}
      {editNotice && !staleDataNotice && (
        <p className="text-xs text-muted-foreground">Registre novamente para atualizar a conduta.</p>
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
      <div className="mt-1 flex min-h-[44px] items-center">
        {psr !== null && (
          <Button
            size="sm"
            className="h-11 w-full animate-in fade-in-0 duration-150 motion-reduce:animate-none sm:w-auto"
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
      <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-0 text-xs text-muted-foreground sm:justify-start">
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
    </div>
  );
};

export default CheckInForm;
