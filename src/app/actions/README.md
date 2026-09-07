# 📁 `/src/app/actions` - Server Actions

Server Actions do Next.js - funções server-side para mutations (criar, editar, deletar).

---

## 📄 Arquivos Nesta Pasta

### `auth.js`
**Função:** Autenticação e gerenciamento de sessões.

**Exports:**
```javascript
export async function loginAction(formData)
export async function logoutAction()
```

**`loginAction(formData)`**
**O que faz:**
1. Extrai CPF e senha do formData
2. Valida formato do CPF (11 dígitos)
3. Busca usuário no banco por CPF
4. Verifica se usuário está ativo
5. Compara senha (bcrypt)
6. Gera JWT assinado com dados do usuário
7. Salva sessão no banco
8. Atualiza `ultimoAcesso` do usuário
9. Define cookie HTTP-only com JWT
10. Retorna `{ success: true, role: 'GESTOR' }`

**Uso:**
```javascript
'use client';
import { loginAction } from '@/app/actions/auth';

async function handleSubmit(e) {
  e.preventDefault();
  const formData = new FormData(e.target);
  const result = await loginAction(formData);
  
  if (result.error) {
    alert(result.error);
  } else {
    router.push('/dashboard');
  }
}
```

**Segurança:**
- ✅ Senha nunca trafega em texto plano
- ✅ JWT assinado com secret
- ✅ Cookie HTTP-only (proteção XSS)
- ✅ Validações server-side

**Erros possíveis:**
```javascript
{ error: "Informe um CPF válido com 11 dígitos." }
{ error: "Informe a sua senha de acesso." }
{ error: "Usuário não encontrado ou inativo no sistema." }
{ error: "Senha incorreta. Tente novamente." }
{ error: "Erro interno ao tentar realizar login." }
```

---

**`logoutAction()`**
**O que faz:**
1. Deleta cookie `session_token`
2. Remove sessão do banco
3. Redireciona para `/login`

**Uso:**
```javascript
import { logoutAction } from '@/app/actions/auth';

<button onClick={() => logoutAction()}>
  Sair
</button>
```

---

## 🔧 Server Actions Recomendadas (Futuras)

### `usuarios.js`
```javascript
'use server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function createUserAction(formData) {
  const cpf = formData.get('cpf');
  const nome = formData.get('nome');
  const senha = formData.get('senha');
  const role = formData.get('role');
  
  // Validações
  if (!cpf || cpf.length !== 11) {
    return { error: 'CPF inválido' };
  }
  
  // Verificar se já existe
  const existe = await prisma.user.findUnique({ where: { cpf } });
  if (existe) {
    return { error: 'CPF já cadastrado' };
  }
  
  // Hash da senha
  const senhaHash = await bcrypt.hash(senha, 10);
  
  // Criar usuário
  await prisma.user.create({
    data: { cpf, nome, senhaHash, role }
  });
  
  return { success: true };
}

export async function updateUserAction(cpf, formData) {
  // Lógica de atualização
}

export async function deleteUserAction(cpf) {
  // Lógica de exclusão
}
```

---

### `pedidos.js`
```javascript
'use server';
import { prisma } from '@/lib/prisma';

export async function createPedidoAction(formData) {
  const pessoaCpf = formData.get('pessoaCpf');
  const procedimentoId = parseInt(formData.get('procedimentoId'));
  
  // Validações
  // ...
  
  // Criar pedido
  const pedido = await prisma.pedidoExame.create({
    data: {
      pessoaCpf,
      procedimentoId,
      status: 'Aguardando',
      dataSolicitacao: new Date()
    }
  });
  
  return { success: true, pedidoId: pedido.id };
}

export async function updateStatusPedidoAction(pedidoId, novoStatus) {
  await prisma.pedidoExame.update({
    where: { id: pedidoId },
    data: { status: novoStatus }
  });
  
  return { success: true };
}
```

---

## 🎯 Como Usar Server Actions

### 1. Criar a Action
```javascript
// src/app/actions/minhaAction.js
'use server';

export async function minhaAction(formData) {
  // Lógica server-side
  return { success: true };
}
```

