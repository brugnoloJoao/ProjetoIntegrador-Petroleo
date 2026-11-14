export const equipamentosGestor = [
  {
    id: "BP-02",
    nome: "Bomba de Transferência",
    status: "Alerta",
  },
  {
    id: "MT-04",
    nome: "Motor Industrial",
    status: "Crítico",
  },
  {
    id: "CP-01",
    nome: "Compressor Principal",
    status: "Normal",
  },
  {
    id: "VL-03",
    nome: "Válvula de Controle",
    status: "Normal",
  },
];

export const ordensGestor = [
  {
    id: 101,
    equipamento: "BP-02",
    descricao: "Verificar sistema de refrigeração",
    prioridade: "Média",
    status: "Aguardando aprovação",
    data: "12/11/2026",
  },
  {
    id: 102,
    equipamento: "MT-04",
    descricao: "Inspecionar vibração do motor",
    prioridade: "Alta",
    status: "Aguardando aprovação",
    data: "13/11/2026",
  },
  {
    id: 103,
    equipamento: "CP-01",
    descricao: "Manutenção preventiva",
    prioridade: "Baixa",
    status: "Aprovada",
    data: "10/11/2026",
  },
];
