// A máquina reage na peça com problema, de um jeito para cada tipo de leitura.
// É só visual: usa as leituras que a tela já recebe.
import * as THREE from 'three';

const TIPOS = [
  [/vibra/, 'vibracao'],
  [/temper/, 'temperatura'],
  [/press|combust/, 'pressao'],
  [/vaz|flux/, 'vazao'],
  [/n[ií]vel/, 'nivel'],
];

// Partículas de cada reação: quantidade (crítico), cor, duração em segundos e tamanho.
const PARTICULAS = {
  temperatura: { total: 16, cor: 0xaeb4bf, vida: 1.8, de: 0.28, ate: 1.15, opacidade: 0.5 },
  pressao: { total: 22, cor: 0xf1f5f9, vida: 0.65, de: 0.14, ate: 0.62, opacidade: 0.75 },
  vazao: { total: 20, cor: 0x60a5fa, vida: 0.8, de: 0.17, ate: 0.1, opacidade: 0.95 },
  nivel: { total: 10, cor: 0x60a5fa, vida: 1, de: 0.15, ate: 0.1, opacidade: 0.95 },
  vibracao: { total: 3, cor: 0xfbbf24, vida: 1.2, de: 0.4, ate: 2.4, opacidade: 0.8, anel: true },
};

const ORIGEM = new THREE.Vector3();

function desenharTextura(anel) {
  const tela = document.createElement('canvas');
  tela.width = tela.height = 64;
  const c = tela.getContext('2d');
  if (anel) {
    c.strokeStyle = '#fff';
    c.lineWidth = 4;
    c.beginPath();
    c.arc(32, 32, 28, 0, Math.PI * 2);
    c.stroke();
  } else {
    const brilho = c.createRadialGradient(32, 32, 0, 32, 32, 32);
    brilho.addColorStop(0, 'rgba(255,255,255,1)');
    brilho.addColorStop(0.55, 'rgba(255,255,255,.55)');
    brilho.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = brilho;
    c.fillRect(0, 0, 64, 64);
  }
  return new THREE.CanvasTexture(tela);
}

// Atenção e crítico, com uma folga para a reação não ligar e desligar perto do limite.
function nivelDa(leitura, anterior) {
  const { valor, limiteAtencao, limiteCritico } = leitura;
  if (valor >= limiteCritico || (anterior === 'critico' && valor >= limiteCritico * 0.97)) return 'critico';
  if (valor >= limiteAtencao || (anterior && valor >= limiteAtencao * 0.97)) return 'alerta';
  return null;
}

// Peças próximas do ponto do problema, ignorando bases e vasos grandes.
function pecasProximas(maquina, ponto) {
  maquina.updateMatrixWorld(true);
  const caixa = new THREE.Box3();
  const centro = new THREE.Vector3();
  const tamanho = new THREE.Vector3();
  const candidatas = [];
  maquina.traverse((objeto) => {
    if (!objeto.isMesh || !objeto.material?.emissive) return;
    caixa.setFromObject(objeto);
    caixa.getSize(tamanho);
    if (tamanho.length() > 2.8) return;
    caixa.getCenter(centro);
    candidatas.push({ objeto, distancia: centro.distanceTo(ponto) });
  });
  candidatas.sort((a, b) => a.distancia - b.distancia);
  const perto = candidatas.filter((item) => item.distancia < 0.95);
  return (perto.length ? perto : candidatas.slice(0, 3)).map((item) => item.objeto);
}

