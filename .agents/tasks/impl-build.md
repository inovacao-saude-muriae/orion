# Evidência de build — Reorganização de cadastros e visibilidade de menu

## Comando

```
npm run build
```

(cwd: `c:\Users\Jefinny\Documents\orion`)

## Exit code

**0** (sucesso) — Next.js 16.3.0 (Turbopack).

## Resumo do que o build verificou

- `✓ Compiled successfully` + `✓ Finished TypeScript` + 23/23 páginas geradas.
- Nenhum import quebrado após as movimentações da Parte A. Em especial, os
  caminhos relativos novos foram resolvidos:
  - `src/app/regulacao/CadastroProcedimentos.js` → `./procedimentosActions` e
    `./CadastroProcedimentos.module.css`.
  - `src/app/junta-reguladora/CadastroServicos.js` → `./servicosActions` e
    `./CadastroServicos.module.css`.
  - `ProcedimentosTab.js` / `ServicosEspecialidadesTab.js` importando as actions
    e os componentes co-localizados, e o CSS de layout por
    `@/app/gerenciamento/GerenciamentoCadastro.module.css`.
  - `regulacao/page.js` importa `./ProcedimentosTab`; `junta-reguladora/page.js`
    importa `./ServicosEspecialidadesTab`.
- A tabela de rotas confirma que `/gerenciamento/procedimentos` e
  `/gerenciamento/servicos` **não existem mais** (removidas), e `/regulacao` e
  `/junta-reguladora` permanecem.
- `src/components/Sidebar.js` compila com o novo `construirMenu`, `useEffect`
  de fetch de `/api/me`, `useMemo` e os metadados de perfil.

## O que exige verificação em runtime (login por perfil)

O build NÃO exercita a lógica de filtro de menu nem o enforcement das actions.
Verificar manualmente, logando com cada perfil e conferindo o menu filtrado e
as abas movidas:

- **GESTOR:** vê tudo, incluindo aba Procedimentos (Regulação) e aba Serviços e
  Especialidades (Junta); edita ambos.
- **Regulação (admin/operador):** vê módulo Regulação com a aba Procedimentos +
  Gerenciamento com Médicos/UBS/Pacientes. Operador da Regulação visualiza a
  aba Procedimentos, mas as escritas permanecem restritas a ADMIN (actions).
- **Junta admin:** vê módulo Junta com todos os sub-serviços + aba Serviços e
  Especialidades + Prontuário e Relatório + Pacientes; edita serviços.
- **Junta operador CAEE:** vê módulo Junta só com o sub-serviço CAEE + aba
  Serviços e Especialidades + Pacientes, SEM Prontuário e Relatório; edita
  serviços (requireAcessoModulo).
- **Junta operador APAE:** idem, mas só com o sub-serviço APAE.
- **Farmácia:** vê Câmara Técnica (apenas Farmácia Judicial) + Pacientes.
- **CCZ:** vê módulo CCZ (Tutores/Animais) + Pacientes.
- Durante o carregamento de `/api/me` (e em erro/401): só Início +
  Gerenciamento(apenas Pacientes), inclusive para o GESTOR (fail-closed
  intencional).
- Rotas antigas `/gerenciamento/procedimentos` e `/gerenciamento/servicos`
  retornam 404.
