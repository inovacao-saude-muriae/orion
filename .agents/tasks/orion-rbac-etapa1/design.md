# Design Técnico — Orion RBAC Etapa 1 (Fundação de Permissões Configuráveis)

> **Revisão 3** — revisado contra o segundo `design-review.json`/`design-review.md`. As respostas a cada finding estão na seção 17 (Revisão 3). Mudanças desta revisão: (a) **escritas de `Pessoa` na Regulação** (`createPessoa`/`updatePessoa`/`deletePessoa`, hoje sem guarda) passam a exigir a guarda "pessoas" — buraco simétrico ao da farmácia, agora fechado (§6.1/§6.3) [Finding 1 HIGH]; (b) **fecha o bypass do recorte por sub-serviço da Junta** via nome livre + criação on-the-fly: nome não-mapeado em **escrita** exige `requireAdminModulo(JUNTA)`, e `servicoJuntaDoNome` normaliza acento (§2.6) [Findings 2, 4]; (c) **`getEspecialidadesPorServico("")` deixa de vazar** especialidades de sub-serviços não vinculados ao OPERADOR (§2.6) [Finding 3]; (d) **UI de catálogo** (médicos/UBS/procedimentos) escondida para OPERADOR via flag do provider (§6.2) [Finding 5]; (e) correções de precisão: proxy sem afirmação de "runtime Node.js" (§4.1), `/api/me` amplia o `select` para trazer `acessos` (§7.2), e preservação explícita do early-return de rotas públicas no proxy (§4.2) [Findings 6, 7, 8].
>
> **Revisão 2 (anterior)** tratou: diretório de docs do Next existe e foi lido; breaking change `middleware.js`→`proxy.js`; ponte `Servico`↔`ServicoJunta` via códigos de subTab; escritas de farmácia desprotegidas passam a exigir ADMIN.

## Visão geral

Esta etapa substitui o controle de acesso atual — baseado em um enum `Role` fixo (um papel por usuário) com a lógica de autorização duplicada em três lugares (`src/middleware.js`, `src/components/Sidebar.js` e `requireRole()` em `src/lib/auth.js`) — por um modelo de permissões **persistido em banco**, com granularidade por **módulo** e por **sub-serviço da Junta**, suportando **múltiplos vínculos por usuário**. Toda a decisão de autorização passa a nascer de uma **única fonte de verdade**: o novo módulo `src/lib/permissions.js`.

A estratégia de arquitetura é deliberadamente conservadora para não quebrar as páginas existentes (todas client components que leem a aba por `searchParams`): o **middleware/proxy cuida só de autenticação**, e a **autorização de módulo é aplicada por um Server Component de guarda** inserido em cada rota de módulo via um novo `layout.js` por módulo. O layout decide, no servidor, se o usuário tem vínculo; se não tiver, renderiza o componente `AcessoNegadoModulo` **no lugar do conteúdo**, mantendo Header e Sidebar visíveis. A Sidebar deixa de filtrar por papel e passa a exibir todos os módulos.

A verificação de permissão **consulta o banco por request** (com memoização por render de Server Component via `React.cache`), e não embute acessos no JWT — decisão justificada abaixo (§3) pela chegada da tela de edição na Etapa 2. Esse padrão **é exatamente o recomendado pelo guia oficial** de autenticação do Next 16 (ver abaixo): uma "Data Access Layer (DAL)" com `verifySession()`/`getUser()` memoizados por `cache()`, mais a nota de que o proxy/middleware não deve ser a única barreira — a verificação deve ficar o mais perto possível da fonte de dados.

**Guias do Next consultados (reconfirmação do AGENTS.md).** O `AGENTS.md` do workspace instrui ler `node_modules/next/dist/docs/`. Diferente da revisão anterior, nesta instalação o diretório **existe** (`node_modules/next/dist/docs/` presente — regenerado pelo `next dev`, como o próprio AGENTS.md descreve). Foram lidos e incorporados a este design:

- `01-app/02-guides/authentication.md` — padrão DAL + `cache()` + `import 'server-only'`; `verifySession`/`getUser`; nota explícita "Proxy não deve ser a única linha de defesa; faça a checagem o mais perto possível da fonte de dados"; e a observação de que **Client Components não podem importar a DAL** (precisam receber os dados por props/context).
- `01-app/03-api-reference/03-file-conventions/middleware.md` e `.../proxy.md` — **`middleware.js` está deprecado no Next 16 e renomeado para `proxy.js`**; a função exportada passa a chamar-se `proxy` (ou default export); API e `config.matcher` idênticos. Há codemod `npx @next/codemod@canary middleware-to-proxy .`. **Importante** (Finding 6): o `proxy.md` **não** garante runtime Node.js — ao contrário, descreve o proxy como potencialmente deployado em CDN e desaconselha depender de módulos compartilhados/globais; por isso o proxy continua fazendo **apenas** `jwtVerify` com `jose` (edge-compatible), sem Prisma nem globais.
- `01-app/03-api-reference/03-file-conventions/layout.md` e `.../route.md` — convenções de layout (Server Component por padrão, recebe `children`) e route handlers.
- `01-app/02-guides/server-actions.md` — padrão `"use server"`, validação/autorização dentro da action.

Stack travada por este design (não reabrir na implementação): **Next.js 16.3 (App Router, Server Components, Server Actions)**, **Prisma 7.9 com driver adapter `@prisma/adapter-pg` sobre PostgreSQL** (container `orion_db`), **jose** para JWT, **bcryptjs** para senha. JavaScript puro (sem TypeScript), textos e comentários em português. Versões confirmadas em `package.json` e nos `node_modules`.

---

## 1. Modelagem Prisma

### 1.1 Decisão: enums Prisma + tabela `UserAcesso`

`modulo`, `nivel` e `servicoJunta` ganham **enums Prisma** (não `String` livre). Motivo: o domínio é pequeno, fechado e estável (glossário dos requisitos); enums dão validação no banco, autocomplete no client Prisma e alinham com o padrão já existente no schema (`enum Role`). O custo de evoluir um enum no Postgres (ex.: adicionar um sub-serviço futuro) é aceitável e some diante do ganho de integridade.

### 1.2 Decisão: GESTOR via `role = GESTOR` (atalho), sem flag nova

Mantemos a forma canônica de GESTOR como `User.role === "GESTOR"`, **não** introduzimos `isGestor`. Justificativa:

- O enum `Role` **permanece** no schema por exigência de FR-1.4 e é o dado de origem da migração; `GESTOR` já existe lá.
- A tela de permissões da Etapa 2 vai editar `UserAcesso`, **nunca** `User.role`. Como GESTOR deriva de `role` e não de `UserAcesso`, ele fica naturalmente fora do alcance da edição de vínculos — satisfazendo "não editável pela interface de permissões" (FR-1.5) sem campo extra.
- Evita um segundo lugar (flag) que poderia divergir de `role`. Uma única coluna canônica reduz inconsistência.

Consequência registrada: promover/rebaixar um GESTOR continua sendo uma operação sobre `User.role` (fora do escopo desta etapa e da tela da Etapa 2). Isso é desejado — é uma operação sensível que não deve estar na mesma tela de concessão de módulos.

### 1.3 Trecho de schema proposto

Adicionar ao final de `prisma/schema.prisma` (o `enum Role` e o `model User` existentes **permanecem intactos**):

```prisma
// ── CONTROLE DE ACESSO CONFIGURÁVEL (RBAC Etapa 1) ───────────────────────
enum ModuloAcesso {
  REGULACAO
  FARMACIA
  PROCESSOS
  JUNTA
  CCZ
}

enum NivelAcesso {
  ADMIN
  OPERADOR
}

enum ServicoJunta {
  CAEE
  APAE
  AMBULATORIO
  ESPECIALIDADES
}

// Vínculo de acesso: (userCpf, modulo, nivel, servicoJunta?).
// Um usuário pode ter N vínculos. GESTOR NÃO depende desta tabela.
model UserAcesso {
  id           Int           @id @default(autoincrement())
  userCpf      String        @map("user_cpf") @db.VarChar(11)
  modulo       ModuloAcesso
  nivel        NivelAcesso
  servicoJunta ServicoJunta? @map("servico_junta") // só quando modulo = JUNTA
  createdAt    DateTime      @default(now()) @map("created_at") @db.Timestamptz(6)

  user User @relation(fields: [userCpf], references: [cpf], onDelete: Cascade, map: "fk_user_acesso_user")

  // Impede vínculos duplicados idênticos (chave da idempotência do backfill).
  // Postgres trata NULLs como distintos em UNIQUE; portanto duas linhas
  // {JUNTA, OPERADOR, NULL} não colidem. O backfill cobre esse caso (ver 9.5).
  @@unique([userCpf, modulo, nivel, servicoJunta], map: "idx_user_acesso_unico")
  @@index([userCpf], map: "idx_user_acesso_cpf")
  @@map("user_acessos")
}
```

E a relação inversa no `model User` (única alteração no modelo existente):

```prisma
model User {
  // ...campos atuais inalterados... (cpf PK @db.VarChar(11), nome, role, cargo, ativo, sessions ...)
  sessions Session[]
  acessos  UserAcesso[]   // ← adicionar esta linha

  @@map("users")
}
```

**Invariante FR-1.3 (`servicoJunta` só quando `modulo = JUNTA`).** O enforcement fica em **duas camadas**, por ordem de confiabilidade:

1. **Camada de escrita (dona do invariante): a futura função `criarAcesso()` / o script de backfill.** Toda gravação de `UserAcesso` passa por uma função única que recusa `servicoJunta != null` quando `modulo != JUNTA` e normaliza para `null` quando `modulo = JUNTA` sem serviço. É a camada "dona" porque é o único ponto de entrada de dados nesta etapa (o CRUD da Etapa 2 reusará a mesma função — NFR-5).
2. **Camada de banco (defesa em profundidade):** um `CHECK` cross-field não é expresso no schema Prisma; para esta etapa **não** adicionamos o CHECK (manteria o schema divergente do Prisma e complicaria o `db push`). Decisão: **camada de aplicação é a dona**; o banco não valida esse cross-field nesta etapa. Registrado como item de robustez para a Etapa 2 (quando houver UI de escrita, avaliar um CHECK via migração dedicada).

---

## 2. Fonte única de verdade: `src/lib/permissions.js`

Novo arquivo. Exporta as constantes de domínio e as funções de verificação. Começa com `import "server-only";` (padrão da DAL do guia do Next). Todas as funções aceitam **ou** um objeto `user` já carregado (com `cpf`, `role` e, idealmente, `acessos`) **ou** uma `string` CPF; quando recebem só o CPF, carregam os vínculos do banco. A normalização do argumento é interna.

### 2.1 Constantes de domínio (reusadas por páginas, actions, backfill)

```js
export const MODULOS = {
  REGULACAO: "REGULACAO",
  FARMACIA: "FARMACIA",
  PROCESSOS: "PROCESSOS",
  JUNTA: "JUNTA",
  CCZ: "CCZ",
};

export const NIVEIS = { ADMIN: "ADMIN", OPERADOR: "OPERADOR" };

export const SERVICOS_JUNTA = {
  CAEE: "CAEE",
  APAE: "APAE",
  AMBULATORIO: "AMBULATORIO",
  ESPECIALIDADES: "ESPECIALIDADES",
};
```

