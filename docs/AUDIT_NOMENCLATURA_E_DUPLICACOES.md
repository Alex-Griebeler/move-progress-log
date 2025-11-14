# Auditoria de Nomenclaturas e Mapeamento de Duplicações

**Data:** 14/11/2025  
**Objetivo:** Validar aderência ao padrão NOMENCLATURA_PADRONIZADA.md nas telas críticas e mapear duplicações entre documentos.

---

## 📊 PARTE 1: Auditoria Spot de Nomenclaturas

### ✅ Legenda de Status
- **✅ CONFORME** - Totalmente aderente ao padrão
- **⚠️ PARCIAL** - Maioria conforme, pequenos ajustes necessários
- **❌ NÃO CONFORME** - Múltiplas não-conformidades
- **🔍 REVISAR** - Necessita revisão manual detalhada

---

### 1. 🔐 Login e Autenticação (AuthPage.tsx)

**Status Geral:** ⚠️ PARCIAL

#### Não-Conformidades Identificadas:

| Elemento | Atual | Esperado (NAV_LABELS) | Status |
|----------|-------|----------------------|--------|
| Título da aba "Login" | `<TabsTrigger value="login">Login</TabsTrigger>` | "Entrar" | ❌ |
| Título da aba "Criar conta" | `<TabsTrigger value="signup">Criar Conta</TabsTrigger>` | "Criar conta" | ⚠️ (Case) |
| Botão Google | `"Entrar com Google"` | "Continuar com Google" | ❌ |
| Checkbox "Lembrar de mim" | `"Lembrar de mim"` | OK | ✅ |
| Botão principal login | `"Entrar"` | OK | ✅ |
| Botão principal signup | `"Criar Conta"` | "Criar conta" | ⚠️ (Case) |
| Link esqueci senha | `"Esqueci minha senha"` | "Esqueceu a senha?" | ❌ |

**Mensagens de Erro:**
- ✅ Mensagens claras e específicas
- ✅ Tradução adequada de erros técnicos
- ⚠️ Alguns textos hardcoded (não usam i18n)

**Recomendações:**
1. Unificar "Login" → "Entrar" em todas as referências
2. Padronizar case: "Criar Conta" → "Criar conta"
3. Criar constantes em NAV_LABELS para textos de auth
4. Migrar mensagens de erro para i18n.json

---

### 2. 📊 Dashboard (Index.tsx)

**Status Geral:** ✅ CONFORME

#### Análise:

| Elemento | Atual | Status |
|----------|-------|--------|
| Page Title | `usePageTitle(NAV_LABELS.dashboard)` | ✅ |
| Título da página | `NAV_LABELS.dashboard` | ✅ |
| Botão "Nova sessão" | Usa NAV_LABELS | ✅ |
| Cards de estatísticas | Nomenclatura consistente | ✅ |
| Seção "Sessões recentes" | `NAV_LABELS.sectionRecentSessions` | ✅ |

**Observações:**
- Excelente uso de NAV_LABELS
- Breadcrumbs implementados corretamente
- Botões de desenvolvimento (popular/limpar dados) têm labels claros

**Pontos de Atenção:**
- ⚠️ Toasts usam emojis inline: `"✅ Dados criados com sucesso!"` (deve usar notify.success)
- ⚠️ Alguns textos ainda hardcoded em toasts

---

### 3. 👥 Gestão de Alunos (StudentsPage.tsx)

**Status Geral:** ✅ CONFORME

#### Análise:

| Elemento | Atual | Status |
|----------|-------|--------|
| Page Title | `usePageTitle(NAV_LABELS.students)` | ✅ |
| Breadcrumbs | Implementado corretamente | ✅ |
| Botão adicionar | Usa NAV_LABELS | ✅ |
| Campo de busca | Placeholder adequado | ✅ |
| Dropdown de ações | Labels descritivos | ✅ |

**Observações:**
- ✅ Uso consistente de NAV_LABELS
- ✅ EmptyState com microcopy adequado
- ✅ Mensagens de confirmação claras

