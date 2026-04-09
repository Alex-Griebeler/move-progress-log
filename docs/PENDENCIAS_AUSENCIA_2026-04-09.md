# Pendências por Ausência — 2026-04-09

## Executado automaticamente nesta janela
- Higiene de queries concluída em `src` e `supabase/functions`:
  - `select("*")` removido de todos os pontos identificados.
  - Verificação final: `rg "select(\"*\")|select('*')" src supabase/functions` -> **0 ocorrências**.
- Validação local após cada lote:
  - `npm run lint` -> PASS
  - `VITE_SUPABASE_URL= VITE_SUPABASE_PUBLISHABLE_KEY= npm run test -- --run` -> PASS (`59 passed`, `9 skipped`)
  - `npm run build` -> PASS
- Branch de trabalho atualizada:
  - `codex/phase1-hardening-core`
- Refactor aplicado sem mudança de contrato no fluxo de sessão em grupo:
  - `RecordGroupSessionDialog` delegando merge/validação/mapeamento para `src/components/session/groupSessionDataUtils.ts`
- Guard de regressão adicionado:
  - `npm run audit:guards` bloqueia reintrodução de `select("*")` e `@ts-ignore`.

## Itens bloqueados por ausência/interação manual
1. Smoke test interativo autenticado no staging (cenários de UI protegidos):
- `/admin/diagnostico-oura` (importação batch XLSX)
- `/alunos/:id/relatorios` (lazy-load + fluxo completo)
- Exportação de PDF em sessão real de usuário

2. Gate operacional de GitHub Actions com secrets:
- Confirmação/re-run manual de workflow dependente de secrets externos.
- Ajustes de secrets continuam exigindo ação do owner da conta/projeto.

## Itens técnicos pendentes (não bloqueados, próximos lotes)
1. Refactor estrutural dos módulos monolíticos:
- `src/components/RecordGroupSessionDialog.tsx` (1052 linhas)
- `supabase/functions/generate-group-session/index.ts` (1745 linhas)
- `supabase/functions/process-voice-session/index.ts` (944 linhas)

2. Contratos de payload com validação runtime (schema) entre front e edge functions.

3. Smoke E2E curto e repetível para os 4 fluxos críticos com evidência automatizada.

## Próxima ação recomendada ao retornar
1. Rodar smoke manual autenticado dos 4 cenários críticos no preview.
2. Fechar/merge do PR da branch `codex/phase1-hardening-core`.
3. Iniciar refactor por fatias do fluxo de sessão em grupo (separando estado, validação e persistência).
