# 📁 `/src/app/api/admin` - APIs Administrativas

Endpoints exclusivos para administradores (telemetria, usuários, relatórios).

**Base:** `/api/admin`  
**Acesso:** GESTOR e roles *_ADMIN

---

## 📂 Estrutura

```
admin/
├── health/          # GET /api/admin/health (telemetria)
├── usuarios/        # CRUD de usuários
│   └── [cpf]/
└── relatorios/      # Geração de relatórios
    ├── regulacao/
    ├── ccz/
    └── financeiro/
```

---

## 📡 Subpastas

### [`health/`](./health/README.md)
**Endpoint:** `GET /api/admin/health`  
**Função:** Telemetria do sistema em tempo real  
**Acesso:** GESTOR, *_ADMIN

**Retorna:**
- Status do banco (ONLINE/OFFLINE)
- Latência de queries
- Sessões ativas
- Total de usuários
- Últimas sessões criadas
- Tamanho do banco

---

### [`usuarios/`](./usuarios/README.md)
**Endpoints:**
- `GET /api/admin/usuarios` - Listar usuários
- `POST /api/admin/usuarios` - Criar usuário
- `PUT /api/admin/usuarios/[cpf]` - Atualizar usuário
- `DELETE /api/admin/usuarios/[cpf]` - Deletar usuário

**Acesso:** Apenas GESTOR

**Funcionalidades:**
- CRUD completo de usuários
- Validação de CPF
- Hash de senha (bcrypt)
- 12 roles disponíveis
- Ativar/desativar usuários

---

### `relatorios/`
**Endpoints:**
- `GET /api/admin/relatorios/regulacao` - Relatório de regulação
- `GET /api/admin/relatorios/ccz` - Relatório CCZ
- `GET /api/admin/relatorios/financeiro` - Relatório financeiro

**Acesso:** GESTOR, *_ADMIN da área

**Formatos:**
- JSON (padrão)
- PDF (query param `?format=pdf`)
- CSV (query param `?format=csv`)

---

## 🔐 Controle de Acesso

| Endpoint | GESTOR | *_ADMIN | *_COMUM |
|----------|--------|---------|---------|
| `/api/admin/health` | ✅ | ✅ | ❌ |
| `/api/admin/usuarios` | ✅ | ❌ | ❌ |
| `/api/admin/relatorios/*` | ✅ | ⚠️ Apenas sua área | ❌ |

**Exemplo:**
- `REGULACAO_ADMIN` → acessa `/api/admin/relatorios/regulacao`
- `REGULACAO_ADMIN` → **bloqueado** em `/api/admin/relatorios/ccz`

---

## 🔗 Documentação Detalhada

- [Health (Telemetria)](./health/README.md)
- [Usuários (CRUD)](./usuarios/README.md)

---

**Resumo:** APIs administrativas para telemetria do sistema, gerenciamento de usuários (apenas GESTOR) e geração de relatórios por área com controle de acesso granular.
