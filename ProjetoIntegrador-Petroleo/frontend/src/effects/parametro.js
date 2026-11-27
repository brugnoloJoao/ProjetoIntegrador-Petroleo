// Cadastro de parâmetro: a lista de unidades acompanha o parâmetro escolhido.
export function ligarUnidadePadrao() {
  const nome = document.querySelector('[data-parametro-nome]');
  const unidade = document.querySelector('[data-parametro-unidade]');
  if (!nome || !unidade) return;
  const vazia = unidade.options[0];
  const todas = [...unidade.options].slice(1);

  const filtrar = (usarPadrao) => {
    const opcao = nome.selectedOptions[0];
    const grandeza = opcao?.dataset.grandeza;
    const anterior = unidade.value;
    const compativeis = todas.filter((item) => item.dataset.grandeza === grandeza);
    unidade.replaceChildren(vazia, ...compativeis);
    unidade.disabled = !grandeza;
    const valores = compativeis.map((item) => item.value);
    unidade.value = usarPadrao || !valores.includes(anterior) ? opcao?.dataset.unidade ?? '' : anterior;
  };

  nome.addEventListener('change', () => filtrar(true));
  // Ao abrir a tela, mantém a unidade que já estava salva. Sem parâmetro, a lista espera a escolha.
  filtrar(false);
  // Campo desativado não é enviado: reativa para o servidor apontar o que falta.
  unidade.form?.addEventListener('submit', () => { unidade.disabled = false; });
}
