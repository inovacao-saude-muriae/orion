'use client';

import { useState, useEffect, useCallback } from 'react';
import styles from './AtendimentoServico.module.css';
import { useConfirm } from '@/components/ConfirmDialog';
import { getAgendamentosDoDia } from '../actions';

const STATUS_OPCOES = [
  { value: 'PRESENCA', label: '✅ Presença' },
  { value: 'FALTA', label: '❌ Falta' },
  { value: 'FALTA_JUSTIFICADA', label: '⚠️ Falta justificada' },
];

const hojeYMD = () => new Date().toISOString().split('T')[0];

export default function AtendimentoServico({ servicoNome, onRegistrar }) {
  const confirm = useConfirm();
  const [data, setData] = useState(hojeYMD());
  const [agendamentos, setAgendamentos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [registrando, setRegistrando] = useState(null); // id em processamento

  // Estado por agendamento: status + observação da recepção.
  const [registros, setRegistros] = useState({});

  const carregar = useCallback(async () => {
    setLoading(true);
    const lista = await getAgendamentosDoDia(servicoNome, data);
    setAgendamentos(Array.isArray(lista) ? lista : []);
    // Reinicia os registros com status padrão "PRESENCA".
    const base = {};
    (lista || []).forEach((a) => {
      base[a.id] = { status: 'PRESENCA', observacao: '' };
    });
    setRegistros(base);
    setLoading(false);
  }, [servicoNome, data]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const setCampo = (id, campo, valor) => {
    setRegistros((prev) => ({
      ...prev,
      [id]: { ...(prev[id] || { status: 'PRESENCA', observacao: '' }), [campo]: valor },
    }));
  };

  const registrar = async (ag) => {
    const reg = registros[ag.id] || { status: 'PRESENCA', observacao: '' };

    const ok = await confirm({
      title: 'Registrar atendimento',
      message: `Registrar ${ag.pacienteNome} (${ag.especialidade}) como "${
        STATUS_OPCOES.find((s) => s.value === reg.status)?.label || reg.status
      }"?`,
      confirmText: 'Registrar',
    });
    if (!ok) return;

    setRegistrando(ag.id);
    if (onRegistrar) {
      await onRegistrar({
        pacienteJuntaId: ag.pacienteJuntaId,
        servicoNome,
        especialidade: ag.especialidade,
        data,
        status: reg.status,
        observacao: reg.observacao,
      });
    }
    setRegistrando(null);
  };

  const formatarDiaBR = (ymd) => {
    if (!ymd) return '';
    const [y, m, d] = ymd.split('-');
    return `${d}/${m}/${y}`;
  };

  return (
    <div className={styles.card}>
      <div className={styles.headerRow}>
        <h3 className={styles.title}>
          Recepção e Controle — Serviço: <span className={styles.badgeServico}>{servicoNome}</span>
        </h3>
        <div className={styles.datePicker}>
          <label>Dia</label>
          <input type="date" value={data} onChange={(e) => setData(e.target.value)} />
        </div>
      </div>

      <p className={styles.subtitle}>
        Pacientes agendados para <strong>{formatarDiaBR(data)}</strong>:
        {' '}{agendamentos.length} agendamento(s).
      </p>

      {loading ? (
        <div className={styles.loadingBox}>Carregando agendamentos do dia...</div>
      ) : agendamentos.length === 0 ? (
        <div className={styles.emptyBox}>
          Nenhum paciente agendado para este dia neste serviço.
          <br />
          <small>Agende pela aba <strong>Agenda</strong>.</small>
        </div>
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Horário</th>
                <th>Paciente</th>
                <th>Especialidade</th>
                <th>Frequência</th>
                <th>Observação</th>
                <th style={{ textAlign: 'center' }}>Ação</th>
              </tr>
            </thead>
            <tbody>
              {agendamentos.map((ag) => {
                const reg = registros[ag.id] || { status: 'PRESENCA', observacao: '' };
                return (
                  <tr key={ag.id}>
                    <td><strong>{ag.hora}</strong></td>
                    <td>
                      <strong>{ag.pacienteNome}</strong>
                      {ag.pacienteCpf && <div className={styles.subText}>CPF: {ag.pacienteCpf}</div>}
                    </td>
                    <td>{ag.especialidade}</td>
                    <td>
                      <select
                        className={styles.statusSelect}
                        value={reg.status}
                        onChange={(e) => setCampo(ag.id, 'status', e.target.value)}
                      >
                        {STATUS_OPCOES.map((s) => (
                          <option key={s.value} value={s.value}>{s.label}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input
                        type="text"
                        className={styles.obsInput}
                        placeholder="Opcional"
                        value={reg.observacao}
                        onChange={(e) => setCampo(ag.id, 'observacao', e.target.value)}
                      />
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        type="button"
                        className={styles.registrarBtn}
                        onClick={() => registrar(ag)}
                        disabled={registrando === ag.id}
                      >
                        {registrando === ag.id ? '...' : 'Registrar'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
