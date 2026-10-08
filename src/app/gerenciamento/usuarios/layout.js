import { carregarContextoAcesso, usuarioEhGestor } from "@/lib/permissions";
import AcessoNegadoModulo from "@/components/AcessoNegadoModulo";

// Gerenciar Usuários: só GESTOR (FR-3.9, design §4.4).
export default async function GerenciarUsuariosLayout({ children }) {
  const ctx = await carregarContextoAcesso();
  const permitido = ctx && (await usuarioEhGestor(ctx.user));

  if (!permitido) {
    return <AcessoNegadoModulo modulo="Gerenciar Usuários" />;
  }

  return children;
}
