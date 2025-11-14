# Checklist de Validação de Nomenclaturas

## 📋 Objetivo

Este checklist valida a aderência de telas críticas aos padrões definidos em:
- `NOMENCLATURA_PADRONIZADA.md` (sistema centralizado)
- `MICROCOPY_GUIDE.md` (tom, voz e regras de escrita)

---

## 🎯 Critérios de Validação

### Regras Universais

- [ ] **Sentence case**: Primeira letra maiúscula, restante minúscula
- [ ] **Máximo 2-3 palavras** por label/botão
- [ ] **Sem gerúndio** em títulos (ex: ❌ "Gerenciando" → ✅ "Alunos")
- [ ] **Sem jargões técnicos** ou siglas não explicadas
- [ ] **Verbos no infinitivo** para botões de ação
- [ ] **Uso correto de pontuação** (sem ponto final em títulos)
- [ ] **Consistência** com `NAV_LABELS` de `src/constants/navigation.ts`

---

## 🖥️ Telas Críticas para Auditoria

### 1. Login e Autenticação (`AuthPage`)

#### ✅ Títulos e Labels

| Elemento | Esperado | Status | Observação |
|----------|----------|--------|------------|
| **Título da página** | "Login" / "Criar conta" | ✅ | Correto |
| **Label: Email** | "Email" | ✅ | Correto |
| **Label: Senha** | "Senha" | ✅ | Correto |
| **Label: Confirmar senha** | "Confirmar senha" | ✅ | Correto |
| **Label: Nome completo** | "Nome completo" | ✅ | Correto |
| **Checkbox: Termos** | "Li e aceito os Termos de Uso" | ⚠️ | Verificar |
| **Checkbox: Lembrar** | "Lembrar de mim" | ✅ | Correto |

#### ✅ Botões

| Elemento | Esperado | Status | Observação |
|----------|----------|--------|------------|
| **Botão primário (login)** | "Entrar" | ✅ | Correto |
| **Botão primário (cadastro)** | "Criar conta" | ✅ | Correto |
| **Botão Google** | "Continuar com Google" | ✅ | Correto |
| **Link: Esqueceu senha** | "Esqueci minha senha" | ⚠️ | Verificar |
| **Link: Alternar tab** | "Criar conta" / "Já tem conta? Entre" | ✅ | Correto |

#### ✅ Mensagens de Erro

| Contexto | Esperado | Status |
|----------|----------|--------|
| **Email já cadastrado** | "Este email já está cadastrado. Tente fazer login ou use outro email." | ✅ |
| **Senha curta** | "A senha deve ter pelo menos 6 caracteres." | ✅ |
| **Credenciais inválidas** | "Email ou senha incorretos. Verifique seus dados e tente novamente." | ✅ |

#### 🔍 Pontos de Atenção
- Verificar se avisos de segurança de senha usam tom educativo (não assustador)
- Validar feedback visual de força de senha

---

### 2. Dashboard (`Index`)

#### ✅ Navegação Principal

| Elemento | Esperado (NAV_LABELS) | Status | Observação |
|----------|----------------------|--------|------------|
| **Botão: Alunos** | `NAV_LABELS.students` ("Alunos") | ✅ | Correto |
| **Botão: Exercícios** | `NAV_LABELS.exercises` ("Exercícios") | ✅ | Correto |
| **Botão: Prescrições** | `NAV_LABELS.prescriptions` ("Prescrições") | ✅ | Correto |
| **Botão: Protocolos** | `NAV_LABELS.protocols` ("Protocolos") | ✅ | Correto |
| **Botão: Comparar** | `NAV_LABELS.studentsComparison` ("Comparar alunos") | ✅ | Correto |

#### ✅ Cards de Estatísticas

