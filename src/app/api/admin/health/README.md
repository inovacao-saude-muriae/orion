# 📁 `/src/app/api/admin/health` - API de Telemetria

Endpoint de diagnóstico do sistema em tempo real (banco, sessões, usuários).

**Endpoint:** `GET /api/admin/health`  
**Acesso:** GESTOR, REGULACAO_ADMIN, JUNTA_ADMIN, FARMACIA_ADMIN, PROCESSO_ADMIN, CCZ_ADMIN

---

## 📄 Arquivo: `route.js`

### O Que Este Arquivo Faz

**Função:** Retorna métricas em tempo real do sistema para dashboard administrativo.

**Fluxo:**
```
1. Valida JWT do cookie
   ↓
2. Verifica se é role administrativa
   ↓
3. Consulta tamanho do banco (PostgreSQL)
   ↓
4. Faz ping test (SELECT 1)
   ↓
5. Conta sessões ativas
   ↓
6. Conta total de usuários
   ↓
7. Busca últimas 5 sessões criadas
   ↓
8. Retorna JSON com todas as métricas
```

---

## 📤 Request

### Método
```
GET /api/admin/health
```

### Headers
```
Cookie: session_token=eyJhbGc...
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
  "status": "OK",
  "database": {
    "status": "ONLINE",
    "pingMs": 45,
    "tamanhoBanco": "12 MB"
  },
  "metrics": {
    "sessoesAtivas": 3,
    "totalUsuarios": 8
  },
  "logs": [
    {
      "id": "cm5abc123",
      "usuario": "Jefinny de Paula",
      "role": "GESTOR",
      "data": "14:32"
    },
    {
      "id": "cm5xyz789",
      "usuario": "João Silva",
      "role": "REGULACAO_ADMIN",
      "data": "14:15"
    }
  ]
}
```

### Erro: Não Autorizado (401)
```json
{
  "error": "Não autorizado"
}
```

### Erro: Sem Permissão (403)
```json
{
  "error": "Acesso negado"
}
```

### Erro: Banco Offline (500)
```json
{
  "status": "ERROR",
  "database": {
    "status": "OFFLINE",
    "pingMs": 0,
    "tamanhoBanco": "Indisponível"
  },
  "error": "Connection refused"
}
```

---

## 🔍 Código Detalhado

### 1. Validação de Acesso
```javascript
const cookieStore = await cookies();
const token = cookieStore.get('session_token')?.value;

if (!token) {
  return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
}

const session = await prisma.session.findUnique({
  where: { token },
  include: { user: true }
});
```

### 2. Verifica Role Administrativa
```javascript
const rolesAdministrativas = [
  'GESTOR',
  'REGULACAO_ADMIN',
  'JUNTA_ADMIN',
  'FARMACIA_ADMIN',
  'PROCESSO_ADMIN',
  'CCZ_ADMIN'
];

const eAdministrador = rolesAdministrativas.includes(session.user.role);

if (!eAdministrador) {
  return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
}
```

**Bloqueados:**
- REGULACAO_COMUM
- JUNTA_CAEE
- JUNTA_EDUCACAO
- JUNTA_SAUDE
- JUNTA_ASSISTENCIA

### 3. Tamanho do Banco (PostgreSQL)
```javascript
const dbSizeResult = await prisma.$queryRaw`
  SELECT pg_size_pretty(pg_database_size(current_database())) as size;
`;
const tamanhoBanco = dbSizeResult[0]?.size || 'Indisponível';
```

**Query SQL:**
```sql
SELECT pg_size_pretty(pg_database_size(current_database())) as size;
```

**Resultado exemplo:** `"12 MB"`, `"1547 kB"`, `"2 GB"`

### 4. Ping Test (Latência)
```javascript
const startPing = performance.now();
await prisma.$queryRaw`SELECT 1`;
const endPing = performance.now();
const pingMs = Math.round(endPing - startPing);
```

**Mede:** Tempo de resposta da query em milissegundos.

### 5. Sessões Ativas
```javascript
const sessoesAtivas = await prisma.session.count({
  where: {
    expiresAt: { gt: new Date() }  // Não expiradas
  }
});
```

**SQL equivalente:**
```sql
SELECT COUNT(*) FROM user_sessions
WHERE expires_at > NOW();
```

### 6. Total de Usuários
```javascript
const totalUsuarios = await prisma.user.count();
```

**SQL:**
```sql
SELECT COUNT(*) FROM users;
```

