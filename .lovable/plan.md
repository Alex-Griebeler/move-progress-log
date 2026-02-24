

# Auditoria de Padronizacao: Botoes, Titulos e Cabecalhos

## Diagnostico

Apos analise completa de todos os arquivos do sistema, identifiquei as seguintes inconsistencias:

---

### A. BOTOES — Problemas Encontrados

**A1. `variant="gradient"` ainda em uso (deveria ser `"default"`)**

O variant `gradient` foi mapeado visualmente para o mesmo estilo de `default` no `button.tsx`, mas semanticamente continua sendo usado em 6 arquivos como se fosse um variant especial. Isso causa confusao e deve ser substituido por `default`:

| Arquivo | Linha | Uso Atual | Correcao |
|---|---|---|---|
| `StudentsPage.tsx` | 353 | `variant="gradient"` (Adicionar aluno) | `variant="default"` |
| `StudentDetailPage.tsx` | 285 | `variant="gradient"` (Registrar Sessao) | `variant="default"` |
| `StudentDetailPage.tsx` | 492 | `variant="gradient"` (Registrar Primeira Sessao) | `variant="default"` |
| `PrescriptionsPage.tsx` | 358 | `variant="gradient"` (Nova Prescricao) | `variant="default"` |
| `AddStudentDialog.tsx` | 493 | `variant="gradient"` (submit) | `variant="default"` |
| `EditStudentDialog.tsx` | 494 | `variant="gradient"` (submit) | `variant="default"` |
| `AddWorkoutDialog.tsx` | 128 | `variant="gradient"` size="lg" (trigger) | `variant="default"` |
| `AddWorkoutDialog.tsx` | 258 | `variant="gradient"` (submit) | `variant="default"` |

**A2. Tamanhos inconsistentes em botoes de acao principal de pagina**

| Pagina | Botao Principal | Size Atual | Size Padrao |
|---|---|---|---|
| Dashboard | Registrar Sessao (AddWorkoutDialog) | `size="lg"` | `size="default"` |
| StudentsPage | Adicionar aluno | sem size (default) | OK |
| PrescriptionsPage | Nova Prescricao | `size="sm"` | `size="default"` |
| SessionsPage | Registrar sessao | sem size (default) | OK |
| AdminUsersPage | Adicionar usuario | sem size (default) | OK |

**A3. `animate-pulse` no botao "Registrar Sessao"**

Em `StudentDetailPage.tsx` linha 284, o botao tem `animate-pulse hover:animate-none`. Isso e um anti-pattern — botoes nao devem pulsar. Deve ser removido.

**A4. Remover variants legados do button.tsx**

Os variants `gradient` e `premium` podem ser removidos do `buttonVariants` em `button.tsx` apos a migracao, pois sao identicos a `default`.

---

### B. TITULOS E CABECALHOS — Problemas Encontrados

**B1. Dois componentes de header concorrentes**

- `AppHeader` usa `text-[1.75rem]` (28px) — correto, Apple-aligned
- `PageHeader` usa `text-4xl` (36px) — excessivo para gestao

Paginas que usam cada um:

| Componente | Paginas |
|---|---|
| `AppHeader` | Dashboard (Index), StudentsPage, RecoveryProtocolsPage, StudentsComparisonPage |
| `PageHeader` | SessionsPage, AdminUsersPage, PrescriptionsPage, ExercisesLibraryPage |
| Nenhum (inline) | StudentReportsPage (`text-3xl font-bold`), StudentDetailPage (nome do aluno `text-2xl md:text-3xl`) |

**B2. PageHeader com `text-4xl` deve ser reduzido para `text-[1.75rem]`**

Para consistencia com `AppHeader`, o `PageHeader` deve usar o mesmo tamanho de titulo.

**B3. StudentReportsPage com titulo inline**

Usa `<h1 className="text-3xl font-bold">` diretamente, sem usar `AppHeader` ou `PageHeader`. Deve ser migrado para `PageHeader`.

**B4. Subtitulos inconsistentes**

- `AppHeader`: `text-base text-muted-foreground/80`
- `PageHeader`: `text-lg text-muted-foreground`

Devem ser unificados para `text-base text-muted-foreground`.

**B5. Classes decorativas residuais**

- `StatCard.tsx`: ainda usa `gradient-card-subtle`, `gradient-card-emphasis`, `card-glass-hover`
- Skeletons: usam `card-glass` (glass morphism)
- `StudentOverviewDashboard.tsx`: usa `card-glass-hover bg-gradient-card`
- `PrescriptionCard.tsx`: usa `card-glass-hover`

Esses efeitos devem ser simplificados para alinhamento Apple.

---

## Plano de Implementacao

### Sprint 1 — Botoes (30 min)

1. **Substituir todos os `variant="gradient"` por `variant="default"`** nos 6 arquivos listados em A1
2. **Padronizar tamanhos**: corrigir `AddWorkoutDialog` trigger de `size="lg"` para `size="default"`, e `PrescriptionsPage` de `size="sm"` para sem size
3. **Remover `animate-pulse`** do botao em `StudentDetailPage.tsx`
4. **Limpar button.tsx**: remover os variants `gradient` e `premium` do `buttonVariants` (ja nao serao usados)

### Sprint 2 — Titulos e Cabecalhos (1h)

5. **Padronizar `PageHeader`**: alterar `text-4xl` para `text-[1.75rem]` e subtitulo de `text-lg` para `text-base text-muted-foreground`
6. **Migrar `StudentReportsPage`**: substituir titulo inline por `PageHeader`
7. **Remover classes decorativas dos cards**:
   - `StatCard.tsx`: remover `gradient-card-subtle`, `gradient-card-emphasis`, `card-glass-hover` — usar apenas `bg-card border`
   - Skeletons (5 arquivos): substituir `card-glass` por classe vazia
   - `StudentOverviewDashboard.tsx`: remover `card-glass-hover bg-gradient-card`
   - `PrescriptionCard.tsx`: remover `card-glass-hover`

### Sprint 3 — Limpeza CSS (20 min)

8. **Remover do `index.css`** as classes que nao serao mais usadas:
   - `.text-gradient-primary`
   - `.gradient-card-subtle`
   - `.gradient-card-emphasis`
   - `.bg-gradient-card`
   - `.card-glass` e `.card-glass-hover`

---

## Resultado Esperado

- **Botoes**: Todos os botoes de acao principal usam `variant="default"` com `size="default"`. Sem gradientes, sem animacoes pulsantes. Hierarquia clara: `default` (primario) > `outline` (secundario) > `ghost` (terciario) > `destructive` (perigoso).
- **Titulos**: Todas as paginas usam 28px (`text-[1.75rem]`) bold, cor solida `text-foreground`, sem gradientes.
- **Cards**: Sem glass morphism nem gradientes decorativos. Fundo solido `bg-card` com borda sutil.

