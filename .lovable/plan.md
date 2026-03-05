## Recomendação: Criar campo separado `surface_modifier`

### Raciocínio

Esses modificadores (pé na parede, pé elevado, déficit, pés elevados) **não são posições** — são **variações de superfície/apoio** que se combinam com qualquer posição. Exemplo:

- Split Squat `em_pe_split` + `pe_parede` 
- Split Squat `em_pe_split` + `pe_elevado`
- RDL `em_pe_unilateral` + `deficit`
- Hip Thrust `ponte` + `pes_elevados`

Se adicionarmos ao eixo de posição, teríamos explosão combinatória (14 posições × 6 modificadores = 84 opções). Um campo separado mantém a taxonomia limpa e combinável.

### Proposta de valores para `surface_modifier`

| Chave | Label | Exemplo |
|---|---|---|
| `nenhum` | Nenhum | Padrão, sem modificador |
| `pe_parede` | Pé de trás na parede | Split Squat pé na parede |
| `pe_elevado` | Pé da frente elevado | Bulgarian Split Squat |
| `pes_elevados` | Pés elevados | Flexão pés no banco |
| `deficit` | Déficit | RDL déficit, Step-up déficit |
| `slide` | Slide/Deslizante | Hamstring slide, Lateral slide |
| `suspenso_trx` | Suspenso (TRX/Anéis) | Row TRX, Flexão TRX |

### Implementação

1. **Migration**: `ALTER TABLE exercises_library ADD COLUMN surface_modifier text DEFAULT 'nenhum'`
2. **Constantes**: Adicionar `SURFACE_MODIFIER_OPTIONS` em `backToBasics.ts`
3. **UI**: Adicionar select na página de revisão e nos dialogs de edição/criação
4. **Classificação em lote**: SQL heurístico para preencher ~50-80 exercícios que já contêm essas palavras-chave no nome
5. **Hook**: Atualizar `useExercisesLibrary.ts` com o novo campo

Total: 1 migration + 5 arquivos editados.

---

# Plano de Revisão Geral — Etapas

## Etapa 1 — Corrigir bug de rota (rápido)
- [ ] StatCard "Alunos Ativos" navega para `/students` em vez de `/alunos`

## Etapa 2 — Limpar console.logs (~99 ocorrências)
- [ ] Substituir `console.log/warn/error` por `logger` de `@/utils/logger.ts`
- [ ] Prioridade: hooks → pages → components
- [ ] Manter `console.*` apenas em infra (logger.ts, client.ts)

## Etapa 3 — Refatorar Index.tsx (442 → ~100 linhas)
- [ ] Extrair `DevToolsCard`
- [ ] Extrair `StatsGrid`
- [ ] Extrair `RecentWorkoutsSection`

## Etapa 4 — Publicar versão
- [ ] Deploy com todas as melhorias acumuladas
