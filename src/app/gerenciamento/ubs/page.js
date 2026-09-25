"use client";

import { useState, useEffect, useCallback } from "react";
import { getAuxiliaryData } from "@/app/regulacao/actions";
import CadastroUbs from "../components/CadastroUbs";
import styles from "../GerenciamentoCadastro.module.css";

const FORM_UBS = { nome: "", cnes: "" };

export default function UbsPage() {
  const [auxData, setAuxData] = useState({
    tiposExame: [],
    procedimentos: [],
    medicos: [],
    ubsList: [],
    pessoas: [],
  });
  const [formUbs, setFormUbs] = useState(FORM_UBS);

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
        <h1>Unidades / UBS</h1>
        <p>Cadastro e gestão das unidades de saúde.</p>
      </header>

      <CadastroUbs
        formUbs={formUbs}
        setFormUbs={setFormUbs}
        auxData={auxData}
        reloadData={reloadData}
      />
    </div>
  );
}
