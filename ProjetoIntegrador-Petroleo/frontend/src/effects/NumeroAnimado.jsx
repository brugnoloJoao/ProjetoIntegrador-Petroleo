import React, { useLayoutEffect, useRef } from 'react';
import { contar } from './contagem.js';
import { quandoVisivel } from './revelar.js';

// Casas decimais do valor (no máximo duas), para os quadros intermediários não "tremerem".
const casasDe = (valor) => Math.min(2, String(valor).split('.')[1]?.length ?? 0);

const padrao = (valor, casas) => valor.toLocaleString('pt-BR', {
  minimumFractionDigits: casas,
  maximumFractionDigits: casas,
});

// doZero: na primeira vez sobe a partir do zero. Leituras de sensor passam false,
// para nunca mostrar um zero que não foi medido. Depois, vai do valor anterior ao novo.
export default function NumeroAnimado({ valor, formatar, doZero = true }) {
  const elemento = useRef(null);
  const mostrado = useRef(null);

  useLayoutEffect(() => {
    const no = elemento.current;
    const alvo = typeof valor === 'number' ? valor : Number.NaN;
    if (!Number.isFinite(alvo)) {
      mostrado.current = null;
      no.textContent = '—';
      return undefined;
    }

    const casas = casasDe(alvo);
    const escrever = (atual) => {
      mostrado.current = atual;
      const arredondado = Number(atual.toFixed(casas));
      no.textContent = formatar ? formatar(arredondado) : padrao(arredondado, casas);
    };

    let pararContagem = () => {};
    // Primeira exibição: espera aparecer na tela.
    if (mostrado.current === null && doZero) {
      no.textContent = formatar ? formatar(0) : padrao(0, casas);
      const pararEspera = quandoVisivel(no, () => {
        pararContagem = contar({ de: 0, para: alvo, aoAtualizar: escrever });
      });
      return () => { pararEspera(); pararContagem(); };
    }

    pararContagem = contar({ de: mostrado.current ?? alvo, para: alvo, aoAtualizar: escrever, duracao: 0.6 });
    return () => pararContagem();
  }, [valor]);

  return <span ref={elemento} />;
}
