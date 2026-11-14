
import { BrowserRouter, Routes, Route } from "react-router-dom";

import Login from "../pages/login/Login";
import Operador from "../pages/operador/Operador";
import Gestor from "../pages/gestor/Gestor";

// Telas do Engenheiro
import Engenheiro from "../pages/engenheiro/Engenheiro";
import { EngenheiroProvider } from "../pages/engenheiro/EngenheiroContext";
import VisaoGeral from "../pages/engenheiro/VisaoGeral";
import Historico from "../pages/engenheiro/Historico";
import Anomalias from "../pages/engenheiro/Anomalias";
import Equipamentos from "../pages/engenheiro/Equipamentos";
import OrdensServico from "../pages/engenheiro/OrdensServico";

function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        
        <Route path="/" element={<Login />} />

        <Route path="/operador" element={<Operador />} />

        <Route
          path="/engenheiro"
          element={
            <EngenheiroProvider>
              <Engenheiro />
            </EngenheiroProvider>
          }
        >
          <Route index element={<VisaoGeral />} />
          <Route path="historico" element={<Historico />} />
          <Route path="anomalias" element={<Anomalias />} />
          <Route path="equipamentos" element={<Equipamentos />} />
          <Route path="ordens" element={<OrdensServico />} />
        </Route>

        <Route path="/gestor" element={<Gestor />} />
      </Routes>
    </BrowserRouter>
  );
}

export default AppRoutes;