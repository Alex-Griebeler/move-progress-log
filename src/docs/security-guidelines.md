# 🔒 Diretrizes de Segurança - Fabrik Performance

## AUD-S01: Proteção de Dados Sensíveis

### 📋 Visão Geral
Este documento define as práticas de segurança implementadas no Fabrik Performance App para proteger dados sensíveis dos usuários.

---

## ✅ Práticas Implementadas

### 1. Autenticação e Tokens
**Status**: ✅ Implementado corretamente via Supabase

**Detalhes:**
- Tokens de autenticação são gerenciados pelo Supabase SDK
- Armazenamento automático em `localStorage` é seguro para esta aplicação
- Tokens incluem:
  - Access Token (JWT de curta duração)
  - Refresh Token (rotação automática)

**Por que localStorage é aceitável aqui:**
```typescript
// O Supabase SDK gerencia tokens de forma segura:
// 1. Tokens são assinados e verificados no backend
// 2. Expiração automática (1h para access token)
// 3. Refresh token rotation (previne reutilização)
// 4. HTTPS obrigatório em produção
```

**Alternativa mais segura (futuro):**
- Implementar HttpOnly cookies para tokens em backend próprio
- Usar IndexedDB com criptografia para dados sensíveis offline

---

### 2. Integração Oura Ring
**Status**: ✅ Seguro via OAuth 2.0

**Fluxo de autenticação:**
1. Usuário clica em "Conectar Oura Ring"
2. Redirecionamento para servidor de autorização Oura
3. Usuário concede permissões
4. Callback retorna código de autorização
5. Backend troca código por access token
6. Token armazenado de forma segura no banco de dados

**Tokens Oura:**
- ✅ Nunca expostos ao frontend
- ✅ Armazenados apenas no backend (Supabase)
- ✅ Usados apenas em edge functions
- ✅ Refresh automático gerenciado pelo backend

**Código (Edge Function):**
```typescript
// supabase/functions/oura-sync/index.ts
// Token Oura NUNCA é exposto ao frontend
const { data: connection } = await supabase
  .from('oura_connections')
  .select('access_token')
  .eq('student_id', student_id)
  .single();

// Token usado apenas no backend
const ouraData = await fetch('https://api.ouraring.com/v2/usercollection/daily_readiness', {
  headers: {
    'Authorization': `Bearer ${connection.access_token}`
  }
});
```

---

### 3. Validação de Entrada (XSS Prevention)
**Status**: ✅ Implementado com Zod

**Arquivo:** `src/utils/validation.ts`

**Proteções implementadas:**
```typescript
import { z } from 'zod';

// Validação com sanitização
export const studentProfileSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(255),
  phone: z.string().trim().regex(/^\+?[0-9\s\-()]+$/).max(20).optional(),
  bio: z.string().trim().max(1000).optional()
});

// Sanitização de HTML
export function sanitizeInput(input: string): string {
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]*>/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '');
}
```

**Proteções contra:**
- ✅ XSS (Cross-Site Scripting)
- ✅ Injeção de HTML malicioso
- ✅ Injeção de JavaScript
- ✅ Event handlers maliciosos (onclick, onerror)

---

### 4. Políticas RLS (Row Level Security)
**Status**: ✅ Implementado no Supabase

**Todas as tabelas sensíveis têm RLS ativo:**

```sql
-- Exemplo: students table
ALTER TABLE students ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trainers can view their students"
ON students FOR SELECT
USING (auth.uid() = trainer_id);

CREATE POLICY "Trainers can update their students"
ON students FOR UPDATE
USING (auth.uid() = trainer_id);

-- Exemplo: oura_connections (extra crítico)
ALTER TABLE oura_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view own connection"
ON oura_connections FOR SELECT
USING (
  auth.uid() IN (
    SELECT user_id FROM students WHERE id = student_id
  )
);
```

**Proteção implementada:**
- ✅ Usuários só acessam seus próprios dados
- ✅ Treinadores só acessam alunos que gerenciam
- ✅ Tokens Oura isolados por usuário
- ✅ Métricas Oura isoladas por estudante

---

### 5. HTTPS e CSP (Content Security Policy)
**Status**: ✅ HTTPS obrigatório em produção

