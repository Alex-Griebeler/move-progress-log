# 🔄 Automação de Sincronização Oura Ring

## 📋 Visão Geral

O sistema de sincronização do Oura Ring foi completamente automatizado e otimizado para garantir que as métricas de saúde dos alunos sejam sempre atualizadas.

---

## ✨ Funcionalidades Implementadas

### 1. **Sincronização Automática 3x ao Dia (06h, 10h e 18h de Brasília)**
- ⏰ **Horários**: 6h e 18h (horário de Brasília, UTC-3)
- 🎯 **Objetivo**: Manter métricas sempre atualizadas
  - **6h**: Captura dados do sono/recuperação da noite
  - **18h**: Captura dados de atividade do dia
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
// Roda via pg_cron 3x ao dia (6h, 10h e 18h Brasília) — jobs versionados em 20260909180000_oura_cron_jobs_versioned.sql
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

## 🔧 Configuração do Cron (pg_cron)

O sistema usa **pg_cron** do PostgreSQL para agendar as sincronizações automáticas:

```sql
-- Sincronização da Manhã (6h Brasília = 9h UTC)
SELECT cron.schedule(
  'oura-sync-morning',
  '0 9 * * *',
  $$ SELECT net.http_post(...) $$
);

-- Sincronização da Tarde (18h Brasília = 21h UTC)
SELECT cron.schedule(
  'oura-sync-evening',
  '0 21 * * *',
  $$ SELECT net.http_post(...) $$
);
```

### Por que 6h e 18h?

**6h da manhã:**
- ✅ Dados do sono da noite já processados pelo Oura
- ✅ Métricas de recuperação prontas (HRV, temperatura, etc)
- ✅ Trainer pode planejar treinos do dia baseado na recuperação

**18h da tarde:**
- ✅ Dados de atividade do dia completos
- ✅ Workouts registrados
- ✅ Permite ajustes no treino do dia seguinte

### Monitorando os Cron Jobs

```sql
-- Ver todos os cron jobs ativos
SELECT * FROM cron.job WHERE jobname LIKE 'oura-sync-%';

-- Ver histórico de execuções
SELECT * FROM cron.job_run_details 
WHERE jobid IN (SELECT jobid FROM cron.job WHERE jobname LIKE 'oura-sync-%')
ORDER BY start_time DESC
LIMIT 20;
```

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


## 🗓️ Janela de datas e frescor (revisão 2026-09-09)

- **`end_date` é EXCLUSIVO na API v2 do Oura.** `start_date=D&end_date=D` devolve zero documentos; `D..D+1` devolve o dia D (verificado no sandbox oficial para todos os endpoints diários, `sleep` e `workout`). O `oura-sync` pede `D..D+1` e **filtra pelo campo `day`** de cada documento — um documento de outro dia nunca é gravado como D.
- **Lookback:** cada execução do `oura-sync-all` (cron ou botão "Sincronizar Todos") sincroniza **hoje, ontem e anteontem** (`lookback_days`, padrão 2, máximo 6 — só configurável em chamada manual com service role/admin; o cron e a UI usam o padrão), em sequência por aluna. Hoje tem 3 tentativas; dias anteriores, 2. **Orçamento global de 100 s por execução, contado da entrada** (idle timeout da edge function = 150 s): nenhuma tentativa começa sem ~32 s de saldo (estimativa de uma tentativa: refresh OAuth ≤15 s + 10 chamadas em paralelo ≤15 s, todos com `AbortSignal.timeout`) e **a espera pela chamada ao `oura-sync` é cancelada ao esgotar o saldo** (`AbortSignal.timeout` no fetch interno; a execução filha pode concluir e gravar, e o par fica como falha por orçamento nesta execução). O plano roda "hoje" para todas as alunas antes de "ontem"; passos que não cabem são pulados (`status: skipped`, `truncated: true`, `students_incomplete` na resposta) e o botão/toast mostram "incompleta". **Sem cursor:** a execução seguinte recomeça por "hoje"; sob saturação recorrente (muitas alunas ou `lookback_days` alto), datas antigas podem sair da janela sem serem consultadas — nesse caso, reduzir o lookback ou dividir a execução. Timeouts das chamadas ao Oura via `AbortSignal.timeout` (cancelam requisição e leitura do corpo). Scores que o Oura finaliza depois da última execução do dia são recuperados na execução seguinte; o upsert preserva valores já gravados quando o payload vem esparso.
- **`temperature_deviation`** é campo de topo do `daily_readiness` (não de `contributors`).
- **Resultado por dia (`outcome`)** em `metrics_synced`: `no_data` | `partial` | `complete` (sono E prontidão) — descreve o que a API DEVOLVEU; falhas não bloqueantes de gravação (acute/workouts) aparecem em `warnings`. A coluna `status` do `oura_sync_logs` continua sendo o sucesso *técnico* da chamada.
- **UI:** "Última sincronização" = última tentativa; "Último dado real" = dia mais recente com sono/prontidão. Sem dado real há 2+ dias sinaliza problema mesmo com tentativas recentes.
- **Sonda (admin):** `oura-sync` com `{ student_id, date, probe: true }` consulta a API nas duas janelas (legado D..D e atual D..D+1) e devolve só contagens/dias; não grava métricas/logs/`last_sync_at` (só a renovação do token OAuth, se vencido). Exige **admin** (dono da aluna não passa). Disponível em Diagnósticos → card da aluna → "Sondar D..D vs D..D+1".
- **Custo:** 5 alunas × 10 endpoints × 3 dias = 150 chamadas por execução (450/dia), muito abaixo do limite publicado (5.000/5 min).
- `oura-sync-test` (mock que gravava 2025-11-03 em tabelas reais) foi removido.

### Publish desta revisão (ordem obrigatória)
1. Edge functions (`oura-sync`, `oura-sync-all`) **antes** do front — o front novo lê `outcome`; sem ele o toast do sync de 7 dias diria "sem dados".
2. Migration `20260909180000_oura_cron_jobs_versioned.sql` (remove jobs fora do padrão que chamem `oura-sync-scheduled` e reagenda os três).
3. **Apagar a função `oura-sync-test` implantada** (remover a pasta do repo não apaga a função remota): ela grava mock de 2025-11-03 em tabela real.
4. Rodar a sonda em 2–3 alunas (hoje e um dia passado) e, se confirmar que a janela antiga trazia documento de outro dia, backfill com "Sincronizar últimos 7 dias" por aluna (o merge só preenche/substitui com valor real).
