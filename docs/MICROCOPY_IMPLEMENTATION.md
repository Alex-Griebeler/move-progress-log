# Guia de Implementação - Sistema de Microcopy

## 📋 Visão Geral

Este documento explica **como implementar tecnicamente** o sistema de microcopy padronizado na aplicação Fabrik Performance.

> **Leia primeiro**: [MICROCOPY_GUIDE.md](./MICROCOPY_GUIDE.md) para entender voz, tom e regras de escrita.  
> **Valide com**: [MICROCOPY_CHECKLIST.md](./MICROCOPY_CHECKLIST.md) após implementar.

---

## 🛠️ Componentes e Utilitários

### 1. Sistema i18n

**Localização**: `src/i18n/pt-BR.json`

Dicionário centralizado com todas as strings da interface.

```typescript
// Estrutura
{
  "actions": {},        // Verbos de ação (salvar, editar, etc)
  "feedback": {},       // Mensagens de status
  "empty": {},          // Estados vazios
  "errors": {},         // Erros genéricos
  "forms": {},          // Labels e helpers de formulário
  "filters": {},        // Textos de filtros
  "modules": {},        // Específico por módulo
  "confirmations": {}, // Diálogos de confirmação
  "validation": {}      // Validações específicas
}
```

**Uso**:
```typescript
import i18n from "@/i18n/pt-BR.json";

// Acesso direto
const title = i18n.empty.students.title;
const action = i18n.actions.save;
const error = i18n.modules.students.errorCreate;
```

### 2. Utilitário de Toasts

**Localização**: `src/lib/notify.ts`

API unificada para todos os toasts da aplicação.

```typescript
import { notify } from "@/lib/notify";

// Sucesso simples
notify.success("Aluno criado com sucesso");

// Sucesso com descrição
notify.success("Sincronização concluída", {
  description: "120 novas métricas adicionadas"
});

// Erro
notify.error("Erro ao salvar aluno", {
  description: error.message
});

// Loading com controles
const loader = notify.loading("Salvando aluno...");
try {
  await saveStudent();
  loader.success("Aluno salvo com sucesso");
} catch (error) {
  loader.error("Erro ao salvar", error.message);
}

// Aviso
notify.warning("Alguns dados não foram sincronizados");

// Info
notify.info("Sincronização pode levar alguns minutos");
```

### 3. EmptyState Component

**Localização**: `src/components/EmptyState.tsx`

Exibe estados vazios com CTAs claros.

```typescript
import EmptyState from "@/components/EmptyState";
import { Users } from "lucide-react";

<EmptyState
  icon={<Users className="h-6 w-6" />}
  title="Nenhum aluno cadastrado"
  description="Comece adicionando seu primeiro aluno para gerenciar treinos"
  primaryAction={{
    label: "Adicionar aluno",
    onClick: () => setDialogOpen(true)
  }}
  secondaryAction={{
    label: "Importar lista",
    onClick: () => setImportOpen(true)
  }}
/>
```

**Props**:
- `icon`: Ícone do Lucide React
- `title`: Título do estado vazio
- `description`: Explicação + próximo passo
- `primaryAction`: CTA principal
- `secondaryAction`: CTA secundário (opcional)

### 4. ErrorState Component

**Localização**: `src/components/ErrorState.tsx`

Exibe erros com opções de retry.

```typescript
import { ErrorState } from "@/components/ErrorState";

<ErrorState
  title="Erro ao carregar alunos"
  description="Não foi possível conectar ao servidor"
  onRetry={() => refetch()}
  retryLabel="Tentar novamente"
/>
```

**Props**:
- `title`: Título do erro
- `description`: Detalhes técnicos (opcional)
- `onRetry`: Callback para retry
- `onDetails`: Callback para ver detalhes (opcional)
- `retryLabel`: Label do botão retry (padrão: "Tentar novamente")
- `detailsLabel`: Label do botão detalhes (padrão: "Ver detalhes")

---

## 📦 Padrões de Implementação

### Mutations (React Query)

Sempre exibir feedback de sucesso/erro:

