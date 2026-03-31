'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const PARTICLE_COUNT = 25000;
const MORPH_DURATION = 3.0;
const SHAPE_DURATIONS = [40000, 20000, 20000];

function makeGalaxy(): Float32Array {
  const pos = new Float32Array(PARTICLE_COUNT * 3);
  const numArms = 4;
  const armCount  = Math.floor(PARTICLE_COUNT * 0.70);
  const coreCount = Math.floor(PARTICLE_COUNT * 0.20);
  const hazeCount = PARTICLE_COUNT - armCount - coreCount;

  const raw = new Float32Array(PARTICLE_COUNT * 3);
  let i = 0;

  for (let p = 0; p < armCount; p++) {
    const arm = p % numArms;
    const offset = (arm / numArms) * Math.PI * 2;
    const r = 0.15 + Math.pow(Math.random(), 0.6) * 1.5;
    const angle = offset + r * 2.8 + (Math.random() - 0.5) * 0.35;
    raw[i++] = Math.cos(angle) * r + (Math.random() - 0.5) * 0.06;
    raw[i++] = (Math.random() - 0.5) * 0.08 * (1 + r);
    raw[i++] = Math.sin(angle) * r + (Math.random() - 0.5) * 0.06;
  }

  for (let p = 0; p < coreCount; p++) {
    const theta = Math.random() * Math.PI * 2;
    const phi   = Math.acos(2 * Math.random() - 1);
    const r     = Math.pow(Math.random(), 2.5) * 0.35;
    raw[i++] = r * Math.sin(phi) * Math.cos(theta);
    raw[i++] = r * Math.cos(phi) * 0.55;
    raw[i++] = r * Math.sin(phi) * Math.sin(theta);
  }

  for (let p = 0; p < hazeCount; p++) {
    const angle = Math.random() * Math.PI * 2;
    const r     = 0.3 + Math.pow(Math.random(), 1.2) * 1.3;
    raw[i++] = Math.cos(angle) * r + (Math.random() - 0.5) * 0.1;
    raw[i++] = (Math.random() - 0.5) * 0.06;
    raw[i++] = Math.sin(angle) * r + (Math.random() - 0.5) * 0.1;
  }

  const cosT = Math.cos(0.66), sinT = Math.sin(0.66);
  for (let p = 0; p < PARTICLE_COUNT; p++) {
    const x = raw[p * 3], y = raw[p * 3 + 1], z = raw[p * 3 + 2];
    pos[p * 3]     = x;
    pos[p * 3 + 1] = y * cosT - z * sinT;
    pos[p * 3 + 2] = y * sinT + z * cosT;
  }
  return pos;
}

function makeDNA(): Float32Array {
  const pos = new Float32Array(PARTICLE_COUNT * 3);
  const half = Math.floor(PARTICLE_COUNT / 2);
  for (let h = 0; h < 2; h++) {
    const phaseOffset = h * Math.PI;
    for (let p = 0; p < half; p++) {
      const idx = (h * half + p) * 3;
      const t = (p / half) * Math.PI * 6 - Math.PI * 3;
      const r = 0.6;
      pos[idx]     = r * Math.cos(t + phaseOffset) + (Math.random() - 0.5) * 0.04;
      pos[idx + 1] = t * 0.25 + (Math.random() - 0.5) * 0.04;
      pos[idx + 2] = r * Math.sin(t + phaseOffset) + (Math.random() - 0.5) * 0.04;

      if (h === 0 && p % 200 < 10) {
        const rungT     = Math.floor(p / 200) * 200;
        const rungAngle = (rungT / half) * Math.PI * 6 - Math.PI * 3;
        const frac      = (p % 200) / 10;
        pos[idx]     = r * Math.cos(rungAngle) * (1 - frac) + r * Math.cos(rungAngle + Math.PI) * frac;
        pos[idx + 2] = r * Math.sin(rungAngle) * (1 - frac) + r * Math.sin(rungAngle + Math.PI) * frac;
      }
    }
  }
  return pos;
}

