/**
 * PublicPageShell — moldura única das páginas públicas (aluna e login).
 *
 * Revisão UX 18/09 (UX-28): a aluna abre o link pelo WhatsApp e entrega dados
 * de saúde; a tela precisa dizer de quem é. Cabeçalho com o nome Fabrik em
 * texto (sem logo externo novo), rodapé com Termos/Privacidade, marco
 * <main id="main-content"> para o "Pular para o conteúdo" global. O tema segue
 * o sistema (ThemeProvider em App.tsx) — nada de escuro forçado aqui.
 */
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ROUTES } from "@/constants/navigation";
import { cn } from "@/lib/utils";

interface PublicPageShellProps {
  children: ReactNode;
  /** Largura do conteúdo: md para cartões de status, lg para formulários. */
  width?: "md" | "lg" | "prose";
  /** Centraliza verticalmente (telas de status curtas). */
  centered?: boolean;
  /** Links legais no rodapé (desligar na própria página legal). */
  showLegalLinks?: boolean;
  className?: string;
}

const WIDTH_CLASS: Record<NonNullable<PublicPageShellProps["width"]>, string> = {
  md: "max-w-md",
  lg: "max-w-2xl",
  prose: "max-w-3xl",
};

export const FabrikWordmark = ({ className }: { className?: string }) => (
  <span className={cn("inline-flex items-baseline gap-1.5 text-foreground", className)}>
    <span className="text-base font-semibold tracking-[0.18em] uppercase">Fabrik</span>
    <span className="text-sm font-medium text-muted-foreground">Performance</span>
  </span>
);

export function PublicPageShell({
  children,
  width = "md",
  centered = false,
  showLegalLinks = true,
  className,
}: PublicPageShellProps) {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <main
        id="main-content"
        tabIndex={-1}
        className={cn(
          "flex flex-1 flex-col px-4 pb-8 focus:outline-none",
          centered && "justify-center",
        )}
      >
        <div className={cn("mx-auto w-full", WIDTH_CLASS[width], className)}>{children}</div>
      </main>

    </div>
  );
}
