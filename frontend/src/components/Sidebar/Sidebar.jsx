import { NavLink, useNavigate } from "react-router-dom";
import "./Sidebar.css";

export default function Sidebar({
  menu,
  perfil,
  descricao,
  iniciais,
  tituloMenu,
}) {
  const navigate = useNavigate();

  function sair() {
    sessionStorage.removeItem("petrosync_usuario");
    navigate("/", { replace: true });
  }

  return (
    <aside className="ps-sidebar">
      <div className="ps-sidebar-brand">
        <div className="ps-sidebar-logo">⌁</div>

        <div>
          <strong>
            Petro<span>Sync</span>
          </strong>
          <small>MANUTENÇÃO INTELIGENTE</small>
        </div>
      </div>

      {tituloMenu && (
        <p className="ps-sidebar-title">
          {tituloMenu}
        </p>
      )}

      <nav
        className="ps-sidebar-nav"
        aria-label={`Menu do ${perfil}`}
      >
        {menu.map((item) => (
          <NavLink
            key={item.caminho}
            to={item.caminho}
            end={item.fim}
            className={({ isActive }) =>
              `ps-sidebar-link ${isActive ? "ativo" : ""}`
            }
          >
            <span aria-hidden="true">
              {item.icone}
            </span>

            {item.texto}
          </NavLink>
        ))}
      </nav>

      <div className="ps-sidebar-footer">
        <div className="ps-sidebar-profile">
          <span className="ps-sidebar-avatar">
            {iniciais}
          </span>

          <div>
            <strong>{perfil}</strong>
            <small>{descricao}</small>
          </div>
        </div>

        <button
          type="button"
          className="ps-sidebar-exit"
          onClick={sair}
        >
          ← Sair da plataforma
        </button>
      </div>
    </aside>
  );
}
