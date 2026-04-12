import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { usePasswordSecurity } from "@/hooks/usePasswordSecurity";
import { AlertCircle, Check, X, Loader2, ArrowLeft, Shield } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { z } from "zod";
import { checkRateLimit, recordFailedAttempt } from "@/lib/rateLimiter";
import { logger } from "@/utils/logger";
import { buildErrorDescription, parseErrorInfo } from "@/utils/errorParsing";
import { ROUTES } from "@/constants/navigation";

const emailSchema = z.string().email("Email inválido");

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const type = searchParams.get("type");
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [passwordSecurity, setPasswordSecurity] = useState<{ isSecure: boolean; strength: "weak" | "medium" | "strong"; message: string; checks: Record<string, boolean | null> } | null>(null);
  const [rateLimitWarning, setRateLimitWarning] = useState<string | null>(null);
  
  const navigate = useNavigate();
  const { toast } = useToast();
  const { checkPasswordSecurity, checking } = usePasswordSecurity();

  // Validar senha em tempo real (com debounce)
  useEffect(() => {
    if (!password || !token) {
      setPasswordSecurity(null);
      return;
    }

    const timeoutId = setTimeout(async () => {
      const result = await checkPasswordSecurity(password);
      setPasswordSecurity(result);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [password, checkPasswordSecurity, token]);

  // Se tem token na URL, é etapa 2 (atualizar senha)
  const isUpdatePasswordStep = token && type === "recovery";

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setRateLimitWarning(null);

    // Validar email
    const validation = emailSchema.safeParse(email);
    if (!validation.success) {
      toast({
        title: "Email inválido",
        description: "Por favor, insira um email válido.",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    // Check rate limit for reset password
    const rateLimitCheck = await checkRateLimit('reset_password');
    if (!rateLimitCheck.allowed) {
      setLoading(false);
      toast({
        title: "Muitas solicitações",
        description: rateLimitCheck.message || "Tente novamente mais tarde.",
        variant: "destructive",
      });
      return;
    }

    // Show warning if close to limit
    if (rateLimitCheck.message && rateLimitCheck.remainingAttempts && rateLimitCheck.remainingAttempts <= 2) {
      setRateLimitWarning(rateLimitCheck.message);
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}${ROUTES.resetPassword}`,
      });

      if (error) throw error;

      setEmailSent(true);
      setRateLimitWarning(null);
      toast({
        title: "✅ Email enviado!",
        description: "Verifique sua caixa de entrada e clique no link para resetar sua senha.",
      });
    } catch (error: unknown) {
      logger.error("Erro ao solicitar reset:", error);
      await recordFailedAttempt('reset_password');
      toast({
        title: "Erro ao enviar email",
        description: buildErrorDescription(error) || "Tente novamente mais tarde.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (!password || !confirmPassword) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha todos os campos.",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: "Senhas não coincidem",
        description: "As senhas digitadas não são iguais.",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    if (password.length < 12) {
      toast({
        title: "Senha muito curta",
        description: "A senha deve ter pelo menos 12 caracteres.",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    if (passwordSecurity && !passwordSecurity.isSecure) {
      toast({
        title: "Senha não segura",
        description: passwordSecurity.message,
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) throw error;

      toast({
        title: "✅ Senha resetada com sucesso!",
        description: "Você já pode fazer login com sua nova senha.",
      });

      // Redirecionar para login após 2 segundos
      setTimeout(() => {
        navigate(ROUTES.auth);
      }, 2000);
    } catch (error: unknown) {
      logger.error("Error updating password:", error);
      const errMsg = parseErrorInfo(error).message;
      if (errMsg.includes("token")) {
        toast({
          title: "Link expirado",
          description: "Este link de reset expirou. Solicite um novo reset de senha.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Erro ao atualizar senha",
          description: buildErrorDescription(error) || "Tente novamente mais tarde.",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center gap-2 mb-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(ROUTES.auth)}
              className="p-0 h-auto"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Voltar para login
            </Button>
          </div>
          <CardTitle>
            {isUpdatePasswordStep ? "Nova Senha" : "Resetar Senha"}
          </CardTitle>
          <CardDescription>
            {isUpdatePasswordStep
              ? "Crie uma senha forte e segura para sua conta"
              : "Enviaremos um link de recuperação para seu email"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!isUpdatePasswordStep ? (
            // ETAPA 1: Solicitar reset
            emailSent ? (
              <div className="space-y-4">
                <Alert className="border-green-500 bg-green-50 text-green-900">
                  <Check className="h-4 w-4 text-green-600" />
                  <AlertDescription>
                    <strong>Email enviado com sucesso!</strong>
                    <p className="mt-2 text-sm">
                      Verifique sua caixa de entrada e clique no link para resetar sua senha.
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      O link expira em 1 hora.
                    </p>
                  </AlertDescription>
                </Alert>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setEmailSent(false)}
                >
                  Enviar novamente
                </Button>
              </div>
            ) : (
              <form onSubmit={handleRequestReset} className="space-y-4">
                {rateLimitWarning && (
                  <Alert variant="default" className="border-yellow-500 bg-yellow-50">
                    <Shield className="h-4 w-4 text-yellow-600" />
                    <AlertDescription className="text-sm text-yellow-900">
                      {rateLimitWarning}
                    </AlertDescription>
                  </Alert>
                )}
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    "Enviar link de recuperação"
                  )}
                </Button>
              </form>
            )
          ) : (
            // ETAPA 2: Atualizar senha
            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Nova Senha (mínimo 12 caracteres)</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Crie uma senha forte"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={12}
                  className={
                    passwordSecurity
                      ? passwordSecurity.isSecure
                        ? "border-green-500 focus-visible:ring-green-500"
                        : "border-red-500 focus-visible:ring-red-500"
                      : ""
                  }
                />

                {/* Indicador de força em tempo real */}
                {password && (
                  <div className="space-y-2 mt-3">
                    {checking ? (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Verificando segurança...</span>
                      </div>
                    ) : passwordSecurity ? (
                      <>
                        <Alert
                          variant={passwordSecurity.isSecure ? "default" : "destructive"}
                          className={
                            passwordSecurity.isSecure
                              ? "border-green-500 bg-green-50 text-green-900"
                              : ""
                          }
                        >
                          {passwordSecurity.isSecure ? (
                            <Check className="h-4 w-4 text-green-600" />
                          ) : (
                            <AlertCircle className="h-4 w-4" />
                          )}
                          <AlertDescription className="text-sm font-medium">
                            {passwordSecurity.message}
                          </AlertDescription>
                        </Alert>

                        {/* Checklist de requisitos */}
                        <div className="text-xs space-y-1 p-3 bg-muted rounded-md">
                          <p className="font-medium mb-2">Requisitos de segurança:</p>
                          <div className="flex items-center gap-2">
                            {passwordSecurity.checks.length ? (
                              <Check className="h-3 w-3 text-green-600" />
                            ) : (
                              <X className="h-3 w-3 text-red-500" />
                            )}
                            <span>Mínimo 12 caracteres</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {passwordSecurity.checks.uppercase ? (
                              <Check className="h-3 w-3 text-green-600" />
                            ) : (
                              <X className="h-3 w-3 text-red-500" />
                            )}
                            <span>Letra maiúscula (A-Z)</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {passwordSecurity.checks.lowercase ? (
                              <Check className="h-3 w-3 text-green-600" />
                            ) : (
                              <X className="h-3 w-3 text-red-500" />
                            )}
                            <span>Letra minúscula (a-z)</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {passwordSecurity.checks.number ? (
                              <Check className="h-3 w-3 text-green-600" />
                            ) : (
                              <X className="h-3 w-3 text-red-500" />
                            )}
                            <span>Número (0-9)</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {passwordSecurity.checks.special ? (
                              <Check className="h-3 w-3 text-green-600" />
                            ) : (
                              <X className="h-3 w-3 text-red-500" />
                            )}
                            <span>Caractere especial (!@#$%...)</span>
                          </div>
                          {passwordSecurity.checks.leaked !== null && (
                            <div className="flex items-center gap-2">
                              {passwordSecurity.checks.leaked ? (
                                <Check className="h-3 w-3 text-green-600" />
                              ) : (
                                <X className="h-3 w-3 text-red-500" />
                              )}
                              <span>Não está em vazamentos de dados</span>
                            </div>
                          )}
                        </div>
                      </>
                    ) : null}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirmar Nova Senha</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder="Digite a senha novamente"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={12}
                  className={
                    confirmPassword && password !== confirmPassword
                      ? "border-red-500 focus-visible:ring-red-500"
                      : confirmPassword && password === confirmPassword
                      ? "border-green-500 focus-visible:ring-green-500"
                      : ""
                  }
                />
                {confirmPassword && password !== confirmPassword && (
                  <p className="text-xs text-red-500">As senhas não coincidem</p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={
                  loading ||
                  checking ||
                  !passwordSecurity ||
                  !passwordSecurity.isSecure ||
                  password !== confirmPassword
                }
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Atualizando senha...
                  </>
                ) : checking ? (
                  "Verificando senha..."
                ) : !passwordSecurity?.isSecure ? (
                  "Senha não segura"
                ) : password !== confirmPassword ? (
                  "Senhas não coincidem"
                ) : (
                  "Resetar senha"
                )}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
