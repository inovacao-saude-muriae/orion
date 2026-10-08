# Requisitos — Orion RBAC Etapa 1 (Fundação de Permissões Configuráveis)

## Resumo

Hoje o controle de acesso do Orion depende de um enum `Role` fixo (um único papel por usuário), com a autorização espalhada em três lugares que repetem a mesma lógica de forma manual: o `middleware.js` (mapa `PERMISSOES_ROTAS` rota→roles, que redireciona para `/acesso-negado`), o `Sidebar.js` (mapas `VISIBILIDADE_MODULO`/`VISIBILIDADE_SUBITEM` que escondem itens do menu) e o `requireRole(...)` em server actions e API routes. Esse modelo não comporta múltiplos acessos por usuário nem granularidade por sub-serviço da Junta, e qualquer mudança exige editar código.

Esta Etapa 1 reformula a **fundação**: um modelo de permissões **em banco de dados**, com granularidade por **módulo** e por **sub-serviço** (da Junta), suportando **múltiplos vínculos por usuário**. GESTOR permanece com acesso total fixo, não dependente de vínculos. A verificação passa a ser **centralizada** em `src/lib/permissions.js`, consumida pela mesma fonte de verdade no middleware (apenas autenticação), nas páginas/layouts (autorização de módulo, com bloqueio **no conteúdo**) e nas server actions/API routes. A Sidebar passa a **mostrar todos os módulos** para todos os usuários; o bloqueio acontece ao entrar no módulo. Inclui a migração de dados dos papéis atuais para vínculos, sem perder usuários nem travar o login.

**NÃO** faz parte desta etapa a tela de administração (CRUD) de permissões — isso é a Etapa 2. A fundação, porém, deve ficar pronta para ela (modelo de dados, funções de leitura e escrita de vínculos passíveis de reuso).

### Glossário / domínio fixado

- **Módulos**: `REGULACAO`, `FARMACIA`, `PROCESSOS`, `JUNTA`, `CCZ`.
- **Níveis**: `ADMIN`, `OPERADOR`.
- **Sub-serviços da Junta** (`servicoJunta`): `CAEE`, `APAE`, `AMBULATORIO`, `ESPECIALIDADES`. Só se aplicam quando `modulo = JUNTA`; nulos para os demais módulos.
- **GESTOR**: acesso total a tudo, fixo, não editável pela interface, independente de vínculos.
- **Vínculo (`UserAcesso`)**: tupla `(userCpf, modulo, nivel, servicoJunta?)` que concede acesso. Um usuário pode ter N vínculos.

> Observação sobre nomenclatura: o enum legado usa `JUNTA_EDUCACAO`, `JUNTA_SAUDE`, `JUNTA_ASSISTENCIA`, enquanto a UI (Sidebar) e os requisitos novos usam `CAEE`, `APAE`, `AMBULATORIO`, `ESPECIALIDADES`. O mapeamento entre os dois está no requisito de migração (FR-9) e é um ponto de atenção para o design.

---

## Requisitos Funcionais

### FR-1 — Modelo de dados de permissões em banco

- **FR-1.1** Deve existir uma tabela nova (ex.: `model UserAcesso`) com, no mínimo: `id`, `userCpf` (FK para `User.cpf`, `onDelete: Cascade`), `modulo`, `nivel`, `servicoJunta` (nullable), `createdAt`. Indexada por `userCpf`.
- **FR-1.2** `modulo`, `nivel` e `servicoJunta` devem ter domínio restrito aos valores do glossário (enums Prisma ou validação equivalente — decisão do design).
- **FR-1.3** `servicoJunta` só pode ser preenchido quando `modulo = JUNTA`; para os demais módulos deve ser nulo.
- **FR-1.4** O enum `Role` legado **permanece** no schema e na coluna `User.role` (compatibilidade e dado de origem da migração). A verificação de acesso **não** depende mais dele.
- **FR-1.5** A condição de GESTOR deve ter uma forma canônica única e não editável pela tela de permissões (Etapa 2). O design escolhe entre: (a) manter `role = GESTOR` como atalho, ou (b) uma flag `isGestor` no `User`. Qualquer que seja, GESTOR **não** depende de registros em `UserAcesso`.

### FR-2 — Camada central de permissões (`src/lib/permissions.js`)

- **FR-2.1** Deve existir um módulo `src/lib/permissions.js` como **única fonte de verdade** da autorização. Ele define as constantes de módulos e sub-serviços e expõe, no mínimo:
  - `usuarioEhGestor(user|cpf)` → boolean.
  - `usuarioTemAcessoModulo(user|cpf, modulo)` → boolean.
  - `usuarioTemAcessoServicoJunta(user|cpf, servicoJunta)` → boolean.
  - `usuarioEhAdminModulo(user|cpf, modulo)` → boolean.
