"use client";

import { useState, useEffect } from "react";
import styles from "./CadastroAnimal.module.css";
import { useConfirm, useNotify } from "@/components/ConfirmDialog";
import { listarTutores, salvarAnimal } from "./actions";

const MAX_FOTO_BYTES = 5 * 1024 * 1024; // ~5MB

const FORM_VAZIO = {
  fotoUrl: "",
  id: "",
  nome: "",
  especie: "",
  sexo: "",
  porte: "",
  idade: "",
  possuiResponsavel: "Não",
  pessoaCpf: "",
  castrado: "Não",
  doencaCronica: "Não",
  qualDoenca: "",
  apetiteNormal: "Sim",
  sintomasVomitoDiarreia: "Não",
  emTratamento: "Não",
  qualTratamento: "",
  observacoes: "",
};

export default function CadastroAnimal() {
  const confirm = useConfirm();
  const notify = useNotify();

  const [form, setForm] = useState(FORM_VAZIO);
  const [tutores, setTutores] = useState([]);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [fotoErro, setFotoErro] = useState("");

  // Carrega os tutores para o seletor "Possui tutor? = Sim".
  useEffect(() => {
    let ativo = true;
    (async () => {
      const res = await listarTutores();
      if (ativo && res.success) setTutores(res.data);
    })();
    return () => {
      ativo = false;
    };
  }, []);

  const atualizar = (campo, valor) => setForm((prev) => ({ ...prev, [campo]: valor }));

  // ── Foto: lê como data URL e gera preview ─────────────────────────────────
  const handleFoto = (e) => {
    const file = e.target.files?.[0];
    setFotoErro("");
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setFotoErro("Selecione um arquivo de imagem válido.");
      return;
    }
    if (file.size > MAX_FOTO_BYTES) {
      setFotoErro("A imagem deve ter no máximo 5MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => atualizar("fotoUrl", reader.result);
    reader.readAsDataURL(file);
  };

  // ── Dropdowns com campo condicional ao lado ───────────────────────────────
  const handlePossuiResponsavel = (valor) => {
    setForm((prev) => ({
      ...prev,
      possuiResponsavel: valor,
      // Limpa o tutor selecionado quando passa para "Não".
      pessoaCpf: valor === "Sim" ? prev.pessoaCpf : "",
    }));
  };

  const handleDoencaCronica = (valor) => {
    setForm((prev) => ({
      ...prev,
      doencaCronica: valor,
      qualDoenca: valor === "Sim" ? prev.qualDoenca : "",
    }));
  };

  const handleEmTratamento = (valor) => {
    setForm((prev) => ({
      ...prev,
      emTratamento: valor,
      qualTratamento: valor === "Sim" ? prev.qualTratamento : "",
    }));
  };

  const limpar = () => {
    setForm(FORM_VAZIO);
    setErro("");
    setFotoErro("");
  };

  const salvar = async (e) => {
    e.preventDefault();
    const ok = await confirm({
      title: "Cadastrar animal",
      message: "Deseja confirmar o cadastro deste animal?",
      confirmText: "Cadastrar",
    });
    if (!ok) return;

    setSalvando(true);
    const res = await salvarAnimal(form);
    setSalvando(false);

    if (res.success) {
      setErro("");
      await notify({ tipo: "sucesso", title: "Pronto", message: "Animal salvo com sucesso!" });
      limpar();
    } else {
      setErro(res.error || "Não foi possível salvar o animal.");
    }
  };

  const doencaDesabilitada = form.doencaCronica !== "Sim";
  const tratamentoDesabilitado = form.emTratamento !== "Sim";
  const tutorDesabilitado = form.possuiResponsavel !== "Sim";

  return (
    <div className={styles.container}>
      {erro && <div className={styles.alertErro}>{erro}</div>}

      <form onSubmit={salvar} className={`${styles.card} ${styles.formCard}`}>
        <div className={styles.cardHeaderRow}>
          <h2 className={styles.cardHeaderTitle}>Cadastro de animal</h2>
          <button type="button" className={styles.btnAdicionar} onClick={limpar}>
            Limpar formulário
          </button>
        </div>

        <div className={styles.camposBloco}>
          <div className={styles.formSectionTitle}>Identificação</div>
          <div className={styles.grid}>
            {/* Foto do animal */}
            <div className={`${styles.field} ${styles.colFull}`}>
              <label>Foto do animal</label>
              <div className={styles.fotoBloco}>
                {form.fotoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={form.fotoUrl} alt="Pré-visualização do animal" className={styles.fotoPreview} />
                ) : (
                  <div className={styles.fotoPlaceholder}>Sem foto</div>
                )}
                <div className={styles.fotoControles}>
                  <input type="file" accept="image/*" onChange={handleFoto} />
                  {form.fotoUrl && (
                    <button
                      type="button"
                      className={styles.btnGhost}
                      onClick={() => atualizar("fotoUrl", "")}
                    >
                      Remover foto
                    </button>
                  )}
                  {fotoErro && <small className={styles.hintErro}>{fotoErro}</small>}
                </div>
              </div>
            </div>

            {/* Id do animal (campo pequeno) */}
            <div className={styles.field}>
              <label>Id do animal</label>
              <input
                type="text"
                className={styles.inputSmall}
                value={form.id}
                onChange={(e) => atualizar("id", e.target.value)}
                placeholder="Gerado se vazio"
              />
            </div>

            {/* Nome do animal (textarea) */}
            <div className={`${styles.field} ${styles.colWide}`}>
              <label>Nome do Animal</label>
              <textarea
                rows={2}
                value={form.nome}
                onChange={(e) => atualizar("nome", e.target.value)}
              />
            </div>

            {/* Espécie */}
            <div className={styles.field}>
              <label>Espécie *</label>
              <select
                value={form.especie}
                onChange={(e) => atualizar("especie", e.target.value)}
                required
              >
                <option value="">-- Selecione --</option>
                <option value="Canina">Canina</option>
                <option value="Felina">Felina</option>
                <option value="Outro">Outro</option>
              </select>
            </div>

            {/* Sexo (exibe Macho/Fêmea; a action persiste M/F) */}
            <div className={styles.field}>
              <label>Sexo *</label>
              <select
                value={form.sexo}
                onChange={(e) => atualizar("sexo", e.target.value)}
                required
              >
                <option value="">-- Selecione --</option>
                <option value="Macho">Macho</option>
                <option value="Fêmea">Fêmea</option>
              </select>
            </div>

            {/* Porte */}
            <div className={styles.field}>
              <label>Porte *</label>
              <select
                value={form.porte}
                onChange={(e) => atualizar("porte", e.target.value)}
                required
              >
                <option value="">-- Selecione --</option>
                <option value="Grande">Grande</option>
                <option value="Médio">Médio</option>
                <option value="Pequeno">Pequeno</option>
              </select>
            </div>

            {/* Idade (textarea livre) */}
            <div className={`${styles.field} ${styles.colWide}`}>
              <label>Idade</label>
              <textarea
                rows={1}
                value={form.idade}
                onChange={(e) => atualizar("idade", e.target.value)}
              />
            </div>
          </div>

          <div className={styles.formSectionTitle}>Dados clínicos</div>
          <div className={styles.grid}>
            {/* Possui tutor? + seletor de tutor ao lado */}
            <div className={`${styles.field} ${styles.colWide}`}>
              <label>Possui tutor?</label>
              <div className={styles.rowComposta}>
                <div className={styles.colControle}>
                  <select
                    value={form.possuiResponsavel}
                    onChange={(e) => handlePossuiResponsavel(e.target.value)}
                  >
                    <option value="Não">Não</option>
                    <option value="Sim">Sim</option>
                  </select>
                </div>
                <div className={styles.colAnexo}>
                  <select
                    value={form.pessoaCpf}
                    onChange={(e) => atualizar("pessoaCpf", e.target.value)}
                    disabled={tutorDesabilitado}
                  >
                    <option value="">
                      {tutorDesabilitado ? "—" : "-- Selecione o tutor --"}
                    </option>
                    {tutores.map((t) => (
                      <option key={t.pessoaCpf} value={t.pessoaCpf}>
                        {t.nome}
                        {t.telefone ? ` — ${t.telefone}` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Castrado */}
            <div className={styles.field}>
              <label>Castrado</label>
              <select
                value={form.castrado}
                onChange={(e) => atualizar("castrado", e.target.value)}
              >
                <option value="Não">Não</option>
                <option value="Sim">Sim</option>
              </select>
            </div>

            {/* Doença Crônica? + campo "qual doença" ao lado */}
            <div className={`${styles.field} ${styles.colWide}`}>
              <label>Doença Crônica?</label>
              <div className={styles.rowComposta}>
                <div className={styles.colControle}>
                  <select
                    value={form.doencaCronica}
                    onChange={(e) => handleDoencaCronica(e.target.value)}
                  >
                    <option value="Não">Não</option>
                    <option value="Sim">Sim</option>
                  </select>
                </div>
                <div className={styles.colAnexo}>
                  <input
                    type="text"
                    value={form.qualDoenca}
                    onChange={(e) => atualizar("qualDoenca", e.target.value)}
                    placeholder={doencaDesabilitada ? "" : "Qual doença?"}
                    disabled={doencaDesabilitada}
                  />
                </div>
              </div>
            </div>

            {/* Apetite */}
            <div className={styles.field}>
              <label>Apetite</label>
              <select
                value={form.apetiteNormal}
                onChange={(e) => atualizar("apetiteNormal", e.target.value)}
              >
                <option value="Sim">Sim</option>
                <option value="Não">Não</option>
              </select>
            </div>

            {/* Vômito / Diarreia */}
            <div className={styles.field}>
              <label>Vômito / Diarreia</label>
              <select
                value={form.sintomasVomitoDiarreia}
                onChange={(e) => atualizar("sintomasVomitoDiarreia", e.target.value)}
              >
                <option value="Não">Não</option>
                <option value="Sim">Sim</option>
              </select>
            </div>

            {/* Em tratamento? + textarea "qual tratamento" ao lado */}
            <div className={`${styles.field} ${styles.colFull}`}>
              <label>Em tratamento?</label>
              <div className={styles.rowComposta}>
                <div className={styles.colControle}>
                  <select
                    value={form.emTratamento}
                    onChange={(e) => handleEmTratamento(e.target.value)}
                  >
                    <option value="Não">Não</option>
                    <option value="Sim">Sim</option>
                  </select>
                </div>
                <div className={styles.colAnexo}>
                  <textarea
                    rows={2}
                    value={form.qualTratamento}
                    onChange={(e) => atualizar("qualTratamento", e.target.value)}
                    placeholder={tratamentoDesabilitado ? "" : "Descreva o tratamento..."}
                    disabled={tratamentoDesabilitado}
                  />
                </div>
              </div>
            </div>

            {/* Observação */}
            <div className={`${styles.field} ${styles.colFull}`}>
              <label>Observação</label>
              <textarea
                rows={3}
                value={form.observacoes}
                onChange={(e) => atualizar("observacoes", e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className={styles.formActions}>
          <button type="button" className={styles.btnGhost} onClick={limpar} disabled={salvando}>
            Cancelar
          </button>
          <button type="submit" className={styles.btnPrimary} disabled={salvando}>
            {salvando ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </form>
    </div>
  );
}
