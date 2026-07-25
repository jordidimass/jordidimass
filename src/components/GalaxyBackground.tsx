'use client';

import { useRef, useMemo, useEffect, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { useMotionContext } from './MotionProvider';

const PARTICLE_COUNT = 25000;
const MOBILE_PARTICLE_COUNT = 10000;
const MORPH_DURATION = 3.0;
const SHAPE_DURATIONS = [40000, 20000, 20000];

function makeGalaxy(count: number): Float32Array {
  const pos = new Float32Array(count * 3);
  const numArms = 4;
  const armCount  = Math.floor(count * 0.70);
  const coreCount = Math.floor(count * 0.20);
  const hazeCount = count - armCount - coreCount;
  const raw = new Float32Array(count * 3);
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
  for (let p = 0; p < count; p++) {
    const x = raw[p * 3], y = raw[p * 3 + 1], z = raw[p * 3 + 2];
    pos[p * 3]     = x;
    pos[p * 3 + 1] = y * cosT - z * sinT;
    pos[p * 3 + 2] = y * sinT + z * cosT;
  }
  return pos;
}

function makeDNA(count: number): Float32Array {
  const pos = new Float32Array(count * 3);
  const half = Math.floor(count / 2);
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

function makeNeural(count: number): Float32Array {
  const pos = new Float32Array(count * 3);
  const layerX     = [-1.4, -0.47, 0.47, 1.4];
  const layerSizes = [4, 6, 6, 3];
  const ySpread    = 0.55;
  const zSpread    = 0.65;

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

  const totalNodes = layerSizes.reduce((s, n) => s + n, 0);
  const perNode    = Math.max(40, Math.floor((count * 0.2) / totalNodes));
  const nodeTotal  = totalNodes * perNode;
  const perConn    = Math.floor((count - nodeTotal) / connections.length);
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
      const t = Math.random(), s = 1 - t;
      pos[idx++] = s*s*ax + 2*s*t*mx + t*t*bx + (Math.random()-0.5)*0.01;
      pos[idx++] = s*s*ay + 2*s*t*my + t*t*by + (Math.random()-0.5)*0.01;
      pos[idx++] = s*s*az + 2*s*t*mz + t*t*bz + (Math.random()-0.5)*0.01;
    }
  }
  while (idx < count * 3) pos[idx++] = 0;
  return pos;
}

const vertexShader = `
  attribute float aSize;
  attribute float aRandom;
  attribute vec3 aTarget;
  varying vec3 vColor;
  varying float vAlpha;
  uniform float uTime;
  uniform float uPixelRatio;
  uniform float uMorph;
  uniform vec3 uMouse3D;
  uniform float uMouseActive;

  void main() {
    vColor = color;
    vec3 pos = mix(position, aTarget, uMorph);

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
`;

const fragmentShader = `
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    float d = length(gl_PointCoord - vec2(0.5));
    if (d > 0.5) discard;
    float alpha = smoothstep(0.5, 0.0, d) * vAlpha;
    gl_FragColor = vec4(vColor * 2.0 + 0.1, alpha);
  }
`;

