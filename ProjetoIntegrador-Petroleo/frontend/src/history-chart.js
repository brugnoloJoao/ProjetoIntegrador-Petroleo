// Gráfico do Histórico e dos detalhes do alerta. Os dados chegam prontos no atributo data-chart.
import { CORES_LIMITE, criarGraficoLinha, serieLimite, serieMedida } from './charts/linha.js';

const elemento = document.getElementById('grafico');

if (elemento) {
  const dados = JSON.parse(elemento.dataset.chart);
  const quantidade = dados.rotulos.length;
  // Com poucos intervalos, marca cada ponto para ficar claro o que foi medido.
  const pontos = quantidade <= 30;
  criarGraficoLinha(elemento).atualizar({
    rotulos: dados.rotulos,
    unidade: dados.unidade,
    chave: 'historico',
    zoom: quantidade > 1,
    series: [
      // O Histórico traz média, mínimo e máximo; o alerta traz as próprias leituras.
      ...(dados.valores
        ? [serieMedida(`${dados.nome} (${dados.unidade})`, dados.valores, '#f5aa32', { preenchida: true, pontos })]
        : [
          serieMedida(`Média (${dados.unidade})`, dados.medias, '#c98500', { preenchida: true, pontos }),
          serieMedida('Mínimo', dados.minimos, '#199e70', { espessura: 1.5, pontos }),
          serieMedida('Máximo', dados.maximos, '#3987e5', { espessura: 1.5, pontos }),
        ]),
      serieLimite('Atenção', dados.atencao, quantidade, CORES_LIMITE.atencao),
      serieLimite('Crítico', dados.critico, quantidade, CORES_LIMITE.critico),
    ],
  });
}
