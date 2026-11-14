
import { Outlet } from "react-router-dom";
import Sidebar from "../../components/Sidebar/Sidebar";
import "./Operador.css";

const menu = [
  {
    caminho: "/operador",
    texto: "Visão geral",
    icone: "▦",
    fim: true,
  },
  {
    caminho: "/operador/monitoramento",
    texto: "Monitoramento",
    icone: "⌁",
  },
  {
    caminho: "/operador/alertas",
    texto: "Alertas",
    icone: "⚠",
  },
  {
    caminho: "/operador/historico",
    texto: "Histórico",
    icone: "▤",
  },
];

export default function Operador() {
  return (
    <div className="op-app">
      <Sidebar
        menu={menu}
        perfil="Operador"
        descricao="Operador de Campo"
        iniciais="OC"
      />

      <div className="op-content">
        <header className="op-topbar">
          <span>
            PETROSYNC <b>/</b> OPERAÇÃO
          </span>

          <span className="op-environment">
            <i />
            Ambiente de demonstração
          </span>
        </header>

        <main className="op-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}