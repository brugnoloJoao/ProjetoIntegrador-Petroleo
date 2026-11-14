import { useGestor } from "./GestorContext";

export default function Indicadores() {
  const { equipamentos, ordens } = useGestor();

  const total = equipamentos.length;

  const situacoes = [
    {
      nome: "Normal",
      quantidade: equipamentos.filter(
        (e) => e.status === "Normal"
      ).length,
      classe: "normal",
    },
    {
      nome: "Alerta",
      quantidade: equipamentos.filter(
        (e) => e.status === "Alerta"
      ).length,
      classe: "alerta",
    },
    {
      nome: "Crítico",
      quantidade: equipamentos.filter(
        (e) => e.status === "Crítico"
      ).length,
      classe: "critico",
    },
  ];

  const statusOrdens = [
    {
      nome: "Aguardando aprovação",
      quantidade: ordens.filter(
        (o) => o.status === "Aguardando aprovação"
      ).length,
      classe: "alerta",
    },
    {
      nome: "Aprovadas",
      quantidade: ordens.filter(
        (o) => o.status === "Aprovada"
      ).length,
      classe: "normal",
    },
    {
      nome: "Rejeitadas",
      quantidade: ordens.filter(
        (o) => o.status === "Rejeitada"
      ).length,
      classe: "critico",
    },
  ];

  return (
    <>
      <div className="gst-heading">
        <span className="gst-eyebrow">
          ● ANÁLISE GERENCIAL
        </span>

        <h1>Indicadores</h1>

        <p>
          Visualize a situação dos ativos e das manutenções.
        </p>
      </div>

      <div className="gst-two-columns">
        <section className="gst-panel">
          <div className="gst-section-head">
            <div>
              <h2>Situação dos equipamentos</h2>
              <p>Distribuição por status.</p>
            </div>
          </div>

          <div className="gst-bars">
            {situacoes.map((item) => (
              <div className="gst-bar-item" key={item.nome}>
                <div className="gst-bar-label">
                  <span>{item.nome}</span>
                  <strong>{item.quantidade}</strong>
                </div>

                <div className="gst-bar-track">
                  <div
                    className={`gst-bar-fill ${item.classe}`}
                    style={{
                      width:
                        total > 0
                          ? `${(item.quantidade / total) * 100}%`
                          : "0%",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="gst-panel">
          <div className="gst-section-head">
            <div>
              <h2>Status das ordens</h2>
              <p>Resumo das decisões realizadas.</p>
            </div>
          </div>

          <div className="gst-bars">
            {statusOrdens.map((item) => (
              <div className="gst-bar-item" key={item.nome}>
                <div className="gst-bar-label">
                  <span>{item.nome}</span>
                  <strong>{item.quantidade}</strong>
                </div>

                <div className="gst-bar-track">
                  <div
                    className={`gst-bar-fill ${item.classe}`}
                    style={{
                      width:
                        ordens.length > 0
                          ? `${
                              (item.quantidade / ordens.length) *
                              100
                            }%`
                          : "0%",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
