"use client";

import { useState, useRef, useEffect } from "react";
import styles from "./CadastroServicos.module.css";
import ModalConfirmacaoExclusao from "@/app/regulacao/components/Modals/ModalConfirmacaoExclusao";
import { useConfirm, useNotify } from "@/components/ConfirmDialog";
import { createRegistro, updateRegistro, deleteRegistro } from "@/app/gerenciamento/servicos/actions";

const FORM_VAZIO = {
  linha: null, // linha em edição (com especialidadeId / servicoId)
  servicoId: "", // id do serviço selecionado ("__novo__" para criar)
  servicoNome: "", // usado quando servicoId === "__novo__"
  especialidadeSel: "", // valor do dropdown de especialidade ("", "__novo__" ou id)
  especialidadeNome: "", // nome da especialidade (nova ou existente em edição)
  search: "",
  isEditing: false,
  isFormActive: false,
};

export default function CadastroServicos({ data = { servicos: [], linhas: [] }, reloadData = () => {} }) {
  const confirm = useConfirm();
  const notify = useNotify();

  const [deleteConfig, setDeleteConfig] = useState(null);
  const [form, setForm] = useState(FORM_VAZIO);
  const [dropAberto, setDropAberto] = useState(false);
  const [filterServicoId, setFilterServicoId] = useState("");

  const dropRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropRef.current && !dropRef.current.contains(e.target)) {
        setDropAberto(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const resetForm = () => setForm(FORM_VAZIO);

  const carregarParaEdicao = (linha) => {
    setForm({
      linha,
      servicoId: String(linha.servicoId),
      servicoNome: "",
      especialidadeSel: linha.especialidadeId ? String(linha.especialidadeId) : "",
      especialidadeNome: linha.nome || "",
      search: linha.nome || linha.servicoNome,
      isEditing: true,
      isFormActive: false,
    });
    setDropAberto(false);
  };

  const habilitarEdicao = () => setForm((prev) => ({ ...prev, isFormActive: true }));

  const termo = (form.search || "").toLowerCase().trim();
  const linhasFiltradas = (data.linhas || []).filter((l) => {
    if (!termo) return true;
    return (
      (l.nome || "").toLowerCase().includes(termo) ||
      (l.servicoNome || "").toLowerCase().includes(termo)
    );
  });

  const usandoNovoServico = form.servicoId === "__novo__";
  const usandoNovaEsp = form.especialidadeSel === "__novo__";

  // Especialidades do serviço selecionado (para o dropdown).
  const especialidadesDoServico = (data.linhas || []).filter(
    (l) => l.especialidadeId && String(l.servicoId) === String(form.servicoId)
  );

  const onSelecionarEspecialidade = (value) => {
    if (value === "__novo__") {
      setForm((prev) => ({
        ...prev,
        especialidadeSel: "__novo__",
        especialidadeNome: "",
        linha: prev.linha?.especialidadeId ? { ...prev.linha, especialidadeId: null } : prev.linha,
      }));
      return;
    }
    if (value === "") {
      setForm((prev) => ({
        ...prev,
        especialidadeSel: "",
        especialidadeNome: "",
        linha: prev.linha?.especialidadeId ? { ...prev.linha, especialidadeId: null } : prev.linha,
      }));
      return;
    }
    // Especialidade existente selecionada -> carrega para edição
    const esp = especialidadesDoServico.find((e) => String(e.especialidadeId) === String(value));
    setForm((prev) => ({
      ...prev,
      especialidadeSel: value,
      especialidadeNome: esp?.nome || "",
      linha: esp || prev.linha,
    }));
  };

  const submit = async (e) => {
    e.preventDefault();

    if (!form.servicoId) {
      await notify({ tipo: "erro", title: "Campo obrigatório", message: "Selecione ou informe o serviço." });
      return;
    }
    if (usandoNovoServico && !form.servicoNome.trim()) {
      await notify({ tipo: "erro", title: "Campo obrigatório", message: "Informe o nome do novo serviço." });
      return;
    }
    if (usandoNovaEsp && !form.especialidadeNome.trim()) {
      await notify({ tipo: "erro", title: "Campo obrigatório", message: "Informe o nome da nova especialidade." });
      return;
    }

    const ok = await confirm({
      title: form.isEditing ? "Atualizar registro" : "Cadastrar registro",
      message: form.isEditing
        ? "Deseja salvar as alterações deste registro?"
        : "Deseja confirmar este cadastro?",
      confirmText: form.isEditing ? "Atualizar" : "Cadastrar",
    });
    if (!ok) return;

    const payload = {
      servicoId: usandoNovoServico ? "" : form.servicoId,
      servicoNome: usandoNovoServico ? form.servicoNome : "",
      especialidadeNome: form.especialidadeNome,
    };

    const linhaAlvo = form.linha;
    const deveAtualizar = form.isEditing || (linhaAlvo && linhaAlvo.especialidadeId);

    const res = deveAtualizar
      ? await updateRegistro(linhaAlvo, payload)
      : await createRegistro(payload);

    if (res.success) {
      await notify({
        tipo: "sucesso",
        title: deveAtualizar ? "Registro atualizado" : "Registro cadastrado",
        message: deveAtualizar ? "Registro atualizado com sucesso!" : "Registro cadastrado com sucesso!",
      });
      reloadData();
      resetForm();
    } else {
      await notify({ tipo: "erro", title: "Erro", message: res.error });
    }
  };

  const linhasTabela = (data.linhas || []).filter((l) =>
    filterServicoId ? String(l.servicoId) === String(filterServicoId) : true
  );

  return (
    <>
      <ModalConfirmacaoExclusao
        config={deleteConfig}
        onConfirm={() => {
          if (deleteConfig?.onConfirm) deleteConfig.onConfirm();
          setDeleteConfig(null);
        }}
        onCancel={() => setDeleteConfig(null)}
      />

      <div className={styles.card}>
        <div className={styles.cardTitleRow}>
          <h3 className={styles.cardTitle}>Serviços e Especialidades</h3>
          <span className={styles.cardSubtitle}>Ex.: Ambulatório (serviço) — Fonoaudiologia (especialidade)</span>
        </div>

        {/* BUSCA */}
        <div className={styles.searchSectionContainer}>
          <div className={styles.fieldGroup}>
            <label>Buscar no Banco (Serviço ou Especialidade)</label>
            <div className={styles.searchActionRow}>
              <div className={styles.selectSearchWrapper} ref={dropRef}>
                <input
                  type="text"
                  className={styles.selectLikeInput}
                  value={form.search || ""}
                  placeholder="Selecionar ou digitar para buscar..."
                  onChange={(e) => {
                    setForm((prev) => ({ ...prev, search: e.target.value }));
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
                      <table className={styles.procTableDropdown}>
                        <thead>
                          <tr>
                            <th>Serviço</th>
                            <th>Especialidade</th>
                          </tr>
                        </thead>
                        <tbody>
                          {linhasFiltradas.length > 0 ? (
                            linhasFiltradas.map((l) => (
                              <tr
                                key={l.id}
                                onMouseDown={(ev) => {
                                  ev.preventDefault();
                                  carregarParaEdicao(l);
                                }}
                                className={form.linha?.id === l.id ? styles.selectedRow : ""}
                              >
                                <td className={styles.boldName}>{l.servicoNome}</td>
                                <td>{l.nome || "—"}</td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan="2" className={styles.noDataTd}>
                                Nenhum registro encontrado.
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
                onClick={() => setForm({ ...FORM_VAZIO, isFormActive: true })}
              >
                + Adicionar novo
              </button>
            </div>
          </div>
        </div>

        {/* FORMULÁRIO */}
        <form onSubmit={submit} className={styles.patientFormContainer}>
          <div className={styles.formSection}>
            <div className={styles.formSectionHeader}>
              <h4>Informações do Registro</h4>
            </div>
            <div className={styles.formGridStrict}>
              <div className={`${styles.fieldGroup} ${styles.colServico}`}>
                <label>Serviço *</label>
                <select
                  value={form.servicoId}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      servicoId: e.target.value,
                      servicoNome: "",
                      // troca de serviço limpa a seleção de especialidade
                      especialidadeSel: "",
                      especialidadeNome: "",
                    })
                  }
                  disabled={!form.isFormActive}
                  required
                >
                  <option value="">-- Selecione o Serviço --</option>
                  {(data.servicos || []).map((s) => (
                    <option key={s.id} value={s.id}>{s.nome}</option>
                  ))}
                  <option value="__novo__">+ Novo serviço...</option>
                </select>
              </div>

              {usandoNovoServico && (
                <div className={`${styles.fieldGroup} ${styles.colNovoServico}`}>
                  <label>Nome do Novo Serviço *</label>
                  <input
                    type="text"
                    value={form.servicoNome}
                    placeholder="Ex.: Ambulatório"
                    onChange={(e) => setForm({ ...form, servicoNome: e.target.value })}
                    disabled={!form.isFormActive}
                    required
                  />
                </div>
              )}

              <div className={`${styles.fieldGroup} ${styles.colEspName}`}>
                <label>Especialidade (opcional)</label>
                <select
                  value={form.especialidadeSel}
                  onChange={(e) => onSelecionarEspecialidade(e.target.value)}
                  disabled={!form.isFormActive || !form.servicoId}
                >
                  <option value="">-- Nenhuma / Selecione --</option>
                  {especialidadesDoServico.map((esp) => (
                    <option key={esp.especialidadeId} value={esp.especialidadeId}>{esp.nome}</option>
                  ))}
                  <option value="__novo__">+ Nova especialidade...</option>
                </select>
              </div>

              {usandoNovaEsp && (
                <div className={`${styles.fieldGroup} ${styles.colNovaEsp}`}>
                  <label>Nome da Nova Especialidade *</label>
                  <input
                    type="text"
                    value={form.especialidadeNome}
                    placeholder="Ex.: Fonoaudiologia"
                    onChange={(e) => setForm({ ...form, especialidadeNome: e.target.value })}
                    disabled={!form.isFormActive}
                    required
                  />
                </div>
              )}
            </div>
          </div>

          <div className={styles.formActions}>
            {form.isEditing && !form.isFormActive && (
              <button type="button" className={styles.primaryBtn} onClick={habilitarEdicao}>
                Editar
              </button>
            )}
            {form.isFormActive && (
              <>
                <button type="button" className={styles.btnGhost} onClick={resetForm}>
                  Cancelar
                </button>
                {form.isEditing && (
                  <button
                    type="button"
                    className={styles.btnDanger}
                    onClick={() =>
                      setDeleteConfig({
                        tipo: form.linha?.especialidadeId ? "ESPECIALIDADE" : "SERVICO",
                        nome: form.linha?.especialidadeId
                          ? form.linha.nome
                          : form.linha?.servicoNome,
                        detalhe: form.linha?.especialidadeId
                          ? `Serviço: ${form.linha.servicoNome}`
                          : undefined,
                        mensagemWarning: form.linha?.especialidadeId
                          ? "Esta ação não pode ser desfeita."
                          : "Excluir o serviço também remove as especialidades vinculadas. Esta ação não pode ser desfeita.",
                        onConfirm: async () => {
                          const res = await deleteRegistro(form.linha);
                          if (res.success) {
                            await notify({ tipo: "sucesso", title: "Registro removido", message: "Registro removido com sucesso!" });
                            reloadData();
                            resetForm();
                          } else await notify({ tipo: "erro", title: "Erro", message: res.error });
                        },
                      })
                    }
                  >
                    Excluir
                  </button>
                )}
                <button type="submit" className={styles.primaryBtn}>
                  {form.isEditing ? "Atualizar" : "Salvar"}
                </button>
              </>
            )}
          </div>
        </form>

        {/* TABELA ÚNICA */}
        <div className={styles.tableFilterContainer}>
          <div className={styles.tableHeaderFilterRow}>
            <h4 className={styles.tableSectionTitle}>Cadastros</h4>
            <div className={styles.filterGroup}>
              <label>Filtrar por Serviço:</label>
              <select
                value={filterServicoId}
                onChange={(e) => setFilterServicoId(e.target.value)}
                className={styles.filterSelect}
              >
                <option value="">-- Todos os Serviços --</option>
                {(data.servicos || []).map((s) => (
                  <option key={s.id} value={s.id}>{s.nome}</option>
                ))}
              </select>
            </div>
          </div>

          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Serviço</th>
                  <th>Especialidade</th>
                </tr>
              </thead>
              <tbody>
                {linhasTabela.map((l) => (
                  <tr key={l.id}>
                    <td><strong>{l.servicoNome}</strong></td>
                    <td>{l.nome || "—"}</td>
                  </tr>
                ))}
                {linhasTabela.length === 0 && (
                  <tr>
                    <td colSpan={2} className={styles.emptyTableTd}>
                      Nenhum registro encontrado para o serviço selecionado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
