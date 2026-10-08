import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import {
  MODULOS,
  usuarioEhGestor,
  usuarioTemAcessoModulo,
  usuarioEhAdminModulo,
  usuarioTemAcessoServicoJunta,
  usuarioEhAdminDeAlgumModulo,
  servicoJuntaDoNome,
} from "@/lib/permissions";

// Valida a sessão como requireRole faz hoje (consulta Session + expiresAt) e
// retorna o `user` COMPLETO com os vínculos (cpf/nome/role/cargo/acessos).
// Lança {status:401} quando ausente/inválida/expirada.
async function carregarUsuarioSessao() {
  const token = (await cookies()).get("session_token")?.value;
  const session = token
    ? await prisma.session.findUnique({
        where: { token },
        include: { user: { include: { acessos: true } } },
      })
    : null;
  if (!session?.user?.ativo || !session.expiresAt || new Date(session.expiresAt) <= new Date()) {
    throw Object.assign(new Error("Sessão inválida ou expirada."), { status: 401 });
  }
  return session.user;
}

export async function requireRole(roles) {
  const token = (await cookies()).get("session_token")?.value;
  const session = token
    ? await prisma.session.findUnique({ where: { token }, include: { user: true } })
    : null;
  if (!session?.user?.ativo || !session.expiresAt || new Date(session.expiresAt) <= new Date()) {
    throw Object.assign(new Error("Sessão inválida ou expirada."), { status: 401 });
  }
  if (!roles.includes(session.user.role)) {
    throw Object.assign(new Error("Acesso negado."), { status: 403 });
  }
  return session.user;
}

// ═══════════════════════════════════════════════════════════════════════════
// GUARDAS POR VÍNCULO (RBAC Etapa 1) — reusam src/lib/permissions.js.
// Cada guarda valida a sessão (401 se ausente/expirada), aplica a função de
// decisão e lança {status:403} ou retorna o user completo (com acessos).
// ═══════════════════════════════════════════════════════════════════════════

export async function requireAcessoModulo(modulo) {
  const user = await carregarUsuarioSessao();
  if (!(await usuarioTemAcessoModulo(user, modulo))) {
    throw Object.assign(new Error("Acesso negado ao módulo."), { status: 403 });
  }
  return user;
}

export async function requireAdminModulo(modulo) {
  const user = await carregarUsuarioSessao();
  if (!(await usuarioEhAdminModulo(user, modulo))) {
    throw Object.assign(new Error("Acesso negado: requer administrador do módulo."), { status: 403 });
  }
  return user;
}

export async function requireGestor() {
  const user = await carregarUsuarioSessao();
  if (!(await usuarioEhGestor(user))) {
    throw Object.assign(new Error("Acesso negado: requer Gestor."), { status: 403 });
  }
  return user;
}

export async function requireAcessoServicoJunta(servicoJunta) {
  const user = await carregarUsuarioSessao();
  if (!(await usuarioTemAcessoServicoJunta(user, servicoJunta))) {
    throw Object.assign(new Error("Acesso negado ao serviço da Junta."), { status: 403 });
  }
  return user;
}

export async function requireAdminDeAlgumModulo() {
  const user = await carregarUsuarioSessao();
  if (!(await usuarioEhAdminDeAlgumModulo(user))) {
    throw Object.assign(new Error("Acesso negado: requer administrador de algum módulo."), { status: 403 });
  }
  return user;
}

// Guarda "pessoas" (refinamento #5): GESTOR ∨ REGULACAO/ADMIN ∨ JUNTA/ADMIN.
// Reutilizável nos 3 call sites (layout de pessoas, pessoas/actions e as
// escritas de Pessoa da Regulação).
export async function requireAcessoPessoas() {
  const user = await carregarUsuarioSessao();
  const ok =
    (await usuarioEhGestor(user)) ||
    (await usuarioEhAdminModulo(user, MODULOS.REGULACAO)) ||
    (await usuarioEhAdminModulo(user, MODULOS.JUNTA));
  if (!ok) {
    throw Object.assign(new Error("Acesso negado ao cadastro de pessoas."), { status: 403 });
  }
  return user;
}

// LEITURA por serviço da Junta: nome mapeado → exige o sub-serviço; nome não
// mapeado (serviço não controlado) → exige só acesso ao módulo JUNTA (leituras
// não criam dados).
export async function requireLeituraServicoJuntaPorNome(servicoNome) {
  const enumServ = servicoJuntaDoNome(servicoNome);
  if (enumServ) return requireAcessoServicoJunta(enumServ);
  return requireAcessoModulo(MODULOS.JUNTA);
}

// ESCRITA por serviço da Junta: nome mapeado → exige o sub-serviço; nome não
// mapeado → exige requireAdminModulo(JUNTA): OPERADOR nunca cria/grava em
// serviço não controlado on-the-fly.
export async function requireEscritaServicoJuntaPorNome(servicoNome) {
  const enumServ = servicoJuntaDoNome(servicoNome);
  if (enumServ) return requireAcessoServicoJunta(enumServ);
  return requireAdminModulo(MODULOS.JUNTA);
}
