"use server";

import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

// Função auxiliar com fuso horário seguro para formatar DATE em DD/MM/YYYY
function formatDateToBR(dateObjOrString) {
  if (!dateObjOrString) return "-";

  try {
    if (typeof dateObjOrString === "string") {
      const cleanStr = dateObjOrString.split("T")[0];
      const parts = cleanStr.split("-");
      if (parts.length === 3) {
        return `${parts[2].padStart(2, "0")}/${parts[1].padStart(2, "0")}/${parts[0]}`;
      }
      return cleanStr;
    }

    if (dateObjOrString instanceof Date && !isNaN(dateObjOrString.getTime())) {
      const day = String(dateObjOrString.getUTCDate()).padStart(2, "0");
      const month = String(dateObjOrString.getUTCMonth() + 1).padStart(2, "0");
      const year = dateObjOrString.getUTCFullYear();
      return `${day}/${month}/${year}`;
    }
  } catch (err) {
    console.error("Erro ao formatar data:", err);
  }

  return "-";
}

// 1. Buscar todos os pedidos relacionando as tabelas pessoa, procedimento, ubs e medicos
export async function getPedidosExames() {
  try {
    const data = await prisma.pedidoExame.findMany({
      include: {
        pessoa: true,
        procedimento: {
          include: { tipoExame: true },
        },
        ubs: true,
        medicoSolicitante: true,
        medicoResponsavel: true,
      },
      orderBy: { dataSolicitacao: "desc" },
    });

    return data.map((item) => {
      const dataLiberacaoStr = item.dataLiberacao
        ? item.dataLiberacao.toISOString().split("T")[0]
        : null;
      const dataSolicitacaoRaw = item.dataSolicitacao
        ? item.dataSolicitacao.toISOString().split("T")[0]
        : "";

      const examName = item.procedimento?.tipoExame?.nome || "EXA";
      const prefix = examName.trim().substring(0, 3).toUpperCase();
      const customCode = `${prefix}${item.id}`;

      return {
        id: customCode,
        dbId: item.id,
        examType: item.procedimento?.tipoExame?.nome || "",
        examTypeId: item.procedimento?.tipoExameId || null,
        procedure: item.procedimento?.nome || "",
        procedureId: item.procedimentoId,
        estimatedCost: item.procedimento ? Number(item.procedimento.valor) : 0,
        patientName: item.pessoa?.nomeCompleto || "",
        motherName: item.pessoa?.nomeMae || "",
        cpf: item.pessoaCpf,
        susCard: item.cnsPaciente || "",

        requestDate: formatDateToBR(dataSolicitacaoRaw),
        requestDateRaw: dataSolicitacaoRaw,

        classification: item.classificacaoRisco || "Verde",
        competence: dataLiberacaoStr
          ? `${dataLiberacaoStr.slice(5, 7)}/${dataLiberacaoStr.slice(0, 4)}`
          : "",
        quotaCompetenceMonth: dataLiberacaoStr
          ? dataLiberacaoStr.slice(5, 7)
          : "",
        quotaCompetenceYear: dataLiberacaoStr
          ? dataLiberacaoStr.slice(0, 4)
          : "",
        requestDoctor: item.medicoSolicitante?.nome || "",
        requestDoctorId: item.medicoSolicitanteId || "",
        requestUbs: item.ubs?.nome || "",
        requestUbsId: item.ubsResponsavelId || "",
        justification: item.observacao || "",
        status: item.status,
        communicationDate: item.dataComunicacao
          ? item.dataComunicacao.toISOString().split("T")[0]
          : "",
        quota: item.tipoCota || "",
        generalObservation: item.observacao || "",
        regulatorDoctor: item.medicoResponsavel?.nome || null,
        regulatorDoctorId: item.medicoResponsavelId || "",
        releaseDate: formatDateToBR(dataLiberacaoStr),
        releaseDateRaw: dataLiberacaoStr,
        billingDate: "",
      };
    });
  } catch (error) {
    console.error("Erro ao buscar pedidos no banco:", error);
    return [];
  }
}

