# Precision 12 — Relatorio de fechamento do E5 Evidence Layer

**Data:** 2026-05-16
**Status:** E5 fechado como GO funcional, com limites documentados
**Escopo:** Evidence Layer clinico-operacional read-only para Coach Console Precision 12
**Fora de escopo:** E6 PDF, novas queries de resultados fisicos, ranges populacionais, mutations, migrations, RPCs e edge functions

---

## 1. Resumo executivo

O E5 estabeleceu a camada de evidencias clinico-operacionais do Precision 12 e conectou um preview read-only ao Coach Console.

A entrega final cobre:

- catalogo de claims clinicas com linguagem associativa e nao diagnostica;
- referencias cientificas mais robustas para os testes cobertos;
- derivacao pura de claims a partir de dados de avaliacao;
- cards read-only com fontes, acao para o coach e aviso clinico;
- preview no Coach Console para PAR-Q + sono/estresse/energia/adesao;
- agrupamento por aluno, respeitando filtros e ocultacao de dados de teste;
- hardening visual e semantico da fila, dialog e preview apos auditorias.

O E5 nao altera banco, nao cria edge function, nao cria RPC e nao introduz escrita de dados. A unica superficie nova em producao e leitura/renderizacao no frontend.

---

## 2. PRs e SHAs

| Etapa | PR | SHA em main | Resumo |
|---|---:|---|---|
| E5.1 | #146 | `20d5795` | Foundation do Evidence Layer: tipos, catalogo inicial, principios e safety tests |
| E5.2 | #147 | `0332ca3` | Expansao do catalogo para 26 claims e referencias mais robustas |
| E5.3 | #148 | `1e27de8` | Derivacao pura `Precision12EvidenceInput -> EvidenceClaim[]` |
| E5.4 | #149 | `a398365` | UI read-only: `EvidenceClaimCard` e `EvidenceClaimList` |
| E5.5 | #150 | `65f1abb` | Preview integrado ao Coach Console usando dados ja carregados |
| E5.6a | #151 | `6a8a4f1` | Coerencia fila/preview: filtros, agrupamento por aluno, dedup e ordenacao |
| E5.6b | #152 | `5f27c48` | Hardening UI/UX: microcopy, headings, dialog e ordem de CTAs |
| E5.6c | #153 | `209a998` | Ajuste de densidade da fila, anchor visual e copy de limitacoes |

---

## 3. Funcionalidades entregues

### 3.1 Catalogo de evidencias

Arquivo principal: `src/utils/precision12Evidence.ts`

O catalogo consolidado tem **26 claims** distribuidas nos 7 dominios do E5:

- VO2 max;
- recuperacao de frequencia cardiaca em 1 minuto;
- handgrip;
- sit-to-stand;
- DEXA / composicao corporal;
- PAR-Q;
- sono, estresse, energia e adesao.

Cada claim segue o contrato:

- dominio e metrica;
- classificacao;
- valor observado opcional;
- interpretacao associativa;
- resumo da evidencia;
- acao para o coach;
- nivel de linguagem de risco;
- fontes;
- disclaimer;
- quatro principios de seguranca.

### 3.2 Guardrails de linguagem clinica

O E5 reforca que o app nao diagnostica. A camada evita termos proibidos e valida:

- sem linguagem causal absoluta;
- sem prometer resultado;
- sem substituir laudo clinico;
- DEXA sempre com disclaimer de laudo da clinica parceira;
- PAR-Q blocked orienta revisao/encaminhamento, nao prescricao;
- `actionable` aparece como **Proximo passo**, nao como emergencia.

### 3.3 Derivacao pura

Arquivo principal: `src/utils/precision12EvidenceDerivation.ts`

Foi criada uma camada pura que recebe `Precision12EvidenceInput` e retorna `EvidenceClaim[]` sem fetch, sem hook e sem side effect.

Comportamentos importantes:

- classificacoes desconhecidas sao ignoradas silenciosamente;
- `classification` e `observedValue` sao trimados;
- DEXA suporta multiplos marcadores em ordem fixa;
- PAR-Q trata `true`, `false`, `null` e `undefined` de forma defensiva;
- adesao suporta flags individuais e claim agregada quando ha pelo menos 2 sinais.

