"use client";

import React, { useState, useMemo, useTransition } from "react";
import styles from "./ExibirZoonoses.module.css";
import ModalConfirmacaoEsporotricose from "./Modals/ModalConfirmacaoEsporotricose";
import ModalEditarEsporotricose from "./Modals/ModalEditarEsporotricose";
import BotaoEditar from "@/components/BotaoEditar";
import {
  excluirEsporotricoseAction,
  salvarEsporotricoseAction,
} from "../actions";

function formatDate(value) {
  if (!value) return "-";
  const dateStr = value instanceof Date ? value.toISOString() : String(value);
  const [datePart] = dateStr.split("T");
  const [year, month, day] = datePart.split("-");
  return year && month && day ? `${day}/${month}/${year}` : dateStr;
}

export default function TabExibirEsporotricose({
  registros = [],
  animais = [],
  reloadData,
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isPending, startTransition] = useTransition();
  const [registroParaExcluir, setRegistroParaExcluir] = useState(null);
  const [registroParaEditar, setRegistroParaEditar] = useState(null);

  const animaisPorId = useMemo(() => {
    return new Map(animais.map((a) => [String(a.id), a]));
  }, [animais]);

  const filtered = useMemo(() => {
    if (!searchTerm.trim()) return registros;
    const term = searchTerm.toLowerCase();

    return registros.filter((r) => {
      const animal = animaisPorId.get(String(r.animal_id));
      const animalNome = animal?.nome?.toLowerCase() || "";
      const protocolo = r.numero_protocolo?.toLowerCase() || "";
      const fiscal = r.fiscal_responsavel?.toLowerCase() || "";

      return (
        animalNome.includes(term) ||
        protocolo.includes(term) ||
        fiscal.includes(term)
      );
    });
  }, [registros, animaisPorId, searchTerm]);

  const handleDelete = (registro) => {
    setRegistroParaExcluir(registro);
  };

  const confirmDelete = () => {
    startTransition(async () => {
      const res = await excluirEsporotricoseAction(registroParaExcluir.id);
      if (!res.success) {
        alert(`Erro ao excluir: ${res.error}`);
        return;
      }
      setRegistroParaExcluir(null);
      reloadData?.();
    });
  };

  const saveEdit = (data) => {
    startTransition(async () => {
      const res = await salvarEsporotricoseAction(data, registroParaEditar.id);
      if (!res.success) {
        alert(`Erro ao salvar: ${res.error}`);
        return;
      }
      setRegistroParaEditar(null);
      reloadData?.();
    });
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerTitle}>
          <h2>Registros de Esporotricose</h2>
        </div>
        <span className={styles.counter}>{filtered.length} registro(s)</span>
      </div>

      {registros.length > 0 && (
        <input
          type="text"
          placeholder="Filtrar por protocolo, animal ou fiscal..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className={styles.searchInput}
        />
      )}

      {filtered.length === 0 ? (
        <div className={styles.emptyState}>
          {registros.length === 0
            ? "Nenhum caso de esporotricose registrado."
            : "Nenhum registro encontrado para essa busca."}
        </div>
      ) : (
        <div className={styles.list}>
          {filtered.map((item) => {
            const animal = animaisPorId.get(String(item.animal_id));
            const temPessoasLesoes = item.pessoas_com_lesoes === "Sim";
            const acessoRua = item.acesso_rua === "Sim";

            return (
              <div
                key={item.id}
                className={`${styles.row} ${
                  temPessoasLesoes || acessoRua
                    ? styles.borderHigh
                    : styles.borderLow
                }`}
              >
                <div className={styles.mainInfo}>
                  <div className={styles.titleRow}>
                    <p className={styles.doencaName}>
                      Animal: <strong>{animal?.nome || "Sem nome"}</strong> (#
                      {item.animal_id || "N/A"})
                    </p>
                    {temPessoasLesoes && (
                      <span className={styles.lifeRisk}>
                        Contactante Humano
                      </span>
                    )}
                    {acessoRua && (
                      <span className={styles.lifeRisk}>Acesso à Rua</span>
                    )}
                  </div>
                  <h3 className={styles.animalInfo}>
                    Protocolo: {item.numero_protocolo || "Sem Protocolo"}
                  </h3>
                </div>

                <div className={styles.metaInfo}>
                  <div className={styles.metaItem}>
                    <span className={styles.metaLabel}>Visita:</span>
                    <span>{formatDate(item.data_visita)}</span>
                  </div>

                  <div className={styles.metaItem}>
                    <span className={styles.metaLabel}>Tratamento:</span>
                    <span>{item.em_tratamento_continuo || "N/A"}</span>
                  </div>

                  <div className={styles.metaItem}>
                    <span className={styles.metaLabel}>Fiscal:</span>
                    <span>{item.fiscal_responsavel || "-"}</span>
                  </div>
                </div>

                <div className={styles.actions}>
                  <BotaoEditar onClick={() => setRegistroParaEditar(item)} />
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => handleDelete(item)}
                    className={`${styles.actionBtn} ${styles.deleteBtn}`}
                  >
                    {isPending ? "..." : "Excluir"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ModalConfirmacaoEsporotricose
        config={
          registroParaExcluir
            ? {
                protocolo: registroParaExcluir.numero_protocolo,
                detalhe: `Animal relacionado: ${registroParaExcluir.animal_id || "Não informado"}`,
              }
            : null
        }
        onConfirm={confirmDelete}
        onCancel={() => setRegistroParaExcluir(null)}
        deleting={isPending}
      />

      {registroParaEditar && (
        <ModalEditarEsporotricose
          esporotricose={registroParaEditar}
          animais={animais}
          onSave={saveEdit}
          onCancel={() => setRegistroParaEditar(null)}
          saving={isPending}
        />
      )}
    </div>
  );
}
