import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import Login from "../pages/login/Login";
import RotaProtegida from "./RotaProtegida";

import Operador from "../pages/operador/Operador";
import VisaoGeralOperador from "../pages/operador/VisaoGeral";
import Monitoramento from "../pages/operador/Monitoramento";
import Alertas from "../pages/operador/Alertas";
import HistoricoOperador from "../pages/operador/Historico";

import Engenheiro from "../pages/engenheiro/Engenheiro";
import {
  EngenheiroProvider,
} from "../pages/engenheiro/EngenheiroContext";
import VisaoGeralEngenheiro from "../pages/engenheiro/VisaoGeral";
import HistoricoEngenheiro from "../pages/engenheiro/Historico";
import Anomalias from "../pages/engenheiro/Anomalias";
import Equipamentos from "../pages/engenheiro/Equipamentos";
import OrdensServico from "../pages/engenheiro/OrdensServico";

import Gestor from "../pages/gestor/Gestor";
import {
  GestorProvider,
} from "../pages/gestor/GestorContext";
import VisaoGeralGestor from "../pages/gestor/VisaoGeral";
import Indicadores from "../pages/gestor/Indicadores";
import AprovacaoOrdens from "../pages/gestor/AprovacaoOrdens";
import Relatorios from "../pages/gestor/Relatorios";
import RotaPreotegida from "./RotaProtegida";

function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route
          element={
            <RotaProtegida perfilPermitido="operador" />
          }
        >
          <Route path="/operador" element={<Operador />}>
            <Route
              index
              element={<VisaoGeralOperador />}
            />
            <Route
              path="monitoramento"
              element={<Monitoramento />}
            />
            <Route
              path="alertas"
              element={<Alertas />}
            />
            <Route
              path="historico"
              element={<HistoricoOperador />}
            />
          </Route>
        </Route>

        <Route
          element={
            <RotaProtegida perfilPermitido="engenheiro" />
          }
        >
          <Route
            path="/engenheiro"
            element={
              <EngenheiroProvider>
                <Engenheiro />
              </EngenheiroProvider>
            }
          >
            <Route
              index
              element={<VisaoGeralEngenheiro />}
            />
            <Route
              path="historico"
              element={<HistoricoEngenheiro />}
            />
            <Route
              path="anomalias"
              element={<Anomalias />}
            />
            <Route
              path="equipamentos"
              element={<Equipamentos />}
            />
            <Route
              path="ordens"
              element={<OrdensServico />}
            />
          </Route>
        </Route>

        <Route
          element={
            <RotaPreotegida perfilPermitido="gestor" />
          }
        >
          <Route
            path="/gestor"
            element={
              <GestorProvider>
                <Gestor />
              </GestorProvider>
            }
          >
            <Route
              index
              element={<VisaoGeralGestor />}
            />
            <Route
              path="indicadores"
              element={<Indicadores />}
            />
            <Route
              path="aprovacoes"
              element={<AprovacaoOrdens />}
            />
            <Route
              path="relatorios"
              element={<Relatorios />}
            />
          </Route>
        </Route>

        {/* ROTA NÃO ENCONTRADA */}
        <Route
          path="*"
          element={<Navigate to="/" replace />}
        />

      </Routes>
    </BrowserRouter>
  );
}
export default AppRoutes;