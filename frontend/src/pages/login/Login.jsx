import { useState } from "react";
import { useNavigate } from "react-router-dom";
import ThreeBackground from "../../components/ThreeBackground";
import "./Login.css";

// Perfis disponíveis
const PERFIS = [
  {
    id: "operador",
    sigla: "OC",
    nome: "Operador de Campo",
    desc: "Acompanhamento de operação",
  },
  {
    id: "engenheiro",
    sigla: "EM",
    nome: "Engenheiro de Manutenção",
    desc: "Análise e planejamento",
  },
  {
    id: "gestor",
    sigla: "GM",
    nome: "Gestor de Manutenção",
    desc: "Indicadores e decisões",
  },
];

//para demonstração
const USUARIOS = [
  {
    email: "operador@petrosync.com",
    senha: "123456",
    perfil: "operador",
  },
  {
    email: "engenheiro@petrosync.com",
    senha: "123456",
    perfil: "engenheiro",
  },
  {
    email: "gestor@petrosync.com",
    senha: "123456",
    perfil: "gestor",
  },
];

const IconPulse = () => (
  <svg
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M3 12h4l3-7 4 14 3-7h4" />
  </svg>
);

export default function Login() {
  const navigate = useNavigate();
  // Etapa 1: perfil | Etapa 2: login
  const [etapa, setEtapa] = useState(1);
  const [perfil, setPerfil] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);
  // Selecionar perfil
  function selecionarPerfil(perfilSelecionado) {
    setPerfil(perfilSelecionado);
    setEtapa(2);
    setEmail("");
    setSenha("");
    setErro("");
  }

  // Voltar para a escolha do perfil
  function voltar() {
    setEtapa(1);
    setPerfil("");
    setEmail("");
    setSenha("");
    setErro("");
    setMostrarSenha(false);
  }

  // Validar o login
  function entrar(e) {
  e.preventDefault();
  if (carregando) return;
  setErro("");

    const usuario = USUARIOS.find(
      (u) =>
        u.email === email.trim().toLowerCase() &&
        u.senha === senha &&
        u.perfil === perfil
    );

    if (!usuario) {
      setErro(
        "E-mail ou senha incorretos para o perfil selecionado."
      );
      return;
    }

    setCarregando(true);

    // Simulação de autenticação
    setTimeout(() => {
      sessionStorage.setItem(
        "petrosync_usuario",
        JSON.stringify({
          email: usuario.email,
          perfil: usuario.perfil,
        })
      );

      setCarregando(false);
      navigate(`/${usuario.perfil}`, { replace: true });
    }, 500);
  }

  const perfilSelecionado = PERFIS.find(
    (p) => p.id === perfil
  );

  return (
    <div className="ps-login">
      {/* Fundo animado */}
      <ThreeBackground />

      {/* CABEÇALHO */}
      <header className="ps-top">
        <div className="ps-brand">
          <div className="ps-logo">
            <IconPulse />
          </div>

          <div>
            <div className="ps-brand-name">
              Petro<span>Sync</span>
            </div>

            <div className="ps-brand-sub">
              MANUTENÇÃO INTELIGENTE
            </div>
          </div>
        </div>

        <div className="ps-env">
          <span>♙</span>
          Ambiente de demonstração
        </div>
      </header>

      {/* CONTEÚDO */}
      <main className="ps-main">
        {/* LADO ESQUERDO */}
        <section className="ps-intro">
          <div className="ps-tag">
            <span className="ps-dot"></span>
            MONITORAMENTO DE ATIVOS
          </div>

          <h1 className="ps-title">
            Decisões melhores começam com
            <span> visibilidade.</span>
          </h1>

          <p className="ps-lead">
            Monitore equipamentos e transforme dados
            em manutenção inteligente.
          </p>
        </section>

        {/* CARD DE LOGIN */}
        <section className="ps-card">
          <div className="ps-card-kicker">
            ACESSO À PLATAFORMA
          </div>

          {/* INDICADOR DAS ETAPAS */}
          <div className="ps-steps">
            <div
              className={`ps-step ${
                etapa === 1 ? "active" : "completed"
              }`}
            >
              <span>1</span>
              Perfil
            </div>

            <div className="ps-step-line"></div>

            <div
              className={`ps-step ${
                etapa === 2 ? "active" : ""
              }`}
            >
              <span>2</span>
              Acesso
            </div>
          </div>

          {/* ETAPA 1 - ESCOLHER PERFIL */}
          {etapa === 1 && (
            <div className="ps-stage">
              <h2>Selecione seu perfil</h2>

              <p className="ps-card-sub">
                Escolha sua função para continuar.
              </p>

              <div className="ps-profiles">
                {PERFIS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className="ps-profile"
                    onClick={() => selecionarPerfil(p.id)}
                  >
                    <span className="ps-badge">
                      {p.sigla}
                    </span>

                    <span className="ps-profile-text">
                      <strong>{p.nome}</strong>
                      <span>{p.desc}</span>
                    </span>

                    <span className="ps-radio">
                      →
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ETAPA 2 - E-MAIL E SENHA */}
          {etapa === 2 && (
            <div className="ps-stage">
              <h2>Entre no PetroSync</h2>

              <p className="ps-card-sub">
                Informe seus dados para acessar o sistema.
              </p>

              {/* PERFIL ESCOLHIDO */}
              <div className="ps-selected-profile">
                <div className="ps-selected-info">
                  <span className="ps-badge">
                    {perfilSelecionado?.sigla}
                  </span>

                  <div>
                    <strong>
                      {perfilSelecionado?.nome}
                    </strong>
                    <small>
                      Perfil selecionado
                    </small>
                  </div>
                </div>

                <button
                  type="button"
                  className="ps-change-profile"
                  onClick={voltar}
                >
                  Alterar
                </button>
              </div>

              {/* FORMULÁRIO */}
              <form onSubmit={entrar}>
                <div className="ps-field">
                  <label htmlFor="email">
                    E-mail
                  </label>

                  <input
                    id="email"
                    type="email"
                    placeholder="seuemail@petrosync.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setErro("");
                    }}
                    autoComplete="username"
                    required
                  />
                </div>

                <div className="ps-field">
                  <label htmlFor="senha">
                    Senha
                  </label>

                  <div className="ps-password">
                    <input
                      id="senha"
                      type={
                        mostrarSenha
                          ? "text"
                          : "password"
                      }
                      placeholder="Digite sua senha"
                      value={senha}
                      onChange={(e) => {
                        setSenha(e.target.value);
                        setErro("");
                      }}
                      autoComplete="current-password"
                      required
                    />

                    <button
                      type="button"
                      className="ps-toggle-password"
                      onClick={() =>
                        setMostrarSenha(!mostrarSenha)
                      }
                    >
                      {mostrarSenha
                        ? "Ocultar"
                        : "Mostrar"}
                    </button>
                  </div>
                </div>

                {/* MENSAGEM DE ERRO */}
                {erro && (
                  <div
                    className="ps-error"
                    role="alert"
                  >
                    ⚠ {erro}
                  </div>
                )}

                {/* BOTÃO ENTRAR */}
                <button
                  className="ps-submit"
                  type="submit"
                  disabled={carregando}
                >
                  {carregando
                    ? "Verificando acesso..."
                    : "Entrar na plataforma →"}
                </button>
              </form>

              <button
                type="button"
                className="ps-back"
                onClick={voltar}
              >
                ← Voltar para os perfis
              </button>
            </div>
          )}

          <div className="ps-disclaimer">
            Ambiente de demonstração · Dados simulados
          </div>
        </section>
      </main>

      {/* RODAPÉ */}
      <footer className="ps-foot">
        <span>© 2026 PetroSync</span>
        <span>Manutenção preditiva</span>
      </footer>
    </div>
  );
}
