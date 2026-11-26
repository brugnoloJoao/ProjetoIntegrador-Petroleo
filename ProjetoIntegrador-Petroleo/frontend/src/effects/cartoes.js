// No celular as tabelas viram cartões (visual no site.css). Aqui cada célula ganha o nome
// da sua coluna. No cabeçalho, data-titulo marca o título do cartão e data-largo a linha inteira.
export function prepararCartoes() {
  for (const tabela of document.querySelectorAll('table.ps-cartoes')) {
    const colunas = [...tabela.querySelectorAll('thead th')].map((th) => ({
      nome: th.textContent.trim(),
      titulo: th.hasAttribute('data-titulo'),
      largo: th.hasAttribute('data-largo'),
    }));
    for (const linha of tabela.tBodies[0]?.rows ?? []) {
      [...linha.cells].forEach((celula, i) => {
        const coluna = colunas[i];
        if (!coluna) return;
        if (coluna.titulo) {
          celula.classList.add('ps-titulo');
        } else if (!coluna.nome || coluna.nome === 'Ações') {
          celula.classList.add('ps-acoes');
          if (!celula.children.length && !celula.textContent.trim()) celula.classList.add('ps-vazio');
        } else {
          celula.dataset.rotulo = coluna.nome === '#' ? 'Número' : coluna.nome;
          if (coluna.largo) celula.classList.add('ps-largo');
        }
      });
    }
  }
}
