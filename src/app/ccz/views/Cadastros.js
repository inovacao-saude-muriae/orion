"use client";

import { useState, useRef, useEffect } from "react";

// Estilos ajustados para a estrutura views/
import s from "../shared.module.css";
import ts from "./Cadastros.module.css";

// Modais importados da pasta components
import ModalConfirmacaoCCZ from "../components/Modals/ModalConfirmacaoCCZ";
import ModalMensagemCCZ from "../components/Modals/ModalMensagemCCZ";
import { useConfirm } from "@/components/ConfirmDialog";
import BotaoEditar from "@/components/BotaoEditar";

// Actions importadas da raiz do módulo ccz
import {
  searchPessoasCCZ,
  vincularTutor,
  createAnimal,
} from "../actions";

// ── Máscaras ─────────────────────────────────────────────────────────────
function maskCpf(v) {
  if (!v) return "";
  return v
    .replace(/\D/g, "")
    .slice(0, 11)
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}
function maskTel(v) {
  if (!v) return "";
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 10)
    return d
      .replace(/(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{4})(\d{1,4})$/, "$1-$2");
  return d
    .replace(/(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d{1,4})$/, "$1-$2");
}
function onlyDigits(v) {
  return v ? v.replace(/\D/g, "") : "";
}
function formatDate(d) {
  if (!d) return "-";
  const str = d instanceof Date ? d.toISOString() : String(d);
  const parts = str.split("T")[0].split("-");
  return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : str;
}

const ESPECIES = ["Cão", "Gato"];
const SEXOS = [
  { label: "Macho", value: "M" },
  { label: "Fêmea", value: "F" },
  { label: "Não identificado", value: "I" },
];
const PORTES = ["Pequeno", "Médio", "Grande", "Gigante"];
const SIM_NAO = ["Sim", "Não"];

const EMPTY_TUTOR_EXTRA = {
  rg: "",
  sexo: "",
  profissao: "",
  telefoneSecundario: "",
  pontoReferencia: "",
  observacoes: "",
};

const EMPTY_ANIMAL = {
  id: "",
  possui_responsavel: "",
  tutorCpf: "",
  nome: "",
  fotoUrl: "",
  especie: "",
  sexo: "M",
  porte: "Médio",
  idade: "",
  castrado: "Não",
  doenca_cronica: "Não",
  sintomas_vomito_diarreia: "Não",
  apetite_normal: "Sim",
  em_tratamento: "Não",
  qual_tratamento: "",
  observacoes: "",
  endereco_recolhimento: "",
};