function Particles({ isMobile }: { isMobile: boolean }) {
  const { gl } = useThree();
  const meshRef  = useRef<THREE.Points>(null!);
  const matRef   = useRef<THREE.ShaderMaterial>(null!);
  const geoRef   = useRef<THREE.BufferGeometry>(null!);
  const keyLight = useRef<THREE.PointLight>(null!);

  const mouseNDC   = useRef(new THREE.Vector2(9999, 9999));
  const mousePlane = useRef(new THREE.Plane(new THREE.Vector3(0, 0, 1), 0));
  const hitPoint   = useRef(new THREE.Vector3());
  const invMatrix  = useRef(new THREE.Matrix4());
  const localPoint = useRef(new THREE.Vector3());
  const mouseOn    = useRef(false);
  const mouseDirty = useRef(false);
  const mouseSmooth = useRef(0);

  const rotAccum = useRef(0);
  const rotSpeed = useRef(0);

  const morphState = useRef({
    currentShape: 0,
    targetShape: 0,
    isMorphing: false,
    morphStartTime: 0,
    timeout: null as ReturnType<typeof setTimeout> | null,
  });

  const count = isMobile ? MOBILE_PARTICLE_COUNT : PARTICLE_COUNT;

  const shapes = useMemo(
    () => [makeGalaxy(count), makeDNA(count), makeNeural(count)],
    [count]
  );

  const { positions, targets, colors, sizes, randoms } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const targets   = new Float32Array(count * 3);
    const colors    = new Float32Array(count * 3);
    const sizes     = new Float32Array(count);
    const randoms   = new Float32Array(count);
    positions.set(shapes[0]);
    targets.set(shapes[0]);
    const cWhite  = new THREE.Color(0xffffff);
    const cOrange = new THREE.Color(0xff8800);
    const cDeep   = new THREE.Color(0xff4400);
    for (let i = 0; i < count; i++) {
      const r = i / count;
      const color = r < 0.4
        ? cWhite.clone().lerp(cOrange, r / 0.4)
        : cOrange.clone().lerp(cDeep, (r - 0.4) / 0.6);
      colors[i * 3]     = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
      sizes[i]   = 0.012 + Math.random() * 0.02;
      randoms[i] = Math.random();
    }
    return { positions, targets, colors, sizes, randoms };
  }, [shapes, count]);

  const uniforms = useMemo(() => ({
    uTime:        { value: 0 },
    uPixelRatio:  { value: gl.getPixelRatio() },
    uMorph:       { value: 0 },
    uMouse3D:     { value: new THREE.Vector3(0, 0, 0) },
    uMouseActive: { value: 0 },
  }), [gl]);

  const ROT_SPEEDS = useMemo(
    () => isMobile ? [0.022, 0.06, 0.06] : [0.009, 0.035, 0.035],
    [isMobile]
  );

  const ease = (t: number) => t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2, 3)/2;

  useEffect(() => {
    const ms = morphState.current;

    function startMorph(to: number) {
      const geo = geoRef.current;
      const mat = matRef.current;
      if (!geo || !mat) return;
      if (ms.isMorphing || to === ms.currentShape) return;

      const targetAttr = geo.attributes.aTarget as THREE.BufferAttribute;
      (targetAttr.array as Float32Array).set(shapes[to]);
      targetAttr.needsUpdate = true;

      mat.uniforms.uMorph.value = 0;
      ms.targetShape  = to;
      ms.isMorphing   = true;
      ms.morphStartTime = performance.now() / 1000;
    }

    function scheduleNextMorph() {
      ms.timeout = setTimeout(() => {
        const next = (ms.currentShape + 1) % shapes.length;
        startMorph(next);
        ms.timeout = setTimeout(scheduleNextMorph, MORPH_DURATION * 1000 + 200);
      }, SHAPE_DURATIONS[ms.currentShape]);
    }

    if (!isMobile) scheduleNextMorph();

    return () => {
      if (ms.timeout) clearTimeout(ms.timeout);
    };
  }, [isMobile, shapes]);

  useEffect(() => {
    const canvas = gl.domElement;

    const onMouseMove = (e: MouseEvent) => {
      const r = canvas.getBoundingClientRect();
      mouseNDC.current.set(
        ((e.clientX - r.left) / r.width) * 2 - 1,
        -((e.clientY - r.top) / r.height) * 2 + 1
      );
      mouseOn.current = true;
      mouseDirty.current = true;
    };
    const onMouseLeave = () => { mouseNDC.current.set(9999, 9999); mouseOn.current = false; };
    const onTouchMove = (e: TouchEvent) => {
      const t = e.touches[0];
      const r = canvas.getBoundingClientRect();
      mouseNDC.current.set(
        ((t.clientX - r.left) / r.width) * 2 - 1,
        -((t.clientY - r.top) / r.height) * 2 + 1
      );
      mouseOn.current = true;
      mouseDirty.current = true;
    };
    const onTouchEnd = () => { mouseOn.current = false; };

    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mouseleave', onMouseLeave);
    canvas.addEventListener('touchmove', onTouchMove, { passive: true });
    canvas.addEventListener('touchend', onTouchEnd);
    return () => {
      canvas.removeEventListener('mousemove', onMouseMove);
      canvas.removeEventListener('mouseleave', onMouseLeave);
      canvas.removeEventListener('touchmove', onTouchMove);
      canvas.removeEventListener('touchend', onTouchEnd);
    };
  }, [gl]);

  useFrame(({ camera, raycaster }, delta) => {
    const t = performance.now() / 1000;
    const mat = matRef.current;
    const geo = geoRef.current;
    const mesh = meshRef.current;
    const ms = morphState.current;
    if (!mat || !geo || !mesh) return;

    mat.uniforms.uTime.value = t;

    mouseSmooth.current += ((mouseOn.current ? 1 : 0) - mouseSmooth.current) * 0.08;
    mat.uniforms.uMouseActive.value = mouseSmooth.current;

    if (mouseDirty.current || mouseSmooth.current > 0.001) {
      raycaster.setFromCamera(mouseNDC.current, camera);
      raycaster.ray.intersectPlane(mousePlane.current, hitPoint.current);
      invMatrix.current.copy(mesh.matrixWorld).invert();
      localPoint.current.copy(hitPoint.current).applyMatrix4(invMatrix.current);
      mat.uniforms.uMouse3D.value.copy(localPoint.current);
      mouseDirty.current = false;
    }

    if (ms.isMorphing) {
      const raw = Math.min((t - ms.morphStartTime) / MORPH_DURATION, 1);
      mat.uniforms.uMorph.value = ease(raw);

      if (raw >= 1) {
        const posAttr = geo.attributes.position as THREE.BufferAttribute;
        (posAttr.array as Float32Array).set(shapes[ms.targetShape]);
        posAttr.needsUpdate = true;

        ms.isMorphing   = false;
        ms.currentShape = ms.targetShape;
        mat.uniforms.uMorph.value = 0;
      }
    }

    const targetSpeed = ROT_SPEEDS[ms.currentShape];
    rotSpeed.current += (targetSpeed - rotSpeed.current) * 0.02;
    rotAccum.current += rotSpeed.current * delta;

    mesh.rotation.y  = rotAccum.current;
    mesh.position.y  = Math.sin(t * 0.3) * 0.05;

    if (keyLight.current) {
      keyLight.current.position.x = Math.sin(t * 0.2) * 4;
      keyLight.current.position.z = Math.cos(t * 0.2) * 4;
    }
  });

  return (
    <>
      <ambientLight color={0xffeedd} intensity={3} />
      <pointLight ref={keyLight} color={0xff8800} intensity={15} distance={50} position={[3, 3, 4]} />
      <pointLight color={0x4a6fa5} intensity={6} distance={50} position={[-4, -2, 3]} />
      <pointLight color={0xff5500} intensity={10} distance={50} position={[0, 4, -3]} />
      <pointLight color={0xffffff} intensity={10} distance={40} position={[0, 0, 6]} />

      <points ref={meshRef}>
        <bufferGeometry ref={geoRef}>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
          <bufferAttribute attach="attributes-aTarget"  args={[targets, 3]} />
          <bufferAttribute attach="attributes-color"    args={[colors, 3]} />
          <bufferAttribute attach="attributes-aSize"    args={[sizes, 1]} />
          <bufferAttribute attach="attributes-aRandom"  args={[randoms, 1]} />
        </bufferGeometry>
        <shaderMaterial
          ref={matRef}
          uniforms={uniforms}
          vertexShader={vertexShader}
          fragmentShader={fragmentShader}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          vertexColors
        />
      </points>
    </>
  );
}

