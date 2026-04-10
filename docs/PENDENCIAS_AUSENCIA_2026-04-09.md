# Pendências por Ausência — 2026-04-09

## Executado automaticamente nesta janela
- Higiene de queries concluída em `src` e `supabase/functions`:
  - `select("*")` removido de todos os pontos identificados.
  - Verificação final: `rg "select(\"*\")|select('*')" src supabase/functions` -> **0 ocorrências**.
- Validação local após cada lote:
  - `npm run lint` -> PASS
  - `VITE_SUPABASE_URL= VITE_SUPABASE_PUBLISHABLE_KEY= npm run test -- --run` -> PASS (`72 passed`, `9 skipped`)
  - `npm run build` -> PASS
- Branch de trabalho atualizada:
  - `codex/phase1-hardening-core`
- Refactor aplicado sem mudança de contrato no fluxo de sessão em grupo:
  - `RecordGroupSessionDialog` delegando merge/validação/mapeamento para `src/components/session/groupSessionDataUtils.ts`
- Guard de regressão adicionado:
  - `npm run audit:guards` bloqueia reintrodução de `select("*")` e `@ts-ignore`.
- Parser de voz hardenizado com teste de caracterização:
  - núcleo extraído para `supabase/functions/process-voice-session/parserCore.ts`
  - testes em `src/utils/__tests__/voiceParserCore.test.ts`
- Gerador de sessão em grupo hardenizado com teste de caracterização:
  - validações extraídas para `supabase/functions/generate-group-session/validationCore.ts`
  - testes em `src/utils/__tests__/groupSessionValidationCore.test.ts`
- Contrato runtime aplicado em geração de sessão:
  - validação com `zod` em `supabase/functions/generate-group-session/index.ts`
- Contrato runtime expandido para endpoints críticos adicionais:
  - `supabase/functions/process-voice-session/index.ts`
  - `supabase/functions/generate-student-report/index.ts`
- Contrato runtime aplicado também em ingestão/classificação:
  - `supabase/functions/import-exercises/index.ts`
  - `supabase/functions/classify-exercises/index.ts`
- Refactor incremental sem regressão:
  - `generate-group-session`: auth/resource loading extraídos para helpers
  - `process-voice-session`: payload/ownership validations extraídos para helpers
- Regra de volume semanal atualizada no motor:
  - 2 treinos: mínimo 8 sets por padrão
  - 3 treinos: mínimo 12 sets por padrão
  - pull >= 25% acima de push

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
- `supabase/functions/generate-group-session/index.ts` (1489 linhas)
- `supabase/functions/process-voice-session/index.ts` (775 linhas)

2. Smoke E2E curto e repetível para os 4 fluxos críticos com evidência automatizada.

3. Refactor incremental final do `generate-group-session/index.ts` (persistência e montagem de resposta) para reduzir risco de regressão futura.

## Próxima ação recomendada ao retornar
1. Rodar smoke manual autenticado dos 4 cenários críticos no preview.
2. Fechar/merge do PR da branch `codex/phase1-hardening-core`.
3. Opcional: executar última fatia de refactor interno do `generate-group-session` (persistência/resposta) mantendo caracterização.
