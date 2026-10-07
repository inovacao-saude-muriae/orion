'use client';

import { useState } from 'react';
import * as XLSX from 'xlsx';
import styles from './SaldoEstoque.module.css';

const LOTE_VAZIO = {
  numeroLote: '',
  fornecedor: '',
  qtdInicial: '',
  valorUnitario: '',
  dataEntrada: '',
  dataValidade: '',
};

const hoje = () => new Date().toISOString().split('T')[0];

const NOVA_ENTRADA_VAZIA = {
  medicamentoId: '',
  qtdInicial: '',
  valorUnitario: '',
  dataEntrada: hoje(),
  fornecedor: '',
  numeroLote: '',
  dataValidade: '',
};

// dd/mm/aaaa (exibição) a partir de aaaa-mm-dd (banco)
const formatBR = (iso) => {
  if (!iso) return '—';
  const [a, m, d] = iso.split('-');
  if (!a || !m || !d) return iso;
  return `${d}/${m}/${a}`;
};

// Helper para gerar download de planilha com 1 aba
const baixarPlanilhaSimples = (dadosFormatados, nomeAba, nomeArquivo) => {
  if (!dadosFormatados || dadosFormatados.length === 0) {
    return alert('Nenhum dado para exportar.');
  }
  const worksheet = XLSX.utils.json_to_sheet(dadosFormatados);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, nomeAba);
  worksheet['!cols'] = Object.keys(dadosFormatados[0]).map((key) => ({
    wch: Math.max(key.length + 5, 18),
  }));
  XLSX.writeFile(workbook, nomeArquivo);
};

