const { readFileSync } = require('node:fs');
const assert = require('node:assert/strict');
const { test } = require('node:test');
function load(path, names, deps) {
  const source = readFileSync(path, 'utf8').replace(/^import .*;\r?$/gm, '').replace(/export async function/g, 'async function');
  return new Function(...Object.keys(deps), source + '\nreturn {' + names.join(',') + '};')(...Object.values(deps));
}
const quiet = { error() {} };
test('sessões ausentes, expiradas, inativas e perfis indevidos são rejeitados', async () => {
  let session;
  const { requireRole } = load('src/lib/auth.js', ['requireRole'], {
    cookies: async () => ({get: () => ({value: 'token'})}),
    prisma: {session: {findUnique: async () => session}},
  });
  for (const value of [null, {user: {ativo: false}, expiresAt: new Date(Date.now()+60000)}, {user: {ativo: true}, expiresAt: new Date(0)}]) {
    session = value;
    await assert.rejects(() => requireRole(['GESTOR']), {status: 401});
  }
  session = {user: {ativo: true, role: 'REGULACAO_COMUM'}, expiresAt: new Date(Date.now()+60000)};
  await assert.rejects(() => requireRole(['GESTOR']), {status: 403});
  session.user.role = 'GESTOR';
  assert.equal((await requireRole(['GESTOR'])).role, 'GESTOR');
});
test('operador não altera tetos nem consulta cotas', async () => {
  const actions = load('src/app/regulacao/actions.js', ['saveCotaFinanceira','getCotasFinanceiras'], {
    requireRole: async () => {throw new Error('Acesso negado');}, prisma: {}, revalidatePath() {}, console: quiet,
  });
  assert.equal((await actions.saveCotaFinanceira({})).success, false);
  assert.deepEqual(await actions.getCotasFinanceiras(), []);
});
test('dispensação agrega lotes e recusa saldo insuficiente ou quantidade inválida', async () => {
  let writes = [];
  const tx = {
    $queryRaw: async () => [{qtdInicial: 10}],
    dispensacaoMedicamento: {
      aggregate: async () => ({_sum: {qtdEntregue: 2}}),
      create: async ({data}) => writes.push(data),
    },
  };
  const { registrarDispensacao } = load('src/app/camara-tecnica/farmacia-judicial/actions.js', ['registrarDispensacao'], {
    requireRole: async () => {}, prisma: {$transaction: async (fn, options) => {assert.equal(options.isolationLevel,'ReadCommitted'); return fn(tx);}},
    revalidatePath() {}, console: quiet,
  });
  for (const quantities of [[5,5], [0], [-1], [1.5]]) {
    const result = await registrarDispensacao({itens: quantities.map(q => ({loteId: 1, qtdEntregue: q}))});
    assert.equal(result.success,false);
    assert.equal(writes.length,0);
  }
  const result = await registrarDispensacao({numeroPasta: '1', itens: [{loteId: 1,qtdEntregue: 3},{loteId: 1,qtdEntregue: 5}]});
  assert.equal(result.success,true);
  assert.equal(writes.length,1);
  assert.equal(writes[0].qtdEntregue,8);
});
test('API de usuários exige gestor e aceita os perfis atuais', async () => {
  let allowed = false;
  const {POST} = load('src/app/api/admin/usuarios/route.js', ['POST'], {
    Role: {GESTOR:'GESTOR',REGULACAO_COMUM:'REGULACAO_COMUM'},
    requireRole: async roles => {assert.deepEqual(roles,['GESTOR']); if(!allowed) throw Object.assign(new Error('Acesso negado'),{status:403});},
    prisma: {user: {upsert: async ({create}) => create}}, bcrypt: {hash: async () => 'hash'},
    NextResponse: {json: (body,options) => ({body,...options})}, console: quiet,
  });
  const request = {json: async () => ({cpf:'12345678901',senha:'teste',role:'REGULACAO_COMUM'})};
  assert.equal((await POST(request)).status,403);
  allowed = true;
  assert.equal((await POST(request)).status,201);
});
test('relatórios retornam 401 antes de consultar dados com sessão inválida', async () => {
  const {GET} = load('src/app/api/admin/relatorios/route.js', ['GET'], {
    requireRole: async () => {throw Object.assign(new Error('Expirada'),{status:401});},
    prisma: {}, NextResponse: {json: (body,options) => ({body,...options})}, console: quiet,
  });
  assert.equal((await GET()).status,401);
});
