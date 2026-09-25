"use client";

import { useState, useEffect, useCallback } from "react";
import { getAuxiliaryData } from "@/app/regulacao/actions";
import CadastroMedicos from "../components/CadastroMedicos";
import styles from "../GerenciamentoCadastro.module.css";

const FORM_MEDICO = {
  nome: "",
  crm: "",
  ufCrm: "MG",
  especialidade: "",
  tipo: "Solicitante",
};

export default function MedicosPage() {
  const [auxData, setAuxData] = useState({
    tiposExame: [],
    procedimentos: [],
    medicos: [],
    ubsList: [],
    pessoas: [],
  });
  const [formMedico, setFormMedico] = useState(FORM_MEDICO);

  const reloadData = useCallback(async () => {
    const aux = await getAuxiliaryData();
    setAuxData(
      aux || { tiposExame: [], procedimentos: [], medicos: [], ubsList: [], pessoas: [] },
    );
  }, []);

  useEffect(() => {
    reloadData();
  }, [reloadData]);

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>Médicos Solicitantes</h1>
        <p>Cadastro e gestão dos médicos.</p>
      </header>

      <CadastroMedicos
        formMedico={formMedico}
        setFormMedico={setFormMedico}
        auxData={auxData}
        reloadData={reloadData}
      />
    </div>
  );
}
