"use server";

import { prisma } from "@/lib/prisma";
import { requireAcessoModulo } from "@/lib/auth";
import { MODULOS } from "@/lib/permissions";
import { revalidatePath } from "next/cache";
import {
  soDigitos,
  validarCpf,
  upsertPessoaTx,
  gravarEnderecoTx,
} from "@/lib/pessoa";

// ═══════════════════════════════════════════════════════════════════════════
// SERVER ACTIONS DO MÓDULO CCZ / ZOONOSES
// ─────────────────────────────────────────────────────────────────────────
// Todas as actions exigem vínculo com o módulo CCZ (requireAcessoModulo). O
// Tutor é uma Pessoa: salvar tutor grava em `pessoa` + `pessoa_endereco` via
// helpers tx-aware (@/lib/pessoa) e faz upsert em `ccz_tutores`, tudo na mesma
// transação. Retorno padrão: { success, error?, data? }.
// ═══════════════════════════════════════════════════════════════════════════

// Formata a data (YYYY-MM-DD) usada pelos inputs type="date".
const dataParaInput = (data) => {
  if (!data) return "";
  return new Date(data).toISOString().slice(0, 10);
};

// Monta o objeto serializável de uma pessoa + endereço atual (+ dados de tutor).
const serializarPessoa = (pessoa) => {
  const endereco = pessoa.enderecos?.[0] || null;
  const tutor = pessoa.tutor || null;
  return {
    cpf: pessoa.cpf,
    nomeCompleto: pessoa.nomeCompleto,
    sexo: pessoa.sexo || "Masculino",
    dataNascimento: dataParaInput(pessoa.dataNascimento),
    nomeMae: pessoa.nomeMae || "",
    telefone: pessoa.telefone || "",
    cns: pessoa.cns || "",
    logradouro: endereco?.logradouro || "",
    numero: endereco?.numero || "",
    complemento: endereco?.complemento || "",
    bairro: endereco?.bairro || "",
    cidade: endereco?.cidade || "Muriaé",
    uf: endereco?.uf || "MG",
    cep: endereco?.cep || "",
    // Dados complementares específicos do CCZ (preenche o form ao reabrir).
    jaEhTutor: Boolean(tutor),
    rg: tutor?.rg || "",
    tutorSexo: tutor?.sexo || "",
    profissao: tutor?.profissao || "",
    telefoneSecundario: tutor?.telefoneSecundario || "",
    pontoReferencia: tutor?.pontoReferencia || "",
    observacoes: tutor?.observacoes || "",
  };
};

// ── BUSCAR PESSOAS (autocomplete do campo "Nome completo" do Tutor) ─────────
export async function buscarPessoasCCZ(termo = "") {
  try {
    await requireAcessoModulo(MODULOS.CCZ);

    const termoLimpo = String(termo || "").trim();
    const termoDigitos = soDigitos(termoLimpo);

    const where = termoLimpo
      ? {
          OR: [
            { nomeCompleto: { contains: termoLimpo, mode: "insensitive" } },
            ...(termoDigitos ? [{ cpf: { contains: termoDigitos } }] : []),
          ],
        }
      : {};

    const pessoas = await prisma.pessoa.findMany({
      where,
      orderBy: { nomeCompleto: "asc" },
      take: 8,
      include: {
        enderecos: { where: { enderecoAtual: true }, take: 1 },
        tutor: true,
      },
    });

    return { success: true, data: pessoas.map(serializarPessoa) };
  } catch (error) {
    if (error.status === 401 || error.status === 403) {
      return { success: false, error: error.message };
    }
    console.error("Erro ao buscar pessoas (CCZ):", error);
    return { success: false, error: "Erro ao buscar pessoas." };
  }
}

// ── LISTAR ANIMAIS DE UM TUTOR (bloco de vínculos no cadastro do tutor) ─────
export async function listarAnimaisDoTutor(pessoaCpf) {
  try {
    await requireAcessoModulo(MODULOS.CCZ);

    const cpf = soDigitos(pessoaCpf);
    if (!cpf) return { success: true, data: [] };

    const animais = await prisma.animal.findMany({
      where: { pessoaCpf: cpf },
      orderBy: { dataCadastro: "desc" },
    });

    const data = animais.map((a) => ({
      id: a.id,
      nome: a.nome || "",
      especie: a.especie || "",
      sexo: a.sexo === "F" ? "Fêmea" : "Macho",
      porte: a.porte || "",
      idade: a.idade || "",
      castrado: a.castrado || "Não",
    }));

    return { success: true, data };
  } catch (error) {
    if (error.status === 401 || error.status === 403) {
      return { success: false, error: error.message };
    }
    console.error("Erro ao listar animais do tutor (CCZ):", error);
    return { success: false, error: "Erro ao carregar os animais do tutor." };
  }
}

