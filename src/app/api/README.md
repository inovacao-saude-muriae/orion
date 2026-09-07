# 📁 `/src/app/api` - API Routes

Endpoints REST do sistema (Next.js Route Handlers).

**Base URL:** `/api`  
**Formato:** JSON

---

## 📂 Estrutura

```
api/
├── me/                    # GET /api/me - Dados do usuário logado
├── pessoas/               # CRUD de pessoas
│   ├── route.js          # GET /api/pessoas (listar)
│   │                     # POST /api/pessoas (criar)
│   └── [cpf]/
│       └── route.js      # GET /api/pessoas/:cpf (buscar)
│                         # PUT /api/pessoas/:cpf (atualizar)
│                         # DELETE /api/pessoas/:cpf (deletar)
└── admin/                # APIs administrativas
    ├── health/           # GET /api/admin/health (telemetria)
    ├── usuarios/         # CRUD de usuários
    └── relatorios/       # Geração de relatórios
```

---

## 🔐 Autenticação

Todas as APIs (exceto públicas) requerem autenticação via JWT.

**Como funciona:**
```javascript
// 1. Cliente envia cookie
const res = await fetch('/api/me', {
  credentials: 'include'  // Envia cookie session_token
});

// 2. API valida JWT
const token = cookies().get('session_token')?.value;
const { payload } = await jwtVerify(token, secret);

// 3. Retorna dados ou erro 401
```

---

## 📡 Endpoints Disponíveis

### Autenticação e Usuário

| Método | Endpoint | Descrição | Acesso |
|--------|----------|-----------|--------|
| `GET` | `/api/me` | Dados do usuário logado | Autenticado |

### Pessoas

| Método | Endpoint | Descrição | Acesso |
|--------|----------|-----------|--------|
| `GET` | `/api/pessoas` | Listar pessoas | Autenticado |
| `POST` | `/api/pessoas` | Criar pessoa | Autenticado |
| `GET` | `/api/pessoas/:cpf` | Buscar por CPF | Autenticado |
| `PUT` | `/api/pessoas/:cpf` | Atualizar pessoa | Autenticado |
| `DELETE` | `/api/pessoas/:cpf` | Deletar pessoa | Admin |

### Admin

| Método | Endpoint | Descrição | Acesso |
|--------|----------|-----------|--------|
| `GET` | `/api/admin/health` | Telemetria do sistema | Admin |
| `POST` | `/api/admin/usuarios` | Criar usuário | GESTOR |
| `GET` | `/api/admin/usuarios` | Listar usuários | Admin |
| `PUT` | `/api/admin/usuarios/:cpf` | Atualizar usuário | GESTOR |
| `DELETE` | `/api/admin/usuarios/:cpf` | Deletar usuário | GESTOR |

---

## 🎯 Padrões de Response

### Sucesso (200/201)
```json
{
  "success": true,
  "data": { ... }
}
```

### Erro (400/401/403/404/500)
```json
{
  "error": "Mensagem do erro"
}
```

---

## 🔗 Subpastas

### [`me/`](./me/README.md)
Dados do usuário autenticado atual.

### [`pessoas/`](./pessoas/README.md)
CRUD de pessoas físicas (pacientes, tutores, etc).

### [`admin/`](./admin/README.md)
APIs administrativas (telemetria, usuários, relatórios).

---

## 📝 Convenções

### Headers
```javascript
{
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store'  // Desabilita cache
}
```

### Status Codes
- `200` - Sucesso (GET, PUT, DELETE)
- `201` - Criado com sucesso (POST)
- `400` - Requisição inválida
- `401` - Não autenticado
- `403` - Sem permissão
- `404` - Não encontrado
- `500` - Erro interno

---

## 🔐 Autorizações por Role

| Endpoint | GESTOR | ADMIN_* | COMUM_* |
|----------|--------|---------|---------|
| `/api/me` | ✅ | ✅ | ✅ |
| `/api/pessoas/*` | ✅ | ✅ | ✅ |
| `/api/admin/health` | ✅ | ✅ | ❌ |
| `/api/admin/usuarios` | ✅ | ❌ | ❌ |

---

**Resumo:** Pasta contendo todos os endpoints REST da aplicação, organizados por funcionalidade e com controle de acesso baseado em JWT + roles.
