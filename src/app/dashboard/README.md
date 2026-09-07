# 📁 `/src/app/dashboard` - Dashboard de Telemetria

Dashboard administrativo com telemetria em tempo real do sistema (banco, sessões, usuários).

**Rota:** `/dashboard` ou `/`  
**Acesso:** Todos os usuários autenticados (mas conteúdo voltado para GESTOR)

---

## 📄 Arquivos Nesta Pasta

### `page.js`
**Tipo:** Client Component (`'use client'`)  
**Função:** Painel de monitoramento em tempo real do sistema

#### O Que Este Arquivo Faz

**1. Estados do Componente**
```javascript
const [telemetry, setTelemetry] = useState(null);  // Dados de telemetria
const [loading, setLoading] = useState(true);       // Estado de carregamento
const [error, setError] = useState('');             // Mensagens de erro
```

**2. Função de Fetch (Buscar Dados)**
```javascript
const fetchSystemStatus = useCallback(async () => {
  setLoading(true);
  
  const res = await fetch('/api/admin/health', { cache: 'no-store' });
  const data = await res.json();
  
  setTelemetry(data);
  setLoading(false);
}, []);
```

**O que retorna (`/api/admin/health`):**
```json
{
  "status": "OK",
  "database": {
    "status": "ONLINE",
    "pingMs": 45,
    "tamanhoBanco": "12 MB"
  },
  "metrics": {
    "sessoesAtivas": 3,
    "totalUsuarios": 8
  },
  "logs": [
    {
      "id": "abc123",
      "usuario": "Jefinny de Paula",
      "role": "GESTOR",
      "data": "14:32"
    }
  ]
}
```

**3. useEffect (Auto-Refresh)**
```javascript
useEffect(() => {
  fetchSystemStatus();  // Busca inicial
  
  // Auto-refresh a cada 30 segundos
  const interval = setInterval(fetchSystemStatus, 30000);
  
  return () => clearInterval(interval);  // Cleanup ao desmontar
}, []);
```

**Comportamento:**
- Busca dados ao carregar página
- Atualiza automaticamente a cada 30s
- Limpa intervalo ao sair da página

**4. Cards de Métricas**

**Card 1: Banco de Dados**
```javascript
<div className={telemetry?.database?.status === 'ONLINE' ? 
                styles.cardSuccess : styles.cardDanger}>
  <span>Banco de Dados (Prisma/Postgres)</span>
  <strong>{telemetry?.database?.status}</strong>
  <span>Latência: {telemetry?.database?.pingMs}ms</span>
</div>
```
- Verde se ONLINE
- Vermelho se OFFLINE
- Mostra latência da query

**Card 2: Sessões Ativas**
```javascript
<div className={styles.card}>
  <span>Sessões Ativas no Banco</span>
  <strong>{telemetry?.metrics?.sessoesAtivas}</strong>
  <span>Usuários logados com token válido</span>
</div>
```
- Conta sessões não expiradas
- Query: `WHERE expiresAt > NOW()`

**Card 3: Usuários Totais**
```javascript
<div className={styles.card}>
  <span>Usuários no Banco</span>
  <strong>{telemetry?.metrics?.totalUsuarios}</strong>
  <span>Registros na tabela User</span>
</div>
```
- Total de usuários cadastrados

**Card 4: Status Autenticação**
```javascript
<div className={styles.cardSuccess}>
  <span>API de Autenticação</span>
  <strong>OPERACIONAL</strong>
  <span>Gerenciando cookies HTTP-Only</span>
</div>
```
- Sempre verde (se página carregou, autenticação funciona)

**5. Lista de Sessões Recentes**
```javascript
<ul className={styles.logList}>
  {telemetry?.logs?.map((log) => (
    <li key={log.id}>
      <strong>{log.usuario}</strong>
      <p>Perfil: {log.role}</p>
      <small>Sessão iniciada às {log.data}</small>
    </li>
  ))}
</ul>
```

**Mostra:**
- Últimas 5 sessões criadas
- Nome do usuário
- Role (GESTOR, REGULACAO_ADMIN, etc)
- Hora da sessão

---

### `DashboardAdmin.module.css`
**Tipo:** CSS Module  
**Função:** Estilização do dashboard

**Classes Principais:**

