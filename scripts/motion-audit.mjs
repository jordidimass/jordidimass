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

/* ── Gallery image pipeline ───────────────────────────────────────────────── */

check('column packing fills every column and stays balanced', () => {
  // A split that returned fewer starts than columns left the last column empty
  // and dumped its images into the previous one.
  const src = read('src/lib/gallery.ts');
  if (/acc >= target \* starts\.length/.test(src))
    return 'threshold scales with the column index while acc resets — later breaks can never fire';
  if (!/acc >= target &&/.test(src)) return 'column break threshold not found';
  return null;
});

check('gallery images pick their source from worker capability', () => {
  const bad = [];
  for (const f of SRC.filter((x) => x.includes('/gallery/'))) {
    const s = read(f);
    for (const tag of s.match(/<Image\b[\s\S]*?\/>/g) || []) {
      if (!/\{\.\.\.imageSource\(/.test(tag)) bad.push(`${f}: <Image> not routed through imageSource()`);
      if (/width=\{1600\}/.test(tag)) bad.push(`${f}: hardcoded width 1600`);
      if (/\bunoptimized\b/.test(tag)) bad.push(`${f}: hardcoded unoptimized`);
    }
  }
  return bad.length ? bad.join(', ') : null;
});

check('variants are only requested once the worker advertises them', () => {
  const s = read('src/lib/galleryLoader.ts');
  if (!/export function imageSource/.test(s)) return 'no imageSource helper';
  if (!/\(img\.widths\?\.length \?\? 0\) === 0/.test(s))
    return 'source is not gated on the manifest widths the worker returns';
  if (!/src: img\.url, unoptimized: true/.test(s))
    return 'no original fallback for a worker without derived variants';
  if (!/\?v=\$\{version\}/.test(read('src/lib/galleryLoader.ts')))
    return 'derived URLs are not versioned, so a re-derive would serve stale immutable variants';
  return null;
});

check('priority images are a subset of eager ones', () => {
  const s = read('src/app/gallery/GalleryClient.tsx');
  // Next throws at runtime if an image carries both `priority` and
  // loading="lazy", so the priority set must never escape the eager set.
  const eagerRows = /eagerSet: aboveFoldIndices\(images, (\d+)\)/.exec(s)?.[1];
  const prioRows = /prioritySet: aboveFoldIndices\(images, (\d+)\)/.exec(s)?.[1];
  if (!eagerRows || !prioRows) return 'eager/priority sets are not both derived from the packing';
  if (Number(prioRows) > Number(eagerRows))
    return `priority covers ${prioRows} rows but eager only ${eagerRows} — priority would imply loading="lazy"`;
  if (/priority=\{index < /.test(s)) return 'priority is still index-based, so it can disagree with the packing';
  if (!/priority=\{priority\}/.test(s)) return 'priority prop is not driven by the packing';
  return null;
});

check('image width ladder is consistent across loader, config and derive script', () => {
  const loader = read('src/lib/galleryLoader.ts');
  const ladder = /GALLERY_WIDTHS = \[([^\]]+)\]/.exec(loader)?.[1];
  if (!ladder) return 'GALLERY_WIDTHS not found';
  const widths = ladder.split(',').map((n) => Number(n.trim())).filter(Boolean);

  const config = read('next.config.mjs');
  const device = /deviceSizes:\s*\[([^\]]+)\]/.exec(config)?.[1];
  if (!device) return 'deviceSizes not set in next.config.mjs';
  const deviceWidths = device.split(',').map((n) => Number(n.trim())).filter(Boolean);
  if (deviceWidths.join() !== widths.join()) return `deviceSizes ${deviceWidths} != ladder ${widths}`;
  if (Math.max(...deviceWidths) > 3200) return 'deviceSizes still reaches above 3200';

  const derive = read('cloudflare/derive.mjs');
  for (const w of widths) {
    if (!new RegExp(`width:\\s*${w}\\b`).test(derive)) return `derive.mjs does not generate ${w}w`;
  }

  const worker = read('cloudflare/src/index.ts');
  const allowed = /ALLOWED_WIDTHS = new Set\(\[([^\]]+)\]\)/.exec(worker)?.[1];
  if (!allowed) return 'worker ALLOWED_WIDTHS not found';
  const workerWidths = allowed.split(',').map((n) => Number(n.trim())).filter(Boolean);
  if (workerWidths.join() !== widths.join()) return `worker ${workerWidths} != ladder ${widths}`;
  return null;
});

