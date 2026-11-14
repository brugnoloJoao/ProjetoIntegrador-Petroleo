
import { useState } from "react";
import { useGestor } from "./GestorContext";

export default function AprovacaoOrdens() {
  const { ordens, atualizarStatus } = useGestor();

  const [filtro, setFiltro] = useState("Todas");
  const [confirmacao, setConfirmacao] = useState(null);
  const [mensagem, setMensagem] = useState(null);
  const [processando, setProcessando] = useState(false);

  const ordensFiltradas = ordens.filter((ordem) => {
    if (filtro === "Todas") return true;
    return ordem.status === filtro;
  });

  function abrirConfirmacao(ordem, acao) {
    setMensagem(null);
    setConfirmacao({ ordem, acao });
  }

  function fecharConfirmacao() {
    if (!processando) {
      setConfirmacao(null);
    }
  }

  async function confirmarAcao() {
    if (!confirmacao || processando) return;

    const { ordem, acao } = confirmacao;

    const ordemAtual = ordens.find(
      (item) => item.id === ordem.id
    );

    if (
      !ordemAtual ||
      ordemAtual.status !== "Aguardando aprovação"
    ) {
      setMensagem({
        tipo: "erro",
        texto: "Esta ordem não está mais disponível para aprovação.",
      });
      setConfirmacao(null);
      return;
    }

    const novoStatus =
      acao === "aprovar" ? "Aprovada" : "Rejeitada";

    setProcessando(true);

    try {
      await atualizarStatus(ordem.id, novoStatus);

      setMensagem({
        tipo: "sucesso",
        texto:
          acao === "aprovar"
            ? `Ordem #${ordem.id} aprovada com sucesso!`
            : `Ordem #${ordem.id} rejeitada com sucesso!`,
      });

      setConfirmacao(null);
    } catch (erro) {
      console.error("Erro ao atualizar ordem:", erro);

      setMensagem({
        tipo: "erro",
        texto: "Não foi possível atualizar a ordem. Tente novamente.",
      });

      setConfirmacao(null);
    } finally {
      setProcessando(false);
    }
  }

  return (
    <>
      <div className="gst-heading">
        <span className="gst-eyebrow">
          ● CONTROLE DE MANUTENÇÃO
        </span>

        <h1>Aprovação de ordens</h1>

        <p>
          Analise e aprove as solicitações de manutenção.
        </p>
      </div>

      {/* MENSAGEM DE SUCESSO OU ERRO */}
      {mensagem && (
        <div
          className={`gst-feedback ${mensagem.tipo}`}
          role="alert"
        >
          <span>
            {mensagem.tipo === "sucesso" ? "✓" : "!"}
          </span>

          <p>{mensagem.texto}</p>

          <button
            type="button"
            onClick={() => setMensagem(null)}
            aria-label="Fechar mensagem"
          >
            ×
          </button>
        </div>
      )}

      <section className="gst-panel">
        <div className="gst-section-head">
          <div>
            <h2>Ordens de serviço</h2>
            <p>Solicitações enviadas para aprovação.</p>
          </div>

          <select
            className="gst-select"
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            aria-label="Filtrar ordens por status"
          >
            <option value="Todas">Todas</option>
            <option value="Aguardando aprovação">
              Pendentes
            </option>
            <option value="Aprovada">Aprovadas</option>
            <option value="Rejeitada">Rejeitadas</option>
          </select>
        </div>

        {ordensFiltradas.length === 0 ? (
          <p className="gst-empty">
            Nenhuma ordem encontrada.
          </p>
        ) : (
          ordensFiltradas.map((ordem) => (
            <div className="gst-order" key={ordem.id}>
              <div className="gst-order-top">
                <div>
                  <strong>
                    OS #{ordem.id} · {ordem.equipamento}
                  </strong>

                  <p>{ordem.descricao}</p>
                </div>

                <span
                  className={`gst-status ${
                    ordem.status === "Aprovada"
                      ? "aprovada"
                      : ordem.status === "Rejeitada"
                      ? "rejeitada"
                      : "pendente"
                  }`}
                >
                  {ordem.status}
                </span>
              </div>

              <div className="gst-order-bottom">
                <div className="gst-order-info">
                  <span>
                    Prioridade: <b>{ordem.prioridade}</b>
                  </span>

                  <span>Data: {ordem.data}</span>
                </div>

                {ordem.status ===
                  "Aguardando aprovação" && (
                  <div className="gst-actions">
                    <button
                      type="button"
                      className="gst-button secondary"
                      onClick={() =>
                        abrirConfirmacao(ordem, "rejeitar")
                      }
                    >
                      Rejeitar
                    </button>

                    <button
                      type="button"
                      className="gst-button"
                      onClick={() =>
                        abrirConfirmacao(ordem, "aprovar")
                      }
                    >
                      Aprovar ordem
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </section>

      {/* JANELA DE CONFIRMAÇÃO */}
      {confirmacao && (
        <div
          className="gst-modal-overlay"
          onClick={fecharConfirmacao}
        >
          <div
            className="gst-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="gst-modal-titulo"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="gst-modal-icon">
              {confirmacao.acao === "aprovar" ? "✓" : "!"}
            </div>

            <h2 id="gst-modal-titulo">
              {confirmacao.acao === "aprovar"
                ? "Confirmar aprovação"
                : "Confirmar rejeição"}
            </h2>

            <p>
              {confirmacao.acao === "aprovar"
                ? "Deseja realmente aprovar esta ordem de serviço?"
                : "Deseja realmente rejeitar esta ordem de serviço?"}
            </p>

            <div className="gst-modal-order">
              <strong>
                OS #{confirmacao.ordem.id}
              </strong>

              <span>
                {confirmacao.ordem.equipamento}
              </span>

              <small>
                {confirmacao.ordem.descricao}
              </small>
            </div>

            <div className="gst-modal-actions">
              <button
                type="button"
                className="gst-button secondary"
                onClick={fecharConfirmacao}
                disabled={processando}
              >
                Cancelar
              </button>

              <button
                type="button"
                className={`gst-button ${
                  confirmacao.acao === "rejeitar"
                    ? "danger"
                    : ""
                }`}
                onClick={confirmarAcao}
                disabled={processando}
              >
                {processando
                  ? "Processando..."
                  : confirmacao.acao === "aprovar"
                  ? "Confirmar aprovação"
                  : "Confirmar rejeição"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}