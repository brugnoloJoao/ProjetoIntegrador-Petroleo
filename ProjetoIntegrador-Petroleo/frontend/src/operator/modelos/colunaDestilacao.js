// Coluna de destilação em corte: pratos, vapores, refluxo, retiradas laterais e refervedor.
import * as THREE from 'three';

export default {
  titulo: 'COLUNA DE DESTILAÇÃO',
  presets: {
    geral: { label: 'Visão Geral', target: [0.3, 3.5, 0], theta: 0.35, phi: 1.28, radius: 14.5 },
    topo: { label: 'Topo & Refluxo', target: [1.0, 5.8, 0], theta: 0.45, phi: 1.22, radius: 7.4 },
    pratos: { label: 'Pratos', target: [0, 3.4, 0], theta: -0.1, phi: 1.35, radius: 6.8 },
    fundo: { label: 'Fundo & Refervedor', target: [-0.8, 1.2, 0], theta: -0.35, phi: 1.2, radius: 6.4 },
  },
  pins: [
    { id: 'topo', nome: 'Topo da Coluna', pos: [-0.5, 6.7, 0.7], preset: 'topo', termos: ['temperatura de topo'] },
    { id: 'pratos', nome: 'Pratos / Pressão', pos: [-0.95, 3.9, 0.8], preset: 'pratos', termos: ['press'] },
    { id: 'refluxo', nome: 'Vaso de Refluxo', pos: [2.6, 5.75, 0.4], preset: 'topo', termos: ['refluxo', 'vaz'] },
    { id: 'fundo', nome: 'Refervedor / Fundo', pos: [-2.5, 1.65, 0.5], preset: 'fundo', termos: ['temperatura de fundo'] },
    { id: 'nivel', nome: 'Nível de Fundo', pos: [0.95, 1.1, 0.9], preset: 'fundo', termos: ['nível', 'nivel'] },
  ],
  velocidade: { rotulo: 'CARGA DA COLUNA' },

  construir(kit) {
    const { mat, caixa, cilindro, anel } = kit;
    const RAIO = 0.95;
    kit.plataforma(8.2, 4.6);

    cilindro(1.08, 1.2, 0.55, mat.acoEscuro, { pos: [0, 0.48, 0], segmentos: 36 });
    cilindro(RAIO, RAIO, 5.8, mat.casco, { pos: [0, 3.65, 0], aberto: true, segmentos: 40, inicio: Math.PI * 0.27, arco: Math.PI * 1.46 });
    kit.malha(new THREE.SphereGeometry(RAIO, 36, 12, 0, Math.PI * 2, 0, Math.PI / 2), mat.acoMedio, { pos: [0, 6.55, 0], escala: [1, 0.5, 1] });
    kit.malha(new THREE.SphereGeometry(RAIO, 36, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), mat.acoMedio, { pos: [0, 0.75, 0], escala: [1, 0.3, 1] });
    [0.75, 6.55].forEach((y) => anel(RAIO + 0.01, 0.05, mat.ambar, { pos: [0, y, 0], rot: [Math.PI / 2, 0, 0] }));
    for (let y = 2.0; y <= 5.9; y += 0.55) cilindro(RAIO - 0.04, RAIO - 0.04, 0.035, mat.cromo, { pos: [0, y, 0], segmentos: 32, inicio: Math.PI * 0.1, arco: Math.PI * 1.8 });

    // Passarelas com guarda-corpo e escada.
    [2.28, 4.48, 6.2].forEach((y) => {
      anel(1.28, 0.06, mat.acoEscuro, { pos: [0, y, 0], rot: [Math.PI / 2, 0, 0] });
      anel(1.34, 0.022, mat.ambar, { pos: [0, y + 0.42, 0], rot: [Math.PI / 2, 0, 0] });
      for (let i = 0; i < 12; i += 1) {
        const a = (i / 12) * Math.PI * 2;
        cilindro(0.016, 0.016, 0.42, mat.cromo, { pos: [Math.sin(a) * 1.34, y + 0.21, Math.cos(a) * 1.34], segmentos: 6 });
      }
    });
    [-0.16, 0.16].forEach((x) => cilindro(0.02, 0.02, 5.9, mat.ambar, { pos: [x, 3.25, -1.42], segmentos: 6 }));
    for (let y = 0.45; y <= 6.1; y += 0.24) caixa(0.32, 0.025, 0.025, mat.cromo, { pos: [0, y, -1.42] });

    // Nível de líquido no fundo.
    const matLiquido = new THREE.MeshStandardMaterial({ color: 0x8a5a12, transparent: true, opacity: 0.8, roughness: 0.15 });
    const liquido = cilindro(RAIO - 0.07, RAIO - 0.07, 1, matLiquido, { pos: [0, 1.0, 0], segmentos: 32 });

    // Topo: condensador, vaso de refluxo e retorno.
    const vapor = [[0, 7.0, 0], [0, 7.4, 0], [1.9, 7.4, 0], [1.9, 6.55, 0]];
    kit.tubulacao(vapor, 0.13);
    caixa(0.85, 0.35, 0.65, mat.ambar, { pos: [1.9, 6.45, 0] });
    cilindro(0.38, 0.38, 1.35, mat.acoMedio, { pos: [2.35, 5.3, 0], rot: [0, 0, Math.PI / 2] });
    [1.68, 3.02].forEach((x) => kit.esfera(0.38, mat.acoMedio, { pos: [x, 5.3, 0], escala: [0.45, 1, 1] }));
    cilindro(0.08, 0.08, 4.7, mat.acoEscuro, { pos: [2.9, 2.55, 0] });
    kit.tubulacao([[1.9, 6.28, 0], [1.9, 5.65, 0]], 0.1);
    const refluxo = [[1.95, 4.92, 0], [1.95, 4.75, 0.55], [1.35, 4.75, 0.55], [1.35, 6.0, 0.55], [0.75, 6.0, 0.55]];
    kit.tubulacao(refluxo, 0.08);

    // Retiradas laterais (nafta, querosene e diesel).
    const retiradas = [4.75, 3.65, 2.55].map((y) => {
      const rota = [[-0.9, y, -0.3], [-2.0, y, -0.3], [-2.0, y, -1.5], [-3.6, y, -1.5]];
      kit.tubulacao(rota, 0.08);
      anel(0.12, 0.035, mat.ambar, { pos: [-1.2, y, -0.3], rot: [0, Math.PI / 2, 0] });
      return rota;
    });
    cilindro(0.07, 0.07, 4.6, mat.acoEscuro, { pos: [-3.3, 2.5, -1.5] });

    // Refervedor.
    [-2.9, -2.1].forEach((x) => caixa(0.22, 0.55, 0.9, mat.acoEscuro, { pos: [x, 0.5, 0] }));
    cilindro(0.45, 0.45, 1.5, mat.motor, { pos: [-2.5, 1.12, 0], rot: [0, 0, Math.PI / 2] });
    [-3.25, -1.75].forEach((x) => kit.esfera(0.45, mat.motor, { pos: [x, 1.12, 0], escala: [0.45, 1, 1] }));
    const circulacao = [[-0.9, 0.9, 0.25], [-1.35, 0.55, 0.65], [-2.5, 0.55, 0.65], [-2.5, 0.85, 0.35]];
    const retorno = [[-2.3, 1.55, 0], [-2.3, 1.85, 0], [-0.92, 1.85, 0]];
    kit.tubulacao(circulacao, 0.09);
    kit.tubulacao(retorno, 0.12);

    // Vapores subindo entre os pratos.
    const bolhas = new THREE.BufferGeometry();
    const posicoes = new Float32Array(90 * 3);
    bolhas.setAttribute('position', new THREE.BufferAttribute(posicoes, 3));
    const matBolhas = new THREE.PointsMaterial({ color: kit.cores.ambar, size: 0.09, transparent: true, opacity: 0.8, depthWrite: false });
    const nuvem = new THREE.Points(bolhas, matBolhas);
    nuvem.frustumCulled = false;
    kit.scene.add(nuvem);

    const farol = kit.sinalizador([0.55, 7.05, 0.3]);
    const linhas = [
      kit.linhaFluxo(vapor, { raio: 0.16, quantidade: 18 }),
      kit.linhaFluxo(refluxo, { raio: 0.11, quantidade: 18 }),
      ...retiradas.map((rota) => kit.linhaFluxo(rota, { raio: 0.11, quantidade: 14 })),
      kit.linhaFluxo(circulacao, { raio: 0.12, quantidade: 10 }),
      kit.linhaFluxo(retorno, { raio: 0.15, quantidade: 10 }),
    ];
    let subida = 0;
    let nivelAtual = 0.5;

    return {
      atualizar(frame) {
        subida = (subida + frame.passo * 0.12 * frame.proporcao * (frame.falha ? 2.4 : 1)) % 1;
        for (let i = 0; i < 90; i += 1) {
          const t = (subida + i / 90) % 1;
          const a = i * 2.4;
          const r = 0.15 + ((i * 37) % 60) / 100;
          const agito = frame.falha ? Math.sin(frame.tempo * 9 + i) * 0.1 : 0;
          posicoes.set([Math.cos(a) * r + agito, 1.8 + t * 4.4, Math.sin(a) * r], i * 3);
        }
        bolhas.attributes.position.needsUpdate = true;
        matBolhas.color.setHex(frame.corStatus);

        nivelAtual += (frame.razoes.nivel - nivelAtual) * 0.05;
        const altura = 0.15 + nivelAtual * 0.8;
        liquido.scale.y = altura;
        liquido.position.y = 0.78 + altura / 2;

        const velocidade = (0.1 + frame.razoes.vazao * 0.3) * frame.proporcao;
        linhas.forEach((linha) => linha.atualizar(frame.passo, velocidade, frame.corStatus));
        farol.color.setHex(frame.corStatus);
      },
      hud: (frame) => [
        { rotulo: 'CARGA', valor: `${Math.round(frame.proporcao * 100)} %` },
        { rotulo: 'FRACIONAMENTO', valor: frame.falha ? 'INUNDAÇÃO DE PRATOS' : 'ESTÁVEL', tom: frame.falha ? 'critico' : 'ok' },
      ],
    };
  },
};
