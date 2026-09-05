// ─── PathwayHolo ──────────────────────────────────────────────────────────────
// Puts a live WebGL object inside every pathway card. Browsers cap WebGL
// contexts (~8–16), so a dozen canvases can NOT each own one: instead a single
// hidden shared renderer draws every mini-scene once per frame and blits the
// pixels into each card's plain 2D canvas (three.js "multiple elements"
// pattern). Offscreen cards are skipped via IntersectionObserver; the loop
// stops when no cards are mounted; reduced-motion users get a still frame.

import { useEffect, useRef } from 'react';
import * as THREE from 'three';

export type HoloKind =
  | 'planet' | 'crystal' | 'binary' | 'cage' | 'rings' | 'gyro' | 'halo' | 'orbit'
  | 'poly4' | 'poly8' | 'poly12' | 'poly20' | 'mini';

const SIZE = 160;

type Entry = {
  ctx: CanvasRenderingContext2D;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  update: (t: number) => void;
  visible: boolean;
};

let renderer: THREE.WebGLRenderer | null = null;
const entries = new Set<Entry>();
let rafId = 0;
let running = false;
const reduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function loop() {
  if (!renderer || entries.size === 0) { running = false; return; }
  const t = reduced ? 1.2 : performance.now() / 1000;
  for (const e of entries) {
    if (!e.visible) continue;
    e.update(t);
    renderer.render(e.scene, e.camera);
    e.ctx.clearRect(0, 0, SIZE, SIZE);
    e.ctx.drawImage(renderer.domElement, 0, 0);
  }
  if (reduced) { running = false; return; } // one still frame is enough
  rafId = requestAnimationFrame(loop);
}
function ensureLoop() {
  if (!running) { running = true; rafId = requestAnimationFrame(loop); }
}

// ─── scene builders ───────────────────────────────────────────────────────────
type Built = { scene: THREE.Scene; camera: THREE.PerspectiveCamera; update: (t: number) => void; dispose: () => void };

