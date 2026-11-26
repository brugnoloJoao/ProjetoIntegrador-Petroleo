// Unidade de bombeio mecânico (campo de produção): a máquina 3D original do PetroSync.
import * as THREE from 'three';
const PRINCIPAL = 'UB-04';

export default {
  titulo: 'UNIDADE DE BOMBEIO',
  presets: {
    geral: { label: 'Visão Geral', target: [0.2, 1.3, 0.2], theta: 0.62, phi: 1.04, radius: 10.8 },
    poco: { label: 'Cabeça de Poço', target: [-2.6, 1.8, 0.4], theta: 0.45, phi: 1.12, radius: 5.4 },
    motor: { label: 'Motor & Redutor', target: [1.3, 1.1, 0.4], theta: 0.85, phi: 1.08, radius: 5.2 },
    separador: { label: 'Separador', target: [0.4, 1.3, -2.2], theta: -0.42, phi: 1.05, radius: 6.2 },
  },
  pins: [
    { id: 'pin-head', tag: PRINCIPAL, equipamento: PRINCIPAL, nome: 'Cabeça de Cavalo / Balancim', pos: [-2.1, 3.55, 0.4], preset: 'poco' },
    { id: 'pin-sep', tag: 'SEP-02', equipamento: 'SEP-02', nome: 'Separador Trifásico', pos: [0.4, 2.35, -2.2], preset: 'separador', foco: ['vaz', 'flux', 'nível', 'nivel'] },
    { id: 'pin-anm', tag: 'ANM-07', equipamento: 'ANM-07', nome: 'Árvore de Natal / Choke', pos: [-3.4, 1.75, 0.4], preset: 'poco', foco: ['press'] },
    { id: 'pin-gear', tag: 'UB-04-GEAR', equipamento: PRINCIPAL, nome: 'Redutor & Contrapesos', pos: [0.35, 1.45, 0.4], preset: 'motor', foco: ['vibra'] },
    { id: 'pin-mtr', tag: 'MTR-75HP', equipamento: 'MTR-75HP', nome: 'Motor Elétrico 75HP', pos: [1.95, 1.25, 0.4], preset: 'motor', foco: ['temper'] },
  ],
  velocidade: {
    rotulo: 'VELOCIDADE DA MÁQUINA',
    formatar: (cadencia) => `${cadencia.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} ciclos/min`,
  },

  construir(kit) {
    const { mat, caixa, cilindro, anel, grupo, malha } = kit;
    kit.plataforma(8.6, 6.2, -0.6, -0.7);

    const ub = grupo([-0.8, 0.22, 0.4]);
    caixa(4.4, 0.18, 1.3, mat.acoEscuro, { pos: [0, 0.09, 0], pai: ub });

    [[-0.35, 0.34, -0.14, -0.08], [0.35, 0.34, 0.14, -0.08], [-0.35, -0.34, -0.14, 0.08], [0.35, -0.34, 0.14, 0.08]]
      .forEach(([x, z, rotZ, rotX]) => caixa(0.14, 2.55, 0.14, mat.acoMedio, { pos: [-0.45 + x, 1.35, z], rot: [rotX, 0, rotZ], pai: ub }));

    cilindro(0.22, 0.22, 0.72, mat.ambar, { pos: [-0.45, 2.58, 0], rot: [Math.PI / 2, 0, 0], pai: ub });

    const balancim = grupo([-0.45, 2.65, 0], ub);
    caixa(3.4, 0.24, 0.32, mat.ambar, { pos: [0.1, 0.05, 0], pai: balancim });

    const perfil = new THREE.Shape();
    perfil.moveTo(0, 0.45);
    perfil.lineTo(-0.55, 0.45);
    perfil.quadraticCurveTo(-0.82, 0.0, -0.52, -0.68);
    perfil.lineTo(-0.15, -0.68);
    perfil.lineTo(0, 0.05);
    malha(new THREE.ExtrudeGeometry(perfil, { depth: 0.34, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 2 }),
      mat.ambar, { pos: [-1.45, 0.02, -0.17], pai: balancim });

    caixa(0.95, 0.95, 0.85, mat.acoMedio, { pos: [1.15, 0.55, 0], pai: ub });

    const manivela = grupo([1.15, 1.05, 0], ub);
    [-0.54, 0.54].forEach((z) => {
      caixa(0.24, 1.05, 0.12, mat.acoEscuro, { pos: [0, 0.36, z], pai: manivela });
      caixa(0.56, 0.46, 0.2, mat.ambar, { pos: [0, 0.72, z], pai: manivela });
    });

    const biela = grupo([1.15, 1.85, 0], ub);
    [-0.44, 0.44].forEach((z) => cilindro(0.045, 0.045, 1.55, mat.cromo, { pos: [0, 0, z], segmentos: 10, pai: biela }));
    const haste = cilindro(0.038, 0.038, 1.8, mat.cromo, { pos: [-2.12, 1.55, 0], segmentos: 12, pai: ub });

    const motorGrupo = grupo([2.75, 0.22, 0.4]);
    caixa(1.15, 0.24, 0.9, mat.acoEscuro, { pos: [0, 0.12, 0], pai: motorGrupo });
    const motorCorpo = grupo([0, 0.68, 0], motorGrupo);
    cilindro(0.38, 0.38, 0.95, mat.motor, { rot: [0, 0, Math.PI / 2], segmentos: 20, pai: motorCorpo });
    for (let x = -0.35; x <= 0.35; x += 0.1) {
      anel(0.39, 0.018, mat.acoEscuro, { pos: [x, 0, 0], rot: [0, Math.PI / 2, 0], pai: motorCorpo });
    }
    caixa(0.85, 0.26, 0.14, mat.acoEscuro, { pos: [-0.55, 0.72, 0.42], rot: [0, 0, -0.25], pai: motorGrupo });
    const farol = kit.sinalizador([0, 1.18, 0], motorGrupo);

    const arvore = grupo([-3.4, 0.22, 0.4]);
    cilindro(0.18, 0.24, 1.35, mat.acoMedio, { pos: [0, 0.68, 0], pai: arvore });
    [0.42, 0.82, 1.18].forEach((y) => cilindro(0.28, 0.28, 0.08, mat.ambar, { pos: [0, y, 0], pai: arvore }));
    cilindro(0.09, 0.09, 0.75, mat.acoEscuro, { pos: [0.38, 0.95, 0], rot: [0, 0, Math.PI / 2], pai: arvore });
    const volante = anel(0.18, 0.025, mat.ambar, { pos: [0, 1.48, 0], rot: [Math.PI / 2, 0, 0], pai: arvore });

    const separador = grupo([0.4, 0.22, -2.2]);
    [-0.95, 0.95].forEach((x) => caixa(0.24, 0.65, 1.05, mat.acoEscuro, { pos: [x, 0.32, 0], pai: separador }));
    cilindro(0.68, 0.68, 2.8, mat.acoMedio, { pos: [0, 1.05, 0], rot: [0, 0, Math.PI / 2], pai: separador });
    [-1.4, 1.4].forEach((x) => kit.esfera(0.68, mat.acoMedio, { pos: [x, 1.05, 0], escala: [0.45, 1, 1], pai: separador }));
    [-0.7, 0.7].forEach((x) => anel(0.695, 0.028, mat.ambar, { pos: [x, 1.05, 0], rot: [0, Math.PI / 2, 0], pai: separador }));
    cilindro(0.18, 0.18, 0.45, mat.ambar, { pos: [0.6, 1.85, 0], segmentos: 14, pai: separador });

    const fluxo = kit.linhaFluxo(null, {
      curva: new THREE.CatmullRomCurve3([
        new THREE.Vector3(-3.4, 1.15, 0.4),
        new THREE.Vector3(-3.4, 1.15, -2.2),
        new THREE.Vector3(-1.3, 1.15, -2.2),
      ]),
    });

    let angulo = 0;
    return {
      atualizar(frame) {
        angulo = (angulo + (frame.cadencia / 60) * Math.PI * 2 * frame.passo) % (Math.PI * 2);
        manivela.rotation.z = -angulo;
        balancim.rotation.z = Math.sin(angulo) * 0.25;
        haste.position.y = 1.55 - Math.sin(angulo) * 0.42;
        biela.position.y = 1.82 + Math.sin(angulo) * 0.28;
        biela.rotation.z = Math.cos(angulo) * 0.14;
        volante.rotation.y = frame.razoes.pressao * Math.PI * 2;

        const vibracao = 0.008 + frame.razoes.vibracao * 0.024 + (frame.falha ? 0.008 : 0);
        motorCorpo.position.x = Math.sin(frame.tempo * 72) * vibracao;
        motorCorpo.position.y = 0.68 + Math.cos(frame.tempo * 66) * vibracao;

        farol.color.setHex(frame.corStatus);
        fluxo.atualizar(frame.passo, (0.18 + frame.razoes.vazao * 0.45) * (frame.cadencia / 10.5), frame.corStatus);
      },
      hud: (frame) => [
        { rotulo: 'ÂNGULO MANIVELA', valor: `${String(Math.round((angulo * 180) / Math.PI)).padStart(3, '0')}.0°` },
        { rotulo: 'CURSO HASTE', valor: `${(1.55 + Math.sin(angulo) * 1.55).toFixed(2)} m` },
        { rotulo: 'FLUXO LINHA', valor: frame.falha ? 'TURBULENTO / SOBREPRESSÃO' : 'LAMINAR ESTÁVEL', tom: frame.falha ? 'critico' : 'ok' },
      ],
    };
  },
};
