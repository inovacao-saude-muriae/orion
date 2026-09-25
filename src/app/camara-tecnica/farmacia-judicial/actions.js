"use server";

import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

// Helper para converter tipos speciais do Prisma (BigInt/Dates) para objetos JS simples
function serializeData(data) {
  return JSON.parse(JSON.stringify(data));
}

// ==========================================
// 1. BUSCAR PACIENTES JUDICIAIS (POSTGRESQL)
// ==========================================
export async function getPacientesJudiciais() {
  try {
    const rows = await prisma.$queryRaw`
      SELECT 
        pfj.numero_pasta AS "numeroPasta",
        pfj.numero_processo AS "numeroProcesso",
        pfj.status AS status,
        p.cpf AS cpf,
        p.nome_completo AS "patientName",
        p.nome_mae AS "motherName",
        p.telefone AS telefone,
        TO_CHAR(p.data_nascimento, 'YYYY-MM-DD') AS "dataNascimento",
        COALESCE(
          (
            SELECT STRING_AGG(CONCAT(m.nome, ' (', m.dosagem, ') - Qtd: ', tp.qtd_prescrita_mensal), '; ')
            FROM public.farmacia_tratamentos_pacientes tp
            JOIN public.farmacia_medicamentos m ON tp.medicamento_id = m.id
            WHERE tp.paciente_pasta = pfj.numero_pasta AND tp.ativo = true
          ),
          'Sem medicamentos cadastrados'
        ) AS "medicamentosTratamento"
      FROM public.farmacia_pacientes pfj
      JOIN public.pessoa p ON pfj.pessoa_cpf = p.cpf
      ORDER BY p.nome_completo ASC
    `;
    return serializeData(rows);
  } catch (error) {
    console.error("Erro ao buscar pacientes judiciais:", error);
    return [];
  }
}

// ==========================================
// 2. CADASTRAR PACIENTE JUDICIAL (POSTGRESQL)
// ==========================================
// Normaliza o status vindo da UI (Ativo/Inativo/Falecido) para o padrão do banco.
function normalizarStatusPaciente(status) {
  const st = (status || "").toUpperCase();
  if (st === "INATIVO") return "INATIVO";
  if (st === "FALECIDO" || st === "ÓBITO" || st === "OBITO") return "ÓBITO";
  return "ATIVO";
}

export async function createPacienteJudicial(data) {
  const cleanCpf = (data.cpf || "").replace(/\D/g, "");

  try {
    if (cleanCpf.length !== 11) {
      throw new Error("Selecione uma pessoa válida (CPF com 11 dígitos).");
    }
    if (!data.numeroPasta || !data.numeroProcesso) {
      throw new Error("Informe o número da pasta e do processo.");
    }

    // A pessoa deve estar previamente cadastrada em Gerenciamento > Cadastro de Pessoas.
    const pessoa = await prisma.pessoa.findUnique({
      where: { cpf: cleanCpf },
      select: { cpf: true },
    });
    if (!pessoa) {
      throw new Error(
        "Pessoa não encontrada. Cadastre-a primeiro em Gerenciamento > Cadastro de Pessoas.",
      );
    }

    const statusDb = normalizarStatusPaciente(data.status);

    await prisma.$transaction(async (tx) => {
      // 1. Cadastrar/atualizar o vínculo do paciente judicial (dados do processo).
      await tx.$executeRaw`
        INSERT INTO public.farmacia_pacientes (numero_pasta, pessoa_cpf, numero_processo, status)
        VALUES (${data.numeroPasta}, ${cleanCpf}, ${data.numeroProcesso}, ${statusDb})
        ON CONFLICT (numero_pasta) DO UPDATE SET
          pessoa_cpf = EXCLUDED.pessoa_cpf,
          numero_processo = EXCLUDED.numero_processo,
          status = EXCLUDED.status
      `;

      // 2. Recriar os tratamentos do mês (limpa antes para não duplicar).
      await tx.tratamentoPaciente.deleteMany({
        where: { pacientePasta: data.numeroPasta },
      });

      if (Array.isArray(data.medicamentos) && data.medicamentos.length > 0) {
        for (const med of data.medicamentos) {
          if (med.medicamentoId && med.qtdMensal) {
            const ativo =
              (med.statusMedication || "Ativo").toUpperCase() === "ATIVO";
            await tx.tratamentoPaciente.create({
              data: {
                pacientePasta: data.numeroPasta,
                medicamentoId: Number(med.medicamentoId),
                qtdPrescritaMensal: Number(med.qtdMensal),
                ativo,
              },
            });
          }
        }
      }
    });

    revalidatePath("/camara-tecnica/farmacia-judicial");
    return { success: true };
  } catch (error) {
    console.error("Erro ao cadastrar paciente judicial:", error);
    return { success: false, error: error.message };
  }
}

