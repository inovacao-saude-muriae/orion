# 📁 `/src/app/camara-tecnica/processos` - Processos Administrativos

Sistema de gestão de processos administrativos, pareceres técnicos, prazos e documentos.

**Rota:** `/camara-tecnica/processos`  
**Acesso:** GESTOR, PROCESSO_ADMIN

---

## 📂 Estrutura

```
processos/
├── page.js
├── actions.js
├── components/
│   ├── ModalProcesso.js
│   ├── ModalAndamento.js
│   ├── ModalParecer.js
│   └── ProcessoCard.js
└── views/
    ├── DashboardView.js
    ├── ProcessosView.js
    ├── AndamentosView.js
    ├── ParecersView.js
    └── DocumentosView.js
```

---

## 🎯 Funcionalidades

### 1. Dashboard
- Total de processos ativos
- Processos com prazo vencendo (< 7 dias)
- Pareceres pendentes
- Processos arquivados no mês

### 2. Processos
- Cadastro de processos
- Número/Ano
- Assunto/Objeto
- Requerente
- Data de entrada
- Prazo para resposta
- Status (Em análise, Aguardando, Concluído)
- Prioridade (Normal, Urgente)

### 3. Andamentos
- Registrar movimentação
- Tipo (Recebido, Despacho, Encaminhamento)
- Data
- Responsável
- Descrição
- Próximos passos

### 4. Pareceres Técnicos
- Emitir parecer
- Área técnica (Saúde, Jurídico, Financeiro)
- Favorável/Desfavorável
- Fundamentação
- Responsável técnico
- Data de emissão

### 5. Documentos
- Upload de anexos
- PDF, DOCX, imagens
- Tipo (Requerimento, Ofício, Laudo, etc)
- Data de juntada
- Download

---

## 📊 Tabelas do Banco

```prisma
model ProcessoAdministrativo {
  id              String @id
  numeroProcesso  String
  ano             String
  assunto         String
  requerenteCpf   String?
  dataEntrada     DateTime
  prazoResposta   DateTime?
  status          String
  prioridade      String
  andamentos      ProcessoAndamento[]
  pareceres       ProcessoParecer[]
  documentos      ProcessoDocumento[]
}

model ProcessoAndamento {
  id             String @id
  processoId     String
  tipo           String
  dataAndamento  DateTime
  responsavelCpf String
  descricao      String
  proximoPasso   String?
}

model ProcessoParecer {
  id              String @id
  processoId      String
  areaTecnica     String
  favoravel       Boolean
  fundamentacao   String
  responsavelCpf  String
  dataEmissao     DateTime
}

model ProcessoDocumento {
  id             String @id
  processoId     String
  tipoDocumento  String
  nomeArquivo    String
  urlArquivo     String
  dataJuntada    DateTime
  responsavelCpf String
}
```

---

## 🔄 Fluxo: Novo Processo

```
1. Protocolo recebe documento
   ↓
2. PROCESSO_ADMIN acessa /processos
   ↓
3. Clica "Novo Processo"
   ↓
4. Preenche:
   - Número/Ano (ex: 001/2026)
   - Assunto
   - Requerente (CPF opcional)
   - Data de entrada
   - Prazo (dias úteis)
   - Prioridade
   ↓
5. Faz upload de documentos iniciais
   ↓
6. createProcessoAction(formData)
   ↓
7. Processo criado
   ↓
8. Sistema calcula prazo automaticamente
   ↓
9. Encaminha para área técnica
   ↓
10. Área emite parecer
   ↓
11. Registra andamentos
   ↓
12. Despacho final
   ↓
13. Arquivamento
```

---

## 🔔 Alertas de Prazo

```javascript
// Processos vencendo em 7 dias
const hoje = new Date();
const dataLimite = new Date();
dataLimite.setDate(dataLimite.getDate() + 7);

const processosVencendo = await prisma.processoAdministrativo.findMany({
  where: {
    prazoResposta: {
      gte: hoje,
      lte: dataLimite
    },
    status: { not: 'Concluído' }
  }
});

// Processos com prazo vencido
const processosVencidos = await prisma.processoAdministrativo.findMany({
  where: {
    prazoResposta: { lt: hoje },
    status: { not: 'Concluído' }
  }
});
```

---

## 📊 Relatórios

### 1. Tempo Médio de Conclusão
```sql
SELECT 
  AVG(DATEDIFF(data_conclusao, data_entrada)) as dias_medios
FROM processos_administrativos
WHERE status = 'Concluído'
  AND data_conclusao >= '2026-01-01';
```

### 2. Processos por Status
```sql
SELECT 
  status,
  COUNT(*) as total,
  AVG(DATEDIFF(NOW(), data_entrada)) as dias_tramitando
FROM processos_administrativos
WHERE status != 'Concluído'
GROUP BY status;
```

---

## 🔐 Controle de Acesso

| Funcionalidade | GESTOR | PROCESSO_ADMIN |
|----------------|--------|----------------|
| Ver processos | ✅ | ✅ |
| Criar processo | ✅ | ✅ |
| Registrar andamento | ✅ | ✅ |
| Emitir parecer | ✅ | ✅ |
| Upload documentos | ✅ | ✅ |
| Arquivar | ✅ | ✅ |
| Deletar | ✅ | ❌ |

---

**Resumo:** Sistema de gestão de processos administrativos com controle de prazos, andamentos, pareceres técnicos, upload de documentos, alertas de vencimento e relatórios gerenciais.
