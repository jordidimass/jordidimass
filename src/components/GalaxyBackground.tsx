'use client';

import { useRef, useMemo, useEffect, useLayoutEffect, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useMotionContext } from './MotionProvider';
import { useTheme } from './ThemeProvider';

const PARTICLE_COUNT = 25000;
const MOBILE_PARTICLE_COUNT = 10000;
const HIT_RADIUS = 1.75;

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

/** Particle black hole: empty horizon, photon ring, thin Kepler disk, faint jets. Same tilt as the galaxy. */
function makeBlackHole(count: number): Float32Array {
  const pos = new Float32Array(count * 3);
  const diskCount = Math.floor(count * 0.72);
  const ringCount = Math.floor(count * 0.16);
  const jetCount  = Math.floor(count * 0.07);
  const hazeCount = count - diskCount - ringCount - jetCount;
  const raw = new Float32Array(count * 3);
  let i = 0;

  for (let p = 0; p < diskCount; p++) {
    const r = 0.42 + Math.pow(Math.random(), 0.55) * 1.28;
    const angle = r * 3.4 + (Math.random() - 0.5) * 0.28;
    const thick = 0.018 * (1 + r * 0.4);
    raw[i++] = Math.cos(angle) * r + (Math.random() - 0.5) * 0.04;
    raw[i++] = (Math.random() - 0.5) * thick;
    raw[i++] = Math.sin(angle) * r + (Math.random() - 0.5) * 0.04;
  }
  for (let p = 0; p < ringCount; p++) {
    const r = 0.34 + (Math.random() - 0.5) * 0.05;
    const angle = Math.random() * Math.PI * 2;
    raw[i++] = Math.cos(angle) * r;
    raw[i++] = (Math.random() - 0.5) * 0.012;
    raw[i++] = Math.sin(angle) * r;
  }
  for (let p = 0; p < jetCount; p++) {
    const sign = p % 2 === 0 ? 1 : -1;
    const t = Math.pow(Math.random(), 0.7);
    const y = sign * (0.22 + t * 1.15);
    const spread = 0.04 + t * 0.09;
    const a = Math.random() * Math.PI * 2;
    raw[i++] = Math.cos(a) * spread * Math.random();
    raw[i++] = y;
    raw[i++] = Math.sin(a) * spread * Math.random();
  }
  for (let p = 0; p < hazeCount; p++) {
    const r = 0.9 + Math.pow(Math.random(), 1.4) * 0.9;
    const angle = Math.random() * Math.PI * 2;
    raw[i++] = Math.cos(angle) * r + (Math.random() - 0.5) * 0.12;
    raw[i++] = (Math.random() - 0.5) * 0.04;
    raw[i++] = Math.sin(angle) * r + (Math.random() - 0.5) * 0.12;
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

function paintGalaxy(count: number, light: boolean): Float32Array {
  const colors = new Float32Array(count * 3);
  const cWhite  = new THREE.Color(light ? 0x3a2018 : 0xffffff);
  const cOrange = new THREE.Color(light ? 0xc45a20 : 0xff8800);
  const cDeep   = new THREE.Color(light ? 0x7a2208 : 0xff4400);
  for (let i = 0; i < count; i++) {
    const r = i / count;
    const color = r < 0.4
      ? cWhite.clone().lerp(cOrange, r / 0.4)
      : cOrange.clone().lerp(cDeep, (r - 0.4) / 0.6);
    colors[i * 3]     = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }
  return colors;
}

function paintBlackHole(count: number, pos: Float32Array): Float32Array {
  const colors = new Float32Array(count * 3);
  const cInk   = new THREE.Color(0x1a0c08);
  const cEmber = new THREE.Color(0xc45a20);
  const cGold  = new THREE.Color(0xffcc66);
  const cDeep  = new THREE.Color(0x4a1408);
  for (let i = 0; i < count; i++) {
    const x = pos[i * 3], z = pos[i * 3 + 2];
    const r = Math.sqrt(x * x + z * z);
    const beam = 0.5 + 0.5 * (x / Math.max(r, 0.001));
    let color: THREE.Color;
    if (r < 0.42) color = cGold.clone().lerp(cEmber, 0.35);
    else if (r < 0.85) color = cEmber.clone().lerp(cGold, beam * 0.45);
    else color = cDeep.clone().lerp(cInk, Math.min((r - 0.85) / 0.9, 1));
    colors[i * 3]     = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }
  return colors;
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
  uniform float uHole;
  uniform vec3 uMouse3D;
  uniform float uMouseActive;

  void main() {
    vColor = color;
    vec3 pos = mix(position, aTarget, uMorph);

    pos += normalize(pos + vec3(0.001)) * sin(uTime * 0.5 + aRandom * 6.28) * 0.018;
    pos += normalize(pos + vec3(0.001)) * sin(uMorph * 3.14159) * 0.22 * aRandom;

    if (uHole > 0.001) {
      float r = length(pos.xz);
      float w = uHole * uTime * (0.42 / max(r, 0.28));
      float c = cos(w);
      float s = sin(w);
      vec2 xz = pos.xz;
      pos.xz = vec2(c * xz.x - s * xz.y, s * xz.x + c * xz.y);
      pos *= mix(1.0, 0.97, uHole * smoothstep(1.6, 0.35, r));
    }

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
  uniform float uHole;
  void main() {
    float d = length(gl_PointCoord - vec2(0.5));
    if (d > 0.5) discard;
    float alpha = smoothstep(0.5, 0.0, d) * vAlpha;
    float bloom = mix(2.0, 1.08, uHole);
    gl_FragColor = vec4(vColor * bloom + mix(0.1, 0.0, uHole), alpha);
  }
`;

function Particles({ isMobile, light }: { isMobile: boolean; light: boolean }) {
  const { gl, camera, raycaster } = useThree();
  const groupRef = useRef<THREE.Group>(null!);
  const meshRef  = useRef<THREE.Points>(null!);
  const geoRef   = useRef<THREE.BufferGeometry>(null!);
  const hitRef   = useRef<THREE.Mesh>(null!);
  const matRef   = useRef<THREE.ShaderMaterial>(null!);
  const keyLight = useRef<THREE.PointLight>(null!);

  const mouseNDC   = useRef(new THREE.Vector2(9999, 9999));
  const mousePlane = useRef(new THREE.Plane(new THREE.Vector3(0, 0, 1), 0));
  const hitPoint   = useRef(new THREE.Vector3());
  const invMatrix  = useRef(new THREE.Matrix4());
  const localPoint = useRef(new THREE.Vector3());
  const mouseOn    = useRef(false);
  const mouseDirty = useRef(false);
  const mouseSmooth = useRef(0);

  const rotX = useRef(0);
  const rotY = useRef(0);
  const rotSpeed = useRef(isMobile ? 0.022 : 0.009);
  const dragging = useRef(false);
  const lastPtr = useRef({ x: 0, y: 0 });
  const overGalaxy = useRef(false);
  const morph = useRef<{
    active: boolean;
    start: number;
    dest: Float32Array | null;
    fromColors: Float32Array | null;
    destColors: Float32Array | null;
  }>({
    active: false,
    start: 0,
    dest: null,
    fromColors: null,
    destColors: null,
  });

  const count = isMobile ? MOBILE_PARTICLE_COUNT : PARTICLE_COUNT;
  const MORPH_DURATION = 2.2;
  const inited = useRef(false);

  const { positions, targets, colors, sizes, randoms, galaxy, hole } = useMemo(() => {
    const galaxy = makeGalaxy(count);
    const hole = makeBlackHole(count);
    const sizes     = new Float32Array(count);
    const randoms   = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      sizes[i]   = 0.012 + Math.random() * 0.02;
      randoms[i] = Math.random();
    }
    const colors = paintGalaxy(count, false);
    const positions = new Float32Array(galaxy);
    const targets = new Float32Array(galaxy);
    return { positions, targets, colors, sizes, randoms, galaxy, hole };
  }, [count]);

  const uniforms = useMemo(() => ({
    uTime:        { value: 0 },
    uPixelRatio:  { value: gl.getPixelRatio() },
    uMorph:       { value: 0 },
    uHole:        { value: 0 },
    uMouse3D:     { value: new THREE.Vector3(0, 0, 0) },
    uMouseActive: { value: 0 },
  }), [gl]);

  useLayoutEffect(() => {
    const geo = geoRef.current;
    const mat = matRef.current;
    if (!geo || !mat) return;
    const dest = light ? hole : galaxy;
    const destColors = light ? paintBlackHole(count, hole) : paintGalaxy(count, false);
    const colorAttr = geo.attributes.color as THREE.BufferAttribute;
    const targetAttr = geo.attributes.aTarget as THREE.BufferAttribute;
    const posAttr = geo.attributes.position as THREE.BufferAttribute;

    if (!inited.current) {
      inited.current = true;
      posAttr.array.set(dest);
      targetAttr.array.set(dest);
      colorAttr.array.set(destColors);
      posAttr.needsUpdate = true;
      targetAttr.needsUpdate = true;
      colorAttr.needsUpdate = true;
      mat.uniforms.uMorph.value = 0;
      mat.uniforms.uHole.value = light ? 1 : 0;
      rotSpeed.current = isMobile ? (light ? 0.034 : 0.022) : (light ? 0.026 : 0.009);
      return;
    }

    targetAttr.array.set(dest);
    targetAttr.needsUpdate = true;
    mat.uniforms.uMorph.value = 0;
    morph.current = {
      active: true,
      start: performance.now() / 1000,
      dest,
      fromColors: new Float32Array(colorAttr.array as Float32Array),
      destColors,
    };
  }, [light, galaxy, hole, count, isMobile]);

  useEffect(() => {
    const canvas = gl.domElement;

    const setCursor = (value: string) => {
      document.body.style.cursor = value === 'auto' ? '' : value;
    };

    const toNDC = (clientX: number, clientY: number) => {
      const r = canvas.getBoundingClientRect();
      mouseNDC.current.set(
        ((clientX - r.left) / r.width) * 2 - 1,
        -((clientY - r.top) / r.height) * 2 + 1
      );
    };

    const hitsGalaxy = () => {
      if (!hitRef.current) return false;
      raycaster.setFromCamera(mouseNDC.current, camera);
      return raycaster.intersectObject(hitRef.current).length > 0;
    };

    const onPointerMove = (e: PointerEvent) => {
      toNDC(e.clientX, e.clientY);
      mouseDirty.current = true;

      if (dragging.current) {
        rotY.current += (e.clientX - lastPtr.current.x) * 0.005;
        rotX.current = Math.max(-0.7, Math.min(0.7, rotX.current + (e.clientY - lastPtr.current.y) * 0.005));
        lastPtr.current = { x: e.clientX, y: e.clientY };
        mouseOn.current = true;
        return;
      }

      overGalaxy.current = hitsGalaxy();
      mouseOn.current = overGalaxy.current;
      setCursor(overGalaxy.current ? 'grab' : 'auto');
    };

    const onPointerDown = (e: PointerEvent) => {
      toNDC(e.clientX, e.clientY);
      if (!hitsGalaxy()) return;
      dragging.current = true;
      lastPtr.current = { x: e.clientX, y: e.clientY };
      setCursor('grabbing');
      e.preventDefault();
    };

    const onPointerUp = () => {
      if (!dragging.current) return;
      dragging.current = false;
      overGalaxy.current = hitsGalaxy();
      mouseOn.current = overGalaxy.current;
      setCursor(overGalaxy.current ? 'grab' : 'auto');
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
    return () => {
      setCursor('auto');
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
    };
  }, [gl, camera, raycaster]);

  useFrame((_, delta) => {
    const t = performance.now() / 1000;
    const mat = matRef.current;
    const mesh = meshRef.current;
    const group = groupRef.current;
    if (!mat || !mesh || !group) return;

    mat.uniforms.uTime.value = t;

    const holeTarget = light ? 1 : 0;
    const speedTarget = isMobile
      ? (light ? 0.034 : 0.022)
      : (light ? 0.026 : 0.009);
    rotSpeed.current += (speedTarget - rotSpeed.current) * 0.06;

    const m = morph.current;
    if (m.active && m.dest && m.fromColors && m.destColors) {
      const geo = geoRef.current;
      const raw = Math.min((t - m.start) / MORPH_DURATION, 1);
      const e = raw * raw * (3 - 2 * raw);
      mat.uniforms.uMorph.value = e;
      mat.uniforms.uHole.value = THREE.MathUtils.lerp(
        1 - holeTarget,
        holeTarget,
        e,
      );
      const colorAttr = geo.attributes.color as THREE.BufferAttribute;
      const arr = colorAttr.array as Float32Array;
      for (let i = 0; i < arr.length; i++) {
        arr[i] = m.fromColors[i] + (m.destColors[i] - m.fromColors[i]) * e;
      }
      colorAttr.needsUpdate = true;
      if (raw >= 1) {
        const posAttr = geo.attributes.position as THREE.BufferAttribute;
        (posAttr.array as Float32Array).set(m.dest);
        posAttr.needsUpdate = true;
        mat.uniforms.uMorph.value = 0;
        mat.uniforms.uHole.value = holeTarget;
        m.active = false;
        m.dest = null;
        m.fromColors = null;
        m.destColors = null;
      }
    } else {
      mat.uniforms.uHole.value += (holeTarget - mat.uniforms.uHole.value) * 0.08;
    }

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

    if (!dragging.current) rotY.current += rotSpeed.current * delta;

    group.rotation.x = rotX.current;
    group.rotation.y = rotY.current;
    group.position.y = Math.sin(t * 0.3) * 0.05;

    if (keyLight.current) {
      keyLight.current.position.x = Math.sin(t * 0.2) * 4;
      keyLight.current.position.z = Math.cos(t * 0.2) * 4;
    }
  });

  return (
    <>
      <ambientLight color={light ? 0xfff4e8 : 0xffeedd} intensity={light ? 1.2 : 3} />
      <pointLight ref={keyLight} color={0xff8800} intensity={light ? 8 : 15} distance={50} position={[3, 3, 4]} />
      <pointLight color={0x4a6fa5} intensity={light ? 3 : 6} distance={50} position={[-4, -2, 3]} />
      <pointLight color={0xff5500} intensity={light ? 5 : 10} distance={50} position={[0, 4, -3]} />
      <pointLight color={0xffffff} intensity={light ? 4 : 10} distance={40} position={[0, 0, 6]} />

      <group ref={groupRef}>
        <points ref={meshRef}>
          <bufferGeometry ref={geoRef}>
            <bufferAttribute attach="attributes-position" args={[positions, 3]} />
            <bufferAttribute attach="attributes-aTarget" args={[targets, 3]} />
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
            blending={light ? THREE.NormalBlending : THREE.AdditiveBlending}
            vertexColors
          />
        </points>
        <mesh ref={hitRef}>
          <sphereGeometry args={[HIT_RADIUS, 16, 16]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      </group>
    </>
  );
}

function GalaxyCanvas() {
  const { theme } = useTheme();
  const light = theme === 'light';
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
      className="absolute inset-0 pointer-events-none"
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
          toneMappingExposure: light ? 1.15 : 2.2,
        }}
        onCreated={({ gl }) => {
          gl.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2));
          setVisible(true);
        }}
        style={{ position: 'absolute', inset: 0, background: 'transparent', pointerEvents: 'none' }}
      >
        <fog attach="fog" args={[light ? 0xf3eee7 : 0x111010, 0, 55]} />
        <Particles isMobile={isMobile} light={light} />
      </Canvas>
    </div>
  );
}

export default function GalaxyBackground() {
  const { motionEnabled } = useMotionContext();
  if (!motionEnabled) return null;
  return <GalaxyCanvas />;
}