// ==========================================
// 3. ESTOQUE E MEDICAMENTOS
// ==========================================
export async function getMedicamentosEEstoque() {
  try {
    const rows = await prisma.$queryRaw`
      SELECT 
        lm.id AS "loteId",
        m.id AS "medicamentoId",
        m.nome AS "medicamentoNome",
        m.tipo AS tipo,
        m.dosagem AS dosagem,
        lm.numero_lote AS "numeroLote",
        lm.fornecedor AS fornecedor,
        lm.qtd_inicial AS "qtdInicial",
        lm.valor_unitario AS "valorUnitario",
        TO_CHAR(lm.data_entrada, 'YYYY-MM-DD') AS "dataEntrada",
        TO_CHAR(lm.data_validade, 'YYYY-MM-DD') AS "dataValidade",
        (lm.qtd_inicial - COALESCE(SUM(dm.qtd_entregue), 0))::integer AS "qtdAtual"
      FROM public.farmacia_lotes_medicamentos lm
      JOIN public.farmacia_medicamentos m ON lm.medicamento_id = m.id
      LEFT JOIN public.farmacia_dispensacoes_medicamentos dm ON lm.id = dm.lote_medicamento_id
      GROUP BY lm.id, m.id, m.nome, m.tipo, m.dosagem, lm.numero_lote, lm.fornecedor, lm.qtd_inicial, lm.valor_unitario, lm.data_entrada, lm.data_validade
      ORDER BY m.nome ASC, lm.data_validade ASC
    `;
    return serializeData(rows);
  } catch (error) {
    console.error("Erro ao buscar estoque de medicamentos:", error);
    return [];
  }
}

export async function getCatalogoMedicamentos() {
  try {
    const rows = await prisma.$queryRaw`
      SELECT id, nome, tipo, dosagem, ativo 
      FROM public.farmacia_medicamentos 
      WHERE ativo = true 
      ORDER BY nome ASC
    `;
    return serializeData(rows);
  } catch (error) {
    console.error("Erro ao buscar catálogo de medicamentos:", error);
    return [];
  }
}

export async function createMedicamento(data) {
  try {
    await prisma.$executeRaw`
      INSERT INTO public.farmacia_medicamentos (nome, tipo, dosagem, ativo)
      VALUES (${data.nome}, ${data.tipo}, ${data.dosagem}, true)
    `;
    revalidatePath("/camara-tecnica/farmacia-judicial");
    return { success: true };
  } catch (error) {
    console.error("Erro ao cadastrar medicamento:", error);
    return { success: false, error: error.message };
  }
}

// Catálogo completo (para a aba Medicamentos): nome, concentração, tipo.
export async function getCatalogoCompleto() {
  try {
    const rows = await prisma.$queryRaw`
      SELECT id, nome, tipo, dosagem
      FROM public.farmacia_medicamentos
      WHERE ativo = true
      ORDER BY nome ASC
    `;
    return serializeData(rows);
  } catch (error) {
    console.error("Erro ao buscar catálogo completo:", error);
    return [];
  }
}

// Editar um medicamento do catálogo (nome, tipo, concentração).
export async function updateMedicamento(id, data) {
  try {
    await requireRole(["GESTOR", "FARMACIA_ADMIN"]);

    const medId = Number(id);
    if (!Number.isSafeInteger(medId) || medId <= 0) {
      throw new Error("Medicamento inválido.");
    }
    if (!data.nome || !data.tipo || !data.dosagem) {
      throw new Error("Informe o nome, a concentração e o tipo.");
    }

    await prisma.$executeRaw`
      UPDATE public.farmacia_medicamentos
      SET nome = ${data.nome}, tipo = ${data.tipo}, dosagem = ${data.dosagem}
      WHERE id = ${medId}
    `;

    revalidatePath("/camara-tecnica/farmacia-judicial");
    return { success: true };
  } catch (error) {
    console.error("Erro ao atualizar medicamento:", error);
    return { success: false, error: error.message };
  }
}

