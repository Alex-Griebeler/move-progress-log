

# Ajuste dos Titulos das Colunas — Modo TV e Modo Normal

## Objetivo

Centralizar, colocar em uppercase e ajustar o texto dos headers da tabela de exercicios nos dois modos: o card normal (PrescriptionCard) e o overlay fullscreen (PrescriptionTVMode).

## Alteracoes

### 1. `src/components/PrescriptionTVMode.tsx` (Modo TV)

- Todos os `<th>`: adicionar `text-center uppercase tracking-wider`
- Header "Exercício": mudar de `text-left` para `text-center`
- Header "Obs.": mudar de `text-left` para `text-center` e renomear para `OBS`
- Celula de observacoes: mudar de `text-left` para `text-center`

### 2. `src/components/PrescriptionCard.tsx` (Modo Normal)

- Todos os `<TableHead>`: adicionar `text-center uppercase tracking-wider`
- Header "Exercicio": ja possui `font-semibold`, adicionar `text-center uppercase tracking-wider`
- Header "Obs.": mudar para `text-center uppercase tracking-wider` e renomear para `OBS`
- Celula de observacoes: mudar alinhamento para `text-center`

```text
Elemento              Antes                          Depois
────────────────────────────────────────────────────────────────
Headers (ambos)       mix de text-left/text-center    todos text-center uppercase tracking-wider
Texto "Obs."          "Obs."                          "OBS"
Celula observacoes    text-left                       text-center
```

Apenas mudancas de classes Tailwind e texto. Nenhuma alteracao de logica ou banco de dados.