| Elemento | Esperado | Status | Observação |
|----------|----------|--------|------------|
| **Sessões** | `NAV_LABELS.statTotalSessions` ("Sessões registradas") | ✅ | Correto |
| **Este mês** | `NAV_LABELS.statThisMonth` ("Este mês") | ✅ | Correto |
| **Alunos ativos** | `NAV_LABELS.statActiveStudents` ("Alunos ativos") | ✅ | Correto |
| **Carga média** | `NAV_LABELS.statAvgLoad` ("Carga média") | ✅ | Correto |

#### ✅ Seções

| Elemento | Esperado | Status |
|----------|----------|--------|
| **Título seção** | `NAV_LABELS.sectionRecentSessions` ("Sessões recentes") | ✅ |

#### 🔍 Pontos de Atenção
- Verificar se botões de ação usam ícones + texto (não apenas ícone)
- Validar hierarquia visual (títulos vs subtítulos)

---

### 3. Gestão de Alunos (`StudentsPage`)

#### ✅ Header

| Elemento | Esperado | Status | Observação |
|----------|----------|--------|------------|
| **Título** | `NAV_LABELS.students` ("Alunos") | ✅ | Correto |
| **Subtítulo** | `NAV_LABELS.subtitleStudents` ("Gerencie os dados dos seus alunos") | ✅ | Correto |

#### ✅ Botões de Ação

| Elemento | Esperado | Status | Observação |
|----------|----------|--------|------------|
| **Adicionar** | `NAV_LABELS.addStudent` ("Adicionar aluno") | ✅ | Correto |
| **Sessão grupo** | `NAV_LABELS.groupSession` ("Sessão em grupo") | ✅ | Correto |
| **Gerar convite** | `NAV_LABELS.generateInvite` ("Gerar convite") | ✅ | Correto |
| **Comparar** | `NAV_LABELS.studentsComparison` ("Comparar alunos") | ✅ | Correto |

#### ✅ Diálogos

| Diálogo | Título Esperado | Status |
|---------|----------------|--------|
| **Adicionar aluno** | "Adicionar aluno" | ✅ |
| **Editar aluno** | "Editar aluno" | ✅ |
| **Excluir aluno** | "Excluir aluno?" ou "Confirmar exclusão" | ⚠️ |

#### ✅ Mensagens

| Contexto | Esperado | Status |
|----------|----------|--------|
| **Sucesso - Criar** | "Aluno criado com sucesso" | ✅ |
| **Sucesso - Editar** | "Dados atualizados com sucesso" | ✅ |
| **Sucesso - Excluir** | "Aluno excluído com sucesso" | ✅ |
| **Vazio** | "Nenhum aluno cadastrado" + "Comece adicionando seu primeiro aluno." | ✅ |

#### 🔍 Pontos de Atenção
- Verificar consistência de diálogos de confirmação (usar "Confirmar exclusão" vs "Excluir aluno?")
- Validar descrições de AlertDialog (devem ter ponto final)

---

### 4. Detalhes do Aluno (`StudentDetailPage`)

#### ✅ Navegação e Tabs

| Elemento | Esperado | Status | Observação |
|----------|----------|--------|------------|
| **Botão voltar** | "Voltar" | ✅ | Correto |
| **Tab: Visão geral** | `NAV_LABELS.tabOverview` ("Visão geral") | ✅ | Correto |
| **Tab: Sessões** | `NAV_LABELS.tabSessions` ("Sessões") | ✅ | Correto |
| **Tab: Prescrições** | `NAV_LABELS.tabPrescriptions` ("Prescrições") | ✅ | Correto |
| **Tab: Métricas Oura** | `NAV_LABELS.tabOura` ("Métricas Oura") | ✅ | Correto |

#### ✅ Botões de Ação

| Elemento | Esperado | Status | Observação |
|----------|----------|--------|------------|
| **Editar aluno** | "Editar aluno" | ✅ | Correto |
| **Registrar treino** | `NAV_LABELS.recordSession` ("Registrar treino") | ⚠️ | Verificar nomenclatura |
| **Atribuir prescrição** | "Atribuir prescrição" | ✅ | Correto |
| **Gerar relatório** | "Gerar relatório" | ✅ | Correto |

