"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";
import { criarPessoaTx, gravarEnderecoTx } from "@/lib/pessoa";

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────
function formatDateBR(d) {
  if (!d) return "";
  const s = d instanceof Date ? d.toISOString() : String(d);
  const parts = s.split("T")[0].split("-");
  return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : s;
}

// Transforma um registro Pessoa+Tutor em objeto plano para o frontend
function pessoaToTutor(pessoa) {
  const end = pessoa.enderecos?.[0];
  return {
    cpf: pessoa.cpf,
    nomeCompleto: pessoa.nomeCompleto,
    telefone: pessoa.telefone || "",
    dataNascimento: formatDateBR(pessoa.dataNascimento),
    nomeMae: pessoa.nomeMae || "",
    bairro: end?.bairro || "",
    logradouro: end?.logradouro || "",
    numero: end?.numero || "",
    complemento: end?.complemento || "",
    cidade: end?.cidade || "Muriaé",
    uf: end?.uf || "MG",
    cep: end?.cep || "",
    // Dados extras da tabela tutor
    rg: pessoa.tutor?.rg || "",
    sexo: pessoa.tutor?.sexo || "",
    profissao: pessoa.tutor?.profissao || "",
    telefoneSecundario: pessoa.tutor?.telefoneSecundario || "",
    pontoReferencia: pessoa.tutor?.pontoReferencia || "",
    observacoes: pessoa.tutor?.observacoes || "",
    isTutor: !!pessoa.tutor,
  };
}

// Transforma Animal do banco em objeto para o frontend
function animalToFront(a) {
  return {
    id: a.id,
    pessoa_cpf: a.pessoaCpf || "",
    tutorCpf: a.pessoaCpf || "", // alias para compatibilidade
    tutorNome: a.tutor?.pessoa?.nomeCompleto || "",
    nome: a.nome || "",
    especie: a.especie || "",
    sexo: a.sexo || "",
    porte: a.porte || "",
    idade: a.idade || "",
    castrado: a.castrado || "Não",
    fotoUrl: a.fotoUrl || null,
    doenca_cronica: a.doencaCronica || "Não",
    sintomas_vomito_diarreia: a.sintomasVomitoDiarreia || "Não",
    apetite_normal: a.apetiteNormal || "Sim",
    em_tratamento: a.emTratamento || "Não",
    qual_tratamento: a.qualTratamento || "",
    observacoes: a.observacoes || "",
    possui_responsavel: a.possuiResponsavel || "Sim",
    endereco_recolhimento: a.enderecoRecolhimento || "",
    data_cadastro: a.dataCadastro || null,
  };
}

function zoonoseToFront(z) {
  return {
    ...z,
    animal_id: z.animalId,
    data_identificacao: z.dataIdentificacao,
    grau_risco: z.grauRisco,
    risco_vida: z.riscoVida,
    formas_contaminacao: z.formasContaminacao,
    periodo_monitoramento: z.periodoMonitoramento,
    responsavel_monitoramento: z.responsavelMonitoramento,
  };
}

function denunciaToFront(d) {
  return {
    ...d,
    data_denuncia: d.dataDenuncia,
    descricao_cao: d.descricaoCao,
    animal_id: d.animalId,
    causou_risco: d.causouRisco,
  };
}

