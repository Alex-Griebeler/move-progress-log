/**
 * Toasters globais (sonner + shadcn) remontados a cada época de identidade
 * (A-001). Um toast é estado global fora da casca privada: fechar por API não
 * basta — o sonner insere um toast recém-publicado num setTimeout e uma
 * continuação antiga pode publicar entre o evento de auth e o commit. Com a
 * instância trocada pela época, tudo que foi publicado na época anterior
 * (visível ou ainda na fila) cai com a instância antiga e nunca aparece na
 * nova; o que a identidade nova publicar depois de montar aparece normalmente.
 */
import { Fragment } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { useAuth } from "@/hooks/useAuth";

export function AppToasters() {
  const { epoch } = useAuth();
  return (
    <Fragment key={epoch}>
      <Toaster />
      <Sonner />
    </Fragment>
  );
}
