"use client";

import { useState, useEffect, useCallback } from "react";
import { getProcedimentosData } from "./actions";
import CadastroProcedimentos from "../components/CadastroProcedimentos";
import styles from "../GerenciamentoCadastro.module.css";

export default function ProcedimentosPage() {
  const [data, setData] = useState({ tiposExame: [], linhas: [] });

  // Mantido para o componente filho invocar após criar/editar registros
  const reloadData = useCallback(async () => {
    const res = await getProcedimentosData();
    setData(res || { tiposExame: [], linhas: [] });
  }, []);

  // Busca inicial isolada no efeito
  useEffect(() => {
    let isMounted = true;

    async function loadInitialData() {
      const res = await getProcedimentosData();
      if (isMounted) {
        setData(res || { tiposExame: [], linhas: [] });
      }
    }

    loadInitialData();

    return () => {
      isMounted = false;
    };
  }, []);

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