function esporotricoseToFront(e) {
  const aliases = {};
  for (const [camel, snake] of Object.entries({
    animalId: "animal_id",
    numeroProtocolo: "numero_protocolo",
    dataVisita: "data_visita",
    fiscalResponsavel: "fiscal_responsavel",
    apresentaLesoes: "apresenta_lesoes",
    descricaoLesoes: "descricao_lesoes",
    emTratamentoContinuo: "em_tratamento_continuo",
    profissionalServicoRef: "profissional_servico_ref",
    medicamentosPrescritos: "medicamentos_prescritos",
    interrupcaoTratamento: "interrupcao_tratamento",
    retornoVeterinario: "retorno_veterinario",
    isolamentoDomiciliar: "isolamento_domiciliar",
    observacoesIsolamento: "observacoes_isolamento",
    acessoRua: "acesso_rua",
    usoEpi: "uso_epi",
    quaisEpis: "quais_epis",
    higienizacaoAmbiente: "higienizacao_ambiente",
    outrosAnimaisResidencia: "outros_animais_residencia",
    outrosAnimaisDescricao: "outros_animais_descricao",
    pessoasComLesoes: "pessoas_com_lesoes",
    pessoasLesoesDescricao: "pessoas_lesoes_descricao",
    conclusaoTecnica: "conclusao_tecnica",
    encAcompanhamentoCcz: "enc_acompanhamento_ccz",
    encNotificacaoTutor: "enc_notificacao_tutor",
    encMinisterioPublico: "enc_ministerio_publico",
    encOutrasMedidas: "enc_outras_medidas",
    outrasMedidasDescricao: "outras_medidas_descricao",
  })) {
    aliases[snake] = e[camel];
  }
  return { ...e, ...aliases };
}

// ─────────────────────────────────────────────────────────────
// DASHBOARD
// ─────────────────────────────────────────────────────────────
async function getTutoresCCZ() {
  try {
    const tutoresDiretos = await prisma.tutor.findMany({
      include: {
        pessoa: {
          include: {
            enderecos: { where: { enderecoAtual: true } },
          },
        },
      },
      orderBy: {
        pessoa: { nomeCompleto: "asc" },
      },
    });

    if (tutoresDiretos.length > 0) {
      return tutoresDiretos.map((tutor) =>
        pessoaToTutor(tutor.pessoa ? { ...tutor.pessoa, tutor } : tutor),
      );
    }
  } catch (error) {
    console.warn(
      "Falha ao consultar tutores diretamente, tentando fallback:",
      error,
    );
  }

  const pessoasTutoras = await prisma.pessoa.findMany({
    where: { tutor: { isNot: null } },
    include: {
      tutor: true,
      enderecos: { where: { enderecoAtual: true } },
    },
    orderBy: { nomeCompleto: "asc" },
  });

  return pessoasTutoras.map(pessoaToTutor);
}

export async function getCCZDashboardData() {
  try {
    const [tutores, animais, denuncias, zoonoses, esporotricoses] =
      await Promise.all([
        getTutoresCCZ(),
        prisma.animal.findMany({
          include: {
            tutor: {
              include: {
                pessoa: true,
              },
            },
          },
          orderBy: { dataCadastro: "desc" },
        }),
        prisma.denunciaCaoAgressivo.findMany({
          orderBy: { dataDenuncia: "desc" },
        }),
        prisma.cadastroZoonoses.findMany({
          orderBy: { createdAt: "desc" },
        }),
        prisma.esporotricose.findMany({
          orderBy: { dataVisita: "desc" },
        }),
      ]);

    return {
      tutores,
      animais: animais.map(animalToFront),
      denuncias: denuncias.map(denunciaToFront),
      zoonoses: zoonoses.map(zoonoseToFront),
      esporotricoses: esporotricoses.map(esporotricoseToFront),
    };
  } catch (error) {
    console.error("Erro ao buscar dados CCZ:", error);
    return {
      tutores: [],
      animais: [],
      denuncias: [],
      zoonoses: [],
      esporotricoses: [],
    };
  }
}

