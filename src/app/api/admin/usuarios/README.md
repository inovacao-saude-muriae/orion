# 📁 `/src/app/api/admin/usuarios` - API de Usuários

CRUD completo de usuários do sistema (apenas GESTOR).

**Base:** `/api/admin/usuarios`  
**Acesso:** Apenas GESTOR

---

## 📡 Endpoints

### `GET /api/admin/usuarios`
Lista todos os usuários.

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "cpf": "12912453674",
      "nome": "Jefinny de Paula",
      "cargo": "Gestor Geral",
      "role": "GESTOR",
      "ativo": true,
      "createdAt": "2026-01-15T10:00:00.000Z"
    }
  ]
}
```

---

### `POST /api/admin/usuarios`
Cria novo usuário.

**Body:**
```json
{
  "cpf": "98765432100",
  "nome": "Maria Santos",
  "senha": "senha@segura123",
  "cargo": "Reguladora",
  "role": "REGULACAO_ADMIN"
}
```

**Roles válidas:**
- GESTOR
- REGULACAO_ADMIN, REGULACAO_COMUM
- FARMACIA_ADMIN
- PROCESSO_ADMIN
- JUNTA_ADMIN, JUNTA_CAEE, JUNTA_EDUCACAO, JUNTA_SAUDE, JUNTA_ASSISTENCIA
- CCZ_ADMIN

**Response 201:**
```json
{
  "success": true,
  "data": {
    "cpf": "98765432100",
    "nome": "Maria Santos",
    "role": "REGULACAO_ADMIN"
  }
}
```

**Response 400:**
```json
{
  "error": "CPF já cadastrado"
}
```

---

### `PUT /api/admin/usuarios/[cpf]`
Atualiza usuário existente.

**Body (campos opcionais):**
```json
{
  "nome": "Novo Nome",
  "cargo": "Novo Cargo",
  "role": "NOVA_ROLE",
  "ativo": false,
  "senha": "nova_senha_123"
}
```

**Response 200:**
```json
{
  "success": true,
  "data": { ... }
}
```

---

### `DELETE /api/admin/usuarios/[cpf]`
Deleta usuário (hard delete).

**Response 200:**
```json
{
  "success": true,
  "message": "Usuário removido"
}
```

---

## 🔐 Validações

### CPF
```javascript
if (!/^\d{11}$/.test(cpf)) {
  return { error: 'CPF deve ter 11 dígitos' };
}
```

### Senha
```javascript
if (!senha || senha.length < 8) {
  return { error: 'Senha deve ter ao menos 8 caracteres' };
}
```

### Role
```javascript
const rolesValidas = [
  'GESTOR', 'REGULACAO_ADMIN', 'REGULACAO_COMUM',
  'FARMACIA_ADMIN', 'PROCESSO_ADMIN', 'JUNTA_ADMIN',
  'JUNTA_CAEE', 'JUNTA_EDUCACAO', 'JUNTA_SAUDE',
  'JUNTA_ASSISTENCIA', 'CCZ_ADMIN'
];

if (!rolesValidas.includes(role)) {
  return { error: 'Role inválida' };
}
```

---

## 🔒 Hash de Senha

```javascript
import bcrypt from 'bcryptjs';

// Ao criar
const senhaHash = await bcrypt.hash(senha, 10);

await prisma.user.create({
  data: {
    cpf,
    nome,
    senhaHash,  // Nunca armazena senha pura
    cargo,
    role
  }
});
```

---

**Resumo:** API de CRUD de usuários exclusiva para GESTOR, com hash bcrypt de senhas, validação de CPF/roles e controle de status ativo/inativo.
