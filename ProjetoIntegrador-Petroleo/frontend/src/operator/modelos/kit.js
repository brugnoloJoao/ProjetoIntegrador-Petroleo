// Peças e materiais compartilhados pelas máquinas 3D.
import * as THREE from 'three';

export const CORES = {
  ambar: 0xf5a623,
  critico: 0xef4444,
  frio: 0x60a5fa,
};

export function criarKit(scene) {
  // Materiais registrados respondem ao botão Raio-X.
  const materiaisWire = [];
  const registrar = (material) => {
    materiaisWire.push(material);
    return material;
  };
  const padrao = (color, roughness, metalness, extras = {}) =>
    registrar(new THREE.MeshStandardMaterial({ color, roughness, metalness, ...extras }));

  const mat = {
    concreto: padrao(0x262930, 0.9, 0.1),
    meioFio: padrao(0xf5a623, 0.5, 0.2),
    acoEscuro: padrao(0x181b20, 0.45, 0.75),
    acoMedio: padrao(0x3a3f4b, 0.38, 0.8),
    ambar: padrao(0xf5a623, 0.35, 0.45),
    cromo: padrao(0xe5e7eb, 0.2, 0.92),
    motor: padrao(0xb45309, 0.4, 0.6),
    // Casco aberto: mostra o interior dos vasos em corte.
    casco: padrao(0x4a505e, 0.42, 0.7, { side: THREE.DoubleSide }),
  };

  function malha(geometria, material, { pos, rot, escala, pai = scene } = {}) {
    const objeto = new THREE.Mesh(geometria, material);
    if (pos) objeto.position.set(...pos);
    if (rot) objeto.rotation.set(...rot);
    if (escala) objeto.scale.set(...escala);
    pai.add(objeto);
    return objeto;
  }

  const caixa = (largura, altura, profundidade, material, opcoes) =>
    malha(new THREE.BoxGeometry(largura, altura, profundidade), material, opcoes);

  const cilindro = (raioTopo, raioBase, altura, material, opcoes = {}) =>
    malha(new THREE.CylinderGeometry(
      raioTopo, raioBase, altura, opcoes.segmentos ?? 24, 1,
      opcoes.aberto ?? false, opcoes.inicio ?? 0, opcoes.arco ?? Math.PI * 2,
    ), material, opcoes);

  const esfera = (raio, material, opcoes) =>
    malha(new THREE.SphereGeometry(raio, 22, 16), material, opcoes);

  const anel = (raio, espessura, material, opcoes) =>
    malha(new THREE.TorusGeometry(raio, espessura, 8, 32), material, opcoes);

  function grupo(pos = [0, 0, 0], pai = scene) {
    const objeto = new THREE.Group();
    objeto.position.set(...pos);
    pai.add(objeto);
    return objeto;
  }

  function plataforma(largura, profundidade, x = 0, z = 0) {
    caixa(largura, 0.22, profundidade, mat.concreto, { pos: [x, 0.11, z] }).receiveShadow = true;
    for (let px = x - largura / 2 + 0.3; px <= x + largura / 2 - 0.29; px += 0.9) {
      caixa(0.62, 0.14, 0.18, mat.meioFio, { pos: [px, 0.26, z + profundidade / 2 - 0.1] });
      caixa(0.62, 0.14, 0.18, mat.meioFio, { pos: [px, 0.26, z - profundidade / 2 + 0.1] });
    }
  }

  function caminho(pontos) {
    const vetores = pontos.map((ponto) => new THREE.Vector3(...ponto));
    const curva = new THREE.CurvePath();
    for (let i = 1; i < vetores.length; i += 1) curva.add(new THREE.LineCurve3(vetores[i - 1], vetores[i]));
    return curva;
  }

  // Tubulação de aço em trechos retos, com junta esférica nas curvas.
  function tubulacao(pontos, raio = 0.1, material = mat.acoMedio, pai = scene) {
    for (let i = 1; i < pontos.length; i += 1) {
      const inicio = new THREE.Vector3(...pontos[i - 1]);
      const fim = new THREE.Vector3(...pontos[i]);
      const direcao = fim.clone().sub(inicio);
      const trecho = cilindro(raio, raio, direcao.length(), material, { segmentos: 14, pai });
      trecho.position.copy(inicio).addScaledVector(direcao, 0.5);
      trecho.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direcao.normalize());
      if (i < pontos.length - 1) esfera(raio * 1.25, material, { pos: pontos[i], pai });
    }
  }

  // Linha de processo translúcida com partículas que mostram o escoamento.
  function linhaFluxo(pontos, { raio = 0.08, quantidade = 22, curva, cor = CORES.ambar, fixa = false } = {}) {
    const trajeto = curva ?? caminho(pontos);
    const materialTubo = new THREE.MeshStandardMaterial({ color: cor, transparent: true, opacity: 0.26, roughness: 0.2, depthWrite: false });
    scene.add(new THREE.Mesh(new THREE.TubeGeometry(trajeto, 96, raio, 12, false), materialTubo));

    const geometria = new THREE.BufferGeometry();
    const posicoes = new Float32Array(quantidade * 3);
    const deslocamentos = Array.from({ length: quantidade }, (_, i) => i / quantidade);
    geometria.setAttribute('position', new THREE.BufferAttribute(posicoes, 3));
    const materialPontos = new THREE.PointsMaterial({ color: cor, size: 0.14, transparent: true, opacity: 0.95 });
    const pontosFluxo = new THREE.Points(geometria, materialPontos);
    pontosFluxo.frustumCulled = false;
    scene.add(pontosFluxo);

    return {
      atualizar(passo, velocidade, corStatus) {
        if (!fixa) {
          materialTubo.color.setHex(corStatus);
          materialPontos.color.setHex(corStatus);
        }
        for (let i = 0; i < quantidade; i += 1) {
          deslocamentos[i] = (deslocamentos[i] + velocidade * passo) % 1;
          const ponto = trajeto.getPointAt(deslocamentos[i]);
          posicoes.set([ponto.x, ponto.y, ponto.z], i * 3);
        }
        geometria.attributes.position.needsUpdate = true;
      },
    };
  }

  function sinalizador(pos, pai = scene) {
    const material = new THREE.MeshBasicMaterial({ color: CORES.ambar });
    esfera(0.11, material, { pos, pai });
    return material;
  }

  // Motor elétrico horizontal (eixo no sentido X), com base.
  function motor(pos, { comprimento = 0.95, raio = 0.38 } = {}) {
    const base = grupo(pos);
    caixa(comprimento + 0.2, 0.24, raio * 2.4, mat.acoEscuro, { pos: [0, 0.12, 0], pai: base });
    const corpo = grupo([0, 0.3 + raio, 0], base);
    cilindro(raio, raio, comprimento, mat.motor, { rot: [0, 0, Math.PI / 2], pai: corpo });
    for (let x = -comprimento / 2 + 0.12; x <= comprimento / 2 - 0.12; x += 0.1) {
      anel(raio + 0.01, 0.018, mat.acoEscuro, { pos: [x, 0, 0], rot: [0, Math.PI / 2, 0], pai: corpo });
    }
    caixa(0.28, 0.16, 0.3, mat.acoEscuro, { pos: [0, raio + 0.06, 0], pai: corpo });
    return { base, corpo, alturaEixo: 0.3 + raio };
  }

  // Treme o conjunto em torno da posição original conforme a vibração medida.
  function vibrar(objeto, frame) {
    const origem = objeto.userData.origem ?? (objeto.userData.origem = objeto.position.clone());
    const amplitude = 0.004 + frame.razoes.vibracao * 0.018 + (frame.falha ? 0.012 : 0);
    objeto.position.x = origem.x + Math.sin(frame.tempo * 72) * amplitude;
    objeto.position.y = origem.y + Math.cos(frame.tempo * 66) * amplitude;
  }

  return {
    scene, mat, cores: CORES, materiaisWire, registrar, malha, caixa, cilindro, esfera, anel, grupo,
    plataforma, caminho, tubulacao, linhaFluxo, sinalizador, motor, vibrar,
  };
}
