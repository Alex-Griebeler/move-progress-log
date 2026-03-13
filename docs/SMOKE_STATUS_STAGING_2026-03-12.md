# Smoke Status Staging (2026-03-12)

## Gate de produção
`NO-GO` até 4/4 cenários críticos com PASS manual e evidência.

## Status por cenário

| # | Cenário | Status atual | Evidência | Próxima ação |
|---|---------|--------------|-----------|--------------|
| 1 | ImportSessionsDialog - XLSX upload | Reproduzido bug e corrigido | Fixes `386fbb1` + `2c51370`; parser local: 265 linhas válidas / 69 sessões | Rerodar manual em staging e confirmar sessões > 0 |
| 2 | AdminDiagnosticsPage - XLSX batch import | Pendente | Runbook preparado | Executar manual + capturar prints/rede |
| 3 | StudentReportsPage - lazy load | Pendente | Runbook preparado | Executar manual + validar sem crash |
| 4 | Export PDF - download | Pendente | Runbook preparado | Executar manual + validar download |

## Resultado automatizado complementar
- `npm run verify:essential`: PASS
- Testes: 64/64 PASS
- Build: PASS
- Audit high: PASS (0 high/critical)

## Regra de fechamento
- Se 4/4 PASS: atualizar status para `GO produção`
- Se qualquer FAIL: manter `NO-GO`, abrir correção e retestar cenário afetado
