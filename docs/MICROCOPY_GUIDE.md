# Guia de Microcopy e Linguagem - Fabrik Performance

## 📋 Visão Geral

Este documento define os padrões de linguagem, tom e estilo para toda a interface da Fabrik Performance. O objetivo é criar uma experiência consistente, clara e profissional em todos os pontos de contato com o usuário.

---

## 🎯 Voz e Tom da Marca

### Voz (Personalidade Consistente)
Nossa voz é:
- **Profissional**: Séria e confiável, mas não corporativa
- **Direta**: Clara e objetiva, sem rodeios
- **Encorajadora**: Positiva e motivadora, focada em progresso

### Tom (Adaptação ao Contexto)
O tom varia conforme a situação:

| Contexto | Tom | Exemplo |
|----------|-----|---------|
| **Sucesso** | Positivo e celebratório | "Aluno criado com sucesso" |
| **Erro** | Calmo e solucionador | "Erro ao salvar. Tente novamente" |
| **Vazio** | Encorajador e acionável | "Comece adicionando seu primeiro aluno" |
| **Onboarding** | Educativo e acolhedor | "Vamos começar criando sua conta" |
| **Crítico** | Sério e claro | "Esta ação não pode ser desfeita" |

---

## ✍️ Regras de Escrita

### 1. Capitalização

#### Sentence case (padrão)
Use para:
- Títulos de seções
- Labels de formulário
- Mensagens de toast
- Descrições

```
✅ Adicionar novo aluno
✅ Nome completo
✅ Aluno criado com sucesso

❌ Adicionar Novo Aluno
❌ Nome Completo
❌ ALUNO CRIADO COM SUCESSO
```

#### ALL CAPS
**Nunca use**, exceto em siglas (HIIT, RLS, API).

### 2. Pontuação

#### Títulos e Labels
Sem ponto final:
```
✅ Nome completo
✅ Cadastrar aluno
✅ Nenhum exercício encontrado

❌ Nome completo.
❌ Cadastrar aluno.
```

#### Mensagens e Descrições
Com ponto final quando frase completa:
```
✅ Comece adicionando seu primeiro aluno.
✅ Esta ação não pode ser desfeita.

❌ Comece adicionando seu primeiro aluno
```

#### Toasts
Sem ponto final em mensagens curtas:
```
✅ Aluno criado com sucesso
✅ Erro ao salvar dados

❌ Aluno criado com sucesso.
```

### 3. Verbos

#### Botões e Ações
Use infinitivo + contexto:
```
✅ Salvar aluno
✅ Sincronizar agora
✅ Criar prescrição
✅ Filtrar resultados

❌ Salvar
❌ OK
❌ Prosseguir
❌ Executar
```

#### Mensagens de Sucesso
Use particípio passado:
```
✅ Aluno criado com sucesso
✅ Treino registrado com sucesso
✅ Sincronização concluída

❌ Criou aluno com sucesso
❌ Registrando treino
```

#### Estados de Loading
Use gerúndio:
```
✅ Salvando...
✅ Sincronizando...
✅ Processando...

❌ Salvar...
❌ Sincronizar...
```

### 4. Palavras Bloqueadas

Evite termos vagos ou técnicos:

| ❌ Evitar | ✅ Usar |
|-----------|---------|
| OK | Confirmar / Salvar / Continuar |
| Prosseguir | Continuar / Avançar |
| Executar | Aplicar / Salvar / Criar |
| Cancelar operação | Cancelar |
| Submeter | Enviar / Salvar |
| Dados | Informações / Alunos / Treinos |
| Sistema | Aplicação / Plataforma |

---

## 🎨 Padrões por Componente

### Botões

#### Botões Primários (CTAs)
Verbo + contexto específico:
```typescript
// ✅ Bom
<Button>Salvar aluno</Button>
<Button>Criar prescrição</Button>
<Button>Sincronizar dados</Button>

// ❌ Ruim
<Button>Salvar</Button>
<Button>Criar</Button>
<Button>OK</Button>
```

