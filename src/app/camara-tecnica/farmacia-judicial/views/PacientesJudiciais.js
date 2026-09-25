'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { buscarPessoaExistente } from '../actions';
import { useConfirm } from '@/components/ConfirmDialog';
import { documentoPaciente } from '@/app/regulacao/constants';
import styles from './PacientesJudiciais.module.css';

const MED_VAZIO = { medicamentoId: '', qtdMensal: '', statusMedication: 'Ativo' };

const PROCESSO_VAZIO = {
  numeroPasta: '',
  numeroProcesso: '',
  status: 'Ativo',
};

export default function TabPacientesJudiciais({
  pacientes = [],
  catalogo = [],
  onCreatePaciente,
  loading,
}) {
  const confirm = useConfirm();
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  // Pessoa selecionada no banco (somente leitura aqui — cadastro vive em /pessoas).
  const [pessoa, setPessoa] = useState(null);
  const [form, setForm] = useState(PROCESSO_VAZIO);
  const [medicamentosForm, setMedicamentosForm] = useState([{ ...MED_VAZIO }]);
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

  // Carrega uma lista inicial de pessoas ao montar (para o dropdown já ter
  // conteúdo ao clicar no campo, como na Regulação).
  useEffect(() => {
    let ativo = true;
    (async () => {
      try {
        const resultados = await buscarPessoaExistente("");
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
    setSearchTerm(`${p.nomeCompleto || p.nome} (${formatCPF(p.cpf)})`);
    setShowDropdown(false);

    // Se a pessoa já for paciente judicial, carrega processo + medicamentos.
    const pacienteExistente = pacientes.find(
      (pc) => (pc.cpf || '').replace(/\D/g, '') === (p.cpf || '').replace(/\D/g, ''),
    );

    if (pacienteExistente) {
      setForm({
        numeroPasta: pacienteExistente.numeroPasta || '',
        numeroProcesso: pacienteExistente.numeroProcesso || '',
        status: pacienteExistente.status || 'Ativo',
      });
      if (pacienteExistente.medicamentosLista?.length > 0) {
        setMedicamentosForm(
          pacienteExistente.medicamentosLista.map((m) => ({
            medicamentoId: m.medicamentoId || m.id || '',
            qtdMensal: m.qtdMensal || m.quantidade || '',
            statusMedication: m.statusMedication || m.status || 'Ativo',
          })),
        );
      } else {
        setMedicamentosForm([{ ...MED_VAZIO }]);
      }
    } else {
      setForm(PROCESSO_VAZIO);
      setMedicamentosForm([{ ...MED_VAZIO }]);
    }
  };

  const handleClear = () => {
    setSearchTerm('');
    setPessoa(null);
    setForm(PROCESSO_VAZIO);
    setMedicamentosForm([{ ...MED_VAZIO }]);
    setSearchResults([]);
    setShowDropdown(false);
  };

  const handleAddMedRow = () => setMedicamentosForm((prev) => [...prev, { ...MED_VAZIO }]);
  const handleRemoveMedRow = (index) =>
    setMedicamentosForm((prev) => prev.filter((_, i) => i !== index));
  const handleMedChange = (index, field, value) =>
    setMedicamentosForm((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!pessoa) return alert('Busque e selecione a pessoa no banco primeiro.');
    if (!form.numeroPasta || !form.numeroProcesso) {
      return alert('Informe o número da pasta e do processo.');
    }

    const ok = await confirm({
      title: 'Salvar paciente judicial',
      message: 'Deseja confirmar o cadastro do processo e medicamentos?',
      confirmText: 'Salvar',
    });
    if (!ok) return;

    setSalvando(true);
    const payload = {
      cpf: pessoa.cpf,
      numeroPasta: form.numeroPasta,
      numeroProcesso: form.numeroProcesso,
      status: form.status,
      medicamentos: medicamentosForm.filter((m) => m.medicamentoId && m.qtdMensal),
    };

    const res = await onCreatePaciente(payload);
    setSalvando(false);
    if (res?.success !== false) {
      handleClear();
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.mainWrapper}>
        {/* BUSCA DA PESSOA (cadastrada em Gerenciamento > Cadastro de Pessoas) */}
        <div className={styles.searchBlock}>
          <label className={styles.searchLabel}>
            Buscar Pessoa no Banco (CPF ou Nome)
          </label>

          <div className={styles.searchBarRow}>
            <div className={styles.searchSelectWrapper} ref={dropdownRef}>
              <input
                type="text"
                className={styles.selectLikeInput}
                placeholder="Selecionar ou digitar nome/CPF..."
                value={searchTerm}
                onChange={(e) => handleInputChange(e.target.value)}
                onFocus={() => setShowDropdown(true)}
              />
              <span className={styles.arrowIcon} onClick={() => setShowDropdown(!showDropdown)}>
                {showDropdown ? '▲' : '▼'}
              </span>

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
            </div>

            {pessoa && (
              <button type="button" className={styles.iconBtn} onClick={handleClear} title="Limpar">
                <Image src="/img/icon/cancelar.png" alt="Limpar" width={18} height={18} />
              </button>
            )}
          </div>

          <p className={styles.helperNote}>
            A pessoa precisa estar cadastrada em <strong>Gerenciamento &gt; Cadastro de Pessoas</strong>.
          </p>
        </div>

        <hr className={styles.divider} />

            {/* DADOS DA PESSOA (somente leitura — cadastro em Gerenciamento > Pessoas) */}
            <h2 className={styles.dataTitle}>Dados da pessoa</h2>

            <div className={styles.formSectionTitle}>Dados pessoais</div>
            <div className={styles.dataGrid}>
              <div className={styles.field}>
                <label>CPF</label>
                <input type="text" value={pessoa ? formatCPF(pessoa.cpf) : ''} disabled readOnly placeholder="000.000.000-00" />
              </div>
              <div className={`${styles.field} ${styles.colWide}`}>
                <label>Nome completo</label>
                <input type="text" value={pessoa?.nomeCompleto || pessoa?.nome || ''} disabled readOnly placeholder="—" />
              </div>
              <div className={styles.field}>
                <label>Sexo</label>
                <input type="text" value={pessoa?.sexo || ''} disabled readOnly placeholder="—" />
              </div>
              <div className={styles.field}>
                <label>Data de nascimento</label>
                <input
                  type="text"
                  value={pessoa?.dataNascimento ? pessoa.dataNascimento.split('-').reverse().join('/') : ''}
                  disabled
                  readOnly
                  placeholder="dd/mm/aaaa"
                />
              </div>
              <div className={`${styles.field} ${styles.colWide}`}>
                <label>Nome da mãe</label>
                <input type="text" value={pessoa?.nomeMae || ''} disabled readOnly placeholder="—" />
              </div>
              <div className={styles.field}>
                <label>Telefone / WhatsApp</label>
                <input type="text" value={pessoa?.telefone || ''} disabled readOnly placeholder="(00) 00000-0000" />
              </div>
              <div className={styles.field}>
                <label>CNS (Cartão SUS)</label>
                <input type="text" value={pessoa?.cns || ''} disabled readOnly placeholder="—" />
              </div>
              <div className={styles.field}>
                <label>UBS de referência</label>
                <input type="text" value={pessoa?.ubsReferencia || ''} disabled readOnly placeholder="—" />
              </div>
            </div>

            <div className={styles.formSectionTitle}>Endereço</div>
            <div className={styles.dataGrid}>
              <div className={styles.field}>
                <label>CEP</label>
                <input type="text" value={pessoa?.cep || ''} disabled readOnly placeholder="00000-000" />
              </div>
              <div className={`${styles.field} ${styles.colWide}`}>
                <label>Logradouro / Rua</label>
                <input type="text" value={pessoa?.logradouro || ''} disabled readOnly placeholder="—" />
              </div>
              <div className={styles.field}>
                <label>Número</label>
                <input type="text" value={pessoa?.numero || ''} disabled readOnly placeholder="—" />
              </div>
              <div className={styles.field}>
                <label>Complemento</label>
                <input type="text" value={pessoa?.complemento || ''} disabled readOnly placeholder="—" />
              </div>
              <div className={styles.field}>
                <label>Bairro</label>
                <input type="text" value={pessoa?.bairro || ''} disabled readOnly placeholder="—" />
              </div>
              <div className={styles.field}>
                <label>Cidade</label>
                <input type="text" value={pessoa?.cidade || ''} disabled readOnly placeholder="—" />
              </div>
              <div className={styles.field}>
                <label>UF</label>
                <input type="text" value={pessoa?.uf || ''} disabled readOnly placeholder="—" />
              </div>
            </div>

            <form onSubmit={handleSubmit} className={styles.formContainer}>
              {/* DADOS DO PROCESSO JUDICIAL */}
              <div className={styles.cardSection}>
                <h3 className={styles.sectionHeaderTitle}>DADOS DO PROCESSO JUDICIAL</h3>
                <div className={styles.gridProcesso}>
                  <div className={styles.fieldGroup}>
                    <label>Nº Pasta Judicial *</label>
                    <input
                      type="text"
                      placeholder="Ex: PJ-2026/089"
                      value={form.numeroPasta}
                      onChange={(e) => setForm({ ...form, numeroPasta: e.target.value })}
                      required
                    />
                  </div>
                  <div className={styles.fieldGroup}>
                    <label>Nº do Processo Judicial *</label>
                    <input
                      type="text"
                      placeholder="Ex: 5001234-56.2026.8.13.0439"
                      value={form.numeroProcesso}
                      onChange={(e) => setForm({ ...form, numeroProcesso: e.target.value })}
                      required
                    />
                  </div>
                  <div className={styles.fieldGroup}>
                    <label>Status do Paciente *</label>
                    <select
                      value={form.status}
                      onChange={(e) => setForm({ ...form, status: e.target.value })}
                      required
                    >
                      <option value="Ativo">Ativo</option>
                      <option value="Inativo">Inativo</option>
                      <option value="Falecido">Falecido</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* MEDICAMENTOS E PRESCRIÇÃO MENSAL */}
              <div className={styles.cardSection}>
                <h3 className={styles.sectionHeaderTitle}>MEDICAMENTOS E PRESCRIÇÃO MENSAL</h3>
                {medicamentosForm.map((med, idx) => (
                  <div key={idx} className={styles.treatmentGrid}>
                    <div className={styles.fieldGroup}>
                      <label>Medicamento do Catálogo</label>
                      <select
                        value={med.medicamentoId}
                        onChange={(e) => handleMedChange(idx, 'medicamentoId', e.target.value)}
                      >
                        <option value="">-- Selecione do Catálogo --</option>
                        {catalogo.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.nome} ({item.dosagem})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className={styles.fieldGroup}>
                      <label>Qtd Prescrita Mensal</label>
                      <input
                        type="number"
                        min="1"
                        placeholder="Ex: 30"
                        value={med.qtdMensal}
                        onChange={(e) => handleMedChange(idx, 'qtdMensal', e.target.value)}
                      />
                    </div>

                    <div className={styles.fieldGroup}>
                      <label>Status do Medicamento</label>
                      <select
                        value={med.statusMedication || 'Ativo'}
                        onChange={(e) => handleMedChange(idx, 'statusMedication', e.target.value)}
                      >
                        <option value="Ativo">Ativo</option>
                        <option value="Inativo">Inativo</option>
                        <option value="Descontinuado">Descontinuado</option>
                      </select>
                    </div>

                    {medicamentosForm.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveMedRow(idx)}
                        className={styles.removeRowBtn}
                      >
                        🗑
                      </button>
                    )}
                  </div>
                ))}

                <button type="button" onClick={handleAddMedRow} className={styles.addRowBtn}>
                  + Adicionar Outro Medicamento
                </button>
              </div>

              <div className={styles.formActions}>
                <button type="button" onClick={handleClear} className={styles.secondaryBtn} disabled={salvando}>
                  Cancelar
                </button>
                <button type="submit" className={styles.primaryBtn} disabled={salvando || loading}>
                  {salvando ? 'Salvando...' : 'Salvar Processo e Medicamentos'}
                </button>
              </div>
            </form>
      </div>
    </div>
  );
}
