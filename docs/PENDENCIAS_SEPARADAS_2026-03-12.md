# Pendências Separadas (2026-03-12)

## A) Bloqueios externos (não automatizáveis daqui)

1. Smoke test interativo com sessão autenticada em staging:
   - Cenário 1 (retest pós-hotfix)
   - Cenário 2
   - Cenário 3
   - Cenário 4
2. Coleta de evidência visual oficial (prints/tela/rede) no ambiente de staging real.

## B) Pendências essenciais (prioridade máxima)

1. Rerodar Cenário 1 com arquivo real e confirmar sessões > 0.
2. Executar Cenários 2, 3, 4 e registrar status PASS/FAIL.
3. Registrar decisão final GO/NO-GO para produção com base em 4/4.

## C) Pendências importantes (próxima janela)

1. Adicionar E2E browser para fluxos críticos:
   - Import XLSX
   - Admin batch import
   - Student reports lazy load
   - Export PDF
2. Reduzir peso de chunk de PDF (`vendor-react-pdf`) com carregamento sob demanda ainda mais agressivo.
3. Fechar vulnerabilidades `moderate` transitivas quando houver correção estável compatível.

## D) Pendências secundárias

1. Atualizar base browserslist (`caniuse-lite`) para reduzir warning de build.
2. Consolidar dashboard de SLO e error budget em monitoramento contínuo.

## E) Itens concluídos nesta execução

1. Gate automatizado `verify:essential` criado e validado.
2. Runbook de smoke staging criado.
3. Bug crítico de importação XLSX reproduzido e corrigido (2 commits).
4. Auditoria final estruturada documentada.
5. Plano essencial 0-30 dias documentado.
