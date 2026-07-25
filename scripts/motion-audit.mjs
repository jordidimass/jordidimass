#!/usr/bin/env node
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const read = (p) => readFileSync(join(ROOT, p), 'utf8');

function walk(dir, out = []) {
  for (const entry of readdirSync(join(ROOT, dir))) {
    const rel = `${dir}/${entry}`;
    if (statSync(join(ROOT, rel)).isDirectory()) walk(rel, out);
    else if (/\.(tsx?|css)$/.test(entry)) out.push(rel);
  }
  return out;
}

const SRC = walk('src');
const results = [];
const check = (name, fn) => {
  try {
    const problem = fn();
    results.push({ name, pass: !problem, detail: problem || '' });
  } catch (err) {
    results.push({ name, pass: false, detail: `threw: ${err.message}` });
  }
};

const grepAll = (re, { exclude = [] } = {}) =>
  SRC.filter((f) => !exclude.some((e) => f.includes(e)))
    .flatMap((f) =>
      read(f)
        .split('\n')
        .map((line, i) => ({ f, n: i + 1, line }))
        .filter(({ line }) => re.test(line))
    );

/* ── Phase 1: performance ─────────────────────────────────────────────────── */

check('galaxy morph runs on the GPU (aTarget attribute + mix in vertex shader)', () => {
  const s = read('src/components/GalaxyBackground.tsx');
  if (!s.includes('attribute vec3 aTarget')) return 'vertex shader has no aTarget attribute';
  if (!s.includes('mix(position, aTarget, uMorph)')) return 'shader does not mix position -> aTarget';
  if (!s.includes('attributes-aTarget')) return 'geometry has no aTarget bufferAttribute';
  return null;
});

