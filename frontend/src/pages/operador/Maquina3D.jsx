import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { classeDoStatus } from "./StatusBadge";

const PRESETS = {
  geral: { label: "Visão Geral", target: [0.2, 1.3, 0.2], theta: 0.62, phi: 1.04, radius: 10.8 },
  poco: { label: "Cabeça de Poço", target: [-2.6, 1.8, 0.4], theta: 0.45, phi: 1.12, radius: 5.4 },
  motor: { label: "Motor & Redutor", target: [1.3, 1.1, 0.4], theta: 0.85, phi: 1.08, radius: 5.2 },
  separador: { label: "Separador", target: [0.4, 1.3, -2.2], theta: -0.42, phi: 1.05, radius: 6.2 },
};

const PINS_CONFIG = [
  { id: "pin-head", tag: "UB-04", nome: "Cabeça de Cavalo / Balancim", pos: [-2.1, 3.55, 0.4], statusKey: "UB-04" },
  { id: "pin-sep", tag: "SEP-02", nome: "Separador Trifásico", pos: [0.4, 2.35, -2.2], statusKey: "SEP-02" },
  { id: "pin-anm", tag: "ANM-07", nome: "Árvore de Natal / Choke", pos: [-3.4, 1.75, 0.4], statusKey: "ANM-07" },
  { id: "pin-gear", tag: "UB-04-GEAR", nome: "Redutor & Contrapesos", pos: [0.35, 1.45, 0.4], statusKey: "UB-04" },
  { id: "pin-mtr", tag: "MTR-75HP", nome: "Motor Elétrico 75HP", pos: [1.95, 1.25, 0.4], statusKey: "MTR-75HP" },
];

