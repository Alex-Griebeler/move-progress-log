import type { ReactNode } from "react";
import { Info } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

/**
 * Disclosure padrão do redesign (plano premium, D4 ratificada 31/08): um ⓘ de
 * CLIQUE (hover não existe em touch) que aprofunda uma informação já visível.
 *
 * Contrato (emendas v5/v5.1 da revisão fria):
 * - `label` contextual OBRIGATÓRIO — é o nome acessível do gatilho (ex.:
 *   "Detalhes da sincronização do Whoop", "Detalhes do alerta de Sono").
 * - O gatilho é um <button> real; Radix Popover dá Esc, focus-return e portal.
 * - NUNCA usar para estado de segurança: estado + consequência ficam sempre
 *   visíveis na superfície (contrato P3); aqui mora só causa/limiar/detalhe.
 * - Conteúdo pode conter ações (ex.: "Sincronizar agora") — funcionam dentro
 *   do popover.
 */
interface InfoDisclosureProps {
  /** Nome acessível contextual do gatilho — específico, nunca genérico. */
  label: string;
  children: ReactNode;
  /** Classes extras pro gatilho (posicionamento no host). */
  className?: string;
}

const InfoDisclosure = ({ label, children, className }: InfoDisclosureProps) => (
  <Popover>
    <PopoverTrigger asChild>
      <button
        type="button"
        aria-label={label}
        className={cn(
          // Alvo de toque ≥40px via área clicável estendida; ícone pequeno.
          "inline-flex h-6 w-6 -my-1 items-center justify-center rounded-full text-muted-foreground",
          "hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          className,
        )}
      >
        <Info aria-hidden="true" className="h-3.5 w-3.5" />
      </button>
    </PopoverTrigger>
    <PopoverContent align="start" className="w-72 text-sm">
      {children}
    </PopoverContent>
  </Popover>
);

export default InfoDisclosure;
