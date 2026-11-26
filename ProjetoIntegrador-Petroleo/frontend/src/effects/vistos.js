// Alertas que a pessoa já abriu. Fica no navegador, separado por usuário.
// "Visto" não é "resolvido": o alerta continua ativo até ser reconhecido ou virar OS.
const chave = (usuario) => `petrosync:alertas-abertos:${usuario}`;

export function alertasVistos(usuario) {
  try {
    return new Set(JSON.parse(localStorage.getItem(chave(usuario))) ?? []);
  } catch {
    return new Set();
  }
}

export function marcarVisto(usuario, id) {
  const vistos = alertasVistos(usuario);
  vistos.add(id);
  try {
    localStorage.setItem(chave(usuario), JSON.stringify([...vistos].slice(-1000)));
  } catch { /* Sem armazenamento: o destaque volta na próxima tela. */ }
}

// Linhas que não estavam na lista da última vez entram deslizando.
function animarChegada(usuario, linhas) {
  const armazenada = `petrosync:linhas-alertas:${usuario}`;
  try {
    const anteriores = JSON.parse(sessionStorage.getItem(armazenada));
    if (anteriores) {
      // Só o que é mais recente que tudo o que já foi listado: trocar o filtro não conta.
      linhas
        .filter((linha) => Number(linha.dataset.alertaId) > anteriores)
        .forEach((linha, i) => {
          linha.style.setProperty('--ordem', String(Math.min(i, 8)));
          linha.classList.add('is-chegando');
        });
    }
    const maior = Math.max(anteriores ?? 0, ...linhas.map((linha) => Number(linha.dataset.alertaId)));
    sessionStorage.setItem(armazenada, JSON.stringify(maior));
  } catch { /* Sem armazenamento: a lista aparece sem o efeito. */ }
}

// Lista de alertas: destaca os ativos ainda não abertos e abre o alerta ao clicar na linha.
export function prepararLista(usuario) {
  const linhas = [...document.querySelectorAll('[data-alert-row][data-url]')];
  if (!linhas.length) return;

  const destacar = () => {
    const vistos = alertasVistos(usuario);
    for (const linha of linhas) {
      const novo = linha.dataset.status === 'Ativo' && !vistos.has(Number(linha.dataset.alertaId));
      linha.classList.toggle('is-novo', novo);
      const selo = linha.querySelector('[data-selo-novo]');
      if (selo) selo.hidden = !novo;
    }
  };

  for (const linha of linhas) {
    linha.addEventListener('click', (evento) => {
      // Links, botões e texto selecionado mantêm o comportamento deles.
      if (evento.target.closest('a, button') || String(window.getSelection())) return;
      window.location.assign(linha.dataset.url);
    });
  }
  destacar();
  animarChegada(usuario, linhas);
  // Voltar pelo navegador reaproveita a página: atualiza o destaque.
  window.addEventListener('pageshow', destacar);
}
