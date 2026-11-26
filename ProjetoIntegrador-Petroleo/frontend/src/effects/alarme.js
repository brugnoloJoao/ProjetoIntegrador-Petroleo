// Alarme de alerta crítico e contador no menu, em todas as telas do sistema.
// Só consulta o servidor: não reconhece nem altera alertas.
// Agrupa por máquina: o som toca quando uma máquina entra em estado crítico.
import { bipar, quandoLiberarSom, somLiberado } from './som.js';
import { alertasVistos } from './vistos.js';

const VISTOS = 'petrosync:alarme-vistos';
const CONTAGEM = 'petrosync:alertas-novos';
const SILENCIO = 'petrosync:alarme-silenciado';
const MAQUINAS = 'petrosync:alarme-maquinas'; // máquinas que já tocaram
const ULTIMO_SOM = 'petrosync:alarme-som';
const INTERVALO = 5000;
const REPETIR = 60000; // sem resposta, repete o som a cada minuto
const MINIMO = 10000; // intervalo mínimo entre dois sons

const ler = (area, chave, padrao) => {
  try { return JSON.parse(area.getItem(chave)) ?? padrao; } catch { return padrao; }
};
const gravar = (area, chave, valor) => {
  try { area.setItem(chave, JSON.stringify(valor)); } catch { /* Sem armazenamento: vale só nesta tela. */ }
};

const criar = (tag, classe, texto) => {
  const no = document.createElement(tag);
  if (classe) no.className = classe;
  if (texto !== undefined) no.textContent = texto; // textContent: nomes vêm do banco
  return no;
};

// Uma entrada por máquina, com os sensores afetados e a espera mais longa.
function agrupar(alertas) {
  const maquinas = new Map();
  for (const alerta of alertas) {
    const maquina = maquinas.get(alerta.ativoId)
      ?? { id: alerta.ativoId, ativo: alerta.ativo, tag: alerta.tag, alertas: [] };
    maquina.alertas.push(alerta);
    maquinas.set(alerta.ativoId, maquina);
  }
  return [...maquinas.values()].map((maquina) => {
    const abertos = maquina.alertas.filter((alerta) => !alerta.normalizado);
    return {
      ...maquina,
      emAberto: abertos.length > 0,
      desde: abertos.map((alerta) => alerta.desde).sort()[0],
      sensores: [...new Set((abertos.length ? abertos : maquina.alertas).map((alerta) => alerta.parametro))],
    };
  }).sort((a, b) => Number(b.emAberto) - Number(a.emAberto));
}