// ── LISTAR TUTORES COM SEUS ANIMAIS (aba Tutor > Lista) ─────────────────────
export async function listarTutoresComAnimais() {
  try {
    await requireAcessoModulo(MODULOS.CCZ);

    const tutores = await prisma.tutor.findMany({
      include: {
        pessoa: true,
        animais: { orderBy: { dataCadastro: "desc" } },
      },
      orderBy: { pessoa: { nomeCompleto: "asc" } },
    });

    const data = tutores.map((t) => ({
      pessoaCpf: t.pessoaCpf,
      nome: t.pessoa?.nomeCompleto || "",
      cpf: t.pessoa?.cpf || "",
      cns: t.pessoa?.cns || "",
      telefone: t.pessoa?.telefone || "",
      animais: (t.animais || []).map((a) => ({
        id: a.id,
        nome: a.nome || "",
        especie: a.especie || "",
        sexo: a.sexo === "F" ? "Fêmea" : "Macho",
        porte: a.porte || "",
        idade: a.idade || "",
        castrado: a.castrado || "Não",
      })),
    }));

    return { success: true, data };
  } catch (error) {
    if (error.status === 401 || error.status === 403) {
      return { success: false, error: error.message };
    }
    console.error("Erro ao listar tutores com animais (CCZ):", error);
    return { success: false, error: "Erro ao carregar os tutores." };
  }
}

// ── OBTER UM ANIMAL (para carregar no formulário de edição) ─────────────────
export async function obterAnimal(id) {
  try {
    await requireAcessoModulo(MODULOS.CCZ);

    const animalId = String(id || "").trim();
    if (!animalId) return { success: false, error: "Id do animal não informado." };

    const a = await prisma.animal.findUnique({
      where: { id: animalId },
      include: { tutor: { include: { pessoa: true } } },
    });
    if (!a) return { success: false, error: "Animal não encontrado." };

    // "Doença crônica: ..." foi concatenada em observacoes ao salvar; aqui
    // separamos de volta para preencher o campo "qual doença" na edição.
    let qualDoenca = "";
    let observacoes = a.observacoes || "";
    const m = observacoes.match(/^Doença crônica:\s*(.*)(?:\n([\s\S]*))?$/);
    if (a.doencaCronica === "Sim" && m) {
      qualDoenca = (m[1] || "").trim();
      observacoes = (m[2] || "").trim();
    }

    const data = {
      fotoUrl: a.fotoUrl || "",
      id: a.id,
      nome: a.nome || "",
      especie: a.especie || "",
      sexo: a.sexo === "F" ? "Fêmea" : "Macho",
      porte: a.porte || "",
      idade: a.idade || "",
      possuiResponsavel: a.possuiResponsavel === "Sim" ? "Sim" : "Não",
      pessoaCpf: a.pessoaCpf || "",
      tutorNome: a.tutor?.pessoa?.nomeCompleto || "",
      castrado: a.castrado || "Não",
      doencaCronica: a.doencaCronica || "Não",
      qualDoenca,
      apetiteNormal: a.apetiteNormal || "Sim",
      sintomasVomitoDiarreia: a.sintomasVomitoDiarreia || "Não",
      emTratamento: a.emTratamento || "Não",
      qualTratamento: a.qualTratamento || "",
      observacoes,
    };

    return { success: true, data };
  } catch (error) {
    if (error.status === 401 || error.status === 403) {
      return { success: false, error: error.message };
    }
    console.error("Erro ao obter animal (CCZ):", error);
    return { success: false, error: "Erro ao carregar o animal." };
  }
}

