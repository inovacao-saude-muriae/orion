# 📁 `/src/lib` - Bibliotecas e Utilitários

Configurações, helpers e utilitários compartilhados em todo o projeto.

---

## 📄 Arquivos Nesta Pasta

### `prisma.js`
**Função:** Singleton do Prisma Client (conexão com banco de dados).

**Por que singleton?**
- Evita múltiplas instâncias do Prisma
- Reutiliza conexão em desenvolvimento (hot reload)
- Melhora performance e evita memory leaks

**Uso:**
```javascript
import { prisma } from '@/lib/prisma';

const users = await prisma.user.findMany();
```

**Conecta com:** PostgreSQL no Supabase via `DATABASE_URL`

---

### `env.js`
**Função:** Validação de variáveis de ambiente obrigatórias.

**Verifica:**
- ✅ `DATABASE_URL` - Conexão com banco (obrigatória)
- ✅ `DIRECT_URL` - Conexão direta para migrations (obrigatória)
- ✅ `JWT_SECRET` - Chave para assinar tokens (obrigatória)
- ⚠️ `NEXT_PUBLIC_SUPABASE_URL` - URL Supabase (opcional)
- ⚠️ `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Chave anônima (opcional)
- ⚠️ `SUPABASE_SERVICE_ROLE_KEY` - Chave service (opcional)

**Quando é executado:**
- No startup do servidor (`npm run dev`)
- Exibe warnings para variáveis opcionais ausentes
- Lança erro fatal se variáveis obrigatórias estiverem faltando

**Logs:**
```
✅ Variáveis de ambiente validadas com sucesso!
ou
⚠️ Variáveis de ambiente OPCIONAIS não definidas: ...
```

---

### `supabase.js`
**Função:** Cliente do Supabase (se usar Supabase Auth ou Storage).

**Status Atual:** Configurado mas **NÃO USADO** no sistema atual.

**Por quê?**
- Sistema usa autenticação customizada (JWT + CPF)
- Supabase fornece apenas o PostgreSQL
- Não usa Supabase Auth, Storage ou Realtime

**Se precisar usar no futuro:**
```javascript
import { supabase } from '@/lib/supabase';

// Exemplo: Upload de arquivos
const { data, error } = await supabase
  .storage
  .from('documentos')
  .upload('path/file.pdf', file);
```

---

## 🔧 Utilitários Futuros

Esta pasta pode conter (quando necessário):

### `utils.js`
Funções auxiliares gerais:
```javascript
export function formatarCPF(cpf) { ... }
export function formatarData(data) { ... }
export function calcularIdade(dataNascimento) { ... }
```

### `validations.js`
Validações de formulários:
```javascript
export function validarCPF(cpf) { ... }
export function validarEmail(email) { ... }
```

### `constants.js`
Constantes do sistema:
```javascript
export const ROLES = { ... };
export const STATUS = { ... };
```

---

## 🔐 Boas Práticas

### ✅ O que DEVE estar em `/lib`
- Configurações compartilhadas
- Clientes de serviços externos (Prisma, Supabase)
- Utilitários puros (sem UI)
- Validações de dados
- Helpers de formatação

### ❌ O que NÃO deve estar em `/lib`
- Componentes React (vai em `/components`)
- Páginas (vai em `/app`)
- Lógica de negócio específica de módulos
- Estilos CSS

---

## 🚀 Como Adicionar Novos Utilitários

### 1. Crie o arquivo
```bash
# Exemplo: criar helper de formatação
touch src/lib/formatters.js
```

### 2. Implemente a função
```javascript
// src/lib/formatters.js
export function formatarTelefone(telefone) {
  // Remove não-dígitos
  const limpo = telefone.replace(/\D/g, '');
  
  // Formata (11) 99999-9999
  return limpo.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
}
```

### 3. Use no projeto
```javascript
import { formatarTelefone } from '@/lib/formatters';

const tel = formatarTelefone('11999998888');
// Resultado: (11) 99999-8888
```

---

## 📦 Dependências Usadas

| Dependência | Arquivo | Uso |
|-------------|---------|-----|
| `@prisma/client` | `prisma.js` | ORM para PostgreSQL |
| `@supabase/supabase-js` | `supabase.js` | Cliente Supabase (opcional) |
| `dotenv` (dev) | `env.js` | Validação de `.env` |

---

## 🔗 Relacionamentos

```
prisma.js ←─── Usado em:
  ├── src/app/actions/auth.js (login)
  ├── src/app/api/*/route.js (todas APIs)
  └── prisma/seed.js (popular banco)

env.js ←─── Validado no startup
  └── Garante que .env está correto

supabase.js ←─── Não usado atualmente
  └── Reservado para uso futuro
```

---

## 📚 Leia Também

- [Estrutura de src/](../README.md)
- [Como usar Prisma](../../prisma/README.md)
- [Variáveis de ambiente](../../.env.example)
