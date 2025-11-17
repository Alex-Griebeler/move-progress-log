# Guia de Microinterações Premium - Fabrik Performance

Microinterações premium implementadas para elevar a percepção de qualidade e resposta do sistema.

## 🎯 Visão Geral

As microinterações adicionam feedback visual sutil e elegante às ações do usuário, criando uma experiência mais fluida e responsiva.

## 🎨 Componentes Implementados

### 1. **Cards Interativos** (`.card-interactive`)

**Onde usar:**
- WorkoutCard
- PrescriptionCard  
- StudentCard (quando clicável)
- Qualquer card que serve como link/botão

**Comportamento:**
```css
/* Hover: escala suave + elevação shadow */
transform: scale(1.02);
box-shadow: elevation premium;
transition: 200ms cubic-bezier(0.4, 0, 0.2, 1);

/* Active: compressão tátil */
transform: scale(0.98);
```

**Exemplo de uso:**
```tsx
<Card className="card-interactive card-glass-hover" onClick={handleClick}>
  {/* conteúdo */}
</Card>
```

---

### 2. **Botões com Active Feedback**

**Comportamento automático:**
- Todos os botões têm `active:scale-[0.98]` aplicado
- Transição: 200ms ease-out
- Responde ao `prefers-reduced-motion`

**Classes disponíveis:**
```tsx
// Feedback de compressão já incluído em todos botões
<Button variant="default">Ação</Button>

// Sem alteração necessária - já aplicado globalmente
```

---

### 3. **Tabs Fluidas** (`.tab-smooth`)

**Comportamento:**
- Transição suave entre estados: 300ms cubic-bezier
- Hover state antes da ativação
- Fade-in no conteúdo ao trocar tabs

**Exemplo:**
```tsx
<Tabs defaultValue="overview">
  <TabsList>
    <TabsTrigger value="overview">Visão Geral</TabsTrigger>
    {/* Transição automática aplicada */}
  </TabsList>
  <TabsContent value="overview">
    {/* Fade-in automático ao aparecer */}
  </TabsContent>
</Tabs>
```

---

### 4. **Accordions Suaves**

**Comportamento:**
- Expand/collapse: 300ms ease-out
- Chevron rotation sincronizada
- Hover underline no trigger

**Já implementado em:**
- `AccordionTrigger` - 300ms transitions
- `AccordionContent` - animate-accordion-down/up

---

### 5. **Animações Stagger em Listas**

**Classes disponíveis:**
```css
.stagger-item-1 { animation-delay: 0ms; }
.stagger-item-2 { animation-delay: 100ms; }
.stagger-item-3 { animation-delay: 200ms; }
/* ... até .stagger-item-8 */
```

**Exemplo de uso:**
```tsx
{items.map((item, index) => (
  <div 
    key={item.id}
    className={`animate-fade-in stagger-item-${Math.min(index + 1, 8)}`}
  >
    <ItemCard {...item} />
  </div>
))}
```

**Aplicado em:**
- ✅ Dashboard: StatCards (4 items stagger)
- ✅ Dashboard: WorkoutCards (lista de sessões)
- ✅ StudentsPage: StudentCards (lista de alunos)
- 🔲 PrescriptionsPage: PrescriptionCards (próximo passo)
- 🔲 ExercisesPage: ExerciseCards (próximo passo)

---

## 🎭 Timing & Easing Reference

| Interação | Duration | Easing | Uso |
|-----------|----------|--------|-----|
| **Hover** | 200ms | ease-out | Cards, botões |
| **Active** | 150ms | ease-out | Feedback de clique |
| **Tabs** | 300ms | cubic-bezier(0.4, 0, 0.2, 1) | Transições de estado |
| **Accordion** | 300ms | ease-out | Expand/collapse |
| **Stagger** | +100ms/item | - | Entrada sequencial |

---

## ♿ Acessibilidade

**Prefers Reduced Motion:**
Todas as microinterações respeitam `prefers-reduced-motion: reduce`:

```css
@media (prefers-reduced-motion: reduce) {
  .card-interactive:hover,
  .card-interactive:active,
  .button-feedback:active {
    transform: none;
  }
  
  .stagger-item-* {
    animation-delay: 0ms !important;
  }
}
```

---

## 🚀 Performance

**Otimizações implementadas:**
- Uso de `transform` (GPU-accelerated) em vez de `top/left`
- `will-change` evitado (usado apenas quando necessário)
- Transições limitadas a propriedades compostas
- Stagger limitado a 8 items para evitar delays longos

---

## 📋 Checklist de Implementação

**Para adicionar microinteração em novo componente:**

- [ ] Card clicável? → adicionar `.card-interactive`
- [ ] Lista de items? → adicionar stagger `.stagger-item-{n}`
- [ ] Tab navigation? → já aplicado automaticamente
- [ ] Accordion? → já aplicado automaticamente
- [ ] Botão customizado? → herda feedback automaticamente
- [ ] Testar com `prefers-reduced-motion` ativado

---

## 🎨 Exemplos Completos

### Card Interativo com Stagger
```tsx
<div className="grid grid-cols-3 gap-4">
  {items.map((item, index) => (
    <div 
      key={item.id}
      className={`animate-fade-in stagger-item-${Math.min(index + 1, 8)}`}
    >
      <Card 
        className="card-interactive card-glass-hover"
        onClick={() => handleClick(item.id)}
      >
        <CardHeader>
          <CardTitle>{item.title}</CardTitle>
        </CardHeader>
        <CardContent>
          {item.content}
        </CardContent>
      </Card>
    </div>
  ))}
</div>
```

### Stats Grid com Stagger
```tsx
<div className="grid grid-cols-4 gap-4">
  <div className="animate-fade-in stagger-item-1">
    <StatCard title="Total" value={100} />
  </div>
  <div className="animate-fade-in stagger-item-2">
    <StatCard title="Mensal" value={30} />
  </div>
  <div className="animate-fade-in stagger-item-3">
    <StatCard title="Ativos" value={50} />
  </div>
  <div className="animate-fade-in stagger-item-4">
    <StatCard title="Média" value={25} />
  </div>
</div>
```

---

## 🔄 Próximos Passos

1. ✅ Implementar stagger em listas do Dashboard
2. ✅ Implementar stagger em listas de Alunos
3. 🔲 Implementar stagger em listas de Prescrições
4. 🔲 Implementar stagger em listas de Exercícios
5. 🔲 Testar responsividade mobile de todas microinterações
6. 🔲 Validar acessibilidade com screen readers

---

**Documentação criada em:** 2025-11-17  
**Última atualização:** 2025-11-17
