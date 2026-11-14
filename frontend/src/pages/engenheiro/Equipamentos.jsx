import { useState } from "react";
import { useEngenheiro } from "./EngenheiroContext";

const vazio = {
  id: "",
  nome: "",
  temperatura: 50,
  vibracao: 2,
  status: "Normal",
};

export default function Equipamentos() {
  const { equipamentos, salvarEquipamento } = useEngenheiro();

  const [busca, setBusca] = useState("");
  const [formulario, setFormulario] = useState(null);
  const [editando, setEditando] = useState(false);
  const [erro, setErro] = useState("");

  const filtrados = equipamentos.filter((e) =>
    `${e.id} ${e.nome}`
      .toLowerCase()
      .includes(busca.toLowerCase())
  );

  function abrir(equipamento) {
    setFormulario(
      equipamento ? { ...equipamento } : { ...vazio }
    );
    setEditando(Boolean(equipamento));
    setErro("");
  }

  function salvar(evento) {
    evento.preventDefault();

    const id = formulario.id.trim().toUpperCase();
    const nome = formulario.nome.trim();

    if (!id || !nome) {
      setErro("Preencha o código e o nome.");
      return;
    }

    if (
      !editando &&
      equipamentos.some((e) => e.id === id)
    ) {
      setErro("Já existe um equipamento com esse código.");
      return;
    }

    salvarEquipamento({
      ...formulario,
      id,
      nome,
      temperatura: Number(formulario.temperatura),
      vibracao: Number(formulario.vibracao),
    });

    setFormulario(null);
  }

  return (
    <>
      <div className="eng-heading">
        <span className="eng-eyebrow">
          ● GESTÃO DE ATIVOS
        </span>
        <h1>Equipamentos</h1>
        <p>
          Consulte e organize os equipamentos cadastrados.
        </p>
      </div>

      <section className="eng-panel">
        <div className="eng-section-head">
          <div>
            <h2>Lista de equipamentos</h2>
            <p>{equipamentos.length} ativos cadastrados</p>
          </div>

          <button
            className="eng-button"
            onClick={() => abrir(null)}
          >
            + Novo equipamento
          </button>
        </div>

        <input
          className="eng-search"
          placeholder="Buscar por nome ou código..."
          aria-label="Buscar equipamentos"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />

        {filtrados.map((e) => (
          <div className="eng-item" key={e.id}>
            <div>
              <strong>{e.nome}</strong>
              <small>
                {e.id} · {e.temperatura} °C · {e.vibracao} mm/s
              </small>
            </div>

            <div className="eng-inline">
              <span
                className={`eng-status ${
                  e.status === "Crítico"
                    ? "critico"
                    : e.status === "Alerta"
                    ? "alerta"
                    : "normal"
                }`}
              >
                {e.status}
              </span>

              <button
                className="eng-button secondary"
                onClick={() => abrir(e)}
              >
                Editar
              </button>
            </div>
          </div>
        ))}

        {!filtrados.length && (
          <p className="eng-empty">
            Nenhum equipamento encontrado.
          </p>
        )}
      </section>

      {formulario && (
        <section className="eng-panel">
          <div className="eng-section-head">
            <h2>
              {editando
                ? "Editar equipamento"
                : "Cadastrar equipamento"}
            </h2>

            <button
              className="eng-button secondary"
              onClick={() => setFormulario(null)}
            >
              Fechar
            </button>
          </div>

          <form className="eng-form" onSubmit={salvar}>
            <label>
              Código
              <input
                required
                disabled={editando}
                value={formulario.id}
                onChange={(e) =>
                  setFormulario({
                    ...formulario,
                    id: e.target.value,
                  })
                }
              />
            </label>

            <label>
              Nome
              <input
                required
                value={formulario.nome}
                onChange={(e) =>
                  setFormulario({
                    ...formulario,
                    nome: e.target.value,
                  })
                }
              />
            </label>

            <label>
              Temperatura (°C)
              <input
                type="number"
                min="0"
                step="0.1"
                required
                value={formulario.temperatura}
                onChange={(e) =>
                  setFormulario({
                    ...formulario,
                    temperatura: e.target.value,
                  })
                }
              />
            </label>

            <label>
              Vibração (mm/s)
              <input
                type="number"
                min="0"
                step="0.1"
                required
                value={formulario.vibracao}
                onChange={(e) =>
                  setFormulario({
                    ...formulario,
                    vibracao: e.target.value,
                  })
                }
              />
            </label>

            <label>
              Status
              <select
                value={formulario.status}
                onChange={(e) =>
                  setFormulario({
                    ...formulario,
                    status: e.target.value,
                  })
                }
              >
                <option>Normal</option>
                <option>Alerta</option>
                <option>Crítico</option>
              </select>
            </label>

            {erro && <p className="eng-error">{erro}</p>}

            <button className="eng-button" type="submit">
              Salvar equipamento
            </button>
          </form>
        </section>
      )}
    </>
  );
}