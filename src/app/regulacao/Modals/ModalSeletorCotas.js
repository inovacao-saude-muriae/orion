"use client";

import { useState } from "react";
import styles from "./ModalSeletorCotas.module.css";

const DEFAULT_MONTHS = [
  { value: "01", name: "Janeiro" },
  { value: "02", name: "Fevereiro" },
  { value: "03", name: "Março" },
  { value: "04", name: "Abril" },
  { value: "05", name: "Maio" },
  { value: "06", name: "Junho" },
  { value: "07", name: "Julho" },
  { value: "08", name: "Agosto" },
  { value: "09", name: "Setembro" },
  { value: "10", name: "Outubro" },
  { value: "11", name: "Novembro" },
  { value: "12", name: "Dezembro" },
];

export default function ModalSeletorCotas({
  open,
  onClose,
  tipoCota,
  anoAtual = "2026",
  setAnoAtual = () => {},
  onSelectMonth = () => {},
  calculateMonthQuotaDetails = () => ({ totalLimit: 0, totalUsed: 0, available: 0 }),
  defaultMonth = "08",
}) {
  const [selectedMonth, setSelectedMonth] = useState(defaultMonth);
  const [pendingMonth, setPendingMonth] = useState(null); // Mês aguardando confirmação no alerta

  // Reset de estado derivado do padrão oficial do React (sem depender de useEffect)
  const [prevDefaultMonth, setPrevDefaultMonth] = useState(defaultMonth);
  const [prevOpen, setPrevOpen] = useState(open);

  if (prevDefaultMonth !== defaultMonth || prevOpen !== open) {
    setPrevDefaultMonth(defaultMonth);
    setPrevOpen(open);
    if (defaultMonth) {
      setSelectedMonth(defaultMonth);
    }
  }

  if (!open) return null;

  const currentDetails = calculateMonthQuotaDetails(tipoCota, anoAtual, selectedMonth);

  // Ao clicar no mês da janela
  const handleMonthClick = (mValue) => {
    const mDetails = calculateMonthQuotaDetails(tipoCota, anoAtual, mValue);

    // Se o mês selecionado estiver zerado ou negativo, abre o modal de confirmação interno
    if (mDetails && mDetails.available <= 0) {
      setPendingMonth({ value: mValue, available: mDetails.available });
      return;
    }

    // Caso possua cota, seleciona e fecha normalmente
    setSelectedMonth(mValue);
    onSelectMonth(mValue);
  };

  // Confirmação do alerta de cota negativa
  const confirmNegativeSelection = () => {
    if (pendingMonth) {
      setSelectedMonth(pendingMonth.value);
      onSelectMonth(pendingMonth.value);
      setPendingMonth(null);
    }
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        {/* CABEÇALHO */}
        <div className={styles.header}>
          <div>
            <h3>Competência da Cota: <span className={styles.cotaTag}>{tipoCota}</span></h3>
            <p className={styles.subTitle}>Selecione o mês para vincular a liberação do exame</p>
          </div>
          <button type="button" className={styles.closeBtn} onClick={onClose}>
            ✕
          </button>
        </div>

        {/* CONTROLE DE ANO E PAINEL DE VALORES DO MÊS ATUAL */}
        <div className={styles.quotaSummaryCard}>
          <div className={styles.yearRow}>
            <label>Ano de Exercício:</label>
            <select value={anoAtual} onChange={(e) => setAnoAtual(e.target.value)}>
              <option value="2026">2026</option>
              <option value="2027">2027</option>
              <option value="2028">2028</option>
            </select>
          </div>

          <div className={styles.valuesGrid}>
            <div className={styles.valBox}>
              <small>Teto Orçado</small>
              <strong>R$ {Number(currentDetails.totalLimit || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</strong>
            </div>
            <div className={styles.valBox}>
              <small>Utilizado</small>

              <strong style={{ color: "#d97706" }}>
                R$ {Number(currentDetails.totalUsed || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </strong>
            </div>
            <div className={styles.valBox}>
              <small>Saldo Disponível</small>
              <strong style={{ color: currentDetails.available <= 0 ? "#dc2626" : "#16a34a" }}>
                R$ {Number(currentDetails.available || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </strong>
            </div>
          </div>
        </div>

        {/* GRID DOS MESES */}
        <div className={styles.monthsGrid}>
          {DEFAULT_MONTHS.map((m) => {
            const isSelected = m.value === selectedMonth;
            const mDetails = calculateMonthQuotaDetails(tipoCota, anoAtual, m.value);
            const isZero = mDetails.available <= 0;

            return (
              <button
                key={m.value}
                type="button"
                className={`${styles.monthBtn} ${isSelected ? styles.selectedMonth : ""} ${
                  isZero ? styles.zeroMonth : ""
                }`}
                onClick={() => handleMonthClick(m.value)}
              >
                <div className={styles.monthHeader}>
                  <strong>{m.name}</strong>
                  {isZero && <span className={styles.alertBadge}>Sem Saldo</span>}
                </div>
                <span className={isZero ? styles.negValue : styles.posValue}>
                  R$ {Number(mDetails.available || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* POPUP / MODAL MODERNO DE ALERTA DE COTA INSUFICIENTE */}
      {pendingMonth && (
        <div className={styles.alertOverlay}>
          <div className={styles.alertCard}>
            <div className={styles.alertIconBg}>⚠️</div>
            <h3>Cota Indisponível</h3>
            <p>
              O mês selecionado <strong>({pendingMonth.value}/{anoAtual})</strong> não possui valor disponível na cota <strong>{tipoCota}</strong>.
            </p>
            <div className={styles.saldoBox}>
              <span>Saldo Atual:</span>
              <strong className={styles.negText}>
                R$ {Number(pendingMonth.available || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </strong>
            </div>
            <p className={styles.questionText}>Deseja continuar mesmo assim? O saldo da cota ficará negativo.</p>

            <div className={styles.alertActions}>
              <button
                type="button"
                className={styles.cancelAlertBtn}
                onClick={() => setPendingMonth(null)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className={styles.confirmAlertBtn}
                onClick={confirmNegativeSelection}
              >
                Continuar e Ficar Negativo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}