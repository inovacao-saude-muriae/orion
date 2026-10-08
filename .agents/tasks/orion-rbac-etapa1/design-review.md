# Design Review — Orion RBAC Etapa 1 (revisão independente do `design.md` Rev 3)

Revisor: subagente de design review (sem o contexto que produziu o documento).
Documento revisado: `.agents/tasks/orion-rbac-etapa1/design.md` (Revisão 3).
Requisitos: `.agents/tasks/orion-rbac-etapa1/requisitos.md`.
Método: cada afirmação do design sobre o código-fonte foi relida no repositório. Veredito mecânico: `> 0` findings HIGH/MEDIUM ⇒ CHANGES_REQUESTED.

---

## Veredito

**CHANGES_REQUESTED** — 0 HIGH, 2 MEDIUM, 4 NIT.

O design está maduro e, em geral, bem ancorado no código real (ver "Suposições Verificadas"). As duas pendências MEDIUM são **lacunas de especificação** que travariam a implementação de dois pontos de enforcement por sub-serviço da Junta (um fluxo de filtragem por `servicoId` descrito mas sem caminho concreto, e um `delete` de agendamento que fica fora do recorte por sub-serviço contrariando FR-3.4/AC-10). Nenhuma suposição central (modelagem Prisma, assinaturas de `permissions.js`, decisão JWT-vs-banco, divisão proxy/layout, migração) está errada.

---

## Findings

### 1. MEDIUM — Filtragem de `getEspecialidadesPorServico("")` para OPERADOR é descrita sem caminho de implementação concreto

**Onde:** §2.6, bloco "Tratamento de `getEspecialidadesPorServico` com nome vazio (Finding 3)".

**Problema:** o design decide que, para JUNTA/OPERADOR com nome vazio, o `findMany` deve ser restrito aos `servicoId` dos sub-serviços vinculados: *"A action resolve a lista de nomes/ids permitidos (via `subServicosPermitidos` traduzidos para nomes de `MAPA_SERVICOS` ou via join por `ServicoJunta`) e aplica `where: { servicoId: { in: idsPermitidos } }`"*. Mas o modelo de dados **não tem** ligação entre `Servico` (nome livre, verificado em `prisma/schema.prisma`) e o enum `ServicoJunta`. O vínculo `UserAcesso` guarda o enum (`CAEE`...), não um `servicoId`. Para chegar aos `servicoId` é preciso: enum → nome canônico (`SERVICOS_JUNTA.AMBULATORIO` → `"Ambulatório"`) → `prisma.servico.findMany({ where: { nome: { in/equals, mode: insensitive } } })` → coletar ids. O design cita as duas alternativas ("via nomes" ou "via join por `ServicoJunta`") **sem escolher uma**, e a segunda ("join por `ServicoJunta`") **não existe** no schema (não há coluna/relação `ServicoJunta` em `Servico`). Isso é ambíguo ("X ou Y") e uma das opções é inviável como descrita.

**Fix concreto:** fixar o caminho único enum→nome→id e documentar o mapa inverso em `permissions.js`:

```js
// permissions.js — inverso de NOME_SERVICO_PARA_ENUM, nomes canônicos de MAPA_SERVICOS.
export const SERVICO_JUNTA_PARA_NOME = {
  CAEE: "CAEE",
  APAE: "APAE",
  AMBULATORIO: "Ambulatório",
  ESPECIALIDADES: "Centro de Especialidades",
};
```

E, dentro da action (quando `servicoNome` vazio e usuário é JUNTA/OPERADOR, não admin/gestor):

```js
const nomes = user.acessos
  .filter(a => a.modulo === "JUNTA" && a.nivel === "OPERADOR" && a.servicoJunta)
  .map(a => SERVICO_JUNTA_PARA_NOME[a.servicoJunta])
  .filter(Boolean);
if (nomes.length === 0) return []; // operador sem sub-serviço
const servicos = await prisma.servico.findMany({
  where: { nome: { in: nomes, mode: "insensitive" } }, select: { id: true },
});
const idsPermitidos = servicos.map(s => s.id);
const especialidades = await prisma.especialidade.findMany({
  where: { servicoId: { in: idsPermitidos } }, include: { servico: true }, orderBy: { nome: "asc" },
});
```

