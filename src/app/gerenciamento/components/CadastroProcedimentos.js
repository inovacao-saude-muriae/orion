"use client";

import { useState, useRef, useEffect } from "react";
import styles from "./CadastroProcedimentos.module.css";
import ModalConfirmacaoExclusao from "@/app/regulacao/components/Modals/ModalConfirmacaoExclusao";
import { useConfirm, useNotify } from "@/components/ConfirmDialog";
import BotaoEditar from "@/components/BotaoEditar";
import { createRegistro, updateRegistro, deleteRegistro } from "@/app/gerenciamento/procedimentos/actions";

const FORM_VAZIO = {
  linha: null, // linha em edição (com procedimentoId / tipoExameId)
  tipoExameId: "", // id do tipo selecionado ("__novo__" para criar)
  tipoExameNome: "", // usado quando tipoExameId === "__novo__"
  procedimentoSel: "", // valor do dropdown de procedimento ("", "__novo__" ou id)
  procedimentoNome: "", // nome do procedimento (novo ou existente em edição)
  valor: "",
  search: "",
  isEditing: false,
  isFormActive: false,
};

export default function CadastroProcedimentos({ data = { tiposExame: [], linhas: [] }, reloadData = () => {} }) {
  const confirm = useConfirm();
  const notify = useNotify();

  const [deleteConfig, setDeleteConfig] = useState(null);
  const [form, setForm] = useState(FORM_VAZIO);
  const [dropAberto, setDropAberto] = useState(false);
  const [filterTipoExameId, setFilterTipoExameId] = useState("");

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
      tipoExameId: String(linha.tipoExameId),
      tipoExameNome: "",
      procedimentoSel: linha.procedimentoId ? String(linha.procedimentoId) : "",
      procedimentoNome: linha.nome || "",
      valor: linha.valor != null ? String(linha.valor) : "",
      search: linha.nome || linha.tipoExameNome,
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
      (l.tipoExameNome || "").toLowerCase().includes(termo)
    );
  });

  const usandoNovoTipo = form.tipoExameId === "__novo__";
  const usandoNovoProc = form.procedimentoSel === "__novo__";

  // Procedimentos disponíveis para o dropdown: os do tipo de exame selecionado
  // (quando um tipo existente está escolhido); com tipo novo, não há procedimentos prévios.
  const procedimentosDoTipo = (data.linhas || []).filter(
    (l) => l.procedimentoId && String(l.tipoExameId) === String(form.tipoExameId)
  );

  // Ao escolher um procedimento no dropdown
  const onSelecionarProcedimento = (value) => {
    if (value === "__novo__") {
      setForm((prev) => ({
        ...prev,
        procedimentoSel: "__novo__",
        procedimentoNome: "",
        valor: "",
        linha: prev.linha?.procedimentoId ? { ...prev.linha, procedimentoId: null } : prev.linha,
      }));
      return;
    }
    if (value === "") {
      setForm((prev) => ({
        ...prev,
        procedimentoSel: "",
        procedimentoNome: "",
        valor: "",
        linha: prev.linha?.procedimentoId ? { ...prev.linha, procedimentoId: null } : prev.linha,
      }));
      return;
    }
    // Procedimento existente selecionado -> carrega para edição
    const proc = procedimentosDoTipo.find((p) => String(p.procedimentoId) === String(value));
    setForm((prev) => ({
      ...prev,
      procedimentoSel: value,
      procedimentoNome: proc?.nome || "",
      valor: proc?.valor != null ? String(proc.valor) : "",
      linha: proc || prev.linha,
    }));
  };

  const submit = async (e) => {
    e.preventDefault();

    if (!form.tipoExameId) {
      await notify({ tipo: "erro", title: "Campo obrigatório", message: "Selecione ou informe o tipo de exame." });
      return;
    }
    if (usandoNovoTipo && !form.tipoExameNome.trim()) {
      await notify({ tipo: "erro", title: "Campo obrigatório", message: "Informe o nome do novo tipo de exame." });
      return;
    }
    if (usandoNovoProc && !form.procedimentoNome.trim()) {
      await notify({ tipo: "erro", title: "Campo obrigatório", message: "Informe o nome do novo procedimento." });
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
      tipoExameId: usandoNovoTipo ? "" : form.tipoExameId,
      tipoExameNome: usandoNovoTipo ? form.tipoExameNome : "",
      procedimentoNome: form.procedimentoNome,
      valor: form.valor,
    };

    // Se um procedimento existente foi selecionado, a operação é uma atualização dele.
    const linhaAlvo = form.linha;
    const deveAtualizar = form.isEditing || (linhaAlvo && linhaAlvo.procedimentoId);

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
    filterTipoExameId ? String(l.tipoExameId) === String(filterTipoExameId) : true
  );

  const temProcedimentoSelecionado = usandoNovoProc || Boolean(form.procedimentoNome.trim());

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
          <h3 className={styles.cardTitle}>Exames e Procedimentos</h3>
          <span className={styles.cardSubtitle}>Ex.: Imagem (exame) — Ultrassonografia (procedimento)</span>
        </div>

        {/* BUSCA */}
        <div className={styles.searchSectionContainer}>
          <div className={styles.fieldGroup}>
            <label>Buscar no Banco (Exame ou Procedimento)</label>
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
                            <th>Tipo de Exame</th>
                            <th>Procedimento</th>
                            <th style={{ textAlign: "right" }}>Valor</th>
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
                                <td className={styles.boldName}>{l.tipoExameNome}</td>
                                <td>{l.nome || "—"}</td>
                                <td style={{ textAlign: "right" }}>
                                  {l.valor != null ? `R$ ${Number(l.valor).toFixed(2)}` : "—"}
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan="3" className={styles.noDataTd}>
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
              <div className={`${styles.fieldGroup} ${styles.colTipoExame}`}>
                <label>Tipo de Exame *</label>
                <select
                  value={form.tipoExameId}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      tipoExameId: e.target.value,
                      tipoExameNome: "",
                      // troca de tipo limpa a seleção de procedimento
                      procedimentoSel: "",
                      procedimentoNome: "",
                      valor: "",
                    })
                  }
                  disabled={!form.isFormActive}
                  required
                >
                  <option value="">-- Selecione o Tipo de Exame --</option>
                  {(data.tiposExame || []).map((t) => (
                    <option key={t.id} value={t.id}>{t.nome}</option>
                  ))}
                  <option value="__novo__">+ Novo tipo de exame...</option>
                </select>
              </div>

              {usandoNovoTipo && (
                <div className={`${styles.fieldGroup} ${styles.colNovoTipo}`}>
                  <label>Nome do Novo Tipo de Exame *</label>
                  <input
                    type="text"
                    value={form.tipoExameNome}
                    placeholder="Ex.: Imagem"
                    onChange={(e) => setForm({ ...form, tipoExameNome: e.target.value })}
                    disabled={!form.isFormActive}
                    required
                  />
                </div>
              )}

              <div className={`${styles.fieldGroup} ${styles.colProcName}`}>
                <label>Procedimento (opcional)</label>
                <select
                  value={form.procedimentoSel}
                  onChange={(e) => onSelecionarProcedimento(e.target.value)}
                  disabled={!form.isFormActive || !form.tipoExameId}
                >
                  <option value="">-- Nenhum / Selecione --</option>
                  {procedimentosDoTipo.map((p) => (
                    <option key={p.procedimentoId} value={p.procedimentoId}>{p.nome}</option>
                  ))}
                  <option value="__novo__">+ Novo procedimento...</option>
                </select>
              </div>

              {usandoNovoProc && (
                <div className={`${styles.fieldGroup} ${styles.colNovoProc}`}>
                  <label>Nome do Novo Procedimento *</label>
                  <input
                    type="text"
                    value={form.procedimentoNome}
                    placeholder="Ex.: Ultrassonografia"
                    onChange={(e) => setForm({ ...form, procedimentoNome: e.target.value })}
                    disabled={!form.isFormActive}
                    required
                  />
                </div>
              )}

              <div className={`${styles.fieldGroup} ${styles.colValor}`}>
                <label>Valor (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.valor}
                  placeholder="0,00"
                  onChange={(e) => setForm({ ...form, valor: e.target.value })}
                  disabled={!form.isFormActive || !temProcedimentoSelecionado}
                />
              </div>
            </div>
          </div>

          <div className={styles.formActions}>
            {form.isEditing && !form.isFormActive && (
              <BotaoEditar onClick={habilitarEdicao} />
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
                        tipo: form.linha?.procedimentoId ? "PROCEDIMENTO" : "SERVICO",
                        nome: form.linha?.procedimentoId
                          ? form.linha.nome
                          : form.linha?.tipoExameNome,
                        detalhe: form.linha?.procedimentoId
                          ? `Tipo de Exame: ${form.linha.tipoExameNome}`
                          : undefined,
                        mensagemWarning: form.linha?.procedimentoId
                          ? "Esta ação não pode ser desfeita."
                          : "Excluir o tipo de exame também remove os procedimentos vinculados. Esta ação não pode ser desfeita.",
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
              <label>Filtrar por Tipo de Exame:</label>
              <select
                value={filterTipoExameId}
                onChange={(e) => setFilterTipoExameId(e.target.value)}
                className={styles.filterSelect}
              >
                <option value="">-- Todos os Tipos de Exames --</option>
                {(data.tiposExame || []).map((t) => (
                  <option key={t.id} value={t.id}>{t.nome}</option>
                ))}
              </select>
            </div>
          </div>

          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Tipo de Exame</th>
                  <th>Procedimento</th>
                  <th className={styles.alignRight}>Valor (R$)</th>
                </tr>
              </thead>
              <tbody>
                {linhasTabela.map((l) => (
                  <tr key={l.id}>
                    <td><strong>{l.tipoExameNome}</strong></td>
                    <td>{l.nome || "—"}</td>
                    <td className={styles.alignRight}>
                      {l.valor != null ? `R$ ${Number(l.valor).toFixed(2)}` : "—"}
                    </td>
                  </tr>
                ))}
                {linhasTabela.length === 0 && (
                  <tr>
                    <td colSpan={3} className={styles.emptyTableTd}>
                      Nenhum registro encontrado para o tipo selecionado.
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
