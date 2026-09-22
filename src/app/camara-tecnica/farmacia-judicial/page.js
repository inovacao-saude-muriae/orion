"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  getPacientesJudiciais,
  createPacienteJudicial,
  getMedicamentosEEstoque,
  getCatalogoMedicamentos,
  createMedicamento,
  createLoteMedicamento,
  registrarDispensacao,
  getDashboardMetrics,
  getRelatorioEntradas,
  getRelatorioSaidas,
} from "./actions";

import Dashboard from "./views/Dashboard";
import PacientesJudiciais from "./views/PacientesJudiciais";
import Dispensacao from "./views/Dispensacao";
import Relatorios from "./views/Relatorios";

// 🎯 COMPONENTES DE ESTOQUE SEPARADOS E INDEPENDENTES
import SaldoEstoque from "./components/SaldoEstoque";
import RegistrarEntrada from "./components/RegistrarEntrada";
import CadastrarMedicamento from "./components/CadastrarMedicamentos";

import styles from "./page.module.css";

function FarmaciaJudicialPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // 1. A sidebar usa FARMACIA_JUDICIAL como grupo e envia a tela em subTab.
  const requestedTab = searchParams.get("tab") || "DASHBOARD";
  const requestedSubTab = searchParams.get("subTab");
  const isSidebarModuleLink = requestedTab === "FARMACIA_JUDICIAL";
  const activeTab = isSidebarModuleLink
    ? requestedSubTab || "PACIENTES"
    : requestedTab;
  const activeSubTab = isSidebarModuleLink
    ? "SALDO"
    : requestedSubTab || "SALDO";

  const [loading, setLoading] = useState(true);
  const [pacientes, setPacientes] = useState([]);
  const [estoqueLotes, setEstoqueLotes] = useState([]);
  const [relatorioEntradas, setRelatorioEntradas] = useState([]);
  const [relatorioSaidas, setRelatorioSaidas] = useState([]);
  const [catalogo, setCatalogo] = useState([]);
  const [metrics, setMetrics] = useState({});

  // Função para recarregar dados manualmente após ações (cadastros, dispensações, etc.)
  const reloadData = async () => {
    setLoading(true);
    try {
      const [pacData, estData, catData, metData, entData, saiData] =
        await Promise.all([
          getPacientesJudiciais(),
          getMedicamentosEEstoque(),
          getCatalogoMedicamentos(),
          getDashboardMetrics(),
          getRelatorioEntradas(),
          getRelatorioSaidas(),
        ]);
      setPacientes(pacData || []);
      setEstoqueLotes(estData || []);
      setCatalogo(catData || []);
      setMetrics(metData || {});
      setRelatorioEntradas(entData || []);
      setRelatorioSaidas(saiData || []);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    } finally {
      setLoading(false);
    }
  };

  // Carregamento inicial limpo no useEffect que previne re-renderizações em cascata
  useEffect(() => {
    let isMounted = true;

    const loadInitialData = async () => {
      setLoading(true);
      try {
        const [pacData, estData, catData, metData, entData, saiData] =
          await Promise.all([
            getPacientesJudiciais(),
            getMedicamentosEEstoque(),
            getCatalogoMedicamentos(),
            getDashboardMetrics(),
            getRelatorioEntradas(),
            getRelatorioSaidas(),
          ]);

        if (isMounted) {
          setPacientes(pacData || []);
          setEstoqueLotes(estData || []);
          setCatalogo(catData || []);
          setMetrics(metData || {});
          setRelatorioEntradas(entData || []);
          setRelatorioSaidas(saiData || []);
        }
      } catch (error) {
        console.error("Erro ao carregar dados:", error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadInitialData();

    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Navegação garantindo o caminho completo da subpasta do módulo
  const handleNavigate = (tab, subTab) => {
    const baseUrl = "/camara-tecnica/farmacia-judicial";
    if (subTab) {
      router.push(`${baseUrl}?tab=${tab}&subTab=${subTab}`);
    } else {
      router.push(`${baseUrl}?tab=${tab}`);
    }
  };

  const handleCreatePaciente = async (formData) => {
    const res = await createPacienteJudicial(formData);
    if (res.success) await reloadData();
    else alert("Erro: " + res.error);
    return res;
  };

  const handleCreateMedicamento = async (formData) => {
    const res = await createMedicamento(formData);
    if (res.success) {
      if (formData.darEntradaEstoque) {
        await createLoteMedicamento({
          medicamentoId: res.id || res.medicamentoId,
          numeroLote: formData.numeroLote,
          fornecedor: formData.fornecedor,
          qtdInicial: formData.qtdInicial,
          valorUnitario: formData.valorUnitario,
          dataEntrada: formData.dataEntrada,
          dataValidade: formData.dataValidade,
        });
      }
      await reloadData();
      handleNavigate("ESTOQUE", "SALDO");
    } else alert("Erro: " + res.error);
  };

  const handleCreateLote = async (formData) => {
    const res = await createLoteMedicamento(formData);
    if (res.success) {
      await reloadData();
      handleNavigate("ESTOQUE", "SALDO");
    } else alert("Erro: " + res.error);
  };

  const handleConfirmarDispensacao = async (dispensacaoData) => {
    const res = await registrarDispensacao(dispensacaoData);
    if (res.success) await reloadData();
    else alert("Erro: " + res.error);
    return res;
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1>Farmácia Judicial</h1>
          <p>Visão geral, processos judiciais, estoque e dispensação</p>
        </div>
      </header>

      {/* ROTEAMENTO DIRETO POR COMPONENTE */}
      {activeTab === "DASHBOARD" && (
        <Dashboard
          metrics={metrics}
          onNavigate={handleNavigate}
          loading={loading}
          medicamentosList={estoqueLotes}
        />
      )}

      {activeTab === "PACIENTES" && (
        <PacientesJudiciais
          pacientes={pacientes}
          catalogo={catalogo}
          onCreatePaciente={handleCreatePaciente}
          loading={loading}
        />
      )}

      {activeTab === "DISPENSACAO" && (
        <Dispensacao
          pacientes={pacientes}
          estoqueLotes={estoqueLotes}
          onConfirmarDispensacao={handleConfirmarDispensacao}
        />
      )}

      {/* ROTEAMENTO DE ESTOQUE DEDICADO */}
      {activeTab === "ESTOQUE" && activeSubTab === "SALDO" && (
        <SaldoEstoque estoqueLotes={estoqueLotes} loading={loading} />
      )}

      {activeTab === "ESTOQUE" && activeSubTab === "ENTRADA" && (
        <RegistrarEntrada catalogo={catalogo} onCreateLote={handleCreateLote} />
      )}

      {activeTab === "ESTOQUE" && activeSubTab === "CADASTRAR" && (
        <CadastrarMedicamento onCreateMedicamento={handleCreateMedicamento} />
      )}

      {activeTab === "RELATORIOS" && (
        <Relatorios entradas={relatorioEntradas} saidas={relatorioSaidas} />
      )}
    </div>
  );
}

export default function FarmaciaJudicialPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            textAlign: "center",
            padding: "3rem",
            color: "#64748b",
            fontWeight: 500,
          }}
        >
          Carregando página...
        </div>
      }
    >
      <FarmaciaJudicialPageContent />
    </Suspense>
  );
}
