"use client";

import { useState } from "react";

// Subir um nível para encontrar o shared.module.css na raiz do CCZ
import s from "../shared.module.css";

// Apontar para os Modais dentro da pasta components/
import ModalConfirmacaoCCZ from "../components/Modals/ModalConfirmacaoCCZ";
import ModalMensagemCCZ from "../components/Modals/ModalMensagemCCZ";
import BotaoEditar from "@/components/BotaoEditar";

const TIPOS_PROCEDIMENTO = [
  "Castração",
  "Consulta Veterinária",
  "Vermifugação",
  "Antipulgas / Carrapatos",
  "Curativo / Tratamento de Ferida",
  "Microchipagem",
  "Exame Laboratorial",
  "Outros",
];

const STATUS_LIST = ["Agendado", "Realizado", "Cancelado"];

const EMPTY_FORM = {
  animalId: "",
  tipoProcedimento: "",
  responsavel: "",
  dataProcedimento: new Date().toISOString().split("T")[0],
  status: "Realizado",
  observacao: "",
};

function formatDate(d) {
  if (!d) return "-";
  return typeof d === "string" && d.includes("-")
    ? d.split("-").reverse().join("/")
    : d;
}

function statusBadgeClass(status) {
  if (status === "Realizado") return s.badgeConcluido;
  if (status === "Agendado") return s.badgePendente;
  return s.badgeNormal;
}

let _nextId = 1;

