"use client";

import { useState, useMemo, useTransition } from "react";
import s from "../shared.module.css";
import ts from "./Usuarios.module.css";
import ModalConfirmacaoCCZ from "../components/Modals/ModalConfirmacaoCCZ";
import ModalMensagemCCZ from "../components/Modals/ModalMensagemCCZ";
import BotaoEditar from "@/components/BotaoEditar";
import { updateTutor, deleteTutor } from "../actions";

function maskCpf(v) {
  if (!v) return "";
  return v
    .replace(/\D/g, "")
    .slice(0, 11)
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

function maskTel(v) {
  if (!v) return "";
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 10)
    return d
      .replace(/(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{4})(\d{1,4})$/, "$1-$2");
  return d
    .replace(/(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d{1,4})$/, "$1-$2");
}

function onlyDigits(v) {
  return v ? v.replace(/\D/g, "") : "";
}

export default function Usuarios({ tutores = [], animais = [], reloadData }) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState(null);
  const [tutorParaExcluir, setTutorParaExcluir] = useState(null);
  const [messageConfig, setMessageConfig] = useState(null);
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const low = search.toLowerCase().trim();
    const digits = onlyDigits(search);
    if (!low) return tutores;
    return tutores.filter((t) => {
      const nomeLow = (t.nomeCompleto || "").toLowerCase();
      const cpfDig = onlyDigits(t.cpf || "");
      return nomeLow.includes(low) || (digits && cpfDig.includes(digits));
    });
  }, [tutores, search]);

  const animaisDeTutor = (cpf) => animais.filter((a) => a.tutorCpf === cpf);

  const startEditing = () => {
    setEditForm({ ...selected });
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setEditForm(null);
    setIsEditing(false);
  };

  const updateEditField = (field, value) => {
    setEditForm((current) => ({ ...current, [field]: value }));
  };

  const handleSaveEdit = async (event) => {
    event.preventDefault();
    const result = await updateTutor(selected.cpf, editForm);
    if (!result.success) {
      setMessageConfig({
        type: "error",
        title: "Não foi possível salvar",
        message: result.error,
      });
      return;
    }

    setSelected((prev) => ({ ...prev, ...editForm }));
    setEditForm(null);
    setIsEditing(false);
    setMessageConfig({
      type: "success",
      title: "Responsável atualizado",
      message: "As informações do responsável foram atualizadas com sucesso.",
    });
    reloadData?.();
  };

  const handleDelete = () => {
    startTransition(async () => {
      const result = await deleteTutor(tutorParaExcluir.cpf);
      if (!result.success) {
        setMessageConfig({
          type: "error",
          title: "Não foi possível excluir",
          message: result.error,
        });
        return;
      }

      if (selected?.cpf === tutorParaExcluir.cpf) {
        setSelected(null);
      }
      setTutorParaExcluir(null);
      setMessageConfig({
        type: "success",
        title: "Responsável removido",
        message: "O cadastro do responsável foi excluído com sucesso.",
      });
      reloadData?.();
    });
  };

  return (
    <div className={s.card}>
      {/* ── Busca ───────────────────────────────────────────────── */}
      <div className={ts.searchSection}>
        <div className={ts.searchRow}>
          <div className={ts.searchInputWrap}>
            <svg
              className={ts.searchIcon}
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              className={ts.searchInput}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setSelected(null);
              }}
              placeholder="Buscar por nome ou CPF..."
            />
            {search && (
              <button
                className={ts.clearBtn}
                onClick={() => {
                  setSearch("");
                  setSelected(null);
                }}
              >
                ✕
              </button>
            )}
          </div>
          <span className={ts.countBadge}>
            {filtered.length}{" "}
            {filtered.length === 1 ? "responsável" : "responsáveis"}
          </span>
        </div>
      </div>

      {/* ── Painel dividido: lista + detalhe ────────────────────── */}
      <div className={ts.splitLayout}>
        {/* Lista */}
        <div className={ts.listPane}>
          {filtered.length === 0 ? (
            <div className={ts.emptyList}>
              {tutores.length === 0
                ? "Nenhum responsável vinculado ao CCZ."
                : "Nenhum resultado para esta busca."}
            </div>
          ) : (
            filtered.map((t) => {
              const qtd = animaisDeTutor(t.cpf).length;
              return (
                <button
                  key={t.cpf}
                  type="button"
                  className={`${ts.listItem} ${selected?.cpf === t.cpf ? ts.listItemActive : ""}`}
                  onClick={() => {
                    setSelected(t);
                    setEditForm(null);
                    setIsEditing(false);
                  }}
                >
                  <div className={ts.listAvatar}>
                    {(t.nomeCompleto || "U").charAt(0).toUpperCase()}
                  </div>
                  <div className={ts.listMeta}>
                    <span className={ts.listName}>{t.nomeCompleto}</span>
                    <span className={ts.listSub}>
                      {maskCpf(t.cpf)}
                      {t.bairro ? ` • ${t.bairro}` : ""}
                    </span>
                  </div>
                  <span className={ts.animalCount}>{qtd} 🐾</span>
                </button>
              );
            })
          )}
        </div>

        {/* Detalhe */}
        <div className={ts.detailPane}>
          {!selected ? (
            <div className={ts.detailEmpty}>
              <span>👤</span>
              <p>Selecione um responsável para ver os detalhes</p>
            </div>
          ) : (
            <>
              {/* Cabeçalho do detalhe com Botões de Ação */}
              <div className={ts.detailHeaderWrapper}>
                <div className={ts.detailHeaderLeft}>
                  <div className={ts.detailAvatar}>
                    {(selected.nomeCompleto || "U").charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className={ts.detailName}>
                      {isEditing
                        ? editForm.nomeCompleto
                        : selected.nomeCompleto}
                    </h3>
                    <span className={ts.detailCpf}>
                      CPF: {maskCpf(selected.cpf)}
                    </span>
                  </div>
                </div>

                <div className={ts.detailActions}>
                  <BotaoEditar onClick={startEditing} disabled={isEditing} />
                  <button
                    type="button"
                    className={ts.deleteBtn}
                    onClick={() => setTutorParaExcluir(selected)}
                    disabled={isPending}
                  >
                    🗑️ Excluir
                  </button>
                </div>
              </div>

              {isEditing ? (
                <form onSubmit={handleSaveEdit}>
                  <div className={ts.detailSection}>
                    <p className={ts.detailSectionTitle}>Dados pessoais</p>
                    <div className={ts.detailGrid}>
                      <label className={ts.editField}>
                        <span className={ts.detailLabel}>Nome completo</span>
                        <input
                          className={ts.editInput}
                          value={editForm.nomeCompleto || ""}
                          onChange={(e) =>
                            updateEditField("nomeCompleto", e.target.value)
                          }
                          required
                        />
                      </label>
                      <label className={ts.editField}>
                        <span className={ts.detailLabel}>CPF</span>
                        <input
                          className={ts.editInput}
                          value={maskCpf(editForm.cpf)}
                          disabled
                        />
                      </label>
                      <label className={ts.editField}>
                        <span className={ts.detailLabel}>Telefone</span>
                        <input
                          className={ts.editInput}
                          value={maskTel(editForm.telefone || "")}
                          onChange={(e) =>
                            updateEditField(
                              "telefone",
                              onlyDigits(e.target.value),
                            )
                          }
                        />
                      </label>
                    </div>
                  </div>

                  <div className={ts.detailSection}>
                    <p className={ts.detailSectionTitle}>Endereço</p>
                    <div className={ts.detailGrid}>
                      {[
                        ["logradouro", "Logradouro"],
                        ["numero", "Número"],
                        ["bairro", "Bairro"],
                        ["cidade", "Cidade"],
                        ["uf", "UF"],
                      ].map(([field, label]) => (
                        <label className={ts.editField} key={field}>
                          <span className={ts.detailLabel}>{label}</span>
                          <input
                            className={ts.editInput}
                            value={editForm[field] || ""}
                            maxLength={field === "uf" ? 2 : undefined}
                            onChange={(e) =>
                              updateEditField(
                                field,
                                field === "uf"
                                  ? e.target.value.toUpperCase()
                                  : e.target.value,
                              )
                            }
                          />
                        </label>
                      ))}
                      <label
                        className={`${ts.editField} ${ts.detailFieldFull}`}
                      >
                        <span className={ts.detailLabel}>
                          Ponto de referência
                        </span>
                        <input
                          className={ts.editInput}
                          value={editForm.pontoReferencia || ""}
                          onChange={(e) =>
                            updateEditField("pontoReferencia", e.target.value)
                          }
                        />
                      </label>
                    </div>
                  </div>

                  <div className={ts.detailSection}>
                    <p className={ts.detailSectionTitle}>
                      Dados complementares
                    </p>
                    <div className={ts.detailGrid}>
                      {[
                        ["rg", "RG"],
                        ["profissao", "Profissão"],
                        ["telefoneSecundario", "Telefone secundário"],
                      ].map(([field, label]) => (
                        <label className={ts.editField} key={field}>
                          <span className={ts.detailLabel}>{label}</span>
                          <input
                            className={ts.editInput}
                            value={
                              field === "telefoneSecundario"
                                ? maskTel(editForm[field] || "")
                                : editForm[field] || ""
                            }
                            onChange={(e) =>
                              updateEditField(
                                field,
                                field === "telefoneSecundario"
                                  ? onlyDigits(e.target.value)
                                  : e.target.value,
                              )
                            }
                          />
                        </label>
                      ))}
                      <label className={ts.editField}>
                        <span className={ts.detailLabel}>Sexo</span>
                        <select
                          className={ts.editInput}
                          value={editForm.sexo || ""}
                          onChange={(e) =>
                            updateEditField("sexo", e.target.value)
                          }
                        >
                          <option value="">Não informado</option>
                          <option value="Masculino">Masculino</option>
                          <option value="Feminino">Feminino</option>
                          <option value="Outro">Outro</option>
                        </select>
                      </label>
                    </div>
                  </div>

                  <div className={ts.detailSection}>
                    <label className={ts.editField}>
                      <span className={ts.detailSectionTitle}>
                        Observações CCZ
                      </span>
                      <textarea
                        className={ts.editInput}
                        rows={3}
                        value={editForm.observacoes || ""}
                        onChange={(e) =>
                          updateEditField("observacoes", e.target.value)
                        }
                      />
                    </label>
                    <div className={ts.editActions}>
                      <button
                        type="button"
                        className={ts.cancelBtn}
                        onClick={cancelEditing}
                      >
                        Cancelar
                      </button>
                      <button type="submit" className={ts.saveBtn}>
                        Salvar alterações
                      </button>
                    </div>
                  </div>
                </form>
              ) : (
                <>
                  {/* Contato */}
                  <div className={ts.detailSection}>
                    <p className={ts.detailSectionTitle}>Contato</p>
                    <div className={ts.detailGrid}>
                      <div className={ts.detailField}>
                        <span className={ts.detailLabel}>Telefone</span>
                        <span className={ts.detailValue}>
                          {selected.telefone ? maskTel(selected.telefone) : "—"}
                        </span>
                      </div>
                      {selected.telefoneSecundario && (
                        <div className={ts.detailField}>
                          <span className={ts.detailLabel}>
                            Tel. Secundário
                          </span>
                          <span className={ts.detailValue}>
                            {maskTel(selected.telefoneSecundario)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Endereço */}
                  <div className={ts.detailSection}>
                    <p className={ts.detailSectionTitle}>Endereço</p>
                    <div className={ts.detailGrid}>
                      <div className={ts.detailField}>
                        <span className={ts.detailLabel}>Logradouro</span>
                        <span className={ts.detailValue}>
                          {[selected.logradouro, selected.numero]
                            .filter(Boolean)
                            .join(", ") || "—"}
                        </span>
                      </div>
                      <div className={ts.detailField}>
                        <span className={ts.detailLabel}>Bairro</span>
                        <span className={ts.detailValue}>
                          {selected.bairro || "—"}
                        </span>
                      </div>
                      <div className={ts.detailField}>
                        <span className={ts.detailLabel}>Cidade / UF</span>
                        <span className={ts.detailValue}>
                          {[selected.cidade, selected.uf]
                            .filter(Boolean)
                            .join(" / ") || "—"}
                        </span>
                      </div>
                      {selected.pontoReferencia && (
                        <div
                          className={`${ts.detailField} ${ts.detailFieldFull}`}
                        >
                          <span className={ts.detailLabel}>
                            Ponto de Referência
                          </span>
                          <span className={ts.detailValue}>
                            {selected.pontoReferencia}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Dados Complementares */}
                  {(selected.rg || selected.sexo || selected.profissao) && (
                    <div className={ts.detailSection}>
                      <p className={ts.detailSectionTitle}>
                        Dados Complementares
                      </p>
                      <div className={ts.detailGrid}>
                        {selected.rg && (
                          <div className={ts.detailField}>
                            <span className={ts.detailLabel}>RG</span>
                            <span className={ts.detailValue}>
                              {selected.rg}
                            </span>
                          </div>
                        )}
                        {selected.sexo && (
                          <div className={ts.detailField}>
                            <span className={ts.detailLabel}>Sexo</span>
                            <span className={ts.detailValue}>
                              {selected.sexo}
                            </span>
                          </div>
                        )}
                        {selected.profissao && (
                          <div className={ts.detailField}>
                            <span className={ts.detailLabel}>Profissão</span>
                            <span className={ts.detailValue}>
                              {selected.profissao}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {selected.observacoes && (
                    <div className={ts.detailSection}>
                      <p className={ts.detailSectionTitle}>Observações CCZ</p>
                      <p className={ts.detailObs}>{selected.observacoes}</p>
                    </div>
                  )}
                </>
              )}

              {/* Animais */}
              <div className={ts.detailSection}>
                <p className={ts.detailSectionTitle}>
                  Animais Cadastrados ({animaisDeTutor(selected.cpf).length})
                </p>
                {animaisDeTutor(selected.cpf).length === 0 ? (
                  <p style={{ fontSize: "0.85rem", color: "#94a3b8" }}>
                    Nenhum animal vinculado.
                  </p>
                ) : (
                  <div className={ts.animalList}>
                    {animaisDeTutor(selected.cpf).map((a) => (
                      <div key={a.id} className={ts.animalChip}>
                        <span className={ts.animalEmoji}>
                          {{ Cão: "🐕", Gato: "🐈" }[a.especie] || "🐾"}
                        </span>
                        <div>
                          <span className={ts.animalChipName}>
                            {a.nome || "Sem nome"}
                          </span>
                          <span className={ts.animalChipMeta}>
                            {a.especie}
                            {a.raca ? ` / ${a.raca}` : ""}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Modais de exclusão e mensagem */}
      <ModalConfirmacaoCCZ
        config={
          tutorParaExcluir
            ? {
                nome: tutorParaExcluir.nomeCompleto,
                detalhe: `CPF: ${maskCpf(tutorParaExcluir.cpf)} • ${animaisDeTutor(tutorParaExcluir.cpf).length} animal(is) vinculado(s)`,
              }
            : null
        }
        onConfirm={handleDelete}
        onCancel={() => setTutorParaExcluir(null)}
      />

      <ModalMensagemCCZ
        config={messageConfig}
        onClose={() => setMessageConfig(null)}
      />
    </div>
  );
}
