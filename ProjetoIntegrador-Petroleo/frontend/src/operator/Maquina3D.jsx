import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { classeDoStatus } from "./StatusBadge";
import { criarKit, CORES } from "./modelos/kit.js";
import { encontrarLeitura, situacaoDaLeitura } from "./leituras.js";
import NumeroAnimado from "../effects/NumeroAnimado.jsx";
import { semAnimacao } from "../effects/revelar.js";
import { criarEfeitos } from "./efeitos.js";
import { criarMontagem, primeiraVez } from "./montagem.js";
import { ligarGestos } from '../effects/gestos.js';

const proporcaoDoLimite = (leitura) => leitura && leitura.limiteCritico > 0
  ? Math.max(0, Math.min(1, leitura.valor / leitura.limiteCritico))
  : null;

// Valores de 0 a 1 que animam o modelo; sem leitura, usa um padrão neutro.
function calcularRazoes(leituras) {
  const nivel = encontrarLeitura(leituras, ['nível', 'nivel']);
  return {
    pressao: proporcaoDoLimite(encontrarLeitura(leituras, ['press'])) ?? 0.62,
    vazao: proporcaoDoLimite(encontrarLeitura(leituras, ['vaz', 'flux'])) ?? 0.62,
    vibracao: proporcaoDoLimite(encontrarLeitura(leituras, ['vibra'])) ?? 0,
    temperatura: proporcaoDoLimite(encontrarLeitura(leituras, ['temper'])) ?? 0.5,
    nivel: nivel
      ? Math.max(0, Math.min(1, nivel.unidade === '%' ? nivel.valor / 100 : proporcaoDoLimite(nivel) ?? 0.6))
      : 0.6,
  };
}

function descartarCena(scene) {
  scene.traverse((objeto) => {
    objeto.geometry?.dispose();
    const materiais = Array.isArray(objeto.material) ? objeto.material : [objeto.material];
    materiais.forEach((material) => material?.dispose());
  });
}

