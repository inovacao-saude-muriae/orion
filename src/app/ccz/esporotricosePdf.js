// Utilitário de geração de PDF da Esporotricose (relatório completo + termo).
// Sem "use client": é importado pelo componente client da lista. Reutiliza o
// estilo visual de FichaAnimal.js (header azul, seção com barra cinza, linha
// rótulo/valor com quebra de página) e de TermoInternacao.js (data por extenso
// com MESES minúsculos, assinaturas via doc.line).

import jsPDF from "jspdf";
import { mascararTelefone } from "@/lib/telefone";

const MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

const formatarData = (ymd) => (ymd ? ymd.split("-").reverse().join("/") : "-");

const dataPorExtenso = (ymd) => {
  if (!ymd) return { dia: "____", mes: "____________", ano: "______" };
  const [a, m, d] = ymd.split("-");
  return { dia: d, mes: MESES[Number(m) - 1] || "____________", ano: a };
};

// Rótulos legíveis para os encaminhamentos marcados.
const ENCAMINHAMENTOS = [
  ["encAcompanhamentoCcz", "Acompanhamento periódico pelo CCZ"],
  ["encNotificacaoTutor", "Notificação formal ao tutor"],
  ["encMinisterioPublico", "Encaminhamento ao Ministério Público"],
  ["encOutrasMedidas", "Outras medidas sanitárias"],
];

