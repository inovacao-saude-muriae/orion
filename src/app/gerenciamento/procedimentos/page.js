"use client";

import { useState, useEffect, useCallback } from "react";
import { getProcedimentosData } from "./actions";
import CadastroProcedimentos from "../components/CadastroProcedimentos";
import styles from "../GerenciamentoCadastro.module.css";

export default function ProcedimentosPage() {
  const [data, setData] = useState({ tiposExame: [], linhas: [] });

  const reloadData = useCallback(async () => {
    const res = await getProcedimentosData();
    setData(res || { tiposExame: [], linhas: [] });
  }, []);

  useEffect(() => {
    reloadData();
  }, [reloadData]);

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>Exames e Procedimentos</h1>
        <p>Cadastro dos tipos de exame (ex.: Imagem) e seus procedimentos (ex.: Ultrassonografia).</p>
      </header>

      <CadastroProcedimentos data={data} reloadData={reloadData} />
    </div>
  );
}
