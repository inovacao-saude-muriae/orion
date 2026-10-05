'use server';

import { prisma } from '@/lib/prisma';

// Helper para converter BigInt e Objetos Date sem erro de serialização no Next.js
function serializeData(data) {
  return JSON.parse(JSON.stringify(data));
}

/* ── 1. BUSCA DE PESSOAS NO BANCO (SEM DUPLICAÇÃO DE DADOS) ── */
export async function buscarPessoaExistente(termo) {
  try {
    const termoClean = String(termo || '').trim();
    const apenasNumeros = termoClean.replace(/\D/g, '');

    // Termo vazio/curto: lista os primeiros registros (para o dropdown já
    // aparecer ao focar o campo, como na Farmácia Judicial).
    const where =
      termoClean.length === 0
        ? undefined
        : {
            OR: [
              { nomeCompleto: { contains: termoClean, mode: 'insensitive' } },
              ...(apenasNumeros.length > 0 ? [{ cpf: { contains: apenasNumeros } }] : []),
            ],
          };

    const pessoas = await prisma.pessoa.findMany({
      where,
      orderBy: { nomeCompleto: 'asc' },
      include: {
        enderecos: {
          where: { enderecoAtual: true },
          take: 1,
        },
        ubsReferencia: true,
        pacienteJunta: {
          include: {
            servicos: { include: { servico: true } },
          },
        },
      },
      take: 10,
    });

    // Formata a data de nascimento como YYYY-MM-DD (string), para a UI exibir dd/mm/aaaa.
    const toYMD = (d) => {
      if (!d) return '';
      const dt = new Date(d);
      if (Number.isNaN(dt.getTime())) return '';
      return dt.toISOString().split('T')[0];
    };

    return pessoas.map((p) => {
      const enderecoAtual = p.enderecos?.[0] || {};
      const servicosAtivos = (p.pacienteJunta?.servicos || [])
        .filter((v) => v.ativo !== false && v.servico)
        .map((v) => v.servico.nome);
      return {
        cpf: p.cpf,
        cns: p.cns || '',
        nomeCompleto: p.nomeCompleto,
        nome: p.nomeCompleto,
        sexo: p.sexo || 'Masculino',
        dataNascimento: toYMD(p.dataNascimento),
        nomeMae: p.nomeMae,
        telefone: p.telefone,
        ubsReferencia: p.ubsReferencia?.nome || '',
        logradouro: enderecoAtual.logradouro || '',
        numero: enderecoAtual.numero || '',
        complemento: enderecoAtual.complemento || '',
        bairro: enderecoAtual.bairro || '',
        cidade: enderecoAtual.cidade || 'Muriaé',
        uf: enderecoAtual.uf || 'MG',
        cep: enderecoAtual.cep || '',
        tipoDeficiencia: p.pacienteJunta?.tipoDeficiencia || '',
        servicosAtivos,
      };
    });
  } catch (error) {
    console.error('Erro ao buscar pessoas no banco:', error);
    return [];
  }
}

export async function buscarPessoaPorCpfOuNome(termo) {
  return buscarPessoaExistente(termo);
}

export async function buscarPessoaPorNomeOuCpf(termo) {
  return buscarPessoaExistente(termo);
}

