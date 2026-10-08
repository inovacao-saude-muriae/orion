"use client";

import { createContext, useContext } from "react";

// Permissões da Junta calculadas no servidor (layout.js) e injetadas como props
// serializáveis. subServicosPermitidos é a lista de códigos de subTab liberados
// (ex.: ["CAEE"]). Client Components NÃO importam a DAL — recebem só estes dados.
// Fail-closed: sem provider, nenhum sub-serviço é liberado (design §15).
const PermissoesJuntaContext = createContext({
  subServicosPermitidos: [],
  ehAdminJunta: false,
});

export function JuntaPermProvider({
  subServicosPermitidos = [],
  ehAdminJunta = false,
  children,
}) {
  return (
    <PermissoesJuntaContext.Provider
      value={{ subServicosPermitidos, ehAdminJunta }}
    >
      {children}
    </PermissoesJuntaContext.Provider>
  );
}

export function usePermissoesJunta() {
  return useContext(PermissoesJuntaContext);
}
