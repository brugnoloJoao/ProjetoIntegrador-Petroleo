
import { Outlet } from "react-router-dom";
import Sidebar from "../../components/Sidebar/Sidebar";
import "./Gestor.css";

const menu = [
  {
    caminho: "/gestor",
    texto: "Visão geral",
    icone: "▦",
    fim: true,
  },
  {
    caminho: "/gestor/indicadores",
    texto: "Indicadores",
    icone: "▥",
  },
  {
    caminho: "/gestor/aprovacoes",
    texto: "Aprovação de ordens",
    icone: "✓",
  },
  {
    caminho: "/gestor/relatorios",
    texto: "Relatórios",
    icone: "▤",
  },
];

export default function Gestor() {
  return (
    <div className="gst-app">
      <Sidebar
        menu={menu}
        perfil="Gestor"
        descricao="Gestão de Manutenção"
        iniciais="GM"
      />

      <div className="gst-content">
        <header className="gst-topbar">
          <span>
            PETROSYNC <b>/</b> GESTÃO
          </span>

          <span className="gst-environment">
            <i />
            Ambiente de demonstração
          </span>
        </header>

        <main className="gst-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}