'use client';

import { useState } from 'react';
import * as XLSX from 'xlsx';
import styles from './Relatorios.module.css';

const TIPOS_RELATORIO = [
  { value: 'TODOS', label: 'Todos os relatórios' },
  { value: 'ENTRADAS', label: 'Registro de entradas' },
  { value: 'SAIDAS', label: 'Registro de saídas' },
  { value: 'SAIDA_MED', label: 'Saída por medicamento' },
];

export default function TabRelatorios({
  entradas = [],
  saidas = [],
  saidaPorMedicamento = [],
}) {
  const [mes, setMes] = useState('');
  const [ano, setAno] = useState('');
  const [tipoRelatorio, setTipoRelatorio] = useState('TODOS');

  const [relatorioGerado, setRelatorioGerado] = useState(false);
  const [entradasFiltradas, setEntradasFiltradas] = useState([]);
  const [saidasFiltradas, setSaidasFiltradas] = useState([]);
  const [saidaMedFiltrada, setSaidaMedFiltrada] = useState([]);

  const mostrarEntradas = tipoRelatorio === 'TODOS' || tipoRelatorio === 'ENTRADAS';
  const mostrarSaidas = tipoRelatorio === 'TODOS' || tipoRelatorio === 'SAIDAS';
  const mostrarSaidaMed = tipoRelatorio === 'TODOS' || tipoRelatorio === 'SAIDA_MED';

  // Filtro por mês/ano (aceita DD/MM/YYYY e YYYY-MM-DD).
  const filtrarPorData = (dataStr) => {
    if (!mes && !ano) return true;
    if (!dataStr) return true;

    let mesItem, anoItem;
    if (dataStr.includes('/')) {
      const partes = dataStr.split(' ')[0].split('/');
      mesItem = Number(partes[1]);
      anoItem = Number(partes[2]);
    } else if (dataStr.includes('-')) {
      const partes = dataStr.split('T')[0].split('-');
      mesItem = Number(partes[1]);
      anoItem = Number(partes[0]);
    } else {
      return true;
    }

    const matchMes = mes === '' || mesItem === Number(mes);
    const matchAno = ano === '' || anoItem === Number(ano);
    return matchMes && matchAno;
  };

  const handleGerarRelatorio = (e) => {
    e.preventDefault();

    setEntradasFiltradas(entradas.filter((item) => filtrarPorData(item.dataEntrada)));
    setSaidasFiltradas(saidas.filter((item) => filtrarPorData(item.dataDispensacao)));

    // Saída por medicamento: refaz a agregação a partir das saídas filtradas
    // para respeitar o período selecionado.
    const saidasNoPeriodo = saidas.filter((item) => filtrarPorData(item.dataDispensacao));
    const mapa = new Map();
    for (const s of saidasNoPeriodo) {
      const chave = `${s.medicamentoNome}||${s.dosagem || ''}`;
      const atual = mapa.get(chave) || {
        medicamentoNome: s.medicamentoNome,
        dosagem: s.dosagem || '',
        totalSaida: 0,
        meses: new Set(),
      };
      atual.totalSaida += Number(s.quantidade || 0);
      // Extrai o mês/ano da data para contar meses distintos.
      const dt = (s.dataDispensacao || '').split(' ')[0];
      if (dt) {
        const p = dt.includes('/') ? dt.split('/') : dt.split('-').reverse();
        atual.meses.add(`${p[2] || p[1]}-${p[1]}`);
      }
      mapa.set(chave, atual);
    }
    const saidaMed = [...mapa.values()]
      .map((m) => {
        const nMeses = m.meses.size || 1;
        return {
          medicamentoNome: m.medicamentoNome,
          dosagem: m.dosagem,
          totalSaida: m.totalSaida,
          mesesComSaida: nMeses,
          mediaMensal: Math.round((m.totalSaida / nMeses) * 100) / 100,
        };
      })
      .sort((a, b) => b.totalSaida - a.totalSaida);

    // Se não houver filtro de período, usa a agregação vinda do servidor
    // (mais precisa em relação aos meses distintos reais).
    setSaidaMedFiltrada(!mes && !ano ? saidaPorMedicamento : saidaMed);

    setRelatorioGerado(true);
  };

  const sufixoArquivo = `${mes || 'Geral'}_${ano || 'Geral'}`;

  const baixarPlanilha = (dadosFormatados, nomeAba, nomeArquivo) => {
    if (dadosFormatados.length === 0) {
      return alert('Nenhum dado para exportar.');
    }
    const worksheet = XLSX.utils.json_to_sheet(dadosFormatados);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, nomeAba);
    worksheet['!cols'] = Object.keys(dadosFormatados[0]).map((key) => ({
      wch: Math.max(key.length + 5, 18),
    }));
    XLSX.writeFile(workbook, nomeArquivo);
  };

  const exportarEntradas = () => {
    baixarPlanilha(
      entradasFiltradas.map((d) => ({
        'Data Entrada': d.dataEntrada || '—',
        Medicamento: d.medicamentoNome || '—',
        Dosagem: d.dosagem || '—',
        Quantidade: Number(d.quantidade || 0),
        'Valor Unitário (R$)': Number(d.valorUnitario || 0),
        'Valor Total (R$)': Number(d.quantidade || 0) * Number(d.valorUnitario || 0),
        Fornecedor: d.fornecedor || '—',
        Lote: d.numeroLote || '—',
        Validade: d.dataValidade || '—',
      })),
      'Entradas',
      `Relatorio_Entradas_${sufixoArquivo}.xlsx`,
    );
  };

  const exportarSaidas = () => {
    baixarPlanilha(
      saidasFiltradas.map((d) => ({
        'Data Saída': d.dataDispensacao || '—',
        Paciente: d.pacienteNome || '—',
        CPF: d.cpf || '—',
        Medicamento: d.medicamentoNome || '—',
        Dosagem: d.dosagem || '—',
        Quantidade: Number(d.quantidade || 0),
        'Responsável / Obs': d.observacao || '—',
        'Protocolo / Pasta': `#${d.numeroPasta || '—'}`,
      })),
      'Saidas',
      `Relatorio_Saidas_${sufixoArquivo}.xlsx`,
    );
  };

  const exportarSaidaMed = () => {
    baixarPlanilha(
      saidaMedFiltrada.map((d) => ({
        Medicamento: d.medicamentoNome || '—',
        Concentração: d.dosagem || '—',
        'Quantidade Saída': Number(d.totalSaida || 0),
        'Meses com Saída': Number(d.mesesComSaida || 0),
        'Média Mensal': Number(d.mediaMensal || 0),
      })),
      'SaidaPorMedicamento',
      `Relatorio_SaidaPorMedicamento_${sufixoArquivo}.xlsx`,
    );
  };

  return (
    <div className={styles.container}>
      {/* FILTROS */}
      <div className={styles.filterCard}>
        <h3 className={styles.filterTitle}>Filtros do Relatório</h3>

        <form onSubmit={handleGerarRelatorio} className={styles.filterGrid}>
          <div className={styles.fieldGroup}>
            <label>Tipo de Relatório</label>
            <select value={tipoRelatorio} onChange={(e) => setTipoRelatorio(e.target.value)}>
              {TIPOS_RELATORIO.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          <div className={styles.fieldGroup}>
            <label>Mês de Referência</label>
            <select value={mes} onChange={(e) => setMes(e.target.value)}>
              <option value="">Todos os Meses</option>
              <option value="1">Janeiro</option>
              <option value="2">Fevereiro</option>
              <option value="3">Março</option>
              <option value="4">Abril</option>
              <option value="5">Maio</option>
              <option value="6">Junho</option>
              <option value="7">Julho</option>
              <option value="8">Agosto</option>
              <option value="9">Setembro</option>
              <option value="10">Outubro</option>
              <option value="11">Novembro</option>
              <option value="12">Dezembro</option>
            </select>
          </div>

          <div className={styles.fieldGroup}>
            <label>Ano</label>
            <select value={ano} onChange={(e) => setAno(e.target.value)}>
              <option value="">Todos os Anos</option>
              <option value="2026">2026</option>
              <option value="2025">2025</option>
              <option value="2024">2024</option>
            </select>
          </div>

          <div className={styles.btnGroup}>
            <button type="submit" className={styles.gerarBtn}>
              Gerar Relatório
            </button>
          </div>
        </form>
      </div>

      {/* REGISTRO DE ENTRADAS */}
      {mostrarEntradas && (
        <div className={styles.tableCard}>
          <div className={styles.tableHeader}>
            <div>
              <h4>Registro de Entrada de Medicamentos</h4>
              <small>
                {relatorioGerado
                  ? `${entradasFiltradas.length} registro(s) encontrado(s)`
                  : 'Aguardando geração do relatório'}
              </small>
            </div>
            {relatorioGerado && (
              <div className={styles.actionsGroup}>
                <button type="button" onClick={exportarEntradas} className={styles.excelBtn}>
                  Exportar Excel
                </button>
              </div>
            )}
          </div>

          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Data Entrada</th>
                  <th>Medicamento</th>
                  <th>Qtd</th>
                  <th>V. Unitário (R$)</th>
                  <th>Fornecedor</th>
                  <th>Lote</th>
                  <th>Validade</th>
                </tr>
              </thead>
              <tbody>
                {!relatorioGerado ? (
                  <tr>
                    <td colSpan="7" className={styles.emptyTd}>
                      Selecione o período e clique em <strong>&quot;Gerar Relatório&quot;</strong>.
                    </td>
                  </tr>
                ) : entradasFiltradas.length === 0 ? (
                  <tr>
                    <td colSpan="7" className={styles.emptyTd}>
                      Nenhum registro de entrada no período selecionado.
                    </td>
                  </tr>
                ) : (
                  entradasFiltradas.map((item, idx) => (
                    <tr key={item.loteId || idx}>
                      <td>{item.dataEntrada}</td>
                      <td><strong>{item.medicamentoNome}</strong> ({item.dosagem})</td>
                      <td><strong>{item.quantidade}</strong></td>
                      <td>R$ {Number(item.valorUnitario || 0).toFixed(2)}</td>
                      <td>{item.fornecedor}</td>
                      <td>{item.numeroLote}</td>
                      <td>{item.dataValidade}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* REGISTRO DE SAÍDAS */}
      {mostrarSaidas && (
        <div className={styles.tableCard}>
          <div className={styles.tableHeader}>
            <div>
              <h4>Registro de Saídas (Dispensações)</h4>
              <small>
                {relatorioGerado
                  ? `${saidasFiltradas.length} registro(s) encontrado(s)`
                  : 'Aguardando geração do relatório'}
              </small>
            </div>
            {relatorioGerado && (
              <div className={styles.actionsGroup}>
                <button type="button" onClick={exportarSaidas} className={styles.excelBtn}>
                  Exportar Excel
                </button>
              </div>
            )}
          </div>

          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Paciente</th>
                  <th>Medicamento</th>
                  <th>Qtd</th>
                  <th>Responsável</th>
                  <th>Protocolo</th>
                </tr>
              </thead>
              <tbody>
                {!relatorioGerado ? (
                  <tr>
                    <td colSpan="6" className={styles.emptyTd}>
                      Selecione o período e clique em <strong>&quot;Gerar Relatório&quot;</strong>.
                    </td>
                  </tr>
                ) : saidasFiltradas.length === 0 ? (
                  <tr>
                    <td colSpan="6" className={styles.emptyTd}>
                      Nenhum registro de saída no período selecionado.
                    </td>
                  </tr>
                ) : (
                  saidasFiltradas.map((item, idx) => (
                    <tr key={item.dispensacaoId || idx}>
                      <td>{item.dataDispensacao}</td>
                      <td><strong>{item.pacienteNome}</strong></td>
                      <td>{item.medicamentoNome} ({item.dosagem})</td>
                      <td><strong>{item.quantidade}</strong></td>
                      <td>{item.observacao}</td>
                      <td>#{item.numeroPasta}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SAÍDA POR MEDICAMENTO */}
      {mostrarSaidaMed && (
        <div className={styles.tableCard}>
          <div className={styles.tableHeader}>
            <div>
              <h4>Saída por Medicamento</h4>
              <small>
                {relatorioGerado
                  ? `${saidaMedFiltrada.length} medicamento(s) com saída`
                  : 'Aguardando geração do relatório'}
              </small>
            </div>
            {relatorioGerado && (
              <div className={styles.actionsGroup}>
                <button type="button" onClick={exportarSaidaMed} className={styles.excelBtn}>
                  Exportar Excel
                </button>
              </div>
            )}
          </div>

          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Medicamento</th>
                  <th>Concentração</th>
                  <th>Quantidade saída</th>
                  <th>Meses com saída</th>
                  <th>Média mensal</th>
                </tr>
              </thead>
              <tbody>
                {!relatorioGerado ? (
                  <tr>
                    <td colSpan="5" className={styles.emptyTd}>
                      Selecione o período e clique em <strong>&quot;Gerar Relatório&quot;</strong>.
                    </td>
                  </tr>
                ) : saidaMedFiltrada.length === 0 ? (
                  <tr>
                    <td colSpan="5" className={styles.emptyTd}>
                      Nenhuma saída registrada no período selecionado.
                    </td>
                  </tr>
                ) : (
                  saidaMedFiltrada.map((item, idx) => (
                    <tr key={item.medicamentoId || idx}>
                      <td><strong>{item.medicamentoNome}</strong></td>
                      <td>{item.dosagem || '—'}</td>
                      <td><strong>{item.totalSaida}</strong></td>
                      <td>{item.mesesComSaida}</td>
                      <td><strong>{item.mediaMensal}</strong> / mês</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
