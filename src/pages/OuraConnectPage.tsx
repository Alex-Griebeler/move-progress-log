import { useEffect, useState } from "react";
import { PublicPageShell } from "@/components/PublicPageShell";
import { LoadingState } from "@/components/LoadingState";
import { useParams } from "react-router-dom";
import { Loader2, Shield, Activity, Moon, Heart, Thermometer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { buildErrorDescription } from "@/utils/errorParsing";

interface InviteData {
  valid: boolean;
  already_connected?: boolean;
  trainer_name: string;
  student_name: string;
  student_id: string;
  invite_id: string;
  oura_client_id?: string;
  error?: string;
}

export default function OuraConnectPage() {
  const { token } = useParams();
  const [isLoading, setIsLoading] = useState(true);
  const [inviteData, setInviteData] = useState<InviteData | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;

    const validate = async () => {
      try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
        if (!supabaseUrl || !supabaseKey) {
          throw new Error("Configuração do Supabase ausente no cliente");
        }

        const response = await fetch(
          `${supabaseUrl}/functions/v1/validate-student-invite?token=${token}&type=oura_connect`,
          { headers: { apikey: supabaseKey } }
        );

        const result = await response.json();
        if (result.already_connected) {
          setInviteData(result);
        } else if (!response.ok) {
          throw new Error(result?.error || "Falha ao validar convite do Oura");
        } else if (!result.valid) {
          setError(result.error || "Link inválido ou expirado");
        } else {
          setInviteData(result);
        }
      } catch (error: unknown) {
        setError(buildErrorDescription(error) || "Erro ao validar link");
      } finally {
        setIsLoading(false);
      }
    };

    validate();
  }, [token]);

  const handleConnect = async () => {
    if (!inviteData || !token) return;

    setIsConnecting(true);
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const ouraClientId = inviteData.oura_client_id;

      if (!ouraClientId) {
        toast.error("Oura Ring não configurado no sistema");
        setIsConnecting(false);
        return;
      }

      const redirectUri = `${supabaseUrl}/functions/v1/oura-callback`;
      const encodedOrigin = (() => {
        try {
          return btoa(window.location.origin)
            .replace(/\+/g, "-")
            .replace(/\//g, "_")
            .replace(/=+$/g, "");
        } catch (_error) {
          return "";
        }
      })();
      const state = encodedOrigin
        ? `${inviteData.student_id}:${inviteData.invite_id}:${encodedOrigin}`
        : `${inviteData.student_id}:${inviteData.invite_id}`;
      const scope = 'email personal daily heartrate workout session spo2 tag sleep stress ring_configuration';

      const ouraAuthUrl = `https://cloud.ouraring.com/oauth/authorize?response_type=code&client_id=${ouraClientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}&state=${encodeURIComponent(state)}`;

      window.location.href = ouraAuthUrl;
    } catch (error: unknown) {
      toast.error("Erro ao iniciar conexão", {
        description: buildErrorDescription(error) || "Tente novamente em instantes.",
      });
      setIsConnecting(false);
    }
  };

  if (isLoading) {
    return (
      <PublicPageShell centered>
        <LoadingState text="Validando o link" />
      </PublicPageShell>
    );
  }

  if (error || !inviteData) {
    return (
      <PublicPageShell centered>
        <Card>
          <CardHeader>
            <CardTitle className="text-h2">Link inválido</CardTitle>
            <CardDescription>
              {error || "Este link é inválido, expirou ou já foi usado."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-body-sm text-muted-foreground">
              Peça um novo link à equipe da Fabrik.
            </p>
          </CardContent>
        </Card>
      </PublicPageShell>
    );
  }

  if (inviteData.already_connected) {
    return (
      <PublicPageShell centered>
        <Card>
          <CardHeader className="text-center space-y-sm">
            <div className="mx-auto rounded-xl bg-success/10 p-md" aria-hidden="true">
              <Activity className="h-6 w-6 text-success" />
            </div>
            <CardTitle className="text-h2">Oura Ring já conectado</CardTitle>
            <CardDescription>
              A autorização foi recebida. A equipe da Fabrik já acompanha os dados do Oura Ring.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-caption text-center text-muted-foreground">Você pode fechar esta aba.</p>
          </CardContent>
        </Card>
      </PublicPageShell>
    );
  }

  return (
    <PublicPageShell>
      <Card>
        <CardHeader className="text-center space-y-sm">
          <div className="mx-auto rounded-xl bg-primary/10 p-md" aria-hidden="true">
            <Activity className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-h2">Conectar Oura Ring</CardTitle>
          <CardDescription className="text-body-sm">
            {inviteData.trainer_name}, da Fabrik, pediu acesso aos dados do seu Oura Ring para ajustar os treinos.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-muted/50 p-4 rounded-lg space-y-3">
            <p className="font-medium text-sm">Dados compartilhados</p>
            <ul className="grid grid-cols-1 gap-2">
              <li className="flex items-center gap-2 text-sm text-muted-foreground">
                <Moon className="h-4 w-4 text-primary" aria-hidden="true" />
                <span>Sono (duração, fases, eficiência)</span>
              </li>
              <li className="flex items-center gap-2 text-sm text-muted-foreground">
                <Heart className="h-4 w-4 text-primary" aria-hidden="true" />
                <span>Prontidão (recuperação, VFC, FC em repouso)</span>
              </li>
              <li className="flex items-center gap-2 text-sm text-muted-foreground">
                <Activity className="h-4 w-4 text-primary" aria-hidden="true" />
                <span>Atividade (passos, calorias, treinos)</span>
              </li>
              <li className="flex items-center gap-2 text-sm text-muted-foreground">
                <Thermometer className="h-4 w-4 text-primary" aria-hidden="true" />
                <span>SpO₂, VO₂ máx. e temperatura corporal</span>
              </li>
            </ul>
          </div>

          <div className="flex items-start gap-2 text-caption text-muted-foreground border-t pt-4">
            <Shield className="h-4 w-4 mt-0.5 flex-shrink-0 text-primary" aria-hidden="true" />
            <p>
              Os dados são usados exclusivamente por {inviteData.trainer_name}, da Fabrik, para ajustar os treinos, e não são compartilhados com terceiros.
            </p>
          </div>

          <Button
            size="lg"
            className="w-full"
            onClick={handleConnect}
            disabled={isConnecting}
          >
            {isConnecting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden="true" />
                Abrindo o Oura
              </>
            ) : (
              <>
                <Activity className="h-4 w-4 mr-2" aria-hidden="true" />
                Conectar Oura Ring
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </PublicPageShell>
  );
}
