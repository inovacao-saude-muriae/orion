// Integração com a API pública do ViaCEP (https://viacep.com.br/).
// Consulta um CEP brasileiro e retorna os dados de endereço normalizados.
//
// A API é gratuita e não exige chave. Endpoint: https://viacep.com.br/ws/{cep}/json/
// Quando o CEP não existe, o ViaCEP responde 200 com { erro: true }.

const VIACEP_BASE_URL = "https://viacep.com.br/ws";

/**
 * Consulta um CEP no ViaCEP.
 * @param {string} cep - CEP com ou sem máscara (ex.: "36880-000" ou "36880000").
 * @returns {Promise<{
 *   success: boolean,
 *   error?: string,
 *   data?: {
 *     cep: string,
 *     logradouro: string,
 *     complemento: string,
 *     bairro: string,
 *     cidade: string,
 *     uf: string,
 *     ibge: string,
 *   }
 * }>}
 */
export async function buscarCep(cep) {
  const cepLimpo = (cep || "").replace(/\D/g, "");

  if (cepLimpo.length !== 8) {
    return { success: false, error: "CEP deve conter 8 dígitos." };
  }

  try {
    const res = await fetch(`${VIACEP_BASE_URL}/${cepLimpo}/json/`, {
      cache: "no-store",
    });

    if (!res.ok) {
      return { success: false, error: "Falha ao consultar o ViaCEP." };
    }

    const json = await res.json();

    // ViaCEP retorna { erro: true } (ou "true") para CEP inexistente.
    if (json?.erro) {
      return { success: false, error: "CEP não encontrado." };
    }

    return {
      success: true,
      data: {
        cep: cepLimpo,
        logradouro: json.logradouro || "",
        complemento: json.complemento || "",
        bairro: json.bairro || "",
        cidade: json.localidade || "",
        uf: json.uf || "",
        ibge: json.ibge || "",
      },
    };
  } catch (error) {
    console.error("Erro ao consultar ViaCEP:", error);
    return { success: false, error: "Não foi possível consultar o CEP." };
  }
}
