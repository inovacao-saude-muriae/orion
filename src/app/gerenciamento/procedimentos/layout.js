import {
  carregarContextoAcesso,
  usuarioEhGestor,
  usuarioEhAdminModulo,
  MODULOS,
} from "@/lib/permissions";
import AcessoNegadoModulo from "@/components/AcessoNegadoModulo";

// Procedimentos: GESTOR ∨ REGULACAO/ADMIN (design §4.4).
export default async function ProcedimentosLayout({ children }) {
  const ctx = await carregarContextoAcesso();
  const permitido =
    ctx &&
    ((await usuarioEhGestor(ctx.user)) ||
      (await usuarioEhAdminModulo(ctx.user, MODULOS.REGULACAO)));

  if (!permitido) {
    return <AcessoNegadoModulo modulo="Procedimentos" />;
  }

  return children;
}
