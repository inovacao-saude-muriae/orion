import {
  carregarContextoAcesso,
  usuarioEhAdminModulo,
  usuarioEhGestor,
  MODULOS,
} from "@/lib/permissions";
import AcessoNegadoModulo from "@/components/AcessoNegadoModulo";

// Gate server-side do CCZ (fail-closed). O recorte fino do CCZ ainda não está
// definido (FR-3.7): por ora exige ADMIN do CCZ ou GESTOR.
export default async function CczLayout({ children }) {
  const ctx = await carregarContextoAcesso();
  const permitido =
    ctx &&
    ((await usuarioEhAdminModulo(ctx.user, MODULOS.CCZ)) ||
      (await usuarioEhGestor(ctx.user)));

  if (!permitido) {
    return <AcessoNegadoModulo modulo="CCZ" />;
  }

  return children;
}
