# Checklist de Microcopy - Fabrik Performance

## 📋 Visão Geral

Use este checklist para **validar** implementações antes de commit/PR.

> **Leia antes**: [MICROCOPY_GUIDE.md](./MICROCOPY_GUIDE.md) para entender regras.  
> **Implemente com**: [MICROCOPY_IMPLEMENTATION.md](./MICROCOPY_IMPLEMENTATION.md) para detalhes técnicos.

---

## ✅ Botões e CTAs

- [ ] Botão primário usa verbo + contexto ("Salvar aluno", não "Salvar")
- [ ] Máximo 2-3 palavras no label
- [ ] Usa verbos do dicionário i18n (`actions.*`)
- [ ] Botões destrutivos têm confirmação
- [ ] Ícones acompanham texto quando apropriado
- [ ] Botões apenas com ícone têm `aria-label`

**Exemplos aprovados**:
```typescript
✅ <Button>Salvar aluno</Button>
✅ <Button>Sincronizar agora</Button>
✅ <Button>Aplicar filtros</Button>

❌ <Button>OK</Button>
❌ <Button>Prosseguir</Button>
❌ <Button>Executar</Button>
```

---

## 📢 Toasts (Feedback)

- [ ] Toast de sucesso em toda mutation bem-sucedida
- [ ] Toast de erro com descrição técnica (quando seguro)
- [ ] Título curto e claro (máx. 50 caracteres)
- [ ] Usa `notify` ao invés de `toast` diretamente
- [ ] Textos vêm do i18n (`modules.*.created`, etc)
- [ ] Loading toast atualizado progressivamente em operações longas

