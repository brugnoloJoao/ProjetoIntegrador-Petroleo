// Bomba centrífuga horizontal: motor, acoplamento, mancal, selo e voluta.
export default {
  titulo: 'BOMBA CENTRÍFUGA',
  presets: {
    geral: { label: 'Visão Geral', target: [0, 1.15, 0], theta: 0.55, phi: 1.1, radius: 8.4 },
    voluta: { label: 'Voluta', target: [-1.5, 1.2, 0], theta: -0.35, phi: 1.2, radius: 4.4 },
    mancal: { label: 'Selo & Mancal', target: [-0.35, 1.1, 0], theta: 0.15, phi: 1.1, radius: 3.9 },
    motor: { label: 'Motor', target: [1.7, 1.1, 0], theta: 0.7, phi: 1.1, radius: 4.2 },
  },
  pins: [
    { id: 'voluta', nome: 'Voluta / Impelidor', pos: [-1.5, 2.0, 0.35], preset: 'voluta', termos: ['press'] },
    { id: 'selo', nome: 'Selo Mecânico', pos: [-0.85, 1.55, 0.3], preset: 'mancal', termos: ['temper'] },
    { id: 'mancal', nome: 'Mancal', pos: [-0.15, 0.75, 0.6], preset: 'mancal', termos: ['vibra'] },
    { id: 'motor', nome: 'Motor Elétrico', pos: [1.7, 1.85, 0], preset: 'motor' },
    { id: 'descarga', nome: 'Linha de Descarga', pos: [-1.5, 2.95, 0], preset: 'voluta', termos: ['vaz'] },
  ],
  velocidade: { rotulo: 'ROTAÇÃO DA BOMBA' },

  construir(kit) {
    const { mat, caixa, cilindro, anel, grupo } = kit;
    const EIXO = 1.12;
    kit.plataforma(7.4, 4.4);
    caixa(4.9, 0.2, 1.5, mat.acoEscuro, { pos: [0.1, 0.32, 0] });

    const motor = kit.motor([1.7, 0.42, 0], { comprimento: 1.35, raio: 0.46 });
    motor.corpo.position.y = EIXO - 0.42;
    caixa(0.9, 0.2, 0.7, mat.acoMedio, { pos: [1.7, 0.5, 0] });

    // Eixo e acoplamento (giram juntos).
    const eixo = grupo([0, EIXO, 0]);
    cilindro(0.08, 0.08, 2.4, mat.cromo, { pos: [-0.2, 0, 0], rot: [0, 0, Math.PI / 2], pai: eixo });
    [0.5, 0.72].forEach((x) => cilindro(0.26, 0.26, 0.14, mat.ambar, { pos: [x, 0, 0], rot: [0, 0, Math.PI / 2], pai: eixo }));
    [0, 1, 2, 3].forEach((i) => {
      const a = (i * Math.PI) / 2;
      caixa(0.4, 0.07, 0.07, mat.acoEscuro, { pos: [0.61, Math.cos(a) * 0.27, Math.sin(a) * 0.27], pai: eixo });
    });

    const mancal = grupo([-0.2, 0, 0]);
    cilindro(0.31, 0.31, 0.75, mat.acoMedio, { pos: [0, EIXO, 0], rot: [0, 0, Math.PI / 2], pai: mancal });
    caixa(0.55, 0.55, 0.55, mat.acoEscuro, { pos: [0, 0.62, 0], pai: mancal });
    cilindro(0.07, 0.07, 0.28, mat.ambar, { pos: [0, EIXO + 0.42, 0], pai: mancal });
    cilindro(0.22, 0.22, 0.24, mat.cromo, { pos: [-0.62, EIXO, 0], rot: [0, 0, Math.PI / 2], pai: mancal });

    // Voluta em corte, com o impelidor visível pela frente.
    const voluta = grupo([-1.5, EIXO, 0]);
    cilindro(0.82, 0.82, 0.5, mat.casco, { rot: [0, 0, Math.PI / 2], aberto: true, pai: voluta });
    cilindro(0.82, 0.82, 0.05, mat.acoMedio, { pos: [0.25, 0, 0], rot: [0, 0, Math.PI / 2], pai: voluta });
    anel(0.82, 0.07, mat.ambar, { pos: [-0.25, 0, 0], rot: [0, Math.PI / 2, 0], pai: voluta });
    anel(0.82, 0.07, mat.ambar, { pos: [0.25, 0, 0], rot: [0, Math.PI / 2, 0], pai: voluta });
    caixa(0.35, 0.5, 0.8, mat.acoEscuro, { pos: [0, -0.88, 0], pai: voluta });

    const impelidor = grupo([-0.22, 0, 0], voluta);
    cilindro(0.17, 0.17, 0.16, mat.cromo, { rot: [0, 0, Math.PI / 2], pai: impelidor });
    for (let i = 0; i < 7; i += 1) {
      const braco = grupo([0, 0, 0], impelidor);
      braco.rotation.x = (i / 7) * Math.PI * 2;
      caixa(0.1, 0.46, 0.07, mat.ambar, { pos: [0, 0.4, 0.05], rot: [0.45, 0, 0], pai: braco });
    }

    kit.tubulacao([[-1.5, EIXO + 0.75, 0], [-1.5, 2.75, 0], [-1.5, 2.75, -1.5], [1.6, 2.75, -1.5]], 0.17);
    kit.tubulacao([[-3.5, EIXO, 0], [-2.1, EIXO, 0]], 0.22);
    [[-2.2, EIXO, 0], [-2.9, EIXO, 0]].forEach((pos) => anel(0.25, 0.06, mat.ambar, { pos, rot: [0, Math.PI / 2, 0] }));
    anel(0.2, 0.06, mat.ambar, { pos: [-1.5, 2.2, 0], rot: [Math.PI / 2, 0, 0] });
    anel(0.24, 0.03, mat.ambar, { pos: [0.2, 3.1, -1.5], rot: [Math.PI / 2, 0, 0] });
    cilindro(0.04, 0.04, 0.4, mat.cromo, { pos: [0.2, 2.92, -1.5] });
    [-0.4, 1.4].forEach((x) => cilindro(0.06, 0.06, 2.5, mat.acoEscuro, { pos: [x, 1.45, -1.5] }));

    const farol = kit.sinalizador([1.7, 2.0, 0]);
    const succao = kit.linhaFluxo([[-3.5, EIXO, 0], [-1.75, EIXO, 0]], { raio: 0.25, quantidade: 14 });
    const descarga = kit.linhaFluxo([[-1.5, EIXO + 0.75, 0], [-1.5, 2.75, 0], [-1.5, 2.75, -1.5], [1.6, 2.75, -1.5]], { raio: 0.2, quantidade: 30 });

    return {
      atualizar(frame) {
        const giro = frame.proporcao * 7 * frame.passo;
        eixo.rotation.x += giro;
        impelidor.rotation.x += giro;
        kit.vibrar(motor.corpo, frame);
        kit.vibrar(mancal, frame);
        farol.color.setHex(frame.corStatus);
        const velocidade = (0.15 + frame.razoes.vazao * 0.4) * frame.proporcao;
        succao.atualizar(frame.passo, velocidade * 1.4, frame.corStatus);
        descarga.atualizar(frame.passo, velocidade, frame.corStatus);
      },
      hud: (frame) => [
        { rotulo: 'ROTAÇÃO', valor: `${Math.round(1780 * frame.proporcao)} rpm` },
        { rotulo: 'ESCOAMENTO', valor: frame.falha ? 'CAVITAÇÃO / SOBREPRESSÃO' : 'ESTÁVEL', tom: frame.falha ? 'critico' : 'ok' },
      ],
    };
  },
};