export default function Maquina3D({
  cadencia = 10.5,
  choke = 62,
  falhaSimulada = false,
  equipamentos = [],
  presetExterno = null,
}) {
  const mountRef = useRef(null);
  const pinsDomRef = useRef({});
  const [presetAtivo, setPresetAtivo] = useState("geral");
  const [raioX, setRaioX] = useState(false);
  const [telemetria3D, setTelemetria3D] = useState({
    angulo: 0,
    curso: 0,
  });

  const cadenciaRef = useRef(cadencia);
  const chokeRef = useRef(choke);
  const falhaRef = useRef(falhaSimulada);
  const raioXRef = useRef(raioX);
  const presetRef = useRef(presetAtivo);

  cadenciaRef.current = cadencia;
  chokeRef.current = choke;
  falhaRef.current = falhaSimulada;
  raioXRef.current = raioX;
  presetRef.current = presetAtivo;

  useEffect(() => {
    if (presetExterno && PRESETS[presetExterno]) {
      setPresetAtivo(presetExterno);
    }
  }, [presetExterno]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 720;
    const height = container.clientHeight || 410;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0b0d10);
    scene.fog = new THREE.FogExp2(0x0b0d10, 0.036);

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 120);

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.innerHTML = "";
    container.appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xfff5e4, 0.65);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffedd5, 1.35);
    keyLight.position.set(7, 12, 8);
    keyLight.castShadow = true;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0xf5a623, 0.55);
    rimLight.position.set(-8, 6, -6);
    scene.add(rimLight);

    const grid = new THREE.GridHelper(24, 24, 0x3b2c12, 0x1a1d24);
    scene.add(grid);

    const materiaisWire = [];
    const registrarMat = (mat) => {
      materiaisWire.push(mat);
      return mat;
    };

    const matConcreto = registrarMat(
      new THREE.MeshStandardMaterial({ color: 0x262930, roughness: 0.9, metalness: 0.1 })
    );
    const matMeioFio = registrarMat(
      new THREE.MeshStandardMaterial({ color: 0xf5a623, roughness: 0.5, metalness: 0.2 })
    );
    const matAcoEscuro = registrarMat(
      new THREE.MeshStandardMaterial({ color: 0x181b20, roughness: 0.45, metalness: 0.75 })
    );
    const matAcoMedio = registrarMat(
      new THREE.MeshStandardMaterial({ color: 0x3a3f4b, roughness: 0.38, metalness: 0.8 })
    );
    const matAmbarMaquina = registrarMat(
      new THREE.MeshStandardMaterial({ color: 0xf5a623, roughness: 0.35, metalness: 0.45 })
    );
    const matCromo = registrarMat(
      new THREE.MeshStandardMaterial({ color: 0xe5e7eb, roughness: 0.2, metalness: 0.92 })
    );
    const matMotor = registrarMat(
      new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.4, metalness: 0.6 })
    );
    const matAlertaBeacon = new THREE.MeshBasicMaterial({ color: 0xf5a623 });

    const padGroup = new THREE.Group();
    scene.add(padGroup);

    const padSlab = new THREE.Mesh(new THREE.BoxGeometry(8.6, 0.22, 6.2), matConcreto);
    padSlab.position.set(-0.6, 0.11, -0.7);
    padSlab.receiveShadow = true;
    padGroup.add(padSlab);

    for (let x = -4.6; x <= 3.4; x += 0.9) {
      const curbF = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.14, 0.18), matMeioFio);
      curbF.position.set(x, 0.26, 2.3);
      padGroup.add(curbF);

      const curbB = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.14, 0.18), matMeioFio);
      curbB.position.set(x, 0.26, -3.7);
      padGroup.add(curbB);
    }

    const ubGroup = new THREE.Group();
    ubGroup.position.set(-0.8, 0.22, 0.4);
    scene.add(ubGroup);

    const skid = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.18, 1.3), matAcoEscuro);
    skid.position.set(0, 0.09, 0);
    ubGroup.add(skid);

    const criarPernaTorre = (xOff, zOff, rotZ, rotX) => {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.14, 2.55, 0.14), matAcoMedio);
      leg.position.set(-0.45 + xOff, 1.35, zOff);
      leg.rotation.z = rotZ;
      leg.rotation.x = rotX;
      ubGroup.add(leg);
    };
    criarPernaTorre(-0.35, 0.34, -0.14, -0.08);
    criarPernaTorre(0.35, 0.34, 0.14, -0.08);
    criarPernaTorre(-0.35, -0.34, -0.14, 0.08);
    criarPernaTorre(0.35, -0.34, 0.14, 0.08);

    const samsonBearing = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.22, 0.72, 16),
      matAmbarMaquina
    );
    samsonBearing.rotation.x = Math.PI / 2;
    samsonBearing.position.set(-0.45, 2.58, 0);
    ubGroup.add(samsonBearing);

    const beamPivot = new THREE.Group();
    beamPivot.position.set(-0.45, 2.65, 0);
    ubGroup.add(beamPivot);

    const walkingBeam = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.24, 0.32), matAmbarMaquina);
    walkingBeam.position.set(0.1, 0.05, 0);
    beamPivot.add(walkingBeam);

    const horseHeadShape = new THREE.Shape();
    horseHeadShape.moveTo(0, 0.45);
    horseHeadShape.lineTo(-0.55, 0.45);
    horseHeadShape.quadraticCurveTo(-0.82, 0.0, -0.52, -0.68);
    horseHeadShape.lineTo(-0.15, -0.68);
    horseHeadShape.lineTo(0, 0.05);

    const horseGeo = new THREE.ExtrudeGeometry(horseHeadShape, {
      depth: 0.34,
      bevelEnabled: true,
      bevelThickness: 0.02,
      bevelSize: 0.02,
      bevelSegments: 2,
    });
    const horseHead = new THREE.Mesh(horseGeo, matAmbarMaquina);
    horseHead.position.set(-1.45, 0.02, -0.17);
    beamPivot.add(horseHead);

    const gearPedestal = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.95, 0.85), matAcoMedio);
    gearPedestal.position.set(1.15, 0.55, 0);
    ubGroup.add(gearPedestal);

    const crankPivot = new THREE.Group();
    crankPivot.position.set(1.15, 1.05, 0);
    ubGroup.add(crankPivot);

    [-0.54, 0.54].forEach((zSide) => {
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.24, 1.05, 0.12), matAcoEscuro);
      arm.position.set(0, 0.36, zSide);
      crankPivot.add(arm);

      const weight = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.46, 0.2), matAmbarMaquina);
      weight.position.set(0, 0.72, zSide);
      crankPivot.add(weight);
    });

    const pitmanGroup = new THREE.Group();
    pitmanGroup.position.set(1.15, 1.85, 0);
    ubGroup.add(pitmanGroup);

    [-0.44, 0.44].forEach((zSide) => {
      const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 1.55, 10), matCromo);
      rod.position.set(0, 0, zSide);
      pitmanGroup.add(rod);
    });

    const polishedRod = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.038, 1.8, 12), matCromo);
    polishedRod.position.set(-2.12, 1.55, 0);
    ubGroup.add(polishedRod);

    const motorGroup = new THREE.Group();
    motorGroup.position.set(2.75, 0.22, 0.4);
    scene.add(motorGroup);

    const motorBase = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.24, 0.9), matAcoEscuro);
    motorBase.position.y = 0.12;
    motorGroup.add(motorBase);

    const motorBody = new THREE.Group();
    motorBody.position.y = 0.68;
    motorGroup.add(motorBody);

    const motorCarcaca = new THREE.Mesh(
      new THREE.CylinderGeometry(0.38, 0.38, 0.95, 20),
      matMotor
    );
    motorCarcaca.rotation.z = Math.PI / 2;
    motorBody.add(motorCarcaca);

    for (let x = -0.35; x <= 0.35; x += 0.1) {
      const fin = new THREE.Mesh(new THREE.TorusGeometry(0.39, 0.018, 6, 20), matAcoEscuro);
      fin.rotation.y = Math.PI / 2;
      fin.position.x = x;
      motorBody.add(fin);
    }

    const belt = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.26, 0.14), matAcoEscuro);
    belt.position.set(-0.55, 0.72, 0.42);
    belt.rotation.z = -0.25;
    motorGroup.add(belt);

    const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.11, 14, 14), matAlertaBeacon);
    beacon.position.set(0, 1.18, 0);
    motorGroup.add(beacon);

    const anmGroup = new THREE.Group();
    anmGroup.position.set(-3.4, 0.22, 0.4);
    scene.add(anmGroup);

    const anmColuna = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.24, 1.35, 16), matAcoMedio);
    anmColuna.position.y = 0.68;
    anmGroup.add(anmColuna);

    [0.42, 0.82, 1.18].forEach((yPos) => {
      const flange = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.08, 16), matAmbarMaquina);
      flange.position.y = yPos;
      anmGroup.add(flange);
    });

    const chokeArm = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.75, 12), matAcoEscuro);
    chokeArm.rotation.z = Math.PI / 2;
    chokeArm.position.set(0.38, 0.95, 0);
    anmGroup.add(chokeArm);

    const chokeVolante = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.025, 8, 18), matAmbarMaquina);
    chokeVolante.position.set(0, 1.48, 0);
    chokeVolante.rotation.x = Math.PI / 2;
    anmGroup.add(chokeVolante);

    const sepGroup = new THREE.Group();
    sepGroup.position.set(0.4, 0.22, -2.2);
    scene.add(sepGroup);

    [-0.95, 0.95].forEach((xBerco) => {
      const saddle = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.65, 1.05), matAcoEscuro);
      saddle.position.set(xBerco, 0.32, 0);
      sepGroup.add(saddle);
    });

    const vaso = new THREE.Mesh(new THREE.CylinderGeometry(0.68, 0.68, 2.8, 24), matAcoMedio);
    vaso.rotation.z = Math.PI / 2;
    vaso.position.y = 1.05;
    sepGroup.add(vaso);

    [-1.4, 1.4].forEach((xCap) => {
      const cap = new THREE.Mesh(new THREE.SphereGeometry(0.68, 20, 14), matAcoMedio);
      cap.scale.set(0.45, 1, 1);
      cap.position.set(xCap, 1.05, 0);
      sepGroup.add(cap);
    });

    [-0.7, 0.7].forEach((xRing) => {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.695, 0.028, 8, 28), matAmbarMaquina);
      ring.rotation.y = Math.PI / 2;
      ring.position.set(xRing, 1.05, 0);
      sepGroup.add(ring);
    });

    const dome = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.45, 14), matAmbarMaquina);
    dome.position.set(0.6, 1.85, 0);
    sepGroup.add(dome);

    const curvaLinha = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-3.4, 1.15, 0.4),
      new THREE.Vector3(-3.4, 1.15, -2.2),
      new THREE.Vector3(-1.3, 1.15, -2.2),
    ]);

    const tuboGeo = new THREE.TubeGeometry(curvaLinha, 32, 0.08, 12, false);
    const tuboMat = new THREE.MeshStandardMaterial({
      color: 0xf5a623,
      transparent: true,
      opacity: 0.26,
      roughness: 0.2,
    });
    const tuboLinha = new THREE.Mesh(tuboGeo, tuboMat);
    scene.add(tuboLinha);

    const qtdParticulas = 22;
    const partGeo = new THREE.BufferGeometry();
    const partPositions = new Float32Array(qtdParticulas * 3);
    const partOffsets = Array.from({ length: qtdParticulas }, (_, i) => i / qtdParticulas);

    partGeo.setAttribute("position", new THREE.BufferAttribute(partPositions, 3));
    const partMat = new THREE.PointsMaterial({
      color: 0xf5a623,
      size: 0.14,
      transparent: true,
      opacity: 0.95,
    });
    const partPoints = new THREE.Points(partGeo, partMat);
    scene.add(partPoints);

    let isDragging = false;
    let prevX = 0;
    let prevY = 0;

    const currentTarget = new THREE.Vector3(...PRESETS.geral.target);
    const desiredTarget = new THREE.Vector3(...PRESETS.geral.target);
    let spherical = {
      theta: PRESETS.geral.theta,
      phi: PRESETS.geral.phi,
      radius: PRESETS.geral.radius,
    };
    let desiredSpherical = { ...spherical };
    let ultimoPreset = presetRef.current;

    const onPointerDown = (e) => {
      isDragging = true;
      prevX = e.clientX;
      prevY = e.clientY;
    };

    const onPointerMove = (e) => {
      if (!isDragging) return;
      const dx = e.clientX - prevX;
      const dy = e.clientY - prevY;
      prevX = e.clientX;
      prevY = e.clientY;
      desiredSpherical.theta -= dx * 0.0065;
      desiredSpherical.phi = Math.max(0.32, Math.min(1.42, desiredSpherical.phi - dy * 0.0055));
    };

    const onPointerUp = () => {
      isDragging = false;
    };

    const onWheel = (e) => {
      e.preventDefault();
      desiredSpherical.radius = Math.max(3.8, Math.min(16.0, desiredSpherical.radius + e.deltaY * 0.005));
    };

    const dom = renderer.domElement;
    dom.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    dom.addEventListener("wheel", onWheel, { passive: false });

    const resizeObserver = new ResizeObserver(() => {
      if (!container) return;
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
    let crankAngle = 0;
    let hudTick = 0;
    const clock = new THREE.Clock();
    const projVec = new THREE.Vector3();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const dt = clock.getDelta();
      const t = clock.getElapsedTime();

      if (presetRef.current !== ultimoPreset) {
        ultimoPreset = presetRef.current;
        const p = PRESETS[ultimoPreset] || PRESETS.geral;
        desiredTarget.set(...p.target);
        desiredSpherical = { theta: p.theta, phi: p.phi, radius: p.radius };
      }

      for (const m of materiaisWire) {
        m.wireframe = raioXRef.current;
      }

      const omega = (cadenciaRef.current / 60) * Math.PI * 2;
      crankAngle = (crankAngle + omega * dt) % (Math.PI * 2);

      crankPivot.rotation.z = -crankAngle;
      const beamRot = Math.sin(crankAngle) * 0.25;
      beamPivot.rotation.z = beamRot;

      const rodTravel = Math.sin(crankAngle) * 0.42;
      polishedRod.position.y = 1.55 - rodTravel;
      pitmanGroup.position.y = 1.82 + Math.sin(crankAngle) * 0.28;
      pitmanGroup.rotation.z = Math.cos(crankAngle) * 0.14;

      chokeVolante.rotation.y = (chokeRef.current / 100) * Math.PI * 2;

      const vibAmp = falhaRef.current ? 0.032 : 0.008;
      motorBody.position.x = Math.sin(t * 72) * vibAmp;
      motorBody.position.y = 0.68 + Math.cos(t * 66) * vibAmp;

      const corStatus = falhaRef.current ? 0xef4444 : 0xf5a623;
      matAlertaBeacon.color.setHex(corStatus);
      partMat.color.setHex(corStatus);
      tuboMat.color.setHex(corStatus);

      const flowSpeed = (0.18 + (chokeRef.current / 100) * 0.45) * (cadenciaRef.current / 10.5);
      const posArr = partGeo.attributes.position.array;
      for (let i = 0; i < qtdParticulas; i++) {
        partOffsets[i] = (partOffsets[i] + flowSpeed * dt) % 1;
        const pt = curvaLinha.getPointAt(partOffsets[i]);
        posArr[i * 3] = pt.x;
        posArr[i * 3 + 1] = pt.y;
        posArr[i * 3 + 2] = pt.z;
      }
      partGeo.attributes.position.needsUpdate = true;

      currentTarget.lerp(desiredTarget, 0.09);
      spherical.theta += (desiredSpherical.theta - spherical.theta) * 0.09;
      spherical.phi += (desiredSpherical.phi - spherical.phi) * 0.09;
      spherical.radius += (desiredSpherical.radius - spherical.radius) * 0.09;

      camera.position.x =
        currentTarget.x + spherical.radius * Math.sin(spherical.phi) * Math.sin(spherical.theta);
      camera.position.y = currentTarget.y + spherical.radius * Math.cos(spherical.phi);
      camera.position.z =
        currentTarget.z + spherical.radius * Math.sin(spherical.phi) * Math.cos(spherical.theta);
      camera.lookAt(currentTarget);

      renderer.render(scene, camera);

      const cw = container.clientWidth;
      const ch = container.clientHeight;
      for (const pin of PINS_CONFIG) {
        const el = pinsDomRef.current[pin.id];
        if (!el) continue;
        projVec.set(...pin.pos).project(camera);
        const visible = projVec.z < 1;
        const x = (projVec.x * 0.5 + 0.5) * cw;
        const y = (-projVec.y * 0.5 + 0.5) * ch;
        el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
        el.style.opacity = visible ? "1" : "0";
      }

      hudTick++;
      if (hudTick % 6 === 0) {
        const deg = Math.round((crankAngle * 180) / Math.PI);
        const curso = Number((1.55 + Math.sin(crankAngle) * 1.55).toFixed(2));
        setTelemetria3D({ angulo: deg, curso });
      }
    };

    animate();

    return () => {
      cancelAnimationFrame(animId);
      resizeObserver.disconnect();
      dom.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      dom.removeEventListener("wheel", onWheel);
      renderer.dispose();
    };
  }, []);

  const statusPorAtivo = (id) => {
    const found = equipamentos.find((e) => e.id === id);
    return found ? classeDoStatus(found.status) : "normal";
  };

  return (
    <div className="op-twin-panel">
      <div className="op-twin-head">
        <div className="op-twin-title">
          <i />
          <span>GÊMEO DIGITAL 3D // CONJUNTO UB-04 + ANM-07 + SEPARADOR</span>
        </div>

        <div className="op-twin-presets" role="group" aria-label="Câmeras 3D">
          {Object.entries(PRESETS).map(([key, cfg]) => (
            <button
              type="button"
              key={key}
              className={`op-preset-btn ${presetAtivo === key ? "ativo" : ""}`}
              onClick={() => setPresetAtivo(key)}
            >
              {cfg.label}
            </button>
          ))}
          <button
            type="button"
            className={`op-preset-btn ${raioX ? "ativo" : ""}`}
            onClick={() => setRaioX((v) => !v)}
          >
            Raio-X
          </button>
        </div>
      </div>

      <div className="op-twin-stage">
        <div ref={mountRef} className="op-twin-canvas" />

        <span className="op-corner tl" />
        <span className="op-corner tr" />
        <span className="op-corner bl" />
        <span className="op-corner br" />

        <div className="op-twin-hud-tl">
          <div>
            ÂNGULO MANIVELA: <b>{String(telemetria3D.angulo).padStart(3, "0")}.0°</b>
          </div>
          <div>
            CURSO HASTE: <b>{telemetria3D.curso.toFixed(2)} m</b>
          </div>
          <div>
            FLUXO LINHA:{" "}
            <b className={falhaSimulada ? "is-critico" : "is-ok"}>
              {falhaSimulada ? "TURBULENTO / SOBREPRESSÃO" : "LAMINAR ESTÁVEL"}
            </b>
          </div>
        </div>

        <div className="op-twin-pins">
          {PINS_CONFIG.map((pin) => (
            <button
              type="button"
              key={pin.id}
              ref={(el) => {
                pinsDomRef.current[pin.id] = el;
              }}
              className={`op-3d-pin is-${statusPorAtivo(pin.statusKey)}`}
              onClick={() => {
                const eq = equipamentos.find((e) => e.id === pin.statusKey);
                if (eq?.presetCamera) setPresetAtivo(eq.presetCamera);
              }}
            >
              <i />
              <b>{pin.tag}</b>
              <span>{pin.nome}</span>
            </button>
          ))}
        </div>

        <div className="op-twin-hint">
          ARRASTAR: ÓRBITA 360° • SCROLL: ZOOM • CLIQUE NOS PINS: INSPECIONAR
        </div>
      </div>
    </div>
  );
}