### 3.4 UI read-only de claims

Arquivos principais:

- `src/components/precision12/evidence/EvidenceClaimCard.tsx`
- `src/components/precision12/evidence/EvidenceClaimList.tsx`

Cada card mostra:

- dominio;
- classificacao;
- metrica e valor observado, quando houver;
- interpretacao;
- resumo da evidencia;
- acao para o coach;
- fontes com links externos declarativos;
- aviso clinico em `Alert` com icone;
- principios apenas por prop de debug.

A UI nao tem botao mutavel, nao chama backend, nao escreve storage e nao abre janela automaticamente.

### 3.5 Preview no Coach Console

Arquivos principais:

- `src/components/precision12/evidence/Precision12EvidencePreview.tsx`
- `src/utils/precision12EvidenceMapping.ts`
- `src/components/precision12/Precision12Console.tsx`

O preview usa apenas dados ja carregados pelo hook do Coach Console:

- `students`;
- `assessments`;
- `questionnaire_responses`.

Nesta fase, a cobertura visual em producao e deliberadamente conservadora:

- PAR-Q;
- sono;
- estresse;
- energia;
- barreiras e risco agregado de adesao.

Nao ha query nova para VO2, handgrip, sit-to-stand ou ranges populacionais. DEXA tambem nao emite claim ainda porque a classificacao por marcador exige cortes por sexo/idade.

### 3.6 Coerencia com filtros do console

O preview respeita os mesmos filtros operacionais:

- busca por aluno;
- ocultar dados de teste;
- filtro de progresso;
- filtro que zera alunos tambem zera o preview com microcopy propria.

O agrupamento final e por aluno, nao por UUID tecnico.

### 3.7 Hardening visual final

E5.6b/E5.6c estabilizaram detalhes de UX:

- heading hierarchy com H2 `sr-only` para a tab Precision 12;
- card de evidencia rotulado pelo H3 da secao, sem `CardTitle` duplicado;
- anchor visual `Triagem operacional` no header do preview;
- fila com ordem de botoes `Abrir -> Gerar novo link -> Revogar`;
- microcopy consistente: `Gerar novo link`;
- botao `Revogar` com cores `rose-*` legiveis em dark mode;
- coluna Acoes ajustada para `w-[360px]`;
- Status/Data/Idade e badge de alerta com `whitespace-nowrap`;
- wrapper da tabela com `overflow-x-auto` para viewports menores.

---

## 4. Smokes e validacoes

### 4.1 Smokes em producao

| Etapa | Resultado |
|---|---|
| E5.5 preview | GO: preview apareceu em producao, agrupado por nome do aluno, nao UUID |
| E5.6c bundle | GO parcial: bundle publicado contem `w-[360px]`, `overflow-x-auto`, `whitespace-nowrap`, `Triagem operacional` e copy corrigida |

### 4.2 Limitacao do smoke E5.6c

O smoke visual autenticado completo do E5.6c nao foi concluido nesta sessao porque a sessao Playwright abriu em `/auth` e a rota `/coach-console` redirecionou para login.

Foi validado estaticamente no bundle publicado:

- chunk servido: `CoachConsole-bc2qf-9W.js`;
- `w-[360px]` presente;
- `w-[380px]` ausente;
- `w-[340px]` ausente;
- `overflow-x-auto` presente;
- `whitespace-nowrap` presente;
- `Triagem operacional` presente;
- `Sinal clinico relevante do questionario` presente;
- `dispara atencao clinica` ausente;
- `na fila do coach` ausente.

Smoke visual pendente, quando houver sessao logada:

- medir rows da fila voltando para aproximadamente 77-85px;
- confirmar Status/Data em uma linha;
- confirmar scroll horizontal em viewport menor;
- confirmar header do preview com `Triagem operacional`.

### 4.3 Gates locais reportados ao longo do E5

Ao longo dos PRs do E5, os gates foram executados repetidamente:

