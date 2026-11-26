// Bipes do alarme e da confirmação de presença.
// O navegador só libera o áudio depois de um clique ou tecla na página.
let audio = null;
const aoLiberar = new Set();

const liberar = () => {
  try {
    audio ??= new AudioContext();
    if (audio.state === 'suspended') audio.resume().then(() => aoLiberar.forEach((avisar) => avisar()));
  } catch { /* Sem áudio: ficam os avisos visuais. */ }
};
window.addEventListener('pointerdown', liberar);
window.addEventListener('keydown', liberar);

export const somLiberado = () => audio?.state === 'running';

export function quandoLiberarSom(avisar) {
  aoLiberar.add(avisar);
}

// Toca as frequências em sequência. Devolve falso se o áudio ainda estiver bloqueado.
export function bipar(frequencias = [880, 660]) {
  if (!somLiberado()) return false;
  frequencias.forEach((frequencia, indice) => {
    const inicio = audio.currentTime + indice * 0.28;
    const oscilador = audio.createOscillator();
    const volume = audio.createGain();
    oscilador.type = 'triangle';
    oscilador.frequency.value = frequencia;
    volume.gain.setValueAtTime(0.0001, inicio);
    volume.gain.exponentialRampToValueAtTime(0.18, inicio + 0.02);
    volume.gain.exponentialRampToValueAtTime(0.0001, inicio + 0.24);
    oscilador.connect(volume).connect(audio.destination);
    oscilador.start(inicio);
    oscilador.stop(inicio + 0.26);
  });
  return true;
}
