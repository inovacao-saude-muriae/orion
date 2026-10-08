"use client";

import { useState, useEffect, useCallback } from "react";
import { getServicosData } from "./actions";
import CadastroServicos from "../components/CadastroServicos";
import styles from "../GerenciamentoCadastro.module.css";

export default function ServicosPage() {
  const [data, setData] = useState({ servicos: [], especialidades: [] });

  // Mantido com useCallback para ser passado ao componente filho sem re-renders desnecessários
  const reloadData = useCallback(async () => {
    const res = await getServicosData();
    setData(res || { servicos: [], especialidades: [] });
  }, []);

  // Busca inicial auto-contida para evitar acoplamento de efeito com useCallback
  useEffect(() => {
    let isMounted = true;

    async function loadInitialData() {
      const res = await getServicosData();
      if (isMounted) {
        setData(res || { servicos: [], especialidades: [] });
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
        <h1>Serviços e Especialidades</h1>
        <p>Cadastro dos serviços (ex.: Ambulatório) e suas especialidades (ex.: Fonoaudiologia).</p>
      </header>

      <CadastroServicos data={data} reloadData={reloadData} />
    </div>
  );
}