- **FR-2.2** As funções carregam os vínculos do usuário pelo CPF/sessão a partir do banco (ver FR-7 sobre a estratégia). GESTOR retorna sempre `true` em todas as checagens de acesso, sem consultar vínculos.
- **FR-2.3** Middleware, Sidebar (indiretamente, via o que precisar), páginas/layouts e server actions/API routes **consomem esta mesma camada**; nenhuma lógica de autorização nova pode ser duplicada fora dela. Mapas específicos de rota→role (`PERMISSOES_ROTAS`, `VISIBILIDADE_*`) são removidos ou reduzidos ao estritamente necessário para autenticação.

### FR-3 — Regras de acesso por módulo e nível

As regras abaixo são o comportamento esperado por nível. O design deve traduzi-las em verificações concretas por rota/ação.

- **FR-3.1 REGULACAO / ADMIN**: acesso a todo `/regulacao` (incluindo Financeiro **com edição**) + itens de Gerenciamento: Pacientes, Médicos, UBS, Procedimentos.
- **FR-3.2 REGULACAO / OPERADOR**: acesso a todo `/regulacao` **exceto editar** o Financeiro (vê o Financeiro em **somente-leitura**). Sem itens administrativos de Gerenciamento, salvo vínculo próprio para aquele item.
- **FR-3.3 JUNTA / ADMIN**: acesso a todo `/junta-reguladora` + itens de Gerenciamento: Serviços-e-Especialidades e Pacientes.
- **FR-3.4 JUNTA / OPERADOR**: acesso **somente** ao(s) sub-serviço(s) vinculado(s) (um ou mais entre CAEE, APAE, AMBULATORIO, ESPECIALIDADES). Dentro de `/junta-reguladora`, as abas/serviços não vinculados ficam bloqueadas.
- **FR-3.5 FARMACIA / ADMIN** e **PROCESSOS / ADMIN**: acesso ao módulo inteiro correspondente.
- **FR-3.6 FARMACIA / OPERADOR** e **PROCESSOS / OPERADOR**: operação do dia a dia, **sem** telas administrativas / catálogo / configuração. O recorte exato (quais abas/ações são "do dia a dia" vs "administrativas") deve ser **documentado no design** para refino posterior; nesta etapa pode começar restritivo e explícito.
- **FR-3.7 CCZ**: por ora **somente ADMIN** (acesso total a `/ccz`). O design deve **prever** `CCZ / OPERADOR` no modelo (o vínculo pode existir), mas **sem** regra fina definida ainda; documentar que operador de CCZ fica para definição futura.
- **FR-3.8 Itens de Gerenciamento** ficam amarrados aos vínculos de módulo correspondentes (ex.: Médicos/UBS/Procedimentos ⇐ REGULACAO ADMIN; Serviços-e-Especialidades ⇐ JUNTA ADMIN; Pacientes ⇐ REGULACAO ADMIN **ou** JUNTA ADMIN).
- **FR-3.9 Gerenciar Usuários** (`/gerenciamento/usuarios`): **somente GESTOR**.
- **FR-3.10 Relatórios Gerais** (`/gerenciamento/relatorios`) e **Cadastro de Pessoas** (`/gerenciamento/pessoas`): GESTOR + admins de módulo (comportamento equivalente ao atual).

### FR-4 — Sidebar mostra todos os módulos

- **FR-4.1** Remover a filtragem por papel do menu (`VISIBILIDADE_MODULO` e `VISIBILIDADE_SUBITEM`). **Todos** os módulos e sub-itens aparecem para **todos** os usuários autenticados.
- **FR-4.2** A Sidebar não decide mais autorização; apenas navega. O bloqueio ocorre ao abrir o módulo/rota.
- **FR-4.3** A dependência da Sidebar em `/api/me` para obter `role` e esconder itens deixa de ser necessária para esse fim; o design decide se `/api/me` ainda é consumido para outros usos (ex.: nome do usuário).

### FR-5 — Bloqueio no conteúdo (não redirecionar)

