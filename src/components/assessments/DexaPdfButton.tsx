/**
 * Botão controlado pra BAIXAR o laudo DEXA (PDF).
 *
 * Por que download explícito e NÃO `window.open`:
 *   - PR #157 abria a `signedUrl` direto → Chrome com extensão de
 *     privacy/adblock disparava `ERR_BLOCKED_BY_CLIENT` ao navegar
 *     pra `*.supabase.co` numa nova aba.
 *   - PR #166 trocou pra abrir um blob URL local em nova aba (mesma
 *     origem do app, escapava do filtro de host). Funcionou em
 *     bench mas o mesmo Chrome do usuário também bloqueou o
 *     `blob:` em algumas extensões/configurações — `ERR_BLOCKED_BY_CLIENT`
 *     em aba `blob:`.
 *   - Conclusão: QUALQUER fluxo `window.open` é instável nesse
 *     ambiente. A solução robusta é DOWNLOAD EXPLÍCITO via
 *     `<a download>` programático — o navegador trata como ação do
 *     usuário em arquivo local, sem abrir aba, sem expor URL na
 *     barra de endereço, sem filtro de host envolvido.
 *
 * Fluxo:
 *   1. Assina o path via `useDexaPdfSignedUrl` (TTL 60s).
 *   2. `fetch(signedUrl)` no browser pra baixar o PDF como Blob.
 *   3. `URL.createObjectURL(blob)` → blob URL local.
 *   4. Cria `<a>` invisível com `href=blobUrl` + `download="laudo-dexa.pdf"`,
 *      faz `.click()`, remove do DOM.
 *   5. Agenda `URL.revokeObjectURL(blobUrl)` via `setTimeout` com
 *      delay confortável (30s). Revogar IMEDIATAMENTE após `click()`
 *      pode cancelar/instabilizar o download em alguns browsers
 *      (Chromium-based em especial, com extensão de segurança).
 *      Em caminhos de ERRO (antes do click), o blob URL é revogado
 *      ali mesmo via flag `downloadTriggered`.
 *   6. Se fetch/blob falhar, toast genérico — sem expor URL/token/path.
 *
 * Read-only absoluto: zero `insert/update/delete/upsert`, zero RPC,
 * zero persistência local da URL/token/blobUrl (nem `localStorage`,
 * nem `sessionStorage`, nem React Query cache).
 */

