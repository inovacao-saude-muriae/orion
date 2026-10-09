"use client";

import { useState, useEffect, useCallback } from "react";
import styles from "./ListaCCZ.module.css";
import { listarEsporotricose, obterEsporotricose } from "./actions";
import { gerarPdfEsporotricose, gerarTermoEsporotricose } from "./esporotricosePdf";

const formatarData = (ymd) => (ymd ? ymd.split("-").reverse().join("/") : "-");

export default function EsporotricoseLista({ onEditar }) {
  const [registros, setRegistros] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [termo, setTermo] = useState("");
  const [gerando, setGerando] = useState(false);

  const carregar = useCallback(async () => {
    setCarregando(true);
    const res = await listarEsporotricose();
    setRegistros(res.success ? res.data : []);
    setCarregando(false);
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const termoLimpo = termo.trim().toLowerCase();
  const filtrados = registros.filter((r) => {
    if (!termoLimpo) return true;
    return (
      (r.animalNome || "").toLowerCase().includes(termoLimpo) ||
      (r.animalId || "").toLowerCase().includes(termoLimpo) ||
      (r.tutorNome || "").toLowerCase().includes(termoLimpo) ||
      (r.numeroProtocolo || "").toLowerCase().includes(termoLimpo)
    );
  });

  // Baixa o relatório completo do registro.
  const baixarPdf = async (id) => {
    setGerando(true);
    const res = await obterEsporotricose(id);
    setGerando(false);
    if (res.success) gerarPdfEsporotricose(res.data);
  };

  // Gera o termo (documento formal com assinaturas).
  const baixarTermo = async (id) => {
    setGerando(true);
    const res = await obterEsporotricose(id);
    setGerando(false);
    if (res.success) gerarTermoEsporotricose(res.data);
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.listaHeader}>
          <h2 className={styles.cardHeaderTitle}>
            Esporotricose{filtrados.length > 0 ? ` (${filtrados.length})` : ""}
          </h2>
          <input
            type="text"
            className={styles.buscaInput}
            placeholder="Buscar por animal, tutor ou protocolo..."
            value={termo}
            onChange={(e) => setTermo(e.target.value)}
          />
        </div>

        {carregando ? (
          <p className={styles.vazio}>Carregando registros...</p>
        ) : filtrados.length === 0 ? (
          <p className={styles.vazio}>Nenhum registro de esporotricose encontrado.</p>
        ) : (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Animal</th>
                  <th>Protocolo</th>
                  <th>Data da visita</th>
                  <th>Lesões</th>
                  <th>Nº visitas</th>
                  <th style={{ textAlign: "right" }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <span className={styles.boldName}>
                        {r.animalNome || "Sem nome"}
                      </span>
                      <div className={styles.subText}>
                        {r.animalId}
                        {r.tutorNome ? ` · ${r.tutorNome}` : ""}
                      </div>
                    </td>
                    <td>{r.numeroProtocolo || "-"}</td>
                    <td>{formatarData(r.dataVisita)}</td>
                    <td>{r.apresentaLesoes || "Não"}</td>
                    <td>
                      <span className={styles.badge}>{r.visitasCount}</span>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <div className={styles.acoesCell}>
                        <button
                          type="button"
                          className={styles.btnEditar}
                          onClick={() => onEditar(r.id)}
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          className={styles.btnFicha}
                          onClick={() => baixarPdf(r.id)}
                          disabled={gerando}
                        >
                          Baixar PDF
                        </button>
                        <button
                          type="button"
                          className={styles.btnFicha}
                          onClick={() => baixarTermo(r.id)}
                          disabled={gerando}
                        >
                          Termo
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