// ─────────────────────────────────────────────────────────────────────────
export default function Cadastros({ tutores = [], animais = [], reloadData }) {
  const confirm = useConfirm();
  const [subTab, setSubTab] = useState("TUTORES");

  // ── TUTORES ──────────────────────────────────────────────────────────
  const [search, setSearch] = useState("");
  const [sugestoes, setSugestoes] = useState([]);
  const [showDrop, setShowDrop] = useState(false);
  const [searching, setSearching] = useState(false);
  const [pessoaSel, setPessoaSel] = useState(null); // pessoa carregada
  const [tutorExtra, setTutorExtra] = useState(EMPTY_TUTOR_EXTRA);
  const [deleteConfig, setDeleteConfig] = useState(null);
  const [messageConfig, setMessageConfig] = useState(null);
  const dropRef = useRef(null);
  const debounceRef = useRef(null);

  // Fecha dropdown ao clicar fora
  useEffect(() => {
    const handler = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target))
        setShowDrop(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSearchChange = (val) => {
    setSearch(val);
    setShowDrop(true);
    clearTimeout(debounceRef.current);
    if (val.trim().length < 2) {
      setSugestoes([]);
      return;
    }
    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      const res = await searchPessoasCCZ(val);
      setSugestoes(res);
      setSearching(false);
    }, 300);
  };

  const selecionarPessoa = (p) => {
    setPessoaSel(p);
    setSearch(`${p.nomeCompleto} (${maskCpf(p.cpf)})`);
    setShowDrop(false);
    setSugestoes([]);
    setTutorExtra({
      rg: p.rg || "",
      sexo: p.sexo || "",
      profissao: p.profissao || "",
      telefoneSecundario: p.telefoneSecundario
        ? maskTel(p.telefoneSecundario)
        : "",
      pontoReferencia: p.pontoReferencia || "",
      observacoes: p.observacoes || "",
    });
  };

  const limparSelecao = () => {
    setPessoaSel(null);
    setSearch("");
    setSugestoes([]);
    setTutorExtra(EMPTY_TUTOR_EXTRA);
  };

  const handleVincular = async (e) => {
    e.preventDefault();
    if (!pessoaSel) {
      setMessageConfig({
        type: "warning",
        title: "Selecione uma pessoa",
        message: "Escolha uma pessoa na busca antes de vincular um tutor.",
      });
      return;
    }
    const ok = await confirm({
      title: pessoaSel.isTutor ? "Atualizar tutor" : "Vincular tutor",
      message: pessoaSel.isTutor
        ? "Deseja salvar as alterações deste responsável?"
        : "Deseja vincular esta pessoa como tutor do CCZ?",
      confirmText: pessoaSel.isTutor ? "Atualizar" : "Vincular",
    });
    if (!ok) return;
    const payload = {
      ...tutorExtra,
      telefoneSecundario: onlyDigits(tutorExtra.telefoneSecundario) || null,
    };
    const res = await vincularTutor(pessoaSel.cpf, payload);
    if (res.success) {
      setMessageConfig({
        type: "success",
        title: pessoaSel.isTutor ? "Tutor atualizado" : "Novo tutor cadastrado",
        message: pessoaSel.isTutor
          ? "Os dados do responsável foram atualizados com sucesso."
          : "A pessoa foi vinculada como tutor do CCZ.",
      });
      limparSelecao();
      reloadData();
    } else {
      setMessageConfig({
        type: "error",
        title: "Não foi possível salvar",
        message: res.error,
      });
    }
  };

  // ── ANIMAIS ──────────────────────────────────────────────────────────
  const [animalForm, setAnimalForm] = useState(EMPTY_ANIMAL);

  const handleSubmitAnimal = async (e) => {
    e.preventDefault();
    if (
      !animalForm.id.trim() ||
      !animalForm.possui_responsavel ||
      !animalForm.especie
    ) {
      setMessageConfig({
        type: "warning",
        title: "Dados incompletos",
        message:
          "Informe o ID do animal, se possui responsável e selecione a espécie.",
      });
      return;
    }
    if (animalForm.possui_responsavel === "Sim" && !animalForm.tutorCpf) {
      setMessageConfig({
        type: "warning",
        title: "Selecione o responsável",
        message: "Escolha o tutor responsável pelo animal para continuar.",
      });
      return;
    }
    const ok = await confirm({
      title: "Cadastrar animal",
      message: "Deseja confirmar o cadastro deste animal?",
      confirmText: "Cadastrar",
    });
    if (!ok) return;
    const animalPayload = {
      ...animalForm,
      tutorCpf:
        animalForm.possui_responsavel === "Sim" ? animalForm.tutorCpf : "",
    };
    const res = await createAnimal(animalPayload);
    if (res.success) {
      setMessageConfig({
        type: "success",
        title: "Animal cadastrado",
        message: `O animal foi cadastrado com o ID ${res.data.id}.`,
      });
      setAnimalForm(EMPTY_ANIMAL);
      reloadData();
    } else {
      setMessageConfig({
        type: "error",
        title: "Não foi possível salvar o animal",
        message: res.error,
      });
    }
  };

  const handleAnimalPhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setMessageConfig({
        type: "warning",
        title: "Arquivo inválido",
        message: "Selecione um arquivo de imagem para a foto do animal.",
      });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setMessageConfig({
        type: "warning",
        title: "Imagem muito grande",
        message: "A foto deve ter no máximo 5 MB.",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = () =>
      setAnimalForm((current) => ({ ...current, fotoUrl: reader.result }));
    reader.readAsDataURL(file);
  };

  return (
    <div className={s.card}>
      <ModalConfirmacaoCCZ
        config={deleteConfig}
        onConfirm={() => {
          if (deleteConfig?.onConfirm) deleteConfig.onConfirm();
          setDeleteConfig(null);
        }}
        onCancel={() => setDeleteConfig(null)}
      />
      <ModalMensagemCCZ
        config={messageConfig}
        onClose={() => setMessageConfig(null)}
      />

      {/* Sub-nav */}
      <div className={ts.subNav}>
        {[
          {
            key: "TUTORES",
            label: "👤 Tutores / Responsáveis",
          },
          { key: "ANIMAIS", label: "🐾 Animais" },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={`${ts.subNavBtn} ${subTab === tab.key ? ts.subNavActive : ""}`}
            onClick={() => setSubTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ══════════ ABA TUTORES ══════════════════════════════════════ */}
      {subTab === "TUTORES" && (
        <>
          {/* Busca de pessoa */}
          <div className={ts.searchContainer}>
            <div className={ts.searchHeader}>
              <div>
                <h3 className={ts.searchTitle}>Vincular Tutor</h3>
                <p className={ts.searchSubtitle}>
                  Busque uma pessoa já cadastrada para vinculá-la como
                  responsável no CCZ. O cadastro da pessoa é feito em
                  Gerenciamento &gt; Cadastro de Pessoas.
                </p>
              </div>
            </div>

            <div className={ts.searchRow} ref={dropRef}>
              <div className={ts.autocompleteWrap}>
                <input
                  type="text"
                  className={ts.searchInput}
                  value={search}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  onFocus={() => sugestoes.length > 0 && setShowDrop(true)}
                  placeholder="Digite o nome ou CPF da pessoa para buscar..."
                />
                {searching && (
                  <span className={ts.searchSpinner}>Buscando...</span>
                )}
                {showDrop && sugestoes.length > 0 && (
                  <ul className={ts.dropdown}>
                    {sugestoes.map((p) => (
                      <li key={p.cpf} onClick={() => selecionarPessoa(p)}>
                        <div className={ts.dropName}>{p.nomeCompleto}</div>
                        <div className={ts.dropMeta}>
                          CPF: {maskCpf(p.cpf)}
                          {p.bairro ? ` • ${p.bairro}` : ""}
                          {p.isTutor && (
                            <span className={ts.dropBadge}>tutor</span>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Botão Buscar */}
              <button
                type="button"
                className={`${ts.iconBtn} ${ts.btnBlue}`}
                title="Buscar"
                onClick={() => {
                  if (sugestoes.length > 0) selecionarPessoa(sugestoes[0]);
                }}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </button>

              {/* Botão Limpar Seleção */}
              {pessoaSel && (
                <button
                  type="button"
                  className={`${ts.iconBtn} ${ts.btnGray}`}
                  title="Limpar seleção"
                  onClick={limparSelecao}
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Preview + formulário de dados extras do tutor */}
          {pessoaSel && (
            <form onSubmit={handleVincular} className={ts.formContainer}>
              {/* Card de resumo da pessoa */}
              <div className={ts.personCard}>
                <div className={ts.personCardAvatar}>
                  {pessoaSel.nomeCompleto.charAt(0).toUpperCase()}
                </div>
                <div className={ts.personCardInfo}>
                  <strong>{pessoaSel.nomeCompleto}</strong>
                  <span>CPF: {maskCpf(pessoaSel.cpf)}</span>
                  {pessoaSel.telefone && (
                    <span>Tel: {maskTel(pessoaSel.telefone)}</span>
                  )}
                  {pessoaSel.bairro && (
                    <span>
                      {pessoaSel.bairro}
                      {pessoaSel.cidade ? `, ${pessoaSel.cidade}` : ""}
                    </span>
                  )}
                </div>
                {pessoaSel.isTutor && (
                  <span className={ts.tutorBadge}>✓ Tutor CCZ</span>
                )}
              </div>

              {/* Dados extras do CCZ */}
              <div className={ts.formSection}>
                <div className={ts.sectionHeader}>
                  <h4>Dados Complementares CCZ</h4>
                </div>
                <div className={ts.formGrid}>
                  <div className={`${ts.field} ${ts.col3}`}>
                    <label>RG</label>
                    <input
                      type="text"
                      value={tutorExtra.rg}
                      onChange={(e) =>
                        setTutorExtra({ ...tutorExtra, rg: e.target.value })
                      }
                      placeholder="Ex: MG-12.345.678"
                    />
                  </div>
                  <div className={`${ts.field} ${ts.col3}`}>
                    <label>Sexo</label>
                    <select
                      value={tutorExtra.sexo}
                      onChange={(e) =>
                        setTutorExtra({ ...tutorExtra, sexo: e.target.value })
                      }
                    >
                      <option value="">--</option>
                      <option value="Masculino">Masculino</option>
                      <option value="Feminino">Feminino</option>
                      <option value="Outro">Outro</option>
                    </select>
                  </div>
                  <div className={`${ts.field} ${ts.col6}`}>
                    <label>Profissão</label>
                    <input
                      type="text"
                      value={tutorExtra.profissao}
                      onChange={(e) =>
                        setTutorExtra({
                          ...tutorExtra,
                          profissao: e.target.value,
                        })
                      }
                      placeholder="Ex: Agricultor"
                    />
                  </div>
                  <div className={`${ts.field} ${ts.col4}`}>
                    <label>Telefone Secundário</label>
                    <input
                      type="text"
                      value={tutorExtra.telefoneSecundario}
                      onChange={(e) =>
                        setTutorExtra({
                          ...tutorExtra,
                          telefoneSecundario: maskTel(e.target.value),
                        })
                      }
                      placeholder="(32) 3333-0000"
                    />
                  </div>
                  <div className={`${ts.field} ${ts.col8}`}>
                    <label>Ponto de Referência</label>
                    <input
                      type="text"
                      value={tutorExtra.pontoReferencia}
                      onChange={(e) =>
                        setTutorExtra({
                          ...tutorExtra,
                          pontoReferencia: e.target.value,
                        })
                      }
                      placeholder="Ex: Próximo à escola municipal"
                    />
                  </div>
                  <div className={`${ts.field} ${ts.col12}`}>
                    <label>Observações</label>
                    <textarea
                      rows={2}
                      value={tutorExtra.observacoes}
                      onChange={(e) =>
                        setTutorExtra({
                          ...tutorExtra,
                          observacoes: e.target.value,
                        })
                      }
                      placeholder="Anotações internas do CCZ sobre este responsável..."
                    />
                  </div>
                </div>
              </div>

              <div className={ts.formActions}>
                <button
                  type="button"
                  className={ts.secondaryBtn}
                  onClick={limparSelecao}
                >
                  Cancelar
                </button>
                <button type="submit" className={ts.primaryBtn}>
                  {pessoaSel.isTutor
                    ? "💾 Atualizar Dados do Tutor"
                    : "✓ Vincular como Tutor CCZ"}
                </button>
              </div>
            </form>
          )}
        </>
      )}

      {/* ══════════ ABA ANIMAIS ══════════════════════════════════════ */}
      {subTab === "ANIMAIS" && (
        <>
          <h3>➕ Cadastrar Novo Animal</h3>
          <form onSubmit={handleSubmitAnimal} className={s.formGrid}>
            <div className={`${s.fieldGroup} ${s.fullWidth}`}>
              <label htmlFor="animal-id">ID do Animal *</label>
              <input
                id="animal-id"
                type="text"
                value={animalForm.id}
                onChange={(e) =>
                  setAnimalForm({ ...animalForm, id: e.target.value })
                }
                placeholder="Ex.: 14/26"
                required
              />
            </div>
            <div className={`${s.fieldGroup} ${s.fullWidth}`}>
              <label>O animal possui responsável? *</label>
              <select
                value={animalForm.possui_responsavel}
                onChange={(e) =>
                  setAnimalForm({
                    ...animalForm,
                    possui_responsavel: e.target.value,
                    tutorCpf:
                      e.target.value === "Sim" ? animalForm.tutorCpf : "",
                  })
                }
                required
              >
                <option value="">-- Selecione --</option>
                {SIM_NAO.map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </div>
            {animalForm.possui_responsavel === "Sim" && (
              <div className={s.fieldGroup}>
                <label>Tutor / Responsável *</label>
                <select
                  value={animalForm.tutorCpf}
                  onChange={(e) =>
                    setAnimalForm({ ...animalForm, tutorCpf: e.target.value })
                  }
                  required
                >
                  <option value="">-- Selecione --</option>
                  {tutores.map((tutor) => (
                    <option key={tutor.cpf} value={tutor.cpf}>
                      {tutor.nomeCompleto}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className={s.fieldGroup}>
              <label>Nome do Animal</label>
              <input
                value={animalForm.nome}
                onChange={(e) =>
                  setAnimalForm({ ...animalForm, nome: e.target.value })
                }
                placeholder="Ex: Rex"
              />
            </div>
            <div className={s.fieldGroup}>
              <label>Foto do Animal</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleAnimalPhotoChange}
              />
              {animalForm.fotoUrl && (
                <img
                  src={animalForm.fotoUrl}
                  alt="Pré-visualização do animal"
                  style={{
                    width: 96,
                    height: 72,
                    objectFit: "cover",
                    borderRadius: 8,
                    marginTop: 8,
                  }}
                />
              )}
            </div>

            {/* Espécie */}
            <div className={s.fieldGroup}>
              <label>Espécie *</label>
              <select
                value={animalForm.especie}
                onChange={(e) =>
                  setAnimalForm({ ...animalForm, especie: e.target.value })
                }
                required
              >
                <option value="">-- Selecione --</option>
                {ESPECIES.map((e2) => (
                  <option key={e2} value={e2}>
                    {e2}
                  </option>
                ))}
              </select>
            </div>

            {/* Sexo */}
            <div className={s.fieldGroup}>
              <label>Sexo *</label>
              <select
                value={animalForm.sexo}
                onChange={(e) =>
                  setAnimalForm({ ...animalForm, sexo: e.target.value })
                }
                required
              >
                {SEXOS.map((sx) => (
                  <option key={sx.value} value={sx.value}>
                    {sx.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Porte */}
            <div className={s.fieldGroup}>
              <label>Porte *</label>
              <select
                value={animalForm.porte}
                onChange={(e) =>
                  setAnimalForm({ ...animalForm, porte: e.target.value })
                }
                required
              >
                {PORTES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            {/* Idade */}
            <div className={s.fieldGroup}>
              <label>Idade estimada</label>
              <input
                type="text"
                value={animalForm.idade}
                onChange={(e) =>
                  setAnimalForm({ ...animalForm, idade: e.target.value })
                }
                placeholder="Ex: 2 anos"
              />
            </div>

            {/* Castrado */}
            <div className={s.fieldGroup}>
              <label>Castrado(a)?</label>
              <select
                value={animalForm.castrado}
                onChange={(e) =>
                  setAnimalForm({ ...animalForm, castrado: e.target.value })
                }
              >
                {SIM_NAO.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </div>

            {/* Doença crónica */}
            <div className={s.fieldGroup}>
              <label>Doença Crônica?</label>
              <select
                value={animalForm.doenca_cronica}
                onChange={(e) =>
                  setAnimalForm({
                    ...animalForm,
                    doenca_cronica: e.target.value,
                  })
                }
              >
                {SIM_NAO.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </div>

            {/* Em tratamento */}
            <div className={s.fieldGroup}>
              <label>Em Tratamento?</label>
              <select
                value={animalForm.em_tratamento}
                onChange={(e) =>
                  setAnimalForm({
                    ...animalForm,
                    em_tratamento: e.target.value,
                  })
                }
              >
                {SIM_NAO.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </div>

            {/* Qual tratamento */}
            {animalForm.em_tratamento === "Sim" && (
              <div className={s.fieldGroup}>
                <label>Qual Tratamento?</label>
                <input
                  type="text"
                  value={animalForm.qual_tratamento}
                  onChange={(e) =>
                    setAnimalForm({
                      ...animalForm,
                      qual_tratamento: e.target.value,
                    })
                  }
                  placeholder="Descreva o tratamento"
                />
              </div>
            )}

            {/* Endereço de recolhimento */}
            <div className={`${s.fieldGroup} ${s.fullWidth}`}>
              <label>Endereço de Recolhimento / Localização</label>
              <input
                type="text"
                value={animalForm.endereco_recolhimento}
                onChange={(e) =>
                  setAnimalForm({
                    ...animalForm,
                    endereco_recolhimento: e.target.value,
                  })
                }
                placeholder="Ex: Rua das Flores, 100 — Centro"
              />
            </div>

            {/* Observações */}
            <div className={`${s.fieldGroup} ${s.fullWidth}`}>
              <label>Observações</label>
              <textarea
                rows={2}
                value={animalForm.observacoes}
                onChange={(e) =>
                  setAnimalForm({ ...animalForm, observacoes: e.target.value })
                }
                placeholder="Histórico de saúde, comportamento, etc."
              />
            </div>

            <div className={s.formActions}>
              <button type="submit" className={s.primaryBtn}>
                ➕ Salvar Animal
              </button>
            </div>
          </form>

          {/*
          <h4 className={s.sectionHeader}>Animais Cadastrados</h4>
          <div className={s.tableWrapper}>
            <table className={s.table}>
              <thead>
                <tr>
                  <th>Animal</th>
                  <th>Espécie</th>
                  <th>Sexo / Porte</th>
                  <th>Tutor</th>
                  <th>Castrado</th>
                  <th className={s.actionsColumn}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {animais.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      style={{
                        textAlign: "center",
                        color: "#94a3b8",
                        padding: "2rem",
                      }}
                    >
                      Nenhum animal cadastrado.
                    </td>
                  </tr>
                )}
                {animais.map((a) => (
                  <tr key={a.id}>
                    <td>
                      <strong>
                        {a.nome || (
                          <span style={{ color: "#94a3b8" }}>Sem nome</span>
                        )}
                      </strong>
                      {a.idade && (
                        <div style={{ fontSize: "0.78rem", color: "#64748b" }}>
                          {a.idade}
                        </div>
                      )}
                    </td>
                    <td>{a.especie}</td>
                    <td>
                      {[
                        { M: "Macho", F: "Fêmea", I: "—" }[a.sexo] || a.sexo,
                        a.porte,
                      ]
                        .filter(Boolean)
                        .join(" • ") || (
                        <span style={{ color: "#94a3b8" }}>—</span>
                      )}
                    </td>
                    <td>
                      {a.tutorNome || (
                        <span style={{ color: "#94a3b8" }}>—</span>
                      )}
                    </td>
                    <td>
                      <span
                        style={{
                          background:
                            a.castrado === "Sim" ? "#f0fdf4" : "#f8fafc",
                          color: a.castrado === "Sim" ? "#15803d" : "#64748b",
                          borderRadius: "4px",
                          padding: "0.1rem 0.5rem",
                          fontSize: "0.75rem",
                          fontWeight: 600,
                        }}
                      >
                        {a.castrado || "Não"}
                      </span>
                    </td>
                    <td className={s.actionsCell}>
                      <BotaoEditar onClick={() => handleEditAnimal(a)} />
                      <button
                        className={s.deleteBtn}
                        onClick={() =>
                          setDeleteConfig({
                            nome: a.nome || `${a.especie} de ${a.tutorNome}`,
                            detalhe: `Tutor: ${a.tutorNome} • ${a.especie}`,
                            onConfirm: async () => {
                              const res = await deleteAnimal(a.id);
                              if (res.success) {
                                setMessageConfig({
                                  type: "success",
                                  title: "Animal removido",
                                  message:
                                    "O cadastro do animal foi excluído com sucesso.",
                                });
                                reloadData();
                              } else
                                setMessageConfig({
                                  type: "error",
                                  title: "Não foi possível excluir",
                                  message: res.error,
                                });
                            },
                          })
                        }
                      >
                        🗑️ Excluir
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          */}
        </>
      )}
    </div>
  );
}
