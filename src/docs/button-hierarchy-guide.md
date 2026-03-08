# Guia de Hierarquia de Botões - Fabrik

## Propósito
Este guia define o uso consistente das variantes e tamanhos de botões para criar hierarquia visual clara e melhorar a UX.

---

## Variantes Disponíveis

### 1. **default** - Ações Primárias
**Quando usar:**
- Call-to-actions principais
- Ação padrão de confirmação
- Salvar, criar, confirmar
- Máximo 1-2 por tela

**Exemplos:**
```tsx
<Button variant="default">Salvar</Button>
<Button variant="default">Criar Prescrição</Button>
```

---

### 2. **outline** - Ações Secundárias
**Quando usar:**
- Ações complementares
- Cancelar, voltar, editar
- Múltiplas opções na mesma linha

**Exemplos:**
```tsx
<Button variant="outline">Cancelar</Button>
<Button variant="outline">Editar</Button>
```

---

### 3. **secondary** - Ações Terciárias
**Quando usar:**
- Ações menos importantes
- Filtros, ordenação
- Estados inativos

**Exemplos:**
```tsx
<Button variant="secondary">Filtrar</Button>
<Button variant="secondary">Ordenar</Button>
```

---

### 4. **ghost** - Ações Mínimas
**Quando usar:**
- Ícones de navegação
- Ações inline em listas
- Fechar dialogs, menus

**Exemplos:**
```tsx
<Button variant="ghost" size="icon-sm"><ArrowLeft /></Button>
<Button variant="ghost">Limpar Filtros</Button>
```

---

### 5. **destructive** - Ações Destrutivas
**Quando usar:**
- Deletar registros
- Ações irreversíveis
- **SEMPRE** com AlertDialog de confirmação

**Exemplos:**
```tsx
<Button variant="destructive">Excluir Aluno</Button>
```

---

### 6. **link** - Links de Navegação
**Quando usar:**
- Navegação interna
- Links para documentação

**Exemplos:**
```tsx
<Button variant="link">Saiba mais</Button>
```

---

### 7. **success / info / warning** - Status
**Quando usar:**
- Ações contextuais associadas a um estado
- Confirmações positivas (success)
- Informações (info)
- Alertas (warning)

---

## Tamanhos Padronizados

| Size | Altura | Uso |
|------|--------|-----|
| `sm` | 32px (h-8) | Ações em listas, tabelas, filtros |
| `default` | 40px (h-10) | Ação padrão em formulários e páginas |
| `lg` | 48px (h-12) | CTAs de gravação, ações de destaque |
| `icon` | 40x40px | Botão de ícone padrão (header, toolbar) |
| `icon-sm` | 32x32px | Botão de ícone em listas, cards, menus |
| `icon-lg` | 48x48px | Botão de ícone destacado |

### ⚠️ Regra Importante
**NUNCA** sobrescreva o tamanho do botão com classes como `className="h-8 w-8"`. Use a prop `size` correta:

```tsx
// ✅ CORRETO
<Button variant="ghost" size="icon-sm">
  <MoreVertical className="h-4 w-4" />
</Button>

// ❌ ERRADO
<Button variant="ghost" size="icon" className="h-8 w-8">
  <MoreVertical className="h-4 w-4" />
</Button>
```

---

## Regras de Uso

### ✅ BOM
```tsx
<DialogFooter>
  <Button variant="outline" onClick={onCancel}>Cancelar</Button>
  <Button variant="default" onClick={onSave}>Salvar</Button>
</DialogFooter>
```

### ❌ RUIM
```tsx
<DialogFooter>
  <Button variant="default" onClick={onCancel}>Cancelar</Button>
  <Button variant="default" onClick={onSave}>Salvar</Button>
</DialogFooter>
```

---

## Checklist de Validação

- [ ] Hierarquia visual clara (default → outline → ghost)?
- [ ] Botões `destructive` têm confirmação?
- [ ] Tamanhos usam prop `size` sem overrides de className?
- [ ] Botões de ícone em listas/cards usam `size="icon-sm"`?
- [ ] Botões de ícone no header/toolbar usam `size="icon"`?
