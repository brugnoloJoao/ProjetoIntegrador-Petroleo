import { useState } from "react";
import { useOperador, limites } from "./dadosOperador";
import StatusBadge, { classeDoStatus } from "./StatusBadge";

const fmt = (n) => n.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const opcoes = ["Todos", "Normal", "Alerta", "Crítico"];

function Medidor({ label, valor, limite }) {
  const { max, aviso, critico, unidade } = limite;
  const nivel = valor >= critico ? "critico" : valor >= aviso ? "alerta" : "normal";
  const pct = Math.min(100, (valor / max) * 100);

  return (
    <div className="op-meter">
      <div className="op-meter-head">
        <span>{label}</span>
        <strong>
          {fmt(valor)} <small>{unidade}</small>
        </strong>
      </div>
      <div className="op-meter-track">
        <div className={`op-meter-fill is-${nivel}`} style={{ width: `${pct}%` }} />
        <i
          className="op-meter-mark"
          style={{ left: `${(aviso / max) * 100}%` }}
          title={`Aviso: ${fmt(aviso)} ${unidade}`}
        />
      </div>
    </div>
  );
}

export default function Monitoramento() {
  const { equipamentos, telemetria, falhaSimulada } = useOperador();
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState("Todos");

  const filtrados = equipamentos.filter((e) => {
    const matchBusca = `${e.id} ${e.nome} ${e.setor}`
      .toLowerCase()
      .includes(busca.toLowerCase());
    const matchStatus = filtro === "Todos" || e.status === filtro;
    return matchBusca && matchStatus;
  });

  const dynoPath = falhaSimulada
    ? "M 45,145 L 70,58 L 195,52 L 245,88 L 265,135 L 220,152 L 45,145 Z"
    : "M 45,142 L 62,48 L 258,44 L 268,136 L 235,146 L 45,142 Z";

  return (
    <div className="op-scada-page">
      <div className="op-page-banner">
        <div>
          <span className="op-eyebrow">TELEMETRIA &amp; DIAGNÓSTICO MECÂNICO</span>
          <h1>Monitoramento de Sensores</h1>
        </div>
        <div className="op-filters-inline">
          <input
            type="text"
            placeholder="Filtrar tag ou equipamento..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
          <div className="op-tabs">
            {opcoes.map((op) => (
              <button
                type="button"
                key={op}
                className={filtro === op ? "ativo" : ""}
                onClick={() => setFiltro(op)}
              >
                {op}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="op-mon-grid">
        <div className="op-mon-cards">
          {filtrados.map((e) => (
            <article key={e.id} className={`op-box op-mon-card is-${classeDoStatus(e.status)}`}>
              <div className="op-mon-card-top">
                <div>
                  <span className="op-tag-amber">{e.id}</span>
                  <h3>{e.nome}</h3>
                  <small>{e.subtitulo}</small>
                </div>
                <StatusBadge status={e.status} texto={e.statusLabel} />
              </div>

              <div className="op-mon-meters">
                <Medidor label="TEMPERATURA MANCAL" valor={e.temperatura} limite={limites.temperatura} />
                <Medidor label="VIBRAÇÃO RADIAL RMS" valor={e.vibracao} limite={limites.vibracao} />
              </div>

              <div className="op-mon-foot">
                <span>SETOR: {e.setor}</span>
                <span>CARGA: {e.carga.toFixed(1)}%</span>
              </div>
            </article>
          ))}
        </div>

        <aside className="op-box op-dyno-box">
          <div className="op-box-head">
            <span>CARTA DINAMOMÉTRICA // UB-04</span>
            <b className={falhaSimulada ? "is-critico" : "is-ok"}>
              {falhaSimulada ? "INTERFERÊNCIA GÁS" : "CICLO NORMAL"}
            </b>
          </div>

          <svg viewBox="0 0 310 185" className="op-dyno-svg" aria-label="Carta Dinamométrica">
            {[40, 80, 120, 160].map((y) => (
              <line key={y} x1="30" y1={y} x2="290" y2={y} stroke="#1f242d" strokeDasharray="3 3" />
            ))}
            {[60, 120, 180, 240].map((x) => (
              <line key={x} x1={x} y1="20" x2={x} y2="165" stroke="#1f242d" strokeDasharray="3 3" />
            ))}
            <path
              d={dynoPath}
              fill={falhaSimulada ? "rgba(239,68,68,0.14)" : "rgba(245,166,35,0.14)"}
              stroke={falhaSimulada ? "#ef4444" : "#f5a623"}
              strokeWidth="2.2"
            />
            <text x="34" y="178" fill="#8b929e" fontSize="9">
              0,0 m (PMI)
            </text>
            <text x="236" y="178" fill="#8b929e" fontSize="9">
              3,1 m (PMS)
            </text>
          </svg>

          <div className="op-crm-grid">
            <div className="op-crm-cell">
              <span>CARGA MÁX. HASTE</span>
              <strong>{telemetria.cargaHasteKn.toFixed(1)} kN</strong>
            </div>
            <div className="op-crm-cell">
              <span>EFICIÊNCIA BOMBA</span>
              <strong className={falhaSimulada ? "is-critico" : "is-ok"}>
                {telemetria.eficVolumetrica.toFixed(1)}%
              </strong>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}