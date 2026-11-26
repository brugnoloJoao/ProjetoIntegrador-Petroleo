import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));

// As páginas carregam as entradas com "?v=hash". Um chunk que importasse a entrada
// a executaria de novo, então a compilação falha se isso acontecer.
const semImportarEntradas = {
  name: 'sem-importar-entradas',
  generateBundle(_options, bundle) {
    const entradas = new Set(Object.values(bundle).filter((item) => item.isEntry).map((item) => item.fileName));
    for (const item of Object.values(bundle)) {
      const repetida = [...(item.imports ?? []), ...(item.dynamicImports ?? [])].find((nome) => entradas.has(nome));
      if (repetida) this.error(`${item.fileName} importa a entrada ${repetida}. Mova o código compartilhado para fora dela.`);
    }
  },
};

// Lista dos arquivos compartilhados, que o sistema baixa em segundo plano (preparar.js).
const listaParaPreparar = {
  name: 'lista-para-preparar',
  generateBundle(_options, bundle) {
    const arquivos = Object.values(bundle)
      .filter((item) => item.type === 'chunk' && !item.isEntry)
      .map((item) => item.fileName);
    this.emitFile({ type: 'asset', fileName: 'preparar.json', source: JSON.stringify(arquivos) });
  },
};

export default defineConfig({
  plugins: [react(), semImportarEntradas, listaParaPreparar],
  // Os arquivos são servidos em /dist; caminhos relativos evitam 404 ao pré-carregar chunks.
  base: './',
  build: {
    outDir: resolve(root, '../wwwroot/dist'),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        dashboard: resolve(root, 'src/dashboard.jsx'),
        entrada: resolve(root, 'src/entrada.js'),
        filters: resolve(root, 'src/filters.js'),
        historyChart: resolve(root, 'src/history-chart.js'),
        loginBackground: resolve(root, 'src/login-background.jsx'),
        operatorMachine: resolve(root, 'src/operator/operator-machine.jsx'),
        planta: resolve(root, 'src/planta.js'),
        sistema: resolve(root, 'src/sistema.js'),
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: 'chunks/[name]-[hash].js',
        assetFileNames: (arquivo) => arquivo.names?.includes('preparar.json') ? '[name][extname]' : 'assets/[name][extname]',
        manualChunks(id) {
          if (id.includes('node_modules/three/')) return 'three';
          if (id.includes('node_modules/gsap/')) return 'gsap';
          if (id.includes('node_modules/echarts/') || id.includes('node_modules/zrender/')) return 'echarts';
          if (id.includes('node_modules/@microsoft/signalr/')) return 'signalr';
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/') || id.includes('node_modules/scheduler/')) return 'react';
        },
      },
    },
  },
});
