import styles from "./AcessoNegadoModulo.module.css";

// Server Component simples (sem estado). Renderiza o bloco "Acesso Negado"
// NO LUGAR do conteúdo do módulo, dentro do <main> — preservando Header e
// Sidebar (FR-5.1/5.2). Diferente da página /acesso-negado (full-screen), não
// oferece link de login: o usuário está logado, apenas não tem o vínculo.
export default function AcessoNegadoModulo({ modulo, mensagem }) {
  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.icon}>🚫</div>
        <h1 className={styles.title}>Acesso Negado</h1>
        <p className={styles.message}>
          {mensagem ? (
            mensagem
          ) : (
            <>
              Você não tem acesso ao módulo <strong>{modulo}</strong>. Fale com o
              administrador do sistema.
            </>
          )}
        </p>
      </div>
    </div>
  );
}