### 2.2 Carregamento dos vínculos (consulta ao banco, memoizada por render)

```js
import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

// Carrega {user, acessos} a partir da sessão (cookie). Memoizado por render de
// Server Component via React.cache: várias checagens na mesma renderização = 1 query.
// (Ver §3/§6 sobre o escopo da memoização em API routes/actions.)
export const carregarContextoAcesso = cache(async () => {
  const token = (await cookies()).get("session_token")?.value;
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { token },
    include: { user: { include: { acessos: true } } }, // traz user COMPLETO (inclui nome, role, cargo)
  });

  if (
    !session?.user?.ativo ||
    !session.expiresAt ||
    new Date(session.expiresAt) <= new Date()
  ) {
    return null;
  }
  return { user: session.user, acessos: session.user.acessos };
});

// Variante por CPF explícito. Memoizada por render.
export const carregarAcessosPorCpf = cache(async (cpf) => {
  return prisma.userAcesso.findMany({ where: { userCpf: cpf } });
});
```

> **Contrato do `user` carregado (Finding 5).** O `include` acima **não usa `select` restritivo**: o `user` retornado traz todos os campos da tabela `users`, incluindo `nome`, `role`, `cargo` e `cpf`. Isso é obrigatório porque actions existentes consomem esses campos: `savePlanejamentoCidade` usa `user.nome` (gravado em `updatedBy`), e `ajustarEstoque`/`registrarDispensacao` usam `session?.nome`/`usuario?.nome`. As guardas (§2.4) retornam esse mesmo `user` completo. **Proibido** introduzir um `select` que remova `nome`/`role` nessas consultas — quebraria `updatedBy` e a checagem de GESTOR.

### 2.3 Assinaturas exatas

```js
// Todas são async porque podem precisar consultar o banco.
// `userOuCpf` aceita: string CPF | { cpf, role, acessos? }.

export async function usuarioEhGestor(userOuCpf): Promise<boolean>
// true sse role === "GESTOR". Não consulta UserAcesso.

export async function usuarioTemAcessoModulo(userOuCpf, modulo): Promise<boolean>
// GESTOR → true sempre. Senão: existe vínculo com esse `modulo`
// (qualquer nivel, qualquer servicoJunta).

export async function usuarioEhAdminModulo(userOuCpf, modulo): Promise<boolean>
// GESTOR → true sempre. Senão: existe vínculo {modulo, nivel: ADMIN}.

export async function usuarioTemAcessoServicoJunta(userOuCpf, servicoJunta): Promise<boolean>
// GESTOR → true. JUNTA/ADMIN → true (admin vê todos os serviços).
// JUNTA/OPERADOR → true sse existir vínculo {JUNTA, OPERADOR, servicoJunta}.

export async function usuarioEhAdminDeAlgumModulo(userOuCpf): Promise<boolean>
// GESTOR → true. Senão: existe algum vínculo {*, nivel: ADMIN}.
```

Regras de GESTOR (FR-2.2): `usuarioEhGestor` curto-circuita todas as demais — se `role === "GESTOR"`, retornam `true` sem tocar em `UserAcesso`.

Regra de admin da Junta sobre serviços (coerente com FR-3.3): um `JUNTA/ADMIN` acessa qualquer sub-serviço; por isso `usuarioTemAcessoServicoJunta` retorna `true` para ele independentemente de haver vínculo com `servicoJunta` preenchido.

### 2.4 Helpers de "guarda" para server-side (substituem/estendem `requireRole`)

Em `src/lib/auth.js` (reusando os helpers de `permissions.js`), expomos guardas que lançam erro `{status}` no padrão já usado por `requireRole`. **Todas retornam o `user` completo da sessão** (inclui `nome`, `role`, `cargo`, `cpf`, `acessos`), para compatibilidade com actions que usam `user.nome` (Finding 5):

```js
// Lança {status:401} se não autenticado; {status:403} se sem acesso.
// Retorna o `user` completo (com nome/role/cargo/cpf/acessos) em caso de sucesso.
export async function requireAcessoModulo(modulo): Promise<User>
export async function requireAdminModulo(modulo): Promise<User>
export async function requireGestor(): Promise<User>
export async function requireAcessoServicoJunta(servicoJunta): Promise<User>
export async function requireAdminDeAlgumModulo(): Promise<User> // GESTOR ∨ admin de qualquer módulo
```

Cada guarda: valida a sessão (como `requireRole` faz hoje — consulta `Session` + `expiresAt`), carrega os vínculos, aplica a função de `permissions.js` correspondente, lança `{status:401|403}` ou retorna `user`.

### 2.5 Quem consome esta camada

| Consumidor | Como usa |
|---|---|
| `proxy.js` (ex-`middleware.js`) | **Não** usa `permissions.js` (não acessa Prisma no fluxo de proxy). Só autentica (ver §4). |
| `layout.js` de cada módulo (Server Component) | `carregarContextoAcesso()` + `usuarioTemAcessoModulo(...)`; renderiza conteúdo ou `AcessoNegadoModulo`. |
| Páginas de módulo (client) | Recebem flags de permissão calculadas no layout (via Context Provider montado no layout). **Client Components não importam `permissions.js`** (regra do guia do Next para a DAL). Ex.: Financeiro recebe `podeEditarFinanceiro`; Junta recebe a lista de sub-serviços permitidos (§2.6/§6). |
| Server actions / API routes | `requireAcessoModulo` / `requireAdminModulo` / `requireGestor` / `requireAcessoServicoJunta` / `requireAdminDeAlgumModulo`. |
| Sidebar | **Não** consome autorização (passa a mostrar tudo). Deixa de usar `/api/me` para esconder itens. |

Nenhuma lógica de autorização nova pode existir fora de `permissions.js`. Os mapas `PERMISSOES_ROTAS`, `VISIBILIDADE_MODULO` e `VISIBILIDADE_SUBITEM` são **removidos**.

### 2.6 Ponte `Servico` (banco) ↔ `ServicoJunta` (enum) — Findings 3 e 4

**Problema verificado.** No schema, os serviços da Junta são o `model Servico` (`junta_servicos`) com `nome String @unique` **livre**; não há enum nem coluna ligando um `Servico` a `CAEE/APAE/...`. As server actions da Junta (`src/app/junta-reguladora/actions.js`, verificado) **operam por nome de serviço** (`servicoNome`), não por `servicoId` tipado, e **criam serviços on-the-fly** quando o nome não existe. A página (`src/app/junta-reguladora/page.js`, verificado) é client e seleciona o serviço por `subTab` da URL através do mapa `MAPA_SERVICOS`:

```js
// src/app/junta-reguladora/page.js (existente)
const MAPA_SERVICOS = {
  CAEE: "CAEE", APAE: "APAE", AMBULATORIO: "Ambulatório",
  EDUCACAO: "Educação", SOCIAL: "Social",
  ESPECIALIDADES: "Centro de Especialidades", REABILITACAO: "Centro de Reabilitação",
};
```

Observação importante: a Sidebar expõe hoje **apenas 4 sub-abas** da Junta (`CAEE`, `APAE`, `AMBULATORIO`, `ESPECIALIDADES`) — exatamente os 4 do enum. Os códigos extras (`EDUCACAO`, `SOCIAL`, `REABILITACAO`) existem no `MAPA_SERVICOS` mas **não têm entrada no menu** nesta etapa; ficam fora do controle de sub-serviço (ver tratamento abaixo).

**Decisão: a chave de autorização por sub-serviço é o CÓDIGO de subTab (constante de UI estável), NÃO o `servicoId` nem o `nome` livre.** Justificativa: o `subTab` é um identificador fixo e já é o que a navegação usa; o `nome` do `Servico` é livre e mutável (até acentuação varia: "Ambulatório"), então não serve como chave de autorização confiável. Mapear por `servicoId` exigiria uma coluna nova e popular corretamente serviços criados on-the-fly — frágil. O `subTab` casa 1:1 com o enum `ServicoJunta`.

Implementação concreta da ponte, em `permissions.js`:

```js
// Converte o código de subTab da UI da Junta para o enum ServicoJunta.
// Só os 4 sub-serviços controlados têm entrada; os demais retornam null
// (= não controlado por sub-serviço nesta etapa).
export const SUBTAB_PARA_SERVICO_JUNTA = {
  CAEE: SERVICOS_JUNTA.CAEE,
  APAE: SERVICOS_JUNTA.APAE,
  AMBULATORIO: SERVICOS_JUNTA.AMBULATORIO,
  ESPECIALIDADES: SERVICOS_JUNTA.ESPECIALIDADES,
};

export function servicoJuntaDoSubTab(subTab) {
  return SUBTAB_PARA_SERVICO_JUNTA[String(subTab || "").toUpperCase()] || null;
}
```

**Enforcement de UI por aba (fail-closed).** O `layout.js` da Junta (Server Component) calcula, no servidor, a lista de sub-serviços permitidos e a injeta via Context Provider client (mesmo padrão do Financeiro, §6.2):

```js
// no layout da Junta (Server Component)
const ctx = await carregarContextoAcesso();
const subServicosPermitidos = []; // lista de códigos de subTab liberados
for (const [subTab, enumServ] of Object.entries(SUBTAB_PARA_SERVICO_JUNTA)) {
  if (await usuarioTemAcessoServicoJunta(ctx.user, enumServ)) subServicosPermitidos.push(subTab);
}
// injeta subServicosPermitidos + ehAdminJunta via <JuntaPermProvider>
```

A página da Junta (`page.js`) consome `usePermissoesJunta()` e: (a) quando o `subTab` atual **não** está em `subServicosPermitidos`, renderiza `AcessoNegadoModulo` (ou um aviso inline) **no lugar do conteúdo do serviço** em vez de `AtendimentoServico`/`AgendaServico`; (b) o hook retorna default `{ subServicosPermitidos: [], ehAdminJunta: false }` sem provider (fail-closed). A entrada no módulo Junta já é garantida pelo layout (`usuarioTemAcessoModulo(JUNTA)`); este gate é o recorte por sub-serviço.

**Enforcement no servidor (não só UI).** As server actions da Junta que recebem `servicoNome` precisam validar o sub-serviço. Como elas recebem o **nome** (ex.: "Ambulatório") e não o código, adicionamos em `permissions.js` o inverso para traduzir nome→enum na borda da action:

```js
// Normaliza para lookup robusto a acento/caixa (Finding 4):
// "Ambulatório" -> "ambulatorio", "  CAEE " -> "caee".
function normalizarNomeServico(nome) {
  return String(nome || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove diacríticos
    .trim()
    .toLowerCase();
}

// Mapa nome-de-serviço (sem acento, lower) -> enum.
// Cobre os nomes que o MAPA_SERVICOS da página produz para os 4 controlados.
const NOME_SERVICO_PARA_ENUM = {
  "caee": SERVICOS_JUNTA.CAEE,
  "apae": SERVICOS_JUNTA.APAE,
  "ambulatorio": SERVICOS_JUNTA.AMBULATORIO,
  "centro de especialidades": SERVICOS_JUNTA.ESPECIALIDADES,
};
export function servicoJuntaDoNome(nome) {
  return NOME_SERVICO_PARA_ENUM[normalizarNomeServico(nome)] || null;
}
```

