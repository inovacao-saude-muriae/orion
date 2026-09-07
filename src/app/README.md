# 📁 `/src/app` - Rotas e Páginas (App Router)

Sistema de rotas do Next.js 16 (App Router). Cada pasta representa uma rota.

---

## 📂 Estrutura de Rotas

```
app/
├── page.js                     → / (home/dashboard)
├── layout.js                   → Layout global
├── globals.css                 → Estilos globais
├── login/                      → /login
├── dashboard/                  → /dashboard
├── regulacao/                  → /regulacao
├── camara-tecnica/             → /camara-tecnica
├── junta-reguladora/           → /junta-reguladora
├── ccz/                        → /ccz
├── admin/                      → /admin
├── relatorios/                 → /relatorios
├── acesso-negado/              → /acesso-negado
├── actions/                    → Server Actions
└── api/                        → API Routes
```

---

## 📄 Arquivos Principais

### `layout.js`
**Função:** Layout raiz que envolve TODAS as páginas.

**Responsabilidades:**
- Define `<html>` e `<body>`
- Importa fontes (se houver)
- Carrega `globals.css`
- Define metadados (título, descrição)
- Providers globais (se houver)

**Estrutura:**
```javascript
export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>
        {children}
      </body>
    </html>
  );
}
```

---

### `page.js`
**Função:** Página inicial (home/redirect para dashboard).

**Comportamento:**
- Se logado → redireciona para `/dashboard`
- Se não logado → redireciona para `/login`

---

### `globals.css`
**Função:** Estilos CSS globais.

**Contém:**
- Reset CSS
- Variáveis CSS (`:root`)
- Estilos base (body, html)
- Classes utilitárias globais
- Tema de cores

**Exemplo:**
```css
:root {
  --primary: #0070f3;
  --danger: #ff0000;
  --text: #333;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}
```

---

### `favicon.ico`
**Função:** Ícone que aparece na aba do navegador.

---

### `page.module.css`
**Função:** Estilos CSS específicos da página inicial.

---

## 📁 Módulos do Sistema

### [`login/`](./login/README.md)
**Rota:** `/login`  
**Função:** Autenticação (CPF + senha)  
**Acesso:** Público

### [`dashboard/`](./dashboard/README.md)
**Rota:** `/dashboard`  
**Função:** Dashboard principal com estatísticas  
**Acesso:** Todos os usuários autenticados

### [`regulacao/`](./regulacao/README.md)
**Rota:** `/regulacao`  
**Função:** Módulo de Regulação Médica  
**Acesso:** GESTOR, REGULACAO_ADMIN, REGULACAO_COMUM

### [`camara-tecnica/`](./camara-tecnica/README.md)
**Rota:** `/camara-tecnica`  
**Função:** Farmácia Judicial e Processos  
**Acesso:** GESTOR, FARMACIA_ADMIN, PROCESSO_ADMIN

### [`junta-reguladora/`](./junta-reguladora/README.md)
**Rota:** `/junta-reguladora`  
**Função:** Junta Médica Reguladora  
**Acesso:** GESTOR, JUNTA_ADMIN, JUNTA_* (por serviço)

### [`ccz/`](./ccz/README.md)
**Rota:** `/ccz`  
**Função:** Centro de Controle de Zoonoses  
**Acesso:** GESTOR, CCZ_ADMIN

### [`admin/`](./admin/README.md)
**Rota:** `/admin`  
**Função:** Gestão de usuários e sistema  
**Acesso:** GESTOR, *_ADMIN

### [`relatorios/`](./relatorios/README.md)
**Rota:** `/relatorios`  
**Função:** Relatórios e exportações  
**Acesso:** Todos (relatórios filtrados por permissão)

### [`acesso-negado/`](./acesso-negado/README.md)
**Rota:** `/acesso-negado`  
**Função:** Página de erro de permissão  
**Acesso:** Público (exibida pelo middleware)

---

## 🔌 Funcionalidades Especiais

### [`actions/`](./actions/README.md)
**Função:** Server Actions (mutations server-side).

**Exemplos:**
- `auth.js` → Login/Logout
- `usuarios.js` → CRUD de usuários
- `pedidos.js` → Criar/editar pedidos

