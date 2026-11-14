import { useEffect, useRef } from 'react';
import * as THREE from 'three';

export default function ThreeBackground() {
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // 1. Cena, Câmera e Renderizador
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      55,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.set(0, 3.6, 9.5);
    camera.lookAt(0, 0.3, 0);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // 2. Oceano de partículas (Telemetria)
    const cols = 64;
    const rows = 64;
    const spacing = 0.45;
    const count = cols * rows;

    const positions = new Float32Array(count * 3);
    let i = 0;
    for (let x = 0; x < cols; x++) {
      for (let z = 0; z < rows; z++) {
        positions[i] = (x - cols / 2) * spacing;
        positions[i + 1] = 0;
        positions[i + 2] = (z - rows / 2) * spacing;
        i += 3;
      }
    }

    const oceanGeometry = new THREE.BufferGeometry();
    oceanGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const oceanMaterial = new THREE.PointsMaterial({
      color: 0xf59e0b,
      size: 0.048,
      transparent: true,
      opacity: 0.42,
    });

    const particles = new THREE.Points(oceanGeometry, oceanMaterial);
    scene.add(particles);

    // 3. Plataforma Offshore Detalhada (Minimalista / Blueprint)
    const rigGroup = new THREE.Group();

    // Duas intensidades de linha para dar profundidade sem poluir
    const primaryLineMat = new THREE.LineBasicMaterial({
      color: 0xf59e0b,
      transparent: true,
      opacity: 0.42,
    });

    const secondaryLineMat = new THREE.LineBasicMaterial({
      color: 0xf59e0b,
      transparent: true,
      opacity: 0.22,
    });

    const disposables = [oceanGeometry, oceanMaterial, primaryLineMat, secondaryLineMat];

    const addPart = (geometry, x, y, z, rot = {}, isSecondary = false) => {
      const edges = new THREE.EdgesGeometry(geometry);
      const line = new THREE.LineSegments(
        edges,
        isSecondary ? secondaryLineMat : primaryLineMat
      );
      line.position.set(x, y, z);
      if (rot.x) line.rotation.x = rot.x;
      if (rot.y) line.rotation.y = rot.y;
      if (rot.z) line.rotation.z = rot.z;
      rigGroup.add(line);
      geometry.dispose();
      disposables.push(edges);
    };

    // Flutuadores submersos (Pontoons)
    addPart(new THREE.BoxGeometry(3.1, 0.22, 0.36), 0, 0.2, -0.75);
    addPart(new THREE.BoxGeometry(3.1, 0.22, 0.36), 0, 0.2, 0.75);

    // 4 Colunas principais de sustentação
    const legPositions = [
      [-1.05, -0.75],
      [1.05, -0.75],
      [-1.05, 0.75],
      [1.05, 0.75],
    ];
    legPositions.forEach(([lx, lz]) => {
      addPart(new THREE.BoxGeometry(0.24, 1.15, 0.24), lx, 0.78, lz);
    });

    // Treliças diagonais entre as colunas (estrutura offshore)
    addPart(new THREE.BoxGeometry(2.1, 0.04, 0.04), 0, 0.75, 0.75, { z: 0.38 }, true);
    addPart(new THREE.BoxGeometry(2.1, 0.04, 0.04), 0, 0.75, 0.75, { z: -0.38 }, true);
    addPart(new THREE.BoxGeometry(2.1, 0.04, 0.04), 0, 0.75, -0.75, { z: 0.38 }, true);
    addPart(new THREE.BoxGeometry(2.1, 0.04, 0.04), 0, 0.75, -0.75, { z: -0.38 }, true);
    addPart(new THREE.BoxGeometry(0.04, 0.04, 1.5), -1.05, 0.75, 0, { x: 0.5 }, true);
    addPart(new THREE.BoxGeometry(0.04, 0.04, 1.5), 1.05, 0.75, 0, { x: -0.5 }, true);

    // Dutos submarinos (Risers) descendo do convés até o mar
    const riserOffsets = [-0.16, 0, 0.16];
    riserOffsets.forEach((rz) => {
      addPart(new THREE.CylinderGeometry(0.025, 0.025, 1.9, 6), 0.15, 0.4, rz, {}, true);
    });

    // Convés principal (2 níveis)
    addPart(new THREE.BoxGeometry(2.75, 0.22, 1.85), 0, 1.42, 0);
    addPart(new THREE.BoxGeometry(2.35, 0.15, 1.55), 0, 1.61, 0, {}, true);

    // Módulo de controle e acomodações
    addPart(new THREE.BoxGeometry(0.85, 0.46, 0.95), -0.75, 1.91, 0.25);
    addPart(new THREE.BoxGeometry(0.62, 0.18, 0.65), -0.75, 2.23, 0.32);

    // Mastro e radar giratório no topo do módulo
    addPart(new THREE.CylinderGeometry(0.02, 0.03, 0.35, 6), -0.75, 2.48, 0.32, {}, true);
    const radarGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(0.36, 0.04, 0.05));
    const radarMesh = new THREE.LineSegments(radarGeo, primaryLineMat);
    radarMesh.position.set(-0.75, 2.65, 0.32);
    rigGroup.add(radarMesh);
    disposables.push(radarGeo);

    // Heliponto octogonal + suporte + letra "H"
    addPart(new THREE.CylinderGeometry(0.62, 0.62, 0.07, 12), -1.68, 1.78, 0.35);
    addPart(new THREE.BoxGeometry(0.65, 0.04, 0.04), -1.35, 1.62, 0.35, { z: 0.42 }, true);

    const hPoints = [
      new THREE.Vector3(-1.8, 1.83, 0.2),
      new THREE.Vector3(-1.8, 1.83, 0.5),
      new THREE.Vector3(-1.8, 1.83, 0.35),
      new THREE.Vector3(-1.56, 1.83, 0.35),
      new THREE.Vector3(-1.56, 1.83, 0.2),
      new THREE.Vector3(-1.56, 1.83, 0.5),
    ];
    const hGeo = new THREE.BufferGeometry().setFromPoints(hPoints);
    const hLines = new THREE.LineSegments(hGeo, primaryLineMat);
    rigGroup.add(hLines);
    disposables.push(hGeo);

    // Silos cilíndricos de armazenamento
    addPart(new THREE.CylinderGeometry(0.18, 0.18, 0.52, 12), -0.68, 1.94, -0.45);
    addPart(new THREE.CylinderGeometry(0.18, 0.18, 0.52, 12), -0.24, 1.94, -0.45);

    // Torre de Perfuração Principal (Derrick treliçada)
    addPart(new THREE.CylinderGeometry(0.14, 0.46, 2.15, 4), 0.35, 2.74, 0, { y: Math.PI / 4 });
    // Anéis estruturais internos da torre
    addPart(new THREE.BoxGeometry(0.54, 0.05, 0.54), 0.35, 2.15, 0, {}, true);
    addPart(new THREE.BoxGeometry(0.4, 0.05, 0.4), 0.35, 2.75, 0, {}, true);
    addPart(new THREE.BoxGeometry(0.28, 0.05, 0.28), 0.35, 3.35, 0, {}, true);
    // Topo da torre (Crown block)
    addPart(new THREE.BoxGeometry(0.24, 0.14, 0.24), 0.35, 3.88, 0);

    // Guindaste 1 (frontal direito)
    addPart(new THREE.CylinderGeometry(0.08, 0.1, 0.32, 8), 1.05, 1.84, 0.55);
    addPart(new THREE.BoxGeometry(1.15, 0.06, 0.06), 1.48, 2.28, 0.55, { z: 0.55 }, true);
    addPart(new THREE.CylinderGeometry(0.01, 0.01, 0.55, 4), 1.95, 2.28, 0.55, {}, true);

    // Guindaste 2 (traseiro)
    addPart(new THREE.CylinderGeometry(0.08, 0.1, 0.32, 8), 0.25, 1.84, -0.62);
    addPart(new THREE.BoxGeometry(1.05, 0.06, 0.06), -0.15, 2.25, -0.62, { z: -0.52 }, true);

    // Braço do queimador (Flare Boom) + chama pulsante
    addPart(new THREE.BoxGeometry(1.45, 0.07, 0.07), 1.65, 2.05, -0.42, { z: 0.48 });
    const flareMat = new THREE.MeshBasicMaterial({ color: 0xfbbf24 });
    const flareDot = new THREE.Mesh(new THREE.SphereGeometry(0.065, 10, 10), flareMat);
    flareDot.position.set(2.3, 2.4, -0.42);
    rigGroup.add(flareDot);
    disposables.push(flareDot.geometry, flareMat);

    // Pontos de sensores ativos (Telemetria PetroSync)
    const sensorMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });
    const sensorGeo = new THREE.SphereGeometry(0.038, 8, 8);
    const sensorCoords = [
      [0.35, 3.96, 0],     // Topo da torre
      [0.15, 0.1, 0],      // Riser submarino
      [-0.68, 2.22, -0.45], // Silo
      [1.05, 2.02, 0.55],  // Guindaste
    ];
    sensorCoords.forEach(([sx, sy, sz]) => {
      const dot = new THREE.Mesh(sensorGeo, sensorMat);
      dot.position.set(sx, sy, sz);
      rigGroup.add(dot);
    });
    disposables.push(sensorGeo, sensorMat);

    // Escala maior e posicionamento centralizado
    rigGroup.scale.set(1.52, 1.52, 1.52);
    rigGroup.position.set(-0.35, -0.75, 1.1);
    rigGroup.rotation.y = -0.48;
    scene.add(rigGroup);

    // 4. Interação suave com o mouse e resize
    let mouseX = 0;
    let mouseY = 0;
    const handleMouseMove = (event) => {
      mouseX = (event.clientX / window.innerWidth - 0.5) * 1.3;
      mouseY = (event.clientY / window.innerHeight - 0.5) * 1.1;
    };
    window.addEventListener('mousemove', handleMouseMove);

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    // 5. Loop de animação
    let animationFrameId;
    const clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      // Ondulação do mar de partículas
      const posArray = oceanGeometry.attributes.position.array;
      let idx = 0;
      for (let x = 0; x < cols; x++) {
        for (let z = 0; z < rows; z++) {
          const waveX = Math.sin(x * 0.25 + elapsedTime * 1.1) * 0.28;
          const waveZ = Math.cos(z * 0.25 + elapsedTime * 0.9) * 0.28;
          posArray[idx + 1] = waveX + waveZ;
          idx += 3;
        }
      }
      oceanGeometry.attributes.position.needsUpdate = true;

      // Flutuação suave da plataforma
      rigGroup.position.y = -0.75 + Math.sin(elapsedTime * 1.1) * 0.12;
      rigGroup.rotation.z = Math.cos(elapsedTime * 0.9) * 0.025;
      rigGroup.rotation.x = Math.sin(elapsedTime * 0.8) * 0.018;

      // Giro do radar e pulso da chama do flare
      radarMesh.rotation.y = elapsedTime * 1.8;
      const flareScale = 1 + Math.sin(elapsedTime * 6) * 0.28;
      flareDot.scale.set(flareScale, flareScale, flareScale);

      camera.position.x += (mouseX - camera.position.x) * 0.05;
      camera.position.y += (3.6 - mouseY - camera.position.y) * 0.05;
      camera.lookAt(0, 0.3, 0);

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      disposables.forEach((item) => item.dispose());
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
      }}
    />
  );
}