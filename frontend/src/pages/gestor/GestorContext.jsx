import {
  createContext,
  useContext,
  useState,
} from "react";

import {
  equipamentosGestor,
  ordensGestor,
} from "./dadosGestor";

const GestorContext = createContext(null);

export function GestorProvider({ children }) {
  const [equipamentos] = useState(equipamentosGestor);
  const [ordens, setOrdens] = useState(ordensGestor);

  function atualizarStatus(id, novoStatus) {
    setOrdens((anteriores) =>
      anteriores.map((ordem) =>
        ordem.id === id
          ? { ...ordem, status: novoStatus }
          : ordem
      )
    );
  }

  return (
    <GestorContext.Provider
      value={{
        equipamentos,
        ordens,
        atualizarStatus,
      }}
    >
      {children}
    </GestorContext.Provider>
  );
}

export function useGestor() {
  const contexto = useContext(GestorContext);

  if (!contexto) {
    throw new Error(
      "As telas do gestor precisam estar dentro de GestorProvider."
    );
  }

  return contexto;
}
