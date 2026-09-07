import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const ROLES_ADMINISTRATIVAS = [
  "GESTOR",
  "REGULACAO_ADMIN",
  "JUNTA_ADMIN",
  "FARMACIA_ADMIN",
  "PROCESSO_ADMIN",
  "CCZ_ADMIN",
];

export async function GET() {
  try {
    await requireRole(ROLES_ADMINISTRATIVAS);

    const [
      pessoas,
      pedidos,
      pacientesFarmacia,
      pacientesJunta,
      tutores,
      animais,
    ] = await Promise.all([
      prisma.pessoa.findMany({
        orderBy: { nomeCompleto: "asc" },
        select: {
          cpf: true,
          nomeCompleto: true,
          telefone: true,
          dataNascimento: true,
        },
      }),
      prisma.pedidoExame.findMany({
        select: {
          id: true,
          pessoaCpf: true,
          status: true,
          dataSolicitacao: true,
          dataLiberacao: true,
          classificacaoRisco: true,
          procedimento: {
            select: { nome: true, tipoExame: { select: { nome: true } } },
          },
        },
      }),
      prisma.pacienteFarmaciaJudicial.findMany({
        select: {
          pessoaCpf: true,
          numeroPasta: true,
          status: true,
          createdAt: true,
          tratamentos: {
            select: {
              id: true,
              qtdPrescritaMensal: true,
              ativo: true,
              medicamento: { select: { nome: true, dosagem: true } },
              createdAt: true,
            },
          },
          dispensacoes: {
            select: {
              id: true,
              qtdEntregue: true,
              dataDispensacao: true,
              lote: {
                select: {
                  numeroLote: true,
                  medicamento: { select: { nome: true } },
                },
              },
            },
          },
        },
      }),
      prisma.pacienteJunta.findMany({
        select: {
          pessoaCpf: true,
          createdAt: true,
          tipoDeficiencia: true,
          servicos: {
            select: { servico: { select: { nome: true } }, dataVinculo: true },
          },
          atendimentos: {
            select: {
              id: true,
              especialidade: true,
              status: true,
              dataAtendimento: true,
              servico: { select: { nome: true } },
            },
          },
        },
      }),
      prisma.tutor.findMany({ select: { pessoaCpf: true, createdAt: true } }),
      prisma.animal.findMany({
        select: {
          id: true,
          pessoaCpf: true,
          nome: true,
          especie: true,
          dataCadastro: true,
          procedimentos: {
            select: {
              id: true,
              tipo: true,
              dataProcedimento: true,
              status: true,
            },
          },
          zoonoses: {
            select: {
              id: true,
              doenca: true,
              dataIdentificacao: true,
              grauRisco: true,
            },
          },
          denuncias: {
            select: { id: true, dataDenuncia: true, localizacao: true },
          },
          esporotricose: {
            select: { id: true, numeroProtocolo: true, dataVisita: true },
          },
        },
      }),
    ]);

    const eventosPorCpf = new Map(pessoas.map((pessoa) => [pessoa.cpf, []]));
    const adicionarEvento = (cpf, evento) => {
      if (!cpf || !eventosPorCpf.has(cpf)) return;
      eventosPorCpf.get(cpf).push({ id: evento.id, ...evento });
    };

    pedidos.forEach((pedido) =>
      adicionarEvento(pedido.pessoaCpf, {
        id: `regulacao-${pedido.id}`,
        modulo: "Regulação",
        tipo:
          pedido.status === "Liberado" ? "Exame liberado" : "Exame aguardando",
        descricao: `${pedido.procedimento?.tipoExame?.nome || "Exame"} - ${pedido.procedimento?.nome || "Procedimento"} (${pedido.status})`,
        status: pedido.status,
        dataLiberacao: pedido.dataLiberacao,
        data: pedido.dataSolicitacao,
      }),
    );

    pacientesFarmacia.forEach((paciente) => {
      adicionarEvento(paciente.pessoaCpf, {
        id: `farmacia-paciente-${paciente.numeroPasta}`,
        modulo: "Farmácia Judicial",
        tipo: "Cadastro judicial",
        descricao: `Pasta ${paciente.numeroPasta} - status ${paciente.status}`,
        data: paciente.createdAt,
      });
      paciente.tratamentos.forEach((tratamento) =>
        adicionarEvento(paciente.pessoaCpf, {
          id: `farmacia-tratamento-${tratamento.id}`,
          modulo: "Farmácia Judicial",
          tipo: "Tratamento cadastrado",
          descricao:
            `${tratamento.medicamento?.nome || "Medicamento"} ${tratamento.medicamento?.dosagem || ""} - ${tratamento.qtdPrescritaMensal}/mês${tratamento.ativo ? "" : " (inativo)"}`.trim(),
          data: tratamento.createdAt,
        }),
      );
      paciente.dispensacoes.forEach((dispensacao) =>
        adicionarEvento(paciente.pessoaCpf, {
          id: `farmacia-dispensacao-${dispensacao.id}`,
          modulo: "Farmácia Judicial",
          tipo: "Medicamento dispensado",
          descricao: `${dispensacao.lote?.medicamento?.nome || "Medicamento"} - ${dispensacao.qtdEntregue} unidade(s), lote ${dispensacao.lote?.numeroLote || "-"}`,
          data: dispensacao.dataDispensacao,
        }),
      );
    });

    pacientesJunta.forEach((paciente) => {
      adicionarEvento(paciente.pessoaCpf, {
        id: `junta-paciente-${paciente.pessoaCpf}`,
        modulo: "Junta Reguladora",
        tipo: "Cadastro na Junta",
        descricao: paciente.tipoDeficiencia || "Paciente cadastrado",
        data: paciente.createdAt,
      });
      paciente.servicos.forEach((vinculo) =>
        adicionarEvento(paciente.pessoaCpf, {
          id: `junta-servico-${paciente.pessoaCpf}-${vinculo.servico?.nome}`,
          modulo: "Junta Reguladora",
          tipo: "Serviço vinculado",
          descricao: vinculo.servico?.nome || "Serviço",
          data: vinculo.dataVinculo,
        }),
      );
      paciente.atendimentos.forEach((atendimento) =>
        adicionarEvento(paciente.pessoaCpf, {
          id: `junta-atendimento-${atendimento.id}`,
          modulo: "Junta Reguladora",
          tipo: "Atendimento realizado",
          descricao: `${atendimento.servico?.nome || "Serviço"} - ${atendimento.especialidade} (${atendimento.status})`,
          data: atendimento.dataAtendimento,
        }),
      );
    });

    const tutoresCcz = new Set(tutores.map((tutor) => tutor.pessoaCpf));
    tutores.forEach((tutor) =>
      adicionarEvento(tutor.pessoaCpf, {
        id: `ccz-tutor-${tutor.pessoaCpf}`,
        modulo: "CCZ",
        tipo: "Cadastro de tutor",
        descricao: "Pessoa cadastrada como tutor",
        data: tutor.createdAt,
      }),
    );
    animais
      .filter((animal) => animal.pessoaCpf && tutoresCcz.has(animal.pessoaCpf))
      .forEach((animal) => {
        const nomeAnimal = animal.nome || animal.especie || "Animal";
        adicionarEvento(animal.pessoaCpf, {
          id: `ccz-animal-${animal.id}`,
          modulo: "CCZ",
          tipo: "Animal cadastrado",
          descricao: nomeAnimal,
          data: animal.dataCadastro,
        });
        animal.procedimentos.forEach((item) =>
          adicionarEvento(animal.pessoaCpf, {
            id: `ccz-procedimento-${item.id}`,
            modulo: "CCZ",
            tipo: "Procedimento realizado",
            descricao: `${nomeAnimal} - ${item.tipo} (${item.status})`,
            data: item.dataProcedimento,
          }),
        );
        animal.zoonoses.forEach((item) =>
          adicionarEvento(animal.pessoaCpf, {
            id: `ccz-zoonose-${item.id}`,
            modulo: "CCZ",
            tipo: "Zoonose registrada",
            descricao: `${nomeAnimal} - ${item.doenca} (${item.grauRisco})`,
            data: item.dataIdentificacao,
          }),
        );
        animal.denuncias.forEach((item) =>
          adicionarEvento(animal.pessoaCpf, {
            id: `ccz-denuncia-${item.id}`,
            modulo: "CCZ",
            tipo: "Denúncia registrada",
            descricao: `${nomeAnimal} - ${item.localizacao}`,
            data: item.dataDenuncia,
          }),
        );
        animal.esporotricose.forEach((item) =>
          adicionarEvento(animal.pessoaCpf, {
            id: `ccz-esporo-${item.id}`,
            modulo: "CCZ",
            tipo: "Esporotricose registrada",
            descricao: `${nomeAnimal}${item.numeroProtocolo ? ` - Protocolo ${item.numeroProtocolo}` : ""}`,
            data: item.dataVisita,
          }),
        );
      });

    const usuarios = pessoas.map((pessoa) => {
      const atividades = eventosPorCpf
        .get(pessoa.cpf)
        .sort((a, b) => new Date(b.data || 0) - new Date(a.data || 0));
      const modulos = [
        ...new Set(atividades.map((atividade) => atividade.modulo)),
      ];
      const pedidosDaPessoa = pedidos.filter(
        (pedido) => pedido.pessoaCpf === pessoa.cpf,
      );
      const farmaciaDaPessoa = pacientesFarmacia.find(
        (paciente) => paciente.pessoaCpf === pessoa.cpf,
      );
      const juntaDaPessoa = pacientesJunta.find(
        (paciente) => paciente.pessoaCpf === pessoa.cpf,
      );
      const animaisDaPessoa = animais.filter(
        (animal) => animal.pessoaCpf === pessoa.cpf,
      );
      return {
        ...pessoa,
        nome: pessoa.nomeCompleto,
        atividades,
        totalAtividades: atividades.length,
        modulos,
        resumo: {
          regulacao: {
            total: pedidosDaPessoa.length,
            aguardando: pedidosDaPessoa.filter(
              (item) => item.status === "Aguardando",
            ).length,
            liberados: pedidosDaPessoa.filter(
              (item) => item.status === "Liberado",
            ).length,
          },
          farmacia: farmaciaDaPessoa
            ? {
                status: farmaciaDaPessoa.status,
                pasta: farmaciaDaPessoa.numeroPasta,
                medicamentos: farmaciaDaPessoa.tratamentos
                  .filter((item) => item.ativo)
                  .map(
                    (item) =>
                      `${item.medicamento?.nome || "Medicamento"} (${item.qtdPrescritaMensal}/mês)`,
                  ),
                dispensacoes: farmaciaDaPessoa.dispensacoes.length,
              }
            : null,
          junta: juntaDaPessoa
            ? {
                servicos: juntaDaPessoa.servicos
                  .map((item) => item.servico?.nome)
                  .filter(Boolean),
                atendimentos: juntaDaPessoa.atendimentos.length,
              }
            : null,
          ccz: animaisDaPessoa.length
            ? {
                animais: animaisDaPessoa.map(
                  (item) => item.nome || item.especie,
                ),
                procedimentos: animaisDaPessoa.reduce(
                  (total, item) => total + item.procedimentos.length,
                  0,
                ),
                zoonoses: animaisDaPessoa.reduce(
                  (total, item) => total + item.zoonoses.length,
                  0,
                ),
              }
            : null,
        },
      };
    });

    return NextResponse.json({
      usuarios,
      atividades: usuarios.flatMap((pessoa) =>
        pessoa.atividades.map((atividade) => ({
          ...atividade,
          cpf: pessoa.cpf,
          nome: pessoa.nomeCompleto,
        })),
      ),
    });
  } catch (error) {
    if (error.status === 401 || error.status === 403) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Erro ao carregar relatório geral:", error);
    return NextResponse.json(
      { error: "Erro interno ao carregar relatório." },
      { status: 500 },
    );
  }
}