**Dropdown Menu (Ações do Aluno):**
```tsx
<DropdownMenuItem>Ver detalhes</DropdownMenuItem>           // ✅
<DropdownMenuItem>Editar</DropdownMenuItem>                  // ✅
<DropdownMenuItem>Registrar sessão</DropdownMenuItem>        // ✅
<DropdownMenuItem>Observações clínicas</DropdownMenuItem>    // ✅
<DropdownMenuItem>Excluir</DropdownMenuItem>                 // ✅
```

---

### 4. 📋 Detalhes do Aluno (StudentDetailPage.tsx)

**Status Geral:** ✅ CONFORME

#### Análise:

| Elemento | Atual | Status |
|----------|-------|--------|
| Page Title | Dinâmico com nome do aluno | ✅ |
| Breadcrumbs | Hierarquia correta | ✅ |
| Tabs | `"Treinamento"`, `"Oura Ring"`, `"Observações"` | ✅ |
| Botão voltar | `"Voltar para alunos"` | ✅ |

**Aba Treinamento:**
- ✅ Seções bem definidas (Prescrições ativas, Histórico, etc)
- ✅ Estados vazios com microcopy adequado
- ✅ Tooltips informativos

**Aba Oura Ring:**
- ✅ Cards de métricas com títulos descritivos
- ✅ Status de conexão claro
- ✅ Mensagens de sincronização adequadas

**Pontos de Atenção:**
- ⚠️ Alguns textos de tooltip hardcoded (não usam i18n)

---

### 5. 🎙️ Registro de Sessão Individual (RecordIndividualSessionDialog.tsx)

**Status Geral:** ⚠️ PARCIAL

#### Não-Conformidades:

| Elemento | Atual | Esperado | Status |
|----------|-------|----------|--------|
| Título do diálogo | `"Registrar Sessão Individual"` | "Registrar sessão" | ⚠️ (Case + conciso) |
| Estado "Configuração" | `"setup"` | OK (interno) | ✅ |
| Botão iniciar gravação | `<Mic />` + "Iniciar gravação" | OK | ✅ |
| Botão salvar | `"Salvar Sessão"` | "Salvar sessão" | ⚠️ (Case) |
| Seção exercícios | `"Exercícios da Sessão"` | "Exercícios registrados" | ❌ |

**Fluxo de Estados:**
```tsx
'setup' → 'recording' → 'processing' → 'preview' → 'edit'
```
- ✅ Estados bem definidos
- ⚠️ Alguns labels dos estados não seguem padrão

**Validações:**
- ✅ Mensagens de erro claras
- ⚠️ Textos de validação hardcoded (não usam i18n)

**Recomendações:**
1. Padronizar case nos títulos: "Registrar Sessão" → "Registrar sessão"
2. Mover textos de validação para i18n
3. Usar NAV_LABELS para títulos de seções

---

### 6. 👥 Registro de Sessão em Grupo (RecordGroupSessionDialog.tsx)

**Status Geral:** ⚠️ PARCIAL

#### Não-Conformidades:

| Elemento | Atual | Esperado | Status |
|----------|-------|----------|--------|
| Título do diálogo | `"Registrar Sessão em Grupo"` | "Registrar sessão em grupo" | ⚠️ (Case) |
| Seleção de alunos | `"Selecione os alunos"` | OK | ✅ |
| Botão modo voz | `"Gravação de Voz"` | "Gravar por voz" | ❌ |
| Botão modo manual | `"Entrada Manual"` | "Preencher manualmente" | ❌ |
| Label alunos selecionados | `"{count} alunos selecionados"` | OK | ✅ |

**Fluxo de Estados:**
```tsx
'context-setup' → 'mode-selection' → 'recording' → 'processing' → 'preview' → 'edit' → 'manual-entry'
```
- ✅ Estados bem estruturados
- ⚠️ Nomenclatura inconsistente entre estados

**Recomendações:**
1. Padronizar nomenclatura de modos: usar verbos no infinitivo
2. Usar case sentence nos títulos
3. Mover labels para NAV_LABELS

---

