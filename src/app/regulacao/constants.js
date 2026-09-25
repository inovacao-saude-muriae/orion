// Opções de status da comunicação com o paciente.
// Usadas tanto no select de gravação (Lista de Espera) quanto no filtro,
// garantindo que o valor gravado seja exatamente o valor filtrável.
export const STATUS_COMUNICACAO = [
  "Avisado",
  "Não quer",
  "Recusa",
  "Realizado",
  "Faleceu",
  "Mudou End.",
  "Liberado em outra APAC",
  "Outros",
  "Sem info",
];

// Opções de status do pedido de regulação.
export const STATUS_PEDIDO = [
  "Aguardando",
  "Liberado",
  "Cancelado",
  "Devolvido",
];
