'use client';

import { useState } from 'react';
import styles from './EstoqueMedicamentos.module.css';

export default function TabEstoqueMedicamentos({
  estoqueLotes,
  catalogo,
  onCreateMedicamento,
  onCreateLote,
  loading,
  subTab = 'SALDO' // Recebe da URL: 'SALDO', 'ENTRADA' ou 'CADASTRAR'
}) {
  // ── DERIVAÇÃO DIRETA DO MODO BASEADO NA PROP subTab (SEM useEffect / useState) ──
  const activeTabMode = 
    subTab === 'ENTRADA' 
      ? 'NOVO_LOTE' 
      : subTab === 'CADASTRAR' 
      ? 'NOVO_MEDICAMENTO' 
      : 'ESTOQUE_LOTE';

  // Controle de busca por digitação no lote
  const [searchMedInput, setSearchMedInput] = useState('');
  const [showMedDropdown, setShowMedDropdown] = useState(false);
  const [darEntradaEstoque, setDarEntradaEstoque] = useState(false);

  const [formMed, setFormMed] = useState({
    nome: '',
    tipo: 'Comprimido',
    dosagem: '',
    numeroLote: '',
    fornecedor: '',
    qtdInicial: '',
    valorUnitario: '',
    dataEntrada: new Date().toISOString().split('T')[0],
    dataValidade: ''
  });

  const [formLote, setFormLote] = useState({
    medicamentoId: '',
    numeroLote: '',
    fornecedor: '',
    qtdInicial: '',
    valorUnitario: '',
    dataEntrada: new Date().toISOString().split('T')[0],
    dataValidade: ''
  });

  const catalogoFiltrado = catalogo.filter((med) => {
    const termo = searchMedInput.toLowerCase();
    return (
      med.nome.toLowerCase().includes(termo) ||
      (med.dosagem && med.dosagem.toLowerCase().includes(termo)) ||
      (med.tipo && med.tipo.toLowerCase().includes(termo))
    );
  });

  const handleSelectMedicamentoLote = (med) => {
    setFormLote((prev) => ({ ...prev, medicamentoId: med.id }));
    setSearchMedInput(`${med.nome} (${med.dosagem}) - ${med.tipo}`);
    setShowMedDropdown(false);
  };

  const handleSubmitMed = async (e) => {
    e.preventDefault();
    if (!formMed.nome || !formMed.dosagem) {
      return alert('Preencha o nome e a dosagem do medicamento.');
    }

    if (darEntradaEstoque) {
      if (!formMed.numeroLote || !formMed.fornecedor || !formMed.qtdInicial || !formMed.dataValidade) {
        return alert('Preencha todos os campos do lote para dar entrada no estoque.');
      }
    }

    await onCreateMedicamento({
      ...formMed,
      darEntradaEstoque
    });

    setFormMed({
      nome: '',
      tipo: 'Comprimido',
      dosagem: '',
      numeroLote: '',
      fornecedor: '',
      qtdInicial: '',
      valorUnitario: '',
      dataEntrada: new Date().toISOString().split('T')[0],
      dataValidade: ''
    });
    setDarEntradaEstoque(false);
  };

  const handleSubmitLote = async (e) => {
    e.preventDefault();
    if (
      !formLote.medicamentoId ||
      !formLote.numeroLote ||
      !formLote.fornecedor ||
      !formLote.qtdInicial ||
      !formLote.dataValidade
    ) {
      return alert('Selecione o medicamento e preencha os campos obrigatórios da entrada de lote.');
    }

    await onCreateLote(formLote);
    setFormLote({
      medicamentoId: '',
      numeroLote: '',
      fornecedor: '',
      qtdInicial: '',
      valorUnitario: '',
      dataEntrada: new Date().toISOString().split('T')[0],
      dataValidade: ''
    });
    setSearchMedInput('');
  };

  return (
    <div className={styles.card}>
      {/* 1. VISUALIZAR SALDO DE ESTOQUE */}
      {activeTabMode === 'ESTOQUE_LOTE' && (
        <div>
          <h3 className={styles.sectionTitle}>Estoque Físico e Saldos Disponíveis</h3>

          {loading ? (
            <div className={styles.loadingBox}>Carregando estoque...</div>
          ) : (
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Medicamento</th>
                    <th>Tipo / Dosagem</th>
                    <th>Nº Lote</th>
                    <th>Fornecedor</th>
                    <th>Data Validade</th>
                    <th>Qtd Inicial</th>
                    <th>Saldo Atual</th>
                    <th>Valor Unit. (R$)</th>
                  </tr>
                </thead>
                <tbody>
                  {estoqueLotes.length === 0 ? (
                    <tr>
                      <td colSpan="8" style={{ textAlign: 'center', color: '#64748b' }}>
                        Nenhum lote em estoque. Dê entrada em um novo lote para iniciar.
                      </td>
                    </tr>
                  ) : (
                    estoqueLotes.map((item) => (
                      <tr key={item.loteId}>
                        <td><strong>{item.medicamentoNome}</strong></td>
                        <td>{item.tipo} - {item.dosagem}</td>
                        <td>{item.numeroLote}</td>
                        <td>{item.fornecedor}</td>
                        <td>{item.dataValidade}</td>
                        <td>{item.qtdInicial}</td>
                        <td>
                          <strong className={item.qtdAtual > 0 ? styles.positiveQty : styles.zeroQty}>
                            {item.qtdAtual}
                          </strong>
                        </td>
                        <td>R$ {Number(item.valorUnitario || 0).toFixed(2)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 2. REGISTRAR ENTRADA DE LOTE */}
      {activeTabMode === 'NOVO_LOTE' && (
        <div>
          <h3 className={styles.sectionTitle}>Entrada de Novo Lote no Estoque</h3>

          <form onSubmit={handleSubmitLote} className={styles.formGrid}>
            <div className={styles.fieldGroup} style={{ position: 'relative' }}>
              <label>Medicamento do Catálogo *</label>
              <input
                type="text"
                placeholder="Digite para pesquisar medicamento no catálogo..."
                value={searchMedInput}
                onChange={(e) => {
                  setSearchMedInput(e.target.value);
                  setFormLote((prev) => ({ ...prev, medicamentoId: '' }));
                  setShowMedDropdown(true);
                }}
                onFocus={() => setShowMedDropdown(true)}
                required
              />

              {showMedDropdown && catalogoFiltrado.length > 0 && (
                <ul className={styles.suggestionsList}>
                  {catalogoFiltrado.map((med) => (
                    <li
                      key={med.id}
                      className={styles.suggestionItem}
                      onClick={() => handleSelectMedicamentoLote(med)}
                    >
                      <strong>{med.nome}</strong> ({med.dosagem}) - {med.tipo}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className={styles.fieldGroup}>
              <label>Número do Lote *</label>
              <input
                type="text"
                placeholder="Ex: LOTE-2026-X"
                value={formLote.numeroLote}
                onChange={(e) => setFormLote({ ...formLote, numeroLote: e.target.value })}
                required
              />
            </div>

            <div className={styles.fieldGroup}>
              <label>Fornecedor / Fabricante *</label>
              <input
                type="text"
                placeholder="Ex: Eurofarma Laboratórios"
                value={formLote.fornecedor}
                onChange={(e) => setFormLote({ ...formLote, fornecedor: e.target.value })}
                required
              />
            </div>

            <div className={styles.fieldGroup}>
              <label>Quantidade Inicial Adquirida *</label>
              <input
                type="number"
                min="1"
                placeholder="Ex: 500"
                value={formLote.qtdInicial}
                onChange={(e) => setFormLote({ ...formLote, qtdInicial: e.target.value })}
                required
              />
            </div>

            <div className={styles.fieldGroup}>
              <label>Valor Unitário (R$)</label>
              <input
                type="number"
                step="0.01"
                placeholder="Ex: 12.50"
                value={formLote.valorUnitario}
                onChange={(e) => setFormLote({ ...formLote, valorUnitario: e.target.value })}
              />
            </div>

            <div className={styles.fieldGroup}>
              <label>Data de Entrada *</label>
              <input
                type="date"
                value={formLote.dataEntrada}
                onChange={(e) => setFormLote({ ...formLote, dataEntrada: e.target.value })}
                required
              />
            </div>

            <div className={styles.fieldGroup}>
              <label>Data de Validade *</label>
              <input
                type="date"
                value={formLote.dataValidade}
                onChange={(e) => setFormLote({ ...formLote, dataValidade: e.target.value })}
                required
              />
            </div>

            <div className={`${styles.fullWidth} ${styles.formActions}`}>
              <button type="submit" className={styles.primaryBtn}>
                Confirmar Entrada do Lote
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 3. CADASTRAR NOVO MEDICAMENTO */}
      {activeTabMode === 'NOVO_MEDICAMENTO' && (
        <div>
          <h3 className={styles.sectionTitle}>Cadastrar Novo Medicamento no Catálogo</h3>

          <form onSubmit={handleSubmitMed} className={styles.formGrid}>
            <div className={styles.fieldGroup}>
              <label>Nome do Medicamento *</label>
              <input
                type="text"
                placeholder="Ex: Insulina Glargina"
                value={formMed.nome}
                onChange={(e) => setFormMed({ ...formMed, nome: e.target.value })}
                required
              />
            </div>

            <div className={styles.fieldGroup}>
              <label>Tipo / Forma Farmacêutica *</label>
              <select value={formMed.tipo} onChange={(e) => setFormMed({ ...formMed, tipo: e.target.value })}>
                <option value="Comprimido">Comprimido / Drágea</option>
                <option value="Injetável / Caneta">Injetável / Caneta</option>
                <option value="Xarope / Solução">Xarope / Solução Oral</option>
                <option value="Pomada / Creme">Pomada / Creme</option>
                <option value="Frasco / Gotas">Frasco / Gotas</option>
              </select>
            </div>

            <div className={styles.fieldGroup}>
              <label>Dosagem / Concentração *</label>
              <input
                type="text"
                placeholder="Ex: 100 UI/ml ou 500mg"
                value={formMed.dosagem}
                onChange={(e) => setFormMed({ ...formMed, dosagem: e.target.value })}
                required
              />
            </div>

            <div className={`${styles.fullWidth}`} style={{ marginTop: '0.5rem', marginBottom: '0.5rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 600, color: '#1e293b' }}>
                <input
                  type="checkbox"
                  checked={darEntradaEstoque}
                  onChange={(e) => setDarEntradaEstoque(e.target.checked)}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
                Deseja dar entrada no estoque (lote) deste medicamento agora?
              </label>
            </div>

            {darEntradaEstoque && (
              <>
                <div className={styles.fieldGroup}>
                  <label>Número do Lote *</label>
                  <input
                    type="text"
                    placeholder="Ex: LOTE-2026-X"
                    value={formMed.numeroLote}
                    onChange={(e) => setFormMed({ ...formMed, numeroLote: e.target.value })}
                    required={darEntradaEstoque}
                  />
                </div>

                <div className={styles.fieldGroup}>
                  <label>Fornecedor / Fabricante *</label>
                  <input
                    type="text"
                    placeholder="Ex: Eurofarma Laboratórios"
                    value={formMed.fornecedor}
                    onChange={(e) => setFormMed({ ...formMed, fornecedor: e.target.value })}
                    required={darEntradaEstoque}
                  />
                </div>

                <div className={styles.fieldGroup}>
                  <label>Quantidade Inicial Adquirida *</label>
                  <input
                    type="number"
                    min="1"
                    placeholder="Ex: 500"
                    value={formMed.qtdInicial}
                    onChange={(e) => setFormMed({ ...formMed, qtdInicial: e.target.value })}
                    required={darEntradaEstoque}
                  />
                </div>

                <div className={styles.fieldGroup}>
                  <label>Valor Unitário (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Ex: 12.50"
                    value={formMed.valorUnitario}
                    onChange={(e) => setFormMed({ ...formMed, valorUnitario: e.target.value })}
                  />
                </div>

                <div className={styles.fieldGroup}>
                  <label>Data de Entrada *</label>
                  <input
                    type="date"
                    value={formMed.dataEntrada}
                    onChange={(e) => setFormMed({ ...formMed, dataEntrada: e.target.value })}
                    required={darEntradaEstoque}
                  />
                </div>

                <div className={styles.fieldGroup}>
                  <label>Data de Validade *</label>
                  <input
                    type="date"
                    value={formMed.dataValidade}
                    onChange={(e) => setFormMed({ ...formMed, dataValidade: e.target.value })}
                    required={darEntradaEstoque}
                  />
                </div>
              </>
            )}

            <div className={`${styles.fullWidth} ${styles.formActions}`}>
              <button type="submit" className={styles.primaryBtn}>
                {darEntradaEstoque ? 'Salvar no Catálogo e Dar Entrada no Estoque' : 'Salvar no Catálogo'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}