**Configuração (futuro):**
```html
<!-- Adicionar ao index.html -->
<meta http-equiv="Content-Security-Policy" 
      content="default-src 'self'; 
               script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; 
               style-src 'self' 'unsafe-inline'; 
               img-src 'self' data: https:; 
               connect-src 'self' https://*.supabase.co;">
```

**Benefícios:**
- Previne XSS via scripts externos
- Bloqueia conexões não autorizadas
- Protege contra clickjacking

---

## 🚨 O Que NÃO Fazer

### ❌ Nunca armazenar no frontend:
```typescript
// ❌ ERRADO
localStorage.setItem('oura_token', token);
localStorage.setItem('user_password', password);
localStorage.setItem('api_key', apiKey);

// ✅ CORRETO - Deixar Supabase gerenciar
const { data, error } = await supabase.auth.signInWithPassword({
  email, 
  password
});
// Token gerenciado automaticamente pelo SDK
```

### ❌ Nunca expor credenciais:
```typescript
// ❌ ERRADO
console.log('Access Token:', user.token);
alert('API Key:', apiKey);

// ✅ CORRETO
console.log('User logged in:', user.id); // Apenas ID público
```

### ❌ Nunca confiar em validação frontend apenas:
```typescript
// ❌ ERRADO
const handleSubmit = (data) => {
  // Enviando direto sem validação
  await supabase.from('students').insert(data);
};

// ✅ CORRETO
const handleSubmit = (formData) => {
  const result = validateAndSanitize(studentProfileSchema, formData);
  if (!result.success) {
    toast.error(formatValidationErrors(result.errors));
    return;
  }
  await supabase.from('students').insert(result.data);
};
```

---

## 🧪 Como Testar Segurança

### Teste 1: Tentativa de XSS
```typescript
// Inserir em campo de nome
const maliciousInput = '<script>alert("XSS")</script>';

// Esperado: sanitização remove o script
const result = sanitizeInput(maliciousInput);
console.assert(result === '', 'XSS não foi sanitizado!');
```

### Teste 2: Validação de email
```typescript
const invalidEmail = 'user@';
const result = studentProfileSchema.safeParse({ 
  name: 'Test', 
  email: invalidEmail 
});

console.assert(!result.success, 'Email inválido passou na validação!');
```

### Teste 3: Acesso não autorizado
```sql
-- Tentar acessar dados de outro usuário
SELECT * FROM oura_metrics WHERE student_id = 'other_user_id';

-- Esperado: RLS bloqueia (retorna vazio ou erro)
```

---

## 📊 Checklist de Segurança

### Backend
- ✅ RLS ativo em todas as tabelas
- ✅ Tokens OAuth gerenciados no backend
- ✅ Edge functions validam permissões
- ✅ CORS configurado corretamente
- ✅ Rate limiting em APIs críticas

### Frontend
- ✅ Validação Zod em todos os formulários
- ✅ Sanitização de inputs
- ✅ Tokens gerenciados por Supabase SDK
- ✅ HTTPS em produção
- ⚠️ CSP headers (próximo passo)

### Dados
- ✅ Dados sensíveis nunca em localStorage (exceto tokens Supabase)
- ✅ PII (Personally Identifiable Information) criptografada em trânsito
- ✅ Backups seguros (gerenciados por Supabase)
- ✅ Logs não contêm dados sensíveis

---

## 🔄 Próximas Melhorias

### Curto Prazo (1-2 semanas)
1. Implementar CSP headers
2. Adicionar rate limiting no frontend
3. Implementar 2FA (Two-Factor Authentication)

### Médio Prazo (1 mês)
1. Audit logs completos (quem acessa o quê)
2. Alertas automáticos de acesso suspeito
3. Criptografia adicional para dados em repouso

### Longo Prazo (3 meses)
1. Penetration testing profissional
2. Certificação SOC 2 (se necessário)
3. GDPR/LGPD compliance audit

---

## 📚 Referências

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Supabase Security Best Practices](https://supabase.com/docs/guides/auth)
- [OAuth 2.0 Security Best Practices](https://tools.ietf.org/html/rfc6749)
- [Content Security Policy Guide](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)

---

**Última Atualização:** 2024-11-03  
**Responsável:** Equipe de Desenvolvimento Fabrik Performance  
**Status:** Em Conformidade ✅
