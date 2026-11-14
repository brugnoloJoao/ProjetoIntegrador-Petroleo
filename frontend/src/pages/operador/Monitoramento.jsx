import { useState } from "react";
import { equipamentosOperador } from "./dadosOperador";

export default function Monitoramento() {
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState("Todos");

  const equipamentosFiltrados = equipamentosOperador.filter(
    (equipamento) => {
      const correspondeBusca =
        `${equipamento.id} ${equipamento.nome}`
          .toLowerCase()
          .includes(busca.toLowerCase());

      const correspondeStatus =
        filtro === "Todos" || equipamento.status === filtro;

      return correspondeBusca && correspondeStatus;
    }
  );

  return (
    <>
      <div className="op-heading">
        <span className="op-eyebrow">
          ● ACOMPANHAMENTO DE ATIVOS
        </span>

        <h1>Monitoramento</h1>

        <p>
          Consulte as condições dos equipamentos.
        </p>
      </div>

      <section className="op-panel">
        <div className="op-section-head">
          <div>
            <h2>Equipamentos monitorados</h2>
            <p>
              Temperatura, vibração e situação operacional.
            </p>
          </div>
        </div>

        <div className="op-filters">
          <input
            type="text"
            placeholder="Buscar equipamento..."
            aria-label="Buscar equipamento"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />

          <select
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            aria-label="Filtrar por status"
          >
            <option value="Todos">Todos os status</option>
            <option value="Normal">Normal</option>
            <option value="Alerta">Alerta</option>
            <option value="Crítico">Crítico</option>
          </select>
        </div>

        <div className="op-equipment-list">
          {equipamentosFiltrados.map((equipamento) => (
            <div
              className="op-equipment"
              key={equipamento.id}
            >
              <div className="op-equipment-top">
                <div>
                  <strong>{equipamento.nome}</strong>
                  <small>{equipamento.id}</small>
                </div>

                <span
                  className={`op-status ${
                    equipamento.status === "Crítico"
                      ? "critico"
                      : equipamento.status === "Alerta"
                      ? "alerta"
                      : "normal"
                  }`}
                >
                  {equipamento.status}
                </span>
              </div>

              <div className="op-readings">
                <div>
                  <span>TEMPERATURA</span>
                  <strong>
                    {equipamento.temperatura}
                    <small> °C</small>
                  </strong>
                </div>

                <div>
                  <span>VIBRAÇÃO</span>
                  <strong>
                    {equipamento.vibracao}
                    <small> mm/s</small>
                  </strong>
                </div>
              </div>
            </div>
          ))}

          {equipamentosFiltrados.length === 0 && (
            <p className="op-empty">
              Nenhum equipamento encontrado.
            </p>
          )}
        </div>
      </section>
    </>
  );
}