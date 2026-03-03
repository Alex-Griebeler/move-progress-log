

## Diagnóstico Completo: Exercícios com Campos Incompletos

### Resumo por Categoria

| Categoria | Total | Subcategoria | Plano | Contração | Nível | Lateralidade | Ênfase | Músculos |
|---|---|---|---|---|---|---|---|---|
| **Força/Hipertrofia** | 522 | ❌ 52 | ❌ 67 | ❌ 10 | ❌ 105 | ❌ 12 | ✅ | ✅ |
| **Core/Ativação** | 152 | ❌ 27 | ❌ 5 | ❌ 5 | ❌ 21 | ❌ 45 | ✅ | ✅ |
| **Mobilidade** | 108 | ❌ 8 | ❌ 2 | ❌ 3 | ❌ 8 | ❌ 108 | ❌ 108 | ✅ |
| **Potência/Pliometria** | 93 | ❌ 19 | ✅ | ✅ | ❌ 10 | ❌ 66 | ✅ | ✅ |
| **LMF** | 32 | ✅ | ❌ 10 | ✅ | ✅ | ❌ 31 | ❌ 32 | ✅ |
| **Respiração** | 8 | ✅ | ❌ 8 | ❌ 8 | ✅ | ❌ 8 | ❌ 8 | ❌ 8 |
| **Sem categoria** | 1 | — | — | — | — | — | — | — |

**Total de lacunas a preencher: ~472 campos dispersos.**

---

### Plano: Criar Página de Revisão Manual

Criar uma página administrativa dedicada (`/admin/revisao-exercicios`) com uma tabela editável inline que:

1. **Filtra por categoria e campo faltante** — dropdowns para selecionar "Força > sem subcategoria", "Core > sem lateralidade", etc.
2. **Tabela editável** — cada linha mostra o exercício com campos editáveis inline (selects para campos enumerados, inputs para texto livre)
3. **Salva em lote** — botão para salvar todas as alterações de uma vez via `UPDATE` no banco
4. **Contadores em tempo real** — badges mostrando quantos campos faltam por categoria

### Dados Concretos a Preencher

**Força/Hipertrofia (maiores lacunas):**
- 52 sem `subcategory`: Agachamentos, Bulgarian Split Squats, Lunges, Carries, etc.
- 67 sem `movement_plane`: Afundos, Agachamentos, Barras fixas, Bench Presses, etc.
- 105 sem `level`: Maioria dos exercícios importados da planilha (têm `boyle_score` mas `level` não foi derivado)
- 12 sem `laterality`

**Core/Ativação (27 sem subcategory):**
- Pallof Press, Arm Bar, Bear Crawl, Chops, Dragon Flag, KB TGU, L-Sit, RKC Plank, etc.

**Potência/Pliometria (66 sem lateralidade, 19 sem subcategory):**
- Kettlebell (Arranco, Clean, Thruster), Trenó, Saltos diversos, Complexos

**LMF (31 sem lateralidade, 32 sem ênfase, 10 sem plano):**
- Todos os "LMF adutores", "LMF glúteos", etc. + ativações com banda

**Mobilidade (108 sem lateralidade e ênfase):**
- Estes campos são opcionais para Mobilidade na taxonomia atual — pode ser ignorado

**Respiração (8 exercícios — todos os campos faltam):**
- Estes são protocolos, não exercícios físicos — campos como `laterality`, `movement_plane` não se aplicam

**1 exercício sem categoria:**
- "Suitcase isometria (estático)" — deve ser `forca_hipertrofia` / `carregar`

### Abordagem Técnica

1. **Correções automáticas imediatas** (sem necessidade de revisão manual):
   - Derivar `level` dos 105 registros que têm `boyle_score` (<=2→Iniciante, 3→Intermediário, >=4→Avançado)
   - Preencher `movement_plane` = `sagital` para os 67 de Força baseado em `movement_pattern`
   - Classificar "Suitcase isometria" como `forca_hipertrofia`
   - Marcar campos de Respiração como N/A ou preencher defaults

2. **Revisão manual via UI** para os ~100 registros que precisam de decisão humana:
   - 52 exercícios de Força sem `subcategory`
   - 27 exercícios de Core sem `subcategory`  
   - 19 exercícios de Potência sem `subcategory`
   - 66 exercícios de Potência sem `laterality`

### Implementação

- Criar `src/pages/ExerciseReviewPage.tsx` com tabela editável
- Adicionar rota `/admin/revisao-exercicios`
- Usar componentes existentes (Select, Table, Badge)
- Executar as correções automáticas via migration SQL primeiro
- A página mostra apenas os registros com campos faltantes para preenchimento manual

