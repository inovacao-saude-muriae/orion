"use client";

import { useState, useEffect, useCallback } from "react";
import styles from "./ListaCCZ.module.css";
import { listarProcedimentos } from "./actions";
import TermoInternacao from "./TermoInternacao";

const formatarData = (ymd) =>
  ymd ? ymd.split("-").reverse().join("/") : "-";

export default function ProcedimentosLista({ onEditar }) {
  const [procedimentos, setProcedimentos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [termo, setTermo] = useState("");
  const [termoInternacaoId, setTermoInternacaoId] = useState(null); // procId do termo aberto

  const carregar = useCallback(async () => {
    setCarregando(true);
    const res = await listarProcedimentos();
    setProcedimentos(res.success ? res.data : []);
    setCarregando(false);
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const termoLimpo = termo.trim().toLowerCase();
  const filtrados = procedimentos.filter((p) => {
    if (!termoLimpo) return true;
    return (
      (p.animalNome || "").toLowerCase().includes(termoLimpo) ||
      (p.animalId || "").toLowerCase().includes(termoLimpo) ||
      (p.tutorNome || "").toLowerCase().includes(termoLimpo) ||
      (p.tipo || "").toLowerCase().includes(termoLimpo) ||
      (p.status || "").toLowerCase().includes(termoLimpo)
    );
  });

  const classeStatus = (status) => {
    if (status === "Realizado") return styles.statusRealizado;
    if (status === "Cancelado") return styles.statusCancelado;
    return styles.statusAgendado;
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.listaHeader}>
          <h2 className={styles.cardHeaderTitle}>
            Procedimentos{filtrados.length > 0 ? ` (${filtrados.length})` : ""}
          </h2>
          <input
            type="text"
            className={styles.buscaInput}
            placeholder="Buscar por animal, tutor, tipo ou status..."
            value={termo}
            onChange={(e) => setTermo(e.target.value)}
          />
        </div>

        {carregando ? (
          <p className={styles.vazio}>Carregando procedimentos...</p>
        ) : filtrados.length === 0 ? (
          <p className={styles.vazio}>Nenhum procedimento encontrado.</p>
        ) : (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Animal</th>
                  <th>Tipo</th>
                  <th>Data</th>
                  <th>Status</th>
                  <th>Veterinário</th>
                  <th>Retorno</th>
                  <th style={{ textAlign: "right" }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <span className={styles.boldName}>
                        {p.animalNome || "Sem nome"}
                      </span>
                      <div className={styles.subText}>
                        {p.animalId}
                        {p.tutorNome ? ` · ${p.tutorNome}` : ""}
                      </div>
                    </td>
                    <td>{p.tipo}</td>
                    <td>{formatarData(p.dataProcedimento)}</td>
                    <td>
                      <span className={classeStatus(p.status)}>{p.status}</span>
                    </td>
                    <td>{p.veterinario || "-"}</td>
                    <td>{p.dataRetorno ? formatarData(p.dataRetorno) : "-"}</td>
                    <td style={{ textAlign: "right" }}>
                      <div className={styles.acoesCell}>
                        <button
                          type="button"
                          className={styles.btnEditar}
                          onClick={() => onEditar(p.id)}
                        >
                          Editar
                        </button>
                        {p.tipo === "Internação" && (
                          <button
                            type="button"
                            className={styles.btnFicha}
                            onClick={() => setTermoInternacaoId(p.id)}
                          >
                            Termo de internação
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {termoInternacaoId && (
        <TermoInternacao
          procedimentoId={termoInternacaoId}
          onFechar={() => setTermoInternacaoId(null)}
        />
      )}
    </div>
  );
}
