// Rótulo do campo "especialidade" conforme o serviço da Junta.
// No CAEE o termo usado é "Oficina"; nos demais serviços é "Especialidade".
// É só APRESENTAÇÃO (o nome do campo/dado no banco continua "especialidade").

export function rotuloEspecialidade(servicoNome) {
  const nome = String(servicoNome || "").toUpperCase();
  return nome.includes("CAEE") ? "Oficina" : "Especialidade";
}
