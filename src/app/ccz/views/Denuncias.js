"use client";

import { useState } from "react";

// Subir um nível para encontrar o CSS compartilhado na raiz do CCZ
import s from "../shared.module.css";

// Apontar para os Modais dentro da pasta components/
import ModalConfirmacaoCCZ from "../components/Modals/ModalConfirmacaoCCZ";
import ModalMensagemCCZ from "../components/Modals/ModalMensagemCCZ";
import BotaoEditar from "@/components/BotaoEditar";

// Server Actions importadas da raiz do módulo ccz
import { createDenuncia, updateDenuncia, deleteDenuncia } from "../actions";

const EMPTY_FORM = {
  localizacao: "",
  descricao_cao: "",
  relato: "",
  animal_id: "",
  causou_risco: "Não",
};

function formatDate(value) {
  if (!value) return "-";
  const date = value instanceof Date ? value.toISOString() : String(value);
  const parts = date.split("T")[0].split("-");
  return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : date;
}

function updateField(setForm, field, value) {
  setForm((current) => ({ ...current, [field]: value }));
}

export default function Denuncias({
  denuncias = [],
  animais = [],
  reloadData,
}) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [deleteConfig, setDeleteConfig] = useState(null);
  const [messageConfig, setMessageConfig] = useState(null);

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
  };

  const handleEdit = (denuncia) => {
    setEditingId(denuncia.id);
    setForm({
      localizacao: denuncia.localizacao || "",
      descricao_cao: denuncia.descricao_cao || "",
      relato: denuncia.relato || "",
      animal_id: denuncia.animal_id || "",
      causou_risco: denuncia.causou_risco || "Não",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.localizacao || !form.descricao_cao || !form.relato) {
      setMessageConfig({
        type: "warning",
        title: "Dados incompletos",
        message:
          "Preencha localização, descrição do cão e relato da ocorrência.",
      });
      return;
    }

    const payload = { ...form, animal_id: form.animal_id || null };
    const result = editingId
      ? await updateDenuncia(editingId, payload)
      : await createDenuncia(payload);

    if (result.success) {
      setMessageConfig({
        type: "success",
        title: editingId ? "Denúncia atualizada" : "Denúncia registrada",
        message: "O registro foi salvo com sucesso.",
      });
      resetForm();
      reloadData();
    } else {
      setMessageConfig({
        type: "error",
        title: "Não foi possível salvar",
        message: result.error,
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
          ? "Editar Denúncia de Cão Agressivo"
          : "Registrar Denúncia de Cão Agressivo"}
      </h3>
      <form onSubmit={handleSubmit} className={s.formGrid}>
        <div className={`${s.fieldGroup} ${s.fullWidth}`}>
          <label htmlFor="localizacao">Localização *</label>
          <input
            id="localizacao"
            value={form.localizacao}
            onChange={(event) =>
              updateField(setForm, "localizacao", event.target.value)
            }
            placeholder="Informe onde ocorreu a denúncia"
            required
          />
        </div>

        <div className={s.fieldGroup}>
          <label htmlFor="descricao-cao">Descrição do cão *</label>
          <input
            id="descricao-cao"
            value={form.descricao_cao}
            onChange={(event) =>
              updateField(setForm, "descricao_cao", event.target.value)
            }
            placeholder="Raça, porte, cor e características"
            required
          />
        </div>

        <div className={s.fieldGroup}>
          <label htmlFor="animal-id">Animal cadastrado</label>
          <select
            id="animal-id"
            value={form.animal_id}
            onChange={(event) =>
              updateField(setForm, "animal_id", event.target.value)
            }
          >
            <option value="">Não vincular</option>
            {animais.map((animal) => (
              <option key={animal.id} value={animal.id}>
                {animal.nome || "Sem nome"} ({animal.id})
              </option>
            ))}
          </select>
        </div>

        <div className={s.fieldGroup}>
          <label htmlFor="causou-risco">Causou risco à vida?</label>
          <select
            id="causou-risco"
            value={form.causou_risco}
            onChange={(event) =>
              updateField(setForm, "causou_risco", event.target.value)
            }
          >
            <option value="Não">Não</option>
            <option value="Sim">Sim</option>
          </select>
        </div>

        <div className={`${s.fieldGroup} ${s.fullWidth}`}>
          <label htmlFor="relato">Relato da ocorrência *</label>
          <textarea
            id="relato"
            rows={5}
            value={form.relato}
            onChange={(event) =>
              updateField(setForm, "relato", event.target.value)
            }
            placeholder="Descreva o que aconteceu, quando e quem foi envolvido"
            required
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
            {editingId ? "Atualizar Denúncia" : "Salvar Denúncia"}
          </button>
        </div>
      </form>

      <h4 className={s.sectionHeader}>
        Denúncias de Cão Agressivo Registradas
      </h4>
      <div className={s.tableWrapper}>
        <table className={s.table}>
          <thead>
            <tr>
              <th>Data</th>
              <th>Localização</th>
              <th>Descrição do cão</th>
              <th>Risco à vida</th>
              <th>Animal vinculado</th>
              <th className={s.actionsColumn}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {denuncias.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  style={{
                    textAlign: "center",
                    color: "#94a3b8",
                    padding: "2rem",
                  }}
                >
                  Nenhuma denúncia registrada.
                </td>
              </tr>
            )}
            {denuncias.map((denuncia) => (
              <tr key={denuncia.id}>
                <td style={{ whiteSpace: "nowrap" }}>
                  {formatDate(denuncia.data_denuncia)}
                </td>
                <td>{denuncia.localizacao}</td>
                <td>{denuncia.descricao_cao}</td>
                <td>{denuncia.causou_risco || "Não"}</td>
                <td>{denuncia.animal_id || "Não vinculado"}</td>
                <td className={s.actionsCell}>
                  <BotaoEditar onClick={() => handleEdit(denuncia)} />
                  <button
                    className={s.deleteBtn}
                    onClick={() =>
                      setDeleteConfig({
                        nome: denuncia.localizacao,
                        detalhe: `Registrada em ${formatDate(denuncia.data_denuncia)}`,
                        onConfirm: async () => {
                          const result = await deleteDenuncia(denuncia.id);
                          if (result.success) {
                            setMessageConfig({
                              type: "success",
                              title: "Denúncia excluída",
                              message: "O registro foi removido com sucesso.",
                            });
                            reloadData();
                          } else {
                            setMessageConfig({
                              type: "error",
                              title: "Não foi possível excluir",
                              message: result.error,
                            });
                          }
                        },
                      })
                    }
                  >
                    Excluir
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