// ── SALVAR TUTOR (Pessoa + Endereço + ccz_tutores) ──────────────────────────
export async function salvarTutor(dados) {
  try {
    await requireAcessoModulo(MODULOS.CCZ);

    if (!validarCpf(dados.cpf)) {
      return { success: false, error: "CPF inválido. Verifique os dígitos informados." };
    }
    if (!dados.nomeCompleto?.trim()) {
      return { success: false, error: "Nome completo é obrigatório." };
    }
    if (!dados.dataNascimento) {
      return { success: false, error: "Data de nascimento é obrigatória." };
    }
    if (!soDigitos(dados.telefone)) {
      return { success: false, error: "Telefone é obrigatório." };
    }

    const cpf = soDigitos(dados.cpf);
    const dadosTutor = {
      rg: dados.rg ? String(dados.rg).slice(0, 20) : null,
      sexo: dados.tutorSexo ? String(dados.tutorSexo).slice(0, 20) : null,
      profissao: dados.profissao ? String(dados.profissao).slice(0, 100) : null,
      telefoneSecundario: dados.telefoneSecundario
        ? soDigitos(dados.telefoneSecundario).slice(0, 20)
        : null,
      pontoReferencia: dados.pontoReferencia
        ? String(dados.pontoReferencia).slice(0, 150)
        : null,
      observacoes: dados.observacoes ? String(dados.observacoes) : null,
    };

    await prisma.$transaction(async (tx) => {
      await upsertPessoaTx(tx, dados);
      await gravarEnderecoTx(tx, cpf, dados);
      await tx.tutor.upsert({
        where: { pessoaCpf: cpf },
        update: dadosTutor,
        create: { pessoaCpf: cpf, ...dadosTutor },
      });
    });

    revalidatePath("/ccz");
    return { success: true, data: { pessoaCpf: cpf } };
  } catch (error) {
    if (error.status === 401 || error.status === 403) {
      return { success: false, error: error.message };
    }
    if (error.code === "P2002") {
      return { success: false, error: "CPF ou CNS já cadastrado." };
    }
    if (error.code === "P2003") {
      return { success: false, error: "Registro vinculado inválido." };
    }
    console.error("Erro ao salvar tutor (CCZ):", error);
    return { success: false, error: error.message || "Erro ao salvar tutor." };
  }
}

// ── LISTAR TUTORES (seletor de tutor do Animal) ─────────────────────────────
export async function listarTutores() {
  try {
    await requireAcessoModulo(MODULOS.CCZ);

    const tutores = await prisma.tutor.findMany({
      include: { pessoa: true },
      orderBy: { pessoa: { nomeCompleto: "asc" } },
    });

    const data = tutores.map((t) => ({
      pessoaCpf: t.pessoaCpf,
      nome: t.pessoa?.nomeCompleto || "",
      telefone: t.pessoa?.telefone || "",
      rg: t.rg || "",
    }));

    return { success: true, data };
  } catch (error) {
    if (error.status === 401 || error.status === 403) {
      return { success: false, error: error.message };
    }
    console.error("Erro ao listar tutores (CCZ):", error);
    return { success: false, error: "Erro ao carregar os tutores." };
  }
}

// ── FICHA COMPLETA DO ANIMAL (dados + tutor + histórico de procedimentos) ───
export async function obterFichaAnimal(id) {
  try {
    await requireAcessoModulo(MODULOS.CCZ);

    const animalId = String(id || "").trim();
    if (!animalId) return { success: false, error: "Id do animal não informado." };

    const a = await prisma.animal.findUnique({
      where: { id: animalId },
      include: {
        tutor: { include: { pessoa: true } },
        procedimentos: { orderBy: { dataProcedimento: "desc" } },
      },
    });
    if (!a) return { success: false, error: "Animal não encontrado." };

    // "Doença crônica: ..." foi concatenada em observacoes ao salvar; separa de volta.
    let qualDoenca = "";
    let observacoes = a.observacoes || "";
    const m = observacoes.match(/^Doença crônica:\s*(.*)(?:\n([\s\S]*))?$/);
    if (a.doencaCronica === "Sim" && m) {
      qualDoenca = (m[1] || "").trim();
      observacoes = (m[2] || "").trim();
    }

    const ymd = (d) => (d ? new Date(d).toISOString().slice(0, 10) : "");

    const tutorPessoa = a.tutor?.pessoa || null;

    const data = {
      id: a.id,
      fotoUrl: a.fotoUrl || "",
      nome: a.nome || "",
      especie: a.especie || "",
      sexo: a.sexo === "F" ? "Fêmea" : "Macho",
      porte: a.porte || "",
      idade: a.idade || "",
      castrado: a.castrado || "Não",
      doencaCronica: a.doencaCronica || "Não",
      qualDoenca,
      apetiteNormal: a.apetiteNormal || "Sim",
      sintomasVomitoDiarreia: a.sintomasVomitoDiarreia || "Não",
      emTratamento: a.emTratamento || "Não",
      qualTratamento: a.qualTratamento || "",
      observacoes,
      possuiResponsavel: a.possuiResponsavel || "Não",
      dataCadastro: a.dataCadastro ? a.dataCadastro.toISOString() : null,
      tutor: tutorPessoa
        ? {
            cpf: tutorPessoa.cpf,
            nome: tutorPessoa.nomeCompleto || "",
            telefone: tutorPessoa.telefone || "",
          }
        : null,
      procedimentos: (a.procedimentos || []).map((p) => ({
        id: p.id,
        tipo: p.tipo,
        dataProcedimento: ymd(p.dataProcedimento),
        veterinario: p.veterinario || "",
        status: p.status || "Agendado",
        descricao: p.descricao || "",
        medicacaoPrescrita: p.medicacaoPrescrita || "",
        dataRetorno: ymd(p.dataRetorno),
      })),
    };

    return { success: true, data };
  } catch (error) {
    if (error.status === 401 || error.status === 403) {
      return { success: false, error: error.message };
    }
    console.error("Erro ao obter ficha do animal (CCZ):", error);
    return { success: false, error: "Erro ao carregar a ficha do animal." };
  }
}

