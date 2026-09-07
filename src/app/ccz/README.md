# 📁 `/src/app/ccz` - Módulo CCZ (Centro de Controle de Zoonoses)

Sistema de gestão de animais, tutores, procedimentos veterinários, notificações de zoonoses e controle de esporotricose.

**Rota:** `/ccz`  
**Acesso:** GESTOR, CCZ_ADMIN

---

## 📂 Estrutura

```
ccz/
├── page.js              # Página principal com tabs
├── page.module.css
├── actions.js           # Server Actions
├── components/          # Componentes específicos
│   ├── Modals/         # Modais de CRUD
│   ├── AnimalCard.js
│   ├── TutorCard.js
│   └── ProcedimentoCard.js
└── views/              # Views do módulo
    ├── DashboardView.js
    ├── AnimaisView.js
    ├── TutoresView.js
    ├── ProcedimentosView.js
    ├── ZoonosesView.js
    ├── DenunciasView.js
    └── EsporotricoseView.js
```

---

## 🎯 Funcionalidades Principais

### 1. Dashboard
- Total de animais cadastrados
- Animais em tratamento
- Casos de zoonoses ativos
- Casos de esporotricose
- Denúncias pendentes
- Procedimentos do mês

### 2. Animais
- Cadastro de animais (cães, gatos)
- Foto do animal
- Dados: espécie, sexo, porte, idade
- Histórico de saúde
- Castração, doenças crônicas
- Vínculo com tutor

### 3. Tutores
- Cadastro de tutores (donos)
- Vinculado a Pessoa (CPF)
- RG, profissão, telefones
- Endereço e ponto de referência
- Lista de animais do tutor

### 4. Procedimentos Veterinários
- Vacinação
- Castração
- Consultas
- Exames
- Cirurgias
- Tratamentos
- Vinculado a animal e veterinário

### 5. Notificações de Zoonoses
- Registro de doenças (raiva, leishmaniose, leptospirose)
- Grau de risco
- Período de monitoramento
- Responsável pelo acompanhamento
- Formas de contaminação

### 6. Denúncias de Cães Agressivos
- Registro de denúncias
- Localização do animal
- Descrição e relato
- Risco causado
- Vínculo com animal (se identificado)

### 7. Esporotricose
- Formulário completo de visita
- Lesões, tratamento, medicamentos
- Isolamento domiciliar
- Uso de EPIs
- Outros animais na residência
- Pessoas com lesões
- Encaminhamentos (CCZ, MP, etc)

---

## 📊 Tabelas do Banco

```prisma
model Tutor {
  pessoaCpf  String @id
  rg         String?
  profissao  String?
  telefoneSecundario String?
  pontoReferencia    String?
  animais    Animal[]
}

model Animal {
  id                String @id
  pessoaCpf         String?  // Tutor
  fotoUrl           String?
  nome              String?
  especie           String   // Cão, Gato
  sexo              String
  porte             String
  castrado          String
  doencaCronica     String
  procedimentos     CadastroProcedimento[]
  zoonoses          CadastroZoonoses[]
  denuncias         DenunciaCaoAgressivo[]
  esporotricose     Esporotricose[]
}

model CadastroProcedimento {
  id               String @id
  animalId         String
  tipo             String  // Vacinação, Castração, etc
  dataProcedimento DateTime
  veterinario      String?
  status           String
}

model CadastroZoonoses {
  id                String @id
  animalId          String
  doenca            String
  dataIdentificacao DateTime
  grauRisco         String
  periodoMonitoramento String
}

model DenunciaCaoAgressivo {
  id           String @id
  dataDenuncia DateTime
  localizacao  String
  descricaoCao String
  relato       String
  animalId     String?
}

model Esporotricose {
  id                    String @id
  animalId              String?
  numeroProtocolo       String?
  dataVisita            DateTime
  fiscalResponsavel     String?
  apresentaLesoes       String
  emTratamentoContinuo  String
  medicamentosPrescritos String?
  // ... muitos outros campos
}
```

---

## 🔄 Fluxo: Cadastrar Animal

```
1. Acesse /ccz?tab=ANIMAIS
   ↓
2. Clique "Novo Animal"
   ↓
3. Preencha:
   - ID (gerado ou manual)
   - Nome
   - Espécie (Cão/Gato)
   - Sexo (M/F)
   - Porte (Pequeno/Médio/Grande)
   - Idade
   - Castrado? (Sim/Não)
   - Doença crônica? (Sim/Não)
   - CPF do tutor (busca automática)
   - Foto (upload opcional)
   ↓
4. createAnimalAction(formData)
   ↓
5. Salva no banco
   ↓
6. Se tutor não existe → cria tutor
   ↓
7. Vincula animal ao tutor
```

---

## 🔗 Arquivos Relacionados

| Arquivo | Relação |
|---------|---------|
| `prisma/schema.prisma` | Tabelas ccz_* |
| `src/middleware.js` | Controla acesso CCZ_ADMIN |
| [`components/README.md`](./components/README.md) | Componentes |
| [`views/README.md`](./views/README.md) | Views detalhadas |

---

**Resumo:** Módulo completo de controle de zoonoses, gestão de animais e tutores, procedimentos veterinários, notificações de doenças, denúncias e controle especializado de esporotricose.
