"use client";

import { useState } from "react";
import styles from "./RegistrarEntrada.module.css";
import { useConfirm } from "@/components/ConfirmDialog";

export default function TabRegistrarEntrada({ catalogo = [], onCreateLote }) {
  const confirm = useConfirm();
  const [searchMedInput, setSearchMedInput] = useState("");
  const [showMedDropdown, setShowMedDropdown] = useState(false);

  const [formLote, setFormLote] = useState({
    medicamentoId: "",
    numeroLote: "",
    fornecedor: "",
    qtdInicial: "",
    valorUnitario: "",
    dataEntrada: new Date().toISOString().split("T")[0],
    dataValidade: "",
  });

  const catalogoFiltrado = catalogo.filter((med) => {
    const termo = searchMedInput.toLowerCase();
    return (
      med.nome.toLowerCase().includes(termo) ||
      (med.dosagem && med.dosagem.toLowerCase().includes(termo)) ||
      (med.tipo && med.tipo.toLowerCase().includes(termo))
    );
  });

  const handleSelectMedicamento = (med) => {
    setFormLote((prev) => ({ ...prev, medicamentoId: med.id }));
    setSearchMedInput(`${med.nome} (${med.dosagem}) - ${med.tipo}`);
    setShowMedDropdown(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (
      !formLote.medicamentoId ||
      !formLote.numeroLote ||
      !formLote.fornecedor ||
      !formLote.qtdInicial ||
      !formLote.dataValidade
    ) {
      return alert(
        "Selecione o medicamento e preencha os campos obrigatórios.",
      );
    }

    const ok = await confirm({
      title: "Registrar entrada de lote",
      message: "Deseja confirmar a entrada deste lote no estoque?",
      confirmText: "Confirmar",
    });
    if (!ok) return;

    await onCreateLote(formLote);
  };

  return (
    <div className={styles.card}>
      <h3 className={styles.sectionTitle}>Entrada de Novo Lote no Estoque</h3>

      <form onSubmit={handleSubmit} className={styles.formGrid}>
        <div className={styles.fieldGroup} style={{ position: "relative" }}>
          <label>Medicamento do Catálogo *</label>
          <input
            type="text"
            placeholder="Digite para pesquisar medicamento no catálogo..."
            value={searchMedInput}
            onChange={(e) => {
              setSearchMedInput(e.target.value);
              setFormLote((prev) => ({ ...prev, medicamentoId: "" }));
              setShowMedDropdown(true);
            }}
            onFocus={() => setShowMedDropdown(true)}
            required
          />

          {showMedDropdown && catalogoFiltrado.length > 0 && (
            <ul className={styles.suggestionsList}>
              {catalogoFiltrado.map((med) => (
                <li
                  key={med.id}
                  className={styles.suggestionItem}
                  onClick={() => handleSelectMedicamento(med)}
                >
                  <strong>{med.nome}</strong> ({med.dosagem}) - {med.tipo}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className={styles.fieldGroup}>
          <label>Número do Lote *</label>
          <input
            type="text"
            placeholder="Ex: LOTE-2026-X"
            value={formLote.numeroLote}
            onChange={(e) =>
              setFormLote({ ...formLote, numeroLote: e.target.value })
            }
            required
          />
        </div>

        <div className={styles.fieldGroup}>
          <label>Fornecedor / Fabricante *</label>
          <input
            type="text"
            placeholder="Ex: Eurofarma Laboratórios"
            value={formLote.fornecedor}
            onChange={(e) =>
              setFormLote({ ...formLote, fornecedor: e.target.value })
            }
            required
          />
        </div>

        <div className={styles.fieldGroup}>
          <label>Quantidade Inicial Adquirida *</label>
          <input
            type="number"
            min="1"
            placeholder="Ex: 500"
            value={formLote.qtdInicial}
            onChange={(e) =>
              setFormLote({ ...formLote, qtdInicial: e.target.value })
            }
            required
          />
        </div>

        <div className={styles.fieldGroup}>
          <label>Valor Unitário (R$)</label>
          <input
            type="number"
            step="0.01"
            placeholder="Ex: 12.50"
            value={formLote.valorUnitario}
            onChange={(e) =>
              setFormLote({ ...formLote, valorUnitario: e.target.value })
            }
          />
        </div>

        <div className={styles.fieldGroup}>
          <label>Data de Entrada *</label>
          <input
            type="date"
            value={formLote.dataEntrada}
            onChange={(e) =>
              setFormLote({ ...formLote, dataEntrada: e.target.value })
            }
            required
          />
        </div>

        <div className={styles.fieldGroup}>
          <label>Data de Validade *</label>
          <input
            type="date"
            value={formLote.dataValidade}
            onChange={(e) =>
              setFormLote({ ...formLote, dataValidade: e.target.value })
            }
            required
          />
        </div>

        <div className={`${styles.fullWidth} ${styles.formActions}`}>
          <button type="submit" className={styles.primaryBtn}>
            Confirmar Entrada do Lote
          </button>
        </div>
      </form>
    </div>
  );
}