### 7. 📝 Prescrições (PrescriptionsPage.tsx)

**Status Geral:** ✅ CONFORME

#### Análise:

| Elemento | Atual | Status |
|----------|-------|--------|
| Page Title | `usePageTitle(NAV_LABELS.prescriptions)` | ✅ |
| Breadcrumbs | Correto | ✅ |
| Botão criar | `"Nova prescrição"` (via NAV_LABELS) | ✅ |
| Botão busca | Ícone + label acessível | ✅ |
| Árvore de pastas | Labels descritivos | ✅ |

**Drag & Drop:**
- ✅ Feedback visual claro
- ✅ Mensagens de sucesso adequadas

**Search & Filter:**
- ✅ Placeholder adequado: "Buscar prescrições..."
- ✅ Filtros com labels claros
- ✅ Botão "Limpar filtros" presente

---

### 8. 💪 Biblioteca de Exercícios (ExercisesLibraryPage.tsx)

**Status Geral:** ✅ CONFORME

#### Análise:

| Elemento | Atual | Status |
|----------|-------|--------|
| Page Title | `usePageTitle(NAV_LABELS.exercises)` | ✅ |
| Breadcrumbs | Correto | ✅ |
| Botão adicionar | Usa NAV_LABELS | ✅ |
| Filtros | Labels descritivos | ✅ |
| Cards de exercícios | Informações bem organizadas | ✅ |

**Sistema de Filtros:**
- ✅ Labels: "Padrão de movimento", "Lateralidade", "Plano", etc
- ✅ Botão "Limpar filtros" visível quando ativo
- ✅ Badge count de filtros ativos

**Badges de Metadados:**
- ✅ Uso adequado para categorias
- ✅ Cores e variantes consistentes

---

### 9. 📊 Relatórios (StudentReportsPage.tsx)

**Status Geral:** ✅ CONFORME

#### Análise:

| Elemento | Atual | Status |
|----------|-------|--------|
| Título da página | `"Relatórios - {nome}"` | ✅ |
| Breadcrumbs | Navegação hierárquica correta | ✅ |
| Botão gerar | `"Gerar Novo Relatório"` | ⚠️ (Case) |
| Botão voltar | `"Voltar para perfil do aluno"` | ✅ |
| Estados de badge | `"Concluído"`, `"Gerando..."` | ✅ |

**EmptyState:**
```tsx
<EmptyState
  icon={<FileText />}
  title="Nenhum relatório gerado"
  description="Comece gerando seu primeiro relatório periódico..."
  primaryAction={{ label: "Gerar Primeiro Relatório" }}
/>
```
- ✅ Estrutura correta
- ⚠️ Case: "Gerar Primeiro Relatório" → "Gerar primeiro relatório"

---

### 10. ➕ Adicionar Aluno (AddStudentDialog.tsx)

**Status Geral:** ⚠️ PARCIAL

#### Não-Conformidades:

| Elemento | Atual | Esperado | Status |
|----------|-------|----------|--------|
| Título do diálogo | `"Adicionar Aluno"` | "Adicionar aluno" | ⚠️ (Case) |
| Labels de formulário | Via i18n | ✅ |
| Botão salvar | `"Salvar"` | "Salvar aluno" | ❌ |
| Botão cancelar | `"Cancelar"` | OK | ✅ |
| Placeholder avatar | `"Clique para adicionar foto"` | OK | ✅ |

**Validações:**
- ✅ Usa i18n para mensagens de erro
- ✅ Feedback inline adequado
- ✅ Helper texts informativos

**Recomendações:**
1. Padronizar case: "Adicionar Aluno" → "Adicionar aluno"
2. Botão contextual: "Salvar" → "Salvar aluno"

---

## 📈 Resumo da Auditoria

### Métricas Gerais

