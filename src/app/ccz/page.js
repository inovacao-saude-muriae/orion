"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";

import CadastroTutor from "./CadastroTutor";
import CadastroAnimal from "./CadastroAnimal";
import CadastroProcedimento from "./CadastroProcedimento";
import TutoresLista from "./TutoresLista";
import AnimaisLista from "./AnimaisLista";
import ProcedimentosLista from "./ProcedimentosLista";
import AgendaCCZ from "./AgendaCCZ";
import { obterAnimal, obterProcedimento } from "./actions";

import styles from "./CadastroTutor.module.css";

function CczPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const activeTab = (searchParams.get("tab") || "TUTORES").toUpperCase();
  const activeSubTab = (searchParams.get("subTab") || "CADASTRAR").toUpperCase();

  // Estado de edição vindo das listas.
  const [cpfTutorEdicao, setCpfTutorEdicao] = useState("");
  const [animalEdicao, setAnimalEdicao] = useState(null);
  const [carregandoAnimal, setCarregandoAnimal] = useState(false);
  const [procedimentoEdicao, setProcedimentoEdicao] = useState(null);
  const [carregandoProcedimento, setCarregandoProcedimento] = useState(false);

  // Navega para uma aba/sub-aba preservando o módulo.
  const irPara = (tab, subTab) => {
    router.push(`/ccz?tab=${tab}&subTab=${subTab}`);
  };

  // Ao sair do modo cadastro (troca de aba), limpa os registros em edição.
  useEffect(() => {
    if (activeSubTab !== "CADASTRAR") {
      setCpfTutorEdicao("");
      setAnimalEdicao(null);
      setProcedimentoEdicao(null);
    }
  }, [activeTab, activeSubTab]);

  // ── Editar tutor: vai para Tutor > Cadastrar com o CPF pré-carregado ──
  const editarTutor = (cpf) => {
    setCpfTutorEdicao(cpf);
    irPara("TUTORES", "CADASTRAR");
  };

  // ── Editar animal: carrega o registro e vai para Animais > Cadastrar ──
  const editarAnimal = async (id) => {
    setCarregandoAnimal(true);
    const res = await obterAnimal(id);
    setCarregandoAnimal(false);
    if (res.success) {
      setAnimalEdicao(res.data);
      irPara("ANIMAIS", "CADASTRAR");
    }
  };

  // ── Editar procedimento: carrega o registro e vai para Procedimentos > Cadastrar ──
  const editarProcedimento = async (id) => {
    setCarregandoProcedimento(true);
    const res = await obterProcedimento(id);
    setCarregandoProcedimento(false);
    if (res.success) {
      setProcedimentoEdicao(res.data);
      irPara("PROCEDIMENTOS", "CADASTRAR");
    }
  };

  // Volta para a lista correspondente após salvar/cancelar edição.
  const voltarListaTutores = () => {
    setCpfTutorEdicao("");
    irPara("TUTORES", "LISTA");
  };
  const voltarListaAnimais = () => {
    setAnimalEdicao(null);
    irPara("ANIMAIS", "LISTA");
  };
  const voltarListaProcedimentos = () => {
    setProcedimentoEdicao(null);
    irPara("PROCEDIMENTOS", "LISTA");
  };

  let conteudo;
  if (activeTab === "AGENDA") {
    conteudo = <AgendaCCZ onAbrirProcedimento={editarProcedimento} />;
  } else if (activeTab === "PROCEDIMENTOS") {
    if (activeSubTab === "LISTA") {
      conteudo = <ProcedimentosLista onEditar={editarProcedimento} />;
    } else if (carregandoProcedimento) {
      conteudo = <p className={styles.subtitle}>Carregando procedimento...</p>;
    } else {
      conteudo = (
        <CadastroProcedimento
          key={procedimentoEdicao?.id || "novo"}
          registroInicial={procedimentoEdicao}
          onSalvo={voltarListaProcedimentos}
        />
      );
    }
  } else if (activeTab === "ANIMAIS") {
    if (activeSubTab === "LISTA") {
      conteudo = <AnimaisLista onEditar={editarAnimal} />;
    } else if (carregandoAnimal) {
      conteudo = <p className={styles.subtitle}>Carregando animal...</p>;
    } else {
      conteudo = (
        <CadastroAnimal
          key={animalEdicao?.id || "novo"}
          animalInicial={animalEdicao}
          onSalvo={voltarListaAnimais}
        />
      );
    }
  } else {
    // TUTORES (padrão)
    if (activeSubTab === "LISTA") {
      conteudo = <TutoresLista onEditar={editarTutor} />;
    } else {
      conteudo = (
        <CadastroTutor
          key={cpfTutorEdicao || "novo"}
          cpfInicial={cpfTutorEdicao}
          onVoltarLista={voltarListaTutores}
        />
      );
    }
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>CCZ — Centro de Controle de Zoonoses</h1>
          <p className={styles.subtitle}>
            Cadastro de tutores e animais do Centro de Controle de Zoonoses.
          </p>
        </div>
      </header>

      {conteudo}
    </div>
  );
}

export default function CczPage() {
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
      <CczPageContent />
    </Suspense>
  );
}
