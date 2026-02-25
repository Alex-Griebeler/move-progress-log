

# Coluna PSE / Carga na Prescrição

## Resumo

Adicionar um campo `prescription_type` na tabela `workout_prescriptions` para distinguir prescrições de grupo vs individual, e um campo `load` na tabela `prescription_exercises` para armazenar a carga. O card da prescrição mostrará dinamicamente "PSE" ou "Carga" conforme o tipo.

---

## Abordagem

A coluna no card será dinâmica:
- **Prescrição de grupo** -> mostra header "PSE" e exibe o valor do campo `pse`
- **Prescrição individual** -> mostra header "Carga" e exibe o valor do campo `load`

Isso é mais limpo do que um header fixo "PSE / Carga" porque evita confusão visual.

---

## Etapas

### 1. Migração de banco de dados

- Adicionar coluna `prescription_type` (text, default `'group'`) na tabela `workout_prescriptions` com valores `'group'` ou `'individual'`
- Adicionar coluna `load` (text, nullable) na tabela `prescription_exercises` para a carga prescrita (texto livre para suportar formatos como "20kg", "Leve", etc.)

### 2. Atualizar tipos TypeScript

- Adicionar `prescription_type` no interface `WorkoutPrescription`
- Adicionar `load` no interface `PrescriptionExercise`

### 3. Atualizar PrescriptionCard

- Receber o `prescription_type` da prescrição pai
- Trocar o header da coluna 3 entre "PSE" e "Carga"
- Exibir `exercise.pse` ou `exercise.load` conforme o tipo

### 4. Atualizar formulários de criação/edição

- Adicionar seletor de tipo (Grupo / Individual) nos dialogs `CreatePrescriptionDialog` e `EditPrescriptionDialog`
- Nos exercícios, mostrar campo "PSE" ou "Carga" conforme o tipo selecionado

---

## Detalhes Técnicos

```text
workout_prescriptions
+--------------------+--------+-----------+
| Campo              | Tipo   | Default   |
+--------------------+--------+-----------+
| prescription_type  | text   | 'group'   |
+--------------------+--------+-----------+

prescription_exercises
+-------+------+----------+
| Campo | Tipo | Nullable |
+-------+------+----------+
| load  | text | Yes      |
+-------+------+----------+
```

SQL da migração:
```sql
ALTER TABLE workout_prescriptions
  ADD COLUMN prescription_type text NOT NULL DEFAULT 'group';

ALTER TABLE prescription_exercises
  ADD COLUMN load text;
```

### Arquivos modificados

- `src/hooks/usePrescriptions.ts` - tipos e queries
- `src/components/PrescriptionCard.tsx` - header dinâmico PSE/Carga
- `src/components/CreatePrescriptionDialog.tsx` - campo tipo
- `src/components/EditPrescriptionDialog.tsx` - campo tipo + campo load nos exercícios