function buildScene(kind: HoloKind, colorHex: string): Built {
  const color = new THREE.Color(colorHex);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 50);
  camera.position.set(0, 0.35, 4.6);
  camera.lookAt(0, 0, 0);

  const disposables: Array<{ dispose(): void }> = [];
  const track = <T extends { dispose(): void }>(d: T): T => { disposables.push(d); return d; };
  const wire = (opacity = 0.85) => track(new THREE.MeshBasicMaterial({ color, wireframe: true, transparent: true, opacity }));
  const fill = (opacity = 0.14) => track(new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false }));
  const flat = (opacity = 0.5, c: THREE.ColorRepresentation = color) =>
    track(new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity, side: THREE.DoubleSide, depthWrite: false }));

  const root = new THREE.Group();
  scene.add(root);
  let update: (t: number) => void = t => { root.rotation.y = t * 0.5; };

  switch (kind) {
    case 'mini': {
      // stepper planet: bold enough to read at ~34px
      camera.position.set(0, 0.25, 3.5);
      camera.fov = 46; camera.updateProjectionMatrix();
      root.add(new THREE.Mesh(track(new THREE.SphereGeometry(1.02, 12, 10)), wire(1)));
      root.add(new THREE.Mesh(track(new THREE.SphereGeometry(0.96, 16, 16)), fill(0.32)));
      const mring = new THREE.Mesh(track(new THREE.RingGeometry(1.35, 1.85, 40)), flat(0.7));
      mring.rotation.x = Math.PI / 2.6;
      root.add(mring);
      update = t => { root.rotation.y = t * 0.9; mring.rotation.z = t * 0.5; };
      break;
    }
    case 'planet': {
      root.add(new THREE.Mesh(track(new THREE.SphereGeometry(1.05, 14, 12)), wire(0.8)));
      root.add(new THREE.Mesh(track(new THREE.SphereGeometry(1.0, 16, 16)), fill()));
      const ring = new THREE.Mesh(track(new THREE.RingGeometry(1.5, 2.05, 48)), flat(0.4));
      ring.rotation.x = Math.PI / 2.5;
      root.add(ring);
      const moon = new THREE.Mesh(track(new THREE.SphereGeometry(0.14, 10, 10)), track(new THREE.MeshBasicMaterial({ color })));
      root.add(moon);
      update = t => {
        root.rotation.y = t * 0.35;
        moon.position.set(Math.cos(t * 1.4) * 1.75, Math.sin(t * 1.4) * 0.5, Math.sin(t * 1.4) * 1.75);
      };
      break;
    }
    case 'crystal': {
      root.add(new THREE.Mesh(track(new THREE.OctahedronGeometry(1.35, 0)), wire(0.9)));
      root.add(new THREE.Mesh(track(new THREE.OctahedronGeometry(0.85, 0)), fill(0.22)));
      update = t => { root.rotation.y = t * 0.55; root.rotation.x = Math.sin(t * 0.4) * 0.35; root.position.y = Math.sin(t * 0.9) * 0.12; };
      break;
    }
    case 'binary': {
      const a = new THREE.Mesh(track(new THREE.SphereGeometry(0.5, 14, 12)), wire(0.9));
      const b = new THREE.Mesh(track(new THREE.SphereGeometry(0.34, 12, 10)), fill(0.5));
      root.add(a, b);
      const orbitPts: THREE.Vector3[] = [];
      for (let i = 0; i <= 48; i++) { const th = (i / 48) * Math.PI * 2; orbitPts.push(new THREE.Vector3(Math.cos(th) * 1.35, Math.sin(th) * 0.32, Math.sin(th) * 1.35)); }
      root.add(new THREE.Line(track(new THREE.BufferGeometry().setFromPoints(orbitPts)), track(new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.3 }))));
      update = t => {
        a.position.set(Math.cos(t) * 0.65, 0, Math.sin(t) * 0.65);
        b.position.set(Math.cos(t + Math.PI) * 1.35, Math.sin(t + Math.PI) * 0.32, Math.sin(t + Math.PI) * 1.35);
        root.rotation.y = t * 0.15;
      };
      break;
    }
    case 'cage': {
      const cage = new THREE.Mesh(track(new THREE.BoxGeometry(2.3, 2.3, 2.3)), wire(0.5));
      const core = new THREE.Mesh(track(new THREE.IcosahedronGeometry(0.85, 0)), wire(0.95));
      const glow = new THREE.Mesh(track(new THREE.IcosahedronGeometry(0.85, 0)), fill(0.25));
      root.add(cage, core, glow);
      update = t => {
        cage.rotation.y = t * 0.3; cage.rotation.x = t * 0.18;
        core.rotation.y = -t * 0.8; glow.rotation.y = -t * 0.8;
        root.position.y = Math.sin(t * 0.7) * 0.1;
      };
      break;
    }
    case 'rings': {
      const tori: THREE.Mesh[] = [];
      [1.45, 1.05, 0.65].forEach((r, i) => {
        const m = new THREE.Mesh(track(new THREE.TorusGeometry(r, 0.035, 8, 48)), wire(0.85 - i * 0.15));
        m.rotation.x = Math.PI / 2.4 + i * 0.16;
        root.add(m); tori.push(m);
      });
      const core = new THREE.Mesh(track(new THREE.SphereGeometry(0.32, 12, 12)), fill(0.6));
      root.add(core);
      update = t => { tori.forEach((m, i) => { m.rotation.z = t * (0.3 + i * 0.22) * (i % 2 ? -1 : 1); }); root.rotation.y = t * 0.2; };
      break;
    }
    case 'gyro': {
      const rx = new THREE.Mesh(track(new THREE.TorusGeometry(1.3, 0.035, 8, 48)), wire(0.85));
      const ry = new THREE.Mesh(track(new THREE.TorusGeometry(1.05, 0.035, 8, 48)), wire(0.7));
      const rz = new THREE.Mesh(track(new THREE.TorusGeometry(0.8, 0.035, 8, 48)), wire(0.55));
      ry.rotation.y = Math.PI / 2; rz.rotation.x = Math.PI / 2;
      const core = new THREE.Mesh(track(new THREE.SphereGeometry(0.26, 12, 12)), track(new THREE.MeshBasicMaterial({ color })));
      root.add(rx, ry, rz, core);
      update = t => { rx.rotation.x = t * 0.7; ry.rotation.z = t * 0.55; rz.rotation.y = t * 0.4; };
      break;
    }
    case 'halo': {
      const gate = new THREE.Mesh(track(new THREE.TorusGeometry(1.35, 0.09, 10, 56)), wire(0.9));
      gate.rotation.x = Math.PI / 8;
      root.add(gate);
      const n = 90;
      const pos = new Float32Array(n * 3);
      const seeds: number[] = [];
      for (let i = 0; i < n; i++) seeds.push(Math.random() * Math.PI * 2, 0.35 + Math.random() * 0.9, 0.4 + Math.random() * 0.9);
      const pgeo = track(new THREE.BufferGeometry());
      pgeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      const pts = new THREE.Points(pgeo, track(new THREE.PointsMaterial({ color, size: 0.07, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false })));
      root.add(pts);
      update = t => {
        gate.rotation.z = t * 0.4;
        for (let i = 0; i < n; i++) {
          const a = seeds[i * 3] + t * seeds[i * 3 + 2];
          const r = seeds[i * 3 + 1] * 1.35;
          pos[i * 3] = Math.cos(a) * r;
          pos[i * 3 + 1] = Math.sin(a * 1.7) * 0.28;
          pos[i * 3 + 2] = Math.sin(a) * r;
        }
        pgeo.attributes.position.needsUpdate = true;
      };
      break;
    }
    case 'orbit': {
      const nucleus = new THREE.Mesh(track(new THREE.SphereGeometry(0.3, 12, 12)), fill(0.7));
      root.add(nucleus);
      const shells: THREE.Mesh[] = [];
      const electrons: THREE.Mesh[] = [];
      for (let i = 0; i < 3; i++) {
        const ring = new THREE.Mesh(track(new THREE.TorusGeometry(1.25, 0.02, 6, 48)), wire(0.5));
        ring.rotation.set(Math.PI / 3 * i, Math.PI / 4 * i, 0);
        root.add(ring); shells.push(ring);
        const e = new THREE.Mesh(track(new THREE.SphereGeometry(0.11, 8, 8)), track(new THREE.MeshBasicMaterial({ color })));
        ring.add(e); electrons.push(e);
      }
      update = t => {
        electrons.forEach((e, i) => { const a = t * (1 + i * 0.35) + i * 2; e.position.set(Math.cos(a) * 1.25, Math.sin(a) * 1.25, 0); });
        root.rotation.y = t * 0.2;
      };
      break;
    }
    default: { // poly4 / poly8 / poly12 / poly20
      const geo = kind === 'poly4' ? new THREE.TetrahedronGeometry(1.25, 0)
        : kind === 'poly8' ? new THREE.OctahedronGeometry(1.2, 0)
        : kind === 'poly12' ? new THREE.DodecahedronGeometry(1.1, 0)
        : new THREE.IcosahedronGeometry(1.1, 0);
      root.add(new THREE.Mesh(track(geo), wire(0.85)));
      root.add(new THREE.Mesh(geo, fill(0.16)));
      update = t => { root.rotation.y = t * 0.6; root.rotation.x = Math.sin(t * 0.5) * 0.4; root.position.y = Math.sin(t * 0.8) * 0.1; };
    }
  }

  return { scene, camera, update, dispose: () => disposables.forEach(d => d.dispose()) };
}

