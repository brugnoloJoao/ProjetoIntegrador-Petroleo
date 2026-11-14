// Dados simulados para demonstração.
export const equipamentosIniciais = [
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
];

export const anomaliasIniciais = [
  {
    id: 1,
    equipamento: "BP-02",
    descricao: "Temperatura acima do esperado",
    gravidade: "Alerta",
    data: "14/11/2026",
  },
  {
    id: 2,
    equipamento: "MT-04",
    descricao: "Vibração elevada",
    gravidade: "Crítico",
    data: "14/11/2026",
  },
];

export const ordensIniciais = [
  {
    id: 101,
    equipamento: "BP-02",
    descricao: "Verificar sistema de refrigeração",
    status: "Pendente",
  },
];