#### 🔍 Pontos de Atenção
- Verificar se "Registrar treino" vs "Registrar sessão" está padronizado
- Validar ícones + texto em botões secundários

---

### 5. Registro de Sessões

#### ✅ Diálogo Individual (`RecordIndividualSessionDialog`)

| Elemento | Esperado | Status | Observação |
|----------|----------|--------|------------|
| **Título** | "Registrar treino - [Nome Aluno]" | ✅ | Correto |
| **Label: Prescrição** | "Prescrição (opcional)" | ✅ | Correto |
| **Label: Data** | "Data" | ✅ | Correto |
| **Label: Horário** | "Horário" | ✅ | Correto |
| **Label: Trainer** | "Nome do trainer" | ✅ | Correto |
| **Botão: Gravar** | "Iniciar gravação" | ✅ | Correto |
| **Botão: Parar** | "Parar gravação" | ✅ | Correto |
| **Botão: Adicionar** | "Adicionar outro segmento" | ✅ | Correto |
| **Botão: Finalizar** | "Finalizar e salvar" | ✅ | Correto |

#### ✅ Diálogo Grupo (`RecordGroupSessionDialog`)

| Elemento | Esperado | Status | Observação |
|----------|----------|--------|------------|
| **Título** | "Registrar sessão em grupo" | ✅ | Correto |
| **Label: Prescrição** | "Prescrição (opcional)" | ✅ | Correto |
| **Label: Alunos** | "Selecionar alunos" | ✅ | Correto |
| **Label: Sala** | "Nome da sala" | ✅ | Correto |
| **Label: Treino** | "Nome do treino" | ✅ | Correto |
| **Botão: Modo voz** | "Gravar por voz" | ⚠️ | Verificar |
| **Botão: Modo manual** | "Preencher manualmente" | ⚠️ | Verificar |

#### ✅ Estados

| Estado | Mensagem Esperada | Status |
|--------|------------------|--------|
| **Gravando** | "Gravando..." (badge) | ✅ |
| **Processando** | "Processando áudio com IA..." | ✅ |
| **Erro - Microfone** | "Permissão de microfone necessária para gravar sessões" | ✅ |
| **Sucesso** | "Sessão registrada com sucesso" | ✅ |

#### 🔍 Pontos de Atenção
- Padronizar "Registrar treino" vs "Registrar sessão" em todos os contextos
- Verificar se badges de estado usam tom correto (não técnico)

---

### 6. Prescrições (`PrescriptionsPage`)

#### ✅ Header

| Elemento | Esperado | Status | Observação |
|----------|----------|--------|------------|
| **Título** | `NAV_LABELS.prescriptions` ("Prescrições") | ✅ | Correto |
| **Subtítulo** | `NAV_LABELS.subtitlePrescriptions` | ✅ | Correto |

#### ✅ Botões

| Elemento | Esperado | Status | Observação |
|----------|----------|--------|------------|
| **Nova prescrição** | `NAV_LABELS.newPrescription` ("Nova prescrição") | ✅ | Correto |
| **Nova pasta** | "Nova pasta" | ✅ | Correto |
| **Buscar** | Placeholder: "Buscar prescrições..." | ✅ | Correto |

#### ✅ Diálogos de Pasta

| Diálogo | Título Esperado | Status |
|---------|----------------|--------|
| **Criar pasta** | "Criar pasta" | ✅ |
| **Renomear pasta** | "Renomear pasta" | ✅ |
| **Excluir pasta** | "Excluir pasta '[nome]'?" | ⚠️ |

#### 🔍 Pontos de Atenção
- Verificar consistência de diálogos de exclusão (formato da pergunta)
- Validar descrições de exclusão (devem explicar consequências)

---

### 7. Biblioteca de Exercícios (`ExercisesLibraryPage`)

#### ✅ Header

