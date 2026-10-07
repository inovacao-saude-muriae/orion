// Utilitário puro de máscara de telefone (padrão BR).
//
// Centraliza a lógica que antes estava duplicada em vários módulos
// (gerenciamento/pessoas, CCZ, etc.). É só apresentação/entrada: a
// persistência continua guardando apenas dígitos.
//
// Não use "use server" aqui: este é um utilitário puro, não server actions.

/**
 * Remove tudo que não for dígito e corta em no máximo 11 caracteres.
 * @param {string} v valor cru ou já formatado.
 * @returns {string} apenas os dígitos (até 11).
 */
export const soDigitosTelefone = (v) => (v || "").replace(/\D/g, "").slice(0, 11);

/**
 * Formata um telefone no padrão BR.
 * - Até 10 dígitos: (00) 0000-0000 (fixo)
 * - 11 dígitos: (00) 00000-0000 (celular)
 * @param {string} v valor cru (só dígitos) ou já formatado.
 * @returns {string} telefone formatado, ou "" se vazio.
 */
export const mascararTelefone = (v) => {
  const d = soDigitosTelefone(v);
  if (!d) return "";
  if (d.length <= 10) {
    return d.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{4})(\d{1,4})$/, "$1-$2");
  }
  return d.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d{1,4})$/, "$1-$2");
};
