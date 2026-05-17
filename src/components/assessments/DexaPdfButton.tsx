/**
 * Botão controlado pra abrir o laudo DEXA (PDF) em uma nova aba via signed
 * URL com TTL curto.
 *
 * Comportamento:
 *   - `storagePath === null/undefined/""` → estado claro de "ainda não
 *     anexado" (sem botão, sem path técnico exposto na UI);
 *   - `storagePath` presente → botão "Abrir laudo DEXA". No click:
 *     1. Assina o path via `useDexaPdfSignedUrl` (TTL 60s);
 *     2. Abre em nova aba com `target="_blank"` + `rel="noopener noreferrer"`;
 *     3. Falha → toast de erro (genérico, sem expor path).
 *
 * Read-only absoluto: zero `insert/update/delete/upsert`, zero RPC, zero
 * persistência local da URL/token.
 */

import { ExternalLink, FileWarning, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { notify } from "@/lib/notify";

import { useDexaPdfSignedUrl } from "@/hooks/useDexaPdfSignedUrl";

interface DexaPdfButtonProps {
  /** Path completo do PDF dentro do bucket privado `dexa-pdfs`. */
  storagePath: string | null | undefined;
}

export function DexaPdfButton({ storagePath }: DexaPdfButtonProps) {
  const { sign, isLoading } = useDexaPdfSignedUrl();

  const hasPdf =
    typeof storagePath === "string" && storagePath.trim().length > 0;

  if (!hasPdf) {
    return (
      <div
        className="flex items-center gap-2 rounded-md border border-dashed border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground"
        role="status"
        aria-live="polite"
        data-testid="dexa-pdf-empty"
      >
        <FileWarning className="h-4 w-4" aria-hidden />
        Laudo DEXA ainda não anexado.
      </div>
    );
  }

  const handleClick = async () => {
    const url = await sign(storagePath);
    if (!url) {
      notify.error("Não foi possível abrir o laudo", {
        description:
          "O link assinado expirou ou seu acesso não foi autorizado. Tente novamente em instantes.",
      });
      return;
    }
    // Abertura segura em nova aba — `noopener,noreferrer` impede que a
    // aba aberta consiga manipular `window.opener` (proteção tab-nabbing)
    // e não envia Referer para o storage host.
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleClick}
      disabled={isLoading}
      aria-label="Abrir laudo DEXA em nova aba"
      data-testid="dexa-pdf-open"
    >
      {isLoading ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
      ) : (
        <ExternalLink className="mr-2 h-4 w-4" aria-hidden />
      )}
      {isLoading ? "Gerando link…" : "Abrir laudo DEXA"}
    </Button>
  );
}
