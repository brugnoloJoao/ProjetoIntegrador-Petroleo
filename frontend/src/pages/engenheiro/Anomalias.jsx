import { useNavigate } from "react-router-dom";
import { useEngenheiro } from "./EngenheiroContext";

export default function Anomalias() {
  const { anomalias, criarOrdem } = useEngenheiro();
  const navigate = useNavigate();

  function abrirOrdem(item) {
    criarOrdem(
      item.equipamento,
      `Investigar: ${item.descricao}`
    );

    navigate("/engenheiro/ordens");
  }

  return (
    <>
      <div className="eng-heading">
        <span className="eng-eyebrow">
          ● MONITORAMENTO DE RISCOS
        </span>
        <h1>Anomalias</h1>
        <p>
          Confira os problemas identificados nos equipamentos.
        </p>
      </div>

      <section className="eng-panel">
        <div className="eng-section-head">
          <div>
            <h2>Alertas registrados</h2>
            <p>Ocorrências que precisam de análise.</p>
          </div>
        </div>

        {anomalias.map((item) => (
          <div
            className="eng-item eng-alert-row"
            key={item.id}
          >
            <div>
              <div className="eng-inline">
                <strong>{item.equipamento}</strong>

                <span
                  className={`eng-status ${
                    item.gravidade === "Crítico"
                      ? "critico"
                      : "alerta"
                  }`}
                >
                  {item.gravidade}
                </span>
              </div>

              <small>
                {item.descricao} · {item.data}
              </small>
            </div>

            <button
              className="eng-button secondary"
              onClick={() => abrirOrdem(item)}
            >
              Abrir ordem
            </button>
          </div>
        ))}
      </section>
    </>
  );
}