#### Botões Secundários
Ações de cancelamento ou navegação:
```typescript
<Button variant="outline">Cancelar</Button>
<Button variant="ghost">Voltar</Button>
<Button variant="secondary">Ver detalhes</Button>
```

#### Botões Destrutivos
Sempre confirmar:
```typescript
<Button variant="destructive">Excluir aluno</Button>
// + Dialog de confirmação
```

### Toasts

#### Estrutura
- **Título**: Curto e claro (máx. 50 caracteres)
- **Descrição** (opcional): Detalhes técnicos ou próximo passo

```typescript
// ✅ Sucesso simples
notify.success("Aluno criado com sucesso");

// ✅ Sucesso com contexto
notify.success("Prescrição atribuída", {
  description: "O aluno receberá notificação por e-mail"
});

// ✅ Erro com detalhes técnicos
notify.error("Erro ao salvar aluno", {
  description: error.message
});

// ✅ Erro genérico
notify.error("Erro ao concluir operação");
```

#### Tipos

**Sucesso**: Confirma ação concluída
```typescript
notify.success("Treino registrado com sucesso");
notify.success("Sincronização concluída");
```

**Erro**: Informa falha + próxima ação
```typescript
notify.error("Erro ao salvar dados", {
  description: "Verifique sua conexão e tente novamente"
});
```

**Aviso**: Alerta sobre consequências
```typescript
notify.warning("Alguns dados não foram sincronizados", {
  description: "Tente sincronizar novamente em alguns minutos"
});
```

**Info**: Informação neutra
```typescript
notify.info("Sincronização em andamento", {
  description: "Pode levar alguns minutos"
});
```

**Loading**: Operação em progresso
```typescript
const loader = notify.loading("Salvando aluno...");
// ... operação
loader.success("Aluno salvo com sucesso");
```

### Estados Vazios (EmptyState)

#### Estrutura
- **Ícone**: Visual relevante ao contexto
- **Título**: Descreve o estado atual
- **Descrição**: Explica por que está vazio + próximo passo
- **CTA**: Ação principal para resolver

```typescript
<EmptyState
  icon={<Users className="h-6 w-6" />}
  title="Nenhum aluno cadastrado"
  description="Comece adicionando seu primeiro aluno para gerenciar treinos"
  primaryAction={{
    label: "Adicionar aluno",
    onClick: () => openDialog()
  }}
/>
```

#### Cenários Específicos

**Listagem vazia inicial**:
```
Título: "Nenhum [item] cadastrado"
Descrição: "Comece adicionando seu primeiro [item]..."
CTA: "Adicionar [item]"
```

**Filtros sem resultado**:
```
Título: "Nenhum resultado encontrado"
Descrição: "Tente ajustar os filtros ou limpar a busca"
CTA: "Limpar filtros"
```

**Módulo desabilitado**:
```
Título: "Recurso não disponível"
Descrição: "Este recurso estará disponível em breve"
CTA: null
```

### Estados de Erro (ErrorState)

#### Estrutura
- **Ícone**: AlertCircle vermelho
- **Título**: Descreve o erro de forma clara
- **Descrição**: Detalhes técnicos (quando seguro)
- **CTAs**: "Tentar novamente" + "Ver detalhes" (opcional)

```typescript
<ErrorState
  title="Erro ao carregar alunos"
  description="Não foi possível conectar ao servidor"
  onRetry={() => refetch()}
/>
```

#### Cenários Específicos

**Erro de rede**:
```
Título: "Erro de conexão"
Descrição: "Verifique sua conexão e tente novamente"
CTA: "Tentar novamente"
```

**Erro de permissão**:
```
Título: "Acesso negado"
Descrição: "Você não tem permissão para esta ação"
CTA: null
```

**Erro desconhecido**:
```
Título: "Algo deu errado"
Descrição: "Tente novamente ou entre em contato com o suporte"
CTA: "Tentar novamente"
```

### Validações de Formulário

#### Mensagens Inline
Específicas e acionáveis:

```typescript
// ✅ Bom
"Campo obrigatório"
"Mínimo de 8 caracteres"
"E-mail inválido"
"Data não pode ser no passado"

// ❌ Ruim
"Erro"
"Valor inválido"
"Preencha corretamente"
```

#### Helpers (Textos de Ajuda)
Instruções preventivas:

```typescript
<FormField
  label="Senha"
  help="Use ao menos 8 caracteres, incluindo números"
/>

<FormField
  label="Carga"
  help="Carga utilizada em kg"
/>
```

#### Placeholders
Exemplos ou formatos:

```typescript
placeholder="Digite o nome completo"
placeholder="seu@email.com"
placeholder="Ex: 3x12 repetições"

// ❌ Nunca substituir label
placeholder="Nome" // ruim
```

### Confirmações

#### Ações Destrutivas
Sempre confirmar com AlertDialog:

```typescript
<AlertDialog>
  <AlertDialogTitle>Excluir aluno?</AlertDialogTitle>
  <AlertDialogDescription>
    Esta ação não pode ser desfeita. Todos os treinos e dados serão removidos.
  </AlertDialogDescription>
  <AlertDialogCancel>Cancelar</AlertDialogCancel>
  <AlertDialogAction variant="destructive">
    Excluir
  </AlertDialogAction>
</AlertDialog>
```

#### Mudanças Não Salvas
Avisar antes de sair:

```
Título: "Alterações não salvas"
Descrição: "Se sair agora, suas alterações serão perdidas"
CTAs: "Sair sem salvar" / "Continuar editando"
```

---

## 🌍 Internacionalização (i18n)

### Estrutura do Dicionário

**Localização**: `src/i18n/pt-BR.json`

```json
{
  "actions": { ... },      // Verbos de ação
  "feedback": { ... },     // Mensagens de status
  "empty": { ... },        // Estados vazios
  "errors": { ... },       // Erros genéricos
  "forms": { ... },        // Labels e helpers
  "filters": { ... },      // Filtros
  "modules": { ... },      // Por módulo (students, workouts, etc)
  "confirmations": { ... },// Confirmações
  "validation": { ... }    // Validações específicas
}
```

### Uso

```typescript
import i18n from "@/i18n/pt-BR.json";

// Acesso direto
const label = i18n.forms.name; // "Nome"
const action = i18n.actions.save; // "Salvar"

// Com interpolação (futuro)
const error = i18n.errors.minLength.replace("{{min}}", "8");
// "Mínimo de 8 caracteres"
```

### Chaves Semânticas

Use nomes descritivos e hierárquicos:

```
✅ modules.students.created
✅ empty.exercises.title
✅ errors.invalidEmail

❌ msg1
❌ error_text
❌ label_name
```

---

## 📊 Formatação de Dados

### Números
- **Separador decimal**: vírgula (,)
- **Separador milhar**: ponto (.)
- **Exemplo**: 1.234,56

```typescript
const formatted = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
}).format(value);
```

### Datas e Horas
- **Formato curto**: 15/01/2024
- **Formato longo**: 15 de janeiro de 2024
- **Hora**: 14:30 (24h)

```typescript
// Curto
format(date, 'dd/MM/yyyy', { locale: ptBR });

// Longo
format(date, "d 'de' MMMM 'de' yyyy", { locale: ptBR });

// Com hora
format(date, 'dd/MM/yyyy HH:mm', { locale: ptBR });
```

### Unidades
- **Peso**: kg (quilogramas)
- **Distância**: m, km
- **Tempo**: s, min, h
- **Temperatura**: °C

```
✅ 12,5 kg
✅ 3 km
✅ 45 min
✅ 4 °C

❌ 12.5kg
❌ 3km
❌ 45min
```

---

## ♿ Acessibilidade

### ARIA Labels

```typescript
// Spinners
<Loader2 className="animate-spin" aria-label="Carregando" />

// Ícones decorativos
<Icon aria-hidden="true" />

// Botões só com ícone
<Button aria-label="Editar aluno">
  <Edit2 />
</Button>
```