// ─────────────────────────────────────────────────────────────
// BUSCA DE PESSOAS (autocomplete)
// ─────────────────────────────────────────────────────────────
export async function searchPessoasCCZ(termo) {
  if (!termo || termo.trim().length < 2) return [];
  try {
    const digits = termo.replace(/\D/g, "");
    const pessoas = await prisma.pessoa.findMany({
      where: {
        OR: [
          { nomeCompleto: { contains: termo, mode: "insensitive" } },
          ...(digits.length >= 3 ? [{ cpf: { contains: digits } }] : []),
        ],
      },
      include: {
        enderecos: { where: { enderecoAtual: true } },
        tutor: true,
      },
      take: 8,
      orderBy: { nomeCompleto: "asc" },
    });

    const resultados = pessoas.map(pessoaToTutor);
    if (resultados.length > 0) return resultados;

    const tutores = await prisma.tutor.findMany({
      include: {
        pessoa: {
          include: {
            enderecos: { where: { enderecoAtual: true } },
          },
        },
      },
      orderBy: {
        pessoa: { nomeCompleto: "asc" },
      },
      take: 8,
    });

    return tutores
      .map((tutor) =>
        pessoaToTutor(tutor.pessoa ? { ...tutor.pessoa, tutor } : tutor),
      )
      .filter((pessoa) => {
        const nome = (pessoa.nomeCompleto || "").toLowerCase();
        const cpf = (pessoa.cpf || "").replace(/\D/g, "");
        const busca = termo.toLowerCase();
        const buscaCpf = digits;

        return nome.includes(busca) || (buscaCpf && cpf.includes(buscaCpf));
      });
  } catch (error) {
    console.error("Erro ao buscar pessoas:", error);
    return [];
  }
}

// ─────────────────────────────────────────────────────────────
// VINCULAR / DESVINCULAR TUTOR
// ─────────────────────────────────────────────────────────────
export async function vincularTutor(cpf, dados) {
  try {
    await prisma.tutor.upsert({
      where: { pessoaCpf: cpf },
      update: {
        rg: dados.rg || null,
        sexo: dados.sexo || null,
        profissao: dados.profissao || null,
        telefoneSecundario: dados.telefoneSecundario
          ? dados.telefoneSecundario.replace(/\D/g, "")
          : null,
        pontoReferencia: dados.pontoReferencia || null,
        observacoes: dados.observacoes || null,
      },
      create: {
        pessoaCpf: cpf,
        rg: dados.rg || null,
        sexo: dados.sexo || null,
        profissao: dados.profissao || null,
        telefoneSecundario: dados.telefoneSecundario
          ? dados.telefoneSecundario.replace(/\D/g, "")
          : null,
        pontoReferencia: dados.pontoReferencia || null,
        observacoes: dados.observacoes || null,
      },
    });
    revalidatePath("/ccz");
    return { success: true };
  } catch (error) {
    console.error("Erro ao vincular tutor:", error);
    return { success: false, error: error.message };
  }
}

export async function cadastrarTutor(dados) {
  try {
    const cpf = String(dados.cpf || "").replace(/\D/g, "");
    const nomeCompleto = String(dados.nomeCompleto || "").trim();
    const nomeMae = String(dados.nomeMae || "").trim();
    const telefone = String(dados.telefone || "").replace(/\D/g, "");

    if (cpf.length !== 11) {
      return { success: false, error: "Informe um CPF válido com 11 dígitos." };
    }
    if (!nomeCompleto || !dados.dataNascimento || !nomeMae || !telefone) {
      return {
        success: false,
        error: "Preencha nome, data de nascimento, nome da mãe e telefone.",
      };
    }

    await prisma.$transaction(async (tx) => {
      // Pessoa via helper central (CCZ mantém "Não informado" como sexo padrão).
      await criarPessoaTx(tx, {
        cpf,
        nomeCompleto,
        sexo: dados.sexo || "Não informado",
        dataNascimento: dados.dataNascimento,
        nomeMae,
        telefone,
      });

      // Endereço (grava apenas se o formulário trouxe dados de endereço).
      await gravarEnderecoTx(tx, cpf, {
        cep: dados.cep,
        logradouro: dados.logradouro,
        numero: dados.numero,
        complemento: dados.complemento,
        bairro: dados.bairro,
        cidade: dados.cidade,
        uf: dados.uf,
      });

      await tx.tutor.create({
        data: {
          pessoaCpf: cpf,
          rg: dados.rg || null,
          sexo: dados.sexo || null,
          profissao: dados.profissao || null,
          telefoneSecundario: dados.telefoneSecundario
            ? String(dados.telefoneSecundario).replace(/\D/g, "")
            : null,
          pontoReferencia: dados.pontoReferencia || null,
          observacoes: dados.observacoes || null,
        },
      });
    });

    revalidatePath("/ccz");
    return { success: true };
  } catch (error) {
    console.error("Erro ao cadastrar tutor:", error);
    if (error?.code === "P2002") {
      return {
        success: false,
        error: "Já existe uma pessoa cadastrada com este CPF.",
      };
    }
    return { success: false, error: error.message };
  }
}

