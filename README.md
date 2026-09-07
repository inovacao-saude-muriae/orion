# 🏥 RegulaHub - Sistema de Gestão Municipal de Saúde

Sistema integrado para gerenciamento de regulação médica, farmácia judicial, junta reguladora e CCZ.

---

## 📋 Estrutura do Projeto

```
RegulaHub/
├── src/                    # Código-fonte da aplicação
├── prisma/                 # Schema e migrations do banco de dados
├── public/                 # Arquivos estáticos (imagens, ícones)
├── scripts/                # Scripts utilitários
└── node_modules/           # Dependências instaladas
```

---

## 📁 Arquivos Principais

### 🔧 Configuração

| Arquivo | Descrição |
|---------|-----------|
| `package.json` | Dependências do projeto e scripts npm |
| `next.config.mjs` | Configuração do Next.js (Turbopack, CORS, etc) |
| `prisma.config.js` | Configuração do Prisma ORM |
| `jsconfig.json` | Configuração do JavaScript (paths, aliases) |
| `eslint.config.mjs` | Regras de linting do código |
| `.gitignore` | Arquivos ignorados pelo Git |
| `skills-lock.json` | Lock de skills do Kiro AI |

### 🔐 Segurança

| Arquivo | Descrição | Status |
|---------|-----------|--------|
| `.env` | **Variáveis de ambiente (PRIVADO)** | ❌ Não vai para Git |
| `.env.example` | Template de variáveis de ambiente | ✅ Vai para Git |

**⚠️ NUNCA commite o `.env` com credenciais reais!**

### 📚 Documentação

| Arquivo | Descrição |
|---------|-----------|
| `AGENTS.md` | Regras para agentes AI (Kiro) |
| `DOCUMENTACAO_PROJETO.md` | Documentação completa do sistema |
| `ARQUITETURA_SISTEMA.md` | Arquitetura e padrões |
| `ESTRUTURA_CARGOS.md` | Sistema de roles e permissões |
| `MIGRACAO_TURBOPACK.md` | Documentação da migração Webpack → Turbopack |
| `SEGURANCA_CREDENCIAIS.md` | Guia de segurança |

---

## 🚀 Comandos Principais

### Desenvolvimento
```bash
npm run dev          # Inicia servidor (Turbopack)
npm run build        # Build de produção
npm run start        # Inicia servidor de produção
npm run lint         # Verifica código
```

### Banco de Dados
```bash
npm run db:studio    # Abre Prisma Studio (GUI)
npm run db:push      # Sincroniza schema com banco
npm run db:seed      # Popula banco com dados iniciais
npm run db:generate  # Gera Prisma Client
npm run db:migrate   # Cria migration
npm run db:reset     # Reseta banco (CUIDADO!)
```

### Testes
```bash
npm run test:ccz     # Testa módulo CCZ
```

---

## 🏗️ Stack Tecnológica

| Tecnologia | Versão | Uso |
|------------|--------|-----|
| Next.js | 16.3.0 | Framework React (App Router) |
| React | 19.2.8 | Biblioteca UI |
| Prisma | 7.9.1 | ORM para PostgreSQL |
| PostgreSQL | - | Banco de dados (Supabase) |
| JWT (jose) | 6.2.10 | Autenticação |
| bcryptjs | 3.0.3 | Hashing de senhas |
| Turbopack | - | Bundler ultra-rápido |

---

## 🔐 Sistema de Autenticação

- **Método:** JWT (JSON Web Token)
- **Login:** CPF + Senha
- **Sessão:** 8 horas
- **Storage:** Cookie HTTP-only

### Roles (12 cargos):
```
GESTOR              → Acesso total
REGULACAO_ADMIN     → Admin Regulação (com financeiro)
REGULACAO_COMUM     → Regulação sem financeiro
FARMACIA_ADMIN      → Admin Farmácia Judicial
PROCESSO_ADMIN      → Admin Processos
JUNTA_ADMIN         → Admin Junta (tudo)
JUNTA_CAEE          → Apenas CAEE
JUNTA_EDUCACAO      → Apenas Educação
JUNTA_SAUDE         → Apenas Saúde
JUNTA_ASSISTENCIA   → Apenas Assistência Social
CCZ_ADMIN           → Admin CCZ
```

---

## 📂 Estrutura de Pastas

