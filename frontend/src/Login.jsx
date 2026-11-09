import { useState } from "react";
import "./Login.css";

const PERFIS = [
  { id: "operador", sigla: "OC", nome: "Operador de Campo", desc: "Acompanhamento de operação" },
  { id: "engenheiro", sigla: "EM", nome: "Engenheiro de Manutenção", desc: "Análise e planejamento" },
  { id: "gestor", sigla: "GM", nome: "Gestor de Manutenção", desc: "Indicadores e decisões" },
];

const IconPulse = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 12h4l3-7 4 14 3-7h4" />
  </svg>
);

const IconCheck = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 12l5 5L20 7" />
  </svg>
);

const IconShield = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z" />
    <path d="M9 12l2 2 4-4" />
  </svg>
);

const IconLock = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="5" y="11" width="14" height="9" rx="2" />
    <path d="M8 11V8a4 4 0 018 0v3" />
  </svg>
);

export default function Login({ onLogin }) {
  const [perfil, setPerfil] = useState("operador");
  const [carregando, setCarregando] = useState(false);

  const entrar = (e) => {
    e.preventDefault();
    setCarregando(true);
    setTimeout(() => {
      setCarregando(false);
      onLogin?.(perfil);
    }, 600);
  };

  return (
    <div className="ps-login">
      <header className="ps-top">
        <div className="ps-brand">
          <div className="ps-logo"><IconPulse size={20} /></div>
          <div>
            <div className="ps-brand-name">Petro<span>sync</span></div>
            <div className="ps-brand-sub ps-mono">MANUTENÇÃO INTELIGENTE</div>
          </div>
        </div>
        <div className="ps-env ps-mono">
          <IconLock />
