import { Navigate, Outlet } from "react-router-dom";

function RotaPreotegida({ perfilPermitido }) {
  const dadosSalvos = sessionStorage.getItem(
    "petrosync_usuario"
  );

  if (!dadosSalvos) {
    return <Navigate to="/" replace />;
  }

  let usuario;

  try {
    usuario = JSON.parse(dadosSalvos);
  } catch {
    sessionStorage.removeItem("petrosync_usuario");
    return <Navigate to="/" replace />;
  }

  const perfisValidos = [
    "operador",
    "engenheiro",
    "gestor",
  ];

  if (
    !usuario ||
    !perfisValidos.includes(usuario.perfil)
  ) {
    sessionStorage.removeItem("petrosync_usuario");
    return <Navigate to="/" replace />;
  }

  if (usuario.perfil !== perfilPermitido) {
    return (
      <Navigate
        to={`/${usuario.perfil}`}
        replace
      />
    );
  }

  return <Outlet />;
}
export default RotaPreotegida;