// Monta um "documento" jsPDF com os helpers de seção/linha compartilhados.
function criarDocumento() {
  const doc = new jsPDF();
  const margemX = 14;
  const larguraUtil = 210 - margemX * 2;
  const estado = { y: 18 };

  const addPaginaSePreciso = (limite = 275) => {
    if (estado.y > limite) {
      doc.addPage();
      estado.y = 18;
    }
  };

  const secao = (titulo) => {
    estado.y += 2;
    addPaginaSePreciso(270);
    doc.setFillColor(241, 245, 249);
    doc.rect(margemX, estado.y, larguraUtil, 7, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(51, 65, 85);
    doc.text(titulo, margemX + 2, estado.y + 5);
    estado.y += 11;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(30, 41, 59);
  };

  const linha = (rotulo, valor) => {
    addPaginaSePreciso();
    doc.setFont("helvetica", "bold");
    doc.text(`${rotulo}: `, margemX, estado.y);
    const larguraRotulo = doc.getTextWidth(`${rotulo}: `);
    doc.setFont("helvetica", "normal");
    const texto = doc.splitTextToSize(String(valor || "-"), larguraUtil - larguraRotulo - 4);
    doc.text(texto, margemX + larguraRotulo, estado.y);
    estado.y += texto.length * 5 + 1;
  };

  const paragrafo = (valor) => {
    addPaginaSePreciso();
    doc.setFont("helvetica", "normal");
    const texto = doc.splitTextToSize(String(valor || "-"), larguraUtil);
    doc.text(texto, margemX, estado.y);
    estado.y += texto.length * 5 + 1;
  };

  return { doc, margemX, larguraUtil, estado, secao, linha, paragrafo, addPaginaSePreciso };
}

// Preenche as seções comuns ao relatório e ao termo (sem assinaturas).
function preencherSecoes(ctx, data) {
  const { secao, linha, paragrafo } = ctx;
  const a = data.animal || {};

  secao("Identificação");
  linha("Data da visita", formatarData(data.dataVisita));
  linha("Número do protocolo", data.numeroProtocolo || "-");
  linha("Fiscal responsável", data.fiscalResponsavel || "-");

  secao("Dados do animal");
  linha("ID", a.id || "-");
  linha("Nome", a.nome || "Sem nome");
  linha("Espécie", a.especie || "-");
  linha("Sexo", a.sexo || "-");
  linha("Porte", a.porte || "-");
  linha("Idade", a.idade || "-");

  if (data.temTutor && data.tutor) {
    secao("Dados do tutor");
    linha("Nome", data.tutor.nome || "-");
    linha("CPF", data.tutor.cpf || "-");
    linha("Telefone", data.tutor.telefone ? mascararTelefone(data.tutor.telefone) : "-");
  }

  secao("Condição clínica");
  linha(
    "Apresenta lesões compatíveis com esporotricose",
    data.apresentaLesoes === "Sim"
      ? `Sim${data.descricaoLesoes ? ` — ${data.descricaoLesoes}` : ""}`
      : "Não",
  );
  linha(
    "Animal em tratamento veterinário",
    data.emTratamentoVeterinario === "Sim"
      ? `Sim${data.descricaoTratamentoVet ? ` — ${data.descricaoTratamentoVet}` : ""}`
      : "Não",
  );

  secao("Tratamento");
  linha("Medicamentos prescritos", data.medicamentosPrescritos || "-");
  linha("Houve interrupção do tratamento", data.interrupcaoTratamento || "Não");
  linha("Há registro de retorno ao veterinário", data.retornoVeterinario || "Não");

  if (data.temTutor) {
    secao("Manejo domiciliar");
    linha(
      "Animal em isolamento domiciliar",
      data.isolamentoDomiciliar === "Sim"
        ? `Sim${data.observacoesIsolamento ? ` — ${data.observacoesIsolamento}` : ""}`
        : "Não",
    );
    linha("Acesso à rua / contato com outros animais", data.acessoRua || "Não");
    linha(
      "Uso de EPI durante o manejo",
      data.usoEpi === "Sim" ? `Sim${data.quaisEpis ? ` — ${data.quaisEpis}` : ""}` : "Não",
    );
    linha("Higienização do ambiente", data.higienizacaoAmbiente || "-");

    secao("Outros animais e pessoas na residência");
    linha(
      "Há outros animais na residência",
      data.outrosAnimaisResidencia === "Sim"
        ? `Sim${data.outrosAnimaisDescricao ? ` — ${data.outrosAnimaisDescricao}` : ""}`
        : "Não",
    );
    linha(
      "Há pessoas com lesões suspeitas",
      data.pessoasComLesoes === "Sim"
        ? `Sim${data.pessoasLesoesDescricao ? ` — ${data.pessoasLesoesDescricao}` : ""}`
        : "Não",
    );

    secao("Ciência do responsável");
    linha("Ciente da necessidade de tratamento contínuo", data.cienteTratamentoContinuo || "Não");
    linha("Ciente da importância da contenção domiciliar", data.cienteContencao || "Não");
    linha("Ciente do uso obrigatório de luvas/EPI", data.cienteEpi || "Não");
    linha("Ciente da correta destinação de resíduos", data.cienteResiduos || "Não");
  }

  secao("Avaliação");
  linha("Condições gerais do ambiente", data.condicoesGeraisAmbiente || "-");
  linha("Conclusão da equipe técnica", data.conclusaoTecnica || "-");

  secao("Encaminhamentos sugeridos");
  const marcados = ENCAMINHAMENTOS.filter(([campo]) => data[campo]).map(([, rot]) => rot);
  if (marcados.length === 0) {
    paragrafo("Nenhum encaminhamento marcado.");
  } else {
    marcados.forEach((rot) => linha("•", rot));
  }
  if (data.encOutrasMedidas && data.outrasMedidasDescricao) {
    linha("Outras medidas / observações", data.outrasMedidasDescricao);
  }

  if (data.encAcompanhamentoCcz) {
    secao("Agenda de acompanhamento");
    if (!data.visitas || data.visitas.length === 0) {
      paragrafo("Nenhuma visita de acompanhamento agendada.");
    } else {
      data.visitas.forEach((v) => {
        linha(
          formatarData(v.data),
          v.observacao ? v.observacao : "Visita de acompanhamento",
        );
      });
    }
  }
}

// ── RELATÓRIO COMPLETO ──────────────────────────────────────────────────────
export function gerarPdfEsporotricose(data) {
  const ctx = criarDocumento();
  const { doc, margemX, estado } = ctx;

  // Cabeçalho azul.
  doc.setFillColor(74, 111, 165);
  doc.rect(0, 0, 210, 26, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text("Esporotricose — CCZ", margemX, 13);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(
    `${data.animal?.nome || "Sem nome"}  (ID: ${data.animal?.id || "-"})`,
    margemX,
    20,
  );
  const emissao = new Date().toLocaleString("pt-BR");
  doc.text(`Emitido em: ${emissao}`, 210 - margemX, 20, { align: "right" });

  estado.y = 34;
  doc.setTextColor(30, 41, 59);

  preencherSecoes(ctx, data);

  doc.save(`esporotricose-${data.id}.pdf`);
}

// ── TERMO (documento formal com assinaturas) ────────────────────────────────
export function gerarTermoEsporotricose(data) {
  const ctx = criarDocumento();
  const { doc, margemX, larguraUtil, estado } = ctx;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("TERMO DE VISTORIA / ESPOROTRICOSE", 105, estado.y, { align: "center" });
  estado.y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("Centro de Controle de Zoonoses — Muriaé/MG", 105, estado.y, { align: "center" });
  estado.y += 6;
  const emissao = new Date().toLocaleDateString("pt-BR");
  doc.text(`Emitido em: ${emissao}`, 105, estado.y, { align: "center" });
  estado.y += 8;

  doc.setDrawColor(203, 213, 225);
  doc.line(margemX, estado.y, 210 - margemX, estado.y);
  estado.y += 2;
  doc.setTextColor(30, 41, 59);

  preencherSecoes(ctx, data);

  // Linha "Muriaé, __ de ____ de ____" por extenso a partir da data da visita.
  const ext = dataPorExtenso(data.dataVisita);
  ctx.addPaginaSePreciso(255);
  estado.y += 10;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(`Muriaé, ${ext.dia} de ${ext.mes} de ${ext.ano}`, margemX, estado.y);

  // Área de assinaturas (quebra de página se necessário para caber).
  if (estado.y > 240) {
    doc.addPage();
    estado.y = 30;
  } else {
    estado.y += 28;
  }

  const metade = 210 / 2;
  const larguraLinha = larguraUtil / 2 - 10;

  // Assinatura do tutor/responsável (esquerda).
  doc.setDrawColor(100, 116, 139);
  doc.line(margemX + 6, estado.y, margemX + 6 + larguraLinha, estado.y);
  // Assinatura do médico veterinário (direita).
  doc.line(metade + 10, estado.y, metade + 10 + larguraLinha, estado.y);

  estado.y += 5;
  doc.setFontSize(10);
  doc.text(
    "Assinatura do tutor/responsável",
    margemX + 6 + larguraLinha / 2,
    estado.y,
    { align: "center" },
  );
  doc.text(
    "Assinatura do médico veterinário",
    metade + 10 + larguraLinha / 2,
    estado.y,
    { align: "center" },
  );

  doc.save(`termo-esporotricose-${data.id}.pdf`);
}
