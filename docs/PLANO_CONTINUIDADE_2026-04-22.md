# Plano de Continuidade — 2026-04-22

## Objetivo do ciclo atual
Levar o app para estado operacional estavel no escopo atual, sem introduzir novas funcionalidades fora do necessario.

## Status consolidado (apos fix Oura em `main`)
- Oura sync/UI refresh: corrigido e mergeado (`PR #30`, commit `826b962`).
- Gates locais:
  - `lint`: PASS
  - `test`: PASS
  - `build`: PASS
  - `query-safety`: PASS
- Integridade de dados:
  - script `verify:data-integrity` depende de `SUPABASE_SERVICE_ROLE_KEY` no shell local.
  - sem a chave, execucao automatica local segue bloqueada por design.

## Ajuste tecnico aplicado neste ciclo
- `scripts/verify-essential-gates.sh` agora diferencia:
  - erro real de seguranca (`npm audit` com vulnerabilidade): FAIL
  - indisponibilidade de rede/registry local: WARN local (em CI continua FAIL)

## Pendencias que ainda dependem de validacao manual
1. Importacao de sessao via Excel (novo + duplicado) em UI autenticada.
2. Geracao de relatorio em `/alunos/:id/relatorios`.
3. Exportacao PDF do relatorio.
4. Revisao visual final das abas de aluno com Oura.

## Proximo bloco automatico (sem depender do usuario)
1. Rodar varredura de riscos residuais em hooks/paginas de sessoes e prescricoes:
   - consistencia de invalidacao de cache;
   - estados de erro silencioso;
   - normalizacao de data/hora (`HH:mm`) em pontos restantes.
2. Entregar patch de baixo risco com testes e gates.
3. Atualizar documento de pendencias com antes/depois objetivo.

## Regra de escopo para este ciclo
- Sem expansao funcional nova.
- Prioridade total em estabilidade, consistencia de dados e ausencia de regressao.
