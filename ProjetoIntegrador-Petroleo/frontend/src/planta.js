// Planta da refinaria: todas as máquinas cadastradas em uma única cena.
// As posições são calculadas aqui; nada é gravado no banco.
import * as THREE from 'three';
import { ligarGestos } from './effects/gestos.js';
import { CORES, criarKit } from './operator/modelos/kit.js';
import { carregarModelo, chaveDoModelo } from './operator/modelos/catalogo.js';
import { criarMontagem, primeiraVez } from './operator/montagem.js';

const ESPACO = { x: 11, z: 10.5 };
const CONDICOES = {
  Crítico: { cor: 0xef4444, classe: 'is-critico', icone: '⛔' },
  Alerta: { cor: 0xf5a623, classe: 'is-alerta', icone: '⚠' },
  Normal: { cor: 0x22c55e, classe: 'is-normal', icone: '✓' },
  Parado: { cor: 0x64748b, classe: 'is-parado', icone: '■' },
};
const situacao = (ativo) => (!ativo.operando && ativo.condicao !== 'Crítico' ? 'Parado' : ativo.condicao);

const palco = document.getElementById('plant-app');

async function montar() {
  const resumo = document.getElementById('plant-summary');
  const buscar = async () => {
    const resposta = await fetch(`${palco.dataset.urlDados}?comLeituras=false`, { headers: { Accept: 'application/json' } });
    if (!resposta.ok || !resposta.headers.get('content-type')?.includes('json')) throw new Error('Sem dados');
    return resposta.json();
  };

  const { ativos } = await buscar();
  if (!ativos.length) {
    resumo.textContent = 'Nenhum ativo cadastrado.';
    palco.querySelector('.op-3d-carregando')?.remove();
    return;
  }

  const area = palco.querySelector('.plant-canvas');
  const camadaNomes = palco.querySelector('.plant-labels');
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true });
  } catch (erro) {
    console.error('WebGL indisponível para a planta 3D.', erro);
    resumo.textContent = 'Este navegador não conseguiu iniciar o WebGL.';
    palco.querySelector('.op-3d-carregando')?.remove();
    return;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  area.appendChild(renderer.domElement);

  const cena = new THREE.Scene();
  cena.background = new THREE.Color(0x0b0d10);
  cena.add(new THREE.AmbientLight(0xfff5e4, 0.75));
  const luz = new THREE.DirectionalLight(0xffedd5, 1.3);
  luz.position.set(14, 22, 12);
  cena.add(luz);
  const contraluz = new THREE.DirectionalLight(0xf5a623, 0.5);
  contraluz.position.set(-16, 10, -14);
  cena.add(contraluz);

  const colunas = Math.ceil(Math.sqrt(ativos.length * 1.6));
  const linhas = Math.ceil(ativos.length / colunas);
  cena.add(new THREE.GridHelper(Math.max(colunas, linhas) * ESPACO.x + 12, 60, 0x3b2c12, 0x1a1d24));

  const maquinas = await Promise.all(ativos.map(async (ativo, indice) => {
    const modelo = await carregarModelo(chaveDoModelo(ativo.tipo));
    const linha = Math.floor(indice / colunas);
    const naLinha = Math.min(colunas, ativos.length - linha * colunas);
    const grupo = new THREE.Group();
    grupo.position.set(
      ((indice % colunas) - (naLinha - 1) / 2) * ESPACO.x,
      0,
      (linha - (linhas - 1) / 2) * ESPACO.z,
    );
    cena.add(grupo);
    const corpo = new THREE.Group();
    grupo.add(corpo);
    const movimento = modelo.construir(criarKit(corpo));
    const altura = new THREE.Box3().setFromObject(grupo).max.y;

    const marca = new THREE.Mesh(
      new THREE.RingGeometry(4.3, 4.75, 64),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false }),
    );
    marca.rotation.x = -Math.PI / 2;
    marca.position.y = 0.04;
    grupo.add(marca);
    // Facho que sobe das máquinas em estado crítico, visível de longe.
    const facho = new THREE.Mesh(
      new THREE.CylinderGeometry(4.5, 4.5, altura + 1.5, 48, 1, true),
      new THREE.MeshBasicMaterial({ color: CORES.critico, transparent: true, opacity: 0.1, side: THREE.DoubleSide, depthWrite: false }),
    );
    facho.position.y = (altura + 1.5) / 2;
    grupo.add(facho);

    const nome = document.createElement('a');
    nome.href = `${palco.dataset.urlMaquina}?ativoId=${ativo.id}`;
    camadaNomes.appendChild(nome);

    // Uma máquina começa um pouco depois da outra.
    const montagem = primeiraVez(`planta:${ativo.id}`) ? criarMontagem(corpo, indice * 0.2) : null;

    return { ativo, grupo, movimento, marca, facho, nome, altura, montagem };
  }));

  const aplicar = (lista) => {
    for (const maquina of maquinas) {
      const atual = lista.find((item) => item.id === maquina.ativo.id);
      if (atual) maquina.ativo = atual;
      const estado = situacao(maquina.ativo);
      const { cor, classe, icone } = CONDICOES[estado] ?? CONDICOES.Normal;
      maquina.estado = estado;
      maquina.marca.material.color.setHex(cor);
      maquina.facho.visible = estado === 'Crítico';
      maquina.nome.className = `plant-label ${classe}`;
      const titulo = document.createElement('b');
      titulo.textContent = maquina.ativo.tag;
      const detalhe = document.createElement('span');
      detalhe.textContent = `${icone} ${estado}`;
      const completo = document.createElement('small');
      completo.textContent = maquina.ativo.nome;
      maquina.nome.replaceChildren(titulo, detalhe, completo);
    }
    const contar = (estado) => maquinas.filter((maquina) => maquina.estado === estado).length;
    resumo.textContent = `${maquinas.length} máquinas · ⛔ ${contar('Crítico')} em estado crítico · ⚠ ${contar('Alerta')} em alerta · ✓ ${contar('Normal')} normais · ■ ${contar('Parado')} paradas`;
  };
  aplicar(ativos);

  setInterval(async () => {
    if (document.hidden) return;
    try {
      const dados = await buscar();
      // Cadastro mudou: monta a planta de novo.
      if (dados.ativos.length !== maquinas.length) window.location.reload();
      else aplicar(dados.ativos);
    } catch { /* Mantém a última condição conhecida. */ }
  }, 5000);

  // ---------- Câmera ----------
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 400);
  const largura = colunas * ESPACO.x;
  const profundidade = linhas * ESPACO.z;
  const inicial = { theta: 0.35, phi: 0.92, zoom: 1 };
  const desejada = { ...inicial };
  const atual = { ...inicial };
  const aproximar = (zoom) => { desejada.zoom = Math.max(0.35, Math.min(1.8, zoom)); };

  ligarGestos(palco, renderer.domElement, {
    girar: (dx, dy) => {
      desejada.theta -= dx * 0.006;
      desejada.phi = Math.max(0.25, Math.min(1.4, desejada.phi - dy * 0.005));
    },
    aproximar: (fator) => aproximar(desejada.zoom * fator),
  });
  renderer.domElement.addEventListener('wheel', (e) => {
    e.preventDefault();
    aproximar(desejada.zoom + e.deltaY * 0.0008);
  }, { passive: false });
  document.getElementById('plant-reset').addEventListener('click', () => Object.assign(desejada, inicial));

  const redimensionar = () => {
    const w = area.clientWidth;
    const h = area.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  new ResizeObserver(redimensionar).observe(area);
  redimensionar();

  const relogio = new THREE.Clock();
  const projetado = new THREE.Vector3();
  let tempo = 0;
  const animar = () => {
    requestAnimationFrame(animar);
    const passo = Math.min(relogio.getDelta(), 0.1);
    tempo += passo;

    for (const maquina of maquinas) {
      const falha = maquina.estado === 'Crítico';
      const parada = !maquina.ativo.operando;
      maquina.movimento.atualizar({
        passo: parada ? 0 : passo,
        tempo,
        cadencia: 10.5,
        proporcao: parada ? 0 : 1,
        falha,
        corStatus: falha ? CORES.critico : CORES.ambar,
        razoes: { pressao: 0.62, vazao: 0.62, vibracao: 0, temperatura: 0.5, nivel: 0.6 },
      });
      if (maquina.montagem) {
        maquina.montagem.avancar(passo);
        if (maquina.montagem.terminou) maquina.montagem = null;
      }
      if (falha) maquina.facho.material.opacity = 0.08 + Math.abs(Math.sin(tempo * 3)) * 0.14;
    }

    atual.theta += (desejada.theta - atual.theta) * 0.09;
    atual.phi += (desejada.phi - atual.phi) * 0.09;
    atual.zoom += (desejada.zoom - atual.zoom) * 0.09;
    // Distância que enquadra a planta inteira, inclusive em telas estreitas.
    const raio = Math.max(largura / camera.aspect, profundidade * 1.25, 18) * 1.45 * atual.zoom;
    camera.position.set(
      raio * Math.sin(atual.phi) * Math.sin(atual.theta),
      raio * Math.cos(atual.phi) + 1,
      raio * Math.sin(atual.phi) * Math.cos(atual.theta),
    );
    camera.lookAt(0, 1, 0);
    for (const maquina of maquinas) maquina.montagem?.aplicar();
    renderer.render(cena, camera);
    for (const maquina of maquinas) maquina.montagem?.restaurar();

    for (const maquina of maquinas) {
      projetado.copy(maquina.grupo.position).setY(maquina.altura + 0.6).project(camera);
      const x = (projetado.x * 0.5 + 0.5) * area.clientWidth;
      const y = (-projetado.y * 0.5 + 0.5) * area.clientHeight;
      maquina.nome.style.transform = `translate(-50%, -100%) translate(${x}px, ${y}px)`;
      maquina.nome.style.opacity = projetado.z < 1 ? '1' : '0';
    }
  };
  // Prepara os materiais antes do primeiro quadro, sem travar a tela.
  camera.position.set(20, 20, 20);
  camera.lookAt(0, 1, 0);
  await Promise.race([
    renderer.compileAsync(cena, camera).catch(() => {}),
    new Promise((pronto) => setTimeout(pronto, 4000)),
  ]);
  palco.querySelector('.op-3d-carregando')?.remove();
  relogio.getDelta();
  animar();
}

if (palco) {
  montar().catch((erro) => {
    console.error('Falha ao montar a planta 3D.', erro);
    document.getElementById('plant-summary').textContent = 'Não foi possível carregar a planta. Atualize a página.';
    palco.querySelector('.op-3d-carregando')?.remove();
  });
}
