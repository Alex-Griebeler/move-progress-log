# Correção de Horário Legado de Sessões

## Contexto
Algumas sessões antigas podem ter sido importadas com horário deslocado por interpretação de célula de tempo do Excel (ex.: `04:53` em vez de `08:00`).

## Pré-requisito
Executar no SQL Editor do Supabase/Lovable com conta que tenha permissão de update em `workout_sessions`.

## Passo 1 — Diagnóstico (sem alterar dados)
Arquivo: `scripts/sql/legacy_session_time_diagnostic.sql`

O que verificar:
- Padrão de minutos suspeitos (`:23`, `:53`) no período afetado.
- Coluna `proposed_time` faz simulação de correção (+03:07).
- Coluna `has_conflict` mostra se a mudança geraria duplicidade em `(student_id, date, time)`.

## Passo 2 — Aplicar correção segura
Arquivo: `scripts/sql/legacy_session_time_fix_safe.sql`

Regras de segurança do script:
- Atualiza somente linhas sem conflito de unicidade.
- Cria snapshot em `workout_sessions_time_fix_audit` antes do update.
- Mantém rastreabilidade por execução (`run_at`).

## Passo 3 — Validar
Rodar novamente o diagnóstico e conferir:
- Redução dos horários suspeitos
- `rows_updated` retornado no final do script de fix

## Rollback (se necessário)
Arquivo: `scripts/sql/legacy_session_time_fix_rollback.sql`

Esse script reverte a **última execução** com base na tabela de auditoria.

## Observações
- A janela temporal no SQL está definida para abril/2026 por padrão. Ajuste antes de executar para o período real afetado.
- O ajuste de `+03:07` foi definido para corrigir o padrão observado de importação legado.
- Se houver casos fora desse padrão, trate em lote separado para não afetar sessões legítimas.