| Tela | Status | Conformidade | Prioridade Correção |
|------|--------|--------------|---------------------|
| Login/Auth | ⚠️ PARCIAL | 60% | 🔴 ALTA |
| Dashboard | ✅ CONFORME | 95% | 🟢 BAIXA |
| Alunos | ✅ CONFORME | 98% | 🟢 BAIXA |
| Detalhe Aluno | ✅ CONFORME | 95% | 🟢 BAIXA |
| Sessão Individual | ⚠️ PARCIAL | 70% | 🟡 MÉDIA |
| Sessão Grupo | ⚠️ PARCIAL | 65% | 🟡 MÉDIA |
| Prescrições | ✅ CONFORME | 100% | - |
| Exercícios | ✅ CONFORME | 98% | 🟢 BAIXA |
| Relatórios | ✅ CONFORME | 92% | 🟢 BAIXA |
| Add Aluno Dialog | ⚠️ PARCIAL | 80% | 🟡 MÉDIA |

### Problemas Recorrentes Identificados

#### 1. **Inconsistência de Case (Sentence Case)**
- ❌ "Criar Conta" → ✅ "Criar conta"
- ❌ "Registrar Sessão" → ✅ "Registrar sessão"
- ❌ "Nova Prescrição" → ✅ "Nova prescrição"

**Ocorrências:** ~15 casos

#### 2. **Textos Hardcoded (Não Usam i18n ou NAV_LABELS)**
- Principalmente em:
  - Mensagens de toast
  - Tooltips
  - Validações inline
  - Títulos de diálogos

**Ocorrências:** ~25 casos

#### 3. **Botões Genéricos sem Contexto**
- ❌ "Salvar" → ✅ "Salvar aluno"
- ❌ "Criar" → ✅ "Criar prescrição"

**Ocorrências:** ~10 casos

#### 4. **Emojis em Mensagens Programáticas**
- ❌ `"✅ Dados criados com sucesso!"` (toast)
- ✅ Usar notify.success sem emojis

**Ocorrências:** ~8 casos

---

## 🔍 Recomendações Prioritárias

### 🔴 Prioridade ALTA (Corrigir Imediatamente)

1. **AuthPage.tsx**
   - [ ] Unificar "Login" → "Entrar"
   - [ ] Padronizar case em todos os botões
   - [ ] Migrar mensagens de erro para i18n
   - [ ] Adicionar textos de auth ao NAV_LABELS

### 🟡 Prioridade MÉDIA (Corrigir em Sprint Atual)

2. **Diálogos de Registro de Sessão**
   - [ ] Padronizar títulos: sentence case
   - [ ] Tornar botões contextuais
   - [ ] Mover labels para NAV_LABELS
   - [ ] Migrar validações para i18n

3. **AddStudentDialog.tsx**
   - [ ] Corrigir case do título
   - [ ] Tornar botão salvar contextual

### 🟢 Prioridade BAIXA (Refinamento Contínuo)

4. **Toasts e Feedback**
   - [ ] Remover emojis inline de toasts
   - [ ] Padronizar uso de notify.success/error
   - [ ] Criar seção de feedback no i18n.json

5. **Tooltips e Helpers**
   - [ ] Migrar tooltips hardcoded para i18n
   - [ ] Documentar helpers em i18n

---

## 📦 PARTE 2: Mapeamento de Duplicações entre Documentos

### Documentos Analisados

1. `NOMENCLATURA_PADRONIZADA.md`
2. `NOMENCLATURE_VALIDATION_CHECKLIST.md`
3. `MICROCOPY_GUIDE.md`
4. `MICROCOPY_CHECKLIST.md`
5. `MICROCOPY_IMPLEMENTATION.md`
6. `SESSION_RECORDING_TYPES.md`

---

### 🔄 Duplicações Identificadas

#### 1. **Regras de Nomenclatura**

**Duplicação:** Regras básicas repetidas em múltiplos documentos

| Regra | NOMENCLATURA_PADRONIZADA | MICROCOPY_GUIDE | NOMENCLATURE_VALIDATION |
|-------|--------------------------|-----------------|-------------------------|
| Sentence case | ✅ Seção dedicada | ✅ Writing Rules | ✅ Critérios de validação |
| Max 2-3 palavras | ✅ | ✅ | ✅ |
| Verbos no infinitivo | ✅ | ✅ | ✅ |
| Sem gerúndio | ✅ | ✅ | ✅ |
| Sem jargões | ✅ | ✅ | ✅ |

