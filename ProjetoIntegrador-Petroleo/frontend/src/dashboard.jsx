import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { CategoryScale, Chart, Filler, Legend, LineController, LineElement, LinearScale, PointElement, Tooltip } from 'chart.js';
import * as signalR from '@microsoft/signalr';
import './dashboard.css';
import './dashboard-resilience.css';

const ThreeBackground = React.lazy(() => import('./three-background.jsx'));

Chart.register(CategoryScale, Filler, Legend, LineController, LineElement, LinearScale, PointElement, Tooltip);

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
      if (response.ok) setHistory(await response.json());
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
      if (point) setHistory((current) => current ? ({ ...current, pontos: [...current.pontos, { t: new Date(point.dataHora).toLocaleTimeString('pt-BR'), v: point.valor }].slice(-60) }) : current);
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
  const canvas = useRef(null);
  const chart = useRef(null);
  useEffect(() => {
    if (!history || !canvas.current) return undefined;
    chart.current?.destroy();
    const context = canvas.current.getContext('2d');
    const fill = context.createLinearGradient(0, 0, 0, 330);
    fill.addColorStop(0, 'rgba(245,170,50,.19)'); fill.addColorStop(1, 'rgba(245,170,50,0)');
    const labels = history.pontos.map((point) => point.t);
    chart.current = new Chart(context, { type: 'line', data: { labels, datasets: [
      { label: `${history.nome} (${history.unidade})`, data: history.pontos.map((point) => point.v), borderColor: '#f5aa32', backgroundColor: fill, fill: true, tension: .35, pointRadius: 0, pointHoverRadius: 5, borderWidth: 2 },
      { label: 'Atenção', data: labels.map(() => history.atencao), borderColor: '#e3bd73', borderDash: [6, 5], pointRadius: 0, borderWidth: 1 },
      { label: 'Crítico', data: labels.map(() => history.critico), borderColor: '#ef7777', borderDash: [6, 5], pointRadius: 0, borderWidth: 1 },
    ] }, options: { responsive: true, maintainAspectRatio: false, animation: false, interaction: { mode: 'index', intersect: false }, plugins: { legend: { position: 'bottom', align: 'start', labels: { usePointStyle: true, color: '#aab3c0', font: { family: 'Inter, Arial', size: 12 }, padding: 20 } }, tooltip: { backgroundColor: '#11151c', padding: 12, cornerRadius: 8 } }, scales: { x: { grid: { display: false }, ticks: { color: '#919bad', maxTicksLimit: 8 } }, y: { title: { display: true, text: history.unidade, color: '#919bad' }, grid: { color: 'rgba(145,155,173,.12)' }, ticks: { color: '#919bad' } } } } });
    return () => chart.current?.destroy();
  }, [history]);
  return <div className="dashboard-chart">{history?.pontos?.length ? <canvas ref={canvas} /> : <div className="dashboard-empty">Selecione um parâmetro com leituras para visualizar a tendência.</div>}</div>;
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
  const availability = useMemo(() => metrics.disp == null ? '—' : `${Number(metrics.disp).toFixed(1)}%`, [metrics.disp]);
  return <div className="dashboard-react">
    <Suspense fallback={null}><ThreeBackground /></Suspense>
    <section className="dashboard-content">
      <header className="dashboard-heading"><div><p className="dashboard-eyebrow"><i /> MONITORAMENTO DE ATIVOS</p><h1>Decisões melhores começam com <em>visibilidade.</em></h1><p className="dashboard-lead">Monitore equipamentos e transforme dados em manutenção inteligente.</p></div><div className="dashboard-status"><span className={`connection-pill ${status === 'Conectado' ? 'online' : ''}`}>{status}</span><small>Atualizado às {updatedAt}</small></div></header>
      <div className="dashboard-metrics">
        <MetricCard label="Ativos monitorados" value={metrics.total} note="Equipamentos cadastrados" icon="◉" />
        <MetricCard label="Em operação" value={metrics.operando} note="Ativos operacionais" icon="↗" />
        <MetricCard label="Alertas ativos" value={metrics.alertas} note="Precisam de acompanhamento" icon="!" tone="metric-critical" />
        <MetricCard label="Ordens abertas" value={metrics.os} note="Manutenções em andamento" icon="▤" tone="metric-warning" />
        <MetricCard label="Disponibilidade" value={availability} note="Índice da operação" icon="✓" />
      </div>
      <section className="trend-panel"><div className="trend-toolbar"><div><h2>Tendência dos parâmetros</h2><p>Leituras recentes e limites operacionais</p></div><label>Parâmetro<select value={parameterId} onChange={(event) => loadHistory(event.target.value)}>{config.parameters.map((parameter) => <option value={parameter.value} key={parameter.value}>{parameter.text}</option>)}</select></label></div><TrendChart history={history} /></section>
    </section>
  </div>;
}

const root = document.getElementById('dashboard-app');
if (root) createRoot(root).render(<DashboardErrorBoundary><Dashboard /></DashboardErrorBoundary>);
