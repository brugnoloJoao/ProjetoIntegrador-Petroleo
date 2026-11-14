import { Link } from "react-router-dom";
import { useGestor } from "./GestorContext";

export default function VisaoGeral() {
  const { equipamentos, ordens } = useGestor();

  const criticos = equipamentos.filter(
    (e) => e.status === "Crítico"
  ).length;

  const pendentes = ordens.filter(
    (o) => o.status === "Aguardando aprovação"
  );

  const aprovadas = ordens.filter(
    (o) => o.status === "Aprovada"
  ).length;

  return (
    <>
      <div className="gst-heading">
        <span className="gst-eyebrow">
          ● PAINEL GERENCIAL
        </span>

        <h1>Visão geral</h1>

        <p>
          Acompanhe os principais indicadores da manutenção.
        </p>
      </div>

      <div className="gst-stats">
        <div className="gst-stat">
          <span>EQUIPAMENTOS</span>
          <strong>
            {String(equipamentos.length).padStart(2, "0")}
          </strong>
          <small>Ativos monitorados</small>
        </div>

        <div className="gst-stat">
          <span>ATIVOS CRÍTICOS</span>
          <strong className="gst-red">
            {String(criticos).padStart(2, "0")}
          </strong>
          <small>Precisam de atenção</small>
        </div>

        <div className="gst-stat">
          <span>ORDENS PENDENTES</span>
          <strong className="gst-orange">
            {String(pendentes.length).padStart(2, "0")}
          </strong>
          <small>Aguardando aprovação</small>
        </div>
      </div>

      <section className="gst-panel">
        <div className="gst-section-head">
          <div>
            <h2>Solicitações recentes</h2>
            <p>Ordens aguardando sua decisão.</p>
          </div>

          <Link
            to="/gestor/aprovacoes"
            className="gst-text-link"
          >
            Ver todas →
          </Link>
        </div>

        {pendentes.length === 0 ? (
          <p className="gst-empty">
            Nenhuma solicitação pendente.
          </p>
        ) : (
          pendentes.slice(0, 3).map((ordem) => (
            <div className="gst-item" key={ordem.id}>
              <div>
                <strong>
                  OS #{ordem.id} · {ordem.equipamento}
                </strong>
                <small>{ordem.descricao}</small>
              </div>

              <span className="gst-status pendente">
                Pendente
              </span>
            </div>
          ))
        )}
      </section>

      <p className="gst-note">
        {aprovadas} ordem(ns) aprovadas até o momento.
      </p>
    </>
  );
}
