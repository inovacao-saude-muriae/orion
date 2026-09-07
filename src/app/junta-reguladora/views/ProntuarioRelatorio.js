'use client';

import { useState, useEffect } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { buscarPessoaExistente } from '../actions';
import styles from './ProntuarioRelatorio.module.css';

export default function ProntuarioRelatorio({ prontuarioData, onBuscar }) {
  const [termo, setTermo] = useState('');
  const [sugestoes, setSugestoes] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  // 🎯 LIMPEZA SILENCIOSA DOS CAMPOS AO DESMONTA/TROCAR DE ABA
  useEffect(() => {
    return () => {
      setTermo('');
      setSugestoes([]);
      setShowDropdown(false);
    };
  }, []);

  const formatCPF = (cpf) => {
    if (!cpf) return '';
    const digits = cpf.replace(/\D/g, '');
    return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  };

  const handleInputChange = async (valor) => {
    setTermo(valor);
    if (valor.trim().length >= 2) {
      setIsSearching(true);
      setShowDropdown(true);
      try {
        const resultados = await buscarPessoaExistente(valor.trim());
        setSugestoes(resultados || []);
      } catch (error) {
        console.error('Erro ao buscar sugestões:', error);
        setSugestoes([]);
      } finally {
        setIsSearching(false);
      }
    } else {
      setSugestoes([]);
      setShowDropdown(false);
    }
  };

  const handleSelectPessoa = (pessoa) => {
    const nomeSelecionado = pessoa.nomeCompleto || pessoa.nome || '';
    
    // Insere o NOME no campo visual do input
    setTermo(nomeSelecionado);
    setShowDropdown(false);

    // Dispara a consulta com o CPF do paciente selecionado
    if (onBuscar) {
      onBuscar(pessoa.cpf || nomeSelecionado);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (!termo.trim()) return alert('Digite um Nome ou CPF para pesquisar.');
    setShowDropdown(false);
    if (onBuscar) {
      onBuscar(termo.trim());
    }
  };

  const paciente = prontuarioData?.paciente;
  const servicosAgrupados = prontuarioData?.servicosAgrupados || [];

  const gerarPDFDownload = () => {
    if (!paciente) return;

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const dataEmissao = `${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;

    doc.setFillColor(2, 132, 199);
    doc.rect(0, 0, 210, 18, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('ORION - JUNTA REGULADORA MULTIDISCIPLINAR', 14, 12);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(`Emissão: ${dataEmissao}`, 196, 12, { align: 'right' });

    doc.setTextColor(30, 41, 59);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('PRONTUÁRIO UNIFICADO E RELATÓRIO DE FREQUÊNCIAS', 14, 28);

    autoTable(doc, {
      startY: 32,
      theme: 'grid',
      headStyles: {
        fillColor: [30, 41, 59],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 9,
      },
      head: [['DADOS PESSOAIS DO PACIENTE', '']],
      body: [
        ['Nome Completo:', paciente.nome || '-'],
        ['CPF:', formatCPF(paciente.cpf) || '-'],
        ['Nome da Mãe:', paciente.nomeMae || 'Não informado'],
        ['Data de Nascimento:', paciente.data_nascimento ? new Date(paciente.data_nascimento).toLocaleDateString('pt-BR') : 'Não informada'],
        ['Telefone / WhatsApp:', paciente.telefone || 'Não informado'],
        ['Diagnóstico / Deficiência:', paciente.tipo_deficiencia || 'Não informado'],
        ['Endereço:', paciente.logradouro ? `${paciente.logradouro}, ${paciente.numero} - ${paciente.bairro}` : 'Não informado'],
        ['Serviços Ativos Vinculados:', paciente.servicos_ativos?.length > 0 ? paciente.servicos_ativos.join(', ') : 'Nenhum serviço ativo'],
      ],
      styles: { fontSize: 8, cellPadding: 2 },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 45, fillColor: [248, 250, 252] },
        1: { cellWidth: 'auto' },
      },
    });

    let currentY = doc.lastAutoTable.finalY + 8;

    if (servicosAgrupados.length === 0) {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(100, 116, 139);
      doc.text('Nenhum registro de atendimento ou frequência gravado no sistema.', 14, currentY);
    } else {
      servicosAgrupados.forEach((grupo) => {
        if (currentY > 250) {
          doc.addPage();
          currentY = 20;
        }

        doc.setFillColor(241, 245, 249);
        doc.setDrawColor(203, 213, 225);
        doc.rect(14, currentY, 182, 10, 'FD');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(2, 132, 199);
        doc.text(`SERVIÇO: ${grupo.servico}`, 18, currentY + 6.5);

        doc.setTextColor(30, 41, 59);
        doc.text(`Especialidade: ${grupo.especialidade}`, 80, currentY + 6.5);

        const resumoFrequencia = `Presenças: ${grupo.presencas} | Faltas: ${grupo.faltas} | Justificadas: ${grupo.faltasJustificadas}`;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.text(resumoFrequencia, 192, currentY + 6.5, { align: 'right' });

        currentY += 12;

        const tableBody = grupo.datas.map((d) => {
          let statusText = 'Presença Confirmada';
          if (d.status === 'FALTA') statusText = 'Falta';
          if (d.status === 'FALTA_JUSTIFICADA') statusText = 'Falta Justificada';

          return [
            new Date(d.data).toLocaleDateString('pt-BR'),
            statusText,
            d.profissional || '-',
            d.observacao || '-',
          ];
        });

        autoTable(doc, {
          startY: currentY,
          theme: 'striped',
          headStyles: {
            fillColor: [71, 85, 105],
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 8,
          },
          head: [['Data', 'Frequência / Status', 'Profissional', 'Observação']],
          body: tableBody,
          styles: { fontSize: 8, cellPadding: 2.5 },
          columnStyles: {
            0: { cellWidth: 28, fontStyle: 'bold' },
            1: { cellWidth: 40 },
            2: { cellWidth: 45 },
            3: { cellWidth: 'auto' },
          },
          didParseCell: (data) => {
            if (data.section === 'body' && data.column.index === 1) {
              const val = data.cell.raw;
              if (val === 'Presença Confirmada') {
                data.cell.styles.textColor = [22, 101, 52];
                data.cell.styles.fontStyle = 'bold';
              } else if (val === 'Falta') {
                data.cell.styles.textColor = [153, 27, 27];
                data.cell.styles.fontStyle = 'bold';
              } else if (val === 'Falta Justificada') {
                data.cell.styles.textColor = [146, 64, 14];
                data.cell.styles.fontStyle = 'bold';
              }
            }
          },
        });

        currentY = doc.lastAutoTable.finalY + 8;
      });
    }

    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);
      doc.text(
        `Página ${i} de ${totalPages} - Documento Gerado pelo Sistema Orion`,
        105,
        290,
        { align: 'center' }
      );
    }

    const nomeLimpo = (paciente.nome || 'Paciente').replace(/[^a-zA-Z0-9]/g, '_');
    doc.save(`Prontuario_${nomeLimpo}.pdf`);
  };

  return (
    <div className={styles.card}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3 className={styles.title} style={{ margin: 0 }}>Prontuário Unificado e Relatório de Serviços</h3>
        {paciente && (
          <button
            type="button"
            onClick={gerarPDFDownload}
            style={{
              backgroundColor: '#16a34a',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              padding: '0.65rem 1.25rem',
              fontWeight: 'bold',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.12)',
            }}
          >
            📥 Baixar Relatório em PDF
          </button>
        )}
      </div>

      {/* CAMPO DE BUSCA COM AUTOCOMPLETAR */}
      <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
        <form onSubmit={handleSearchSubmit} className={styles.searchRow}>
          <div style={{ position: 'relative', flex: 1 }}>
            <input
              type="text"
              placeholder="Digite o Nome ou CPF do paciente para buscar no banco..."
              value={termo}
              onChange={(e) => handleInputChange(e.target.value)}
              style={{ width: '100%' }}
            />

            {showDropdown && sugestoes.length > 0 && (
              <ul
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  backgroundColor: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  zIndex: 99,
                  listStyle: 'none',
                  padding: 0,
                  margin: '4px 0 0 0',
                  maxHeight: '220px',
                  overflowY: 'auto',
                }}
              >
                {sugestoes.map((p, index) => (
                  <li
                    key={p.cpf ? `${p.cpf}-${index}` : index}
                    onClick={() => handleSelectPessoa(p)}
                    style={{
                      padding: '10px 14px',
                      cursor: 'pointer',
                      borderBottom: '1px solid #f1f5f9',
                      fontSize: '0.9rem',
                    }}
                    onMouseDown={(e) => e.preventDefault()}
                  >
                    <strong>{p.nomeCompleto || p.nome}</strong> — CPF: {formatCPF(p.cpf)}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <button type="submit" className={styles.primaryBtn}>
            {isSearching ? 'Buscando...' : 'Buscar Prontuário'}
          </button>
        </form>
      </div>

      {paciente ? (
        <div className={styles.prontuarioBox}>
          {/* DADOS GERAIS */}
          <div className={styles.infoCard}>
            <h4>Dados do Paciente</h4>
            <p><strong>Nome:</strong> {paciente.nome}</p>
            <p><strong>CPF:</strong> {formatCPF(paciente.cpf)}</p>
            <p><strong>Nome da Mãe:</strong> {paciente.nomeMae || 'Não informado'}</p>
            <p><strong>Data Nascimento:</strong> {paciente.data_nascimento ? new Date(paciente.data_nascimento).toLocaleDateString('pt-BR') : 'Não informada'}</p>
            <p><strong>Telefone:</strong> {paciente.telefone || 'Não informado'}</p>
            <p><strong>Deficiência/Diagnóstico:</strong> {paciente.tipo_deficiencia || 'Não informado'}</p>
          </div>

          {/* SERVIÇOS VINCULADOS */}
          <div className={styles.infoCard}>
            <h4>Serviços onde o Paciente está Ativo</h4>
            <div className={styles.badgesGroup}>
              {paciente.servicos_ativos && paciente.servicos_ativos.length > 0 ? (
                paciente.servicos_ativos.map((servico) => (
                  <span key={servico} className={styles.activeBadge}>
                    🟢 {servico}
                  </span>
                ))
              ) : (
                <span style={{ color: '#64748b', fontSize: '0.85rem' }}>Nenhum serviço ativo vinculado.</span>
              )}
            </div>
          </div>

          {/* HISTÓRICO AGRUPADO POR SERVIÇO E ESPECIALIDADE */}
          <div className={styles.historySection}>
            <h4 style={{ marginBottom: '1rem' }}>Relatório Multidisciplinar por Serviço e Especialidade</h4>

            {servicosAgrupados.length === 0 ? (
              <p className={styles.emptyMsg}>Nenhum registro de atendimento ou frequência gravado até o momento.</p>
            ) : (
              servicosAgrupados.map((grupo, idx) => (
                <div
                  key={idx}
                  style={{
                    backgroundColor: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '1.25rem',
                    marginBottom: '1.5rem',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      borderBottom: '2px solid #cbd5e1',
                      paddingBottom: '0.75rem',
                      marginBottom: '1rem',
                      flexWrap: 'wrap',
                      gap: '0.5rem',
                    }}
                  >
                    <div>
                      <span
                        style={{
                          backgroundColor: '#0284c7',
                          color: '#fff',
                          padding: '4px 10px',
                          borderRadius: '4px',
                          fontWeight: 'bold',
                          fontSize: '0.85rem',
                          marginRight: '8px',
                        }}
                      >
                        SERVIÇO: {grupo.servico}
                      </span>
                      <strong style={{ fontSize: '1.05rem', color: '#1e293b' }}>
                        Especialidade: {grupo.especialidade}
                      </strong>
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.8rem', fontWeight: 'bold' }}>
                      <span style={{ color: '#166534', background: '#dcfce7', padding: '2px 8px', borderRadius: '4px' }}>
                        ✅ {grupo.presencas} Presença(s)
                      </span>
                      <span style={{ color: '#991b1b', background: '#fee2e2', padding: '2px 8px', borderRadius: '4px' }}>
                        ❌ {grupo.faltas} Falta(s)
                      </span>
                      {grupo.faltasJustificadas > 0 && (
                        <span style={{ color: '#92400e', background: '#fef3c7', padding: '2px 8px', borderRadius: '4px' }}>
                          ⚠️ {grupo.faltasJustificadas} Justificada(s)
                        </span>
                      )}
                    </div>
                  </div>

                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th style={{ width: '20%' }}>Data do Atendimento</th>
                        <th style={{ width: '30%' }}>Frequência / Status</th>
                        <th style={{ width: '25%' }}>Profissional</th>
                        <th style={{ width: '25%' }}>Observação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {grupo.datas.map((d) => (
                        <tr key={d.id}>
                          <td>
                            <strong>{new Date(d.data).toLocaleDateString('pt-BR')}</strong>
                          </td>
                          <td>
                            <span
                              style={{
                                padding: '4px 10px',
                                borderRadius: '4px',
                                fontWeight: 'bold',
                                fontSize: '0.85rem',
                                display: 'inline-block',
                                backgroundColor:
                                  d.status === 'PRESENCA' ? '#dcfce7' :
                                  d.status === 'FALTA' ? '#fee2e2' : '#fef3c7',
                                color:
                                  d.status === 'PRESENCA' ? '#166534' :
                                  d.status === 'FALTA' ? '#991b1b' : '#92400e',
                              }}
                            >
                              {d.status === 'PRESENCA' && '✅ Presença Confirmada'}
                              {d.status === 'FALTA' && '❌ Falta'}
                              {d.status === 'FALTA_JUSTIFICADA' && '⚠️ Falta Justificada'}
                            </span>
                          </td>
                          <td>{d.profissional || '-'}</td>
                          <td>{d.observacao || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))
            )}
          </div>
        </div>
      ) : (
        <div className={styles.placeholderBox}>
          Digite o nome ou CPF no campo acima para pesquisar o histórico do paciente no banco de dados.
        </div>
      )}
    </div>
  );
}