"use client";

import { useState, useRef, useEffect } from "react";
import styles from "./Dispensacao.module.css";
import { documentoPaciente } from "@/app/regulacao/constants";

export default function TabDispensacao({
  pacientes = [],
  estoqueLotes = [],
  onConfirmarDispensacao,
  onGetMedicamentosPaciente = async () => ({ medicamentos: [], lotes: [] }),
}) {
  const [search, setSearch] = useState("");
  const [selectedPaciente, setSelectedPaciente] = useState(null);
  // Responsável pela entrega = usuário logado (preenchido automaticamente).
  const [responsavelEntrega, setResponsavelEntrega] = useState("");
  const [observacao, setObservacao] = useState("");

  // Dropdown de busca de paciente (estilo tabela, como em Pacientes).
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);
  const patientDropdownRef = useRef(null);

  // Medicamentos vinculados ao paciente selecionado (com saldo total em estoque).
  const [medicamentosPaciente, setMedicamentosPaciente] = useState([]);
  const [carregandoMeds, setCarregandoMeds] = useState(false);

  const [carrinhoDispensacao, setCarrinhoDispensacao] = useState([]);

  // Fecha o dropdown de paciente ao clicar fora.
  useEffect(() => {
    function handleClickOutside(e) {
      if (
        patientDropdownRef.current &&
        !patientDropdownRef.current.contains(e.target)
      ) {
        setShowPatientDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Carrega o usuário logado para preencher o responsável pela entrega.
  useEffect(() => {
    let ativo = true;
    (async () => {
      try {
        const res = await fetch("/api/me");
        if (!res.ok) return;
        const data = await res.json();
        if (ativo) setResponsavelEntrega(data?.user?.nomeCompleto || "");
      } catch {
        /* silencioso: campo fica vazio se falhar */
      }
    })();
    return () => {
      ativo = false;
    };
  }, []);

  // Seleção do medicamento vinculado + quantidade.
  const [selectedMedId, setSelectedMedId] = useState("");
  const [qtdEntregue, setQtdEntregue] = useState("");

  // ESTADO DO MODAL DE CONFIRMAÇÃO
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const normalizeSearchValue = (value) =>
    String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();

  // FILTRO DE PACIENTES
  const normalizedPatientSearch = normalizeSearchValue(search);
  const normalizedPatientCpfSearch = search.replace(/\D/g, "");
  const filteredPacientes = pacientes.filter((p) => {
    const matchesText = [p.patientName, p.numeroPasta, p.numeroProcesso].some(
      (value) => normalizeSearchValue(value).includes(normalizedPatientSearch),
    );
    const matchesCpf =
      normalizedPatientCpfSearch.length > 0 &&
      String(p.cpf || "")
        .replace(/\D/g, "")
        .includes(normalizedPatientCpfSearch);

    return matchesText || matchesCpf;
  });

  // Medicamento escolhido no dropdown (para saber o saldo total disponível).
  const medSelecionado = medicamentosPaciente.find(
    (m) => String(m.medicamentoId) === String(selectedMedId),
  );

  // Remove duplicados por CPF na lista de pacientes (uma pessoa pode ter várias pastas).
  const removeDuplicadosPorCpf = (lista) => {
    const vistos = new Set();
    return lista.filter((p) => {
      const cpf = (p.cpf || "").replace(/\D/g, "");
      if (!cpf) return true;
      if (vistos.has(cpf)) return false;
      vistos.add(cpf);
      return true;
    });
  };

  const handleSelectPaciente = async (p) => {
    setSelectedPaciente(p);
    setSearch(`${p.patientName} (${documentoPaciente({ cpf: p.cpf, cns: p.cns })})`);
    setShowPatientDropdown(false);
    setCarrinhoDispensacao([]);
    setSelectedMedId("");

    // Carrega os medicamentos vinculados ao paciente.
    setCarregandoMeds(true);
    const res = await onGetMedicamentosPaciente(p.numeroPasta);
    setMedicamentosPaciente(res?.medicamentos || []);
    setCarregandoMeds(false);
  };

  const limparPaciente = () => {
    setSelectedPaciente(null);
    setSearch("");
    setMedicamentosPaciente([]);
    setCarrinhoDispensacao([]);
    setShowPatientDropdown(false);
    setSelectedMedId("");
  };

  // Seleção do medicamento vinculado (dropdown).
  const handleSelectMedicamento = (e) => {
    setSelectedMedId(e.target.value);
  };

  const handleAddItem = (e) => {
    e.preventDefault();
    const qtd = Number(qtdEntregue);
    if (!selectedMedId || !qtd || qtd <= 0 || !Number.isSafeInteger(qtd)) {
      return alert("Selecione o medicamento e informe uma quantidade válida.");
    }

    const med = medicamentosPaciente.find(
      (m) => String(m.medicamentoId) === String(selectedMedId),
    );
    if (!med) return;

    // Já reservado no carrinho para este medicamento.
    const reservado = carrinhoDispensacao
      .filter((item) => String(item.medicamentoId) === String(med.medicamentoId))
      .reduce((total, item) => total + item.qtdEntregue, 0);

    const disponivel = Number(med.saldoTotal || 0) - reservado;
    if (qtd > disponivel) {
      return alert(
        `Quantidade excede o saldo em estoque deste medicamento (disponível: ${disponivel}).`,
      );
    }

    setCarrinhoDispensacao((prev) => [
      ...prev,
      {
        medicamentoId: med.medicamentoId,
        medicamentoNome: med.medicamentoNome,
        dosagem: med.dosagem,
        qtdEntregue: qtd,
      },
    ]);

    setSelectedMedId("");
    setQtdEntregue("");
  };

  const handleRemoveItem = (index) => {
    setCarrinhoDispensacao((prev) => prev.filter((_, i) => i !== index));
  };

  const gerarTermoDispensacaoImpressao = (dados) => {
    const dataEntrega = new Date().toLocaleDateString("pt-BR");

    // Linhas da tabela principal (com data de entrega por item).
    const linhasCompletas = dados.itens
      .map(
        (item) => `
        <tr>
          <td>
            <span class="med-nome">${item.medicamentoNome}</span>
            <span class="med-dose">${item.dosagem || ""}</span>
          </td>
          <td class="col-qtd">${item.qtdEntregue}</td>
          <td class="col-data">${dataEntrega}</td>
        </tr>
      `,
      )
      .join("");

    // Linhas da via de recorte (só medicamento e quantidade).
    const linhasSimples = dados.itens
      .map(
        (item) => `
        <tr>
          <td>
            <span class="med-nome">${item.medicamentoNome}</span>
            <span class="med-dose">${item.dosagem || ""}</span>
          </td>
          <td class="col-qtd">${item.qtdEntregue}</td>
        </tr>
      `,
      )
      .join("");

    const observacaoHtml = dados.observacao ? dados.observacao : "Nenhuma";

    const responsavel = dados.responsavelEntrega || "—";

    // ── VIA PRINCIPAL (Farmácia) ──────────────────────────────────────────
    const viaPrincipal = `
      <div class="via">
        <div class="cabecalho">
          <div class="cabecalho-titulo">
            <h1>Farmácia Judicial de Muriaé</h1>
            <p>Comprovante de Dispensação de Medicamentos</p>
          </div>
          <div class="cabecalho-meta">
            <span class="via-selo">1ª via — Farmácia</span>
            <span>Secretaria Municipal de Saúde</span>
            <span>Muriaé — MG</span>
          </div>
        </div>

        <div class="secao">
          <div class="secao-titulo">Dados do Paciente</div>
          <div class="dados-grid">
            <div class="dado"><span class="dado-label">Paciente</span><span class="dado-valor">${dados.paciente.patientName}</span></div>
            <div class="dado"><span class="dado-label">CPF</span><span class="dado-valor">${dados.paciente.cpf || "—"}</span></div>
            <div class="dado"><span class="dado-label">Telefone</span><span class="dado-valor">${dados.paciente.telefone || "—"}</span></div>
            <div class="dado"><span class="dado-label">Código / Pasta</span><span class="dado-valor">${dados.paciente.numeroPasta || "—"}</span></div>
            <div class="dado"><span class="dado-label">Data de entrega</span><span class="dado-valor">${dataEntrega}</span></div>
            <div class="dado"><span class="dado-label">Responsável</span><span class="dado-valor">${responsavel}</span></div>
          </div>
        </div>

        <div class="secao">
          <div class="secao-titulo">Medicamentos Dispensados</div>
          <table>
            <thead>
              <tr>
                <th>Medicamento</th>
                <th class="col-qtd">Qtd. dispensada</th>
                <th class="col-data">Data de entrega</th>
              </tr>
            </thead>
            <tbody>
              ${linhasCompletas}
            </tbody>
          </table>
        </div>

        <div class="obs-box">
          <span class="obs-title">Observações</span>
          <div>${observacaoHtml}</div>
        </div>

        <div class="assinaturas">
          <div class="assinatura">
            <div class="assinatura-linha"></div>
            <div class="assinatura-nome">${responsavel}</div>
            <div class="assinatura-label">Responsável pela entrega</div>
          </div>
          <div class="assinatura">
            <div class="assinatura-linha"></div>
            <div class="assinatura-nome">${dados.paciente.patientName}</div>
            <div class="assinatura-label">Paciente / Receptor</div>
          </div>
        </div>
      </div>
    `;

    // ── VIA DE RECORTE (Comprovante de entrega) ───────────────────────────
    const viaRecorte = `
      <div class="via via-recorte">
        <div class="cabecalho cabecalho-compacto">
          <div class="cabecalho-titulo">
            <h2>Farmácia Judicial de Muriaé</h2>
            <p>Comprovante de Entrega de Medicamento</p>
          </div>
          <div class="cabecalho-meta">
            <span class="via-selo">2ª via — Paciente</span>
            <span>Data de entrega</span>
            <span class="meta-forte">${dataEntrega}</span>
          </div>
        </div>

        <div class="dados-linha">
          <strong>Paciente:</strong> ${dados.paciente.patientName}
        </div>

        <table>
          <thead>
            <tr>
              <th>Medicamento</th>
              <th class="col-qtd">Qtd. dispensada</th>
            </tr>
          </thead>
          <tbody>
            ${linhasSimples}
          </tbody>
        </table>

        <div class="obs-box">
          <span class="obs-title">Observações</span>
          <div>${observacaoHtml}</div>
        </div>

        <div class="assinaturas assinaturas-uma">
          <div class="assinatura">
            <div class="assinatura-linha"></div>
            <div class="assinatura-nome">${dados.paciente.patientName}</div>
            <div class="assinatura-label">Paciente / Receptor</div>
          </div>
        </div>
      </div>
    `;

    const iframeAntigo = document.getElementById("iframe-impressao-termo");
    if (iframeAntigo) {
      iframeAntigo.remove();
    }

    const iframe = document.createElement("iframe");
    iframe.id = "iframe-impressao-termo";
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow.document;

    doc.write(`
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <title>Comprovante de Dispensação - ${dados.paciente.patientName}</title>
        <style>
          * { box-sizing: border-box; }
          body {
            font-family: 'Segoe UI', Arial, sans-serif;
            padding: 32px;
            color: #334155;
            font-size: 12.5px;
            line-height: 1.5;
            margin: 0;
          }

          /* Cada via: borda fina, cantos arredondados, respiro interno */
          .via {
            border: 1px solid #cbd5e1;
            border-radius: 12px;
            padding: 26px 30px;
          }

          /* Cabeçalho institucional */
          .cabecalho {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: 20px;
            border-bottom: 2px solid #1e3a5f;
            padding-bottom: 14px;
            margin-bottom: 20px;
          }
          .cabecalho-titulo h1 {
            margin: 0;
            font-size: 19px;
            font-weight: 700;
            color: #1e3a5f;
            letter-spacing: 0.01em;
          }
          .cabecalho-titulo h2 {
            margin: 0;
            font-size: 15px;
            font-weight: 700;
            color: #1e3a5f;
          }
          .cabecalho-titulo p {
            margin: 3px 0 0;
            font-size: 12px;
            color: #64748b;
          }
          .cabecalho-meta {
            text-align: right;
            display: flex;
            flex-direction: column;
            gap: 2px;
            font-size: 10.5px;
            color: #64748b;
            white-space: nowrap;
          }
          .cabecalho-meta .meta-forte { font-size: 13px; font-weight: 700; color: #1e3a5f; }
          .via-selo {
            display: inline-block;
            align-self: flex-end;
            background: #1e3a5f;
            color: #ffffff;
            font-size: 9.5px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            padding: 3px 10px;
            border-radius: 999px;
            margin-bottom: 4px;
          }
          .cabecalho-compacto { border-bottom-width: 1px; padding-bottom: 12px; margin-bottom: 16px; }

          /* Seções */
          .secao { margin-bottom: 20px; }
          .secao-titulo {
            font-size: 10.5px;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            color: #4a6fa5;
            font-weight: 700;
            margin: 0 0 10px;
          }

          /* Dados do paciente em grid 2 colunas */
          .dados-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px 28px;
          }
          .dado { display: flex; flex-direction: column; gap: 1px; }
          .dado-label {
            font-size: 9.5px;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: #94a3b8;
            font-weight: 700;
          }
          .dado-valor { font-size: 12.5px; color: #1e293b; font-weight: 600; }

          .dados-linha { font-size: 12.5px; margin-bottom: 12px; color: #1e293b; }
          .dados-linha strong { color: #334155; }

          /* Tabelas */
          table {
            width: 100%;
            border-collapse: collapse;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            overflow: hidden;
          }
          thead th {
            background: #1e3a5f;
            color: #ffffff;
            padding: 9px 12px;
            text-align: left;
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            font-weight: 700;
          }
          tbody td {
            padding: 10px 12px;
            border-bottom: 1px solid #eef2f7;
            font-size: 12.5px;
            vertical-align: middle;
          }
          tbody tr:last-child td { border-bottom: none; }
          tbody tr:nth-child(even) td { background: #f8fafc; }
          .col-qtd { width: 130px; text-align: center; }
          .col-data { width: 130px; text-align: center; }
          thead .col-qtd, thead .col-data { text-align: center; }
          tbody .col-qtd, tbody .col-data { font-weight: 700; color: #1e3a5f; }
          .med-nome { font-weight: 700; color: #1e293b; }
          .med-dose { color: #64748b; font-weight: 400; margin-left: 4px; }

          /* Observações */
          .obs-box {
            border: 1px solid #e2e8f0;
            border-left: 3px solid #4a6fa5;
            border-radius: 6px;
            padding: 10px 14px;
            font-size: 12px;
            color: #475569;
            margin: 16px 0 0;
          }
          .obs-title {
            display: block;
            font-size: 9.5px;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            font-weight: 700;
            color: #4a6fa5;
            margin-bottom: 2px;
          }

          /* Assinaturas: próximas e centralizadas, largura controlada */
          .assinaturas {
            display: flex;
            justify-content: center;
            gap: 48px;
            margin-top: 44px;
          }
          .assinatura { width: 220px; text-align: center; }
          .assinatura-linha {
            border-top: 1px solid #475569;
            margin-bottom: 5px;
          }
          .assinatura-nome {
            font-size: 12px;
            font-weight: 700;
            color: #1e293b;
          }
          .assinatura-label {
            font-size: 10.5px;
            color: #64748b;
            margin-top: 1px;
          }

          /* Divisor de recorte (entre as duas vias) */
          .recorte {
            text-align: center;
            font-size: 10.5px;
            font-weight: 700;
            color: #94a3b8;
            letter-spacing: 0.06em;
            text-transform: uppercase;
            margin: 16px 0;
          }

          @media print {
            body { padding: 16px; }
            .via { page-break-inside: avoid; }
            thead th { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            tbody tr:nth-child(even) td { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .via-selo { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          }
        </style>
      </head>
      <body>
        ${viaPrincipal}
        <div class="recorte">✂ RECORTE AQUI — COMPROVANTE DE ENTREGA</div>
        ${viaRecorte}
      </body>
      </html>
    `);

    doc.close();

    setTimeout(() => {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    }, 400);
  };

  const handleOpenModal = (e) => {
    e.preventDefault();
    if (!selectedPaciente) return alert("Selecione o paciente.");
    if (carrinhoDispensacao.length === 0)
      return alert("Adicione pelo menos um medicamento para dispensar.");

    setShowModal(true);
  };

  const handleConfirmarFinal = async () => {
    setIsSubmitting(true);

    const dadosDispensacao = {
      numeroPasta: selectedPaciente.numeroPasta,
      responsavelEntrega,
      observacao,
      itens: carrinhoDispensacao,
      paciente: selectedPaciente,
    };

    try {
      if (onConfirmarDispensacao) {
        const result = await onConfirmarDispensacao(dadosDispensacao);
        if (result?.success === false) {
          throw new Error(result.error || "Falha ao registrar dispensação.");
        }
        // O responsável oficial é definido no servidor (usuário logado).
        if (result?.responsavelEntrega) {
          dadosDispensacao.responsavelEntrega = result.responsavelEntrega;
        }
      }

      setShowModal(false);

      gerarTermoDispensacaoImpressao(dadosDispensacao);

      // Mantém o responsável (usuário logado); limpa o restante.
      setSelectedPaciente(null);
      setSearch("");
      setCarrinhoDispensacao([]);
      setObservacao("");
    } catch (error) {
      console.error("Erro ao processar dispensação:", error);
      alert(error.message || "Ocorreu um erro ao registrar a dispensação.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.card}>
      <h2 className={styles.cardTitle}>
        Dispensação de Medicamentos Judiciais
      </h2>

      <div className={styles.formContainer}>
        {/* BUSCA DE PACIENTE (dropdown em tabela, igual à aba Pacientes) */}
        <div className={styles.fieldGroup}>
          <label>Buscar Paciente Judicial (Nome ou CPF) *</label>
          <div className={styles.searchRowInline}>
            <div className={styles.searchSelectWrapper} ref={patientDropdownRef}>
              <input
                type="text"
                className={styles.selectLikeInput}
                placeholder="Selecionar ou digitar nome/CPF..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setShowPatientDropdown(true);
                }}
                onFocus={() => setShowPatientDropdown(true)}
              />
              <span
                className={styles.arrowIcon}
                onClick={() => setShowPatientDropdown(!showPatientDropdown)}
              >
                {showPatientDropdown ? "▲" : "▼"}
              </span>

              {showPatientDropdown && (
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
                        {removeDuplicadosPorCpf(filteredPacientes).length > 0 ? (
                          removeDuplicadosPorCpf(filteredPacientes).map((p) => (
                            <tr
                              key={p.numeroPasta}
                              onMouseDown={(e) => {
                                e.preventDefault();
                                handleSelectPaciente(p);
                              }}
                              className={
                                selectedPaciente?.numeroPasta === p.numeroPasta
                                  ? styles.selectedRow
                                  : ""
                              }
                            >
                              <td>{documentoPaciente({ cpf: p.cpf, cns: p.cns })}</td>
                              <td className={styles.boldName}>{p.patientName}</td>
                              <td>{p.motherName || "Não informada"}</td>
                              <td>
                                {p.dataNascimento
                                  ? p.dataNascimento.split("-").reverse().join("/")
                                  : "-"}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="4" className={styles.noDataTd}>
                              Nenhum paciente judicial encontrado.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {selectedPaciente && (
              <button
                type="button"
                className={styles.clearBtn}
                onClick={limparPaciente}
                title="Limpar"
              >
                Limpar
              </button>
            )}
          </div>
        </div>

        {/* CARD RESUMO DO PACIENTE + MEDICAMENTOS VINCULADOS */}
        {selectedPaciente && (
          <div className={styles.patientSummaryBox}>
            <div className={styles.patientBadgeGroup}>
              <span className={styles.badgePasta}>
                Pasta #{selectedPaciente.numeroPasta}
              </span>
              <span className={styles.badgeCpf}>
                {documentoPaciente({ cpf: selectedPaciente.cpf, cns: selectedPaciente.cns })}
              </span>
            </div>
            <div className={styles.patientDetails}>
              <p>
                <strong>Paciente:</strong> {selectedPaciente.patientName}
              </p>
              <p>
                <strong>Nº Processo:</strong> {selectedPaciente.numeroProcesso}
              </p>
            </div>
          </div>
        )}

        {/* ADICIONAR MEDICAMENTO (BUSCA DIGITÁVEL + MENU SUSPENSO) */}
        <div className={styles.addMedSection}>
          <h4>Adicionar Medicamento para Entrega</h4>

          <div className={styles.addMedGrid}>
            {/* 1. MEDICAMENTO VINCULADO AO PACIENTE (DROPDOWN) */}
            <div className={styles.fieldGroup}>
              <label>Medicamento *</label>
              <select
                value={selectedMedId}
                onChange={handleSelectMedicamento}
                disabled={!selectedPaciente || medicamentosPaciente.length === 0}
              >
                <option value="">
                  {!selectedPaciente
                    ? "Selecione o paciente primeiro"
                    : medicamentosPaciente.length === 0
                      ? "Nenhum medicamento vinculado"
                      : "-- Selecione o medicamento --"}
                </option>
                {medicamentosPaciente.map((m) => (
                  <option key={m.medicamentoId} value={m.medicamentoId}>
                    {m.medicamentoNome}{m.dosagem ? ` (${m.dosagem})` : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* 2. QTD ENTREGUE */}
            <div className={styles.fieldGroup}>
              <label>
                Qtd Entregue *
                {medSelecionado && (
                  <span className={styles.saldoHint}>
                    {" "}(disponível: {medSelecionado.saldoTotal})
                  </span>
                )}
              </label>
              <input
                type="number"
                min="1"
                placeholder="Ex: 30"
                value={qtdEntregue}
                onChange={(e) => setQtdEntregue(e.target.value)}
                disabled={!selectedMedId}
              />
            </div>

            {/* 4. BOTÃO ADICIONAR ITEM */}
            <button
              type="button"
              onClick={handleAddItem}
              className={styles.addBtn}
            >
              + Adicionar Item
            </button>
          </div>
        </div>

        {/* TABELA DE ITENS ADICIONADOS */}
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Medicamento</th>
                <th>Concentração</th>
                <th>Qtd a Entregar</th>
                <th style={{ textAlign: "right" }}>Ação</th>
              </tr>
            </thead>
            <tbody>
              {carrinhoDispensacao.length === 0 ? (
                <tr>
                  <td colSpan="4" className={styles.emptyTableTd}>
                    Nenhum medicamento inserido na lista de entrega.
                  </td>
                </tr>
              ) : (
                carrinhoDispensacao.map((item, idx) => (
                  <tr key={idx}>
                    <td>
                      <strong>{item.medicamentoNome}</strong>
                    </td>
                    <td>{item.dosagem}</td>
                    <td>
                      <strong>{item.qtdEntregue}</strong>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        className={styles.removeBtn}
                      >
                        🗑 Remover
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* GRID INFERIOR (RESPONSÁVEL + OBSERVAÇÃO) */}
        <div className={styles.bottomFieldsGrid}>
          <div className={styles.fieldGroup}>
            <label>Responsável pela Entrega / Servidor</label>
            <input
              type="text"
              value={responsavelEntrega}
              placeholder="Usuário logado"
              readOnly
              disabled
              title="Preenchido automaticamente com o usuário logado"
            />
          </div>

          <div className={styles.fieldGroup}>
            <label>Observação da Dispensação</label>
            <input
              type="text"
              placeholder="Ex: Entrega referente ao mês de Agosto"
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
            />
          </div>
        </div>

        {/* BOTÃO FINALIZAR */}
        <div className={styles.formActions}>
          <button
            type="button"
            onClick={handleOpenModal}
            className={styles.primaryBtn}
          >
            Confirmar e Registrar Dispensação
          </button>
        </div>
      </div>

      {/* POP-UP MODAL DE CONFIRMAÇÃO */}
      {showModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalCard}>
            <h3 className={styles.modalTitle}>⚠️ Confirmar Dispensação</h3>
            <p className={styles.modalSub}>
              Confira os dados antes de prosseguir. Após a confirmação, o
              estoque será atualizado e o recibo de impressão será exibido.
            </p>

            <div className={styles.modalDetails}>
              <p>
                <strong>Paciente:</strong> {selectedPaciente?.patientName}{" "}
                (Pasta #{selectedPaciente?.numeroPasta})
              </p>
              <p>
                <strong>Servidor Responsável:</strong> {responsavelEntrega}
              </p>
              <p>
                <strong>Total de Itens:</strong> {carrinhoDispensacao.length}{" "}
                medicamento(s)
              </p>
            </div>

            <div className={styles.modalActions}>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className={styles.modalCancelBtn}
                disabled={isSubmitting}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmarFinal}
                className={styles.modalConfirmBtn}
                disabled={isSubmitting}
              >
                {isSubmitting
                  ? "Processando..."
                  : "Confirmar e Imprimir Recibo"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
