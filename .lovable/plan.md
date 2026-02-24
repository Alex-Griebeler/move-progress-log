

# Plano Sequencial de Implementacao — MEL-IA-001 a 009

## Prerequisito: Taxonomia de 2 Niveis (ja aprovada)

Antes de qualquer melhoria de IA, a taxonomia `functional_group` precisa existir. Sem ela, MEL-IA-002 (conectar Oura ao gerador) continuara selecionando exercicios de um pool limitado.

**Ordem de execucao:** Taxonomia primeiro, depois os 9 itens em 4 fases.

---

## Fase 1 — Fundacao (MEL-IA-001 + Taxonomia)

Itens que desbloqueiam todos os outros.

### 1A. Taxonomia de 2 Niveis

- Migracao SQL: coluna `functional_group` na `exercises_library`
- Preencher com mapeamento `movement_pattern` -> grupo funcional
- Corrigir 153 exercicios com `category = 'geral'`
- Atualizar `backToBasics.ts` com `FUNCTIONAL_GROUPS`, `MOVEMENT_PATTERNS` (36), `GROUP_TO_CATEGORY`
- Remover padroes obsoletos das constantes
- Atualizar `useExercisesLibrary.ts` com filtro `functional_group`
- Atualizar UI da biblioteca (filtro primario de Grupo Funcional)

### 1B. MEL-IA-001 — Baseline Dinamico por Aluno

- Criar funcao SQL `calc_oura_baseline(p_student_id, p_days)` que retorna `avg_hrv`, `avg_rhr`, `avg_sleep` dos ultimos N dias
- Criar hook `useOuraBaseline(studentId)` com `staleTime: 24h`
- Refatorar `useTrainingRecommendation` para usar baseline real em vez de defaults hardcoded (65/60)
- Manter fallback para defaults quando nao ha dados suficientes (< 7 dias)

**Arquivos afetados:**
- Migracao SQL (nova funcao)
- `src/constants/backToBasics.ts`
- `src/hooks/useExercisesLibrary.ts`
- `src/hooks/useTrainingRecommendation.ts`
- `src/pages/ExercisesLibraryPage.tsx`
- `src/components/AddExerciseDialog.tsx`
- `src/components/EditExerciseLibraryDialog.tsx`
- Novo: `src/hooks/useOuraBaseline.ts`

---

## Fase 2 — Inteligencia na Prescricao (MEL-IA-002 + MEL-IA-005)

### 2A. MEL-IA-002 — Conectar Oura ao generate-group-session

- Adicionar campo `groupReadiness?: number` ao `MesocycleInput`
- No edge function: aplicar `volumeMultiplier` baseado no readiness medio do grupo
- No frontend (`GenerateGroupSessionDialog`): calcular media de readiness dos alunos do grupo e passar como parametro
- Atualizar `src/types/aiSession.ts`

### 2B. Refatorar generate-group-session para usar functional_group

- Substituir `MANDATORY_PATTERNS` por `MANDATORY_GROUPS`
- `selectExercisesByPattern` -> `selectExercisesByGroup` (filtra por `functional_group`)
- Query do Supabase passa a incluir `functional_group`
- Pool de exercicios por grupo funcional cresce de ~13 para ~86 (joelho)

### 2C. MEL-IA-005 — Progressoes no suggest-regressions

- Renomear edge function para `suggest-exercise-alternatives`
- Adicionar `direction: 'regression' | 'progression' | 'both'`
- Adicionar `studentLevel?: number` (1-9) ao input
- Output passa a ter `regressions[]` e `progressions[]`
- Atualizar config.toml

**Arquivos afetados:**
- `supabase/functions/generate-group-session/index.ts`
- `supabase/functions/suggest-regressions/index.ts` (renomear/refatorar)
- `supabase/config.toml`
- `src/types/aiSession.ts`
- `src/hooks/useGenerateGroupSession.ts`
- `src/components/GenerateGroupSessionDialog.tsx`

---

## Fase 3 — Qualidade de Dados (MEL-IA-004 + MEL-IA-006 + MEL-IA-007)

### 3A. MEL-IA-004 — Unificar Pipelines de Audio

- Extrair regras compartilhadas para modulo inline no topo de cada edge function (Deno nao suporta imports entre functions facilmente no Lovable Cloud)
- Padronizar: `terminology_corrections`, `load_calculation`, `clinical_categories`, `severity_levels`
- Duplicar o mesmo bloco de constantes em `voice-session/index.ts` e `process-voice-session/index.ts`
- Documentar com comentario `// SHARED: manter sincronizado com voice-session/process-voice-session`

### 3B. MEL-IA-006 — Validacao de Desvio da Prescricao

- No `process-voice-session`: apos extracao, comparar exercicios executados vs prescritos
- Gerar array `prescription_deviations` com tipo de desvio (volume, exercicio substituido, exercicio omitido)
- Retornar junto com os dados extraidos
- Frontend exibe alertas de desvio na revisao da sessao

### 3C. MEL-IA-007 — Tracking de Efetividade de Protocolos

