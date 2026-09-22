"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";

import {
  cadastrarPacienteJunta,
  getPacientesPorServico,
  registrarAtendimentoServico,
  getProntuarioUnificado,
} from "./actions";

import CadastroPacienteJunta from "./views/CadastroPacienteJunta";
import AtendimentoServico from "./components/AtendimentoServico";
import ProntuarioRelatorio from "./views/ProntuarioRelatorio";

import styles from "./page.module.css";

// Mapeia os códigos de subTab da URL para os nomes exatos gravados no banco
const MAPA_SERVICOS = {
  CAEE: "CAEE",
  APAE: "APAE",
  AMBULATORIO: "Ambulatório",
  EDUCACAO: "Educação",
  SOCIAL: "Social",
  ESPECIALIDADES: "Centro de Especialidades",
  REABILITACAO: "Centro de Reabilitação",
};

function JuntaReguladoraPageContent() {
  const searchParams = useSearchParams();

  const activeTab = searchParams.get("tab") || "CADASTRO";
  const activeSubTab = searchParams.get("subTab") || "CAEE";

  // Nome formatado do serviço atual (Ex: "AMBULATORIO" -> "Ambulatório")
  const servicoNomeFormatado =
    MAPA_SERVICOS[activeSubTab.toUpperCase()] || activeSubTab;

  const [pacientesServico, setPacientesServico] = useState([]);
  const [prontuarioData, setProntuarioData] = useState(null);
  const [loadingServico, setLoadingServico] = useState(false);

  // Busca de pacientes no banco ao selecionar/mudar de serviço
  useEffect(() => {
    let isMounted = true;

    if (activeTab === "SERVICOS") {
      // Usar queueMicrotask evita o aviso de setState síncrono no topo do Effect
      queueMicrotask(() => {
        if (isMounted) setLoadingServico(true);
      });

      getPacientesPorServico(servicoNomeFormatado)
        .then((res) => {
          if (!isMounted) return;
          if (res && res.success && Array.isArray(res.data)) {
            setPacientesServico(res.data);
          } else {
            setPacientesServico([]);
          }
        })
        .catch((err) => {
          console.error("Erro ao carregar pacientes:", err);
          if (isMounted) setPacientesServico([]);
        })
        .finally(() => {
          if (isMounted) setLoadingServico(false);
        });
    }

    return () => {
      isMounted = false;
    };
  }, [activeTab, servicoNomeFormatado]);

  // Função para recarregar lista após um cadastro ou atendimento
  const recarregarPacientes = async () => {
    if (activeTab === "SERVICOS") {
      setLoadingServico(true);
      try {
        const res = await getPacientesPorServico(servicoNomeFormatado);
        if (res && res.success && Array.isArray(res.data)) {
          setPacientesServico(res.data);
        } else {
          setPacientesServico([]);
        }
      } catch (err) {
        console.error("Erro ao recarregar pacientes:", err);
        setPacientesServico([]);
      } finally {
        setLoadingServico(false);
      }
    }
  };

  const handleCadastrarPaciente = async (formData) => {
    const res = await cadastrarPacienteJunta(formData);
    if (res.success) {
      alert("Dados da Junta salvos com sucesso!");
      recarregarPacientes();
    } else {
      alert("Erro ao salvar paciente: " + (res.error || "Erro desconhecido"));
    }
    return res;
  };

  const handleRegistrarAtendimento = async (atendimentoData) => {
    const res = await registrarAtendimentoServico(atendimentoData);
    if (res.success) {
      alert("Registro de presença/atendimento gravado com sucesso!");
      recarregarPacientes();
    } else {
      alert("Erro ao registrar atendimento: " + (res.error || "Erro desconhecido"));
    }
  };

  const handleBuscarProntuario = async (termo) => {
    const res = await getProntuarioUnificado(termo);
    if (res && res.success) {
      if (!res.data) {
        alert("Nenhum paciente encontrado com este Nome ou CPF.");
      }
      setProntuarioData(res.data);
    } else {
      alert("Erro na busca do prontuário: " + (res.error || "Erro no banco"));
      setProntuarioData(null);
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1>Junta Reguladora</h1>
          <p>
            Gestão Multidisciplinar, Recepção de Serviços e Prontuário Unificado
          </p>
        </div>
      </header>

      {activeTab === "CADASTRO" && (
        <CadastroPacienteJunta onCadastrar={handleCadastrarPaciente} />
      )}

      {activeTab === "SERVICOS" && (
        <>
          {loadingServico ? (
            <div style={{ textAlign: "center", padding: "2rem", color: "#64748b" }}>
              Carregando pacientes do serviço {servicoNomeFormatado}...
            </div>
          ) : (
            <AtendimentoServico
              servicoNome={servicoNomeFormatado}
              pacientes={pacientesServico}
              onRegistrar={handleRegistrarAtendimento}
            />
          )}
        </>
      )}

      {activeTab === "RELATORIO" && (
        <ProntuarioRelatorio
          prontuarioData={prontuarioData}
          onBuscar={handleBuscarProntuario}
        />
      )}
    </div>
  );
}

export default function JuntaReguladoraPage() {
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
      <JuntaReguladoraPageContent />
    </Suspense>
  );
}