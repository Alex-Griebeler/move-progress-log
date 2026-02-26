# Auditoria de Nomenclatura: Duplicidades e Inconsistencias na Biblioteca de Exercicios

## Resumo da Analise

Foram encontrados **543 exercicios** no banco de dados. A analise identificou **problemas em 3 categorias**: duplicidades semanticas (mesmo exercicio com nomes diferentes), termos em ingles sem equivalente padronizado, e exercicios orfaos (sem subcategoria/nivel).

---

## 1. Duplicidades Semanticas Confirmadas

Exercicios que representam o **mesmo movimento** mas com nomes diferentes:


| Manter (padrao oficial)       | Remover (duplicata)           | Motivo                                                       |
| ----------------------------- | ----------------------------- | ------------------------------------------------------------ |
| **Deadlift BB**               | Deadlift com barra            | "BB" ja significa barra. Usado em 2 prescricoes              |
| **Agachamento frontal BB**    | Front Squat BB                | Mesmo exercicio, um em PT e outro em EN                      |
| **Hip Thrust BB**             | Hip thrust (barra)            | "BB" ja significa barra. Usado em 1 prescricao               |
| **Hip Thrust UNL**            | Hip thrust unilateral         | "UNL" ja significa unilateral. Usado em 1 prescricao         |
| &nbsp;                        | &nbsp;                        | APAGAR HIP THRUSTER BI                                       |
| **Agachamento taça**          | Agachamento Goblet            | "Goblet" e o termo ingles para "taca". Usado em 1 prescricao |
| **Agachamento peso corporal** | Air squat / Agachamento Livre | 3 nomes para o mesmo exercicio                               |


## 2. Termos em Ingles Sem Padronizacao

Exercicios que usam ingles quando ha equivalente na nomenclatura Fabrik:


| Nome atual (ingles)  | Sugestao padronizada (PT)   | Usado em prescricoes? |
| -------------------- | --------------------------- | --------------------- |
| Farmer Walk          | Carregamento BI pos. baixa  | Sim (2x)              |
| Suitcase Carry       | Carregamento UNL pos. baixa | Sim (1x)              |
| Box squat tempo      | Agachamento na caixa tempo  | Nao                   |
| Cossack squat        | Agachamento Cossack         | Nao                   |
| Zercher squat        | Agachamento Zercher         | Nao                   |
| Jump squat (KB)      | Agachamento com salto KB    | Nao                   |
| Kettlebell Swing     | KB Swing                    | Nao                   |
| Lunge lateral (taça) | Lunge lateral (taça)        | Nao                   |


## 3. Exercicios Orfaos (sem subcategoria e/ou nivel)

**29 exercicios** estao sem `subcategory` e/ou `numeric_level` preenchidos. Estes nao foram importados pelo JSON oficial — foram criados manualmente e nao passaram pela padronizacao:

Exemplos: Afundo Caminhando, Agachamento Goblet, Agachamento Livre, Box squat tempo, Deadlift com barra, Farmer Walk, Hip thrust (barra), Hip thrust base assimetrica, Hip thrust unilateral, Jump squat (KB), Kettlebell Swing, Prancha Isometrica, Suitcase Carry, entre outros.

## 4. Inconsistencias Hip Thrust / Hip Thruster

Existem **duas familias de nomes** coexistindo:

- **Hip Thrust** (5 variantes com subcategoria preenchida)
- **Hip Thruster** (2 variantes: BI e UNL, com subcategoria preenchida)

Sugere-se unificar tudo como **Hip Thrust** para consistencia.

---

## Plano de Acao

### Fase 1: Resolver duplicidades (redirecionar prescricoes)

Para cada duplicata com prescricoes vinculadas:

1. Atualizar `prescription_exercises` e `exercises` (historico) para apontar para o exercicio oficial
2. Deletar o exercicio duplicado

### Fase 2: Padronizar nomes em ingles

Renomear os exercicios para a nomenclatura padronizada da Fabrik, mantendo o padrao PT-BR com abreviacoes oficiais.

### Fase 3: Preencher campos faltantes

Atualizar `subcategory` e `numeric_level` dos 29 exercicios orfaos.

### Fase 4: Unificar Hip Thrust/Thruster

Renomear "Hip Thruster BI" para "Hip Thrust" e "Hip Thruster UNL" para "Hip Thrust UNL" (se nao duplicar).

---

## Detalhes Tecnicos

### Arquivos impactados

- **Nenhum arquivo de codigo** precisa ser alterado — todas as mudancas sao no banco de dados
- As operacoes serao feitas via queries SQL (UPDATE + DELETE)

### Sequencia de queries

1. **UPDATE prescription_exercises** — redirecionar `exercise_library_id` das duplicatas para o exercicio oficial
2. **UPDATE exercises** — atualizar `exercise_name` no historico de sessoes
3. **UPDATE exercise_adaptations** — redirecionar se houver adaptacoes vinculadas
4. **DELETE exercises_library** — remover os exercicios duplicados
5. **UPDATE exercises_library** — renomear termos em ingles e preencher campos faltantes

### Seguranca

- Cada operacao sera validada antes da exclusao para garantir que nenhuma referencia fique orfao
- As prescricoes existentes continuarao funcionando normalmente apos o redirecionamento