```css
.container {
  padding: 2rem;
  max-width: 1400px;
  margin: 0 auto;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.title {
  font-size: 1.75rem;
  font-weight: 700;
  color: #1e293b;
}

.subtitle {
  color: #64748b;
  font-size: 0.9rem;
}

.btnPrimary {
  padding: 0.75rem 1.5rem;
  background: #2563eb;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
}

.btnPrimary:hover {
  background: #1d4ed8;
}

.gridCards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.card {
  background: white;
  padding: 1.5rem;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  border-left: 4px solid #3b82f6;
}

.cardSuccess {
  border-left-color: #10b981;  /* Verde */
}

.cardDanger {
  border-left-color: #ef4444;  /* Vermelho */
}

.cardLabel {
  display: block;
  font-size: 0.85rem;
  color: #64748b;
  text-transform: uppercase;
  font-weight: 600;
  margin-bottom: 0.5rem;
}

.cardNumber {
  display: block;
  font-size: 2rem;
  font-weight: 700;
  color: #1e293b;
  margin: 0.5rem 0;
}

.cardSubtext {
  display: block;
  font-size: 0.8rem;
  color: #94a3b8;
}

.logList {
  list-style: none;
  padding: 0;
}

.logItem {
  padding: 1rem;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.logTime {
  color: #94a3b8;
  font-size: 0.85rem;
}
```

---

## 🔄 Fluxo de Funcionamento

### Ciclo Completo
```
1. Usuário acessa /dashboard
   ↓
2. Middleware valida JWT
   ↓
3. Página carrega
   ↓
4. useEffect executa fetchSystemStatus()
   ↓
5. GET /api/admin/health
   ↓
6. API retorna JSON com métricas
   ↓
7. setTelemetry(data)
   ↓
8. Interface atualiza cards e lista
   ↓
9. Aguarda 30 segundos
   ↓
10. Repete passo 5 automaticamente
```

### Refresh Manual
```
1. Usuário clica "🔄 Atualizar Diagnóstico"
   ↓
2. onClick={fetchSystemStatus}
   ↓
3. setLoading(true)
   ↓
4. Busca novos dados
   ↓
5. Atualiza interface
   ↓
6. setLoading(false)
```

---

## 📊 Métricas Exibidas

### 1. Status do Banco
**Query executada na API:**
```sql
SELECT pg_size_pretty(pg_database_size(current_database())) as size;
```
**Teste de ping:**
```sql
SELECT 1;
```
**Mostra:**
- Status: ONLINE / OFFLINE
- Latência: tempo da query em ms
- Tamanho do banco (ex: "12 MB")

### 2. Sessões Ativas
**Query:**
```javascript
await prisma.session.count({
  where: {
    expiresAt: { gt: new Date() }  // Não expiradas
  }
});
```
**Significado:**
- Usuários com token JWT válido
- Sessões que ainda não expiraram

### 3. Total de Usuários
**Query:**
```javascript
await prisma.user.count();
```
**Significado:**
- Total de usuários cadastrados no sistema

### 4. Últimas Sessões
**Query:**
```javascript
await prisma.session.findMany({
  take: 5,
  orderBy: { createdAt: 'desc' },
  include: {
    user: {
      select: { nome: true, cpf: true, role: true, cargo: true }
    }
  }
});
```
**Mostra:**
- Nome do usuário
- Role (GESTOR, etc)
- Hora da sessão

---

## 🎨 Layout Visual

