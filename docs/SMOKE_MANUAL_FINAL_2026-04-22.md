# Smoke Manual Final — 2026-04-22

## Objetivo
Fechar GO/NO-GO funcional no escopo atual, sem expandir features.

## Regras de execucao
- Executar em ambiente autenticado admin no preview.
- Registrar evidencias por cenario: screenshot + resultado observado.
- Classificar cada cenario em `PASS`, `FAIL` ou `BLOQUEADO`.

## Cenario 1 — Importacao de sessoes (arquivo novo)
1. Ir em `Dashboard` -> `Importar Excel`.
2. Selecionar uma planilha com sessoes ainda nao importadas.
3. Confirmar upload ate receber mensagem final.

### Esperado (PASS)
- Toast/dialog com contagem de importadas > 0.
- Lista de sessoes atualizada apos fechar dialog.
- Em detalhe da sessao, `sets/reps/carga` aparecem quando vierem na planilha.
- Horario exibido em `HH:MM` (sem segundos).

## Cenario 2 — Reimportacao da mesma planilha (duplicados)
1. Repetir upload da mesma planilha do Cenario 1.

### Esperado (PASS)
- Mensagem explicita de duplicadas ignoradas.
- Sem erro bloqueante.
- Sem criacao de novas sessoes.

## Cenario 3 — Relatorio de aluno
1. Ir em `Alunos` -> abrir um aluno com sessoes no periodo.
2. Entrar em `Relatorios`.
3. Gerar relatorio (30, 60 ou 90 dias) com exercicios validos.

### Esperado (PASS)
- Geracao conclui sem fechar tela com erro.
- Novo relatorio aparece na lista.
- Datas exibidas em `dd/MM/yyyy`.

## Cenario 4 — Exportacao PDF
1. Abrir um relatorio concluido.
2. Acionar `Exportar PDF`.

### Esperado (PASS)
- Download inicia e conclui.
- Arquivo abre sem erro.
- Campos nulos exibem fallback (`--`) sem quebrar renderizacao.

## Cenario 5 — Oura (abas do aluno)
1. Abrir aluno com conexao Oura ativa.
2. Revisar abas `Treinamento`, `Visao geral` e `Oura - Historico`.

### Esperado (PASS)
- Sem card duplicado/inconsistente entre abas.
- Metricas de prontidao/sono/FCR carregam quando houver dados.
- Card agudo mostra apenas o que existe:
  - FC aguda visivel quando disponivel.
  - HRV oculta quando indisponivel (sem ruido visual).

## Criterio de fechamento
- `GO`: todos os cenarios em `PASS`.
- `NO-GO`: qualquer `FAIL` em cenario funcional critico (import, relatorio, PDF, Oura).
- `BLOQUEADO`: ausencia de dados reais para executar cenario (documentar causa e proximo passo).

## Registro final (preencher apos execucao)
| Cenario | Status | Evidencia | Observacao |
|---|---|---|---|
| 1. Importacao novo arquivo |  |  |  |
| 2. Reimportacao duplicados |  |  |  |
| 3. Geracao de relatorio |  |  |  |
| 4. Exportacao PDF |  |  |  |
| 5. Oura abas do aluno |  |  |  |

