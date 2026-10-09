// Define quando o campo de observação da recepção vira "Relatório Final"
// (uma descrição longa da avaliação) em vez de uma observação curta.
//
// Regra do usuário: apenas no CAEE, nas oficinas de avaliação
// (Avaliação para Acesso, Avaliação para Possível Laudo,
//  Avaliação para Professor de Apoio) usa-se o Relatório Final.
// Nas demais oficinas/serviços continua a observação opcional normal.
//
// É só APRESENTAÇÃO: o texto continua gravado no mesmo campo "observacao".

export function usaRelatorioFinal(servicoNome, especialidade) {
  const servico = String(servicoNome || "").toUpperCase();
  const esp = String(especialidade || "").toUpperCase();
  const ehCaee = servico.includes("CAEE");
  // "AVALIAÇÃO" / "AVALIACAO" (com ou sem acento) cobre as três oficinas.
  const ehAvaliacao = esp.includes("AVALIA");
  return ehCaee && ehAvaliacao;
}