> **Premissa fixada e verificável (Finding 4):** as actions por serviço da Junta só devem ser chamadas com os nomes canônicos de `MAPA_SERVICOS` (`"CAEE"`, `"APAE"`, `"Ambulatório"`, `"Centro de Especialidades"`). A implementação **deve reler** `src/app/junta-reguladora/page.js` e confirmar que a página sempre envia esses nomes a partir do `subTab` ativo. A normalização por `NFD` acima torna o lookup resistente a acento/caixa; combinada com o endurecimento das escritas (abaixo), elimina o risco de o fallback por nome virar bypass do recorte.

**Inventário das actions da Junta e o nível exigido (FR-3.4 / AC-10)** — `src/app/junta-reguladora/actions.js` (verificado; nenhuma tem `requireRole` hoje):

| Action | Recebe serviço? | Guarda a aplicar |
|---|---|---|
| `buscarPessoaExistente` / `buscarPessoaPorCpfOuNome` / `buscarPessoaPorNomeOuCpf` | não | `requireAcessoModulo(JUNTA)` (leitura geral do módulo) |
| `cadastrarPacienteJunta` | não (cadastro geral) | `requireAdminModulo(JUNTA)` (cadastro de paciente é ato administrativo da Junta — FR-3.3; e cria `Servico` on-the-fly, então nunca liberar a OPERADOR) |
| `listarPacientesJunta` | não | `requireAcessoModulo(JUNTA)` |
| `getPacientesPorServico(servicoNome)` | **sim** (leitura) | `requireLeituraServicoJuntaPorNome(servicoNome)` |
| `registrarAtendimentoServico(data{servico/servicoNome})` | **sim** (escrita, cria serviço) | `requireEscritaServicoJuntaPorNome(nome)` |
| `getEspecialidadesPorServico(servicoNome)` | **sim** (leitura; nome vazio = TODOS) | ver tratamento de "nome vazio" abaixo (Finding 3) |
| `getProntuarioUnificado(termo)` | não (consulta por pessoa, agrega todos os serviços) | `requireAcessoModulo(JUNTA)` |
| `getAgendamentosDoMes/DoDia(servicoNome,...)` | **sim** (leitura) | `requireLeituraServicoJuntaPorNome(nome)` |
| `criarAgendamentoJunta(dados{servicoNome})` | **sim** (escrita) | `requireEscritaServicoJuntaPorNome(nome)` |
| `resolverServicoIdPorNome(nome)` | **sim** (helper de escrita, cria serviço) | só chamada internamente por escritas já guardadas; se exposta, `requireEscritaServicoJuntaPorNome(nome)` |
| `excluirAgendamentoJunta(id)` | não diretamente | `requireAcessoModulo(JUNTA)` (o agendamento pertence a um serviço; nesta etapa basta acesso ao módulo — refino futuro: resolver o serviço pelo id antes de excluir) |

**Tratamento de `getEspecialidadesPorServico` com nome vazio (Finding 3).** Verificado: com `servicoNome` vazio a action faz `where: {}` e retorna especialidades de **TODOS** os serviços. Se a guarda caísse em `requireAcessoModulo(JUNTA)`, um `OPERADOR` só-CAEE receberia especialidades de APAE/Ambulatório/Especialidades — vazamento de sub-serviços não vinculados. Regra explícita decidida:

- **Nome definido** → `requireLeituraServicoJuntaPorNome(nome)` (valida o sub-serviço).
- **Nome vazio** → comportamento depende do nível, calculado dentro da action a partir do `user` que a guarda retorna:
  - **GESTOR ou JUNTA/ADMIN** → mantém o retorno completo (todas as especialidades). Admin da Junta vê todos os serviços (FR-3.3).
  - **JUNTA/OPERADOR** → **filtrar** o `findMany` aos `servicoId` dos sub-serviços vinculados. A action resolve a lista de nomes/ids permitidos (via `subServicosPermitidos` traduzidos para nomes de `MAPA_SERVICOS` ou via join por `ServicoJunta`) e aplica `where: { servicoId: { in: idsPermitidos } }`. Se o operador não tiver nenhum sub-serviço vinculado, retorna `[]`.

Implementação: a action chama `const user = await requireAcessoModulo(JUNTA)` (garante entrada no módulo e retorna o user com `acessos`); se `servicoNome` vazio e o usuário **não** é admin/gestor, deriva `subServicosPermitidos` de `user.acessos` (vínculos `{JUNTA, OPERADOR, servicoJunta}`), mapeia para os nomes canônicos e restringe o `where`. Assim o OPERADOR nunca enxerga especialidades de sub-serviço fora do seu vínculo. (Alternativa descartada — proibir nome vazio para OPERADOR — exigiria a UI sempre mandar a aba atual; filtrar é mais robusto e não depende da UI.)

**Guardas compostas (LEITURA vs ESCRITA) — Finding 2.** A ponte nome→enum cobre só os 4 controlados; um nome fora deles (variação não prevista, "Educação", "Social", ou nome digitado) retorna `null`. O problema verificado é que as **escritas** da Junta (`registrarAtendimentoServico`, `resolverServicoIdPorNome`, `cadastrarPacienteJunta`, `criarAgendamentoJunta`) **criam `Servico` on-the-fly** a partir do nome: se o fallback caísse em "só acesso ao módulo", um `OPERADOR` só-CAEE poderia enviar um nome não-mapeado, passar na guarda e **criar/gravar** num serviço novo — contorno do recorte por sub-serviço e poluição da tabela `Servico`. Por isso separamos duas guardas, em `src/lib/auth.js`:

```js
// LEITURA por serviço (getPacientesPorServico, getAgendamentos*, getEspecialidades*):
// - nome mapeia aos 4 enums → exige acesso àquele serviço.
// - nome NÃO mapeia (serviço não controlado) → exige só acesso ao módulo JUNTA
//   (leituras não criam dados; o pior caso é ver dados de serviço não controlado,
//    que não tem granularidade definida nesta etapa).
export async function requireLeituraServicoJuntaPorNome(servicoNome) {
  const enumServ = servicoJuntaDoNome(servicoNome);
  if (enumServ) return requireAcessoServicoJunta(enumServ);
  return requireAcessoModulo(MODULOS.JUNTA);
}

// ESCRITA por serviço (registrarAtendimentoServico, criarAgendamentoJunta, e qualquer
// action que crie/grave num Servico resolvido por nome):
// - nome mapeia aos 4 enums → exige acesso àquele serviço (OPERADOR só-CAEE barra APAE etc.).
// - nome NÃO mapeia → exige requireAdminModulo(JUNTA): só ADMIN (ou GESTOR) pode
//   criar/gravar em serviço não controlado. OPERADOR NUNCA cria serviço on-the-fly. [Opção (b) do review]
export async function requireEscritaServicoJuntaPorNome(servicoNome) {
  const enumServ = servicoJuntaDoNome(servicoNome);
  if (enumServ) return requireAcessoServicoJunta(enumServ);
  return requireAdminModulo(MODULOS.JUNTA);
}
```

**Decisão (Opção (b) do review, de menor atrito):** manter a criação on-the-fly existente, mas **blindá-la pela guarda**: qualquer `servicoNome` que não mapeie para os 4 enums exige `requireAdminModulo(JUNTA)` nas escritas. Assim, um `OPERADOR` nunca cria nem grava em serviço não controlado — o furo de "variação de string → cai para acesso ao módulo → cria serviço" fica fechado. (A alternativa (a) — recusar `400` nome não-mapeado e restringir criação ao CRUD de `/gerenciamento/servicos` — é mais rígida; adotada apenas como refino futuro se o cliente quiser proibir criação on-the-fly por completo.) Combinada com a normalização `NFD` de `servicoJuntaDoNome`, variações de acento dos 4 controlados passam a mapear corretamente (não caem no fallback).

A tabela de inventário acima deve, portanto, usar:
- `requireLeituraServicoJuntaPorNome` nas **leituras** por serviço (`getPacientesPorServico`, `getAgendamentosDoMes/DoDia`, `getEspecialidadesPorServico` com nome definido);
- `requireEscritaServicoJuntaPorNome` nas **escritas** por serviço (`registrarAtendimentoServico`, `criarAgendamentoJunta`, e `resolverServicoIdPorNome` quando chamada por fluxo de escrita).

Consequência registrada (coerente com FR-3.4/AC-10): um `JUNTA/OPERADOR` vinculado só a `CAEE` lê/escreve em `CAEE` e é **bloqueado (403)** em `APAE`/`Ambulatório`/`Especialidades`; na UI, as abas não permitidas mostram o bloqueio no conteúdo. Nomes não controlados: **leitura** liberada a qualquer operador da Junta (dado de baixa sensibilidade, documentado), **escrita** exige ADMIN — operador nunca cria serviço.

---

## 3. Decisão JWT-resumo vs consulta-ao-banco-por-request

**Decisão: consulta ao banco por request, memoizada por render de Server Component via `React.cache`.** Sem embutir acessos no JWT. **Este é o padrão recomendado pelo guia oficial de autenticação do Next 16** (DAL com `verifySession`/`getUser` memoizados por `cache()`).

Justificativa:

- A Etapa 2 trará uma tela de edição de permissões. Com resumo no JWT, qualquer alteração só surtiria efeito após **novo login** (ou invalidação de token), o que é confuso e frágil. Consulta ao banco reflete a mudança **no próximo request** — correto por construção (FR-7.2, A4).
- O custo é controlado (NFR-3): a query é `findMany` indexada por `userCpf` (índice `idx_user_acesso_cpf`), e a sessão já é consultada hoje em `requireRole`/`/api/me`.
- O JWT **continua** carregando apenas `userId (cpf)`, `role`, `nome`, `cargo` (como hoje). Não precisamos crescer o token. Como `role === "GESTOR"` já vem no JWT/sessão, a checagem de GESTOR nem exige a tabela.

Trade-off aceito e registrado: uma query de sessão+acessos por request de módulo. Mitigado pelo índice e pela memoização de render. Não há cache entre requests nesta etapa (simplicidade correta); se perfilagem futura mostrar gargalo, um cache curtíssimo por token pode ser adicionado sem mudar as assinaturas.

**Escopo da memoização (Finding 6).** O `React.cache` deduplica chamadas **dentro de uma mesma renderização de Server Component** (ex.: o `layout.js` chamando `carregarContextoAcesso()` várias vezes = 1 query). Em **API routes** (`route.js`) e **server actions**, que não são renderizações de componente, não se deve contar com a dedupe entre funções: a regra é **cada API route/action chama exatamente UMA guarda** (`require*`), que executa a query uma única vez. Isso mantém o custo em 1 query por request também fora do render. Afirmação corrigida: a memoização por `React.cache` vale para os layouts (Server Components); em API routes e actions a verificação executa a query diretamente, 1x por guarda.

---

## 4. Divisão autenticação (proxy) × autorização (layout de módulo)

### 4.1 Renomear `middleware.js` → `proxy.js` (breaking change do Next 16)

