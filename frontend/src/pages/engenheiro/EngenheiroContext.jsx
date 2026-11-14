import { createContext, useContext, useState } from "react";

import {
  equipamentosIniciais,
  anomaliasIniciais,
  ordensIniciais,
} from "./Dados";

const Contexto = createContext(null);

export function EngenheiroProvider({ children }) {
  const [equipamentos, setEquipamentos] = useState(equipamentosIniciais);
  const [anomalias] = useState(anomaliasIniciais);
  const [ordens, setOrdens] = useState(ordensIniciais);

  function salvarEquipamento(equipamento) {
    setEquipamentos((atual) => {
      const existe = atual.some(
        (item) => item.id === equipamento.id
      );

      if (existe) {
        return atual.map((item) =>
          item.id === equipamento.id ? equipamento : item
        );
      }

      return [...atual, equipamento];
    });
  }

  function criarOrdem(equipamento, descricao) {
    const nova = {
      id: Date.now(),
      equipamento,
      descricao,
      status: "Pendente",
    };

    setOrdens((atual) => [...atual, nova]);
    return nova;
  }

  function atualizarOrdem(id, status) {
    setOrdens((atual) =>
      atual.map((item) =>
        item.id === id ? { ...item, status } : item
      )
    );
  }

  return (
    <Contexto.Provider
      value={{
        equipamentos,
        anomalias,
        ordens,
        salvarEquipamento,
        criarOrdem,
        atualizarOrdem,
      }}
    >
      {children}
    </Contexto.Provider>
  );
}

export function useEngenheiro() {
  const contexto = useContext(Contexto);

  if (!contexto) {
    throw new Error("Use as telas dentro de EngenheiroProvider");
  }

  return contexto;
}