# 📁 `/src/app/api/me` - Dados do Usuário Atual

API que retorna informações do usuário autenticado (baseado no JWT do cookie).

**Endpoint:** `GET /api/me`  
**Autenticação:** Obrigatória (JWT via cookie)

---

## 📄 Arquivo: `route.js`

### O Que Este Arquivo Faz

**Função:** Retorna dados do usuário logado sem precisar passar CPF ou ID.

**Fluxo:**
```
1. Cliente faz GET /api/me
   ↓
2. API lê cookie session_token
   ↓
3. Busca sessão no banco por token
   ↓
4. Verifica se sessão está válida (não expirada)
   ↓
5. Retorna dados do usuário vinculado
```

---

## 📤 Request

### Método
```
GET /api/me
```

### Headers
```javascript
// Cookie enviado automaticamente pelo navegador
Cookie: session_token=eyJhbGciOiJIUzI1NiIsInR5...
```

### Body
```
Nenhum (método GET)
```

---

## 📥 Response

### Sucesso (200)
```json
{
  "user": {
    "id": "12912453674",
    "nomeCompleto": "Jefinny de Paula Dias Souza",
    "cpf": "12912453674",
    "role": "GESTOR",
    "cargo": "Gestor Geral do Sistema"
  }
}
```

### Erro: Não Autenticado (401)
```json
{
  "error": "Sessão não encontrada"
}
```

### Erro: Sessão Expirada (401)
```json
{
  "error": "Sessão expirada"
}
```

### Erro: Interno (500)
```json
{
  "error": "Erro interno no servidor"
}
```

---

## 🔍 Código Detalhado

### 1. Ler Cookie
```javascript
const cookieStore = await cookies();
const token = cookieStore.get('session_token')?.value;

if (!token) {
  return NextResponse.json({ error: 'Sessão não encontrada' }, { status: 401 });
}
```
- Obtém cookie HTTP-only
- Se não existe → 401

### 2. Buscar Sessão no Banco
```javascript
const session = await prisma.session.findUnique({
  where: { token },
  include: {
    user: {
      select: {
        cpf: true,
        nome: true,
        role: true,
        cargo: true
      }
    }
  }
});
```
**Query SQL equivalente:**
```sql
SELECT s.*, u.cpf, u.nome, u.role, u.cargo
FROM user_sessions s
JOIN users u ON s.user_id = u.cpf
WHERE s.token = 'eyJhbGc...';
```

### 3. Validar Expiração
```javascript
if (!session || (session.expiresAt && session.expiresAt < new Date())) {
  return NextResponse.json({ error: 'Sessão expirada' }, { status: 401 });
}
```
- Verifica se `expiresAt` já passou
- Sessão expira em 8 horas após login

### 4. Retornar Dados
```javascript
return NextResponse.json({
  user: {
    id: session.user.cpf,  // CPF como ID
    nomeCompleto: session.user.nome,
    cpf: session.user.cpf,
    role: session.user.role,
    cargo: session.user.cargo || session.user.role
  }
});
```

---

## 🎯 Casos de Uso

### 1. Header do Site (Mostrar Nome)
```javascript
// Component Header
const { data } = await fetch('/api/me');
console.log(`Olá, ${data.user.nomeCompleto}!`);
```

### 2. Verificar Permissões
```javascript
const { data } = await fetch('/api/me');

if (data.user.role === 'GESTOR') {
  // Mostrar menu admin
}
```

### 3. Redirect Baseado em Role
```javascript
const { data } = await fetch('/api/me');

switch (data.user.role) {
  case 'GESTOR':
    router.push('/dashboard');
    break;
  case 'REGULACAO_COMUM':
    router.push('/regulacao');
    break;
}
```

---

## 🧪 Testes

### Teste 1: Usuário Logado
```bash
# Login primeiro
curl -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -d '{"cpf":"12912453674","senha":"regula@saude_2026"}' \
  -c cookies.txt

# Depois GET /api/me
curl http://localhost:3000/api/me -b cookies.txt

# Esperado:
# {
#   "user": {
#     "id": "12912453674",
#     "nomeCompleto": "Jefinny de Paula",
#     "role": "GESTOR"
#   }
# }
```

### Teste 2: Sem Cookie
```bash
curl http://localhost:3000/api/me

# Esperado:
# {
#   "error": "Sessão não encontrada"
# }
# Status: 401
```

### Teste 3: Cookie Inválido
```bash
curl http://localhost:3000/api/me \
  -H "Cookie: session_token=token_invalido"

# Esperado:
# {
#   "error": "Sessão expirada"
# }
# Status: 401
```

---

## 🔐 Segurança

### Informações Retornadas
✅ **Seguras:**
- CPF (usuário já sabe o próprio)
- Nome (usuário já sabe o próprio)
- Role (informação pública no sistema)
- Cargo (informação pública no sistema)

❌ **NÃO retornadas:**
- Senha ou hash
- Token JWT
- Dados sensíveis de outros usuários

### Cookie HTTP-Only
- JavaScript não pode ler cookie
- Proteção contra XSS
- Enviado automaticamente pelo navegador

---

## 🔗 Arquivos Relacionados

| Arquivo | Relação |
|---------|---------|
| `src/app/actions/auth.js` | Cria sessão no login |
| `prisma/schema.prisma` | Define tabelas Session e User |
| `src/components/Header.js` | Usa /api/me para mostrar nome |

---

**Resumo:** API que retorna dados do usuário autenticado atual, validando sessão via JWT no cookie e retornando nome, CPF, role e cargo.
