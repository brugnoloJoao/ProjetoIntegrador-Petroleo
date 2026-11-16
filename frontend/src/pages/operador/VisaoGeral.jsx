import { useState } from "react";
import { Link } from "react-router-dom";
import { useOperador } from "./dadosOperador";
import StatusBadge, { classeDoStatus } from "./StatusBadge";
import Icone from "./Icones";
import Maquina3D from "./Maquina3D";

function Sparkline({ valores, cor = "#f5a623" }) {
  const min = Math.min(...valores);
  const max = Math.max(...valores);
  const span = max - min || 1;
  const pts = valores
    .map((v, idx) => {
      const x = (idx / (valores.length - 1)) * 78 + 2;
      const y = 26 - ((v - min) / span) * 20;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg width="82" height="30" viewBox="0 0 82 30" className="op-spark" aria-hidden="true">
      <polyline
        fill="none"
        stroke={cor}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={pts}
      />
    </svg>
  );
}

export default function VisaoGeral() {
  const {
    cadencia,
    setCadencia,
    choke,
    setChoke,
    falhaSimulada,
    simularFalha,
    normalizarPlanta,
    equipamentos,
    telemetria,
    sparkVazao,
    sparkWhp,
    tendencia,
  } = useOperador();

  const [presetCamera, setPresetCamera] = useState("geral");

  const wSvg = 960;
  const hSvg = 115;
  const whpPts = tendencia
    .map((d, i) => {
      const x = (i / (tendencia.length - 1)) * (wSvg - 24) + 12;
      const y = hSvg - 16 - ((d.whp - 34) / 28) * (hSvg - 32);
      return `${x.toFixed(1)},${Math.max(10, Math.min(hSvg - 10, y)).toFixed(1)}`;
    })
    .join(" ");

  const cargaPts = tendencia
    .map((d, i) => {
      const x = (i / (tendencia.length - 1)) * (wSvg - 24) + 12;
      const y = hSvg - 16 - ((d.carga - 75) / 55) * (hSvg - 32);
      return `${x.toFixed(1)},${Math.max(10, Math.min(hSvg - 10, y)).toFixed(1)}`;
    })
    .join(" ");

  return (
    <div className="op-scada-page">
      <section className="op-kpi-row">
        <article className="op-kpi-card">
          <div className="op-kpi-head">
            <span>VAZÃO LÍQUIDA (FT-110)</span>
            <span className="op-kpi-chip is-amber">+1.8%</span>
          </div>
          <div className="op-kpi-body">
            <div className="op-kpi-val">
              <strong>{telemetria.vazao.toLocaleString("pt-BR")}</strong>
              <small>bbl/d</small>
            </div>
            <Sparkline valores={sparkVazao} cor="#f5a623" />
          </div>
          <div className="op-kpi-foot">
            <span>ÓLEO LÍQ. {telemetria.oleoLiquido.toLocaleString("pt-BR")} bbl/d</span>
            <span>META: 1.400</span>
          </div>
        </article>

        <article className="op-kpi-card">
          <div className="op-kpi-head">
            <span>PRESSÃO CABEÇA WHP</span>
            <span className={`op-kpi-chip ${falhaSimulada ? "is-critico" : "is-ok"}`}>
              {falhaSimulada ? "ALTA" : "NOMINAL"}
            </span>
          </div>
          <div className="op-kpi-body">
            <div className="op-kpi-val">
              <strong>{telemetria.whp.toFixed(1)}</strong>
              <small>bar</small>
            </div>
            <Sparkline valores={sparkWhp} cor={falhaSimulada ? "#ef4444" : "#22c55e"} />
          </div>
          <div className="op-kpi-foot">
            <span>REVEST. CHP: {telemetria.chp.toFixed(1)} bar</span>
            <span>LIM: 55.0 bar</span>
          </div>
        </article>

        <article className="op-kpi-card">
          <div className="op-kpi-head">
            <span>CADÊNCIA BOMBEIO</span>
            <span className="op-kpi-chip is-amber">AUTO VFD</span>
          </div>
          <div className="op-kpi-body">
            <div className="op-kpi-val">
              <strong>{cadencia.toFixed(1)}</strong>
              <small>GPM</small>
            </div>
          </div>
          <div className="op-kpi-foot">
            <span>CARGA MOTOR: {telemetria.cargaMotor.toFixed(1)}%</span>
            <span>CURSO: {telemetria.cursoHaste.toFixed(2)} m</span>
          </div>
        </article>

        <article className="op-kpi-card">
          <div className="op-kpi-head">
            <span>BSW / CORTE DE ÁGUA</span>
            <span className="op-kpi-chip">LAB + INLINE</span>
          </div>
          <div className="op-kpi-body">
            <div className="op-kpi-val">
              <strong>{telemetria.bsw.toFixed(1)}</strong>
              <small>%</small>
            </div>
            <div className="op-mini-bars" aria-hidden="true">
              {[58, 72, 49, 84, 65, 92, 61, 76, 54, 68].map((h, i) => (
                <i key={i} style={{ height: `${h}%` }} />
              ))}
            </div>
          </div>
          <div className="op-kpi-foot">
            <span>H2S: 0{telemetria.h2s} ppm</span>
            <span>API: {telemetria.api.toFixed(1)}°</span>
          </div>
        </article>
      </section>

      <section className="op-workbench">
        <aside className="op-side-panel">
          <div className="op-box">
            <div className="op-box-head">
              <span>CONTROLE DE PROCESSO</span>
              <b className="is-amber">MODO REMOTO</b>
            </div>

            <div className="op-control-group">
              <div className="op-control-label">
                <span>Cadência UB-04</span>
                <strong className="is-amber">{cadencia.toFixed(1)} GPM</strong>
              </div>
              <input
                type="range"
                min="4"
                max="18"
                step="0.5"
                value={cadencia}
                onChange={(e) => setCadencia(Number(e.target.value))}
                className="op-slider"
              />
              <div className="op-slider-scale">
                <span>4.0 GPM</span>
                <span>NOM: 10.5</span>
                <span>18.0 GPM</span>
              </div>
            </div>

            <div className="op-control-group">
              <div className="op-control-label">
                <span>Choke ANM-07</span>
                <strong className="is-amber">{choke}%</strong>
              </div>
              <input
                type="range"
                min="15"
                max="100"
                step="1"
                value={choke}
                onChange={(e) => setChoke(Number(e.target.value))}
                className="op-slider"
              />
              <div className="op-slider-scale">
                <span>15%</span>
                <span>ABERTURA</span>
                <span>100%</span>
              </div>
            </div>

            <div className="op-control-actions">
              <button
                type="button"
                className={`op-btn-fault ${falhaSimulada ? "is-active" : ""}`}
                onClick={simularFalha}
              >
                <Icone nome="raio" tamanho={14} />
                SIMULAR FALHA / ALARME
              </button>

              <button
                type="button"
                className="op-btn-normalize"
                onClick={normalizarPlanta}
              >
                <Icone nome="check" tamanho={14} />
                NORMALIZAR PLANTA
              </button>
            </div>
          </div>

          <div className="op-box">
            <div className="op-box-head">
              <span>ATALHOS OPERACIONAIS</span>
            </div>
            <div className="op-quick-links">
              <Link to="/operador/monitoramento" className="op-quick-link">
                <span>Carta Dinamométrica &amp; Sensores</span>
                <b>→</b>
              </Link>
              <Link to="/operador/alertas" className="op-quick-link">
                <span>Central de Alarmes ISA-18.2</span>
                <b>→</b>
              </Link>
              <Link to="/operador/historico" className="op-quick-link">
                <span>Log de Auditoria &amp; CSV</span>
                <b>→</b>
              </Link>
            </div>
          </div>
        </aside>

        <div className="op-center-stage">
          <Maquina3D
            cadencia={cadencia}
            choke={choke}
            falhaSimulada={falhaSimulada}
            equipamentos={equipamentos}
            presetExterno={presetCamera}
          />
        </div>

        <aside className="op-side-panel">
          <div className="op-box">
            <div className="op-box-head">
              <span>MATRIZ DE INTEGRIDADE DE ATIVOS</span>
              <b>4 UNIDADES</b>
            </div>

            <div className="op-integrity-list">
              {equipamentos.map((eq) => {
                const stClass = classeDoStatus(eq.status);
                return (
                  <button
                    type="button"
                    key={eq.id}
                    className="op-integrity-item"
                    onClick={() => setPresetCamera(eq.presetCamera)}
                    title="Clique para focar este ativo no 3D"
                  >
                    <div className="op-integrity-top">
                      <div>
                        <strong>
                          <b>{eq.id}</b> {eq.nome}
                        </strong>
                        <small>{eq.subtitulo}</small>
                      </div>
                      <StatusBadge status={eq.status} texto={eq.statusLabel} />
                    </div>

                    <div className="op-integrity-bar-row">
                      <div className="op-integrity-track">
                        <div
                          className={`op-integrity-fill is-${stClass}`}
                          style={{ width: `${eq.integridade}%` }}
                        />
                      </div>
                      <span>IDR {eq.integridade}%</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="op-box">
            <div className="op-box-head">
              <span>PARÂMETROS DE ELEVAÇÃO (CRM)</span>
            </div>

            <div className="op-crm-grid">
              <div className="op-crm-cell">
                <span>PROF. BOMBA</span>
                <strong>{telemetria.profBomba.toLocaleString("pt-BR", { minimumFractionDigits: 1 })} m</strong>
              </div>
              <div className="op-crm-cell">
                <span>EFIC. VOLUMÉTRICA</span>
                <strong className="is-ok">{telemetria.eficVolumetrica.toFixed(1)}%</strong>
              </div>
              <div className="op-crm-cell">
                <span>TEMP. FLUIDO (THT)</span>
                <strong className={falhaSimulada ? "is-critico" : ""}>
                  {telemetria.tempFluido.toFixed(1)} °C
                </strong>
              </div>
              <div className="op-crm-cell">
                <span>NÍVEL DINÂMICO</span>
                <strong>{telemetria.nivelDinamico.toLocaleString("pt-BR", { minimumFractionDigits: 1 })} m</strong>
              </div>
            </div>
          </div>
        </aside>
      </section>

      <section className="op-box op-trend-box">
        <div className="op-box-head">
          <span>TENDÊNCIA TELEMETRIA CONTÍNUA // PRESSÃO CABEÇA (WHP) × CARGA HASTE POLIDA</span>
          <div className="op-trend-legend">
            <span>
              <i className="is-amber" /> WHP (bar)
            </span>
            <span>
              <i className="is-ok" /> Carga Haste (kN)
            </span>
            <b>JANELA: 60s</b>
          </div>
        </div>

        <svg
          viewBox={`0 0 ${wSvg} ${hSvg}`}
          className="op-trend-svg"
          preserveAspectRatio="none"
          aria-label="Gráfico de tendência contínua"
        >
          {[22, 56, 90].map((y) => (
            <line
              key={y}
              x1="0"
              y1={y}
              x2={wSvg}
              y2={y}
              stroke="#1f242d"
              strokeDasharray="4 4"
            />
          ))}
          <polyline
            fill="none"
            stroke="#f5a623"
            strokeWidth="2"
            points={whpPts}
          />
          <polyline
            fill="none"
            stroke="#22c55e"
            strokeWidth="1.8"
            points={cargaPts}
          />
        </svg>
      </section>
    </div>
  );
}