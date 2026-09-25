"use client";

import { useEffect, useState } from "react";
import styles from "./ModalTetoFinanceiro.module.css";

// Formata a parte inteira com separador de milhar (pt-BR).
const agruparMilhar = (inteiro) => {
  const limpo = String(inteiro).replace(/\D/g, "").replace(/^0+(?=\d)/, "");
  if (!limpo) return "";
  return limpo.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

// Formata o que o usuário digita, prefixando "R$ ".
// - Parte inteira: separador de milhar automático (1000 -> 1.000).
// - Decimais (centavos): só aparecem depois que o usuário digita a vírgula,
//   limitados a 2 casas. Não há auto-preenchimento de centavos ao digitar a
//   parte inteira.
const formatDisplay = (raw) => {
  // Remove tudo que não seja dígito, ponto ou vírgula (ex.: "R$", espaços).
  let v = String(raw).replace(/[^\d.,]/g, "");
  // A vírgula é o separador decimal do usuário; os pontos são de milhar já
  // formatados e devem ser descartados. Consideramos como decimal o que vier
  // após a PRIMEIRA vírgula digitada.
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

  // Carrega os dados iniciais apenas quando o modal abre ou troca de cota.
  const modalAberto = editCotaModal?.open;
  const modalTipoCota = editCotaModal?.tipoCota;
  useEffect(() => {
    if (modalAberto) {
      setTetoAtual(Number(editCotaModal?.valor) || 0);
      setInputValue("");
      setModo("somar");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modalAberto, modalTipoCota]);

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
    // Ao ir para "substituir", pré-preenche com o teto atual para facilitar a correção.
    if (novoModo === "substituir") {
      setInputValue(tetoAtual ? formatDisplay(String(tetoAtual).replace(".", ",")) : "");
      setEditCotaModal({ ...editCotaModal, valor: tetoAtual });
    } else {
      setInputValue("");
      setEditCotaModal({ ...editCotaModal, valor: tetoAtual });
    }
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h3>Definir Teto Financeiro ({editCotaModal.tipoCota})</h3>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={() => setEditCotaModal(null)}
          >
            ✕
          </button>
        </div>

        <div className={styles.body}>
          <p className={styles.competenceInfo}>
            Competência: <strong>{finMonth}/{finYear}</strong>
          </p>

          <div className={styles.resumoTeto}>
            <div className={styles.resumoLinha}>
              <span>Teto atual</span>
              <strong>{numberToBRL(tetoAtual)}</strong>
            </div>
          </div>

          {/* Escolha do modo: somar ou substituir */}
          <div className={styles.modoTabs}>
            <button
              type="button"
              className={`${styles.modoTab} ${modo === "somar" ? styles.modoTabAtivo : ""}`}
              onClick={() => trocarModo("somar")}
            >
              Acrescentar
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
            <label>{modo === "somar" ? "Acrescentar valor (R$)" : "Novo valor do teto (R$)"}</label>
            <input
              type="text"
              inputMode="decimal"
              value={inputValue}
              onChange={handleChange}
              placeholder="R$ 0,00"
              className={styles.currencyInput}
            />
            <small className={styles.hint}>
              {modo === "somar"
                ? "Informe o valor a somar ao teto atual. O total abaixo será salvo."
                : "Informe o valor exato do teto. Ele substitui o valor atual."}
            </small>
          </div>

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
