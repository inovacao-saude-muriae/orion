"use client";

import { useState } from "react";
import Image from "next/image";
import styles from "./Liberados.module.css";

// Lista padrão caso os dados auxiliares do banco estejam vazios/carregando
const DEFAULT_TIPOS_EXAME = [
  { id: "1", nome: "Ressonância Magnética" },
  { id: "2", nome: "Tomografia Computadorizada" },
  { id: "3", nome: "Cintilografia" },
];

export default function Liberados({
  auxData,
  requests,
  selectedReleasedExam,
  setSelectedReleasedExam,
  applyFilters,
  handleUpdateBillingDate,
  handleEditOrder,
  handleExportToExcelReleased,
  loading,
}) {
  const [selectedIds, setSelectedIds] = useState([]);

  // Garante que a lista de tipos de exames nunca fique undefined
  const tiposExameLista =
    auxData?.tiposExame && auxData.tiposExame.length > 0
      ? auxData.tiposExame
      : DEFAULT_TIPOS_EXAME;

  // 1. Localiza o objeto exato do exame selecionado nas auxiliares
  const selectedTypeObj = tiposExameLista.find(
    (t) =>
      t.nome?.toLowerCase().trim() === selectedReleasedExam?.toLowerCase().trim() ||
      String(t.id) === String(selectedReleasedExam)
  );

  // 2. Filtra estritamente por Status "Liberado" E pelo Tipo de Exame ativo
  const baseReleased = (requests || []).filter((item) => {
    if (item.status !== "Liberado") return false;
    if (!selectedReleasedExam) return true;

    if (selectedTypeObj && item.examTypeId) {
      return String(item.examTypeId) === String(selectedTypeObj.id);
    }

    if (item.examType && selectedTypeObj) {
      return item.examType.toLowerCase().trim() === selectedTypeObj.nome.toLowerCase().trim();
    }

    return true;
  });

  // 3. Aplica os filtros avançados
  const releasedList =
    typeof applyFilters === "function"
      ? applyFilters(baseReleased).filter((item) => {
          if (!selectedTypeObj) return true;
          if (item.examTypeId) {
            return String(item.examTypeId) === String(selectedTypeObj.id);
          }
          return (
            String(item.examType || "").toLowerCase().trim() ===
            selectedTypeObj.nome.toLowerCase().trim()
          );
        })
      : baseReleased;

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(releasedList.map((item) => item.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((item) => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const getRiskClass = (classification) => {
    switch (classification) {
      case "Vermelho":
        return styles.riskRed;
      case "Amarelo":
        return styles.riskYellow;
      default:
        return styles.riskGreen;
    }
  };

  return (
    <div className={styles.container}>
      {/* CABEÇALHO E AÇÃO DE EXPORTAR */}
      <div className={styles.tableHeaderBar}>
        <div className={styles.infoGroup}>
          <h3>
            Pacientes Liberados: <span>{selectedReleasedExam || "Todos"}</span>
          </h3>
          <p>
            Total de registros: <strong>{releasedList.length}</strong>
          </p>
        </div>

        <button
          type="button"
          className={styles.exportBtn}
          onClick={() => handleExportToExcelReleased(selectedIds)}
          disabled={selectedIds.length === 0}
        >
          📊 Exportar Selecionados ({selectedIds.length}) para Excel
        </button>
      </div>

      {/* TABELA DE DADOS */}
      {loading ? (
        <div className={styles.loadingState}>Carregando pacientes liberados...</div>
      ) : releasedList.length === 0 ? (
        <div className={styles.emptyState}>
          Nenhum paciente liberado encontrado para <strong>{selectedReleasedExam}</strong>.
        </div>
      ) : (
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th style={{ width: "40px", textAlign: "center" }}>
                  <input
                    type="checkbox"
                    onChange={handleSelectAll}
                    checked={
                      releasedList.length > 0 &&
                      selectedIds.length === releasedList.length
                    }
                  />
                </th>
                <th>Cód. Reg.</th>
                <th>Paciente</th>
                <th>Procedimento</th>
                <th>Data Liberação</th>
                <th>Cota</th>
                <th>Competência</th>
                <th>Data Faturado</th>
                <th style={{ textAlign: "center" }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {releasedList.map((item) => {
                const isSelected = selectedIds.includes(item.id);
                const competence =
                  item.quotaCompetenceMonth && item.quotaCompetenceYear
                    ? `${item.quotaCompetenceMonth}/${item.quotaCompetenceYear}`
                    : "—";

                return (
                  <tr
                    key={item.id}
                    className={isSelected ? styles.selectedRow : ""}
                  >
                    <td style={{ textAlign: "center" }}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleSelectOne(item.id)}
                      />
                    </td>
                    <td>
                      <strong>{item.id}</strong>
                    </td>
                    <td>
                      <div className={styles.patientHeader}>
                        <span className={styles.patientName}>{item.patientName}</span>
                        <span
                          className={`${styles.riskTag} ${getRiskClass(
                            item.classification
                          )}`}
                        >
                          {item.classification || "Verde"}
                        </span>
                      </div>
                      <small className={styles.subText}>
                        Mãe: {item.motherName || "Não informada"}
                      </small>
                      
                      {(item.generalObservation || item.justification) && (
                        <div style={{ marginTop: "4px", fontSize: "0.8rem", color: "#475569" }}>
                          <strong>Obs. Geral:</strong> {item.generalObservation || item.justification}
                        </div>
                      )}
                    </td>
                    <td>{item.procedure}</td>
                    <td>{item.releaseDate || "—"}</td>
                    <td>
                      <span className={styles.quotaBadge}>
                        {item.quota || "N/A"}
                      </span>
                    </td>
                    <td>{competence}</td>
                    <td>
                      {String(item.quota || "").trim().toUpperCase() === "CREDENCIAMENTO" ? (
                        <input
                          type="date"
                          className={styles.dateInput}
                          value={item.billingDate || ""}
                          onChange={(e) =>
                            handleUpdateBillingDate(item.id, e.target.value)
                          }
                        />
                      ) : (
                        <span className={styles.mutedDash}>—</span>
                      )}
                    </td>
                    <td className={styles.actionsCell}>
                      <button
                        type="button"
                        className={styles.iconBtn}
                        onClick={() => handleEditOrder(item, "LIBERADOS")}
                        title="Editar Pedido"
                      >
                        <Image
                          src="/img/icon/editar.png"
                          alt="Editar"
                          width={16}
                          height={16}
                          style={{ objectFit: "contain" }}
                        />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}