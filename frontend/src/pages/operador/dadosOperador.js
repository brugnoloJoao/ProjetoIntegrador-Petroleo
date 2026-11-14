export const equipamentosOperador = [
  {
    id: "BP-02",
    nome: "Bomba de Transferência",
    temperatura: 78,
    vibracao: 5.1,
    status: "Alerta",
  },
  {
    id: "MT-04",
    nome: "Motor Industrial",
    temperatura: 92,
    vibracao: 8.4,
    status: "Crítico",
  },
  {
    id: "CP-01",
    nome: "Compressor Principal",
    temperatura: 52,
    vibracao: 2.2,
    status: "Normal",
  },
  {
    id: "VL-03",
    nome: "Válvula de Controle",
    temperatura: 43,
    vibracao: 1.8,
    status: "Normal",
  },
];

export const alertasOperador = [
  {
    id: 1,
    equipamento: "MT-04",
    descricao: "Vibração acima do limite esperado",
    gravidade: "Crítico",
    data: "14/11/2026",
    hora: "14:35",
  },
  {
    id: 2,
    equipamento: "BP-02",
    descricao: "Temperatura elevada",
    gravidade: "Alerta",
    data: "14/11/2026",
    hora: "13:20",
  },
];

export const historicoOperador = [
  {
    id: 1,
    data: "14/11/2026",
    hora: "14:35",
    equipamento: "MT-04",
    evento: "Alerta de vibração elevada",
    tipo: "Crítico",
  },
  {
    id: 2,
    data: "14/11/2026",
    hora: "13:20",
    equipamento: "BP-02",
    evento: "Temperatura acima do esperado",
    tipo: "Alerta",
  },
  {
    id: 3,
    data: "13/11/2026",
    hora: "10:15",
    equipamento: "CP-01",
    evento: "Leitura de sensores normal",
    tipo: "Normal",
  },
];