import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

export default function ThreeBackground() {
  const host = useRef(null);
  useEffect(() => {
    const container = host.current;
    if (!container || !window.WebGLRenderingContext) return undefined;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(48, window.innerWidth / window.innerHeight, .1, 100);
    camera.position.set(0, 4.2, 11);
    camera.lookAt(0, .5, 0);
    let renderer;
    try { renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true }); }
    catch { return undefined; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setSize(window.innerWidth, window.innerHeight);
    container.appendChild(renderer.domElement);

    const primary = new THREE.LineBasicMaterial({ color: 0xf5aa32, transparent: true, opacity: .37 });
    const faint = new THREE.LineBasicMaterial({ color: 0xf5aa32, transparent: true, opacity: .16 });
    const resources = [primary, faint];
    const platform = new THREE.Group();
    const wire = (geometry, position, rotation = null, secondary = false) => {
      const edges = new THREE.EdgesGeometry(geometry);
      const lines = new THREE.LineSegments(edges, secondary ? faint : primary);
      lines.position.set(...position);
      if (rotation) lines.rotation.set(...rotation);
      platform.add(lines);
      geometry.dispose(); resources.push(edges);
    };
    wire(new THREE.BoxGeometry(4.5, .2, 2.8), [0, 1.5, 0]);
    wire(new THREE.BoxGeometry(3.8, .14, 2.3), [0, 1.68, 0], null, true);
    for (const x of [-1.55, 1.55]) for (const z of [-.92, .92]) {
      wire(new THREE.BoxGeometry(.2, 1.35, .2), [x, .78, z]);
    }
    wire(new THREE.CylinderGeometry(.58, .24, 2.75, 4), [.2, 3.05, -.15], [0, Math.PI / 4, 0]);
    wire(new THREE.BoxGeometry(.28, .15, .28), [.2, 4.45, -.15]);
    wire(new THREE.BoxGeometry(1.15, .05, .9), [-1.1, 2.05, .1]);
    wire(new THREE.CylinderGeometry(.34, .34, .68, 10), [-1.1, 2.38, .1], null, true);
    wire(new THREE.CylinderGeometry(.32, .32, .72, 10), [-.42, 2.4, .1], null, true);
    wire(new THREE.BoxGeometry(1.7, .06, .06), [2.15, 2.25, -.45], [0, 0, -.28]);
    wire(new THREE.BoxGeometry(1.5, .05, .05), [1.8, 2.55, .85], [0, 0, .38], true);
    const points = [];
    const count = window.innerWidth < 700 ? 30 : 52;
    for (let x = 0; x < count; x++) for (let z = 0; z < count; z++) points.push((x - count / 2) * .46, -.1, (z - count / 2) * .46);
    const sea = new THREE.BufferGeometry();
    sea.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
    const ocean = new THREE.Points(sea, new THREE.PointsMaterial({ color: 0xf5aa32, size: .035, transparent: true, opacity: .29 }));
    scene.add(ocean); resources.push(sea, ocean.material);
    platform.scale.setScalar(1.2); platform.position.set(2.3, -.5, -.5); platform.rotation.y = -.43;
    scene.add(platform);

    let frameId;
    const clock = new THREE.Clock();
    const resize = () => { camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix(); renderer.setSize(window.innerWidth, window.innerHeight); };
    const animate = () => {
      frameId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();
      platform.position.y = -.5 + Math.sin(elapsed * .7) * .07;
      platform.rotation.z = Math.sin(elapsed * .5) * .012;
      const pos = sea.attributes.position.array;
      for (let i = 0; i < pos.length; i += 3) pos[i + 1] = Math.sin(pos[i] * .25 + elapsed) * .13 + Math.cos(pos[i + 2] * .24 + elapsed * .8) * .12;
      sea.attributes.position.needsUpdate = true;
      renderer.render(scene, camera);
    };
    window.addEventListener('resize', resize);
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) animate(); else renderer.render(scene, camera);
    return () => { cancelAnimationFrame(frameId); window.removeEventListener('resize', resize); resources.forEach((resource) => resource.dispose()); renderer.dispose(); container.removeChild(renderer.domElement); };
  }, []);
  return <div className="three-background" ref={host} aria-hidden="true" />;
}
