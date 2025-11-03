# Guia de Hierarquia de Botões - Fabrik

## Propósito
Este guia define o uso consistente das variantes de botões para criar hierarquia visual clara e melhorar a UX.

---

## Variantes Disponíveis

### 1. **premium** - Ações Principais de Alto Impacto
**Quando usar:**
- Call-to-actions principais da aplicação
- Ações que geram receita ou engagement crítico
- Máximo 1 por tela

**Exemplos:**
```tsx
<Button variant="premium">Iniciar Treino Agora</Button>
<Button variant="premium">Registrar Sessão Completa</Button>
```

**Características:**
- Gradiente animado (primary → accent → primary)
- Sombra mais forte (shadow-xl → shadow-2xl)
- Border sutil para profundidade
- Transição suave de 500ms

---

### 2. **gradient** - Ações Importantes
**Quando usar:**
- Ações secundárias importantes
- Criar novo registro (aluno, prescrição)
- 1-2 por tela

**Exemplos:**
```tsx
<Button variant="gradient">Adicionar Aluno</Button>
<Button variant="gradient">Criar Prescrição</Button>
```

---

### 3. **default** - Ações Primárias
**Quando usar:**
- Ação padrão de confirmação
- Visualizar detalhes
- Navegação principal

**Exemplos:**
```tsx
<Button variant="default">Salvar</Button>
<Button variant="default">Ver Detalhes</Button>
```

---

### 4. **destructive** - Ações Destrutivas
**Quando usar:**
- Deletar registros
- Ações irreversíveis
- **SEMPRE** com AlertDialog de confirmação

**Exemplos:**
```tsx
<Button variant="destructive">Excluir Aluno</Button>
<AlertDialogAction className="bg-destructive">Confirmar Exclusão</AlertDialogAction>
```

---

### 5. **outline** - Ações Secundárias
**Quando usar:**
- Ações complementares
- Cancelar, voltar
- Editar, gerenciar
- Múltiplas opções na mesma linha

**Exemplos:**
```tsx
<Button variant="outline">Editar</Button>
<Button variant="outline">Cancelar</Button>
<Button variant="outline">Atribuir Alunos</Button>
```

---

### 6. **secondary** - Ações Terciárias
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

### 7. **ghost** - Ações Mínimas
**Quando usar:**
- Ícones de navegação
- Ações inline em listas
- Fechar dialogs

**Exemplos:**
```tsx
<Button variant="ghost" size="icon"><ArrowLeft /></Button>
<Button variant="ghost">Limpar Filtros</Button>
```

---

### 8. **link** - Links de Navegação
**Quando usar:**
- Navegação interna
- Links para documentação
- Call-to-actions leves

**Exemplos:**
```tsx
<Button variant="link">Saiba mais</Button>
<Button variant="link">Ver histórico completo</Button>
```

---

## Regras de Uso

### ✅ BOM
```tsx
<DialogFooter>
  <Button variant="outline" onClick={onCancel}>Cancelar</Button>
  <Button variant="default" onClick={onSave}>Salvar</Button>
</DialogFooter>

<div className="flex gap-2">
  <Button variant="premium">Registrar Sessão Voz</Button>
  <Button variant="outline">Importar Excel</Button>
</div>
```

### ❌ RUIM
```tsx
<DialogFooter>
  {/* Múltiplos botões sem hierarquia clara */}
  <Button variant="default" onClick={onCancel}>Cancelar</Button>
  <Button variant="default" onClick={onSave}>Salvar</Button>
</DialogFooter>

<div className="flex gap-2">
  {/* Dois botões premium na mesma tela */}
  <Button variant="premium">Ação 1</Button>
  <Button variant="premium">Ação 2</Button>
</div>
```

---

## Combinações Recomendadas

### Modal de Criação/Edição
```tsx
<Button variant="outline">Cancelar</Button>
<Button variant="gradient">Criar</Button>
```

### Card de Aluno
```tsx
<Button variant="default">Detalhes</Button>
<Button variant="secondary">Registrar Sessão</Button>
<Button variant="outline">Editar</Button>
<Button variant="destructive">Excluir</Button>
```

### Dashboard Principal
```tsx
<Button variant="premium">Iniciar Treino</Button>
<Button variant="gradient">Adicionar Aluno</Button>
<Button variant="outline">Ver Relatórios</Button>
```

---

## Checklist de Validação

Antes de implementar botões, pergunte:

- [ ] Existe apenas 1 botão `premium` por tela?
- [ ] Botões `destructive` têm confirmação?
- [ ] A hierarquia visual está clara (primary → secondary → tertiary)?
- [ ] Ações principais usam `default`, `gradient`, ou `premium`?
- [ ] Ações secundárias usam `outline` ou `secondary`?
- [ ] Ações mínimas usam `ghost` ou `link`?

---

## Acessibilidade

Todos os botões devem:
- Ter labels claros (evitar apenas ícones sem texto)
- Ser focáveis via teclado (já implementado por padrão)
- Ter contraste adequado (WCAG AA)
- Ter estados hover/focus visíveis

---

## Implementação Técnica

As variantes são definidas em `src/components/ui/button.tsx` usando `class-variance-authority`:

```tsx
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium...",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg...",
        premium: "bg-gradient-to-r from-primary via-accent to-primary bg-size-200...",
        // ... outras variantes
      },
    },
  }
);
```

Para animações de gradiente, adicionar ao `tailwind.config.ts`:
```ts
backgroundSize: {
  'size-200': '200% 200%',
},
backgroundPosition: {
  'pos-0': '0% 0%',
  'pos-100': '100% 100%',
},
```
