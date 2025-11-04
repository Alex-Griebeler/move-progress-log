import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { QrCode, Shield, Copy, Check } from "lucide-react";
import { logger } from "@/utils/logger";

interface Enable2FADialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const Enable2FADialog = ({ open, onOpenChange }: Enable2FADialogProps) => {
  const [step, setStep] = useState<'generate' | 'verify'>('generate');
  const [qrCode, setQrCode] = useState<string>('');
  const [secret, setSecret] = useState<string>('');
  const [verificationCode, setVerificationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleGenerate2FA = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'Fabrik Performance App',
      });

      if (error) throw error;

      if (data) {
        setQrCode(data.totp.qr_code);
        setSecret(data.totp.secret);
        setStep('verify');
      }
    } catch (error: any) {
      logger.error('Error generating 2FA:', error);
      toast.error('Erro ao gerar 2FA', {
        description: error.message || 'Tente novamente mais tarde',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerify2FA = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      toast.error('Código inválido', {
        description: 'Digite o código de 6 dígitos do app autenticador',
      });
      return;
    }

    setLoading(true);
    try {
      const factors = await supabase.auth.mfa.listFactors();
      if (factors.error) throw factors.error;

      const factor = factors.data?.totp?.[0];
      if (!factor) throw new Error('Fator 2FA não encontrado');

      const { data, error } = await supabase.auth.mfa.challengeAndVerify({
        factorId: factor.id,
        code: verificationCode,
      });

      if (error) throw error;

      toast.success('2FA ativado com sucesso!', {
        description: 'Sua conta agora está mais segura',
      });
      
      onOpenChange(false);
      // Reset state
      setStep('generate');
      setQrCode('');
      setSecret('');
      setVerificationCode('');
    } catch (error: any) {
      logger.error('Error verifying 2FA:', error);
      toast.error('Erro ao verificar código', {
        description: error.message || 'Código incorreto. Tente novamente.',
      });
    } finally {
      setLoading(false);
    }
  };

  const copySecret = () => {
    navigator.clipboard.writeText(secret);
    setCopied(true);
    toast.success('Código copiado!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Ativar Autenticação em Duas Etapas (2FA)
          </DialogTitle>
          <DialogDescription>
            Adicione uma camada extra de segurança à sua conta
          </DialogDescription>
        </DialogHeader>

        {step === 'generate' && (
          <div className="space-y-4">
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription className="text-sm">
                <strong>O que é 2FA?</strong>
                <br />
                Além da senha, você precisará de um código temporário gerado no seu celular para fazer login.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <h4 className="font-medium">Você precisará de:</h4>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li>Google Authenticator, Microsoft Authenticator ou similar</li>
                <li>Câmera para escanear o QR Code (ou copiar código manualmente)</li>
              </ul>
            </div>

            <DialogFooter>
              <Button onClick={handleGenerate2FA} disabled={loading} className="w-full">
                <QrCode className="h-4 w-4 mr-2" />
                {loading ? 'Gerando...' : 'Gerar QR Code'}
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === 'verify' && (
          <div className="space-y-4">
            <div className="space-y-3">
              <div className="flex justify-center p-4 bg-white rounded-lg border">
                <img 
                  src={qrCode} 
                  alt="QR Code 2FA" 
                  className="w-48 h-48"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Ou copie o código manualmente:</Label>
                <div className="flex gap-2">
                  <Input 
                    value={secret} 
                    readOnly 
                    className="font-mono text-sm"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={copySecret}
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>

            <Alert>
              <AlertDescription className="text-xs">
                <strong>Instruções:</strong>
                <ol className="list-decimal list-inside mt-2 space-y-1">
                  <li>Abra o app autenticador no seu celular</li>
                  <li>Escaneie o QR Code ou adicione o código manualmente</li>
                  <li>Digite o código de 6 dígitos abaixo para confirmar</li>
                </ol>
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label htmlFor="verification-code">Código de Verificação</Label>
              <Input
                id="verification-code"
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="000000"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                className="text-center text-2xl tracking-widest font-mono"
              />
            </div>

            <DialogFooter className="flex-col gap-2">
              <Button 
                onClick={handleVerify2FA} 
                disabled={loading || verificationCode.length !== 6}
                className="w-full"
              >
                {loading ? 'Verificando...' : 'Verificar e Ativar'}
              </Button>
              <Button 
                variant="ghost" 
                onClick={() => {
                  setStep('generate');
                  setQrCode('');
                  setSecret('');
                  setVerificationCode('');
                }}
                className="w-full"
              >
                Voltar
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