Consulte o README em cada pasta para detalhes:

- [`src/`](./src/README.md) - Código-fonte da aplicação
- [`prisma/`](./prisma/README.md) - Schema e seeds do banco
- [`public/`](./public/README.md) - Arquivos estáticos
- [`scripts/`](./scripts/README.md) - Scripts auxiliares

---

## 🌐 URLs do Sistema

### Desenvolvimento
- **Local:** http://localhost:3000
- **Rede:** http://0.0.0.0:3000

### Principais Rotas
```
/login                    → Login
/dashboard               → Dashboard principal
/regulacao               → Módulo Regulação
/regulacao/financeiro    → Financeiro (apenas admin)
/camara-tecnica/farmacia → Farmácia Judicial
/camara-tecnica/processos → Processos
/junta-reguladora        → Junta Reguladora
/ccz                     → Centro de Controle de Zoonoses
/admin/usuarios          → Gestão de usuários
```

---

## 🔒 Segurança

### Variáveis Obrigatórias (`.env`):
```bash
DATABASE_URL          # Conexão PostgreSQL (pooler)
DIRECT_URL            # Conexão direta (migrations)
JWT_SECRET            # Chave para assinar tokens
NODE_ENV              # Ambiente (development/production)
GESTOR_CPF            # CPF do gestor (seed)
GESTOR_NOME           # Nome do gestor (seed)
GESTOR_SENHA          # Senha do gestor (seed)
```

### Proteções Ativas:
- ✅ JWT assinado e validado
- ✅ Middleware em todas as rotas protegidas
- ✅ Senhas com hash bcrypt (custo 10)
- ✅ Cookies HTTP-only (proteção XSS)
- ✅ CORS configurado
- ✅ `.env` no `.gitignore`

---

## 📊 Banco de Dados

- **Provider:** PostgreSQL 15+
- **Host:** Supabase
- **ORM:** Prisma
- **Migrations:** `prisma migrate`

### Modelos Principais:
```
User              → Usuários do sistema
Session           → Sessões ativas
Pessoa            → Pessoas físicas
Endereco          → Endereços
PedidoExame       → Pedidos de exames (regulação)
Medicamento       → Medicamentos (farmácia)
PacienteJunta     → Pacientes junta reguladora
Animal            → Animais (CCZ)
```

---

## 🧪 Testes

### Testar Login:
1. Acesse http://localhost:3000/login
2. **CPF:** `12912453674`
3. **Senha:** `regula@saude_2026`
4. Role: **GESTOR** (acesso total)

### Criar Usuários de Teste:
```bash
npm run db:studio
```

Acesse Prisma Studio e crie usuários com diferentes roles para testar permissões.

---

## 📝 Contribuindo

### 1. Clone o repositório
```bash
git clone <url-do-repo>
cd RegulaHub
```

### 2. Instale dependências
```bash
npm install
```

### 3. Configure `.env`
```bash
cp .env.example .env
# Edite .env com suas credenciais
```

### 4. Sincronize banco
```bash
npm run db:push
npm run db:seed
```

### 5. Inicie servidor
```bash
npm run dev
```

---

## 🐛 Troubleshooting

### Erro: "JWT_SECRET não definido"
```bash
# Gere um secret:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Adicione ao .env:
JWT_SECRET="valor_gerado"
```

### Erro: "Prisma Client não gerado"
```bash
npm run db:generate
```

### Erro: "Banco fora de sincronia"
```bash
npm run db:push
```

### Hot Reload não funciona?
```bash
# Verifique se está usando Turbopack:
npm run dev
# Deve aparecer: ▲ Next.js 16.3.0 (Turbopack)
```

---

## 📄 Licença

Projeto proprietário - Prefeitura Municipal

---

## 👥 Contato

- **Gestor:** Jefinny de Paula Dias Souza
- **Sistema:** RegulaHub
- **Versão:** 0.1.0

---

## 📚 Documentação Completa

Para mais detalhes, consulte:
- [Documentação do Projeto](./DOCUMENTACAO_PROJETO.md)
- [Arquitetura do Sistema](./ARQUITETURA_SISTEMA.md)
- [Estrutura de Cargos](./ESTRUTURA_CARGOS.md)
- [Guia Rápido](./GUIA_RAPIDO.md)
