# Auditoria Edge Auth — 2026-04-29

## Objetivo
Validar, de ponta a ponta, se as Edge Functions expostas com `verify_jwt = false` estao realmente protegidas por controles internos coerentes.

## Escopo auditado
- `supabase/config.toml`
- Todas as funcoes em `supabase/functions/*/index.ts`

## Resultado executivo
- **Sem falha critica nova encontrada** no hardening de auth.
- Endpoints publicos por desenho continuam publicos (convite/onboarding/OAuth), com validacao de token/estado.
- Endpoints operacionais sensiveis com `verify_jwt=false` possuem barreira interna (service role/admin role/admin key), com uma ressalva operacional descrita abaixo.

## Matriz resumida (`verify_jwt=false`)
| Funcao | Status | Controle observado | Parecer |
|---|---|---|---|
| `oura-sync-all` | Protegido | `authenticateServiceRoleOrUserRole` + role `admin`/service-role | OK |
| `oura-sync-scheduled` | Protegido | `authenticateServiceRoleOrUserRole` + role `admin`/service-role | OK |
| `oura-sync` | Protegido | JWT valido + check role/ownership no fluxo | OK |
| `oura-sync-test` | Protegido | JWT valido + validacao de auth no endpoint | OK |
| `import-exercises` | Protegido | auth helper interno + role check | OK |
| `generate-group-session` | Protegido | JWT + `user_roles in (admin, trainer)` | OK |
| `parse-word-prescription` | Protegido | JWT obrigatorio via `auth.getUser()` | OK |
| `create-audit-admin` | Protegido | bootstrap flag + bearer == service role + `ADMIN_CREATION_KEY` | OK (alto impacto, uso restrito) |
| `smoke-test-integrity` | Protegido | `x-admin-key` **ou** JWT admin | OK |
| `smoke-health` | Protegido | `x-admin-key` **ou** JWT admin | OK |
| `validate-student-invite` | Publico por desenho | token de convite validado server-side | OK |
| `create-student-from-invite` | Publico por desenho | valida token/expiracao/estado + controles internos | OK |
| `oura-callback` | Publico por desenho | valida `state`/invite e fluxo OAuth | OK |
| `check-rate-limit` | Semi-publico por desenho | endpoint de pre-check com validacoes internas | OK |

## Verificacao adicional aplicada neste ciclo
- PR `#43` (mergeado em `main`, commit `20777cd`):
  - `dry_run` fast-path em `oura-sync-all` e propagacao em `oura-sync-scheduled`;
  - hardening de dominio em convites/callback (`id-preview` convertido para `preview`) para evitar convite em host tecnico.

## Risco residual (nao-bloqueante neste ciclo)
1. `create-audit-admin` tem alto privilegio por natureza.
   - Mitigacao atual: `ENABLE_AUDIT_ADMIN_BOOTSTRAP` + service role exata + `ADMIN_CREATION_KEY`.
   - Recomendacao: manter bootstrap **desligado** fora de janelas de auditoria.
2. Fluxos publicos de convite/onboarding dependem de token aleatorio e expiracao.
   - Mitigacao atual: validacao de formato UUID + expiracao + `is_used` + checks de estado.
3. Segredo `PUBLIC_APP_URL` ainda e requisito operacional para dominio canonico forçado em runtime.
   - Sem isso, o hardening atual reduz risco, mas nao substitui configuracao correta de ambiente.

## Conclusao
- **Auth layer das Edge Functions: aprovado para o escopo atual.**
- Sem achado critico novo.
- Prioridade seguinte continua sendo smoke manual funcional (importacao, relatorio, PDF, Oura UI) e confirmacao final GO/NO-GO.
