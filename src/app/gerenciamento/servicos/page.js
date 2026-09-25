"use client";

import { useState, useEffect, useCallback } from "react";
import { getServicosData } from "./actions";
import CadastroServicos from "../components/CadastroServicos";
import styles from "../GerenciamentoCadastro.module.css";

export default function ServicosPage() {
  const [data, setData] = useState({ servicos: [], especialidades: [] });

  const reloadData = useCallback(async () => {
    const res = await getServicosData();
    setData(res || { servicos: [], especialidades: [] });
  }, []);

  useEffect(() => {
    reloadData();
  }, [reloadData]);

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>Serviços e Especialidades</h1>
        <p>Cadastro dos serviços (ex.: Ambulatório) e suas especialidades (ex.: Fonoaudiologia).</p>
      </header>

      <CadastroServicos data={data} reloadData={reloadData} />
    </div>
  );
}
