

# Fontes Maiores no Card de Prescricao (Modo TV)

## Objetivo

Aumentar significativamente o tamanho das fontes da tabela de exercicios no PrescriptionCard para que os alunos consigam ler a distancia em uma TV na area de treino.

## Alteracoes

### PrescriptionCard.tsx

Ajustar os tamanhos de fonte em todo o card:

- **Titulo da prescricao**: de `text-2xl` para `text-4xl`
- **Objetivo**: de `text-base` para `text-xl`
- **Data**: de `text-sm` para `text-base`
- **Headers da tabela** (Exercicio, Sets x Reps, PSE/Carga, Metodo, Obs): de tamanho padrao para `text-lg`
- **Celulas da tabela**:
  - Nome do exercicio: adicionar `text-lg`
  - Sets x Reps / Int: adicionar `text-lg`
  - Intensidade (PSE/Carga): de `text-sm` para `text-lg`
  - Badge do metodo: de `text-xs` para `text-sm`
  - Observacoes: de `text-sm` para `text-base`
- **Padding das celulas**: aumentar de `p-4` para `p-5` no componente Table ou inline

### Detalhes Tecnicos

Todas as mudancas sao apenas em classes Tailwind no arquivo `src/components/PrescriptionCard.tsx`. Nenhuma alteracao de banco de dados ou logica necessaria.

```text
Elemento                  Antes         Depois
─────────────────────────────────────────────────
Titulo                    text-2xl      text-4xl
Objetivo                  text-base     text-xl
Data                      text-sm       text-base
Header tabela             (default)     text-lg
Exercicio (celula)        (default)     text-lg
Sets x Reps (celula)      (default)     text-lg
Intensidade               text-sm       text-lg
Badge metodo              text-xs       text-sm
Observacoes               text-sm       text-base
```
