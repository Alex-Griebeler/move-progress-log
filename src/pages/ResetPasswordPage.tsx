import { useState, useEffect } from "react";
import { PublicPageShell } from "@/components/PublicPageShell";
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
        title: "Email enviado",
        description: "Abra o link recebido para criar uma nova senha.",
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
        title: "Senha atualizada",
        description: "Entre com a nova senha.",
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
          description: "Este link expirou. Peça um novo link de recuperação.",
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
    <PublicPageShell centered>
      <Card>
        <CardHeader>
          <div className="mb-2">
            <Button
              variant="ghost"
              onClick={() => navigate(ROUTES.auth)}
              className="-ml-3 px-3"
            >
              <ArrowLeft className="h-4 w-4 mr-1" aria-hidden="true" />
              Voltar para o login
            </Button>
          </div>
          <CardTitle className="text-h2">
            {isUpdatePasswordStep ? "Nova senha" : "Recuperar senha"}
          </CardTitle>
          <CardDescription>
            {isUpdatePasswordStep
              ? "Crie uma senha forte para a sua conta."
              : "Enviamos um link de recuperação para o seu email."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!isUpdatePasswordStep ? (
            // ETAPA 1: Solicitar reset
            emailSent ? (
              <div className="space-y-4">
                <Alert variant="success" role="status">
                  <Check className="h-4 w-4" aria-hidden="true" />
                  <AlertDescription>
                    <strong>Email enviado</strong>
                    <p className="mt-2 text-sm">
                      Abra o link recebido para criar uma nova senha.
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
                  <Alert variant="warning">
                    <Shield className="h-4 w-4" aria-hidden="true" />
                    <AlertDescription className="text-sm">
                      {rateLimitWarning}
                    </AlertDescription>
                  </Alert>
                )}
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="nome@email.com"
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
                <Label htmlFor="password">Nova senha (mínimo 12 caracteres)</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  placeholder="Crie uma senha forte"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={12}
                  className={
                    passwordSecurity
                      ? passwordSecurity.isSecure
                        ? "border-success focus-visible:ring-success"
                        : "border-destructive focus-visible:ring-destructive"
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
                          variant={passwordSecurity.isSecure ? "success" : "destructive"}
                        >
                          {passwordSecurity.isSecure ? (
                            <Check className="h-4 w-4" aria-hidden="true" />
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
                              <Check className="h-3 w-3 text-success" />
                            ) : (
                              <X className="h-3 w-3 text-destructive" />
                            )}
                            <span>Mínimo 12 caracteres</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {passwordSecurity.checks.uppercase ? (
                              <Check className="h-3 w-3 text-success" />
                            ) : (
                              <X className="h-3 w-3 text-destructive" />
                            )}
                            <span>Letra maiúscula (A-Z)</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {passwordSecurity.checks.lowercase ? (
                              <Check className="h-3 w-3 text-success" />
                            ) : (
                              <X className="h-3 w-3 text-destructive" />
                            )}
                            <span>Letra minúscula (a-z)</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {passwordSecurity.checks.number ? (
                              <Check className="h-3 w-3 text-success" />
                            ) : (
                              <X className="h-3 w-3 text-destructive" />
                            )}
                            <span>Número (0-9)</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {passwordSecurity.checks.special ? (
                              <Check className="h-3 w-3 text-success" />
                            ) : (
                              <X className="h-3 w-3 text-destructive" />
                            )}
                            <span>Caractere especial (!@#$%...)</span>
                          </div>
                          {passwordSecurity.checks.leaked !== null && (
                            <div className="flex items-center gap-2">
                              {passwordSecurity.checks.leaked ? (
                                <Check className="h-3 w-3 text-success" />
                              ) : (
                                <X className="h-3 w-3 text-destructive" />
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
                <Label htmlFor="confirm-password">Confirmar nova senha</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  placeholder="Digite a senha novamente"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={12}
                  className={
                    confirmPassword && password !== confirmPassword
                      ? "border-destructive focus-visible:ring-destructive"
                      : confirmPassword && password === confirmPassword
                      ? "border-success focus-visible:ring-success"
                      : ""
                  }
                />
                {confirmPassword && password !== confirmPassword && (
                  <p className="text-xs text-destructive">As senhas não coincidem</p>
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
    </PublicPageShell>
  );
}
