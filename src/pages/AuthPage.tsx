import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePasswordSecurity, type PasswordSecurityResult } from "@/hooks/usePasswordSecurity";
import { AlertCircle, Check, X, Loader2, Shield, Eye, EyeOff } from "lucide-react";
import { PublicPageShell } from "@/components/PublicPageShell";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { checkRateLimit, recordFailedAttempt, type RateLimitAction } from "@/lib/rateLimiter";
import { logger } from "@/utils/logger";
import { Enable2FADialog } from "@/components/Enable2FADialog";
import { Verify2FADialog } from "@/components/Verify2FADialog";
import { NAV_LABELS, ROUTES, POST_LOGIN_ROUTE } from "@/constants/navigation";
import i18n from "@/i18n/pt-BR.json";
import { buildErrorDescription, parseErrorInfo } from "@/utils/errorParsing";

/** Campo de senha com "mostrar/ocultar" (alvo de 40px) e autocomplete correto. */
function PasswordField(props: React.ComponentProps<typeof Input>) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <Input {...props} type={visible ? "text" : "password"} className={`pr-11 ${props.className ?? ""}`} />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Ocultar senha" : "Mostrar senha"}
        aria-pressed={visible}
        className="absolute right-0 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:text-foreground"
      >
        {visible ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
      </button>
    </div>
  );
}