// 2. Buscar Dados Auxiliares
export async function getAuxiliaryData() {
  try {
    const [tiposExame, procedimentos, medicos, ubsList, pessoas] =
      await Promise.all([
        prisma.tipoExame.findMany({ orderBy: { nome: "asc" } }),
        prisma.procedimento.findMany({
          include: { tipoExame: true },
          orderBy: { nome: "asc" },
        }),
        prisma.medico.findMany({
          where: { ativo: true },
          orderBy: { nome: "asc" },
        }),
        prisma.ubs.findMany({
          where: { ativo: true },
          orderBy: { nome: "asc" },
        }),
        prisma.pessoa.findMany({
          include: { enderecos: { where: { enderecoAtual: true } } },
          orderBy: { nomeCompleto: "asc" },
          take: 100,
        }),
      ]);

    return {
      tiposExame: tiposExame.map((t) => ({ id: t.id, nome: t.nome })),
      procedimentos: procedimentos.map((p) => ({
        id: p.id,
        nome: p.nome,
        valor: Number(p.valor),
        tipoExameId: p.tipoExameId,
        tipoExameNome: p.tipoExame.nome,
      })),
      medicos: medicos.map((m) => ({
        id: m.id,
        nome: m.nome,
        crm: m.crm,
        ufCrm: m.ufCrm,
        especialidade: m.especialidade,
        tipo: m.tipo || "Solicitante",
      })),
      ubsList: ubsList.map((u) => ({ id: u.id, nome: u.nome, cnes: u.cnes })),
      pessoas: pessoas.map((p) => {
        const endereco = p.enderecos && p.enderecos[0];
        return {
          cpf: p.cpf,
          nomeCompleto: p.nomeCompleto,
          nomeMae: p.nomeMae,
          telefone: p.telefone,
          dataNascimento: formatDateToBR(p.dataNascimento),
          logradouro: endereco?.logradouro || "",
          numero: endereco?.numero || "",
          complemento: endereco?.complemento || "",
          bairro: endereco?.bairro || "",
          cidade: endereco?.cidade || "",
          uf: endereco?.uf || "",
          cep: endereco?.cep || "",
        };
      }),
    };
  } catch (error) {
    console.error("Erro ao carregar dados auxiliares:", error);
    return {
      tiposExame: [],
      procedimentos: [],
      medicos: [],
      ubsList: [],
      pessoas: [],
    };
  }
}

// 3. Buscar uma pessoa específica por CPF ou Nome (Suporta CPF limpo ou formatado)
export async function searchPessoa(term) {
  try {
    if (!term) return null;
    const cleanTerm = term.replace(/\D/g, "");

    const pessoa = await prisma.pessoa.findFirst({
      where: {
        OR: [
          { cpf: term },
          ...(cleanTerm ? [{ cpf: cleanTerm }] : []),
          { nomeCompleto: { contains: term, mode: "insensitive" } },
        ],
      },
    });

    if (!pessoa) return null;

    return {
      ...pessoa,
      dataNascimento: formatDateToBR(pessoa.dataNascimento),
    };
  } catch (error) {
    console.error("Erro ao buscar pessoa:", error);
    return null;
  }
}

// 4. Autocomplete de Pessoas (Suporta CPF limpo ou formatado)
export async function searchPessoasAutocomplete(term) {
  if (!term || term.trim().length < 2) return [];

  try {
    const cleanTerm = term.replace(/\D/g, "");

    const pessoas = await prisma.pessoa.findMany({
      where: {
        OR: [
          { cpf: { contains: term } },
          ...(cleanTerm ? [{ cpf: { contains: cleanTerm } }] : []),
          { nomeCompleto: { contains: term, mode: "insensitive" } },
        ],
      },
      take: 10,
    });

    return pessoas.map((p) => ({
      cpf: p.cpf,
      nomeCompleto: p.nomeCompleto,
      nomeMae: p.nomeMae,
      dataNascimento: formatDateToBR(p.dataNascimento),
    }));
  } catch (error) {
    console.error("Erro no autocomplete de pessoa:", error);
    return [];
  }
}