| Elemento | Esperado | Status | Observação |
|----------|----------|--------|------------|
| **Título** | `NAV_LABELS.exercises` ("Exercícios") | ✅ | Correto |
| **Subtítulo** | `NAV_LABELS.subtitleExercises` | ✅ | Correto |

#### ✅ Filtros

| Elemento | Esperado | Status | Observação |
|----------|----------|--------|------------|
| **Label: Padrão** | "Padrão de movimento" | ✅ | Correto |
| **Label: Nível** | "Nível" | ✅ | Correto |
| **Botão limpar** | "Limpar filtros" | ✅ | Correto |

#### ✅ Botões

| Elemento | Esperado | Status |
|----------|----------|--------|
| **Adicionar** | "Adicionar exercício" | ✅ |
| **Importar** | `NAV_LABELS.importExercises` ("Importar exercícios") | ✅ |

#### 🔍 Pontos de Atenção
- Verificar se placeholders de busca usam "..." (ex: "Buscar exercícios...")
- Validar labels de filtros (devem ser específicos, não genéricos)

---

### 8. Relatórios (`StudentReportsPage`, `GenerateReportDialog`)

#### ✅ Página de Relatórios

| Elemento | Esperado | Status | Observação |
|----------|----------|--------|------------|
| **Título** | "Relatórios - [Nome Aluno]" | ✅ | Correto |
| **Botão principal** | "Gerar novo relatório" | ✅ | Correto |
| **Card: Tipo** | "Tipo: Personalizado" | ✅ | Correto |
| **Card: Período** | "Período: DD/MM/YYYY - DD/MM/YYYY" | ✅ | Correto |
| **Botão card** | "Ver relatório" | ✅ | Correto |
| **Vazio** | "Nenhum relatório gerado ainda" | ✅ | Correto |

#### ✅ Diálogo de Geração

| Elemento | Esperado | Status | Observação |
|----------|----------|--------|------------|
| **Título** | "Gerar relatório - [Nome Aluno]" | ✅ | Correto |
| **Label: Período** | "Período de análise" | ✅ | Correto |
| **Label: Exercícios** | "Exercícios rastreados" | ✅ | Correto |
| **Label: Destaques** | "Destaques do período" | ✅ | Correto |
| **Label: Atenção** | "Pontos de atenção" | ✅ | Correto |
| **Label: Plano** | "Plano próximo ciclo" | ✅ | Correto |
| **Botão gerar** | "Gerar relatório" | ✅ | Correto |

#### ✅ Estados

| Estado | Badge/Mensagem Esperado | Status |
|--------|------------------------|--------|
| **Gerando** | Badge: "Gerando..." | ✅ |
| **Pronto** | Badge: "Pronto" | ✅ |
| **Falhou** | Badge: "Erro na geração" | ✅ |

#### 🔍 Pontos de Atenção
- Verificar se labels de formulário são específicos e auto-explicativos
- Validar que placeholders dão exemplos práticos

---

## 📊 Resumo de Validação

### Escala de Status

- ✅ **Conforme**: Aderente aos padrões
- ⚠️ **Verificar**: Necessita revisão manual
- ❌ **Não conforme**: Precisa correção

### Checklist Geral de Conformidade

#### Títulos de Página
- [ ] Todos usam sentence case
- [ ] Todos têm máximo 2-3 palavras
- [ ] Todos vêm de `NAV_LABELS` quando aplicável
- [ ] Subtítulos têm ponto final

#### Botões
- [ ] Primários usam verbo + contexto (ex: "Salvar aluno")
- [ ] Secundários são claros (ex: "Cancelar", "Voltar")
- [ ] Destrutivos têm confirmação (ex: "Excluir aluno")
- [ ] Loading usa gerúndio (ex: "Salvando...")

#### Mensagens de Sucesso
- [ ] Usam particípio passado (ex: "Aluno criado com sucesso")
- [ ] Não têm ponto final em toasts
- [ ] São positivas e celebratórias

