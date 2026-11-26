// Avisa a página seguinte de que a pessoa acabou de enviar o login.
// A chave também é lida pelo script do _Layout.cshtml, que decide se há transição.
const CHAVE = 'petrosync:entrando';

export function sinalizarEntrada(formulario) {
  try {
    // Estar no login significa que não há entrada em andamento (ex.: senha errada).
    sessionStorage.removeItem(CHAVE);
    // Quem entrar agora precisa ver os alertas críticos, mesmo que outra pessoa já tenha visto.
    sessionStorage.removeItem('petrosync:alarme-vistos');
    sessionStorage.removeItem('petrosync:alarme-maquinas');
    sessionStorage.removeItem('petrosync:alarme-som');
    sessionStorage.removeItem('petrosync:alertas-novos');
    // A contagem de presença recomeça a cada login.
    Object.keys(localStorage)
      .filter((chave) => chave.startsWith('petrosync:presenca:'))
      .forEach((chave) => localStorage.removeItem(chave));
  } catch {
    return; // Navegador sem armazenamento: entra sem transição.
  }

  formulario?.addEventListener('submit', () => {
    // A transição nasce no botão de entrar.
    const area = formulario.querySelector('[type="submit"]')?.getBoundingClientRect();
    const x = area ? (area.left + area.width / 2) / window.innerWidth : 0.5;
    const y = area ? (area.top + area.height / 2) / window.innerHeight : 0.5;
    try {
      sessionStorage.setItem(CHAVE, JSON.stringify({ x, y, quando: Date.now() }));
    } catch { /* Sem transição. */ }
  });
}