function makeNeural(): Float32Array {
  const pos = new Float32Array(PARTICLE_COUNT * 3);

  const layerX    = [-1.4, -0.47, 0.47, 1.4];
  const layerSizes = [4, 6, 6, 3];
  const ySpread   = 0.55;
  const zSpread   = 0.65;

  const nodes: [number, number, number][][] = layerSizes.map((n, li) => {
    const layer: [number, number, number][] = [];
    for (let ni = 0; ni < n; ni++) {
      const y = (ni - (n - 1) / 2) * ySpread;
      const zSign = ((ni + li) % 2 === 0) ? 1 : -1;
      const z = zSign * (0.2 + Math.random() * (zSpread - 0.2));
      layer.push([layerX[li], y, z]);
    }
    return layer;
  });

  const connections: [[number, number, number], [number, number, number]][] = [];
  for (let li = 0; li < layerSizes.length - 1; li++) {
    for (const a of nodes[li]) {
      for (const b of nodes[li + 1]) {
        connections.push([a, b]);
      }
    }
  }

  const totalNodes     = layerSizes.reduce((s, n) => s + n, 0);
  const perNode        = 260;
  const nodeTotal      = totalNodes * perNode;
  const perConn        = Math.floor((PARTICLE_COUNT - nodeTotal) / connections.length);

  let idx = 0;

  for (const layer of nodes) {
    for (const [nx, ny, nz] of layer) {
      for (let p = 0; p < perNode; p++) {
        const theta = Math.random() * Math.PI * 2;
        const phi   = Math.acos(2 * Math.random() - 1);
        const r     = Math.pow(Math.random(), 2) * 0.09;
        pos[idx++] = nx + r * Math.sin(phi) * Math.cos(theta);
        pos[idx++] = ny + r * Math.cos(phi);
        pos[idx++] = nz + r * Math.sin(phi) * Math.sin(theta);
      }
    }
  }

  for (const [[ax, ay, az], [bx, by, bz]] of connections) {
    const mx = (ax + bx) / 2 + (Math.random() - 0.5) * 0.15;
    const my = (ay + by) / 2 + (Math.random() - 0.5) * 0.25;
    const mz = (az + bz) / 2 + (Math.random() - 0.5) * 0.35;
    for (let p = 0; p < perConn; p++) {
      const t = Math.random();
      const s = 1 - t;
      pos[idx++] = s*s*ax + 2*s*t*mx + t*t*bx + (Math.random()-0.5)*0.01;
      pos[idx++] = s*s*ay + 2*s*t*my + t*t*by + (Math.random()-0.5)*0.01;
      pos[idx++] = s*s*az + 2*s*t*mz + t*t*bz + (Math.random()-0.5)*0.01;
    }
  }

  while (idx < PARTICLE_COUNT * 3) pos[idx++] = 0;
  return pos;
}

