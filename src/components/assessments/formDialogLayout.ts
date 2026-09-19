/**
 * Rodapé fixo dos formulários longos de avaliação (revisão do Codex na #368,
 * UX-02): o DialogContent é o contêiner de rolagem (p-6); o rodapé gruda na
 * borda inferior visível, então "Salvar" nunca fica fora da vista no celular.
 * `-bottom-6` compensa o padding do contêiner (o sticky respeita a área de
 * conteúdo); `-mx-6 px-6` estende o fundo até as bordas.
 */
export const STICKY_FORM_FOOTER =
  "sticky -bottom-6 z-10 -mx-6 -mb-6 gap-2 border-t border-border bg-background px-6 py-3";
