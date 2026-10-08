"use client";

import { useState } from "react";
import styles from "./ModalTetoFinanceiro.module.css";

// Formata a parte inteira com separador de milhar (pt-BR).
const agruparMilhar = (inteiro) => {
  const limpo = String(inteiro).replace(/\D/g, "").replace(/^0+(?=\d)/, "");
  if (!limpo) return "";
  return limpo.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

// Formata o que o usuário digita, prefixando "R$ ".
const formatDisplay = (raw) => {
  let v = String(raw).replace(/[^\d.,]/g, "");
  const idxVirgula = v.indexOf(",");
  const temVirgula = idxVirgula !== -1;

  const parteInteiraRaw = (temVirgula ? v.slice(0, idxVirgula) : v).replace(/\D/g, "");
  const inteiro = agruparMilhar(parteInteiraRaw);

  if (!temVirgula) {
    return inteiro ? `R$ ${inteiro}` : "";
  }

  const decimais = v.slice(idxVirgula + 1).replace(/\D/g, "").slice(0, 2);
  const base = inteiro || "0";
  return `R$ ${base},${decimais}`;
};

// Converte o texto exibido (ex.: "R$ 1.250,50") em número.
const parseToNumber = (value) => {
  if (value === undefined || value === null || value === "") return 0;
  const normalized = String(value)
    .replace(/[R$\s]/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  const n = parseFloat(normalized);
  return Number.isFinite(n) ? n : 0;
};

// Formata um número para moeda BRL de exibição (ex.: 1000.2 -> "R$ 1.000,20").
const numberToBRL = (n) => {
  const num = Number(n) || 0;
  return num.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
};

export default function ModalTetoFinanceiro({
  editCotaModal,
  setEditCotaModal,
  handleSaveTetoCota,
  finMonth,
  finYear,
}) {
  const [inputValue, setInputValue] = useState("");
  // Teto que já está salvo para esta cota/competência.
  const [tetoAtual, setTetoAtual] = useState(0);
  // Modo: "somar" (acrescenta ao teto atual) ou "substituir" (define o valor exato).
  const [modo, setModo] = useState("somar");

  // Reset de estado derivado do padrão oficial do React (sem depender de useEffect)
  const modalAberto = editCotaModal?.open;
  const modalTipoCota = editCotaModal?.tipoCota;
  const modalValor = editCotaModal?.valor;

  const [prevAberto, setPrevAberto] = useState(false);
  const [prevTipoCota, setPrevTipoCota] = useState(null);

  if (prevAberto !== modalAberto || prevTipoCota !== modalTipoCota) {
    setPrevAberto(modalAberto);
    setPrevTipoCota(modalTipoCota);

    if (modalAberto) {
      setTetoAtual(Number(modalValor) || 0);
      setInputValue("");
      setModo("somar");
    }
  }

  if (!editCotaModal) return null;

  const valorDigitado = parseToNumber(inputValue);
  const novoTotal = modo === "somar" ? tetoAtual + valorDigitado : valorDigitado;

  const aplicarNoModal = (formatted, modoAtual) => {
    const v = parseToNumber(formatted);
    setEditCotaModal({
      ...editCotaModal,
      valor: modoAtual === "somar" ? tetoAtual + v : v,
    });
  };

  const handleChange = (e) => {
    const formatted = formatDisplay(e.target.value);
    setInputValue(formatted);
    aplicarNoModal(formatted, modo);
  };

  const trocarModo = (novoModo) => {
    setModo(novoModo);
    if (novoModo === "substituir") {
      setInputValue(tetoAtual ? formatDisplay(String(tetoAtual).replace(".", ",")) : "");
      setEditCotaModal({ ...editCotaModal, valor: tetoAtual });
    } else {
      setInputValue("");
      setEditCotaModal({ ...editCotaModal, valor: tetoAtual });
    }
  };

  return (
    <div className={styles.overlay} onClick={() => setEditCotaModal(null)}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* CABEÇALHO */}
        <div className={styles.header}>
          <div className={styles.headerIcon}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="1" x2="12" y2="23" />
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          </div>
          <div className={styles.headerTexts}>
            <h3>Definir Teto Financeiro</h3>
            <span>
              Cota <strong>{editCotaModal.tipoCota}</strong> · Competência {finMonth}/{finYear}
            </span>
          </div>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={() => setEditCotaModal(null)}
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>

        <div className={styles.body}>
          {/* TETO ATUAL EM DESTAQUE */}
          <div className={styles.tetoAtualCard}>
            <span className={styles.tetoAtualLabel}>Teto atual</span>
            <strong className={styles.tetoAtualValor}>{numberToBRL(tetoAtual)}</strong>
          </div>

          {/* MODO: SOMAR OU SUBSTITUIR */}
          <div className={styles.modoTabs}>
            <button
              type="button"
              className={`${styles.modoTab} ${modo === "somar" ? styles.modoTabAtivo : ""}`}
              onClick={() => trocarModo("somar")}
            >
              + Acrescentar
            </button>
            <button
              type="button"
              className={`${styles.modoTab} ${modo === "substituir" ? styles.modoTabAtivo : ""}`}
              onClick={() => trocarModo("substituir")}
            >
              Substituir (corrigir)
            </button>
          </div>

          <div className={styles.fieldGroup}>
            <label>{modo === "somar" ? "Valor a acrescentar" : "Novo valor do teto"}</label>
            <input
              type="text"
              inputMode="decimal"
              value={inputValue}
              onChange={handleChange}
              placeholder="R$ 0,00"
              className={styles.currencyInput}
              autoFocus
            />
            <small className={styles.hint}>
              {modo === "somar"
                ? "O valor informado será somado ao teto atual."
                : "O valor informado substitui o teto atual."}
            </small>
          </div>

          {/* RESULTADO */}
          <div className={styles.resumoTotal}>
            <span>{modo === "somar" ? "Novo teto total" : "Teto será definido como"}</span>
            <strong>{numberToBRL(novoTotal)}</strong>
          </div>
        </div>

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.cancelBtn}
            onClick={() => setEditCotaModal(null)}
          >
            Cancelar
          </button>
          <button
            type="button"
            className={styles.saveBtn}
            onClick={handleSaveTetoCota}
          >
            Salvar Teto
          </button>
        </div>
      </div>
    </div>
  );
}