export function iniciarAlarme({ urlResumo, urlOcorrencias, urlAlerta, usuario, menu }) {
  const vistos = new Set(ler(sessionStorage, VISTOS, []));
  let silenciado = ler(localStorage, SILENCIO, false);
  let pendentes = [];
  let aviso = null;
  let borda = null;

  quandoLiberarSom(() => desenhar());

  // ---------- Contador no menu ----------
  let contador = null;
  const mostrarContador = (quantidade) => {
    if (!menu) return;
    if (!contador) {
      contador = criar('span', 'ps-menu-contador');
      menu.appendChild(contador);
    }
    contador.hidden = quantidade === 0;
    contador.textContent = quantidade > 99 ? '99+' : String(quantidade);
    const descricao = quantidade === 1 ? '1 alerta novo' : `${quantidade} alertas novos`;
    contador.setAttribute('aria-label', descricao);
    contador.title = descricao;
    // Pulsa só quando aumenta, inclusive de uma tela para outra.
    if (quantidade > ler(sessionStorage, CONTAGEM, quantidade)) {
      contador.classList.remove('is-novo');
      void contador.offsetWidth; // reinicia a animação
      contador.classList.add('is-novo');
    }
    gravar(sessionStorage, CONTAGEM, quantidade);
  };

  // ---------- Aviso ----------
  const marcarComoVistos = () => {
    pendentes.forEach((alerta) => vistos.add(alerta.id));
    gravar(sessionStorage, VISTOS, [...vistos].slice(-300));
    pendentes = [];
    desenhar();
  };

  function desenhar() {
    if (!pendentes.length) {
      aviso?.remove();
      borda?.remove();
      aviso = null;
      borda = null;
      return;
    }

    const maquinas = agrupar(pendentes);
    const emAberto = maquinas.some((maquina) => maquina.emAberto);
    if (!aviso) {
      aviso = criar('aside', 'ps-alarme');
      aviso.setAttribute('role', 'alert');
      document.body.appendChild(aviso);
      borda = criar('div', 'ps-alarme-borda');
      borda.setAttribute('aria-hidden', 'true');
      document.body.appendChild(borda);
    }

    // Só redesenha quando algo muda, para o leitor de tela não repetir o aviso.
    const semSom = !silenciado && !somLiberado();
    const assinatura = JSON.stringify([maquinas.map((m) => [m.id, m.emAberto, m.desde, m.sensores]), silenciado, semSom]);
    if (aviso.dataset.assinatura === assinatura) return;
    aviso.dataset.assinatura = assinatura;
    aviso.classList.toggle('is-aberto', emAberto);
    borda.classList.toggle('is-aberto', emAberto);

    const titulo = criar('strong', 'ps-alarme-titulo', maquinas.length === 1
      ? (emAberto ? '⛔ Máquina em estado crítico' : '⛔ Houve um alerta crítico')
      : `⛔ ${maquinas.length} máquinas com alerta crítico`);
    const lista = criar('ul');
    for (const maquina of maquinas.slice(0, 3)) {
      const item = criar('li');
      const link = criar('a');
      // Um alerta só: abre o alerta. Vários: abre o registro da máquina.
      link.href = maquina.alertas.length === 1
        ? `${urlAlerta}/${maquina.alertas[0].id}`
        : `${urlOcorrencias}?dias=1&ativoId=${maquina.id}`;
      link.append(
        criar('b', '', `${maquina.ativo} (${maquina.tag})`),
        criar('span', 'ps-alarme-sensores', `${maquina.sensores.join(', ')}${maquina.emAberto ? '' : ' · já voltou ao normal'}`),
      );
      if (maquina.emAberto) {
        const espera = criar('span');
        espera.dataset.espera = maquina.desde;
        link.appendChild(espera);
      }
      item.appendChild(link);
      lista.appendChild(item);
    }
    const partes = [titulo, lista];
    if (maquinas.length > 3) {
      const resto = maquinas.length - 3;
      partes.push(criar('small', '', resto === 1 ? 'e mais 1 máquina' : `e mais ${resto} máquinas`));
    }

    const acoes = criar('div', 'ps-alarme-acoes');
    const ver = criar('a', 'btn btn-sm btn-primary', 'Ver ocorrências');
    ver.href = `${urlOcorrencias}?dias=1${maquinas.length === 1 ? `&ativoId=${maquinas[0].id}` : ''}`;
    ver.addEventListener('click', marcarComoVistos);
    const entendi = criar('button', 'btn btn-sm btn-outline-secondary', 'Entendi');
    entendi.type = 'button';
    entendi.addEventListener('click', marcarComoVistos);
    const som = criar('button', 'ps-alarme-som', silenciado ? 'Ativar som' : 'Silenciar som');
    som.type = 'button';
    som.addEventListener('click', () => {
      silenciado = !silenciado;
      gravar(localStorage, SILENCIO, silenciado);
      desenhar();
    });
    acoes.append(ver, entendi, som);
    partes.push(acoes);
    if (semSom) partes.push(criar('small', 'ps-alarme-dica', 'Clique em qualquer lugar da tela para liberar o som.'));
    aviso.replaceChildren(...partes);
  }

  // Toca quando uma máquina entra em estado crítico; sem resposta, repete de vez em quando.
  // "criticas" são as máquinas críticas agora, mesmo as que já foram dispensadas.
  const avaliarSom = (criticas) => {
    // Quem saiu do estado crítico volta a tocar se entrar de novo.
    const jaTocaram = ler(sessionStorage, MAQUINAS, []).filter((id) => criticas.has(id));
    gravar(sessionStorage, MAQUINAS, jaTocaram);

    const semResposta = agrupar(pendentes).filter((maquina) => maquina.emAberto).map((maquina) => maquina.id);
    if (!semResposta.length || silenciado) return;
    const desdeOUltimo = Date.now() - ler(sessionStorage, ULTIMO_SOM, 0);
    const entrou = semResposta.some((id) => !jaTocaram.includes(id));
    if (desdeOUltimo < (entrou ? MINIMO : REPETIR) || !bipar()) return;
    gravar(sessionStorage, ULTIMO_SOM, Date.now());
    gravar(sessionStorage, MAQUINAS, [...new Set([...jaTocaram, ...semResposta])]);
  };

  // ---------- Consulta ----------
  let temporizador = null;
  const consultar = async () => {
    try {
      const resposta = await fetch(urlResumo, { headers: { Accept: 'application/json' } });
      // Sessão encerrada: para de consultar.
      if (resposta.redirected || resposta.status === 401) return;
      if (resposta.ok) {
        const resumo = await resposta.json();
        // Abrir um alerta tira ele daqui e do contador, mesmo em outra aba.
        const abertos = alertasVistos(usuario);
        mostrarContador(resumo.idsAtivos.filter((id) => !abertos.has(id)).length);
        pendentes = resumo.criticos.filter((alerta) => !vistos.has(alerta.id) && !abertos.has(alerta.id));
        desenhar();
        avaliarSom(new Set(resumo.criticos.filter((alerta) => !alerta.normalizado).map((alerta) => alerta.ativoId)));
      }
    } catch { /* Sem conexão: tenta de novo no próximo ciclo. */ }
    temporizador = setTimeout(consultar, INTERVALO);
  };
  consultar();

  return () => clearTimeout(temporizador);
}