// 5. Salvar Novo Pedido
export async function createPedidoExame(data) {
  try {
    const newRecord = await prisma.pedidoExame.create({
      data: {
        pessoaCpf: data.cpf,
        cnsPaciente: data.susCard || null,
        procedimentoId: Number(data.procedureId),
        medicoSolicitanteId: data.medicoSolicitanteId
          ? Number(data.medicoSolicitanteId)
          : null,
        ubsResponsavelId: data.ubsResponsavelId
          ? Number(data.ubsResponsavelId)
          : null,
        classificacaoRisco: data.classification,
        observacao: data.justification,
        status: "Aguardando",
      },
    });

    revalidatePath("/regulacao");
    return { success: true, data: newRecord };
  } catch (error) {
    console.error("Erro ao criar pedido:", error);
    return { success: false, error: error.message };
  }
}

// 6. Atualizar Data da Comunicação
export async function updateCommunicationDate(idStr, dateStr) {
  try {
    const numericId = Number(String(idStr).replace(/\D/g, ""));
    await prisma.pedidoExame.update({
      where: { id: numericId },
      data: {
        dataComunicacao: dateStr ? new Date(dateStr) : null,
        statusComunicacao: dateStr ? "ENVIADO" : "PENDENTE",
      },
    });

    revalidatePath("/regulacao");
    return { success: true };
  } catch (error) {
    console.error("Erro ao atualizar comunicação:", error);
    return { success: false };
  }
}

// 7. Liberar Paciente
export async function releasePaciente(idStr, releaseData) {
  try {
    const numericId = Number(String(idStr).replace(/\D/g, ""));
    await prisma.pedidoExame.update({
      where: { id: numericId },
      data: {
        status: "Liberado",
        tipoCota: releaseData.quota,
        dataLiberacao: new Date(releaseData.releaseDate),
        observacao: releaseData.generalObservation,
        medicoResponsavelId: releaseData.regulatorDoctorId
          ? Number(releaseData.regulatorDoctorId)
          : null,
      },
    });

    revalidatePath("/regulacao");
    return { success: true };
  } catch (error) {
    console.error("Erro ao liberar paciente:", error);
    return { success: false };
  }
}

// 8. Cadastrar Nova Pessoa / Paciente
export async function createPessoa(data) {
  try {
    const cleanCpf = data.cpf.replace(/\D/g, "");
    const cleanCep = data.cep ? data.cep.replace(/\D/g, "") : null;

    const birthDate = data.dataNascimento
      ? new Date(`${data.dataNascimento}T00:00:00Z`)
      : new Date();

    const result = await prisma.$transaction(async (tx) => {
      const pessoa = await tx.pessoa.create({
        data: {
          cpf: cleanCpf,
          nomeCompleto: data.nomeCompleto,
          dataNascimento: birthDate,
          nomeMae: data.nomeMae,
          telefone: data.telefone,
        },
      });

      if (data.logradouro) {
        await tx.endereco.create({
          data: {
            pessoaCpf: cleanCpf,
            logradouro: data.logradouro,
            numero: data.numero || "S/N",
            complemento: data.complemento || null,
            bairro: data.bairro || "Centro",
            cidade: data.cidade || "Muriaé",
            uf: data.uf || "MG",
            cep: cleanCep,
            enderecoAtual: true,
          },
        });
      }

      return pessoa;
    });

    revalidatePath("/regulacao");
    return { success: true, data: result };
  } catch (error) {
    console.error("Erro ao cadastrar pessoa:", error);
    return { success: false, error: error.message };
  }
}

// 9. Cadastrar Novo Médico
export async function createMedico(data) {
  try {
    const medico = await prisma.medico.create({
      data: {
        nome: data.nome,
        crm: data.crm,
        ufCrm: data.ufCrm.toUpperCase(),
        especialidade: data.especialidade,
        tipo: data.tipo || "Solicitante",
      },
    });

    revalidatePath("/regulacao");
    return { success: true, data: medico };
  } catch (error) {
    console.error("Erro ao cadastrar médico:", error);
    return { success: false, error: error.message };
  }
}

// 10. Cadastrar Nova UBS
export async function createUbs(data) {
  try {
    const ubs = await prisma.ubs.create({
      data: {
        nome: data.nome,
        cnes: data.cnes,
      },
    });

    revalidatePath("/regulacao");
    return { success: true, data: ubs };
  } catch (error) {
    console.error("Erro ao cadastrar UBS:", error);
    return { success: false, error: error.message };
  }
}

