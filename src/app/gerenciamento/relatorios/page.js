"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { documentoPaciente } from "@/app/regulacao/constants";
import { mascararTelefone } from "@/lib/telefone";
import styles from "./RelatoriosGerais.module.css";

// Ordem fixa dos módulos para agrupar a timeline e as tabelas do PDF.
const ORDEM_MODULOS = [
  "Regulação",
  "Farmácia Judicial",
  "Junta Reguladora",
  "CCZ",
];

// Formata uma data (string ISO ou Date) em pt-BR, tolerando null.
const formatarData = (valor) => {
  if (!valor) return "—";
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return "—";
  return data.toLocaleDateString("pt-BR");
};

export default function RelatoriosGeraisPage() {
  const [usuarios, setUsuarios] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  // Busca select-like (dropdown em tabela).
  const [termo, setTermo] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [selecionado, setSelecionado] = useState(null);
  const buscaRef = useRef(null);

  useEffect(() => {
    async function carregarRelatorio() {
      try {
        const resposta = await fetch("/api/gerenciamento/relatorios", {
          cache: "no-store",
        });
        const dados = await resposta.json();
        if (!resposta.ok)
          throw new Error(
            dados.error || "Não foi possível carregar o relatório.",
          );
        setUsuarios(dados.usuarios || []);
      } catch (error) {
        setErro(error.message);
      } finally {
        setCarregando(false);
      }
    }
    carregarRelatorio();
  }, []);

  // Fecha o dropdown ao clicar fora.
  useEffect(() => {
    function handleClickOutside(evento) {
      if (buscaRef.current && !buscaRef.current.contains(evento.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filtra por nome ou CPF (comparando dígitos limpos para o CPF).
  const sugestoes = useMemo(() => {
    const texto = termo.toLowerCase().trim();
    const digitos = termo.replace(/\D/g, "");
    if (!texto) return usuarios;
    return usuarios.filter((usuario) => {
      const nome = String(usuario.nomeCompleto || usuario.nome || "")
        .toLowerCase()
        .includes(texto);
      const cpf =
        digitos.length > 0 &&
        String(usuario.cpf || "")
          .replace(/\D/g, "")
          .includes(digitos);
      return nome || cpf;
    });
  }, [termo, usuarios]);

  const selecionarUsuario = (usuario) => {
    setSelecionado(usuario);
    setTermo(usuario.nomeCompleto || usuario.nome || "");
    setShowDropdown(false);
  };

  function gerarPDF() {
    if (!selecionado) return;

    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const resumo = selecionado.resumo || {};
    const atividades = selecionado.atividades || [];

    const dataEmissao = `${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString(
      "pt-BR",
      { hour: "2-digit", minute: "2-digit" },
    )}`;

    // Cabeçalho institucional azul.
    doc.setFillColor(2, 132, 199);
    doc.rect(0, 0, 210, 18, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("ORION - RELATÓRIO UNIFICADO DO PACIENTE", 14, 12);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(`Emissão: ${dataEmissao}`, 196, 12, { align: "right" });

    doc.setTextColor(30, 41, 59);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("RELATÓRIO COMPLETO DO PACIENTE", 14, 28);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(
      `Paciente: ${selecionado.nomeCompleto || selecionado.nome || "—"}`,
      14,
      33.5,
    );

    // ── Ficha de dados pessoais (campos em caixa) ──
    const margemX = 14;
    const larguraUtil = 182;
    let fichaY = 40;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(30, 41, 59);
    doc.text("Dados Pessoais", margemX, fichaY);
    fichaY += 4;

    const alturaCaixa = 8;
    const gapRotulo = 4;
    const campoCaixa = (rotulo, valor, x, y, largura) => {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(51, 65, 85);
      doc.text(String(rotulo), x + 0.5, y + 2.6);

      const caixaY = y + gapRotulo;
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.3);
      doc.roundedRect(x, caixaY, largura, alturaCaixa, 1.6, 1.6, "FD");

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(30, 41, 59);
      const texto = valor == null || valor === "" ? "—" : String(valor);
      const linhasTxt = doc.splitTextToSize(texto, largura - 5);
      doc.text(linhasTxt[0], x + 3, caixaY + alturaCaixa / 2 + 1.5);
    };

    const gap = 5;
    const col2 = (larguraUtil - gap) / 2;
    const x2 = [margemX, margemX + col2 + gap];
    const alturaLinha = gapRotulo + alturaCaixa + 4;
    let yGrid = fichaY + 1;

    campoCaixa(
      "Nome completo",
      selecionado.nomeCompleto || selecionado.nome,
      x2[0],
      yGrid,
      col2,
    );
    campoCaixa("CPF", documentoPaciente({ cpf: selecionado.cpf }), x2[1], yGrid, col2);
    yGrid += alturaLinha;

    campoCaixa(
      "Data de nascimento",
      selecionado.dataNascimento
        ? new Date(selecionado.dataNascimento).toLocaleDateString("pt-BR")
        : null,
      x2[0],
      yGrid,
      col2,
    );
    campoCaixa(
      "Telefone",
      mascararTelefone(selecionado.telefone) || null,
      x2[1],
      yGrid,
      col2,
    );
    yGrid += alturaLinha;

    let currentY = yGrid + 2;

    // ── Resumo por módulo ──
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(30, 41, 59);
    doc.text("Resumo por Módulo", margemX, currentY);
    currentY += 6;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);

    const linhasResumo = [];
    const reg = resumo.regulacao;
    if (reg) {
      linhasResumo.push(
        `Regulação: ${reg.total || 0} exame(s) · ${reg.aguardando || 0} aguardando · ${reg.liberados || 0} liberado(s)`,
      );
    }
    if (resumo.farmacia) {
      linhasResumo.push(
        `Farmácia Judicial: ${resumo.farmacia.medicamentos?.length || 0} medicamento(s) ativo(s) · ${resumo.farmacia.dispensacoes || 0} dispensação(ões) · Pasta ${resumo.farmacia.pasta} · status ${resumo.farmacia.status}`,
      );
    }
    if (resumo.junta) {
      linhasResumo.push(
        `Junta Reguladora: ${resumo.junta.servicos?.length || 0} serviço(s) · ${resumo.junta.atendimentos || 0} atendimento(s)`,
      );
    }
    if (resumo.ccz) {
      linhasResumo.push(
        `CCZ: ${resumo.ccz.animais?.length || 0} animal(is) · ${resumo.ccz.procedimentos || 0} procedimento(s) · ${resumo.ccz.zoonoses || 0} zoonose(s)`,
      );
    }

    if (linhasResumo.length === 0) {
      doc.setFont("helvetica", "italic");
      doc.text("Nenhum registro nos módulos.", margemX, currentY);
      currentY += 6;
    } else {
      linhasResumo.forEach((linha) => {
        const linhasTxt = doc.splitTextToSize(linha, larguraUtil);
        doc.text(linhasTxt, margemX, currentY);
        currentY += linhasTxt.length * 4.6 + 1.5;
      });
    }
    currentY += 3;

    // ── Uma tabela por módulo ──
    ORDEM_MODULOS.forEach((modulo) => {
      const doModulo = atividades.filter((a) => a.modulo === modulo);
      if (doModulo.length === 0) return;

      if (currentY + 20 > 282) {
        doc.addPage();
        currentY = 20;
      }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(37, 99, 235);
      doc.text(modulo, margemX, currentY);
      currentY += 2;

      autoTable(doc, {
        startY: currentY + 1,
        head: [["Data", "Tipo", "Descrição", "Status"]],
        body: doModulo.map((a) => [
          formatarData(a.data),
          a.tipo || "—",
          a.descricao || "—",
          a.status || "—",
        ]),
        styles: { fontSize: 8, cellPadding: 2.3, textColor: [30, 41, 59] },
        headStyles: {
          fillColor: [37, 99, 235],
          textColor: 255,
          fontStyle: "bold",
          fontSize: 8.5,
        },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        margin: { left: margemX, right: margemX },
        columnStyles: {
          0: { cellWidth: 24 },
          1: { cellWidth: 38 },
          2: { cellWidth: "auto" },
          3: { cellWidth: 28 },
        },
      });

      currentY = doc.lastAutoTable.finalY + 8;
    });

    // Rodapé em todas as páginas.
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);
      doc.text(
        `Página ${i} de ${totalPages} - Documento Gerado pelo Sistema Orion`,
        105,
        290,
        { align: "center" },
      );
    }

    const nomeLimpo = (
      selecionado.nomeCompleto ||
      selecionado.nome ||
      "Paciente"
    ).replace(/[^a-zA-Z0-9]/g, "_");
    doc.save(`Relatorio_Paciente_${nomeLimpo}.pdf`);
  }

  if (carregando) {
    return (
      <main className={styles.container}>
        <p className={styles.feedback}>Carregando relatório geral...</p>
      </main>
    );
  }

  if (erro) {
    return (
      <main className={styles.container}>
        <div className={styles.error}>{erro}</div>
      </main>
    );
  }

  const resumo = selecionado?.resumo || {};

  // Agrupa as atividades (já ordenadas por data desc) por módulo, respeitando ORDEM_MODULOS.
  const gruposTimeline = selecionado
    ? ORDEM_MODULOS.map((modulo) => ({
        modulo,
        itens: (selecionado.atividades || []).filter(
          (a) => a.modulo === modulo,
        ),
      })).filter((grupo) => grupo.itens.length > 0)
    : [];

  return (
    <main className={styles.container}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>GERENCIAMENTO</p>
          <h1>Relatório Unificado do Paciente</h1>
          <p className={styles.subtitle}>
            Busque uma pessoa e consulte tudo que ela registrou em todos os
            módulos do sistema.
          </p>
        </div>
      </header>

      <section className={styles.buscaWrapper}>
        <label className={styles.buscaLabel}>
          Buscar paciente (Nome ou CPF)
        </label>
        <div className={styles.searchSelectWrapper} ref={buscaRef}>
          <input
            type="text"
            className={styles.selectLikeInput}
            placeholder="Selecionar ou digitar nome/CPF..."
            value={termo}
            onChange={(evento) => {
              setTermo(evento.target.value);
              setShowDropdown(true);
            }}
            onFocus={() => setShowDropdown(true)}
          />
          <span
            className={styles.arrowIcon}
            onClick={() => setShowDropdown((valor) => !valor)}
          >
            {showDropdown ? "▲" : "▼"}
          </span>

          {showDropdown && (
            <div className={styles.tableDropdownMenu}>
              <div className={styles.tableContainerScroll}>
                <table className={styles.patientTableDropdown}>
                  <thead>
                    <tr>
                      <th>CPF</th>
                      <th>Usuário</th>
                      <th>Data nasc.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sugestoes.length > 0 ? (
                      sugestoes.map((usuario, index) => (
                        <tr
                          key={usuario.cpf ? `${usuario.cpf}-${index}` : index}
                          onMouseDown={(evento) => {
                            evento.preventDefault();
                            selecionarUsuario(usuario);
                          }}
                          className={
                            selecionado?.cpf === usuario.cpf
                              ? styles.selectedRow
                              : ""
                          }
                        >
                          <td>{documentoPaciente({ cpf: usuario.cpf })}</td>
                          <td className={styles.boldName}>
                            {usuario.nomeCompleto || usuario.nome}
                          </td>
                          <td>{formatarData(usuario.dataNascimento)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="3" className={styles.noDataTd}>
                          Nenhum paciente encontrado.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </section>

      {!selecionado ? (
        <section className={styles.emptyReport}>
          <h2>Nenhum paciente selecionado</h2>
          <p>Busque um paciente para ver o relatório completo.</p>
        </section>
      ) : (
        <>
          <div className={styles.reportHeaderBar}>
            <div>
              <h2>{selecionado.nomeCompleto || selecionado.nome}</h2>
              <p className={styles.patientMeta}>
                Relatório consolidado dos módulos vinculados ao CPF.
              </p>
            </div>
            <button
              type="button"
              className={styles.exportBtn}
              onClick={gerarPDF}
            >
              Exportar PDF
            </button>
          </div>

          <section className={styles.fichaCard}>
            <div className={styles.fichaCampo}>
              <label>Nome</label>
              <span>{selecionado.nomeCompleto || selecionado.nome || "—"}</span>
            </div>
            <div className={styles.fichaCampo}>
              <label>CPF</label>
              <span>{documentoPaciente({ cpf: selecionado.cpf })}</span>
            </div>
            <div className={styles.fichaCampo}>
              <label>Data de nascimento</label>
              <span>{formatarData(selecionado.dataNascimento)}</span>
            </div>
            <div className={styles.fichaCampo}>
              <label>Telefone</label>
              <span>{mascararTelefone(selecionado.telefone) || "—"}</span>
            </div>
          </section>

          <div className={styles.stats}>
            <div>
              <strong>{selecionado.totalAtividades || 0}</strong>
              <span>atividades registradas</span>
            </div>
            <div>
              <strong>{selecionado.modulos?.length || 0}</strong>
              <span>sistemas relacionados</span>
            </div>
          </div>

          <div className={styles.systemSummary}>
            <h3>Resumo por sistema</h3>
            <div className={styles.systemCards}>
              <div className={styles.systemCard}>
                <strong>Regulação</strong>
                <span>
                  {resumo.regulacao?.total || 0} exame(s) solicitado(s)
                </span>
                <small>
                  {resumo.regulacao?.aguardando || 0} aguardando ·{" "}
                  {resumo.regulacao?.liberados || 0} liberado(s)
                </small>
              </div>
              <div className={styles.systemCard}>
                <strong>Farmácia Judicial</strong>
                <span>
                  {resumo.farmacia?.medicamentos?.length || 0} medicamento(s)
                  ativo(s)
                </span>
                <small>
                  {resumo.farmacia
                    ? `${resumo.farmacia.dispensacoes} dispensação(ões) · Pasta ${resumo.farmacia.pasta} · ${resumo.farmacia.status}`
                    : "Sem cadastro judicial"}
                </small>
                {resumo.farmacia?.medicamentos?.length > 0 && (
                  <small>{resumo.farmacia.medicamentos.join(" · ")}</small>
                )}
              </div>
              <div className={styles.systemCard}>
                <strong>Junta Reguladora</strong>
                <span>
                  {resumo.junta?.servicos?.length || 0} serviço(s) vinculado(s)
                </span>
                <small>
                  {resumo.junta
                    ? `${resumo.junta.atendimentos || 0} atendimento(s) registrado(s)`
                    : "Sem cadastro na Junta"}
                </small>
              </div>
              <div className={styles.systemCard}>
                <strong>CCZ</strong>
                <span>
                  {resumo.ccz?.animais?.length || 0} animal(is) vinculado(s)
                </span>
                <small>
                  {resumo.ccz
                    ? `${resumo.ccz.procedimentos} procedimento(s) · ${resumo.ccz.zoonoses} zoonose(s)`
                    : "Sem registros no CCZ"}
                </small>
              </div>
            </div>
          </div>

          <div className={styles.timeline}>
            <h3>Histórico unificado</h3>
            {gruposTimeline.length === 0 ? (
              <p className={styles.empty}>
                Nenhuma atividade registrada para este paciente.
              </p>
            ) : (
              gruposTimeline.map((grupo) => (
                <div key={grupo.modulo} className={styles.timelineGroup}>
                  <div className={styles.timelineGroupTitle}>
                    <span className={styles.moduleBadge}>{grupo.modulo}</span>
                    <span>{grupo.itens.length} registro(s)</span>
                  </div>
                  {grupo.itens.map((atividade) => (
                    <div key={atividade.id} className={styles.timelineItem}>
                      <span className={styles.timelineDot} />
                      <div className={styles.timelineBody}>
                        <strong>{atividade.tipo}</strong>
                        <span className={styles.descricao}>
                          {atividade.descricao}
                        </span>
                        <span className={styles.metaLine}>
                          <span>{formatarData(atividade.data)}</span>
                          {atividade.status && (
                            <span className={styles.statusBadge}>
                              {atividade.status}
                            </span>
                          )}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>
        </>
      )}
    </main>
  );
}
