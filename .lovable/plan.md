

## Plano: Implementar Taxonomia de Estabilidade/Posição + Lateralidade Corrigida

### Resumo

Unificar `position` em um eixo único de **Posição/Base de Estabilidade** com 14 níveis ordenados por dificuldade, corrigir **Lateralidade** para 5 opções de dinâmica de execução, e adicionar **Ponte** à lista.

### 1. Database Migration

Renomear coluna `position` → `stability_position` e migrar dados existentes:

```sql
ALTER TABLE exercises_library RENAME COLUMN position TO stability_position;

-- Migrar valores antigos para novos
UPDATE exercises_library SET stability_position = 'em_pe_bilateral' WHERE stability_position = 'em_pe';
-- (mapear solo → quadrupede ou inferir conforme nome)

-- Corrigir laterality
UPDATE exercises_library SET laterality = 'alternada' WHERE laterality = 'alternado';
UPDATE exercises_library SET laterality = NULL WHERE laterality = 'base_assimetrica';
```

### 2. Constantes (`src/constants/backToBasics.ts`)

Substituir `LATERALITY_OPTIONS`:
- `bilateral` — Ambos os lados simultâneos
- `unilateral` — Apenas um lado por vez
- `alternada` — Membros alternados na mesma série
- `contralateral` — Carga no lado oposto
- `ipsilateral` — Carga no mesmo lado

Substituir `POSITION_OPTIONS` por `STABILITY_POSITION_OPTIONS` (14 níveis ordenados):

```text
 1. decubito_dorsal    — Decúbito Dorsal (DD)
 2. decubito_ventral   — Decúbito Ventral (DV)
 3. decubito_lateral   — Decúbito Lateral (DL)
 4. ponte              — Ponte (Bridge)        ← NOVO
 5. quadrupede         — Quadrúpede
 6. prancha            — Prancha
 7. ajoelhado          — Ajoelhado
 8. semi_ajoelhado     — Semi-ajoelhado
 9. sentado            — Sentado
10. em_pe_bilateral    — Em pé (Bilateral)
11. em_pe_assimetrica  — Em pé (Assimétrica)
12. em_pe_split        — Em pé (Split/Passada)
13. em_pe_unilateral   — Em pé (Unilateral)
14. suspenso           — Suspenso (Barra)
```

### 3. Arquivos a editar (6 arquivos + 1 migration)

| Arquivo | Mudança |
|---|---|
| `src/constants/backToBasics.ts` | Novas constantes `LATERALITY_OPTIONS` e `STABILITY_POSITION_OPTIONS` |
| `src/hooks/useExercisesLibrary.ts` | Re-exportar novas constantes |
| `src/pages/ExerciseReviewPage.tsx` | Coluna "Posição/Base" com select, atualizar laterality select |
| `src/components/EditExerciseLibraryDialog.tsx` | Atualizar selects de lateralidade e posição |
| `src/components/AddExerciseDialog.tsx` | Idem |
| `src/pages/ExercisesLibraryPage.tsx` | Filtros e badges atualizados |

### 4. Impacto na IA de Prescrição

O nível numérico (1-14) da `stability_position` poderá ser usado como score de dificuldade postural pela IA, complementando o `boyle_score` existente.