check('no per-frame JS lerp loop over the particle buffer', () => {
  const s = read('src/components/GalaxyBackground.tsx');
  const frame = s.slice(s.indexOf('useFrame('), s.indexOf('return (\n    <>'));
  if (/for\s*\(let i = 0; i < (PARTICLE_COUNT|count) \* 3/.test(frame))
    return 'useFrame still iterates the whole position buffer';
  if ((frame.match(/needsUpdate = true/g) || []).length > 1)
    return 'useFrame uploads more than one buffer per frame';
  return null;
});

check('galaxy raycast is gated on pointer movement', () => {
  const s = read('src/components/GalaxyBackground.tsx');
  if (!s.includes('mouseDirty')) return 'no mouseDirty gate';
  const idx = s.indexOf('raycaster.setFromCamera');
  const before = s.slice(Math.max(0, idx - 300), idx);
  if (!before.includes('mouseDirty.current')) return 'raycast is not inside the dirty check';
  return null;
});

check('galaxy has a reduced mobile particle budget', () => {
  const s = read('src/components/GalaxyBackground.tsx');
  if (!/MOBILE_PARTICLE_COUNT\s*=\s*(\d+)/.test(s)) return 'no MOBILE_PARTICLE_COUNT';
  const mobile = Number(RegExp.$1);
  const desktop = Number(/PARTICLE_COUNT\s*=\s*(\d+)/.exec(s)[1]);
  if (mobile >= desktop) return `mobile budget ${mobile} not below desktop ${desktop}`;
  if (!s.includes('isMobile ? MOBILE_PARTICLE_COUNT : PARTICLE_COUNT')) return 'budget not selected by isMobile';
  return null;
});

check('galaxy caps DPR and disables antialias on mobile', () => {
  const s = read('src/components/GalaxyBackground.tsx');
  if (!s.includes('antialias: !isMobile')) return 'antialias not gated on isMobile';
  if (!/setPixelRatio\(Math\.min\(window\.devicePixelRatio, isMobile \? 1\.5 : 2\)\)/.test(s))
    return 'pixel ratio not capped per device';
  return null;
});

check('galaxy stops rendering while the tab is hidden', () => {
  const s = read('src/components/GalaxyBackground.tsx');
  if (!s.includes('visibilitychange')) return 'no visibilitychange listener';
  if (!s.includes("frameloop={hidden ? 'never' : 'always'}")) return 'frameloop not gated on visibility';
  return null;
});

check('homepage text is not gated behind WebGL readiness', () => {
  const s = read('src/app/page.tsx');
  if (s.includes('onReady')) return 'page.tsx still waits on onReady';
  if (/animate={ready/.test(s)) return 'page.tsx still gates its animation on a ready flag';
  if (!s.includes('<h1')) return 'homepage h1 missing';
  return null;
});

check('particles rAF loop is cancelled on unmount', () => {
  const s = read('src/components/ui/particles.tsx');
  if (!s.includes('cancelAnimationFrame')) return 'no cancelAnimationFrame';
  const raf = (s.match(/requestAnimationFrame/g) || []).length;
  const cancel = (s.match(/cancelAnimationFrame/g) || []).length;
  if (cancel < 1 || raf < 1) return `raf=${raf} cancel=${cancel}`;
  return null;
});

check('particles caps device pixel ratio', () => {
  const s = read('src/components/ui/particles.tsx');
  if (!/Math\.min\(window\.devicePixelRatio \|\| 1, 2\)/.test(s)) return 'DPR not capped at 2';
  return null;
});

check('particles does not put pointer position in React state', () => {
  const s = read('src/components/ui/particles.tsx');
  if (s.includes('useMousePosition')) return 'useMousePosition hook still present';
  if (/setMousePosition/.test(s)) return 'still calls setMousePosition';
  return null;
});

check('navbar scroll listener is passive and does not thrash state', () => {
  const s = read('src/components/Navbar.tsx');
  if (!/addEventListener\('scroll', handleScroll, \{ passive: true \}\)/.test(s))
    return 'scroll listener is not passive';
  if (!/prev === next \? prev : next/.test(s)) return 'setState fires on every scroll event';
  return null;
});

check('mobile pull cue animates transform, not height', () => {
  const s = read('src/components/ui/FloatingTerminal.tsx');
  if (/height: vPullBottomH/.test(s)) return 'cue still animates height';
  if (!s.includes('y: vPullBottomY')) return 'cue does not animate y';
  if (/backdropFilter: "blur\(14px\)"/.test(s)) return 'cue still carries a 14px backdrop blur';
  return null;
});

check('page rubber-band writes transform directly, not inherited CSS variables', () => {
  const s = read('src/components/ui/FloatingTerminal.tsx');
  if (/setProperty\("--jd-terminal-pull/.test(s)) return 'still writes --jd-terminal-pull-* custom properties';
  if (!/main\.style\.transform = `translate3d/.test(s)) return 'does not write main.style.transform';
  return null;
});

check('will-change is not permanently pinned on <main>', () => {
  const css = read('src/app/globals.css');
  const block = /@media \(max-width: 768px\) \{[\s\S]*?\n\}/.exec(css)?.[0] ?? '';
  if (block.includes('will-change')) return 'globals.css still pins will-change on main';
  const s = read('src/components/ui/FloatingTerminal.tsx');
  if (!s.includes('main.style.willChange')) return 'will-change is never set during the pull';
  return null;
});

/* ── Phase 2: motion correctness ──────────────────────────────────────────── */

check('motion easing tokens are defined', () => {
  const css = read('src/app/globals.css');
  for (const [name, value] of [
    ['--ease-out', 'cubic-bezier(0.23, 1, 0.32, 1)'],
    ['--ease-in-out', 'cubic-bezier(0.77, 0, 0.175, 1)'],
    ['--ease-drawer', 'cubic-bezier(0.32, 0.72, 0, 1)'],
  ]) {
    if (!css.includes(`${name}: ${value}`)) return `${name} missing or not the canonical curve`;
  }
  if (!css.includes('--default-transition-duration')) return 'no default transition duration';
  const ts = read('src/lib/motion.ts');
  if (!ts.includes('[0.23, 1, 0.32, 1]')) return 'JS EASE_OUT does not match the CSS curve';
  return null;
});

check('no transition-all anywhere in src', () => {
  const hits = grepAll(/transition-all/);
  return hits.length ? hits.map((h) => `${h.f}:${h.n}`).join(', ') : null;
});

check('no UI transition or motion duration above 300ms', () => {
  const bad = [];
  for (const f of SRC) {
    const lines = read(f).split('\n');
    lines.forEach((line, i) => {
      // Looping motion (blinking cursors, spinners) is constant motion, not a
      // transition — the 300ms budget does not apply.
      const nearby = lines.slice(Math.max(0, i - 3), i + 4).join('\n');
      if (/repeat:\s*(Number\.POSITIVE_INFINITY|Infinity)/.test(nearby)) return;
      for (const m of line.matchAll(/duration-\[?(\d+)m?s?\]?/g)) {
        const ms = Number(m[1]);
        if (ms > 300 && ms < 5000) bad.push(`${f}:${i + 1} duration-${ms}`);
      }
      for (const m of line.matchAll(/duration:\s*([\d.]+)\s*[,}]/g)) {
        const sec = Number(m[1]);
        if (sec > 0.3 && sec <= 5) bad.push(`${f}:${i + 1} duration ${sec}s`);
      }
    });
  }
  return bad.length ? bad.join(', ') : null;
});

check('no stagger delay above 80ms and none uncapped by list length', () => {
  const bad = [];
  for (const f of SRC) {
    read(f).split('\n').forEach((line, i) => {
      for (const m of line.matchAll(/delay:\s*(?:Math\.min\([^)]*\)|index)\s*\*\s*([\d.]+)/g)) {
        if (Number(m[1]) > 0.08) bad.push(`${f}:${i + 1} stagger ${m[1]}s`);
      }
      if (/delay:\s*index\s*\*/.test(line) && !/Math\.min/.test(line)) {
        bad.push(`${f}:${i + 1} uncapped index stagger`);
      }
    });
  }
  return bad.length ? bad.join(', ') : null;
});

check('no entrance animation starts below scale(0.9)', () => {
  const bad = [];
  for (const f of SRC) {
    read(f).split('\n').forEach((line, i) => {
      for (const m of line.matchAll(/scale:\s*(0?\.\d+|0)\b/g)) {
        if (/whileTap|whileHover/.test(line)) continue;
        if (Number(m[1]) < 0.9) bad.push(`${f}:${i + 1} scale ${m[1]}`);
      }
      if (/scale-\[0\.[0-8]\d?\]/.test(line) && !/active:/.test(line)) {
        bad.push(`${f}:${i + 1} ${line.trim().slice(0, 60)}`);
      }
    });
  }
  return bad.length ? bad.join(', ') : null;
});

check('no box-shadow transitions on grid tiles', () => {
  const s = read('src/app/gallery/GalleryClient.tsx');
  if (/transition-(all|shadow)[^"]*hover:shadow-\[/.test(s)) return 'gallery tile still transitions box-shadow';
  if (!/shadow-\[[^\]]+\][^"]*opacity-0[^"]*group-hover:opacity-100|opacity-0[^"]*shadow-\[/.test(s))
    return 'no opacity-driven shadow layer found';
  return null;
});

check('pressable elements have press feedback', () => {
  const css = read('src/app/globals.css');
  if (!/\.jd-pressable:active\s*\{\s*transform:\s*scale\(0\.9[5-8]\)/.test(css))
    return 'jd-pressable:active does not scale between 0.95 and 0.98';
  const users = grepAll(/jd-pressable/).filter((h) => !h.f.endsWith('.css'));
  if (users.length < 3) return `only ${users.length} components use it`;
  return null;
});

check('trigger-anchored popover is origin-aware', () => {
  const s = read('src/components/ui/ShortcutsHelp.tsx');
  if (!/transformOrigin:\s*"bottom left"/.test(s)) return 'ShortcutsHelp panel still scales from center';
  return null;
});

check('command palette still has no open/close animation', () => {
  const s = read('src/components/CommandPalette.tsx');
  if (/AnimatePresence|initial=\{\{|animate=\{\{/.test(s))
    return 'an entrance animation was added to a 100+/day keyboard action';
  return null;
});

/* ── Phase 3: accessibility ───────────────────────────────────────────────── */

check('OS reduced-motion is the default before first paint', () => {
  const s = read('src/app/layout.tsx');
  if (!s.includes('prefers-reduced-motion')) return 'inline script never consults the OS preference';
  const script = /__html: `([^`]*)`/.exec(s)?.[1] ?? '';
  if (!script.includes('prefers-reduced-motion')) return 'preference check is not in the pre-paint inline script';
  if (!script.includes("localStorage.getItem('jd-motion')")) return 'explicit toggle no longer overrides the OS';
  return null;
});

check('every rAF background respects the motion toggle', () => {
  for (const f of ['src/components/GalaxyBackground.tsx', 'src/components/ui/particles.tsx', 'src/components/ui/matrixComponent.tsx']) {
    if (!read(f).includes('useMotionContext')) return `${f} ignores the motion toggle`;
  }
  const m = read('src/components/ui/matrixComponent.tsx');
  if (!/isMatrixAnimating && motionEnabled/.test(m)) return 'matrix rain loop is not gated on motionEnabled';
  return null;
});

/* ── Hygiene ──────────────────────────────────────────────────────────────── */

check('no leftover references to removed pull custom properties', () => {
  const hits = grepAll(/--jd-terminal-pull/);
  return hits.length ? hits.map((h) => `${h.f}:${h.n}`).join(', ') : null;
});

/* ── Report ───────────────────────────────────────────────────────────────── */

let failed = 0;
for (const r of results) {
  if (r.pass) {
    console.log(`  PASS  ${r.name}`);
  } else {
    failed++;
    console.log(`  FAIL  ${r.name}\n        ${r.detail}`);
  }
}
console.log(`\n${results.length - failed}/${results.length} checks passed`);
process.exit(failed ? 1 : 0);
