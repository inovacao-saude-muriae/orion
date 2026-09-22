"use client";

import { Suspense, useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getAuxiliaryData } from "@/app/regulacao/actions";
import CadastroMedicos from "@/app/regulacao/components/CadastroMedicos";
import CadastroUbs from "@/app/regulacao/components/CadastroUbs";
import CadastroProcedimentos from "@/app/regulacao/components/CadastroProcedimentos";
import styles from "./CadastrosRegulacao.module.css";

const FORM_MEDICO = {
  nome: "",
  crm: "",
  ufCrm: "MG",
  especialidade: "",
  tipo: "Solicitante",
};
const FORM_UBS = { nome: "", cnes: "" };
const FORM_PROCEDIMENTO = { nome: "", valor: "", tipoExameId: "" };

const ABAS = [
  { key: "MEDICOS", label: "Médicos Solicitantes" },
  { key: "UBS", label: "Unidades / UBS" },
  { key: "PROCEDIMENTOS", label: "Procedimentos" },
];

function CadastrosRegulacaoContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const subTab = searchParams.get("subTab") || "MEDICOS";

  const [auxData, setAuxData] = useState({
    tiposExame: [],
    procedimentos: [],
    medicos: [],
    ubsList: [],
    pessoas: [],
  });

  const [formMedico, setFormMedico] = useState(FORM_MEDICO);
  const [formUbs, setFormUbs] = useState(FORM_UBS);
  const [formProcedimento, setFormProcedimento] = useState(FORM_PROCEDIMENTO);

  const reloadData = useCallback(async () => {
    const aux = await getAuxiliaryData();
    setAuxData(
      aux || { tiposExame: [], procedimentos: [], medicos: [], ubsList: [], pessoas: [] },
    );
  }, []);

  useEffect(() => {
    reloadData();
  }, [reloadData]);

  const irPara = (chave) => {
    router.push(`/admin/cadastros-regulacao?subTab=${chave}`);
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>Cadastros da Regulação</h1>
        <p>Gestão de médicos solicitantes, unidades de saúde e procedimentos.</p>
      </header>

      {/* Abas */}
      <div className={styles.tabsBar}>
        {ABAS.map((aba) => (
          <button
            key={aba.key}
            type="button"
            className={`${styles.tabBtn} ${subTab === aba.key ? styles.tabActive : ""}`}
            onClick={() => irPara(aba.key)}
          >
            {aba.label}
          </button>
        ))}
      </div>

      {subTab === "MEDICOS" && (
        <CadastroMedicos
          formMedico={formMedico}
          setFormMedico={setFormMedico}
          auxData={auxData}
          reloadData={reloadData}
        />
      )}

      {subTab === "UBS" && (
        <CadastroUbs
          formUbs={formUbs}
          setFormUbs={setFormUbs}
          auxData={auxData}
          reloadData={reloadData}
        />
      )}

      {subTab === "PROCEDIMENTOS" && (
        <CadastroProcedimentos
          formProcedimento={formProcedimento}
          setFormProcedimento={setFormProcedimento}
          auxData={auxData}
          reloadData={reloadData}
        />
      )}
    </div>
  );
}

export default function CadastrosRegulacaoPage() {
  return (
    <Suspense
      fallback={
        <div style={{ padding: "3rem", textAlign: "center", color: "#64748b" }}>
          Carregando...
        </div>
      }
    >
      <CadastrosRegulacaoContent />
    </Suspense>
  );
}
