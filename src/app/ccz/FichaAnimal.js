"use client";

import { useState, useEffect } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import styles from "./FichaAnimal.module.css";
import { mascararTelefone } from "@/lib/telefone";
import { obterFichaAnimal } from "./actions";

const formatarData = (ymd) => (ymd ? ymd.split("-").reverse().join("/") : "-");

const classeStatus = (status) => {
  if (status === "Realizado") return styles.statusRealizado;
  if (status === "Cancelado") return styles.statusCancelado;
  return styles.statusAgendado;
};

export default function FichaAnimal({ animalId, onFechar }) {
  const [ficha, setFicha] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  useEffect(() => {
    let ativo = true;
    setCarregando(true);
    setErro("");
    obterFichaAnimal(animalId).then((res) => {
      if (!ativo) return;
      if (res.success) setFicha(res.data);
      else setErro(res.error || "Não foi possível carregar a ficha.");
      setCarregando(false);
    });
    return () => {
      ativo = false;
    };
  }, [animalId]);

  // ── Gera o PDF com todas as informações da ficha + procedimentos ──
  const baixarRelatorio = () => {
    if (!ficha) return;

    const doc = new jsPDF();
    const margemX = 14;
    const larguraUtil = 210 - margemX * 2;
    let y = 18;

    // Cabeçalho
    doc.setFillColor(74, 111, 165);
    doc.rect(0, 0, 210, 26, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.text("Ficha do Animal — CCZ", margemX, 13);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(
      `${ficha.nome || "Sem nome"}  (ID: ${ficha.id})`,
      margemX,
      20,
    );
    const emissao = new Date().toLocaleString("pt-BR");
    doc.text(`Emitido em: ${emissao}`, 210 - margemX, 20, { align: "right" });

    y = 34;
    doc.setTextColor(30, 41, 59);

    // Imagem do animal (se houver e for data URL de imagem).
    if (ficha.fotoUrl && ficha.fotoUrl.startsWith("data:image")) {
      try {
        const fmt = ficha.fotoUrl.includes("image/png") ? "PNG" : "JPEG";
        doc.addImage(ficha.fotoUrl, fmt, 210 - margemX - 34, y, 34, 34);
      } catch {
        // Ignora foto inválida — segue sem a imagem.
      }
    }

    // Função utilitária para títulos de seção.
    const secao = (titulo) => {
      y += 2;
      doc.setFillColor(241, 245, 249);
      doc.rect(margemX, y, larguraUtil, 7, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(51, 65, 85);
      doc.text(titulo, margemX + 2, y + 5);
      y += 11;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      doc.setTextColor(30, 41, 59);
    };

    // Linha "rótulo: valor" (quebra de página automática).
    const linha = (rotulo, valor) => {
      if (y > 275) {
        doc.addPage();
        y = 18;
      }
      doc.setFont("helvetica", "bold");
      doc.text(`${rotulo}: `, margemX, y);
      const larguraRotulo = doc.getTextWidth(`${rotulo}: `);
      doc.setFont("helvetica", "normal");
      const texto = doc.splitTextToSize(
        String(valor || "-"),
        larguraUtil - larguraRotulo - 36,
      );
      doc.text(texto, margemX + larguraRotulo, y);
      y += texto.length * 5 + 1;
    };

    secao("Identificação");
    linha("Nome", ficha.nome || "Sem nome");
    linha("Espécie", ficha.especie);
    linha("Sexo", ficha.sexo);
    linha("Porte", ficha.porte);
    linha("Idade", ficha.idade);
    linha("Castrado", ficha.castrado);

    secao("Tutor");
    if (ficha.tutor) {
      linha("Nome", ficha.tutor.nome);
      linha("CPF", ficha.tutor.cpf);
      linha(
        "Telefone",
        ficha.tutor.telefone ? mascararTelefone(ficha.tutor.telefone) : "-",
      );
    } else {
      linha("Tutor", "Animal sem tutor vinculado");
    }

    secao("Dados clínicos");
    linha(
      "Doença crônica",
      ficha.doencaCronica === "Sim"
        ? `Sim${ficha.qualDoenca ? ` — ${ficha.qualDoenca}` : ""}`
        : "Não",
    );
    linha("Apetite", ficha.apetiteNormal);
    linha("Vômito / Diarreia", ficha.sintomasVomitoDiarreia);
    linha(
      "Em tratamento",
      ficha.emTratamento === "Sim"
        ? `Sim${ficha.qualTratamento ? ` — ${ficha.qualTratamento}` : ""}`
        : "Não",
    );
    if (ficha.observacoes) linha("Observação", ficha.observacoes);

    // Procedimentos (tabela).
    y += 2;
    if (y > 265) {
      doc.addPage();
      y = 18;
    }
    secao(`Procedimentos (${ficha.procedimentos.length})`);

    if (ficha.procedimentos.length === 0) {
      doc.text("Nenhum procedimento registrado.", margemX, y);
      y += 6;
    } else {
      autoTable(doc, {
        startY: y,
        margin: { left: margemX, right: margemX },
        head: [["Tipo", "Data", "Status", "Veterinário", "Retorno"]],
        body: ficha.procedimentos.map((p) => [
          p.tipo,
          formatarData(p.dataProcedimento),
          p.status,
          p.veterinario || "-",
          p.dataRetorno ? formatarData(p.dataRetorno) : "-",
        ]),
        styles: { fontSize: 8.5, cellPadding: 2.2, textColor: [30, 41, 59] },
        headStyles: { fillColor: [74, 111, 165], textColor: 255, fontStyle: "bold" },
        alternateRowStyles: { fillColor: [248, 250, 252] },
      });

      let yApos = (doc.lastAutoTable?.finalY || y) + 6;

      // Detalhes (descrição/medicamento) de cada procedimento.
      ficha.procedimentos.forEach((p) => {
        if (!p.descricao && !p.medicacaoPrescrita) return;
        if (yApos > 275) {
          doc.addPage();
          yApos = 18;
        }
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(51, 65, 85);
        doc.text(`${p.tipo} — ${formatarData(p.dataProcedimento)}`, margemX, yApos);
        yApos += 5;
        doc.setFont("helvetica", "normal");
        doc.setTextColor(30, 41, 59);
        if (p.descricao) {
          const t = doc.splitTextToSize(`Descrição: ${p.descricao}`, larguraUtil);
          doc.text(t, margemX, yApos);
          yApos += t.length * 4.5 + 1;
        }
        if (p.medicacaoPrescrita) {
          const t = doc.splitTextToSize(`Medicamento: ${p.medicacaoPrescrita}`, larguraUtil);
          doc.text(t, margemX, yApos);
          yApos += t.length * 4.5 + 1;
        }
        yApos += 2;
      });
    }

    const nomeArquivo = `ficha-animal-${ficha.id}.pdf`;
    doc.save(nomeArquivo);
  };

  return (
    <div className={styles.overlay} onClick={onFechar}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <div>
            <h2 className={styles.title}>Ficha do animal</h2>
            {ficha && (
              <p className={styles.subtitle}>
                {ficha.nome || "Sem nome"} ({ficha.id})
              </p>
            )}
          </div>
          <button type="button" className={styles.closeBtn} onClick={onFechar}>
            ✕
          </button>
        </div>

        <div className={styles.body}>
          {carregando ? (
            <p className={styles.info}>Carregando ficha...</p>
          ) : erro ? (
            <p className={styles.erro}>{erro}</p>
          ) : (
            <>
              {/* IDENTIFICAÇÃO */}
              <div className={styles.topo}>
                {ficha.fotoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={ficha.fotoUrl} alt={ficha.nome || "Animal"} className={styles.foto} />
                ) : (
                  <div className={styles.fotoVazia}>Sem foto</div>
                )}
                <div className={styles.topoInfo}>
                  <h3 className={styles.animalNome}>{ficha.nome || "Sem nome"}</h3>
                  <div className={styles.chips}>
                    <span className={styles.chip}>{ficha.especie || "-"}</span>
                    <span className={styles.chip}>{ficha.sexo}</span>
                    <span className={styles.chip}>Porte: {ficha.porte || "-"}</span>
                    <span className={styles.chip}>Idade: {ficha.idade || "-"}</span>
                    <span className={styles.chip}>
                      {ficha.castrado === "Sim" ? "Castrado" : "Não castrado"}
                    </span>
                  </div>
                </div>
              </div>

              {/* TUTOR */}
              <div className={styles.secao}>
                <h4 className={styles.secaoTitulo}>Tutor</h4>
                {ficha.tutor ? (
                  <div className={styles.dadosGrid}>
                    <div className={styles.dado}>
                      <span className={styles.dadoLabel}>Nome</span>
                      <span className={styles.dadoValor}>{ficha.tutor.nome}</span>
                    </div>
                    <div className={styles.dado}>
                      <span className={styles.dadoLabel}>CPF</span>
                      <span className={styles.dadoValor}>{ficha.tutor.cpf}</span>
                    </div>
                    <div className={styles.dado}>
                      <span className={styles.dadoLabel}>Telefone</span>
                      <span className={styles.dadoValor}>
                        {ficha.tutor.telefone ? mascararTelefone(ficha.tutor.telefone) : "-"}
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className={styles.semTutor}>Animal sem tutor vinculado.</p>
                )}
              </div>

              {/* DADOS CLÍNICOS */}
              <div className={styles.secao}>
                <h4 className={styles.secaoTitulo}>Dados clínicos</h4>
                <div className={styles.dadosGrid}>
                  <div className={styles.dado}>
                    <span className={styles.dadoLabel}>Doença crônica</span>
                    <span className={styles.dadoValor}>
                      {ficha.doencaCronica === "Sim"
                        ? `Sim${ficha.qualDoenca ? ` — ${ficha.qualDoenca}` : ""}`
                        : "Não"}
                    </span>
                  </div>
                  <div className={styles.dado}>
                    <span className={styles.dadoLabel}>Apetite</span>
                    <span className={styles.dadoValor}>{ficha.apetiteNormal}</span>
                  </div>
                  <div className={styles.dado}>
                    <span className={styles.dadoLabel}>Vômito / Diarreia</span>
                    <span className={styles.dadoValor}>{ficha.sintomasVomitoDiarreia}</span>
                  </div>
                  <div className={styles.dado}>
                    <span className={styles.dadoLabel}>Em tratamento</span>
                    <span className={styles.dadoValor}>
                      {ficha.emTratamento === "Sim"
                        ? `Sim${ficha.qualTratamento ? ` — ${ficha.qualTratamento}` : ""}`
                        : "Não"}
                    </span>
                  </div>
                </div>
                {ficha.observacoes && (
                  <div className={styles.observacoes}>
                    <span className={styles.dadoLabel}>Observação</span>
                    <p className={styles.obsTexto}>{ficha.observacoes}</p>
                  </div>
                )}
              </div>

              {/* PROCEDIMENTOS */}
              <div className={styles.secao}>
                <h4 className={styles.secaoTitulo}>
                  Procedimentos{ficha.procedimentos.length > 0 ? ` (${ficha.procedimentos.length})` : ""}
                </h4>
                {ficha.procedimentos.length === 0 ? (
                  <p className={styles.semTutor}>Nenhum procedimento registrado para este animal.</p>
                ) : (
                  <div className={styles.procLista}>
                    {ficha.procedimentos.map((p) => (
                      <div key={p.id} className={styles.procItem}>
                        <div className={styles.procTopo}>
                          <strong>{p.tipo}</strong>
                          <span className={classeStatus(p.status)}>{p.status}</span>
                        </div>
                        <div className={styles.procMeta}>
                          <span>Data: {formatarData(p.dataProcedimento)}</span>
                          {p.veterinario && <span>Vet.: {p.veterinario}</span>}
                          {p.dataRetorno && <span>Retorno: {formatarData(p.dataRetorno)}</span>}
                        </div>
                        {p.descricao && (
                          <p className={styles.procTexto}>
                            <strong>Descrição:</strong> {p.descricao}
                          </p>
                        )}
                        {p.medicacaoPrescrita && (
                          <p className={styles.procTexto}>
                            <strong>Medicamento:</strong> {p.medicacaoPrescrita}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <div className={styles.footer}>
          {ficha && (
            <button type="button" className={styles.baixarBtn} onClick={baixarRelatorio}>
              Baixar relatório
            </button>
          )}
          <button type="button" className={styles.fecharBtn} onClick={onFechar}>
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
