import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Shield, AlertCircle } from "lucide-react";
import { logger } from "@/utils/logger";
import { useNavigate } from "react-router-dom";
import { POST_LOGIN_ROUTE } from "@/constants/navigation";

interface Verify2FADialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  factorId: string;
}

export const Verify2FADialog = ({ open, onOpenChange, factorId }: Verify2FADialogProps) => {
  const [verificationCode, setVerificationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleVerify = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      toast.error('Código inválido', {
        description: 'Digite o código de 6 dígitos do app autenticador',
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: '', // Will be auto-fetched by Supabase
        code: verificationCode,
      });

      if (error) throw error;

      toast.success('Login realizado com sucesso!');
      onOpenChange(false);
      navigate(POST_LOGIN_ROUTE);
    } catch (error: unknown) {
      logger.error('Error verifying 2FA code:', error);
      toast.error('Código incorreto', {
        description: 'Verifique o código no app autenticador e tente novamente',
      });
      setVerificationCode('');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && verificationCode.length === 6) {
      handleVerify();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Verificação em Duas Etapas
          </DialogTitle>
          <DialogDescription>
            Digite o código de 6 dígitos do seu app autenticador
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              Abra o Google Authenticator, Microsoft Authenticator ou outro app de autenticação 
              e digite o código de 6 dígitos mostrado para <strong>Fabrik Performance</strong>.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="2fa-code">Código de Verificação</Label>
            <Input
              id="2fa-code"
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="000000"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
              onKeyPress={handleKeyPress}
              autoFocus
              className="text-center text-2xl tracking-widest font-mono"
            />
          </div>

          <Button 
            onClick={handleVerify} 
            disabled={loading || verificationCode.length !== 6}
            className="w-full"
          >
            {loading ? 'Verificando...' : 'Verificar'}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            Não consegue acessar o app? Entre em contato com o suporte.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
