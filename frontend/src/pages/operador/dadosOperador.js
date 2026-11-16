import { createContext, createElement, useContext, useEffect, useState } from "react";

export const equipamentosIniciais = [
  {
    id: "UB-04",
    nome: "Unidade Bombeio UB-04",
    subtitulo: "Balancim / Mancal Central • 54.820 h",
    setor: "Elevação Artificial • Poço MRL-19",
    temperatura: 64.2,
    vibracao: 2.8,
    integridade: 96,
    carga: 74.6,
    status: "Normal",
    statusLabel: "OPERANDO",
    presetCamera: "poco",
  },
  {
    id: "ANM-07",
    nome: "Árvore de Natal ANM-07",
    subtitulo: "Cabeça de Poço & Choke • 29.410 h",
    setor: "Surgência / Linha de Produção",
    temperatura: 78.2,
    vibracao: 1.4,
    integridade: 99,
    carga: 62.0,
    status: "Normal",
    statusLabel: "OPERANDO",
    presetCamera: "poco",
  },
  {
    id: "MTR-75HP",
    nome: "Conjunto Motriz 75HP",
    subtitulo: "Motor VFD & Caixa Redutora • 9.180 h",
    setor: "Acionamento Principal • Skid B",
    temperatura: 81.5,
    vibracao: 5.2,
    integridade: 81,
    carga: 84.0,
    status: "Alerta",
    statusLabel: "AVISO",
    presetCamera: "motor",
  },
  {
    id: "SEP-02",
    nome: "Separador Trifásico SEP-02",
    subtitulo: "Linha Surgência & Vaso • 38.640 h",
    setor: "Separação Óleo / Gás / Água",
    temperatura: 54.0,
    vibracao: 1.9,
    integridade: 98,
    carga: 68.5,
    status: "Normal",
    statusLabel: "OPERANDO",
    presetCamera: "separador",
  },
];

export const alertasIniciais = [
  {
    id: 1,
    tag: "VIB-MTR75",
    equipamento: "MTR-75HP",
    nomeEquipamento: "Conjunto Motriz 75HP",
    descricao: "Vibração radial elevada no mancal lado acoplamento (5,2 mm/s — Limite Aviso: 4,5 mm/s)",
    gravidade: "Alerta",
    data: "16/11/2026",
    hora: "14:21:08",
    reconhecido: false,
  },
  {
    id: 2,
    tag: "TMP-THT04",
    equipamento: "ANM-07",
    nomeEquipamento: "Árvore de Natal ANM-07",
    descricao: "Temperatura na cabeça de produção próxima ao patamar de atenção (78,2 °C)",
    gravidade: "Alerta",
    data: "16/11/2026",
    hora: "13:48:32",
    reconhecido: true,
  },
];

export const historicoInicial = [
  {
    id: 1,
    data: "16/11/2026",
    hora: "14:21:08",
    equipamento: "MTR-75HP",
    evento: "Alarme ISA-18.2: Vibração radial acima de 4,5 mm/s (5,2 mm/s)",
    responsavel: "RTU-04 / SCADA",
    tipo: "Alerta",
  },
  {
    id: 2,
    data: "16/11/2026",
    hora: "13:48:32",
    equipamento: "ANM-07",
    evento: "Monitoramento térmico THT estabilizado em 78,2 °C",
    responsavel: "Eng. R. Almeida",
    tipo: "Alerta",
  },
  {
    id: 3,
    data: "16/11/2026",
    hora: "12:00:00",
    equipamento: "UB-04",
    evento: "Carta dinamométrica de superfície validada — eficiência 86,4%",
    responsavel: "Eng. R. Almeida",
    tipo: "Normal",
  },
  {
    id: 4,
    data: "16/11/2026",
    hora: "08:15:10",
    equipamento: "SEP-02",
    evento: "Teste de válvula de alívio PSV-02B e drenagem de interface",
    responsavel: "Operador Turno A",
    tipo: "Normal",
  },
];

export const limites = {
  temperatura: { max: 110, aviso: 75, critico: 90, unidade: "°C" },
  vibracao: { max: 10, aviso: 4.5, critico: 7.0, unidade: "mm/s" },
};

const OperadorContext = createContext(null);

