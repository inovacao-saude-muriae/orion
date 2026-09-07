"use client";

import { useState } from "react";
import Image from "next/image";
import styles from "./Dispensacao.module.css";

export default function TabDispensacao({
  pacientes = [],
  estoqueLotes = [],
  onConfirmarDispensacao,
}) {
  const [search, setSearch] = useState("");
  const [selectedPaciente, setSelectedPaciente] = useState(null);
  const [responsavelEntrega, setResponsavelEntrega] = useState("");
  const [observacao, setObservacao] = useState("");

  const [carrinhoDispensacao, setCarrinhoDispensacao] = useState([]);

  // 🎯 ESTADOS PARA BUSCA DIGITÁVEL E MENU SUSPENSO
  const [searchMed, setSearchMed] = useState("");
  const [selectedLoteId, setSelectedLoteId] = useState("");
  const [qtdEntregue, setQtdEntregue] = useState("");

  // ESTADO DO MODAL DE CONFIRMAÇÃO
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const normalizeSearchValue = (value) =>
    String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();

  // FILTRO DE PACIENTES
  const normalizedPatientSearch = normalizeSearchValue(search);
  const normalizedPatientCpfSearch = search.replace(/\D/g, "");
  const filteredPacientes = pacientes.filter((p) => {
    const matchesText = [p.patientName, p.numeroPasta, p.numeroProcesso].some(
      (value) => normalizeSearchValue(value).includes(normalizedPatientSearch),
    );
    const matchesCpf =
      normalizedPatientCpfSearch.length > 0 &&
      String(p.cpf || "")
        .replace(/\D/g, "")
        .includes(normalizedPatientCpfSearch);

    return matchesText || matchesCpf;
  });

  // FILTRO DE LOTES DISPONÍVEIS
  const lotesComEstoque = estoqueLotes.filter((l) => l.qtdAtual > 0);

  const filteredLotes = lotesComEstoque.filter((l) => {
    const termo = normalizeSearchValue(searchMed);
    const medNome = normalizeSearchValue(l.medicamentoNome);
    const loteNum = normalizeSearchValue(l.numeroLote);
    const dosagem = normalizeSearchValue(l.dosagem);
    return (
      medNome.includes(termo) ||
      loteNum.includes(termo) ||
      dosagem.includes(termo)
    );
  });

  const handleSelectPaciente = (p) => {
    setSelectedPaciente(p);
    setSearch(`${p.numeroPasta} - ${p.patientName}`);
  };

  // 🎯 SELEÇÃO PELA BUSCA DIGITÁVEL
  const handleSelectLoteDigitavel = (lote) => {
    setSelectedLoteId(String(lote.loteId));
    setSearchMed(
      `${lote.medicamentoNome} (${lote.dosagem}) - Lote: ${lote.numeroLote}`,
    );
  };

  // 🎯 SELEÇÃO PELO MENU SUSPENSO (SELECT)
  const handleSelectLoteDropdown = (e) => {
    const loteId = e.target.value;
    setSelectedLoteId(loteId);

    if (!loteId) {
      setSearchMed("");
      return;
    }

    const lote = lotesComEstoque.find(
      (l) => String(l.loteId) === String(loteId),
    );
    if (lote) {
      setSearchMed(
        `${lote.medicamentoNome} (${lote.dosagem}) - Lote: ${lote.numeroLote}`,
      );
    }
  };

  const handleAddItem = (e) => {
    e.preventDefault();
    if (!selectedLoteId || !qtdEntregue || Number(qtdEntregue) <= 0) {
      return alert("Selecione um lote e informe uma quantidade válida.");
    }

    const lote = lotesComEstoque.find(
      (l) => String(l.loteId) === String(selectedLoteId),
    );
    if (!lote) return;

    const reservado = carrinhoDispensacao
      .filter((item) => String(item.loteId) === String(lote.loteId))
      .reduce((total, item) => total + item.qtdEntregue, 0);
    if (!Number.isSafeInteger(Number(qtdEntregue)) || Number(qtdEntregue) + reservado > lote.qtdAtual) {
      return alert(
        `Quantidade excede o saldo em estoque deste lote (${lote.qtdAtual - reservado} disp).`,
      );
    }

    setCarrinhoDispensacao((prev) => [
      ...prev,
      {
        loteId: lote.loteId,
        medicamentoNome: lote.medicamentoNome,
        dosagem: lote.dosagem,
        numeroLote: lote.numeroLote,
        qtdEntregue: Number(qtdEntregue),
      },
    ]);

    setSelectedLoteId("");
    setSearchMed("");
    setQtdEntregue("");
  };

  const handleRemoveItem = (index) => {
    setCarrinhoDispensacao((prev) => prev.filter((_, i) => i !== index));
  };

  const gerarTermoDispensacaoImpressao = (dados) => {
    const dataHoraAtual = new Date().toLocaleString("pt-BR");

    const linhasMedicamentos = dados.itens
      .map(
        (item, index) => `
        <tr>
          <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: center;">${index + 1}</td>
          <td style="border: 1px solid #cbd5e1; padding: 8px;"><strong>${item.medicamentoNome}</strong> (${item.dosagem})</td>
          <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: center;">${item.numeroLote}</td>
          <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: center;"><strong>${item.qtdEntregue}</strong></td>
        </tr>
      `,
      )
      .join("");

    const iframeAntigo = document.getElementById("iframe-impressao-termo");
    if (iframeAntigo) {
      iframeAntigo.remove();
    }

    const iframe = document.createElement("iframe");
    iframe.id = "iframe-impressao-termo";
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow.document;

    doc.write(`
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <title>Recibo de Dispensação - ${dados.paciente.patientName}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 30px; color: #0f172a; font-size: 13px; line-height: 1.4; }
          .header { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 15px; margin-bottom: 20px; }
          .header h2 { margin: 0; font-size: 18px; text-transform: uppercase; }
          .header p { margin: 4px 0 0 0; color: #475569; font-size: 12px; }
          .info-block { background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 25px; }
          th { background-color: #f1f5f9; border: 1px solid #cbd5e1; padding: 8px; text-align: left; font-size: 11px; text-transform: uppercase; }
          .obs-box { margin-bottom: 30px; padding: 10px; background-color: #fffbe3; border: 1px solid #fef08a; border-radius: 6px; font-size: 12px; }
          
          .signatures-container { margin-top: 80px; display: flex; justify-content: space-between; gap: 40px; page-break-inside: avoid; }
          .signature-box { flex: 1; text-align: center; }
          .signature-line { border-top: 1px solid #000000; margin-bottom: 6px; width: 100%; }
          .signature-name { font-weight: bold; font-size: 12px; color: #0f172a; margin-bottom: 2px; }
          .signature-title { font-size: 11px; color: #64748b; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h2>Recibo de Entrega de Medicamentos Judiciais</h2>
          <p>Secretaria Municipal de Saúde / Farmácia Judicial | Muriaé - MG</p>
        </div>

        <div class="info-block">
          <div class="info-grid">
            <div><strong>Paciente:</strong> ${dados.paciente.patientName}</div>
            <div><strong>CPF:</strong> ${dados.paciente.cpf}</div>
            <div><strong>Nº da Pasta:</strong> ${dados.paciente.numeroPasta}</div>
            <div><strong>Nº do Processo:</strong> ${dados.paciente.numeroProcesso}</div>
            <div><strong>Data/Hora de Emissão:</strong> ${dataHoraAtual}</div>
            <div><strong>Servidor Responsável:</strong> ${dados.responsavelEntrega}</div>
          </div>
        </div>

        <h3 style="font-size: 13px; text-transform: uppercase; color: #334155; margin-bottom: 8px;">Medicamentos Entregues</h3>
        <table>
          <thead>
            <tr>
              <th style="width: 40px; text-align: center;">Item</th>
              <th>Medicamento e Dosagem</th>
              <th style="width: 120px; text-align: center;">Nº Lote</th>
              <th style="width: 100px; text-align: center;">Qtd Entregue</th>
            </tr>
          </thead>
          <tbody>
            ${linhasMedicamentos}
          </tbody>
        </table>

        ${dados.observacao ? `<div class="obs-box"><strong>Observações:</strong> ${dados.observacao}</div>` : ""}

        <div class="signatures-container">
          <div class="signature-box">
            <div class="signature-line"></div>
            <div class="signature-name">${dados.responsavelEntrega}</div>
            <div class="signature-title">Servidor / Quem Fez a Entrega</div>
          </div>

          <div class="signature-box">
            <div class="signature-line"></div>
            <div class="signature-name">${dados.paciente.patientName}</div>
            <div class="signature-title">Paciente / Representante (Quem Recebeu)</div>
          </div>
        </div>
      </body>
      </html>
    `);

    doc.close();

    setTimeout(() => {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    }, 400);
  };

  const handleOpenModal = (e) => {
    e.preventDefault();
    if (!selectedPaciente) return alert("Selecione o paciente.");
    if (carrinhoDispensacao.length === 0)
      return alert("Adicione pelo menos um medicamento para dispensar.");
    if (!responsavelEntrega.trim())
      return alert("Informe o nome do Responsável pela Entrega.");

    setShowModal(true);
  };

  const handleConfirmarFinal = async () => {
    setIsSubmitting(true);

    const dadosDispensacao = {
      numeroPasta: selectedPaciente.numeroPasta,
      responsavelEntrega,
      observacao,
      itens: carrinhoDispensacao,
      paciente: selectedPaciente,
    };

    try {
      if (onConfirmarDispensacao) {
        const result = await onConfirmarDispensacao(dadosDispensacao);
        if (result?.success === false) {
          throw new Error(result.error || "Falha ao registrar dispensação.");
        }
      }

      setShowModal(false);

      gerarTermoDispensacaoImpressao(dadosDispensacao);

      setSelectedPaciente(null);
      setSearch("");
      setCarrinhoDispensacao([]);
      setResponsavelEntrega("");
      setObservacao("");
    } catch (error) {
      console.error("Erro ao processar dispensação:", error);
      alert(error.message || "Ocorreu um erro ao registrar a dispensação.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.card}>
      <h2 className={styles.cardTitle}>
        Dispensação de Medicamentos Judiciais
      </h2>

      <div className={styles.formContainer}>
        {/* BUSCA DE PACIENTE */}
        <div className={styles.fieldGroup}>
          <label>Buscar Paciente Judicial (Pasta, Nome ou CPF) *</label>
          <div className={styles.searchInputWrapper}>
            <Image
              src="/img/icon/lupa.png"
              alt="Buscar"
              width={18}
              height={18}
              className={styles.searchIcon}
            />
            <input
              type="text"
              className={styles.inputWithIcon}
              placeholder="Digite para buscar paciente..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setSelectedPaciente(null);
              }}
            />
          </div>

          {search && !selectedPaciente && filteredPacientes.length > 0 && (
            <ul className={styles.suggestionsList}>
              {filteredPacientes.map((p) => (
                <li
                  key={p.numeroPasta}
                  onClick={() => handleSelectPaciente(p)}
                  className={styles.suggestionItem}
                >
                  <div>
                    <strong>Pasta #{p.numeroPasta}</strong> - {p.patientName}
                  </div>
                  <small style={{ color: "#64748b" }}>
                    CPF: {p.cpf} | Processo: {p.numeroProcesso}
                  </small>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* CARD RESUMO DO PACIENTE */}
        {selectedPaciente && (
          <div className={styles.patientSummaryBox}>
            <div className={styles.patientBadgeGroup}>
              <span className={styles.badgePasta}>
                Pasta #{selectedPaciente.numeroPasta}
              </span>
              <span className={styles.badgeCpf}>
                CPF: {selectedPaciente.cpf}
              </span>
            </div>
            <div className={styles.patientDetails}>
              <p>
                <strong>Paciente:</strong> {selectedPaciente.patientName}
              </p>
              <p>
                <strong>Nº Processo:</strong> {selectedPaciente.numeroProcesso}
              </p>
              <p>
                <strong>Medicamentos em Tratamento:</strong>{" "}
                {selectedPaciente.medicamentosTratamento ||
                  "Nenhum medicamento pré-cadastrado"}
              </p>
            </div>
          </div>
        )}

        {/* ADICIONAR MEDICAMENTO (BUSCA DIGITÁVEL + MENU SUSPENSO) */}
        <div className={styles.addMedSection}>
          <h4>Adicionar Medicamento para Entrega</h4>

          <div className={styles.addMedGrid}>
            {/* 1. BUSCA DIGITÁVEL POR TEXTO */}
            <div className={styles.fieldGroup}>
              <label>Filtrar / Digitar Medicamento ou Lote</label>
              <div className={styles.searchInputWrapper}>
                <Image
                  src="/img/icon/lupa.png"
                  alt="Buscar"
                  width={18}
                  height={18}
                  className={styles.searchIcon}
                />
                <input
                  type="text"
                  className={styles.inputWithIcon}
                  placeholder="Digite nome, dosagem ou lote..."
                  value={searchMed}
                  onChange={(e) => {
                    setSearchMed(e.target.value);
                    setSelectedLoteId("");
                  }}
                />
              </div>

              {searchMed && !selectedLoteId && filteredLotes.length > 0 && (
                <ul className={styles.suggestionsList}>
                  {filteredLotes.map((lote) => (
                    <li
                      key={lote.loteId}
                      onClick={() => handleSelectLoteDigitavel(lote)}
                      className={styles.suggestionItem}
                    >
                      <div>
                        <strong>{lote.medicamentoNome}</strong> ({lote.dosagem})
                      </div>
                      <small style={{ color: "#64748b" }}>
                        Lote: {lote.numeroLote} | Saldo:{" "}
                        <strong>{lote.qtdAtual}</strong> un | Val:{" "}
                        {lote.dataValidade}
                      </small>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* 2. MENU SUSPENSO (SELECT) */}
            <div className={styles.fieldGroup}>
              <label>Ou Escolha no Menu Suspenso *</label>
              <select
                value={selectedLoteId}
                onChange={handleSelectLoteDropdown}
              >
                <option value="">-- Selecione o Lote do Estoque --</option>
                {lotesComEstoque.map((l) => (
                  <option key={l.loteId} value={l.loteId}>
                    {l.medicamentoNome} ({l.dosagem}) - Lote: {l.numeroLote} |
                    Disp: {l.qtdAtual} | Val: {l.dataValidade}
                  </option>
                ))}
              </select>
            </div>

            {/* 3. QTD ENTREGUE */}
            <div className={styles.fieldGroup}>
              <label>Qtd Entregue *</label>
              <input
                type="number"
                min="1"
                placeholder="Ex: 30"
                value={qtdEntregue}
                onChange={(e) => setQtdEntregue(e.target.value)}
              />
            </div>

            {/* 4. BOTÃO ADICIONAR ITEM */}
            <button
              type="button"
              onClick={handleAddItem}
              className={styles.addBtn}
            >
              + Adicionar Item
            </button>
          </div>
        </div>

        {/* TABELA DE ITENS ADICIONADOS */}
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Medicamento</th>
                <th>Dosagem</th>
                <th>Lote</th>
                <th>Qtd a Entregar</th>
                <th style={{ textAlign: "right" }}>Ação</th>
              </tr>
            </thead>
            <tbody>
              {carrinhoDispensacao.length === 0 ? (
                <tr>
                  <td colSpan="5" className={styles.emptyTableTd}>
                    Nenhum medicamento inserido na lista de entrega.
                  </td>
                </tr>
              ) : (
                carrinhoDispensacao.map((item, idx) => (
                  <tr key={idx}>
                    <td>
                      <strong>{item.medicamentoNome}</strong>
                    </td>
                    <td>{item.dosagem}</td>
                    <td>{item.numeroLote}</td>
                    <td>
                      <strong>{item.qtdEntregue}</strong>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        className={styles.removeBtn}
                      >
                        🗑 Remover
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* GRID INFERIOR (RESPONSÁVEL + OBSERVAÇÃO) */}
        <div className={styles.bottomFieldsGrid}>
          <div className={styles.fieldGroup}>
            <label>Responsável pela Entrega / Servidor *</label>
            <input
              type="text"
              placeholder="Ex: Farmacêutico João Pedro"
              value={responsavelEntrega}
              onChange={(e) => setResponsavelEntrega(e.target.value)}
              required
            />
          </div>

          <div className={styles.fieldGroup}>
            <label>Observação da Dispensação</label>
            <input
              type="text"
              placeholder="Ex: Entrega referente ao mês de Agosto"
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
            />
          </div>
        </div>

        {/* BOTÃO FINALIZAR */}
        <div className={styles.formActions}>
          <button
            type="button"
            onClick={handleOpenModal}
            className={styles.primaryBtn}
          >
            Confirmar e Registrar Dispensação
          </button>
        </div>
      </div>

      {/* POP-UP MODAL DE CONFIRMAÇÃO */}
      {showModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalCard}>
            <h3 className={styles.modalTitle}>⚠️ Confirmar Dispensação</h3>
            <p className={styles.modalSub}>
              Confira os dados antes de prosseguir. Após a confirmação, o
              estoque será atualizado e o recibo de impressão será exibido.
            </p>

            <div className={styles.modalDetails}>
              <p>
                <strong>Paciente:</strong> {selectedPaciente?.patientName}{" "}
                (Pasta #{selectedPaciente?.numeroPasta})
              </p>
              <p>
                <strong>Servidor Responsável:</strong> {responsavelEntrega}
              </p>
              <p>
                <strong>Total de Itens:</strong> {carrinhoDispensacao.length}{" "}
                medicamento(s)
              </p>
            </div>

            <div className={styles.modalActions}>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className={styles.modalCancelBtn}
                disabled={isSubmitting}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmarFinal}
                className={styles.modalConfirmBtn}
                disabled={isSubmitting}
              >
                {isSubmitting
                  ? "Processando..."
                  : "Confirmar e Imprimir Recibo"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