> Veja exemplos de código completos em [MICROCOPY_IMPLEMENTATION.md](./MICROCOPY_IMPLEMENTATION.md#utilitário-de-toasts)

---

## 🗂️ Estados Vazios

- [ ] Usa componente `EmptyState`
- [ ] Ícone relevante ao contexto
- [ ] Título descreve estado atual
- [ ] Descrição explica + sugere próximo passo
- [ ] CTA primário presente quando apropriado
- [ ] Textos vêm do i18n (`empty.*`)
- [ ] `role="status"` e `aria-live="polite"` presentes

**Cenários específicos**:
- [ ] Listagem inicial vazia: "Nenhum [item] cadastrado" + CTA
- [ ] Filtros sem resultado: "Nenhum resultado encontrado" + "Limpar filtros"
- [ ] Recurso desabilitado: "Recurso não disponível" + explicação

> Veja exemplos de código completos em [MICROCOPY_IMPLEMENTATION.md](./MICROCOPY_IMPLEMENTATION.md#emptystate-component)

---

## ⚠️ Estados de Erro

- [ ] Usa componente `ErrorState`
- [ ] Título claro sobre o problema
- [ ] Descrição com detalhes (quando seguro)
- [ ] Botão "Tentar novamente" quando aplicável
- [ ] `role="alert"` e `aria-live="polite"` presentes
- [ ] Textos vêm do i18n (`errors.*`, `modules.*.error*`)

**Cenários específicos**:
- [ ] Erro de rede: título + "Verifique sua conexão"
- [ ] Erro de permissão: "Acesso negado" + explicação
- [ ] Erro desconhecido: "Algo deu errado" + retry

> Veja exemplos de código completos em [MICROCOPY_IMPLEMENTATION.md](./MICROCOPY_IMPLEMENTATION.md#errorstate-component)

---

## 📝 Formulários e Validações

### Labels e Inputs

- [ ] Todo input tem label visível
- [ ] Label descreve claramente o campo
- [ ] Placeholder não substitui label
- [ ] Placeholder mostra exemplo/formato quando útil
- [ ] Helpers instrucionais quando necessário
- [ ] Labels vêm do i18n (`forms.*`)

> Veja exemplos de código completos em [MICROCOPY_IMPLEMENTATION.md](./MICROCOPY_IMPLEMENTATION.md#formulários-com-validação)

### Validações

- [ ] Validação inline no `onBlur`
- [ ] Validação consolidada no `onSubmit`
- [ ] Mensagens de erro específicas por tipo
- [ ] Foco no primeiro campo com erro
- [ ] Mensagens vêm do i18n (`errors.*`, `validation.*`)
- [ ] `aria-invalid` quando erro presente
- [ ] `aria-describedby` aponta para mensagem de erro

**Mensagens padrão**:
```typescript
// Zod schema com i18n
z.string()
  .min(1, i18n.errors.required)
  .max(100, i18n.errors.maxLength.replace("{{max}}", "100"))
  .email(i18n.errors.invalidEmail)
```

---

## 🔄 Loading States

- [ ] Spinner com `aria-label` descritivo
- [ ] Texto de loading específico ao contexto
- [ ] Loading progressivo em operações longas
- [ ] Skeleton preserva layout (sem "pulo")
- [ ] Textos vêm do i18n (`feedback.loading`, etc)

**Exemplos**:
```typescript
// Spinner simples
<Loader2 className="animate-spin" aria-label="Carregando alunos..." />

// Loading progressivo
const loader = notify.loading("Sincronizando...");
loader.update("Baixando métricas...");
loader.update("Processando dados...");
loader.success("Sincronização concluída");
```

---

## 🚨 Confirmações

### Ações Destrutivas

- [ ] Sempre exibir `AlertDialog` antes de excluir
- [ ] Título claro da ação ("Excluir aluno?")
- [ ] Descrição explica consequências
- [ ] Menciona irreversibilidade quando aplicável
- [ ] Botão destrutivo com variant="destructive"
- [ ] Textos vêm do i18n (`confirmations.*`)

**Estrutura padrão**:
```typescript
<AlertDialog>
  <AlertDialogTitle>
    {i18n.confirmations.delete}
  </AlertDialogTitle>
  <AlertDialogDescription>
    {i18n.confirmations.deleteWarning}
    Todos os dados de <strong>{item.name}</strong> serão removidos.
  </AlertDialogDescription>
  <AlertDialogCancel>{i18n.actions.cancel}</AlertDialogCancel>
  <AlertDialogAction variant="destructive">
    {i18n.actions.delete}
  </AlertDialogAction>
</AlertDialog>
```

### Mudanças Não Salvas

- [ ] Avisar ao sair de formulário com alterações
- [ ] Título: "Alterações não salvas"
- [ ] Descrição: "Se sair agora, suas alterações serão perdidas"
- [ ] CTAs: "Sair sem salvar" / "Continuar editando"

---

## 🌍 Internacionalização (i18n)

- [ ] Nenhuma string hardcoded (exceto logs técnicos)
- [ ] Todas as strings vêm de `i18n/pt-BR.json`
- [ ] Chaves semânticas e hierárquicas
- [ ] Interpolação para valores dinâmicos
- [ ] Pluralização quando necessário

**Checklist de chaves**:
- [ ] `actions.*` - Verbos de ação
- [ ] `feedback.*` - Status de operações
- [ ] `empty.*` - Estados vazios
- [ ] `errors.*` - Erros genéricos
- [ ] `forms.*` - Labels e helpers
- [ ] `filters.*` - Filtros
- [ ] `modules.*` - Específico por módulo
- [ ] `confirmations.*` - Diálogos
- [ ] `validation.*` - Validações

---

## ♿ Acessibilidade

### ARIA Labels

- [ ] Spinners têm `aria-label="Carregando..."`
- [ ] Ícones decorativos têm `aria-hidden="true"`
- [ ] Botões apenas com ícone têm `aria-label`
- [ ] Links têm texto descritivo (não "clique aqui")

### Live Regions

- [ ] Toasts têm `aria-live="polite"`
- [ ] Erros críticos têm `aria-live="assertive"`
- [ ] Estados vazios têm `aria-live="polite"`
- [ ] Contadores dinâmicos têm `aria-live`

### Formulários

- [ ] Todo input tem label associado (`htmlFor`/`id`)
- [ ] Erros têm `aria-invalid="true"`
- [ ] `aria-describedby` aponta para helper/erro
- [ ] Campos obrigatórios indicados (visualmente e `aria-required`)

### Navegação

- [ ] Ordem de tabulação lógica
- [ ] Foco visível em todos os interativos
- [ ] Esc fecha dialogs/dropdowns
- [ ] Enter confirma ações primárias
- [ ] Tab navega entre campos

---

## 📊 Formatação de Dados

### Números

- [ ] Separador decimal: vírgula (1,5)
- [ ] Separador milhar: ponto (1.234)
- [ ] Formato: 1.234,56

```typescript
new Intl.NumberFormat('pt-BR').format(value);
```

### Datas

- [ ] Formato curto: 15/01/2024
- [ ] Formato longo: 15 de janeiro de 2024
- [ ] Hora: 14:30 (24h)

```typescript
format(date, 'dd/MM/yyyy', { locale: ptBR });
```

### Unidades

- [ ] Espaço entre número e unidade
- [ ] Unidades em pt-BR (kg, km, min, °C)

```
✅ 12,5 kg
✅ 3 km
✅ 45 min

❌ 12.5kg
❌ 3km
```

---

## 🧪 Testes Manuais

### Fluxo de Criação

1. [ ] Abrir dialog de criação
2. [ ] Validar campos obrigatórios (inline)
3. [ ] Submeter com erros (foco no primeiro)
4. [ ] Corrigir e submeter com sucesso
5. [ ] Ver toast de sucesso
6. [ ] Item aparece na listagem

### Fluxo de Erro

1. [ ] Simular erro de rede
2. [ ] Ver ErrorState com retry
3. [ ] Clicar em retry
4. [ ] Ver toast de erro com descrição
5. [ ] Validar textos claros e acionáveis

### Fluxo de Exclusão

1. [ ] Clicar em excluir
2. [ ] Ver dialog de confirmação
3. [ ] Ler consequências claramente
4. [ ] Cancelar (volta ao estado anterior)
5. [ ] Excluir (vê toast de sucesso)

### Navegação por Teclado

1. [ ] Tab entre campos (ordem lógica)
2. [ ] Enter submete formulários
3. [ ] Esc fecha dialogs
4. [ ] Foco visível sempre
5. [ ] Shift+Tab volta

---

## 📚 Recursos

### Ferramentas

- **Vale i18n**: Linter de chaves não utilizadas
- **Axe DevTools**: Validação de acessibilidade
- **React Hook Form DevTools**: Debug de formulários

### Referências

- [Guia de Linguagem](./MICROCOPY_GUIDE.md)
- [Guia de Implementação](./MICROCOPY_IMPLEMENTATION.md)
- [Dicionário i18n](../src/i18n/pt-BR.json)

---

**Como usar este checklist**:

1. Imprima ou tenha aberto em segunda tela
2. Revise cada seção ao criar/modificar features
3. Marque itens conforme implementa
4. Peça revisão de pares com foco em UX writing
5. Teste manualmente os fluxos críticos

**Dúvidas?** Consulte o [Guia de Linguagem](./MICROCOPY_GUIDE.md) ou pergunte ao time.

---

**Última atualização**: 2024-01-15  
**Versão**: 1.0
