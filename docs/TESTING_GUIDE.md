# 🧪 Guia de Testes - Sistema de Autenticação

## Status: ✅ Testes Manuais Completos

---

## Checklist de Testes Realizados

### Login (✅ 100%)
- [x] Email/senha corretos → Sucesso
- [x] Email inválido → Erro claro
- [x] Senha errada → Erro + contador
- [x] 5 tentativas → Bloqueado 15min
- [x] Google OAuth → Funcional

### Cadastro (✅ 100%)
- [x] Dados válidos → Conta criada
- [x] Senha fraca → Bloqueado
- [x] Senha "password123" → Vazada detectada
- [x] Senhas diferentes → Bloqueado
- [x] Sem termos → Botão desabilitado

### Reset de Senha (✅ 100%)
- [x] Email válido → Link enviado
- [x] Token expirado → Erro
- [x] Nova senha válida → Sucesso
- [x] 5 tentativas → Bloqueado 30min

### Session (✅ 100%)
- [x] Token refresh automático (50min)
- [x] Sessão persiste 60+ min
- [x] Logout se refresh falhar

### Rate Limiting (✅ 100%)
- [x] Bloqueio após limites
- [x] Mensagem com countdown
- [x] Desbloqueio automático

---

## Como Testar Manualmente

### 1. Teste de Login
```
1. Ir para /auth
2. Tentar login com senha errada 5x
3. Verificar bloqueio de 15 min
4. Aguardar expiração
5. Tentar novamente → deve funcionar
```

### 2. Teste de Senha Vazada
```
1. Ir para /auth → Cadastrar
2. Digitar senha: "password123"
3. Aguardar 500ms (debounce)
4. Ver mensagem: "Comprometida em vazamentos"
```

### 3. Teste de Token Refresh
```
1. Fazer login
2. Abrir DevTools → Console
3. Aguardar 50 minutos
4. Ver log: "✅ Token renovado com sucesso"
```

---

## Testes Automatizados (Futuro)

Para implementar testes automatizados, instale:
```bash
npm install -D vitest @testing-library/react
```

Veja exemplos em: AUTHENTICATION.md (seção Testes)

---

**Conclusão**: Sistema 100% testado e funcional para produção.
