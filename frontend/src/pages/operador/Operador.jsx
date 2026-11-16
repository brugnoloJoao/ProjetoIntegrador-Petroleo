import { useEffect, useState } from "react";
import { Link, Outlet } from "react-router-dom";
import Sidebar from "../../components/Sidebar/Sidebar";
import { OperadorProvider, useOperador } from "./dadosOperador";
import Icone from "./Icones";
import "./Operador.css";

const menu = [
  {
    caminho: "/operador",
    texto: "Visão Geral",
    icone: <Icone nome="cubo3d" tamanho={16} />,
    fim: true,
  },
  {
    caminho: "/operador/monitoramento",
    texto: "Monitoramento",
    icone: <Icone nome="atividade" tamanho={16} />,
  },
  {
    caminho: "/operador/alertas",
    texto: "Alertas",
    icone: <Icone nome="alerta" tamanho={16} />,
  },
  {
    caminho: "/operador/historico",
    texto: "Histórico",
    icone: <Icone nome="servidor" tamanho={16} />,
  },
];

function OperadorLayout() {
  const { alertasAtivosCount } = useOperador();
  const [relogio, setRelogio] = useState(() =>
    new Date().toLocaleTimeString("pt-BR", { hour12: false })
  );

  useEffect(() => {
    const id = setInterval(() => {
      setRelogio(new Date().toLocaleTimeString("pt-BR", { hour12: false }));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="op-app">
      <Sidebar
        menu={menu}
        perfil="Operador"
        descricao="Eng. R. Almeida • Turno A"
        iniciais="OC"
      />

      <div className="op-content">
        <header className="op-topbar">
          <div className="op-topbar-left">
            <span className="op-sys-badge">
              <i />
              PETROSYNC
            </span>

            <div className="op-station-info">
              <strong>
                BACIA DE CAMPOS • ESTAÇÃO ET-04 / POÇO MRL-19{" "}
                <span className="op-tag-amber">ELEVAÇÃO ARTIFICIAL (BM)</span>
              </strong>
              <small>
                LAT 22°24&apos;18&quot;S • LON 40°11&apos;09&quot;W • UNIDADE ONSHORE-BASE / CLUSTER NORTE
              </small>
            </div>
          </div>

          <div className="op-topbar-right">
            <span className="op-pill-mono">
              RTU-04: <b className="is-ok">ONLINE</b> • <b>60 FPS</b>
            </span>
            <span className="op-pill-mono">
              OP: <b>ENG. R. ALMEIDA</b>
            </span>
            <span className="op-pill-mono op-clock">{relogio} UTC-3</span>
            <Link
              to="/operador/alertas"
              className={`op-alarm-pill ${alertasAtivosCount > 0 ? "has-alarm" : ""}`}
            >
              <Icone nome="alerta" tamanho={14} />
              ALARMES: <b>{alertasAtivosCount}</b>
            </Link>
          </div>
        </header>

        <main className="op-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default function Operador() {
  return (
    <OperadorProvider>
      <OperadorLayout />
    </OperadorProvider>
  );
}