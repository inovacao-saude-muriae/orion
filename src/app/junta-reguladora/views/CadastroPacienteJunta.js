'use client';

import { useState, useRef, useEffect } from 'react';
import { buscarPessoaExistente } from '../actions';
import { useConfirm } from '@/components/ConfirmDialog';
import { documentoPaciente } from '@/app/regulacao/constants';
import { mascararTelefone } from '@/lib/telefone';
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
  const confirm = useConfirm();
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  // Pessoa selecionada (cadastro em /pessoas). Aqui só se anexa dados da Junta.
  const [pessoa, setPessoa] = useState(null);
  const [tiposDeficiencia, setTiposDeficiencia] = useState([]);
  const [locaisEncaminhados, setLocaisEncaminhados] = useState([]);
  const [salvando, setSalvando] = useState(false);
  const dropdownRef = useRef(null);

  // Fecha o dropdown ao clicar fora.
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  // Carrega uma lista inicial ao montar (dropdown já aparece ao clicar no campo).
  useEffect(() => {
    let ativo = true;
    (async () => {
      try {
        const resultados = await buscarPessoaExistente('');
        if (ativo) setSearchResults(removeDuplicadosPorCPF(resultados || []));
      } catch {
        if (ativo) setSearchResults([]);
      }
    })();
    return () => {
      ativo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleInputChange = async (valor) => {
    setSearchTerm(valor);
    setShowDropdown(true);
    setIsSearching(true);
    try {
      const resultados = await buscarPessoaExistente(valor.trim());
      setSearchResults(removeDuplicadosPorCPF(resultados || []));
    } catch (error) {
      console.error('Erro ao buscar pessoa:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectPessoa = (p) => {
    setPessoa(p);
    // O campo "Nome completo" é também a busca: mantém só o nome no texto.
    setSearchTerm(p.nomeCompleto || p.nome || '');
    setShowDropdown(false);
    // Pré-carrega dados de Junta já existentes, se vierem na busca.
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

    const ok = await confirm({
      title: 'Salvar dados da Junta',
      message: 'Deseja confirmar o cadastro dos dados da Junta para este paciente?',
      confirmText: 'Salvar',
    });
    if (!ok) return;

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
    <div className={styles.container}>
      <div className={styles.mainWrapper}>
        {/* SEÇÃO 1: IDENTIFICAÇÃO DO PACIENTE (estilo Novo Pedido) */}
        <div className={styles.identSection}>
          <div className={styles.identHeader}>
            <h4>1. Identificação do Paciente</h4>
          </div>

        {/* DADOS PESSOAIS — o campo "Nome completo" é também a busca */}
        <div className={styles.dataGrid}>
          <div
            className={`${styles.field} ${styles.colName}`}
            style={{ position: 'relative' }}
            ref={dropdownRef}
          >
            <label>Nome completo *</label>
            <div className={styles.inputWrapperWithIcon}>
              <input
                type="text"
                className={styles.selectLikeInput}
                placeholder="Digite nome ou CPF para buscar..."
                value={searchTerm}
                onChange={(e) => handleInputChange(e.target.value)}
                onFocus={() => setShowDropdown(true)}
                autoComplete="off"
              />
              <span className={styles.arrowIcon} onClick={() => setShowDropdown(!showDropdown)}>
                {showDropdown ? '▲' : '▼'}
              </span>
            </div>

            {showDropdown && (
              <div className={styles.tableDropdownMenu}>
                <div className={styles.tableContainerScroll}>
                  <table className={styles.patientTableDropdown}>
                    <thead>
                      <tr>
                        <th>CPF / CNS</th>
                        <th>Usuário</th>
                        <th>Nome da mãe</th>
                        <th>Data nasc.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {searchResults.length > 0 ? (
                        searchResults.map((p, index) => (
                          <tr
                            key={p.cpf ? `${p.cpf}-${index}` : index}
                            onMouseDown={(e) => {
                              e.preventDefault();
                              handleSelectPessoa(p);
                            }}
                            className={pessoa?.cpf === p.cpf ? styles.selectedRow : ''}
                          >
                            <td>{documentoPaciente({ cpf: p.cpf, cns: p.cns })}</td>
                            <td className={styles.boldName}>{p.nomeCompleto || p.nome}</td>
                            <td>{p.nomeMae || 'Não informada'}</td>
                            <td>
                              {p.dataNascimento
                                ? p.dataNascimento.split('-').reverse().join('/')
                                : '-'}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="4" className={styles.noDataTd}>
                            {isSearching ? 'Consultando banco de dados...' : 'Nenhuma pessoa encontrada.'}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            <p className={styles.helperNote}>
              A pessoa precisa estar cadastrada em <strong>Gerenciamento &gt; Cadastro de Pessoas</strong>.
            </p>
          </div>
          <div className={`${styles.field} ${styles.colMother}`}>
            <label>Nome da mãe</label>
            <input type="text" value={pessoa?.nomeMae || ''} disabled readOnly placeholder="—" />
          </div>
          <div className={`${styles.field} ${styles.colSmall}`}>
            <label>Data de nascimento</label>
            <input
              type="text"
              value={pessoa?.dataNascimento ? pessoa.dataNascimento.split('-').reverse().join('/') : ''}
              disabled
              readOnly
              placeholder="dd/mm/aaaa"
            />
          </div>
          <div className={`${styles.field} ${styles.colSmall}`}>
            <label>Sexo</label>
            <input type="text" value={pessoa?.sexo || ''} disabled readOnly placeholder="—" />
          </div>
          <div className={`${styles.field} ${styles.colMed}`}>
            <label>Telefone / WhatsApp</label>
            <input type="text" value={mascararTelefone(pessoa?.telefone)} disabled readOnly placeholder="(00) 00000-0000" />
          </div>
          <div className={`${styles.field} ${styles.colCpf}`}>
            <label>CPF</label>
            <input type="text" value={pessoa ? formatCPF(pessoa.cpf) : ''} disabled readOnly placeholder="000.000.000-00" />
          </div>
          <div className={`${styles.field} ${styles.colMed}`}>
            <label>CNS (Cartão SUS)</label>
            <input type="text" value={pessoa?.cns || ''} disabled readOnly placeholder="—" />
          </div>
          <div className={`${styles.field} ${styles.colMed}`}>
            <label>UBS de referência</label>
            <input type="text" value={pessoa?.ubsReferencia || ''} disabled readOnly placeholder="—" />
          </div>
        </div>

        {/* SUBTÍTULO: ENDEREÇO */}
        <p className={styles.enderecoSubtitulo}>Endereço</p>

        {/* ENDEREÇO (somente leitura) */}
        <div className={styles.dataGrid}>
          <div className={`${styles.field} ${styles.colCep}`}>
            <label>CEP</label>
            <input type="text" value={pessoa?.cep || ''} disabled readOnly placeholder="00000-000" />
          </div>
          <div className={`${styles.field} ${styles.colBairro}`}>
            <label>Bairro</label>
            <input type="text" value={pessoa?.bairro || ''} disabled readOnly placeholder="—" />
          </div>
          <div className={`${styles.field} ${styles.colLogradouro}`}>
            <label>Logradouro / Rua</label>
            <input type="text" value={pessoa?.logradouro || ''} disabled readOnly placeholder="—" />
          </div>
          <div className={`${styles.field} ${styles.colNumero}`}>
            <label>Número</label>
            <input type="text" value={pessoa?.numero || ''} disabled readOnly placeholder="—" />
          </div>
          <div className={`${styles.field} ${styles.colComplemento}`}>
            <label>Complemento</label>
            <input type="text" value={pessoa?.complemento || ''} disabled readOnly placeholder="—" />
          </div>
          <div className={`${styles.field} ${styles.colCidade}`}>
            <label>Cidade</label>
            <input type="text" value={pessoa?.cidade || ''} disabled readOnly placeholder="—" />
          </div>
          <div className={`${styles.field} ${styles.colUf}`}>
            <label>UF</label>
            <input type="text" value={pessoa?.uf || ''} disabled readOnly placeholder="—" />
          </div>
        </div>
        </div>
        {/* FIM DA SEÇÃO 1 */}

        <form onSubmit={handleSubmit} className={styles.formContainer}>
          {/* TIPO DE DEFICIÊNCIA */}
          <div className={styles.cardSection}>
            <h3 className={styles.sectionHeaderTitle}>
              Tipo de Deficiência * (pode selecionar mais de um)
            </h3>
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
          <div className={styles.cardSection}>
            <h3 className={styles.sectionHeaderTitle}>
              Locais de Encaminhamento / Vinculados
            </h3>
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
            <button type="button" onClick={handleClear} className={styles.secondaryBtn} disabled={salvando}>
              Cancelar
            </button>
            <button type="submit" className={styles.primaryBtn} disabled={salvando || !pessoa}>
              {salvando ? 'Salvando...' : 'Salvar Dados da Junta'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
