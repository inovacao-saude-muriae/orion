'use client';

import { useState } from 'react';
import styles from './AtendimentoServico.module.css';
import { useConfirm } from '@/components/ConfirmDialog';

export default function AtendimentoServico({ servicoNome, pacientes = [], atendimentos = [], onRegistrar }) {
  const confirm = useConfirm();
  const [form, setForm] = useState({
    pacienteId: '',
    especialidade: '',
    data: new Date().toISOString().split('T')[0],
    status: 'PRESENCA',
    observacao: ''
  });

  // Filtra pacientes vinculados ao serviço (testando de forma segura todas as propriedades possíveis)
  const pacientesDoServico = Array.isArray(pacientes)
    ? pacientes.filter((p) => {
        const servicos = p.servicosAtivos || p.servicos_ativos || p.locaisEncaminhados;
        // Se já for uma lista retornada do banco específica para esse serviço, mantém o paciente
        if (!servicos) return true;
        
        return servicos.some(
          (s) => String(s).trim().toLowerCase() === String(servicoNome).trim().toLowerCase()
        );
      })
    : [];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.pacienteId || !form.especialidade) {
      return alert('Selecione o paciente e a especialidade.');
    }

    const ok = await confirm({
      title: 'Registrar atendimento',
      message: 'Deseja registrar esta presença / ocorrência?',
      confirmText: 'Registrar',
    });
    if (!ok) return;

    if (onRegistrar) {
      onRegistrar({ ...form, servico: servicoNome });
    }
    
    setForm({ ...form, pacienteId: '', observacao: '' });
  };

  return (
    <div className={styles.card}>
      <h3 className={styles.title}>
        Recepção e Controle - Serviço: <span className={styles.badgeServico}>{servicoNome}</span>
      </h3>

      <form onSubmit={handleSubmit} className={styles.formGrid}>
        <div className={styles.fieldGroup}>
          <label>Paciente Vinculado ao Serviço *</label>
          <select 
            value={form.pacienteId} 
            onChange={(e) => setForm({ ...form, pacienteId: e.target.value })} 
            required
          >
            <option value="">-- Selecione o Paciente ({pacientesDoServico.length} disponíveis) --</option>
            {pacientesDoServico.map((p) => (
              <option key={p.id || p.paciente_junta_id || p.cpf} value={p.id || p.paciente_junta_id}>
                {p.nomeCompleto || p.nome} (CPF: {p.cpf})
              </option>
            ))}
          </select>
        </div>

        <div className={styles.fieldGroup}>
          <label>Especialidade do Atendimento *</label>
          <input
            type="text"
            placeholder="Ex: Fonoaudiologia, Terapia Ocupacional..."
            value={form.especialidade}
            onChange={(e) => setForm({ ...form, especialidade: e.target.value })}
            required
          />
        </div>

        <div className={styles.fieldGroup}>
          <label>Data *</label>
          <input 
            type="date" 
            value={form.data} 
            onChange={(e) => setForm({ ...form, data: e.target.value })} 
            required 
          />
        </div>

        <div className={styles.fieldGroup}>
          <label>Frequência / Status *</label>
          <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            <option value="PRESENCA">✅ Presença Confimada</option>
            <option value="FALTA">❌ Falta</option>
            <option value="FALTA_JUSTIFICADA">⚠️ Falta Justificada</option>
          </select>
        </div>

        <div className={`${styles.fullWidth} ${styles.fieldGroup}`}>
          <label>Observação / Registro de Atendimento</label>
          <textarea
            rows="3"
            placeholder="Descreva observações da recepção ou do profissional..."
            value={form.observacao}
            onChange={(e) => setForm({ ...form, observacao: e.target.value })}
          />
        </div>

        <div className={`${styles.fullWidth} ${styles.formActions}`}>
          <button type="submit" className={styles.primaryBtn}>Registrar Presença / Ocorrência</button>
        </div>
      </form>
    </div>
  );
}