// Excluir medicamento do catálogo.
// Usa desativação (soft delete) para preservar o histórico de lotes/dispensações.
export async function deleteMedicamento(id) {
  try {
    await requireRole(["GESTOR", "FARMACIA_ADMIN"]);

    const medId = Number(id);
    if (!Number.isSafeInteger(medId) || medId <= 0) {
      throw new Error("Medicamento inválido.");
    }

    await prisma.$executeRaw`
      UPDATE public.farmacia_medicamentos
      SET ativo = false
      WHERE id = ${medId}
    `;

    revalidatePath("/camara-tecnica/farmacia-judicial");
    return { success: true };
  } catch (error) {
    console.error("Erro ao excluir medicamento:", error);
    return { success: false, error: error.message };
  }
}

export async function createLoteMedicamento(data) {
  try {
    await prisma.$executeRaw`
          INSERT INTO public.farmacia_lotes_medicamentos 
        (medicamento_id, numero_lote, fornecedor, qtd_inicial, valor_unitario, data_entrada, data_validade)
      VALUES (
        ${Number(data.medicamentoId)}, 
        ${data.numeroLote}, 
        ${data.fornecedor}, 
        ${Number(data.qtdInicial)}, 
        ${data.valorUnitario ? Number(data.valorUnitario) : 0}, 
        ${data.dataEntrada}::date, 
        ${data.dataValidade}::date
      )
    `;
    revalidatePath("/farmacia");
    return { success: true };
  } catch (error) {
    console.error("Erro ao dar entrada no lote:", error);
    return { success: false, error: error.message };
  }
}

// Estoque agrupado por medicamento (uma linha por medicamento, somando lotes).
export async function getEstoqueAgrupado() {
  try {
    const rows = await prisma.$queryRaw`
      SELECT
        m.id AS "medicamentoId",
        m.nome AS "medicamentoNome",
        m.dosagem AS dosagem,
        m.tipo AS tipo,
        (
          COALESCE(SUM(lm.qtd_inicial - COALESCE(entregas.total_entregue, 0)), 0)
          + COALESCE(
              (
                SELECT SUM(a.delta)
                FROM public.farmacia_ajustes_estoque a
                WHERE a.medicamento_id = m.id
              ),
              0
            )
        )::integer AS "qtdTotal",
        COALESCE(
          (
            SELECT lm2.valor_unitario
            FROM public.farmacia_lotes_medicamentos lm2
            WHERE lm2.medicamento_id = m.id
            ORDER BY lm2.data_entrada DESC, lm2.id DESC
            LIMIT 1
          ),
          0
        ) AS "valorUnitario"
      FROM public.farmacia_medicamentos m
      LEFT JOIN public.farmacia_lotes_medicamentos lm ON lm.medicamento_id = m.id
      LEFT JOIN (
        SELECT lote_medicamento_id, SUM(qtd_entregue) AS total_entregue
        FROM public.farmacia_dispensacoes_medicamentos
        GROUP BY lote_medicamento_id
      ) entregas ON entregas.lote_medicamento_id = lm.id
      WHERE m.ativo = true
      GROUP BY m.id, m.nome, m.dosagem, m.tipo
      ORDER BY m.nome ASC
    `;
    return serializeData(rows);
  } catch (error) {
    console.error("Erro ao buscar estoque agrupado:", error);
    return [];
  }
}

