'use client';

import { useState } from 'react';
import Image from 'next/image';
import { buscarPessoaExistente } from '../actions';
import styles from './CadastroPacienteJunta.module.css';

const LOCAIS_DISPONIVEIS = [
  'CAEE',
  'APAE',
  'Ambulatório',
  'Educação',
  'Social',
  'Centro de Especialidades',
  'Centro de Reabilitação',
];

const TIPOS_DEFICIENCIA = ['Física', 'Intelectual', 'Visual', 'Auditiva'];

export default function CadastroPacienteJunta({ onCadastrar }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  // Pessoa selecionada (cadastro em /pessoas). Aqui só se anexa dados da Junta.
  const [pessoa, setPessoa] = useState(null);
  const [tiposDeficiencia, setTiposDeficiencia] = useState([]);
  const [locaisEncaminhados, setLocaisEncaminhados] = useState([]);
  const [salvando, setSalvando] = useState(false);

  const formatCPF = (cpf) => {
    if (!cpf) return '';
    const d = cpf.replace(/\D/g, '');
    return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  };

  const removeDuplicadosPorCPF = (lista) => {
    if (!Array.isArray(lista)) return [];
    const vistos = new Set();
    return lista.filter((item) => {
      const cpf = (item.cpf || '').replace(/\D/g, '');
      if (!cpf) return true;
      if (vistos.has(cpf)) return false;
      vistos.add(cpf);
      return true;
    });
  };

  const handleInputChange = async (valor) => {
    setSearchTerm(valor);
    if (valor.trim().length >= 2) {
      setIsSearching(true);
      setShowDropdown(true);
      try {
        const resultados = await buscarPessoaExistente(valor.trim());
        setSearchResults(removeDuplicadosPorCPF(resultados || []));
      } catch (error) {
        console.error('Erro ao buscar pessoa:', error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    } else {
      setSearchResults([]);
      setShowDropdown(false);
    }
  };

  const handleSelectPessoa = (p) => {
    setPessoa(p);
    setSearchTerm(`${p.nomeCompleto || p.nome} (${formatCPF(p.cpf)})`);
    setShowDropdown(false);
    // Pré-carrega dados de Junta já existentes, se vierem na busca.
    // tipoDeficiencia é salvo como string ("Física, Visual") — separa de volta.
    const existentes = (p.tipoDeficiencia || '')
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    setTiposDeficiencia(existentes);
    setLocaisEncaminhados(p.servicosAtivos || []);
  };

  const handleClear = () => {
    setSearchTerm('');
    setPessoa(null);
    setTiposDeficiencia([]);
    setLocaisEncaminhados([]);
    setSearchResults([]);
    setShowDropdown(false);
  };

  const handleCheckboxChange = (local) => {
    setLocaisEncaminhados((prev) =>
      prev.includes(local) ? prev.filter((l) => l !== local) : [...prev, local],
    );
  };

  const handleTipoChange = (tipo) => {
    setTiposDeficiencia((prev) =>
      prev.includes(tipo) ? prev.filter((t) => t !== tipo) : [...prev, tipo],
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!pessoa) return alert('Busque e selecione a pessoa no banco primeiro.');
    if (tiposDeficiencia.length === 0) {
      return alert('Selecione ao menos um tipo de deficiência.');
    }

    setSalvando(true);
    const res = await onCadastrar({
      cpf: pessoa.cpf,
      tipoDeficiencia: tiposDeficiencia.join(', '),
      locaisEncaminhados,
    });
    setSalvando(false);
    if (res?.success !== false) handleClear();
  };

  return (
    <div className={styles.card}>
      {/* BUSCA DA PESSOA */}
      <div className={styles.searchSectionContainer}>
        <div className={styles.fieldGroup} style={{ marginBottom: '0.5rem' }}>
          <label>Buscar Pessoa no Banco (CPF ou Nome)</label>
        </div>

        <div className={styles.searchActionRow}>
          <div className={styles.autocompleteWrapper}>
            <input
              type="text"
              placeholder="Digite o CPF ou Nome..."
              value={searchTerm}
              onChange={(e) => handleInputChange(e.target.value)}
            />
            {showDropdown && searchResults.length > 0 && (
              <ul className={styles.suggestionsDropdown}>
                {searchResults.map((p, index) => (
                  <li key={p.cpf ? `${p.cpf}-${index}` : index} onClick={() => handleSelectPessoa(p)}>
                    <strong>{p.nomeCompleto || p.nome}</strong> — CPF: {formatCPF(p.cpf)}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <button type="button" className={`${styles.iconSquareBtn} ${styles.btnBlue}`} title="Buscar">
            <Image src="/img/icon/lupa.png" alt="Buscar" width={22} height={22} className={styles.iconImg} />
          </button>

          {pessoa && (
            <button
              type="button"
              className={`${styles.iconSquareBtn} ${styles.btnOrange}`}
              title="Limpar"
              onClick={handleClear}
            >
              <Image src="/img/icon/cancelar.png" alt="Limpar" width={22} height={22} className={styles.iconImg} />
            </button>
          )}
        </div>

        {isSearching && (
          <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: '#64748b' }}>
            Consultando banco de dados...
          </div>
        )}
        <p style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#64748b' }}>
          A pessoa precisa estar cadastrada em <strong>Gerenciamento &gt; Cadastro de Pessoas</strong>.
        </p>
      </div>

      {pessoa && (
        <form onSubmit={handleSubmit} className={styles.patientFormContainer}>
          {/* RESUMO DA PESSOA (somente leitura) */}
          <div className={styles.formSection}>
            <div className={styles.formSectionHeader}>
              <h4>Paciente selecionado</h4>
            </div>
            <div className={styles.formGridStrict}>
              <div className={`${styles.fieldGroup} ${styles.colName}`}>
                <label>Nome</label>
                <input type="text" value={pessoa.nomeCompleto || pessoa.nome || ''} disabled />
              </div>
              <div className={`${styles.fieldGroup} ${styles.colCpf}`}>
                <label>CPF</label>
                <input type="text" value={formatCPF(pessoa.cpf)} disabled />
              </div>
              <div className={`${styles.fieldGroup} ${styles.colPhone}`}>
                <label>Telefone</label>
                <input type="text" value={pessoa.telefone || '-'} disabled />
              </div>
            </div>
          </div>

          {/* DADOS DA JUNTA */}
          <div className={styles.formSection}>
            <div className={styles.formSectionHeader}>
              <h4>Tipo de Deficiência * (pode selecionar mais de um)</h4>
            </div>
            <div className={styles.checkboxGrid}>
              {TIPOS_DEFICIENCIA.map((tipo) => (
                <label key={tipo} className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={tiposDeficiencia.includes(tipo)}
                    onChange={() => handleTipoChange(tipo)}
                  />
                  {tipo}
                </label>
              ))}
            </div>
          </div>

          {/* LOCAIS DE ENCAMINHAMENTO */}
          <div className={styles.formSection}>
            <div className={styles.formSectionHeader}>
              <h4>Locais de Encaminhamento / Vinculados</h4>
            </div>
            <div className={styles.checkboxGrid}>
              {LOCAIS_DISPONIVEIS.map((local) => (
                <label key={local} className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={locaisEncaminhados.includes(local)}
                    onChange={() => handleCheckboxChange(local)}
                  />
                  {local}
                </label>
              ))}
            </div>
          </div>

          <div className={styles.formActions}>
            <button type="button" className={styles.btnRedAction} onClick={handleClear} disabled={salvando}>
              Cancelar
            </button>
            <button type="submit" className={styles.primaryBtn} disabled={salvando}>
              {salvando ? 'Salvando...' : 'Salvar Dados da Junta'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
