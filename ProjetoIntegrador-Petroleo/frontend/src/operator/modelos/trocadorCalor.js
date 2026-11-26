// Trocador de calor casco e tubo em corte, com feixe tubular e chicanas.

export default {
  titulo: 'TROCADOR CASCO E TUBO',
  presets: {
    geral: { label: 'Visão Geral', target: [0, 1.55, 0], theta: 0.45, phi: 1.12, radius: 9.2 },
    feixe: { label: 'Feixe Tubular', target: [0, 1.5, 0], theta: 0, phi: 1.3, radius: 5.2 },
    entrada: { label: 'Cabeçote', target: [-2.4, 1.5, 0], theta: -0.75, phi: 1.2, radius: 4.8 },
    saida: { label: 'Saídas', target: [2.1, 1.4, 0], theta: 0.8, phi: 1.2, radius: 5 },
  },
  pins: [
    { id: 'casco', nome: 'Casco', pos: [-0.8, 2.55, 0.2], preset: 'geral', termos: ['press'] },
    { id: 'feixe', nome: 'Feixe Tubular', pos: [0.3, 1.5, 0.9], preset: 'feixe', termos: ['vaz'] },
    { id: 'cabecote', nome: 'Cabeçote de Entrada', pos: [-2.7, 2.35, 0], preset: 'entrada' },
    { id: 'saida', nome: 'Saída Aquecida', pos: [3.4, 2.4, 0], preset: 'saida', termos: ['temper'] },
    { id: 'suporte', nome: 'Selas de Apoio', pos: [1.3, 0.55, 0.75], preset: 'geral', termos: ['vibra'] },
  ],
  velocidade: { rotulo: 'VAZÃO DE BOMBEAMENTO' },

  construir(kit) {
    const { mat, caixa, cilindro, anel, grupo } = kit;
    const EIXO = 1.5;
    kit.plataforma(8, 4.2);

    const corpo = grupo();
    [-1.3, 1.3].forEach((x) => caixa(0.35, 0.8, 1.35, mat.acoEscuro, { pos: [x, 0.62, 0], pai: corpo }));
    // Casco com a metade frontal recortada (o eixo local Y fica deitado no eixo X).
    cilindro(0.82, 0.82, 3.6, mat.casco, { pos: [0, EIXO, 0], rot: [0, 0, Math.PI / 2], aberto: true, segmentos: 40, inicio: Math.PI * 0.62, arco: Math.PI * 1.2, pai: corpo });
    [-1.8, 1.8].forEach((x) => {
      anel(0.9, 0.085, mat.ambar, { pos: [x, EIXO, 0], rot: [0, Math.PI / 2, 0], pai: corpo });
      cilindro(0.82, 0.82, 0.05, mat.acoEscuro, { pos: [x, EIXO, 0], rot: [0, 0, Math.PI / 2], segmentos: 40, pai: corpo });
    });
    [-1, 1].forEach((lado) => {
      cilindro(0.82, 0.82, 0.6, mat.acoMedio, { pos: [lado * 2.17, EIXO, 0], rot: [0, 0, Math.PI / 2], segmentos: 40, pai: corpo });
      kit.esfera(0.82, mat.acoMedio, { pos: [lado * 2.47, EIXO, 0], escala: [0.42, 1, 1], pai: corpo });
      anel(0.86, 0.04, mat.acoEscuro, { pos: [lado * 2.4, EIXO, 0], rot: [0, Math.PI / 2, 0], pai: corpo });
    });

    // Feixe tubular em arranjo triangular.
    const posicoes = [[0, 0]];
    [[0.24, 6], [0.48, 12]].forEach(([raio, quantidade]) => {
      for (let i = 0; i < quantidade; i += 1) {
        const a = (i / quantidade) * Math.PI * 2;
        posicoes.push([Math.cos(a) * raio, Math.sin(a) * raio]);
      }
    });
    posicoes.forEach(([y, z]) => cilindro(0.045, 0.045, 3.6, mat.cromo, { pos: [0, EIXO + y, z], rot: [0, 0, Math.PI / 2], segmentos: 8, pai: corpo }));
    [-1.2, -0.4, 0.4, 1.2].forEach((x, i) => cilindro(0.76, 0.76, 0.04, mat.ambar, {
      pos: [x, EIXO, 0], rot: [0, 0, Math.PI / 2], segmentos: 32,
      inicio: i % 2 === 0 ? Math.PI * 0.5 : Math.PI * 1.5, arco: Math.PI * 0.85, pai: corpo,
    }));

    // Lado dos tubos (fluido frio) e lado do casco (fluido quente).
    const entradaTubos = [[-3.9, 0.65, 0], [-3.35, 0.65, 0], [-3.35, EIXO, 0], [-2.75, EIXO, 0]];
    const saidaTubos = [[2.75, EIXO, 0], [3.35, EIXO, 0], [3.35, 2.65, 0], [3.9, 2.65, 0]];
    const entradaCasco = [[1.35, 3.6, -1.2], [1.35, 3.6, 0], [1.35, EIXO + 0.8, 0]];
    const saidaCasco = [[-1.35, EIXO - 0.8, 0], [-1.35, 0.5, -0.0], [-1.35, 0.5, -1.7], [-3.4, 0.5, -1.7]];
    [entradaTubos, saidaTubos, entradaCasco, saidaCasco].forEach((rota) => kit.tubulacao(rota, 0.13));
    [[1.35, 2.5, 0], [-1.35, 0.62, 0]].forEach((pos) => anel(0.18, 0.05, mat.ambar, { pos, rot: [Math.PI / 2, 0, 0] }));

    const farol = kit.sinalizador([0.2, 2.5, -0.4]);
    const linhas = {
      friaEntrada: kit.linhaFluxo(entradaTubos, { raio: 0.16, quantidade: 14, cor: kit.cores.frio, fixa: true }),
      friaFeixe: [0.24, -0.24, 0].map((y) => kit.linhaFluxo([[-1.8, EIXO + y, 0.5], [1.8, EIXO + y, 0.5]], { raio: 0.03, quantidade: 14, cor: kit.cores.frio, fixa: true })),
      friaSaida: kit.linhaFluxo(saidaTubos, { raio: 0.16, quantidade: 16 }),
      quente: kit.linhaFluxo([...entradaCasco, [1.0, EIXO + 0.55, 0.35], [0.4, EIXO - 0.55, 0.35], [-0.4, EIXO + 0.55, 0.35], [-1.0, EIXO - 0.55, 0.35], ...saidaCasco], { raio: 0.05, quantidade: 46 }),
    };

    return {
      atualizar(frame) {
        const velocidade = (0.1 + frame.razoes.vazao * 0.32) * frame.proporcao;
        linhas.friaEntrada.atualizar(frame.passo, velocidade * 1.6, frame.corStatus);
        linhas.friaFeixe.forEach((linha) => linha.atualizar(frame.passo, velocidade, frame.corStatus));
        linhas.friaSaida.atualizar(frame.passo, velocidade * 1.4, frame.corStatus);
        linhas.quente.atualizar(frame.passo, velocidade * 0.55, frame.corStatus);
        kit.vibrar(corpo, frame);
        farol.color.setHex(frame.corStatus);
      },
      hud: (frame) => [
        { rotulo: 'BOMBEAMENTO', valor: `${Math.round(frame.proporcao * 100)} %` },
        { rotulo: 'TROCA TÉRMICA', valor: frame.falha ? 'DEGRADADA / INCRUSTAÇÃO' : 'EFICIENTE', tom: frame.falha ? 'critico' : 'ok' },
      ],
    };
  },
};
