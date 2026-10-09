"use client";

import { useState, useEffect, useCallback } from "react";
import styles from "./ListaCCZ.module.css";
import { listarAnimais } from "./actions";
import FichaAnimal from "./FichaAnimal";

export default function AnimaisLista({ onEditar }) {
  const [animais, setAnimais] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [termo, setTermo] = useState("");
  const [fichaId, setFichaId] = useState(null); // id do animal com ficha aberta

  const carregar = useCallback(async () => {
    setCarregando(true);
    const res = await listarAnimais();
    setAnimais(res.success ? res.data : []);
    setCarregando(false);
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const termoLimpo = termo.trim().toLowerCase();
  const filtrados = animais.filter((a) => {
    if (!termoLimpo) return true;
    return (
      (a.nome || "").toLowerCase().includes(termoLimpo) ||
      (a.id || "").toLowerCase().includes(termoLimpo) ||
      (a.especie || "").toLowerCase().includes(termoLimpo) ||
      (a.tutorNome || "").toLowerCase().includes(termoLimpo)
    );
  });

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.listaHeader}>
          <h2 className={styles.cardHeaderTitle}>
            Animais cadastrados{filtrados.length > 0 ? ` (${filtrados.length})` : ""}
          </h2>
          <input
            type="text"
            className={styles.buscaInput}
            placeholder="Buscar por nome, id, espécie ou tutor..."
            value={termo}
            onChange={(e) => setTermo(e.target.value)}
          />
        </div>

        {carregando ? (
          <p className={styles.vazio}>Carregando animais...</p>
        ) : filtrados.length === 0 ? (
          <p className={styles.vazio}>Nenhum animal encontrado.</p>
        ) : (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th style={{ width: "88px" }}>Foto</th>
                  <th>Id</th>
                  <th>Nome</th>
                  <th>Tutor</th>
                  <th style={{ textAlign: "right" }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map((a) => (
                  <tr key={a.id}>
                    <td>
                      {a.fotoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={a.fotoUrl}
                          alt={a.nome || "Animal"}
                          className={styles.fotoMini}
                        />
                      ) : (
                        <div className={styles.fotoMiniVazia}>Sem foto</div>
                      )}
                    </td>
                    <td>{a.id}</td>
                    <td className={styles.boldName}>{a.nome || "Sem nome"}</td>
                    <td>
                      {a.tutorNome ? (
                        a.tutorNome
                      ) : (
                        <span className={styles.semTutor}>Sem tutor</span>
                      )}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <div className={styles.acoesCell}>
                        <button
                          type="button"
                          className={styles.btnEditar}
                          onClick={() => onEditar(a.id)}
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          className={styles.btnFicha}
                          onClick={() => setFichaId(a.id)}
                        >
                          Ver ficha
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

      {fichaId && (
        <FichaAnimal animalId={fichaId} onFechar={() => setFichaId(null)} />
      )}
    </div>
  );
}
