# 📁 `/src/app/admin` - Módulo de Administração

Área administrativa do sistema, acessível apenas por usuários com cargo GESTOR.

**Rota Base:** `/admin`  
**Acesso:** GESTOR (acesso total)

---

## 📂 Estrutura

```
admin/
└── usuarios/           # Cadastro de novos usuários
    ├── page.js
    └── AdminUsuarios.module.css
```

---

## 🎯 Funcionalidades

### Gestão de Usuários (`/admin/usuarios`)
- Cadastro de novos usuários do sistema
- Atribuição de roles/permissões
- Integração com cadastro de pessoas
- Validação automática de CPF

---

## 🔐 Controle de Acesso

**Validado pelo middleware (`src/middleware.js`):**

```javascript
// Apenas GESTOR pode acessar /admin/*
if (pathname.startsWith('/admin')) {
  if (userRole !== 'GESTOR') {
    return NextResponse.redirect('/acesso-negado');
  }
}
```

---

## 📚 Subpastas

### [`usuarios/`](./usuarios/README.md)
Cadastro e gerenciamento de usuários do sistema.

---

**Resumo:** Módulo administrativo do RegulaHub, centraliza funcionalidades de gestão acessíveis apenas ao GESTOR.