export async function desvincularTutor(cpf) {
  try {
    await prisma.tutor.delete({ where: { pessoaCpf: cpf } });
    revalidatePath("/ccz");
    return { success: true };
  } catch (error) {
    console.error("Erro ao desvincular tutor:", error);
    return { success: false, error: error.message };
  }
}

export async function createAnimal(data) {
  try {
    const animalId = String(data.id || "").trim();
    if (!animalId) {
      return { success: false, error: "Informe o ID do animal." };
    }

    const record = await prisma.animal.create({
      data: {
        id: animalId,
        pessoaCpf:
          data.possui_responsavel === "Sim" ? data.tutorCpf || null : null,
        nome: data.nome || null,
        fotoUrl: data.fotoUrl || null,
        especie: data.especie,
        sexo: (data.sexo || "M").charAt(0).toUpperCase(), // M | F | I
        porte: data.porte || "Médio",
        idade: data.idade || null,
        castrado:
          data.castrado === "Sim" || data.castrado === true ? "Sim" : "Não",
        doencaCronica: data.doenca_cronica || "Não",
        sintomasVomitoDiarreia: data.sintomas_vomito_diarreia || "Não",
        apetiteNormal: data.apetite_normal || "Sim",
        emTratamento: data.em_tratamento || "Não",
        qualTratamento: data.qual_tratamento || null,
        observacoes: data.observacoes || null,
        possuiResponsavel: data.possui_responsavel === "Sim" ? "Sim" : "Não",
        enderecoRecolhimento: data.endereco_recolhimento || null,
      },
    });
    revalidatePath("/ccz");
    return { success: true, data: record };
  } catch (error) {
    console.error("Erro ao criar animal:", error);
    if (error?.code === "P2002") {
      return {
        success: false,
        error: `Já existe um animal cadastrado com o ID ${String(data.id).trim()}. Informe um ID diferente.`,
      };
    }
    return { success: false, error: error.message };
  }
}

export async function updateAnimal(id, data) {
  try {
    const record = await prisma.animal.update({
      where: { id: String(id) },
      data: {
        pessoaCpf:
          data.possui_responsavel === "Sim" ? data.tutorCpf || null : null,
        nome: data.nome || null,
        fotoUrl: data.fotoUrl || null,
        especie: data.especie,
        sexo: (data.sexo || "M").charAt(0).toUpperCase(),
        porte: data.porte || "Médio",
        idade: data.idade || null,
        castrado:
          data.castrado === "Sim" || data.castrado === true ? "Sim" : "Não",
        doencaCronica: data.doenca_cronica || "Não",
        sintomasVomitoDiarreia: data.sintomas_vomito_diarreia || "Não",
        apetiteNormal: data.apetite_normal || "Sim",
        emTratamento: data.em_tratamento || "Não",
        qualTratamento: data.qual_tratamento || null,
        observacoes: data.observacoes || null,
        possuiResponsavel: data.possui_responsavel === "Sim" ? "Sim" : "Não",
        enderecoRecolhimento: data.endereco_recolhimento || null,
      },
    });
    revalidatePath("/ccz");
    return { success: true, data: record };
  } catch (error) {
    console.error("Erro ao atualizar animal:", error);
    return { success: false, error: error.message };
  }
}

export async function deleteAnimal(id) {
  try {
    await prisma.animal.delete({ where: { id: String(id) } });
    revalidatePath("/ccz");
    return { success: true };
  } catch (error) {
    console.error("Erro ao excluir animal:", error);
    return { success: false, error: error.message };
  }
}

