# Auditoria final — Biblioteca de exercícios

Data: 2026-05-06

## 1. Resumo

| Métrica | Valor |
|---|---:|
| `exercises.exercise_library_id IS NULL` inicial | 981 |
| `exercises.exercise_library_id IS NULL` atual | 582 |
| Histórico resolvido nesta fase | 399 linhas (40,7%) |
| Histórico restante | 582 linhas (59,3%) |
| Canônicos criados | 6 |
| Linhas normalizadas em `exercises_library` | 28 |

Veredito: a fase segura de automação está encerrada. Os 582 registros restantes dependem de evidência ou decisão manual para não consolidar exercícios diferentes por engano.

## 2. Canônicos Criados

Todos os itens abaixo foram criados em `exercises_library` com `category = forca_hipertrofia`.

| Nome | ID | Pattern / subcategoria | Equipamento | Lateralidade | Plano | Contração | Nível |
|---|---|---|---|---|---|---|---|
| Puxada vertical nas argolas | `016a28ca-9438-495b-87dc-83e7034b2bc6` | puxar / vertical | argolas | bilateral | sagital | Concêntrica-Excêntrica | Avançado |
| Stiff com halteres | `36e51cb6-ec48-4cb3-a8cb-f7c000ff72cc` | cadeia_posterior / rdl_stiff | db | bilateral | sagital | Concêntrica-Excêntrica | Intermediário |
| Hip Thrust BB c/ banda elástica | `b6b834c8-1c98-4ef7-afd1-5267c84be182` | cadeia_posterior / ênfase_quadril | barra\|banco, super_band | bilateral | sagital | Concêntrica-Excêntrica | Intermediário |
| RDL KB duplo no step | `e4fc0b96-c4e3-4787-b687-adb3640a9ba5` | cadeia_posterior / rdl_stiff | kb, step | bilateral | sagital | Concêntrica-Excêntrica | Avançado |
| Remada supinada nas argolas | `d156eeff-f014-40e4-b5f8-932dd25fed44` | puxar / horizontal | argolas | bilateral | sagital | Concêntrica-Excêntrica | Intermediário |
| Push Press unilateral Landmine | `a7b97c17-26d6-473c-b91c-0dbf00a86c06` | empurrar / vertical | landmine | unilateral | sagital | Concêntrica-Excêntrica | Avançado |

## 3. Normalizações Aplicadas

| Check | Antes | Depois | Linhas |
|---|---:|---:|---:|
| `movement_plane = 'sagittal'` | 5 | 0 | 5 |
| `movement_pattern = 'none'` | 1 | 0 | 1 |
| `level = 'Interm./Avançado'` | 18 | 0 | 18 |
| `level = 'Iniciante/Interm.'` | 4 | 0 | 4 |

Checks finais:

| Check | Resultado |
|---|---:|
| FK inválida em `exercises.exercise_library_id` | 0 |
| `forca_hipertrofia` sem `movement_pattern` | 0 |
| `movement_plane = 'sagittal'` | 0 |
| `movement_pattern = 'none'` | 0 |
| Levels abreviados normalizados acima | 0 |

## 4. Top Legados Ainda Sem FK

Top 30 nomes em `exercises` ainda com `exercise_library_id IS NULL`:

| Nome legado | Linhas | Observação |
|---|---:|---|
| Hip Thrust | 40 | Genérico; equipamento não comprovado |
| Remada unilateral | 21 | Genérico; variação/equipamento não comprovados |
| Agachamento Sumô (barra) | 19 | Sem canônico exato para barra |
| Press unilateral | 19 | Genérico; landmine/DB/KB não comprovados |
| Remada curvada supinada | 17 | Pegada explícita; equipamento não comprovado |
| Puxada nas argolas | 15 | Ambíguo: vertical vs horizontal |
| Remada Aberta | 15 | Equipamento não comprovado |
| Rosca bíceps | 12 | Genérico |
| Chop swing | 11 | Movimento híbrido; canônico não definido |
| Afundo kettlebell duplo | 10 | Sem canônico exato |
| Remada | 9 | Genérico demais; manter sem match até evidência |
| Barra fixa | 8 | Evidência de assistência com elástico, sem canônico específico |
| Lunge à frente | 8 | Candidato existe, mas carga/equipamento não comprovados |
| Remada nas argolas (peso corporal) | 8 | Aberta vs fechada não comprovado |
| Rosca bíceps halter duplo | 8 | Sem canônico específico |
| Walking lunge (par KB) | 8 | Sem canônico específico |
| Remada aberta TRX | 7 | Decidir se TRX consolida com argolas |
| Jump squat (KB) | 6 | Sem canônico específico |
| Puxada na polia alta (supinada) | 6 | Sem canônico específico |
| Supino Inclinado (barra) | 6 | Sem canônico exato |
| Agachamento búlgaro (pegada taça) | 5 | Consolidar com demais grafias somente após decisão |
| Agachamento búlgaro taça | 5 | Duplicidade de grafia |
| Agachamento com barra (elástico verde) | 5 | Sem canônico barra + elástico |
| Carry unilateral KB | 5 | Depende da normalização de carries |
| Kettlebell Deadlift | 5 | Sem canônico específico |
| Leg Press 45° | 5 | Fora do escopo; Fabrik não usa máquinas |
| Panturrilha em Pé | 5 | Sem canônico de força específico |
| Remada aberta na barra (PB) | 5 | Sem canônico específico |
| Remada nas argolas | 5 | Aberta vs fechada não comprovado |
| Supino Inclinado (DB) | 5 | Sem canônico exato |

## 5. Inconsistências Restantes

| Área | Problema | Tratamento recomendado |
|---|---|---|
| Farmer / Carry | `Farmer carry`, `Farmers Carry`, `Farmers Walk (Core)` e `Farmer isometria` coexistem | Consolidar em bloco curado, preservando carry dinâmico vs isométrico |
| Equipamentos | `kb`, `kettlebell`, `Kettlebell`, `db`, `halter`, `halteres`, `peso_corporal`, `peso corporal`, `nenhum` | Criar dicionário canônico antes de atualizar em massa |
| Tokens compostos | Itens como `barra\|banco`, `halter\|kettlebell\|kettlebell` e ordens diferentes | Normalizar com regra explícita e idempotente |
| Argolas | Puxada vertical, remadas horizontais abertas/fechadas e pegada supinada não podem ser misturadas | Separar por plano e pegada |
| Nomes genéricos | Hip Thrust, Remada, Press unilateral, Rosca bíceps | Exigir evidência de sessão ou decisão manual |
| Máquinas | `Leg Press 45°` aparece no legado | Manter fora do catálogo; não criar canônico de máquina |

## 6. Riscos De Automação Excessiva

- Consolidar equipamentos diferentes destrói histórico de carga e progressão.
- Perder pegada ou largura de remada achata análise biomecânica.
- Misturar puxada vertical com remada horizontal corrompe volume por plano/pattern.
- Mapear máquinas inexistentes cria exercícios fantasmas no catálogo.
- Aplicar canônico em nomes genéricos sem evidência atribui equipamento errado a cargas reais.

## 7. Recomendação Operacional

1. Não fazer novos updates em massa nos 582 registros restantes.
2. Revisar manualmente por blocos: Hip Thrust, remadas, argolas, carries/Farmer, búlgaros e supinos inclinados.
3. Manter `Leg Press 45°` e demais máquinas fora do catálogo.
4. Normalizar `equipment_required` em PR separado, com dicionário canônico e validação antes/depois.
5. Para dados novos, exigir `exercise_library_id` na origem sempre que houver match exato único; quando não houver, reportar o nome sem bloquear a importação.