- `git diff --check`;
- `npm run lint`;
- `npx tsc --noEmit` quando aplicavel/localmente viavel;
- `npm run test -- --run`;
- `npm run build`.

No fechamento do E5.6c, a suite estava em **693 passed / 33 skipped**.

---

## 5. Garantias de escopo

| Categoria | Status |
|---|---|
| Migration SQL | Nao introduzida no E5 |
| RPC | Nao introduzida no E5 |
| Edge function | Nao introduzida no E5 |
| Mutacao direta de tabela | Nao introduzida no E5 |
| Storage de token/link | Nao introduzido no E5 |
| PDF / E6 | Nao iniciado |
| Query nova no E5.5/E5.6 preview | Nao introduzida |
| Texto clinico fora do catalogo | Evitado; cards renderizam claims catalogadas |

---

## 6. Limitacoes atuais

### 6.1 Dominios com catalogo, mas sem mapper no preview

O catalogo ja tem claims para mais dominios do que o preview consegue alimentar hoje. Ainda nao entram no preview por falta de dados/ranges no hook:

| Dominio | Motivo |
|---|---|
| VO2 max | Hook nao carrega `vo2_results` nem ref ranges |
| FC recovery 1min | Depende de `vo2_results` |
| Handgrip | Hook nao carrega `handgrip_results` nem ref ranges |
| Sit-to-stand | Hook nao carrega `sit_to_stand_results` nem ref ranges |
| DEXA | Hook carrega `dexa_results`, mas classificacao exige cortes por sexo/idade |

### 6.2 Campos de questionario ainda sem claim individual

Hoje alguns campos contribuem ao risco agregado ou sao sinais clinicos relevantes, mas ainda nao tem card proprio:

- `consistency_self_rating`;
- `life_stability`;
- `pain_status`;
- `uses_medications`;
- `has_medical_condition`;
- `injury_surgery_history`.

O E5.6c corrigiu a copy para nao prometer alerta de fila inexistente para esses campos.

### 6.3 Testes de render

A suite segue majoritariamente source-based nos componentes de evidencia. Existe cobertura funcional forte das funcoes puras, mas ainda nao ha render test com Testing Library/jsdom para o `Precision12EvidencePreview`.

---

## 7. Proximos caminhos recomendados

### Opcao A — E5.5b fisicos/ranges

Adicionar fetch/read-only e mappers para:

- VO2;
- FC recovery;
- handgrip;
- sit-to-stand;
- ref ranges necessarios por sexo/idade.

Esta opcao aumenta a utilidade do preview antes de PDF.

### Opcao B — E5.5c DEXA evidence mapper

Adicionar classificacao DEXA usando campos ja existentes em `dexa_results`, mas somente depois de definir cortes por sexo/idade para:

- percentual de gordura;
- gordura visceral;
- android/gynoid;
- ALM/h2;
- FMI.

Como o DEXA vem de clinica parceira, manter disclaimer forte: o app interpreta para acompanhamento de performance/composicao e nao substitui o laudo.

### Opcao C — E5.7 clinical history

Adicionar claims para sinais clinicos do questionario:

- medicacoes;
- condicao medica autorrelatada;
- historico de lesao/cirurgia;
- dor.

Requer wording e fontes adicionais para nao virar linguagem diagnostica.

### Opcao D — E6 PDF

Iniciar PDF somente com decisao explicita de escopo:

- PDF parcial com PAR-Q + adesao agora; ou
- aguardar A/B/C para gerar relatorio mais completo.

Recomendacao: fazer **A ou B antes do E6**, para o PDF nao nascer limitado demais.

---

## 8. Decisao final

**E5: GO funcional.**

A base do Evidence Layer esta pronta, segura e integrada ao Coach Console. O produto ja tem uma camada clinico-operacional read-only com disclaimers, fontes e linguagem controlada.

**Nao ha bloqueio tecnico para encerrar o E5.**

Antes do E6, a decisao principal e de produto: ampliar mappers de dados fisicos/DEXA ou aceitar um PDF inicial parcial focado em PAR-Q + adesao.
