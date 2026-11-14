import { useState } from "react";
import { useEngenheiro } from "./EngenheiroContext";

const series = {
  temperatura: [47, 49, 48, 53, 52, 59, 57, 64, 61, 69, 71, 78],
  vibracao: [2.1, 2.4, 2.3, 2.7, 3.1, 2.9, 3.6, 3.8, 4.1, 4.5, 4.8, 5.1],
};

export default function Historico() {
  const { equipamentos } = useEngenheiro();

  const [codigo, setCodigo] = useState("BP-02");
  const [medida, setMedida] = useState("temperatura");

  const valores = series[medida];
  const minimo = medida === "temperatura" ? 35 : 0;
  const maximo = medida === "temperatura" ? 100 : 10;

  const pontos = valores
    .map((valor, index) => {
      const x = 35 + index * 49;
      const y =
        185 - ((valor - minimo) / (maximo - minimo)) * 155;

      return `${x},${y}`;
    })
    .join(" ");

  return (
    <>
      <div className="eng-heading">
        <span className="eng-eyebrow">
          ● ANÁLISE DE DADOS
        </span>
        <h1>Histórico</h1>
        <p>
          Visualize a evolução dos indicadores dos equipamentos.
        </p>
      </div>

      <section className="eng-panel">
        <div className="eng-section-head">
          <div>
            <h2>Histórico de funcionamento</h2>
            <p>Dados ilustrativos das últimas 12 horas.</p>
          </div>
        </div>

        <div className="eng-controls">
          <label>
            Equipamento
            <select
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
            >
              {equipamentos.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.nome} ({e.id})
                </option>
              ))}
            </select>
          </label>

          <label>
            Indicador
            <select
              value={medida}
              onChange={(e) => setMedida(e.target.value)}
            >
              <option value="temperatura">
                Temperatura (°C)
              </option>
              <option value="vibracao">
                Vibração (mm/s)
              </option>
            </select>
          </label>
        </div>

        <div className="eng-graph">
          <svg
            viewBox="0 0 610 210"
            preserveAspectRatio="none"
            role="img"
            aria-label={`Gráfico ilustrativo de ${medida}`}
          >
            <defs>
              <linearGradient
                id="eng-chart-fill"
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop
                  offset="0"
                  stopColor="#f5aa32"
                  stopOpacity=".22"
                />
                <stop
                  offset="1"
                  stopColor="#f5aa32"
                  stopOpacity="0"
                />
              </linearGradient>
            </defs>

            {[45, 95, 145, 185].map((y) => (
              <line
                key={y}
                x1="25"
                x2="590"
                y1={y}
                y2={y}
                stroke="#303744"
                strokeDasharray="4 6"
              />
            ))}

            <polygon
              points={`35,185 ${pontos} 574,185`}
              fill="url(#eng-chart-fill)"
            />

            <polyline
              points={pontos}
              fill="none"
              stroke="#f5aa32"
              strokeWidth="3"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          </svg>
        </div>

        <div className="eng-chart-axis">
          <span>00h</span>
          <span>04h</span>
          <span>08h</span>
          <span>12h</span>
        </div>
      </section>
    </>
  );
}