### 7. Últimas Sessões Criadas
```javascript
const ultimosAcessos = await prisma.session.findMany({
  take: 5,
  orderBy: { createdAt: 'desc' },
  include: {
    user: {
      select: {
        nome: true,
        cpf: true,
        role: true,
        cargo: true
      }
    }
  }
});
```

**SQL equivalente:**
```sql
SELECT s.*, u.nome, u.cpf, u.role, u.cargo
FROM user_sessions s
JOIN users u ON s.user_id = u.cpf
ORDER BY s.created_at DESC
LIMIT 5;
```

**Formata para response:**
```javascript
logs: ultimosAcessos.map(s => ({
  id: s.id,
  usuario: s.user?.nome || 'Usuário Sem Nome',
  role: s.user?.role || 'N/A',
  data: new Date(s.createdAt).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit'
  })
}))
```

---

## 🎯 Usado Por

### 1. Dashboard Principal
```javascript
// src/app/dashboard/page.js
const res = await fetch('/api/admin/health', { cache: 'no-store' });
const data = await res.json();

// Exibe:
// - Status do banco (verde/vermelho)
// - Latência (45ms)
// - Sessões ativas (3)
// - Total usuários (8)
// - Lista de últimas sessões
```

### 2. Auto-Refresh
```javascript
// Dashboard atualiza a cada 30 segundos
useEffect(() => {
  fetchSystemStatus();
  const interval = setInterval(fetchSystemStatus, 30000);
  return () => clearInterval(interval);
}, []);
```

---

## 🧪 Testes

### Teste 1: Admin Autorizado
```bash
# Login como GESTOR
curl -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -d '{"cpf":"12912453674","senha":"regula@saude_2026"}' \
  -c cookies.txt

# GET /api/admin/health
curl http://localhost:3000/api/admin/health \
  -b cookies.txt

# Esperado: 200 OK + métricas
```

### Teste 2: Usuário Comum (Bloqueado)
```bash
# Login como REGULACAO_COMUM
curl -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -d '{"cpf":"99999999999","senha":"senha123"}' \
  -c cookies.txt

# GET /api/admin/health
curl http://localhost:3000/api/admin/health \
  -b cookies.txt

# Esperado:
# {
#   "error": "Acesso negado"
# }
# Status: 403
```

### Teste 3: Sem Autenticação
```bash
curl http://localhost:3000/api/admin/health

# Esperado:
# {
#   "error": "Não autorizado"
# }
# Status: 401
```

### Teste 4: Banco Offline
```bash
# Pare o PostgreSQL
# sudo systemctl stop postgresql

# GET /api/admin/health
curl http://localhost:3000/api/admin/health \
  -b cookies.txt

# Esperado:
# {
#   "status": "ERROR",
#   "database": {
#     "status": "OFFLINE",
#     "pingMs": 0,
#     "tamanhoBanco": "Indisponível"
#   },
#   "error": "..."
# }
# Status: 500
```

---

## 📊 Métricas Retornadas

### database.status
- `"ONLINE"` - Banco respondendo
- `"OFFLINE"` - Banco inacessível

### database.pingMs
- Latência da query `SELECT 1`
- **Bom:** < 50ms
- **Aceitável:** 50-100ms
- **Ruim:** > 100ms

### database.tamanhoBanco
- Tamanho atual do banco PostgreSQL
- Formato: `"12 MB"`, `"1 GB"`, etc

### metrics.sessoesAtivas
- Usuários com sessão não expirada
- `expiresAt > NOW()`

### metrics.totalUsuarios
- Total de registros na tabela `users`

### logs[]
- Últimas 5 sessões criadas
- Ordenadas por `createdAt DESC`
- Mostra: nome, role, hora

---

## 🔐 Segurança

### Informações Expostas
✅ **Seguras:**
- Status do banco
- Latência
- Contagens agregadas
- Nomes de usuários (sessões públicas no sistema)
- Roles (informação administrativa)

❌ **NÃO expostas:**
- Senhas ou hashes
- JWT_SECRET
- Connection strings
- Dados pessoais detalhados
- IPs ou tokens

---

## 🔗 Arquivos Relacionados

| Arquivo | Relação |
|---------|---------|
| `src/app/dashboard/page.js` | Consome esta API |
| `src/middleware.js` | Valida JWT antes de chegar aqui |
| `prisma/schema.prisma` | Define tabelas consultadas |

---

**Resumo:** API de telemetria em tempo real que retorna status do banco PostgreSQL, latência de queries, sessões ativas, total de usuários e log das últimas sessões criadas, acessível apenas por roles administrativas.
