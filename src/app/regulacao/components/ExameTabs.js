"use client";

import styles from "./ExameTabs.module.css";

const DEFAULT_TIPOS_EXAME = [
  { id: "1", nome: "Ressonância Magnética" },
  { id: "2", nome: "Tomografia Computadorizada" },
  { id: "3", nome: "Cintilografia" },
];

// Abas seletoras de tipo de exame, usadas acima dos filtros na Lista de
// Espera e em Liberados.
export default function ExameTabs({ tiposExame = [], selected, onSelect = () => {} }) {
  const lista = tiposExame && tiposExame.length > 0 ? tiposExame : DEFAULT_TIPOS_EXAME;

  return (
    <div className={styles.examTabs}>
      {lista.map((tipo) => {
        const isActive =
          selected?.toLowerCase?.().trim() === tipo.nome?.toLowerCase().trim() ||
          String(selected) === String(tipo.id);

        return (
          <button
            key={tipo.id}
            type="button"
            className={`${styles.examTabBtn} ${isActive ? styles.activeExamTab : ""}`}
            onClick={() => onSelect(tipo.nome)}
          >
            {tipo.nome}
          </button>
        );
      })}
    </div>
  );
}