/* ── 2. CADASTRAR OU ATUALIZAR PACIENTE NA JUNTA REGULADORA ── */
export async function cadastrarPacienteJunta(data) {
  try {
    const { cpf, tipoDeficiencia, locaisEncaminhados = [] } = data;

    const cpfClean = (cpf || '').replace(/\D/g, '').slice(0, 11);

    if (!cpfClean || cpfClean.length !== 11) {
      return { success: false, error: 'CPF inválido. Deve conter 11 dígitos.' };
    }
    if (!tipoDeficiencia?.trim()) {
      return { success: false, error: 'Informe o tipo de deficiência.' };
    }

    // A pessoa deve estar previamente cadastrada em Gerenciamento > Cadastro de Pessoas.
    const pessoa = await prisma.pessoa.findUnique({
      where: { cpf: cpfClean },
      select: { cpf: true },
    });
    if (!pessoa) {
      return {
        success: false,
        error:
          'Pessoa não encontrada. Cadastre-a primeiro em Gerenciamento > Cadastro de Pessoas.',
      };
    }

    // Transação: apenas dados específicos da Junta (PacienteJunta + vínculos).
    const pacienteJunta = await prisma.$transaction(async (tx) => {
      // 1. Cadastrar ou atualizar o paciente na Junta
      const paciente = await tx.pacienteJunta.upsert({
        where: { pessoaCpf: cpfClean },
        update: { tipoDeficiencia },
        create: { pessoaCpf: cpfClean, tipoDeficiencia },
      });

      // 2. Revincula serviços: limpa e recria
      await tx.pacienteJuntaServico.deleteMany({
        where: { pacienteJuntaId: paciente.id },
      });

      if (locaisEncaminhados.length > 0) {
        const servicoIds = [];
        for (const localNome of locaisEncaminhados) {
          let servico = await tx.servico.findFirst({
            where: { nome: { equals: localNome.trim(), mode: 'insensitive' } },
          });
          if (!servico) {
            servico = await tx.servico.create({
              data: { nome: localNome.trim(), ativo: true },
            });
          }
          servicoIds.push(servico.id);
        }

        await tx.pacienteJuntaServico.createMany({
          data: servicoIds.map((sId) => ({
            pacienteJuntaId: paciente.id,
            servicoId: sId,
            ativo: true,
          })),
        });
      }

      return paciente;
    });

    return { success: true, id: pacienteJunta.id };
  } catch (error) {
    console.error('Erro ao cadastrar paciente na Junta:', error);
    return { success: false, error: error.message };
  }
}

/* ── 3. LISTAR PACIENTES VINCULADOS A UM SERVIÇO ── */
export async function getPacientesPorServico(servicoNome) {
  try {
    if (!servicoNome) return { success: true, data: [] };

    const termo = String(servicoNome).trim();

    const servico = await prisma.servico.findFirst({
      where: {
        OR: [
          { nome: { equals: termo, mode: 'insensitive' } },
          { nome: { contains: termo, mode: 'insensitive' } },
        ],
      },
    });

    if (!servico) {
      return { success: true, data: [] };
    }

    const vinculos = await prisma.pacienteJuntaServico.findMany({
      where: {
        servicoId: servico.id,
        ativo: true,
      },
    });

    if (vinculos.length === 0) {
      return { success: true, data: [] };
    }

    const pacienteJuntaIds = vinculos.map((v) => v.pacienteJuntaId).filter(Boolean);

    const pacientesJunta = await prisma.pacienteJunta.findMany({
      where: { id: { in: pacienteJuntaIds } },
    });

    const pessoaCpfs = pacientesJunta.map((pj) => pj.pessoaCpf).filter(Boolean);

    const pessoas = await prisma.pessoa.findMany({
      where: { cpf: { in: pessoaCpfs } },
      include: {
        enderecos: {
          where: { enderecoAtual: true },
          take: 1,
        },
      },
    });

    const pessoaDict = pessoas.reduce((acc, p) => {
      acc[p.cpf] = p;
      return acc;
    }, {});

    const pacienteJuntaDict = pacientesJunta.reduce((acc, pj) => {
      acc[pj.id] = pj;
      return acc;
    }, {});

    const data = vinculos
      .map((v) => {
        const pj = pacienteJuntaDict[v.pacienteJuntaId];
        const pessoa = pj ? pessoaDict[pj.pessoaCpf] : null;

        if (!pessoa || !pj) return null;

        const end = pessoa.enderecos?.[0] || {};

        return {
          id: pj.id,
          paciente_junta_id: pj.id,
          cpf: pessoa.cpf || '',
          nome: pessoa.nomeCompleto || '',
          nomeCompleto: pessoa.nomeCompleto || '',
          sexo: pessoa.sexo || 'Masculino',
          nomeMae: pessoa.nomeMae || '',
          telefone: pessoa.telefone || '',
          tipo_deficiencia: pj.tipoDeficiencia || '',
          tipoDeficiencia: pj.tipoDeficiencia || '',
          logradouro: end.logradouro || '',
          numero: end.numero || '',
          bairro: end.bairro || '',
          cidade: end.cidade || '',
          uf: end.uf || '',
          cep: end.cep || '',
        };
      })
      .filter(Boolean);

    data.sort((a, b) => a.nomeCompleto.localeCompare(b.nomeCompleto));

    return { success: true, data };
  } catch (error) {
    console.error('Erro ao listar pacientes do serviço:', error);
    return { success: false, error: error.message, data: [] };
  }
}

