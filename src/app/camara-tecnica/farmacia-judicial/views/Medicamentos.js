'use client';

import { useState } from 'react';
import { useConfirm } from '@/components/ConfirmDialog';
import styles from './Medicamentos.module.css';

const UNIDADES = ['mg', 'ml'];
const TIPOS = ['Comprimido', 'Bisnaga', 'Frasco', 'Ampola', 'Sachê', 'Unidade'];

const FORM_VAZIO = {
  nome: '',
  concentracaoValor: '',
  concentracaoUnidade: 'mg',
  tipo: 'Comprimido',
};

// Divide "500 mg" em { valor: "500", unidade: "mg" }.
const parseDosagem = (dosagem) => {
  if (!dosagem) return { valor: '', unidade: 'mg' };
  const m = String(dosagem).trim().match(/^([\d.,]+)\s*(mg|ml)?$/i);
  if (!m) return { valor: dosagem, unidade: 'mg' };
  return {
    valor: m[1] || '',
    unidade: (m[2] || 'mg').toLowerCase(),
  };
};

export default function TabMedicamentos({
  catalogo = [],
  onCreateMedicamento = () => {},
  onUpdateMedicamento = () => {},
  loading = false,
}) {
  const confirm = useConfirm();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null); // null = novo cadastro
  const [form, setForm] = useState(FORM_VAZIO);
  const [salvando, setSalvando] = useState(false);

  const abrirNovo = () => {
    setEditId(null);
    setForm(FORM_VAZIO);
    setShowForm(true);
  };

  const abrirEdicao = (med) => {
    const { valor, unidade } = parseDosagem(med.dosagem);
    setEditId(med.id);
    setForm({
      nome: med.nome || '',
      concentracaoValor: valor,
      concentracaoUnidade: unidade,
      tipo: med.tipo || 'Comprimido',
    });
    setShowForm(true);
  };

  const fechar = () => {
    setShowForm(false);
    setEditId(null);
    setForm(FORM_VAZIO);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.nome.trim()) return alert('Informe o nome do medicamento.');
    if (!form.concentracaoValor) return alert('Informe a concentração.');

    const ok = await confirm({
      title: editId ? 'Atualizar medicamento' : 'Cadastrar medicamento',
      message: editId
        ? 'Deseja salvar as alterações deste medicamento?'
        : 'Deseja cadastrar este medicamento no catálogo?',
      confirmText: 'Salvar',
    });
    if (!ok) return;

    const dosagem = `${String(form.concentracaoValor).trim()} ${form.concentracaoUnidade}`;
    const payload = { nome: form.nome.trim(), tipo: form.tipo, dosagem };

    setSalvando(true);
    const res = editId
      ? await onUpdateMedicamento(editId, payload)
      : await onCreateMedicamento(payload);
    setSalvando(false);

    if (res?.success !== false) fechar();
  };

  return (
    <div className={styles.card}>
      <div className={styles.headerRow}>
        <h3 className={styles.sectionTitle}>Medicamentos do Catálogo</h3>
        <button type="button" className={styles.addBtn} onClick={abrirNovo}>
          + Adicionar novo medicamento
        </button>
      </div>

      {loading ? (
        <div className={styles.loadingBox}>Carregando medicamentos...</div>
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Nome do medicamento</th>
                <th>Concentração</th>
                <th>Tipo</th>
                <th style={{ textAlign: 'center' }}>Editar</th>
              </tr>
            </thead>
            <tbody>
              {catalogo.length === 0 ? (
                <tr>
                  <td colSpan="4" style={{ textAlign: 'center', color: '#64748b' }}>
                    Nenhum medicamento cadastrado.
                  </td>
                </tr>
              ) : (
                catalogo.map((med) => (
                  <tr key={med.id}>
                    <td><strong>{med.nome}</strong></td>
                    <td>{med.dosagem || '—'}</td>
                    <td>{med.tipo || '—'}</td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        type="button"
                        className={styles.editBtn}
                        onClick={() => abrirEdicao(med)}
                      >
                        Editar
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL DE CADASTRO / EDIÇÃO */}
      {showForm && (
        <div className={styles.modalOverlay} onClick={fechar}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>
                {editId ? 'Editar medicamento' : 'Novo medicamento'}
              </h3>
              <button type="button" className={styles.modalClose} onClick={fechar}>
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className={styles.modalBody}>
              <div className={styles.fieldGroup}>
                <label>Nome do medicamento *</label>
                <input
                  type="text"
                  placeholder="Ex: Dipirona Sódica"
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  required
                />
              </div>

              <div className={styles.fieldGroup}>
                <label>Concentração *</label>
                <div className={styles.concentracaoRow}>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    placeholder="Ex: 500"
                    value={form.concentracaoValor}
                    onChange={(e) =>
                      setForm({ ...form, concentracaoValor: e.target.value })
                    }
                    required
                  />
                  <select
                    value={form.concentracaoUnidade}
                    onChange={(e) =>
                      setForm({ ...form, concentracaoUnidade: e.target.value })
                    }
                  >
                    {UNIDADES.map((u) => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className={styles.fieldGroup}>
                <label>Tipo *</label>
                <select
                  value={form.tipo}
                  onChange={(e) => setForm({ ...form, tipo: e.target.value })}
                >
                  {TIPOS.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div className={styles.formActions}>
                <button
                  type="button"
                  className={styles.secondaryBtn}
                  onClick={fechar}
                  disabled={salvando}
                >
                  Cancelar
                </button>
                <button type="submit" className={styles.primaryBtn} disabled={salvando}>
                  {salvando ? 'Salvando...' : editId ? 'Atualizar' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
