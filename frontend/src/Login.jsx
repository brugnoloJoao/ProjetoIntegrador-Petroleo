import { useState } from "react";
import "./Login.css";

const PERFIS = [
  { id: "operador", sigla: "OC", nome: "Operador de Campo" },
  { id: "engenheiro", sigla: "EM", nome: "Engenheiro de Manutenção" },
  { id: "gestor", sigla: "GM", nome: "Gestor de Manutenção" },
];

const IconPulse = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
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
        <div className="ps-logo"><IconPulse /></div>
        <span className="ps-brand-name">Petro<span>sync</span></span>
      </header>

      <main className="ps-main">
        <section>
          <h1 className="ps-title">
            Decisões melhores começam com <em>visibilidade.</em>
          </h1>
          <p className="ps-lead">
            Acompanhe seus equipamentos e planeje a manutenção.
          </p>
        </section>

        <form className="ps-card" onSubmit={entrar}>
          <h2>Entre no PetroSync</h2>

          <fieldset className="ps-profiles">
            <legend>Perfil de acesso</legend>
            {PERFIS.map((p) => (
              <label key={p.id} className="ps-profile">
                <input
                  type="radio"
                  name="perfil"
                  value={p.id}
                  checked={perfil === p.id}
                  onChange={() => setPerfil(p.id)}
                />
                <span className="ps-badge">{p.sigla}</span>
                <span className="ps-profile-name">{p.nome}</span>
              </label>
            ))}
          </fieldset>

          <button className="ps-submit" type="submit" disabled={carregando}>
            {carregando ? "Entrando..." : "Acessar demonstração"}
          </button>
        </form>
      </main>
    </div>
  );
}
