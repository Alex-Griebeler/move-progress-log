# 🔄 Automação de Sincronização Oura Ring

## 📋 Visão Geral

O sistema de sincronização do Oura Ring foi completamente automatizado e otimizado para garantir que as métricas de saúde dos alunos sejam sempre atualizadas.

---

## ✨ Funcionalidades Implementadas

### 1. **Sincronização Automática Diária**
- ⏰ **Horário**: 10h (horário de Brasília, UTC-3)
- 🎯 **Objetivo**: Sincronizar dados do dia anterior quando já foram processados pelo Oura
- 🔁 **Retry**: 3 tentativas com backoff exponencial (2s, 4s)
- 📊 **Logs**: Todas as tentativas são registradas na tabela `oura_sync_logs`

### 2. **Sincronização Manual**
- 🔘 **Botão**: "Sincronizar Todos Agora" na página de Alunos
- 👥 **Escopo**: Sincroniza todos os alunos com conexões ativas
- 📈 **Feedback**: Toast com resultado (sucessos/falhas)

### 3. **Dashboard de Status**
- 📊 **Visualização**: Card com status em tempo real
- 🔍 **Informações**:
  - Conexões ativas
  - Última sincronização de cada aluno
  - Histórico de logs recentes (últimos 5)
  - Status: sucesso, falha, retry
- 🔄 **Atualização**: A cada 1 minuto automaticamente

### 4. **Logging Detalhado**
Melhorias no logging para diagnóstico de problemas:

```typescript
// Workouts agora tem logging completo:
- Status da API response
- Raw data da API
- Cada workout individual antes de salvar
- Resultado do insert no banco
- Mensagens de erro detalhadas com hints
```

---

## 🏗️ Arquitetura

### Edge Functions

#### **oura-sync-scheduled** (NOVO)
```typescript
// Roda via cron às 10h todos os dias
// Chama oura-sync-all para fazer o trabalho
```

#### **oura-sync-all**
```typescript
// Busca todas as conexões ativas
// Itera e chama oura-sync para cada aluno
// Sistema de retry (3x) com backoff
// Registra tudo em oura_sync_logs
```

#### **oura-sync**
```typescript
// Sincroniza um aluno específico em uma data
// Busca de 10 endpoints da API Oura:
  - Daily Readiness
  - Daily Sleep  
  - Sleep Periods
  - Heart Rate
  - Daily Activity
  - Workouts 🆕 (com logging detalhado)
  - Daily Stress
  - Daily SpO2
  - VO2 Max
  - Daily Resilience

// Salva em oura_metrics e oura_workouts
```

---

## 📊 Métricas Sincronizadas

### Readiness (Prontidão)
- ✅ Score (0-100)
- ✅ HRV Balance
- ✅ Activity Balance
- ✅ Temperature Deviation

### Sleep (Sono)
- ✅ Sleep Score (0-100)
- ✅ Total Sleep Duration
- ✅ Deep Sleep Duration
- ✅ REM Sleep Duration
- ✅ Light Sleep Duration
- ✅ Awake Time
- ✅ Sleep Efficiency (%)
- ✅ Sleep Latency (tempo para dormir)
- ✅ Lowest Heart Rate
- ✅ Average Sleep HRV
- ✅ Average Breath Rate

### Activity (Atividade)
- ✅ Activity Score (0-100)
- ✅ Steps
- ✅ Active Calories
- ✅ Total Calories
- ✅ MET Minutes
- ✅ High Activity Time
- ✅ Medium Activity Time
- ✅ Low Activity Time
- ✅ Sedentary Time
- ✅ Training Volume
- ✅ Training Frequency

### Workouts (Treinos) 🆕
- ✅ Workout ID
- ✅ Activity Type (traduzido para PT-BR)
- ✅ Start/End DateTime
- ✅ Calories
- ✅ Distance
- ✅ Intensity (easy/moderate/hard)
- ✅ Average Heart Rate
- ✅ Max Heart Rate
- ✅ Source (manual/auto)

### Stress & Recovery
- ✅ Stress High Time
- ✅ Recovery High Time
- ✅ Day Summary (restored/normal/demanding/etc)

### Advanced Metrics
- ✅ SpO2 Average (%)
- ✅ Breathing Disturbance Index
- ✅ VO2 Max
- ✅ Resilience Level

---

## 🔧 Configuração do Cron

```toml
# supabase/config.toml
[functions.oura-sync-scheduled]
verify_jwt = false
# Cron: Todos os dias às 10h (Brasília UTC-3)
# Equivale a 13h UTC
schedule = "0 13 * * *"
```

