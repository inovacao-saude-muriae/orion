import {
  carregarContextoAcesso,
  usuarioEhGestor,
  usuarioEhAdminModulo,
  MODULOS,
} from "@/lib/permissions";
import AcessoNegadoModulo from "@/components/AcessoNegadoModulo";

// Serviços e Especialidades: GESTOR ∨ JUNTA/ADMIN (FR-3.3/3.8, design §4.4).
// Mudança intencional de REGULACAO_ADMIN -> JUNTA/ADMIN.
export default async function ServicosLayout({ children }) {
  const ctx = await carregarContextoAcesso();
  const permitido =
    ctx &&
    ((await usuarioEhGestor(ctx.user)) ||
      (await usuarioEhAdminModulo(ctx.user, MODULOS.JUNTA)));

  if (!permitido) {
    return <AcessoNegadoModulo modulo="Serviços e Especialidades" />;
  }

  return children;
}