O guia (`middleware.md`/`proxy.md`) confirma: **`middleware.js` está deprecado e renomeado para `proxy.js`** no Next 16; a função exportada passa a se chamar `proxy` (ou default export); `config.matcher` e a API (`NextRequest`/`NextResponse`) permanecem idênticos. O repo usa hoje `src/middleware.js` (ainda funciona, só emite deprecation).

> **Correção factual (Finding 6):** uma revisão anterior afirmava que "o proxy roda em runtime Node.js" — isso **não** está no `proxy.md` lido. O doc diz o oposto (o proxy pode ser deployado em CDN; não dependa de módulos/globais compartilhados). A afirmação era incidental (o comportamento não muda, só fazemos `jwtVerify` com `jose`, que já roda hoje), mas foi removida. Regra firme: **o proxy não importa Prisma nem depende de globais** — faz apenas verificação de token.

**Decisão: renomear `src/middleware.js` → `src/proxy.js`** nesta etapa, já que o arquivo será reescrito de qualquer forma (removendo a autorização). Como já vamos tocar nele por inteiro, aproveitamos para sair do convention deprecado — custo marginal zero e evita o aviso. A migração pode usar o codemod oficial (`npx @next/codemod@canary middleware-to-proxy .`) ou ser feita à mão (renomear o arquivo e a export `export function proxy(request)` / default). `config.matcher` é mantido igual.

> Se, por qualquer motivo de compatibilidade da versão instalada, o codemod/rename causar atrito, o fallback aceitável é **manter `src/middleware.js`** (ainda suportado) com o mesmo conteúdo enxuto. A decisão primária é `proxy.js`; o comportamento (só autenticação) é idêntico nos dois casos.

### 4.2 Proxy/middleware — só autenticação

`src/proxy.js` (ex-`middleware.js`) passa a:

- **Preservar o early-return de rotas públicas no CORPO da função** — exatamente como hoje. Verificado: o `config.matcher` atual é `["/((?!_next/static|_next/image|favicon.ico|img).*)"]` e **não** exclui `/api`; a liberação de `/login`, `/_next`, `/api` e `/acesso-negado` é feita no corpo via `pathname.startsWith(...)` (early `return NextResponse.next()`). Esse bloco **permanece intacto** (Finding 8). Remover esse early-return por descuido faria o proxy redirecionar chamadas `/api` sem token (ex.: `/api/me` client) para `/login`, quebrando o front. O `matcher` continua idêntico.
- Sem token → redireciona para `/login?redirect=<pathname>` (FR-6.1).
- Com token: `jwtVerify`. Se inválido/expirado → redireciona `/login?redirect=...&error=session_expired` e **apaga** o cookie (FR-6.1).
- **Remover APENAS**: o bloco `PERMISSOES_ROTAS`, a varredura/ordenação de rotas (`rotasOrdenadas`), o redirecionamento para `/acesso-negado` por falta de permissão de módulo e o caso especial `/regulacao?tab=FINANCEIRO` (FR-5.3, FR-8). **Não** remover o early-return das rotas públicas nem a validação de token/sessão.
- Headers `x-user-id`/`x-user-role`/`x-user-name`: hoje setados mas **não consumidos por ninguém** (confirmado). Decisão: **mantê-los** (custo zero; o guia sugere passar identidade por headers), mas a autorização **não** depende deles. O `matcher` permanece igual.

Esqueleto do `proxy.js` resultante (ilustrativo):

```js
import { NextResponse } from "next/server";
import { jwtVerify } from "jose";

export async function proxy(request) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("session_token")?.value;

  // 1) Rotas públicas — PRESERVADO do middleware atual (Finding 8).
  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname === "/acesso-negado"
  ) {
    return NextResponse.next();
  }

  // 2) Sem token → login.
  if (!token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 3) Token inválido/expirado → login + limpa cookie.
  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-user-id", payload.userId);
    requestHeaders.set("x-user-role", payload.role);
    requestHeaders.set("x-user-name", payload.nome || "Usuário");
    return NextResponse.next({ request: { headers: requestHeaders } });
    // SEM PERMISSOES_ROTAS, SEM varredura de rotas, SEM /acesso-negado por módulo.
  } catch (error) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    loginUrl.searchParams.set("error", "session_expired");
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete("session_token");
    return response;
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|img).*)"],
};
```

Por que não autorizar no proxy: o guia é explícito — "Proxy não deve ser a única linha de defesa; faça a checagem o mais perto possível da fonte de dados". Além disso a decisão de módulo depende de `searchParams`/sub-serviço, melhor resolvida junto do render com acesso ao Prisma. Logo, autenticação no proxy, autorização no servidor da rota (DAL/layout).

### 4.3 Autorização de módulo — em `layout.js` por módulo (Server Component)

Decisão: aplicar a autorização num **novo `layout.js` por módulo**, não no topo de cada página. Justificativa:

- As páginas atuais são **client components** (`"use client"`), que não podem ler a sessão no servidor nem importar a DAL (regra do guia). Um `layout.js` de módulo é **Server Component** por padrão, roda antes do conteúdo, lê a sessão e decide — o "gate server-side" previsto em A3.
- Um layout por módulo evita repetir o guard no corpo de cada página e centraliza o bloqueio. Como Header/Sidebar vêm do layout raiz (`ClientLayout`), bloquear no layout do módulo preserva menu e cabeçalho e troca só o miolo (FR-5.1).

Padrão do guard (ex.: `src/app/regulacao/layout.js`):

```js
import { carregarContextoAcesso, usuarioTemAcessoModulo, MODULOS } from "@/lib/permissions";
import AcessoNegadoModulo from "@/components/AcessoNegadoModulo";

export default async function RegulacaoLayout({ children }) {
  const ctx = await carregarContextoAcesso();
  // Sessão ausente/expirada já foi tratada pelo proxy (redireciona ao login).
  // Aqui, se por corrida não houver contexto, bloqueia por segurança (fail-closed).
  const permitido = ctx && (await usuarioTemAcessoModulo(ctx.user, MODULOS.REGULACAO));
  if (!permitido) {
    return <AcessoNegadoModulo modulo="Regulação" />;
  }
  return children;
}
```

Layouts análogos para: `camara-tecnica/farmacia-judicial` (`MODULOS.FARMACIA`), `camara-tecnica/processos` (`MODULOS.PROCESSOS`), `junta-reguladora` (`MODULOS.JUNTA`, + provider de sub-serviços §2.6), `ccz` (`MODULOS.CCZ`).

Observação sobre `/camara-tecnica`: hoje não há página em `/camara-tecnica` (só em `/camara-tecnica/farmacia-judicial` e `/camara-tecnica/processos`). Portanto os layouts ficam **nas subpastas**, cada uma com seu módulo. Não criamos layout em `/camara-tecnica`.

### 4.4 Gerenciamento — guard por item, não por layout único

`/gerenciamento/*` agrega itens com regras diferentes (FR-3.8/3.9/3.10). Não há um "módulo gerenciamento". Decisão: **sem layout único de gerenciamento**; cada subrota recebe seu próprio `layout.js` com a regra específica.

> **Path raiz do menu (Finding 7).** No `Sidebar.js` o item "Gerenciamento" tem `path: "/admin/gerenciamento"`, enquanto cada sub-item aponta para `/gerenciamento/pessoas`, `/gerenciamento/medicos`, etc. **Verificado: não existe `src/app/admin/`** — `/admin/gerenciamento` é apenas uma âncora de menu (rota sem página). Portanto: (a) a chave de visibilidade a remover do `VISIBILIDADE_MODULO` é `"/admin/gerenciamento"`; (b) **NÃO** se cria layout em `/admin/gerenciamento`; (c) os guards vão nas subrotas reais `/gerenciamento/*`, que são as páginas de fato.

| Rota real | Regra (via `permissions.js`) |
|---|---|
| `/gerenciamento/usuarios` | `requireGestor` / `usuarioEhGestor` (FR-3.9) |
| `/gerenciamento/relatorios` | GESTOR **ou** admin de qualquer módulo (FR-3.10) |
| `/gerenciamento/pessoas` | GESTOR **ou** REGULACAO/ADMIN **ou** JUNTA/ADMIN (FR-3.8 + A2) |
| `/gerenciamento/medicos`, `/ubs`, `/procedimentos` | GESTOR **ou** REGULACAO/ADMIN |
| `/gerenciamento/servicos` | GESTOR **ou** JUNTA/ADMIN (Serviços-e-Especialidades ⇐ Junta, FR-3.3/3.8) |

> Mudança de comportamento intencional: hoje `/gerenciamento/servicos` é liberado a `REGULACAO_ADMIN`. O requisito novo (FR-3.3) amarra Serviços-e-Especialidades à **Junta**. Decisão: seguir o requisito (JUNTA/ADMIN). A migração mapeia papéis corretamente, então nenhum usuário "perde" acesso de forma inesperada além dessa reclassificação intencional.

---

## 5. `requireRole` → guardas por vínculo (FR-7.3/7.4)

Plano concreto:

1. Adicionar em `src/lib/auth.js` as guardas `requireGestor`, `requireAdminModulo`, `requireAcessoModulo`, `requireAcessoServicoJunta`, `requireAdminDeAlgumModulo`, `requireAcessoPessoas`, `requireLeituraServicoJuntaPorNome`, `requireEscritaServicoJuntaPorNome` (§2.4/§2.6/§6.3): cada uma valida sessão (como `requireRole` hoje) e consulta vínculos via `permissions.js`; lança `{status:401|403}`; retorna o `user` completo.
2. Reescrever cada call site para a guarda semântica equivalente. Mapa de migração (mantendo todos protegidos — AC-12):

| Arquivo / ação | Hoje | Passa a usar |
|---|---|---|
| `api/gerenciamento/usuarios` (POST) | `requireRole(['GESTOR'])` | `requireGestor()` |
| `api/gerenciamento/relatorios` (GET) | `requireRole(ROLES_ADMIN...)` | `requireAdminDeAlgumModulo()` (GESTOR ∨ admin de módulo; 403 se nenhum) |
| `api/admin/metrics` (GET) | `requireRole(ROLES_GERENCIAIS)` | `requireAdminDeAlgumModulo()` |
| `gerenciamento/servicos/actions` (create/update/delete) | `requireRole(ROLES_PERMITIDAS)` | `requireAdminModulo(JUNTA)` |
| `gerenciamento/procedimentos/actions` (create/update/delete) | `requireRole(ROLES_PERMITIDAS)` | `requireAdminModulo(REGULACAO)` |
| `gerenciamento/pessoas/actions` (listar/criar/atualizar/excluir + listarUbs) | `requireRole(ROLES_CADASTRO)` | guarda "pessoas": GESTOR ∨ REGULACAO/ADMIN ∨ JUNTA/ADMIN |
| `camara-tecnica/farmacia-judicial/actions` | ver §10 | ver §10 |
| `regulacao/actions` | ver §6 | ver §6 |
| `junta-reguladora/actions` | **sem `requireRole` hoje** | ver §2.6 (passa a ter guarda por sub-serviço/módulo) |

Guarda "pessoas" (reutilizável):

```js
export async function requireAcessoPessoas() {
  // GESTOR ∨ REGULACAO/ADMIN ∨ JUNTA/ADMIN
}
```

