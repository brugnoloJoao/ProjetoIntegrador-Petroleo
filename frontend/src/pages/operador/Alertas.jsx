import { useState } from "react";
import { useOperador } from "./dadosOperador";
import StatusBadge from "./StatusBadge";
import Icone from "./Icones";

const opcoes = ["Todos", "Crítico", "Alerta"];
const dois = (n) => String(n).padStart(2, "0");

export default function Alertas() {
  const { alertas, reconhecerAlerta } = useOperador();
  const [filtro, setFiltro] = useState("Todos");

  const filtrados = alertas.filter(
    (a) => filtro === "Todos" || a.gravidade === filtro
  );

  const criticos = alertas.filter((a) => a.gravidade === "Crítico").length;
  const pendentes = alertas.filter((a) => !a.reconhecido).length;

  return (
    <div className="op-scada-page">
      <div className="op-page-banner">
        <div>
          <span className="op-eyebrow">GESTÃO DE ANOMALIAS // NORMA ISA-18.2</span>
          <h1>Central de Alarmes Operacionais</h1>
        </div>

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

      <section className="op-kpi-row op-kpi-row-3">
        <article className="op-kpi-card">
          <div className="op-kpi-head">
            <span>TOTAL DE OCORRÊNCIAS</span>
          </div>
          <div className="op-kpi-val">
            <strong>{dois(alertas.length)}</strong>
            <small>registros no turno</small>
          </div>
        </article>

        <article className="op-kpi-card">
          <div className="op-kpi-head">
            <span>AGUARDANDO CIÊNCIA (ACK)</span>
          </div>
          <div className="op-kpi-val">
            <strong className={pendentes > 0 ? "is-amber" : "is-ok"}>{dois(pendentes)}</strong>
            <small>pendentes</small>
          </div>
        </article>

        <article className="op-kpi-card">
          <div className="op-kpi-head">
            <span>SEVERIDADE CRÍTICA</span>
          </div>
          <div className="op-kpi-val">
            <strong className={criticos > 0 ? "is-critico" : ""}>{dois(criticos)}</strong>
            <small>prioridade 1</small>
          </div>
        </article>
      </section>

      <section className="op-box">
        <div className="op-box-head">
          <span>LISTA DE ALARMES ATIVOS E RECONHECIDOS</span>
          <b>{filtrados.length} EXIBIDOS</b>
        </div>

        <div className="op-table-wrap">
          <table className="op-table">
            <thead>
              <tr>
                <th>TAG</th>
                <th>DATA / HORA</th>
                <th>EQUIPAMENTO</th>
                <th>DESCRIÇÃO TÉCNICA</th>
                <th>GRAVIDADE</th>
                <th>AÇÃO</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map((alerta) => (
                <tr key={alerta.id}>
                  <td className="op-mono is-amber">{alerta.tag}</td>
                  <td className="op-mono">
                    {alerta.data} {alerta.hora}
                  </td>
                  <td>
                    <strong>{alerta.equipamento}</strong>
                    <small>{alerta.nomeEquipamento}</small>
                  </td>
                  <td>{alerta.descricao}</td>
                  <td>
                    <StatusBadge status={alerta.gravidade} />
                  </td>
                  <td>
                    {alerta.reconhecido ? (
                      <span className="op-ack-ok">
                        <Icone nome="check" tamanho={13} /> ACK OK
                      </span>
                    ) : (
                      <button
                        type="button"
                        className="op-btn-ack"
                        onClick={() => reconhecerAlerta(alerta.id)}
                      >
                        RECONHECER (ACK)
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}