// ─── registration shared by every holo canvas ────────────────────────────────
function useHoloCanvas(ref: React.RefObject<HTMLCanvasElement | null>, kind: HoloKind, color: string) {
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    if (!renderer) {
      try {
        renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
        renderer.setSize(SIZE, SIZE);
        renderer.setClearColor(0x000000, 0);
      } catch { return; } // no WebGL → cards keep their CSS ornament only
    }
    const built = buildScene(kind, color);
    const entry: Entry = { ctx, scene: built.scene, camera: built.camera, update: built.update, visible: true };
    const io = new IntersectionObserver(([e]) => {
      entry.visible = e.isIntersecting;
      if (entry.visible) ensureLoop();
    });
    io.observe(canvas);
    entries.add(entry);
    ensureLoop();
    return () => {
      io.disconnect();
      entries.delete(entry);
      built.dispose();
      if (entries.size === 0) { cancelAnimationFrame(rafId); running = false; }
    };
  }, [ref, kind, color]);
}

// ─── the per-card corner canvas ──────────────────────────────────────────────
export function CardHolo({ kind, color, size = 104, pos = 'tr' }: { kind: HoloKind; color: string; size?: number; pos?: 'tr' | 'br' }) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  useHoloCanvas(ref, kind, color);

  return (
    <canvas
      ref={ref}
      width={SIZE}
      height={SIZE}
      aria-hidden
      style={{
        position: 'absolute',
        ...(pos === 'tr'
          ? { top: -Math.round(size * 0.28), right: -Math.round(size * 0.26) }
          : { bottom: -Math.round(size * 0.30), right: -Math.round(size * 0.26) }),
        width: size, height: size, pointerEvents: 'none', opacity: 0.95, zIndex: 0,
      }}
    />
  );
}

