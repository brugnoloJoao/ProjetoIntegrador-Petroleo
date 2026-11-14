import { useGestor } from "./GestorContext";

export default function Relatorios() {
  const { equipamentos, ordens } = useGestor();

  const aprovadas = ordens.filter(
    (o) => o.status === "Aprovada"
  ).length;

  const rejeitadas = ordens.filter(
    (o) => o.status === "Rejeitada"
  ).length;

  const pendentes = ordens.filter(
    (o) => o.status === "Aguardando aprovação"
  ).length;

  function exportarCSV() {
    const cabecalho = [
      "Ordem",
      "Equipamento",
      "Descricao",
      "Prioridade",
      "Status",
      "Data",
    ];

    const linhas = ordens.map((ordem) => [
      ordem.id,
      ordem.equipamento,
      ordem.descricao,
      ordem.prioridade,
      ordem.status,
      ordem.data,
    ]);

    const escapar = (valor) => {
      const texto = String(valor ?? "");

      // Evita interpretação de fórmulas ao abrir no Excel.
      const seguro = /^[=+\-@\t\r]/.test(texto)
        ? `'${texto}`
        : texto;

      return `"${seguro.replace(/"/g, '""')}"`;
    };

    const conteudo = [cabecalho, ...linhas]
      .map((linha) => linha.map(escapar).join(";"))
      .join("\r\n");

    const blob = new Blob(
      ["\uFEFF" + conteudo],
      { type: "text/csv;charset=utf-8;" }
    );

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "relatorio_petrosync.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
  }

  return (
    <>
      <div className="gst-heading">
        <span className="gst-eyebrow">
          ● RELATÓRIOS GERENCIAIS
        </span>

        <h1>Relatórios</h1>

        <p>
          Consulte os resultados e acompanhe as decisões.
        </p>
      </div>

      <div className="gst-stats">
        <div className="gst-stat">
          <span>ORDENS APROVADAS</span>
          <strong className="gst-green">
            {String(aprovadas).padStart(2, "0")}
          </strong>
          <small>Autorizações realizadas</small>
        </div>

        <div className="gst-stat">
          <span>ORDENS REJEITADAS</span>
          <strong className="gst-red">
            {String(rejeitadas).padStart(2, "0")}
          </strong>
          <small>Solicitações recusadas</small>
        </div>

        <div className="gst-stat">
          <span>AGUARDANDO DECISÃO</span>
          <strong className="gst-orange">
            {String(pendentes).padStart(2, "0")}
          </strong>
          <small>Solicitações pendentes</small>
        </div>
      </div>

      <section className="gst-panel">
        <div className="gst-section-head">
          <div>
            <h2>Resumo da manutenção</h2>
            <p>Informações gerais do sistema.</p>
          </div>

          <button
            type="button"
            className="gst-button"
            onClick={exportarCSV}
          >
            Exportar PDF
          </button>
        </div>

        <div className="gst-summary">
          <div>
            <span>Equipamentos monitorados</span>
            <strong>{equipamentos.length}</strong>
          </div>

          <div>
            <span>Ordens registradas</span>
            <strong>{ordens.length}</strong>
          </div>

          <div>
            <span>Equipamentos críticos</span>
            <strong>
              {
                equipamentos.filter(
                  (e) => e.status === "Crítico"
                ).length
              }
            </strong>
          </div>
        </div>
      </section>
    </>
  );
}