// ── BUSCAR ANIMAIS (autocomplete do seletor de animal em Procedimentos) ─────
export async function buscarAnimaisCCZ(termo = "") {
  try {
    await requireAcessoModulo(MODULOS.CCZ);

    const termoLimpo = String(termo || "").trim();

    const where = termoLimpo
      ? {
          OR: [
            { nome: { contains: termoLimpo, mode: "insensitive" } },
            { id: { contains: termoLimpo, mode: "insensitive" } },
            { especie: { contains: termoLimpo, mode: "insensitive" } },
          ],
        }
      : {};

    const animais = await prisma.animal.findMany({
      where,
      orderBy: { dataCadastro: "desc" },
      take: 8,
      include: { tutor: { include: { pessoa: true } } },
    });

    const data = animais.map((a) => ({
      id: a.id,
      nome: a.nome || "",
      especie: a.especie || "",
      sexo: a.sexo === "F" ? "Fêmea" : "Macho",
      porte: a.porte || "",
      tutorNome: a.tutor?.pessoa?.nomeCompleto || "",
    }));

    return { success: true, data };
  } catch (error) {
    if (error.status === 401 || error.status === 403) {
      return { success: false, error: error.message };
    }
    console.error("Erro ao buscar animais (CCZ):", error);
    return { success: false, error: "Erro ao buscar animais." };
  }
}

// ── SALVAR ANIMAL (ccz_animais) ─────────────────────────────────────────────
export async function salvarAnimal(dados) {
  try {
    await requireAcessoModulo(MODULOS.CCZ);

    // Id: usa o informado ou gera um (ANM-<timestamp base36>), limitado a 50.
    const idInformado = dados.id ? String(dados.id).trim() : "";
    const id = (idInformado || `ANM-${Date.now().toString(36)}`)
      .toUpperCase()
      .slice(0, 50);

    if (!dados.especie) {
      return { success: false, error: "Espécie é obrigatória." };
    }
    if (!dados.porte) {
      return { success: false, error: "Porte é obrigatório." };
    }
    if (!dados.sexo) {
      return { success: false, error: "Sexo é obrigatório." };
    }

    // Sexo persistido como 1 caractere ("M"/"F"), coluna @db.Char(1).
    const sexo = String(dados.sexo).trim().toUpperCase().startsWith("F") ? "F" : "M";

    const possuiResponsavel = dados.possuiResponsavel === "Sim" ? "Sim" : "Não";
    const pessoaCpf =
      possuiResponsavel === "Sim" && dados.pessoaCpf
        ? soDigitos(dados.pessoaCpf)
        : null;

    // "Qual doença" não tem coluna própria: concatena em observacoes.
    let observacoes = dados.observacoes ? String(dados.observacoes).trim() : "";
    if (dados.doencaCronica === "Sim" && dados.qualDoenca?.trim()) {
      const prefixo = `Doença crônica: ${dados.qualDoenca.trim()}`;
      observacoes = observacoes ? `${prefixo}\n${observacoes}` : prefixo;
    }

    const dadosAnimal = {
      pessoaCpf,
      fotoUrl: dados.fotoUrl || null,
      nome: dados.nome ? String(dados.nome).slice(0, 100) : null,
      especie: String(dados.especie).slice(0, 50),
      sexo,
      porte: String(dados.porte).slice(0, 20),
      idade: dados.idade ? String(dados.idade).slice(0, 50) : null,
      castrado: dados.castrado === "Sim" ? "Sim" : "Não",
      doencaCronica: dados.doencaCronica === "Sim" ? "Sim" : "Não",
      sintomasVomitoDiarreia: dados.sintomasVomitoDiarreia === "Sim" ? "Sim" : "Não",
      apetiteNormal: dados.apetiteNormal === "Não" ? "Não" : "Sim",
      emTratamento: dados.emTratamento === "Sim" ? "Sim" : "Não",
      qualTratamento:
        dados.emTratamento === "Sim" && dados.qualTratamento?.trim()
          ? String(dados.qualTratamento).slice(0, 150)
          : null,
      observacoes: observacoes || null,
      possuiResponsavel,
      enderecoRecolhimento: null,
    };

    await prisma.$transaction(async (tx) => {
      // Se o animal tem tutor, garante que a pessoa esteja registrada como
      // tutora (ccz_tutores). Assim o vínculo Pessoa → Tutor → Animal fica
      // íntegro e o relatório do paciente consegue listar os animais dela.
      if (pessoaCpf) {
        const pessoa = await tx.pessoa.findUnique({
          where: { cpf: pessoaCpf },
          select: { cpf: true },
        });
        if (!pessoa) {
          throw Object.assign(new Error("Pessoa (tutor) não encontrada no cadastro."), {
            codigoApp: "TUTOR_INEXISTENTE",
          });
        }
        await tx.tutor.upsert({
          where: { pessoaCpf },
          update: {},
          create: { pessoaCpf },
        });
      }

      await tx.animal.upsert({
        where: { id },
        update: dadosAnimal,
        create: { id, ...dadosAnimal },
      });
    });

    revalidatePath("/ccz");
    return { success: true, data: { id } };
  } catch (error) {
    if (error.status === 401 || error.status === 403) {
      return { success: false, error: error.message };
    }
    if (error.codigoApp === "TUTOR_INEXISTENTE") {
      return { success: false, error: error.message };
    }
    if (error.code === "P2002") {
      return { success: false, error: "Já existe um animal com este Id." };
    }
    if (error.code === "P2003") {
      return { success: false, error: "Tutor selecionado inválido ou inexistente." };
    }
    console.error("Erro ao salvar animal (CCZ):", error);
    return { success: false, error: error.message || "Erro ao salvar animal." };
  }
}

