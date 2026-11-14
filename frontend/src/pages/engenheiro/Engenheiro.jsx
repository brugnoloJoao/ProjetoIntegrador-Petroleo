import { NavLink, Outlet, Link } from "react-router-dom";
import "./Engenheiro.css";

const menu = [
  {
    caminho: "/engenheiro",
    texto: "Visão geral",
    icone: "▦",
    fim: true,
  },
  {
    caminho: "/engenheiro/historico",
    texto: "Histórico",
    icone: "⌁",
  },
  {
    caminho: "/engenheiro/anomalias",
    texto: "Anomalias",
    icone: "⚠",
  },
  {
    caminho: "/engenheiro/equipamentos",
    texto: "Equipamentos",
    icone: "⚙",
  },
  {
    caminho: "/engenheiro/ordens",
    texto: "Ordens de serviço",
    icone: "▤",
  },
];

export default function Engenheiro() {
  return (
    <div className="eng-app">
      <aside className="eng-sidebar">
        <div className="eng-brand">
          <div className="eng-brand-mark">⌁</div>

          <div>
            <strong>
              Petro<span>Sync</span>
            </strong>
            <small>MANUTENÇÃO INTELIGENTE</small>
          </div>
        </div>

        <nav className="eng-nav" aria-label="Menu do engenheiro">
          {menu.map((item) => (
            <NavLink
              key={item.caminho}
              to={item.caminho}
              end={item.fim}
              className={({ isActive }) =>
                isActive
                  ? "eng-nav-link ativo"
                  : "eng-nav-link"
              }
            >
              <span aria-hidden="true">{item.icone}</span>
              {item.texto}
            </NavLink>
          ))}
        </nav>

        <div className="eng-sidebar-footer">
          <div className="eng-profile">
            <span>EM</span>
            <div>
              <strong>Engenheiro</strong>
              <small>Manutenção</small>
            </div>
          </div>

          <Link to="/" className="eng-exit">
            ← Sair da plataforma
          </Link>
        </div>
      </aside>

      <div className="eng-right">
        <header className="eng-topbar">
          <span>
            PETROSYNC <b>/</b> ENGENHARIA
          </span>

          <span className="eng-demo">
            <i /> Ambiente de demonstração
          </span>
        </header>

        <main className="eng-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}