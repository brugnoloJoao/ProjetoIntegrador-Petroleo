import React, { Suspense, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import * as signalR from '@microsoft/signalr';
import { CORES_LIMITE, criarGraficoLinha, serieLimite, serieMedida } from './charts/linha.js';
import NumeroAnimado from './effects/NumeroAnimado.jsx';
import './dashboard.css';
import './dashboard-resilience.css';

const ThreeBackground = React.lazy(() => import('./three-background.jsx'));

function useDashboard() {
  const [metrics, setMetrics] = useState({ total: '—', operando: '—', alertas: '—', os: '—', disp: null });
  const [status, setStatus] = useState('Conectando');
  const [updatedAt, setUpdatedAt] = useState('—:—:—');
  const [parameterId, setParameterId] = useState('');
  const parameterRef = useRef('');
  const [history, setHistory] = useState(null);
  const connection = useRef(null);
  const serverConfig = window.petroSyncDashboard ?? {};
  const config = {
    indicatorsUrl: serverConfig.indicatorsUrl || serverConfig.IndicatorsUrl || '/Home/Indicadores',
    historyUrl: serverConfig.historyUrl || serverConfig.HistoryUrl || '/Home/Historico',
    exportUrl: serverConfig.exportUrl || serverConfig.ExportUrl || '',
    hubUrl: serverConfig.hubUrl || serverConfig.HubUrl || '/hubs/dashboard',
    parameters: serverConfig.parameters || serverConfig.Parameters || [],
  };
  if (!Array.isArray(config.parameters)) config.parameters = [];

  const refreshMetrics = async () => {
    try {
      const response = await fetch(config.indicatorsUrl, { headers: { Accept: 'application/json' } });
      if (response.ok) setMetrics(await response.json());
    } catch { /* Keep the last successful values while offline. */ }
  };

  const loadHistory = async (id) => {
    if (!id) { setHistory(null); return; }
    parameterRef.current = String(id);
    setParameterId(String(id));
    try {
      const response = await fetch(`${config.historyUrl}?parametroId=${encodeURIComponent(id)}`);
      if (response.ok) {
        const dados = await response.json();
        if (parameterRef.current === String(id)) setHistory({ ...dados, id: String(id) });
      }
    } catch { setHistory(null); }
  };

  useEffect(() => {
    if (config.parameters.length) loadHistory(config.parameters[0].value);
    refreshMetrics();
    const timer = window.setInterval(refreshMetrics, 15000);
    const hub = new signalR.HubConnectionBuilder().withUrl(config.hubUrl).withAutomaticReconnect().build();
    connection.current = hub;
    hub.on('NovasLeituras', (readings) => {
      const point = readings.find((reading) => String(reading.parametroId) === parameterRef.current);
      if (point) setHistory((current) => current ? ({ ...current, pontos: [...current.pontos, { t: new Date(point.dataHora).toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo' }), v: point.valor }].slice(-60) }) : current);
      setUpdatedAt(new Date().toLocaleTimeString('pt-BR'));
      refreshMetrics();
    });
    hub.onreconnecting(() => setStatus('Reconectando'));
    hub.onreconnected(() => { setStatus('Conectado'); refreshMetrics(); });
    hub.onclose(() => setStatus('Desconectado'));
    hub.start().then(() => setStatus('Conectado')).catch(() => setStatus('Desconectado'));
    return () => { window.clearInterval(timer); hub.stop(); };
  }, []);

  return { metrics, status, updatedAt, parameterId, history, loadHistory, config };
}

function MetricCard({ label, value, note, icon, tone = '' }) {
  return <article className={`metric-card ${tone}`}><div className="metric-top"><span>{label}</span><span className="metric-icon">{icon}</span></div><strong>{value}</strong><small>{note}</small></article>;
}

function TrendChart({ history }) {
  const container = useRef(null);
  const chart = useRef(null);
  const temDados = Boolean(history?.pontos?.length);

  useEffect(() => {
    if (!temDados) return undefined;
    chart.current = criarGraficoLinha(container.current);
    return () => { chart.current.descartar(); chart.current = null; };
  }, [temDados]);

  useEffect(() => {
    if (!temDados) return;
    const quantidade = history.pontos.length;
    chart.current.atualizar({
      chave: history.id,
      rotulos: history.pontos.map((point) => point.t),
      unidade: history.unidade,
      series: [
        serieMedida(`${history.nome} (${history.unidade})`, history.pontos.map((point) => point.v), '#f5aa32', { preenchida: true }),
        serieLimite('Atenção', history.atencao, quantidade, CORES_LIMITE.atencao),
        serieLimite('Crítico', history.critico, quantidade, CORES_LIMITE.critico),
      ],
    });
  }, [history, temDados]);

  return <div className="dashboard-chart">{temDados ? <div ref={container} className="dashboard-chart-canvas" role="img" aria-label={`Tendência de ${history.nome}`} /> : <div className="dashboard-empty">Selecione um parâmetro com leituras para visualizar a tendência.</div>}</div>;
}

class DashboardErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { failed: false }; }
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (this.state.failed) return <div className="dashboard-load-error" role="alert"><strong>Não foi possível carregar o painel.</strong><span>Atualize a página para tentar novamente.</span><button type="button" onClick={() => window.location.reload()}>Recarregar</button></div>;
    return this.props.children;
  }
}

function Dashboard() {
  const { metrics, status, updatedAt, parameterId, history, loadHistory, config } = useDashboard();
  const availability = metrics.disp == null
    ? '—'
    : <NumeroAnimado valor={Number(metrics.disp)} formatar={(valor) => `${valor.toFixed(1)}%`} />;
  // O fundo 3D é só decoração: entra depois que os números e o gráfico já estão na tela.
  const [fundo, setFundo] = useState(false);
  const temHistorico = Boolean(history);
  useEffect(() => {
    if (fundo) return undefined;
    const espera = window.setTimeout(() => setFundo(true), temHistorico ? 900 : 3000);
    return () => window.clearTimeout(espera);
  }, [fundo, temHistorico]);
  return <div className="dashboard-react">
    {fundo && <Suspense fallback={null}><ThreeBackground /></Suspense>}
    <section className="dashboard-content">
      <header className="dashboard-heading"><div><p className="dashboard-eyebrow"><i /> MONITORAMENTO DE ATIVOS</p><h1>Decisões melhores começam com <em>visibilidade.</em></h1><p className="dashboard-lead">Monitore equipamentos e transforme dados em manutenção inteligente.</p></div><div className="dashboard-status"><div className="dashboard-status-actions">{config.exportUrl && <a className="dashboard-report-button" href={config.exportUrl}>↓ Exportar relatório</a>}<span className={`connection-pill ${status === 'Conectado' ? 'online' : ''}`}>{status}</span></div><small>Atualizado às {updatedAt}</small></div></header>
      <div className="dashboard-metrics">
        <MetricCard label="Ativos monitorados" value={<NumeroAnimado valor={metrics.total} />} note="Equipamentos cadastrados" icon="◉" />
        <MetricCard label="Em operação" value={<NumeroAnimado valor={metrics.operando} />} note="Ativos operacionais" icon="↗" />
        <MetricCard label="Alertas ativos" value={<NumeroAnimado valor={metrics.alertas} />} note="Precisam de acompanhamento" icon="!" tone="metric-critical" />
        <MetricCard label="Ordens abertas" value={<NumeroAnimado valor={metrics.os} />} note="Manutenções em andamento" icon="▤" tone="metric-warning" />
        <MetricCard label="Disponibilidade" value={availability} note="Índice da operação" icon="✓" />
      </div>
      <section className="trend-panel"><div className="trend-toolbar"><div><h2>Tendência dos parâmetros</h2><p>Leituras recentes e limites operacionais</p></div><label>Parâmetro<select value={parameterId} onChange={(event) => loadHistory(event.target.value)}>{config.parameters.map((parameter) => <option value={parameter.value} key={parameter.value}>{parameter.text}</option>)}</select></label></div><TrendChart history={history} /></section>
    </section>
  </div>;
}

const root = document.getElementById('dashboard-app');
if (root) createRoot(root).render(<DashboardErrorBoundary><Dashboard /></DashboardErrorBoundary>);