Remover a alternativa "via join por `ServicoJunta`" (não existe no modelo desta etapa).

---

### 2. MEDIUM — `excluirAgendamentoJunta(id)` fica fora do recorte por sub-serviço, contrariando FR-3.4 / AC-10

**Onde:** §2.6, tabela de inventário das actions da Junta, linha `excluirAgendamentoJunta(id)` → guarda `requireAcessoModulo(JUNTA)` ("refino futuro: resolver o serviço pelo id antes de excluir").

**Problema:** FR-3.4 e o cenário de AC-10 ("JUNTA/OPERADOR com vínculo só CAEE: acessa CAEE e é bloqueado em APAE/AMBULATORIO/ESPECIALIDADES") exigem bloqueio **efetivo no servidor** por sub-serviço. Verificado em `junta-reguladora/actions.js`: `excluirAgendamentoJunta` apaga por `id` sem resolver o serviço. Com a guarda proposta (`requireAcessoModulo(JUNTA)`), um OPERADOR só-CAEE consegue **excluir um agendamento de APAE/Ambulatório/Especialidades** — operação de escrita destrutiva que viola o recorte. Jogar isso para "refino futuro" deixa um buraco de escrita por sub-serviço **nesta etapa**, exatamente o que FR-3.4/NFR-1/AC-10 vedam. É assimétrico com a decisão (correta) de §2.6 de endurecer `registrarAtendimentoServico`/`criarAgendamentoJunta`.

**Fix concreto:** resolver o serviço pelo `id` do agendamento **antes** de excluir e aplicar a guarda de escrita por sub-serviço (o `id` já está disponível; a resolução é uma query a mais):

```js
export async function excluirAgendamentoJunta(id) {
  const agId = Number(id);
  if (!agId) return { success: false, error: "Agendamento inválido." };
  const ag = await prisma.agendamentoJunta.findUnique({
    where: { id: agId }, include: { servico: true },
  });
  if (!ag) return { success: false, error: "Agendamento não encontrado." };
  await requireEscritaServicoJuntaPorNome(ag.servico?.nome); // nome não-mapeado → requireAdminModulo(JUNTA)
  await prisma.agendamentoJunta.delete({ where: { id: agId } });
  return { success: true };
}
```

Atualizar a linha correspondente na tabela de inventário da §2.6 para `requireEscritaServicoJuntaPorNome` (após resolver o nome) em vez de `requireAcessoModulo(JUNTA)`.

---

### 3. NIT — A "correção factual" do Finding 6 (Rev 3) é ela mesma imprecisa sobre `proxy.md`

**Onde:** §4.1 e a lista de guias da "Visão geral" ("o `proxy.md` **não** garante runtime Node.js — ao contrário, descreve o proxy como potencialmente deployado em CDN").

**Problema:** o `proxy.md` desta instalação (lido: `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md`) diz **as duas coisas**: na seção *Runtime*, "**Proxy defaults to using the Node.js runtime**" e no changelog "`v16.0.0` — Proxy defaults to the Node.js runtime"; e separadamente adverte que o proxy "pode ser deployado na CDN... não dependa de módulos compartilhados/globais". Logo, afirmar que o doc "não garante Node.js — ao contrário" inverte a ênfase: o default **é** Node.js em Next 16. A conclusão prática do design (o proxy faz **apenas** `jwtVerify` com `jose`, sem Prisma nem globais) permanece correta e segura, então isto não altera nenhuma decisão.

**Fix concreto:** reescrever a frase para refletir o doc: "o `proxy.md` indica que o Proxy usa o runtime Node.js por padrão no Next 16, mas adverte explicitamente que ele pode rodar fora do runtime principal (ex.: CDN) e que não se deve depender de módulos/globais compartilhados; por isso mantemos o proxy restrito a `jwtVerify` com `jose`, sem Prisma nem estado global." Mantém a decisão, corrige o fato.

---