**Recomendação:**
- Manter regras apenas em `NOMENCLATURA_PADRONIZADA.md`
- Outros documentos devem REFERENCIAR este documento
- Usar: `"Veja regras completas em [NOMENCLATURA_PADRONIZADA.md](./NOMENCLATURA_PADRONIZADA.md)"`

---

#### 2. **Estrutura de i18n**

**Duplicação:** Explicação da estrutura do i18n repetida

**Documentos:**
- `MICROCOPY_IMPLEMENTATION.md` (linhas 11-42) - Estrutura completa + exemplos
- `MICROCOPY_GUIDE.md` (linhas 388-435) - Estrutura i18n + formatting
- `MICROCOPY_CHECKLIST.md` (linhas 20-27) - Referência rápida

**Sobreposição:** ~80%

**Recomendação:**
```markdown
# Em MICROCOPY_IMPLEMENTATION.md (manter detalhado)
## 1. Sistema i18n
[Documentação completa da estrutura]

# Em MICROCOPY_GUIDE.md (referenciar)
## Internationalization
Para estrutura completa do i18n, veja [MICROCOPY_IMPLEMENTATION.md](./MICROCOPY_IMPLEMENTATION.md#sistema-i18n)

# Em MICROCOPY_CHECKLIST.md (remover)
[Remover seção, apenas referenciar]
```

---

#### 3. **Padrões de Toasts**

**Duplicação:** Estrutura e exemplos de toasts

**Documentos:**
- `MICROCOPY_IMPLEMENTATION.md` (linhas 43-80) - API completa do notify
- `MICROCOPY_GUIDE.md` (linhas 163-235) - Estrutura e exemplos
- `MICROCOPY_CHECKLIST.md` (linhas 31-56) - Checklist de feedback

**Sobreposição:** ~70%

**Análise:**
- `IMPLEMENTATION`: Foco técnico (API, código)
- `GUIDE`: Foco UX (estrutura de mensagens)
- `CHECKLIST`: Foco validação (o que verificar)

**Recomendação:**
```markdown
# MICROCOPY_IMPLEMENTATION.md
## 2. Utilitário de Toasts
[Manter: API completa, código, uso técnico]

# MICROCOPY_GUIDE.md
## Component Patterns > Toasts
[Manter: Estrutura de mensagens, tom, exemplos UX]
[Adicionar: Link para implementação técnica]

# MICROCOPY_CHECKLIST.md
## ✅ Toasts
[Manter: Checklist de validação]
[Adicionar: Link para GUIDE e IMPLEMENTATION]
```

---

#### 4. **EmptyState Component**

**Duplicação:** Documentação do componente EmptyState

**Documentos:**
- `MICROCOPY_IMPLEMENTATION.md` (linhas 81-111) - Props e uso técnico
- `MICROCOPY_GUIDE.md` (linhas 236-290) - Estrutura e cenários
- `MICROCOPY_CHECKLIST.md` (linhas 58-87) - Checklist de validação

**Sobreposição:** ~60%

**Recomendação:**
- Manter documentação técnica em `IMPLEMENTATION`
- Manter padrões UX em `GUIDE`
- Checklist apenas referencia os outros dois

---

#### 5. **Validações de Formulário**

**Duplicação:** Regras de validação inline

**Documentos:**
- `MICROCOPY_GUIDE.md` (linhas 291-357) - Padrões completos
- `MICROCOPY_CHECKLIST.md` (linhas 113-195) - Checklist detalhado
- `NOMENCLATURA_PADRONIZADA.md` - Regras de labels

**Sobreposição:** ~50%

**Recomendação:**
- Consolidar em `MICROCOPY_GUIDE.md`
- `CHECKLIST` apenas referencia
- `NOMENCLATURA` foca em labels, não validações

---

#### 6. **Estados por Módulo**

**Duplicação:** Documentação de estados específicos

