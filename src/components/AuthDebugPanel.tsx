import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import { getClientIP } from "@/lib/rateLimiter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronUp, Copy, RefreshCw, Trash2, LogOut } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export const AuthDebugPanel = () => {
  // Only show in development
  if (import.meta.env.PROD) return null;

  const [isExpanded, setIsExpanded] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [clientIP, setClientIP] = useState<string>("Loading...");
  const [timeUntilExpiry, setTimeUntilExpiry] = useState<number>(0);
  const [timeUntilRefresh, setTimeUntilRefresh] = useState<number>(0);
  const { toast } = useToast();

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    // Get client IP
    getClientIP().then(setClientIP);

    return () => subscription.unsubscribe();
  }, []);

  // Calculate time until expiry and refresh
  useEffect(() => {
    if (!session) return;

    const interval = setInterval(() => {
      const expiresAt = session.expires_at ? session.expires_at * 1000 : 0;
      const now = Date.now();
      const timeLeft = Math.max(0, Math.floor((expiresAt - now) / 1000 / 60));
      setTimeUntilExpiry(timeLeft);

      // Refresh happens at 50 minutes (10 minutes before expiry)
      const refreshTime = expiresAt - 10 * 60 * 1000;
      const timeToRefresh = Math.max(0, Math.floor((refreshTime - now) / 1000 / 60));
      setTimeUntilRefresh(timeToRefresh);
    }, 1000);

    return () => clearInterval(interval);
  }, [session]);

  const handleForceRefresh = async () => {
    try {
      const { data, error } = await supabase.auth.refreshSession();
      if (error) throw error;
      
      setSession(data.session);
      toast({
        title: "✅ Token renovado",
        description: "Session atualizada com sucesso",
      });
    } catch (err) {
      toast({
        title: "❌ Erro ao renovar token",
        description: err instanceof Error ? err.message : "Erro desconhecido",
        variant: "destructive",
      });
    }
  };

  const handleSimulateExpiry = async () => {
    toast({
      title: "⏱️ Simulando expiração",
      description: "Token será renovado automaticamente em breve",
    });
    
    // Force a refresh by setting expiry to now
    setTimeout(() => {
      handleForceRefresh();
    }, 2000);
  };

  const handleClearRateLimit = async () => {
    try {
      // This would require a new edge function to clear rate limits
      toast({
        title: "🔧 Funcionalidade futura",
        description: "Endpoint de reset ainda não implementado",
      });
    } catch (err) {
      toast({
        title: "❌ Erro",
        description: "Não foi possível limpar rate limiting",
        variant: "destructive",
      });
    }
  };

  const handleCopySession = () => {
    if (!session) return;
    
    const sessionData = {
      user_id: session.user.id,
      email: session.user.email,
      expires_at: new Date(session.expires_at! * 1000).toISOString(),
      access_token: session.access_token.slice(-20),
    };
    
    navigator.clipboard.writeText(JSON.stringify(sessionData, null, 2));
    toast({
      title: "📋 Copiado",
      description: "Dados da session copiados para clipboard",
    });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({
      title: "👋 Logout",
      description: "Session encerrada",
    });
  };

  if (!isExpanded) {
    return (
      <Button
        onClick={() => setIsExpanded(true)}
        className="fixed bottom-lg right-lg z-50 shadow-premium"
        size="sm"
        variant="secondary"
      >
        <ChevronUp className="h-4 w-4 mr-2" />
        Auth Debug
      </Button>
    );
  }

  return (
    <Card className="fixed bottom-lg right-lg z-50 w-80 p-lg shadow-premium bg-background/95 backdrop-blur-sm border-primary/20">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold">🔧 Auth Debug Panel</h3>
        <Button
          onClick={() => setIsExpanded(false)}
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0"
        >
          <ChevronDown className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-3 text-xs">
        {/* Session Info */}
        <div className="space-y-1">
          <div className="font-semibold text-primary">Session:</div>
          {session ? (
            <>
              <div className="flex justify-between">
                <span className="text-muted-foreground">User ID:</span>
                <span className="font-mono text-[10px]">{session.user.id.slice(0, 8)}...</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Email:</span>
                <span className="font-mono text-[10px]">{session.user.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Token:</span>
                <span className="font-mono text-[10px]">...{session.access_token.slice(-20)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Expira em:</span>
                <Badge variant={timeUntilExpiry < 5 ? "destructive" : "secondary"}>
                  {timeUntilExpiry} min
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Refresh em:</span>
                <Badge variant="outline">{timeUntilRefresh} min</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status:</span>
                <Badge variant={timeUntilExpiry > 0 ? "default" : "destructive"}>
                  {timeUntilExpiry > 0 ? "✅ Ativo" : "❌ Expirado"}
                </Badge>
              </div>
            </>
          ) : (
            <div className="text-muted-foreground">❌ Não autenticado</div>
          )}
        </div>

        {/* Rate Limiting Info */}
        <div className="space-y-1 pt-2 border-t">
          <div className="font-semibold text-primary">Rate Limiting:</div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">IP atual:</span>
            <span className="font-mono text-[10px]">{clientIP}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Status:</span>
            <Badge variant="outline">✅ Permitido</Badge>
          </div>
        </div>

        {/* Debug Actions */}
        <div className="space-y-2 pt-2 border-t">
          <div className="font-semibold text-primary mb-2">Debug:</div>
          
          <Button
            onClick={handleSimulateExpiry}
            variant="outline"
            size="sm"
            className="w-full justify-start text-xs h-8"
            disabled={!session}
          >
            <RefreshCw className="h-3 w-3 mr-2" />
            Simular expiração
          </Button>

          <Button
            onClick={handleForceRefresh}
            variant="outline"
            size="sm"
            className="w-full justify-start text-xs h-8"
            disabled={!session}
          >
            <RefreshCw className="h-3 w-3 mr-2" />
            Forçar refresh agora
          </Button>

          <Button
            onClick={handleClearRateLimit}
            variant="outline"
            size="sm"
            className="w-full justify-start text-xs h-8"
          >
            <Trash2 className="h-3 w-3 mr-2" />
            Limpar rate limiting
          </Button>

          <Button
            onClick={handleCopySession}
            variant="outline"
            size="sm"
            className="w-full justify-start text-xs h-8"
            disabled={!session}
          >
            <Copy className="h-3 w-3 mr-2" />
            Copiar session JSON
          </Button>

          <Button
            onClick={handleLogout}
            variant="destructive"
            size="sm"
            className="w-full justify-start text-xs h-8"
            disabled={!session}
          >
            <LogOut className="h-3 w-3 mr-2" />
            Logout
          </Button>
        </div>

        <div className="pt-2 border-t text-[10px] text-muted-foreground text-center">
          Apenas em development
        </div>
      </div>
    </Card>
  );
};
