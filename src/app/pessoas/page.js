"use client";

import { useState, useEffect, useRef } from "react";
import styles from "./Pessoas.module.css";
import { buscarCep } from "@/lib/viacep";
import {
  listarPessoas,
  listarUbs,
  criarPessoa,
  atualizarPessoa,
  excluirPessoa,
} from "./actions";

// ── Máscaras ────────────────────────────────────────────────────────────
const maskCpf = (v) =>
  (v || "")
    .replace(/\D/g, "")
    .slice(0, 11)
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");

const maskTelefone = (v) => {
  const d = (v || "").replace(/\D/g, "").slice(0, 11);
  if (d.length <= 10) {
    return d.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{4})(\d{1,4})$/, "$1-$2");
  }
  return d.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d{1,4})$/, "$1-$2");
};

const maskCep = (v) =>
  (v || "").replace(/\D/g, "").slice(0, 8).replace(/(\d{5})(\d{1,3})$/, "$1-$2");

const soDigitos = (v) => (v ? v.replace(/\D/g, "") : "");

const FORM_VAZIO = {
  cpf: "",
  nomeCompleto: "",
  sexo: "Masculino",
  dataNascimento: "",
  nomeMae: "",
  telefone: "",
  cns: "",
  ubsReferenciaId: "",
  cep: "",
  logradouro: "",
  numero: "",
  complemento: "",
  bairro: "",
  cidade: "Muriaé",
  uf: "MG",
};

// Preenche o formulário a partir de uma pessoa vinda do banco.
const pessoaParaForm = (p) => ({
  ...FORM_VAZIO,
  ...p,
  cpf: maskCpf(p.cpf),
  telefone: maskTelefone(p.telefone),
  cep: maskCep(p.cep),
  ubsReferenciaId: p.ubsReferenciaId ? String(p.ubsReferenciaId) : "",
});

