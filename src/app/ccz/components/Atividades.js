"use client";

import { useState } from "react";
import s from "./shared.module.css";
import ModalConfirmacaoCCZ from "./Modals/ModalConfirmacaoCCZ";
import ModalMensagemCCZ from "./Modals/ModalMensagemCCZ";
import BotaoEditar from "@/components/BotaoEditar";
import { createAtividade, updateAtividade, deleteAtividade } from "../actions";

const TIPOS = [
  "Nebulização",
  "Visita Domiciliar",
  "Levantamento de Índice",
  "Armadilha",
  "Captura de Animal",
  "Educação em Saúde",
  "Outros",
];
const STATUS_LIST = ["Concluída", "Em Andamento", "Pendente"];

const EMPTY_FORM = {
  tipo: "",
  bairro: "",
  logradouro: "",
  responsavel: "",
  dataAtividade: new Date().toISOString().split("T")[0],
  quantidadeImoveis: "",
  status: "Concluída",
  observacao: "",
};

function statusBadgeClass(status, s) {
  if (status === "Concluída") return s.badgeConcluido;
  if (status === "Em Andamento") return s.badgeEmAndamento;
  return s.badgePendente;
}

function formatDate(d) {
  if (!d) return "-";
  const str = d instanceof Date ? d.toISOString() : String(d);
  const parts = str.split("T")[0].split("-");
  return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : str;
}

