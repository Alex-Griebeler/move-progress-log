# Guia de Navegação por Teclado - Fabrik Performance

Manual completo de navegação por teclado para usuários e testes de acessibilidade.

## ⌨️ Atalhos Globais

| Atalho | Função | Contexto |
|--------|--------|----------|
| **⌘K** / **Ctrl+K** | Abre busca global | Qualquer página |
| **Tab** | Próximo elemento focável | Global |
| **Shift+Tab** | Elemento anterior | Global |
| **Esc** | Fecha modal/dropdown | Quando aberto |
| **Enter** | Ativa botão/link focado | Elemento focado |
| **Space** | Ativa botão/checkbox focado | Elemento focado |

---

## 🔍 Navegação por Região

### Skip to Content
**Primeira tecla Tab** na página mostra o link "Pular para o conteúdo principal":
- Pressione **Enter** para pular navegação e ir direto ao conteúdo
- Útil para usuários de teclado e leitores de tela

### Sidebar (Menu Lateral)
1. **Tab** até o botão de toggle do sidebar
2. **Enter** ou **Space** para abrir/fechar
3. **Tab** para navegar entre itens do menu
4. **Enter** para selecionar item

### Breadcrumbs
1. **Tab** para primeiro item do breadcrumb
2. **Tab** para navegar entre níveis
3. **Enter** para seguir link

---

## 📝 Componentes Interativos

### Botões
```
Tab → Enter/Space para ativar
```
- Botões primários: **gradient** style
- Botões secundários: **outline** style
- Botões de ícone: possuem `aria-label`

### Dropdowns / Menus
```
Tab → Enter para abrir
↓ ↑ para navegar items
Enter para selecionar
Esc para fechar
```

### Tabs
```
Tab → Arrow keys (← →) para navegar
Enter para ativar tab
```
Exemplo: Tabs no StudentDetailPage (Training, Overview, Sessions...)

### Accordions
```
Tab → Enter/Space para expandir/colapsar
```

### Modals / Dialogs
```
Tab para navegar dentro do modal
Esc para fechar
Foco retorna ao elemento que abriu
```

### Cards Clicáveis
```
Tab → Enter para abrir
```
Exemplos:
- WorkoutCard → abre detalhes da sessão
- StudentCard → navega para perfil do aluno
- PrescriptionCard → expande detalhes

### Formulários
```
Tab para próximo campo
Shift+Tab para campo anterior
Enter para submit (quando aplicável)
Space para toggle checkbox/radio
↓ ↑ para select/combobox
```

---

## 🎯 Fluxos Comuns

### Adicionar Novo Aluno
1. **⌘K** → buscar "adicionar aluno" → **Enter**
   
   OU
   
2. Navegar para página Alunos
3. **Tab** até botão "Adicionar aluno" (gradient style, canto superior direito)
4. **Enter** para abrir modal
5. **Tab** para preencher campos
6. **Tab** até botão "Criar aluno"
7. **Enter** para confirmar

### Registrar Sessão de Treino
1. Navegar para Dashboard ou página do Aluno
2. **Tab** até botão "Registrar Sessão"
3. **Enter** para abrir opções
4. **Arrow Down** para escolher modo (Manual/Voz)
5. **Enter** para selecionar
6. **Tab** para preencher contexto da sessão
7. **Tab** + **Enter** para continuar

### Buscar Prescrição
1. **⌘K** para abrir busca global
2. Digite nome da prescrição
3. **Arrow Down/Up** para navegar resultados
4. **Enter** para abrir prescrição

### Filtrar Lista de Exercícios
1. Navegar para página Exercícios
2. **Tab** até botão de filtros (≡ ícone)
3. **Enter** para abrir
4. **Tab** para navegar filtros
5. **Space** para toggle checkboxes
6. **Tab** até "Aplicar" + **Enter**

---

## 🎨 Estados de Foco Visíveis

Todos os elementos interativos têm **indicador de foco visível**:

### Foco Padrão (ring duplo)
```css
box-shadow: 
  0 0 0 2px background,  /* Inner offset */
  0 0 0 4px primary;     /* Outer ring */
```

**Cor do ring:**
- Light mode: Terracota `#A45248`
- Dark mode: Terracota clara `#C97B6D`

### Elementos com Foco Especial

**Inputs e Textareas:**
```css
border-color: primary;
box-shadow: 
  0 0 0 1px primary,
  0 0 0 3px primary/20%;
```

**Cards Interativos:**
```css
box-shadow: 
  0 0 0 2px background,
  0 0 0 4px primary,
  elevation shadow;
```