```typescript
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { notify } from "@/lib/notify";
import i18n from "@/i18n/pt-BR.json";

export function useCreateStudent() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data) => {
      const { data: student, error } = await supabase
        .from("students")
        .insert(data)
        .select()
        .single();
      
      if (error) throw error;
      return student;
    },
    
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      notify.success(i18n.modules.students.created);
    },
    
    onError: (error: any) => {
      notify.error(i18n.modules.students.errorCreate, {
        description: error.message
      });
    }
  });
}
```

### Queries com Estados

Tratar loading, erro e vazio:

```typescript
import { useQuery } from "@tanstack/react-query";
import EmptyState from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { LoadingSpinner } from "@/components/LoadingSpinner";

function StudentsList() {
  const { data: students, isLoading, error, refetch } = useQuery({
    queryKey: ["students"],
    queryFn: fetchStudents
  });

  if (isLoading) {
    return <LoadingSpinner label="Carregando alunos..." />;
  }

  if (error) {
    return (
      <ErrorState
        title="Erro ao carregar alunos"
        description="Não foi possível conectar ao servidor"
        onRetry={() => refetch()}
      />
    );
  }

  if (!students || students.length === 0) {
    return (
      <EmptyState
        icon={<Users className="h-6 w-6" />}
        title="Nenhum aluno cadastrado"
        description="Comece adicionando seu primeiro aluno"
        primaryAction={{
          label: "Adicionar aluno",
          onClick: () => setDialogOpen(true)
        }}
      />
    );
  }

  return <div>{/* Lista de alunos */}</div>;
}
```

### Formulários com Validação

Usar React Hook Form + Zod:

```typescript
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import i18n from "@/i18n/pt-BR.json";

const schema = z.object({
  name: z.string()
    .min(1, i18n.errors.required)
    .max(100, i18n.errors.maxLength.replace("{{max}}", "100")),
  
  email: z.string()
    .min(1, i18n.errors.required)
    .email(i18n.errors.invalidEmail),
  
  weight: z.number()
    .positive(i18n.validation.positiveNumber)
});

function StudentForm() {
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: { name: "", email: "", weight: 0 }
  });

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <div>
        <label htmlFor="name">{i18n.forms.name}</label>
        <input
          id="name"
          {...form.register("name")}
          placeholder={i18n.forms.placeholder.name}
        />
        {form.formState.errors.name && (
          <p className="text-destructive text-sm">
            {form.formState.errors.name.message}
          </p>
        )}
      </div>

      <Button type="submit">
        {i18n.actions.save}
      </Button>
    </form>
  );
}
```

### Loading States

Loading progressivo com notify:

```typescript
async function syncOuraData(studentId: string) {
  const loader = notify.loading("Sincronizando dados do Oura...");
  
  try {
    loader.update("Baixando métricas de sono...");
    await fetchSleepData(studentId);
    
    loader.update("Processando atividades...");
    await fetchActivityData(studentId);
    
    loader.update("Atualizando dashboard...");
    await updateDashboard(studentId);
    
    loader.success("Sincronização concluída", {
      description: "Todos os dados foram atualizados"
    });
  } catch (error) {
    loader.error("Erro na sincronização", {
      description: error.message
    });
  }
}
```

### Confirmações Destrutivas

Sempre confirmar ações destrutivas:

```typescript
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

function DeleteStudentDialog({ student, onConfirm }) {
  return (
    <AlertDialog>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Excluir aluno?
          </AlertDialogTitle>
          <AlertDialogDescription>
            Esta ação não pode ser desfeita. Todos os treinos e dados de{" "}
            <strong>{student.name}</strong> serão removidos permanentemente.
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <AlertDialogFooter>
          <AlertDialogCancel>
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={onConfirm}
          >
            Excluir aluno
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

---

## 🎯 Migração de Código Existente

### Passo 1: Identificar Strings Hardcoded

Buscar por strings que devem vir do i18n:

```bash
# Botões com texto hardcoded
<Button>Salvar</Button>
<Button>Criar</Button>

# Toasts hardcoded
toast.success("Criado com sucesso");
toast.error("Erro ao salvar");