export default function Maquina3D({
  modelo,
  ativo,
  cadencia = 10.5,
  falhaSimulada = false,
  falhaConfigurada = false,
  equipamentos = [],
  statusAtivo = 'Normal',
  leituras = [],
  onControlChange,
  controlesBloqueados = false,
  erroControle = '',
  simulacaoAtiva = false,
  origemLeituras = 'SEM LEITURAS',
  movimentoAtivo = true,
  onForcarFalha,
  alertasAbertos = 0,
  conserto = null,
}) {
  const mountRef = useRef(null);
  const pinsDomRef = useRef({});
  const [presetAtivo, setPresetAtivo] = useState("geral");
  const [raioX, setRaioX] = useState(false);
  const [hud, setHud] = useState([]);
  const [erroCena, setErroCena] = useState(false);
  const [preparando, setPreparando] = useState(true);
  const [velocidadeLocal, setVelocidadeLocal] = useState(cadencia);
  const [pedidoCamera, setPedidoCamera] = useState(0);

  // Primeira leitura crítica e o componente do modelo que responde por ela.
  // Mantém a mesma falha enquanto o valor só oscila em torno do limite.
  const falhaRef = useRef(null);
  const leituraEmFalha = leituras.find((leitura) => leitura.parametroId === falhaRef.current
      && leitura.valor >= leitura.limiteCritico * 0.98)
    ?? leituras.find((leitura) => situacaoDaLeitura(leitura) === 'critico');
  falhaRef.current = leituraEmFalha?.parametroId ?? null;
  const pinoEmFalha = leituraEmFalha
    ? (modelo?.pins ?? []).find((pin) => (pin.foco ?? pin.termos ?? [])
      .some((termo) => leituraEmFalha.nome?.toLocaleLowerCase('pt-BR').includes(termo)))
    : undefined;
  const escolherCamera = (preset) => {
    setPresetAtivo(preset);
    setPedidoCamera((n) => n + 1);
  };

  // O laço de animação lê sempre os valores mais recentes sem recriar a cena.
  const estadoRef = useRef({});
  estadoRef.current = {
    cadencia, falha: falhaSimulada, movimento: movimentoAtivo, raioX, preset: presetAtivo,
    razoes: calcularRazoes(leituras),
    pedido: pedidoCamera,
    leituras, ativoId: ativo?.id ?? null,
  };

  const leituraPressao = encontrarLeitura(leituras, ['press']);
  const leituraVazao = encontrarLeitura(leituras, ['vaz', 'flux']);
  const leituraVibracao = encontrarLeitura(leituras, ['vibra']);

  useEffect(() => setVelocidadeLocal(cadencia), [cadencia]);
  useEffect(() => {
    if (erroControle) setVelocidadeLocal(cadencia);
  }, [erroControle, cadencia]);

  const confirmarVelocidade = (event) => {
    const velocidade = Number(event.currentTarget.value);
    setVelocidadeLocal(velocidade);
    if (velocidade !== cadencia) onControlChange?.({ cadencia: velocidade });
  };

  useEffect(() => {
    const container = mountRef.current;
    if (!container || !modelo) return;

    const width = container.clientWidth || 720;
    const height = container.clientHeight || 410;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0b0d10);
    scene.fog = new THREE.FogExp2(0x0b0d10, 0.026);

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 120);

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    } catch (error) {
      console.error('WebGL indisponível para a máquina 3D.', error);
      setErroCena(true);
      return undefined;
    }
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.innerHTML = "";
    container.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xfff5e4, 0.65));
    const keyLight = new THREE.DirectionalLight(0xffedd5, 1.35);
    keyLight.position.set(7, 12, 8);
    keyLight.castShadow = true;
    scene.add(keyLight);
    const rimLight = new THREE.DirectionalLight(0xf5a623, 0.55);
    rimLight.position.set(-8, 6, -6);
    scene.add(rimLight);
    scene.add(new THREE.GridHelper(24, 24, 0x3b2c12, 0x1a1d24));

    // A máquina fica em um grupo próprio, separado das luzes, da grade e dos efeitos.
    const grupoMaquina = new THREE.Group();
    scene.add(grupoMaquina);
    const kit = criarKit(grupoMaquina);
    const maquina = modelo.construir(kit);
    const presets = modelo.presets;

    const currentTarget = new THREE.Vector3(...presets.geral.target);
    const desiredTarget = new THREE.Vector3(...presets.geral.target);
    const spherical = { theta: presets.geral.theta, phi: presets.geral.phi, radius: presets.geral.radius };
    let desiredSpherical = { ...spherical };
    let ultimoPreset = "geral";
    let ultimoPedido = estadoRef.current.pedido;

    setPreparando(true);
    const efeitos = criarEfeitos(scene, semAnimacao());
    let montagem = null;
    let ativoMostrado;

    const aproximar = (raio) => { desiredSpherical.radius = Math.max(3.4, Math.min(20, raio)); };
    const onWheel = (e) => {
      e.preventDefault();
      aproximar(desiredSpherical.radius + e.deltaY * 0.005);
    };

    const dom = renderer.domElement;
    const desligarGestos = ligarGestos(container.parentElement, dom, {
      girar: (dx, dy) => {
        desiredSpherical.theta -= dx * 0.0065;
        desiredSpherical.phi = Math.max(0.32, Math.min(1.45, desiredSpherical.phi - dy * 0.0055));
      },
      aproximar: (fator) => aproximar(desiredSpherical.radius * fator),
    });
    dom.addEventListener("wheel", onWheel, { passive: false });

    const resizeObserver = new ResizeObserver(() => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w > 0 && h > 0) {
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      }
    });
    resizeObserver.observe(container);

    let animId;
    let tempo = 0;
    let hudTick = 0;
    const clock = new THREE.Clock();
    const projVec = new THREE.Vector3();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      // Limita o passo para a animação não saltar quando a aba volta a ficar visível.
      const dt = Math.min(clock.getDelta(), 0.1);
      const estado = estadoRef.current;

      const irPara = (p) => {
        desiredTarget.set(...p.target);
        desiredSpherical = { theta: p.theta, phi: p.phi, radius: p.radius };
      };
      if (estado.preset !== ultimoPreset || estado.pedido !== ultimoPedido) {
        ultimoPreset = estado.preset;
        ultimoPedido = estado.pedido;
        irPara(presets[ultimoPreset] || presets.geral);
      }
      for (const material of kit.materiaisWire) material.wireframe = estado.raioX;

      const passo = estado.movimento ? dt : 0;
      tempo += passo;
      const frame = {
        passo,
        tempo,
        cadencia: estado.cadencia,
        proporcao: estado.movimento ? estado.cadencia / 10.5 : 0,
        falha: estado.falha,
        corStatus: estado.falha ? CORES.critico : CORES.ambar,
        razoes: estado.razoes,
      };
      maquina.atualizar(frame);

      // Outra máquina na mesma cena: recomeça as reações e vê se é a primeira vez dela.
      if (estado.ativoId !== ativoMostrado) {
        ativoMostrado = estado.ativoId;
        efeitos.limpar();
        montagem = ativoMostrado != null && primeiraVez(`3d:${ativoMostrado}`) ? criarMontagem(grupoMaquina) : null;
      }
      if (montagem) {
        montagem.avancar(dt);
        if (montagem.terminou) montagem = null;
      }
      // As reações esperam a máquina terminar de se montar.
      if (!montagem) efeitos.atualizar(estado.leituras, modelo.pins, grupoMaquina, dt, clock.elapsedTime);

      currentTarget.lerp(desiredTarget, 0.09);
      spherical.theta += (desiredSpherical.theta - spherical.theta) * 0.09;
      spherical.phi += (desiredSpherical.phi - spherical.phi) * 0.09;
      spherical.radius += (desiredSpherical.radius - spherical.radius) * 0.09;
      // Em telas estreitas a câmera se afasta para a máquina continuar inteira.
      const distancia = spherical.radius * Math.max(1, 1.25 / camera.aspect);

      camera.position.x = currentTarget.x + distancia * Math.sin(spherical.phi) * Math.sin(spherical.theta);
      camera.position.y = currentTarget.y + distancia * Math.cos(spherical.phi);
      camera.position.z = currentTarget.z + distancia * Math.sin(spherical.phi) * Math.cos(spherical.theta);
      camera.lookAt(currentTarget);

      montagem?.aplicar();
      efeitos.aplicar(clock.elapsedTime);
      renderer.render(scene, camera);
      efeitos.restaurar();
      montagem?.restaurar();

      const cw = container.clientWidth;
      const ch = container.clientHeight;
      for (const pin of modelo.pins) {
        const el = pinsDomRef.current[pin.id];
        if (!el) continue;
        projVec.set(...pin.pos).project(camera);
        const x = (projVec.x * 0.5 + 0.5) * cw;
        const y = (-projVec.y * 0.5 + 0.5) * ch;
        el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
        el.style.opacity = projVec.z < 1 && !montagem ? "1" : "0";
      }

      if (hudTick % 6 === 0) setHud(maquina.hud(frame));
      hudTick += 1;
    };

    setPresetAtivo("geral");
    estadoRef.current.preset = "geral";

    // Prepara os materiais na placa de vídeo antes do primeiro quadro, sem travar a tela.
    // As amostras fazem o mesmo para os efeitos de falha.
    const amostras = efeitos.amostras();
    scene.add(amostras);
    let encerrado = false;
    let iniciado = false;
    const comecar = () => {
      if (encerrado || iniciado) return;
      iniciado = true;
      scene.remove(amostras);
      setPreparando(false);
      clock.getDelta();
      animate();
    };
    const limite = window.setTimeout(comecar, 4000);
    camera.position.set(8, 6, 8);
    camera.lookAt(currentTarget);
    renderer.compileAsync(scene, camera).catch(() => {}).then(comecar);

    return () => {
      encerrado = true;
      window.clearTimeout(limite);
      cancelAnimationFrame(animId);
      resizeObserver.disconnect();
      desligarGestos();
      dom.removeEventListener("wheel", onWheel);
      efeitos.descartar();
      descartarCena(scene);
      renderer.dispose();
      renderer.forceContextLoss();
      container.innerHTML = "";
    };
  }, [modelo]);

  // Cor do pino: leitura do componente quando houver; senão, a condição do ativo.
  const statusDoPin = (pin) => {
    if (pin.termos) {
      const leitura = encontrarLeitura(leituras, pin.termos);
      if (leitura) return situacaoDaLeitura(leitura);
    }
    if (pin.equipamento) {
      const equipamento = equipamentos.find((item) => item.id === pin.equipamento);
      const proprio = equipamento && !equipamento.representaSelecionado;
      if (proprio) return classeDoStatus(simulacaoAtiva ? equipamento.status : equipamento.statusReal);
      if (leituras.some((leitura) => situacaoDaLeitura(leitura) === 'critico')) return 'critico';
      if (leituras.some((leitura) => situacaoDaLeitura(leitura) === 'alerta')) return 'alerta';
    }
    return classeDoStatus(statusAtivo);
  };

  // Pinos do conjunto principal mostram a tag do ativo selecionado.
  const tagDoPin = (pin) => {
    if (!pin.equipamento) return ativo?.tag ?? 'DEMO';
    return pin.tag === 'UB-04' ? ativo?.tag ?? pin.tag : pin.tag;
  };

  return (
    <div className="op-twin-panel">
      <div className="op-twin-head">
        <div className="op-twin-title">
          <i />
          <span>MODELO 3D // {modelo?.titulo ?? 'CARREGANDO'}</span>
        </div>

        <div className="op-twin-presets" role="group" aria-label="Câmeras 3D">
          {Object.entries(modelo?.presets ?? {}).map(([key, cfg]) => (
            <button
              type="button"
              key={key}
              className={`op-preset-btn ${presetAtivo === key ? "ativo" : ""}`}
              onClick={() => escolherCamera(key)}
            >
              {cfg.label}
            </button>
          ))}
          <button
            type="button"
            className={`op-xray-button ${raioX ? "ativo" : ""}`}
            aria-pressed={raioX}
            title="Deixa a máquina transparente para ver por dentro"
            onClick={() => setRaioX((v) => !v)}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z" /><circle cx="12" cy="12" r="2.8" /></svg>
            {raioX ? 'Raio-X ligado' : 'Ver em Raio-X'}
          </button>
        </div>
      </div>

      <div className="op-twin-controls">
        <label className="op-speed-control" htmlFor="machine-speed">
          <span>{modelo?.velocidade.rotulo ?? 'VELOCIDADE DA MÁQUINA'} <b>{modelo?.velocidade.formatar
            ? modelo.velocidade.formatar(Number(velocidadeLocal))
            : `${Math.round((velocidadeLocal / 10.5) * 100)}% da nominal`}</b></span>
          <input
            id="machine-speed"
            type="range"
            min="6"
            max="18"
            step="0.5"
            value={velocidadeLocal}
            disabled={controlesBloqueados}
            onChange={(event) => setVelocidadeLocal(Number(event.target.value))}
            onPointerUp={confirmarVelocidade}
            onKeyUp={confirmarVelocidade}
          />
          <span className="op-speed-range">
            <small>{modelo?.velocidade.formatar ? modelo.velocidade.formatar(6) : '57%'}</small>
            <small>{modelo?.velocidade.formatar ? modelo.velocidade.formatar(18) : '171%'}</small>
          </span>
        </label>
        {falhaConfigurada && alertasAbertos === 0 ? (
          <button type="button" className="op-failure-button is-active" onClick={() => onControlChange?.({ falhaSimulada: false })}>
            <i /> Cancelar falha forçada
          </button>
        ) : (
          <button
            type="button"
            className={`op-failure-button ${falhaConfigurada ? 'is-active' : ''}`}
            disabled={controlesBloqueados || falhaConfigurada}
            onClick={onForcarFalha}
          >
            <i /> {falhaConfigurada ? 'Falha forçada' : 'Forçar Falha'}
          </button>
        )}
        {!simulacaoAtiva && <span className="op-simulator-paused">Simulação pausada. Para forçar uma falha é preciso ativá-la.</span>}
        {simulacaoAtiva && falhaConfigurada && alertasAbertos === 0 && (
          <span className="op-simulator-paused" role="status">Falha forçada: aguardando a próxima leitura…</span>
        )}
        {alertasAbertos > 0 && (
          <span className="op-repair-note" role="status">
            ⚠ {alertasAbertos === 1 ? '1 alerta em aberto' : `${alertasAbertos} alertas em aberto`}. A máquina só volta ao normal quando a ordem de serviço for encerrada.
            {conserto && <a href={conserto.href}>{conserto.texto} →</a>}
          </span>
        )}
        {erroControle && <span className="op-control-error" role="alert">{erroControle}</span>}
      </div>

      <div className="op-twin-stage">
        <div ref={mountRef} className="op-twin-canvas" />
        {(!modelo || preparando) && !erroCena && (
          <div className="op-3d-carregando" role="status"><i aria-hidden="true" /> Preparando a máquina 3D…</div>
        )}
        {erroCena && <div className="op-twin-scene-error" role="alert">Este navegador não conseguiu iniciar o WebGL. As leituras abaixo continuam atualizando.</div>}

        <span className="op-corner tl" />
        <span className="op-corner tr" />
        <span className="op-corner bl" />
        <span className="op-corner br" />

        <div className="op-twin-hud-tl">
          {hud.map((item) => (
            <div key={item.rotulo}>
              {item.rotulo}: <b className={item.tom ? `is-${item.tom}` : undefined}>{item.valor}</b>
            </div>
          ))}
          {leituraPressao && <div>PRESSÃO: <b>{leituraPressao.valor.toLocaleString('pt-BR')} {leituraPressao.unidade}</b></div>}
          {leituraVazao && <div>VAZÃO: <b>{leituraVazao.valor.toLocaleString('pt-BR')} {leituraVazao.unidade}</b></div>}
          {leituraVibracao && <div>VIBRAÇÃO: <b>{leituraVibracao.valor.toLocaleString('pt-BR')} {leituraVibracao.unidade}</b></div>}
        </div>

        {leituraEmFalha && (
          <div className="op-twin-fault" role="status">
            <strong>⛔ Falha em {pinoEmFalha?.nome ?? leituraEmFalha.nome}</strong>
            <span>{leituraEmFalha.nome}: {leituraEmFalha.valor.toLocaleString('pt-BR')} {leituraEmFalha.unidade}</span>
            {conserto && <a href={conserto.href}>{conserto.texto}</a>}
          </div>
        )}

        <div className="op-twin-pins">
          {(modelo?.pins ?? []).map((pin) => (
            <button
              type="button"
              key={`${modelo.titulo}-${pin.id}`}
              ref={(el) => { pinsDomRef.current[pin.id] = el; }}
              className={`op-3d-pin is-${statusDoPin(pin)} ${pinoEmFalha?.id === pin.id ? 'is-foco' : ''}`}
              onClick={() => pin.preset && escolherCamera(pin.preset)}
            >
              <i />
              <b>{tagDoPin(pin)}</b>
              <span>{pin.nome}</span>
            </button>
          ))}
        </div>

        <div className="op-twin-hint">
          <span className="so-mouse">ARRASTAR: ÓRBITA 360° • SCROLL: ZOOM • CLIQUE NOS PINS: INSPECIONAR</span>
          <span className="so-toque">UM DEDO: GIRAR • DOIS DEDOS: ZOOM • TOQUE NOS PINS: INSPECIONAR</span>
        </div>
      </div>
      <div className="op-twin-telemetry" aria-label="Leituras atuais dos sensores">
        <div className="op-twin-telemetry-heading">
          <strong>LEITURAS DO ATIVO</strong>
          <span>{origemLeituras}</span>
        </div>
        {leituras.length ? (
          <div className="op-twin-reading-grid">
            {leituras.map((leitura) => (
              <div className={`op-reading-card is-${situacaoDaLeitura(leitura)}`} key={`${leitura.parametroId}-${leitura.simulada}`}>
                <span>{leitura.nome}</span>
                {situacaoDaLeitura(leitura) !== 'normal' && (
                  <em className="op-reading-state">{situacaoDaLeitura(leitura) === 'critico' ? '⛔ Crítico' : '⚠ Atenção'}</em>
                )}
                <strong><NumeroAnimado valor={leitura.valor} doZero={false} /> <small>{leitura.unidade}</small></strong>
                <small>Atenção {leitura.limiteAtencao.toLocaleString('pt-BR')} · Crítico {leitura.limiteCritico.toLocaleString('pt-BR')}</small>
              </div>
            ))}
          </div>
        ) : (
          <p className="op-twin-no-readings">Nenhuma leitura disponível para este equipamento. O modelo 3D continua como demonstração; leituras simuladas ficam ocultas enquanto a simulação geral estiver pausada.</p>
        )}
      </div>
    </div>
  );
}
