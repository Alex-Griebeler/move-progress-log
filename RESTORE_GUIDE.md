# 🔄 Guia de Restauração Completo - Fabrik Studio

Este guia detalha o processo completo de restauração da aplicação Fabrik Studio em qualquer ambiente.

## 📋 Pré-requisitos

- Conta Supabase (gratuita ou paga)
- Node.js v18 ou superior
- Git

## 🚀 Passo a Passo de Restauração

### 1. Criar Novo Projeto Supabase

1. Acesse [supabase.com](https://supabase.com)
2. Crie um novo projeto
3. Anote as seguintes credenciais (disponíveis em Project Settings > API):
   - `Project URL` (VITE_SUPABASE_URL)
   - `anon/public key` (VITE_SUPABASE_PUBLISHABLE_KEY)
   - `service_role key` (SUPABASE_SERVICE_ROLE_KEY)

### 2. Executar Script SQL de Migração

1. Acesse o SQL Editor no painel Supabase
2. Copie o conteúdo completo do arquivo `database-migration-complete.sql`
3. Cole no SQL Editor e execute
4. Aguarde a conclusão (pode levar alguns segundos)
5. Verifique se todas as tabelas foram criadas em Database > Tables

### 3. Configurar Autenticação

No painel Supabase, vá em Authentication > Settings:

1. **Email Auth**: Habilitar
2. **Confirm email**: Desabilitar (para desenvolvimento/testes)
3. **Site URL**: `http://localhost:5173` (desenvolvimento)
4. **Redirect URLs**: Adicionar URLs de callback do Oura se necessário

### 4. Configurar Storage

No painel Storage:

1. Verificar se o bucket `student-avatars` foi criado
2. Se não, criar manualmente:
   - Nome: `student-avatars`
   - Público: Sim
   - File size limit: 5MB
   - Allowed MIME types: `image/*`

### 5. Clonar e Configurar Aplicação

```bash
# Clonar repositório (ou criar novo)
git clone [seu-repositorio]
cd fabrik-studio

# Instalar dependências
npm install

# Criar arquivo .env na raiz
```

### 6. Configurar Variáveis de Ambiente (.env)

```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sua-anon-key
VITE_SUPABASE_PROJECT_ID=seu-project-id
```

### 7. Configurar Secrets para Edge Functions

No painel Supabase, vá em Edge Functions > Manage Secrets e adicione:

```bash
# Obrigatórios
SUPABASE_SERVICE_ROLE_KEY=sua-service-role-key
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_ANON_KEY=sua-anon-key
SUPABASE_DB_URL=postgresql://postgres:[senha]@db.[projeto].supabase.co:5432/postgres

# Para funcionalidades de IA
OPENAI_API_KEY=sua-openai-key (opcional)
GOOGLE_AI_API_KEY=sua-google-ai-key (recomendado)
LOVABLE_API_KEY=sua-lovable-key (opcional)

# Para integração Oura Ring
OURA_CLIENT_ID=seu-oura-client-id (opcional)
OURA_CLIENT_SECRET=seu-oura-client-secret (opcional)
```

### 8. Deploy das Edge Functions

```bash
# Instalar Supabase CLI
npm install -g supabase

# Fazer login
supabase login

# Linkar ao projeto
supabase link --project-ref seu-project-ref

# Deploy todas as functions
supabase functions deploy admin-create-user
supabase functions deploy admin-update-user
supabase functions deploy chat-helper
supabase functions deploy check-rate-limit
supabase functions deploy create-audit-admin
supabase functions deploy create-student-from-invite
supabase functions deploy generate-protocol-recommendations
supabase functions deploy generate-student-invite
supabase functions deploy oura-callback
supabase functions deploy oura-disconnect
supabase functions deploy oura-sync
supabase functions deploy oura-sync-all
supabase functions deploy oura-sync-scheduled
supabase functions deploy oura-sync-test
supabase functions deploy process-voice-session
supabase functions deploy suggest-regressions
supabase functions deploy validate-student-invite
supabase functions deploy voice-session

# Ou deploy todas de uma vez
supabase functions deploy --no-verify-jwt
```

### 9. Criar Usuário Admin Inicial

Execute no SQL Editor do Supabase:

```sql
-- 1. Criar usuário no auth (substitua email e senha)
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'admin@fabrikstudio.com',
  crypt('senha-segura-aqui', gen_salt('bf')),
  now(),
  now(),
  now()
) RETURNING id;

-- 2. Copie o ID retornado e use nos próximos comandos
-- Substitua 'USER_ID_AQUI' pelo ID retornado

-- 3. Criar perfil
INSERT INTO public.trainer_profiles (id, full_name)
VALUES ('USER_ID_AQUI', 'Admin Fabrik');

-- 4. Atribuir role de admin
INSERT INTO public.user_roles (user_id, role)
VALUES ('USER_ID_AQUI', 'admin');
```

### 10. Iniciar Aplicação

```bash
# Modo desenvolvimento
npm run dev

# Acessar em
http://localhost:5173
```

### 11. Popular Dados Iniciais (Opcional)

#### Biblioteca de Exercícios

A aplicação possui um utilitário para popular exercícios iniciais:

```typescript
// Execute no console do navegador após login
import { populateExercises } from './utils/populateExercises';
await populateExercises();
```

#### Protocolos de Recuperação

Execute no SQL Editor:

```sql
-- Inserir protocolos básicos de recuperação
INSERT INTO public.recovery_protocols (name, category, subcategory, duration_minutes, instructions, benefits)
VALUES
('Imersão em Gelo', 'Crioterapia', 'Cold Water Immersion', 10,
 'Imergir o corpo em água com temperatura entre 10-15°C por 10 minutos',
 '["Redução de inflamação", "Aceleração da recuperação muscular", "Melhora da circulação"]'::jsonb),

('Sauna', 'Termoterapia', 'Heat Exposure', 20,
 'Exposição ao calor seco em temperatura de 80-100°C por 15-20 minutos',
 '["Relaxamento muscular", "Melhora cardiovascular", "Detoxificação"]'::jsonb),

('Yoga Flow', 'Mobilidade', 'Active Recovery', 30,
 'Sequência de posturas de yoga com foco em respiração e mobilidade',
 '["Aumento da flexibilidade", "Redução de estresse", "Melhora da postura"]'::jsonb);
```

### 12. Verificar Instalação

Checklist de verificação:

- [ ] Todas as tabelas foram criadas (21 tabelas)
- [ ] RLS policies estão ativas em todas as tabelas
- [ ] Storage bucket `student-avatars` está configurado
- [ ] Variáveis de ambiente estão corretas
- [ ] Edge Functions foram deployadas (17 functions)
- [ ] Usuário admin foi criado e consegue fazer login
- [ ] É possível criar um aluno de teste
- [ ] É possível criar uma prescrição de teste

## 🔧 Configurações Adicionais

### Configurar CORS para Edge Functions

No arquivo `supabase/config.toml`:

```toml
[functions]
enabled = true

[functions.v1_service_role]
verify_jwt = false
```

### Configurar Scheduled Functions (Sync Oura Automático)

No painel Supabase, vá em Database > Extensions e habilite:

- `pg_cron`

Execute no SQL Editor:

```sql
-- Agendar sync automático diário às 3h da manhã
SELECT cron.schedule(
  'oura-sync-daily',
  '0 3 * * *',
  $$
  SELECT net.http_post(
    url := 'https://seu-projeto.supabase.co/functions/v1/oura-sync-scheduled',
    headers := '{"Authorization": "Bearer sua-service-role-key"}'::jsonb
  );
  $$
);
```

### Configurar Rate Limiting Cleanup

```sql
-- Agendar limpeza de rate limits diariamente
SELECT cron.schedule(
  'cleanup-rate-limits',
  '0 2 * * *',
  $$
  SELECT public.cleanup_rate_limit_attempts();
  $$
);
```

## 🐛 Troubleshooting

### Erro: "relation does not exist"

- Verifique se o script SQL foi executado completamente
- Verifique se está usando o schema `public`

### Erro: "JWT expired" ou "Invalid JWT"

- Verifique se `SUPABASE_SERVICE_ROLE_KEY` está correto nos secrets
- Verifique se a configuração de JWT no `config.toml` está correta

### Edge Functions não respondem

- Verifique os logs em Edge Functions > Logs
- Verifique se os secrets foram configurados corretamente
- Teste localmente com `supabase functions serve`

### Erro de RLS Policy

- Verifique se o usuário está autenticado
- Verifique se o usuário tem a role correta
- Verifique os logs no SQL Editor

### Upload de imagens falha

- Verifique se o bucket está público
- Verifique as policies de storage
- Verifique o tamanho máximo do arquivo

## 📚 Estrutura de Dados

### Relacionamentos Principais

```
auth.users (Supabase Auth)
    ↓
trainer_profiles + user_roles
    ↓
students → oura_connections → oura_metrics
    ↓                        → oura_workouts
    ↓                        → oura_sync_logs
    ↓
workout_sessions → exercises
                → session_audio_segments
    ↓
student_observations
    ↓
protocol_recommendations → recovery_protocols

workout_prescriptions → prescription_exercises → exercise_adaptations
                     ↓
                     prescription_assignments
```

### Tabelas por Módulo

**Autenticação & Usuários:**

- `trainer_profiles`
- `user_roles`
- `trainer_access_permissions`

**Gestão de Alunos:**

- `students`
- `student_invites`
- `student_observations`

**Exercícios & Prescrições:**

- `exercises_library`
- `workout_prescriptions`
- `prescription_exercises`
- `prescription_assignments`
- `exercise_adaptations`

**Sessões de Treino:**

- `workout_sessions`
- `exercises`
- `session_audio_segments`

**Protocolos de Recuperação:**

- `recovery_protocols`
- `protocol_recommendations`
- `adaptation_rules`

**Integração Oura Ring:**

- `oura_connections`
- `oura_metrics`
- `oura_workouts`
- `oura_sync_logs`

**Sistema:**

- `rate_limit_attempts`

## 🔒 Segurança

### Checklist de Segurança

- [ ] RLS habilitado em todas as tabelas
- [ ] Service role key mantida secreta (nunca expor no frontend)
- [ ] Rate limiting configurado
- [ ] CORS configurado corretamente
- [ ] Passwords com requisitos mínimos
- [ ] Tokens JWT com expiração adequada
- [ ] Backup automático do banco configurado

### Boas Práticas

1. **Nunca expor service_role_key no frontend**
2. **Sempre usar anon_key no cliente**
3. **Validar inputs antes de Edge Functions**
4. **Implementar rate limiting em endpoints públicos**
5. **Fazer backup regular do banco de dados**
6. **Monitorar logs de erro regularmente**
7. **Manter secrets rotacionados periodicamente**

## 📞 Suporte

Para problemas específicos:

1. Consulte os logs do Supabase
2. Verifique a documentação oficial: [supabase.com/docs](https://supabase.com/docs)
3. Revise o arquivo `BACKUP_COMPLETO.md` para detalhes de implementação

## 🎯 Próximos Passos

Após restauração completa:

1. Personalizar variáveis de ambiente para produção
2. Configurar domínio customizado
3. Habilitar HTTPS
4. Configurar backups automáticos
5. Implementar monitoramento e alertas
6. Configurar CDN para assets
7. Otimizar performance de queries
8. Implementar analytics

---

**Última atualização:** 2025
**Versão do Guia:** 1.0