export default function GalaxyBackground() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current!;
    if (!container) return;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 2.2;
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x111010, 0.018);

    const camera = new THREE.PerspectiveCamera(40, container.clientWidth / container.clientHeight, 0.1, 100);
    camera.position.set(0, 0, 5);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping  = true;
    controls.dampingFactor  = 0.04;
    controls.autoRotate     = true;
    controls.autoRotateSpeed = 0.14;
    controls.enableZoom = false;
    controls.enablePan  = false;

    scene.add(new THREE.AmbientLight(0xffeedd, 3));
    const keyLight = new THREE.PointLight(0xff8800, 15, 50);
    keyLight.position.set(3, 3, 4);
    scene.add(keyLight);
    const fillLight = new THREE.PointLight(0x4a6fa5, 6, 50);
    fillLight.position.set(-4, -2, 3);
    scene.add(fillLight);
    const rimLight = new THREE.PointLight(0xff5500, 10, 50);
    rimLight.position.set(0, 4, -3);
    scene.add(rimLight);
    const frontLight = new THREE.PointLight(0xffffff, 10, 40);
    frontLight.position.set(0, 0, 6);
    scene.add(frontLight);

    const shapes = [makeGalaxy(), makeDNA(), makeNeural()];

    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const colors    = new Float32Array(PARTICLE_COUNT * 3);
    const sizes     = new Float32Array(PARTICLE_COUNT);
    const randoms   = new Float32Array(PARTICLE_COUNT);

    positions.set(shapes[0]);

    const cWhite  = new THREE.Color(0xffffff);
    const cOrange = new THREE.Color(0xff8800);
    const cDeep   = new THREE.Color(0xff4400);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const r = i / PARTICLE_COUNT;
      const color = r < 0.4
        ? cWhite.clone().lerp(cOrange, r / 0.4)
        : cOrange.clone().lerp(cDeep, (r - 0.4) / 0.6);
      colors[i * 3]     = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
      sizes[i]   = 0.012 + Math.random() * 0.02;
      randoms[i] = Math.random();
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color',    new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('aSize',    new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('aRandom',  new THREE.BufferAttribute(randoms, 1));

    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTime:        { value: 0 },
        uPixelRatio:  { value: renderer.getPixelRatio() },
        uMorph:       { value: 0 },
        uMouse3D:     { value: new THREE.Vector3(0, 0, 0) },
        uMouseActive: { value: 0 },
      },
      vertexShader: `
        attribute float aSize;
        attribute float aRandom;
        varying vec3 vColor;
        varying float vAlpha;
        uniform float uTime;
        uniform float uPixelRatio;
        uniform float uMorph;
        uniform vec3 uMouse3D;
        uniform float uMouseActive;

        void main() {
          vColor = color;
          vec3 pos = position;

          pos += normalize(pos + vec3(0.001)) * sin(uTime * 0.5 + aRandom * 6.28) * 0.018;
          pos += normalize(pos + vec3(0.001)) * sin(uMorph * 3.14159) * 0.28 * aRandom;

          vec3 toP = pos - uMouse3D;
          float xyDist  = length(toP.xy);
          float fullDist = length(toP);
          float influence = (1.0 - smoothstep(0.0, 1.4, xyDist));
          influence = influence * influence * uMouseActive;

          if (influence > 0.001) {
            vec3 pushDir = fullDist > 0.001 ? normalize(toP) : vec3(0,1,0);
            pos += pushDir * influence * 0.3;

            float sw = uTime * 2.0 + aRandom * 6.28;
            vec2 rad = pos.xy - uMouse3D.xy;
            float ang = influence * 0.25 * (1.0 + sin(sw) * 0.3);
            pos.xy = uMouse3D.xy + vec2(rad.x*cos(ang) - rad.y*sin(ang), rad.x*sin(ang) + rad.y*cos(ang));
            pos.z += sin(sw * 0.7 + aRandom * 3.14) * influence * 0.15;
          }

          vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
          gl_PointSize = max(aSize * uPixelRatio * 500.0 / -mvPos.z, 1.5);
          gl_Position  = projectionMatrix * mvPos;
          vAlpha = 0.85 + 0.15 * (1.0 - smoothstep(0.0, 10.0, -mvPos.z));
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vAlpha;
        void main() {
          float d = length(gl_PointCoord - vec2(0.5));
          if (d > 0.5) discard;
          float alpha = smoothstep(0.5, 0.0, d) * vAlpha;
          gl_FragColor = vec4(vColor * 2.0 + 0.1, alpha);
        }
      `,
      transparent: true,
      depthWrite:  false,
      blending:    THREE.AdditiveBlending,
      vertexColors: true,
    });

    const particles = new THREE.Points(geometry, material);
    scene.add(particles);

    let currentShape = 0, targetShape = 0;
    let isMorphing = false, morphStartTime = 0;
    const clock = new THREE.Clock();

    const ease = (t: number) => t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2, 3)/2;

    function startMorph(to: number) {
      if (isMorphing || to === currentShape) return;
      targetShape = to;
      isMorphing  = true;
      morphStartTime = clock.getElapsedTime();
    }

    let autoMorphTimeout: ReturnType<typeof setTimeout>;
    function scheduleNextMorph() {
      autoMorphTimeout = setTimeout(() => {
        const next = (currentShape + 1) % shapes.length;
        startMorph(next);
        autoMorphTimeout = setTimeout(scheduleNextMorph, MORPH_DURATION * 1000 + 200);
      }, SHAPE_DURATIONS[currentShape]);
    }
    scheduleNextMorph();

    const raycaster  = new THREE.Raycaster();
    const mouseNDC   = new THREE.Vector2(9999, 9999);
    const mousePlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    const _hit       = new THREE.Vector3();
    const _inv       = new THREE.Matrix4();
    const _local     = new THREE.Vector3();
    let mouseOn = false, mouseSmooth = 0;

    const onMouseMove = (e: MouseEvent) => {
      const r = container.getBoundingClientRect();
      mouseNDC.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      mouseOn = true;
    };
    const onMouseLeave = () => { mouseNDC.set(9999, 9999); mouseOn = false; };
    container.addEventListener('mousemove', onMouseMove);
    container.addEventListener('mouseleave', onMouseLeave);

    let raf: number;
    const ROT_SPEEDS = [0.009, 0.035, 0.035];
    let rotSpeed = ROT_SPEEDS[0];
    let rotAccum = 0;
    let lastT = 0;

    function animate() {
      raf = requestAnimationFrame(animate);
      controls.update();
      const t = clock.getElapsedTime();
      const dt = t - lastT;
      lastT = t;
      material.uniforms.uTime.value = t;

      mouseSmooth += ((mouseOn ? 1 : 0) - mouseSmooth) * 0.08;
      material.uniforms.uMouseActive.value = mouseSmooth;

      raycaster.setFromCamera(mouseNDC, camera);
      raycaster.ray.intersectPlane(mousePlane, _hit);
      _inv.copy(particles.matrixWorld).invert();
      _local.copy(_hit).applyMatrix4(_inv);
      material.uniforms.uMouse3D.value.copy(_local);

      if (isMorphing) {
        const raw  = Math.min((t - morphStartTime) / MORPH_DURATION, 1);
        const prog = ease(raw);
        material.uniforms.uMorph.value = prog;

        const src = shapes[currentShape];
        const tgt = shapes[targetShape];
        const arr = geometry.attributes.position.array as Float32Array;
        for (let i = 0; i < PARTICLE_COUNT * 3; i++) {
          arr[i] = src[i] + (tgt[i] - src[i]) * prog;
        }
        geometry.attributes.position.needsUpdate = true;

        if (raw >= 1) {
          isMorphing = false;
          currentShape = targetShape;
          material.uniforms.uMorph.value = 0;
        }
      }

      const targetSpeed = ROT_SPEEDS[currentShape];
      rotSpeed += (targetSpeed - rotSpeed) * 0.02;
      rotAccum += rotSpeed * dt;

      particles.rotation.y   = rotAccum;
      particles.position.y   = Math.sin(t * 0.3) * 0.05;
      keyLight.position.x    = Math.sin(t * 0.2) * 4;
      keyLight.position.z    = Math.cos(t * 0.2) * 4;

      renderer.render(scene, camera);
    }
    animate();

    const onResize = () => {
      const w = container.clientWidth, h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      material.uniforms.uPixelRatio.value = renderer.getPixelRatio();
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(autoMorphTimeout);
      window.removeEventListener('resize', onResize);
      container.removeEventListener('mousemove', onMouseMove);
      container.removeEventListener('mouseleave', onMouseLeave);
      controls.dispose();
      renderer.dispose();
      geometry.dispose();
      material.dispose();
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{ position: 'absolute', top: 0, bottom: 0, right: 0, left: '-15vw', width: 'calc(100% + 15vw)' }}
    />
  );
}
