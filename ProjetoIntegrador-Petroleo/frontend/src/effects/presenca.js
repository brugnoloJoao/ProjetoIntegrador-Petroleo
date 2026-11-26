// Confirmação de presença do operador. Fica só no navegador: nada é gravado no servidor.
import { bipar, somLiberado } from './som.js';

const INTERVALO = 15 * 60 * 1000; // pede confirmação a cada 15 minutos
const PRAZO = 60 * 1000; // depois disso, o aviso fica vermelho e toca sem parar

const chave = (usuario) => `petrosync:presenca:${usuario}`;

export function iniciarPresenca(painel) {
  const { usuario } = painel.dataset;
  const ler = () => Number(localStorage.getItem(chave(usuario))) || 0;
  const agendar = (quando) => localStorage.setItem(chave(usuario), String(quando));
  if (!ler()) agendar(Date.now() + INTERVALO);

  const texto = document.createElement('span');
  const testar = document.createElement('button');
  testar.type = 'button';
  testar.textContent = 'Testar';
  testar.addEventListener('click', () => { agendar(Date.now()); verificar(); });
  painel.append(texto, testar);

  let janela = null;
  let ultimoBipe = 0;

  const fechar = () => {
    janela?.remove();
    janela = null;
  };

  const abrir = () => {
    janela = document.createElement('div');
    janela.className = 'ps-presenca';
    janela.innerHTML = `
      <div class="ps-presenca-caixa" role="alertdialog" aria-modal="true" aria-labelledby="ps-presenca-titulo" tabindex="-1">
        <strong id="ps-presenca-titulo">Você está aí?</strong>
        <p></p>
        <button type="button" class="btn btn-primary">Estou aqui</button>
      </div>`;
    janela.querySelector('button').addEventListener('click', () => {
      agendar(Date.now() + INTERVALO);
      fechar();
      verificar();
    });
    document.body.appendChild(janela);
    // Foca a caixa, não o botão: um Enter dado sem querer não confirma.
    janela.querySelector('[role="alertdialog"]').focus();
  };

  function verificar() {
    const falta = ler() - Date.now();
    if (falta > 0) {
      fechar(); // confirmado aqui ou em outra aba
      const minutos = Math.floor(falta / 60000);
      const segundos = Math.floor((falta % 60000) / 1000);
      texto.textContent = `Presença: confirmar em ${minutos}:${String(segundos).padStart(2, '0')}`;
      return;
    }

    texto.textContent = 'Presença: aguardando confirmação';
    if (!janela) abrir();
    const atraso = -falta;
    const atrasado = atraso >= PRAZO;
    janela.classList.toggle('is-atrasada', atrasado);
    const mensagem = atrasado
      ? '⛔ Sem resposta. Confirme agora.'
      : `Confirme em ${Math.ceil((PRAZO - atraso) / 1000)} s que está acompanhando o turno.`;
    janela.querySelector('p').textContent = somLiberado() ? mensagem : `${mensagem} Clique na tela para liberar o som.`;

    if (Date.now() - ultimoBipe >= (atrasado ? 2500 : 15000)) {
      if (bipar(atrasado ? [988, 740, 988] : [660, 880])) ultimoBipe = Date.now();
    }
  }

  verificar();
  setInterval(verificar, 1000);
}
