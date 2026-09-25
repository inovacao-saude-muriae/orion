'use client';

import { useState, useRef, useEffect } from 'react';
import styles from './NovoPedido.module.css';
import { useUnsavedChanges } from '../hooks/useUnsavedChanges';

export default function NovoPedido({
  newRequest = {
    patientSearch: '',
    patientName: '',
    motherName: '',
    cpf: '',
    susCard: '',
    examTypeId: '',
    procedureId: '',
    medicoSolicitanteId: '',
    ubsResponsavelId: '',
    classification: 'Verde',
    justification: '',
  },
  setNewRequest = () => {},
  handleCreateRequest = () => {},
  auxData = { tiposExame: [], medicos: [], ubsList: [], pessoas: [] },
  availableProcedures = [],
  patientSuggestions = [],
  isSearchingPatient = false,
  handleSelectPatientSuggestion = () => {},
  handleExamTypeChange = () => {},
  handleProcedureChange = () => {},
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Função para formatar o CPF na exibição da tabela (000.000.000-00)
  const formatCPF = (cpf) => {
    if (!cpf) return '-';
    const clean = cpf.replace(/\D/g, '');
    if (clean.length !== 11) return cpf;
    return clean.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  };

  // Fecha o dropdown se clicar fora dele
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Lista de pacientes (prioriza sugestões ativas ou a lista de pessoas do auxData)
  const patientList = (patientSuggestions && patientSuggestions.length > 0)
    ? patientSuggestions
    : (auxData.pessoas || []);

  const searchTerm = (newRequest.patientSearch || '').toLowerCase().trim();

  // Filtro em tempo real por Nome, CPF (formatado ou limpo) ou Mãe
  const filteredPatients = patientList.filter((p) => {
    if (!searchTerm) return true;

    const matchName = (p.nomeCompleto || p.nome_completo || '').toLowerCase().includes(searchTerm);
    const matchMother = (p.nomeMae || p.nome_mae || '').toLowerCase().includes(searchTerm);

    // Compara o que foi digitado sem pontuações com o CPF limpo do banco
    const cleanSearch = searchTerm.replace(/\D/g, '');
    const cleanCpf = (p.cpf || '').replace(/\D/g, '');
    const matchCpf = cleanSearch ? cleanCpf.includes(cleanSearch) : false;

    return matchName || matchMother || matchCpf;
  });

  const isDirty = Boolean(
    newRequest.patientName ||
    newRequest.cpf ||
    newRequest.examTypeId ||
    newRequest.procedureId ||
    newRequest.justification
  );

  useUnsavedChanges(isDirty);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (handleCreateRequest) {
      await handleCreateRequest(e);
    }
  };

  const handleSelectPerson = (pessoa) => {
    handleSelectPatientSuggestion(pessoa);
    setNewRequest((prev) => ({
      ...prev,
      patientSearch: pessoa.nomeCompleto || pessoa.nome_completo || '',
    }));
    setIsOpen(false);
  };

  return (
    <div className={styles.card}>
      <h2 className={styles.cardTitle}>Cadastrar Novo Pedido</h2>

      <form onSubmit={onSubmit} className={styles.patientFormContainer}>
        
        {/* SEÇÃO 1: BUSCA E IDENTIFICAÇÃO DO PACIENTE */}
        <div className={styles.formSection}>
          <div className={styles.formSectionHeader}>
            <h4>1. Identificação do Paciente</h4>
          </div>

          <div className={styles.searchSectionContainer}>
            <div className={styles.fieldGroup} style={{ position: 'relative' }} ref={dropdownRef}>
              <label>Buscar Paciente *</label>
              
              {/* CAMPO DE DIGITAÇÃO E SELEÇÃO UNIFICADOS */}
              <div className={styles.inputWrapperWithIcon}>
                <input
                  type="text"
                  placeholder="Selecionar ou digitar nome/CPF..."
                  value={newRequest.patientSearch || ''}
                  onChange={(e) => {
                    setNewRequest((prev) => ({ ...prev, patientSearch: e.target.value }));
                    if (!isOpen) setIsOpen(true);
                  }}
                  onFocus={() => setIsOpen(true)}
                  className={styles.selectLikeInput}
                  required
                />
                <span className={styles.arrowIcon} onClick={() => setIsOpen(!isOpen)}>
                  {isOpen ? '▲' : '▼'}
                </span>
              </div>

              {/* DROPDOWN EM FORMATO DE TABELA ESTILIZADA */}
              {isOpen && (
                <div className={styles.tableDropdownMenu}>
                  <div className={styles.tableContainerScroll}>
                    <table className={styles.patientTableDropdown}>
                      <thead>
                        <tr>
                          <th>CPF</th>
                          <th>Usuário</th>
                          <th>Nome da mãe</th>
                          <th>Data nasc.</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredPatients.length > 0 ? (
                          filteredPatients.map((pessoa) => (
                            <tr 
                              key={pessoa.cpf} 
                              onMouseDown={(e) => {
                                e.preventDefault();
                                handleSelectPerson(pessoa);
                              }}
                              className={newRequest.cpf === pessoa.cpf ? styles.selectedRow : ''}
                            >
                              <td>{formatCPF(pessoa.cpf)}</td>
                              <td className={styles.boldName}>
                                {pessoa.nomeCompleto || pessoa.nome_completo}
                              </td>
                              <td>{pessoa.nomeMae || pessoa.nome_mae || 'Não informada'}</td>
                              <td>
                                {pessoa.dataNascimento || pessoa.data_nascimento || '-'}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="4" className={styles.noDataTd}>
                              {isSearchingPatient ? 'Buscando pacientes...' : 'Nenhum paciente encontrado.'}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

            </div>
          </div>

          {/* DADOS CONFIRMADOS DO PACIENTE */}
          <div className={styles.formGridStrict}>
            <div className={`${styles.fieldGroup} ${styles.colMother}`}>
              <label>Nome da Mãe</label>
              <input
                type="text"
                value={newRequest.motherName || ''}
                readOnly
                placeholder="Nome da Mãe"
                className={styles.readOnlyInput}
              />
            </div>

            <div className={`${styles.fieldGroup} ${styles.colCpf}`}>
              <label>CPF *</label>
              <input
                type="text"
                value={formatCPF(newRequest.cpf) || ''}
                readOnly
                placeholder="000.000.000-00"
                className={styles.readOnlyInput}
                required
              />
            </div>

            <div className={`${styles.fieldGroup} ${styles.colSus}`}>
              <label>Cartão SUS</label>
              <input
                type="text"
                value={newRequest.susCard || ''}
                onChange={(e) => setNewRequest({ ...newRequest, susCard: e.target.value })}
                placeholder="700000000000000"
              />
            </div>
          </div>
        </div>

        {/* SEÇÃO 2: DETALHES DO PEDIDO */}
        <div className={styles.formSection}>
          <div className={styles.formSectionHeader}>
            <h4>2. Detalhes do pedido</h4>
          </div>

          <div className={styles.formGridStrict}>
            <div className={`${styles.fieldGroup} ${styles.colExamType}`}>
              <label>Tipo de Exame *</label>
              <select value={newRequest.examTypeId || ''} onChange={handleExamTypeChange} required>
                <option value="">Selecione o Exame</option>
                {auxData.tiposExame?.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.nome}
                  </option>
                ))}
              </select>
            </div>

            <div className={`${styles.fieldGroup} ${styles.colProcedure}`}>
              <label>Procedimento Específico *</label>
              <select
                value={newRequest.procedureId || ''}
                onChange={handleProcedureChange}
                disabled={!newRequest.examTypeId}
                required
              >
                <option value="">
                  {!newRequest.examTypeId
                    ? 'Selecione primeiro o Exame'
                    : '-- Selecione o Procedimento --'}
                </option>
                {availableProcedures?.map((proc) => (
                  <option key={proc.id} value={proc.id}>
                    {proc.nome} (R$ {Number(proc.valor || 0).toFixed(2)})
                  </option>
                ))}
              </select>
            </div>

            <div className={`${styles.fieldGroup} ${styles.colDoctor}`}>
              <label>Médico Solicitante *</label>
              <select
                value={newRequest.medicoSolicitanteId || ''}
                onChange={(e) => setNewRequest({ ...newRequest, medicoSolicitanteId: e.target.value })}
                required
              >
                <option value="">Selecione o Médico</option>
                {auxData.medicos
                  ?.filter((m) => m.tipo === 'Solicitante')
                  .map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.nome} (CRM: {m.crm})
                    </option>
                  ))}
              </select>
            </div>

            <div className={`${styles.fieldGroup} ${styles.colUbs}`}>
              <label>UBS Solicitante *</label>
              <select
                value={newRequest.ubsResponsavelId || ''}
                onChange={(e) => setNewRequest({ ...newRequest, ubsResponsavelId: e.target.value })}
                required
              >
                <option value="">Selecione a UBS</option>
                {auxData.ubsList?.map((ubs) => (
                  <option key={ubs.id} value={ubs.id}>
                    {ubs.nome} (CNES: {ubs.cnes})
                  </option>
                ))}
              </select>
            </div>

            <div className={`${styles.fieldGroup} ${styles.colRisk}`}>
              <label>Classificação de Risco *</label>
              <select
                value={newRequest.classification || 'Verde'}
                onChange={(e) => setNewRequest({ ...newRequest, classification: e.target.value })}
                required
              >
                <option value="Verde">Verde (Eletivo)</option>
                <option value="Amarelo">Amarelo (Prioritário)</option>
                <option value="Vermelho">Vermelho (Urgente)</option>
              </select>
            </div>

            <div className={`${styles.fieldGroup} ${styles.fullWidth}`}>
              <label htmlFor="justification">Justificativa do Pedido (Quadro Clínico)</label>
              <textarea
                id="justification"
                rows="3"
                placeholder="Descreva a justificativa médica e o quadro clínico do paciente..."
                value={newRequest.justification || ''}
                onChange={(e) => setNewRequest({ ...newRequest, justification: e.target.value })}
              />
            </div>
          </div>
        </div>

        <div className={styles.formActions}>
          <button type="submit" className={styles.primaryBtn}>
            Enviar para Lista de Espera
          </button>
        </div>
      </form>
    </div>
  );
}