// ─────────────────────────────────────────────────────────────
// PROCEDIMENTOS  (tabela: cadastro_procedimento)
// ─────────────────────────────────────────────────────────────
export async function createProcedimento(data) {
  try {
    const record = await prisma.cadastroProcedimento.create({
      data: {
        id: randomUUID(),
        animalId: data.animal_id,
        tipo: data.tipo,
        dataProcedimento: new Date(data.data_procedimento),
        veterinario: data.veterinario || null,
        status: data.status || "Realizado",
        descricao: data.descricao || null,
        medicacaoPrescrita: data.medicacao_prescrita || null,
        dataRetorno: data.data_retorno ? new Date(data.data_retorno) : null,
      },
    });
    revalidatePath("/ccz");
    return { success: true, data: record };
  } catch (error) {
    console.error("Erro ao criar procedimento:", error);
    return { success: false, error: error.message };
  }
}

export async function updateProcedimento(id, data) {
  try {
    const record = await prisma.cadastroProcedimento.update({
      where: { id: String(id) },
      data: {
        animalId: data.animal_id,
        tipo: data.tipo,
        dataProcedimento: new Date(data.data_procedimento),
        veterinario: data.veterinario || null,
        status: data.status || "Realizado",
        descricao: data.descricao || null,
        medicacaoPrescrita: data.medicacao_prescrita || null,
        dataRetorno: data.data_retorno ? new Date(data.data_retorno) : null,
      },
    });
    revalidatePath("/ccz");
    return { success: true, data: record };
  } catch (error) {
    console.error("Erro ao atualizar procedimento:", error);
    return { success: false, error: error.message };
  }
}

export async function deleteProcedimento(id) {
  try {
    await prisma.cadastroProcedimento.delete({ where: { id: String(id) } });
    revalidatePath("/ccz");
    return { success: true };
  } catch (error) {
    console.error("Erro ao excluir procedimento:", error);
    return { success: false, error: error.message };
  }
}

export async function getProcedimentosByAnimal(animalId) {
  try {
    return await prisma.cadastroProcedimento.findMany({
      where: { animalId: String(animalId) },
      orderBy: { dataProcedimento: "desc" },
    });
  } catch (error) {
    console.error("Erro ao buscar procedimentos:", error);
    return [];
  }
}

// ─────────────────────────────────────────────────────────────
// ZOONOSES  (tabela: cadastro_zoonoses)
// ─────────────────────────────────────────────────────────────
export async function createZoonose(data) {
  try {
    const record = await prisma.cadastroZoonoses.create({
      data: {
        id: randomUUID(),
        animalId: String(data.animal_id),
        doenca: data.doenca,
        dataIdentificacao: new Date(data.data_identificacao),
        grauRisco: data.grau_risco,
        riscoVida: data.risco_vida || "Não",
        formasContaminacao: data.formas_contaminacao || null,
        periodoMonitoramento: data.periodo_monitoramento || "Não informado",
        responsavelMonitoramento: data.responsavel_monitoramento || null,
        observacao: data.observacao || null,
      },
    });
    revalidatePath("/ccz");
    return { success: true, data: record };
  } catch (error) {
    console.error("Erro ao criar zoonose:", error);
    return { success: false, error: error.message };
  }
}

// ─────────────────────────────────────────────────────────────
// DENÚNCIAS DE CÃO AGRESSIVO
// ─────────────────────────────────────────────────────────────
export async function createDenuncia(data) {
  try {
    const record = await prisma.denunciaCaoAgressivo.create({
      data: {
        id: randomUUID(),
        localizacao: data.localizacao,
        descricaoCao: data.descricao_cao,
        relato: data.relato,
        animalId: data.animal_id || null,
        causouRisco: data.causou_risco || "Não",
      },
    });
    revalidatePath("/ccz");
    return { success: true, data: record };
  } catch (error) {
    console.error("Erro ao criar denúncia:", error);
    return { success: false, error: error.message };
  }
}