// 11. Cadastrar Novo Procedimento
export async function createProcedimento(data) {
  try {
    const procedimento = await prisma.procedimento.create({
      data: {
        nome: data.nome,
        valor: parseFloat(data.valor),
        tipoExameId: Number(data.tipoExameId),
      },
    });

    revalidatePath("/regulacao");
    return { success: true, data: procedimento };
  } catch (error) {
    console.error("Erro ao cadastrar procedimento:", error);
    return { success: false, error: error.message };
  }
}

// 12. Atualizar Procedimento
export async function updateProcedimento(id, data) {
  try {
    const procedimento = await prisma.procedimento.update({
      where: { id: Number(id) },
      data: {
        nome: data.nome,
        valor: parseFloat(data.valor),
        tipoExameId: Number(data.tipoExameId),
      },
    });

    revalidatePath("/regulacao");
    return { success: true, data: procedimento };
  } catch (error) {
    console.error("Erro ao atualizar procedimento:", error);
    return { success: false, error: error.message };
  }
}

// 13. Buscar Tetos de Cotas Financeiras
export async function getCotasFinanceiras() {
  try {
    await requireRole(["GESTOR", "REGULACAO_ADMIN"]);
    const data = await prisma.cotaFinanceira.findMany();
    return data.map((c) => ({
      id: c.id,
      tipoCota: c.tipoCota,
      mes: c.mes,
      ano: c.ano,
      valorTeto: Number(c.valorTeto),
    }));
  } catch (error) {
    console.error("Erro ao buscar cotas financeiras:", error);
    return [];
  }
}

// 13. Salvar Teto de Cota
export async function saveCotaFinanceira({ tipoCota, mes, ano, valorTeto }) {
  try {
    await requireRole(["GESTOR", "REGULACAO_ADMIN"]);
    const record = await prisma.cotaFinanceira.upsert({
      where: {
        tipoCota_mes_ano: { tipoCota, mes, ano },
      },
      update: {
        valorTeto: parseFloat(valorTeto),
      },
      create: {
        tipoCota,
        mes,
        ano,
        valorTeto: parseFloat(valorTeto),
      },
    });

    revalidatePath("/regulacao");
    return { success: true, data: record };
  } catch (error) {
    console.error("Erro ao salvar teto de cota:", error);
    return { success: false, error: error.message };
  }
}

// 14. Atualizar Data de Faturamento
export async function updateBillingDate(idStr, dateStr) {
  try {
    await requireRole(["GESTOR", "REGULACAO_ADMIN"]);
    const numericId = Number(String(idStr).replace(/\D/g, ""));
    await prisma.pedidoExame.update({
      where: { id: numericId },
      data: {
        dataComunicacao: dateStr ? new Date(dateStr) : null,
      },
    });

    revalidatePath("/regulacao");
    return { success: true };
  } catch (error) {
    console.error("Erro ao atualizar data de faturamento:", error);
    return { success: false };
  }
}

// 15. Atualizar Pedido
export async function updatePedidoExame(idStr, updateData) {
  try {
    const numericId = Number(String(idStr).replace(/\D/g, ""));
    const isRevertingToWaiting = updateData.status === "Aguardando";

    const payload = {
      status: updateData.status,
      classificacaoRisco: updateData.classification,
      cnsPaciente: updateData.susCard || null,
      observacao:
        updateData.justification || updateData.generalObservation || null,
      medicoSolicitanteId: updateData.requestDoctorId
        ? Number(updateData.requestDoctorId)
        : null,
      ubsResponsavelId: updateData.requestUbsId
        ? Number(updateData.requestUbsId)
        : null,
    };

    if (updateData.procedureId) {
      payload.procedimentoId = Number(updateData.procedureId);
    }

    if (isRevertingToWaiting) {
      payload.tipoCota = null;
      payload.dataLiberacao = null;
      payload.medicoResponsavelId = null;
    } else {
      payload.tipoCota = updateData.quota || null;
      payload.dataLiberacao = updateData.releaseDate
        ? new Date(updateData.releaseDate)
        : null;
      payload.medicoResponsavelId = updateData.regulatorDoctorId
        ? Number(updateData.regulatorDoctorId)
        : null;
    }

    await prisma.pedidoExame.update({
      where: { id: numericId },
      data: payload,
    });

    revalidatePath("/regulacao");
    return { success: true };
  } catch (error) {
    console.error("Erro ao atualizar pedido:", error);
    return { success: false, error: error.message };
  }
}

