import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import * as signalR from '@microsoft/signalr';
import Maquina3D from './Maquina3D.jsx';
import { chaveDoModelo, carregarModelo } from './modelos/catalogo.js';
import { situacaoDaLeitura } from './leituras.js';

const container = document.getElementById('operator-machine-app');
const INTERVALO_ATUALIZACAO = 15000;
const INTERVALO_SALA = 5000;
const TEMPO_POR_MAQUINA = 12000;

if (container) {
  let dadosIniciais = {};
  try {
    dadosIniciais = JSON.parse(container.dataset.machine || '{}');
  } catch (error) {
    console.error('Não foi possível carregar os dados da máquina 3D.', error);
  }
  const urls = {
    dados: container.dataset.urlDados || '/Maquina3D/Dados',
    controles: container.dataset.urlControles || '/Maquina3D/AtualizarControles',
    novaOs: container.dataset.urlNovaOs || '/OrdemServico/Create',
    ocorrencias: container.dataset.urlOcorrencias || '/Ocorrencias',
  };

  // Mantém a leitura mais recente de cada parâmetro e origem (real ou simulada).
  function mesclarLeituras(atuais, novas) {
    const resultado = [...atuais];
    for (const leitura of novas) {
      const simulada = leitura.simulada ?? true;
      const indice = resultado.findIndex((item) => item.parametroId === leitura.parametroId && item.simulada === simulada);
      const registro = { ...leitura, simulada };
      if (indice < 0) resultado.push(registro);
      else if (new Date(registro.dataHora) >= new Date(resultado[indice].dataHora)) resultado[indice] = registro;
    }
    return resultado;
  }

  function OperatorMachine() {
    const [dados, setDados] = useState(dadosIniciais);
    const [leituras, setLeituras] = useState(dadosIniciais.leituras || []);
    const [simulacaoAtiva, setSimulacaoAtiva] = useState(Boolean(dadosIniciais.simulacaoAtiva));
    const [conectado, setConectado] = useState(false);
    const [controles, setControles] = useState(dadosIniciais.controles || { cadencia: 10.5, falhaSimulada: false });
    const [erroControle, setErroControle] = useState('');
    const [erroTroca, setErroTroca] = useState('');
    const [carregado, setCarregado] = useState({ chave: null, modelo: null });
    const [sala, setSala] = useState(false);

    const ativoId = dados.ativo?.id ?? null;
    // Equipamento escolhido pelo usuário, mesmo antes de a resposta chegar.
    const selecionadoRef = useRef(ativoId);
    const parametrosRef = useRef(new Set(dadosIniciais.parametros || []));

    const chave = chaveDoModelo(dados.ativo?.tipo);
    useEffect(() => {
      let vigente = true;
      carregarModelo(chave)
        .then((modelo) => { if (vigente) setCarregado({ chave, modelo }); })
        .catch((error) => {
          console.error('Falha ao carregar o modelo 3D.', error);
          if (vigente) setErroTroca('Não foi possível carregar o modelo 3D. Atualize a página.');
        });
      return () => { vigente = false; };
    }, [chave]);

    const pedidoRef = useRef(0);
    const exibidoRef = useRef(ativoId);
    const carregarDados = useCallback(async (id, { comLeituras = true } = {}) => {
      const pedido = ++pedidoRef.current;
      try {
        const resposta = await fetch(`${urls.dados}?ativoId=${id ?? ''}&comLeituras=${comLeituras}`, { headers: { Accept: 'application/json' } });
        if (!resposta.ok || !resposta.headers.get('content-type')?.includes('json')) throw new Error();
        const novos = await resposta.json();
        if (pedido !== pedidoRef.current) return;
        const idRecebido = novos.ativo?.id ?? null;
        const trocou = idRecebido !== exibidoRef.current;
        exibidoRef.current = idRecebido;
        selecionadoRef.current = idRecebido;
        parametrosRef.current = new Set(novos.parametros || []);
        setDados(novos);
        setSimulacaoAtiva(Boolean(novos.simulacaoAtiva));
        setControles(novos.controles);
        setLeituras((atuais) => trocou ? novos.leituras || [] : mesclarLeituras(atuais, novos.leituras || []));
        setErroTroca('');
        // A atualização periódica chegou antes da troca: busca as leituras do novo equipamento.
        if (trocou && !comLeituras) carregarDados(idRecebido);
      } catch {
        if (pedido === pedidoRef.current && selecionadoRef.current !== exibidoRef.current) {
          selecionadoRef.current = exibidoRef.current;
          setErroTroca('Não foi possível trocar de equipamento. Tente novamente.');
        }
      }
    }, []);

    const selecionar = (id) => {
      setErroControle('');
      const url = new URL(window.location.href);
      url.searchParams.set('ativoId', id);
      window.history.replaceState(null, '', url);
      selecionadoRef.current = id;
      carregarDados(id);
    };

    // Atualiza status, alertas e a OS sugerida sem recarregar a página.
    useEffect(() => {
      const timer = window.setInterval(() => {
        // As leituras chegam pelo SignalR; aqui só o estado do equipamento.
        if (!document.hidden) carregarDados(selecionadoRef.current, { comLeituras: false });
      }, sala ? INTERVALO_SALA : INTERVALO_ATUALIZACAO);
      return () => window.clearInterval(timer);
    }, [carregarDados, sala]);

    // ---------- Sala de controle ----------
    // Alterna as máquinas sozinha; havendo alguma em estado crítico, fica nela.
    const listaRef = useRef([]);
    listaRef.current = dados.ativos || [];
    const criticos = listaRef.current.filter((item) => item.condicao === 'Crítico');
    const emFoco = criticos.some((item) => item.id === ativoId);

    const proximaMaquina = useCallback(() => {
      const lista = listaRef.current;
      const emAlerta = lista.filter((item) => item.condicao === 'Crítico');
      const fila = emAlerta.length ? emAlerta : lista;
      if (!fila.length) return;
      const posicao = fila.findIndex((item) => item.id === selecionadoRef.current);
      const proxima = fila[(posicao + 1) % fila.length];
      if (proxima.id !== selecionadoRef.current) {
        selecionadoRef.current = proxima.id;
        carregarDados(proxima.id);
      }
    }, [carregarDados]);

    useEffect(() => {
      if (!sala) return undefined;
      const timer = window.setInterval(proximaMaquina, TEMPO_POR_MAQUINA);
      return () => window.clearInterval(timer);
    }, [sala, proximaMaquina]);

    // Surgiu um problema em outra máquina: vai até ela sem esperar a vez.
    useEffect(() => {
      if (sala && criticos.length && !emFoco) proximaMaquina();
    }, [sala, criticos.map((item) => item.id).join(), emFoco, proximaMaquina]);

    useEffect(() => {
      document.body.classList.toggle('ps-sala', sala);
      if (!sala) return undefined;
      const aoSairDaTelaCheia = () => { if (!document.fullscreenElement) setSala(false); };
      const aoApertarEsc = (evento) => { if (evento.key === 'Escape') setSala(false); };
      document.addEventListener('fullscreenchange', aoSairDaTelaCheia);
      window.addEventListener('keydown', aoApertarEsc);
      return () => {
        document.removeEventListener('fullscreenchange', aoSairDaTelaCheia);
        window.removeEventListener('keydown', aoApertarEsc);
        document.body.classList.remove('ps-sala');
        if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
      };
    }, [sala]);

    const entrarNaSala = () => {
      setSala(true);
      // Sem permissão para tela cheia, o modo funciona dentro da janela.
      document.documentElement.requestFullscreen?.().catch(() => {});
    };

    useEffect(() => {
      const hub = new signalR.HubConnectionBuilder()
        .withUrl('/hubs/dashboard')
        .withAutomaticReconnect()
        .build();

      hub.on('NovasLeituras', (novasLeituras) => {
        const doAtivo = (novasLeituras || []).filter((leitura) => parametrosRef.current.has(leitura.parametroId));
        if (doAtivo.length) setLeituras((atuais) => mesclarLeituras(atuais, doAtivo));
      });
      hub.on('EstadoSimuladorAlterado', (estado) => {
        setSimulacaoAtiva(Boolean(estado?.ativo));
        carregarDados(selecionadoRef.current);
      });
      hub.on('EstadoMaquina3DAlterado', (estado) => {
        if (estado?.ativoId === selecionadoRef.current) {
          setControles({ cadencia: estado.cadencia, falhaSimulada: estado.falhaSimulada });
        }
      });
      hub.onreconnecting(() => setConectado(false));
      hub.onreconnected(() => { setConectado(true); carregarDados(selecionadoRef.current); });
      hub.onclose(() => setConectado(false));
      hub.start().then(() => setConectado(true)).catch((error) => {
        console.error('Falha ao conectar a telemetria da máquina 3D.', error);
      });

      return () => { void hub.stop(); };
    }, [carregarDados]);

    async function atualizarControles(alteracoes) {
      if (ativoId == null) return;
      const anteriores = controles;
      const proximos = { ...anteriores, ...alteracoes };
      setControles(proximos);
      setErroControle('');

      const token = document.querySelector('#operator-machine-token input[name="__RequestVerificationToken"]')?.value;
      const query = new URLSearchParams({
        ativoId: String(ativoId),
        cadencia: String(proximos.cadencia),
        falhaSimulada: String(proximos.falhaSimulada),
      });
      const corpo = new URLSearchParams({ __RequestVerificationToken: token || '' });

      try {
        const resposta = await fetch(`${urls.controles}?${query}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
          body: corpo,
        });
        const retorno = await resposta.json();
        if (!resposta.ok) throw new Error(retorno.mensagem || 'Não foi possível atualizar os controles.');
        if (retorno.ativoId === selecionadoRef.current) {
          setControles({ cadencia: retorno.cadencia, falhaSimulada: retorno.falhaSimulada });
        }
      } catch (error) {
        if (ativoId !== selecionadoRef.current) return;
        setControles(anteriores);
        setErroControle(error.message || 'Falha ao comunicar com o simulador.');
      }
    }

    const maisRecentes = new Map();
    for (const leitura of leituras) {
      if (!parametrosRef.current.has(leitura.parametroId) || (!simulacaoAtiva && leitura.simulada)) continue;
      const anterior = maisRecentes.get(leitura.parametroId);
      if (!anterior || new Date(leitura.dataHora) > new Date(anterior.dataHora)) {
        maisRecentes.set(leitura.parametroId, leitura);
      }
    }
    const snapshot = [...maisRecentes.values()].sort((a, b) => a.parametroId - b.parametroId);

    const possuiFalhaCritica = snapshot.some((leitura) => situacaoDaLeitura(leitura) === 'critico');
    const possuiSimulada = snapshot.some((leitura) => leitura.simulada);
    const possuiReal = snapshot.some((leitura) => !leitura.simulada);
    const origemLeituras = possuiSimulada && possuiReal
      ? 'DADOS REAIS + SIMULADOS'
      : possuiSimulada ? 'DADOS SIMULADOS' : possuiReal ? 'DADOS REAIS' : 'SEM LEITURAS REAIS';

    const operando = !dados.ativo || dados.ativo.status === 'Operando';
    const modelo = carregado.chave === chave ? carregado.modelo : null;
    const ativos = dados.ativos || [];

    return (
      <div className="operator-machine-live">
        {sala && (
          <div className={`op-room-bar ${emFoco ? 'is-critico' : ''}`} role="status">
            <strong>{dados.ativo?.nome} · {dados.ativo?.tag}</strong>
            <span>
              {emFoco
                ? criticos.length > 1
                  ? `⛔ Alternando só entre as ${criticos.length} máquinas em estado crítico`
                  : '⛔ Em estado crítico: a tela fica nesta máquina'
                : `Sala de controle · ${ativos.findIndex((item) => item.id === ativoId) + 1} de ${ativos.length}`}
            </span>
            <button type="button" onClick={() => setSala(false)}>Sair (Esc)</button>
          </div>
        )}
        <div className="op-machine-selector">
          <label htmlFor="machine-asset">EQUIPAMENTO</label>
          {ativos.length ? (
            <select id="machine-asset" value={ativoId ?? ''} onChange={(event) => selecionar(Number(event.target.value))}>
              {ativos.map((ativo) => (
                <option key={ativo.id} value={ativo.id}>
                  {ativo.nome} · {ativo.tag}{ativo.condicao === 'Normal' ? '' : ` — ${ativo.condicao}`}
                </option>
              ))}
            </select>
          ) : <span>Nenhum ativo cadastrado. A unidade de bombeio é exibida como demonstração.</span>}
          {dados.ativo && (
            <>
              <span className="op-machine-type">{dados.ativo.tipo || 'Tipo não informado'}</span>
              <span className={`op-status ${operando ? 'is-ok' : 'is-off'}`}><i />{dados.ativo.statusTexto}</span>
            </>
          )}
          {dados.ativo && (
            <a className="op-machine-history" href={`${urls.ocorrencias}?ativoId=${dados.ativo.id}`}>Ocorrências</a>
          )}
          {ativos.length > 0 && (
            <button type="button" className="op-room-button" onClick={entrarNaSala}>Sala de controle</button>
          )}
          {dados.sugestao && (
            <a className="op-machine-suggestion" href={`${urls.novaOs}?alertaId=${dados.sugestao.alertaId}`}>
              OS pronta: {dados.sugestao.parametro} <span aria-hidden="true">→</span>
            </a>
          )}
        </div>
        <div className={`operator-machine-connection ${conectado ? 'is-connected' : ''}`} role="status">
          <i /> {conectado ? 'Canal da simulação conectado' : 'Conectando à simulação…'}
          <span>{simulacaoAtiva ? 'Simulação ativa' : 'Somente leituras reais'}</span>
        </div>
        {erroTroca && <div className="op-control-error" role="alert">{erroTroca}</div>}
        <Maquina3D
          modelo={modelo}
          ativo={dados.ativo}
          equipamentos={dados.equipamentos || []}
          statusAtivo={(simulacaoAtiva ? dados.status : dados.statusReal) || 'Normal'}
          leituras={snapshot}
          cadencia={controles.cadencia}
          falhaConfigurada={controles.falhaSimulada}
          controlesBloqueados={ativoId == null}
          onControlChange={atualizarControles}
          erroControle={erroControle}
          simulacaoAtiva={simulacaoAtiva}
          origemLeituras={origemLeituras}
          falhaSimulada={controles.falhaSimulada || possuiFalhaCritica || (simulacaoAtiva && Boolean(dados.falhaSimulada))}
          movimentoAtivo={operando}
        />
      </div>
    );
  }

  createRoot(container).render(<OperatorMachine />);
}