### 4. NIT — `getPacientesPorServico` casa por `OR: [equals, contains]`, mas a autorização chaveia pelo nome exato — documentar que a guarda usa o nome passado, não o serviço resolvido

**Onde:** §2.6 (guarda `requireLeituraServicoJuntaPorNome`) + §12 (edge cases).

**Problema:** verificado em `junta-reguladora/actions.js`, `getPacientesPorServico` resolve o serviço com `where: { OR: [{ nome: { equals } }, { nome: { contains } }] }`. A guarda proposta traduz o **nome recebido** (`servicoJuntaDoNome(servicoNome)`) para o enum e autoriza por ele — o que é correto —, mas há um descasamento conceitual não documentado: a autorização decide sobre o *nome passado* enquanto a query pode resolver, por `contains`, um `Servico` **diferente** cujo nome contém o termo. Na prática a página só envia os nomes canônicos de `MAPA_SERVICOS` (premissa já fixada no design), então o risco é teórico; mas convém registrar que a chave de autorização é o nome canônico recebido e que a resolução por `contains` não amplia o acesso (a guarda roda antes e sobre o nome, não sobre o resultado do `findFirst`).

**Fix concreto:** acrescentar uma frase na §2.6/§12: "A guarda autoriza sobre o `servicoNome` recebido (canônico de `MAPA_SERVICOS`), antes da resolução por `OR/contains`; como a UI só envia nomes canônicos, a busca `contains` não concede acesso a sub-serviço fora do vínculo. Caso a implementação queira blindar contra chamadas fora da UI, trocar o `OR/contains` por `equals` na resolução por nome das actions por serviço."

---

### 5. NIT — Guarda "pessoas" (`requireAcessoPessoas`) referenciada em três lugares mas sem corpo definido

**Onde:** §5 (bloco `requireAcessoPessoas() { // GESTOR ∨ REGULACAO/ADMIN ∨ JUNTA/ADMIN }`), §6.3 e tabela da §5.

**Problema:** a assinatura aparece com o corpo apenas em comentário (`// GESTOR ∨ ...`). As outras guardas (`requireAcessoModulo`, `requireAdminModulo`...) têm semântica derivada direto de uma função de `permissions.js`; `requireAcessoPessoas` é uma composição (OU de três condições) sem função correspondente em `permissions.js` nem pseudocódigo. Como é reutilizada por `/gerenciamento/pessoas/actions.js`, pelo layout de `/gerenciamento/pessoas` e pelas 3 escritas de Pessoa da Regulação (§6.3), vale especificar para não divergir entre call sites.

**Fix concreto:** definir o corpo explicitamente:

```js
export async function requireAcessoPessoas() {
  const user = await carregarUsuarioSessao(); // valida sessão; 401 se ausente
  const ok =
    (await usuarioEhGestor(user)) ||
    (await usuarioEhAdminModulo(user, MODULOS.REGULACAO)) ||
    (await usuarioEhAdminModulo(user, MODULOS.JUNTA));
  if (!ok) throw Object.assign(new Error("Acesso negado."), { status: 403 });
  return user;
}
```

---

### 6. NIT — Inventário FR-7.4 cita `camara-tecnica/farmacia-judicial` e `regulacao` com "ver §X", mas a tabela da §5 não lista `api/admin/metrics` com a verificação de que o guard legado cobre o mesmo conjunto

**Onde:** §5, tabela de migração; FR-7.4 (inventário).

**Problema:** menor — a entrada `api/admin/metrics` migra `requireRole(ROLES_GERENCIAIS)` → `requireAdminDeAlgumModulo()`. `ROLES_GERENCIAIS` não foi relido/listado no design para confirmar que `requireAdminDeAlgumModulo()` (GESTOR ∨ admin de qualquer módulo) cobre exatamente o mesmo conjunto que o array legado (p.ex. se `ROLES_GERENCIAIS` incluía `REGULACAO_COMUM`, haveria mudança de comportamento não documentada). Os demais call sites têm o array legado citado; este não.

