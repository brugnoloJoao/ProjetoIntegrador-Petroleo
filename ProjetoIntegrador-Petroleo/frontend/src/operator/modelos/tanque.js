// Tanque de armazenamento com teto flutuante, nível em corte, escada e dique de contenção.
import * as THREE from 'three';
export default {
  titulo: 'TANQUE DE ARMAZENAMENTO',
  presets: {
    geral: { label: 'Visão Geral', target: [0, 1.7, 0], theta: 0.5, phi: 0.98, radius: 12.5 },
    teto: { label: 'Teto Flutuante', target: [0, 2.6, 0], theta: 0.2, phi: 0.6, radius: 8 },
    costado: { label: 'Costado & Nível', target: [0, 1.6, 1.2], theta: 0, phi: 1.3, radius: 7 },
    saida: { label: 'Linhas', target: [2.8, 0.9, 0.6], theta: 0.85, phi: 1.1, radius: 5.5 },
  },
  pins: [
    { id: 'teto', nome: 'Teto Flutuante / Nível', pos: [0, 3.55, 0], preset: 'teto', termos: ['nível', 'nivel'] },
    { id: 'costado', nome: 'Costado', pos: [-1.9, 1.9, 1.35], preset: 'costado', termos: ['temper'] },
    { id: 'respiro', nome: 'Respiro / Pressão', pos: [-1.7, 3.65, -1.0], preset: 'teto', termos: ['press'] },
    { id: 'saida', nome: 'Bocal de Saída', pos: [3.1, 1.0, 0.6], preset: 'saida' },
  ],
  velocidade: { rotulo: 'TAXA DE TRANSFERÊNCIA' },

  construir(kit) {
    const { mat, caixa, cilindro, anel, grupo } = kit;
    const RAIO = 2.25;
    kit.plataforma(8.4, 7.2);

    // Dique de contenção.
    [[8.0, 0.18, 0, 3.25], [8.0, 0.18, 0, -3.25]].forEach(([largura, espessura, x, z]) => caixa(largura, 0.42, espessura, mat.concreto, { pos: [x, 0.4, z] }));
    [-3.95, 3.95].forEach((x) => caixa(0.18, 0.42, 6.5, mat.concreto, { pos: [x, 0.4, 0] }));

    cilindro(RAIO + 0.08, RAIO + 0.08, 0.14, mat.acoEscuro, { pos: [0, 0.29, 0], segmentos: 48 });
    cilindro(RAIO, RAIO, 3.0, mat.casco, { pos: [0, 1.85, 0], aberto: true, segmentos: 48, inicio: Math.PI * 0.2, arco: Math.PI * 1.6 });
    [0.38, 1.35, 2.35, 3.35].forEach((y) => anel(RAIO + 0.01, y === 3.35 ? 0.07 : 0.025, y === 3.35 ? mat.ambar : mat.acoEscuro, { pos: [0, y, 0], rot: [Math.PI / 2, 0, 0] }));

    const matProduto = new THREE.MeshStandardMaterial({ color: 0x6b4410, transparent: true, opacity: 0.85, roughness: 0.15, metalness: 0.2 });
    const produto = cilindro(RAIO - 0.06, RAIO - 0.06, 1, matProduto, { pos: [0, 0.9, 0], segmentos: 48 });

    const teto = grupo([0, 2.2, 0]);
    cilindro(RAIO - 0.05, RAIO - 0.05, 0.1, mat.acoMedio, { segmentos: 48, pai: teto });
    anel(RAIO - 0.12, 0.05, mat.ambar, { pos: [0, 0.07, 0], rot: [Math.PI / 2, 0, 0], pai: teto });
    anel(0.9, 0.03, mat.acoEscuro, { pos: [0, 0.07, 0], rot: [Math.PI / 2, 0, 0], pai: teto });
    [0, Math.PI / 3, (2 * Math.PI) / 3].forEach((a) => caixa((RAIO - 0.2) * 2, 0.04, 0.07, mat.acoEscuro, { pos: [0, 0.07, 0], rot: [0, a, 0], pai: teto }));
    cilindro(0.05, 0.05, 1.5, mat.cromo, { pos: [0.65, 0.4, 0], pai: teto });

    // Escada helicoidal no costado.
    for (let i = 0; i < 22; i += 1) {
      const a = Math.PI * 0.75 + (i / 22) * Math.PI * 0.95;
      const y = 0.45 + (i / 22) * 2.9;
      caixa(0.34, 0.05, 0.2, mat.ambar, { pos: [Math.sin(a) * (RAIO + 0.2), y, Math.cos(a) * (RAIO + 0.2)], rot: [0, a, 0] });
      if (i % 3 === 0) cilindro(0.016, 0.016, 0.5, mat.cromo, { pos: [Math.sin(a) * (RAIO + 0.36), y + 0.27, Math.cos(a) * (RAIO + 0.36)], segmentos: 6 });
    }

    // Respiro e indicador de nível externo.
    cilindro(0.09, 0.09, 0.4, mat.acoMedio, { pos: [-1.7, 3.45, -1.0] });
    cilindro(0.22, 0.12, 0.16, mat.ambar, { pos: [-1.7, 3.7, -1.0] });
    const reguaX = Math.sin(Math.PI * 0.15) * (RAIO + 0.12);
    const reguaZ = Math.cos(Math.PI * 0.15) * (RAIO + 0.12);
    caixa(0.07, 2.9, 0.07, mat.acoEscuro, { pos: [reguaX, 1.85, reguaZ] });
    const marcador = caixa(0.24, 0.09, 0.16, mat.ambar, { pos: [reguaX, 1.2, reguaZ] });

    const entrada = [[-3.7, 2.9, 1.2], [-2.9, 2.9, 1.2], [-2.9, 0.75, 1.2], [-1.9, 0.75, 1.2]];
    const saida = [[2.15, 0.7, 0.6], [3.1, 0.7, 0.6], [3.1, 0.7, 2.4], [3.7, 0.7, 2.4]];
    kit.tubulacao(entrada, 0.13);
    kit.tubulacao(saida, 0.15);
    anel(0.24, 0.03, mat.ambar, { pos: [3.1, 1.15, 1.6], rot: [Math.PI / 2, 0, 0] });
    cilindro(0.04, 0.04, 0.42, mat.cromo, { pos: [3.1, 0.95, 1.6] });

    const farol = kit.sinalizador([reguaX, 3.55, reguaZ]);
    const linhaEntrada = kit.linhaFluxo(entrada, { raio: 0.16, quantidade: 18 });
    const linhaSaida = kit.linhaFluxo(saida, { raio: 0.18, quantidade: 18 });
    let nivelAtual = 0.6;

    return {
      atualizar(frame) {
        nivelAtual += (Math.min(1, frame.razoes.nivel) - nivelAtual) * 0.05;
        const ondulacao = Math.sin(frame.tempo * (frame.falha ? 5 : 1.3)) * (frame.falha ? 0.04 : 0.012);
        const altura = 0.2 + nivelAtual * 2.65 + ondulacao;
        produto.scale.y = altura;
        produto.position.y = 0.36 + altura / 2;
        teto.position.y = 0.43 + altura;
        marcador.position.y = 0.43 + altura;
        const velocidade = 0.2 * frame.proporcao;
        linhaEntrada.atualizar(frame.passo, velocidade, frame.corStatus);
        linhaSaida.atualizar(frame.passo, velocidade * 1.2, frame.corStatus);
        farol.color.setHex(frame.corStatus);
      },
      hud: (frame) => [
        { rotulo: 'NÍVEL DO TANQUE', valor: `${Math.round(nivelAtual * 100)} %` },
        { rotulo: 'ARMAZENAMENTO', valor: frame.falha ? 'CONDIÇÃO ANORMAL' : 'SEGURO', tom: frame.falha ? 'critico' : 'ok' },
      ],
    };
  },
};
