# Error Checklist Operacional (Fabrik Performance)

## Objetivo
Checklist rápido para triagem de falhas sem sair do escopo do sistema atual.

## 1) Build/CI
- [ ] `npm run lint`
- [ ] `npx tsc --noEmit`
- [ ] `npm run verify:query-safety`
- [ ] `npm run test -- --run`
- [ ] `npm run build`

## 2) Importação de Sessões (Excel)
- [ ] Mensagem de sucesso/duplicata/erro aparece no modal e no toast.
- [ ] `Sessões registradas` atualiza após import.
- [ ] Sessões novas têm exercícios vinculados (`session_id` consistente).
- [ ] Horário exibido em `HH:MM` (sem segundos).

## 3) Oura Sync
- [ ] Aluno com conexão ativa mostra dados de prontidão/sono.
- [ ] Falha de sync retorna mensagem clara (sem erro silencioso).
- [ ] Métricas zero não são tratadas como “ausente”.
- [ ] Dados agudos só aparecem quando disponíveis; sem lixo visual quando indisponíveis.

## 4) Relatórios
- [ ] Geração do relatório conclui com status `completed`.
- [ ] `tracked_exercises` condiz com período selecionado.
- [ ] Exportação PDF abre/baixa sem erro.
- [ ] Campos nulos exibem fallback (`--`) em vez de quebrar render.

## 5) Segurança/Edge Auth
- [ ] `scripts/ci-smoke-edge-auth.sh` passa A1/B1/B2/B3/C1/C2/C3/D0.
- [ ] Service-role tests (A3/B4/C4) rodar apenas em ambiente seguro.
- [ ] Endpoints com `verify_jwt=false` validam role internamente.

## 6) Integridade de Dados (service role)
- [ ] `npm run verify:data-integrity` sem achados críticos.
- [ ] Sem sessões órfãs (sessão sem exercícios).
- [ ] Sem duplicidade em `(student_id, date, time)` fora do esperado.
- [ ] Sem relatório `completed` sem `report_tracked_exercises`.

## 7) Critério GO/NO-GO
- GO: itens 1, 2, 3 e 4 sem falha funcional + smoke auth PASS.
- NO-GO: qualquer falha em integridade, auth ou geração/exportação de relatório.