# Estados vazios inline
<div>Nenhum item encontrado</div>
```

### Passo 2: Substituir por i18n

```typescript
// Antes
<Button>Salvar</Button>
toast.success("Aluno criado com sucesso");

// Depois
import i18n from "@/i18n/pt-BR.json";
import { notify } from "@/lib/notify";

<Button>{i18n.actions.save}</Button>
notify.success(i18n.modules.students.created);
```

### Passo 3: Usar Componentes Padrão

```typescript
// Antes
{students.length === 0 && (
  <div className="text-center py-10">
    <p>Nenhum aluno</p>
    <Button onClick={addStudent}>Adicionar</Button>
  </div>
)}

// Depois
{students.length === 0 && (
  <EmptyState
    icon={<Users className="h-6 w-6" />}
    title={i18n.empty.students.title}
    description={i18n.empty.students.description}
    primaryAction={{
      label: i18n.actions.create,
      onClick: addStudent
    }}
  />
)}
```

### Passo 4: Padronizar Validações

```typescript
// Antes
const schema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  email: z.string().email("E-mail inválido")
});

// Depois
import i18n from "@/i18n/pt-BR.json";

const schema = z.object({
  name: z.string().min(1, i18n.errors.required),
  email: z.string().email(i18n.errors.invalidEmail)
});
```

---

## ✅ Checklist de Implementação

### Para Cada Componente

- [ ] Botões usam verbos claros do i18n
- [ ] Mutations exibem toast de sucesso/erro
- [ ] Queries tratam loading, erro e vazio
- [ ] Estados vazios usam EmptyState
- [ ] Erros usam ErrorState com retry
- [ ] Formulários têm validação inline
- [ ] Mensagens de erro vêm do i18n
- [ ] Ações destrutivas têm confirmação
- [ ] ARIA labels em elementos não-textuais
- [ ] Foco visível em interativos

### Para Cada Módulo

- [ ] Adicionar seção no i18n (modules.X)
- [ ] Criar hooks de mutation padronizados
- [ ] Implementar EmptyState na listagem
- [ ] Implementar ErrorState em queries
- [ ] Validações usam mensagens i18n
- [ ] Toasts em todas as mutations
- [ ] Confirmações em ações destrutivas

---

## 📚 Exemplos Completos

### Exemplo 1: CRUD de Alunos

```typescript
// hooks/useStudents.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { notify } from "@/lib/notify";
import i18n from "@/i18n/pt-BR.json";

export function useStudents() {
  return useQuery({
    queryKey: ["students"],
    queryFn: fetchStudents,
    meta: {
      errorMessage: i18n.modules.students.errorLoad
    }
  });
}

export function useCreateStudent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createStudent,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["students"] });
      notify.success(i18n.modules.students.created);
    },
    onError: (error: any) => {
      notify.error(i18n.modules.students.errorCreate, {
        description: error.message
      });
    }
  });
}

export function useDeleteStudent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteStudent,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["students"] });
      notify.success(i18n.modules.students.deleted);
    },
    onError: (error: any) => {
      notify.error(i18n.modules.students.errorDelete, {
        description: error.message
      });
    }
  });
}
```

```typescript
// components/StudentsList.tsx
import { useStudents } from "@/hooks/useStudents";
import EmptyState from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Users } from "lucide-react";
import i18n from "@/i18n/pt-BR.json";

export function StudentsList() {
  const { data, isLoading, error, refetch } = useStudents();
  const [dialogOpen, setDialogOpen] = useState(false);

  if (isLoading) {
    return <LoadingSpinner label={i18n.feedback.loading} />;
  }

  if (error) {
    return (
      <ErrorState
        title={i18n.modules.students.errorLoad}
        onRetry={() => refetch()}
      />
    );
  }

  if (!data || data.length === 0) {
    return (
      <EmptyState
        icon={<Users className="h-6 w-6" />}
        title={i18n.empty.students.title}
        description={i18n.empty.students.description}
        primaryAction={{
          label: i18n.actions.create,
          onClick: () => setDialogOpen(true)
        }}
      />
    );
  }

  return (
    <div>
      {/* Lista de alunos */}
    </div>
  );
}
```

---

**Última atualização**: 2024-01-15  
**Versão**: 1.0
