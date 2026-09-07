# 📖 Referência Rápida - RegulaHub

Guia de consulta rápida para encontrar documentação específica.

---

## 🔍 Busca Rápida por Tópico

| Preciso entender... | Veja este README |
|---------------------|------------------|
| **Como o projeto funciona (geral)** | [`/README.md`](./README.md) |
| **Como fazer login** | [`/src/app/login/README.md`](./src/app/login/README.md) |
| **Sistema de permissões (12 roles)** | [`/src/app/acesso-negado/README.md`](./src/app/acesso-negado/README.md) |
| **Como funciona o JWT** | [`/src/app/actions/README.md`](./src/app/actions/README.md) |
| **Como usar o Prisma** | [`/src/lib/README.md`](./src/lib/README.md) |
| **Schema do banco** | [`/prisma/README.md`](./prisma/README.md) |
| **Cadastrar usuários** | [`/src/app/admin/usuarios/README.md`](./src/app/admin/usuarios/README.md) |
| **Dashboard de telemetria** | [`/src/app/dashboard/README.md`](./src/app/dashboard/README.md) |

---

## 📦 Módulos de Negócio

| Módulo | README | Funcionalidade |
|--------|--------|----------------|
| **Regulação Médica** | [`/src/app/regulacao/README.md`](./src/app/regulacao/README.md) | Pedidos de exames, cotas financeiras, médicos, UBS |
| **CCZ** | [`/src/app/ccz/README.md`](./src/app/ccz/README.md) | Animais, tutores, zoonoses, esporotricose |
| **Junta Reguladora** | [`/src/app/junta-reguladora/README.md`](./src/app/junta-reguladora/README.md) | Reuniões, convocações, atas |
| **Farmácia Judicial** | [`/src/app/camara-tecnica/farmacia-judicial/README.md`](./src/app/camara-tecnica/farmacia-judicial/README.md) | Medicamentos de demandas judiciais |
| **Processos** | [`/src/app/camara-tecnica/processos/README.md`](./src/app/camara-tecnica/processos/README.md) | Processos administrativos, pareceres |

---

## 🔌 APIs

| Endpoint | README | Método | Acesso |
|----------|--------|--------|--------|
| `/api/me` | [`/src/app/api/me/README.md`](./src/app/api/me/README.md) | GET | Autenticado |
| `/api/pessoas` | [`/src/app/api/pessoas/README.md`](./src/app/api/pessoas/README.md) | GET, POST, PUT, DELETE | Autenticado |
| `/api/admin/health` | [`/src/app/api/admin/health/README.md`](./src/app/api/admin/health/README.md) | GET | Admin |
| `/api/admin/usuarios` | [`/src/app/api/admin/usuarios/README.md`](./src/app/api/admin/usuarios/README.md) | GET, POST, PUT, DELETE | GESTOR |

---

## 🎯 Por Caso de Uso

### Novo no Projeto?
```
1. /README.md (visão geral)
2. /src/README.md (estrutura)
3. /src/app/login/README.md (autenticação)
4. /src/app/[seu-modulo]/README.md
```

### Preciso Criar um CRUD?
```
1. /src/app/api/pessoas/README.md (exemplo de API)
2. /src/lib/README.md (como usar Prisma)
3. /prisma/README.md (schema)
```

### Preciso Entender Permissões?
```
1. /src/app/acesso-negado/README.md (12 roles)
2. /src/middleware.js (código comentado)
3. /src/app/login/README.md (JWT)
```

### Erro no Login?
```
1. /src/app/login/README.md (seção Troubleshooting)
2. /src/app/actions/README.md (validações)
3. /prisma/README.md (tabelas user/session)
```

### Preciso Fazer Deploy?
```
1. /README.md (instruções de instalação)
2. /prisma/README.md (migrations)
3. /.env.example (variáveis necessárias)
```

---

## 🔑 Arquivos-Chave (Código)

| Arquivo | O Que Faz | README |
|---------|-----------|--------|
| `src/middleware.js` | Valida JWT em todas as rotas | Código comentado |
| `src/lib/prisma.js` | Cliente Prisma singleton | [`/src/lib/README.md`](./src/lib/README.md) |
| `src/lib/env.js` | Validação de variáveis de ambiente | [`/src/lib/README.md`](./src/lib/README.md) |
| `src/app/actions/auth.js` | Server Action de login | [`/src/app/actions/README.md`](./src/app/actions/README.md) |
| `prisma/schema.prisma` | Schema do banco completo | [`/prisma/README.md`](./prisma/README.md) |
| `prisma/seed.js` | Popular banco com dados iniciais | [`/prisma/README.md`](./prisma/README.md) |

