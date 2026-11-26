// Compressor alternativo de dois estágios, com cilindros opostos e volante.
export default {
  titulo: 'COMPRESSOR ALTERNATIVO',
  presets: {
    geral: { label: 'Visão Geral', target: [0.2, 1.3, 0], theta: 0.6, phi: 1.02, radius: 10.2 },
    cilindros: { label: 'Cilindros', target: [-0.8, 1.2, 0], theta: 0.1, phi: 0.95, radius: 6.2 },
    carter: { label: 'Cárter', target: [-0.8, 1.1, 0.2], theta: -0.5, phi: 1.0, radius: 4.8 },
    motor: { label: 'Motor & Volante', target: [1.8, 1.1, 0], theta: 0.9, phi: 1.1, radius: 5 },
  },
  pins: [
    { id: 'estagio1', nome: 'Cilindro 1º Estágio', pos: [-0.8, 1.65, 1.5], preset: 'cilindros', termos: ['press'] },
    { id: 'estagio2', nome: 'Cilindro 2º Estágio', pos: [-0.8, 1.65, -1.5], preset: 'cilindros', termos: ['temper'] },
    { id: 'carter', nome: 'Cárter / Virabrequim', pos: [-0.8, 1.75, 0], preset: 'carter', termos: ['vibra'] },
    { id: 'motor', nome: 'Motor Principal', pos: [2.5, 1.9, 0], preset: 'motor' },
    { id: 'gas', nome: 'Linha de Gás', pos: [0.6, 3.2, -1.5], preset: 'geral', termos: ['vaz'] },
  ],
  velocidade: { rotulo: 'ROTAÇÃO DO COMPRESSOR' },

  construir(kit) {
    const { mat, caixa, cilindro, anel, grupo } = kit;
    const EIXO = 1.12;
    kit.plataforma(8.2, 5.4, 0.2, 0);
    caixa(5.2, 0.2, 1.6, mat.acoEscuro, { pos: [0.4, 0.32, 0] });

    const carter = grupo();
    caixa(1.3, 1.0, 1.15, mat.acoMedio, { pos: [-0.8, 0.92, 0], pai: carter });
    caixa(1.0, 0.12, 0.85, mat.ambar, { pos: [-0.8, 1.48, 0], pai: carter });

    const montarCilindro = (lado, raio) => {
      const conjunto = grupo([-0.8, EIXO, 0]);
      cilindro(0.12, 0.12, 0.55, mat.acoEscuro, { pos: [0, 0, lado * 0.8], rot: [Math.PI / 2, 0, 0], pai: conjunto });
      cilindro(raio, raio, 0.95, mat.casco, { pos: [0, 0, lado * 1.5], rot: [Math.PI / 2, 0, 0], aberto: true, inicio: Math.PI * 1.25, arco: Math.PI * 1.5, pai: conjunto });
      [1.03, 1.97].forEach((z) => anel(raio, 0.055, mat.ambar, { pos: [0, 0, lado * z], pai: conjunto }));
      cilindro(raio, raio, 0.08, mat.acoMedio, { pos: [0, 0, lado * 2.0], rot: [Math.PI / 2, 0, 0], pai: conjunto });
      for (let z = 1.15; z <= 1.85; z += 0.14) anel(raio + 0.03, 0.016, mat.acoEscuro, { pos: [0, 0, lado * z], pai: conjunto });

      const pistao = grupo([0, 0, lado * 1.5], conjunto);
      cilindro(raio - 0.07, raio - 0.07, 0.24, mat.cromo, { rot: [Math.PI / 2, 0, 0], pai: pistao });
      cilindro(0.05, 0.05, 0.95, mat.cromo, { pos: [0, 0, -lado * 0.55], rot: [Math.PI / 2, 0, 0], pai: pistao });
      caixa(0.16, 0.45, 0.16, mat.acoEscuro, { pos: [0, -0.62, lado * 1.5], pai: conjunto });
      return { pistao, lado };
    };
    const pistoes = [montarCilindro(1, 0.46), montarCilindro(-1, 0.36)];

    // Garrafas amortecedoras de pulsação sobre os cilindros.
    [1.5, -1.5].forEach((z) => {
      cilindro(0.24, 0.24, 1.25, mat.acoMedio, { pos: [-0.8, 2.25, z], rot: [0, 0, Math.PI / 2] });
      [-1.42, -0.18].forEach((x) => kit.esfera(0.24, mat.acoMedio, { pos: [x, 2.25, z], escala: [0.5, 1, 1] }));
      cilindro(0.11, 0.11, 0.6, mat.acoEscuro, { pos: [-0.8, 1.75, z] });
    });

    // Resfriador intermediário.
    caixa(1.15, 0.75, 0.7, mat.acoEscuro, { pos: [-3.0, 0.82, 0] });
    for (let x = -3.45; x <= -2.55; x += 0.15) caixa(0.04, 0.62, 0.76, mat.acoMedio, { pos: [x, 0.82, 0] });

    kit.tubulacao([[-1.42, 2.25, 1.5], [-3.0, 2.25, 1.5], [-3.0, 2.25, 0], [-3.0, 1.2, 0]], 0.1);
    kit.tubulacao([[-3.0, 1.2, 0], [-3.0, 2.25, -0.4], [-3.0, 2.25, -1.5], [-1.42, 2.25, -1.5]], 0.1);
    const rotaGas = [[-0.18, 2.25, -1.5], [0.6, 2.25, -1.5], [0.6, 3.0, -1.5], [3.6, 3.0, -1.5]];
    const rotaAdm = [[3.6, 3.0, 1.5], [0.6, 3.0, 1.5], [0.6, 2.25, 1.5], [-0.18, 2.25, 1.5]];
    kit.tubulacao(rotaGas, 0.13);
    kit.tubulacao(rotaAdm, 0.13);
    [rotaGas, rotaAdm].forEach((rota) => cilindro(0.06, 0.06, 2.75, mat.acoEscuro, { pos: [2.6, 1.6, rota[0][2]] }));

    // Virabrequim, volante e motor.
    const eixo = grupo([0, EIXO, 0]);
    cilindro(0.09, 0.09, 2.2, mat.cromo, { pos: [0.7, 0, 0], rot: [0, 0, Math.PI / 2], pai: eixo });
    const volante = grupo([0.65, 0, 0], eixo);
    anel(0.72, 0.1, mat.ambar, { rot: [0, Math.PI / 2, 0], pai: volante });
    [0, Math.PI / 3, (2 * Math.PI) / 3].forEach((a) => caixa(0.08, 1.35, 0.09, mat.acoEscuro, { rot: [a, 0, 0], pai: volante }));

    const motor = kit.motor([2.5, 0.42, 0], { comprimento: 1.45, raio: 0.52 });
    motor.corpo.position.y = EIXO - 0.42;
    const farol = kit.sinalizador([2.5, 2.1, 0]);

    const admissao = kit.linhaFluxo(rotaAdm, { raio: 0.16, quantidade: 24 });
    const gas = kit.linhaFluxo(rotaGas, { raio: 0.16, quantidade: 24 });

    let angulo = 0;
    return {
      atualizar(frame) {
        angulo = (angulo + frame.proporcao * 6 * frame.passo) % (Math.PI * 2);
        eixo.rotation.x = angulo;
        pistoes.forEach(({ pistao, lado }) => { pistao.position.z = lado * (1.5 + Math.sin(angulo) * lado * 0.26); });
        kit.vibrar(motor.corpo, frame);
        kit.vibrar(carter, frame);
        farol.color.setHex(frame.corStatus);
        const velocidade = (0.12 + frame.razoes.vazao * 0.38) * frame.proporcao;
        admissao.atualizar(frame.passo, velocidade, frame.corStatus);
        gas.atualizar(frame.passo, velocidade * 1.5, frame.corStatus);
      },
      hud: (frame) => [
        { rotulo: 'ROTAÇÃO', valor: `${Math.round(890 * frame.proporcao)} rpm` },
        { rotulo: 'CURSO PISTÃO', valor: `${Math.round(50 + Math.sin(angulo) * 50)} %` },
        { rotulo: 'COMPRESSÃO', valor: frame.falha ? 'PULSAÇÃO / SOBREPRESSÃO' : 'REGULAR', tom: frame.falha ? 'critico' : 'ok' },
      ],
    };
  },
};
