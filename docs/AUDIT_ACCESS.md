# Acesso para Auditoria - Adapta One 26

## Credenciais de Acesso

**⚠️ CONFIDENCIAL - Apenas para auditoria de segurança**

### Como criar a conta de auditoria

1. Você precisará configurar um secret `ADMIN_CREATION_KEY` no Lovable Cloud
2. Depois, chame a edge function `create-audit-admin`:

```bash
curl -X POST https://zrgfrdmywxlemcuiqtqg.supabase.co/functions/v1/create-audit-admin \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SUPABASE_ANON_KEY" \
  -d '{"adminKey": "YOUR_ADMIN_CREATION_KEY"}'
```

3. A função retornará as credenciais:
```json
{
  "success": true,
  "credentials": {
    "email": "auditoria@adapta.ai",
    "password": "senha-gerada-automaticamente",
    "userId": "uuid-do-usuario"
  }
}
```

### Permissões do Usuário de Auditoria

A conta `auditoria@adapta.ai` tem:
- ✅ **Role de Admin** - Acesso total ao sistema
- ✅ **Acesso a todos os alunos** e suas informações
- ✅ **Visualização de métricas Oura** de todos os estudantes
- ✅ **Acesso a prescrições de treino** e histórico
- ✅ **Visualização de observações médicas** e protocolos de recuperação
- ✅ **Acesso a logs de sincronização** e diagnósticos

### Áreas para Auditoria

1. **Segurança de Dados Pessoais (LGPD/GDPR)**
   - Verificar proteção de informações pessoais dos alunos
   - Auditar controles de acesso aos dados de saúde
   - Validar criptografia de tokens OAuth (Oura Ring)

2. **Controles de Acesso (RLS Policies)**
   - Testar se treinadores só podem ver seus próprios alunos
   - Verificar se alunos não podem acessar dados de outros alunos
   - Validar separação de permissões entre roles

3. **Autenticação e Autorização**
   - Testar fluxo de login/logout
   - Validar 2FA (Two-Factor Authentication)
   - Verificar proteção contra senhas vazadas

4. **APIs Externas**
   - Auditar integração com Oura Ring API
   - Verificar armazenamento seguro de tokens
   - Validar refresh de tokens e tratamento de erros

5. **Logs e Auditoria**
   - Verificar se logs contêm informações sensíveis
   - Validar logs de acesso a dados críticos
   - Auditar sistema de rate limiting

6. **Injeção e Validação de Input**
   - Testar campos de formulário para SQL injection
   - Verificar validação de entrada em edge functions
   - Validar sanitização de dados

## URLs do Sistema

- **Preview URL**: https://905d5174-1667-49dc-b1cc-1e7743b2741e.lovableproject.com
- **Production URL**: https://move-progress-log.lovable.app
- **Supabase URL**: https://zrgfrdmywxlemcuiqtqg.supabase.co

## Principais Tabelas do Banco de Dados

### Dados Pessoais Sensíveis
- `students` - Informações pessoais, altura, peso, data de nascimento, lesões
- `student_observations` - Observações médicas e notas sobre saúde
- `oura_connections` - Tokens OAuth do Oura Ring (access_token, refresh_token)
- `oura_metrics` - Dados de saúde: frequência cardíaca, HRV, sono, temperatura, SpO2
- `student_invites` - Emails e tokens de convite

### Controle de Acesso
- `user_roles` - Roles dos usuários (admin, moderator, user)
- `trainer_profiles` - Perfis dos treinadores
- `trainer_access_permissions` - Permissões entre treinadores

### Treinos e Prescrições
- `prescriptions` - Prescrições de treino
- `workouts` - Treinos planejados
- `workout_sessions` - Sessões de treino realizadas
- `exercises_library` - Biblioteca de exercícios

### Logs e Auditoria
- `oura_sync_logs` - Logs de sincronização com Oura API
- `rate_limit_attempts` - Tentativas de acesso para rate limiting

## Checklist de Segurança

### Alto Risco
- [ ] Tokens OAuth estão sendo armazenados de forma segura?
- [ ] RLS está ativado em TODAS as tabelas sensíveis?
- [ ] Policies de RLS estão corretamente implementadas?
- [ ] Dados pessoais de saúde estão protegidos?
- [ ] 2FA está funcionando corretamente?

### Médio Risco
- [ ] Proteção contra senhas vazadas está ativa?
- [ ] Rate limiting está funcionando?
- [ ] Logs não contêm informações sensíveis?
- [ ] Validação de input está implementada?
- [ ] Tokens expirados são renovados corretamente?

### Baixo Risco
- [ ] Extensões estão no schema correto?
- [ ] Cleanup de dados antigos está funcionando?
- [ ] Performance das queries está otimizada?

## Após a Auditoria

1. **Documentar Vulnerabilidades**
   - Classificar por severidade (Crítico, Alto, Médio, Baixo)
   - Incluir passos para reproduzir
   - Sugerir remediação

2. **Relatório de Auditoria**
   - Resumo executivo
   - Detalhamento técnico
   - Recomendações prioritizadas
   - Timeline sugerido para correções

3. **Revogar Acesso**
   - Após conclusão da auditoria, desabilitar conta de auditoria
   - Ou alterar senha e guardar em cofre seguro

## Contato

Para dúvidas sobre o sistema ou auditoria:
- **Email**: alex@fabrikbrasil.com
- **Sistema**: Move Progress Log (Fabrik Studio)
