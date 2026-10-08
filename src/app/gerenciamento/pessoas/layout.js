import {
  carregarContextoAcesso,
  usuarioEhGestor,
  usuarioEhAdminModulo,
  MODULOS,
} from "@/lib/permissions";
import AcessoNegadoModulo from "@/components/AcessoNegadoModulo";

// Cadastro de Pessoas: GESTOR ∨ REGULACAO/ADMIN ∨ JUNTA/ADMIN
// (FR-3.8 + premissa A2 — Pacientes é compartilhado; design §4.4 / refinamento #5).
export default async function PessoasLayout({ children }) {
  const ctx = await carregarContextoAcesso();
  const permitido =
    ctx &&
    ((await usuarioEhGestor(ctx.user)) ||
      (await usuarioEhAdminModulo(ctx.user, MODULOS.REGULACAO)) ||
      (await usuarioEhAdminModulo(ctx.user, MODULOS.JUNTA)));

  if (!permitido) {
    return <AcessoNegadoModulo modulo="Cadastro de Pessoas" />;
  }

  return children;
}
