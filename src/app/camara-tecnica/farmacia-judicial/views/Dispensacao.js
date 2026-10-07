"use client";

import { useState, useRef, useEffect } from "react";
import styles from "./Dispensacao.module.css";
import { documentoPaciente } from "@/app/regulacao/constants";
import ComprovanteDispensacao from "./ComprovanteDispensacao";

export default function TabDispensacao({
  pacientes = [],
  estoqueLotes = [],
  onConfirmarDispensacao,
  onGetMedicamentosPaciente = async () => ({ medicamentos: [], lotes: [] }),
}) {
  const [search, setSearch] = useState("");
  const [selectedPaciente, setSelectedPaciente] = useState(null);
  const [responsavelEntrega, setResponsavelEntrega] = useState("");
  const [observacao, setObservacao] = useState("");

  const [showPatientDropdown, setShowPatientDropdown] = useState(false);
  const patientDropdownRef = useRef(null);

  const [medicamentosPaciente, setMedicamentosPaciente] = useState([]);
  const [carregandoMeds, setCarregandoMeds] = useState(false);

  const [carrinhoDispensacao, setCarrinhoDispensacao] = useState([]);

  // Seleção de medicamento
  const [selectedMedId, setSelectedMedId] = useState("");
  const [qtdEntregue, setQtdEntregue] = useState("");

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Data congelada para o recibo de impressão
  const [dataEntregaFormatada, setDataEntregaFormatada] = useState("");

  useEffect(() => {
    function handleClickOutside(e) {
      if (
        patientDropdownRef.current &&
        !patientDropdownRef.current.contains(e.target)
      ) {
        setShowPatientDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    let ativo = true;
    (async () => {
      try {
        const res = await fetch("/api/me");
        if (!res.ok) return;
        const data = await res.json();
        if (ativo) setResponsavelEntrega(data?.user?.nomeCompleto || "");
      } catch {
        /* silencioso */
      }
    })();
    return () => {
      ativo = false;
    };
  }, []);

  const normalizeSearchValue = (value) =>
    String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();

  const normalizedPatientSearch = normalizeSearchValue(search);
  const normalizedPatientCpfSearch = search.replace(/\D/g, "");

  const filteredPacientes = pacientes.filter((p) => {
    const matchesText = [p.patientName, p.numeroPasta, p.numeroProcesso].some(
      (value) => normalizeSearchValue(value).includes(normalizedPatientSearch)
    );
    const matchesCpf =
      normalizedPatientCpfSearch.length > 0 &&
      String(p.cpf || "")
        .replace(/\D/g, "")
        .includes(normalizedPatientCpfSearch);

    return matchesText || matchesCpf;
  });

  const medSelecionado = medicamentosPaciente.find(
    (m) => String(m.medicamentoId) === String(selectedMedId)
  );

  const removeDuplicadosPorCpf = (lista) => {
    const vistos = new Set();
    return lista.filter((p) => {
      const cpf = (p.cpf || "").replace(/\D/g, "");
      if (!cpf) return true;
      if (vistos.has(cpf)) return false;
      vistos.add(cpf);
      return true;
    });
  };

  const handleSelectPaciente = async (p) => {
    setSelectedPaciente(p);
    setSearch(`${p.patientName} (${documentoPaciente({ cpf: p.cpf, cns: p.cns })})`);
    setShowPatientDropdown(false);
    setCarrinhoDispensacao([]);
    setSelectedMedId("");

    setCarregandoMeds(true);
    const res = await onGetMedicamentosPaciente(p.numeroPasta);
    setMedicamentosPaciente(res?.medicamentos || []);
    setCarregandoMeds(false);
  };

  const limparPaciente = () => {
    setSelectedPaciente(null);
    setSearch("");
    setMedicamentosPaciente([]);
    setCarrinhoDispensacao([]);
    setShowPatientDropdown(false);
    setSelectedMedId("");
  };

  const handleAddItem = (e) => {
    e.preventDefault();
    const qtd = Number(qtdEntregue);
    if (!selectedMedId || !qtd || qtd <= 0 || !Number.isSafeInteger(qtd)) {
      return alert("Selecione o medicamento e informe uma quantidade válida.");
    }

    const med = medicamentosPaciente.find(
      (m) => String(m.medicamentoId) === String(selectedMedId)
    );
    if (!med) return;

    const reservado = carrinhoDispensacao
      .filter((item) => String(item.medicamentoId) === String(med.medicamentoId))
      .reduce((total, item) => total + item.qtdEntregue, 0);

    const disponivel = Number(med.saldoTotal || 0) - reservado;
    if (qtd > disponivel) {
      return alert(
        `Quantidade excede o saldo em estoque deste medicamento (disponível: ${disponivel}).`
      );
    }

    setCarrinhoDispensacao((prev) => [
      ...prev,
      {
        medicamentoId: med.medicamentoId,
        medicamentoNome: med.medicamentoNome,
        dosagem: med.dosagem,
        qtdEntregue: qtd,
      },
    ]);

    setSelectedMedId("");
    setQtdEntregue("");
  };

  const handleRemoveItem = (index) => {
    setCarrinhoDispensacao((prev) => prev.filter((_, i) => i !== index));
  };

  const handleOpenModal = (e) => {
    e.preventDefault();
    if (!selectedPaciente) return alert("Selecione o paciente.");
    if (carrinhoDispensacao.length === 0)
      return alert("Adicione pelo menos um medicamento para dispensar.");

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
        if (result?.responsavelEntrega) {
          setResponsavelEntrega(result.responsavelEntrega);
        }
      }

      setDataEntregaFormatada(new Date().toLocaleDateString("pt-BR"));
      setShowModal(false);

      setTimeout(() => {
        window.print();
        
        setSelectedPaciente(null);
        setSearch("");
        setCarrinhoDispensacao([]);
        setObservacao("");
      }, 300);
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
          <label>Buscar Paciente Judicial (Nome ou CPF) *</label>
          <div className={styles.searchRowInline}>
            <div className={styles.searchSelectWrapper} ref={patientDropdownRef}>
              <input
                type="text"
                className={styles.selectLikeInput}
                placeholder="Selecionar ou digitar nome/CPF..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setShowPatientDropdown(true);
                }}
                onFocus={() => setShowPatientDropdown(true)}
              />
              <span
                className={styles.arrowIcon}
                onClick={() => setShowPatientDropdown(!showPatientDropdown)}
              >
                {showPatientDropdown ? "▲" : "▼"}
              </span>

              {showPatientDropdown && (
                <div className={styles.tableDropdownMenu}>
                  <div className={styles.tableContainerScroll}>
                    <table className={styles.patientTableDropdown}>
                      <thead>
                        <tr>
                          <th>CPF / CNS</th>
                          <th>Usuário</th>
                          <th>Nome da mãe</th>
                          <th>Data nasc.</th>
                        </tr>
                      </thead>
                      <tbody>
                        {removeDuplicadosPorCpf(filteredPacientes).length > 0 ? (
                          removeDuplicadosPorCpf(filteredPacientes).map((p) => (
                            <tr
                              key={p.numeroPasta}
                              onMouseDown={(e) => {
                                e.preventDefault();
                                handleSelectPaciente(p);
                              }}
                              className={
                                selectedPaciente?.numeroPasta === p.numeroPasta
                                  ? styles.selectedRow
                                  : ""
                              }
                            >
                              <td>{documentoPaciente({ cpf: p.cpf, cns: p.cns })}</td>
                              <td className={styles.boldName}>{p.patientName}</td>
                              <td>{p.motherName || "Não informada"}</td>
                              <td>
                                {p.dataNascimento
                                  ? p.dataNascimento.split("-").reverse().join("/")
                                  : "-"}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="4" className={styles.noDataTd}>
                              Nenhum paciente judicial encontrado.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {selectedPaciente && (
              <button
                type="button"
                className={styles.clearBtn}
                onClick={limparPaciente}
              >
                Limpar
              </button>
            )}
          </div>
        </div>

        {/* RESUMO DO PACIENTE */}
        {selectedPaciente && (
          <div className={styles.patientSummaryBox}>
            <div className={styles.patientBadgeGroup}>
              <span className={styles.badgePasta}>
                Pasta #{selectedPaciente.numeroPasta}
              </span>
              <span className={styles.badgeCpf}>
                {documentoPaciente({ cpf: selectedPaciente.cpf, cns: selectedPaciente.cns })}
              </span>
            </div>
            <div className={styles.patientDetails}>
              <p>
                <strong>Paciente:</strong> {selectedPaciente.patientName}
              </p>
              <p>
                <strong>Nº Processo:</strong> {selectedPaciente.numeroProcesso}
              </p>
            </div>
          </div>
        )}

        {/* SEÇÃO ADICIONAR MEDICAMENTO */}
        <div className={styles.addMedSection}>
          <h4>Adicionar Medicamento para Entrega</h4>

          <div className={styles.addMedGrid}>
            <div className={styles.fieldGroup}>
              <label>Medicamento *</label>
              <select
                value={selectedMedId}
                onChange={(e) => setSelectedMedId(e.target.value)}
                disabled={!selectedPaciente || medicamentosPaciente.length === 0}
              >
                <option value="">
                  {!selectedPaciente
                    ? "Selecione o paciente primeiro"
                    : medicamentosPaciente.length === 0
                    ? "Nenhum medicamento vinculado"
                    : "-- Selecione o medicamento --"}
                </option>
                {medicamentosPaciente.map((m) => (
                  <option key={m.medicamentoId} value={m.medicamentoId}>
                    {m.medicamentoNome}{m.dosagem ? ` (${m.dosagem})` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.fieldGroup}>
              <label>
                Qtd Entregue *
                {medSelecionado && (
                  <span className={styles.saldoHint}>
                    {" "}(disponível: {medSelecionado.saldoTotal})
                  </span>
                )}
              </label>
              <input
                type="number"
                min="1"
                placeholder="Ex: 30"
                value={qtdEntregue}
                onChange={(e) => setQtdEntregue(e.target.value)}
                disabled={!selectedMedId}
              />
            </div>

            <button
              type="button"
              onClick={handleAddItem}
              className={styles.addBtn}
            >
              Adicionar Medicamento
            </button>
          </div>
        </div>

        {/* TABELA DE ITENS */}
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Medicamento</th>
                <th>Concentração</th>
                <th>Qtd a Entregar</th>
                <th style={{ textAlign: "right" }}>Ação</th>
              </tr>
            </thead>
            <tbody>
              {carrinhoDispensacao.length === 0 ? (
                <tr>
                  <td colSpan="4" className={styles.emptyTableTd}>
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

        {/* CAMPOS INFERIORES */}
        <div className={styles.bottomFieldsGrid}>
          <div className={styles.fieldGroup}>
            <label>Responsável pela Entrega / Servidor</label>
            <input
              type="text"
              value={responsavelEntrega}
              placeholder="Usuário logado"
              readOnly
              disabled
            />
          </div>

          <div className={styles.fieldGroup}>
            <label>Observação da Dispensação</label>
            <input
              type="text"
              placeholder="Ex: Entrega referente ao mês atual"
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

      {/* MODAL DE CONFIRMAÇÃO */}
      {showModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalCard}>
            <h3 className={styles.modalTitle}>⚠️ Confirmar Dispensação</h3>
            <p className={styles.modalSub}>
              Confira os dados antes de prosseguir. Após a confirmação, o
              estoque será atualizado e o comprovante para impressão será gerado.
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
                {isSubmitting ? "Processando..." : "Confirmar e Imprimir Recibo"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* COMPROVANTE EXTRAÍDO (SÓ VISÍVEL NA IMPRESSÃO) */}
      <ComprovanteDispensacao
        paciente={selectedPaciente}
        itens={carrinhoDispensacao}
        responsavelEntrega={responsavelEntrega}
        observacao={observacao}
        dataEntrega={dataEntregaFormatada}
      />
    </div>
  );
}