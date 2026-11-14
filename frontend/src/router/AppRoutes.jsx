import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "../pages/login/Login";
import Operador from "../pages/operador/Operador";
import Engenheiro from "../pages/engenheiro/Engenheiro";
import Gestor from "../pages/gestor/Gestor";

function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/operador" element={<Operador />} />
        <Route path="/engenheiro" element={<Engenheiro />} />
        <Route path="/gestor" element={<Gestor />} />
      </Routes>
    </BrowserRouter>
  );
}

export default AppRoutes;