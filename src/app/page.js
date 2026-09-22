"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./page.module.css";

// Destino inicial de cada perfil que NÃO é gestor.
const getDestinationByRole = (role) => {
  switch (role) {
    case "REGULACAO_ADMIN":
    case "REGULACAO_COMUM":
      return "/regulacao?tab=DASHBOARD";
    case "FARMACIA_ADMIN":
      return "/camara-tecnica/farmacia-judicial?tab=DASHBOARD";
    case "PROCESSO_ADMIN":
      return "/camara-tecnica/processos";
    case "JUNTA_ADMIN":
    case "JUNTA_CAEE":
    case "JUNTA_EDUCACAO":
    case "JUNTA_SAUDE":
    case "JUNTA_ASSISTENCIA":
      return "/junta-reguladora?tab=CADASTRO";
    case "CCZ_ADMIN":
      return "/ccz?tab=DASHBOARD";
    default:
      return "/regulacao";
  }
};

const formatarData = (valor) => {
  if (!valor) return "-";
  return new Date(valor).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const formatarDataHora = (valor) => {
  if (!valor) return "-";
  return new Date(valor).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export default function Home() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let ativo = true;

    async function initDashboard() {
      try {
        // 1. Autenticação do usuário
        const resUser = await fetch("/api/me");
        if (!ativo) return;
        if (!resUser.ok) {
          router.replace("/login");
          return;
        }

        const dataUser = await resUser.json();
        const userData = dataUser.user;
        setUser(userData);

        // 2. Somente o GESTOR vê o painel gerencial; demais perfis vão ao seu módulo
        if (userData?.role !== "GESTOR") {
          router.replace(getDestinationByRole(userData?.role));
          return;
        }

        // 3. Métricas de negócio consolidadas (GESTOR)
        const resMetrics = await fetch("/api/admin/metrics", { cache: "no-store" });
        if (resMetrics.ok) {
          const data = await resMetrics.json();
          setMetrics(data);
          setError("");
        } else {
          const corpo = await resMetrics.json().catch(() => ({}));
          setError(corpo.error || "Não foi possível carregar os indicadores.");
        }
      } catch (err) {
        console.error("Erro ao carregar o painel:", err);
        setError("Falha de conexão com o servidor.");
      } finally {
        if (ativo) setLoading(false);
      }
    }

    initDashboard();

    return () => {
      ativo = false;
    };
  }, [router]);

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <p>Carregando indicadores do sistema...</p>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className={styles.container}>
      {/* CABEÇALHO */}
      <header className={styles.welcomeHeader}>
        <span className={styles.systemBadge}>Painel Gerencial</span>
        <h1 className={styles.pageTitle}>Visão consolidada</h1>
        <p className={styles.pageSubtitle}>
          Bem-vindo(a), <strong>{user?.nomeCompleto}</strong> ({user?.cargo || user?.role}).
        </p>
      </header>

      {error && (
        <div className={styles.errorAlert}>
          <strong>Alerta:</strong> {error}
        </div>
      )}

      {metrics && (
        <>
          {/* KPIs POR MÓDULO */}
          <section className={styles.kpiGrid}>
            <div className={styles.kpiCard}>
              <div className={styles.kpiTitle}>Pessoas cadastradas</div>
              <div className={`${styles.kpiValue} ${styles.textDark}`}>{metrics.pessoas.total}</div>
              <p className={styles.kpiFooter}>Base compartilhada entre os módulos</p>
            </div>

            <div className={`${styles.kpiCard} ${metrics.regulacao.aguardando > 0 ? styles.cardDangerBorder : styles.cardSuccessBorder}`}>
              <div className={styles.kpiTitle}>Regulação — aguardando</div>
              <div className={`${styles.kpiValue} ${styles.textPrimary}`}>{metrics.regulacao.aguardando}</div>
              <p className={styles.kpiFooter}>
                {metrics.regulacao.liberados} liberados de {metrics.regulacao.total} pedidos
              </p>
            </div>

            <div className={styles.kpiCard}>
              <div className={styles.kpiTitle}>Farmácia — pacientes ativos</div>
              <div className={`${styles.kpiValue} ${styles.textDark}`}>{metrics.farmacia.ativos}</div>
              <p className={styles.kpiFooter}>{metrics.farmacia.total} pacientes judiciais no total</p>
            </div>

            <div className={`${styles.kpiCard} ${metrics.farmacia.estoqueUnidades > 0 ? styles.cardSuccessBorder : styles.cardDangerBorder}`}>
              <div className={styles.kpiTitle}>Estoque de medicamentos</div>
              <div className={`${styles.kpiValue} ${styles.textDark}`}>{metrics.farmacia.estoqueUnidades}</div>
              <p className={styles.kpiFooter}>
                unidades · {metrics.farmacia.medicamentosAtivos} medicamentos ativos
              </p>
            </div>

            <div className={styles.kpiCard}>
              <div className={styles.kpiTitle}>Junta Reguladora</div>
              <div className={`${styles.kpiValue} ${styles.textDark}`}>{metrics.junta.pacientes}</div>
              <p className={styles.kpiFooter}>pacientes · {metrics.junta.atendimentos} atendimentos</p>
            </div>

            <div className={styles.kpiCard}>
              <div className={styles.kpiTitle}>CCZ — animais</div>
              <div className={`${styles.kpiValue} ${styles.textDark}`}>{metrics.ccz.animais}</div>
              <p className={styles.kpiFooter}>
                {metrics.ccz.zoonoses} zoonoses · {metrics.ccz.denuncias} denúncias
              </p>
            </div>
          </section>

          {/* PAINÉIS DE APOIO */}
          <section className={styles.dashboardGrid}>
            <div className={styles.cardSection}>
              <h2 className={styles.sectionTitle}>Regulação por classificação de risco</h2>
              <div className={styles.moduleList}>
                {metrics.regulacao.risco.length > 0 ? (
                  metrics.regulacao.risco.map((item) => (
                    <div key={item.classificacao} className={styles.moduleItem}>
                      <strong>{item.classificacao}</strong>
                      <span>{item.total} pedido(s)</span>
                    </div>
                  ))
                ) : (
                  <p className={styles.emptyLogText}>Nenhum pedido registrado.</p>
                )}
              </div>
            </div>

            <div className={styles.cardSection}>
              <h2 className={styles.sectionTitle}>Lotes a vencer (próximos 30 dias)</h2>
              <div className={styles.moduleList}>
                {metrics.farmacia.lotesAVencer.length > 0 ? (
                  metrics.farmacia.lotesAVencer.map((lote) => (
                    <div key={lote.id} className={styles.moduleItem}>
                      <div>
                        <strong>{lote.medicamento}</strong>
                        <span className={styles.logRole}>Lote {lote.numeroLote}</span>
                      </div>
                      <span className={styles.logTime}>Vence {formatarData(lote.dataValidade)}</span>
                    </div>
                  ))
                ) : (
                  <p className={styles.emptyLogText}>Nenhum lote próximo do vencimento.</p>
                )}
              </div>
            </div>

            <div className={styles.cardSection}>
              <h2 className={styles.sectionTitle}>Atividade recente do sistema</h2>
              <div className={styles.moduleList}>
                {metrics.atividadeRecente.length > 0 ? (
                  metrics.atividadeRecente.map((item) => (
                    <div key={item.id} className={styles.moduleItem}>
                      <div>
                        <strong>{item.descricao}</strong>
                        <span className={styles.logRole}>{item.modulo}</span>
                      </div>
                      <span className={styles.logTime}>{formatarDataHora(item.data)}</span>
                    </div>
                  ))
                ) : (
                  <p className={styles.emptyLogText}>Nenhuma atividade recente registrada.</p>
                )}
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
