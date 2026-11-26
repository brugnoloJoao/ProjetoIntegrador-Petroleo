// Forno de processo vertical: queimadores, serpentina radiante, convecção e chaminé.
import * as THREE from 'three';
export default {
  titulo: 'FORNO DE PROCESSO',
  presets: {
    geral: { label: 'Visão Geral', target: [0, 3.6, 0], theta: 0.5, phi: 1.18, radius: 16.5 },
    queimadores: { label: 'Queimadores', target: [0, 1.1, 0], theta: 0.15, phi: 1.28, radius: 6 },
    serpentina: { label: 'Serpentina', target: [0, 2.4, 0], theta: -0.2, phi: 1.25, radius: 7 },
    chamine: { label: 'Chaminé', target: [0, 5.6, 0], theta: 0.8, phi: 1.2, radius: 8 },
  },
  pins: [
    { id: 'queimador', nome: 'Queimadores', pos: [0.4, 0.75, 1.55], preset: 'queimadores', termos: ['combust', 'press'] },
    { id: 'serpentina', nome: 'Serpentina Radiante', pos: [-0.9, 2.7, 1.0], preset: 'serpentina', termos: ['parede', 'tubo'] },
    { id: 'saida', nome: 'Saída de Processo', pos: [2.5, 3.35, 0], preset: 'serpentina', termos: ['saída', 'temper'] },
    { id: 'carga', nome: 'Carga', pos: [-2.7, 4.35, 0], preset: 'geral', termos: ['carga', 'vaz'] },
    { id: 'chamine', nome: 'Convecção / Chaminé', pos: [0, 5.9, 0.4], preset: 'chamine' },
  ],
  velocidade: { rotulo: 'CARGA DO FORNO' },

  construir(kit) {
    const { mat, caixa, cilindro, anel, grupo } = kit;
    kit.plataforma(7.6, 5.4);

    for (let i = 0; i < 6; i += 1) {
      const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
      cilindro(0.1, 0.1, 0.8, mat.acoEscuro, { pos: [Math.sin(a) * 1.45, 0.62, Math.cos(a) * 1.45] });
    }
    cilindro(1.62, 1.62, 0.16, mat.acoEscuro, { pos: [0, 1.05, 0], segmentos: 40 });
    // Parede radiante em corte (abertura frontal de 100°).
    cilindro(1.55, 1.55, 2.85, mat.casco, { pos: [0, 2.55, 0], aberto: true, segmentos: 40, inicio: Math.PI * 0.28, arco: Math.PI * 1.44 });
    [1.2, 2.55, 3.92].forEach((y) => anel(1.58, 0.05, mat.ambar, { pos: [0, y, 0], rot: [Math.PI / 2, 0, 0] }));
    cilindro(0.75, 1.58, 0.55, mat.acoMedio, { pos: [0, 4.25, 0], segmentos: 40 });
    caixa(1.5, 0.95, 1.1, mat.acoMedio, { pos: [0, 5.0, 0] });
    [4.75, 5.0, 5.25].forEach((y) => caixa(1.58, 0.06, 1.18, mat.acoEscuro, { pos: [0, y, 0] }));
    cilindro(0.34, 0.44, 2.4, mat.acoEscuro, { pos: [0, 6.65, 0] });
    [6.2, 7.3].forEach((y) => anel(0.42, 0.04, mat.ambar, { pos: [0, y, 0], rot: [Math.PI / 2, 0, 0] }));

    // Plataforma de inspeção com guarda-corpo.
    anel(1.95, 0.025, mat.ambar, { pos: [0, 4.5, 0], rot: [Math.PI / 2, 0, 0] });
    anel(1.95, 0.05, mat.acoEscuro, { pos: [0, 4.02, 0], rot: [Math.PI / 2, 0, 0] });
    for (let i = 0; i < 16; i += 1) {
      const a = (i / 16) * Math.PI * 2;
      cilindro(0.018, 0.018, 0.48, mat.cromo, { pos: [Math.sin(a) * 1.95, 4.26, Math.cos(a) * 1.95], segmentos: 6 });
    }

    // Serpentina helicoidal.
    const helice = [];
    for (let i = 0; i <= 200; i += 1) {
      const t = i / 200;
      const a = t * Math.PI * 12;
      helice.push(new THREE.Vector3(Math.cos(a) * 1.18, 1.65 + t * 2.1, Math.sin(a) * 1.18));
    }
    const curvaSerpentina = new THREE.CatmullRomCurve3(helice);
    const matSerpentina = kit.registrar(new THREE.MeshStandardMaterial({ color: 0xaab2c0, roughness: 0.3, metalness: 0.85, emissive: 0x000000 }));
    kit.malha(new THREE.TubeGeometry(curvaSerpentina, 400, 0.055, 8, false), matSerpentina);

    // Queimadores e chamas.
    const matChamaExterna = new THREE.MeshBasicMaterial({ color: 0xf97316, transparent: true, opacity: 0.75, depthWrite: false });
    const matChamaInterna = new THREE.MeshBasicMaterial({ color: 0xfde68a, transparent: true, opacity: 0.9, depthWrite: false });
    const chamas = [[0, 0.45], [-0.5, -0.1], [0.5, -0.1], [0, -0.55]].map(([x, z]) => {
      cilindro(0.2, 0.26, 0.3, mat.ambar, { pos: [x, 1.2, z] });
      cilindro(0.07, 0.07, 0.55, mat.acoMedio, { pos: [x, 0.78, z] });
      const chama = grupo([x, 1.35, z]);
      kit.malha(new THREE.ConeGeometry(0.2, 0.85, 14, 1, true), matChamaExterna, { pos: [0, 0.42, 0], pai: chama });
      kit.malha(new THREE.ConeGeometry(0.1, 0.5, 12, 1, true), matChamaInterna, { pos: [0, 0.25, 0], pai: chama });
      return chama;
    });
    kit.tubulacao([[-2.9, 0.55, 1.5], [0, 0.55, 1.5], [0, 0.55, 0.45]], 0.09, mat.ambar);
    const luz = new THREE.PointLight(0xff8a30, 7, 6, 1.6);
    luz.position.set(0, 1.8, 0.2);
    kit.scene.add(luz);

    const rotaCarga = [[-3.4, 4.1, 0], [-2.2, 4.1, 0], [-2.2, 3.75, 0], [-1.2, 3.75, 0]];
    const rotaSaida = [[1.2, 1.65, 0], [2.2, 1.65, 0], [2.2, 3.1, 0], [3.4, 3.1, 0]];
    kit.tubulacao(rotaCarga, 0.13);
    kit.tubulacao(rotaSaida, 0.13);

    // Fumaça saindo da chaminé.
    const fumaca = new THREE.BufferGeometry();
    const posicoesFumaca = new Float32Array(30 * 3);
    fumaca.setAttribute('position', new THREE.BufferAttribute(posicoesFumaca, 3));
    const matFumaca = new THREE.PointsMaterial({ color: 0x8b93a3, size: 0.22, transparent: true, opacity: 0.35, depthWrite: false });
    const nuvem = new THREE.Points(fumaca, matFumaca);
    nuvem.frustumCulled = false;
    kit.scene.add(nuvem);

    const farol = kit.sinalizador([0.9, 5.65, 0.6]);
    const carga = kit.linhaFluxo(rotaCarga, { raio: 0.16, quantidade: 18 });
    const saida = kit.linhaFluxo(rotaSaida, { raio: 0.16, quantidade: 22 });
    let subida = 0;

    return {
      atualizar(frame) {
        const intensidade = 0.65 + frame.proporcao * 0.35 + (frame.falha ? 0.35 : 0);
        chamas.forEach((chama, i) => {
          const tremor = Math.sin(frame.tempo * 13 + i * 1.7) * 0.12 + Math.sin(frame.tempo * 23 + i) * 0.07;
          chama.scale.set(1 + tremor * 0.4, Math.max(0.3, intensidade + tremor), 1 + tremor * 0.4);
        });
        matChamaExterna.color.setHex(frame.falha ? 0xef4444 : 0xf97316);
        luz.intensity = 5 * intensidade + Math.sin(frame.tempo * 17) * 0.8;
        luz.color.setHex(frame.falha ? 0xff3b30 : 0xff8a30);
        matSerpentina.emissive.setRGB(frame.falha ? 0.45 : frame.razoes.temperatura * 0.12, frame.falha ? 0.04 : 0.02, 0);

        subida = (subida + frame.passo * 0.28) % 1;
        for (let i = 0; i < 30; i += 1) {
          const t = (subida + i / 30) % 1;
          posicoesFumaca.set([Math.sin(i * 2.3) * 0.2 + t * t * 1.1, 7.9 + t * 1.9, Math.cos(i * 3.1) * 0.2], i * 3);
        }
        fumaca.attributes.position.needsUpdate = true;
        matFumaca.color.setHex(frame.falha ? 0x4b5058 : 0x8b93a3);
        matFumaca.opacity = frame.falha ? 0.7 : 0.35;

        farol.color.setHex(frame.corStatus);
        const velocidade = (0.12 + frame.razoes.vazao * 0.35) * frame.proporcao;
        carga.atualizar(frame.passo, velocidade, frame.corStatus);
        saida.atualizar(frame.passo, velocidade, frame.corStatus);
      },
      hud: (frame) => [
        { rotulo: 'CARGA TÉRMICA', valor: `${Math.round(frame.proporcao * 100)} %` },
        { rotulo: 'QUEIMA', valor: frame.falha ? 'INSTÁVEL / SUPERAQUECIMENTO' : 'ESTÁVEL', tom: frame.falha ? 'critico' : 'ok' },
      ],
    };
  },
};
