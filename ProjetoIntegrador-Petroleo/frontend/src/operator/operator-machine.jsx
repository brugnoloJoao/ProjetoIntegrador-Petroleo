import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import * as signalR from '@microsoft/signalr';
import Maquina3D from './Maquina3D.jsx';

const container = document.getElementById('operator-machine-app');

if (container) {
  let machineData = {};
  try {
    machineData = JSON.parse(container.dataset.machine || '{}');
  } catch (error) {
    console.error('Não foi possível carregar os dados da máquina 3D.', error);
  }

  function OperatorMachine() {
    const [leituras, setLeituras] = useState(machineData.leituras || []);
    const [simulacaoAtiva, setSimulacaoAtiva] = useState(Boolean(machineData.simulacaoAtiva));
    const [conectado, setConectado] = useState(false);
    const [controles, setControles] = useState(machineData.controles || { cadencia: 10.5, falhaSimulada: false });
    const [erroControle, setErroControle] = useState('');

    useEffect(() => {
      const hub = new signalR.HubConnectionBuilder()
        .withUrl('/hubs/dashboard')
        .withAutomaticReconnect()
        .build();

      hub.on('NovasLeituras', (novasLeituras) => {
        setLeituras((atuais) => {
          const atualizadas = [...atuais];
          for (const leitura of novasLeituras || []) {
            if (!machineData.tagAtivo || leitura.tagAtivo?.toLocaleLowerCase('pt-BR') !== machineData.tagAtivo.toLocaleLowerCase('pt-BR')) continue;
            const simulada = leitura.simulada ?? true;
            const indice = atualizadas.findIndex((item) =>
              item.parametroId === leitura.parametroId && item.simulada === simulada
            );
            const registro = { ...leitura, simulada };
            if (indice >= 0) atualizadas[indice] = { ...atualizadas[indice], ...registro };
            else atualizadas.push(registro);
          }
          return atualizadas;
        });
      });

      hub.on('EstadoSimuladorAlterado', (estado) => setSimulacaoAtiva(Boolean(estado?.ativo)));
      hub.on('EstadoMaquina3DAlterado', (estado) => setControles(estado));
      hub.onreconnecting(() => setConectado(false));
      hub.onreconnected(() => setConectado(true));
      hub.onclose(() => setConectado(false));
      hub.start().then(() => setConectado(true)).catch((error) => {
        console.error('Falha ao conectar a telemetria da máquina 3D.', error);
      });

      return () => { void hub.stop(); };
    }, []);

    async function atualizarControles(alteracoes) {
      const anteriores = controles;
      const proximos = { ...anteriores, ...alteracoes };
      setControles(proximos);
      setErroControle('');

      const token = document.querySelector('#operator-machine-token input[name="__RequestVerificationToken"]')?.value;
      const query = new URLSearchParams({
        cadencia: String(proximos.cadencia),
        falhaSimulada: String(proximos.falhaSimulada),
      });
      const corpo = new URLSearchParams({ __RequestVerificationToken: token || '' });

      try {
        const resposta = await fetch(`/Operador/AtualizarControles?${query}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
          body: corpo,
        });
        const dados = await resposta.json();
        if (!resposta.ok) throw new Error(dados.mensagem || 'Não foi possível atualizar os controles.');
        setControles(dados);
      } catch (error) {
        setControles(anteriores);
        setErroControle(error.message || 'Falha ao comunicar com o simulador.');
      }
    }

    const leiturasVisiveis = leituras.filter((leitura) => simulacaoAtiva || !leitura.simulada);
    const parametrosMaisRecentes = new Map();
    for (const leitura of leiturasVisiveis) {
      const anterior = parametrosMaisRecentes.get(leitura.parametroId);
      if (!anterior || new Date(leitura.dataHora) > new Date(anterior.dataHora)) {
        parametrosMaisRecentes.set(leitura.parametroId, leitura);
      }
    }

    const snapshot = [...parametrosMaisRecentes.values()];
    const possuiFalhaCritica = snapshot.some((leitura) => leitura.valor >= leitura.limiteCritico);
    const possuiLeituraSimulada = snapshot.some((leitura) => leitura.simulada);
    const possuiLeituraReal = snapshot.some((leitura) => !leitura.simulada);
    const origemLeituras = possuiLeituraSimulada && possuiLeituraReal
      ? 'DADOS REAIS + SIMULADOS'
      : possuiLeituraSimulada ? 'DADOS SIMULADOS' : possuiLeituraReal ? 'DADOS REAIS' : 'SEM LEITURAS REAIS';

    return (
      <div className="operator-machine-live">
        <div className={`operator-machine-connection ${conectado ? 'is-connected' : ''}`} role="status">
          <i /> {conectado ? 'Canal da simulação conectado' : 'Conectando à simulação…'}
          <span>{simulacaoAtiva ? 'Simulação ativa' : 'Somente leituras reais'}</span>
          <span className="operator-machine-target">Equipamento: {machineData.ativoNome || machineData.tagAtivo || 'sem ativo em operação'}</span>
        </div>
        <Maquina3D
          equipamentos={machineData.equipamentos || []}
          leituras={snapshot}
          cadencia={controles.cadencia}
          falhaConfigurada={controles.falhaSimulada}
          onControlChange={atualizarControles}
          erroControle={erroControle}
          simulacaoAtiva={simulacaoAtiva}
          origemLeituras={origemLeituras}
          falhaSimulada={controles.falhaSimulada || possuiFalhaCritica || (simulacaoAtiva && machineData.falhaSimulada)}
          movimentoAtivo={true}
        />
      </div>
    );
  }

  createRoot(container).render(<OperatorMachine />);
}
