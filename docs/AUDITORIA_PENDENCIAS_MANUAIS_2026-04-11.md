# Auditoria Essencial — Pendências Manuais (2026-04-11)

## Escopo concluído automaticamente
- Correções de estabilidade e consistência em UI Oura, importação Excel, motor de recomendação e debug panel.
- Validações automáticas executadas com sucesso:
  - `npm run lint`
  - `npm run test -- --run`
  - `npm run build`
  - `npm audit --audit-level=high` (sem vulnerabilidades high/critical; 2 moderadas de toolchain Vite/esbuild)
  - `npx tsc --noEmit`
  - `scripts/ci-smoke-edge-auth.sh` (cenários de rejeição A1/B1/B2/B3/C1/C2/C3/D0)
  - Revalidação completa executada novamente em 2026-04-11 (gates e smoke de auth sem regressão)

## O que ainda depende de validação manual

### 1) Fluxos de UI autenticada (smoke funcional)
1. Importação de sessões com Excel (arquivo real), incluindo:
   - caso de importação nova;
   - caso de duplicata já existente.
2. Geração de relatório em `/alunos/:studentId/relatorios`.
3. Exportação de PDF no relatório gerado.
4. Revisão visual das abas do aluno com Oura conectado:
   - sem sobreposição de debug;
   - datas no formato esperado;
   - ausência de erro bloqueante em console.

### 2) Happy-path com service_role (opcional para gate avançado)
- Executar cenários A3/B4/C4 no workflow de edge smoke com `RUN_SERVICE_ROLE_TESTS=true`.
- Requer `SUPABASE_SERVICE_ROLE_KEY` configurada no ambiente CI.

## Critério objetivo para considerar auditoria essencial concluída
- Todos os itens de UI autenticada acima passam sem erro funcional.
- Sem regressão de comportamento em importação, relatório e exportação.
- (Opcional recomendado) Happy-path service_role validado no CI.

## Branch de trabalho
- `main` (todas as correções abaixo já integradas)

## Commits desta rodada de hardening
- `d592171` fix(stability): remove invalid DOM nesting and harden edge auth integration test
- `fa7e6fe` fix(ui): remove dialog/description runtime warnings and ignore local artifacts
- `28f5ecc` refactor(ui): align heading refs and make CardDescription block-safe
- `91afcca` fix(training): harden numeric checks in recommendation alerts
- `b2a088d` fix(oura-ui): treat zero values as valid metrics
- `f9a1902` fix(import): harden excel serial date/time parsing and progress guard
- `2d9e2fc` fix(debug): restrict auth debug panel to localhost dev
- `28c33ba` fix(oura-diagnostics): avoid false empty status on zero values
- `21dd7b9` fix(oura): prevent sparse sync overwrite and recover latest readiness/sleep
- `c18ba57` fix(oura): preserve zero metrics and harden diagnostics consistency
- `529ab61` fix(import): validate time values and prevent silent 12:00 fallback
- `2ac31da` fix(reports): surface edge function error details in generate flow
- `7e56aff` fix(oura): keep partial metric sync and show conditional diagnostics warning
- `ee0b361` fix(training): use nullish fallback for recovery score (`readiness_score ?? 50`) to avoid false zone inflation
- `73cb66a` chore(smoke): accept `VITE_SUPABASE_URL`/`VITE_SUPABASE_PUBLISHABLE_KEY` fallback no script de edge auth smoke
- `6fe3f1e` fix(oura): baseline parsing robusta sem mascarar valores numéricos zero
- `65ac384` fix(reports): evita exibição de `undefined` em “dias de dados” no relatório (UI + PDF)
- (esta rodada) fix(import): parser de hora endurecido (HH:MM, AM/PM, HHMM e fração Excel 0..1), sem normalização silenciosa de valores inválidos
