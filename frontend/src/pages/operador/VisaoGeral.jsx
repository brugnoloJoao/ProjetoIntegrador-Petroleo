import { Link } from "react-router-dom";
import {
  equipamentosOperador,
  alertasOperador,
} from "./dadosOperador";

export default function VisaoGeral() {
  const total = equipamentosOperador.length;

  const criticos = equipamentosOperador.filter(
    (e) => e.status === "Crítico"
  ).length;

  const alertas = equipamentosOperador.filter(
    (e) => e.status === "Alerta"
  ).length;

  const atencao = equipamentosOperador.filter(
    (e) => e.status !== "Normal"
  );

  return (
    <>
      <div className="op-heading">
        <span className="op-eyebrow">
          ● MONITORAMENTO OPERACIONAL
        </span>

        <h1>Visão geral</h1>

        <p>
          Acompanhe a situação dos equipamentos em operação.
        </p>
      </div>

      <div className="op-stats">
        <div className="op-stat">
          <span>EQUIPAMENTOS</span>
          <strong>
            {String(total).padStart(2, "0")}
          </strong>
          <small>Ativos monitorados</small>
        </div>

        <div className="op-stat">
          <span>EM ALERTA</span>
          <strong className="op-orange">
            {String(alertas).padStart(2, "0")}
          </strong>
          <small>Precisam de atenção</small>
        </div>

        <div className="op-stat">
          <span>CRÍTICOS</span>
          <strong className="op-red">
            {String(criticos).padStart(2, "0")}
          </strong>
          <small>Prioridade de verificação</small>
        </div>
      </div>

      <section className="op-panel">
        <div className="op-section-head">
          <div>
            <h2>Equipamentos em atenção</h2>
            <p>Ativos com alterações identificadas.</p>
          </div>

          <Link
            to="/operador/monitoramento"
            className="op-text-link"
          >
            Ver monitoramento →
          </Link>
        </div>

        {atencao.map((e) => (
          <div className="op-item" key={e.id}>
            <div>
              <strong>{e.nome}</strong>
              <small>
                {e.id} · {e.temperatura} °C
              </small>
            </div>

            <span
              className={`op-status ${
                e.status === "Crítico"
                  ? "critico"
                  : "alerta"
              }`}
            >
              {e.status}
            </span>
          </div>
        ))}
      </section>

      <p className="op-note">
        {alertasOperador.length} ocorrência(s)
        registrada(s).{" "}
        <Link to="/operador/alertas">
          Consultar alertas
        </Link>
      </p>
    </>
  );
}