export default function TabAtividades({ atividades = [], reloadData }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [deleteConfig, setDeleteConfig] = useState(null);
  const [messageConfig, setMessageConfig] = useState(null);

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
  };

  const handleEdit = (a) => {
    setEditingId(a.id);
    const dateStr = a.dataAtividade
      ? (a.dataAtividade instanceof Date
          ? a.dataAtividade
          : new Date(a.dataAtividade)
        )
          .toISOString()
          .split("T")[0]
      : "";
    setForm({
      tipo: a.tipo || "",
      bairro: a.bairro || "",
      logradouro: a.logradouro || "",
      responsavel: a.responsavel || "",
      dataAtividade: dateStr,
      quantidadeImoveis: a.quantidadeImoveis ?? "",
      status: a.status || "Concluída",
      observacao: a.observacao || "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.tipo || !form.bairro || !form.dataAtividade)
      setMessageConfig({
        type: "warning",
        title: "Dados incompletos",
        message: "Preencha tipo, bairro e data da atividade.",
      });
    return;

    const res = editingId
      ? await updateAtividade(editingId, form)
      : await createAtividade(form);

    if (res.success) {
      setMessageConfig({
        type: "success",
        title: editingId ? "Atividade atualizada" : "Atividade registrada",
        message: "O registro foi salvo com sucesso.",
      });
      resetForm();
      reloadData();
    } else {
      setMessageConfig({
        type: "error",
        title: "Não foi possível salvar",
        message: res.error,
      });
    }
  };

  return (
    <div className={s.card}>
      <ModalConfirmacaoCCZ
        config={deleteConfig}
        onConfirm={() => {
          if (deleteConfig?.onConfirm) deleteConfig.onConfirm();
          setDeleteConfig(null);
        }}
        onCancel={() => setDeleteConfig(null)}
      />
      <ModalMensagemCCZ
        config={messageConfig}
        onClose={() => setMessageConfig(null)}
      />

      <h3>
        {editingId
          ? "✏️ Editar Atividade"
          : "➕ Registrar Nova Atividade de Campo"}
      </h3>

      <form onSubmit={handleSubmit} className={s.formGrid}>
        <div className={s.fieldGroup}>
          <label>Tipo de Atividade *</label>
          <select
            value={form.tipo}
            onChange={(e) => setForm({ ...form, tipo: e.target.value })}
            required
          >
            <option value="">-- Selecione --</option>
            {TIPOS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        <div className={s.fieldGroup}>
          <label>Bairro *</label>
          <input
            type="text"
            value={form.bairro}
            onChange={(e) => setForm({ ...form, bairro: e.target.value })}
            placeholder="Ex: São Geraldo"
            required
          />
        </div>

        <div className={s.fieldGroup}>
          <label>Logradouro</label>
          <input
            type="text"
            value={form.logradouro}
            onChange={(e) => setForm({ ...form, logradouro: e.target.value })}
            placeholder="Ex: Rua das Acácias"
          />
        </div>

        <div className={s.fieldGroup}>
          <label>Responsável</label>
          <input
            type="text"
            value={form.responsavel}
            onChange={(e) => setForm({ ...form, responsavel: e.target.value })}
            placeholder="Ex: João Silva"
          />
        </div>

        <div className={s.fieldGroup}>
          <label>Data da Atividade *</label>
          <input
            type="date"
            value={form.dataAtividade}
            onChange={(e) =>
              setForm({ ...form, dataAtividade: e.target.value })
            }
            required
          />
        </div>

        <div className={s.fieldGroup}>
          <label>Qtd. Imóveis Visitados</label>
          <input
            type="number"
            min={0}
            value={form.quantidadeImoveis}
            onChange={(e) =>
              setForm({ ...form, quantidadeImoveis: e.target.value })
            }
            placeholder="Ex: 45"
          />
        </div>

        <div className={s.fieldGroup}>
          <label>Status</label>
          <select
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value })}
          >
            {STATUS_LIST.map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>
        </div>

        <div className={`${s.fieldGroup} ${s.fullWidth}`}>
          <label>Observação</label>
          <textarea
            rows={3}
            value={form.observacao}
            onChange={(e) => setForm({ ...form, observacao: e.target.value })}
            placeholder="Descreva o resultado, condições, achados, etc."
          />
        </div>

        <div className={s.formActions}>
          {editingId && (
            <button
              type="button"
              className={s.secondaryBtn}
              onClick={resetForm}
            >
              Cancelar
            </button>
          )}
          <button type="submit" className={s.primaryBtn}>
            {editingId ? "💾 Atualizar Atividade" : "➕ Salvar Atividade"}
          </button>
        </div>
      </form>

      <h4 className={s.sectionHeader}>Atividades Registradas</h4>
      <div className={s.tableWrapper}>
        <table className={s.table}>
          <thead>
            <tr>
              <th>#</th>
              <th>Tipo</th>
              <th>Bairro</th>
              <th>Responsável</th>
              <th>Data</th>
              <th>Imóveis</th>
              <th>Status</th>
              <th className={s.actionsColumn}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {atividades.length === 0 && (
              <tr>
                <td
                  colSpan={8}
                  style={{
                    textAlign: "center",
                    color: "#94a3b8",
                    padding: "2rem",
                  }}
                >
                  Nenhuma atividade registrada.
                </td>
              </tr>
            )}
            {atividades.map((a) => (
              <tr key={a.id}>
                <td style={{ color: "#94a3b8" }}>#{a.id}</td>
                <td>
                  <strong>{a.tipo}</strong>
                </td>
                <td>{a.bairro}</td>
                <td>{a.responsavel || "-"}</td>
                <td style={{ whiteSpace: "nowrap" }}>
                  {formatDate(a.dataAtividade)}
                </td>
                <td>{a.quantidadeImoveis ?? "-"}</td>
                <td>
                  <span
                    className={`${s.badge} ${statusBadgeClass(a.status, s)}`}
                  >
                    {a.status}
                  </span>
                </td>
                <td className={s.actionsCell}>
                  <BotaoEditar onClick={() => handleEdit(a)} />
                  <button
                    className={s.deleteBtn}
                    onClick={() =>
                      setDeleteConfig({
                        nome: `${a.tipo} — ${a.bairro}`,
                        detalhe: `Realizada em ${formatDate(a.dataAtividade)}`,
                        onConfirm: async () => {
                          const res = await deleteAtividade(a.id);
                          if (res.success) {
                            setMessageConfig({
                              type: "success",
                              title: "Atividade excluída",
                              message: "O registro foi removido com sucesso.",
                            });
                            reloadData();
                          } else
                            setMessageConfig({
                              type: "error",
                              title: "Não foi possível excluir",
                              message: res.error,
                            });
                        },
                      })
                    }
                  >
                    🗑️ Excluir
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
