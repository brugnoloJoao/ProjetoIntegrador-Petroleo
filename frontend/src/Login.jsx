import { useState } from "react";
import "./login.css";

const PERFIS = [
  {
    id: "operador",
    sigla: "OC",
    nome: "Operador de Campo",
    desc: "Acompanhamento de operação",
  },
  {
    id: "engenheiro",
    sigla: "EM",
    nome: "Engenheiro de Manutenção",
    desc: "Análise e planejamento",
  },
  {
    id: "gestor",
    sigla: "GM",
    nome: "Gestor de Manutenção",
    desc: "Indicadores e decisões",
  },
];

const IconPulse = () => (
  <svg
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M3 12h4l3-7 4 14 3-7h4" />
  </svg>
);

export default function Login({ onLogin }) {
  const [perfil, setPerfil] = useState("operador");
  const [carregando, setCarregando] = useState(false);

  const entrar = (e) => {
    e.preventDefault();
    setCarregando(true);

    setTimeout(() => {
      setCarregando(false);
      onLogin?.(perfil);
    }, 600);
  };

  return (
    <div className="ps-login">

      <header className="ps-top">
        <div className="ps-brand">
          <div className="ps-logo">
            <IconPulse />
          </div>

          <div>
            <div className="ps-brand-name">
              Petro<span>Sync</span>
            </div>

            <div className="ps-brand-sub">
              MANUTENÇÃO INTELIGENTE
            </div>
          </div>
        </div>

        <div className="ps-env">
          <span>♙</span>
          Ambiente de demonstração
        </div>
      </header>

      <main className="ps-main">

        <section className="ps-intro">
          <div className="ps-tag">
            <span className="ps-dot"></span>
            MONITORAMENTO DE ATIVOS
          </div>

          <h1 className="ps-title">
            Decisões melhores começam com
            <span> visibilidade.</span>
          </h1>

          <p className="ps-lead">
            Monitore equipamentos e transforme dados
            em manutenção inteligente.
          </p>

          <div className="ps-decoration">
            <div className="ps-decoration-circle">
              <IconPulse />
            </div>
          </div>
        </section>

        <section className="ps-card">

          <div className="ps-card-kicker">
            ACESSO À PLATAFORMA
          </div>

          <h2>Entre no PetroSync</h2>

          <p className="ps-card-sub">
            Selecione um perfil para continuar.
          </p>

          <form onSubmit={entrar}>

            <div className="ps-profiles">
              {PERFIS.map((p) => (
                <label
                  key={p.id}
                  className={`ps-profile ${
                    perfil === p.id ? "selected" : ""
                  }`}
                >
                  <input
                    type="radio"
                    name="perfil"
                    value={p.id}
                    checked={perfil === p.id}
                    onChange={() => setPerfil(p.id)}
                  />

                  <span className="ps-badge">
                    {p.sigla}
                  </span>

                  <span className="ps-profile-text">
                    <strong>{p.nome}</strong>
                    <span>{p.desc}</span>
                  </span>

                  <span className="ps-radio">
                    {perfil === p.id ? "✓" : ""}
                  </span>
                </label>
              ))}
            </div>

            <button
              className="ps-submit"
              type="submit"
              disabled={carregando}
            >
              {carregando
                ? "Entrando..."
                : "Acessar plataforma →"}
            </button>
          </form>

          <div className="ps-disclaimer">
             Dados simulados
          </div>
        </section>
      </main>

      <footer className="ps-foot">
        <span>© 2026 PetroSync</span>
        <span>Manutenção preditiva</span>
      </footer>
    </div>
  );
}