/* ── 4. REGISTRAR PRESENÇA / ATENDIMENTO NO SERVIÇO ── */
export async function registrarAtendimentoServico(data) {
  try {
    const { 
      pacienteJuntaId, 
      pacienteId,
      servico, 
      servicoNome, 
      especialidade, 
      dataAtendimento, 
      data: dataForm, 
      status, 
      observacao, 
      profissional 
    } = data;

    const nomeDoServico = (servicoNome || servico || '').trim();
    const idDoPaciente = pacienteJuntaId || pacienteId;

    if (!nomeDoServico) return { success: false, error: 'Nome do serviço não informado.' };
    if (!idDoPaciente) return { success: false, error: 'Paciente não selecionado.' };

    let juntaServico = await prisma.servico.findFirst({
      where: { nome: { equals: nomeDoServico, mode: 'insensitive' } },
    });

    if (!juntaServico) {
      juntaServico = await prisma.servico.create({
        data: { nome: nomeDoServico, ativo: true },
      });
    }

    const dataFinal = dataAtendimento || dataForm ? new Date(dataAtendimento || dataForm) : new Date();

    await prisma.juntaAtendimento.create({
      data: {
        pacienteJuntaId: Number(idDoPaciente),
        servicoId: juntaServico.id,
        especialidade: especialidade || 'Geral',
        dataAtendimento: dataFinal,
        status: status || 'PRESENCA',
        observacao: observacao || null,
        profissionalResponsavel: profissional || null,
      },
    });

    return { success: true };
  } catch (error) {
    console.error('Erro ao registrar atendimento:', error);
    return { success: false, error: error.message };
  }
}

/* ── ESPECIALIDADES CADASTRADAS (Gerenciamento > Serviços e Especialidades) ── */
// Retorna as especialidades do serviço cujo nome bate (case-insensitive).
// Se não encontrar um serviço com esse nome, retorna todas as especialidades.
export async function getEspecialidadesPorServico(servicoNome) {
  try {
    const nome = String(servicoNome || '').trim();

    const servico = nome
      ? await prisma.servico.findFirst({
          where: { nome: { equals: nome, mode: 'insensitive' } },
        })
      : null;

    const especialidades = await prisma.especialidade.findMany({
      where: servico ? { servicoId: servico.id } : {},
      include: { servico: true },
      orderBy: { nome: 'asc' },
    });

    return serializeData(
      especialidades.map((e) => ({
        id: e.id,
        nome: e.nome,
        servicoNome: e.servico?.nome || '',
      })),
    );
  } catch (error) {
    console.error('Erro ao buscar especialidades por serviço:', error);
    return [];
  }
}

