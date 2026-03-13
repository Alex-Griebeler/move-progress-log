# Plano Prático 90 Dias (Execução)

## Objetivo
Sair de `GO condicional de staging` para `GO de produção com base operacional escalável`.

## 0-30 dias (curto prazo)

### Meta
Fechar pendências essenciais e consolidar baseline de release.

### Entregáveis
1. 4/4 smoke interativos PASS com evidência.
2. Gate `verify:essential` obrigatório em PR e release.
3. SLO v1 publicado:
   - disponibilidade >= 99.5%
   - sucesso API crítica >= 99.0%
   - p95 < 1500ms
4. Contratos de dados v1 para eventos críticos (sessão, importação, relatório).

### KPI de saída
- 0 bloqueios críticos de release
- 100% cenários críticos com validação rastreável

## 31-60 dias (médio prazo)

### Meta
Reduzir risco operacional e aumentar previsibilidade.

### Entregáveis
1. E2E automatizado para os 4 fluxos críticos.
2. Observabilidade mínima de produção:
   - erro por fluxo
   - latência por endpoint/chave de negócio
   - alertas com owner
3. Hardening padronizado para funções com `verify_jwt=false` (checklist único).
4. Playbook de incidentes + rollback validado em simulação.

### KPI de saída
- queda de incidentes regressivos em release
- MTTR documentado e monitorado

## 61-90 dias (longo prazo)

### Meta
Preparar o módulo para papel de plataforma global.

### Entregáveis
1. Contratos versionados entre módulos do ecossistema Fabrik.
2. Event schema formal com `contract_version` e ownership por domínio.
3. Plano de escalabilidade:
   - multi-tenant readiness
   - budget de custo por fluxo
   - capacidade de throughput para importações
4. Governance de qualidade contínua:
   - release train
   - quality scorecard mensal

### KPI de saída
- previsibilidade de release enterprise
- base pronta para integração global sem retrabalho estrutural

## Riscos e mitigação

1. Dependência de validação manual tardia
   - Mitigação: converter smoke crítico em E2E automatizado
2. Crescimento de endpoints sensíveis sem padrão único
   - Mitigação: template de segurança obrigatório por função
3. Débito de observabilidade
   - Mitigação: SLO + dashboards + alertas com owner

## Critério final de sucesso (90 dias)
- GO produção sustentado por:
  - validação automatizada + manual rastreável
  - segurança operacional consistente
  - governança de dados e integração preparada para plataforma