**Remoção de `requireRole` (Findings 11).** Após migrar os call sites, `requireRole` fica sem usos. Antes de remover, a implementação **deve** rodar DUAS buscas: (1) `requireRole(` (chamadas) e (2) `requireRole` e `from "@/lib/auth"` (imports órfãos / repasses). Só remover se ambas derem zero fora da própria definição. Em caso de qualquer dúvida, **manter `requireRole` como wrapper fino** por uma iteração (ele passaria a traduzir a lista legada para as guardas novas) em vez de removê-lo — nunca deixar um ponto sem verificação (NFR-1, AC-12).

As leituras do dia a dia que hoje **não** têm `requireRole` (ex.: carregar pedidos da Regulação) permanecem como estão (não eram protegidas por papel); o bloqueio de entrada no módulo é feito pelo layout. A exceção são as escritas da Junta e as escritas de farmácia hoje sem guarda, que passam a ser protegidas (§2.6 e §10) — endurecimento intencional.

---

## 6. Financeiro da Regulação em somente-leitura para Operador (FR-8)

A view do Financeiro é `src/app/regulacao/views/Financeiro.js` (client), orquestrada por `src/app/regulacao/page.js` (aba `FINANCEIRO`, recebe dados via `useRegulacaoData` por props — verificado). As gravações são server actions em `src/app/regulacao/actions.js`.

### 6.1 Enumeração leitura × escrita e nível exigido (FR-8.3)

| Server action (`regulacao/actions.js`) | Tipo | Nível exigido |
|---|---|---|
| `getCotasFinanceiras` | leitura | `requireAcessoModulo(REGULACAO)` (OPERADOR ou ADMIN) ou GESTOR |
| `getPlanejamentoCidades` | leitura | `requireAcessoModulo(REGULACAO)` |
| `saveCotaFinanceira` | escrita | `requireAdminModulo(REGULACAO)` |
| `savePlanejamentoCidade` | escrita | `requireAdminModulo(REGULACAO)` (usa `user.nome` em `updatedBy` — guarda retorna user completo) |
| `updateBillingDate` | escrita | `requireAdminModulo(REGULACAO)` |
| CRUD catálogo (`createMedico/updateMedico/deleteMedico`, `createUbs/updateUbs/deleteUbs`, `createProcedimento/updateProcedimento/deleteProcedimento`) | escrita | `requireAdminModulo(REGULACAO)` |

> **Nota intencional (Finding 10 da rev. anterior).** As leituras `getCotasFinanceiras`/`getPlanejamentoCidades` hoje exigem `['GESTOR','REGULACAO_ADMIN']`; passam a exigir apenas **acesso ao módulo** `REGULACAO`, liberando o OPERADOR a **visualizar** tetos/planejamento. Isso é **intencional** (FR-8: "vê o Financeiro em somente-leitura"), **não** é regressão de segurança. As escritas passam a `requireAdminModulo`, então operador que invocar `saveCotaFinanceira` recebe 403 (FR-8.2) — a proteção não é só visual.

### 6.3 Escritas de `Pessoa` na Regulação — buraco de segurança a fechar (Finding 1, HIGH)

**Verificado** em `src/app/regulacao/actions.js`: `createPessoa` (linha ~392), `updatePessoa` (linha ~811) e `deletePessoa` (linha ~828) **NÃO têm `requireRole` hoje** — gravam/excluem direto. Só `createMedico/createUbs/createProcedimento` e os updates/deletes de catálogo têm guarda. Uma busca por `requireRole(` **não** detecta essas três. Após a reforma, o `layout.js` de `/regulacao` passa a liberar a entrada a **qualquer** vínculo `REGULACAO` (inclusive `OPERADOR`); se essas actions continuarem sem guarda, um OPERADOR poderia criar/editar/excluir pessoas — buraco simétrico ao da farmácia (§10.2) e violação de NFR-1/AC-12 e do espírito de FR-3.8/A2 ("Pacientes" é ato administrativo).

**Decisão (endurecimento intencional):** aplicar a guarda **"pessoas"** `requireAcessoPessoas()` (GESTOR ∨ REGULACAO/ADMIN ∨ JUNTA/ADMIN) às três — coerente com a guarda de `/gerenciamento/pessoas/actions` (§5) e com a premissa A2 (Pacientes compartilhado entre Regulação e Junta, acesso de admins de ambos). Alternativa mais restrita (`requireAdminModulo(REGULACAO)`) foi descartada porque Pacientes é compartilhado com a Junta; `requireAcessoPessoas` é a guarda certa.

| Server action (`regulacao/actions.js`) | Tipo | Hoje | Passa a usar |
|---|---|---|---|
| `createPessoa(data)` | escrita cadastro | **sem guarda** | `requireAcessoPessoas()` (endurecimento intencional) |
| `updatePessoa(cpf, data)` | escrita cadastro | **sem guarda** | `requireAcessoPessoas()` (endurecimento intencional) |
| `deletePessoa(cpf)` | exclusão cadastro | **sem guarda** | `requireAcessoPessoas()` (endurecimento intencional) |

Registrado no Passo 6 da §16 e na lista §15 (entrada `regulacao/actions.js` cobre estas 3 escritas de Pessoa, além do Financeiro/catálogo). As **leituras** da Regulação do dia a dia (carregar pedidos etc.) seguem sem guarda — a entrada já é barrada pelo layout.

### 6.2 Modo leitura na UI (FR-8.1) — Finding 8

O `layout.js` de `/regulacao` calcula **no servidor** DUAS flags e as injeta no `RegulacaoPermProvider` (Client Component) como props serializáveis (booleans):

- `podeEditarFinanceiro = usuarioEhAdminModulo(user, REGULACAO) || usuarioEhGestor(user)` — governa a edição do Financeiro.
- `podeGerenciarCatalogo = usuarioEhAdminModulo(user, REGULACAO) || usuarioEhGestor(user)` — governa a UI de catálogo (médicos/UBS/procedimentos) **se** ela existir dentro de `/regulacao` (ver nota do Finding 5 abaixo). Nesta etapa as duas flags coincidem (ambas = admin ∨ gestor), mas são nomeadas separadamente para que a Etapa 2 possa divergi-las sem refatorar o provider.

Como `page.js` é client (e Client Components não importam a DAL):

- O layout (Server Component) renderiza `<RegulacaoPermProvider podeEditarFinanceiro={...} podeGerenciarCatalogo={...}>{children}</RegulacaoPermProvider>`. O provider é um Client Component (`"use client"`) importado pelo layout — padrão suportado (Server Component renderiza Client Component passando props serializáveis).
- `page.js` fica dentro de `children` do layout de `/regulacao` (confirmado: o layout envolve a rota), portanto está dentro do provider.
- `Financeiro.js` e demais views leem as flags com `usePermissoesRegulacao()`, que retorna `{ podeEditarFinanceiro: false, podeGerenciarCatalogo: false }` **por default quando não há provider** (fail-closed, coerente com §11).

Com a flag em mãos, `Financeiro.js` (handlers verificados: `handleOpenDefineTetoModal`, `handleCellBlur`, `BotaoEditar`):
- Oculta o `BotaoEditar` de "Teto" e não abre `handleOpenDefineTetoModal` quando `!podeEditarFinanceiro`.
- Torna os `input` de planejamento por cidade `readOnly` e torna `handleCellBlur`/`onChange` no-op quando `!podeEditarFinanceiro`.

Decisão (ocultar vs desabilitar): **desabilitar/readonly** para o operador, preservando a visualização dos valores (o requisito é "vê os dados, não edita"). Botões de ação de escrita ficam ocultos; campos de valor ficam `readOnly` para continuar exibindo o número.

> **UI de catálogo para OPERADOR (Finding 5).** As actions de catálogo (`createMedico`, `createUbs`, `createProcedimento`, e seus updates/deletes) estão em `regulacao/actions.js` e são protegidas por `requireAdminModulo(REGULACAO)` (§6.1) — enforcement correto. O gap é de UI: se houver botões/telas de criar/editar médico/UBS/procedimento **dentro** de `/regulacao` visíveis ao OPERADOR, ele clicaria e tomaria 403 (UX quebrada, contra FR-8.1). Decisão: a página de Regulação **esconde/desabilita** qualquer controle de catálogo quando `!podeGerenciarCatalogo` (espelhando o enforcement das actions). **Passo de verificação obrigatório na implementação:** reler `src/app/regulacao/page.js` e suas views para confirmar se existe UI de catálogo embutida em `/regulacao`. Dois desfechos aceitos: (a) **existe** UI de catálogo → aplicar `podeGerenciarCatalogo` para ocultá-la ao OPERADOR; (b) **não existe** (catálogo só em `/gerenciamento/medicos|ubs|procedimentos`, já gated por admin no layout) → documentar "verificado: catálogo só em /gerenciamento" e a flag `podeGerenciarCatalogo` fica disponível porém sem consumidor em `/regulacao`. Em ambos os casos o enforcement das actions permanece.

---

## 7. Sidebar, `/api/me` e login

### 7.1 Sidebar (FR-4)

Remover de `src/components/Sidebar.js`: os mapas `VISIBILIDADE_MODULO` (chaves `/regulacao`, `/camara-tecnica`, `/junta-reguladora`, `/ccz`, **`/admin/gerenciamento`**) e `VISIBILIDADE_SUBITEM` (chaves por `tab`: `FARMACIA_JUDICIAL`, `PROCESSOS`, `FINANCEIRO`, `MEDICOS`, `UBS`, `PROCEDIMENTOS`, `SERVICOS`, `USUARIOS`), as funções `podeVerModulo`/`podeVerSubItem`, os `.filter(...)` por papel e os estados `userRole`/`carregandoRole`/`isGestor`. Todos os módulos e sub-itens passam a renderizar para qualquer usuário autenticado (FR-4.1/4.2).

O `useEffect` que faz `fetch("/api/me")` **só para obter `role`** é removido da Sidebar (não há outro uso de identidade na Sidebar — verificado). O `Header`/outros componentes seguem seu próprio consumo de identidade, se houver.

### 7.2 `/api/me` (FR-10.2)

Estender a resposta de `src/app/api/me/route.js` para expor `isGestor` e os vínculos, **sem** quebrar o contrato atual (`data.user.role` continua presente). Hoje retorna `{ user: { id, nomeCompleto, cpf, role, cargo } }` (verificado; `nomeCompleto` é derivado de `session.user.nome`). Novo formato aditivo:

```json
{
  "user": {
    "id": "<cpf>", "cpf": "<cpf>", "nomeCompleto": "...",
    "role": "REGULACAO_ADMIN", "cargo": "...",
    "isGestor": false,
    "acessos": [{ "modulo": "REGULACAO", "nivel": "ADMIN", "servicoJunta": null }]
  }
}
```

`role` e os demais campos atuais permanecem (NFR-4, AC-16). Novos campos são aditivos. Esta rota é um Route Handler: aplica **uma** verificação de sessão (não precisa de guarda de autorização — qualquer usuário autenticado lê o próprio `/api/me`).

