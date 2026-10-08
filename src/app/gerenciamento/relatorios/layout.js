import {
  carregarContextoAcesso,
  usuarioEhAdminDeAlgumModulo,
} from "@/lib/permissions";
import AcessoNegadoModulo from "@/components/AcessoNegadoModulo";

// Relatórios: GESTOR ∨ admin de qualquer módulo (FR-3.10, design §4.4).
// usuarioEhAdminDeAlgumModulo já curto-circuita em GESTOR.
export default async function RelatoriosLayout({ children }) {
  const ctx = await carregarContextoAcesso();
  const permitido = ctx && (await usuarioEhAdminDeAlgumModulo(ctx.user));

  if (!permitido) {
    return <AcessoNegadoModulo modulo="Relatórios" />;
  }

  return children;
}
