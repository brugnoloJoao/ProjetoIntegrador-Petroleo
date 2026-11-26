// Procura a leitura cujo nome contém um dos termos, respeitando a ordem de preferência.
export function encontrarLeitura(leituras, termos) {
  for (const termo of termos) {
    const encontrada = leituras.find((leitura) => leitura.nome?.toLocaleLowerCase('pt-BR').includes(termo));
    if (encontrada) return encontrada;
  }
  return undefined;
}

export function situacaoDaLeitura(leitura) {
  if (leitura.valor >= leitura.limiteCritico) return 'critico';
  if (leitura.valor >= leitura.limiteAtencao) return 'alerta';
  return 'normal';
}