import { useState } from "react";
import { Download, FileWarning, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { notify } from "@/lib/notify";

import { useDexaPdfSignedUrl } from "@/hooks/useDexaPdfSignedUrl";

interface DexaPdfButtonProps {
  /** Path completo do PDF dentro do bucket privado `dexa-pdfs`. */
  storagePath: string | null | undefined;
}

/**
 * Nome de arquivo SUGERIDO ao browser no download. Fixo + neutro:
 * NÃO inclui student_id, nome do aluno, data nem qualquer PII. Se
 * o coach baixar múltiplos laudos, o browser sufixa com (1), (2)…
 * automaticamente. Trade-off aceito: usabilidade < privacidade.
 */
const DEXA_PDF_DOWNLOAD_FILENAME = "laudo-dexa.pdf";

/**
 * Delay entre o `a.click()` e o `URL.revokeObjectURL(blobUrl)`.
 *
 * Por que ATRASAR a revogação:
 *   - Revogar IMEDIATAMENTE após `click()` (ou no `finally` logo
 *     depois) pode cancelar/instabilizar o download em alguns
 *     navegadores — especialmente Chromium-based onde o handler
 *     de download lê o blob de forma assíncrona. Cobertura por
 *     auditoria do PR #169 (Codex) levantou o ponto.
 *   - 30s é folgado o bastante pra qualquer download começar (o
 *     browser segura a referência ao blob até o stream concluir)
 *     e curto o bastante pra liberar memória rapidamente.
 *
 * Em caminhos de ERRO (antes do click), o blob URL é revogado
 * ali mesmo via flag `downloadTriggered` — zero memória vazada.
 */
const DEXA_PDF_BLOB_REVOKE_DELAY_MS = 30_000;

/**
 * Mensagens humanas FIXAS — nunca interpolam URL/path/token. Detalhes
 * técnicos ficam server-side; aqui é só sinal pro coach.
 */
const DEXA_PDF_DOWNLOAD_ERROR_TITLE = "Não foi possível baixar o laudo";
const DEXA_PDF_DOWNLOAD_GENERIC_DESCRIPTION =
  "O link expirou, seu acesso não foi autorizado ou seu navegador bloqueou o download. Tente novamente em instantes.";

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
      notify.error(DEXA_PDF_DOWNLOAD_ERROR_TITLE, {
        description: DEXA_PDF_DOWNLOAD_GENERIC_DESCRIPTION,
      });
      return;
    }

    // Baixa o PDF e dispara download via <a download>. NUNCA logamos
    // signedUrl/path/token — catch genérico, sem `err.message`.
    //
    // Estratégia de revogação do blob URL:
    //   - Se o `.click()` foi disparado (`downloadTriggered = true`),
    //     o blob URL é revogado de forma ATRASADA via setTimeout —
    //     revogar imediatamente pode cancelar o download em alguns
    //     navegadores (Codex audit do PR #169).
    //   - Se houve ERRO antes do click, o blob URL é revogado AGORA
    //     mesmo no `finally` — sem download pra preservar, zero
    //     memória vazada.
    setIsFetching(true);
    let blobUrl: string | null = null;
    let downloadTriggered = false;
    try {
      const response = await fetch(signedUrl);
      if (!response.ok) {
        notify.error(DEXA_PDF_DOWNLOAD_ERROR_TITLE, {
          description: DEXA_PDF_DOWNLOAD_GENERIC_DESCRIPTION,
        });
        return;
      }
      const rawBlob = await response.blob();
      // Força o MIME pra application/pdf — o storage pode devolver
      // octet-stream e o nome de arquivo padrão também influencia
      // como o browser apresenta o download.
      const pdfBlob = new Blob([rawBlob], { type: "application/pdf" });
      blobUrl = URL.createObjectURL(pdfBlob);

      // Cria <a download> invisível, dispara click programaticamente,
      // remove do DOM. Padrão amplamente aceito pra download forçado
      // — não usa window.open, não abre aba, não expõe URL.
      //
      // Atenção: já estamos APÓS um await (`fetch` + `response.blob()`),
      // então tecnicamente saímos do user-gesture original; ainda
      // assim o browser aceita `.click()` em `<a download>` aqui
      // porque é o caminho continuação do click. `appendChild` antes
      // de `.click()` ajuda em compatibilidade cross-browser.
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = DEXA_PDF_DOWNLOAD_FILENAME;
      a.rel = "noopener noreferrer";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      downloadTriggered = true;
    } catch {
      // catch silencioso por design — `err.message` pode conter URL/host/
      // querystring do token. Mensagem humana é fixa.
      notify.error(DEXA_PDF_DOWNLOAD_ERROR_TITLE, {
        description: DEXA_PDF_DOWNLOAD_GENERIC_DESCRIPTION,
      });
    } finally {
      if (blobUrl) {
        if (downloadTriggered) {
          // Download disparado: revoga ATRASADO pra não cancelar o
          // stream. Captura `blobUrl` num const local pra que o closure
          // sobreviva ao reset abaixo.
          const urlToRevoke = blobUrl;
          setTimeout(
            () => URL.revokeObjectURL(urlToRevoke),
            DEXA_PDF_BLOB_REVOKE_DELAY_MS,
          );
        } else {
          // Erro antes do click: revoga AGORA — sem download em curso,
          // zero memória vazada.
          URL.revokeObjectURL(blobUrl);
        }
        blobUrl = null;
      }
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
      aria-label="Baixar laudo DEXA"
      data-testid="dexa-pdf-download"
    >
      {isLoading ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
      ) : (
        <Download className="mr-2 h-4 w-4" aria-hidden />
      )}
      {isLoading ? "Preparando download…" : "Baixar laudo DEXA"}
    </Button>
  );
}
