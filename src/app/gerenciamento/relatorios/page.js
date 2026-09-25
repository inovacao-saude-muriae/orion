// AINDA NAO ESTÁ PRONTO !!!

"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "./RelatoriosGerais.module.css";

const nomesPerfil = {
  GESTOR: "Gestor Geral",
  REGULACAO_ADMIN: "Administração da Regulação",
  REGULACAO_COMUM: "Operador da Regulação",
  FARMACIA_ADMIN: "Administração da Farmácia",
  PROCESSO_ADMIN: "Administração de Processos",
  JUNTA_ADMIN: "Administração da Junta",
  JUNTA_CAEE: "Operador CAEE",
  JUNTA_EDUCACAO: "Operador Educação",
  JUNTA_SAUDE: "Operador Saúde",
  JUNTA_ASSISTENCIA: "Operador Assistência Social",
  CCZ_ADMIN: "Administração do CCZ",
};

export default function RelatoriosGeraisPage() {
  const [usuarios, setUsuarios] = useState([]);
  const [selecionado, setSelecionado] = useState(null);
  const [filtro, setFiltro] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("TODOS");
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  useEffect(() => {
    async function carregarRelatorio() {
      try {
        const resposta = await fetch("/api/gerenciamento/relatorios", {
          cache: "no-store",
        });
        const dados = await resposta.json();
        if (!resposta.ok)
          throw new Error(
            dados.error || "Não foi possível carregar o relatório.",
          );
        setUsuarios(dados.usuarios || []);
      } catch (error) {
        setErro(error.message);
      } finally {
        setCarregando(false);
      }
    }
    carregarRelatorio();
  }, []);

  const usuariosFiltrados = useMemo(() => {
    const termo = filtro.toLowerCase().trim();
    return usuarios.filter((usuario) => {
      const correspondeTexto = [
        usuario.nome,
        usuario.cpf,
        usuario.cargo,
        nomesPerfil[usuario.role],
      ].some((valor) =>
        String(valor || "")
          .toLowerCase()
          .includes(termo),
      );
      const correspondeStatus =
        filtroStatus === "TODOS" ||
        (filtroStatus === "ATIVOS"
          ? usuario.possuiAcesso && usuario.ativo
          : usuario.possuiAcesso && !usuario.ativo);
      return correspondeTexto && correspondeStatus;
    });
  }, [filtro, filtroStatus, usuarios]);

  const itensPorPagina = 8;
  const totalPaginas = Math.max(
    1,
    Math.ceil(usuariosFiltrados.length / itensPorPagina),
  );
  const paginaVisivel = Math.min(paginaAtual, totalPaginas);
  const inicioPagina = (paginaVisivel - 1) * itensPorPagina;
  const usuariosDaPagina = usuariosFiltrados.slice(
    inicioPagina,
    inicioPagina + itensPorPagina,
  );

  if (carregando) {
    return (
      <main className={styles.container}>
        <p className={styles.feedback}>Carregando relatório geral...</p>
      </main>
    );
  }

  if (erro) {
    return (
      <main className={styles.container}>
        <div className={styles.error}>{erro}</div>
      </main>
    );
  }

  return (
    <main className={styles.container}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>GERENCIAMENTO</p>
          <h1>Relatórios Gerais</h1>
          <p className={styles.subtitle}>
            Acompanhe tudo que cada pessoa possui registrado nos sistemas.
          </p>
        </div>
        <div className={styles.headerMetric}>
          <strong>{usuarios.length}</strong>
          <span>pessoas cadastradas</span>
        </div>
      </header>

      <section className={styles.notice}>
        <b>Visão geral da pessoa</b>
        <span>
          Consulte pedidos, atendimentos, tratamentos, dispensações e registros
          do CCZ vinculados ao CPF.
        </span>
      </section>

      <section className={styles.toolbar}>
        <input
          type="search"
          placeholder="Buscar por nome, CPF ou perfil"
          value={filtro}
          onChange={(event) => {
            setFiltro(event.target.value);
            setPaginaAtual(1);
          }}
        />
        <select
          value={filtroStatus}
          onChange={(event) => {
            setFiltroStatus(event.target.value);
            setPaginaAtual(1);
          }}
        >
          <option value="TODOS">Todos os status</option>
          <option value="ATIVOS">Ativos</option>
          <option value="INATIVOS">Inativos</option>
        </select>
      </section>

      <div className={styles.contentGrid}>
        <section className={styles.panel}>
          <div className={styles.panelHeading}>
            <div>
              <h2>Pessoas</h2>
              <span>
                {usuariosFiltrados.length === 0
                  ? "0 resultados"
                  : `${inicioPagina + 1}-${Math.min(inicioPagina + itensPorPagina, usuariosFiltrados.length)} de ${usuariosFiltrados.length}`}
              </span>
            </div>
          </div>
          <div className={styles.userList}>
            {usuariosDaPagina.map((usuario) => (
              <button
                type="button"
                key={usuario.cpf}
                className={`${styles.userRow} ${selecionado?.cpf === usuario.cpf ? styles.selected : ""}`}
                onClick={() => setSelecionado(usuario)}
              >
                <span className={styles.avatar}>
                  {usuario.nome?.charAt(0)?.toUpperCase() || "?"}
                </span>
                <span className={styles.userText}>
                  <strong>{usuario.nome}</strong>
                  <small>
                    {usuario.totalAtividades || 0} atividade(s) ·{" "}
                    {usuario.modulos?.length || 0} sistema(s)
                  </small>
                </span>
                <span
                  className={`${styles.status} ${usuario.ativo ? styles.active : styles.inactive}`}
                >
                  {usuario.possuiAcesso
                    ? usuario.ativo
                      ? "Ativo"
                      : "Inativo"
                    : "Sem acesso"}
                </span>
              </button>
            ))}
            {usuariosFiltrados.length === 0 && (
              <p className={styles.empty}>Nenhuma pessoa encontrada.</p>
            )}
          </div>
          {usuariosFiltrados.length > 0 && (
            <div className={styles.pagination}>
              <button
                type="button"
                className={styles.pageButton}
                onClick={() => setPaginaAtual((pagina) => pagina - 1)}
                disabled={paginaVisivel === 1}
                aria-label="Página anterior"
              >
                Anterior
              </button>
              <span className={styles.pageNumber}>
                Página {paginaVisivel} de {totalPaginas}
              </span>
              <button
                type="button"
                className={styles.pageButton}
                onClick={() => setPaginaAtual((pagina) => pagina + 1)}
                disabled={paginaVisivel === totalPaginas}
                aria-label="Próxima página"
              >
                Próxima
              </button>
            </div>
          )}
        </section>

        <section className={styles.panel}>
          {!selecionado ? (
            <div className={styles.emptyDetail}>
              <span className={styles.detailIcon}>i</span>
              <h2>Selecione uma pessoa</h2>
              <p>
                Escolha um cadastro ao lado para ver o resumo de cada sistema.
              </p>
            </div>
          ) : (
            <>
              <div className={styles.detailHeader}>
                <span className={styles.largeAvatar}>
                  {selecionado.nome?.charAt(0)?.toUpperCase() || "?"}
                </span>
                <div>
                  <h2>{selecionado.nome}</h2>
                  <p>
                    {selecionado.cargo ||
                      nomesPerfil[selecionado.role] ||
                      "Sem usuário de acesso"}
                  </p>
                  <small>CPF: {selecionado.cpf}</small>
                </div>
              </div>
              <div className={styles.stats}>
                <div>
                  <strong>{selecionado.totalAtividades || 0}</strong>
                  <span>atividades registradas</span>
                </div>
                <div>
                  <strong>{selecionado.modulos?.length || 0}</strong>
                  <span>sistemas relacionados</span>
                </div>
                <div>
                  <strong>
                    {selecionado.possuiAcesso
                      ? selecionado.ativo
                        ? "Ativo"
                        : "Inativo"
                      : "Sem acesso"}
                  </strong>
                  <span>situação atual</span>
                </div>
              </div>
              <div className={styles.systemSummary}>
                <h3>Resumo por sistema</h3>
                <div className={styles.systemCards}>
                  <div className={styles.systemCard}>
                    <strong>Regulação</strong>
                    <span>
                      {selecionado.resumo?.regulacao?.total || 0} exame(s)
                      solicitado(s)
                    </span>
                    <small>
                      {selecionado.resumo?.regulacao?.aguardando || 0}{" "}
                      aguardando ·{" "}
                      {selecionado.resumo?.regulacao?.liberados || 0}{" "}
                      liberado(s)
                    </small>
                  </div>
                  <div className={styles.systemCard}>
                    <strong>Farmácia Judicial</strong>
                    <span>
                      {selecionado.resumo?.farmacia?.medicamentos?.length || 0}{" "}
                      medicamento(s) ativo(s)
                    </span>
                    <small>
                      {selecionado.resumo?.farmacia
                        ? `${selecionado.resumo.farmacia.dispensacoes} dispensação(ões) · Pasta ${selecionado.resumo.farmacia.pasta}`
                        : "Sem cadastro judicial"}
                    </small>
                    {selecionado.resumo?.farmacia?.medicamentos?.length > 0 && (
                      <small>
                        {selecionado.resumo.farmacia.medicamentos.join(" · ")}
                      </small>
                    )}
                  </div>
                  <div className={styles.systemCard}>
                    <strong>Junta Reguladora</strong>
                    <span>
                      {selecionado.resumo?.junta?.servicos?.length || 0}{" "}
                      serviço(s) vinculado(s)
                    </span>
                    <small>
                      {selecionado.resumo?.junta?.atendimentos || 0}{" "}
                      atendimento(s) registrado(s) ·{" "}
                    </small>
                  </div>
                  <div className={styles.systemCard}>
                    <strong>CCZ</strong>
                    <span>
                      {selecionado.resumo?.ccz?.animais?.length || 0} animal(is)
                      Vinculado(s)
                    </span>
                    <small>
                      {selecionado.resumo?.ccz
                        ? `${selecionado.resumo.ccz.procedimentos} procedimento(s) · ${selecionado.resumo.ccz.zoonoses} zoonose(s)`
                        : "Sem registros no CCZ"}
                    </small>
                  </div>
                </div>
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