- **FR-5.1** Ao abrir um módulo/rota sem permissão, o layout e o menu **continuam visíveis** e, no lugar do conteúdo, é exibida uma **mensagem de acesso negado**.
- **FR-5.2** Deve existir um componente reutilizável de bloqueio (ex.: `src/components/AcessoNegadoModulo.jsx`) usado por todas as páginas de módulo.
- **FR-5.3** O middleware **não** redireciona mais por falta de permissão de **módulo** (remove-se o redirecionamento para `/acesso-negado` baseado em `PERMISSOES_ROTAS`, incluindo o caso especial de `/regulacao?tab=FINANCEIRO`). O middleware continua tratando **autenticação** (ver FR-6).
- **FR-5.4** A divisão de responsabilidades fica: **middleware = autenticação** (há token/sessão válida?); **página/layout = autorização de módulo** (este usuário tem vínculo para este módulo/sub-serviço?). O design define o ponto exato onde a autorização de módulo é aplicada (layout de módulo vs início de cada página) e justifica.

### FR-6 — Autenticação no middleware (preservada)

- **FR-6.1** Sem token/sessão válida, o middleware continua **redirecionando para `/login`** (preservando `redirect`), e limpando cookie inválido/expirado, como hoje.
- **FR-6.2** As rotas públicas atuais (`/login`, `/_next`, `/api`, `/acesso-negado`) continuam liberadas.
- **FR-6.3** O middleware deixa de embutir decisões de autorização de módulo; pode continuar propagando identidade via headers (`x-user-id`, etc.) se o design julgar útil.

### FR-7 — Verificação no servidor e fonte dos vínculos

- **FR-7.1** A autorização é verificada **no servidor** (não confia em filtragem de UI). Toda server action e API route hoje protegida por `requireRole(...)` passa a validar pelos vínculos via a camada central (FR-2).
- **FR-7.2** O design deve **escolher e justificar** entre: (a) embutir um resumo dos acessos no JWT (rápido, mas exige novo login para refletir mudanças) ou (b) consultar o banco por request (sempre atual). Dado que haverá tela de edição de permissões na Etapa 2, a recomendação é **consulta ao banco** (ou cache de curtíssima duração). Se, por simplicidade, o design optar por JWT, deve **documentar explicitamente** que mudar permissões exige novo login. Escolher o caminho de **menor complexidade que seja correto**.
- **FR-7.3** `requireRole` deve ser mantido ou substituído por um equivalente (ex.: `requireAcessoModulo`, `requireAdminModulo`) que use a camada central. Se mantido por compatibilidade, seu interior passa a consultar vínculos. O design decide a assinatura e migra os ~30 pontos de chamada atuais (listados em FR-7.4) de forma coerente.
- **FR-7.4** Pontos de chamada a adaptar (inventário atual de `requireRole`): `api/gerenciamento/usuarios`, `api/gerenciamento/relatorios`, `api/admin/metrics`, `gerenciamento/servicos/actions`, `gerenciamento/procedimentos/actions`, `gerenciamento/pessoas/actions`, `camara-tecnica/farmacia-judicial/actions`, `regulacao/actions`. Nenhum deve ficar sem verificação após a mudança.

### FR-8 — Financeiro da Regulação em somente-leitura para Operador

- **FR-8.1** Em `/regulacao?tab=FINANCEIRO`, usuário com vínculo REGULACAO/OPERADOR (não-admin, não-gestor) vê os dados do Financeiro, mas **não** pode editar: ações de edição ficam ocultas ou desabilitadas na UI.
- **FR-8.2** A proteção não é só visual: as server actions do Financeiro que gravam (ex.: `saveCotaFinanceira`, `savePlanejamentoCidade`, `updateBillingDate`, e os CRUDs de catálogo) exigem **ADMIN de Regulação** (ou GESTOR) via a camada central; leituras do Financeiro ficam permitidas a REGULACAO/OPERADOR.
- **FR-8.3** O design deve enumerar quais ações do Financeiro são de leitura vs escrita e mapear cada uma ao nível exigido.

### FR-9 — Migração de dados (role legado → vínculos), sem perda

- **FR-9.1** Deve haver um script de backfill (Node/seed em `prisma/`) que, para cada `User` existente, cria os vínculos `UserAcesso` conforme o mapeamento abaixo, **sem apagar** usuários nem outros dados.
- **FR-9.2** Mapeamento:
  - `GESTOR` → marcado como gestor (via `role=GESTOR` ou `isGestor`, conforme FR-1.5); **sem** vínculos de módulo necessários.
  - `REGULACAO_ADMIN` → `{REGULACAO, ADMIN}`.
  - `REGULACAO_COMUM` → `{REGULACAO, OPERADOR}`.
  - `FARMACIA_ADMIN` → `{FARMACIA, ADMIN}`.
  - `PROCESSO_ADMIN` → `{PROCESSOS, ADMIN}`.
  - `JUNTA_ADMIN` → `{JUNTA, ADMIN}`.
  - `JUNTA_CAEE` → `{JUNTA, OPERADOR, CAEE}`.
  - `JUNTA_EDUCACAO`, `JUNTA_SAUDE`, `JUNTA_ASSISTENCIA` → mapear para o sub-serviço real mais próximo entre `CAEE`, `APAE`, `AMBULATORIO`, `ESPECIALIDADES`. **Se não houver equivalente claro**, criar vínculo `{JUNTA, OPERADOR}` **sem** `servicoJunta` e deixar comentado para ajuste manual (não inventar correspondência). O design deve propor o melhor mapeamento e marcar explicitamente onde é incerto.
  - `CCZ_ADMIN` → `{CCZ, ADMIN}`.