---

## ♿ Funcionalidades de Acessibilidade

### Detecção de Navegação por Teclado
O sistema detecta quando você usa **Tab** pela primeira vez:
- Adiciona classe `keyboard-navigation` ao body
- Torna indicadores de foco mais proeminentes
- Remove classe ao usar mouse

### ARIA Labels
Todos os botões sem texto visível têm labels descritivos:
```tsx
// Botão de ícone
<Button size="icon" aria-label="Menu de ações">
  <MoreVertical />
</Button>

// Sidebar toggle
<SidebarTrigger aria-label="Abrir/Fechar menu lateral" />
```

### Landmarks e Regiões
Estrutura semântica para navegação por leitores de tela:
```html
<header> - Cabeçalho com navegação
<nav aria-label="Navegação principal"> - Menu sidebar
<main id="main-content"> - Conteúdo principal
<section aria-label="Estatísticas"> - Seção de stats
```

---

## 🧪 Testando Navegação por Teclado

### Checklist de Teste

**Navegação Básica:**
- [ ] Tab percorre TODOS elementos interativos
- [ ] Ordem de Tab faz sentido (top → bottom, left → right)
- [ ] Shift+Tab funciona na direção reversa
- [ ] Foco visível em TODOS elementos
- [ ] Nenhum "foco trap" (pode sair de qualquer modal)

**Ativação:**
- [ ] Enter ativa links e botões
- [ ] Space ativa botões e checkboxes
- [ ] Arrow keys navegam dropdowns
- [ ] Esc fecha modals e dropdowns

**Fluxos Completos:**
- [ ] Consegue criar aluno apenas com teclado
- [ ] Consegue registrar sessão apenas com teclado
- [ ] Consegue buscar e abrir prescrição
- [ ] Consegue filtrar lista de exercícios

**Foco Visual:**
- [ ] Foco sempre visível (não escondido)
- [ ] Cor de foco tem contraste adequado (WCAG AA)
- [ ] Foco não é coberto por outros elementos

---

## 🔧 Configurações do Navegador

### Chrome
```
chrome://settings/accessibility
```
- Ativar "Navegar páginas com cursor de texto"
- Ativar "Destacar objeto focado"

### Firefox
```
about:preferences#general → Browsing
```
- ✓ "Sempre usar teclas de cursor para navegar em páginas"

### Safari
```
Preferências → Avançado
```
- ✓ "Pressionar Tab destaca cada item em uma página"

---

## 📋 Referência Rápida: Componentes

| Componente | Tab | Enter | Space | Arrows | Esc |
|------------|-----|-------|-------|--------|-----|
| Button | ✓ | ✓ | ✓ | - | - |
| Link | ✓ | ✓ | - | - | - |
| Input | ✓ | - | - | - | - |
| Select | ✓ | ✓ | - | ↓↑ | ✓ |
| Checkbox | ✓ | - | ✓ | - | - |
| Radio | ✓ | - | ✓ | ↓↑ | - |
| Tabs | ✓ | ✓ | - | ←→ | - |
| Accordion | ✓ | ✓ | ✓ | - | - |
| Modal | ✓ | - | - | - | ✓ |
| Dropdown | ✓ | ✓ | - | ↓↑ | ✓ |
| Card | ✓ | ✓ | - | - | - |

---

## 🐛 Problemas Comuns

### "Não consigo ver onde está o foco"
**Solução:** 
- Pressione **Tab** uma vez para ativar detecção de teclado
- Verifique se não está usando extensão que oculta foco
- Confirme contraste do navegador (Settings → Appearance)

### "Tab não funciona em um elemento"
**Possíveis causas:**
- Elemento não é interativo (div sem role)
- Elemento tem `tabindex="-1"`
- JavaScript bloqueou comportamento padrão

**Como reportar:** Abrir issue descrevendo elemento e página

### "Foco fica preso em modal"
**Comportamento esperado:** 
- Foco deve circular dentro do modal aberto
- Esc deve fechar modal e retornar foco
- Se não funciona, é um bug - reportar

---

## 📚 Recursos

- [WebAIM Keyboard Accessibility](https://webaim.org/articles/keyboard/)
- [MDN Keyboard-navigable JS widgets](https://developer.mozilla.org/en-US/docs/Web/Accessibility/Keyboard-navigable_JavaScript_widgets)
- [ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)

---

**Documentação criada em:** 2025-11-17  
**Para suporte:** Entre em contato via sistema ou documentação interna
