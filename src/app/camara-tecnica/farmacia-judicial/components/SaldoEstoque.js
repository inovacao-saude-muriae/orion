'use client';

import { useState } from 'react';
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

export default function TabSaldoEstoque({
  estoqueAgrupado = [],
  estoqueLotes = [],
  catalogo = [],
  onUpdateLote = () => {},
  onCreateLote = () => {},
  loading = false,
}) {
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

  return (
    <div className={styles.card}>
      <div className={styles.headerRow}>
        <h3 className={styles.sectionTitle}>Estoque de Medicamentos</h3>
        <button type="button" className={styles.addBtn} onClick={abrirEntrada}>
          + Registrar nova entrada
        </button>
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
                        <strong className={temEstoque ? styles.positiveQty : styles.zeroQty}>
                          {med.qtdTotal}
                        </strong>
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
    </div>
  );
}
