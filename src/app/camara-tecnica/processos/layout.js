import {
  carregarContextoAcesso,
  usuarioTemAcessoModulo,
  MODULOS,
} from "@/lib/permissions";
import AcessoNegadoModulo from "@/components/AcessoNegadoModulo";

// Gate server-side do módulo Processos (fail-closed).
export default async function ProcessosLayout({ children }) {
  const ctx = await carregarContextoAcesso();
  const permitido =
    ctx && (await usuarioTemAcessoModulo(ctx.user, MODULOS.PROCESSOS));

  if (!permitido) {
    return <AcessoNegadoModulo modulo="Processos" />;
  }

  return children;
}
