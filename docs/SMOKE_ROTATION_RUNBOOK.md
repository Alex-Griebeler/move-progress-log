# Runbook — Rotação da `ADMIN_CREATION_KEY`

Esta chave protege as edge functions internas de auditoria:
- `smoke-test-integrity`
- `smoke-health`

As funções de smoke aceitam também autenticação via JWT de usuário com role `admin` (modo `admin_jwt`), portanto a rotação **não derruba** o acesso administrativo via UI logada.

`create-audit-admin` tem fluxo diferente: exige `Authorization: Bearer <service_role>` **e** `adminKey` no body.

---

## 1. Gerar nova chave

Use uma chave forte (32 bytes hex):

```bash
openssl rand -hex 32
```

Guarde o valor em local seguro (gerenciador de senhas). **Nunca** cole em chat, commit ou logs.

## 2. Atualizar `ADMIN_CREATION_KEY` no Cloud

No painel do Lovable Cloud:

1. Abra **Cloud → Secrets**
2. Localize `ADMIN_CREATION_KEY`
3. Clique em **Update** e cole a nova chave
4. Salve

A nova chave fica disponível imediatamente para as edge functions (sem necessidade de redeploy, mas recomendamos redeploy para garantir reload).

## 3. Redeploy das funções

Via Lovable / agente:

```
deploy_edge_functions: ["smoke-test-integrity", "smoke-health"]
```

Ou via CLI Supabase:

```bash
supabase functions deploy smoke-test-integrity
supabase functions deploy smoke-health
```

## 4. Validar

### 4a. Health check (modo admin_key)

```bash
curl -sS -X GET "https://<PROJECT_REF>.supabase.co/functions/v1/smoke-health" \
  -H "x-admin-key: <NOVA_CHAVE>"
```

Esperado:
```json
{ "status": "ok", "service": "smoke-health", "checks": { "env": true, "db": true } }
```

### 4b. Smoke quick (modo admin_key)

```bash
curl -sS -X POST "https://<PROJECT_REF>.supabase.co/functions/v1/smoke-test-integrity" \
  -H "x-admin-key: <NOVA_CHAVE>" \
  -H "Content-Type: application/json" \
  -d '{"mode":"quick"}'
```

Esperado: `"status":"GO"` e `"auth_mode":"admin_key"`.

### 4c. Validar chave antiga revogada

Repetir 4a com a chave antiga deve retornar HTTP 401 com `UNAUTHORIZED_INVALID_ADMIN_KEY`.

### 4d. Validar admin_jwt continua funcionando

Logado na UI como admin, do console do navegador:

```js
const { data: { session } } = await supabase.auth.getSession();
fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/smoke-health`, {
  headers: { Authorization: `Bearer ${session.access_token}` },
}).then(r => r.json()).then(console.log);
```

Esperado: `auth_mode: "admin_jwt"`, `status: "ok"`.

---

## 5. Códigos de erro padronizados

| Código | HTTP | Causa |
|---|---|---|
| `UNAUTHORIZED_MISSING_AUTH` | 401 | Nem `x-admin-key` nem `Bearer` foram enviados |
| `UNAUTHORIZED_INVALID_ADMIN_KEY` | 401 | `x-admin-key` enviado mas não bate |
| `FORBIDDEN_NOT_ADMIN` | 403 | JWT válido mas usuário não tem role `admin` |
| `CONFIG_MISSING_ENV` | 500 | Variável de ambiente faltando no projeto |
| `CHECK_EXECUTION_FAILED` | 200 (no payload `errors[]`) | Um check específico falhou |
| `INTERNAL_ERROR` | 500 | Falha não classificada |

## 6. Frequência recomendada

- Rotação preventiva: **a cada 90 dias**
- Rotação imediata se houver suspeita de vazamento, saída de colaborador com acesso, ou exposição em logs/repositório
