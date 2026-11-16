import { useState } from "react";
import { useOperador } from "./dadosOperador";
import StatusBadge from "./StatusBadge";
import Icone from "./Icones";

const tipos = ["Todos", "Crítico", "Alerta", "Normal"];

export default function Historico() {
  const { historico } = useOperador();
  const [busca, setBusca] = useState("");
  const [tipo, setTipo] = useState("Todos");

  const filtrados = historico.filter((reg) => {
    const matchTexto = `${reg.equipamento} ${reg.evento} ${reg.responsavel}`
      .toLowerCase()
      .includes(busca.toLowerCase());
    const matchTipo = tipo === "Todos" || reg.tipo === tipo;
    return matchTexto && matchTipo;
  });

  const exportarCSV = () => {
    const linhas = [
      "Data;Hora;Equipamento;Evento;Responsavel;Tipo",
      ...filtrados.map(
        (r) =>
          `${r.data};${r.hora};${r.equipamento};"${r.evento}";"${r.responsavel}";${r.tipo}`
      ),
    ];
    const csv = "\uFEFF" + linhas.join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "petrosync_historico_et04.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="op-scada-page">
      <div className="op-page-banner">
        <div>
          <span className="op-eyebrow">RASTREABILIDADE OPERACIONAL</span>
          <h1>Histórico de Eventos &amp; Comandos</h1>
        </div>

        <div className="op-filters-inline">
          <input
            type="text"
            placeholder="Buscar ativo, evento ou operador..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
          <div className="op-tabs">
            {tipos.map((t) => (
              <button
                type="button"
                key={t}
                className={tipo === t ? "ativo" : ""}
                onClick={() => setTipo(t)}
              >
                {t}
              </button>
            ))}
          </div>
          <button type="button" className="op-btn-export" onClick={exportarCSV}>
            <Icone nome="download" tamanho={14} />
            EXPORTAR CSV
          </button>
        </div>
      </div>

      <section className="op-box">
        <div className="op-table-wrap">
          <table className="op-table">
            <thead>
              <tr>
                <th>DATA / HORA</th>
                <th>ATIVO</th>
                <th>DESCRIÇÃO DO EVENTO</th>
                <th>ORIGEM / OPERADOR</th>
                <th>CLASSIFICAÇÃO</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map((r) => (
                <tr key={r.id}>
                  <td className="op-mono">
                    {r.data} {r.hora}
                  </td>
                  <td className="op-mono is-amber">{r.equipamento}</td>
                  <td>{r.evento}</td>
                  <td>{r.responsavel}</td>
                  <td>
                    <StatusBadge status={r.tipo} />
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