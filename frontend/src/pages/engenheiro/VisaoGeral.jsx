import { Link } from "react-router-dom";
import { useEngenheiro } from "./EngenheiroContext";

export default function VisaoGeral() {
  const { equipamentos, ordens } = useEngenheiro();

  const alertas = equipamentos.filter(
    (e) => e.status === "Alerta"
  ).length;

  const criticos = equipamentos.filter(
    (e) => e.status === "Crítico"
  ).length;

  const atencao = equipamentos.filter(
    (e) => e.status !== "Normal"
  );

  const ordensAbertas = ordens.filter(
    (o) => o.status !== "Concluída"
  ).length;

  return (
    <>
      <div className="eng-heading">
        <span className="eng-eyebrow">
          ● MONITORAMENTO DE ATIVOS
        </span>
        <h1>Visão geral</h1>
        <p>Acompanhe a situação dos equipamentos.</p>
      </div>

      <div className="eng-stats">
        <div className="eng-stat">
          <span>ATIVOS MONITORADOS</span>
          <strong>
            {String(equipamentos.length).padStart(2, "0")}
          </strong>
          <small>Equipamentos cadastrados</small>
        </div>

        <div className="eng-stat">
          <span>EM ALERTA</span>
          <strong className="eng-orange">
            {String(alertas).padStart(2, "0")}
          </strong>
          <small>Precisam de atenção</small>
        </div>

        <div className="eng-stat">
          <span>CRÍTICOS</span>
          <strong className="eng-red">
            {String(criticos).padStart(2, "0")}
          </strong>
          <small>Prioridade de manutenção</small>
        </div>
      </div>

      <section className="eng-panel">
        <div className="eng-section-head">
          <div>
            <h2>Equipamentos que precisam de atenção</h2>
            <p>Resumo dos ativos com anomalias.</p>
          </div>

          <Link
            to="/engenheiro/anomalias"
            className="eng-text-link"
          >
            Ver anomalias →
          </Link>
        </div>

        {atencao.length > 0 ? (
          atencao.map((e) => (
            <div className="eng-item" key={e.id}>
              <div>
                <strong>{e.nome}</strong>
                <small>
                  {e.id} · {e.temperatura} °C · {e.vibracao} mm/s
                </small>
              </div>

              <span
                className={`eng-status ${
                  e.status === "Crítico" ? "critico" : "alerta"
                }`}
              >
                {e.status}
              </span>
            </div>
          ))
        ) : (
          <p className="eng-empty">
            Nenhum equipamento em alerta.
          </p>
        )}
      </section>

      <p className="eng-note">
        {ordensAbertas} ordem(ns) de serviço em andamento.{" "}
        <Link to="/engenheiro/ordens">
          Consultar ordens
        </Link>
      </p>
    </>
  );
}