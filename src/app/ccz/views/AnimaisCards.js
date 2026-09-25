"use client";

import { useState, useMemo, useTransition } from "react";
import st from "./AnimaisCards.module.css";
import ModalConfirmacaoCCZ from "../components/Modals/ModalConfirmacaoCCZ";
import ModalEditarAnimal from "../components/Modals/ModalEditarAnimal";
import ModalMensagemCCZ from "../components/Modals/ModalMensagemCCZ";
import BotaoEditar from "@/components/BotaoEditar";
import { deleteAnimal, updateAnimal } from "../actions";

function especieEmoji(especie) {
  const map = {
    Cão: "🐕",
    Gato: "🐈",
  };
  return map[especie] || "🐾";
}

// Classe do badge por espécie
function especieBadgeClass(especie) {
  const map = {
    Cão: st.badgeCao,
    Gato: st.badgeGato,
    Bovino: st.badgeBovino,
    Equino: st.badgeEquino,
  };
  return map[especie] || st.badgeOutro;
}

export default function TabAnimaisCards({
  animais = [],
  tutores = [],
  reloadData,
}) {
  const [search, setSearch] = useState("");
  const [espFilter, setEspFilter] = useState("");
  const [animalParaEditar, setAnimalParaEditar] = useState(null);
  const [animalParaExcluir, setAnimalParaExcluir] = useState(null);
  const [messageConfig, setMessageConfig] = useState(null);
  const [isPending, startTransition] = useTransition();

  const especies = useMemo(() => {
    const set = new Set(animais.map((a) => a.especie).filter(Boolean));
    return [...set].sort();
  }, [animais]);

  const filtered = useMemo(() => {
    const low = search.toLowerCase().trim();
    return animais.filter((a) => {
      const byText =
        !low ||
        (a.nome || "").toLowerCase().includes(low) ||
        (a.especie || "").toLowerCase().includes(low);
      const byEsp = !espFilter || a.especie === espFilter;
      return byText && byEsp;
    });
  }, [animais, search, espFilter]);

  const handleSave = async (data) => {
    const result = await updateAnimal(animalParaEditar.id, data);
    if (!result.success) {
      setMessageConfig({
        type: "error",
        title: "Não foi possível salvar",
        message: result.error,
      });
      return;
    }
    setAnimalParaEditar(null);
    setMessageConfig({
      type: "success",
      title: "Animal atualizado",
      message: "As informações do animal foram atualizadas.",
    });
    reloadData?.();
  };

  const handleDelete = () => {
    startTransition(async () => {
      const result = await deleteAnimal(animalParaExcluir.id);
      if (!result.success) {
        setMessageConfig({
          type: "error",
          title: "Não foi possível excluir",
          message: result.error,
        });
        return;
      }
      setAnimalParaExcluir(null);
      setMessageConfig({
        type: "success",
        title: "Animal removido",
        message: "O cadastro do animal foi excluído com sucesso.",
      });
      reloadData?.();
    });
  };

  return (
    <div className={st.container}>
      {/* ── Filtros ─────────────────────────────────────────────── */}
      <div className={st.filterBar}>
        <span className={st.filterLabel}>Buscar:</span>
        <input
          type="text"
          className={st.searchInput}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Nome ou espécie..."
        />

        <span className={st.filterLabel}>Espécie:</span>
        <select
          value={espFilter}
          onChange={(e) => setEspFilter(e.target.value)}
        >
          <option value="">Todas</option>
          {especies.map((e) => (
            <option key={e} value={e}>
              {e}
            </option>
          ))}
        </select>

        {(search || espFilter) && (
          <button
            className={st.clearBtn}
            onClick={() => {
              setSearch("");
              setEspFilter("");
            }}
          >
            ✕ Limpar
          </button>
        )}

        <span className={st.count}>
          {filtered.length} {filtered.length === 1 ? "animal" : "animais"}
        </span>
      </div>

      {/* ── Grid de cards ────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <div className={st.empty}>
          <p>🐾</p>
          <p>
            {animais.length === 0
              ? "Nenhum animal cadastrado ainda."
              : "Nenhum animal encontrado com os filtros aplicados."}
          </p>
        </div>
      ) : (
        <div className={st.grid}>
          {filtered.map((animal) => {
            return (
              <div key={animal.id} className={st.card}>
                {/* Foto ou placeholder */}
                <div className={st.photoWrap}>
                  {animal.fotoUrl ? (
                    <img
                      src={animal.fotoUrl}
                      alt={animal.nome || animal.especie}
                      className={st.photo}
                    />
                  ) : (
                    <span className={st.photoPlaceholder}>
                      {especieEmoji(animal.especie)}
                    </span>
                  )}
                </div>

                {/* Corpo */}
                <div className={st.body}>
                  <div className={st.cardHeader}>
                    <h3 className={st.animalName}>
                      {animal.nome || (
                        <span style={{ color: "#94a3b8", fontWeight: 500 }}>
                          Sem nome
                        </span>
                      )}
                    </h3>
                    <span
                      className={`${st.especieBadge} ${especieBadgeClass(animal.especie)}`}
                    >
                      {animal.especie}
                    </span>
                  </div>

                  <div className={st.infoList}>
                    {animal.sexo && (
                      <div className={st.infoRow}>
                        <span className={st.infoLabel}>Sexo</span>
                        <span>
                          {{ M: "Macho", F: "Fêmea", I: "Não identificado" }[
                            animal.sexo
                          ] || animal.sexo}
                        </span>
                      </div>
                    )}
                    {animal.porte && (
                      <div className={st.infoRow}>
                        <span className={st.infoLabel}>Porte</span>
                        <span>{animal.porte}</span>
                      </div>
                    )}
                    {animal.idade && (
                      <div className={st.infoRow}>
                        <span className={st.infoLabel}>Idade</span>
                        <span>{animal.idade}</span>
                      </div>
                    )}
                    <div className={st.healthRow}>
                      <span
                        className={
                          animal.castrado === "Sim"
                            ? st.healthGood
                            : st.healthNeutral
                        }
                      >
                        {animal.castrado === "Sim"
                          ? "Castrado"
                          : "Não castrado"}
                      </span>
                      {animal.em_tratamento === "Sim" && (
                        <span className={st.healthWarning}>Em tratamento</span>
                      )}
                      {animal.doenca_cronica === "Sim" && (
                        <span className={st.healthWarning}>Doença crônica</span>
                      )}
                    </div>
                    {animal.endereco_recolhimento && (
                      <div className={st.locationRow}>
                        Local: {animal.endereco_recolhimento}
                      </div>
                    )}
                    <div className={st.actions}>
                      <BotaoEditar onClick={() => setAnimalParaEditar(animal)} />
                      <button
                        type="button"
                        className={st.deleteButton}
                        onClick={() => setAnimalParaExcluir(animal)}
                        disabled={isPending}
                      >
                        🗑️ Excluir
                      </button>
                    </div>
                  </div>
                </div>
                {animal.tutorNome && (
                  <div className={st.cardFooter}>
                    <div className={st.tutorAvatar} aria-hidden="true">
                      {animal.tutorNome.charAt(0).toUpperCase()}
                    </div>
                    <div className={st.tutorInfo}>
                      <div className={st.tutorName}>{animal.tutorNome}</div>
                      <div className={st.tutorMeta}>Tutor / responsável</div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <ModalConfirmacaoCCZ
        config={
          animalParaExcluir
            ? {
                nome: animalParaExcluir.nome || "Animal sem nome",
                detalhe: `${animalParaExcluir.especie} • ID ${animalParaExcluir.id}`,
              }
            : null
        }
        onConfirm={handleDelete}
        onCancel={() => setAnimalParaExcluir(null)}
      />
      <ModalMensagemCCZ
        config={messageConfig}
        onClose={() => setMessageConfig(null)}
      />
      {animalParaEditar && (
        <ModalEditarAnimal
          animal={animalParaEditar}
          tutores={tutores}
          onSave={handleSave}
          onCancel={() => setAnimalParaEditar(null)}
        />
      )}
    </div>
  );
}
