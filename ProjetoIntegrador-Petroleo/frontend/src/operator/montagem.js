// A máquina se monta peça por peça na primeira vez que o usuário a vê.
// Depois aparece inteira. O que já foi visto fica no navegador, separado por usuário.
import * as THREE from 'three';
import { semAnimacao } from '../effects/revelar.js';

const DURACAO = 1.3;
const ALTURA = 1.6;

// Verdadeiro só na primeira vez de cada chave. "?montar=sim" no endereço repete a montagem.
export function primeiraVez(chave) {
  if (semAnimacao()) return false;
  const usuario = document.querySelector('[data-menu-alertas]')?.dataset.usuario ?? '';
  const armazenada = `petrosync:montadas:${usuario}`;
  try {
    const vistas = new Set(JSON.parse(localStorage.getItem(armazenada)) ?? []);
    const repetir = new URLSearchParams(window.location.search).get('montar') === 'sim';
    if (vistas.has(chave) && !repetir) return false;
    vistas.add(chave);
    localStorage.setItem(armazenada, JSON.stringify([...vistas]));
    return true;
  } catch {
    return false; // Sem armazenamento: mostra a máquina inteira.
  }
}

// As peças caem no lugar, de baixo para cima. Nada é alterado de forma permanente:
// aplicar() muda só o quadro que será desenhado e restaurar() devolve em seguida.
export function criarMontagem(maquina, atraso = 0) {
  maquina.updateMatrixWorld(true);
  const caixa = new THREE.Box3();
  const centro = new THREE.Vector3();
  const pecas = [];
  maquina.traverse((objeto) => {
    if (!objeto.isMesh && !objeto.isPoints && !objeto.isLine) return;
    caixa.setFromObject(objeto);
    pecas.push({ objeto, altura: caixa.isEmpty() ? 0 : caixa.getCenter(centro).y });
  });
  pecas.sort((a, b) => a.altura - b.altura);

  const queda = DURACAO * 0.25;
  const salvos = [];
  let tempo = 0;

  return {
    avancar(passo) { tempo += passo; },
    get terminou() { return tempo >= atraso + DURACAO; },
    aplicar() {
      pecas.forEach(({ objeto }, i) => {
        const inicio = atraso + (i / pecas.length) * (DURACAO - queda);
        const f = (tempo - inicio) / queda;
        if (f >= 1) return;
        salvos.push({ objeto, visivel: objeto.visible, y: objeto.position.y });
        if (f <= 0) objeto.visible = false;
        else objeto.position.y += (1 - f) ** 3 * ALTURA;
      });
    },
    restaurar() {
      while (salvos.length) {
        const { objeto, visivel, y } = salvos.pop();
        objeto.visible = visivel;
        objeto.position.y = y;
      }
    },
  };
}
