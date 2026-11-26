// Cronômetros: há quanto tempo um alerta espera atendimento.
// [data-espera="data em UTC"] mostra o tempo com ícone, texto e cor.
// [data-desde="data em UTC"] mostra só o tempo corrido.
const duracao = (segundos) => {
  if (segundos < 60) return `${segundos} s`;
  const minutos = Math.floor(segundos / 60);
  if (minutos < 60) return `${minutos} min ${segundos % 60} s`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `${horas} h ${minutos % 60} min`;
  return `${Math.floor(horas / 24)} d ${horas % 24} h`;
};

const decorridos = (iso) => Math.max(0, Math.floor((Date.now() - Date.parse(iso)) / 1000));

// Até 2 min: recente. Até 5 min: atenção. Depois disso: atrasado.
const faixa = (segundos) => (segundos < 120
  ? { classe: 'is-recente', icone: '⏱' }
  : segundos < 300
    ? { classe: 'is-atencao', icone: '⚠' }
    : { classe: 'is-atrasado', icone: '⛔' });

export function iniciarCronometros() {
  const atualizar = () => {
    // Consulta a cada vez: o alarme e o placar criam elementos depois do carregamento.
    for (const elemento of document.querySelectorAll('[data-espera]')) {
      const segundos = decorridos(elemento.dataset.espera);
      const { classe, icone } = faixa(segundos);
      elemento.className = `ps-espera ${classe}`;
      elemento.textContent = `${icone} há ${duracao(segundos)} sem atendimento`;
    }
    for (const elemento of document.querySelectorAll('[data-desde]')) {
      elemento.textContent = duracao(decorridos(elemento.dataset.desde));
    }
  };
  atualizar();
  setInterval(atualizar, 1000);
}
