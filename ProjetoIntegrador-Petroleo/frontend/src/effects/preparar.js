// Depois que a tela termina de carregar, baixa em segundo plano os arquivos pesados
// (3D e gráficos) para as próximas telas abrirem mais rápido. Só baixa: não executa.
const FEITO = 'petrosync:arquivos-preparados';

async function baixar() {
  try {
    if (navigator.connection?.saveData || sessionStorage.getItem(FEITO)) return;
    const resposta = await fetch('/dist/preparar.json');
    if (!resposta.ok) return;
    for (const arquivo of await resposta.json()) {
      const ligacao = document.createElement('link');
      ligacao.rel = 'modulepreload';
      ligacao.href = `/dist/${arquivo}`;
      document.head.appendChild(ligacao);
    }
    sessionStorage.setItem(FEITO, '1');
  } catch { /* Os arquivos serão baixados quando a tela precisar deles. */ }
}

export function prepararArquivos() {
  // Espera um momento de folga, mas no máximo 3 segundos: telas animadas quase nunca ficam ociosas.
  const quandoOcioso = () => setTimeout(() => {
    if (window.requestIdleCallback) window.requestIdleCallback(baixar, { timeout: 3000 });
    else baixar();
  }, 1500);
  if (document.readyState === 'complete') quandoOcioso();
  else window.addEventListener('load', quandoOcioso, { once: true });
}