export default function Procedimentos({ tutores = [], animais = [] }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [registros, setRegistros] = useState([]);
  const [deleteConfig, setDeleteConfig] = useState(null);
  const [messageConfig, setMessageConfig] = useState(null);

  const animaisPorTutor = tutores
    .map((t) => ({
      tutor: t,
      animais: animais.filter((a) => a.tutorCpf === t.cpf),
    }))
    .filter((g) => g.animais.length > 0);

  const animalSelecionado = animais.find(
    (a) => String(a.id) === String(form.animalId)
  );
  const tutorDoAnimal = animalSelecionado
    ? tutores.find((t) => t.cpf === animalSelecionado.tutorCpf)
    : null;

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.animalId || !form.tipoProcedimento || !form.dataProcedimento) {
      setMessageConfig({
        type: "warning",
        title: "Dados incompletos",
        message: "Preencha o animal, tipo de procedimento e data.",
      });
      return;
    }

    if (editingId !== null) {
      setRegistros((prev) =>
        prev.map((r) => (r.id === editingId ? { ...r, ...form } : r))
      );
      setMessageConfig({
        type: "success",
        title: "Procedimento atualizado",
        message: "O procedimento foi salvo com sucesso.",
      });
    } else {
      setRegistros((prev) => [...prev, { id: _nextId++, ...form }]);
      setMessageConfig({
        type: "success",
        title: "Procedimento registrado",
        message: "O procedimento foi salvo com sucesso.",
      });
    }
    resetForm();
  };

  const handleEdit = (r) => {
    setEditingId(r.id);
    setForm({
      animalId: r.animalId,
      tipoProcedimento: r.tipoProcedimento,
      responsavel: r.responsavel,
      dataProcedimento: r.dataProcedimento,
      status: r.status,
      observacao: r.observacao,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
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
        {editingId !== null
          ? "✏️ Editar Procedimento"
          : "➕ Registrar Procedimento"}
      </h3>

      <form onSubmit={handleSubmit} className={s.formGrid}>
        {/* Animal */}
        <div className={`${s.fieldGroup} ${s.fullWidth}`}>
          <label>Animal *</label>
          <select
            value={form.animalId}
            onChange={(e) => setForm({ ...form, animalId: e.target.value })}
            required
          >
            <option value="">-- Selecione o animal --</option>
            {animaisPorTutor.length === 0 && (
              <option disabled>Nenhum animal cadastrado.</option>
            )}
            {animaisPorTutor.map(({ tutor, animais: gr }) => (
              <optgroup
                key={tutor.cpf}
                label={`${tutor.nomeCompleto}${tutor.bairro ? ` — ${tutor.bairro}` : ""}`}
              >
                {gr.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.nome || "Sem nome"} ({a.especie}
                    {a.raca ? ` / ${a.raca}` : ""})
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        {/* Preview do animal */}
        {animalSelecionado && (
          <div
            className={`${s.fullWidth}`}
            style={{
              background: "#f0fdf4",
              border: "1px solid #bbf7d0",
              borderRadius: "8px",
              padding: "0.75rem 1rem",
              fontSize: "0.875rem",
              color: "#15803d",
              display: "flex",
              gap: "1.5rem",
              flexWrap: "wrap",
            }}
          >
            <span>
              <strong>Animal:</strong> {animalSelecionado.nome || "Sem nome"} (
              {animalSelecionado.especie})
            </span>
            {tutorDoAnimal && (
              <span>
                <strong>Tutor:</strong> {tutorDoAnimal.nomeCompleto}
              </span>
            )}
            {tutorDoAnimal?.bairro && (
              <span>
                <strong>Bairro:</strong> {tutorDoAnimal.bairro}
              </span>
            )}
          </div>
        )}

        {/* Tipo */}
        <div className={s.fieldGroup}>
          <label>Tipo de Procedimento *</label>
          <select
            value={form.tipoProcedimento}
            onChange={(e) =>
              setForm({ ...form, tipoProcedimento: e.target.value })
            }
            required
          >
            <option value="">-- Selecione --</option>
            {TIPOS_PROCEDIMENTO.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        {/* Responsável */}
        <div className={s.fieldGroup}>
          <label>Responsável / Veterinário</label>
          <input
            type="text"
            value={form.responsavel}
            onChange={(e) => setForm({ ...form, responsavel: e.target.value })}
            placeholder="Ex: Dra. Ana Paula"
          />
        </div>

        {/* Data */}
        <div className={s.fieldGroup}>
          <label>Data do Procedimento *</label>
          <input
            type="date"
            value={form.dataProcedimento}
            onChange={(e) =>
              setForm({ ...form, dataProcedimento: e.target.value })
            }
            required
          />
        </div>

        {/* Status */}
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

        {/* Observação */}
        <div className={`${s.fieldGroup} ${s.fullWidth}`}>
          <label>Observação</label>
          <textarea
            rows={3}
            value={form.observacao}
            onChange={(e) => setForm({ ...form, observacao: e.target.value })}
            placeholder="Detalhes do procedimento, medicamentos utilizados, etc."
          />
        </div>

        <div className={s.formActions}>
          {editingId !== null && (
            <button
              type="button"
              className={s.secondaryBtn}
              onClick={resetForm}
            >
              Cancelar
            </button>
          )}
          <button type="submit" className={s.primaryBtn}>
            {editingId !== null
              ? "💾 Atualizar Procedimento"
              : "➕ Salvar Procedimento"}
          </button>
        </div>
      </form>

      {/* Tabela */}
      <h4 className={s.sectionHeader}>Procedimentos Registrados</h4>
      <div className={s.tableWrapper}>
        <table className={s.table}>
          <thead>
            <tr>
              <th>#</th>
              <th>Animal</th>
              <th>Tutor</th>
              <th>Procedimento</th>
              <th>Responsável</th>
              <th>Data</th>
              <th>Status</th>
              <th className={s.actionsColumn}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {registros.length === 0 && (
              <tr>
                <td
                  colSpan={8}
                  style={{
                    textAlign: "center",
                    color: "#94a3b8",
                    padding: "2rem",
                  }}
                >
                  Nenhum procedimento registrado.
                </td>
              </tr>
            )}
            {registros.map((r) => {
              const animal = animais.find(
                (a) => String(a.id) === String(r.animalId)
              );
              const tutor = animal
                ? tutores.find((t) => t.cpf === animal.tutorCpf)
                : null;
              return (
                <tr key={r.id}>
                  <td style={{ color: "#94a3b8" }}>#{r.id}</td>
                  <td>
                    <strong>{animal?.nome || "Sem nome"}</strong>
                    <span style={{ color: "#64748b", fontSize: "0.8rem" }}>
                      {" "}
                      ({animal?.especie || "-"})
                    </span>
                  </td>
                  <td>{tutor?.nomeCompleto || "-"}</td>
                  <td>{r.tipoProcedimento}</td>
                  <td>
                    {r.responsavel || (
                      <span style={{ color: "#94a3b8" }}>-</span>
                    )}
                  </td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    {formatDate(r.dataProcedimento)}
                  </td>
                  <td>
                    <span
                      className={`${s.badge} ${statusBadgeClass(r.status)}`}
                    >
                      {r.status}
                    </span>
                  </td>
                  <td className={s.actionsCell}>
                    <BotaoEditar onClick={() => handleEdit(r)} />
                    <button
                      className={s.deleteBtn}
                      onClick={() =>
                        setDeleteConfig({
                          nome: `${r.tipoProcedimento} — ${animal?.nome || "Animal"}`,
                          detalhe: `Data: ${formatDate(r.dataProcedimento)}`,
                          onConfirm: () => {
                            setRegistros((prev) =>
                              prev.filter((x) => x.id !== r.id)
                            );
                            setMessageConfig({
                              type: "success",
                              title: "Procedimento excluído",
                              message: "O registro foi removido com sucesso.",
                            });
                          },
                        })
                      }
                    >
                      🗑️ Excluir
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}