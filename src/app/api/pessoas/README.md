# 📁 `/src/app/api/pessoas` - API de Pessoas

CRUD de pessoas físicas (pacientes, tutores, requerentes).

**Base:** `/api/pessoas`  
**Autenticação:** Obrigatória

---

## 📡 Endpoints

### `GET /api/pessoas`
Lista todas as pessoas cadastradas.

**Query Params (opcionais):**
```
?nome=João      # Busca por nome (parcial)
?cpf=123        # Busca por CPF (parcial)
?limit=10       # Limite de resultados
?offset=0       # Paginação
```

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "cpf": "12345678900",
      "nome": "João Silva",
      "rg": "MG1234567",
      "cns": "123456789012345",
      "dataNascimento": "1990-05-15",
      "sexo": "M",
      "nomeMae": "Maria Silva",
      "telefone": "(31) 98765-4321",
      "email": "joao@email.com"
    }
  ],
  "total": 1
}
```

---

### `POST /api/pessoas`
Cria nova pessoa.

**Body:**
```json
{
  "cpf": "12345678900",
  "nome": "João Silva",
  "rg": "MG1234567",
  "orgaoEmissor": "SSP/MG",
  "cns": "123456789012345",
  "dataNascimento": "1990-05-15",
  "sexo": "M",
  "nomeMae": "Maria Silva",
  "telefone": "(31) 98765-4321",
  "email": "joao@email.com",
  "logradouro": "Rua A",
  "numeroEndereco": "123",
  "bairro": "Centro",
  "cidade": "Belo Horizonte",
  "uf": "MG",
  "cep": "30000-000"
}
```

**Response 201:**
```json
{
  "success": true,
  "data": { ... }
}
```

**Response 400:**
```json
{
  "error": "CPF já cadastrado"
}
```

---

### `GET /api/pessoas/[cpf]`
Busca pessoa por CPF.

**Response 200:**
```json
{
  "success": true,
  "data": {
    "cpf": "12345678900",
    "nome": "João Silva",
    ...
  }
}
```

**Response 404:**
```json
{
  "error": "Pessoa não encontrada"
}
```

---

### `PUT /api/pessoas/[cpf]`
Atualiza pessoa existente.

**Body:** (campos opcionais)
```json
{
  "telefone": "(31) 99999-9999",
  "email": "novoemail@email.com"
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

### `DELETE /api/pessoas/[cpf]`
Deleta pessoa (soft delete).

**Acesso:** Apenas GESTOR

**Response 200:**
```json
{
  "success": true,
  "message": "Pessoa removida"
}
```

**Response 403:**
```json
{
  "error": "Sem permissão para deletar"
}
```

---

## 📊 Tabela do Banco

```prisma
model Pessoa {
  cpf             String @id
  nome            String
  rg              String?
  orgaoEmissor    String?
  cns             String?
  dataNascimento  DateTime?
  sexo            String
  nomeMae         String?
  telefone        String?
  email           String?
  logradouro      String?
  numeroEndereco  String?
  complemento     String?
  bairro          String?
  cidade          String?
  uf              String?
  cep             String?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}
```

---

## 🔐 Validações

### Server-side
```javascript
// CPF válido (11 dígitos)
if (!/^\d{11}$/.test(cpf)) {
  return { error: 'CPF inválido' };
}

// Nome obrigatório
if (!nome || nome.length < 3) {
  return { error: 'Nome deve ter ao menos 3 caracteres' };
}

// Sexo válido
if (!['M', 'F', 'Outro'].includes(sexo)) {
  return { error: 'Sexo inválido' };
}

// Email formato válido
if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  return { error: 'Email inválido' };
}
```

---

## 🧪 Testes com curl

### Criar Pessoa
```bash
curl -X POST http://localhost:3000/api/pessoas \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "cpf": "12345678900",
    "nome": "João Silva",
    "sexo": "M",
    "telefone": "(31) 98765-4321"
  }'
```

### Buscar por CPF
```bash
curl http://localhost:3000/api/pessoas/12345678900 \
  -b cookies.txt
```

### Listar com Filtros
```bash
curl "http://localhost:3000/api/pessoas?nome=João&limit=5" \
  -b cookies.txt
```

---

**Resumo:** API REST completa para CRUD de pessoas físicas com validações de CPF, email, busca por filtros, paginação e controle de acesso por roles.