export default function AuthPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [passwordSecurity, setPasswordSecurity] = useState<PasswordSecurityResult | null>(null);
  const [rateLimitWarning, setRateLimitWarning] = useState<string | null>(null);
  const [show2FASetup, setShow2FASetup] = useState(false);
  const [show2FAVerify, setShow2FAVerify] = useState(false);
  const [mfaFactorId, setMfaFactorId] = useState<string>('');
  // Erro de login também inline, ligado aos campos (não só toast no canto).
  const [signInError, setSignInError] = useState<string | null>(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const nextParam = searchParams.get("next");
  // Only accept same-origin relative paths (must start with "/" and not "//")
  const safeNext = nextParam && nextParam.startsWith("/") && !nextParam.startsWith("//")
    ? nextParam
    : null;
  const postLoginTarget = safeNext ?? POST_LOGIN_ROUTE;
  const { toast } = useToast();
  const { checkPasswordSecurity, checking } = usePasswordSecurity();

  // Validar senha em tempo real (com debounce)
  useEffect(() => {
    if (!password) {
      setPasswordSecurity(null);
      return;
    }

    const timeoutId = setTimeout(async () => {
      const result = await checkPasswordSecurity(password);
      setPasswordSecurity(result);
    }, 500); // 500ms debounce

    return () => clearTimeout(timeoutId);
  }, [password, checkPasswordSecurity]);

  const getErrorMessage = (error: unknown): string => {
    const baseMessage = parseErrorInfo(error).message;
    const message = baseMessage.toLowerCase();

    if (message.includes('email') && message.includes('already')) {
      return i18n.errors.emailAlreadyRegistered;
    }
    if (message.includes('invalid email')) {
      return i18n.errors.invalidEmailFormat;
    }
    if (message.includes('password') && message.includes('short')) {
      return i18n.errors.passwordTooShort;
    }
    if (message.includes('invalid login credentials')) {
      return i18n.errors.invalidCredentials;
    }
    if (message.includes('email not confirmed')) {
      return i18n.errors.emailNotConfirmed;
    }
    if (message.includes('too many requests')) {
      return i18n.errors.tooManyRequests;
    }

    return buildErrorDescription(error) || baseMessage;
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setRateLimitWarning(null);

    // Check rate limit for login
    const rateLimitCheck = await checkRateLimit('login');
    if (!rateLimitCheck.allowed) {
      setLoading(false);
      toast({
        title: "Muitas tentativas",
        description: rateLimitCheck.message || "Tente novamente mais tarde.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}${postLoginTarget}`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          }
        },
      });

      if (error) {
        logger.error('Google OAuth error:', error);
        await recordFailedAttempt('login');

        // Mensagem específica para erro 403
        if (error.message.includes('403') || error.message.includes('access_denied')) {
          toast({
            title: "Acesso Negado pelo Google",
            description: "Entre em contato com o administrador do sistema.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Erro ao conectar com Google",
            description: getErrorMessage(error),
            variant: "destructive",
          });
        }
        setLoading(false);
        return;
      }

      logger.log('Redirecting to Google OAuth...');

    } catch (err: unknown) {
      logger.error('Unexpected Google OAuth error:', err);
      setLoading(false);
      toast({
        title: "Erro inesperado",
        description: "Tente novamente mais tarde.",
        variant: "destructive",
      });
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setRateLimitWarning(null);

    if (!email || !password || !fullName) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha todos os campos para continuar.",
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

    if (!acceptTerms) {
      toast({
        title: "Termos não aceitos",
        description: "Você precisa aceitar os termos de uso para continuar.",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    // Check rate limit for signup
    const rateLimitCheck = await checkRateLimit('signup');
    if (!rateLimitCheck.allowed) {
      setLoading(false);
      toast({
        title: "Muitas tentativas de cadastro",
        description: rateLimitCheck.message || "Tente novamente mais tarde.",
        variant: "destructive",
      });
      return;
    }

    // Validação de segurança da senha
    if (passwordSecurity && !passwordSecurity.isSecure) {
      toast({
        title: "Senha não segura",
        description: passwordSecurity.message,
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

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
        emailRedirectTo: `${window.location.origin}/`,
      },
    });

    setLoading(false);

    if (error) {
      await recordFailedAttempt('signup');
      toast({
        title: "Erro no cadastro",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    } else {
      toast({
        title: "Cadastro realizado",
        description: "Você já pode fazer login e começar a usar o sistema.",
      });
      setEmail("");
      setPassword("");
      setConfirmPassword("");
      setFullName("");
      setAcceptTerms(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setRateLimitWarning(null);

    if (!email || !password) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha email e senha para continuar.",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    // Check rate limit for login
    const rateLimitCheck = await checkRateLimit('login');
    if (!rateLimitCheck.allowed) {
      setLoading(false);
      toast({
        title: "Muitas tentativas de login",
        description: rateLimitCheck.message || "Tente novamente mais tarde.",
        variant: "destructive",
      });
      return;
    }

    // Show warning if close to limit
    if (rateLimitCheck.message && rateLimitCheck.remainingAttempts && rateLimitCheck.remainingAttempts <= 2) {
      setRateLimitWarning(rateLimitCheck.message);
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      await recordFailedAttempt('login');
      setSignInError(getErrorMessage(error));
      return;
    }
    setSignInError(null);

    // Verificar se o usuário tem 2FA ativado
    const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors();
    if (factorsError) {
      console.error("Erro ao listar fatores MFA:", factorsError);
      await supabase.auth.signOut();
      toast({
        title: "Erro na validação de segurança",
        description: "Não foi possível validar o 2FA neste momento. Tente novamente.",
        variant: "destructive",
      });
      return;
    }
    if (factors?.totp && factors.totp.length > 0) {
      // Usuário tem 2FA, mostrar dialog de verificação
      setMfaFactorId(factors.totp[0].id);
      setShow2FAVerify(true);
    } else {
      // Login sem 2FA
      setRateLimitWarning(null);
      navigate(postLoginTarget);
    }
  };

  return (
    <PublicPageShell centered>
      <Card>
        <CardHeader>
          <CardTitle className="text-h2">Entrar</CardTitle>
          <CardDescription>
            Acesso da equipe da Fabrik.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="signin">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">{NAV_LABELS.signIn}</TabsTrigger>
              <TabsTrigger value="signup">{NAV_LABELS.signUp}</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4">
                {rateLimitWarning && (
                  <Alert variant="warning">
                    <Shield className="h-4 w-4" />
                    <AlertDescription className="text-sm">
                      {rateLimitWarning}
                    </AlertDescription>
                  </Alert>
                )}
                <div className="space-y-2">
                  <Label htmlFor="signin-email">Email</Label>
                  <Input
                    id="signin-email"
                    type="email"
                    autoComplete="email"
                    inputMode="email"
                    placeholder="nome@email.com"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setSignInError(null); }}
                    aria-invalid={signInError ? true : undefined}
                    aria-describedby={signInError ? "signin-error" : undefined}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signin-password">Senha</Label>
                  <PasswordField
                    id="signin-password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setSignInError(null); }}
                    aria-invalid={signInError ? true : undefined}
                    aria-describedby={signInError ? "signin-error" : undefined}
                    required
                  />
                </div>
                {signInError && (
                  <p id="signin-error" role="alert" className="flex items-start gap-2 text-sm text-destructive">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                    {signInError}
                  </p>
                )}
                <div className="flex items-center justify-end">
                  <Link to={ROUTES.resetPassword} className="inline-flex min-h-10 items-center text-sm text-primary hover:underline">
                    {NAV_LABELS.forgotPassword}
                  </Link>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Entrando…" : NAV_LABELS.signIn}
                </Button>
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">
                      Ou continue com
                    </span>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  disabled={loading}
                  onClick={handleGoogleSignIn}
                >
                  {NAV_LABELS.continueWithGoogle}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-name">Nome completo</Label>
                  <Input
                    id="signup-name"
                    type="text"
                    autoComplete="name"
                    placeholder="Seu nome"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    autoComplete="email"
                    inputMode="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">
                    Senha (mínimo 12 caracteres)
                  </Label>
                  <PasswordField
                    id="signup-password"
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
                          {/* Mensagem principal */}
                          <Alert variant={passwordSecurity.isSecure ? "success" : "destructive"}>
                            {passwordSecurity.isSecure ? (
                              <Check className="h-4 w-4 text-success" />
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
                  <Label htmlFor="confirm-password">Confirmar senha</Label>
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

                <div className="flex items-start space-x-2">
                  <input
                    type="checkbox"
                    id="accept-terms"
                    aria-describedby="accept-terms-description"
                    checked={acceptTerms}
                    onChange={(e) => setAcceptTerms(e.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-input"
                  />
                  <div id="accept-terms-description" className="text-sm">
                    <Label htmlFor="accept-terms" className="cursor-pointer">
                      Aceito os
                    </Label>{" "}
                    <Link
                      to={ROUTES.terms}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary underline-offset-4 hover:underline"
                    >
                      Termos de Uso
                    </Link>{" "}
                    e a{" "}
                    <Link
                      to={ROUTES.privacy}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary underline-offset-4 hover:underline"
                    >
                      Política de Privacidade
                    </Link>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={
                    loading ||
                    checking ||
                    !passwordSecurity ||
                    !passwordSecurity.isSecure ||
                    password !== confirmPassword ||
                    !acceptTerms
                  }
                >
                  {loading ? "Criando conta..." :
                   checking ? "Verificando senha..." :
                   !passwordSecurity?.isSecure ? "Senha não segura" :
                   password !== confirmPassword ? "Senhas não coincidem" :
                   !acceptTerms ? "Aceite os termos" :
                   NAV_LABELS.signUp}
                </Button>
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">
                      Ou continue com
                    </span>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  disabled={loading}
                  onClick={handleGoogleSignIn}
                >
                  {NAV_LABELS.continueWithGoogle}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

        </CardContent>
      </Card>

      {/* Diálogos de 2FA */}
      <Enable2FADialog
        open={show2FASetup}
        onOpenChange={setShow2FASetup}
      />
      <Verify2FADialog
        open={show2FAVerify}
        onOpenChange={setShow2FAVerify}
        factorId={mfaFactorId}
        redirectTo={postLoginTarget}
      />
    </PublicPageShell>
  );
}