// ─── 2D constellation layer — a unique star signature per challenge card ────
// Plain 2D canvas (no WebGL context cost), one shared ticker for all cards,
// IntersectionObserver-gated, still frame under prefers-reduced-motion.
type Entry2D = { ctx: CanvasRenderingContext2D; draw: (t: number) => void; visible: boolean };
const entries2d = new Set<Entry2D>();
let raf2d = 0;
let running2d = false;

function loop2d() {
  if (entries2d.size === 0) { running2d = false; return; }
  const t = reduced ? 1.5 : performance.now() / 1000;
  for (const e of entries2d) { if (e.visible) e.draw(t); }
  if (reduced) { running2d = false; return; }
  raf2d = requestAnimationFrame(loop2d);
}
function ensureLoop2d() { if (!running2d) { running2d = true; raf2d = requestAnimationFrame(loop2d); } }

function hashSeed(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function mulberry32(a: number) {
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function Constellation({ seed, color, opacity = 0.55 }: { seed: string; color: string; opacity?: number }) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rnd = mulberry32(hashSeed(seed));
    const stars = Array.from({ length: 8 }, () => ({
      x: 0.3 + rnd() * 0.66, y: 0.08 + rnd() * 0.84,
      r: 0.8 + rnd() * 1.3, ph: rnd() * Math.PI * 2, sp: 0.6 + rnd() * 1.2,
    }));
    // link each star to its nearest earlier star → one connected constellation
    const links: Array<[number, number]> = [];
    for (let i = 1; i < stars.length; i++) {
      let best = 0, bd = Infinity;
      for (let j = 0; j < i; j++) {
        const d = (stars[i].x - stars[j].x) ** 2 + (stars[i].y - stars[j].y) ** 2;
        if (d < bd) { bd = d; best = j; }
      }
      links.push([i, best]);
    }
    let w = 1, h = 1;
    const resize = () => {
      const r = canvas.getBoundingClientRect();
      w = Math.max(1, Math.round(r.width)); h = Math.max(1, Math.round(r.height));
      canvas.width = w; canvas.height = h;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    const entry: Entry2D = {
      ctx, visible: true,
      draw: (t: number) => {
        ctx.clearRect(0, 0, w, h);
        ctx.strokeStyle = color; ctx.lineWidth = 1; ctx.globalAlpha = 0.18;
        ctx.beginPath();
        for (const [a, b] of links) {
          ctx.moveTo(stars[a].x * w, stars[a].y * h);
          ctx.lineTo(stars[b].x * w, stars[b].y * h);
        }
        ctx.stroke();
        ctx.fillStyle = color;
        for (const s of stars) {
          const tw = 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(t * s.sp + s.ph));
          ctx.globalAlpha = tw * 0.9;
          ctx.beginPath(); ctx.arc(s.x * w, s.y * h, s.r, 0, Math.PI * 2); ctx.fill();
          ctx.globalAlpha = tw * 0.22;
          ctx.beginPath(); ctx.arc(s.x * w, s.y * h, s.r * 3, 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalAlpha = 1;
      },
    };
    const io = new IntersectionObserver(([e]) => { entry.visible = e.isIntersecting; if (entry.visible) ensureLoop2d(); });
    io.observe(canvas);
    entries2d.add(entry);
    ensureLoop2d();
    return () => {
      io.disconnect(); ro.disconnect(); entries2d.delete(entry);
      if (entries2d.size === 0) { cancelAnimationFrame(raf2d); running2d = false; }
    };
  }, [seed, color]);
  return <canvas ref={ref} aria-hidden style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', opacity, zIndex: 0 }} />;
}

// ─── inline planet for the stage stepper (state-aware: dim / glowing) ────────
export function MiniPlanet({ color, size = 34, dim = false, glow = false }: { color: string; size?: number; dim?: boolean; glow?: boolean }) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  useHoloCanvas(ref, 'mini', color);
  return (
    <canvas
      ref={ref}
      width={SIZE}
      height={SIZE}
      aria-hidden
      style={{
        display: 'block', width: size, height: size, pointerEvents: 'none',
        opacity: dim ? 0.4 : 1,
        filter: dim ? 'grayscale(0.9) brightness(0.65)' : glow ? `drop-shadow(0 0 7px ${color}aa)` : 'none',
        transition: 'filter .35s ease, opacity .35s ease',
      }}
    />
  );
}