- **FR-9.3** O backfill deve ser **idempotente** (reexecutar não duplica vínculos) e seguro para rodar sobre a base atual.
- **FR-9.4** A evolução do schema deve preferir `npx prisma db push` + script de backfill a uma migration destrutiva. Nenhum dado existente pode ser apagado.

### FR-10 — Login e `/api/me` ajustados ao novo modelo

- **FR-10.1** `loginAction` continua autenticando por CPF+senha, gerando JWT, salvando `Session` e cookie httpOnly de 8h. O JWT pode manter `cpf` (e, conforme FR-7.2, uma flag `isGestor` e/ou resumo de acessos). O **login deve continuar funcionando** sem regressão.
- **FR-10.2** `/api/me` deve refletir o novo modelo quando necessário (ex.: expor `isGestor` e/ou os vínculos/acessos do usuário, se consumidos pelo front). Não deve quebrar os consumidores atuais (`Sidebar` espera `data.user.role`); o design define o contrato de resposta e a compatibilidade.

---

## Requisitos Não-Funcionais

- **NFR-1 (Segurança)** A autorização efetiva é sempre verificada no servidor; a UI pode esconder/desabilitar, mas nunca é a única barreira. Nenhuma rota protegida pode ficar sem verificação após a migração.
- **NFR-2 (Correção vs simplicidade)** Preferir a solução correta de menor complexidade. Se escolher JWT com resumo de acessos, documentar o trade-off (precisa relogar) de forma visível.
- **NFR-3 (Desempenho)** Se a verificação consultar o banco por request, limitar o custo (query indexada por `userCpf`, e/ou cache curto por request/sessão) para não degradar navegação.
- **NFR-4 (Compatibilidade)** Não quebrar login, `/api/me`, nem as páginas existentes durante a transição. O enum `Role` permanece disponível para legado.
- **NFR-5 (Extensibilidade p/ Etapa 2)** O modelo e as funções de leitura/escrita de vínculos devem ser reutilizáveis pela futura tela de administração (CRUD de `UserAcesso`), sem redesenho.
- **NFR-6 (Idioma)** Todo código novo, mensagens de UI, comentários e textos em **português**.
- **NFR-7 (Convenções Next.js desta versão)** Antes de implementar, consultar os guias em `node_modules/next/dist/docs/` desta instalação (App Router, middleware, server actions) — esta versão pode divergir do conhecimento prévio.

---

## Critérios de Aceitação

