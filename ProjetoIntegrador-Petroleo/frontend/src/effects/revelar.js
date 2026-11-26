// Quando uma animação deve começar.
export const semAnimacao = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Chama a função quando o elemento aparece na tela e a cortina de entrada já saiu.
// Devolve uma função que cancela a espera.
export function quandoVisivel(elemento, fazer) {
  const raiz = document.documentElement;
  let cortina;
  const observador = new IntersectionObserver((entradas) => {
    if (!entradas.some((entrada) => entrada.isIntersecting)) return;
    observador.disconnect();
    if (!raiz.classList.contains('ps-entrando')) {
      fazer();
      return;
    }
    cortina = new MutationObserver(() => {
      if (raiz.classList.contains('ps-entrando')) return;
      cortina.disconnect();
      fazer();
    });
    cortina.observe(raiz, { attributes: true, attributeFilter: ['class'] });
  }, { threshold: 0.2 });
  observador.observe(elemento);

  return () => {
    observador.disconnect();
    cortina?.disconnect();
  };
}