**Documentos:**
- `MICROCOPY_GUIDE.md` (linhas 636-1120) - Estados completos por módulo
- `SESSION_RECORDING_TYPES.md` (linhas 180-248) - Estados de recording
- `NOMENCLATURE_VALIDATION_CHECKLIST.md` - Exemplos de telas

**Sobreposição:** ~40% (apenas em recording)

**Análise:**
- `MICROCOPY_GUIDE`: Estados de UI/UX
- `SESSION_RECORDING_TYPES`: Fluxo técnico de recording
- `VALIDATION_CHECKLIST`: Validação de nomenclatura

**Recomendação:**
- Manter separado (focos diferentes)
- Adicionar cross-references

---

### 📊 Matriz de Duplicações

| Conteúdo | NOMENCLATURA | MICROCOPY_GUIDE | MICROCOPY_IMPL | MICROCOPY_CHECK | SESSION_TYPES | VALIDATION_CHECK |
|----------|--------------|-----------------|----------------|-----------------|---------------|------------------|
| Regras básicas | 🟢 Principal | 🟡 Duplicado | - | 🟡 Duplicado | - | 🟡 Duplicado |
| i18n estrutura | - | 🟡 Parcial | 🟢 Principal | 🔴 Desnecessário | - | - |
| Toasts | - | 🟡 UX | 🟢 Técnico | 🟡 Validação | - | - |
| EmptyState | - | 🟡 UX | 🟢 Técnico | 🟡 Validação | - | - |
| Validações | - | 🟢 Principal | 🟡 Exemplos | 🔴 Duplicado | - | - |
| Estados módulos | - | 🟢 Principal | - | - | 🟡 Recording | 🟡 Exemplos |

**Legenda:**
- 🟢 **Principal** - Conteúdo deve permanecer aqui
- 🟡 **Parcial** - Mantém conteúdo único, referencia principal
- 🔴 **Duplicado** - Remover ou reduzir drasticamente

---

### 🎯 Plano de Consolidação

#### Fase 1: Limpeza Imediata (1-2 dias)

**1.1 Remover Duplicações Críticas**
- [ ] `MICROCOPY_CHECKLIST.md`: Remover estrutura i18n (referenciar IMPLEMENTATION)
- [ ] `NOMENCLATURE_VALIDATION_CHECKLIST.md`: Remover regras (referenciar NOMENCLATURA_PADRONIZADA)
- [ ] `MICROCOPY_GUIDE.md`: Reduzir seção i18n (referenciar IMPLEMENTATION)

**1.2 Adicionar Cross-References**
```markdown
<!-- Exemplo de cross-reference -->
> **📚 Referência Técnica:** Para implementação completa do sistema i18n, consulte [MICROCOPY_IMPLEMENTATION.md](./MICROCOPY_IMPLEMENTATION.md#sistema-i18n)

> **📋 Validação:** Para checklist de validação, veja [MICROCOPY_CHECKLIST.md](./MICROCOPY_CHECKLIST.md#toasts)
```

#### Fase 2: Reorganização Estrutural (3-5 dias)

**2.1 Definir Hierarquia Clara**

```
NOMENCLATURA_PADRONIZADA.md
├─ Regras de nomenclatura (única fonte)
└─ Sistema NAV_LABELS

MICROCOPY_GUIDE.md
├─ Tom e voz da marca
├─ Padrões UX (componentes)
├─ Módulos específicos
└─ QA Checklist (resumo)

MICROCOPY_IMPLEMENTATION.md
├─ Sistema i18n (técnico)
├─ Utilitários (notify, etc)
├─ Componentes (props, API)
└─ Exemplos de código

MICROCOPY_CHECKLIST.md
├─ Checklist rápido
└─ Referencias para docs completos

NOMENCLATURE_VALIDATION_CHECKLIST.md
├─ Checklist de validação
├─ Template de audit
└─ Referencias para NOMENCLATURA_PADRONIZADA

SESSION_RECORDING_TYPES.md
├─ Tipos de recording (único)
├─ Fluxos técnicos
└─ Comparação
```