**Uso:**
```javascript
import { loginAction } from '@/app/actions/auth';

const result = await loginAction(formData);
```

---

### [`api/`](./api/README.md)
**Função:** API Routes (endpoints REST).

**Estrutura:**
```
api/
├── me/route.js              → GET /api/me (dados do usuário logado)
├── pessoas/route.js         → GET/POST /api/pessoas
├── pessoas/[cpf]/route.js   → GET/PUT/DELETE /api/pessoas/:cpf
└── admin/
    ├── health/route.js      → GET /api/admin/health (telemetria)
    └── usuarios/route.js    → GET/POST /api/admin/usuarios
```

**Exemplo:**
```javascript
// api/me/route.js
export async function GET(request) {
  const user = await getUserFromToken(request);
  return NextResponse.json({ user });
}
```

---

## 🔐 Sistema de Permissões

### Hierarquia de Acesso:

```
GESTOR
  └─ Acesso TOTAL ao sistema

REGULACAO_ADMIN
  └─ /regulacao/* (incluindo /financeiro)

REGULACAO_COMUM
  └─ /regulacao/* (EXCETO /financeiro)

FARMACIA_ADMIN
  └─ /camara-tecnica/farmacia-judicial/*

PROCESSO_ADMIN
  └─ /camara-tecnica/processos/*

JUNTA_ADMIN
  └─ /junta-reguladora/* (todos os serviços)

JUNTA_CAEE
  └─ /junta-reguladora/caee/*

JUNTA_EDUCACAO
  └─ /junta-reguladora/educacao/*

JUNTA_SAUDE
  └─ /junta-reguladora/saude/*

JUNTA_ASSISTENCIA
  └─ /junta-reguladora/assistencia/*

CCZ_ADMIN
  └─ /ccz/*
```

**Validação:** Feita pelo `src/middleware.js` antes de carregar a página.

---

## 🗂️ Convenções de Nomenclatura

### Arquivos Especiais do Next.js:

| Arquivo | Função |
|---------|--------|
| `page.js` | Página renderizável |
| `layout.js` | Layout que envolve páginas |
| `loading.js` | Loading state (Suspense) |
| `error.js` | Error boundary |
| `not-found.js` | Página 404 |
| `route.js` | API endpoint |

### Rotas Dinâmicas:
```
app/
└── pessoas/
    └── [cpf]/
        └── page.js     → /pessoas/:cpf
```

### Grupos de Rotas (sem afetar URL):
```
app/
└── (auth)/
    ├── login/
    └── esqueci-senha/
```

---

## 🚀 Como Criar Nova Página

### 1. Crie a pasta da rota
```bash
mkdir src/app/nova-pagina
```

### 2. Crie `page.js`
```javascript
// src/app/nova-pagina/page.js
export default function NovaPagina() {
  return (
    <div>
      <h1>Nova Página</h1>
    </div>
  );
}
```

### 3. Acesse a rota
```
http://localhost:3000/nova-pagina
```

### 4. Adicione permissões (se necessário)
```javascript
// src/middleware.js
const PERMISSOES_ROTAS = {
  "/nova-pagina": ["GESTOR", "REGULACAO_ADMIN"],
  // ...
};
```

---

## 📊 Fluxo de Renderização

```
1. Usuário acessa /regulacao
   ↓
2. middleware.js intercepta
   ↓
3. Valida autenticação + permissão
   ↓
4. Se OK: carrega layout.js
   ↓
5. Carrega page.js da rota
   ↓
6. Renderiza para o usuário
```

---

## 🎨 Estrutura Recomendada por Módulo

```
modulo/
├── page.js              # Página principal
├── layout.js            # Layout do módulo (opcional)
├── components/          # Componentes específicos
│   ├── Card.js
│   └── Form.js
├── views/               # Views/telas
│   ├── ListView.js
│   └── CreateView.js
└── hooks/               # Hooks customizados
    └── useModulo.js
```

---

## 📚 Leia Também

- [Next.js App Router](https://nextjs.org/docs/app)
- [Server Actions](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations)
- [API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
