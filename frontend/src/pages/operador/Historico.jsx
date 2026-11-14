import { useState } from "react";
import { historicoOperador } from "./dadosOperador";

export default function Historico() {
  const [busca, setBusca] = useState("");

  const registrosFiltrados = historicoOperador.filter(
    (registro) =>
      `${registro.equipamento} ${registro.evento}`
        .toLowerCase()
        .includes(busca.toLowerCase())
  );

  return (
    <>
      <div className="op-heading">
        <span className="op-eyebrow">
          ● REGISTROS OPERACIONAIS
        </span>

        <h1>Histórico</h1>

        <p>
          Consulte as ocorrências registradas no sistema.
        </p>
      </div>

      <section className="op-panel">
        <div className="op-section-head">
          <div>
            <h2>Histórico de eventos</h2>
            <p>
              Registros anteriores dos equipamentos.
            </p>
          </div>
        </div>

        <div className="op-filters">
          <input
            type="text"
            placeholder="Buscar por equipamento ou evento..."
            aria-label="Buscar no histórico"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>

        {registrosFiltrados.map((registro) => (
          <div className="op-item" key={registro.id}>
            <div>
              <strong>
                {registro.equipamento}
              </strong>

              <small>{registro.evento}</small>

              <small>
                {registro.data} · {registro.hora}
              </small>
            </div>

            <span
              className={`op-status ${
                registro.tipo === "Crítico"
                  ? "critico"
                  : registro.tipo === "Alerta"
                  ? "alerta"
                  : "normal"
              }`}
            >
              {registro.tipo}
            </span>
          </div>
        ))}

        {registrosFiltrados.length === 0 && (
          <p className="op-empty">
            Nenhum registro encontrado.
          </p>
        )}
      </section>
    </>
  );
}