#### Mensagens de Erro
- [ ] São claras e acionáveis
- [ ] Não usam jargão técnico
- [ ] Oferecem solução quando possível

#### Diálogos de Confirmação
- [ ] Título usa pergunta ou afirmação
- [ ] Descrição explica consequências
- [ ] Descrição tem ponto final
- [ ] Botão destrutivo repete ação (ex: "Excluir aluno")

#### Labels de Formulário
- [ ] Sem ponto final
- [ ] Específicos e auto-explicativos
- [ ] Indicam quando campo é opcional

#### Placeholders
- [ ] Dão exemplos práticos
- [ ] Usam "..." no final de buscas
- [ ] Não repetem o label

---

## 🔧 Processo de Auditoria

### Manual (Recomendado para primeira vez)

1. **Preparação**
   - [ ] Abrir projeto em ambiente de dev
   - [ ] Ter `NOMENCLATURA_PADRONIZADA.md` aberto
   - [ ] Ter `MICROCOPY_GUIDE.md` aberto
   - [ ] Preparar ferramenta de anotação

2. **Para cada tela crítica**
   - [ ] Navegar para a tela
   - [ ] Comparar títulos com `NAV_LABELS`
   - [ ] Verificar todos os botões
   - [ ] Testar mensagens de erro (se aplicável)
   - [ ] Verificar diálogos e confirmações
   - [ ] Anotar não conformidades

3. **Registro**
   - [ ] Marcar status (✅/⚠️/❌) neste documento
   - [ ] Documentar observações na coluna "Observação"
   - [ ] Criar issues no GitHub para correções (opcional)

### Semi-Automatizado (Futuro)

```bash
# Script de validação (a ser implementado)
npm run validate:nomenclature

# Saída esperada:
# ✅ AuthPage: 15/15 checks passed
# ⚠️ StudentsPage: 8/10 checks passed
#    - Botão "Adicionar" deveria ser "Adicionar aluno"
#    - Dialog title não usa NAV_LABELS
# ❌ RecordGroupSessionDialog: 5/12 checks passed
#    - Múltiplas não conformidades detectadas
```

---

## 📝 Template de Issue (GitHub)

Quando encontrar não conformidades, usar este template:

```markdown
**Tela**: [Nome da tela/componente]
**Arquivo**: `src/pages/[arquivo].tsx`

**Não conformidade**:
- [ ] Elemento: [Botão/Título/Label/etc]
- [ ] Atual: "[texto atual]"
- [ ] Esperado: "[texto esperado]" (ref: NAV_LABELS.[chave])
- [ ] Regra violada: [Sentence case / Máximo palavras / Gerúndio / etc]

**Contexto adicional**:
[Captura de tela ou linha de código]

**Prioridade**: [P0 - Crítico / P1 - Alto / P2 - Médio / P3 - Baixo]

**Labels**: `nomenclature`, `ux`, `consistency`
```

---

## 🎯 Metas de Conformidade

### Fase 1 (Atual)
- **Meta**: 80% de conformidade nas 8 telas críticas
- **Prazo**: 2 semanas
- **Responsável**: Time de UX

### Fase 2
- **Meta**: 95% de conformidade em toda aplicação
- **Prazo**: 1 mês
- **Responsável**: Time completo

### Fase 3
- **Meta**: Automação completa de validação via CI/CD
- **Prazo**: 2 meses
- **Responsável**: Time de Engenharia

---

## 📚 Referências

- **Nomenclatura Padrão**: `docs/NOMENCLATURA_PADRONIZADA.md`
- **Microcopy Guide**: `docs/MICROCOPY_GUIDE.md`
- **Constantes de Navegação**: `src/constants/navigation.ts`
- **i18n (Futuro)**: `src/i18n/pt-BR.json`

---

**Última Atualização**: 2024-11-14  
**Versão**: 1.0  
**Responsável**: Time Fabrik  
**Próxima Revisão**: 2024-12-14
