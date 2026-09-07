# 📁 `/src/app/regulacao` - Módulo de Regulação Médica

Sistema de regulação de exames e procedimentos médicos, gestão de cotas financeiras e acompanhamento de pedidos.

**Rota:** `/regulacao`  
**Acesso:** GESTOR, REGULACAO_ADMIN, REGULACAO_COMUM  
**Restrição:** REGULACAO_COMUM NÃO acessa `/regulacao/financeiro`

---

## 📂 Estrutura

```
regulacao/
├── page.js              # Página principal com tabs
├── page.module.css      # Estilos do módulo
├── actions.js           # Server Actions (CRUD)
├── components/          # Componentes específicos
│   ├── Modals/         # Modais de criação/edição
│   ├── Cards/          # Cards de exibição
│   └── Forms/          # Formulários
├── views/              # Telas/views do módulo
│   ├── DashboardView.js
│   ├── PedidosView.js
│   ├── FinanceiroView.js
│   └── ConfiguracoesView.js
└── hooks/              # Hooks customizados
    ├── usePedidos.js
    ├── useCotas.js
    └── useMedicos.js
```

---

## 📄 Arquivos Principais

### `page.js`
**Tipo:** Client Component  
**Função:** Página principal com sistema de tabs

**Tabs disponíveis:**
- 📊 **DASHBOARD** - Estatísticas e visão geral
- 📋 **PEDIDOS** - Lista e gerenciamento de pedidos de exames
- 💰 **FINANCEIRO** - Cotas financeiras (apenas ADMIN)
- ⚙️ **CONFIGURAÇÕES** - Médicos, UBS, procedimentos

**Estados:**
```javascript
const [activeTab, setActiveTab] = useState('DASHBOARD');
const [userRole, setUserRole] = useState(null);
```

**Controle de Acesso:**
```javascript
// REGULACAO_COMUM NÃO vê tab Financeiro
{userRole !== 'REGULACAO_COMUM' && (
  <button onClick={() => setActiveTab('FINANCEIRO')}>
    💰 Financeiro
  </button>
)}
```

---

### `actions.js`
**Tipo:** Server Actions  
**Função:** CRUD de pedidos, cotas, médicos, UBS

**Principais Actions:**

**1. Pedidos**
```javascript
export async function createPedidoAction(formData) {
  // Cria novo pedido de exame
  // Valida: CPF, procedimento, UBS, médico
  // Retorna: { success: true, pedidoId }
}

export async function updatePedidoAction(id, data) {
  // Atualiza status, observações
}

export async function deletePedidoAction(id) {
  // Soft delete ou hard delete
}

export async function getPedidosAction(filters) {
  // Lista com filtros: status, período, UBS
}
```

**2. Cotas Financeiras**
```javascript
export async function createCotaAction(data) {
  // Cria cota mensal
  // Valida: tipo, mês/ano, valor teto
}

export async function updateCotaAction(id, data) {
  // Atualiza valor teto
}

export async function getCotasAction(mes, ano) {
  // Busca cotas de um período
}
```

**3. Médicos e UBS**
```javascript
export async function createMedicoAction(data) {
  // Cadastra médico (CRM, nome, especialidade)
}

export async function createUbsAction(data) {
  // Cadastra UBS (CNES, nome)
}
```

---

## 🎯 Funcionalidades

### 1. Dashboard (DashboardView)
**Exibe:**
- Total de pedidos no mês
- Pedidos aguardando regulação
- Pedidos liberados
- Pedidos negados
- Gráfico de distribuição por status
- Top UBS com mais solicitações
- Top procedimentos solicitados

**Queries principais:**
```sql
-- Total por status
SELECT status, COUNT(*) 
FROM regula_pedidos_exames
WHERE data_solicitacao >= '2026-09-01'
GROUP BY status;

-- Top UBS
SELECT u.nome, COUNT(p.id)
FROM regula_pedidos_exames p
JOIN regula_ubs u ON p.ubs_responsavel_id = u.id
GROUP BY u.nome
ORDER BY COUNT(p.id) DESC
LIMIT 5;
```

