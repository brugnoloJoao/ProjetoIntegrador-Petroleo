import { useState } from "react";
import { useEngenheiro } from "./EngenheiroContext";

export default function OrdensServico() {
  const {
    ordens,
    equipamentos,
    criarOrdem,
    atualizarOrdem,
  } = useEngenheiro();

  const [aberto, setAberto] = useState(false);
  const [equipamento, setEquipamento] = useState("");
  const [descricao, setDescricao] = useState("");

  function salvar(evento) {
    evento.preventDefault();

    if (!equipamento || !descricao.trim()) return;

    criarOrdem(equipamento, descricao.trim());

    setEquipamento("");
    setDescricao("");
    setAberto(false);
  }

  return (
    <>
      <div className="eng-heading">
        <span className="eng-eyebrow">
          ● PLANEJAMENTO DE MANUTENÇÃO
        </span>
        <h1>Ordens de serviço</h1>
        <p>Organize e acompanhe as manutenções.</p>
      </div>

      <section className="eng-panel">
        <div className="eng-section-head">
          <div>
            <h2>Ordens registradas</h2>
            <p>{ordens.length} ordem(ns) no sistema</p>
          </div>

          <button
            className="eng-button"
            onClick={() => setAberto(!aberto)}
          >
            {aberto ? "Cancelar" : "+ Nova ordem"}
          </button>
        </div>

        {aberto && (
          <form
            className="eng-form eng-form-order"
            onSubmit={salvar}
          >
            <label>
              Equipamento
              <select
                required
                value={equipamento}
                onChange={(e) =>
                  setEquipamento(e.target.value)
                }
              >
                <option value="">Selecione...</option>

                {equipamentos.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.nome} ({e.id})
                  </option>
                ))}
              </select>
            </label>

            <label>
              Descrição
              <textarea
                required
                rows="3"
                value={descricao}
                onChange={(e) =>
                  setDescricao(e.target.value)
                }
                placeholder="Descreva o serviço necessário..."
              />
            </label>

            <button className="eng-button" type="submit">
              Criar ordem
            </button>
          </form>
        )}

        {ordens.map((ordem) => (
          <div
            className="eng-item eng-order"
            key={ordem.id}
          >
            <div>
              <strong>
                OS #{String(ordem.id).slice(-6)} ·{" "}
                {ordem.equipamento}
              </strong>
              <small>{ordem.descricao}</small>
            </div>

            <label className="eng-order-status">
              <span>Status</span>

              <select
                value={ordem.status}
                onChange={(e) =>
                  atualizarOrdem(ordem.id, e.target.value)
                }
              >
                <option>Pendente</option>
                <option>Em andamento</option>
                <option>Concluída</option>
              </select>
            </label>
          </div>
        ))}

        {!ordens.length && (
          <p className="eng-empty">
            Nenhuma ordem registrada.
          </p>
        )}
      </section>
    </>
  );
}