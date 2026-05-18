/**
 * Botão controlado pra abrir o laudo DEXA (PDF) em uma nova aba.
 *
 * Por que NÃO abrimos o `signedUrl` direto:
 *   - Extensões de privacy/adblock (uBlock, Brave Shields, Chrome
 *     "tracking & blocked sites") classificam `*.supabase.co` como
 *     terceiro e disparam `ERR_BLOCKED_BY_CLIENT` ao abrir a URL
 *     numa aba nova — o coach vê só uma aba branca com erro.
 *   - Expor o `signedUrl` na barra de endereço também aumenta o risco
 *     de o token ser copiado/compartilhado em screenshot ou histórico.
 *
 * Fluxo robusto:
 *   1. Assina o path via `useDexaPdfSignedUrl` (TTL 60s).
 *   2. `fetch(signedUrl)` no browser pra baixar o PDF como Blob.
 *   3. `URL.createObjectURL(blob)` → blob URL local (mesma origem
 *      do app, não bloqueada por filtros que miram `supabase.co`).
 *   4. Abre o blob URL em nova aba com `noopener,noreferrer`.
 *   5. `URL.revokeObjectURL(blobUrl)` após intervalo seguro.
 *   6. Se `window.open` retornar null (pop-up bloqueado), revoga
 *      imediatamente e mostra toast genérico orientando permitir.
 *   7. Se fetch/blob falhar, toast genérico — sem expor URL/token/path.
 *
 * Read-only absoluto: zero `insert/update/delete/upsert`, zero RPC,
 * zero persistência local da URL/token/blobUrl (nem `localStorage`,
 * nem `sessionStorage`, nem React Query cache).
 */

import { useState } from "react";
import { ExternalLink, FileWarning, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { notify } from "@/lib/notify";

import { useDexaPdfSignedUrl } from "@/hooks/useDexaPdfSignedUrl";

interface DexaPdfButtonProps {
  /** Path completo do PDF dentro do bucket privado `dexa-pdfs`. */
  storagePath: string | null | undefined;
}

/**
 * Janela entre `window.open` e `URL.revokeObjectURL`. Suficiente
 * pra que o Chrome tenha começado a carregar o PDF na nova aba mas
 * curto o bastante pra liberar memória rapidamente. Browsers
 * mantêm a referência ao blob enquanto a aba está aberta — revogar
 * o URL local só impede futuras aberturas via aquele URL, não
 * derruba a aba existente.
 */
const DEXA_PDF_BLOB_REVOKE_DELAY_MS = 60_000;

/**
 * Mensagens humanas FIXAS — nunca interpolam URL/path/token. Detalhes
 * técnicos ficam server-side; aqui é só sinal pro coach.
 */
const DEXA_PDF_OPEN_ERROR_TITLE = "Não foi possível abrir o laudo";
const DEXA_PDF_OPEN_GENERIC_DESCRIPTION =
  "O link expirou, seu acesso não foi autorizado ou seu navegador bloqueou o download. Tente novamente em instantes.";
const DEXA_PDF_OPEN_POPUP_DESCRIPTION =
  "Seu navegador bloqueou a abertura da nova aba. Permita pop-ups deste site e tente novamente.";

export function DexaPdfButton({ storagePath }: DexaPdfButtonProps) {
  const { sign, isLoading: isSigning } = useDexaPdfSignedUrl();
  const [isFetching, setIsFetching] = useState(false);

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
    if (isFetching || isSigning) return;

    const signedUrl = await sign(storagePath);
    if (!signedUrl) {
      notify.error(DEXA_PDF_OPEN_ERROR_TITLE, {
        description: DEXA_PDF_OPEN_GENERIC_DESCRIPTION,
      });
      return;
    }

    // Baixa o PDF e converte pra Blob URL local. NUNCA logamos signedUrl/
    // path/token — catch genérico, sem `err.message`.
    setIsFetching(true);
    let blobUrl: string | null = null;
    try {
      const response = await fetch(signedUrl);
      if (!response.ok) {
        notify.error(DEXA_PDF_OPEN_ERROR_TITLE, {
          description: DEXA_PDF_OPEN_GENERIC_DESCRIPTION,
        });
        return;
      }
      const rawBlob = await response.blob();
      // Força o MIME pra application/pdf — o storage pode devolver
      // octet-stream e alguns browsers tratam como download forçado.
      const pdfBlob = new Blob([rawBlob], { type: "application/pdf" });
      blobUrl = URL.createObjectURL(pdfBlob);

      const opened = window.open(blobUrl, "_blank", "noopener,noreferrer");
      if (!opened) {
        // Pop-up bloqueado pelo navegador — revoga imediatamente, sem
        // vazar memória, e orienta o coach a liberar pop-ups.
        URL.revokeObjectURL(blobUrl);
        blobUrl = null;
        notify.error(DEXA_PDF_OPEN_ERROR_TITLE, {
          description: DEXA_PDF_OPEN_POPUP_DESCRIPTION,
        });
        return;
      }

      // Aba aberta. Revoga o URL local após janela segura — o browser
      // mantém a referência ao blob enquanto a aba viva, então
      // revogar aqui só impede REUTILIZAÇÃO daquele URL, sem afetar
      // a aba que já está renderizando.
      const urlToRevoke = blobUrl;
      blobUrl = null;
      setTimeout(() => URL.revokeObjectURL(urlToRevoke), DEXA_PDF_BLOB_REVOKE_DELAY_MS);
    } catch {
      // catch silencioso por design — `err.message` pode conter URL/host/
      // querystring do token. Mensagem humana é fixa.
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
        blobUrl = null;
      }
      notify.error(DEXA_PDF_OPEN_ERROR_TITLE, {
        description: DEXA_PDF_OPEN_GENERIC_DESCRIPTION,
      });
    } finally {
      setIsFetching(false);
    }
  };

  const isLoading = isSigning || isFetching;

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
      {isLoading ? "Abrindo…" : "Abrir laudo DEXA"}
    </Button>
  );
}