check('gallery entrance runs in CSS, not behind hydration', () => {
  const css = read('src/app/globals.css');
  const s = read('src/app/gallery/GalleryClient.tsx');
  // A Motion-driven entrance renders opacity:0 into the SSR HTML and only
  // clears after hydration, so on a slow connection the gallery stayed black
  // until the JS bundle landed — after the images had already arrived.
  if (!/@keyframes jd-tile-in/.test(css)) return 'no CSS keyframes for the tile entrance';
  if (!/\.jd-tile\s*\{[\s\S]*?animation: jd-tile-in/.test(css)) return '.jd-tile does not run the entrance';
  if (!/\.jd-tile\[data-pending\]/.test(css)) return 'no opt-in hidden state for below-fold tiles';
  if (/<motion\.div[\s\S]{0,200}data-gallery-tile/.test(s)) return 'tile wrapper is still a motion component';
  if (!/className=\{`jd-tile /.test(s)) return 'tile does not carry the jd-tile class';
  return null;
});

check('gallery renders without JavaScript', () => {
  const fs = readdirSync(join(ROOT, 'src/app/gallery'));
  // loading.tsx introduces a Suspense boundary on a statically prerendered
  // route: the real grid ships in the HTML but stays hidden until JS swaps it.
  if (fs.includes('loading.tsx')) return 'loading.tsx makes the prerendered grid JS-dependent';
  const s = read('src/app/gallery/GalleryClient.tsx');
  if (/data-pending/.test(s) && !/setAttribute\("data-pending"/.test(s))
    return 'pending state is not applied by script only';
  return null;
});

check('column packing is deterministic so the server can set priority', () => {
  const g = read('src/lib/gallery.ts');
  if (!/export function columnStarts/.test(g)) return 'no deterministic column split';
  if (!/export function aboveFoldIndices/.test(g)) return 'no above-fold index set';
  const s = read('src/app/gallery/GalleryClient.tsx');
  if (!/break-before-column/.test(s)) return 'column breaks are not forced, so CSS balances unpredictably';
  if (!/eager=\{layout\.eagerSet\.has\(index\)\}/.test(s)) return 'eager is not driven by the packing';
  if (!/loading=\{eager \? "eager" : "lazy"\}/.test(s)) return 'loading is not driven by the packing';
  return null;
});

check('modal animates in and out, faster on exit', () => {
  const s = read('src/app/gallery/GalleryClient.tsx');
  if (!/<AnimatePresence>/.test(s)) return 'modal has no AnimatePresence, so it cannot animate out';
  const inD = Number(/MODAL_IN = ([\d.]+)/.exec(s)?.[1]);
  const outD = Number(/MODAL_OUT = ([\d.]+)/.exec(s)?.[1]);
  if (!inD || !outD) return 'modal durations not defined';
  if (inD > 0.5 || inD < 0.2) return `enter ${inD * 1000}ms outside the 200-500ms modal band`;
  if (outD >= inD) return 'exit is not faster than enter';
  if (!/scale: 0\.9[5-8]/.test(s)) return 'modal does not scale in from 0.95-0.98';
  if (/scale: 0(\.0+)?[,}]/.test(s)) return 'modal scales from zero';
  return null;
});

check('gallery stagger is row-based, within budget, and capped', () => {
  const css = read('src/app/globals.css');
  const delay = /animation-delay: calc\(min\(var\(--jd-row[^)]*\), (\d+)\) \* (\d+)ms\)/.exec(css);
  if (!delay) return 'tile stagger delay not found in CSS';
  const [, cap, step] = delay;
  if (Number(step) > 80) return `stagger ${step}ms exceeds the 80ms bar`;
  if (Number(cap) > 12) return `stagger cap of ${cap} rows makes the tail too long`;
  // CSS columns fill column-first, so the delay must key off the row within a
  // column, not the DOM index.
  if (!/--jd-row-3/.test(css)) return 'no per-breakpoint row delay';
  const s = read('src/app/gallery/GalleryClient.tsx');
  if (!/"--jd-row-3": rows\.three/.test(s)) return 'rows are not passed per breakpoint';
  return null;
});

check('grid carries blur placeholders and real dimensions', () => {
  const s = read('src/app/gallery/GalleryClient.tsx');
  if (!/placeholder=\{img\.blurDataURL \? "blur" : "empty"\}/.test(s)) return 'no conditional blur placeholder';
  if (!/width=\{img\.width \?\? FALLBACK_WIDTH\}/.test(s)) return 'tile does not use manifest width';
  if (!/height=\{img\.height \?\? FALLBACK_HEIGHT\}/.test(s)) return 'tile does not use manifest height';
  return null;
});

check('downloads still serve the untouched original', () => {
  const s = read('src/app/gallery/GalleryClient.tsx');
  if (!/downloadImage\(selectedImage\.url/.test(s)) return 'modal download no longer uses the original url';
  const btn = read('src/app/gallery/[slug]/DownloadButton.tsx');
  if (!/url/.test(btn)) return 'DownloadButton no longer takes a url';
  return null;
});

check('worker keeps a fallback so a missing variant never 404s', () => {
  const s = read('cloudflare/src/index.ts');
  if (!/X-JD-Variant/.test(s)) return 'no variant marker header';
  if (!/const original = await env\.GALLERY\.get\(key\)/.test(s)) return 'no original fallback in the /v/ route';
  if (!/startsWith\(DERIVED_PREFIX\) \|\| obj\.key === MANIFEST_KEY/.test(s))
    return 'derived objects and the manifest are not excluded from the listing';
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