// Editar um lote (entrada) existente: data entrada, validade, lote, qtd, valor, fornecedor.
export async function updateLoteMedicamento(loteId, data) {
  try {
    await requireRole(["GESTOR", "FARMACIA_ADMIN"]);

    const id = Number(loteId);
    if (!Number.isSafeInteger(id) || id <= 0) {
      throw new Error("Lote inválido.");
    }
    if (!data.numeroLote || !data.fornecedor) {
      throw new Error("Informe o número do lote e o fornecedor.");
    }
    if (!data.dataEntrada || !data.dataValidade) {
      throw new Error("Informe a data de entrada e a validade.");
    }

    const qtdInicial = Number(data.qtdInicial);
    if (!Number.isSafeInteger(qtdInicial) || qtdInicial < 0) {
      throw new Error("Quantidade inválida.");
    }

    // Não permite reduzir a quantidade abaixo do que já foi dispensado.
    const entregas = await prisma.dispensacaoMedicamento.aggregate({
      where: { loteMedicamentoId: id },
      _sum: { qtdEntregue: true },
    });
    const totalEntregue = entregas._sum.qtdEntregue || 0;
    if (qtdInicial < totalEntregue) {
      throw new Error(
        `A quantidade não pode ser menor que o já dispensado (${totalEntregue}).`,
      );
    }

    await prisma.$executeRaw`
      UPDATE public.farmacia_lotes_medicamentos
      SET
        numero_lote = ${data.numeroLote},
        fornecedor = ${data.fornecedor},
        qtd_inicial = ${qtdInicial},
        valor_unitario = ${data.valorUnitario ? Number(data.valorUnitario) : 0},
        data_entrada = ${data.dataEntrada}::date,
        data_validade = ${data.dataValidade}::date
      WHERE id = ${id}
    `;

    revalidatePath("/camara-tecnica/farmacia-judicial");
    return { success: true };
  } catch (error) {
    console.error("Erro ao atualizar lote:", error);
    return { success: false, error: error.message };
  }
}

// Saldo atual (lotes - dispensações + ajustes) de um medicamento.
async function calcularSaldoMedicamento(medicamentoId) {
  const rows = await prisma.$queryRaw`
    SELECT (
      COALESCE(
        (
          SELECT SUM(lm.qtd_inicial - COALESCE(e.total, 0))
          FROM public.farmacia_lotes_medicamentos lm
          LEFT JOIN (
            SELECT lote_medicamento_id, SUM(qtd_entregue) AS total
            FROM public.farmacia_dispensacoes_medicamentos
            GROUP BY lote_medicamento_id
          ) e ON e.lote_medicamento_id = lm.id
          WHERE lm.medicamento_id = ${medicamentoId}
        ),
        0
      )
      + COALESCE(
        (SELECT SUM(delta) FROM public.farmacia_ajustes_estoque WHERE medicamento_id = ${medicamentoId}),
        0
      )
    )::integer AS saldo
  `;
  return Number(rows?.[0]?.saldo || 0);
}

// Histórico de ajustes de estoque de um medicamento.
export async function getAjustesEstoque(medicamentoId) {
  try {
    const id = Number(medicamentoId);
    if (!Number.isSafeInteger(id) || id <= 0) return [];

    const rows = await prisma.$queryRaw`
      SELECT
        id,
        saldo_anterior AS "saldoAnterior",
        saldo_novo AS "saldoNovo",
        delta,
        justificativa,
        responsavel,
        TO_CHAR(created_at, 'DD/MM/YYYY HH24:MI') AS "dataAjuste"
      FROM public.farmacia_ajustes_estoque
      WHERE medicamento_id = ${id}
      ORDER BY created_at DESC
    `;
    return serializeData(rows);
  } catch (error) {
    console.error("Erro ao buscar ajustes de estoque:", error);
    return [];
  }
}

// Ajusta o saldo do medicamento para um novo valor, registrando a justificativa.
export async function ajustarEstoque(medicamentoId, data) {
  try {
    const session = await requireRole(["GESTOR", "FARMACIA_ADMIN"]);

    const id = Number(medicamentoId);
    if (!Number.isSafeInteger(id) || id <= 0) {
      throw new Error("Medicamento inválido.");
    }

    const saldoNovo = Number(data.saldoNovo);
    if (!Number.isSafeInteger(saldoNovo) || saldoNovo < 0) {
      throw new Error("Informe um novo saldo válido (número não negativo).");
    }

    const justificativa = (data.justificativa || "").trim();
    if (!justificativa) {
      throw new Error("Informe a justificativa do ajuste.");
    }

    const saldoAnterior = await calcularSaldoMedicamento(id);
    const delta = saldoNovo - saldoAnterior;

    if (delta === 0) {
      throw new Error("O novo saldo é igual ao saldo atual.");
    }

    const responsavel = session?.nome || null;

    await prisma.ajusteEstoque.create({
      data: {
        medicamentoId: id,
        saldoAnterior,
        saldoNovo,
        delta,
        justificativa,
        responsavel,
      },
    });

    revalidatePath("/camara-tecnica/farmacia-judicial");
    return { success: true };
  } catch (error) {
    console.error("Erro ao ajustar estoque:", error);
    return { success: false, error: error.message };
  }
}

