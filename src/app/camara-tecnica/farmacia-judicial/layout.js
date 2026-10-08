import {
  carregarContextoAcesso,
  usuarioTemAcessoModulo,
  MODULOS,
} from "@/lib/permissions";
import AcessoNegadoModulo from "@/components/AcessoNegadoModulo";

// Gate server-side do módulo Farmácia Judicial (fail-closed).
export default async function FarmaciaJudicialLayout({ children }) {
  const ctx = await carregarContextoAcesso();
  const permitido =
    ctx && (await usuarioTemAcessoModulo(ctx.user, MODULOS.FARMACIA));

  if (!permitido) {
    return <AcessoNegadoModulo modulo="Farmácia Judicial" />;
  }

  return children;
}
