## A. Resumo executivo
- O sistema já cobre os blocos operacionais centrais do piloto: Oura (diário/agudo), baseline, flags, recomendação por zona, sessão/exercício, relatórios e importação.
- As lacunas de maior impacto não são de “falta de feature”, e sim de consistência entre motores de regra, robustez de dados e previsibilidade operacional.
- Implementar agora: alinhamento de regra FCR entre motores, padronização de decisão por zona/override, testes de contrato e hardening de queries.
- Pode esperar: automação total de progressão sem validação de coach, redesign estrutural grande de UI e refatorações profundas de módulo.

## B. Regra mecânica do microciclo
### Desenho funcional
- Regra oficial já refletida no cálculo semanal:
  - 2 treinos: mínimo 8 séries para Push/Knee/Hip, Pull >= 1.25x Push.
  - 3 treinos: mínimo 12 séries para Push/Knee/Hip, Pull >= 1.25x Push.
- Cálculo atual usa séries executadas nas sessões da semana e mapeia exercício -> padrão por `exercises_library`.

### Desenho técnico
- Implementação atual: `src/hooks/useWeeklyMovementBalance.ts`.
- Fontes: `students.weekly_sessions_proposed`, `workout_sessions`, `exercises`, `exercises_library`.
- Usa normalização textual para casar nome do exercício registrado vs biblioteca.

### Impacto no sistema
- Sem migração obrigatória para operar no piloto.
- Risco principal: exercícios não mapeados (`unknownExercises`) reduzirem qualidade do balanço.

### Recomendação v1/v2
- V1 (piloto): manter regra atual e usar em acompanhamento semanal/relatórios internos.
- V2: mover cálculo para função SQL/RPC para centralizar regra e reduzir divergência frontend/backend.

## C. Progressão de carga
### Regra oficial proposta
- Verde alta: +2.5% a +5%.
- Verde: manter.
- Amarela: reduzir ~20%.
- Laranja/Vermelha: sem progressão, foco recuperação/descanso.
- Override agudo rebaixa 1 zona quando sinais críticos aparecem.

### Critérios de subida/manutenção/redução
- Subida exige: execução prévia satisfatória, ausência de dor relevante, ausência de flag crítica.
- Redução/bloqueio: dor, técnica inconsistente, recuperação comprometida.

### Implementação técnica
- Decisão macro: `src/hooks/useTrainingRecommendation.ts`.
- Sugestão por exercício: `src/hooks/useLoadSuggestions.ts`.
- Exibição operacional: `src/components/PersonalizedTrainingDashboard.tsx`.

### Riscos
- Regras ainda distribuídas em mais de um motor (treino e protocolos).
- Falta suíte dedicada de testes de regra por zona/override/carga.

## D. Inconsistência de motor
### Diagnóstico
- A base de regras (`adaptation_rules`) tinha FCR `above_baseline` apenas com limiar +10.
- O motor de treino já trabalha com dois níveis (+5 warning / +10 critical).
- Isso gera inconsistência entre recomendação de treino e recomendação de protocolos.

### Correção
- Padronizar FCR em dois níveis no motor de protocolos:
  - +5 bpm => WARNING.
  - +10 bpm => CRITICAL.
- Evitar recomendações duplicadas por múltiplas regras disparadas no mesmo protocolo.

### Impacto
- Recomendações de protocolo ficam coerentes com leitura clínica já usada no treino.
- Reduz ruído de duplicação e melhora priorização de conduta.

### Testes
- Testes unitários para limiares +5/+10 no motor de treino.
- Testes de integração de protocolo garantindo prioridade alta quando +10 for atingido.

## E. Sugestão numérica de carga por exercício
### Lógica funcional
- Sistema já calcula sugestão numérica com base em histórico recente e aplica arredondamento por implemento inferido.
- Já considera zona, dor e técnica para bloquear ou reduzir progressão.

### Lógica técnica
- Referência atual vem de sessões de `workout_sessions` + `exercises`.
- Metadados de categoria/equipamento vêm de `exercises_library`.

### Dependências
- Qualidade da entrada de cargas/reps por sessão.
- Classificação adequada de exercícios na biblioteca.
- Estabilidade do motor de zona e override.

### Limitações
- Priorização histórica ainda pode ser refinada para aderir 100% à ordem operacional desejada.
- Equipamento/incremento ainda é inferido por string, não por inventário real de cada unidade.

### Rollout v1/v2
- V1: manter modo assistido (sistema sugere, coach valida), reforçar guardrails.
- V2: inventário de equipamento por aluno/unidade e score de confiança por sugestão.

## F. Checklist de implementação
### Backend
- [ ] Unificar thresholds FCR entre motores (treino + protocolos).
- [ ] Deduplicar recomendações por protocolo e manter maior prioridade.
- [ ] Centralizar funções puras de regra (comparação de baseline/threshold).

### Banco
- [ ] Seed/migração de `adaptation_rules` para FCR em +5 e +10.
- [ ] (v2) índice/campo canônico para nome de exercício.

### Regras
- [ ] Congelar contrato de zona + override em documento técnico.
- [ ] Definir formalmente “execução satisfatória” para progressão.

### UI
- [ ] Exibir regra aplicada, referência e status da sugestão de carga de forma consistente.
- [ ] Manter dashboard de treino sem blocos de baixa aplicabilidade prática.

### Testes
- [ ] Unitários de regra (FCR/HRV/sono/override).
- [ ] Contrato de payload relatório (UI/PDF).
- [ ] Smoke manual autenticado de importação, relatório e PDF.

## G. Riscos e pontos de atenção
- Maior risco atual: divergência entre motores de decisão por manter thresholds duplicados.
- Maior risco operacional: falha silenciosa de query aparentando “sem dados”.
- Não automatizar cegamente no piloto: progressão final de carga sem validação do coach.
- Critério de sucesso do piloto: consistência de regra + confiabilidade de execução + baixa regressão.

---

## Arquivos/funções/tabelas centrais
### Arquivos
- `src/hooks/useTrainingRecommendation.ts`
- `src/hooks/useLoadSuggestions.ts`
- `src/hooks/useWeeklyMovementBalance.ts`
- `src/components/PersonalizedTrainingDashboard.tsx`
- `supabase/functions/generate-protocol-recommendations/index.ts`

### Funções
- `useTrainingRecommendation`
- `useLoadSuggestions`
- `useWeeklyMovementBalance`
- `getProtocolsForAction` (edge function)
- `resolveBaselineValue` (edge function)

### Tabelas
- `oura_metrics`
- `oura_acute_metrics`
- `adaptation_rules`
- `protocol_recommendations`
- `workout_sessions`
- `exercises`
- `exercises_library`
- `student_reports`
- `report_tracked_exercises`
