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

    await prisma.animal.upsert({
      where: { id },
      update: dadosAnimal,
      create: { id, ...dadosAnimal },
    });

    revalidatePath("/ccz");
    return { success: true, data: { id } };
  } catch (error) {
    if (error.status === 401 || error.status === 403) {
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