// ==========================================
// 4. DISPENSAÇÃO DE MEDICAMENTOS
// ==========================================
export async function registrarDispensacao(data) {
  try {
    await requireRole(["GESTOR", "FARMACIA_ADMIN"]);
    if (!Array.isArray(data?.itens) || data.itens.length === 0) {
      throw new Error("Informe os medicamentos da dispensação.");
    }
    const totais = new Map();
    for (const item of data.itens) {
      const id = Number(item.loteId);
      const qtd = Number(item.qtdEntregue);
      if (!Number.isSafeInteger(id) || id <= 0 || !Number.isSafeInteger(qtd) || qtd <= 0) {
        throw new Error("Lote ou quantidade inválida.");
      }
      totais.set(id, (totais.get(id) || 0) + qtd);
    }
    await prisma.$transaction(async (tx) => {
      // Ordem estável evita deadlocks; a consulta seguinte vê entregas já confirmadas.
      for (const [id, quantidade] of [...totais].sort(([a], [b]) => a - b)) {
        const lotes = await tx.$queryRaw`
          SELECT id, qtd_inicial AS "qtdInicial"
          FROM public.farmacia_lotes_medicamentos WHERE id = ${id} FOR UPDATE
        `;
        if (!lotes.length) throw new Error("Lote não encontrado.");
        const entregas = await tx.dispensacaoMedicamento.aggregate({
          where: { loteMedicamentoId: id }, _sum: { qtdEntregue: true },
        });
        const saldo = lotes[0].qtdInicial - (entregas._sum.qtdEntregue || 0);
        if (quantidade > saldo) throw new Error(`Saldo insuficiente no lote ${id}. Disponível: ${saldo}.`);
      }
      for (const [id, quantidade] of totais) {
        await tx.dispensacaoMedicamento.create({ data: {
          pacientePasta: data.numeroPasta,
          loteMedicamentoId: id,
          qtdEntregue: quantidade,
          dataDispensacao: new Date(),
          observacao: `Responsável pela Entrega: ${data.responsavelEntrega}${data.observacao ? " | Obs: " + data.observacao : ""}`,
        } });
      }
    }, { isolationLevel: "ReadCommitted" });
    revalidatePath("/camara-tecnica/farmacia-judicial");
    return { success: true };
  } catch (error) {
    console.error("Erro ao registrar dispensação:", error);
    return { success: false, error: error.message };
  }
}

// ==========================================
// 5. RELATÓRIOS (ENTRADAS E SAÍDAS)
// ==========================================
export async function getRelatorioEntradas() {
  try {
    const rows = await prisma.$queryRaw`
      SELECT 
        lm.id AS "loteId",
        m.nome AS "medicamentoNome",
        m.dosagem AS dosagem,
        m.tipo AS tipo,
        lm.numero_lote AS "numeroLote",
        lm.fornecedor AS fornecedor,
        lm.qtd_inicial AS quantidade,
        lm.valor_unitario AS "valorUnitario",
        (lm.qtd_inicial * lm.valor_unitario) AS "valorTotal",
        TO_CHAR(lm.data_entrada, 'DD/MM/YYYY') AS "dataEntrada",
        TO_CHAR(lm.data_validade, 'DD/MM/YYYY') AS "dataValidade"
      FROM public.farmacia_lotes_medicamentos lm
      JOIN public.farmacia_medicamentos m ON lm.medicamento_id = m.id
      ORDER BY lm.data_entrada DESC
    `;
    return serializeData(rows);
  } catch (error) {
    console.error("Erro ao buscar relatório de entradas:", error);
    return [];
  }
}