- Nova tabela `protocol_adherence` (student_id, protocol_id, recommended_date, followed, hrv_delta_24h, readiness_delta_24h)
- RLS: trainers acessam via student ownership
- Atualizar `generate-protocol-recommendations` para consultar historico de efetividade ao priorizar protocolos
- UI: botao "Seguiu?" na recomendacao de protocolo (toggle simples)

**Arquivos afetados:**
- Migracao SQL (nova tabela `protocol_adherence`)
- `supabase/functions/process-voice-session/index.ts`
- `supabase/functions/voice-session/index.ts`
- `supabase/functions/generate-protocol-recommendations/index.ts`
- Componentes de UI para desvios e tracking

---

## Fase 4 — Escala e Assistente (MEL-IA-003 + MEL-IA-008 + MEL-IA-009)

### 4A. MEL-IA-003 — Busca Semantica (Alternativa sem pgvector)

O `pgvector` pode nao estar disponivel no Lovable Cloud. Alternativa viavel:

- **Opcao A (recomendada):** Pre-filtrar por `functional_group` + `trigram similarity` nativa do Postgres (`pg_trgm`). Reduz o envio de 500 exercicios para ~20-50 candidatos por grupo funcional, que sao passados ao modelo para validacao final.

```sql
-- Verificar se pg_trgm esta disponivel
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Funcao de busca por similaridade de nome dentro de um grupo funcional
CREATE OR REPLACE FUNCTION search_exercises_by_name(
  p_query TEXT,
  p_functional_group TEXT DEFAULT NULL,
  p_limit INT DEFAULT 10
) RETURNS TABLE(id UUID, name TEXT, similarity REAL)
LANGUAGE sql STABLE AS $$
  SELECT el.id, el.name, similarity(el.name, p_query) AS sim
  FROM exercises_library el
  WHERE (p_functional_group IS NULL OR el.functional_group = p_functional_group)
    AND similarity(el.name, p_query) > 0.15
  ORDER BY sim DESC
  LIMIT p_limit;
$$;
```

- Atualizar `suggest-exercise` para usar `search_exercises_by_name` em vez de enviar a lista inteira
- Manter fallback: se `pg_trgm` nao estiver disponivel, filtrar por `functional_group` e enviar apenas o subset ao modelo

### 4B. MEL-IA-008 — Assistente Contextual do Treinador

- Refatorar `chat-helper` edge function com system prompt contextual
- Receber `studentId` como parametro opcional
- Quando presente: carregar dados do aluno (perfil, prescricao atual, ultimas 5 sessoes, metricas Oura 7 dias)
- Injetar no system prompt para respostas contextualizadas
- Usar Gemini 2.5 Flash via Lovable Gateway (ja configurado)
- Manter streaming de respostas

### 4C. MEL-IA-009 — Consolidacao de Providers

- Definir provider principal por categoria:
  - Extracao estruturada: Gemini 2.5 Flash (custo-beneficio)
  - Raciocinio biomecanico: Claude via Lovable Gateway
  - Realtime voice: OpenAI GPT-4o (unico com Realtime API)
- Implementar wrapper `callWithFallback()` para funcoes criticas
- Documentar decisao de provider em `docs/AI_PROVIDERS.md`

**Arquivos afetados:**
- Migracao SQL (extensao pg_trgm + funcao de busca)
- `supabase/functions/suggest-exercise/index.ts`
- `supabase/functions/suggest-regressions/index.ts`
- `supabase/functions/chat-helper/index.ts`
- Novo: `docs/AI_PROVIDERS.md`

---

## Resumo de Prioridade e Sequencia

```text
FASE 1 (Fundacao)        FASE 2 (Prescricao)     FASE 3 (Dados)          FASE 4 (Escala)
─────────────────        ───────────────────      ──────────────          ───────────────
Taxonomia 2 niveis  -->  MEL-IA-002 (Oura+Gen) --> MEL-IA-004 (Audio)  --> MEL-IA-003 (Busca)
MEL-IA-001 (Baseline)    MEL-IA-005 (Progress.)    MEL-IA-006 (Desvio)    MEL-IA-008 (Chat)
                         Refactor gen-session       MEL-IA-007 (Track)     MEL-IA-009 (Providers)
```

| Fase | Itens | Esforco Estimado | Dependencia |
|------|-------|------------------|-------------|
| 1 | Taxonomia + MEL-IA-001 | 3 dias | Nenhuma |
| 2 | MEL-IA-002 + 005 + refactor | 4 dias | Fase 1 (taxonomia) |
| 3 | MEL-IA-004 + 006 + 007 | 5 dias | Fase 2 (parcial) |
| 4 | MEL-IA-003 + 008 + 009 | 6 dias | Fase 1 (taxonomia) |

**Total estimado: ~18 dias de desenvolvimento**

---

## Decisao Necessaria sobre MEL-IA-003

A busca vetorial com `pgvector` pode nao estar disponivel no ambiente. A alternativa proposta (`pg_trgm` + filtro por grupo funcional) resolve 80% do problema sem dependencia externa. Se desejar busca semantica completa, sera necessario verificar a disponibilidade da extensao.

