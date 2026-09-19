import { useEffect, useState } from "react";
import { PublicPageShell } from "@/components/PublicPageShell";
import { LoadingState } from "@/components/LoadingState";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, ShieldCheck, AlertCircle } from "lucide-react";

// Local typing for the beta supabase.auth.oauth namespace.
type OAuthDetails = {
  client?: { name?: string; client_name?: string; redirect_uris?: string[] };
  redirect_url?: string;
  redirect_to?: string;
  scope?: string;
};
interface OAuthApi {
  getAuthorizationDetails(id: string): Promise<{ data: OAuthDetails | null; error: { message: string } | null }>;
  approveAuthorization(id: string): Promise<{ data: OAuthDetails | null; error: { message: string } | null }>;
  denyAuthorization(id: string): Promise<{ data: OAuthDetails | null; error: { message: string } | null }>;
}

function getOAuth(): OAuthApi {
  return (supabase.auth as unknown as { oauth: OAuthApi }).oauth;
}

export default function OAuthConsentPage() {
  const [params] = useSearchParams();
  const authorizationId = params.get("authorization_id") ?? "";
  const [details, setDetails] = useState<OAuthDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!authorizationId) {
        setError("Requisição de autorização inválida (authorization_id ausente).");
        return;
      }
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        const next = window.location.pathname + window.location.search;
        window.location.href = "/auth?next=" + encodeURIComponent(next);
        return;
      }
      try {
        const { data, error } = await getOAuth().getAuthorizationDetails(authorizationId);
        if (!active) return;
        if (error) { setError(error.message); return; }
        const immediate = data?.redirect_url ?? data?.redirect_to;
        if (immediate && !data?.client) { window.location.href = immediate; return; }
        setDetails(data);
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : "Falha ao carregar autorização");
      }
    })();
    return () => { active = false; };
  }, [authorizationId]);

  async function decide(approve: boolean) {
    setBusy(true);
    setError(null);
    try {
      const api = getOAuth();
      const { data, error } = approve
        ? await api.approveAuthorization(authorizationId)
        : await api.denyAuthorization(authorizationId);
      if (error) { setError(error.message); setBusy(false); return; }
      const target = data?.redirect_url ?? data?.redirect_to;
      if (!target) { setError("O servidor de autorização não retornou URL de redirecionamento."); setBusy(false); return; }
      window.location.href = target;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao processar a decisão");
      setBusy(false);
    }
  }

  if (error) {
    return (
      <PublicPageShell centered>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-h2"><AlertCircle className="h-5 w-5" aria-hidden="true" /> Erro de autorização</CardTitle>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>
          </CardContent>
        </Card>
      </PublicPageShell>
    );
  }

  if (!details) {
    return (
      <PublicPageShell centered>
        <LoadingState text="Carregando autorização" />
      </PublicPageShell>
    );
  }

  const clientName = details.client?.name ?? details.client?.client_name ?? "Aplicativo externo";

  return (
    <PublicPageShell centered>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-h2">
            <ShieldCheck className="h-5 w-5 text-primary" aria-hidden="true" />
            Conectar {clientName}
          </CardTitle>
          <CardDescription>
            Você está autorizando <strong>{clientName}</strong> a acessar a Fabrik Performance <strong>como você</strong>.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground space-y-2">
            <p>Este aplicativo poderá usar as ferramentas habilitadas do MCP enquanto você estiver conectado.</p>
            <p>As permissões existentes da sua conta continuam valendo — nada é exposto além do que você já enxerga.</p>
            {details.client?.redirect_uris?.[0] && (
              <p className="text-xs">Redirecionamento: <code className="text-xs">{details.client.redirect_uris[0]}</code></p>
            )}
          </div>
          <div className="flex gap-2 pt-2">
            <Button onClick={() => decide(true)} disabled={busy} className="flex-1">
              {busy ? <><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /><span className="sr-only">Enviando</span></> : "Aprovar"}
            </Button>
            <Button onClick={() => decide(false)} disabled={busy} variant="outline" className="flex-1">
              Cancelar
            </Button>
          </div>
        </CardContent>
      </Card>
    </PublicPageShell>
  );
}