function agoraFormatado() {
  const d = new Date();
  const data = d.toLocaleDateString("pt-BR");
  const hora = d.toLocaleTimeString("pt-BR", { hour12: false });
  return { data, hora };
}

export function OperadorProvider({ children }) {
  const [cadencia, setCadencia] = useState(10.5);
  const [choke, setChoke] = useState(62);
  const [falhaSimulada, setFalhaSimulada] = useState(false);

  const [equipamentos, setEquipamentos] = useState(equipamentosIniciais);
  const [alertas, setAlertas] = useState(alertasIniciais);
  const [historico, setHistorico] = useState(historicoInicial);

  const [telemetria, setTelemetria] = useState({
    vazao: 1420,
    oleoLiquido: 1102,
    whp: 42.9,
    chp: 18.3,
    cargaMotor: 74.6,
    cursoHaste: 3.1,
    bsw: 22.4,
    h2s: 4,
    api: 28.4,
    profBomba: 1840.0,
    eficVolumetrica: 86.4,
    tempFluido: 78.2,
    nivelDinamico: 1215.0,
    cargaHasteKn: 98.4,
  });

  const [sparkVazao, setSparkVazao] = useState([1395, 1408, 1412, 1405, 1418, 1425, 1416, 1422, 1419, 1420]);
  const [sparkWhp, setSparkWhp] = useState([42.1, 42.4, 42.2, 42.8, 43.1, 42.7, 42.5, 43.0, 42.8, 42.9]);
  const [tendencia, setTendencia] = useState(() =>
    Array.from({ length: 24 }, (_, i) => ({
      t: i,
      whp: 42.4 + Math.sin(i * 0.45) * 0.9,
      carga: 96 + Math.cos(i * 0.45) * 6.5,
    }))
  );

  useEffect(() => {
    const timer = setInterval(() => {
      const jitter = (amp) => (Math.random() - 0.5) * amp;

      const novaVazao = Math.round(
        (cadencia * 112 + choke * 4.1) * (falhaSimulada ? 0.76 : 1) + jitter(14)
      );
      const novoOleo = Math.round(novaVazao * 0.776);
      const novoWhp = Number(
        (
          (32 + (100 - choke) * 0.28 + cadencia * 0.18) *
            (falhaSimulada ? 1.34 : 1) +
          jitter(0.5)
        ).toFixed(1)
      );
      const novaCargaMotor = Number(
        Math.min(
          99.5,
          48 + cadencia * 2.5 + (falhaSimulada ? 19.5 : 0) + jitter(0.8)
        ).toFixed(1)
      );
      const novaTemp = Number(
        (68 + cadencia * 0.95 + (falhaSimulada ? 18.4 : 0) + jitter(0.4)).toFixed(1)
      );
      const novaCargaHaste = Number(
        (86 + cadencia * 1.15 + (falhaSimulada ? 22.0 : 0) + jitter(1.8)).toFixed(1)
      );

      setTelemetria((prev) => ({
        ...prev,
        vazao: novaVazao,
        oleoLiquido: novoOleo,
        whp: novoWhp,
        cargaMotor: novaCargaMotor,
        bsw: Number((22.4 + jitter(0.3)).toFixed(1)),
        tempFluido: novaTemp,
        eficVolumetrica: Number((falhaSimulada ? 69.2 : 86.4 + jitter(0.4)).toFixed(1)),
        cargaHasteKn: novaCargaHaste,
      }));

      setSparkVazao((prev) => [...prev.slice(1), novaVazao]);
      setSparkWhp((prev) => [...prev.slice(1), novoWhp]);
      setTendencia((prev) => [
        ...prev.slice(1),
        {
          t: prev[prev.length - 1].t + 1,
          whp: novoWhp,
          carga: novaCargaHaste,
        },
      ]);

      setEquipamentos((prev) =>
        prev.map((eq) => {
          if (eq.id === "MTR-75HP") {
            const vib = falhaSimulada
              ? Number((8.6 + jitter(0.3)).toFixed(1))
              : Number((5.1 + (cadencia - 10.5) * 0.18 + jitter(0.15)).toFixed(1));
            const temp = falhaSimulada
              ? Number((96.4 + jitter(0.5)).toFixed(1))
              : Number((80.5 + (cadencia - 10.5) * 0.7 + jitter(0.3)).toFixed(1));
            const st = vib >= 7 || temp >= 90 ? "Crítico" : vib >= 4.5 || temp >= 75 ? "Alerta" : "Normal";
            return {
              ...eq,
              temperatura: temp,
              vibracao: vib,
              carga: novaCargaMotor,
              integridade: falhaSimulada ? 62 : 81,
              status: st,
              statusLabel: st === "Crítico" ? "CRÍTICO" : st === "Alerta" ? "AVISO" : "OPERANDO",
            };
          }
          if (eq.id === "UB-04") {
            const vib = falhaSimulada
              ? Number((6.4 + jitter(0.25)).toFixed(1))
              : Number((2.7 + (cadencia - 10.5) * 0.12 + jitter(0.1)).toFixed(1));
            const st = vib >= 7 ? "Crítico" : vib >= 4.5 ? "Alerta" : "Normal";
            return {
              ...eq,
              vibracao: vib,
              carga: novaCargaMotor,
              integridade: falhaSimulada ? 74 : 96,
              status: st,
              statusLabel: st === "Crítico" ? "CRÍTICO" : st === "Alerta" ? "AVISO" : "OPERANDO",
            };
          }
          if (eq.id === "ANM-07") {
            const st = novoWhp >= 55 ? "Crítico" : novoWhp >= 49 ? "Alerta" : "Normal";
            return {
              ...eq,
              temperatura: novaTemp,
              integridade: st === "Normal" ? 99 : 84,
              status: st,
              statusLabel: st === "Crítico" ? "CRÍTICO" : st === "Alerta" ? "AVISO" : "OPERANDO",
            };
          }
          return eq;
        })
      );
    }, 1500);

    return () => clearInterval(timer);
  }, [cadencia, choke, falhaSimulada]);

  const simularFalha = () => {
    if (falhaSimulada) return;
    setFalhaSimulada(true);
    const { data, hora } = agoraFormatado();
    const novoId = Date.now();

    setAlertas((prev) => [
      {
        id: novoId,
        tag: "TRIP-MTR75",
        equipamento: "MTR-75HP",
        nomeEquipamento: "Conjunto Motriz 75HP",
        descricao: "Sobrecarga térmica (96,4 °C) e vibração crítica (8,6 mm/s) no redutor UB-04",
        gravidade: "Crítico",
        data,
        hora,
        reconhecido: false,
      },
      ...prev,
    ]);

    setHistorico((prev) => [
      {
        id: novoId,
        data,
        hora,
        equipamento: "MTR-75HP",
        evento: "FALHA SIMULADA: Sobretemperatura e vibração crítica detectadas",
        responsavel: "Simulação Operador",
        tipo: "Crítico",
      },
      ...prev,
    ]);
  };

  const normalizarPlanta = () => {
    setFalhaSimulada(false);
    setCadencia(10.5);
    setChoke(62);
    const { data, hora } = agoraFormatado();
    const novoId = Date.now();

    setHistorico((prev) => [
      {
        id: novoId,
        data,
        hora,
        equipamento: "PLANTA-ET04",
        evento: "Comando remoto: Parâmetros operacionais normalizados",
        responsavel: "Eng. R. Almeida",
        tipo: "Normal",
      },
      ...prev,
    ]);
  };

  const reconhecerAlerta = (id) => {
    setAlertas((prev) =>
      prev.map((a) => (a.id === id ? { ...a, reconhecido: true } : a))
    );
  };

  const alertasAtivosCount = alertas.filter((a) => !a.reconhecido).length;

  return createElement(
    OperadorContext.Provider,
    {
      value: {
        cadencia,
        setCadencia,
        choke,
        setChoke,
        falhaSimulada,
        simularFalha,
        normalizarPlanta,
        equipamentos,
        alertas,
        alertasAtivosCount,
        reconhecerAlerta,
        historico,
        telemetria,
        sparkVazao,
        sparkWhp,
        tendencia,
      },
    },
    children
  );
}

export function useOperador() {
  const ctx = useContext(OperadorContext);
  if (!ctx) {
    throw new Error("useOperador deve ser usado dentro de OperadorProvider");
  }
  return ctx;
}