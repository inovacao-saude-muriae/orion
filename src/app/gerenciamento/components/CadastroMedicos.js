"use client";

import { useState, useRef, useEffect } from "react";
import styles from "./CadastroMedicos.module.css";
import ModalConfirmacaoExclusao from "@/app/regulacao/components/Modals/ModalConfirmacaoExclusao";
import { useConfirm, useNotify } from "@/components/ConfirmDialog";
import { createMedico, updateMedico, deleteMedico } from "@/app/regulacao/actions";

export default function CadastroMedicos({
  formMedico,
  setFormMedico,
  auxData = { medicos: [] },
  reloadData = () => {},
}) {
  const confirm = useConfirm();
  const notify = useNotify();
  const [deleteConfig, setDeleteConfig] = useState(null);

  // Dropdown de busca (estilo Novo Pedido).
  const [dropAberto, setDropAberto] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropAberto(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const termoBusca = (formMedico.search || "").toLowerCase().trim();
  const medicosFiltrados = (auxData.medicos || []).filter((m) => {
    if (!termoBusca) return true;
    const nome = (m.nome || "").toLowerCase();
    const crm = (m.crm || "").toLowerCase();
    return nome.includes(termoBusca) || crm.includes(termoBusca);
  });

  const selecionarMedico = (m) => {
    carregarMedicoParaEdicao(m);
    setDropAberto(false);
  };

  const resetFormMedico = () => {
    setFormMedico({
      id: null,
      nome: "",
      crm: "",
      ufCrm: "MG",
      especialidade: "",
      tipo: "Solicitante",
      search: "",
      sugestoes: [],
      showSugestoes: false,
      isEditing: false,
      isFormActive: false,
    });
  };

  const carregarMedicoParaEdicao = (m) => {
    setFormMedico({
      id: m.id,
      nome: m.nome,
      crm: m.crm,
      ufCrm: m.ufCrm || "MG",
      especialidade: m.especialidade || "",
      tipo: m.tipo || "Solicitante",
      search: `${m.nome} (CRM: ${m.crm})`,
      sugestoes: [],
      showSugestoes: false,
      isEditing: true,
      isFormActive: false, // entra em modo leitura; "Editar" habilita
    });
  };

  const habilitarEdicao = () => {
    setFormMedico((prev) => ({ ...prev, isFormActive: true }));
  };

  return (
    <div className={styles.card}>
      <ModalConfirmacaoExclusao
        config={deleteConfig}
        onConfirm={() => {
          if (deleteConfig?.onConfirm) deleteConfig.onConfirm();
          setDeleteConfig(null);
        }}
        onCancel={() => setDeleteConfig(null)}
      />

      <div className={styles.searchSectionContainer}>
        <div className={styles.fieldGroup}>
          <label>Buscar Médico no Banco (CRM ou Nome)</label>
          <div className={styles.searchActionRow}>
            <div className={styles.selectSearchWrapper} ref={dropdownRef}>
              <input
                type="text"
                className={styles.selectLikeInput}
                value={formMedico.search || ""}
                placeholder="Selecionar ou digitar CRM/Nome..."
                onChange={(e) => {
                  setFormMedico((prev) => ({ ...prev, search: e.target.value }));
                  setDropAberto(true);
                }}
                onFocus={() => setDropAberto(true)}
              />
              <span className={styles.selectArrow} onClick={() => setDropAberto(!dropAberto)}>
                {dropAberto ? "▲" : "▼"}
              </span>

              {dropAberto && (
                <div className={styles.tableDropdownMenu}>
                  <div className={styles.tableContainerScroll}>
                    <table className={styles.medicoTableDropdown}>
                      <thead>
                        <tr>
                          <th>CRM</th>
                          <th>Nome</th>
                          <th>UF</th>
                          <th>Especialidade</th>
                        </tr>
                      </thead>
                      <tbody>
                        {medicosFiltrados.length > 0 ? (
                          medicosFiltrados.map((m) => (
                            <tr
                              key={m.id}
                              onMouseDown={(e) => {
                                e.preventDefault();
                                selecionarMedico(m);
                              }}
                              className={formMedico.id === m.id ? styles.selectedRow : ""}
                            >
                              <td>{m.crm}</td>
                              <td className={styles.boldName}>{m.nome}</td>
                              <td>{m.ufCrm}</td>
                              <td>{m.especialidade || "—"}</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="4" className={styles.noDataTd}>
                              Nenhum médico encontrado.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              className={styles.btnAdicionar}
              onClick={() => {
                resetFormMedico();
                setFormMedico((prev) => ({ ...prev, isFormActive: true }));
              }}
            >
              + Adicionar novo
            </button>
          </div>
        </div>
      </div>

      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const ok = await confirm({
            title: formMedico.isEditing ? "Atualizar médico" : "Cadastrar médico",
            message: formMedico.isEditing
              ? "Deseja salvar as alterações deste médico?"
              : "Deseja confirmar o cadastro deste médico?",
            confirmText: formMedico.isEditing ? "Atualizar" : "Cadastrar",
          });
          if (!ok) return;
          if (formMedico.isEditing) {
            const res = await updateMedico(formMedico.id, formMedico);
            if (res.success) {
              await notify({ tipo: "sucesso", title: "Médico atualizado", message: "Dados do médico atualizados com sucesso!" });
              reloadData();
            } else await notify({ tipo: "erro", title: "Erro", message: "Erro ao atualizar: " + res.error });
          } else {
            const res = await createMedico(formMedico);
            if (res.success) {
              await notify({ tipo: "sucesso", title: "Médico cadastrado", message: "Médico cadastrado com sucesso!" });
              reloadData();
            } else await notify({ tipo: "erro", title: "Erro", message: "Erro ao salvar: " + res.error });
          }
          resetFormMedico();
        }}
        className={styles.patientFormContainer}
      >
        <div className={styles.formSection}>
          <div className={styles.formSectionHeader}>
            <h4>Dados Profissionais</h4>
          </div>
          <div className={styles.formGridStrict}>
            <div className={`${styles.fieldGroup} ${styles.colName}`}>
              <label>Nome do Médico *</label>
              <input
                type="text"
                value={formMedico.nome}
                onChange={(e) => setFormMedico({ ...formMedico, nome: e.target.value })}
                disabled={!formMedico.isFormActive}
                required
              />
            </div>
            <div className={`${styles.fieldGroup} ${styles.colCrm}`}>
              <label>CRM *</label>
              <input
                type="text"
                value={formMedico.crm}
                onChange={(e) => setFormMedico({ ...formMedico, crm: e.target.value })}
                disabled={!formMedico.isFormActive}
                required
              />
            </div>
            <div className={`${styles.fieldGroup} ${styles.colUfCrm}`}>
              <label>UF CRM *</label>
              <input
                type="text"
                value={formMedico.ufCrm}
                onChange={(e) => setFormMedico({ ...formMedico, ufCrm: e.target.value })}
                maxLength={2}
                disabled={!formMedico.isFormActive}
                required
              />
            </div>
            <div className={`${styles.fieldGroup} ${styles.colEspecialidade}`}>
              <label>Especialidade</label>
              <input
                type="text"
                value={formMedico.especialidade}
                onChange={(e) => setFormMedico({ ...formMedico, especialidade: e.target.value })}
                disabled={!formMedico.isFormActive}
              />
            </div>
            <div className={`${styles.fieldGroup} ${styles.colTipo}`}>
              <label>Tipo *</label>
              <select
                value={formMedico.tipo || "Solicitante"}
                onChange={(e) => setFormMedico({ ...formMedico, tipo: e.target.value })}
                disabled={!formMedico.isFormActive}
                required
              >
                <option value="Solicitante">Solicitante</option>
                <option value="Regulador">Regulador</option>
              </select>
            </div>
          </div>
        </div>

        <div className={styles.formActions}>
          {/* Modo leitura: só o botão Editar */}
          {formMedico.isEditing && !formMedico.isFormActive && (
            <button type="button" className={styles.primaryBtn} onClick={habilitarEdicao}>
              Editar
            </button>
          )}

          {/* Modo edição/novo: Cancelar, Excluir (só edição) e Salvar */}
          {formMedico.isFormActive && (
            <>
              <button type="button" className={styles.btnGhost} onClick={resetFormMedico}>
                Cancelar
              </button>
              {formMedico.isEditing && (
                <button
                  type="button"
                  className={styles.btnDanger}
                  onClick={() =>
                    setDeleteConfig({
                      tipo: "MEDICO",
                      nome: formMedico.nome,
                      detalhe: `CRM: ${formMedico.crm}`,
                      onConfirm: async () => {
                        const res = await deleteMedico(formMedico.id);
                        if (res.success) {
                          await notify({ tipo: "sucesso", title: "Médico removido", message: "Médico removido com sucesso!" });
                          reloadData();
                          resetFormMedico();
                        } else await notify({ tipo: "erro", title: "Erro", message: "Erro ao excluir: " + res.error });
                      },
                    })
                  }
                >
                  Excluir
                </button>
              )}
              <button type="submit" className={styles.primaryBtn}>
                {formMedico.isEditing ? "Atualizar" : "Salvar"}
              </button>
            </>
          )}
        </div>
      </form>
    </div>
  );
}