---

### 2. Pedidos (PedidosView)
**Exibe:**
- Lista de pedidos com filtros
- Status: Aguardando / Liberado / Negado
- Busca por CPF do paciente
- Filtro por período
- Filtro por UBS

**Ações:**
- ✅ Criar novo pedido
- 📝 Editar pedido
- 🗑️ Excluir pedido
- ✅ Liberar pedido
- ❌ Negar pedido
- 📄 Ver detalhes

**Componentes:**
- `ModalCriarPedido.js` - Form de criação
- `ModalEditarPedido.js` - Form de edição
- `CardPedido.js` - Card individual
- `FiltroPedidos.js` - Barra de filtros

---

### 3. Financeiro (FinanceiroView)
**Acesso:** Apenas GESTOR e REGULACAO_ADMIN

**Exibe:**
- Cotas financeiras mensais
- Valor teto por tipo de cota
- Valor executado no mês
- Saldo disponível
- Histórico de gastos

**Tipos de Cota:**
- Exames de Imagem
- Exames Laboratoriais
- Consultas Especializadas
- Procedimentos Cirúrgicos

**Cálculos:**
```javascript
// Valor executado
const executado = pedidos
  .filter(p => p.status === 'Liberado')
  .reduce((sum, p) => sum + p.procedimento.valor, 0);

// Saldo
const saldo = cota.valorTeto - executado;

// Percentual
const percentual = (executado / cota.valorTeto) * 100;
```

**Alertas:**
- 🟢 Verde: < 70% do teto
- 🟡 Amarelo: 70-90% do teto
- 🔴 Vermelho: > 90% do teto

---

### 4. Configurações (ConfiguracoesView)
**Tabs internas:**

**A. Médicos**
- Lista de médicos cadastrados
- Criar novo médico
- Editar médico (ativar/desativar)
- Campos: CRM, UF, nome, especialidade

**B. UBS**
- Lista de UBS cadastradas
- Criar nova UBS
- Editar UBS (ativar/desativar)
- Campos: CNES, nome

**C. Procedimentos**
- Lista de procedimentos/exames
- Organizado por tipo
- Criar novo procedimento
- Editar valor
- Campos: nome, tipo, valor

---

## 🔄 Fluxo Completo de Pedido

```
1. Operador acessa /regulacao?tab=PEDIDOS
   ↓
2. Clica "Novo Pedido"
   ↓
3. Abre modal ModalCriarPedido
   ↓
4. Preenche:
   - CPF do paciente (busca automática)
   - Procedimento (select)
   - UBS responsável (select)
   - Médico solicitante (select)
   - Observações (textarea)
   ↓
5. Clica "Criar Pedido"
   ↓
6. createPedidoAction(formData)
   ↓
7. Validações:
   - CPF válido?
   - Paciente cadastrado?
   - Procedimento existe?
   - UBS ativa?
   - Médico ativo?
   ↓
8. Insere no banco:
   INSERT INTO regula_pedidos_exames (...)
   ↓
9. Status inicial: "Aguardando"
   ↓
10. Retorna para lista
   ↓
11. Admin revisa pedido
   ↓
12. Decisão:
    - Liberar → status = "Liberado"
    - Negar → status = "Negado" + motivo
   ↓
13. Paciente é comunicado
```

---

## 📊 Modelos do Banco

### Tabelas Utilizadas

**1. regula_pedidos_exames**
```prisma
model PedidoExame {
  id                  Int
  pessoaCpf           String
  cnsPaciente         String?
  procedimentoId      Int
  ubsResponsavelId    Int?
  medicoSolicitanteId Int?
  classificacaoRisco  String?
  status              String  // Aguardando, Liberado, Negado
  dataSolicitacao     DateTime
  dataLiberacao       DateTime?
  observacao          String?
}
```