// ── LISTAR ANIMAIS (opcional) ───────────────────────────────────────────────
export async function listarAnimais() {
  try {
    await requireAcessoModulo(MODULOS.CCZ);

    const animais = await prisma.animal.findMany({
      include: { tutor: { include: { pessoa: true } } },
      orderBy: { dataCadastro: "desc" },
    });

    const data = animais.map((a) => ({
      id: a.id,
      nome: a.nome || "",
      especie: a.especie,
      sexo: a.sexo === "F" ? "Fêmea" : "Macho",
      porte: a.porte,
      idade: a.idade || "",
      castrado: a.castrado || "Não",
      doencaCronica: a.doencaCronica || "Não",
      sintomasVomitoDiarreia: a.sintomasVomitoDiarreia || "Não",
      apetiteNormal: a.apetiteNormal || "Sim",
      emTratamento: a.emTratamento || "Não",
      qualTratamento: a.qualTratamento || "",
      observacoes: a.observacoes || "",
      possuiResponsavel: a.possuiResponsavel || "Não",
      fotoUrl: a.fotoUrl || "",
      pessoaCpf: a.pessoaCpf || "",
      tutorNome: a.tutor?.pessoa?.nomeCompleto || "",
      dataCadastro: a.dataCadastro ? a.dataCadastro.toISOString() : null,
    }));

    return { success: true, data };
  } catch (error) {
    if (error.status === 401 || error.status === 403) {
      return { success: false, error: error.message };
    }
    console.error("Erro ao listar animais (CCZ):", error);
    return { success: false, error: "Erro ao carregar os animais." };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// PROCEDIMENTOS DO ANIMAL (ccz_procedimentos)
// ─────────────────────────────────────────────────────────────────────────
// Tipos válidos (dropdown). Status: Agendado | Realizado | Cancelado.
// O "retorno Sim/Não" é só da UI: quando "Não", dataRetorno fica null.
// ═══════════════════════════════════════════════════════════════════════════

const TIPOS_PROCEDIMENTO = [
  "Castração",
  "Vacinação",
  "Vermifugação",
  "Cirurgia",
  "Consulta",
  "Exame",
  "Internação",
  "Eutanásia",
];
const STATUS_PROCEDIMENTO = ["Agendado", "Realizado", "Cancelado"];

// Converte 'YYYY-MM-DD' em Date UTC (coluna @db.Date), sem desvio de fuso.
const ymdParaDateUTC = (ymd) => {
  const [a, m, d] = String(ymd || "").split("-").map(Number);
  if (!a || !m || !d) return null;
  return new Date(Date.UTC(a, m - 1, d));
};
const dateParaYMD = (data) => (data ? new Date(data).toISOString().slice(0, 10) : "");

// ── SALVAR PROCEDIMENTO (cria ou atualiza) ──────────────────────────────────
export async function salvarProcedimento(dados) {
  try {
    await requireAcessoModulo(MODULOS.CCZ);

    const animalId = String(dados.animalId || "").trim();
    if (!animalId) return { success: false, error: "Selecione o animal." };

    const tipo = String(dados.tipo || "").trim();
    if (!TIPOS_PROCEDIMENTO.includes(tipo)) {
      return { success: false, error: "Selecione um tipo de procedimento válido." };
    }

    const dataProcedimento = ymdParaDateUTC(dados.dataProcedimento);
    if (!dataProcedimento) {
      return { success: false, error: "Informe a data do procedimento." };
    }

    const status = STATUS_PROCEDIMENTO.includes(dados.status) ? dados.status : "Agendado";

    // Retorno: só grava a data quando "Sim" e a data foi informada.
    const temRetorno = dados.temRetorno === "Sim";
    const dataRetorno = temRetorno ? ymdParaDateUTC(dados.dataRetorno) : null;
    if (temRetorno && !dataRetorno) {
      return { success: false, error: "Informe a data de retorno." };
    }

    // Id: usa o informado (edição) ou gera um novo.
    const idInformado = dados.id ? String(dados.id).trim() : "";
    const id = (idInformado || `PRO-${Date.now().toString(36)}`).toUpperCase().slice(0, 50);

    // O animal precisa existir.
    const animal = await prisma.animal.findUnique({
      where: { id: animalId },
      select: { id: true },
    });
    if (!animal) return { success: false, error: "Animal não encontrado." };

    const dadosProc = {
      animalId,
      tipo,
      dataProcedimento,
      veterinario: dados.veterinario ? String(dados.veterinario).slice(0, 150) : null,
      status,
      descricao: dados.descricao ? String(dados.descricao) : null,
      medicacaoPrescrita: dados.medicacaoPrescrita ? String(dados.medicacaoPrescrita) : null,
      dataRetorno,
    };

    await prisma.cadastroProcedimento.upsert({
      where: { id },
      update: dadosProc,
      create: { id, ...dadosProc },
    });

    revalidatePath("/ccz");
    return { success: true, data: { id } };
  } catch (error) {
    if (error.status === 401 || error.status === 403) {
      return { success: false, error: error.message };
    }
    if (error.code === "P2003") {
      return { success: false, error: "Animal selecionado inválido ou inexistente." };
    }
    console.error("Erro ao salvar procedimento (CCZ):", error);
    return { success: false, error: error.message || "Erro ao salvar procedimento." };
  }
}

// ── LISTAR PROCEDIMENTOS (aba Procedimentos > Lista) ────────────────────────
export async function listarProcedimentos() {
  try {
    await requireAcessoModulo(MODULOS.CCZ);

    const procedimentos = await prisma.cadastroProcedimento.findMany({
      include: { animal: { include: { tutor: { include: { pessoa: true } } } } },
      orderBy: { dataProcedimento: "desc" },
    });

    const data = procedimentos.map((p) => ({
      id: p.id,
      animalId: p.animalId,
      animalNome: p.animal?.nome || "",
      tutorNome: p.animal?.tutor?.pessoa?.nomeCompleto || "",
      tipo: p.tipo,
      dataProcedimento: dateParaYMD(p.dataProcedimento),
      veterinario: p.veterinario || "",
      status: p.status || "Agendado",
      descricao: p.descricao || "",
      medicacaoPrescrita: p.medicacaoPrescrita || "",
      dataRetorno: dateParaYMD(p.dataRetorno),
    }));

    return { success: true, data };
  } catch (error) {
    if (error.status === 401 || error.status === 403) {
      return { success: false, error: error.message };
    }
    console.error("Erro ao listar procedimentos (CCZ):", error);
    return { success: false, error: "Erro ao carregar os procedimentos." };
  }
}

// ── OBTER UM PROCEDIMENTO (para edição) ─────────────────────────────────────
export async function obterProcedimento(id) {
  try {
    await requireAcessoModulo(MODULOS.CCZ);

    const procId = String(id || "").trim();
    if (!procId) return { success: false, error: "Id do procedimento não informado." };

    const p = await prisma.cadastroProcedimento.findUnique({
      where: { id: procId },
      include: { animal: { include: { tutor: { include: { pessoa: true } } } } },
    });
    if (!p) return { success: false, error: "Procedimento não encontrado." };

    const dataRetorno = dateParaYMD(p.dataRetorno);

    const data = {
      id: p.id,
      animalId: p.animalId,
      animalNome: p.animal?.nome || "",
      animalLabel: `${p.animal?.nome?.trim() || "Sem nome"} (${p.animalId})`,
      tipo: p.tipo,
      dataProcedimento: dateParaYMD(p.dataProcedimento),
      veterinario: p.veterinario || "",
      status: p.status || "Agendado",
      descricao: p.descricao || "",
      medicacaoPrescrita: p.medicacaoPrescrita || "",
      temRetorno: dataRetorno ? "Sim" : "Não",
      dataRetorno,
    };

    return { success: true, data };
  } catch (error) {
    if (error.status === 401 || error.status === 403) {
      return { success: false, error: error.message };
    }
    console.error("Erro ao obter procedimento (CCZ):", error);
    return { success: false, error: "Erro ao carregar o procedimento." };
  }
}

// ── AGENDA DO CCZ (derivada dos procedimentos) ──────────────────────────────
// Monta os eventos do mês a partir dos procedimentos:
//  • status "Agendado"  → evento na data do procedimento;
//  • dataRetorno != null → evento de retorno nessa data.
// Não há tabela de agenda separada: a agenda reflete sempre os procedimentos.
export async function getAgendaProcedimentos(ano, mes) {
  try {
    await requireAcessoModulo(MODULOS.CCZ);

    const y = Number(ano);
    const m = Number(mes); // 1-12
    if (!y || !m) return { success: true, data: [] };

    // Janela do mês em UTC (coluna @db.Date). Inclui procedimentos cuja data
    // OU data de retorno caia dentro do mês.
    const inicio = new Date(Date.UTC(y, m - 1, 1));
    const fim = new Date(Date.UTC(y, m, 1)); // 1º dia do mês seguinte

    const procedimentos = await prisma.cadastroProcedimento.findMany({
      where: {
        OR: [
          { dataProcedimento: { gte: inicio, lt: fim } },
          { dataRetorno: { gte: inicio, lt: fim } },
        ],
      },
      include: { animal: { include: { tutor: { include: { pessoa: true } } } } },
      orderBy: { dataProcedimento: "asc" },
    });

    const dentroDoMes = (data) => {
      if (!data) return false;
      const t = new Date(data).getTime();
      return t >= inicio.getTime() && t < fim.getTime();
    };

    const eventos = [];
    for (const p of procedimentos) {
      const animalNome = p.animal?.nome || "";
      const tutorNome = p.animal?.tutor?.pessoa?.nomeCompleto || "";

      // Evento do procedimento (só quando AGENDADO) na data do procedimento.
      if (p.status === "Agendado" && dentroDoMes(p.dataProcedimento)) {
        eventos.push({
          procedimentoId: p.id,
          tipoEvento: "PROCEDIMENTO",
          data: dateParaYMD(p.dataProcedimento),
          tipo: p.tipo,
          status: p.status,
          animalId: p.animalId,
          animalNome,
          tutorNome,
          veterinario: p.veterinario || "",
        });
      }

      // Evento de RETORNO na data de retorno (independe do status).
      if (dentroDoMes(p.dataRetorno)) {
        eventos.push({
          procedimentoId: p.id,
          tipoEvento: "RETORNO",
          data: dateParaYMD(p.dataRetorno),
          tipo: p.tipo,
          status: p.status,
          animalId: p.animalId,
          animalNome,
          tutorNome,
          veterinario: p.veterinario || "",
        });
      }
    }

    return { success: true, data: eventos };
  } catch (error) {
    if (error.status === 401 || error.status === 403) {
      return { success: false, error: error.message };
    }
    console.error("Erro ao carregar a agenda (CCZ):", error);
    return { success: false, error: "Erro ao carregar a agenda." };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// TERMO DE INTERNAÇÃO (ccz_termos_internacao) — um termo por internação
// ═══════════════════════════════════════════════════════════════════════════

// Carrega os dados necessários do termo de uma internação: dados do animal,
// do tutor (se houver) e o termo já salvo (se existir). Pré-preenche o
// responsável com o tutor quando ainda não há termo.
export async function obterDadosTermoInternacao(procedimentoId) {
  try {
    await requireAcessoModulo(MODULOS.CCZ);

    const procId = String(procedimentoId || "").trim();
    if (!procId) return { success: false, error: "Procedimento não informado." };

    const proc = await prisma.cadastroProcedimento.findUnique({
      where: { id: procId },
      include: {
        animal: { include: { tutor: { include: { pessoa: true } } } },
        termo: true,
      },
    });
    if (!proc) return { success: false, error: "Procedimento não encontrado." };
    if (proc.tipo !== "Internação") {
      return { success: false, error: "Este procedimento não é uma internação." };
    }

    const a = proc.animal;
    const tutorPessoa = a?.tutor?.pessoa || null;
    const termo = proc.termo;

    // "Doença crônica: ..." concatenada em observacoes — separa de volta.
    let qualDoenca = "";
    let observacoes = a?.observacoes || "";
    const m = observacoes.match(/^Doença crônica:\s*(.*)(?:\n([\s\S]*))?$/);
    if (a?.doencaCronica === "Sim" && m) {
      qualDoenca = (m[1] || "").trim();
      observacoes = (m[2] || "").trim();
    }

    const ymd = (d) => (d ? new Date(d).toISOString().slice(0, 10) : "");
    const hoje = new Date().toISOString().slice(0, 10);

    return {
      success: true,
      data: {
        procedimentoId: proc.id,
        animal: {
          id: a?.id || "",
          fotoUrl: a?.fotoUrl || "",
          nome: a?.nome || "",
          especie: a?.especie || "",
          sexo: a?.sexo === "F" ? "Fêmea" : "Macho",
          porte: a?.porte || "",
          idade: a?.idade || "",
          castrado: a?.castrado || "Não",
          doencaCronica: a?.doencaCronica || "Não",
          qualDoenca,
          observacoes,
        },
        temTutor: Boolean(tutorPessoa),
        tutor: tutorPessoa
          ? {
              cpf: tutorPessoa.cpf,
              nome: tutorPessoa.nomeCompleto || "",
              telefone: tutorPessoa.telefone || "",
            }
          : null,
        procedimento: {
          tipo: proc.tipo,
          dataProcedimento: ymd(proc.dataProcedimento),
          veterinario: proc.veterinario || "",
          status: proc.status || "Agendado",
        },
        // Termo salvo (ou valores iniciais).
        termo: termo
          ? {
              id: termo.id,
              responsavelNome: termo.responsavelNome,
              responsavelCpf: termo.responsavelCpf || "",
              seraAdotado: termo.seraAdotado || "Não",
              dataTermo: ymd(termo.dataTermo),
              cidade: termo.cidade || "Muriaé",
            }
          : {
              id: null,
              // Pré-preenche com o tutor, quando houver.
              responsavelNome: tutorPessoa?.nomeCompleto || "",
              responsavelCpf: tutorPessoa?.cpf || "",
              seraAdotado: "Não",
              dataTermo: hoje,
              cidade: "Muriaé",
            },
      },
    };
  } catch (error) {
    if (error.status === 401 || error.status === 403) {
      return { success: false, error: error.message };
    }
    console.error("Erro ao obter dados do termo (CCZ):", error);
    return { success: false, error: "Erro ao carregar o termo de internação." };
  }
}

// Salva (cria ou atualiza) o termo de internação de um procedimento.
export async function salvarTermoInternacao(dados) {
  try {
    await requireAcessoModulo(MODULOS.CCZ);

    const procId = String(dados.procedimentoId || "").trim();
    if (!procId) return { success: false, error: "Procedimento não informado." };

    const proc = await prisma.cadastroProcedimento.findUnique({
      where: { id: procId },
      select: { id: true, animalId: true, tipo: true },
    });
    if (!proc) return { success: false, error: "Procedimento não encontrado." };
    if (proc.tipo !== "Internação") {
      return { success: false, error: "Este procedimento não é uma internação." };
    }

    const responsavelNome = String(dados.responsavelNome || "").trim();
    if (!responsavelNome) {
      return { success: false, error: "Informe o nome do responsável/depositante." };
    }

    const dataTermo = ymdParaDateUTC(dados.dataTermo);
    if (!dataTermo) return { success: false, error: "Informe a data do termo." };

    const dadosTermo = {
      animalId: proc.animalId,
      responsavelNome: responsavelNome.slice(0, 150),
      responsavelCpf: dados.responsavelCpf
        ? soDigitos(dados.responsavelCpf).slice(0, 14)
        : null,
      seraAdotado: dados.seraAdotado === "Sim" ? "Sim" : "Não",
      dataTermo,
      cidade: dados.cidade ? String(dados.cidade).slice(0, 100) : "Muriaé",
    };

    await prisma.termoInternacao.upsert({
      where: { procedimentoId: procId },
      update: dadosTermo,
      create: { procedimentoId: procId, ...dadosTermo },
    });

    revalidatePath("/ccz");
    return { success: true };
  } catch (error) {
    if (error.status === 401 || error.status === 403) {
      return { success: false, error: error.message };
    }
    console.error("Erro ao salvar termo de internação (CCZ):", error);
    return { success: false, error: error.message || "Erro ao salvar o termo." };
  }
}