> **Ampliar o `select` (Finding 7).** Verificado: `src/app/api/me/route.js` usa hoje `include: { user: { select: { cpf, nome, role, cargo } } }` — **não** traz a relação `acessos`. Expor `acessos` **não** é só montar JSON: é preciso **ampliar o `select`** para incluir a relação:
>
> ```js
> const session = await prisma.session.findUnique({
>   where: { token },
>   include: {
>     user: {
>       select: {
>         cpf: true, nome: true, role: true, cargo: true,
>         acessos: { select: { modulo: true, nivel: true, servicoJunta: true } }, // ← adicionar
>       },
>     },
>   },
> });
> // ...
> isGestor: session.user.role === "GESTOR",
> acessos: session.user.acessos,
> ```
>
> Manter `cpf/nome/role/cargo` no `select` (não trocar por `include` sem select, para não vazar campos extras do `User`). `isGestor` deriva de `role === "GESTOR"` (coerente com a forma canônica §1.2). Os campos atuais da resposta (`id`, `nomeCompleto`, `role`, `cargo`) permanecem para não quebrar `data.user.role` consumido hoje pela Sidebar (NFR-4/AC-16). Alternativa equivalente: derivar `acessos` via `carregarAcessosPorCpf(cpf)` de `permissions.js` — ambos corretos; o `select` ampliado evita uma segunda query.

### 7.3 Login (FR-10.1)

`loginAction` em `src/app/actions/auth.js` **não muda** sua lógica essencial: autentica CPF+senha, gera JWT com `userId/role/nome/cargo`, cria `Session`, grava cookie httpOnly de 8h (verificado). Como a autorização é por banco, não há resumo de acessos para embutir — o login segue idêntico, sem regressão (AC-16).

---

## 8. Componente `AcessoNegadoModulo`

Novo: `src/components/AcessoNegadoModulo.jsx` (Server Component simples, sem estado). Props: `modulo` (string legível) e opcional `mensagem`. Renderiza um bloco centralizado com ícone, título "Acesso Negado", a frase "Você não tem acesso ao módulo **{modulo}**. Fale com o administrador do sistema." e **não** oferece link de login (o usuário está logado; só não tem o vínculo). Estilo próprio em `AcessoNegadoModulo.module.css` (pode reaproveitar o visual de `src/app/acesso-negado/page.module.css`). Diferente da página `/acesso-negado` (full-screen), este componente renderiza **dentro** do `<main>`, preservando Header + Sidebar (FR-5.1/5.2).

A página `/acesso-negado` existente **permanece** (continua pública), mas deixa de ser alvo de redirecionamento de autorização de módulo (FR-5.3). Mantida para não quebrar links.

---

## 9. Migração de dados (FR-9)

### 9.1 Estratégia: `db push` + script de backfill (sem migration destrutiva)

1. Atualizar `prisma/schema.prisma` com enums + `UserAcesso` + relação em `User` (§1.3).
2. `npm run db:generate` (gera o client com os novos tipos).
3. `npm run db:push` → cria enums e tabela `user_acessos` **sem** tocar em dados existentes (FR-9.4). `db push` é não-destrutivo aqui porque só adiciona objetos.
4. Rodar o backfill (abaixo).

Nenhum dado é apagado; `User.role` e o enum `Role` permanecem (FR-1.4, AC-2).

### 9.2 Localização e comando do script

Arquivo novo: `prisma/backfill-acessos.js` (padrão do `seed.js`: `require("dotenv").config()`, `PrismaClient` + `PrismaPg` + `Pool`). Comando exato:

```
node prisma/backfill-acessos.js
```

(Opcional, em `package.json` → `scripts`: `"db:backfill": "node prisma/backfill-acessos.js"`.)

### 9.3 Mapeamento `role` → vínculos (FR-9.2)

| `role` legado | Vínculos criados |
|---|---|
| `GESTOR` | **nenhum** (GESTOR = `role`, não depende de `UserAcesso`) |
| `REGULACAO_ADMIN` | `{REGULACAO, ADMIN}` |
| `REGULACAO_COMUM` | `{REGULACAO, OPERADOR}` |
| `FARMACIA_ADMIN` | `{FARMACIA, ADMIN}` |
| `PROCESSO_ADMIN` | `{PROCESSOS, ADMIN}` |
| `JUNTA_ADMIN` | `{JUNTA, ADMIN}` |
| `JUNTA_CAEE` | `{JUNTA, OPERADOR, CAEE}` |
| `JUNTA_EDUCACAO` | `{JUNTA, OPERADOR}` **sem** `servicoJunta` — INCERTO (ver 9.4) |
| `JUNTA_SAUDE` | `{JUNTA, OPERADOR}` **sem** `servicoJunta` — INCERTO (ver 9.4) |
| `JUNTA_ASSISTENCIA` | `{JUNTA, OPERADOR}` **sem** `servicoJunta` — INCERTO (ver 9.4) |
| `CCZ_ADMIN` | `{CCZ, ADMIN}` |

A lógica de mapeamento é extraída em uma função pura `mapearRoleParaAcessos(role)` (testável — §14).

### 9.4 Roles legados sem sub-serviço equivalente (ponto de atenção)

Os sub-serviços controlados são `CAEE`, `APAE`, `AMBULATORIO`, `ESPECIALIDADES`. Os roles `JUNTA_EDUCACAO`, `JUNTA_SAUDE`, `JUNTA_ASSISTENCIA` **não têm correspondência 1:1 óbvia**. Decisão (FR-9.2, "não inventar correspondência"): o backfill cria `{JUNTA, OPERADOR}` **com `servicoJunta = null`** e emite `console.warn` listando CPF + role de origem, mais um bloco comentado com mapeamento sugerido para ajuste manual:

```js
// AJUSTE MANUAL (incerto — validar com o cliente antes de descomentar):
//   JUNTA_EDUCACAO    -> CAEE?            (educação especial ~ CAEE)
//   JUNTA_SAUDE       -> AMBULATORIO?     (saúde ~ ambulatório)
//   JUNTA_ASSISTENCIA -> APAE?            (assistência ~ APAE)
// Enquanto não validado, fica {JUNTA, OPERADOR} sem servicoJunta.
```

Consequência registrada: um operador vindo desses roles entra no módulo Junta, mas **nenhum sub-serviço** é liberado por `usuarioTemAcessoServicoJunta` até o ajuste manual (comportamento seguro, não inventa acesso). Comunicar na implantação.

### 9.5 Idempotência (FR-9.3) — Finding 9

Para vínculos com `servicoJunta` não-nulo ou sem serviço: `createMany({ skipDuplicates: true })` apoiado no `@@unique([userCpf, modulo, nivel, servicoJunta])` — reexecutar não duplica.

Caso `servicoJunta = null` (`{JUNTA, OPERADOR, NULL}`): como Postgres considera NULLs distintos em índice único, `skipDuplicates` **não** protege. O script faz check-then-insert explícito:

```js
const jaExiste = await prisma.userAcesso.findFirst({
  where: { userCpf, modulo: "JUNTA", nivel: "OPERADOR", servicoJunta: null },
});
if (!jaExiste) await prisma.userAcesso.create({ data: {...} });
```

> **Nota (Finding 9):** o padrão `findFirst`+`create` vale para o backfill (execução única, single-process). A UI de escrita concorrente da Etapa 2 **não** deve copiar esse check-then-insert (tem corrida teórica): deve usar um **índice único parcial** (`CREATE UNIQUE INDEX ... WHERE servico_junta IS NULL`) ou normalizar o NULL de outra forma. Registrado para a Etapa 2.

### 9.6 CCZ/OPERADOR (FR-3.7)

O modelo **prevê** `{CCZ, OPERADOR}` (enum e tabela aceitam), mas **nenhum** role legado mapeia para ele e **nenhuma regra fina** é definida nesta etapa. `/ccz` exige, por ora, `usuarioEhAdminModulo(CCZ)` ou GESTOR no layout. Documentado como definição futura.

---

## 10. Recorte OPERADOR de FARMACIA e PROCESSOS (FR-3.6)

Nesta etapa, começamos **restritivo e explícito**, para refino posterior.

### 10.1 PROCESSOS/OPERADOR

A rota `/camara-tecnica/processos` hoje é só uma página "em construção". Decisão: `requireAcessoModulo(PROCESSOS)` libera a entrada; não há recorte fino porque não há telas. Admin e operador veem a mesma página placeholder. Refino quando o módulo existir.

### 10.2 FARMACIA — guardas por action (incluindo escritas HOJE DESPROTEGIDAS — Finding 2)

Verificado em `src/app/camara-tecnica/farmacia-judicial/actions.js`: `createMedicamento`, `createLoteMedicamento` e `createPacienteJudicial` **não têm `requireRole` hoje** (gravam direto). Uma busca por `requireRole(` **não** as detecta. Elas são escritas (catálogo/estoque/cadastro) e, se a migração só trocar os `requireRole` existentes, ficariam sem nenhuma guarda — violando NFR-1. Portanto são adicionadas explicitamente:

| Action (`farmacia-judicial/actions.js`) | Tipo | Hoje | Passa a usar |
|---|---|---|---|
| `createMedicamento` | escrita catálogo | **sem guarda** | `requireAdminModulo(FARMACIA)` (endurecimento intencional) |
| `createLoteMedicamento` | escrita estoque | **sem guarda** | `requireAdminModulo(FARMACIA)` (endurecimento intencional) |
| `createPacienteJudicial` | escrita cadastro | **sem guarda** | `requireAdminModulo(FARMACIA)` (endurecimento intencional) |
| `updateMedicamento` | escrita | `requireRole(['GESTOR','FARMACIA_ADMIN'])` | `requireAdminModulo(FARMACIA)` |
| `deleteMedicamento` | escrita | `requireRole(['GESTOR','FARMACIA_ADMIN'])` | `requireAdminModulo(FARMACIA)` |
| `updateLoteMedicamento` | escrita | `requireRole(['GESTOR','FARMACIA_ADMIN'])` | `requireAdminModulo(FARMACIA)` |
| `ajustarEstoque` | escrita (usa `session.nome`) | `requireRole(['GESTOR','FARMACIA_ADMIN'])` | `requireAdminModulo(FARMACIA)` (retorna user com `nome`) |
| `registrarDispensacao` | operação do dia a dia (usa `usuario.nome`) | `requireRole(['GESTOR','FARMACIA_ADMIN'])` | `requireAcessoModulo(FARMACIA)` (libera OPERADOR — ampliação intencional) |
| leituras (`getMedicamentosEEstoque`, `getCatalogo*`, etc.) | leitura | sem guarda | `requireAcessoModulo(FARMACIA)` (ou mantidas sem guarda — a entrada já é barrada pelo layout; aplicar guarda nas leituras é recomendado mas não obrigatório) |

> Registro: `createMedicamento`/`createLoteMedicamento`/`createPacienteJudicial` passam de **desprotegidas** para **só-admin** — correção de um buraco de segurança, alinhada ao recorte "catálogo/estoque/cadastro é admin". `registrarDispensacao` passa de só-admin para acesso-ao-módulo, liberando o operador do dia a dia (FR-3.6).

A UI de Farmácia pode esconder abas administrativas (Medicamentos/Estoque como cadastro) para OPERADOR usando a flag de admin do módulo passada pelo layout — recomendado, mas o enforcement real está nas actions. O refino fino de abas fica para iteração futura (FR-3.6 permite).