### Live Regions

```typescript
// Toasts
<Toast role="status" aria-live="polite" />

// Erros críticos
<ErrorState role="alert" aria-live="assertive" />

// Estados vazios
<EmptyState role="status" aria-live="polite" />
```

### Foco e Navegação

- Ordem lógica de tabulação
- Foco visível em todos os elementos interativos
- Esc fecha dialogs e dropdowns
- Enter confirma ações primárias

---

## 🧪 Checklist de QA

### Para Cada Nova Feature

- [ ] Todos os botões têm labels claros e contextuais
- [ ] Toasts exibidos em sucesso e erro
- [ ] Estados vazios implementados com EmptyState
- [ ] Erros tratados com ErrorState + retry
- [ ] Validações inline em formulários
- [ ] Mensagens de erro específicas por campo
- [ ] Textos vêm do dicionário i18n (não hardcoded)
- [ ] ARIA labels em ícones e spinners
- [ ] Foco visível em elementos interativos
- [ ] Navegação por teclado funcional
- [ ] Números e datas formatados em pt-BR
- [ ] Confirmação em ações destrutivas

---

## 📚 Exemplos de Uso

### Criar Aluno (Fluxo Completo)

```typescript
// 1. Botão CTA
<Button onClick={openDialog}>
  Adicionar aluno
</Button>

// 2. Validação inline
<FormField
  label="Nome completo"
  error={errors.name?.message} // "Campo obrigatório"
  help="Nome que aparecerá nos treinos"
/>

// 3. Loading
const loader = notify.loading("Salvando aluno...");

// 4. Sucesso
loader.success("Aluno criado com sucesso");

// 5. Erro
loader.error("Erro ao criar aluno", {
  description: error.message
});

// 6. Estado vazio (lista inicial)
<EmptyState
  icon={<Users />}
  title="Nenhum aluno cadastrado"
  description="Comece adicionando seu primeiro aluno"
  primaryAction={{
    label: "Adicionar aluno",
    onClick: openDialog
  }}
/>
```

### Sincronização Oura

```typescript
// 1. Botão
<Button onClick={syncOura}>
  Sincronizar agora
</Button>

// 2. Loading progressivo
const loader = notify.loading("Sincronizando dados do Oura...");
loader.update("Baixando métricas de sono...");
loader.update("Processando atividades...");

// 3. Sucesso
loader.success("Sincronização concluída", {
  description: "120 novas métricas adicionadas"
});

// 4. Erro
loader.error("Erro na sincronização", {
  description: "Verifique a conexão com o Oura Ring"
});
```

### Excluir Item

```typescript
// 1. Botão destrutivo
<Button variant="destructive" onClick={confirmDelete}>
  Excluir aluno
</Button>

// 2. Confirmação
<AlertDialog>
  <AlertDialogTitle>Excluir aluno?</AlertDialogTitle>
  <AlertDialogDescription>
    Esta ação não pode ser desfeita. Todos os treinos e dados 
    de {student.name} serão removidos permanentemente.
  </AlertDialogDescription>
  <AlertDialogCancel>Cancelar</AlertDialogCancel>
  <AlertDialogAction variant="destructive" onClick={handleDelete}>
    Excluir aluno
  </AlertDialogAction>
</AlertDialog>

// 3. Toast
notify.success("Aluno excluído com sucesso");
```

---

## 🚀 Recursos Adicionais

### Ferramentas

- **Vale i18n**: Linter de chaves i18n não utilizadas
- **Storybook**: Biblioteca visual de microcopy
- **Axe DevTools**: Validação de acessibilidade

### Referências

- [Material Design Writing](https://material.io/design/communication/writing.html)
- [Mailchimp Content Style Guide](https://styleguide.mailchimp.com/)
- [Microsoft Writing Style Guide](https://docs.microsoft.com/en-us/style-guide/welcome/)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)

---

**Última atualização**: 2024-01-15  
**Responsável**: Time Fabrik Performance  
**Versão**: 1.0