**2. regula_cotas_financeiras**
```prisma
model CotaFinanceira {
  id        Int
  tipoCota  String  // "Exames de Imagem", etc
  mes       String  // "09"
  ano       String  // "2026"
  valorTeto Decimal // 50000.00
}
```

**3. regula_medicos**
```prisma
model Medico {
  id            Int
  crm           String
  ufCrm         String
  nome          String
  especialidade String
  ativo         Boolean
}
```

**4. regula_ubs**
```prisma
model Ubs {
  id    Int
  cnes  String
  nome  String
  ativo Boolean
}
```

**5. regula_procedimentos**
```prisma
model Procedimento {
  id          Int
  tipoExameId Int
  nome        String
  valor       Decimal
}
```

---

## 🔐 Controle de Acesso

### Por Role

| Funcionalidade | GESTOR | REGULACAO_ADMIN | REGULACAO_COMUM |
|----------------|--------|-----------------|-----------------|
| Ver Dashboard | ✅ | ✅ | ✅ |
| Ver Pedidos | ✅ | ✅ | ✅ |
| Criar Pedido | ✅ | ✅ | ✅ |
| Editar Pedido | ✅ | ✅ | ✅ |
| Liberar/Negar | ✅ | ✅ | ❌ |
| Ver Financeiro | ✅ | ✅ | ❌ |
| Editar Cotas | ✅ | ✅ | ❌ |
| Configurações | ✅ | ✅ | ⚠️ Apenas leitura |

### Middleware Validation
```javascript
// src/middleware.js
const PERMISSOES_ROTAS = {
  "/regulacao": [
    "GESTOR",
    "REGULACAO_ADMIN",
    "REGULACAO_COMUM"
  ],
  "/regulacao/financeiro": [
    "GESTOR",
    "REGULACAO_ADMIN"
    // REGULACAO_COMUM bloqueado
  ]
};
```

---

## 🧪 Testes Manuais

### Teste 1: Criar Pedido
```
1. Login como REGULACAO_COMUM
2. Acesse /regulacao?tab=PEDIDOS
3. Clique "Novo Pedido"
4. Preencha:
   - CPF: 12345678900
   - Procedimento: "Ressonância Magnética"
   - UBS: "UBS Centro"
   - Médico: "Dr. João Silva"
5. Clique "Criar"
6. Deve aparecer na lista com status "Aguardando"
```

### Teste 2: Acesso Financeiro Bloqueado
```
1. Login como REGULACAO_COMUM
2. Acesse /regulacao
3. Tab "Financeiro" NÃO deve aparecer
4. Tente acessar /regulacao/financeiro direto
5. Deve redirecionar para /acesso-negado
```

### Teste 3: Liberar Pedido
```
1. Login como REGULACAO_ADMIN
2. Acesse /regulacao?tab=PEDIDOS
3. Clique em pedido "Aguardando"
4. Clique "Liberar"
5. Status muda para "Liberado"
6. dataLiberacao preenchida
```

---

## 🔗 Arquivos Relacionados

| Arquivo | Relação |
|---------|---------|
| `src/middleware.js` | Controla acesso financeiro |
| `prisma/schema.prisma` | Define tabelas regula_* |
| [`components/README.md`](./components/README.md) | Componentes do módulo |
| [`views/README.md`](./views/README.md) | Telas detalhadas |
| [`hooks/README.md`](./hooks/README.md) | Hooks customizados |

---

## 📚 Consulte Também

- [Dashboard View](./views/README.md#dashboardview)
- [Pedidos View](./views/README.md#pedidosview)
- [Financeiro View](./views/README.md#financeiroview)
- [Componentes](./components/README.md)
- [Hooks](./hooks/README.md)

---

**Resumo:** Módulo completo de regulação médica com gestão de pedidos de exames, controle financeiro por cotas mensais, cadastro de médicos/UBS/procedimentos, e sistema de permissões diferenciado para admin e operadores comuns.
