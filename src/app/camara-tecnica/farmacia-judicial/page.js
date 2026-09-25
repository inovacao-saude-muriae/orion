"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  getPacientesJudiciais,
  createPacienteJudicial,
  getMedicamentosEEstoque,
  getEstoqueAgrupado,
  getCatalogoMedicamentos,
  getCatalogoCompleto,
  createMedicamento,
  updateMedicamento,
  deleteMedicamento,
  createLoteMedicamento,
  updateLoteMedicamento,
  ajustarEstoque,
  getAjustesEstoque,
  registrarDispensacao,
  getDashboardMetrics,
  getRelatorioEntradas,
  getRelatorioSaidas,
} from "./actions";

import Dashboard from "./views/Dashboard";
import PacientesJudiciais from "./views/PacientesJudiciais";
import Medicamentos from "./views/Medicamentos";
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
  const [estoqueAgrupado, setEstoqueAgrupado] = useState([]);
  const [relatorioEntradas, setRelatorioEntradas] = useState([]);
  const [relatorioSaidas, setRelatorioSaidas] = useState([]);
  const [catalogo, setCatalogo] = useState([]);
  const [catalogoCompleto, setCatalogoCompleto] = useState([]);
  const [metrics, setMetrics] = useState({});

  // Função para recarregar dados manualmente após ações (cadastros, dispensações, etc.)
  const reloadData = async () => {
    setLoading(true);
    try {
      const [pacData, estData, agrData, catData, catFull, metData, entData, saiData] =
        await Promise.all([
          getPacientesJudiciais(),
          getMedicamentosEEstoque(),
          getEstoqueAgrupado(),
          getCatalogoMedicamentos(),
          getCatalogoCompleto(),
          getDashboardMetrics(),
          getRelatorioEntradas(),
          getRelatorioSaidas(),
        ]);
      setPacientes(pacData || []);
      setEstoqueLotes(estData || []);
      setEstoqueAgrupado(agrData || []);
      setCatalogo(catData || []);
      setCatalogoCompleto(catFull || []);
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
        const [pacData, estData, agrData, catData, catFull, metData, entData, saiData] =
          await Promise.all([
            getPacientesJudiciais(),
            getMedicamentosEEstoque(),
            getEstoqueAgrupado(),
            getCatalogoMedicamentos(),
            getCatalogoCompleto(),
            getDashboardMetrics(),
            getRelatorioEntradas(),
            getRelatorioSaidas(),
          ]);

        if (isMounted) {
          setPacientes(pacData || []);
          setEstoqueLotes(estData || []);
          setEstoqueAgrupado(agrData || []);
          setCatalogo(catData || []);
          setCatalogoCompleto(catFull || []);
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

  const handleUpdateLote = async (loteId, formData) => {
    const res = await updateLoteMedicamento(loteId, formData);
    if (res.success) await reloadData();
    else alert("Erro: " + res.error);
    return res;
  };

  // Nova entrada de estoque a partir da própria aba de Estoque (sem trocar de tela).
  const handleCreateLoteEstoque = async (formData) => {
    const res = await createLoteMedicamento(formData);
    if (res.success) await reloadData();
    else alert("Erro: " + res.error);
    return res;
  };

  // Ajuste de saldo (com justificativa) e leitura do histórico de ajustes.
  const handleAjustarEstoque = async (medicamentoId, formData) => {
    const res = await ajustarEstoque(medicamentoId, formData);
    if (res.success) await reloadData();
    else alert("Erro: " + res.error);
    return res;
  };

  const handleGetAjustes = async (medicamentoId) => {
    return await getAjustesEstoque(medicamentoId);
  };

  // Catálogo (aba Medicamentos): cria/atualiza sem sair da aba.
  const handleCreateMedicamentoCatalogo = async (formData) => {
    const res = await createMedicamento(formData);
    if (res.success) await reloadData();
    else alert("Erro: " + res.error);
    return res;
  };

  const handleUpdateMedicamento = async (id, formData) => {
    const res = await updateMedicamento(id, formData);
    if (res.success) await reloadData();
    else alert("Erro: " + res.error);
    return res;
  };

  const handleDeleteMedicamento = async (id) => {
    const res = await deleteMedicamento(id);
    if (res.success) await reloadData();
    else alert("Erro: " + res.error);
    return res;
  };

  const handleConfirmarDispensacao = async (dispensacaoData) => {
    const res = await registrarDispensacao(dispensacaoData);
    if (res.success) await reloadData();
    else alert("Erro: " + res.error);
    return res;
  };

  return (
    <div className={styles.container}>
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

      {activeTab === "MEDICAMENTOS" && (
        <Medicamentos
          catalogo={catalogoCompleto}
          onCreateMedicamento={handleCreateMedicamentoCatalogo}
          onUpdateMedicamento={handleUpdateMedicamento}
          onDeleteMedicamento={handleDeleteMedicamento}
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
        <SaldoEstoque
          estoqueAgrupado={estoqueAgrupado}
          estoqueLotes={estoqueLotes}
          catalogo={catalogoCompleto}
          onUpdateLote={handleUpdateLote}
          onCreateLote={handleCreateLoteEstoque}
          onAjustarEstoque={handleAjustarEstoque}
          onGetAjustes={handleGetAjustes}
          loading={loading}
        />
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
