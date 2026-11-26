// Controles da câmera 3D: arrastar (mouse ou um dedo) gira; juntar ou afastar dois dedos dá zoom.
// No toque, vale a área toda, inclusive em cima dos nomes; o mouse só arrasta sobre o desenho.
export function ligarGestos(area, desenho, { girar, aproximar }) {
  const toques = new Map();
  const abertura = () => {
    const [a, b] = [...toques.values()];
    return Math.hypot(a.x - b.x, a.y - b.y);
  };
  const apertar = (e) => {
    if (e.pointerType === 'mouse' && e.target !== desenho) return;
    toques.set(e.pointerId, { x: e.clientX, y: e.clientY });
  };
  const mover = (e) => {
    const anterior = toques.get(e.pointerId);
    if (!anterior) return;
    const antes = toques.size === 2 ? abertura() : 0;
    toques.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (toques.size === 1) {
      girar(e.clientX - anterior.x, e.clientY - anterior.y);
    } else if (antes) {
      const agora = abertura();
      if (agora) aproximar(antes / agora); // menor que 1 aproxima, maior que 1 afasta
    }
  };
  const soltar = (e) => { toques.delete(e.pointerId); };

  area.addEventListener('pointerdown', apertar);
  window.addEventListener('pointermove', mover);
  window.addEventListener('pointerup', soltar);
  window.addEventListener('pointercancel', soltar);
  return () => {
    area.removeEventListener('pointerdown', apertar);
    window.removeEventListener('pointermove', mover);
    window.removeEventListener('pointerup', soltar);
    window.removeEventListener('pointercancel', soltar);
  };
}
