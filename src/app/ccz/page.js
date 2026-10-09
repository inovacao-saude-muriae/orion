"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

import CadastroTutor from "./CadastroTutor";
import CadastroAnimal from "./CadastroAnimal";

import styles from "./CadastroTutor.module.css";

function CczPageContent() {
  const searchParams = useSearchParams();
  const activeTab = (searchParams.get("tab") || "TUTORES").toUpperCase();

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

      {activeTab === "ANIMAIS" ? <CadastroAnimal /> : <CadastroTutor />}
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
