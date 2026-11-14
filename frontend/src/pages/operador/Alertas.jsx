import { useState } from "react";
import { alertasOperador } from "./dadosOperador";

export default function Alertas() {
  const [filtro, setFiltro] = useState("Todos");

  const alertasFiltrados = alertasOperador.filter(
    (alerta) =>
      filtro === "Todos" || alerta.gravidade === filtro
  );

  const criticos = alertasOperador.filter(
    (alerta) => alerta.gravidade === "Crítico"
  ).length;

  return (
    <>
      <div className="op-heading">
        <span className="op-eyebrow">
          ● CONTROLE DE OCORRÊNCIAS
        </span>

        <h1>Alertas</h1>

        <p>
          Acompanhe os problemas identificados pelos sensores.
        </p>
      </div>

      <div className="op-stats op-stats-two">
        <div className="op-stat">
          <span>TOTAL DE ALERTAS</span>
          <strong className="op-orange">
            {String(alertasOperador.length).padStart(2, "0")}
          </strong>
          <small>Ocorrências registradas</small>
        </div>

        <div className="op-stat">
          <span>ALERTAS CRÍTICOS</span>
          <strong className="op-red">
            {String(criticos).padStart(2, "0")}
          </strong>
          <small>Prioridade de atenção</small>
        </div>
      </div>

      <section className="op-panel">
        <div className="op-section-head">
          <div>
            <h2>Alertas registrados</h2>
            <p>Ocorrências recentes dos equipamentos.</p>
          </div>

          <select
            className="op-select"
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            aria-label="Filtrar alertas"
          >
            <option value="Todos">Todos</option>
            <option value="Alerta">Alertas</option>
            <option value="Crítico">Críticos</option>
          </select>
        </div>

        {alertasFiltrados.map((alerta) => (
          <div className="op-item" key={alerta.id}>
            <div>
              <strong>
                {alerta.equipamento}
              </strong>

              <small>{alerta.descricao}</small>

              <small>
                {alerta.data} às {alerta.hora}
              </small>
            </div>

            <span
              className={`op-status ${
                alerta.gravidade === "Crítico"
                  ? "critico"
                  : "alerta"
              }`}
            >
              {alerta.gravidade}
            </span>
          </div>
        ))}

        {alertasFiltrados.length === 0 && (
          <p className="op-empty">
            Nenhum alerta encontrado.
          </p>
        )}
      </section>
    </>
  );
}