// Helpers compartilhados de persistência de Pessoa + Endereço.
//
// São funções tx-aware (recebem um cliente de transação `tx`) para que os
// módulos (regulação, junta, CCZ) possam gravar Pessoa e Endereço na MESMA
// transação dos seus registros específicos (PacienteJunta, Tutor, etc.).
//
// Não use "use server" aqui: este arquivo é um utilitário, não server actions.

export const soDigitos = (valor) => (valor ? String(valor).replace(/\D/g, "") : "");

// Converte "YYYY-MM-DD" (ou Date) para Date em UTC. Lança erro se ausente.
function paraData(valor) {
  if (!valor) return null;
  if (valor instanceof Date) return valor;
  return new Date(`${valor}T00:00:00Z`);
}

/**
 * Valida e normaliza os dados de uma Pessoa vindos de um formulário.
 * Lança Error com mensagem amigável quando um campo obrigatório falta.
 * @returns objeto pronto para prisma.pessoa.create (inclui cpf).
 */
export function normalizarPessoa(data, { exigirData = true } = {}) {
  const cpf = soDigitos(data.cpf);
  if (cpf.length !== 11) {
    throw new Error("CPF inválido. Informe 11 dígitos.");
  }
  if (!data.nomeCompleto?.trim()) {
    throw new Error("Nome completo é obrigatório.");
  }
  if (exigirData && !data.dataNascimento) {
    throw new Error("Data de nascimento é obrigatória.");
  }
  if (!data.nomeMae?.trim()) {
    throw new Error("Nome da mãe é obrigatório.");
  }

  const normalizado = {
    cpf,
    nomeCompleto: data.nomeCompleto.trim().slice(0, 150),
    sexo: (data.sexo || "Masculino").slice(0, 20),
    dataNascimento: paraData(data.dataNascimento) || new Date(),
    nomeMae: data.nomeMae.trim().slice(0, 150),
    telefone: soDigitos(data.telefone).slice(0, 20),
    cns: data.cns ? soDigitos(data.cns).slice(0, 15) : null,
  };

  // UBS de referência é opcional. Só inclui a chave quando o campo veio no
  // formulário, para não sobrescrever com null indevidamente nos módulos.
  if (Object.prototype.hasOwnProperty.call(data, "ubsReferenciaId")) {
    const ubsId = Number(data.ubsReferenciaId);
    normalizado.ubsReferenciaId = Number.isSafeInteger(ubsId) && ubsId > 0 ? ubsId : null;
  }

  return normalizado;
}

/**
 * Cria uma Pessoa dentro de uma transação.
 * @param {*} tx cliente Prisma de transação
 * @param {*} data dados brutos do formulário
 * @returns a Pessoa criada
 */
export async function criarPessoaTx(tx, data) {
  const pessoa = normalizarPessoa(data);
  return tx.pessoa.create({ data: pessoa });
}

/**
 * Atualiza uma Pessoa existente dentro de uma transação (não altera o CPF).
 */
export async function atualizarPessoaTx(tx, cpf, data) {
  const pessoa = normalizarPessoa(data);
  // eslint-disable-next-line no-unused-vars
  const { cpf: _cpf, ...campos } = pessoa;
  return tx.pessoa.update({ where: { cpf: soDigitos(cpf) }, data: campos });
}

/**
 * Cria ou atualiza uma Pessoa (upsert) dentro de uma transação.
 * Útil para módulos que revincula a mesma pessoa (Junta).
 */
export async function upsertPessoaTx(tx, data) {
  const pessoa = normalizarPessoa(data);
  const { cpf, ...campos } = pessoa;
  return tx.pessoa.upsert({
    where: { cpf },
    update: campos,
    create: pessoa,
  });
}

/**
 * Grava (substitui) o endereço atual da pessoa dentro de uma transação.
 * Só grava se houver algum dado de endereço (logradouro, bairro ou cep).
 */
export async function gravarEnderecoTx(tx, cpf, data) {
  const temEndereco = data.logradouro || data.bairro || data.cep;
  if (!temEndereco) return;

  const pessoaCpf = soDigitos(cpf);
  await tx.endereco.deleteMany({ where: { pessoaCpf } });
  await tx.endereco.create({
    data: {
      pessoaCpf,
      logradouro: (data.logradouro || "").slice(0, 150),
      numero: (data.numero || "S/N").slice(0, 20),
      complemento: data.complemento ? data.complemento.slice(0, 50) : null,
      bairro: (data.bairro || "Centro").slice(0, 100),
      cidade: (data.cidade || "Muriaé").slice(0, 100),
      uf: (data.uf || "MG").slice(0, 2).toUpperCase(),
      cep: data.cep ? soDigitos(data.cep).slice(0, 8) : null,
      enderecoAtual: true,
    },
  });
}