### Por que 10h?
1. **Dados processados**: Oura processa dados após o sono + sincronização
2. **Horário conveniente**: Manhã no Brasil, dados do dia anterior prontos
3. **Evita conflitos**: Fora do horário de pico de uso do app

---

## 🐛 Debugging

### Verificar Logs de Sincronização
```sql
-- Logs recentes
SELECT 
  sl.status,
  sl.sync_date,
  sl.sync_time,
  sl.attempt_number,
  sl.error_message,
  s.name as student_name
FROM oura_sync_logs sl
JOIN students s ON s.id = sl.student_id
ORDER BY sl.sync_time DESC
LIMIT 20;

-- Estatísticas de sucesso
SELECT 
  status,
  COUNT(*) as count,
  COUNT(*) * 100.0 / SUM(COUNT(*)) OVER() as percentage
FROM oura_sync_logs
WHERE sync_time > NOW() - INTERVAL '7 days'
GROUP BY status;
```

### Verificar Workouts
```sql
-- Workouts por aluno
SELECT 
  s.name,
  COUNT(ow.id) as workout_count,
  MAX(ow.start_datetime) as last_workout
FROM students s
LEFT JOIN oura_workouts ow ON ow.student_id = s.id
GROUP BY s.id, s.name
ORDER BY workout_count DESC;

-- Detalhes de workouts
SELECT 
  s.name,
  ow.activity,
  ow.start_datetime,
  ow.end_datetime,
  ow.intensity,
  ow.calories
FROM oura_workouts ow
JOIN students s ON s.id = ow.student_id
ORDER BY ow.start_datetime DESC
LIMIT 20;
```

### Edge Function Logs
```bash
# Ver logs da função scheduled
supabase functions logs oura-sync-scheduled

# Ver logs da função de sync individual
supabase functions logs oura-sync
```

---

## ⚠️ Problemas Conhecidos e Soluções

### 1. Workouts não sincronizando ❌
**Sintomas**: `workout_count = 0` apesar de conexão ativa

**Possíveis causas**:
- Usuário não registrou workouts no app Oura
- Workouts não sincronizados do anel para o app
- API do Oura não retornou dados

**Solução**:
1. Verificar logs detalhados no edge function
2. Pedir ao aluno para sincronizar o anel com o app Oura
3. Tentar sincronização manual após algumas horas

### 2. Token Expired ⏰
**Sintomas**: Erro 401 ou "Token refresh failed"

**Solução**:
✅ **Automático**: Sistema renova token automaticamente quando expira
❌ **Se falhar**: Aluno precisa reconectar Oura Ring

### 3. Rate Limiting da API 🚦
**Sintomas**: Erro 429 "Too Many Requests"

**Solução**:
- Sistema já implementa retry com backoff
- Aguardar alguns minutos
- Evitar múltiplas sincronizações manuais seguidas

### 4. Dados Incompletos 📉
**Sintomas**: Métricas com valor `null`

**Causas normais**:
- Anel não foi usado naquele dia
- Dados ainda não processados pelo Oura
- Funcionalidade não disponível no plano do usuário

**Não é erro**: É esperado que algumas métricas sejam null

---

## 📈 Monitoramento

### KPIs Importantes
- **Taxa de Sucesso**: % de syncs bem-sucedidas
- **Tempo Médio de Sync**: Duração das sincronizações
- **Workouts Capturados**: Total de workouts/aluno
- **Uptime da Automação**: Cron funcionando consistentemente

### Dashboard Admin
Acesse `/admin/diagnostico-oura` para:
- 📊 Status de todas as conexões
- 🔍 Diagnóstico de endpoints da API
- 📝 Logs de sincronização
- ⚠️ Alertas de problemas

---

## 🚀 Próximos Passos (Roadmap)

1. **Notificações**
   - Alertar trainer quando sync falhar múltiplas vezes
   - Notificar aluno para reconectar se token expirar

2. **Analytics**
   - Dashboard com tendências de métricas
   - Correlações entre treinos e recuperação

3. **Integrações**
   - Usar métricas Oura para sugerir ajustes nos treinos
   - Alertas automáticos de overtraining

4. **Performance**
   - Cache de métricas recentes
   - Sync incremental (apenas dias novos)

---

## 📞 Suporte

**Problemas com sincronização?**
1. Verificar Dashboard de Status na página de Alunos
2. Ver logs em `/admin/diagnostico-oura`
3. Tentar sincronização manual
4. Verificar se aluno sincronizou o anel com o app Oura
5. Em último caso: Reconectar Oura Ring

**Desenvolvedor**: Verificar logs das edge functions e tabela `oura_sync_logs`
