"use client";

import React, { useState, useMemo, useTransition } from "react";
import styles from "./ExibirZoonoses.module.css";
import ModalConfirmacaoCCZ from "./Modals/ModalConfirmacaoCCZ";
import ModalEditarZoonose from "./Modals/ModalEditarZoonose";
import BotaoEditar from "@/components/BotaoEditar";
import { excluirZoonoseAction, salvarEdicaoZoonoseAction } from "../actions";

function formatDate(value) {
  if (!value) return "-";
  const dateStr = value instanceof Date ? value.toISOString() : String(value);
  const [datePart] = dateStr.split("T");
  const [year, month, day] = datePart.split("-");
  return year && month && day ? `${day}/${month}/${year}` : dateStr;
}

function getRiskStyle(risk) {
  const norm = (risk || "").toLowerCase();
  if (norm === "alto" || norm === "critico") {
    return { badge: styles.riskHigh, border: styles.borderHigh };
  }
  if (norm === "moderado") {
    return { badge: styles.riskMedium, border: styles.borderMedium };
  }
  return { badge: styles.riskLow, border: styles.borderLow };
}

export default function TabExibirZoonoses({
  zoonoses = [],
  animais = [],
  reloadData,
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isPending, startTransition] = useTransition();
  const [zoonoseParaExcluir, setZoonoseParaExcluir] = useState(null);
  const [zoonoseParaEditar, setZoonoseParaEditar] = useState(null);

  const animaisPorId = useMemo(() => {
    return new Map(animais.map((a) => [String(a.id), a]));
  }, [animais]);

  const filteredZoonoses = useMemo(() => {
    if (!searchTerm.trim()) return zoonoses;
    const term = searchTerm.toLowerCase();

    return zoonoses.filter((z) => {
      const animal = animaisPorId.get(String(z.animal_id));
      const animalNome = animal?.nome?.toLowerCase() || "";
      const doenca = z.doenca?.toLowerCase() || "";
      const resp = z.responsavel_monitoramento?.toLowerCase() || "";

      return (
        doenca.includes(term) ||
        animalNome.includes(term) ||
        resp.includes(term)
      );
    });
  }, [zoonoses, animaisPorId, searchTerm]);

  const handleDelete = (zoonose) => {
    setZoonoseParaExcluir(zoonose);
  };

  const confirmDelete = () => {
    startTransition(async () => {
      const res = await excluirZoonoseAction(zoonoseParaExcluir.id);
      if (!res.success) {
        alert(`Erro ao excluir: ${res.error}`);
        return;
      }
      setZoonoseParaExcluir(null);
      reloadData?.();
    });
  };

  const handleEdit = (zoonose) => setZoonoseParaEditar(zoonose);

  const saveEdit = (data) => {
    startTransition(async () => {
      const res = await salvarEdicaoZoonoseAction(zoonoseParaEditar.id, data);
      if (!res.success) {
        alert(`Erro ao salvar: ${res.error}`);
        return;
      }
      setZoonoseParaEditar(null);
      reloadData?.();
    });
  };

  return (
    <div className={styles.container}>
      {/* Cabeçalho */}
      <div className={styles.header}>
        <div className={styles.headerTitle}>
          <h2>Lista de Zoonoses Registradas</h2>
        </div>
        <span className={styles.counter}>
          {filteredZoonoses.length} registro(s)
        </span>
      </div>

      {/* Busca rápida */}
      {zoonoses.length > 0 && (
        <input
          type="text"
          placeholder="Filtrar por doença, animal ou responsável..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className={styles.searchInput}
        />
      )}

      {/* Lista Linha a Linha */}
      {filteredZoonoses.length === 0 ? (
        <div className={styles.emptyState}>
          {zoonoses.length === 0
            ? "Nenhum caso de zoonose cadastrado até o momento."
            : "Nenhum registro encontrado para essa busca."}
        </div>
      ) : (
        <div className={styles.list}>
          {filteredZoonoses.map((zoonose) => {
            const animal = animaisPorId.get(String(zoonose.animal_id));
            const risk = getRiskStyle(zoonose.grau_risco);
            const isLifeRisk =
              String(zoonose.risco_vida).toLowerCase() === "sim" ||
              zoonose.risco_vida === true;

            return (
              <div key={zoonose.id} className={`${styles.row} ${risk.border}`}>
                {/* Doença e Animal */}
                <div className={styles.mainInfo}>
                  <div className={styles.titleRow}>
                    <h2 className={styles.doencaName}>
                      Animal:{" "}
                      <strong>{animal?.nome || "Sem tutor / Sem nome"}</strong>{" "}
                      (#
                      {zoonose.animal_id})
                    </h2>
                    <span className={`${styles.badge} ${risk.badge}`}>
                      {zoonose.grau_risco || "Baixo"}
                    </span>
                    {isLifeRisk && (
                      <span className={styles.lifeRisk}>⚠️ Risco Vital</span>
                    )}
                  </div>
                  <h4 className={styles.doencaName}>{zoonose.doenca}</h4>
                </div>

                {/* Metadados compactos */}
                <div className={styles.metaInfo}>
                  <div className={styles.metaItem}>
                    <span className={styles.metaLabel}>Data:</span>
                    <span>{formatDate(zoonose.data_identificacao)}</span>
                  </div>

                  <div className={styles.metaItem}>
                    <span className={styles.metaLabel}>Acomp:</span>
                    <span>{zoonose.periodo_monitoramento || "N/A"}</span>
                  </div>

                  <div className={styles.metaItem}>
                    <span className={styles.metaLabel}>Resp:</span>
                    <span>{zoonose.responsavel_monitoramento || "-"}</span>
                  </div>
                </div>

                {/* Ações */}
                <div className={styles.actions}>
                  <BotaoEditar onClick={() => handleEdit(zoonose)} />
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => handleDelete(zoonose)}
                    className={`${styles.actionBtn} ${styles.deleteBtn}`}
                  >
                    {isPending ? "Excluindo..." : "Excluir"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ModalConfirmacaoCCZ
        config={
          zoonoseParaExcluir
            ? {
                nome: zoonoseParaExcluir.doenca,
                detalhe: `Animal relacionado: ${zoonoseParaExcluir.animal_id}`,
              }
            : null
        }
        onConfirm={confirmDelete}
        onCancel={() => setZoonoseParaExcluir(null)}
      />

      {zoonoseParaEditar && (
        <ModalEditarZoonose
          zoonose={zoonoseParaEditar}
          animais={animais}
          saving={isPending}
          onSave={saveEdit}
          onCancel={() => setZoonoseParaEditar(null)}
        />
      )}
    </div>
  );
}
