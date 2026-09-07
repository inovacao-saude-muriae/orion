# 📁 `/src/app/junta-reguladora` - Módulo Junta Reguladora

Sistema de convocação e gestão de reuniões da Junta Reguladora (4 áreas: CAEE, Educação, Saúde, Assistência Social).

**Rota:** `/junta-reguladora`  
**Acesso:** GESTOR, JUNTA_ADMIN, JUNTA_CAEE, JUNTA_EDUCACAO, JUNTA_SAUDE, JUNTA_ASSISTENCIA

---

## 📂 Estrutura

```
junta-reguladora/
├── page.js              # Página principal
├── page.module.css
├── actions.js           # Server Actions
├── components/
│   ├── ModalConvocar.js
│   ├── ModalAta.js
│   └── ReuniaoCard.js
└── views/
    ├── DashboardView.js
    ├── ReunioesView.js
    ├── ConvocacoesView.js
    └── AtasView.js
```

---

## 🎯 Funcionalidades

### 1. Dashboard
- Total de reuniões realizadas
- Próximas reuniões agendadas
- Atas pendentes
- Participação por área

### 2. Reuniões
- Criar nova reunião
- Agendar data/hora
- Definir pauta
- Convocar membros
- Marcar presença
- Registrar ata

### 3. Convocações
- Enviar convocação aos membros
- Status: Enviado/Confirmado/Ausente
- Lista de convocados por reunião
- Histórico de participação

### 4. Atas
- Registro de decisões
- Assinaturas digitais
- Export para PDF
- Arquivo histórico

---

## 📊 Tabelas do Banco

```prisma
model JuntaReuniao {
  id              Int
  dataReuniao     DateTime
  horaInicio      String
  horaFim         String?
  local           String
  pauta           String
  status          String  // Agendada, Realizada, Cancelada
  ataGerada       Boolean
  convocacoes     JuntaConvocacao[]
  ata             JuntaAta?
}

model JuntaConvocacao {
  id            Int
  reuniaoId     Int
  membroCpf     String
  area          String  // CAEE, Educação, Saúde, Assistência
  enviado       Boolean
  confirmado    Boolean
  presente      Boolean
}

model JuntaAta {
  id                Int
  reuniaoId         Int
  conteudo          String
  decisoes          String
  dataRegistro      DateTime
  responsavelCpf    String
}
```

---

## 🔄 Fluxo: Convocar Reunião

```
1. JUNTA_ADMIN cria reunião
   ↓
2. Define data, hora, local, pauta
   ↓
3. Seleciona membros por área:
   - JUNTA_CAEE
   - JUNTA_EDUCACAO
   - JUNTA_SAUDE
   - JUNTA_ASSISTENCIA
   ↓
4. Sistema envia convocações
   ↓
5. Membros confirmam presença
   ↓
6. Reunião realizada
   ↓
7. Secretário registra ata
   ↓
8. Membros assinam digitalmente
```

---

## 🔐 Controle de Acesso

| Funcionalidade | GESTOR | JUNTA_ADMIN | JUNTA_* |
|----------------|--------|-------------|---------|
| Ver reuniões | ✅ | ✅ | ✅ |
| Criar reunião | ✅ | ✅ | ❌ |
| Convocar | ✅ | ✅ | ❌ |
| Registrar ata | ✅ | ✅ | ⚠️ Secretário |
| Confirmar presença | ✅ | ✅ | ✅ |
| Assinar ata | ✅ | ✅ | ✅ |

---

**Resumo:** Módulo de gestão da Junta Reguladora com criação de reuniões, convocação de membros das 4 áreas (CAEE, Educação, Saúde, Assistência), controle de presença e registro de atas com assinaturas digitais.
