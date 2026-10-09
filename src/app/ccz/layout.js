import {
  carregarContextoAcesso,
  usuarioTemAcessoModulo,
  MODULOS,
} from "@/lib/permissions";
import AcessoNegadoModulo from "@/components/AcessoNegadoModulo";

// Gate server-side do módulo CCZ / Zoonoses (fail-closed).
export default async function CczLayout({ children }) {
  const ctx = await carregarContextoAcesso();
  const permitido =
    ctx && (await usuarioTemAcessoModulo(ctx.user, MODULOS.CCZ));

  if (!permitido) {
    return <AcessoNegadoModulo modulo="CCZ" />;
  }

  return children;
}
