"use client";

import { useState } from "react";
import styles from "./CadastrarMedicamentos.module.css";
import { useConfirm } from "@/components/ConfirmDialog";

export default function TabCadastrarMedicamento({ onCreateMedicamento }) {
  const confirm = useConfirm();
  const [darEntradaEstoque, setDarEntradaEstoque] = useState(false);

  const [formMed, setFormMed] = useState({
    nome: "",
    tipo: "Comprimido",
    dosagem: "",
    numeroLote: "",
    fornecedor: "",
    qtdInicial: "",
    valorUnitario: "",
    dataEntrada: new Date().toISOString().split("T")[0],
    dataValidade: "",
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formMed.nome || !formMed.dosagem) {
      return alert("Preencha o nome e a dosagem do medicamento.");
    }

    if (darEntradaEstoque) {
      if (
        !formMed.numeroLote ||
        !formMed.fornecedor ||
        !formMed.qtdInicial ||
        !formMed.dataValidade
      ) {
        return alert("Preencha todos os campos do lote para dar entrada.");
      }
    }

    const ok = await confirm({
      title: "Cadastrar medicamento",
      message: darEntradaEstoque
        ? "Deseja salvar o medicamento no catálogo e dar entrada no estoque?"
        : "Deseja salvar o medicamento no catálogo?",
      confirmText: "Salvar",
    });
    if (!ok) return;

    await onCreateMedicamento({
      ...formMed,
      darEntradaEstoque,
    });
  };

  return (
    <div className={styles.card}>
      <h3 className={styles.sectionTitle}>
        Cadastrar Novo Medicamento no Catálogo
      </h3>

      <form onSubmit={handleSubmit} className={styles.formGrid}>
        <div className={styles.fieldGroup}>
          <label>Nome do Medicamento *</label>
          <input
            type="text"
            placeholder="Ex: Insulina Glargina"
            value={formMed.nome}
            onChange={(e) => setFormMed({ ...formMed, nome: e.target.value })}
            required
          />
        </div>

        <div className={styles.fieldGroup}>
          <label>Tipo / Forma Farmacêutica *</label>
          <select
            value={formMed.tipo}
            onChange={(e) => setFormMed({ ...formMed, tipo: e.target.value })}
          >
            <option value="Comprimido">Comprimido / Drágea</option>
            <option value="Injetável / Caneta">Injetável / Caneta</option>
            <option value="Xarope / Solução">Xarope / Solução Oral</option>
            <option value="Pomada / Creme">Pomada / Creme</option>
            <option value="Frasco / Gotas">Frasco / Gotas</option>
          </select>
        </div>

        <div className={styles.fieldGroup}>
          <label>Dosagem / Concentração *</label>
          <input
            type="text"
            placeholder="Ex: 100 UI/ml ou 500mg"
            value={formMed.dosagem}
            onChange={(e) =>
              setFormMed({ ...formMed, dosagem: e.target.value })
            }
            required
          />
        </div>

        <div
          className={`${styles.fullWidth}`}
          style={{ marginTop: "0.5rem", marginBottom: "0.5rem" }}
        >
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              cursor: "pointer",
              fontWeight: 600,
              color: "#1e293b",
            }}
          >
            <input
              type="checkbox"
              checked={darEntradaEstoque}
              onChange={(e) => setDarEntradaEstoque(e.target.checked)}
              style={{ width: "18px", height: "18px", cursor: "pointer" }}
            />
            Deseja dar entrada no estoque (lote) deste medicamento agora?
          </label>
        </div>

        {darEntradaEstoque && (
          <>
            <div className={styles.fieldGroup}>
              <label>Número do Lote *</label>
              <input
                type="text"
                placeholder="Ex: LOTE-2026-X"
                value={formMed.numeroLote}
                onChange={(e) =>
                  setFormMed({ ...formMed, numeroLote: e.target.value })
                }
                required={darEntradaEstoque}
              />
            </div>

            <div className={styles.fieldGroup}>
              <label>Fornecedor / Fabricante *</label>
              <input
                type="text"
                placeholder="Ex: Eurofarma Laboratórios"
                value={formMed.fornecedor}
                onChange={(e) =>
                  setFormMed({ ...formMed, fornecedor: e.target.value })
                }
                required={darEntradaEstoque}
              />
            </div>

            <div className={styles.fieldGroup}>
              <label>Quantidade Inicial Adquirida *</label>
              <input
                type="number"
                min="1"
                placeholder="Ex: 500"
                value={formMed.qtdInicial}
                onChange={(e) =>
                  setFormMed({ ...formMed, qtdInicial: e.target.value })
                }
                required={darEntradaEstoque}
              />
            </div>

            <div className={styles.fieldGroup}>
              <label>Valor Unitário (R$)</label>
              <input
                type="number"
                step="0.01"
                placeholder="Ex: 12.50"
                value={formMed.valorUnitario}
                onChange={(e) =>
                  setFormMed({ ...formMed, valorUnitario: e.target.value })
                }
              />
            </div>

            <div className={styles.fieldGroup}>
              <label>Data de Entrada *</label>
              <input
                type="date"
                value={formMed.dataEntrada}
                onChange={(e) =>
                  setFormMed({ ...formMed, dataEntrada: e.target.value })
                }
                required={darEntradaEstoque}
              />
            </div>

            <div className={styles.fieldGroup}>
              <label>Data de Validade *</label>
              <input
                type="date"
                value={formMed.dataValidade}
                onChange={(e) =>
                  setFormMed({ ...formMed, dataValidade: e.target.value })
                }
                required={darEntradaEstoque}
              />
            </div>
          </>
        )}

        <div className={`${styles.fullWidth} ${styles.formActions}`}>
          <button type="submit" className={styles.primaryBtn}>
            {darEntradaEstoque
              ? "Salvar no Catálogo e Dar Entrada no Estoque"
              : "Salvar no Catálogo"}
          </button>
        </div>
      </form>
    </div>
  );
}
