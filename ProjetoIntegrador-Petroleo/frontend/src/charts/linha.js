// Gráfico de linhas compartilhado pelo dashboard e pelo histórico (ECharts, só os módulos usados).
import { init, use } from 'echarts/core';
import { LineChart } from 'echarts/charts';
import { AriaComponent, DataZoomComponent, GridComponent, LegendComponent, TooltipComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { quandoVisivel, semAnimacao } from '../effects/revelar.js';

use([LineChart, AriaComponent, DataZoomComponent, GridComponent, LegendComponent, TooltipComponent, CanvasRenderer]);

const TEXTO_SUAVE = '#919bad';
const GRADE = 'rgba(145,155,173,.12)';
// Tempo para a linha se desenhar da esquerda para a direita.
const DESENHO = 1400;
export const CORES_LIMITE = { atencao: '#e3bd73', critico: '#ef7777' };

const numero = (valor) => valor == null ? '—' : Number(valor).toLocaleString('pt-BR', { maximumFractionDigits: 2 });

// Limite operacional: linha tracejada que também aparece na legenda.
export function serieLimite(nome, valor, quantidade, cor) {
  return {
    name: nome,
    type: 'line',
    data: Array(quantidade).fill(valor),
    symbol: 'none',
    color: cor,
    lineStyle: { width: 1.5, type: [6, 5] },
    emphasis: { disabled: true },
  };
}

export function serieMedida(nome, valores, cor, { preenchida = false, espessura = 2, pontos = false } = {}) {
  return {
    name: nome,
    type: 'line',
    data: valores,
    color: cor,
    // Suaviza sem criar picos que não existem nos dados.
    smooth: 0.3,
    smoothMonotone: 'x',
    showSymbol: pontos,
    symbol: 'circle',
    symbolSize: 8,
    lineStyle: { width: espessura },
    areaStyle: preenchida ? {
      color: {
        type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
        colorStops: [{ offset: 0, color: `${cor}33` }, { offset: 1, color: `${cor}00` }],
      },
    } : undefined,
  };
}

export function criarGraficoLinha(elemento) {
  const grafico = init(elemento, null, { renderer: 'canvas' });
  // Redimensionar à toa interromperia o desenho da linha.
  const observador = new ResizeObserver(() => {
    if (grafico.getWidth() !== elemento.clientWidth || grafico.getHeight() !== elemento.clientHeight) grafico.resize();
  });
  observador.observe(elemento);

  let visivel = false;
  let pendente = null;
  let chaveDesenhada;
  let desenhandoAte = 0;
  let espera = null;

  // Sensor ou máquina diferente: desenha de novo. Leitura nova: só o fim da linha avança.
  const aplicar = () => {
    if (!visivel || !pendente) return;
    const { chave, opcoes } = pendente;
    const novoDesenho = chave !== chaveDesenhada;
    const falta = desenhandoAte - Date.now();
    clearTimeout(espera);
    // Uma leitura que chega durante o desenho espera ele terminar.
    if (!novoDesenho && falta > 0) {
      espera = setTimeout(aplicar, falta);
      return;
    }
    if (novoDesenho) {
      grafico.clear();
      chaveDesenhada = chave;
      desenhandoAte = semAnimacao() ? 0 : Date.now() + DESENHO;
    }
    pendente = null;
    grafico.setOption(opcoes);
  };
  // Começa a desenhar quando o gráfico aparece na tela.
  const pararEspera = quandoVisivel(elemento, () => { visivel = true; aplicar(); });

  return {
    atualizar({ rotulos, series, unidade, zoom = false, chave = '' }) {
      pendente = { chave, opcoes: {
        animation: !semAnimacao(),
        animationDuration: DESENHO,
        animationEasing: 'cubicInOut',
        animationDurationUpdate: 300,
        aria: { enabled: true },
        textStyle: { fontFamily: 'Inter, Arial, sans-serif' },
        grid: { left: 6, right: 16, top: 30, bottom: zoom ? 84 : 42, containLabel: true },
        legend: {
          bottom: 0, left: 0, icon: 'circle', itemWidth: 10, itemHeight: 10, itemGap: 20,
          textStyle: { color: '#aab3c0', fontSize: 12 }, inactiveColor: '#4b5563',
        },
        tooltip: {
          trigger: 'axis',
          confine: true,
          backgroundColor: '#11151c',
          borderColor: '#303744',
          padding: 12,
          textStyle: { color: '#f2f3f5', fontSize: 12 },
          axisPointer: { type: 'line', lineStyle: { color: '#f5aa32', opacity: 0.5 } },
          valueFormatter: (valor) => `${numero(valor)} ${unidade}`,
        },
        xAxis: {
          type: 'category',
          boundaryGap: false,
          data: rotulos,
          axisLine: { lineStyle: { color: '#303744' } },
          axisTick: { show: false },
          axisLabel: { color: TEXTO_SUAVE, hideOverlap: true },
        },
        yAxis: {
          type: 'value',
          scale: true,
          name: unidade,
          nameTextStyle: { color: TEXTO_SUAVE, align: 'left' },
          axisLabel: { color: TEXTO_SUAVE, formatter: numero },
          splitLine: { lineStyle: { color: GRADE } },
        },
        dataZoom: zoom ? [
          // A roda do mouse só dá zoom com Ctrl, para não travar a rolagem da página.
          { type: 'inside', zoomOnMouseWheel: 'ctrl', moveOnMouseWheel: false },
          {
            type: 'slider', bottom: 30, height: 20, borderColor: '#303744', fillerColor: 'rgba(245,170,50,.14)',
            backgroundColor: 'transparent', textStyle: { color: TEXTO_SUAVE },
            dataBackground: { lineStyle: { color: '#596474' }, areaStyle: { color: '#303744' } },
            handleStyle: { color: '#f5aa32' }, moveHandleStyle: { color: '#715323' },
          },
        ] : [],
        series,
      } };
      aplicar();
    },
    descartar() {
      pararEspera();
      clearTimeout(espera);
      observador.disconnect();
      grafico.dispose();
    },
  };
}
