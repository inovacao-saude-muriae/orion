'use client';

import { useEffect, useState } from 'react';
import styles from './Financeiro.module.css';

const DEFAULT_MONTHS_LIST = [
  { value: "01", name: "Jan" },
  { value: "02", name: "Fev" },
  { value: "03", name: "Mar" },
  { value: "04", name: "Abr" },
  { value: "05", name: "Mai" },
  { value: "06", name: "Jun" },
  { value: "07", name: "Jul" },
  { value: "08", name: "Ago" },
  { value: "09", name: "Set" },
  { value: "10", name: "Out" },
  { value: "11", name: "Nov" },
  { value: "12", name: "Dez" },
];

const LISTA_COTAS_OFICIAIS = ['SUS', 'Credenciamento', 'OCI'];

const LISTA_CIDADES = [
  'ALÉM PARAÍBA',
  'LEOPOLDINA-CATAGUASES',
  'MANHUAÇU',
];

const brl = (v) =>
  `R$ ${(Number(v) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// Classifica o consumo em faixas de cor:
// verde até a metade, amarelo a partir de ~50% e vermelho quando está acabando (>80%).
const nivelConsumo = (pct) => {
  if (pct >= 80) return 'estouro';
  if (pct >= 50) return 'alerta';
  return 'ok';
};

export default function Financeiro({
  finMonth,
  setFinMonth = () => {},
  finYear,
  setFinYear = () => {},
  MONTHS_LIST = DEFAULT_MONTHS_LIST,
  calculateMonthQuotaDetails = () => ({ totalLimit: 0, totalUsed: 0, available: 0 }),
  handleOpenDefineTetoModal = () => {},
  planejamentoCidades = [],
  handleSavePlanejamentoCidade = async () => {},
}) {
  const currentDate = new Date();
  const currentMonthStr = String(currentDate.getMonth() + 1).padStart(2, '0');
  const currentYearStr = String(currentDate.getFullYear());

  const activeMonth = finMonth || currentMonthStr;
  const activeYear = finYear || currentYearStr;

  // ── Planejamento por cidade: mapeia os dados persistidos numa matriz local
  // para edição, e salva no banco ao sair do campo (onBlur). ────────────────
  const [tableData, setTableData] = useState({});

  useEffect(() => {
    // Monta { cidade: [12 valores] } a partir do que veio do banco (ano ativo).
    const base = {};
    LISTA_CIDADES.forEach((cidade) => {
      base[cidade] = Array(12).fill(0);
    });
    (planejamentoCidades || []).forEach((p) => {
      const idx = Number(p.mes) - 1;
      if (!base[p.cidade]) base[p.cidade] = Array(12).fill(0);
      if (idx >= 0 && idx < 12) base[p.cidade][idx] = Number(p.valor) || 0;
    });
    setTableData(base);
  }, [planejamentoCidades]);

  const handleCellChange = (cidade, monthIndex, value) => {
    const numericValue = parseFloat(value) || 0;
    setTableData((prev) => {
      const updatedRow = [...(prev[cidade] || Array(12).fill(0))];
      updatedRow[monthIndex] = numericValue;
      return { ...prev, [cidade]: updatedRow };
    });
  };

  const handleCellBlur = async (cidade, monthIndex) => {
    const valor = (tableData[cidade] || [])[monthIndex] || 0;
    const mes = String(monthIndex + 1).padStart(2, '0');
    await handleSavePlanejamentoCidade(cidade, mes, valor);
  };

  const calculateRowTotal = (cidade) =>
    (tableData[cidade] || []).reduce((sum, val) => sum + (val || 0), 0);

  const availableYears = [
    currentYearStr,
    String(Number(currentYearStr) + 1),
    String(Number(currentYearStr) + 2),
  ];

  // ── Consolidado das cotas do mês ativo ────────────────────────────────────
  const detalhesPorCota = LISTA_COTAS_OFICIAIS.map((tipoCota) => {
    const d = calculateMonthQuotaDetails(tipoCota, activeYear, activeMonth) || {
      totalLimit: 0,
      totalUsed: 0,
      available: 0,
    };
    const pct = d.totalLimit > 0 ? (d.totalUsed / d.totalLimit) * 100 : 0;
    return { tipoCota, ...d, pct };
  });

  const barraClasse = (nivel) =>
    nivel === 'estouro' ? styles.barEstouro : nivel === 'alerta' ? styles.barAlerta : styles.barOk;

  return (
    <div className={styles.financeContainer}>
      {/* FILTRO DE COMPETÊNCIA */}
      <div className={`${styles.card} ${styles.financeHeaderCard}`}>
        <h2 className={styles.cardTitle}>Painel de Controle Financeiro de Cotas</h2>
        <p>Selecione a competência para visualizar limites, gastos e saldos restantes de cada cota:</p>

        <div className={styles.financeFiltersRow}>
          <div className={styles.fieldGroup}>
            <label>Mês de Competência:</label>
            <select value={activeMonth} onChange={(e) => setFinMonth(e.target.value)}>
              {MONTHS_LIST.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.name} ({m.value})
                </option>
              ))}
            </select>
          </div>

          <div className={styles.fieldGroup}>
            <label>Ano de Competência:</label>
            <select value={activeYear} onChange={(e) => setFinYear(e.target.value)}>
              {availableYears.map((yr) => (
                <option key={yr} value={yr}>
                  {yr}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* CARDS POR COTA (dentro do mesmo card da competência) */}
        <div className={styles.financeCardsGrid}>
          {detalhesPorCota.map((d) => {
            const nivel = nivelConsumo(d.pct);
            return (
              <div key={d.tipoCota} className={`${styles.card} ${styles.financeQuotaCard}`}>
              <div className={styles.financeCardHeader}>
                <h3>Cota: {d.tipoCota}</h3>
                <div className={styles.headerRight}>
                  {d.pct > 100 && <span className={styles.badgeEstouro}>Estourou</span>}
                  {d.pct <= 100 && nivel === 'estouro' && <span className={styles.badgeEstouro}>Acabando</span>}
                  {nivel === 'alerta' && <span className={styles.badgeAlerta}>Atenção</span>}
                  <button
                    type="button"
                    onClick={() => handleOpenDefineTetoModal(d.tipoCota, d.totalLimit)}
                    className={styles.iconBtn}
                    title="Editar Teto de Gastos"
                  >
                    <img src="/img/icon/editar.png" alt="Editar" width={16} height={16} style={{ objectFit: 'contain' }} />
                  </button>
                </div>
              </div>

              <div className={styles.financeCardBody}>
                <div>
                  <small className={styles.mutedText}>Teto para {activeMonth}/{activeYear}:</small>
                  <div className={styles.amountTotal}>{brl(d.totalLimit)}</div>
                </div>

                <div>
                  <small className={styles.mutedText}>Total Debitado (Liberados no Mês):</small>
                  <div className={styles.amountSpent}>{brl(d.totalUsed)}</div>
                </div>

                {/* Barra de progresso de consumo */}
                <div className={styles.progressWrap}>
                  <div className={styles.progressTrack}>
                    <div
                      className={`${styles.progressBar} ${barraClasse(nivel)}`}
                      style={{ width: `${Math.min(d.pct, 100)}%` }}
                    />
                  </div>
                  <span className={styles.progressLabel}>{d.pct.toFixed(1)}% consumido</span>
                </div>

                <div className={styles.balanceDivider}>
                  <small className={styles.mutedText}>Saldo Restante:</small>
                  <div className={d.available >= 0 ? styles.positiveText : styles.negativeText}>
                    {brl(d.available)}
                  </div>
                </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* PLANEJAMENTO MENSAL POR CIDADE (persistido) */}
      <div className={`${styles.card} ${styles.tableCard}`}>
        <h3 className={styles.tableTitle}>Planejamento Mensal por Cidade ({activeYear})</h3>
        <p className={styles.tableSubtitle}>
          Os valores são salvos automaticamente ao sair de cada campo e ficam registrados para auditoria.
        </p>

        <div className={styles.tableResponsive}>
          <table className={styles.cotasTable}>
            <thead>
              <tr>
                <th>Cidade</th>
                {DEFAULT_MONTHS_LIST.map((m) => (
                  <th key={m.value}>{m.name}</th>
                ))}
                <th>TOTAL</th>
              </tr>
            </thead>
            <tbody>
              {LISTA_CIDADES.map((cidade) => {
                const totalRow = calculateRowTotal(cidade);
                return (
                  <tr key={cidade}>
                    <td className={styles.cotaNameCell}>
                      <strong>{cidade}</strong>
                    </td>
                    {(tableData[cidade] || Array(12).fill(0)).map((val, idx) => (
                      <td key={idx}>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          className={styles.cellInput}
                          value={val === 0 ? '' : val}
                          placeholder="0,00"
                          onChange={(e) => handleCellChange(cidade, idx, e.target.value)}
                          onBlur={() => handleCellBlur(cidade, idx)}
                        />
                      </td>
                    ))}
                    <td className={styles.totalCell}>
                      <strong>{brl(totalRow)}</strong>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