---

## 🏗️ Estrutura do Projeto

```
RegulaHub/
├── src/
│   ├── lib/              → Bibliotecas (Prisma, env)
│   ├── components/       → Componentes React
│   ├── app/
│   │   ├── login/        → Sistema de login
│   │   ├── dashboard/    → Telemetria
│   │   ├── admin/        → Módulo admin
│   │   │   └── usuarios/ → CRUD usuários
│   │   ├── regulacao/    → Regulação médica
│   │   ├── ccz/          → Centro de Zoonoses
│   │   ├── junta-reguladora/ → Junta
│   │   ├── camara-tecnica/   → Câmara Técnica
│   │   │   ├── farmacia-judicial/ → Medicamentos
│   │   │   └── processos/         → Processos admin
│   │   └── api/          → APIs REST
│   │       ├── me/       → Dados do usuário
│   │       ├── pessoas/  → CRUD pessoas
│   │       └── admin/    → APIs admin
├── prisma/               → Schema, migrations, seed
├── public/               → Arquivos estáticos
└── scripts/              → Scripts utilitários
```

**Cada pasta tem um README.md explicando seus arquivos!**

---

## 📊 12 Roles do Sistema

| Role | Acesso |
|------|--------|
| `GESTOR` | Acesso total a tudo |
| `REGULACAO_ADMIN` | Regulação (com financeiro) |
| `REGULACAO_COMUM` | Regulação (sem financeiro) |
| `FARMACIA_ADMIN` | Farmácia Judicial |
| `PROCESSO_ADMIN` | Processos Administrativos |
| `JUNTA_ADMIN` | Junta (convocar, atas) |
| `JUNTA_CAEE` | Junta área CAEE |
| `JUNTA_EDUCACAO` | Junta área Educação |
| `JUNTA_SAUDE` | Junta área Saúde |
| `JUNTA_ASSISTENCIA` | Junta área Assistência Social |
| `CCZ_ADMIN` | Centro de Controle de Zoonoses |

**Detalhes:** [`/src/app/acesso-negado/README.md`](./src/app/acesso-negado/README.md)

---

## 🚀 Comandos Úteis

```bash
# Desenvolvimento
npm run dev

# Build de produção
npm run build

# Iniciar produção
npm start

# Banco de dados
npx prisma migrate dev    # Criar migration
npx prisma generate       # Gerar Prisma Client
npx prisma db push        # Push schema (dev)
npx prisma db seed        # Popular banco
npx prisma studio         # Interface visual

# Testes
npm test

# Linting
npm run lint
```

---

## 🔗 Links Importantes

| Recurso | Link |
|---------|------|
| **Índice Completo** | [`READMES_COMPLETO.md`](./READMES_COMPLETO.md) |
| **Documentação Final** | [`DOCUMENTACAO_FINAL.md`](./DOCUMENTACAO_FINAL.md) |
| **README Principal** | [`README.md`](./README.md) |
| **Schema Prisma** | [`prisma/schema.prisma`](./prisma/schema.prisma) |
| **Middleware** | [`src/middleware.js`](./src/middleware.js) |

---

## 💡 Dicas

### Para Code Review
1. Verifique se README foi atualizado junto com código
2. Confirme que exemplos no README funcionam
3. Valide que fluxos refletem o código atual

### Para Debugar
1. Leia seção "Troubleshooting" do README relevante
2. Verifique logs no console
3. Use Prisma Studio para inspecionar banco

### Para Adicionar Funcionalidade
1. Leia README do módulo relacionado
2. Siga padrões existentes
3. Atualize README após implementar
4. Adicione testes (se aplicável)

---

## 📞 Ajuda

**Não encontrou o que procura?**

1. **Busque nos READMEs:**
   ```bash
   grep -r "sua_busca" . --include="*README.md"
   ```

2. **Consulte o índice:**
   [`READMES_COMPLETO.md`](./READMES_COMPLETO.md)

3. **Veja documentação final:**
   [`DOCUMENTACAO_FINAL.md`](./DOCUMENTACAO_FINAL.md)

---

**Última atualização:** 03/09/2026  
**Status:** ✅ Completo
