/**
 * SkipToContent - Componente de Acessibilidade
 * 
 * Permite que usuários de teclado/leitores de tela pulem diretamente
 * para o conteúdo principal, evitando navegação repetitiva.
 * 
 * Uso: Adicionar no topo do layout principal (App.tsx ou layout raiz)
 */

export const SkipToContent = () => {
  return (
    <a 
      href="#main-content" 
      className="skip-to-content"
      aria-label="Pular para o conteúdo principal"
    >
      Pular para o conteúdo principal
    </a>
  );
};