1. Existe a tabela `UserAcesso` (ou equivalente) com `userCpf` (FK Cascade), `modulo`, `nivel`, `servicoJunta?`, `createdAt`, índice por `userCpf`, e `servicoJunta` só é preenchido quando `modulo = JUNTA`.
2. O enum `Role` continua existindo no schema; a coluna `User.role` permanece populada; a autorização não depende mais de `role` (exceto o atalho de GESTOR, se o design escolher `role=GESTOR`).
3. GESTOR acessa qualquer módulo/rota/ação sem possuir vínculos; a condição de GESTOR tem forma canônica única e não editável pela UI.
4. `src/lib/permissions.js` existe e expõe `usuarioEhGestor`, `usuarioTemAcessoModulo`, `usuarioTemAcessoServicoJunta`, `usuarioEhAdminModulo`, lendo vínculos pelo CPF/sessão.
5. Middleware, páginas/layouts e server actions/API routes usam exclusivamente a camada central; não há mais mapas `PERMISSOES_ROTAS`/`VISIBILIDADE_MODULO`/`VISIBILIDADE_SUBITEM` decidindo autorização.
6. A Sidebar exibe **todos** os módulos e sub-itens para qualquer usuário autenticado (sem filtro por papel).
7. Ao acessar um módulo sem vínculo, o usuário vê o layout + menu normais e, no lugar do conteúdo, o componente `AcessoNegadoModulo` (ou equivalente); **não** há redirecionamento.
8. O middleware **não** redireciona por falta de permissão de módulo (inclusive o caso `/regulacao?tab=FINANCEIRO` deixa de redirecionar); mas sem token/sessão válida continua redirecionando para `/login` e limpando cookie inválido.
9. REGULACAO/OPERADOR abre o Financeiro em somente-leitura: controles de edição ocultos/desabilitados **e** as server actions de escrita do Financeiro recusam a operação para operador (apenas ADMIN/GESTOR gravam).
10. Para cada combinação (módulo, nível) de FR-3, um usuário com o vínculo correspondente acessa o que a regra permite e é bloqueado (no conteúdo) no que a regra nega — verificável pelos cenários:
    - REGULACAO/ADMIN: acessa `/regulacao` + Financeiro editável + Gerenciamento Pacientes/Médicos/UBS/Procedimentos.
    - REGULACAO/OPERADOR: acessa `/regulacao`, Financeiro só-leitura, sem itens admin de Gerenciamento (salvo vínculo próprio).
    - JUNTA/ADMIN: acessa `/junta-reguladora` + Gerenciamento Serviços-e-Especialidades/Pacientes.
    - JUNTA/OPERADOR com vínculo só CAEE: acessa CAEE e é bloqueado em APAE/AMBULATORIO/ESPECIALIDADES.
    - FARMACIA/ADMIN e PROCESSOS/ADMIN: acessam o módulo inteiro; OPERADOR fica fora das telas administrativas conforme recorte documentado.
    - CCZ/ADMIN: acessa `/ccz` por completo.
11. `Gerenciar Usuários` só é acessível a GESTOR; `Relatórios Gerais` e `Cadastro de Pessoas` acessíveis a GESTOR + admins de módulo.
12. Todos os pontos listados em FR-7.4 continuam protegidos após a migração (nenhum `requireRole` removido sem substituto equivalente baseado em vínculos).
13. O script de backfill cria os vínculos conforme FR-9.2, é idempotente (segunda execução não duplica), não apaga dados, e roda via `prisma db push` + script (sem migration destrutiva).
14. Após o backfill, usuários pré-existentes conseguem logar normalmente e acessam exatamente os módulos equivalentes ao seu papel legado.
15. O design documenta: a escolha JWT-vs-banco (com justificativa), o recorte OPERADOR de FARMACIA/PROCESSOS, o mapeamento incerto de `JUNTA_EDUCACAO/SAUDE/ASSISTENCIA`, e a forma canônica de GESTOR.
16. `loginAction` e `/api/me` seguem funcionando sem regressão para os consumidores atuais.

---

## Fora de Escopo (Etapa 2 e além)

- **Tela de administração de permissões** (CRUD de `UserAcesso`): criar/editar/remover vínculos, atribuir módulos/sub-serviços pela interface, conceder a um usuário acesso a módulos adicionais. Esta etapa apenas **prepara** o modelo e as funções para isso.
- Regra fina de **CCZ / OPERADOR** (fica apenas previsto no modelo, sem comportamento definido).
- Definição detalhada e refinada do recorte OPERADOR de FARMACIA e PROCESSOS além do recorte inicial documentado.
- Auditoria/log de alterações de permissões, histórico de concessões.
- Qualquer alteração visual/funcional dos módulos além do bloqueio de conteúdo e do modo somente-leitura do Financeiro.

---

## Premissas e observações

- **Premissa (A1):** os sub-serviços da Junta usados na UI são exatamente `CAEE`, `APAE`, `AMBULATORIO`, `ESPECIALIDADES` (confirmado em `Sidebar.js`). O enum legado (`JUNTA_EDUCACAO/SAUDE/ASSISTENCIA`) não tem correspondência 1:1 óbvia — o mapeamento de migração é um ponto a validar no design/implantação (FR-9.2).
- **Premissa (A2):** "Pacientes" em Gerenciamento (`/gerenciamento/pessoas`) é compartilhado entre Regulação e Junta; admins de ambos os módulos devem acessá-lo (coerente com o comportamento atual de `pessoas`).
- **Premissa (A3):** as páginas de módulo são client components que leem a aba por `searchParams`; por isso o bloqueio de conteúdo tende a precisar de um gate server-side (layout de módulo ou wrapper que lê a sessão) — decisão de arquitetura a cargo do design.
- **Premissa (A4):** manter 8h de sessão e o fluxo de cookie atual; a recomendação de "consulta ao banco por request" (FR-7.2) é compatível com isso e evita o problema de permissões obsoletas no token para a Etapa 2.