export default function PessoasPage() {
  const [ubsList, setUbsList] = useState([]);
  const [erro, setErro] = useState("");

  const [form, setForm] = useState(FORM_VAZIO);
  // Modos: "leitura" (campos travados), "novo" (cadastro), "edicao" (editar).
  const [modo, setModo] = useState("leitura");
  const [salvando, setSalvando] = useState(false);

  // Busca (estilo Novo Pedido: campo select-like + dropdown em tabela).
  const [termo, setTermo] = useState("");
  const [pessoas, setPessoas] = useState([]);
  const [buscando, setBuscando] = useState(false);
  const [dropAberto, setDropAberto] = useState(false);
  const dropdownRef = useRef(null);

  const [cepLoading, setCepLoading] = useState(false);
  const [cepErro, setCepErro] = useState("");
  const [confirmarExclusao, setConfirmarExclusao] = useState(false);

  const editavel = modo === "novo" || modo === "edicao";

  useEffect(() => {
    let ativo = true;
    (async () => {
      const [resUbs, resPessoas] = await Promise.all([listarUbs(), listarPessoas("")]);
      if (!ativo) return;
      if (resUbs.success) setUbsList(resUbs.data);
      if (resPessoas.success) setPessoas(resPessoas.data);
    })();
    return () => {
      ativo = false;
    };
  }, []);

  // Fecha o dropdown ao clicar fora.
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropAberto(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ── Busca ─────────────────────────────────────────────────────────────────
  const handleBuscar = async (valor) => {
    setTermo(valor);
    if (!dropAberto) setDropAberto(true);
    if (valor.trim().length >= 2) {
      setBuscando(true);
      const res = await listarPessoas(valor.trim());
      setPessoas(res.success ? res.data : []);
      setBuscando(false);
    }
  };

  const pessoasFiltradas = pessoas.filter((p) => {
    const t = termo.toLowerCase().trim();
    if (!t) return true;
    const nome = (p.nomeCompleto || "").toLowerCase();
    const mae = (p.nomeMae || "").toLowerCase();
    const cpfLimpo = (p.cpf || "").replace(/\D/g, "");
    const buscaLimpa = t.replace(/\D/g, "");
    return (
      nome.includes(t) ||
      mae.includes(t) ||
      (buscaLimpa && cpfLimpo.includes(buscaLimpa))
    );
  });

  const selecionarPessoa = (p) => {
    setForm(pessoaParaForm(p));
    setModo("leitura");
    setTermo(p.nomeCompleto || "");
    setDropAberto(false);
    setCepErro("");
  };

  // ── ViaCEP ──────────────────────────────────────────────────────────────
  const consultarCep = async (valor) => {
    const digitos = soDigitos(valor);
    if (digitos.length !== 8) return;
    setCepErro("");
    setCepLoading(true);
    try {
      const res = await buscarCep(digitos);
      if (res.success) {
        setForm((prev) => ({
          ...prev,
          logradouro: res.data.logradouro || prev.logradouro,
          bairro: res.data.bairro || prev.bairro,
          cidade: res.data.cidade || prev.cidade,
          uf: res.data.uf || prev.uf,
          complemento: res.data.complemento || prev.complemento,
        }));
      } else {
        setCepErro(res.error || "CEP não encontrado.");
      }
    } finally {
      setCepLoading(false);
    }
  };

  // ── Ações ─────────────────────────────────────────────────────────────────
  const novoCadastro = () => {
    setForm(FORM_VAZIO);
    setModo("novo");
    setTermo("");
    setDropAberto(false);
    setCepErro("");
  };

  const habilitarEdicao = () => {
    setModo("edicao");
    setCepErro("");
  };

  const cancelar = () => {
    setForm(FORM_VAZIO);
    setModo("leitura");
    setTermo("");
    setDropAberto(false);
    setCepErro("");
    setConfirmarExclusao(false);
  };

  const salvar = async (e) => {
    e.preventDefault();
    setSalvando(true);
    const payload = {
      ...form,
      cpf: soDigitos(form.cpf),
      telefone: soDigitos(form.telefone),
      cep: soDigitos(form.cep),
      cns: soDigitos(form.cns),
      ubsReferenciaId: form.ubsReferenciaId || null,
    };

    const res =
      modo === "edicao"
        ? await atualizarPessoa(payload.cpf, payload)
        : await criarPessoa(payload);

    setSalvando(false);

    if (res.success) {
      const busca = await listarPessoas(payload.cpf);
      const salva = busca.success
        ? busca.data.find((x) => soDigitos(x.cpf) === payload.cpf)
        : null;
      if (salva) selecionarPessoa(salva);
      else cancelar();
    } else {
      alert(res.error || "Não foi possível salvar.");
    }
  };

  const confirmarRemover = async () => {
    setSalvando(true);
    const res = await excluirPessoa(soDigitos(form.cpf));
    setSalvando(false);
    setConfirmarExclusao(false);
    if (res.success) cancelar();
    else alert(res.error || "Não foi possível excluir.");
  };

  const pessoaSelecionada = Boolean(soDigitos(form.cpf));
  const tituloForm =
    modo === "novo" ? "Nova pessoa" : modo === "edicao" ? "Editar pessoa" : "Dados da pessoa";

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Cadastro de Pessoas</h1>
          <p className={styles.subtitle}>
            Base central compartilhada entre Regulação, Farmácia Judicial, Junta e CCZ.
          </p>
        </div>
        <button className={styles.btnPrimary} onClick={novoCadastro}>
          + Nova pessoa
        </button>
      </header>

      {erro && <div className={styles.alertErro}>{erro}</div>}

      {/* BUSCA (estilo Novo Pedido: select-like + dropdown em tabela) */}
      <div className={`${styles.card} ${styles.searchCard}`}>
        <label className={styles.searchLabel}>Buscar pessoa no banco</label>
        <div className={styles.searchSelectWrapper} ref={dropdownRef}>
          <input
            type="text"
            className={styles.selectLikeInput}
            placeholder="Selecionar ou digitar nome/CPF..."
            value={termo}
            onChange={(e) => handleBuscar(e.target.value)}
            onFocus={() => setDropAberto(true)}
          />
          <span className={styles.arrowIcon} onClick={() => setDropAberto(!dropAberto)}>
            {dropAberto ? "▲" : "▼"}
          </span>

          {dropAberto && (
            <div className={styles.tableDropdownMenu}>
              <div className={styles.tableContainerScroll}>
                <table className={styles.patientTableDropdown}>
                  <thead>
                    <tr>
                      <th>CPF</th>
                      <th>Usuário</th>
                      <th>Nome da mãe</th>
                      <th>Data nasc.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pessoasFiltradas.length > 0 ? (
                      pessoasFiltradas.map((p) => (
                        <tr
                          key={p.cpf}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            selecionarPessoa(p);
                          }}
                          className={soDigitos(form.cpf) === soDigitos(p.cpf) ? styles.selectedRow : ""}
                        >
                          <td>{maskCpf(p.cpf)}</td>
                          <td className={styles.boldName}>{p.nomeCompleto}</td>
                          <td>{p.nomeMae || "Não informada"}</td>
                          <td>
                            {p.dataNascimento
                              ? p.dataNascimento.split("-").reverse().join("/")
                              : "-"}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="4" className={styles.noDataTd}>
                          {buscando ? "Buscando pessoas..." : "Nenhuma pessoa encontrada."}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* FORMULÁRIO (sempre visível) */}
      <form onSubmit={salvar} className={`${styles.card} ${styles.formCard}`}>
        <div className={styles.cardHeaderRow}>
          <h2 className={styles.cardHeaderTitle}>{tituloForm}</h2>
          {modo === "leitura" && pessoaSelecionada && (
            <button type="button" className={styles.btnSecondary} onClick={habilitarEdicao}>
              Editar
            </button>
          )}
        </div>

        <div className={styles.formSectionTitle}>Dados pessoais</div>
        <div className={styles.grid}>
          <div className={styles.field}>
            <label>CPF *</label>
            <input
              type="text"
              value={form.cpf}
              onChange={(e) => setForm({ ...form, cpf: maskCpf(e.target.value) })}
              placeholder="000.000.000-00"
              disabled={modo !== "novo"}
              required
            />
          </div>
          <div className={`${styles.field} ${styles.colWide}`}>
            <label>Nome completo *</label>
            <input
              type="text"
              value={form.nomeCompleto}
              onChange={(e) => setForm({ ...form, nomeCompleto: e.target.value })}
              disabled={!editavel}
              required
            />
          </div>
          <div className={styles.field}>
            <label>Sexo *</label>
            <select
              value={form.sexo}
              onChange={(e) => setForm({ ...form, sexo: e.target.value })}
              disabled={!editavel}
              required
            >
              <option value="Masculino">Masculino</option>
              <option value="Feminino">Feminino</option>
            </select>
          </div>
          <div className={styles.field}>
            <label>Data de nascimento *</label>
            <input
              type="date"
              value={form.dataNascimento}
              onChange={(e) => setForm({ ...form, dataNascimento: e.target.value })}
              disabled={!editavel}
              required
            />
          </div>
          <div className={`${styles.field} ${styles.colWide}`}>
            <label>Nome da mãe *</label>
            <input
              type="text"
              value={form.nomeMae}
              onChange={(e) => setForm({ ...form, nomeMae: e.target.value })}
              disabled={!editavel}
              required
            />
          </div>
          <div className={styles.field}>
            <label>Telefone / WhatsApp</label>
            <input
              type="text"
              value={form.telefone}
              onChange={(e) => setForm({ ...form, telefone: maskTelefone(e.target.value) })}
              placeholder="(00) 00000-0000"
              disabled={!editavel}
            />
          </div>
          <div className={styles.field}>
            <label>CNS (Cartão SUS)</label>
            <input
              type="text"
              value={form.cns}
              onChange={(e) => setForm({ ...form, cns: e.target.value.replace(/\D/g, "").slice(0, 15) })}
              placeholder="Opcional"
              disabled={!editavel}
            />
          </div>
          <div className={styles.field}>
            <label>UBS de referência</label>
            <select
              value={form.ubsReferenciaId}
              onChange={(e) => setForm({ ...form, ubsReferenciaId: e.target.value })}
              disabled={!editavel}
            >
              <option value="">-- Nenhuma --</option>
              {ubsList.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nome}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className={styles.formSectionTitle}>Endereço</div>
        <div className={styles.grid}>
          <div className={styles.field}>
            <label>CEP</label>
            <input
              type="text"
              value={form.cep}
              onChange={(e) => {
                const masked = maskCep(e.target.value);
                setForm({ ...form, cep: masked });
                setCepErro("");
                if (soDigitos(masked).length === 8) consultarCep(masked);
              }}
              onBlur={(e) => consultarCep(e.target.value)}
              placeholder="00000-000"
              disabled={!editavel}
            />
            {cepLoading && <small className={styles.hint}>Buscando endereço...</small>}
            {cepErro && <small className={styles.hintErro}>{cepErro}</small>}
          </div>
          <div className={`${styles.field} ${styles.colWide}`}>
            <label>Logradouro / Rua</label>
            <input
              type="text"
              value={form.logradouro}
              onChange={(e) => setForm({ ...form, logradouro: e.target.value })}
              disabled={!editavel}
            />
          </div>
          <div className={styles.field}>
            <label>Número</label>
            <input
              type="text"
              value={form.numero}
              onChange={(e) => setForm({ ...form, numero: e.target.value })}
              disabled={!editavel}
            />
          </div>
          <div className={styles.field}>
            <label>Complemento</label>
            <input
              type="text"
              value={form.complemento}
              onChange={(e) => setForm({ ...form, complemento: e.target.value })}
              disabled={!editavel}
            />
          </div>
          <div className={styles.field}>
            <label>Bairro</label>
            <input
              type="text"
              value={form.bairro}
              onChange={(e) => setForm({ ...form, bairro: e.target.value })}
              disabled={!editavel}
            />
          </div>
          <div className={styles.field}>
            <label>Cidade</label>
            <input
              type="text"
              value={form.cidade}
              onChange={(e) => setForm({ ...form, cidade: e.target.value })}
              disabled={!editavel}
            />
          </div>
          <div className={styles.field}>
            <label>UF</label>
            <input
              type="text"
              value={form.uf}
              maxLength={2}
              onChange={(e) => setForm({ ...form, uf: e.target.value.toUpperCase() })}
              disabled={!editavel}
            />
          </div>
        </div>

        <div className={styles.formActions}>
          {editavel && (
            <button type="button" className={styles.btnGhost} onClick={cancelar} disabled={salvando}>
              Cancelar
            </button>
          )}
          {modo === "edicao" && (
            <button
              type="button"
              className={styles.btnDanger}
              onClick={() => setConfirmarExclusao(true)}
              disabled={salvando}
            >
              Excluir
            </button>
          )}
          {editavel && (
            <button type="submit" className={styles.btnPrimary} disabled={salvando}>
              {salvando ? "Salvando..." : modo === "edicao" ? "Atualizar" : "Salvar"}
            </button>
          )}
        </div>
      </form>

      {/* POPUP DE CONFIRMAÇÃO DE EXCLUSÃO */}
      {confirmarExclusao && (
        <div className={styles.modalOverlay} onClick={() => setConfirmarExclusao(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>Excluir pessoa</h3>
            <p className={styles.modalText}>
              Tem certeza que deseja excluir <strong>{form.nomeCompleto}</strong>?
              Esta ação não pode ser desfeita.
            </p>
            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.btnGhost}
                onClick={() => setConfirmarExclusao(false)}
                disabled={salvando}
              >
                Cancelar
              </button>
              <button
                type="button"
                className={styles.btnDanger}
                onClick={confirmarRemover}
                disabled={salvando}
              >
                {salvando ? "Excluindo..." : "Sim, excluir"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