---

## 11. Validação de entradas externas

| Entrada | Origem | Regras |
|---|---|---|
| `modulo`, `nivel`, `servicoJunta` em `UserAcesso` | script/backfill e futura UI | obrigatórios (`servicoJunta` opcional); devem pertencer aos enums; `servicoJunta` só com `modulo=JUNTA` → normaliza para `null` caso contrário. Falha: a função de escrita lança erro e não grava. |
| `modulo`/`servicoJunta` passados às funções de `permissions.js` | código interno | devem ser valor das constantes `MODULOS`/`SERVICOS_JUNTA`. Valor desconhecido → a função retorna `false` (fail-closed), nunca `true`. |
| `servicoNome` recebido pelas actions da Junta | client (URL→`MAPA_SERVICOS`) | traduzido por `servicoJuntaDoNome`; se mapear para um dos 4 enums, exige o sub-serviço; se não mapear, exige só acesso ao módulo (§2.6). |
| `token` (cookie) | request | validado por `jwtVerify` (proxy) e por consulta a `Session` + `expiresAt` (server). Inválido/expirado → 401/redirect. |
| `searchParams.tab`/`subTab` | URL (client) | **não governam autorização**; a autorização de serviço da Junta é verificada no servidor pelas actions. A UI usa `subTab` só para decidir qual aba mostrar/bloquear (gate adicional, não a barreira). Valores inesperados caem no default já tratado nas páginas. |

Princípio transversal: **fail-closed**. Qualquer dúvida (sem sessão, enum inválido, contexto nulo, provider ausente) resulta em **negar** acesso / `podeEditar=false`.

---

## 12. Edge cases

- **Usuário sem nenhum vínculo e não-GESTOR:** vê todos os módulos na Sidebar, mas cada layout mostra `AcessoNegadoModulo`. Esperado (ex.: operador da Junta sem sub-serviço ajustado — §9.4).
- **GESTOR:** passa em todos os guards sem tocar em `UserAcesso`.
- **JUNTA/ADMIN:** acessa todos os sub-serviços (`usuarioTemAcessoServicoJunta` retorna true); todas as abas liberadas.
- **JUNTA/OPERADOR só CAEE:** `subServicosPermitidos = ["CAEE"]`; abas APAE/Ambulatório/Especialidades mostram bloqueio no conteúdo; `getPacientesPorServico("Ambulatório")` retorna 403 no servidor (§2.6); `getEspecialidadesPorServico("")` retorna só as especialidades de CAEE (filtrado — Finding 3).
- **Serviço da Junta não controlado (ex.: "Educação", "Social"):** **leitura** liberada a qualquer operador da Junta (sem granularidade nesta etapa); **escrita** exige `requireAdminModulo(JUNTA)` — operador nunca cria serviço on-the-fly por nome não-mapeado (Finding 2). Documentado.
- **OPERADOR Junta enviando nome com variação de acento/caixa de um dos 4 controlados:** `servicoJuntaDoNome` normaliza (NFD) e mapeia corretamente, aplicando o recorte do sub-serviço (Finding 4).
- **Sessão expira durante navegação:** próxima leitura/action retorna 401; proxy redireciona no próximo request de página.
- **Multi-módulo (futuro):** modelo já suporta N vínculos; conceder módulo extra = inserir linha em `UserAcesso` (Etapa 2).
- **Backfill reexecutado:** idempotente (§9.5).
- **`Financeiro` sem provider:** `usePermissoesRegulacao()` → `podeEditarFinanceiro=false` (fail-closed).

---

## 13. Error handling (por operação)

| Operação | Falha possível | Recuperável? | Retorno ao chamador | Log |
|---|---|---|---|---|
| `carregarContextoAcesso` | sem cookie / sessão expirada | sim (relogar) | `null` → guard/layout nega | não loga (fluxo normal) |
| `carregarContextoAcesso` | erro de conexão Prisma/pg | não (no request) | lança; layout trata como negado (fail-closed) | `console.error` (erro) |
| guards `require*` | 401 (sem sessão) | sim | `throw {status:401}` (padrão atual) | não |
| guards `require*` | 403 (sem vínculo/sub-serviço) | não | `throw {status:403}` | `console.warn` com cpf+recurso |
| server actions de escrita | 403 operador no Financeiro/Farmácia | não | erro `{status:403}` propagado ao client | `console.warn` |
| layout de módulo | contexto nulo/sem acesso | — | renderiza `AcessoNegadoModulo` (não lança) | opcional `console.warn` |
| action da Junta por serviço | 403 serviço não vinculado | não | `throw {status:403}` | `console.warn` cpf+serviço |
| backfill | role legado sem sub-serviço | sim (ajuste manual) | cria `{JUNTA,OPERADOR}` + `console.warn` | `console.warn` listando CPF |
| backfill | erro de insert | não | aborta com stack; nada parcial além do já commitado por lote | `console.error` + exit 1 |

As server actions mantêm o padrão atual (retornar `{ error }` ou propagar). As guardas lançam objeto com `status` (igual ao `requireRole` de hoje) para que os `catch` existentes continuem funcionando sem mudança de forma.

---

## 14. Testabilidade

- **Unitário (puro, sem banco):** a lógica de decisão de `permissions.js` extraível em funções puras que recebem `{role, acessos}` e `(modulo|servico)` e retornam boolean — testáveis sem Prisma. Casos: GESTOR true-em-tudo; admin de módulo; operador de módulo; operador Junta por serviço (CAEE sim, APAE não); JUNTA/ADMIN em qualquer serviço; enum/`subTab` inválido → false; `servicoJuntaDoNome("Ambulatório")`→AMBULATORIO, nome desconhecido→null.
- **Unitário do mapeamento de backfill:** `mapearRoleParaAcessos(role)` (pura) retorna a lista esperada — cobre os 11 roles e os 3 incertos.
- **Integração (com banco de teste):** backfill idempotente (rodar 2x e contar linhas); layout bloqueia sem vínculo; action de escrita do Financeiro recusa operador (403) e aceita admin; action da Junta recusa serviço não vinculado.
- Não há framework de teste instalado (`package.json` sem Jest/Vitest). Decisão: extrair as funções puras acima; **nesta etapa, verificação principal é `npm run build` + checagem manual dos cenários da AC-10**. Se quiserem testes automatizados, padronizar em `node --test` (nativo) sobre as funções puras — o guia do Next lista Jest/Vitest/Playwright/Cypress como opções, mas evitamos nova dependência nesta etapa.

---

## 15. Lista de arquivos a criar/alterar

**Criar**
- `src/lib/permissions.js` — fonte única de verdade (constantes, carregamento, funções, ponte `subTab`/nome↔enum).
- `src/components/AcessoNegadoModulo.jsx` + `AcessoNegadoModulo.module.css` — bloqueio no conteúdo.
- `src/app/regulacao/layout.js` — guard REGULACAO + `RegulacaoPermProvider` (flag `podeEditarFinanceiro`).
- `src/app/regulacao/PermissoesRegulacaoContext.js` — provider/hook client (`usePermissoesRegulacao`, retorna `{ podeEditarFinanceiro, podeGerenciarCatalogo }`, default `false` em ambos).
- `src/app/camara-tecnica/farmacia-judicial/layout.js` — guard FARMACIA.
- `src/app/camara-tecnica/processos/layout.js` — guard PROCESSOS.
- `src/app/junta-reguladora/layout.js` — guard JUNTA + `JuntaPermProvider` (sub-serviços permitidos).
- `src/app/junta-reguladora/PermissoesJuntaContext.js` — provider/hook client (`usePermissoesJunta`, default fail-closed).
- `src/app/ccz/layout.js` — guard CCZ (ADMIN/GESTOR por ora).
- `src/app/gerenciamento/usuarios/layout.js` — guard GESTOR.
- `src/app/gerenciamento/relatorios/layout.js` — guard GESTOR ∨ admin de módulo.
- `src/app/gerenciamento/pessoas/layout.js` — guard GESTOR ∨ REGULACAO/ADMIN ∨ JUNTA/ADMIN.
- `src/app/gerenciamento/medicos/layout.js`, `.../ubs/layout.js`, `.../procedimentos/layout.js` — guard GESTOR ∨ REGULACAO/ADMIN.
- `src/app/gerenciamento/servicos/layout.js` — guard GESTOR ∨ JUNTA/ADMIN.
- `prisma/backfill-acessos.js` — script de migração de dados.

> **Não criar** layout em `/admin/gerenciamento` (rota sem página — só âncora de menu, Finding 7) nem em `/camara-tecnica` (nível sem conteúdo).

**Alterar**
- `prisma/schema.prisma` — enums `ModuloAcesso`/`NivelAcesso`/`ServicoJunta`, model `UserAcesso`, relação `acessos` em `User`.
- `src/middleware.js` → **renomear para `src/proxy.js`** (export `proxy`/default), remover `PERMISSOES_ROTAS` e toda autorização de módulo; manter só autenticação (§4.1/4.2).
- `src/components/Sidebar.js` — remover `VISIBILIDADE_*` (incl. chave `/admin/gerenciamento`), `podeVer*`, filtros por papel, estado `userRole` e `fetch('/api/me')`.
- `src/app/api/me/route.js` — **ampliar o `select`** para incluir `acessos` e expor `isGestor` (aditivo, mantendo `role`/`cargo`/`nome`) — §7.2.
- `src/lib/auth.js` — adicionar guardas por vínculo (incl. `requireLeituraServicoJuntaPorNome`, `requireEscritaServicoJuntaPorNome`, `requireAcessoPessoas`, `requireAdminDeAlgumModulo`); migrar/remover `requireRole` com dupla busca (§5).
- `src/app/api/gerenciamento/usuarios/route.js` — `requireGestor()`.
- `src/app/api/gerenciamento/relatorios/route.js` — `requireAdminDeAlgumModulo()`.
- `src/app/api/admin/metrics/route.js` — `requireAdminDeAlgumModulo()`.
- `src/app/gerenciamento/servicos/actions.js` — `requireAdminModulo(JUNTA)`.
- `src/app/gerenciamento/procedimentos/actions.js` — `requireAdminModulo(REGULACAO)`.
- `src/app/gerenciamento/pessoas/actions.js` — `requireAcessoPessoas()`.
- `src/app/camara-tecnica/farmacia-judicial/actions.js` — guardas por action conforme §10.2 (incl. as 3 hoje desprotegidas).
- `src/app/junta-reguladora/actions.js` — guardas por action/sub-serviço conforme §2.6 (`requireLeituraServicoJuntaPorNome` nas leituras, `requireEscritaServicoJuntaPorNome` nas escritas; filtro de `getEspecialidadesPorServico("")` para OPERADOR).
- `src/app/regulacao/actions.js` — guardas conforme §6.1 (Financeiro + catálogo) **e §6.3** (`createPessoa`/`updatePessoa`/`deletePessoa` → `requireAcessoPessoas()`, hoje sem guarda).
- `src/app/regulacao/page.js` — garantir que `Financeiro` lê a flag do contexto; **reler para verificar se há UI de catálogo embutida** e, se houver, escondê-la ao OPERADOR via `podeGerenciarCatalogo` (Finding 5, §6.2).
- `src/app/regulacao/PermissoesRegulacaoContext.js` — provider agora expõe `{ podeEditarFinanceiro, podeGerenciarCatalogo }` (default `false` para ambos).
- `src/app/regulacao/views/Financeiro.js` — modo somente-leitura por `podeEditarFinanceiro`.
- `src/app/junta-reguladora/page.js` — consumir `usePermissoesJunta()` e bloquear abas de sub-serviço não permitidas.
- `package.json` — (opcional) script `db:backfill`.

