// Catálogo das máquinas 3D. Cada modelo vive em um arquivo próprio e só é baixado quando usado.
// O campo "Tipo" do ativo decide o modelo; tipo desconhecido mostra a unidade de bombeio,
// que era a única máquina da tela antes do catálogo.
const carregadores = {
  'unidade-bombeio': () => import('./unidadeBombeio.js'),
  'bomba-centrifuga': () => import('./bombaCentrifuga.js'),
  compressor: () => import('./compressor.js'),
  forno: () => import('./forno.js'),
  'trocador-calor': () => import('./trocadorCalor.js'),
  'coluna-destilacao': () => import('./colunaDestilacao.js'),
  tanque: () => import('./tanque.js'),
};

// A ordem importa: "bombeio" precisa ser testado antes de "bomba".
const regras = [
  [/bombeio|cavalo de pau/, 'unidade-bombeio'],
  [/compressor/, 'compressor'],
  [/trocador|permutador/, 'trocador-calor'],
  [/coluna|destila/, 'coluna-destilacao'],
  [/forno|fornalha/, 'forno'],
  [/tanque/, 'tanque'],
  [/bomba/, 'bomba-centrifuga'],
];

export function chaveDoModelo(tipo) {
  const normalizado = (tipo || '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
  return regras.find(([padrao]) => padrao.test(normalizado))?.[1] ?? 'unidade-bombeio';
}

export async function carregarModelo(chave) {
  const modulo = await (carregadores[chave] ?? carregadores['unidade-bombeio'])();
  return modulo.default;
}