**Fix concreto:** na implementação, reler `src/app/api/admin/metrics/route.js` e `src/app/api/gerenciamento/relatorios/route.js` para confirmar o conteúdo de `ROLES_GERENCIAIS`/`ROLES_ADMIN...`; se incluírem algum papel **não-admin** (ex.: `REGULACAO_COMUM`), documentar a mudança de comportamento ou ajustar a guarda. Adicionar a nota de verificação à §5.

---

## Suposições Verificadas (relidas no código)

1. **`requireRole` (assinatura e comportamento)** — `src/lib/auth.js`: valida `Session`+`expiresAt`+`user.ativo`, lança `{status:401|403}`, retorna `session.user`. Confere com §2.4/§5 (guardas novas espelham o padrão e retornam `user` completo). ✔
2. **Enum `Role` legado e `User.cpf` PK** — `prisma/schema.prisma`: `enum Role` com `GESTOR, REGULACAO_ADMIN, REGULACAO_COMUM, FARMACIA_ADMIN, PROCESSO_ADMIN, JUNTA_ADMIN, JUNTA_CAEE, JUNTA_EDUCACAO, JUNTA_SAUDE, JUNTA_ASSISTENCIA, CCZ_ADMIN`; `User.cpf String @id @db.VarChar(11)`; `Session` existe. Confere com §1.2/§1.3 (relação `acessos` em `User`, FK `userCpf` → `User.cpf` Cascade). ✔
3. **`Servico.nome` é String `@unique` livre, sem enum/coluna ligando a `CAEE/APAE/...`** — confirma a necessidade da ponte da §2.6 (chave de autorização = código de subTab / nome canônico, não `servicoId`). ✔
4. **Actions da Junta não têm `requireRole` hoje, operam por `servicoNome`, criam `Servico` on-the-fly** — `junta-reguladora/actions.js`: `cadastrarPacienteJunta`, `registrarAtendimentoServico`, `resolverServicoIdPorNome`, `criarAgendamentoJunta` criam serviço quando o nome não existe; `getPacientesPorServico`/`getAgendamentos*` resolvem por nome. Confere com §2.6 (Findings 2/3/4). ✔
5. **`getEspecialidadesPorServico("")` retorna TODAS** — com nome vazio faz `where: {}`. Confere com o diagnóstico do Finding 3 do design. ✔
6. **`MAPA_SERVICOS` produz exatamente os nomes que `NOME_SERVICO_PARA_ENUM` espera** — `junta-reguladora/page.js`: `CAEE:"CAEE"`, `APAE:"APAE"`, `AMBULATORIO:"Ambulatório"`, `ESPECIALIDADES:"Centro de Especialidades"` (+ extras `EDUCACAO/SOCIAL/REABILITACAO` sem entrada no menu). A normalização NFD (§2.6) cobre "Ambulatório"→"ambulatorio" e "Centro de Especialidades"→"centro de especialidades". ✔
7. **`createPessoa`/`updatePessoa`/`deletePessoa` em `regulacao/actions.js` NÃO têm guarda** — linhas 392/811/828; `savePlanejamentoCidade` captura `user` de `requireRole` e usa `user.nome` em `updatedBy`. Confere com §6.3 (Finding 1) e §2.2 (contrato do `user` completo). ✔
8. **Financeiro/catálogo da Regulação** — `getCotasFinanceiras`/`getPlanejamentoCidades`/`saveCotaFinanceira`/`savePlanejamentoCidade`/`updateBillingDate` e CRUDs de médico/UBS/procedimento usam `requireRole(["GESTOR","REGULACAO_ADMIN"])`. Confere com §6.1. ✔
9. **Farmácia: `createPacienteJudicial`/`createMedicamento`/`createLoteMedicamento` SEM guarda; `updateMedicamento`/`deleteMedicamento`/`updateLoteMedicamento`/`ajustarEstoque`/`registrarDispensacao` COM `requireRole(["GESTOR","FARMACIA_ADMIN"])`** — `ajustarEstoque` captura `session`, `registrarDispensacao` captura `usuario` (usam `.nome`). Confere com §10.2 e §2.2. ✔
10. **`/api/me`** — `src/app/api/me/route.js`: `select: {cpf, nome, role, cargo}` (sem `acessos`); resposta `{ user: { id, nomeCompleto, cpf, role, cargo } }`. Confere com §7.2 (precisa ampliar `select` e adicionar `isGestor`/`acessos`, mantendo `role`). ✔
11. **Sidebar** — `src/components/Sidebar.js`: `VISIBILIDADE_MODULO` (inclui chave `/admin/gerenciamento`), `VISIBILIDADE_SUBITEM`, `fetch("/api/me")` só para obter `role`, item "Gerenciamento" com `path:"/admin/gerenciamento"`. Confere com §4.4/§7.1 (Finding 7). ✔
12. **`/admin/gerenciamento` é âncora de menu — não existe `src/app/admin/`** — `file_search` por `src/app/admin/` retornou vazio. Confere com §4.4/§15 (não criar layout lá). ✔
13. **Páginas de módulo são client components** — `regulacao/page.js` e `junta-reguladora/page.js` começam com `"use client"`. Confere com A3/§4.3 (gate server-side via `layout.js`) e a regra "Client Components não importam a DAL". ✔
14. **`middleware.js` atual** — `src/middleware.js`: libera rotas públicas no corpo (`/login`, `/_next`, `/api`, `/acesso-negado`); `config.matcher = ["/((?!_next/static|_next/image|favicon.ico|img).*)"]` (não exclui `/api`); contém `PERMISSOES_ROTAS`, varredura `rotasOrdenadas`, caso especial `/regulacao?tab=FINANCEIRO`, redirect a `/acesso-negado`, headers `x-user-*`. Confere com §4.2 (preservar early-return — Finding 8 — e remover só a autorização de módulo). ✔
15. **Diretório de docs do Next existe** — `node_modules/next/dist/docs/01-app/02-guides/authentication.md`, `.../03-file-conventions/{proxy.md,middleware.md}` presentes; `generate-agent-files.js` presente (coerente com o AGENTS.md). ✔
16. **Breaking change `middleware`→`proxy`** — `middleware.md`: "deprecated in Next.js 16 and renamed to `proxy.js`"; codemod `npx @next/codemod@canary middleware-to-proxy .`; API idêntica. Confere com §4.1. ✔
17. **Padrão DAL do guia** — `authentication.md`: `import 'server-only'`, `cache()`, "Creating a Data Access Layer (DAL)", "Proxy... should not be your only line of defense... as close as possible to your data source". Confere com §2.2/§3/§4 (consulta ao banco por request, memoização por render, autorização perto dos dados). ✔
18. **Versões travadas** — `next 16.3.0`, `prisma 7.9.1` (lidos de `node_modules/*/package.json`). Confere com a stack travada da Visão geral. ✔
19. **`pessoas/actions.js`** — todas as mutações e `listarUbs` usam `requireRole(ROLES_CADASTRO)`. Confere com §5 (→ `requireAcessoPessoas`). ✔

## Suposições Não-Verificadas / Incorretas

- **INCORRETA (impacto nulo na decisão):** a afirmação de §4.1 de que o `proxy.md` "não garante runtime Node.js — ao contrário". O doc diz que o Proxy **usa Node.js por padrão** no Next 16, embora também advirta sobre CDN/globais. Ver Finding 3 (NIT). A decisão de arquitetura (proxy só `jwtVerify`) continua correta.
- **NÃO-VERIFICADO:** conteúdo exato de `ROLES_GERENCIAIS`/`ROLES_ADMIN...` em `api/admin/metrics` e `api/gerenciamento/relatorios` — necessário para confirmar que `requireAdminDeAlgumModulo()` cobre o mesmo conjunto (Finding 6, NIT).
- **NÃO-VERIFICADO (reconhecido pelo próprio design como passo de implementação):** existência de UI de catálogo embutida em `/regulacao` (Finding 5 do design, §6.2) — o design já exige reler `regulacao/page.js` na implementação; aceitável como passo documentado, não é lacuna de design.
- **NÃO-VERIFICADO:** corpo/semântica de `savePlanejamentoCidade` além do uso de `user.nome` (não necessário para o review; o uso de `user.nome` foi confirmado).
