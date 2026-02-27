

# Exercícios de Arremesso com Medicine Ball — Lista Completa por Progressão

## Contexto

Criar e inserir na `exercises_library` uma lista completa de arremessos com Medicine Ball, organizados por progressão de posição (deitado → ajoelhado → semi-ajoelhado → em pé → base assimétrica → unilateral) e nos 3 planos de movimento (sagital, frontal, transverso).

**Categoria:** `potencia_pliometria`
**Subcategoria:** `potencia`
**Equipamento:** `Medicine Ball`

---

## Lista de Exercícios (ordem crescente de dificuldade)

### Nível 1-2 — Deitado (Supino / Decúbito)
| # | Nome | Plano | Lateralidade | Nível |
|---|------|-------|-------------|-------|
| 1 | Arremesso Peito Supino MB | Sagital | Bilateral | 1 |
| 2 | Arremesso Overhead Supino MB | Sagital | Bilateral | 1 |
| 3 | Arremesso Rotacional Supino MB | Transverso | Unilateral | 2 |

### Nível 2-3 — Ajoelhado (ambos os joelhos)
| # | Nome | Plano | Lateralidade | Nível |
|---|------|-------|-------------|-------|
| 4 | Arremesso Peito Ajoelhado MB | Sagital | Bilateral | 2 |
| 5 | Arremesso Overhead Ajoelhado MB | Sagital | Bilateral | 2 |
| 6 | Arremesso Lateral Ajoelhado MB | Frontal | Unilateral | 3 |
| 7 | Arremesso Rotacional Ajoelhado MB | Transverso | Unilateral | 3 |

### Nível 3-4 — Semi-Ajoelhado (half-kneeling)
| # | Nome | Plano | Lateralidade | Nível |
|---|------|-------|-------------|-------|
| 8 | Arremesso Peito Semi-Ajoelhado MB | Sagital | Base Assimétrica | 3 |
| 9 | Arremesso Overhead Semi-Ajoelhado MB | Sagital | Base Assimétrica | 4 |
| 10 | Arremesso Lateral Semi-Ajoelhado MB | Frontal | Base Assimétrica | 4 |
| 11 | Arremesso Rotacional Semi-Ajoelhado MB | Transverso | Base Assimétrica | 4 |

### Nível 5-6 — Em Pé Bilateral
| # | Nome | Plano | Lateralidade | Nível |
|---|------|-------|-------------|-------|
| 12 | Arremesso Peito em Pé MB | Sagital | Bilateral | 5 |
| 13 | Arremesso Overhead em Pé MB | Sagital | Bilateral | 5 |
| 14 | Arremesso Lateral em Pé MB | Frontal | Bilateral | 5 |
| 15 | Arremesso Rotacional em Pé MB | Transverso | Bilateral | 6 |
| 16 | Arremesso Scoop em Pé MB | Sagital | Bilateral | 6 |

### Nível 6-7 — Em Pé Base Assimétrica (split stance)
| # | Nome | Plano | Lateralidade | Nível |
|---|------|-------|-------------|-------|
| 17 | Arremesso Peito Split Stance MB | Sagital | Base Assimétrica | 6 |
| 18 | Arremesso Overhead Split Stance MB | Sagital | Base Assimétrica | 7 |
| 19 | Arremesso Rotacional Split Stance MB | Transverso | Base Assimétrica | 7 |
| 20 | Arremesso Lateral Split Stance MB | Frontal | Base Assimétrica | 7 |

### Nível 7-9 — Em Pé Unilateral (single leg)
| # | Nome | Plano | Lateralidade | Nível |
|---|------|-------|-------------|-------|
| 21 | Arremesso Peito UNL em Pé MB | Sagital | Unilateral | 7 |
| 22 | Arremesso Overhead UNL em Pé MB | Sagital | Unilateral | 8 |
| 23 | Arremesso Rotacional UNL em Pé MB | Transverso | Unilateral | 8 |
| 24 | Arremesso Lateral UNL em Pé MB | Frontal | Unilateral | 9 |
| 25 | Arremesso Rotacional c/ Step UNL MB | Transverso | Unilateral | 9 |

---

## Implementacao Tecnica

### 1. Inserir 25 exercícios no banco de dados
- Tabela: `exercises_library`
- Campos preenchidos: `name`, `category` (potencia_pliometria), `subcategory` (potencia), `movement_plane`, `laterality`, `numeric_level` (1-9), `level` (Iniciante/Intermediário/Avançado), `risk_level`, `equipment_required` (Medicine Ball), `tags`
- Usar SQL INSERT via ferramenta de dados (não migration)

### 2. Atualizar import-exercises edge function
- Adicionar mapeamento para subcategoria `potencia` caso arremessos venham do JSON oficial no futuro

### 3. Nenhuma alteração de UI necessária
- Os exercícios aparecerão automaticamente no combobox de seleção ao buscar por "arremesso" ou filtrar por categoria "Potência & Pliometria"

