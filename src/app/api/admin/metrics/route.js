import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Perfis com acesso ao painel gerencial consolidado.
const ROLES_GERENCIAIS = [
  "GESTOR",
  "REGULACAO_ADMIN",
  "JUNTA_ADMIN",
  "FARMACIA_ADMIN",
  "PROCESSO_ADMIN",
  "CCZ_ADMIN",
];

// Converte valores BigInt (retornados por COUNT/SUM no Postgres) em Number.
function toNumber(value) {
  if (typeof value === "bigint") return Number(value);
  return Number(value || 0);
}

export async function GET() {
  try {
    await requireRole(ROLES_GERENCIAIS);

    const agora = new Date();
    const em30Dias = new Date();
    em30Dias.setDate(em30Dias.getDate() + 30);

    const [
      totalPessoas,
      // Regulação
      pedidosPorStatus,
      pedidosPorRisco,
      // Farmácia Judicial
      pacientesFarmaciaPorStatus,
      medicamentosAtivos,
      estoque,
      lotesAVencer,
      // Junta Reguladora
      totalPacientesJunta,
      totalAtendimentosJunta,
      // CCZ
      totalAnimais,
      totalZoonoses,
      totalDenuncias,
      // Atividade recente
      ultimosPedidos,
      ultimasDispensacoes,
    ] = await Promise.all([
      prisma.pessoa.count(),

      prisma.pedidoExame.groupBy({
        by: ["status"],
        _count: { _all: true },
      }),
      prisma.pedidoExame.groupBy({
        by: ["classificacaoRisco"],
        _count: { _all: true },
      }),

      prisma.pacienteFarmaciaJudicial.groupBy({
        by: ["status"],
        _count: { _all: true },
      }),
      prisma.medicamento.count({ where: { ativo: true } }),
      // Estoque = soma das entradas - soma das dispensações.
      prisma.$queryRaw`
        SELECT COALESCE(SUM(lm.qtd_inicial - COALESCE(sub.total_entregue, 0)), 0)::integer AS total
        FROM public.farmacia_lotes_medicamentos lm
        LEFT JOIN (
          SELECT lote_medicamento_id, SUM(qtd_entregue) AS total_entregue
          FROM public.farmacia_dispensacoes_medicamentos
          GROUP BY lote_medicamento_id
        ) sub ON lm.id = sub.lote_medicamento_id
      `,
      prisma.loteMedicamento.findMany({
        where: { dataValidade: { gte: agora, lte: em30Dias } },
        orderBy: { dataValidade: "asc" },
        take: 5,
        select: {
          id: true,
          numeroLote: true,
          dataValidade: true,
          medicamento: { select: { nome: true, dosagem: true } },
        },
      }),

      prisma.pacienteJunta.count(),
      prisma.juntaAtendimento.count(),

      prisma.animal.count(),
      prisma.cadastroZoonoses.count(),
      prisma.denunciaCaoAgressivo.count(),

      prisma.pedidoExame.findMany({
        take: 6,
        orderBy: { dataSolicitacao: "desc" },
        select: {
          id: true,
          status: true,
          dataSolicitacao: true,
          pessoa: { select: { nomeCompleto: true } },
          procedimento: { select: { nome: true } },
        },
      }),
      prisma.dispensacaoMedicamento.findMany({
        take: 6,
        orderBy: { dataDispensacao: "desc" },
        select: {
          id: true,
          qtdEntregue: true,
          dataDispensacao: true,
          lote: { select: { medicamento: { select: { nome: true } } } },
        },
      }),
    ]);

    // ── Regulação ────────────────────────────────────────────────────────
    const regulacaoStatus = { aguardando: 0, liberados: 0, outros: 0, total: 0 };
    pedidosPorStatus.forEach((row) => {
      const qtd = toNumber(row._count._all);
      regulacaoStatus.total += qtd;
      const st = (row.status || "").toLowerCase();
      if (st === "aguardando") regulacaoStatus.aguardando += qtd;
      else if (st === "liberado") regulacaoStatus.liberados += qtd;
      else regulacaoStatus.outros += qtd;
    });

    const risco = pedidosPorRisco
      .map((row) => ({
        classificacao: row.classificacaoRisco || "Não classificado",
        total: toNumber(row._count._all),
      }))
      .sort((a, b) => b.total - a.total);

    // ── Farmácia Judicial ────────────────────────────────────────────────
    const farmacia = { ativos: 0, inativos: 0, obitos: 0, total: 0 };
    pacientesFarmaciaPorStatus.forEach((row) => {
      const qtd = toNumber(row._count._all);
      farmacia.total += qtd;
      const st = (row.status || "").toUpperCase();
      if (st === "ATIVO") farmacia.ativos += qtd;
      else if (st === "INATIVO") farmacia.inativos += qtd;
      else if (st === "ÓBITO" || st === "OBITO") farmacia.obitos += qtd;
    });

    return NextResponse.json({
      geradoEm: agora.toISOString(),
      pessoas: { total: totalPessoas },
      regulacao: {
        ...regulacaoStatus,
        risco,
      },
      farmacia: {
        ...farmacia,
        medicamentosAtivos,
        estoqueUnidades: toNumber(estoque?.[0]?.total),
        lotesAVencer: lotesAVencer.map((lote) => ({
          id: lote.id,
          numeroLote: lote.numeroLote,
          medicamento: `${lote.medicamento?.nome || "Medicamento"} ${lote.medicamento?.dosagem || ""}`.trim(),
          dataValidade: lote.dataValidade,
        })),
      },
      junta: {
        pacientes: totalPacientesJunta,
        atendimentos: totalAtendimentosJunta,
      },
      ccz: {
        animais: totalAnimais,
        zoonoses: totalZoonoses,
        denuncias: totalDenuncias,
      },
      atividadeRecente: [
        ...ultimosPedidos.map((p) => ({
          id: `pedido-${p.id}`,
          modulo: "Regulação",
          descricao: `${p.pessoa?.nomeCompleto || "Paciente"} — ${p.procedimento?.nome || "Procedimento"} (${p.status})`,
          data: p.dataSolicitacao,
        })),
        ...ultimasDispensacoes.map((d) => ({
          id: `dispensacao-${d.id}`,
          modulo: "Farmácia Judicial",
          descricao: `${d.lote?.medicamento?.nome || "Medicamento"} — ${d.qtdEntregue} unidade(s) dispensada(s)`,
          data: d.dataDispensacao,
        })),
      ]
        .filter((item) => item.data)
        .sort((a, b) => new Date(b.data) - new Date(a.data))
        .slice(0, 8),
    });
  } catch (error) {
    if (error.status === 401 || error.status === 403) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Erro ao carregar métricas gerenciais:", error);
    return NextResponse.json(
      { error: "Erro interno ao carregar métricas." },
      { status: 500 },
    );
  }
}