/* ── 5. CONSULTA DO PRONTUÁRIO UNIFICADO (100% PRISMA ORM DEFINITIVO) ── */
export async function getProntuarioUnificado(termoBusca) {
  try {
    const termoClean = String(termoBusca).trim();
    const apenasNumeros = termoClean.replace(/\D/g, '');

    // 1. Busca os dados primários da pessoa diretamente pelo Prisma ORM
    const pessoa = await prisma.pessoa.findFirst({
      where: {
        OR: [
          { nomeCompleto: { contains: termoClean, mode: 'insensitive' } },
          ...(apenasNumeros.length > 0 ? [{ cpf: { contains: apenasNumeros } }] : []),
        ],
      },
      include: {
        enderecos: {
          where: { enderecoAtual: true },
          take: 1,
        },
      },
    });

    if (!pessoa) {
      return { success: true, data: null };
    }

    // 2. Busca cadastro da pessoa na Junta
    const pacienteJunta = await prisma.pacienteJunta.findFirst({
      where: { pessoaCpf: pessoa.cpf },
    });

    let servicosAtivos = [];
    let servicosAgrupados = [];

    if (pacienteJunta) {
      // 3. Busca serviços vinculados usando a relação do Prisma PacienteJuntaServico
      const vinculos = await prisma.pacienteJuntaServico.findMany({
        where: { pacienteJuntaId: pacienteJunta.id, ativo: true },
      });

      if (vinculos.length > 0) {
        const servicoIds = vinculos.map((v) => v.servicoId).filter(Boolean);
        const listaServicos = await prisma.servico.findMany({
          where: { id: { in: servicoIds } },
        });
        servicosAtivos = listaServicos.map((s) => s.nome);
      }

      // 4. Histórico de Atendimentos
      const atendimentos = await prisma.juntaAtendimento.findMany({
        where: { pacienteJuntaId: pacienteJunta.id },
        orderBy: { dataAtendimento: 'desc' },
      });

      if (atendimentos.length > 0) {
        const servicoIdsAtend = atendimentos.map((a) => a.servicoId).filter(Boolean);
        const servicosMap = await prisma.servico.findMany({
          where: { id: { in: servicoIdsAtend } },
        });

        const servicoDict = servicosMap.reduce((acc, s) => {
          acc[s.id] = s.nome;
          return acc;
        }, {});

        const gruposMap = {};

        for (const a of atendimentos) {
          const nomeServico = servicoDict[a.servicoId] || 'Outros';
          const espec = a.especialidade || 'Geral';
          const chaveGrupo = `${nomeServico}___${espec}`;

          if (!gruposMap[chaveGrupo]) {
            gruposMap[chaveGrupo] = {
              servico: nomeServico,
              especialidade: espec,
              presencas: 0,
              faltas: 0,
              faltasJustificadas: 0,
              datas: [],
            };
          }

          const st = (a.status || '').toUpperCase();
          if (st === 'PRESENCA') gruposMap[chaveGrupo].presencas++;
          else if (st === 'FALTA') gruposMap[chaveGrupo].faltas++;
          else if (st === 'FALTA_JUSTIFICADA') gruposMap[chaveGrupo].faltasJustificadas++;

          gruposMap[chaveGrupo].datas.push({
            id: a.id,
            data: a.dataAtendimento,
            status: a.status,
            profissional: a.profissionalResponsavel,
            observacao: a.observacao,
          });
        }

        servicosAgrupados = Object.values(gruposMap);
      }
    }

    const end = pessoa.enderecos?.[0] || {};

    const pacienteFormatted = {
      paciente_junta_id: pacienteJunta?.id || null,
      cpf: pessoa.cpf,
      nome: pessoa.nomeCompleto,
      sexo: pessoa.sexo || 'Masculino',
      nomeMae: pessoa.nomeMae,
      data_nascimento: pessoa.dataNascimento,
      telefone: pessoa.telefone,
      tipo_deficiencia: pacienteJunta?.tipoDeficiencia || 'Não cadastrado na Junta',
      logradouro: end.logradouro || '',
      numero: end.numero || '',
      bairro: end.bairro || '',
      cidade: end.cidade || '',
      uf: end.uf || '',
      cep: end.cep || '',
      servicos_ativos: servicosAtivos,
    };

    return {
      success: true,
      data: serializeData({
        paciente: pacienteFormatted,
        servicosAgrupados,
      }),
    };
  } catch (error) {
    console.error('Erro ao buscar prontuário:', error);
    return { success: false, error: error.message };
  }
}


