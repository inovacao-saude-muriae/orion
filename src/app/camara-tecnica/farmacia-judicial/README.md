# 📁 `/src/app/camara-tecnica/farmacia-judicial` - Farmácia Judicial

Sistema de gestão de medicamentos de demandas judiciais, controle de estoque e dispensação.

**Rota:** `/camara-tecnica/farmacia-judicial`  
**Acesso:** GESTOR, FARMACIA_ADMIN

---

## 📂 Estrutura

```
farmacia-judicial/
├── page.js              # Página principal
├── actions.js           # Server Actions
├── components/
│   ├── ModalMedicamento.js
│   ├── ModalDispensacao.js
│   └── MedicamentoCard.js
└── views/
    ├── DashboardView.js
    ├── MedicamentosView.js
    ├── EstoqueView.js
    ├── DispensacoesView.js
    └── DemandasView.js
```

---

## 🎯 Funcionalidades

### 1. Dashboard
- Total de medicamentos cadastrados
- Itens com estoque baixo (< 10)
- Dispensações do mês
- Demandas judiciais ativas
- Custo total mensal

### 2. Medicamentos
- Cadastro de medicamentos
- Nome comercial e genérico
- Princípio ativo
- Dosagem, apresentação
- Fabricante
- Preço unitário
- Status (ativo/inativo)

### 3. Estoque
- Quantidade atual
- Lote, validade
- Entrada/Saída
- Histórico de movimentações
- Alertas de vencimento
- Alertas de estoque mínimo

### 4. Dispensações
- Registrar entrega ao paciente
- CPF do paciente
- Medicamento e quantidade
- Data da dispensação
- Responsável pela entrega
- Número do processo judicial
- Assinatura do paciente

### 5. Demandas Judiciais
- Número do processo
- Paciente (CPF)
- Medicamento solicitado
- Quantidade autorizada
- Período de fornecimento
- Status (ativo/suspenso/encerrado)
- Custo estimado mensal

---

## 📊 Tabelas do Banco

```prisma
model FarmaciaMedicamento {
  id                String @id
  nomeComercial     String
  nomeGenerico      String
  principioAtivo    String
  dosagem           String
  apresentacao      String
  fabricante        String?
  precoUnitario     Decimal
  ativo             Boolean
  estoque           FarmaciaEstoque[]
  dispensacoes      FarmaciaDispensacao[]
}

model FarmaciaEstoque {
  id             String @id
  medicamentoId  String
  lote           String
  quantidade     Int
  dataValidade   DateTime
  dataEntrada    DateTime
  fornecedor     String?
}

model FarmaciaDispensacao {
  id                String @id
  medicamentoId     String
  pacienteCpf       String
  quantidade        Int
  dataDispensacao   DateTime
  responsavelCpf    String
  processoJudicial  String
  observacoes       String?
}

model FarmaciaDemandaJudicial {
  id                 String @id
  numeroProcesso     String
  pacienteCpf        String
  medicamentoId      String
  quantidadeMensal   Int
  dataInicio         DateTime
  dataFim            DateTime?
  status             String
  custoMensalEstimado Decimal
}
```

---

## 🔄 Fluxo: Dispensar Medicamento

```
1. Paciente chega com ordem judicial
   ↓
2. Operador acessa /farmacia-judicial?tab=DISPENSACOES
   ↓
3. Clica "Nova Dispensação"
   ↓
4. Preenche:
   - CPF do paciente (busca automática)
   - Número do processo judicial
   - Medicamento (select do estoque)
   - Quantidade
   - Observações
   ↓
5. Sistema verifica:
   - Existe demanda judicial ativa?
   - Tem estoque disponível?
   - Quantidade autorizada não excedida?
   ↓
6. createDispensacaoAction(formData)
   ↓
7. Insere dispensação
   ↓
8. Deduz do estoque
   ↓
9. Registra custo na demanda
   ↓
10. Paciente assina recibo
```

---

## 🔔 Alertas Automáticos

### Estoque Baixo
```javascript
// Medicamentos com quantidade < 10
const estoquesBaixos = await prisma.farmaciaEstoque.findMany({
  where: { quantidade: { lt: 10 } },
  include: { medicamento: true }
});
```

### Próximos ao Vencimento
```javascript
// Lotes vencendo em 30 dias
const dataLimite = new Date();
dataLimite.setDate(dataLimite.getDate() + 30);

const vencendo = await prisma.farmaciaEstoque.findMany({
  where: {
    dataValidade: {
      lte: dataLimite,
      gte: new Date()
    }
  }
});
```

---

## 📊 Relatórios

### 1. Custo Mensal
```sql
SELECT 
  SUM(d.quantidade * m.precoUnitario) as custoTotal
FROM farmacia_dispensacoes d
JOIN farmacia_medicamentos m ON d.medicamento_id = m.id
WHERE d.data_dispensacao >= '2026-09-01'
  AND d.data_dispensacao < '2026-10-01';
```

### 2. Top Medicamentos Dispensados
```sql
SELECT 
  m.nome_comercial,
  COUNT(d.id) as total_dispensacoes,
  SUM(d.quantidade) as quantidade_total
FROM farmacia_dispensacoes d
JOIN farmacia_medicamentos m ON d.medicamento_id = m.id
GROUP BY m.id, m.nome_comercial
ORDER BY total_dispensacoes DESC
LIMIT 10;
```

---

## 🔐 Segurança

**Informações Sensíveis:**
- ✅ CPF do paciente (apenas FARMACIA_ADMIN)
- ✅ Número de processo judicial
- ✅ Custos de medicamentos
- ❌ Dados médicos (não armazenados aqui)

**Auditoria:**
- Toda dispensação registra responsável (CPF)
- Histórico completo de movimentações
- Logs não podem ser deletados

---

**Resumo:** Sistema completo de farmácia judicial com cadastro de medicamentos, controle de estoque (lote/validade), dispensação vinculada a processos judiciais, gestão de demandas ativas e relatórios de custos mensais.
