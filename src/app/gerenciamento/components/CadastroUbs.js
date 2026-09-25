"use client";

import { useState, useRef, useEffect } from "react";
import styles from "./CadastroUbs.module.css";
import ModalConfirmacaoExclusao from "@/app/regulacao/components/Modals/ModalConfirmacaoExclusao";
import { useConfirm, useNotify } from "@/components/ConfirmDialog";
import BotaoEditar from "@/components/BotaoEditar";
import { createUbs, updateUbs, deleteUbs } from "@/app/regulacao/actions";

export default function CadastroUbs({
  formUbs,
  setFormUbs,
  auxData = { ubsList: [] },
  reloadData = () => {},
}) {
  const confirm = useConfirm();
  const notify = useNotify();
  const [deleteConfig, setDeleteConfig] = useState(null);

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

  const termoBusca = (formUbs.search || "").toLowerCase().trim();
  const ubsFiltradas = (auxData.ubsList || []).filter((u) => {
    if (!termoBusca) return true;
    return (
      (u.nome || "").toLowerCase().includes(termoBusca) ||
      (u.cnes || "").toLowerCase().includes(termoBusca)
    );
  });

  const selecionarUbs = (u) => {
    carregarUbsParaEdicao(u);
    setDropAberto(false);
  };

  const resetFormUbs = () => {
    setFormUbs({
      id: null,
      nome: "",
      cnes: "",
      search: "",
      sugestoes: [],
      showSugestoes: false,
      isEditing: false,
      isFormActive: false,
    });
  };

  const carregarUbsParaEdicao = (u) => {
    setFormUbs({
      id: u.id,
      nome: u.nome,
      cnes: u.cnes,
      search: `${u.nome} (CNES: ${u.cnes})`,
      sugestoes: [],
      showSugestoes: false,
      isEditing: true,
      isFormActive: false, // modo leitura; "Editar" habilita
    });
  };

  const habilitarEdicao = () => {
    setFormUbs((prev) => ({ ...prev, isFormActive: true }));
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
          <label>Buscar Unidade no Banco (CNES ou Nome)</label>
          <div className={styles.searchActionRow}>
            <div className={styles.selectSearchWrapper} ref={dropdownRef}>
              <input
                type="text"
                className={styles.selectLikeInput}
                value={formUbs.search || ""}
                placeholder="Selecionar ou digitar CNES/Nome..."
                onChange={(e) => {
                  setFormUbs((prev) => ({ ...prev, search: e.target.value }));
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
                    <table className={styles.ubsTableDropdown}>
                      <thead>
                        <tr>
                          <th>CNES</th>
                          <th>Nome da Unidade</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ubsFiltradas.length > 0 ? (
                          ubsFiltradas.map((u) => (
                            <tr
                              key={u.id}
                              onMouseDown={(e) => {
                                e.preventDefault();
                                selecionarUbs(u);
                              }}
                              className={formUbs.id === u.id ? styles.selectedRow : ""}
                            >
                              <td>{u.cnes}</td>
                              <td className={styles.boldName}>{u.nome}</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="2" className={styles.noDataTd}>
                              Nenhuma unidade encontrada.
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
                resetFormUbs();
                setFormUbs((prev) => ({ ...prev, isFormActive: true }));
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
            title: formUbs.isEditing ? "Atualizar UBS" : "Cadastrar UBS",
            message: formUbs.isEditing
              ? "Deseja salvar as alterações desta unidade?"
              : "Deseja confirmar o cadastro desta unidade?",
            confirmText: formUbs.isEditing ? "Atualizar" : "Cadastrar",
          });
          if (!ok) return;
          if (formUbs.isEditing) {
            const res = await updateUbs(formUbs.id, formUbs);
            if (res.success) {
              await notify({ tipo: "sucesso", title: "UBS atualizada", message: "Dados da UBS atualizados com sucesso!" });
              reloadData();
            } else await notify({ tipo: "erro", title: "Erro", message: "Erro ao atualizar: " + res.error });
          } else {
            const res = await createUbs(formUbs);
            if (res.success) {
              await notify({ tipo: "sucesso", title: "UBS cadastrada", message: "UBS cadastrada com sucesso!" });
              reloadData();
            } else await notify({ tipo: "erro", title: "Erro", message: "Erro ao salvar: " + res.error });
          }
          resetFormUbs();
        }}
        className={styles.patientFormContainer}
      >
        <div className={styles.formSection}>
          <div className={styles.formSectionHeader}>
            <h4>Dados da Unidade</h4>
          </div>
          <div className={styles.formGridStrict}>
            <div className={`${styles.fieldGroup} ${styles.colUbsName}`}>
              <label>Nome da Unidade / UBS *</label>
              <input
                type="text"
                value={formUbs.nome}
                onChange={(e) => setFormUbs({ ...formUbs, nome: e.target.value })}
                disabled={!formUbs.isFormActive}
                required
              />
            </div>
            <div className={`${styles.fieldGroup} ${styles.colCnes}`}>
              <label>Código CNES *</label>
              <input
                type="text"
                value={formUbs.cnes}
                onChange={(e) => setFormUbs({ ...formUbs, cnes: e.target.value })}
                disabled={!formUbs.isFormActive}
                required
              />
            </div>
          </div>
        </div>

        <div className={styles.formActions}>
          {formUbs.isEditing && !formUbs.isFormActive && (
            <BotaoEditar onClick={habilitarEdicao} />
          )}

          {formUbs.isFormActive && (
            <>
              <button type="button" className={styles.btnGhost} onClick={resetFormUbs}>
                Cancelar
              </button>
              {formUbs.isEditing && (
                <button
                  type="button"
                  className={styles.btnDanger}
                  onClick={() =>
                    setDeleteConfig({
                      tipo: "UBS",
                      nome: formUbs.nome,
                      detalhe: `CNES: ${formUbs.cnes}`,
                      onConfirm: async () => {
                        const res = await deleteUbs(formUbs.id);
                        if (res.success) {
                          await notify({ tipo: "sucesso", title: "UBS removida", message: "UBS removida com sucesso!" });
                          reloadData();
                          resetFormUbs();
                        } else await notify({ tipo: "erro", title: "Erro", message: "Erro ao excluir: " + res.error });
                      },
                    })
                  }
                >
                  Excluir
                </button>
              )}
              <button type="submit" className={styles.primaryBtn}>
                {formUbs.isEditing ? "Atualizar" : "Salvar"}
              </button>
            </>
          )}
        </div>
      </form>
    </div>
  );
}