// Depois do login, um círculo se abre a partir do botão e revela o sistema.
// A cortina é desenhada em site.css; aqui só o raio é animado.
import { gsap } from 'gsap';

const raiz = document.documentElement;

if (raiz.classList.contains('ps-entrando')) {
  const x = parseFloat(raiz.style.getPropertyValue('--entrada-x')) / 100 * window.innerWidth;
  const y = parseFloat(raiz.style.getPropertyValue('--entrada-y')) / 100 * window.innerHeight;
  // Distância até o canto mais afastado.
  const alcance = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
  const circulo = { raio: -8 };

  gsap.to(circulo, {
    raio: alcance,
    duration: 0.9,
    delay: 0.1,
    ease: 'power3.inOut',
    onUpdate: () => raiz.style.setProperty('--entrada-raio', `${circulo.raio}px`),
    onComplete: () => raiz.classList.remove('ps-entrando'),
  });
}