### 2. Usar em Client Component
```javascript
'use client';
import { minhaAction } from '@/app/actions/minhaAction';

function MeuForm() {
  async function handleSubmit(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const result = await minhaAction(formData);
    
    if (result.success) {
      alert('Sucesso!');
    }
  }
  
  return (
    <form onSubmit={handleSubmit}>
      <input name="campo" />
      <button type="submit">Enviar</button>
    </form>
  );
}
```

### 3. Usar com Form Action (Next.js 16+)
```javascript
import { minhaAction } from '@/app/actions/minhaAction';

function MeuForm() {
  return (
    <form action={minhaAction}>
      <input name="campo" />
      <button type="submit">Enviar</button>
    </form>
  );
}
```

---

## ✅ Benefícios de Server Actions

### vs API Routes
```javascript
// ❌ API Route (mais código)
// api/usuarios/route.js
export async function POST(request) {
  const body = await request.json();
  // Validação
  // Lógica
  return NextResponse.json({ success: true });
}

// Cliente
const response = await fetch('/api/usuarios', {
  method: 'POST',
  body: JSON.stringify(data)
});

// ✅ Server Action (menos código)
// actions/usuarios.js
'use server';
export async function createUser(formData) {
  // Lógica
  return { success: true };
}

// Cliente
const result = await createUser(formData);
```

### Vantagens
- ✅ Menos boilerplate
- ✅ Type-safe (com TypeScript)
- ✅ Não precisa criar endpoint
- ✅ Validação server-side automática
- ✅ Melhor experiência de desenvolvimento

---

## 🔐 Segurança

### Validação de Permissões
```javascript
'use server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';

async function getUserFromToken() {
  const token = cookies().get('session_token')?.value;
  if (!token) return null;
  
  const secret = new TextEncoder().encode(process.env.JWT_SECRET);
  const { payload } = await jwtVerify(token, secret);
  
  return payload;
}

export async function deleteUserAction(cpf) {
  const user = await getUserFromToken();
  
  // Apenas GESTOR pode deletar usuários
  if (user.role !== 'GESTOR') {
    return { error: 'Sem permissão' };
  }
  
  await prisma.user.delete({ where: { cpf } });
  return { success: true };
}
```

---

## 📋 Convenções

### Nomenclatura
```javascript
createUserAction()    ✅ Verbo + Substantivo + Action
loginAction()         ✅ Verbo + Action
getUsersAction()      ✅ Verbo + Substantivo (plural) + Action

create()              ❌ Muito genérico
doLogin()             ❌ "do" desnecessário
```

### Estrutura do Arquivo
```javascript
'use server'; // SEMPRE no topo

import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';

// Helpers privados
async function validateInput(data) {
  // ...
}

// Exports públicos
export async function actionOne(formData) {
  // ...
}

export async function actionTwo(params) {
  // ...
}
```

### Retorno Padronizado
```javascript
// Sucesso
return { success: true, data: { ... } };

// Erro
return { error: 'Mensagem de erro' };

// Com validações
return { 
  success: false, 
  errors: {
    cpf: 'CPF inválido',
    nome: 'Nome obrigatório'
  }
};
```

---

## 🧪 Testes

### Jest + Testing Library
```javascript
// actions/auth.test.js
import { loginAction } from './auth';

describe('loginAction', () => {
  it('should return error for invalid CPF', async () => {
    const formData = new FormData();
    formData.set('cpf', '123'); // CPF inválido
    formData.set('senha', 'senha123');
    
    const result = await loginAction(formData);
    
    expect(result.error).toBe('Informe um CPF válido com 11 dígitos.');
  });
  
  it('should login successfully', async () => {
    const formData = new FormData();
    formData.set('cpf', '12912453674');
    formData.set('senha', 'regula@saude_2026');
    
    const result = await loginAction(formData);
    
    expect(result.success).toBe(true);
    expect(result.role).toBe('GESTOR');
  });
});
```

---

## 📚 Referências

- [Next.js Server Actions](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations)
- [Form Actions](https://nextjs.org/docs/app/building-your-application/data-fetching/forms-and-mutations)

---

## 🔗 Arquivos Relacionados

- `src/lib/prisma.js` → Cliente Prisma
- `src/middleware.js` → Valida token antes
- `src/app/login/page.js` → Usa loginAction