export async function getRelatorioSaidas() {
  try {
    const rows = await prisma.$queryRaw`
      SELECT 
        dm.id AS "dispensacaoId",
        pfj.numero_pasta AS "numeroPasta",
        p.nome_completo AS "pacienteNome",
        p.cpf AS cpf,
        m.nome AS "medicamentoNome",
        m.dosagem AS dosagem,
        lm.numero_lote AS "numeroLote",
        dm.qtd_entregue AS quantidade,
        TO_CHAR(dm.data_dispensacao, 'DD/MM/YYYY HH24:MI') AS "dataDispensacao",
        dm.observacao AS observacao
      FROM public.farmacia_dispensacoes_medicamentos dm
      JOIN public.farmacia_pacientes pfj ON dm.paciente_pasta = pfj.numero_pasta
      JOIN public.pessoa p ON pfj.pessoa_cpf = p.cpf
      JOIN public.farmacia_lotes_medicamentos lm ON dm.lote_medicamento_id = lm.id
      JOIN public.farmacia_medicamentos m ON lm.medicamento_id = m.id
      ORDER BY dm.data_dispensacao DESC
    `;
    return serializeData(rows);
  } catch (error) {
    console.error("Erro ao buscar relatório de saídas:", error);
    return [];
  }
}

// ==========================================
// 6. DASHBOARD & BUSCA
// ==========================================
export async function getDashboardMetrics() {
  try {
    const resMedsCat = await prisma.$queryRaw`
      SELECT COUNT(*)::integer AS total FROM public.farmacia_medicamentos WHERE ativo = true
    `;

    const resEstoque = await prisma.$queryRaw`
      SELECT COALESCE(SUM(lm.qtd_inicial - COALESCE(sub.total_entregue, 0)), 0)::integer AS total
      FROM public.farmacia_lotes_medicamentos lm
      LEFT JOIN (
        SELECT lote_medicamento_id, SUM(qtd_entregue) AS total_entregue
        FROM public.farmacia_dispensacoes_medicamentos
        GROUP BY lote_medicamento_id
      ) sub ON lm.id = sub.lote_medicamento_id
    `;

    const resPacientes = await prisma.$queryRaw`
      SELECT status, COUNT(*)::integer AS total
      FROM public.farmacia_pacientes
      GROUP BY status
    `;

    let ativos = 0;
    let inativos = 0;
    let obitos = 0;

    const formattedPacientes = serializeData(resPacientes);
    formattedPacientes.forEach((row) => {
      const st = (row.status || "").toUpperCase();
      if (st === "ATIVO") ativos += Number(row.total);
      else if (st === "INATIVO") inativos += Number(row.total);
      else if (st === "ÓBITO" || st === "OBITO") obitos += Number(row.total);
      else ativos += Number(row.total);
    });

    const catObj = serializeData(resMedsCat);
    const estObj = serializeData(resEstoque);

    return {
      totalMedicamentosCadastrados: Number(catObj[0]?.total || 0),
      totalEstoqueUnidades: Number(estObj[0]?.total || 0),
      pacientesAtivos: ativos,
      pacientesInativos: inativos,
      pacientesObito: obitos,
    };
  } catch (error) {
    console.error("Erro ao buscar métricas do dashboard:", error);
    return {
      totalMedicamentosCadastrados: 0,
      totalEstoqueUnidades: 0,
      pacientesAtivos: 0,
      pacientesInativos: 0,
      pacientesObito: 0,
    };
  }
}

export async function buscarPessoaExistente(termo) {
  try {
    // Termo vazio ou muito curto: traz os primeiros registros (para o dropdown
    // já aparecer ao clicar no campo, como na Regulação).
    const searchTerm = `%${(termo || "").trim()}%`;
    const rows = await prisma.$queryRaw`
      SELECT 
        p.cpf AS cpf,
        p.cns AS cns,
        p.nome_completo AS "nomeCompleto",
        p.sexo AS sexo,
        TO_CHAR(p.data_nascimento, 'YYYY-MM-DD') AS "dataNascimento",
        p.nome_mae AS "nomeMae",
        p.telefone AS telefone,
        u.nome AS "ubsReferencia",
        e.logradouro AS logradouro,
        e.numero AS numero,
        e.complemento AS complemento,
        e.bairro AS bairro,
        e.cidade AS cidade,
        e.uf AS uf,
        e.cep AS cep
      FROM public.pessoa p
      LEFT JOIN public.pessoa_endereco e ON p.cpf = e.pessoa_cpf AND e.endereco_atual = true
      LEFT JOIN public.regula_ubs u ON p.ubs_referencia_id = u.id
      WHERE p.cpf ILIKE ${searchTerm} 
         OR p.nome_completo ILIKE ${searchTerm}
      LIMIT 10
    `;
    return serializeData(rows);
  } catch (error) {
    console.error("Erro ao buscar pessoa existente:", error);
    return [];
  }
}
