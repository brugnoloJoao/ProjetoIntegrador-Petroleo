
import { Outlet } from "react-router-dom";
import Sidebar from "../../components/Sidebar/Sidebar";
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
      <Sidebar
        menu={menu}
        perfil="Engenheiro"
        descricao="Manutenção"
        iniciais="EM"
      />

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