**Inalterados (intencional)**
- `src/app/actions/auth.js` (login sem regressão).
- `src/app/acesso-negado/page.js` (mantida, não mais alvo de redirecionamento de módulo).
- `src/lib/prisma.js`, `src/app/layout.js`, `src/components/ClientLayout.jsx`.

---

## 16. Ordem de implementação sugerida

0. **Passo 0 (reconfirmar guias do Next — Finding 1):** rodar `npx next --version` e verificar `node_modules/next/dist/docs/` (em monorepo, resolver o caminho a partir deste `AGENTS.md`). Como o diretório **existe** nesta instalação, ler antes de codar: `01-app/02-guides/authentication.md`, `01-app/03-api-reference/03-file-conventions/{proxy.md,middleware.md,layout.md,route.md}`, `01-app/02-guides/server-actions.md`. Confirmar o rename `middleware→proxy` (§4.1).
1. Schema (enums + `UserAcesso` + relação) → `db:generate` → `db:push`.
2. `prisma/backfill-acessos.js` → rodar → validar vínculos (inclui aviso dos roles incertos).
3. `src/lib/permissions.js` (funções puras + carregamento + guardas + pontes de serviço).
4. `AcessoNegadoModulo` + layouts de módulo e de gerenciamento + providers de permissão.
5. Proxy enxuto (só autenticação) — renomear `middleware.js`→`proxy.js`.
6. Migrar call sites de `requireRole` (FR-7.4 + §10.2 + §2.6 + **§6.3**) e tratar `requireRole` (remover ou wrapper, com dupla busca). **Inclui as 3 escritas de Pessoa da Regulação** (`createPessoa`/`updatePessoa`/`deletePessoa` → `requireAcessoPessoas()`) e a separação leitura/escrita das actions da Junta (`requireLeituraServicoJuntaPorNome` / `requireEscritaServicoJuntaPorNome`).
7. Financeiro somente-leitura (actions + view + flags `podeEditarFinanceiro`/`podeGerenciarCatalogo` no layout; reler `regulacao/page.js` p/ UI de catálogo — Finding 5) e abas da Junta por sub-serviço (incl. filtro de `getEspecialidadesPorServico("")` para OPERADOR — Finding 3).
8. Sidebar sem filtro + `/api/me` com `select` ampliado (`acessos` + `isGestor`).
9. `npm run build` + verificação manual dos cenários da AC-10.

---

## 17. Respostas aos findings da revisão

### 17.A — Revisão 3 (segundo `design-review.json`, veredito CHANGES_REQUESTED)

- **Finding 1 (HIGH — escritas de Pessoa em `regulacao/actions.js` sem guarda):** **Endereçado.** Verificado no código que `createPessoa`/`updatePessoa`/`deletePessoa` não têm `requireRole` hoje. Nova **§6.3** as inventaria em tabela e aplica `requireAcessoPessoas()` (GESTOR ∨ REGULACAO/ADMIN ∨ JUNTA/ADMIN), registrando como endurecimento intencional (buraco simétrico ao da farmácia). Incluídas no Passo 6 da §16 e na entrada `regulacao/actions.js` da §15.
- **Finding 2 (MEDIUM — enforcement por sub-serviço contornável via nome livre + criação on-the-fly):** **Endereçado — Opção (b).** §2.6 separa `requireLeituraServicoJuntaPorNome` (nome não-mapeado → acesso ao módulo) de `requireEscritaServicoJuntaPorNome` (nome não-mapeado → `requireAdminModulo(JUNTA)`). Assim um OPERADOR **nunca** cria/escreve em serviço não controlado via variação de string; o furo fica fechado. A tabela de inventário e o edge case de §12 refletem a separação.
- **Finding 3 (MEDIUM — `getEspecialidadesPorServico("")` vaza especialidades de sub-serviços não vinculados):** **Endereçado.** §2.6 define regra explícita para nome vazio: GESTOR/JUNTA-ADMIN veem tudo; **OPERADOR** tem o `findMany` filtrado aos `servicoId` dos sub-serviços vinculados (derivados de `user.acessos`), retornando `[]` se nenhum. Sem mais "senão `requireAcessoModulo(JUNTA)`" sem ressalva.
- **Finding 4 (MEDIUM — mapa nome→enum frágil a variações):** **Endereçado.** §2.6 adiciona `normalizarNomeServico` (NFD + strip de diacríticos + trim + lower) antes do lookup, fixa a premissa verificável de que as actions por serviço só recebem os nomes canônicos de `MAPA_SERVICOS` (reler `junta-reguladora/page.js` na implementação) e combina com o Finding 2 (escrita não-mapeada exige ADMIN) para eliminar o risco de bypass.
- **Finding 5 (MEDIUM — UI de catálogo p/ OPERADOR na Regulação não especificada):** **Endereçado.** §6.2 adiciona a flag `podeGerenciarCatalogo` (= admin ∨ gestor) ao `RegulacaoPermProvider` e manda esconder/desabilitar a UI de catálogo para OPERADOR, espelhando o enforcement das actions (§6.1). Passo de verificação obrigatório: reler `regulacao/page.js` e documentar se o catálogo existe em `/regulacao` ou só em `/gerenciamento/*`.
- **Finding 6 (NIT — "proxy roda em runtime Node.js" sem respaldo):** **Endereçado.** Removida a afirmação em §4.1 (e na lista de guias da Visão geral); o texto agora diz que o proxy faz **apenas** `jwtVerify` com `jose` (edge-compatible), sem Prisma nem globais, alinhado ao `proxy.md`.
- **Finding 7 (NIT — `/api/me` com `select` restritivo):** **Endereçado.** §7.2 explicita que é preciso **ampliar o `select`** para incluir `acessos: { select: { modulo, nivel, servicoJunta } }` e derivar `isGestor = role === 'GESTOR'`, mantendo `cpf/nome/role/cargo` (NFR-4/AC-16). Mostra o trecho de código.
- **Finding 8 (NIT — `config.matcher` não exclui `/api`; preservar liberação por código):** **Endereçado.** §4.2 explicita que o early-return de rotas públicas (`/login`, `/_next`, `/api`, `/acesso-negado`) é feito **no corpo** e deve ser **preservado**; mostra o esqueleto do `proxy.js` com o bloco intacto; remove-se APENAS `PERMISSOES_ROTAS`, a varredura de rotas e o caso `/regulacao?tab=FINANCEIRO`. `config.matcher` permanece idêntico.

### 17.B — Revisão 2 (primeiro `design-review.json`, histórico)

- **Finding 1 (NIT — guia do Next):** **Endereçado + correção factual.** O diretório `node_modules/next/dist/docs/` **existe** nesta instalação (regenerado pelo `next dev`), ao contrário do que a revisão anterior do design afirmava. Os guias foram efetivamente lidos e incorporados (ver Visão geral). Adicionado **Passo 0** explícito na §16 com reconfirmação e resolução de caminho em monorepo. Bônus derivado da leitura: descoberto o breaking change `middleware→proxy`, tratado na §4.1.
- **Finding 2 (HIGH — createMedicamento/createLoteMedicamento sem guarda):** **Endereçado.** §10.2 adiciona `createMedicamento`, `createLoteMedicamento` **e** `createPacienteJudicial` (também verificada sem guarda) com `requireAdminModulo(FARMACIA)`, registrando que hoje estão desprotegidas e que a busca por `requireRole(` não as detecta.
- **Finding 3 (HIGH — enforcement por sub-serviço da Junta):** **Endereçado.** §2.6 inventaria todas as actions de `junta-reguladora/actions.js`, define o gate de UI por aba (lista de sub-serviços permitidos injetada por `JuntaPermProvider`, bloqueio no conteúdo) e o enforcement server-side por nome (na Revisão 3 desdobrado em `requireLeituraServicoJuntaPorNome`/`requireEscritaServicoJuntaPorNome`). Edge cases em §12.
- **Finding 4 (HIGH — ponte `Servico`↔`ServicoJunta`):** **Endereçado.** §2.6 decide a ponte: a chave de autorização é o **código de subTab** (constante de UI estável), com `SUBTAB_PARA_SERVICO_JUNTA` e, para o servidor, `servicoJuntaDoNome` (nome→enum, cobrindo os nomes que o `MAPA_SERVICOS` produz). Não se usa `servicoId` nem coluna nova; serviços não controlados caem em "acesso ao módulo".
- **Finding 5 (MEDIUM — contrato do `user` nas guardas):** **Endereçado.** §2.2 e §2.4 fixam que o `include` não usa `select` restritivo e que as guardas retornam o `user` **completo** (`{cpf, nome, role, cargo, acessos}`), citando `savePlanejamentoCidade`/`ajustarEstoque`/`registrarDispensacao` que usam `user.nome`.
- **Finding 6 (MEDIUM — escopo do `React.cache`):** **Endereçado.** §3 restringe a afirmação: memoização por render vale para layouts (Server Components); em API routes/actions a query roda direto, com a regra "uma guarda por request". Alinhado ao guia (que mostra `cache()` deduplicando no render pass).
- **Finding 7 (MEDIUM — path `/admin/gerenciamento`):** **Endereçado.** §4.4 e §15 registram que `/admin/gerenciamento` é âncora de menu (verificado: não existe `src/app/admin/`), que a chave a remover do `VISIBILIDADE_MODULO` é `"/admin/gerenciamento"`, que os guards vão nas subrotas reais `/gerenciamento/*` e que **não** se cria layout em `/admin/gerenciamento`.
- **Finding 8 (MEDIUM — provider do Financeiro):** **Endereçado.** §6.2 fecha o contrato: o layout (Server Component) renderiza o `RegulacaoPermProvider` (Client Component) passando `podeEditar` (boolean serializável); `usePermissoesRegulacao()` retorna default `false` sem provider (fail-closed); confirma que `page.js` fica dentro de `children` do layout.
- **Finding 9 (NIT — idempotência NULL):** **Endereçado.** §9.5 mantém `findFirst`+`create` para o backfill single-run e adiciona a nota de que a UI concorrente da Etapa 2 deve usar índice único parcial (`WHERE servico_junta IS NULL`), não copiar o check-then-insert.
- **Finding 10 (NIT — leituras do Financeiro ao OPERADOR):** **Endereçado.** §6.1 marca explicitamente que abrir `getCotasFinanceiras`/`getPlanejamentoCidades` ao OPERADOR é intencional (FR-8), não regressão.
- **Finding 11 (NIT — remoção de `requireRole`):** **Endereçado.** §5 exige dupla busca (`requireRole(` e `requireRole`/`from "@/lib/auth"`) e permite manter `requireRole` como wrapper fino por uma iteração em caso de dúvida.