```
┌─────────────────────────────────────────────────────────────┐
│ Painel de Diagnóstico do Sistema 🛠️  [🔄 Atualizar]        │
│ Telemetria em tempo real...                                 │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│ │ Banco    │  │ Sessões  │  │ Usuários │  │ Auth     │   │
│ │ ONLINE   │  │    3     │  │    8     │  │ OK       │   │
│ │ 45ms     │  │ Ativas   │  │ Total    │  │ HTTP-Only│   │
│ └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│ Sessões Recentes Criadas no Banco                          │
├─────────────────────────────────────────────────────────────┤
│ • Jefinny de Paula (GESTOR)              Às 14:32          │
│ • João Silva (REGULACAO_ADMIN)           Às 14:15          │
│ • Maria Santos (REGULACAO_COMUM)         Às 13:58          │
│ • Pedro Oliveira (CCZ_ADMIN)             Às 13:42          │
│ • Ana Costa (FARMACIA_ADMIN)             Às 13:20          │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔐 Segurança e Permissões

### Quem Pode Acessar?

**Middleware (`src/middleware.js`):**
```javascript
const PERMISSOES_ROTAS = {
  "/dashboard": [
    "GESTOR",
    "REGULACAO_ADMIN",
    "REGULACAO_COMUM",
    "FARMACIA_ADMIN",
    // ... todos os roles
  ]
};
```

**Resultado:** Todos os usuários autenticados podem acessar.

### Conteúdo Sensível?

**API `/api/admin/health`:**
```javascript
// Verifica se é admin
const rolesAdministrativas = [
  'GESTOR',
  'REGULACAO_ADMIN',
  'JUNTA_ADMIN',
  'FARMACIA_ADMIN',
  'PROCESSO_ADMIN',
  'CCZ_ADMIN'
];

if (!rolesAdministrativas.includes(user.role)) {
  return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
}
```

**Resultado:** 
- Usuários comuns veem dashboard básico
- Admins veem métricas completas

**Informações NÃO Expostas:**
- ❌ Senhas ou hashes
- ❌ JWT_SECRET
- ❌ Connection strings
- ❌ Dados de usuários (apenas nomes)

---

## 🧪 Testes Manuais

### Teste 1: Carregar Dashboard
```
1. Login como GESTOR
2. Acesse /dashboard ou /
3. Deve mostrar:
   - Status do banco: ONLINE
   - Sessões ativas: ≥ 1 (você)
   - Total usuários: ≥ 1
   - Sua sessão na lista
```

### Teste 2: Auto-Refresh
```
1. Abra dashboard
2. Observe "Sessões Ativas: 1"
3. Abra nova aba anônima
4. Faça login com outro usuário
5. Aguarde 30 segundos
6. Dashboard original deve atualizar: "Sessões Ativas: 2"
```

### Teste 3: Refresh Manual
```
1. Abra dashboard
2. Observe métricas
3. Faça logout em outra aba
4. Clique "🔄 Atualizar Diagnóstico"
5. Sessões Ativas deve diminuir
```

### Teste 4: Erro no Banco
```
1. Pare o banco (se ambiente dev local)
2. Dashboard deve mostrar:
   - Card vermelho: "DESCONECTADO"
   - Mensagem de erro
```

### Teste 5: Permissões
```
1. Login como REGULACAO_COMUM
2. Acesse /dashboard
3. Tente acessar /api/admin/health diretamente
4. Deve retornar 403 Forbidden
5. Dashboard mostra dados básicos apenas
```

---

## 📱 Responsividade

```css
/* Grid de cards */
.gridCards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
}
```

**Comportamento:**
- **Desktop (> 1000px):** 4 cards em linha
- **Tablet (600-1000px):** 2 cards por linha
- **Mobile (< 600px):** 1 card por linha (empilhados)

---

## 🔗 Arquivos Relacionados

| Arquivo | Relação |
|---------|---------|
| `/api/admin/health/route.js` | API que fornece dados |
| `src/middleware.js` | Valida acesso à rota |
| `prisma/schema.prisma` | Define tabelas consultadas |

---

## 💡 Melhorias Futuras

### Implementar
1. ✅ Auto-refresh (implementado - 30s)
2. ⏳ Gráficos de linha (histórico)
3. ⏳ Alertas se banco cair
4. ⏳ Filtro por período
5. ⏳ Export de logs (CSV/PDF)
6. ⏳ Métricas por módulo
7. ⏳ Tempo médio de sessão
8. ⏳ Usuários mais ativos

### Otimizações
- Cache de 10s no endpoint
- Paginação nas sessões
- WebSocket para real-time (em vez de polling)

---

## 📚 Referências

- [React useEffect](https://react.dev/reference/react/useEffect)
- [React useCallback](https://react.dev/reference/react/useCallback)
- [Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API)
- [CSS Grid](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Grid_Layout)

---

**Resumo:** Dashboard de telemetria em tempo real mostrando status do banco, sessões ativas, total de usuários e log de últimas sessões, com auto-refresh a cada 30 segundos.
