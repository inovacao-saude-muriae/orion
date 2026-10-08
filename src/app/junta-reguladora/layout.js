import {
  carregarContextoAcesso,
  usuarioTemAcessoModulo,
  usuarioTemAcessoServicoJunta,
  usuarioEhAdminModulo,
  SUBTAB_PARA_SERVICO_JUNTA,
  MODULOS,
} from "@/lib/permissions";
import AcessoNegadoModulo from "@/components/AcessoNegadoModulo";
import { JuntaPermProvider } from "./PermissoesJuntaContext";

// Gate server-side do módulo Junta Reguladora (fail-closed). Além da entrada no
// módulo, calcula os sub-serviços liberados (recorte por sub-serviço, §2.6) e
// injeta via JuntaPermProvider para a página bloquear as abas não permitidas.
export default async function JuntaReguladoraLayout({ children }) {
  const ctx = await carregarContextoAcesso();
  const permitido =
    ctx && (await usuarioTemAcessoModulo(ctx.user, MODULOS.JUNTA));

  if (!permitido) {
    return <AcessoNegadoModulo modulo="Junta Reguladora" />;
  }

  const subServicosPermitidos = [];
  for (const [subTab, enumServ] of Object.entries(SUBTAB_PARA_SERVICO_JUNTA)) {
    if (await usuarioTemAcessoServicoJunta(ctx.user, enumServ)) {
      subServicosPermitidos.push(subTab);
    }
  }

  const ehAdminJunta = await usuarioEhAdminModulo(ctx.user, MODULOS.JUNTA);

  return (
    <JuntaPermProvider
      subServicosPermitidos={subServicosPermitidos}
      ehAdminJunta={ehAdminJunta}
    >
      {children}
    </JuntaPermProvider>
  );
}
