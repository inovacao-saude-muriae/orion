'use client';

import { useEffect, useState } from 'react';
import styles from './Financeiro.module.css';
import BotaoEditar from '@/components/BotaoEditar';

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

const NOME_MES = {
  "01": "Janeiro", "02": "Fevereiro", "03": "Março", "04": "Abril",
  "05": "Maio", "06": "Junho", "07": "Julho", "08": "Agosto",
  "09": "Setembro", "10": "Outubro", "11": "Novembro", "12": "Dezembro",
};

const LISTA_COTAS_OFICIAIS = ['SUS', 'Credenciamento', 'OCI'];

const LISTA_CIDADES = [
  'ALÉM PARAÍBA',
  'LEOPOLDINA-CATAGUASES',
  'MANHUAÇU',
];

const brl = (v) =>
  `R$ ${(Number(v) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// Faixas de cor do consumo: verde até 50%, âmbar 50–80%, vermelho >= 80%.
const nivelConsumo = (pct) => {
  if (pct >= 80) return 'estouro';
  if (pct >= 50) return 'alerta';
  return 'ok';
};

const CORES_NIVEL = {
  ok: '#16a34a',
  alerta: '#d97706',
  estouro: '#dc2626',
};

// Gráfico de rosca (donut) em SVG puro, sem dependência externa.
function Donut({ pct, cor, tamanho = 78, espessura = 9 }) {
  const raio = (tamanho - espessura) / 2;
  const circ = 2 * Math.PI * raio;
  const p = Math.max(0, Math.min(100, pct));
  const preenchido = (p / 100) * circ;

  return (
    <svg width={tamanho} height={tamanho} className={styles.donut}>
      <circle
        cx={tamanho / 2}
        cy={tamanho / 2}
        r={raio}
        fill="none"
        stroke="#e2e8f0"
        strokeWidth={espessura}
      />
      <circle
        cx={tamanho / 2}
        cy={tamanho / 2}
        r={raio}
        fill="none"
        stroke={cor}
        strokeWidth={espessura}
        strokeDasharray={`${preenchido} ${circ - preenchido}`}
        strokeDashoffset={circ / 4}
        strokeLinecap="round"
        transform={`rotate(-90 ${tamanho / 2} ${tamanho / 2})`}
        style={{ transition: 'stroke-dasharray 0.4s ease' }}
      />
      <text
        x="50%"
        y="50%"
        dominantBaseline="central"
        textAnchor="middle"
        className={styles.donutText}
      >
        {p.toFixed(0)}%
      </text>
    </svg>
  );
}

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

  // ── Planejamento por cidade ────────────────────────────────────────────
  const [tableData, setTableData] = useState({});

  useEffect(() => {
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

  const totalMes = (idx) =>
    LISTA_CIDADES.reduce((sum, cidade) => sum + ((tableData[cidade] || [])[idx] || 0), 0);

  const totalGeralAno = LISTA_CIDADES.reduce((sum, cidade) => sum + calculateRowTotal(cidade), 0);

  const availableYears = [
    currentYearStr,
    String(Number(currentYearStr) + 1),
    String(Number(currentYearStr) + 2),
  ];

  // ── Detalhes por cota + consolidado ────────────────────────────────────
  const detalhesPorCota = LISTA_COTAS_OFICIAIS.map((tipoCota) => {
    const d = calculateMonthQuotaDetails(tipoCota, activeYear, activeMonth) || {
      totalLimit: 0, totalUsed: 0, available: 0,
    };
    const pct = d.totalLimit > 0 ? (d.totalUsed / d.totalLimit) * 100 : 0;
    return { tipoCota, ...d, pct };
  });

  const consolidado = detalhesPorCota.reduce(
    (acc, d) => ({
      totalLimit: acc.totalLimit + (d.totalLimit || 0),
      totalUsed: acc.totalUsed + (d.totalUsed || 0),
      available: acc.available + (d.available || 0),
    }),
    { totalLimit: 0, totalUsed: 0, available: 0 },
  );
  const consolidadoPct = consolidado.totalLimit > 0
    ? (consolidado.totalUsed / consolidado.totalLimit) * 100
    : 0;
  const consolidadoNivel = nivelConsumo(consolidadoPct);

  // Navegação de mês/ano
  const irMes = (delta) => {
    let m = Number(activeMonth) + delta;
    let y = Number(activeYear);
    if (m < 1) { m = 12; y -= 1; }
    if (m > 12) { m = 1; y += 1; }
    setFinMonth(String(m).padStart(2, '0'));
    setFinYear(String(y));
  };

  const barraClasse = (nivel) =>
    nivel === 'estouro' ? styles.barEstouro : nivel === 'alerta' ? styles.barAlerta : styles.barOk;

  return (
    <div className={styles.financeContainer}>
      {/* CABEÇALHO DE COMPETÊNCIA */}
      <div className={styles.periodHeader}>
        <div className={styles.periodTitle}>
          <h2>Controle Financeiro de Cotas</h2>
          <span>Competência de {NOME_MES[activeMonth] || activeMonth} / {activeYear}</span>
        </div>

        <div className={styles.periodNav}>
          <button type="button" className={styles.navArrow} onClick={() => irMes(-1)} title="Mês anterior">‹</button>
          <select className={styles.periodSelect} value={activeMonth} onChange={(e) => setFinMonth(e.target.value)}>
            {MONTHS_LIST.map((m) => (
              <option key={m.value} value={m.value}>{m.name}</option>
            ))}
          </select>
          <select className={styles.periodSelect} value={activeYear} onChange={(e) => setFinYear(e.target.value)}>
            {availableYears.map((yr) => (
              <option key={yr} value={yr}>{yr}</option>
            ))}
          </select>
          <button type="button" className={styles.navArrow} onClick={() => irMes(1)} title="Próximo mês">›</button>
        </div>
      </div>

      {/* FAIXA DE RESUMO (CONSOLIDADO) */}
      <div className={`${styles.summaryBar} ${styles[`summary_${consolidadoNivel}`]}`}>
        <div className={styles.summaryDonut}>
          <Donut pct={consolidadoPct} cor={CORES_NIVEL[consolidadoNivel]} tamanho={96} espessura={11} />
        </div>
        <div className={styles.summaryStats}>
          <div className={styles.summaryStat}>
            <span className={styles.summaryLabel}>Total Orçado</span>
            <strong className={styles.summaryTotal}>{brl(consolidado.totalLimit)}</strong>
          </div>
          <div className={styles.summaryStat}>
            <span className={styles.summaryLabel}>Total Gasto</span>
            <strong className={styles.summarySpent}>{brl(consolidado.totalUsed)}</strong>
          </div>
          <div className={styles.summaryStat}>
            <span className={styles.summaryLabel}>Saldo Disponível</span>
            <strong className={consolidado.available >= 0 ? styles.summaryPositive : styles.summaryNegative}>
              {brl(consolidado.available)}
            </strong>
          </div>
        </div>
      </div>

      {/* CARDS POR COTA */}
      <div className={styles.financeCardsGrid}>
        {detalhesPorCota.map((d) => {
          const nivel = nivelConsumo(d.pct);
          const cor = CORES_NIVEL[nivel];
          return (
            <div
              key={d.tipoCota}
              className={styles.quotaCard}
              style={{ borderTopColor: cor }}
            >
              <div className={styles.quotaCardHeader}>
                <div>
                  <span className={styles.quotaLabel}>Cota</span>
                  <h3 className={styles.quotaName}>{d.tipoCota}</h3>
                </div>
                {d.pct > 100 && <span className={styles.badgeEstouro}>Estourou</span>}
                {d.pct <= 100 && nivel === 'estouro' && <span className={styles.badgeEstouro}>Acabando</span>}
                {nivel === 'alerta' && <span className={styles.badgeAlerta}>Atenção</span>}
              </div>

              <div className={styles.quotaCardBody}>
                <Donut pct={d.pct} cor={cor} />
                <div className={styles.quotaNumbers}>
                  <div>
                    <span className={styles.mutedText}>Teto</span>
                    <div className={styles.amountTotal}>{brl(d.totalLimit)}</div>
                  </div>
                  <div>
                    <span className={styles.mutedText}>Gasto</span>
                    <div className={styles.amountSpent}>{brl(d.totalUsed)}</div>
                  </div>
                </div>
              </div>

              <div className={styles.quotaCardFooter}>
                <div>
                  <span className={styles.mutedText}>Saldo</span>
                  <div className={d.available >= 0 ? styles.positiveText : styles.negativeText}>
                    {brl(d.available)}
                  </div>
                </div>
                <BotaoEditar
                  onClick={() => handleOpenDefineTetoModal(d.tipoCota, d.totalLimit)}
                  title="Editar Teto de Gastos"
                >
                  Teto
                </BotaoEditar>
              </div>
            </div>
          );
        })}
      </div>

      {/* PLANEJAMENTO MENSAL POR CIDADE */}
      <div className={`${styles.card} ${styles.tableCard}`}>
        <div className={styles.tableHead}>
          <div>
            <h3 className={styles.tableTitle}>Planejamento Mensal por Cidade</h3>
            <p className={styles.tableSubtitle}>
              Ano {activeYear} · salvo automaticamente ao sair de cada campo (registrado para auditoria).
            </p>
          </div>
          <div className={styles.tableTotalPill}>
            Total do ano: <strong>{brl(totalGeralAno)}</strong>
          </div>
        </div>

        <div className={styles.tableResponsive}>
          <table className={styles.cotasTable}>
            <thead>
              <tr>
                <th className={styles.stickyCol}>Cidade</th>
                {DEFAULT_MONTHS_LIST.map((m) => (
                  <th key={m.value}>{m.name}</th>
                ))}
                <th className={styles.totalHeadCell}>TOTAL</th>
              </tr>
            </thead>
            <tbody>
              {LISTA_CIDADES.map((cidade) => {
                const totalRow = calculateRowTotal(cidade);
                return (
                  <tr key={cidade}>
                    <td className={`${styles.cotaNameCell} ${styles.stickyCol}`}>
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
                          placeholder="—"
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
            <tfoot>
              <tr className={styles.totalRow}>
                <td className={styles.stickyCol}><strong>TOTAL</strong></td>
                {DEFAULT_MONTHS_LIST.map((m, idx) => (
                  <td key={m.value} className={styles.totalMesCell}>
                    {totalMes(idx) > 0 ? brl(totalMes(idx)) : '—'}
                  </td>
                ))}
                <td className={styles.grandTotalCell}><strong>{brl(totalGeralAno)}</strong></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