// 16. Excluir Pedido
export async function deletePedidoExame(idStr) {
  try {
    const numericId = Number(String(idStr).replace(/\D/g, ""));
    await prisma.pedidoExame.delete({
      where: { id: numericId },
    });

    revalidatePath("/regulacao");
    return { success: true };
  } catch (error) {
    console.error("Erro ao excluir pedido:", error);
    return { success: false, error: error.message };
  }
}

// 17. Atualizar Médico
export async function updateMedico(id, data) {
  try {
    const medico = await prisma.medico.update({
      where: { id: Number(id) },
      data: {
        nome: data.nome,
        crm: data.crm,
        ufCrm: data.ufCrm.toUpperCase(),
        especialidade: data.especialidade,
      },
    });

    revalidatePath("/regulacao");
    return { success: true, data: medico };
  } catch (error) {
    console.error("Erro ao atualizar médico:", error);
    return { success: false, error: error.message };
  }
}

// 18. Excluir Médico
export async function deleteMedico(id) {
  try {
    await prisma.medico.update({
      where: { id: Number(id) },
      data: { ativo: false },
    });

    revalidatePath("/regulacao");
    return { success: true };
  } catch (error) {
    console.error("Erro ao excluir médico:", error);
    return { success: false, error: error.message };
  }
}

// 19. Atualizar Pessoa / Paciente
export async function updatePessoa(cpf, data) {
  try {
    const birthDate = data.dataNascimento
      ? new Date(`${data.dataNascimento}T00:00:00Z`)
      : new Date();

    const result = await prisma.$transaction(async (tx) => {
      const pessoa = await tx.pessoa.update({
        where: { cpf },
        data: {
          nomeCompleto: data.nomeCompleto,
          dataNascimento: birthDate,
          nomeMae: data.nomeMae,
          telefone: data.telefone,
        },
      });

      if (data.logradouro) {
        await tx.endereco.deleteMany({ where: { pessoaCpf: cpf } });
        await tx.endereco.create({
          data: {
            pessoaCpf: cpf,
            logradouro: data.logradouro,
            numero: data.numero || "S/N",
            complemento: data.complemento || null,
            bairro: data.bairro || "Centro",
            cidade: data.cidade || "Muriaé",
            uf: data.uf || "MG",
            cep: data.cep ? data.cep.replace(/\D/g, "") : null,
            enderecoAtual: true,
          },
        });
      }

      return pessoa;
    });

    revalidatePath("/regulacao");
    return { success: true, data: result };
  } catch (error) {
    console.error("Erro ao atualizar pessoa:", error);
    return { success: false, error: error.message };
  }
}

// 20. Excluir Pessoa / Paciente
export async function deletePessoa(cpf) {
  try {
    await prisma.$transaction(async (tx) => {
      await tx.endereco.deleteMany({ where: { pessoaCpf: cpf } });
      await tx.pessoa.delete({ where: { cpf } });
    });

    revalidatePath("/regulacao");
    return { success: true };
  } catch (error) {
    console.error("Erro ao excluir pessoa:", error);
    return { success: false, error: error.message };
  }
}

// 21. Atualizar UBS
export async function updateUbs(id, data) {
  try {
    const ubs = await prisma.ubs.update({
      where: { id: Number(id) },
      data: {
        nome: data.nome,
        cnes: data.cnes,
      },
    });

    revalidatePath("/regulacao");
    return { success: true, data: ubs };
  } catch (error) {
    console.error("Erro ao atualizar UBS:", error);
    return { success: false, error: error.message };
  }
}

// 22. Excluir UBS
export async function deleteUbs(id) {
  try {
    await prisma.ubs.update({
      where: { id: Number(id) },
      data: { ativo: false },
    });

    revalidatePath("/regulacao");
    return { success: true };
  } catch (error) {
    console.error("Erro ao excluir UBS:", error);
    return { success: false, error: error.message };
  }
}