export default function TabSaldoEstoque({
  estoqueAgrupado = [],
  estoqueLotes = [],
  catalogo = [],
  onUpdateLote = () => {},
  onCreateLote = () => {},
  onAjustarEstoque = () => {},
  onGetAjustes = async () => [],
  loading = false,
}) {
  // Ajuste de estoque (saldo) por medicamento.
  const [ajusteMed, setAjusteMed] = useState(null); // medicamento selecionado
  const [ajusteTab, setAjusteTab] = useState('AJUSTAR'); // 'AJUSTAR' | 'HISTORICO'
  const [novoSaldo, setNovoSaldo] = useState('');
  const [justificativa, setJustificativa] = useState('');
  const [salvandoAjuste, setSalvandoAjuste] = useState(false);
  const [ajustes, setAjustes] = useState([]);
  const [carregandoAjustes, setCarregandoAjustes] = useState(false);

  const abrirAjuste = (med) => {
    setAjusteMed(med);
    setAjusteTab('AJUSTAR');
    setNovoSaldo(String(med.qtdTotal ?? 0));
    setJustificativa('');
    setAjustes([]);
  };

  const fecharAjuste = () => {
    setAjusteMed(null);
    setNovoSaldo('');
    setJustificativa('');
    setAjustes([]);
  };

  const carregarHistoricoAjustes = async (med) => {
    setCarregandoAjustes(true);
    const lista = await onGetAjustes(med.medicamentoId);
    setAjustes(Array.isArray(lista) ? lista : []);
    setCarregandoAjustes(false);
  };

  const trocarTabAjuste = (tab) => {
    setAjusteTab(tab);
    if (tab === 'HISTORICO' && ajusteMed) {
      carregarHistoricoAjustes(ajusteMed);
    }
  };

  const confirmarAjuste = async () => {
    if (justificativa.trim() === '') return alert('Informe a justificativa.');
    setSalvandoAjuste(true);
    const res = await onAjustarEstoque(ajusteMed.medicamentoId, {
      saldoNovo: novoSaldo,
      justificativa: justificativa.trim(),
    });
    setSalvandoAjuste(false);
    if (res?.success !== false) fecharAjuste();
  };

  // Medicamento cujo histórico está aberto (null = fechado).
  const [historicoMed, setHistoricoMed] = useState(null);
  // Id do lote em edição no histórico.
  const [editandoLoteId, setEditandoLoteId] = useState(null);
  const [formLote, setFormLote] = useState(LOTE_VAZIO);
  const [salvando, setSalvando] = useState(false);

  // Modal de nova entrada de estoque.
  const [showEntrada, setShowEntrada] = useState(false);
  const [formEntrada, setFormEntrada] = useState(NOVA_ENTRADA_VAZIA);
  const [salvandoEntrada, setSalvandoEntrada] = useState(false);

  const abrirEntrada = () => {
    setFormEntrada(NOVA_ENTRADA_VAZIA);
    setShowEntrada(true);
  };

  const fecharEntrada = () => {
    setShowEntrada(false);
    setFormEntrada(NOVA_ENTRADA_VAZIA);
  };

  const salvarEntrada = async (e) => {
    e.preventDefault();
    if (!formEntrada.medicamentoId) return alert('Selecione o medicamento.');
    if (!formEntrada.qtdInicial) return alert('Informe a quantidade.');
    if (!formEntrada.numeroLote || !formEntrada.fornecedor)
      return alert('Informe o lote e o fornecedor.');
    if (!formEntrada.dataEntrada || !formEntrada.dataValidade)
      return alert('Informe a data de entrada e a validade.');

    setSalvandoEntrada(true);
    const res = await onCreateLote(formEntrada);
    setSalvandoEntrada(false);
    if (res?.success !== false) fecharEntrada();
  };

  const lotesDoMedicamento = historicoMed
    ? estoqueLotes.filter(
        (l) => String(l.medicamentoId) === String(historicoMed.medicamentoId),
      )
    : [];

  const abrirHistorico = (med) => {
    setHistoricoMed(med);
    setEditandoLoteId(null);
    setFormLote(LOTE_VAZIO);
  };

  const fecharHistorico = () => {
    setHistoricoMed(null);
    setEditandoLoteId(null);
    setFormLote(LOTE_VAZIO);
  };

  const iniciarEdicao = (lote) => {
    setEditandoLoteId(lote.loteId);
    setFormLote({
      numeroLote: lote.numeroLote || '',
      fornecedor: lote.fornecedor || '',
      qtdInicial: lote.qtdInicial ?? '',
      valorUnitario: lote.valorUnitario ?? '',
      dataEntrada: lote.dataEntrada || '',
      dataValidade: lote.dataValidade || '',
    });
  };

  const cancelarEdicao = () => {
    setEditandoLoteId(null);
    setFormLote(LOTE_VAZIO);
  };

  const salvarEdicao = async (loteId) => {
    setSalvando(true);
    const res = await onUpdateLote(loteId, formLote);
    setSalvando(false);
    if (res?.success !== false) {
      setEditandoLoteId(null);
      setFormLote(LOTE_VAZIO);
    }
  };

  // ── EXPORTAÇÃO CONSOLIDADA EM EXCEL (2 ABAS: SALDO + AJUSTES MANUAIS) ──
  const exportarEstoqueEAjustesExcel = async () => {
    if (estoqueAgrupado.length === 0) {
      return alert('Nenhum medicamento cadastrado para exportar.');
    }

    // 1. Formata dados da Aba 1: Saldo de Estoque
    const dadosEstoque = estoqueAgrupado.map((med) => {
      const temEstoque = Number(med.qtdTotal) > 0;
      return {
        Medicamento: med.medicamentoNome || '—',
        Concentração: med.dosagem || '—',
        Tipo: med.tipo || '—',
        'Qtd. em Estoque': Number(med.qtdTotal || 0),
        'Valor Unitário (R$)': Number(med.valorUnitario || 0),
        'Valor Total (R$)': Number(med.qtdTotal || 0) * Number(med.valorUnitario || 0),
        Status: temEstoque ? 'Com estoque' : 'Sem estoque',
      };
    });

    // 2. Busca e formata dados da Aba 2: Histórico de Ajustes Manuais
    let todosAjustes = [];
    if (typeof onGetAjustes === 'function') {
      try {
        const res = await onGetAjustes();
        if (Array.isArray(res)) {
          todosAjustes = res;
        } else if (ajustes.length > 0) {
          todosAjustes = ajustes;
        }
      } catch (err) {
        console.error('Erro ao buscar ajustes para relatório:', err);
      }
    }

    const dadosAjustes = todosAjustes.map((a) => ({
      Medicamento: a.medicamentoNome || ajusteMed?.medicamentoNome || '—',
      Data: a.dataAjuste || '—',
      'Saldo Anterior': Number(a.saldoAnterior || 0),
      'Novo Saldo': Number(a.saldoNovo || 0),
      Diferença: Number(a.delta) >= 0 ? `+${a.delta}` : `${a.delta}`,
      Justificativa: a.justificativa || '—',
      Responsável: a.responsavel || '—',
    }));

    // 3. Monta a planilha com 2 abas
    const workbook = XLSX.utils.book_new();

    const wsEstoque = XLSX.utils.json_to_sheet(dadosEstoque);
    wsEstoque['!cols'] = Object.keys(dadosEstoque[0] || {}).map((key) => ({
      wch: Math.max(key.length + 5, 18),
    }));
    XLSX.utils.book_append_sheet(workbook, wsEstoque, 'Saldo de Estoque');

    if (dadosAjustes.length > 0) {
      const wsAjustes = XLSX.utils.json_to_sheet(dadosAjustes);
      wsAjustes['!cols'] = Object.keys(dadosAjustes[0] || {}).map((key) => ({
        wch: Math.max(key.length + 5, 18),
      }));
      XLSX.utils.book_append_sheet(workbook, wsAjustes, 'Ajustes Manuais');
    }

    // 4. Efetua o download do arquivo .xlsx
    const dataHoje = hoje();
    XLSX.writeFile(workbook, `Relatorio_Estoque_e_Ajustes_${dataHoje}.xlsx`);
  };

  // ── EXPORTAR HISTÓRICO DE AJUSTES APENAS DO MEDICAMENTO SELECIONADO NA MODAL ──
  const exportarAjustesMedicamentoEspecifico = async () => {
    if (!ajusteMed) return;

    let listaParaExportar = ajustes;

    if (listaParaExportar.length === 0) {
      setCarregandoAjustes(true);
      const res = await onGetAjustes(ajusteMed.medicamentoId);
      listaParaExportar = Array.isArray(res) ? res : [];
      setAjustes(listaParaExportar);
      setCarregandoAjustes(false);
    }

    if (listaParaExportar.length === 0) {
      return alert('Nenhum ajuste registrado para este medicamento.');
    }

    const dadosFormatados = listaParaExportar.map((a) => ({
      Medicamento: ajusteMed.medicamentoNome || '—',
      Data: a.dataAjuste || '—',
      'Saldo Anterior': Number(a.saldoAnterior || 0),
      'Novo Saldo': Number(a.saldoNovo || 0),
      Diferença: a.delta >= 0 ? `+${a.delta}` : `${a.delta}`,
      Justificativa: a.justificativa || '—',
      Responsável: a.responsavel || '—',
    }));

    const nomeMed = (ajusteMed.medicamentoNome || 'Medicamento').replace(/[^a-zA-Z0-9]/g, '_');
    baixarPlanilhaSimples(dadosFormatados, 'Ajustes', `Ajustes_Estoque_${nomeMed}.xlsx`);
  };

  return (
    <div className={styles.card}>
      <div className={styles.headerRow}>
        <h3 className={styles.sectionTitle}>Estoque de Medicamentos</h3>

        {/* BOTÃO DE EXPORTAR CONSOLIDADO (SALDO + AJUSTES) E REGISTRAR ENTRADA */}
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            type="button"
            className={styles.exportExcelBtn}
            onClick={exportarEstoqueEAjustesExcel}
            disabled={loading || estoqueAgrupado.length === 0}
          >
            <svg
              className={styles.exportIcon}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            <span>Exportar Excel</span>
          </button>

          <button type="button" className={styles.addBtn} onClick={abrirEntrada}>
            Cadastrar nova entrada
          </button>
        </div>
      </div>

      {loading ? (
        <div className={styles.loadingBox}>Carregando estoque...</div>
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Medicamento</th>
                <th>Concentração</th>
                <th>Tipo</th>
                <th>Qtd. em estoque</th>
                <th>Valor Unit. (R$)</th>
                <th>Status</th>
                <th style={{ textAlign: 'center' }}>Histórico</th>
              </tr>
            </thead>
            <tbody>
              {estoqueAgrupado.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', color: '#64748b' }}>
                    Nenhum medicamento cadastrado. Cadastre e dê entrada em um lote.
                  </td>
                </tr>
              ) : (
                estoqueAgrupado.map((med) => {
                  const temEstoque = Number(med.qtdTotal) > 0;
                  return (
                    <tr key={med.medicamentoId}>
                      <td><strong>{med.medicamentoNome}</strong></td>
                      <td>{med.dosagem || '—'}</td>
                      <td>{med.tipo || '—'}</td>
                      <td>
                        <button
                          type="button"
                          className={styles.qtyBtn}
                          onClick={() => abrirAjuste(med)}
                          title="Ajustar saldo"
                        >
                          <strong className={temEstoque ? styles.positiveQty : styles.zeroQty}>
                            {med.qtdTotal}
                          </strong>
                        </button>
                      </td>
                      <td>R$ {Number(med.valorUnitario || 0).toFixed(2)}</td>
                      <td>
                        <span
                          className={`${styles.statusBadge} ${
                            temEstoque ? styles.statusOk : styles.statusEmpty
                          }`}
                        >
                          {temEstoque ? 'Com estoque' : 'Sem estoque'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          type="button"
                          className={styles.historyBtn}
                          onClick={() => abrirHistorico(med)}
                        >
                          Histórico
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL DE HISTÓRICO DE ENTRADAS DO MEDICAMENTO */}
      {historicoMed && (
        <div className={styles.modalOverlay} onClick={fecharHistorico}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div>
                <h3 className={styles.modalTitle}>Histórico de entradas</h3>
                <p className={styles.modalSubtitle}>
                  {historicoMed.medicamentoNome}
                  {historicoMed.dosagem ? ` — ${historicoMed.dosagem}` : ''}
                </p>
              </div>
              <button type="button" className={styles.modalClose} onClick={fecharHistorico}>
                ✕
              </button>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Data Entrada</th>
                      <th>Validade</th>
                      <th>Lote</th>
                      <th>Qtd</th>
                      <th>Valor Unit.</th>
                      <th>Fornecedor</th>
                      <th style={{ textAlign: 'center' }}>Ação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lotesDoMedicamento.length === 0 ? (
                      <tr>
                        <td colSpan="7" style={{ textAlign: 'center', color: '#64748b' }}>
                          Nenhuma entrada registrada para este medicamento.
                        </td>
                      </tr>
                    ) : (
                      lotesDoMedicamento.map((lote) => {
                        const emEdicao = editandoLoteId === lote.loteId;
                        if (!emEdicao) {
                          return (
                            <tr key={lote.loteId}>
                              <td>{formatBR(lote.dataEntrada)}</td>
                              <td>{formatBR(lote.dataValidade)}</td>
                              <td>{lote.numeroLote}</td>
                              <td>{lote.qtdInicial}</td>
                              <td>R$ {Number(lote.valorUnitario || 0).toFixed(2)}</td>
                              <td>{lote.fornecedor}</td>
                              <td style={{ textAlign: 'center' }}>
                                <button
                                  type="button"
                                  className={styles.editBtn}
                                  onClick={() => iniciarEdicao(lote)}
                                >
                                  Editar
                                </button>
                              </td>
                            </tr>
                          );
                        }
                        return (
                          <tr key={lote.loteId} className={styles.editingRow}>
                            <td>
                              <input
                                type="date"
                                className={styles.cellInput}
                                value={formLote.dataEntrada}
                                onChange={(e) =>
                                  setFormLote({ ...formLote, dataEntrada: e.target.value })
                                }
                              />
                            </td>
                            <td>
                              <input
                                type="date"
                                className={styles.cellInput}
                                value={formLote.dataValidade}
                                onChange={(e) =>
                                  setFormLote({ ...formLote, dataValidade: e.target.value })
                                }
                              />
                            </td>
                            <td>
                              <input
                                type="text"
                                className={styles.cellInput}
                                value={formLote.numeroLote}
                                onChange={(e) =>
                                  setFormLote({ ...formLote, numeroLote: e.target.value })
                                }
                              />
                            </td>
                            <td>
                              <input
                                type="number"
                                min="0"
                                className={styles.cellInputSmall}
                                value={formLote.qtdInicial}
                                onChange={(e) =>
                                  setFormLote({ ...formLote, qtdInicial: e.target.value })
                                }
                              />
                            </td>
                            <td>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                className={styles.cellInputSmall}
                                value={formLote.valorUnitario}
                                onChange={(e) =>
                                  setFormLote({ ...formLote, valorUnitario: e.target.value })
                                }
                              />
                            </td>
                            <td>
                              <input
                                type="text"
                                className={styles.cellInput}
                                value={formLote.fornecedor}
                                onChange={(e) =>
                                  setFormLote({ ...formLote, fornecedor: e.target.value })
                                }
                              />
                            </td>
                            <td className={styles.editActionsCell}>
                              <button
                                type="button"
                                className={styles.saveBtn}
                                onClick={() => salvarEdicao(lote.loteId)}
                                disabled={salvando}
                              >
                                {salvando ? '...' : 'Salvar'}
                              </button>
                              <button
                                type="button"
                                className={styles.cancelBtn}
                                onClick={cancelarEdicao}
                                disabled={salvando}
                              >
                                Cancelar
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE NOVA ENTRADA DE ESTOQUE */}
      {showEntrada && (
        <div className={styles.modalOverlay} onClick={fecharEntrada}>
          <div className={styles.modalNarrow} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Registrar nova entrada</h3>
              <button type="button" className={styles.modalClose} onClick={fecharEntrada}>
                ✕
              </button>
            </div>

            <form onSubmit={salvarEntrada} className={styles.entradaBody}>
              <div className={styles.fieldGroup}>
                <label>Medicamento *</label>
                <select
                  value={formEntrada.medicamentoId}
                  onChange={(e) =>
                    setFormEntrada({ ...formEntrada, medicamentoId: e.target.value })
                  }
                  required
                >
                  <option value="">-- Selecione o medicamento --</option>
                  {catalogo.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.nome}{m.dosagem ? ` (${m.dosagem})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.entradaGrid}>
                <div className={styles.fieldGroup}>
                  <label>Quantidade *</label>
                  <input
                    type="number"
                    min="1"
                    placeholder="Ex: 500"
                    value={formEntrada.qtdInicial}
                    onChange={(e) =>
                      setFormEntrada({ ...formEntrada, qtdInicial: e.target.value })
                    }
                    required
                  />
                </div>

                <div className={styles.fieldGroup}>
                  <label>Valor Unitário (R$)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Ex: 12.50"
                    value={formEntrada.valorUnitario}
                    onChange={(e) =>
                      setFormEntrada({ ...formEntrada, valorUnitario: e.target.value })
                    }
                  />
                </div>

                <div className={styles.fieldGroup}>
                  <label>Data de Entrada *</label>
                  <input
                    type="date"
                    value={formEntrada.dataEntrada}
                    onChange={(e) =>
                      setFormEntrada({ ...formEntrada, dataEntrada: e.target.value })
                    }
                    required
                  />
                </div>

                <div className={styles.fieldGroup}>
                  <label>Fornecedor *</label>
                  <input
                    type="text"
                    placeholder="Ex: Eurofarma"
                    value={formEntrada.fornecedor}
                    onChange={(e) =>
                      setFormEntrada({ ...formEntrada, fornecedor: e.target.value })
                    }
                    required
                  />
                </div>

                <div className={styles.fieldGroup}>
                  <label>Lote *</label>
                  <input
                    type="text"
                    placeholder="Ex: LOTE-2026-X"
                    value={formEntrada.numeroLote}
                    onChange={(e) =>
                      setFormEntrada({ ...formEntrada, numeroLote: e.target.value })
                    }
                    required
                  />
                </div>

                <div className={styles.fieldGroup}>
                  <label>Validade *</label>
                  <input
                    type="date"
                    value={formEntrada.dataValidade}
                    onChange={(e) =>
                      setFormEntrada({ ...formEntrada, dataValidade: e.target.value })
                    }
                    required
                  />
                </div>
              </div>

              <div className={styles.entradaActions}>
                <button
                  type="button"
                  className={styles.cancelBtn}
                  onClick={fecharEntrada}
                  disabled={salvandoEntrada}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className={styles.saveBtn}
                  disabled={salvandoEntrada}
                >
                  {salvandoEntrada ? 'Salvando...' : 'Registrar entrada'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE AJUSTE DE ESTOQUE (SALDO) */}
      {ajusteMed && (
        <div className={styles.modalOverlay} onClick={fecharAjuste}>
          <div className={styles.ajusteModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.ajusteHeader}>
              <div>
                <h3 className={styles.ajusteTitle}>Ajuste de Estoque</h3>
                <p className={styles.ajusteSubtitle}>{ajusteMed.medicamentoNome}</p>
              </div>
              <button type="button" className={styles.ajusteClose} onClick={fecharAjuste}>
                ✕
              </button>
            </div>

            <div className={styles.ajusteTabs} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  className={`${styles.ajusteTab} ${ajusteTab === 'AJUSTAR' ? styles.ajusteTabActive : ''}`}
                  onClick={() => trocarTabAjuste('AJUSTAR')}
                >
                  Ajustar Saldo
                </button>
                <button
                  type="button"
                  className={`${styles.ajusteTab} ${ajusteTab === 'HISTORICO' ? styles.ajusteTabActive : ''}`}
                  onClick={() => trocarTabAjuste('HISTORICO')}
                >
                  Histórico
                </button>
              </div>

              {/* BOTÃO EXPORTAR AJUSTES DAQUELE MEDICAMENTO EM EXCEL */}
              {ajusteTab === 'HISTORICO' && (
                <button
                  type="button"
                  onClick={exportarAjustesMedicamentoEspecifico}
                  className={styles.historyBtn}
                  disabled={carregandoAjustes}
                  style={{ backgroundColor: '#16a34a', color: '#fff' }}
                >
                  Exportar Ajustes (Excel)
                </button>
              )}
            </div>

            {ajusteTab === 'AJUSTAR' ? (
              <div className={styles.ajusteBody}>
                <div className={styles.saldoRow}>
                  <div className={styles.saldoCard}>
                    <span className={styles.saldoLabel}>SALDO ATUAL</span>
                    <span className={styles.saldoValor}>{ajusteMed.qtdTotal}</span>
                    <span className={styles.saldoUnidade}>unidades</span>
                  </div>
                  <span className={styles.saldoArrow}>→</span>
                  <div className={`${styles.saldoCard} ${styles.saldoCardNovo}`}>
                    <span className={styles.saldoLabelNovo}>NOVO SALDO</span>
                    <input
                      type="number"
                      min="0"
                      className={styles.saldoInput}
                      value={novoSaldo}
                      onChange={(e) => setNovoSaldo(e.target.value)}
                    />
                    <span className={styles.saldoUnidade}>unidades</span>
                  </div>
                </div>

                <div className={styles.fieldGroup}>
                  <label>Justificativa *</label>
                  <textarea
                    rows={3}
                    placeholder="Ex.: Conferência física, vencimento de lote, perda, etc."
                    value={justificativa}
                    onChange={(e) => setJustificativa(e.target.value)}
                  />
                </div>

                <p className={styles.ajusteNote}>
                  O ajuste fica registrado com data e responsável.
                </p>

                <div className={styles.entradaActions}>
                  <button
                    type="button"
                    className={styles.cancelBtn}
                    onClick={fecharAjuste}
                    disabled={salvandoAjuste}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    className={styles.confirmarBtn}
                    onClick={confirmarAjuste}
                    disabled={salvandoAjuste}
                  >
                    {salvandoAjuste ? 'Salvando...' : 'Confirmar Ajuste'}
                  </button>
                </div>
              </div>
            ) : (
              <div className={styles.ajusteBody}>
                <div className={styles.tableWrapper}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Data</th>
                        <th>Saldo ant.</th>
                        <th>Novo saldo</th>
                        <th>Justificativa</th>
                        <th>Responsável</th>
                      </tr>
                    </thead>
                    <tbody>
                      {carregandoAjustes ? (
                        <tr>
                          <td colSpan="5" style={{ textAlign: 'center', color: '#64748b' }}>
                            Carregando histórico...
                          </td>
                        </tr>
                      ) : ajustes.length === 0 ? (
                        <tr>
                          <td colSpan="5" style={{ textAlign: 'center', color: '#64748b' }}>
                            Nenhum ajuste registrado.
                          </td>
                        </tr>
                      ) : (
                        ajustes.map((a) => (
                          <tr key={a.id}>
                            <td>{a.dataAjuste}</td>
                            <td>{a.saldoAnterior}</td>
                            <td>
                              <strong>{a.saldoNovo}</strong>{' '}
                              <span className={a.delta >= 0 ? styles.positiveQty : styles.zeroQty}>
                                ({a.delta >= 0 ? '+' : ''}{a.delta})
                              </span>
                            </td>
                            <td>{a.justificativa}</td>
                            <td>{a.responsavel || '—'}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}