/* ── AGENDA POR SERVIÇO (calendário mensal) ── */

// Resolve o id do serviço pelo nome (cria se não existir).
async function resolverServicoIdPorNome(servicoNome) {
  const nome = String(servicoNome || '').trim();
  if (!nome) throw new Error('Serviço não informado.');
  let servico = await prisma.servico.findFirst({
    where: { nome: { equals: nome, mode: 'insensitive' } },
  });
  if (!servico) {
    servico = await prisma.servico.create({ data: { nome, ativo: true } });
  }
  return servico.id;
}

// Lista os agendamentos de um serviço num mês/ano (1-12).
export async function getAgendamentosDoMes(servicoNome, ano, mes) {
  try {
    const nome = String(servicoNome || '').trim();
    const servico = nome
      ? await prisma.servico.findFirst({
          where: { nome: { equals: nome, mode: 'insensitive' } },
        })
      : null;
    if (!servico) return [];

    const y = Number(ano);
    const m = Number(mes); // 1-12
    const inicio = new Date(y, m - 1, 1);
    const fim = new Date(y, m, 1); // primeiro dia do mês seguinte

    const rows = await prisma.agendamentoJunta.findMany({
      where: {
        servicoId: servico.id,
        data: { gte: inicio, lt: fim },
      },
      include: {
        pacienteJunta: { include: { pessoa: true } },
      },
      orderBy: [{ data: 'asc' }, { hora: 'asc' }],
    });

    return serializeData(
      rows.map((a) => ({
        id: a.id,
        pacienteJuntaId: a.pacienteJuntaId,
        pacienteNome: a.pacienteJunta?.pessoa?.nomeCompleto || '—',
        especialidade: a.especialidade,
        hora: a.hora,
        observacao: a.observacao || '',
        // 'YYYY-MM-DD' para casar com os dias do calendário no cliente
        data: a.data.toISOString().split('T')[0],
      })),
    );
  } catch (error) {
    console.error('Erro ao buscar agendamentos do mês:', error);
    return [];
  }
}

// Cria um agendamento (paciente + especialidade + data + hora).
export async function criarAgendamentoJunta(dados) {
  try {
    const servicoId = await resolverServicoIdPorNome(dados.servicoNome);

    const pacienteJuntaId = Number(dados.pacienteJuntaId);
    if (!pacienteJuntaId) return { success: false, error: 'Selecione o paciente.' };
    if (!dados.especialidade) return { success: false, error: 'Selecione a especialidade.' };
    if (!dados.data) return { success: false, error: 'Informe a data.' };
    if (!dados.hora) return { success: false, error: 'Informe o horário.' };

    await prisma.agendamentoJunta.create({
      data: {
        servicoId,
        pacienteJuntaId,
        especialidade: dados.especialidade,
        data: new Date(`${dados.data}T00:00:00`),
        hora: dados.hora,
        observacao: dados.observacao || null,
      },
    });

    return { success: true };
  } catch (error) {
    console.error('Erro ao criar agendamento:', error);
    return { success: false, error: error.message };
  }
}

// Exclui um agendamento.
export async function excluirAgendamentoJunta(id) {
  try {
    const agId = Number(id);
    if (!agId) return { success: false, error: 'Agendamento inválido.' };
    await prisma.agendamentoJunta.delete({ where: { id: agId } });
    return { success: true };
  } catch (error) {
    console.error('Erro ao excluir agendamento:', error);
    return { success: false, error: error.message };
  }
}