export async function updateDenuncia(id, data) {
  try {
    const record = await prisma.denunciaCaoAgressivo.update({
      where: { id: String(id) },
      data: {
        localizacao: data.localizacao,
        descricaoCao: data.descricao_cao,
        relato: data.relato,
        animalId: data.animal_id || null,
        causouRisco: data.causou_risco || "Não",
      },
    });
    revalidatePath("/ccz");
    return { success: true, data: record };
  } catch (error) {
    console.error("Erro ao atualizar denúncia:", error);
    return { success: false, error: error.message };
  }
}

export async function deleteDenuncia(id) {
  try {
    await prisma.denunciaCaoAgressivo.delete({ where: { id: String(id) } });
    revalidatePath("/ccz");
    return { success: true };
  } catch (error) {
    console.error("Erro ao excluir denúncia:", error);
    return { success: false, error: error.message };
  }
}

export async function excluirZoonoseAction(id) {
  if (!id) {
    return { success: false, error: "ID não fornecido para exclusão." };
  }

  try {
    await prisma.cadastroZoonoses.delete({ where: { id: String(id) } });
    revalidatePath("/ccz");

    return { success: true };
  } catch (error) {
    console.error("Erro ao excluir zoonose:", error);
    return {
      success: false,
      error: error.message || "Erro ao excluir o registro.",
    };
  }
}

/**
 * Atualiza um registro de zoonose existente
 * @param {string|number} id - ID da zoonose
 * @param {Object} dados - Objeto com os campos atualizados
 */
export async function salvarEdicaoZoonoseAction(id, dados) {
  if (!id) {
    return { success: false, error: "ID não fornecido para atualização." };
  }

  try {
    const record = await prisma.cadastroZoonoses.update({
      where: { id: String(id) },
      data: {
        animalId: String(dados.animal_id),
        doenca: dados.doenca,
        dataIdentificacao: new Date(dados.data_identificacao),
        grauRisco: dados.grau_risco,
        riscoVida: dados.risco_vida || "Não",
        formasContaminacao: dados.formas_contaminacao || null,
        periodoMonitoramento: dados.periodo_monitoramento || "Não informado",
        responsavelMonitoramento: dados.responsavel_monitoramento || null,
        observacao: dados.observacao || null,
      },
    });

    revalidatePath("/ccz");

    return { success: true, data: record };
  } catch (error) {
    console.error("Erro ao atualizar zoonose:", error);
    return {
      success: false,
      error: error.message || "Erro ao salvar alterações.",
    };
  }
}

export async function salvarEsporotricoseAction(dados, id = null) {
  try {
    const payload = {
      animalId: dados.animal_id || null,
      numeroProtocolo: dados.numero_protocolo || null,
      dataVisita: dados.data_visita ? new Date(dados.data_visita) : new Date(),
      fiscalResponsavel: dados.fiscal_responsavel || null,
      apresentaLesoes: dados.apresenta_lesoes || "Sim",
      descricaoLesoes: dados.descricao_lesoes || null,
      emTratamentoContinuo: dados.em_tratamento_continuo || "Sim",
      profissionalServicoRef: dados.profissional_servico_ref || null,
      medicamentosPrescritos: dados.medicamentos_prescritos || null,
      interrupcaoTratamento: dados.interrupcao_tratamento || "Não",
      retornoVeterinario: dados.retorno_veterinario || "Sim",
      isolamentoDomiciliar: dados.isolamento_domiciliar || "Sim",
      observacoesIsolamento: dados.observacoes_isolamento || null,
      acessoRua: dados.acesso_rua || "Não",
      usoEpi: dados.uso_epi || "Sim",
      quaisEpis: dados.quais_epis || null,
      higienizacaoAmbiente: dados.higienizacao_ambiente || null,
      outrosAnimaisResidencia: dados.outros_animais_residencia || "Não",
      outrosAnimaisDescricao: dados.outros_animais_descricao || null,
      pessoasComLesoes: dados.pessoas_com_lesoes || "Não",
      pessoasLesoesDescricao: dados.pessoas_lesoes_descricao || null,
      conclusaoTecnica: dados.conclusao_tecnica || null,
      encAcompanhamentoCcz: Boolean(dados.enc_acompanhamento_ccz),
      encNotificacaoTutor: Boolean(dados.enc_notificacao_tutor),
      encMinisterioPublico: Boolean(dados.enc_ministerio_publico),
      encOutrasMedidas: Boolean(dados.enc_outras_medidas),
      outrasMedidasDescricao: dados.outras_medidas_descricao || null,
    };

    if (id) {
      await prisma.esporotricose.update({
        where: { id: String(id) },
        data: payload,
      });
    } else {
      await prisma.esporotricose.create({
        data: {
          id: `esp_${Date.now()}`,
          ...payload,
        },
      });
    }

    revalidatePath("/ccz");
    return { success: true };
  } catch (error) {
    console.error("Erro ao salvar esporotricose:", error);
    return { success: false, error: error.message };
  }
}

