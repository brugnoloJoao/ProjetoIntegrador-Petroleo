// Bola que segue o mouse e inverte as cores por onde passa.
import { gsap } from 'gsap';

const DIAMETRO = 260;
const TAMANHOS = [
  // Pequena sobre o formulário, para não atrapalhar a digitação.
  { seletor: '.ps-card', diametro: 26 },
  { seletor: '.ps-intro h1', diametro: DIAMETRO },
];
const DIAMETRO_PADRAO = 130;

export function criarBolaInversora() {
  // Sem mouse (celular, tablet) não há o que seguir.
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  // Com animações reduzidas no sistema, a bola acompanha o mouse sem deslizar.
  const semDeslize = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const bola = document.createElement('div');
  bola.className = 'ps-bola';
  bola.setAttribute('aria-hidden', 'true');
  Object.assign(bola.style, {
    position: 'fixed',
    left: '0',
    top: '0',
    width: `${DIAMETRO}px`,
    height: `${DIAMETRO}px`,
    margin: `${-DIAMETRO / 2}px 0 0 ${-DIAMETRO / 2}px`,
    borderRadius: '50%',
    background: '#fff',
    mixBlendMode: 'difference', // branco em "difference" é o que inverte o fundo
    pointerEvents: 'none',
    zIndex: '1000',
    willChange: 'transform',
  });
  document.body.appendChild(bola);
  gsap.set(bola, { scale: 0 });

  const ajustes = { duration: semDeslize ? 0.001 : 0.45, ease: 'power3' };
  const moverX = gsap.quickTo(bola, 'x', ajustes);
  const moverY = gsap.quickTo(bola, 'y', ajustes);
  let diametroAtual = 0;

  const redimensionar = (diametro) => {
    if (diametro === diametroAtual) return;
    diametroAtual = diametro;
    gsap.to(bola, { scale: diametro / DIAMETRO, duration: semDeslize ? 0 : 0.35, ease: 'power2.out', overwrite: 'auto' });
  };

  window.addEventListener('pointermove', (evento) => {
    if (evento.pointerType === 'touch') return;
    const { clientX: x, clientY: y } = evento;
    // Ao aparecer, nasce no próprio cursor em vez de vir do canto da tela.
    if (diametroAtual === 0) {
      moverX(x, x);
      moverY(y, y);
    } else {
      moverX(x);
      moverY(y);
    }
    const regra = TAMANHOS.find(({ seletor }) => evento.target.closest?.(seletor));
    redimensionar(regra?.diametro ?? DIAMETRO_PADRAO);
  });
  document.documentElement.addEventListener('pointerleave', () => redimensionar(0));
}