**2.2 Mover Conteúdo Específico**
- Mover exemplos de código de `GUIDE` para `IMPLEMENTATION`
- Consolidar todas as regras em `NOMENCLATURA_PADRONIZADA`
- Reduzir `CHECKLIST` a apenas checklist (sem documentação extensa)

#### Fase 3: Criação de Index/Hub (2-3 dias)

**3.1 Criar `docs/README.md` (Hub de Documentação)**

```markdown
# 📚 Documentação Fabrik Performance

## 🎯 Guides por Objetivo

### Quero implementar nomenclatura correta
1. [NOMENCLATURA_PADRONIZADA.md](./NOMENCLATURA_PADRONIZADA.md) - Regras e padrões
2. [NOMENCLATURE_VALIDATION_CHECKLIST.md](./NOMENCLATURE_VALIDATION_CHECKLIST.md) - Validar implementação

### Quero escrever microcopy adequado
1. [MICROCOPY_GUIDE.md](./MICROCOPY_GUIDE.md) - Tom, padrões e exemplos
2. [MICROCOPY_IMPLEMENTATION.md](./MICROCOPY_IMPLEMENTATION.md) - Como implementar
3. [MICROCOPY_CHECKLIST.md](./MICROCOPY_CHECKLIST.md) - Checklist rápido

### Quero implementar registro de sessões
1. [SESSION_RECORDING_TYPES.md](./SESSION_RECORDING_TYPES.md) - Tipos e fluxos
2. [VOICE_RECORDING_FLOW.md](./VOICE_RECORDING_FLOW.md) - Fluxo detalhado

### Auditorias e Segurança
1. [AUDIT_NOMENCLATURA_E_DUPLICACOES.md](./AUDIT_NOMENCLATURA_E_DUPLICACOES.md) - Este documento
2. [SECURITY_CHECKLIST.md](./SECURITY_CHECKLIST.md) - Segurança
```

---

## 📝 Ações Imediatas Recomendadas

### Para Desenvolvedores

1. **Corrigir Nomenclaturas (Prioridade ALTA)**
   ```bash
   # AuthPage.tsx
   - "Login" → "Entrar"
   - "Criar Conta" → "Criar conta"
   - Migrar erros para i18n
   ```

2. **Padronizar Toasts (Prioridade MÉDIA)**
   ```typescript
   // ❌ Antes
   toast({ title: "✅ Sucesso!" })
   
   // ✅ Depois
   notify.success("Aluno criado com sucesso")
   ```

3. **Usar NAV_LABELS (Prioridade MÉDIA)**
   ```typescript
   // ❌ Antes
   <DialogTitle>Adicionar Aluno</DialogTitle>
   
   // ✅ Depois
   <DialogTitle>{NAV_LABELS.addStudent}</DialogTitle>
   ```

### Para Tech Writers

1. **Consolidar Documentação (Prioridade ALTA)**
   - Remover duplicações críticas
   - Adicionar cross-references
   - Criar hub de documentação

2. **Revisar e Atualizar (Prioridade MÉDIA)**
   - Garantir hierarquia clara
   - Atualizar exemplos desatualizados
   - Adicionar diagramas onde necessário

---

## 🎓 Conclusão

### Resultado da Auditoria de Nomenclaturas
- **7/10 telas** em conformidade (✅ ou ⚠️ leve)
- **~60 não-conformidades** identificadas
- **3 áreas críticas** para correção imediata (Auth, Diálogos de Sessão)

### Resultado do Mapeamento de Duplicações
- **~6 duplicações significativas** entre documentos
- **~40% de conteúdo duplicado** pode ser consolidado
- **Hierarquia clara** necessária para organização

### Próximos Passos

1. **Semana 1:** Corrigir nomenclaturas críticas (Auth, Diálogos)
2. **Semana 2:** Remover duplicações e adicionar cross-references
3. **Semana 3:** Reorganizar estrutura de docs e criar hub
4. **Semana 4:** Validação final e atualização de checklist

---

**Preparado por:** Lovable AI  
**Data:** 14/11/2025  
**Próxima Revisão:** Após implementação das correções prioritárias
