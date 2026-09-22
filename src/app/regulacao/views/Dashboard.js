"use client";

import styles from "./Dashboard.module.css";

export default function Dashboard({ requests = [], auxData = {}, setActiveTab }) {
  // Métricas Principais
  const totalAguardando = requests.filter((r) => r.status === "Aguardando").length;
  const totalLiberados = requests.filter((r) => r.status === "Liberado").length;
  const totalGeral = requests.length;

  // Riscos (Aguardando - Fila)
  const urgentes = requests.filter(
    (r) => r.status === "Aguardando" && r.classification === "Vermelho"
  ).length;
  const prioritarios = requests.filter(
    (r) => r.status === "Aguardando" && r.classification === "Amarelo"
  ).length;
  const eletivos = requests.filter(
    (r) => r.status === "Aguardando" && r.classification === "Verde"
  ).length;

  // Riscos (Liberados)
  const liberadosUrgentes = requests.filter(
    (r) => r.status === "Liberado" && r.classification === "Vermelho"
  ).length;
  const liberadosPrioritarios = requests.filter(
    (r) => r.status === "Liberado" && r.classification === "Amarelo"
  ).length;
  const liberadosEletivos = requests.filter(
    (r) => r.status === "Liberado" && r.classification === "Verde"
  ).length;

  // Agrupamento por Tipo de Exame (Aguardando - Fila)
  const examTypeCountsFila = (auxData.tiposExame || []).map((tipo) => {
    const count = requests.filter(
      (r) =>
        r.status === "Aguardando" &&
        (r.examType?.toLowerCase().trim() === tipo.nome?.toLowerCase().trim() ||
          String(r.examTypeId) === String(tipo.id))
    ).length;
    return { nome: tipo.nome, count };
  });

  // Agrupamento por Tipo de Exame (Liberados)
  const examTypeCountsLiberados = (auxData.tiposExame || []).map((tipo) => {
    const count = requests.filter(
      (r) =>
        r.status === "Liberado" &&
        (r.examType?.toLowerCase().trim() === tipo.nome?.toLowerCase().trim() ||
          String(r.examTypeId) === String(tipo.id))
    ).length;
    return { nome: tipo.nome, count };
  });

  return (
    <div className={styles.container}>
      {/* MÉTRICAS PRINCIPAIS (SEÇÃO 1 - PADRÃO FARMÁCIA) */}
      <section className={styles.kpiGrid}>
        {/* CARD 1: FILA DE ESPERA */}
        <div
          className={`${styles.kpiCard} ${styles.clickable}`}
          onClick={() => setActiveTab("LISTA_ESPERA")}
        >
          <div className={styles.kpiHeader}>
            <span className={styles.kpiTitle}>Fila de Espera</span>
            <div className={`${styles.iconBox} ${styles.yellowIcon}`}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
              </svg>
            </div>
          </div>
          <div className={styles.kpiValue}>
            {totalAguardando}
            <span className={styles.kpiUnit}>pacientes</span>
          </div>
          <div className={styles.kpiFooter}>
            <span>Aguardando regulação na fila</span>
          </div>
        </div>

        {/* CARD 2: EXAMES LIBERADOS */}
        <div
          className={`${styles.kpiCard} ${styles.clickable}`}
          onClick={() => setActiveTab("LIBERADOS")}
        >
          <div className={styles.kpiHeader}>
            <span className={styles.kpiTitle}>Exames Liberados</span>
            <div className={`${styles.iconBox} ${styles.greenIcon}`}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
            </div>
          </div>
          <div className={styles.kpiValue}>
            {totalLiberados}
            <span className={styles.kpiUnit}>procedimentos</span>
          </div>
          <div className={styles.kpiFooter}>
            <span>Autorizados e concluídos</span>
          </div>
        </div>

        {/* CARD 3: URGÊNCIAS NA FILA */}
        <div className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <span className={styles.kpiTitle}>Urgências na Fila</span>
            <div className={`${styles.iconBox} ${styles.redIcon}`}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
            </div>
          </div>
          <div className={styles.kpiValue}>
            {urgentes}
            <span className={styles.kpiUnit}>casos graves</span>
          </div>
          <div className={styles.kpiFooter}>
            <span>Classificação Vermelho (Urgente)</span>
          </div>
        </div>

        {/* CARD 4: TOTAL REGISTRADO */}
        <div className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <span className={styles.kpiTitle}>Total Registrado</span>
            <div className={`${styles.iconBox} ${styles.indigoIcon}`}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
                <polyline points="10 9 9 9 8 9"/>
              </svg>
            </div>
          </div>
          <div className={styles.kpiValue}>
            {totalGeral}
            <span className={styles.kpiUnit}>solicitações</span>
          </div>
          <div className={styles.kpiFooter}>
            <span>Histórico geral do sistema</span>
          </div>
        </div>
      </section>

      {/* SEÇÃO 2: FILA DE ESPERA (PADRÃO FARMÁCIA - contentGrid) */}
      <div className={styles.contentGrid}>
        {/* CARD: FILA POR CLASSIFICAÇÃO DE RISCO */}
        <div className={styles.panelCard}>
          <div className={styles.panelHeader}>
            <h3>Fila por Classificação de Risco</h3>
            <span className={styles.cardSubtitle}>Distribuição dos pacientes aguardando regulação</span>
          </div>
          <div className={styles.riskProgressList}>
            <div className={styles.riskItem}>
              <div className={styles.riskHeader}>
                <span className={`${styles.riskBadge} ${styles.redBadge}`}>Vermelho (Urgente)</span>
                <strong>{urgentes} pacientes</strong>
              </div>
              <div className={styles.progressBarBg}>
                <div
                  className={styles.progressBarFill}
                  style={{
                    width: `${totalAguardando ? (urgentes / totalAguardando) * 100 : 0}%`,
                    backgroundColor: "#dc2626",
                  }}
                />
              </div>
            </div>

            <div className={styles.riskItem}>
              <div className={styles.riskHeader}>
                <span className={`${styles.riskBadge} ${styles.yellowBadge}`}>Amarelo (Prioritário)</span>
                <strong>{prioritarios} pacientes</strong>
              </div>
              <div className={styles.progressBarBg}>
                <div
                  className={styles.progressBarFill}
                  style={{
                    width: `${totalAguardando ? (prioritarios / totalAguardando) * 100 : 0}%`,
                    backgroundColor: "#d97706",
                  }}
                />
              </div>
            </div>

            <div className={styles.riskItem}>
              <div className={styles.riskHeader}>
                <span className={`${styles.riskBadge} ${styles.greenBadge}`}>Verde (Eletivo)</span>
                <strong>{eletivos} pacientes</strong>
              </div>
              <div className={styles.progressBarBg}>
                <div
                  className={styles.progressBarFill}
                  style={{
                    width: `${totalAguardando ? (eletivos / totalAguardando) * 100 : 0}%`,
                    backgroundColor: "#16a34a",
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* CARD: FILA POR TIPO DE EXAME */}
        <div className={styles.panelCard}>
          <div className={styles.panelHeader}>
            <h3>Fila por Tipo de Exame</h3>
            <span className={styles.cardSubtitle}>Solicitações aguardando por tipo</span>
          </div>
          <div className={styles.examTypeList}>
            {examTypeCountsFila.map((item) => (
              <div key={item.nome} className={styles.examTypeRow}>
                <span>{item.nome}</span>
                <span className={styles.examCountBadge}>{item.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* SEÇÃO 3: PACIENTES LIBERADOS (PADRÃO FARMÁCIA - contentGrid) */}
      <div className={styles.contentGrid}>
        {/* CARD: LIBERADOS POR CLASSIFICAÇÃO DE RISCO */}
        <div className={styles.panelCard}>
          <div className={styles.panelHeader}>
            <h3>Liberados por Classificação de Risco</h3>
            <span className={styles.cardSubtitle}>Distribuição dos exames já autorizados</span>
          </div>
          <div className={styles.riskProgressList}>
            <div className={styles.riskItem}>
              <div className={styles.riskHeader}>
                <span className={`${styles.riskBadge} ${styles.redBadge}`}>Vermelho (Urgente)</span>
                <strong>{liberadosUrgentes} pacientes</strong>
              </div>
              <div className={styles.progressBarBg}>
                <div
                  className={styles.progressBarFill}
                  style={{
                    width: `${totalLiberados ? (liberadosUrgentes / totalLiberados) * 100 : 0}%`,
                    backgroundColor: "#dc2626",
                  }}
                />
              </div>
            </div>

            <div className={styles.riskItem}>
              <div className={styles.riskHeader}>
                <span className={`${styles.riskBadge} ${styles.yellowBadge}`}>Amarelo (Prioritário)</span>
                <strong>{liberadosPrioritarios} pacientes</strong>
              </div>
              <div className={styles.progressBarBg}>
                <div
                  className={styles.progressBarFill}
                  style={{
                    width: `${totalLiberados ? (liberadosPrioritarios / totalLiberados) * 100 : 0}%`,
                    backgroundColor: "#d97706",
                  }}
                />
              </div>
            </div>

            <div className={styles.riskItem}>
              <div className={styles.riskHeader}>
                <span className={`${styles.riskBadge} ${styles.greenBadge}`}>Verde (Eletivo)</span>
                <strong>{liberadosEletivos} pacientes</strong>
              </div>
              <div className={styles.progressBarBg}>
                <div
                  className={styles.progressBarFill}
                  style={{
                    width: `${totalLiberados ? (liberadosEletivos / totalLiberados) * 100 : 0}%`,
                    backgroundColor: "#16a34a",
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* CARD: LIBERADOS POR TIPO DE EXAME */}
        <div className={styles.panelCard}>
          <div className={styles.panelHeader}>
            <h3>Liberados por Tipo de Exame</h3>
            <span className={styles.cardSubtitle}>Exames autorizados por tipo</span>
          </div>
          <div className={styles.examTypeList}>
            {examTypeCountsLiberados.map((item) => (
              <div key={item.nome} className={styles.examTypeRow}>
                <span>{item.nome}</span>
                <span className={styles.examCountBadgeSuccess}>
                  {item.count}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}