export async function excluirEsporotricoseAction(id) {
  if (!id) return { success: false, error: "ID não fornecido" };

  try {
    await prisma.esporotricose.delete({
      where: { id: String(id) },
    });

    revalidatePath("/ccz");
    return { success: true };
  } catch (error) {
    console.error("Erro ao excluir esporotricose:", error);
    return { success: false, error: error.message };
  }
}

export async function updateTutor(cpf, data) {
  if (!cpf) return { success: false, error: "CPF não informado." };

  try {
    const pessoaCpf = String(cpf).replace(/\D/g, "");

    await prisma.$transaction(async (tx) => {
      const pessoa = await tx.pessoa.findUnique({
        where: { cpf: pessoaCpf },
        include: {
          tutor: true,
          enderecos: { where: { enderecoAtual: true }, take: 1 },
        },
      });

      if (!pessoa) throw new Error("Responsável não encontrado.");

      await tx.pessoa.update({
        where: { cpf: pessoaCpf },
        data: {
          nomeCompleto: data.nomeCompleto?.trim() || pessoa.nomeCompleto,
          telefone: data.telefone
            ? String(data.telefone).replace(/\D/g, "")
            : pessoa.telefone,
          sexo: data.sexo || pessoa.sexo,
        },
      });

      await tx.tutor.update({
        where: { pessoaCpf },
        data: {
          rg: data.rg || null,
          sexo: data.sexo || null,
          profissao: data.profissao || null,
          telefoneSecundario: data.telefoneSecundario
            ? String(data.telefoneSecundario).replace(/\D/g, "")
            : null,
          pontoReferencia: data.pontoReferencia || null,
          observacoes: data.observacoes || null,
        },
      });

      // Endereço via helper central (substitui o endereço atual se houver dados).
      await gravarEnderecoTx(tx, pessoaCpf, {
        cep: data.cep,
        logradouro: data.logradouro,
        numero: data.numero,
        complemento: data.complemento,
        bairro: data.bairro,
        cidade: data.cidade,
        uf: data.uf,
      });
    });

    revalidatePath("/ccz");
    return { success: true };
  } catch (error) {
    console.error("Erro ao atualizar tutor:", error);
    return {
      success: false,
      error: error.message || "Erro ao salvar alterações.",
    };
  }
}

export async function deleteTutor(cpf) {
  if (!cpf) return { success: false, error: "CPF não informado." };

  try {
    await prisma.pessoa.delete({
      where: { cpf: String(cpf).replace(/\D/g, "") },
    });

    revalidatePath("/ccz");
    return { success: true };
  } catch (error) {
    console.error("Erro ao excluir tutor:", error);
    return {
      success: false,
      error:
        error.code === "P2003"
          ? "Não é possível excluir o responsável pois existem animais ou atendimentos vinculados a ele."
          : error.message || "Erro ao excluir responsável.",
    };
  }
}
