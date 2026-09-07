# 📁 `/src/app/camara-tecnica` - Módulo Câmara Técnica

Sistema de gestão de demandas judiciais e administrativas de saúde (Farmácia Judicial e Processos).

**Rota:** `/camara-tecnica`  
**Acesso:** GESTOR, FARMACIA_ADMIN, PROCESSO_ADMIN

---

## 📂 Estrutura

```
camara-tecnica/
├── page.js              # Página principal (redirect)
├── farmacia-judicial/   # Módulo de medicamentos judiciais
│   ├── page.js
│   ├── actions.js
│   ├── components/
│   └── views/
└── processos/           # Módulo de processos administrativos
    ├── page.js
    ├── actions.js
    ├── components/
    └── views/
```

---

## 🎯 Submódulos

### 1. [Farmácia Judicial](./farmacia-judicial/README.md)
**Rota:** `/camara-tecnica/farmacia-judicial`  
**Acesso:** GESTOR, FARMACIA_ADMIN

**Funcionalidades:**
- Cadastro de medicamentos judiciais
- Controle de estoque
- Dispensação para pacientes
- Acompanhamento de demandas judiciais
- Relatórios de custos

**Tabelas:**
- `farmacia_medicamentos`
- `farmacia_estoque`
- `farmacia_dispensacoes`
- `farmacia_demandas_judiciais`

---

### 2. [Processos](./processos/README.md)
**Rota:** `/camara-tecnica/processos`  
**Acesso:** GESTOR, PROCESSO_ADMIN

**Funcionalidades:**
- Cadastro de processos administrativos
- Acompanhamento de prazos
- Anexos e documentos
- Pareceres técnicos
- Despachos
- Relatórios de andamento

**Tabelas:**
- `processos_administrativos`
- `processos_andamentos`
- `processos_documentos`
- `processos_pareceres`

---

## 🔄 Fluxo Geral

```
/camara-tecnica (página principal)
   ↓
Redireciona conforme role:
   ├─→ FARMACIA_ADMIN → /camara-tecnica/farmacia-judicial
   └─→ PROCESSO_ADMIN → /camara-tecnica/processos
```

---

## 🔐 Controle de Acesso

| Funcionalidade | GESTOR | FARMACIA_ADMIN | PROCESSO_ADMIN |
|----------------|--------|----------------|----------------|
| Farmácia Judicial | ✅ | ✅ | ❌ |
| Processos | ✅ | ❌ | ✅ |

---

## 🔗 Submódulos Detalhados

- [Farmácia Judicial](./farmacia-judicial/README.md)
- [Processos Administrativos](./processos/README.md)

---

**Resumo:** Módulo guarda-chuva da Câmara Técnica contendo dois submódulos independentes: Farmácia Judicial (medicamentos e demandas judiciais) e Processos (processos administrativos e pareceres técnicos).
