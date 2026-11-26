// Comportamentos comuns às telas de quem está autenticado.
import { contarDaPagina } from './effects/contagem.js';
import { iniciarAlarme } from './effects/alarme.js';
import { prepararCartoes } from './effects/cartoes.js';
import { iniciarCronometros } from './effects/espera.js';
import { iniciarPresenca } from './effects/presenca.js';
import { prepararArquivos } from './effects/preparar.js';
import { marcarVisto, prepararLista } from './effects/vistos.js';

prepararCartoes();
contarDaPagina();
iniciarCronometros();
prepararArquivos();

const presenca = document.querySelector('[data-presenca]');
if (presenca) iniciarPresenca(presenca);

// Placar do turno: atualiza o trecho sem recarregar a página.
const placar = document.querySelector('[data-atualizar]');
if (placar) {
  setInterval(async () => {
    if (document.hidden || placar.contains(document.activeElement)) return;
    try {
      const resposta = await fetch(placar.dataset.atualizar);
      if (resposta.ok && !resposta.redirected) placar.innerHTML = await resposta.text();
    } catch { /* Mantém os últimos números enquanto estiver sem conexão. */ }
  }, 10000);
}

const menu = document.querySelector('[data-menu-alertas]');
if (menu) {
  const { usuario } = menu.dataset;
  // Antes do alarme, para o alerta aberto já sair da notificação e do contador.
  const aberto = document.querySelector('[data-alerta-visto]');
  if (aberto) marcarVisto(usuario, Number(aberto.dataset.alertaVisto));
  prepararLista(usuario);

  iniciarAlarme({
    urlResumo: menu.dataset.urlResumo,
    urlOcorrencias: menu.dataset.urlOcorrencias,
    urlAlerta: menu.dataset.urlAlerta,
    usuario,
    menu,
  });
}
