'use client';

import { useState, useEffect } from 'react';
import { obterDadosDoServico } from './actions';
import styles from './ServicoAtendimento.module.css';

export default function ServicoAtendimento({ subTab = 'CAEE' }) {
  const [nomeServicoAtivo, setNomeServicoAtivo] = useState(`Atendimento ${subTab}`);
  const [loading, setLoading] = useState(true);

  // Busca o nome real cadastrado no banco de dados
  useEffect(() => {
    async function carregarServico() {
      setLoading(true);
      const dados = await obterDadosDoServico(subTab);
      setNomeServicoAtivo(dados.nome);
      setLoading(false);
    }

    carregarServico();
  }, [subTab]);

  const [cpfOuNome, setCpfOuNome] = useState('');
  const [dataAtendimento, setDataAtendimento] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [statusFrequencia, setStatusFrequencia] = useState('PRESENCA');
  const [profissional, setProfissional] = useState('');
  const [observacao, setObservacao] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!cpfOuNome.trim()) return alert('Informe o Nome ou CPF do paciente.');

    const payload = {
      servico: subTab,
      cpfOuNome,
      dataAtendimento,
      statusFrequencia,
      profissional,
      observacao,
    };

    console.log('Registrando Atendimento:', payload);
    alert(`Atendimento registrado com sucesso para ${nomeServicoAtivo}!`);

    setCpfOuNome('');
    setProfissional('');
    setObservacao('');
  };

  return (
    <div className={styles.card}>
      <div className={styles.headerGroup}>
        <h3 className={styles.title}>
          {loading ? 'Carregando serviço...' : nomeServicoAtivo}
        </h3>
        <span className={styles.badgeCode}>Sub-Aba: {subTab}</span>
      </div>

      <form onSubmit={handleSubmit} className={styles.formGrid}>
        <div className={styles.fieldGroup}>
          <label>Paciente (Nome ou CPF) *</label>
          <input
            type="text"
            placeholder="Digite o nome ou CPF do paciente..."
            value={cpfOuNome}
            onChange={(e) => setCpfOuNome(e.target.value)}
            required
          />
        </div>

        <div className={styles.fieldGroup}>
          <label>Data do Atendimento *</label>
          <input
            type="date"
            value={dataAtendimento}
            onChange={(e) => setDataAtendimento(e.target.value)}
            required
          />
        </div>

        <div className={styles.fieldGroup}>
          <label>Status / Frequência *</label>
          <select
            value={statusFrequencia}
            onChange={(e) => setStatusFrequencia(e.target.value)}
          >
            <option value="PRESENCA">✅ Presença Confirmada</option>
            <option value="FALTA">❌ Falta</option>
            <option value="FALTA_JUSTIFICADA">⚠️ Falta Justificada</option>
          </select>
        </div>

        <div className={styles.fieldGroup}>
          <label>Profissional Responsável</label>
          <input
            type="text"
            placeholder="Ex: Dra. Ana (Psicóloga)"
            value={profissional}
            onChange={(e) => setProfissional(e.target.value)}
          />
        </div>

        <div className={`${styles.fieldGroup} ${styles.fullWidth}`}>
          <label>Observação / Evolução Resumida</label>
          <textarea
            rows="3"
            placeholder="Digite detalhes relevantes sobre a sessão ou justificativa da falta..."
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
          />
        </div>

        <div className={`${styles.fullWidth} ${styles.formActions}`}>
          <button type="submit" className={styles.primaryBtn}>
            Salvar Atendimento em {subTab}
          </button>
        </div>
      </form>
    </div>
  );
}