function GalaxyCanvas() {
  const [isMobile, setIsMobile] = useState<boolean | null>(null);
  const [visible, setVisible] = useState(false);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    setIsMobile(window.innerWidth < 1024);
  }, []);

  useEffect(() => {
    const onVisibility = () => setHidden(document.visibilityState === 'hidden');
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  if (isMobile === null) return null;

  return (
    <div
      className="absolute inset-0"
      style={{
        opacity: visible ? 1 : 0,
        transition: 'opacity 400ms var(--ease-out)',
      }}
    >
      <Canvas
        frameloop={hidden ? 'never' : 'always'}
        camera={{ position: [0, 0, 5], fov: 40, near: 0.1, far: 100 }}
        gl={{
          antialias: !isMobile,
          alpha: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 2.2,
        }}
        onCreated={({ gl }) => {
          gl.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2));
          setVisible(true);
        }}
        style={{ position: 'absolute', inset: 0, background: 'transparent' }}
      >
        <fog attach="fog" args={[0x111010, 0, 55]} />
        <OrbitControls
          enableDamping
          dampingFactor={isMobile ? 0.015 : 0.04}
          autoRotate
          autoRotateSpeed={isMobile ? 0.35 : 0.14}
          enableZoom={false}
          enablePan={false}
          rotateSpeed={isMobile ? 0.4 : 1.0}
        />
        <Particles isMobile={isMobile} />
      </Canvas>
    </div>
  );
}

export default function GalaxyBackground() {
  const { motionEnabled } = useMotionContext();
  if (!motionEnabled) return null;
  return <GalaxyCanvas />;
}