export function criarEfeitos(cena, semMovimento) {
  const texturas = { nuvem: desenharTextura(false), anel: desenharTextura(true) };
  const ativos = new Map(); // parâmetro -> reação em andamento
  const ondas = [];
  const quentes = new Map(); // material original -> cópia avermelhada
  const salvos = [];

  function criarReacao(tipo, pino, maquina) {
    const ponto = new THREE.Vector3(...pino.pos);
    const config = PARTICULAS[tipo];
    const sprites = Array.from({ length: semMovimento ? 0 : config.total }, (_, i) => {
      const material = new THREE.SpriteMaterial({
        map: config.anel ? texturas.anel : texturas.nuvem,
        color: config.cor,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        depthTest: !config.anel,
      });
      const sprite = new THREE.Sprite(material);
      sprite.userData = { idade: (i / config.total) * config.vida, velocidade: new THREE.Vector3() };
      cena.add(sprite);
      return sprite;
    });

    let borda = null;
    if (tipo === 'nivel') {
      borda = new THREE.Mesh(
        new THREE.TorusGeometry(0.75, 0.06, 8, 40),
        new THREE.MeshBasicMaterial({ color: 0xef4444, transparent: true }),
      );
      borda.rotation.x = Math.PI / 2;
      borda.position.copy(ponto);
      cena.add(borda);
    }
    return { tipo, ponto, sprites, borda, pecas: pecasProximas(maquina, ponto), nivel: null };
  }

  function remover(reacao) {
    for (const sprite of reacao.sprites) {
      cena.remove(sprite);
      sprite.material.dispose();
    }
    if (reacao.borda) {
      cena.remove(reacao.borda);
      reacao.borda.geometry.dispose();
      reacao.borda.material.dispose();
    }
  }

  // Onda verde: o ponto voltou ao normal.
  function onda(ponto) {
    const malha = new THREE.Mesh(
      new THREE.RingGeometry(0.88, 1, 48),
      new THREE.MeshBasicMaterial({ color: 0x4ade80, transparent: true, side: THREE.DoubleSide, depthWrite: false, depthTest: false }),
    );
    malha.rotation.x = -Math.PI / 2;
    malha.position.copy(ponto);
    cena.add(malha);
    ondas.push({ malha, idade: 0 });
  }

  function nascer(reacao, sprite) {
    const { velocidade } = sprite.userData;
    const sorte = () => Math.random() - 0.5;
    sprite.position.copy(reacao.ponto).add(ORIGEM.set(sorte() * 0.3, sorte() * 0.2, sorte() * 0.3));
    if (reacao.tipo === 'temperatura') velocidade.set(sorte() * 0.35, 0.8 + Math.random() * 0.5, sorte() * 0.35);
    else if (reacao.tipo === 'pressao') {
      // Dois jatos opostos escapando da junta.
      const lado = Math.random() < 0.5 ? -1 : 1;
      velocidade.set(lado * (1.8 + Math.random()), 0.5 + sorte() * 0.5, 0.9 + sorte() * 0.5);
    } else if (reacao.tipo === 'vazao') velocidade.set(sorte() * 2.2, 1.2 + Math.random() * 1.4, sorte() * 2.2);
    else if (reacao.tipo === 'nivel') {
      const angulo = Math.random() * Math.PI * 2;
      sprite.position.add(ORIGEM.set(Math.cos(angulo) * 0.75, 0, Math.sin(angulo) * 0.75));
      velocidade.set(0, -0.2, 0);
    } else velocidade.set(0, 0, 0);
  }

  return {
    // Um exemplar de cada material dos efeitos, para preparar antes de precisar.
    amostras() {
      const grupo = new THREE.Group();
      grupo.add(new THREE.Sprite(new THREE.SpriteMaterial({ map: texturas.nuvem, transparent: true, depthWrite: false })));
      grupo.add(new THREE.Mesh(
        new THREE.RingGeometry(0.1, 0.2, 8),
        new THREE.MeshBasicMaterial({ transparent: true, side: THREE.DoubleSide, depthWrite: false }),
      ));
      return grupo;
    },

    limpar() {
      ativos.forEach(remover);
      ativos.clear();
    },

    atualizar(leituras, pinos, maquina, passo, tempo) {
      const vistos = new Set();
      for (const leitura of leituras) {
        const nome = leitura.nome?.toLocaleLowerCase('pt-BR') ?? '';
        const tipo = TIPOS.find(([padrao]) => padrao.test(nome))?.[1];
        if (!tipo) continue;
        let reacao = ativos.get(leitura.parametroId);
        const nivel = nivelDa(leitura, reacao?.nivel);
        if (!nivel) continue;
        const pino = pinos.find((p) => (p.foco ?? p.termos ?? []).some((termo) => nome.includes(termo)));
        if (!pino) continue;
        if (!reacao) {
          reacao = criarReacao(tipo, pino, maquina);
          ativos.set(leitura.parametroId, reacao);
        }
        reacao.nivel = nivel;
        vistos.add(leitura.parametroId);
      }

      for (const [id, reacao] of ativos) {
        if (vistos.has(id)) continue;
        onda(reacao.ponto);
        remover(reacao);
        ativos.delete(id);
      }

      for (const reacao of ativos.values()) {
        const config = PARTICULAS[reacao.tipo];
        const forte = reacao.nivel === 'critico';
        // Em atenção, menos partículas e mais fracas.
        const quantidade = forte ? config.total : Math.ceil(config.total * (config.anel ? 0.34 : 0.4));
        reacao.sprites.forEach((sprite, i) => {
          sprite.visible = i < quantidade;
          if (!sprite.visible) return;
          const dados = sprite.userData;
          dados.idade += passo;
          if (dados.idade >= config.vida || !dados.nascida) {
            if (dados.idade >= config.vida) dados.idade %= config.vida;
            dados.nascida = true;
            nascer(reacao, sprite);
          }
          const f = dados.idade / config.vida;
          if (reacao.tipo === 'vazao' || reacao.tipo === 'nivel') dados.velocidade.y -= 4.5 * passo;
          sprite.position.addScaledVector(dados.velocidade, passo);
          sprite.scale.setScalar(THREE.MathUtils.lerp(config.de, config.ate, f));
          sprite.material.opacity = config.opacidade * (forte ? 1 : 0.6) * Math.min(1, f * 6) * (1 - f);
        });
        if (reacao.borda) {
          reacao.borda.material.opacity = semMovimento ? 0.9 : 0.25 + Math.abs(Math.sin(tempo * (forte ? 6 : 3))) * 0.75;
          reacao.borda.material.color.setHex(forte ? 0xef4444 : 0xf5a623);
        }
      }

      for (let i = ondas.length - 1; i >= 0; i -= 1) {
        const item = ondas[i];
        item.idade += passo;
        const f = item.idade / 1.4;
        if (f >= 1) {
          cena.remove(item.malha);
          item.malha.geometry.dispose();
          item.malha.material.dispose();
          ondas.splice(i, 1);
          continue;
        }
        item.malha.scale.setScalar(0.3 + f * 2.8);
        item.malha.material.opacity = 0.75 * (1 - f);
      }
    },

    // Treme e avermelha as peças só durante o desenho do quadro; restaurar() devolve tudo.
    aplicar(tempo) {
      for (const reacao of ativos.values()) {
        const forte = reacao.nivel === 'critico';
        if (reacao.tipo === 'vibracao' && !semMovimento) {
          const amplitude = forte ? 0.055 : 0.022;
          reacao.pecas.forEach((peca, i) => {
            salvos.push({ peca, posicao: peca.position.clone() });
            peca.position.x += Math.sin(tempo * 85 + i) * amplitude;
            peca.position.y += Math.cos(tempo * 78 + i * 2) * amplitude;
          });
        }
        if (reacao.tipo === 'temperatura') {
          const brilho = (forte ? 0.75 : 0.32) * (semMovimento ? 1 : 0.75 + Math.sin(tempo * 4) * 0.25);
          for (const peca of reacao.pecas) {
            const original = peca.material;
            let quente = quentes.get(original);
            if (!quente) {
              quente = original.clone();
              quente.emissive.setHex(0xff3b14);
              quentes.set(original, quente);
            }
            quente.emissiveIntensity = brilho;
            quente.wireframe = original.wireframe;
            salvos.push({ peca, material: original });
            peca.material = quente;
          }
        }
      }
    },

    restaurar() {
      while (salvos.length) {
        const { peca, posicao, material } = salvos.pop();
        if (posicao) peca.position.copy(posicao);
        if (material) peca.material = material;
      }
    },

    descartar() {
      this.limpar();
      ondas.splice(0).forEach(({ malha }) => {
        cena.remove(malha);
        malha.geometry.dispose();
        malha.material.dispose();
      });
      quentes.forEach((material) => material.dispose());
      Object.values(texturas).forEach((textura) => textura.dispose());
    },
  };
}
