// Números que sobem até o valor. Todos levam o mesmo tempo,
// então quanto maior o número, mais rápido ele sobe.
import { gsap } from 'gsap';
import { quandoVisivel, semAnimacao } from './revelar.js';

export const DURACAO = 1.1;

export function contar({ de, para, aoAtualizar, duracao = DURACAO }) {
  if (semAnimacao() || de === para) {
    aoAtualizar(para);
    return () => {};
  }

  const estado = { valor: de };
  let reserva;
  const animacao = gsap.to(estado, {
    valor: para,
    duration: duracao,
    ease: 'power2.out',
    onUpdate: () => aoAtualizar(estado.valor),
    onComplete: () => {
      clearTimeout(reserva);
      aoAtualizar(para);
    },
  });
  // Um número de monitoramento não pode ficar parado no meio se a animação travar.
  reserva = setTimeout(() => {
    animacao.kill();
    aoAtualizar(para);
  }, duracao * 1000 + 1500);

  return () => {
    clearTimeout(reserva);
    animacao.kill();
  };
}

// ---------- Números já escritos pelo servidor (atributo data-contar) ----------
const NUMEROS = /\d+(?:[.,]\d+)*/g;

// Mostra uma fração do número mantendo o formato original ("1.234", "93,9", "100.0").
function parcial(texto, progresso) {
  const milhar = /^\d{1,3}(\.\d{3})+(,\d+)?$/.test(texto);
  const virgula = texto.includes(',');
  const normalizado = milhar || virgula ? texto.replace(/\./g, '').replace(',', '.') : texto;
  const alvo = Number(normalizado);
  if (!Number.isFinite(alvo)) return texto;

  const casas = normalizado.split('.')[1]?.length ?? 0;
  let [inteiro, decimal] = (alvo * progresso).toFixed(casas).split('.');
  if (milhar) inteiro = inteiro.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  if (decimal === undefined) return inteiro;
  return `${inteiro}${virgula ? ',' : '.'}${decimal}`;
}

export function contarDaPagina(raiz = document) {
  if (semAnimacao()) return;

  for (const elemento of raiz.querySelectorAll('[data-contar]')) {
    const leitor = document.createTreeWalker(elemento, NodeFilter.SHOW_TEXT);
    const trechos = [];
    while (leitor.nextNode()) {
      const no = leitor.currentNode;
      if (/\d/.test(no.nodeValue)) trechos.push({ no, original: no.nodeValue });
    }
    if (!trechos.length) continue;

    const mostrar = (progresso) => {
      for (const { no, original } of trechos) {
        no.nodeValue = progresso >= 1 ? original : original.replace(NUMEROS, (numero) => parcial(numero, progresso));
      }
    };
    mostrar(0);
    quandoVisivel(elemento, () => contar({ de: 0, para: 1, aoAtualizar: mostrar }));
  }
}
