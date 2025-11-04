import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePasswordSecurity } from "@/hooks/usePasswordSecurity";
import { AlertCircle, Check, X, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function AuthPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [passwordSecurity, setPasswordSecurity] = useState<any>(null);
  const navigate = useNavigate();
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

  const getErrorMessage = (error: any): string => {
    const message = error.message.toLowerCase();
    
    if (message.includes('email') && message.includes('already')) {
      return "Este email já está cadastrado. Tente fazer login ou use outro email.";
    }
    if (message.includes('invalid email')) {
      return "Email inválido. Verifique o formato do email.";
    }
    if (message.includes('password') && message.includes('short')) {
      return "A senha deve ter pelo menos 6 caracteres.";
    }
    if (message.includes('invalid login credentials')) {
      return "Email ou senha incorretos. Verifique seus dados e tente novamente.";
    }
    if (message.includes('email not confirmed')) {
      return "Email não confirmado. Verifique sua caixa de entrada.";
    }
    if (message.includes('too many requests')) {
      return "Muitas tentativas. Aguarde alguns minutos e tente novamente.";
    }
    
    return error.message;
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (!email || !password || !fullName) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha todos os campos para continuar.",
        variant: "destructive",
      });
      setLoading(false);
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
      toast({
        title: "Erro no cadastro",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    } else {
      toast({
        title: "✅ Cadastro realizado com sucesso!",
        description: "Você já pode fazer login e começar a usar o sistema.",
      });
      setEmail("");
      setPassword("");
      setFullName("");
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (!email || !password) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha email e senha para continuar.",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      toast({
        title: "Erro no login",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    } else {
      toast({
        title: "✅ Login realizado com sucesso!",
        description: "Redirecionando para o sistema...",
      });
      navigate("/");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Gestão de Prescrições</CardTitle>
          <CardDescription>
            Sistema de gestão de treinos e prescrições
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="signin">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Entrar</TabsTrigger>
              <TabsTrigger value="signup">Cadastrar</TabsTrigger>
            </TabsList>
            
            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-email">Email</Label>
                  <Input
                    id="signin-email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signin-password">Senha</Label>
                  <Input
                    id="signin-password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Entrando..." : "Entrar"}
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-name">Nome Completo</Label>
                  <Input
                    id="signup-name"
                    type="text"
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
                  <Input
                    id="signup-password"
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
                          {/* Mensagem principal */}
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
                
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={
                    loading || 
                    checking || 
                    !passwordSecurity || 
                    !passwordSecurity.isSecure
                  }
                >
                  {loading ? "Cadastrando..." : 
                   checking ? "Verificando senha..." :
                   !passwordSecurity?.isSecure ? "Senha não segura" :
                   "Cadastrar"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
