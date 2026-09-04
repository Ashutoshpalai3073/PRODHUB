import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { ClientOnly } from "@tanstack/react-router";
import { useAuth } from "@/context/AuthContext";
import { BusinessScene3D } from "@/components/ui/business-scene";
import { Card } from "@/components/ui/card";
import { Spotlight } from "@/components/ui/spotlight";
import {
  Rocket, Sparkles, Telescope, GitBranch, BarChart3, Users,
  Target, Zap, Shield, TrendingUp, Globe, ArrowRight,
  CheckCircle, Star, Mail,
  Layers, PieChart, Award, MessageSquare,
  Phone, MapPin, Send
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "Sanyog — Innovation Procurement for Government" },
      {
        name: "description",
        content:
          "Sanyog gives government departments a compliant path from problem statement to sandbox pilot to scale-up, and gives recognised startups a way in without turnover or prior-experience barriers.",
      },
    ],
  }),
});

/* ══════════════════════════════════════════════════════════
   SPACE CANVAS  (2D only — z-2)  — throttled to 30fps
══════════════════════════════════════════════════════════ */
function SpaceCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current; if (!canvas) return;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    const W = (canvas.width = window.innerWidth);
    const H = (canvas.height = window.innerHeight);
    const NEBULAE = [
      { x: W * 0.11, y: H * 0.2, r: 300, hex: "#5b21b6", a: 0.055 },
      { x: W * 0.44, y: H * 0.72, r: 240, hex: "#0e7490", a: 0.042 },
      { x: W * 0.58, y: H * 0.16, r: 200, hex: "#92400e", a: 0.03 },
      { x: W * 0.26, y: H * 0.9, r: 180, hex: "#1e3a5f", a: 0.028 },
    ];
    const h2r = (h: string) => ({
      r: parseInt(h.slice(1, 3), 16), g: parseInt(h.slice(3, 5), 16), b: parseInt(h.slice(5, 7), 16),
    });
    const mwCtx = document.createElement("canvas");
    mwCtx.width = W; mwCtx.height = H;
    const mwc = mwCtx.getContext("2d")!;
    for (let i = 0; i < 220; i++) {
      const t = Math.random(), px = W * (0.06 + t * 0.58), py = H * (0.12 + t * 0.58) + (Math.random() - 0.5) * H * 0.32;
      mwc.beginPath(); mwc.arc(px, py, Math.random() * 0.55 + 0.1, 0, Math.PI * 2);
      mwc.fillStyle = `rgba(190,205,255,${Math.random() * 0.22 + 0.04})`; mwc.fill();
    }
    type Star = { x: number; y: number; r: number; base: number; ts: number; to: number; type: number };
    const STARS: Star[] = Array.from({ length: 260 }, () => ({
      x: Math.random() * W, y: Math.random() * H, r: Math.pow(Math.random(), 2.2) * 1.6 + 0.2,
      base: Math.random() * 0.62 + 0.15, ts: Math.random() * 0.016 + 0.006, to: Math.random() * Math.PI * 2,
      type: Math.random() < 0.12 ? 1 : Math.random() < 0.07 ? 2 : 0,
    }));
    let raf: number, alive = true;
    let lastT = 0;
    const FRAME_MS = 1000 / 30;
    const tick = (t: number) => {
      if (!alive) return;
      raf = requestAnimationFrame(tick);
      if (t - lastT < FRAME_MS) return;
      lastT = t;
      ctx.clearRect(0, 0, W, H);
      for (const n of NEBULAE) {
        const { r, g, b } = h2r(n.hex);
        const ng = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r);
        ng.addColorStop(0, `rgba(${r},${g},${b},${n.a})`);
        ng.addColorStop(0.45, `rgba(${r},${g},${b},${n.a * 0.42})`);
        ng.addColorStop(1, `rgba(${r},${g},${b},0)`);
        ctx.fillStyle = ng; ctx.fillRect(0, 0, W, H);
      }
      ctx.drawImage(mwCtx, 0, 0);
      for (const s of STARS) {
        const xFade = s.x < W * 0.46 ? 1 : s.x < W * 0.7 ? 1 - (s.x - W * 0.46) / (W * 0.24) : 0;
        if (xFade < 0.02) continue;
        const tw = 0.52 + 0.48 * Math.sin(t * s.ts * 0.001 + s.to);
        const a = s.base * tw * xFade;
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = s.type === 1 ? `rgba(185,215,255,${a})` : s.type === 2 ? `rgba(210,185,255,${a})` : `rgba(255,255,255,${a})`;
        ctx.fill();
      }
    };
    raf = requestAnimationFrame(tick);
    return () => { alive = false; cancelAnimationFrame(raf); };
  }, []);
  return <canvas ref={ref} style={{ position: "absolute", inset: 0, zIndex: 2, pointerEvents: "none" }} />;
}

/* ══════════════════════════════════════════════════════════
   BLACK HOLE ENGINE — throttled to 30fps
══════════════════════════════════════════════════════════ */
type BHParticle = { angle: number; radius: number; size: number; opacity: number; maxOpacity: number; colorType: number };

function drawBlackHole(ctx: CanvasRenderingContext2D, W: number, H: number, t: number, particles: BHParticle[]) {
  ctx.clearRect(0, 0, W, H);
  const cx = W / 2, cy = H / 2 + 10, EH = 50, rot = t * 0.00022;
  const glow = ctx.createRadialGradient(cx, cy, EH * 0.3, cx, cy, W * 0.48);
  glow.addColorStop(0, "rgba(255,110,10,0.24)"); glow.addColorStop(0.08, "rgba(255,80,5,0.16)");
  glow.addColorStop(0.22, "rgba(200,45,0,0.09)"); glow.addColorStop(0.42, "rgba(140,22,0,0.045)");
  glow.addColorStop(0.65, "rgba(80,10,0,0.018)"); glow.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H);
  ctx.save(); ctx.translate(cx, cy);
  const RXO = EH * 3.05, RYO = EH * 0.52, RXI = EH * 1.12, RYI = EH * 0.2, STEPS = 72, dop = Math.cos(rot) * 0.1;
  for (let i = 0; i < STEPS; i++) {
    const f = i / (STEPS - 1), fi = 1 - f, rx = RXO + (RXI - RXO) * f, ry = RYO + (RYI - RYO) * f;
    const heat = Math.pow(fi, 1.65), alpha = 0.07 + (1 - heat) * 0.87;
    const gC = Math.round(68 + (1 - heat) * 190), bC = Math.round((1 - heat) * 88);
    const g = ctx.createLinearGradient(-rx, 0, rx, 0);
    g.addColorStop(0, `rgba(105,12,0,${alpha * 0.4})`); g.addColorStop(0.13 - dop, `rgba(255,${Math.round(gC * 0.5)},0,${alpha * 0.74})`);
    g.addColorStop(0.38 - dop * 0.5, `rgba(255,${gC},${bC},${alpha})`); g.addColorStop(0.62 + dop * 0.5, `rgba(255,${gC},${bC},${alpha})`);
    g.addColorStop(0.87 + dop, `rgba(255,${Math.round(gC * 0.46)},0,${alpha * 0.68})`); g.addColorStop(1, `rgba(90,10,0,${alpha * 0.36})`);
    ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
    ctx.strokeStyle = g; ctx.lineWidth = Math.max(0.85, (ry / STEPS) * 3.7); ctx.stroke();
  }
  ctx.restore();
  const far: BHParticle[] = [], near: BHParticle[] = [];
  particles.forEach(p => {
    p.angle += 0.014 + 15 / Math.max(p.radius, 8); p.radius -= 0.38 + 36 / Math.max(p.radius, 10);
    if (p.radius > 120 && p.opacity < p.maxOpacity) p.opacity += 0.02;
    if (p.radius <= EH + 6) { p.size *= 0.88; p.opacity -= 0.14; }
    if (p.radius < 10 || p.opacity <= 0) {
      p.angle = Math.random() * Math.PI * 2; p.radius = 170 + Math.random() * 80;
      p.maxOpacity = Math.random() * 0.65 + 0.25; p.opacity = 0; p.size = Math.random() * 1.5 + 0.4;
      p.colorType = Math.random() < 0.25 ? 0 : Math.random() < 0.75 ? 1 : 2;
    }
    (Math.sin(p.angle) < 0 ? far : near).push(p);
  });
  const render = (p: BHParticle) => {
    ctx.beginPath(); ctx.arc(cx + Math.cos(p.angle) * p.radius, cy + Math.sin(p.angle) * p.radius * 0.17, p.size, 0, Math.PI * 2);
    ctx.fillStyle = p.colorType === 0 ? `rgba(255,248,225,${Math.max(0, p.opacity)})` : p.colorType === 1 ? `rgba(255,150,30,${Math.max(0, p.opacity)})` : `rgba(225,45,12,${Math.max(0, p.opacity)})`; ctx.fill();
  };
  ctx.save(); ctx.globalCompositeOperation = "lighter"; far.forEach(render); ctx.restore();
  ctx.beginPath(); ctx.arc(cx, cy, EH, 0, Math.PI * 2); ctx.fillStyle = "rgba(2,2,10,1)"; ctx.fill();
  ctx.save(); ctx.translate(cx, cy);
  const ARC = [{ rx: EH * 1.9, ry: EH * 0.152, y: -EH * 0.86, lw: 3.0, a: 0.88 }, { rx: EH * 1.97, ry: EH * 0.114, y: -EH * 0.93, lw: 2.0, a: 0.6 }, { rx: EH * 2.04, ry: EH * 0.082, y: -EH * 0.97, lw: 1.4, a: 0.38 }];
  for (const L of ARC) {
    const ag = ctx.createLinearGradient(-L.rx, 0, L.rx, 0);
    ag.addColorStop(0, "rgba(255,185,55,0)"); ag.addColorStop(0.28, `rgba(255,238,118,${L.a * 0.78})`);
    ag.addColorStop(0.5, `rgba(255,253,172,${L.a})`); ag.addColorStop(0.72, `rgba(255,232,112,${L.a * 0.78})`);
    ag.addColorStop(1, "rgba(255,185,55,0)");
    ctx.beginPath(); ctx.ellipse(0, L.y, L.rx, L.ry, 0, 0, Math.PI * 2); ctx.strokeStyle = ag; ctx.lineWidth = L.lw; ctx.stroke();
  }
  ctx.restore();
  ctx.beginPath(); ctx.arc(cx, cy, EH, 0, Math.PI * 2); ctx.fillStyle = "rgba(2,2,10,1)"; ctx.fill();
  ctx.save(); ctx.globalCompositeOperation = "lighter"; near.forEach(render); ctx.restore();
  ctx.save(); ctx.globalCompositeOperation = "destination-in";
  const vg = ctx.createRadialGradient(cx, cy, W * 0.3, cx, cy, W * 0.48);
  vg.addColorStop(0, "rgba(0,0,0,1)"); vg.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H); ctx.restore();
}


function BottomPlanet() {
  return (
    <div
      style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        width: "100%",
        height: "35vh", // Retaining the safety box so it never covers your 3D canvas
        zIndex: 3, 
        pointerEvents: "none",
        overflow: "hidden", 
      }}
    >
      {/* The Planet Sphere */}
      <div
        style={{
          position: "absolute",
          top: "20%", // Controls how high up the planet's apex peaks
          left: "50%",
          transform: "translateX(-50%)",
          width: "105vw", // Reduced from 160vw to significantly reduce the radius (makes it more curved)
          height: "105vw", // Reduced from 160vw
          borderRadius: "50%",
          // Deep dark space body fading into black at the core
          background: "radial-gradient(circle at 50% 0%, #0d1127 0%, #040612 30%, #000000 70%)",
          // Sleek neon blue atmosphere glow on the rim
          boxShadow: "inset 0px 10px 40px rgba(100, 160, 255, 0.25), 0px -15px 70px rgba(70, 130, 255, 0.2)",
        }}
      />
    </div>
  );
}


function BlackHoleCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<BHParticle[]>([]);
  useEffect(() => {
    const canvas = ref.current; if (!canvas) return;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    const SIZE = 500, dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = SIZE * dpr; canvas.height = SIZE * dpr;
    canvas.style.width = `${SIZE}px`; canvas.style.height = `${SIZE}px`;
    ctx.scale(dpr, dpr);
    if (particlesRef.current.length === 0) {
      particlesRef.current = Array.from({ length: 160 }, () => ({ angle: Math.random() * Math.PI * 2, radius: 65 + Math.random() * 175, size: Math.random() * 1.4 + 0.4, maxOpacity: Math.random() * 0.65 + 0.25, opacity: Math.random(), colorType: Math.random() < 0.25 ? 0 : Math.random() < 0.75 ? 1 : 2 }));
    }
    let raf: number, alive = true, lastT = 0;
    const FRAME_MS = 1000 / 30;
    const tick = (t: number) => {
      if (!alive) return;
      raf = requestAnimationFrame(tick);
      if (t - lastT < FRAME_MS) return;
      lastT = t;
      drawBlackHole(ctx, SIZE, SIZE, t, particlesRef.current);
    };
    raf = requestAnimationFrame(tick);
    return () => { alive = false; cancelAnimationFrame(raf); };
  }, []);
  return <canvas ref={ref} style={{ position: "absolute", left: "49%", top: "50%", transform: "translate(-50%,-50%)", pointerEvents: "none", zIndex: 4 }} />;
}

/* ══════════════════════════════════════════════════════════
   DUST CANVAS
══════════════════════════════════════════════════════════ */
function DustCanvas({ heroRef, onDone }: { heroRef: React.RefObject<HTMLDivElement | null>; onDone: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const doneRef = useRef(false);
  useEffect(() => {
    const rafId = requestAnimationFrame(() => {
      const canvas = canvasRef.current, hero = heroRef.current;
      if (!canvas || !hero) return;
      const ctx = canvas.getContext("2d"); if (!ctx) return;
      const W = (canvas.width = window.innerWidth), H = (canvas.height = window.innerHeight);
      const off = document.createElement("canvas"); off.width = W; off.height = H;
      const oc = off.getContext("2d")!;
      const font = (el: Element) => { const cs = window.getComputedStyle(el); return `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`; };
      const baseline = (rect: DOMRect, el: Element) => { const cs = window.getComputedStyle(el); const lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.2; return rect.top + lh * 0.82; };
      const badge = hero.querySelector<HTMLElement>("[data-dust='badge']");
      if (badge) {
        const r = badge.getBoundingClientRect(); const rad = r.height / 2;
        oc.beginPath(); oc.moveTo(r.left + rad, r.top); oc.lineTo(r.right - rad, r.top); oc.arcTo(r.right, r.top, r.right, r.top + rad, rad); oc.lineTo(r.right, r.bottom - rad); oc.arcTo(r.right, r.bottom, r.right - rad, r.bottom, rad); oc.lineTo(r.left + rad, r.bottom); oc.arcTo(r.left, r.bottom, r.left, r.bottom - rad, rad); oc.lineTo(r.left, r.top + rad); oc.arcTo(r.left, r.top + rad, r.left + rad, r.top, rad); oc.closePath();
        oc.fillStyle = "rgba(139,92,246,0.18)"; oc.fill(); oc.strokeStyle = "rgba(255,255,255,0.12)"; oc.lineWidth = 1; oc.stroke();
        oc.font = font(badge); oc.fillStyle = "rgba(200,200,215,0.85)"; oc.textBaseline = "middle";
        oc.fillText("✦  Built for departments & recognised startups", r.left + 14, r.top + r.height / 2); oc.textBaseline = "alphabetic";
      }
      const spans = hero.querySelectorAll<HTMLElement>("[data-dust='h1'] span");
      const h1G: [number, string][][] = [[[0, "#ffffff"], [1, "#a3a3a3"]], [[0, "#a78bfa"], [0.45, "#7dd3fc"], [1, "#6ee7b7"]], [[0, "#7dd3fc"], [1, "#6ee7b7"]]];
      spans.forEach((span, i) => { const r = span.getBoundingClientRect(); if (r.width === 0) return; oc.font = font(span); const g = oc.createLinearGradient(r.left, 0, r.right, 0); (h1G[i] || h1G[0]).forEach(([s, c]) => g.addColorStop(s, c)); oc.fillStyle = g; oc.fillText(span.textContent ?? "", r.left, baseline(r, span)); });
      const para = hero.querySelector<HTMLElement>("[data-dust='para']");
      if (para) { const r = para.getBoundingClientRect(); const cs = window.getComputedStyle(para); const fs = parseFloat(cs.fontSize), lh = parseFloat(cs.lineHeight) || fs * 1.75; oc.font = font(para); oc.fillStyle = "rgba(163,163,163,0.72)"; const words = (para.textContent ?? "").replace(/\s+/g, " ").trim().split(" "); let line = "", y = r.top + fs * 0.88; for (const w of words) { const test = line ? `${line} ${w}` : w; if (oc.measureText(test).width > r.width && line) { oc.fillText(line, r.left, y); line = w; y += lh; } else { line = test; } } if (line) oc.fillText(line, r.left, y); }
      [[hero.querySelector<HTMLElement>("[data-dust='btn1']"), "rgba(248,248,248,0.92)", "#000000"], [hero.querySelector<HTMLElement>("[data-dust='btn2']"), "rgba(139,92,246,0.22)", "#c4b5fd"]].forEach(([btn, bg, tc]) => { if (!btn) return; const r = (btn as HTMLElement).getBoundingClientRect(); const rad = r.height / 2; oc.beginPath(); oc.moveTo(r.left + rad, r.top); oc.lineTo(r.right - rad, r.top); oc.arcTo(r.right, r.top, r.right, r.top + rad, rad); oc.lineTo(r.right, r.bottom - rad); oc.arcTo(r.right, r.bottom, r.right - rad, r.bottom, rad); oc.lineTo(r.left + rad, r.bottom); oc.arcTo(r.left, r.bottom, r.left, r.bottom - rad, rad); oc.lineTo(r.left, r.top + rad); oc.arcTo(r.left, r.top, r.left + rad, r.top, rad); oc.closePath(); oc.fillStyle = bg as string; oc.fill(); oc.strokeStyle = "rgba(139,92,246,0.5)"; oc.lineWidth = 1; oc.stroke(); oc.font = font(btn as Element); oc.fillStyle = tc as string; oc.textAlign = "center"; oc.textBaseline = "middle"; oc.fillText((btn as HTMLElement).textContent?.trim().replace(/\s+/g, " ") ?? "", r.left + r.width / 2, r.top + r.height / 2); oc.textAlign = "left"; oc.textBaseline = "alphabetic"; });
      hero.querySelectorAll<HTMLElement>("[data-dust='stat-num']").forEach(el => { const r = el.getBoundingClientRect(); oc.font = font(el); oc.fillStyle = "rgba(255,255,255,0.85)"; oc.fillText(el.textContent ?? "", r.left, baseline(r, el)); });
      hero.querySelectorAll<HTMLElement>("[data-dust='stat-label']").forEach(el => { const r = el.getBoundingClientRect(); oc.font = font(el); oc.fillStyle = "rgba(120,120,135,0.65)"; oc.fillText(el.textContent ?? "", r.left, baseline(r, el)); });
      const px4 = oc.getImageData(0, 0, W, H).data; const STEP = 3;
      const targets: { x: number; y: number; r: number; g: number; b: number }[] = [];
      for (let py = 0; py < H; py += STEP) for (let px = 0; px < W; px += STEP) { const i = (py * W + px) * 4; if (px4[i + 3] > 45) targets.push({ x: px, y: py, r: px4[i], g: px4[i + 1], b: px4[i + 2] }); }
      for (let i = targets.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0;[targets[i], targets[j]] = [targets[j], targets[i]]; }
      if (targets.length === 0) { onDone(); return; }
      const COUNT = Math.min(targets.length, 1800);
      type P = { x: number; y: number; tx: number; ty: number; r: number; g: number; b: number; size: number; delay: number; speed: number; vx: number; vy: number };
      const particles: P[] = Array.from({ length: COUNT }, (_, i) => { const t = targets[i % targets.length]; return { x: Math.random() * W, y: Math.random() * H, tx: t.x, ty: t.y, r: t.r, g: t.g, b: t.b, size: Math.random() * 1.5 + 0.4, delay: Math.random() * 1400, speed: Math.random() * 0.052 + 0.032, vx: (Math.random() - 0.5) * 0.55, vy: (Math.random() - 0.5) * 0.55 }; });
      const START = performance.now(), PHASE1 = 320, PHASE2 = 2700, PHASE3 = 3200;
      let raf2: number, alive2 = true;
      const tick = (now: number) => {
        if (!alive2) return;
        const e = now - START; ctx.clearRect(0, 0, W, H);
        const ga = e < PHASE2 ? 1 : Math.max(0, 1 - (e - PHASE2) / (PHASE3 - PHASE2)); ctx.globalAlpha = ga;
        for (const p of particles) { if (e < PHASE1) { p.x += p.vx; p.y += p.vy; } else { const le = e - PHASE1 - p.delay; if (le > 0) { p.x += (p.tx - p.x) * p.speed; p.y += (p.ty - p.y) * p.speed; } } const dist = Math.hypot(p.x - p.tx, p.y - p.ty); const a = e < PHASE1 ? 0.28 : Math.min(0.92, 0.28 + (1 - Math.min(dist, 200) / 200) * 0.64); ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fillStyle = `rgba(${p.r},${p.g},${p.b},${a})`; ctx.fill(); }
        ctx.globalAlpha = 1;
        if (e >= PHASE3 && !doneRef.current) { doneRef.current = true; onDone(); }
        if (e < PHASE3) raf2 = requestAnimationFrame(tick);
      };
      raf2 = requestAnimationFrame(tick);
      return () => { alive2 = false; cancelAnimationFrame(raf2); };
    });
    return () => cancelAnimationFrame(rafId);
  }, [heroRef, onDone]);
  return <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, zIndex: 15, pointerEvents: "none" }} />;
}

/* ══════════════════════════════════════════════════════════
   SECTION 0 — ORBITING SYSTEM CANVAS (Features)
══════════════════════════════════════════════════════════ */
function OrbitingSystemCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current; if (!canvas) return;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    const W = (canvas.width = window.innerWidth);
    const H = (canvas.height = window.innerHeight);
    const cx = W * 0.72, cy = H * 0.5;
    const tilt = 0.22; // radians — gives elliptical orbits
    type Planet = { a: number; b: number; speed: number; angle: number; r: number; color: string; trailLen: number };
    const PLANETS: Planet[] = [
      { a: 90,  b: 90  * Math.sin(Math.PI/2 - tilt), speed: 0.0048, angle: 0.2,  r: 5,   color: "#7ecac3", trailLen: 40 },
      { a: 140, b: 140 * Math.sin(Math.PI/2 - tilt), speed: 0.0031, angle: 1.8,  r: 7,   color: "#f59e0b", trailLen: 50 },
      { a: 195, b: 195 * Math.sin(Math.PI/2 - tilt), speed: 0.0019, angle: 3.5,  r: 6,   color: "#a78bfa", trailLen: 60 },
      { a: 255, b: 255 * Math.sin(Math.PI/2 - tilt), speed: 0.0013, angle: 5.1,  r: 5,   color: "#cd6a4a", trailLen: 55 },
      { a: 310, b: 310 * Math.sin(Math.PI/2 - tilt), speed: 0.0008, angle: 0.9,  r: 8,   color: "#93c5fd", trailLen: 65 },
    ];
    // pre-seed trails
    type Trail = { x: number; y: number }[];
    const trails: Trail[] = PLANETS.map(p => {
      const tr: Trail = [];
      for (let i = 0; i < p.trailLen; i++) {
        const a = p.angle - i * 0.018;
        tr.push({ x: cx + Math.cos(a) * p.a, y: cy + Math.sin(a) * p.b });
      }
      return tr;
    });
    // asteroid belt — seeded positions
    type Asteroid = { a: number; b: number; angle: number; speed: number; r: number };
    const BELT: Asteroid[] = Array.from({ length: 80 }, (_, i) => {
      const ra = 165 + Math.random() * 30;
      return { a: ra, b: ra * Math.sin(Math.PI/2 - tilt), angle: (i / 80) * Math.PI * 2 + Math.random() * 0.2, speed: 0.0016 + Math.random() * 0.0004, r: Math.random() * 1.2 + 0.3 };
    });
    let raf: number, alive = true, lastT = 0;
    const FRAME_MS = 1000 / 30;
    const tick = (t: number) => {
      if (!alive) return;
      raf = requestAnimationFrame(tick);
      if (t - lastT < FRAME_MS) return;
      lastT = t;
      ctx.clearRect(0, 0, W, H);
      // orbit rings
      PLANETS.forEach(p => {
        ctx.beginPath(); ctx.ellipse(cx, cy, p.a, p.b, 0, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(255,255,255,0.04)"; ctx.lineWidth = 1; ctx.stroke();
      });
      // asteroid belt ring
      ctx.beginPath(); ctx.ellipse(cx, cy, 180, 180 * Math.sin(Math.PI/2 - tilt), 0, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(255,255,255,0.03)"; ctx.lineWidth = 6; ctx.stroke();
      // asteroids
      BELT.forEach(a => {
        a.angle += a.speed * 0.033;
        ctx.beginPath(); ctx.arc(cx + Math.cos(a.angle) * a.a, cy + Math.sin(a.angle) * a.b, a.r, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(180,160,130,0.35)"; ctx.fill();
      });
      // central star
      const sg = ctx.createRadialGradient(cx, cy, 0, cx, cy, 38);
      sg.addColorStop(0, "rgba(255,255,240,1)"); sg.addColorStop(0.18, "rgba(255,240,180,0.9)");
      sg.addColorStop(0.5, "rgba(255,200,80,0.4)"); sg.addColorStop(1, "rgba(255,140,20,0)");
      ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(cx, cy, 38, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(cx, cy, 9, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,255,230,1)"; ctx.fill();
      // trails + planets
      PLANETS.forEach((p, pi) => {
        p.angle += p.speed;
        const px2 = cx + Math.cos(p.angle) * p.a;
        const py2 = cy + Math.sin(p.angle) * p.b;
        trails[pi].unshift({ x: px2, y: py2 });
        if (trails[pi].length > p.trailLen) trails[pi].pop();
        for (let i = 1; i < trails[pi].length; i++) {
          const a = (1 - i / p.trailLen) * 0.35;
          ctx.beginPath(); ctx.moveTo(trails[pi][i-1].x, trails[pi][i-1].y);
          ctx.lineTo(trails[pi][i].x, trails[pi][i].y);
          ctx.strokeStyle = p.color + Math.round(a * 255).toString(16).padStart(2,"0");
          ctx.lineWidth = Math.max(0.5, p.r * (1 - i / p.trailLen) * 0.7); ctx.stroke();
        }
        const pg = ctx.createRadialGradient(px2, py2, 0, px2, py2, p.r * 2.5);
        pg.addColorStop(0, p.color + "ff"); pg.addColorStop(1, p.color + "00");
        ctx.fillStyle = pg; ctx.beginPath(); ctx.arc(px2, py2, p.r * 2.5, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(px2, py2, p.r, 0, Math.PI * 2); ctx.fillStyle = p.color; ctx.fill();
      });
      // vignette left fade so content stays readable
      const vg = ctx.createLinearGradient(0, 0, W * 0.55, 0);
      vg.addColorStop(0, "rgba(4,4,14,1)"); vg.addColorStop(1, "rgba(4,4,14,0)");
      ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
    };
    raf = requestAnimationFrame(tick);
    return () => { alive = false; cancelAnimationFrame(raf); };
  }, []);
  return <canvas ref={ref} style={{ position: "absolute", inset: 0, zIndex: 1, pointerEvents: "none" }} />;
}

/* ══════════════════════════════════════════════════════════
   SECTION 1 — PULSAR CANVAS (Startups)
══════════════════════════════════════════════════════════ */
function PulsarCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current; if (!canvas) return;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    const W = (canvas.width = window.innerWidth);
    const H = (canvas.height = window.innerHeight);
    const cx = W * 0.72, cy = H * 0.28;
    type Ripple = { r: number; a: number };
    const RIPPLES: Ripple[] = Array.from({ length: 8 }, (_, i) => ({ r: i * 55, a: 1 - i / 8 }));
    type Particle = { x: number; y: number; vx: number; vy: number; life: number; maxLife: number; size: number };
    const PARTICLES: Particle[] = Array.from({ length: 120 }, () => {
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.6 + Math.random() * 1.4;
      return { x: cx, y: cy, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: Math.random() * 200, maxLife: 180 + Math.random() * 120, size: Math.random() * 1.8 + 0.4 };
    });
    let raf: number, alive = true, lastT = 0, rot = 0;
    const FRAME_MS = 1000 / 30;
    const tick = (t: number) => {
      if (!alive) return;
      raf = requestAnimationFrame(tick);
      if (t - lastT < FRAME_MS) return;
      lastT = t;
      ctx.clearRect(0, 0, W, H);
      rot += 0.018;
      // ripple rings
      RIPPLES.forEach(rp => {
        rp.r += 0.55;
        if (rp.r > 420) rp.r = 0;
        const a = Math.max(0, 0.18 * (1 - rp.r / 420));
        ctx.beginPath(); ctx.arc(cx, cy, rp.r, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(120,140,255,${a})`; ctx.lineWidth = 1.2; ctx.stroke();
      });
      // two beam cones
      [0, Math.PI].forEach(offset => {
        const beamAngle = rot + offset;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(beamAngle);
        const bg = ctx.createLinearGradient(0, 0, 280, 0);
        bg.addColorStop(0, "rgba(220,235,255,0.55)");
        bg.addColorStop(0.3, "rgba(200,220,255,0.18)");
        bg.addColorStop(1, "rgba(180,200,255,0)");
        ctx.beginPath(); ctx.moveTo(0, 0);
        ctx.lineTo(280 * Math.cos(-0.18), 280 * Math.sin(-0.18));
        ctx.lineTo(280 * Math.cos(0.18), 280 * Math.sin(0.18));
        ctx.closePath();
        ctx.fillStyle = bg; ctx.fill();
        ctx.restore();
      });
      // particles
      PARTICLES.forEach(p => {
        p.x += p.vx; p.y += p.vy; p.life += 1;
        if (p.life > p.maxLife) {
          const a2 = Math.random() * Math.PI * 2, sp = 0.6 + Math.random() * 1.4;
          p.x = cx; p.y = cy; p.vx = Math.cos(a2) * sp; p.vy = Math.sin(a2) * sp; p.life = 0;
          p.maxLife = 180 + Math.random() * 120;
        }
        const pct = p.life / p.maxLife;
        const pa = Math.max(0, (1 - pct) * 0.8);
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (1 - pct * 0.5), 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,180,60,${pa})`; ctx.fill();
      });
      // neutron star core
      const cg = ctx.createRadialGradient(cx, cy, 0, cx, cy, 28);
      cg.addColorStop(0, "rgba(255,255,255,1)"); cg.addColorStop(0.3, "rgba(200,220,255,0.9)");
      cg.addColorStop(0.7, "rgba(120,160,255,0.4)"); cg.addColorStop(1, "rgba(60,80,200,0)");
      ctx.fillStyle = cg; ctx.beginPath(); ctx.arc(cx, cy, 28, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(cx, cy, 5, 0, Math.PI * 2); ctx.fillStyle = "#ffffff"; ctx.fill();
      // left fade
      const vg = ctx.createLinearGradient(0, 0, W * 0.5, 0);
      vg.addColorStop(0, "rgba(2,4,14,1)"); vg.addColorStop(1, "rgba(2,4,14,0)");
      ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
    };
    raf = requestAnimationFrame(tick);
    return () => { alive = false; cancelAnimationFrame(raf); };
  }, []);
  return <canvas ref={ref} style={{ position: "absolute", inset: 0, zIndex: 1, pointerEvents: "none" }} />;
}

/* ══════════════════════════════════════════════════════════
   SECTION 2 — WORMHOLE CANVAS (Departments)
══════════════════════════════════════════════════════════ */
function WormholeCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current; if (!canvas) return;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    const W = (canvas.width = window.innerWidth);
    const H = (canvas.height = window.innerHeight);
    const cx = W * 0.7, cy = H * 0.5;
    const RINGS = 32;
    type LensedStar = { baseAngle: number; dist: number; size: number; speed: number; angle: number };
    const STARS: LensedStar[] = Array.from({ length: 55 }, () => ({
      baseAngle: Math.random() * Math.PI * 2, dist: 140 + Math.random() * 180,
      size: Math.random() * 1.8 + 0.4, speed: 0.0008 + Math.random() * 0.001, angle: Math.random() * Math.PI * 2,
    }));
    let raf: number, alive = true, lastT = 0, rot = 0;
    const FRAME_MS = 1000 / 30;
    const tick = (t: number) => {
      if (!alive) return;
      raf = requestAnimationFrame(tick);
      if (t - lastT < FRAME_MS) return;
      lastT = t;
      ctx.clearRect(0, 0, W, H);
      rot += 0.004;
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(rot);
      for (let i = 0; i < RINGS; i++) {
        const f = i / (RINGS - 1);
        const fi = 1 - f;
        const rx = 55 + fi * 240;
        const ry = rx * (0.28 + fi * 0.32); // squish increases toward throat
        const brightness = 0.04 + fi * 0.22;
        const r = Math.round(fi * 30), g = Math.round(100 + fi * 130), b = Math.round(200 + fi * 55);
        ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${r},${g},${b},${brightness})`; ctx.lineWidth = Math.max(0.8, fi * 2.2); ctx.stroke();
      }
      // throat glow
      const tg = ctx.createRadialGradient(0, 0, 0, 0, 0, 55);
      tg.addColorStop(0, "rgba(200,240,255,0.95)"); tg.addColorStop(0.4, "rgba(100,200,255,0.5)");
      tg.addColorStop(1, "rgba(0,80,180,0)");
      ctx.fillStyle = tg; ctx.beginPath(); ctx.ellipse(0, 0, 55, 55 * 0.28, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      // lensed stars arcing around
      STARS.forEach(s => {
        s.angle += s.speed;
        const lensDistort = 1 + 60 / (s.dist * 0.8);
        const sx = cx + Math.cos(s.angle) * s.dist * lensDistort * 0.92;
        const sy = cy + Math.sin(s.angle) * s.dist * 0.38;
        const sa = Math.max(0, 0.7 * (1 - Math.abs(Math.sin(s.angle)) * 0.5));
        ctx.beginPath(); ctx.arc(sx, sy, s.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(200,240,255,${sa})`; ctx.fill();
      });
      // left content fade
      const vg = ctx.createLinearGradient(0, 0, W * 0.52, 0);
      vg.addColorStop(0, "rgba(2,6,14,1)"); vg.addColorStop(1, "rgba(2,6,14,0)");
      ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
    };
    raf = requestAnimationFrame(tick);
    return () => { alive = false; cancelAnimationFrame(raf); };
  }, []);
  return <canvas ref={ref} style={{ position: "absolute", inset: 0, zIndex: 1, pointerEvents: "none" }} />;
}

/* ══════════════════════════════════════════════════════════
   SECTION 3 — TESTIMONIALS WEBGL CANVAS
══════════════════════════════════════════════════════════ */
function TestimonialsWebGLCanvas() {
  const glRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = glRef.current, overlay = overlayRef.current;
    if (!canvas || !overlay) return;
    const W = (canvas.width = overlay.width = window.innerWidth);
    const H = (canvas.height = overlay.height = window.innerHeight);

    const gl = canvas.getContext("webgl", { alpha: true, premultipliedAlpha: false });
    if (!gl) return;

    const VS = `
      attribute vec2 a_xy;
      attribute float a_sz;
      attribute float a_al;
      attribute float a_col;
      varying float v_al;
      varying float v_col;
      void main(){
        gl_Position = vec4(a_xy, 0.0, 1.0);
        gl_PointSize = a_sz;
        v_al = a_al;
        v_col = a_col;
      }
    `;
    const FS = `
      precision mediump float;
      varying float v_al;
      varying float v_col;
      void main(){
        vec2 cxy = gl_PointCoord - vec2(0.5);
        if(length(cxy) > 0.5) discard;
        float rim = 1.0 - smoothstep(0.28, 0.5, length(cxy));
        vec3 c0 = vec3(0.655, 0.545, 0.980);
        vec3 c1 = vec3(0.133, 0.827, 0.933);
        vec3 c2 = vec3(0.957, 0.447, 0.714);
        vec3 c3 = vec3(0.204, 0.851, 0.600);
        float s = v_col * 3.0;
        vec3 col;
        if(s < 1.0)      col = mix(c0, c1, s);
        else if(s < 2.0) col = mix(c1, c2, s - 1.0);
        else             col = mix(c2, c3, s - 2.0);
        gl_FragColor = vec4(col, v_al * rim);
      }
    `;
    const mkShader = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src.trim()); gl.compileShader(s); return s;
    };
    const prog = gl.createProgram()!;
    gl.attachShader(prog, mkShader(gl.VERTEX_SHADER, VS));
    gl.attachShader(prog, mkShader(gl.FRAGMENT_SHADER, FS));
    gl.linkProgram(prog); gl.useProgram(prog);
    gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE);

    const N = 8000;
    // CPU state per particle: [x, y, vx, vy, life, maxLife, size, colorSeed]
    const state = new Float32Array(N * 8);
    for (let i = 0; i < N; i++) {
      const b = i * 8;
      state[b]   = 0.35 + Math.random() * 0.65;
      state[b+1] = Math.random();
      state[b+2] = (Math.random() - 0.5) * 0.00028;
      state[b+3] = (Math.random() - 0.5) * 0.00028;
      state[b+4] = Math.random() * 150;
      state[b+5] = 60 + Math.random() * 120;
      state[b+6] = 1.5 + Math.random() * 3.0;
      state[b+7] = Math.random();
    }
    const xyArr = new Float32Array(N * 2), szArr = new Float32Array(N);
    const alArr = new Float32Array(N), colArr = new Float32Array(N);

    const mkBuf = () => gl.createBuffer()!;
    const bXY = mkBuf(), bSZ = mkBuf(), bAL = mkBuf(), bCOL = mkBuf();
    const aXY  = gl.getAttribLocation(prog, "a_xy");
    const aSZ  = gl.getAttribLocation(prog, "a_sz");
    const aAL  = gl.getAttribLocation(prog, "a_al");
    const aCOL = gl.getAttribLocation(prog, "a_col");

    const oc = overlay.getContext("2d")!;
    let raf = 0, alive = true, lastT = 0;
    const FRAME_MS = 1000 / 30;

    const tick = (t: number) => {
      if (!alive) return;
      raf = requestAnimationFrame(tick);
      if (t - lastT < FRAME_MS) return;
      lastT = t;

      for (let i = 0; i < N; i++) {
        const b = i * 8;
        state[b]   += state[b+2];
        state[b+1] += state[b+3];
        state[b+4] += 1;
        const life = state[b+4], maxLife = state[b+5];
        if (life > maxLife || state[b] < 0.34 || state[b] > 1.01 || state[b+1] < -0.01 || state[b+1] > 1.01) {
          state[b]   = 0.35 + Math.random() * 0.65;
          state[b+1] = Math.random();
          state[b+2] = (Math.random() - 0.5) * 0.00028;
          state[b+3] = (Math.random() - 0.5) * 0.00028;
          state[b+4] = 0;
          state[b+5] = 60 + Math.random() * 120;
          state[b+7] = Math.random();
        }
        const pct = state[b+4] / state[b+5];
        const fade = pct < 0.2 ? pct * 5 : pct > 0.8 ? (1 - pct) * 5 : 1.0;
        xyArr[i*2]   = state[b]   * 2 - 1;
        xyArr[i*2+1] = 1 - state[b+1] * 2;
        szArr[i]  = state[b+6];
        alArr[i]  = fade * 0.72;
        colArr[i] = state[b+7];
      }

      gl.viewport(0, 0, W, H);
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);

      const up = (buf: WebGLBuffer, attr: number, arr: Float32Array, n: number) => {
        gl.bindBuffer(gl.ARRAY_BUFFER, buf);
        gl.bufferData(gl.ARRAY_BUFFER, arr, gl.DYNAMIC_DRAW);
        gl.enableVertexAttribArray(attr);
        gl.vertexAttribPointer(attr, n, gl.FLOAT, false, 0, 0);
      };
      up(bXY, aXY, xyArr, 2); up(bSZ, aSZ, szArr, 1);
      up(bAL, aAL, alArr, 1); up(bCOL, aCOL, colArr, 1);
      gl.drawArrays(gl.POINTS, 0, N);

      oc.clearRect(0, 0, W, H);
      const g = oc.createLinearGradient(0, 0, W * 0.38, 0);
      g.addColorStop(0, "rgba(2,5,12,1)"); g.addColorStop(1, "rgba(2,5,12,0)");
      oc.fillStyle = g; oc.fillRect(0, 0, W, H);
    };

    raf = requestAnimationFrame(tick);
    return () => { alive = false; cancelAnimationFrame(raf); };
  }, []);
  return (
    <>
      <canvas ref={glRef} style={{ position: "absolute", inset: 0, zIndex: 1, pointerEvents: "none" }} />
      <canvas ref={overlayRef} style={{ position: "absolute", inset: 0, zIndex: 2, pointerEvents: "none" }} />
    </>
  );
}

/* ══════════════════════════════════════════════════════════
   SECTION 4 — ABOUT WEBGL CANVAS
══════════════════════════════════════════════════════════ */
function AboutWebGLCanvas() {
  const glRef     = useRef<HTMLCanvasElement>(null);
  const planetRef = useRef<HTMLCanvasElement>(null);
  const fadeRef   = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const glCanvas = glRef.current, planetCanvas = planetRef.current, fadeCanvas = fadeRef.current;
    if (!glCanvas || !planetCanvas || !fadeCanvas) return;
    const W = (glCanvas.width = fadeCanvas.width = window.innerWidth);
    const H = (glCanvas.height = fadeCanvas.height = window.innerHeight);

    // ── Effect A: WebGL spiral galaxy ──────────────────────
    const gl = glCanvas.getContext("webgl", { alpha: true, premultipliedAlpha: false });
    if (!gl) return;

    const VS = `
      attribute vec2 a_pos;
      attribute float a_colorT;
      attribute float a_size;
      attribute float a_twinkle;
      uniform vec2 u_center;
      uniform float u_time;
      uniform vec2 u_resolution;
      varying float v_colorT;
      varying float v_alpha;
      void main(){
        float c = cos(u_time * 0.00018);
        float s = sin(u_time * 0.00018);
        vec2 rot = vec2(a_pos.x*c - a_pos.y*s, a_pos.x*s + a_pos.y*c);
        vec2 world = rot + u_center;
        gl_Position = vec4(
          (world.x / u_resolution.x) * 2.0 - 1.0,
          1.0 - (world.y / u_resolution.y) * 2.0,
          0.0, 1.0
        );
        gl_PointSize = a_size * (0.7 + 0.3 * sin(u_time * 0.002 + a_twinkle));
        v_colorT = a_colorT;
        v_alpha  = a_colorT * 0.5 + 0.15;
      }
    `;
    const FS = `
      precision mediump float;
      varying float v_colorT;
      varying float v_alpha;
      void main(){
        if(length(gl_PointCoord - vec2(0.5)) > 0.5) discard;
        vec3 warm = vec3(1.0, 0.92, 0.50);
        vec3 cool = vec3(0.70, 0.85, 1.0);
        vec3 col  = mix(cool, warm, v_colorT);
        gl_FragColor = vec4(col, v_alpha);
      }
    `;
    const mkShader = (type: number, src: string) => {
      const sh = gl.createShader(type)!;
      gl.shaderSource(sh, src.trim()); gl.compileShader(sh); return sh;
    };
    const prog = gl.createProgram()!;
    gl.attachShader(prog, mkShader(gl.VERTEX_SHADER, VS));
    gl.attachShader(prog, mkShader(gl.FRAGMENT_SHADER, FS));
    gl.linkProgram(prog); gl.useProgram(prog);
    gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE);

    const N = 6000;
    const posArr = new Float32Array(N * 2);
    const ctArr  = new Float32Array(N);
    const szArr  = new Float32Array(N);
    const twArr  = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      const arm = i % 2;
      const dist = Math.pow(Math.random(), 0.6) * 280;
      const angle = (dist / 280) * Math.PI * 2.2 + arm * Math.PI + (Math.random() - 0.5) * 0.9;
      posArr[i*2]   = Math.cos(angle) * dist;
      posArr[i*2+1] = Math.sin(angle) * dist * 0.22;
      ctArr[i]  = Math.max(0, 1 - dist / 280);
      szArr[i]  = 0.8 + Math.random() * 2.0;
      twArr[i]  = Math.random() * Math.PI * 2;
    }
    const mkBuf = (arr: Float32Array, attr: string, size: number) => {
      const buf = gl.createBuffer()!;
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, arr, gl.STATIC_DRAW);
      const loc = gl.getAttribLocation(prog, attr);
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0);
    };
    mkBuf(posArr, "a_pos", 2); mkBuf(ctArr, "a_colorT", 1);
    mkBuf(szArr, "a_size", 1); mkBuf(twArr, "a_twinkle", 1);

    const uCenter = gl.getUniformLocation(prog, "u_center");
    const uTime   = gl.getUniformLocation(prog, "u_time");
    const uRes    = gl.getUniformLocation(prog, "u_resolution");
    gl.uniform2f(uCenter, W * 0.68, H * 0.45);
    gl.uniform2f(uRes, W, H);

    // ── Effect B: 2D gas-giant planet ──────────────────────
    const PC = 220;
    planetCanvas.width = planetCanvas.height = PC;
    const pc = planetCanvas.getContext("2d")!;
    let planetRot = 0;

    const drawPlanet = () => {
      pc.clearRect(0, 0, PC, PC);
      planetRot += 0.0025;
      const pcx = PC / 2, pcy = PC / 2, R = 70;

      // amber glow behind
      const glow = pc.createRadialGradient(pcx, pcy, 0, pcx, pcy, 105);
      glow.addColorStop(0, "rgba(180,100,20,0.18)");
      glow.addColorStop(0.5, "rgba(160,80,10,0.09)");
      glow.addColorStop(1, "rgba(100,50,0,0)");
      pc.fillStyle = glow; pc.fillRect(0, 0, PC, PC);

      pc.save(); pc.translate(pcx, pcy); pc.rotate(planetRot * 0.3);

      // ring gradients (created in current transform space)
      const rg1 = pc.createLinearGradient(-130, 0, 130, 0);
      rg1.addColorStop(0, "rgba(200,150,60,0)"); rg1.addColorStop(0.25, "rgba(200,150,60,0.35)");
      rg1.addColorStop(0.5, "rgba(220,170,80,0.45)"); rg1.addColorStop(0.75, "rgba(200,150,60,0.35)");
      rg1.addColorStop(1, "rgba(200,150,60,0)");
      const rg2 = pc.createLinearGradient(-120, 0, 120, 0);
      rg2.addColorStop(0, "rgba(160,110,40,0)"); rg2.addColorStop(0.3, "rgba(160,110,40,0.22)");
      rg2.addColorStop(0.7, "rgba(160,110,40,0.22)"); rg2.addColorStop(1, "rgba(160,110,40,0)");

      // ring back half
      pc.save(); pc.rotate(-0.18);
      pc.beginPath(); pc.ellipse(0, 0, 130, 18, 0, Math.PI, 0);
      pc.strokeStyle = rg1; pc.lineWidth = 6; pc.stroke();
      pc.beginPath(); pc.ellipse(0, 0, 120, 14, 0, Math.PI, 0);
      pc.strokeStyle = rg2; pc.lineWidth = 3; pc.stroke();
      pc.restore();

      // planet body
      pc.save(); pc.beginPath(); pc.arc(0, 0, R, 0, Math.PI * 2); pc.clip();
      const bodyG = pc.createRadialGradient(-R*0.3, -R*0.3, 0, 0, 0, R * 1.1);
      bodyG.addColorStop(0, "rgba(240,190,80,1)"); bodyG.addColorStop(0.35, "rgba(200,130,30,1)");
      bodyG.addColorStop(0.7, "rgba(140,70,15,1)"); bodyG.addColorStop(1, "rgba(60,25,5,1)");
      pc.fillStyle = bodyG; pc.fillRect(-R, -R, R*2, R*2);
      const bands: [number, number, string][] = [[-14,8,"rgba(255,200,90,0.2)"],[8,6,"rgba(60,25,5,0.28)"],[22,5,"rgba(230,170,60,0.18)"]];
      bands.forEach(([by, bh, bc]) => { pc.beginPath(); pc.ellipse(0, by, R, bh, 0, 0, Math.PI*2); pc.fillStyle = bc; pc.fill(); });
      const spec = pc.createRadialGradient(-R*0.35, -R*0.35, 0, -R*0.35, -R*0.35, R*0.55);
      spec.addColorStop(0, "rgba(255,240,180,0.3)"); spec.addColorStop(1, "rgba(255,240,180,0)");
      pc.fillStyle = spec; pc.fillRect(-R, -R, R*2, R*2);
      pc.restore();

      // ring front half
      pc.save(); pc.rotate(-0.18);
      pc.beginPath(); pc.ellipse(0, 0, 130, 18, 0, 0, Math.PI);
      pc.strokeStyle = rg1; pc.lineWidth = 6; pc.stroke();
      pc.beginPath(); pc.ellipse(0, 0, 120, 14, 0, 0, Math.PI);
      pc.strokeStyle = rg2; pc.lineWidth = 3; pc.stroke();
      pc.restore();

      pc.restore(); // end planet+ring rotation
    };

    // ── Left fade overlay (drawn once, static) ─────────────
    const fc = fadeCanvas.getContext("2d")!;
    const fg = fc.createLinearGradient(0, 0, W * 0.42, 0);
    fg.addColorStop(0, "rgba(5,4,16,1)"); fg.addColorStop(1, "rgba(5,4,16,0)");
    fc.fillStyle = fg; fc.fillRect(0, 0, W, H);

    // ── RAF loop ──────────────────────────────────────────
    let raf = 0, alive = true, lastT = 0;
    const FRAME_MS = 1000 / 30;
    const tick = (t: number) => {
      if (!alive) return;
      raf = requestAnimationFrame(tick);
      if (t - lastT < FRAME_MS) return;
      lastT = t;
      gl.viewport(0, 0, W, H);
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform1f(uTime, t);
      gl.drawArrays(gl.POINTS, 0, N);
      drawPlanet();
    };
    raf = requestAnimationFrame(tick);
    return () => { alive = false; cancelAnimationFrame(raf); };
  }, []);
  return (
    <>
      <canvas ref={glRef}     style={{ position: "absolute", inset: 0, zIndex: 1, pointerEvents: "none" }} />
      <canvas ref={planetRef} style={{ position: "absolute", right: "8%", top: "38%", width: 220, height: 220, zIndex: 2, pointerEvents: "none" }} />
      <canvas ref={fadeRef}   style={{ position: "absolute", inset: 0, zIndex: 3, pointerEvents: "none" }} />
    </>
  );
}

/* ══════════════════════════════════════════════════════════
   SECTION 5 — CONTACT CANVAS (Satellite + Signal)
══════════════════════════════════════════════════════════ */
function ContactWebGLCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current; if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = window.innerWidth, H = window.innerHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    canvas.style.width = `${W}px`; canvas.style.height = `${H}px`;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    ctx.scale(dpr, dpr);

    const cx = W * 0.78, cy = H * 0.46;

    // ── E: background stars (seeded once) ─────────────────
    type Star = { x: number; y: number; r: number; a: number };
    const STARS: Star[] = Array.from({ length: 50 }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      r: Math.pow(Math.random(), 2.5) * 2.5 + 0.15,
      a: 0.15 + Math.random() * 0.35,
    }));

    // ── D: comet streaks (velocities seeded once) ──────────
    type Streak = { x: number; y: number; vx: number; vy: number; len: number; alpha: number };
    const STREAKS: Streak[] = [
      { x: W + 150, y: H * 0.12, vx: -3.2, vy:  1.8, len: 110, alpha: 0.50 },
      { x: W + 250, y: H * 0.52, vx: -2.8, vy: -1.4, len:  90, alpha: 0.40 },
      { x: W +  80, y: H * 0.82, vx: -3.8, vy:  1.1, len: 135, alpha: 0.45 },
    ];
    // pre-computed respawn pool — no Math.random() in tick
    const RESPAWN = STREAKS.map(() =>
      Array.from({ length: 24 }, () => ({ x: W * 0.65 + Math.random() * W * 0.5, y: Math.random() * H }))
    );
    const respawnIdx = [0, 0, 0];

    // ── C: signal ring state ───────────────────────────────
    const RING_PHASES = [0, 30, 60];
    const RING_MAX = 90;
    const DISH_X = cx + 48, DISH_Y = cy - 8;

    const BW = 60, BH = 36;
    let satAngle = 0, dashOffset = 0, frame = 0;
    let raf = 0, alive = true, lastT = 0;
    const FRAME_MS = 1000 / 30;

    // ── Satellite draw ────────────────────────────────────
    const drawSatellite = () => {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(satAngle);

      // struts
      ctx.fillStyle = "rgba(140,155,180,1)";
      ctx.fillRect(-BW / 2 - 4, -10, 4, 20);
      ctx.fillRect(BW / 2,      -10, 4, 20);

      // left solar panel
      ctx.save(); ctx.translate(-BW / 2 - 4 - 88, -10);
      ctx.fillStyle = "rgba(20,40,100,0.9)";
      ctx.fillRect(0, 0, 88, 20);
      ctx.strokeStyle = "rgba(100,150,255,0.3)"; ctx.lineWidth = 0.8;
      for (let c = 1; c < 4; c++) { ctx.beginPath(); ctx.moveTo(c * 22, 0); ctx.lineTo(c * 22, 20); ctx.stroke(); }
      ctx.beginPath(); ctx.moveTo(0, 10); ctx.lineTo(88, 10); ctx.stroke();
      ctx.restore();

      // right solar panel
      ctx.save(); ctx.translate(BW / 2 + 4, -10);
      ctx.fillStyle = "rgba(20,40,100,0.9)";
      ctx.fillRect(0, 0, 88, 20);
      ctx.strokeStyle = "rgba(100,150,255,0.3)"; ctx.lineWidth = 0.8;
      for (let c = 1; c < 4; c++) { ctx.beginPath(); ctx.moveTo(c * 22, 0); ctx.lineTo(c * 22, 20); ctx.stroke(); }
      ctx.beginPath(); ctx.moveTo(0, 10); ctx.lineTo(88, 10); ctx.stroke();
      ctx.restore();

      // main body (rounded rect)
      const R = 6, bx = -BW / 2, by = -BH / 2;
      ctx.beginPath();
      ctx.moveTo(bx + R, by);
      ctx.lineTo(bx + BW - R, by);         ctx.arcTo(bx + BW, by,      bx + BW, by + R,      R);
      ctx.lineTo(bx + BW, by + BH - R);    ctx.arcTo(bx + BW, by + BH, bx + BW - R, by + BH, R);
      ctx.lineTo(bx + R,  by + BH);        ctx.arcTo(bx,       by + BH, bx,       by + BH - R, R);
      ctx.lineTo(bx,      by + R);          ctx.arcTo(bx,       by,      bx + R,   by,          R);
      ctx.closePath();
      const bodyG = ctx.createLinearGradient(bx, by, bx, by + BH);
      bodyG.addColorStop(0, "rgba(160,175,200,1)");
      bodyG.addColorStop(1, "rgba(90,105,130,1)");
      ctx.fillStyle = bodyG; ctx.fill();

      // panel lines
      ctx.strokeStyle = "rgba(0,0,0,0.25)"; ctx.lineWidth = 1;
      [-10, 0, 10].forEach(yo => {
        ctx.beginPath(); ctx.moveTo(bx + 5, yo); ctx.lineTo(bx + BW - 5, yo); ctx.stroke();
      });

      // top antenna stub
      ctx.strokeStyle = "rgba(200,220,255,0.9)"; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(0, by); ctx.lineTo(0, by - 14); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, by - 14, 3, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(200,220,255,0.9)"; ctx.fill();

      // dish (parabolic arc)
      ctx.strokeStyle = "rgba(200,215,240,0.85)"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(BW / 2 + 8, 0, 18, -Math.PI / 3, Math.PI / 3);
      ctx.stroke();
      // dish feed arm
      ctx.strokeStyle = "rgba(180,200,230,0.7)"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(BW / 2 + 8, 0); ctx.lineTo(BW / 2 + 20, 0); ctx.stroke();

      ctx.restore();
    };

    const tick = (t: number) => {
      if (!alive) return;
      raf = requestAnimationFrame(tick);
      if (t - lastT < FRAME_MS) return;
      lastT = t;

      ctx.clearRect(0, 0, W, H);

      // E: stars
      STARS.forEach(s => {
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${s.a})`; ctx.fill();
      });

      // D: comet streaks
      STREAKS.forEach((s, i) => {
        s.x += s.vx; s.y += s.vy;
        if (s.x < -200 || s.x > W + 200 || s.y < -200 || s.y > H + 200) {
          respawnIdx[i] = (respawnIdx[i] + 1) % 24;
          s.x = RESPAWN[i][respawnIdx[i]].x;
          s.y = RESPAWN[i][respawnIdx[i]].y;
        }
        const mag = Math.hypot(s.vx, s.vy);
        const dx = s.vx / mag, dy = s.vy / mag;
        const tg = ctx.createLinearGradient(s.x, s.y, s.x - dx * s.len, s.y - dy * s.len);
        tg.addColorStop(0, `rgba(180,220,255,${s.alpha})`);
        tg.addColorStop(1, "rgba(180,220,255,0)");
        ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(s.x - dx * s.len, s.y - dy * s.len);
        ctx.strokeStyle = tg; ctx.lineWidth = 1.2; ctx.stroke();
      });

      // B: orbit ellipse with flowing dash
      dashOffset -= 0.5;
      ctx.save();
      ctx.setLineDash([6, 10]);
      ctx.lineDashOffset = dashOffset;
      ctx.beginPath(); ctx.ellipse(cx, cy, 180, 55, -0.3, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(100,150,255,0.15)"; ctx.lineWidth = 1; ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();

      // A: satellite (slowly rotating)
      satAngle += 0.004;
      drawSatellite();

      // C: signal rings from dish tip (fixed screen-space)
      RING_PHASES.forEach(phase => {
        const elapsed = frame - phase;
        if (elapsed < 0) return;
        const r = elapsed % RING_MAX;
        if (r < 1) return;
        const pct = r / RING_MAX;
        const alpha = Math.max(0, 0.6 * (1 - pct));
        const lw = Math.max(0.4, 2 - 1.6 * pct);
        ctx.beginPath(); ctx.arc(DISH_X, DISH_Y, r, -0.6, 0.6);
        ctx.strokeStyle = `rgba(6,182,212,${alpha.toFixed(3)})`;
        ctx.lineWidth = lw; ctx.stroke();
      });

      frame++;

      // F: left content fade
      const fg = ctx.createLinearGradient(0, 0, W * 0.46, 0);
      fg.addColorStop(0, "rgba(4,4,14,1)"); fg.addColorStop(1, "rgba(4,4,14,0)");
      ctx.fillStyle = fg; ctx.fillRect(0, 0, W, H);
    };

    raf = requestAnimationFrame(tick);
    return () => { alive = false; cancelAnimationFrame(raf); };
  }, []);
  return <canvas ref={ref} style={{ position: "absolute", inset: 0, zIndex: 1, pointerEvents: "none" }} />;
}

/* ══════════════════════════════════════════════════════════
   SECTION 6 — STAR FIELD CANVAS (Footer)
══════════════════════════════════════════════════════════ */
function StarFieldCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current; if (!canvas) return;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    const W = (canvas.width = window.innerWidth);
    const H = (canvas.height = window.innerHeight);
    type DeepStar = { x: number; y: number; r: number; a: number; drift: number };
    const STARS: DeepStar[] = Array.from({ length: 300 }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      r: Math.pow(Math.random(), 3.2) * 2.2 + 0.15,
      a: 0.12 + Math.random() * 0.7, drift: (Math.random() - 0.5) * 0.12,
    }));
    // milky way band offscreen canvas — drawn once
    const mw = document.createElement("canvas"); mw.width = W; mw.height = H;
    const mc = mw.getContext("2d")!;
    for (let i = 0; i < 180; i++) {
      const t2 = Math.random(), bx = W * (0.1 + t2 * 0.8), by = H * (0.15 + t2 * 0.6) + (Math.random() - 0.5) * H * 0.35;
      mc.beginPath(); mc.arc(bx, by, Math.random() * 0.6 + 0.1, 0, Math.PI * 2);
      mc.fillStyle = `rgba(200,210,240,${Math.random() * 0.18 + 0.02})`; mc.fill();
    }
    const bandG = mc.createLinearGradient(0, H * 0.1, W, H * 0.9);
    bandG.addColorStop(0,   "rgba(80,70,120,0)");
    bandG.addColorStop(0.3, "rgba(80,70,120,0.055)");
    bandG.addColorStop(0.5, "rgba(100,90,150,0.075)");
    bandG.addColorStop(0.7, "rgba(80,70,120,0.055)");
    bandG.addColorStop(1,   "rgba(80,70,120,0)");
    mc.fillStyle = bandG; mc.fillRect(0, 0, W, H);
    let raf: number, alive = true, lastT = 0;
    const FRAME_MS = 1000 / 30;
    const tick = (t: number) => {
      if (!alive) return;
      raf = requestAnimationFrame(tick);
      if (t - lastT < FRAME_MS) return;
      lastT = t;
      ctx.clearRect(0, 0, W, H);
      ctx.drawImage(mw, 0, 0);
      STARS.forEach(s => {
        s.x += s.drift * 0.033;
        if (s.x < 0) s.x = W; if (s.x > W) s.x = 0;
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${s.a})`; ctx.fill();
      });
    };
    raf = requestAnimationFrame(tick);
    return () => { alive = false; cancelAnimationFrame(raf); };
  }, []);
  return <canvas ref={ref} style={{ position: "absolute", inset: 0, zIndex: 1, pointerEvents: "none" }} />;
}

/* ══════════════════════════════════════════════════════════
   PERSON AVATAR
══════════════════════════════════════════════════════════ */
function PersonAvatar({ initials, gradient, ringColor, size = 200 }: { initials: string; gradient: string; ringColor: string; size?: number }) {
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: gradient, border: `2px solid ${ringColor}50`, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 0 30px ${ringColor}35, inset 0 0 40px rgba(0,0,0,0.35)` }}>
        <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "radial-gradient(circle at 35% 30%, rgba(255,255,255,0.12), transparent 60%)" }} />
        <span style={{ fontSize: size * 0.28, fontWeight: 900, color: "white", letterSpacing: "-0.02em", position: "relative", zIndex: 1 }}>{initials}</span>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   GLASS CARD
══════════════════════════════════════════════════════════ */
function GlassCard({ children, accentColor = "#8b5cf6", style = {} }: { children: React.ReactNode; accentColor?: string; style?: React.CSSProperties }) {
  return (
    <div style={{ borderRadius: 20, border: `1px solid ${accentColor}20`, background: `linear-gradient(135deg,${accentColor}07 0%,rgba(5,5,9,0.8) 100%)`, padding: "28px 32px", position: "relative", overflow: "hidden", backdropFilter: "blur(16px)", ...style }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg,transparent,${accentColor}60,transparent)` }} />
      {children}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   MINI PLANET CANVAS
══════════════════════════════════════════════════════════ */
function MiniPlanetCanvas({ color, ringColor, size = 38 }: { color: string; ringColor: string; size?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current; if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = size * dpr; canvas.height = size * dpr;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    ctx.scale(dpr, dpr);
    const cx = size / 2, cy = size / 2;
    const planetR = size * 0.28;

    let tilt = 0, raf = 0, alive = true, lastT = 0;
    const FRAME_MS = 1000 / 30;

    const tick = (t: number) => {
      if (!alive) return;
      raf = requestAnimationFrame(tick);
      if (t - lastT < FRAME_MS) return;
      lastT = t;
      tilt += 0.012;
      ctx.clearRect(0, 0, size, size);

      // full ring (back half visible behind planet)
      ctx.beginPath(); ctx.ellipse(cx, cy, planetR * 1.7, planetR * 0.38, tilt, 0, Math.PI * 2);
      ctx.strokeStyle = ringColor + "90"; ctx.lineWidth = 1.2; ctx.stroke();

      // planet body (covers back half of ring — painter's algorithm)
      const pg = ctx.createRadialGradient(cx, cy, 0, cx, cy, planetR);
      pg.addColorStop(0, color); pg.addColorStop(1, color + "88");
      ctx.beginPath(); ctx.arc(cx, cy, planetR, 0, Math.PI * 2);
      ctx.fillStyle = pg; ctx.fill();

      // specular highlight
      const hg = ctx.createRadialGradient(cx - planetR * 0.28, cy - planetR * 0.3, 0, cx - planetR * 0.28, cy - planetR * 0.3, planetR * 0.55);
      hg.addColorStop(0, "rgba(255,255,255,0.35)"); hg.addColorStop(1, "rgba(255,255,255,0)");
      ctx.beginPath(); ctx.arc(cx, cy, planetR, 0, Math.PI * 2);
      ctx.fillStyle = hg; ctx.fill();

      // ring front half (over planet)
      ctx.beginPath(); ctx.ellipse(cx, cy, planetR * 1.7, planetR * 0.38, tilt, Math.PI, Math.PI * 2);
      ctx.strokeStyle = ringColor + "cc"; ctx.lineWidth = 1.4; ctx.stroke();
    };

    raf = requestAnimationFrame(tick);
    return () => { alive = false; cancelAnimationFrame(raf); };
  }, [color, ringColor, size]);
  return <canvas ref={ref} style={{ width: size, height: size, display: "block" }} />;
}

/* ══════════════════════════════════════════════════════════
   SECTION LAYOUT CONSTANT
══════════════════════════════════════════════════════════ */
const S = { maxWidth: 1200, margin: "0 auto", padding: "0 40px" };
const SC = "lp-section-inner-pad"; // class for responsive padding override

/* ══════════════════════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════════════════════ */
function Index() {
  const [dustDone, setDustDone] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);
  const [contactForm, setContactForm] = useState({ name: "", email: "", message: "" });
  const [contactSent, setContactSent] = useState(false);
  const [contactLoading, setContactLoading] = useState(false);
  const [contactError, setContactError] = useState("");
  const [bhScale, setBhScale] = useState(1)
  const [bhOpacity, setBhOpacity] = useState(1)
  const [heroVisible, setHeroVisible] = useState(true)
  const [activeSectionIdx, setActiveSectionIdx] = useState(-1)
  const [isMobile, setIsMobile] = useState(false)
  const [footerNotice, setFooterNotice] = useState<string | null>(null)
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])
  useEffect(() => {
    if (!footerNotice) return
    const timeout = setTimeout(() => setFooterNotice(null), 2400)
    return () => clearTimeout(timeout)
  }, [footerNotice])
  // Mobile-aware section padding
  const SS = isMobile
    ? { maxWidth: 1200, margin: "0 auto", padding: "0 16px" }
    : { maxWidth: 1200, margin: "0 auto", padding: "0 40px" }

  const { user, isLoading, logout, deleteAccount } = useAuth();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const footerLinks = [
    { heading: 'Platform', links: ['Startup Hub', 'Department Hub', 'Challenges', 'Analytics', 'Solution Vault'] },
    { heading: 'Company', links: ['About Us', 'Careers', 'Blog', 'Press Kit', 'Changelog'] },
    { heading: 'Legal', links: ['Privacy Policy', 'Terms of Service', 'Data & IP Policy', 'Security', 'Compliance'] },
  ];

  const footerLinkUrls: Record<string, string | null> = {
    'Startup Hub': '/hub',
    'Department Hub': '/scout',
    'Challenges': '/hub?tab=pipeline',
    'Analytics': '/hub?tab=analytics',
    'Solution Vault': '/hub?tab=vault',
    'About Us': null,
    'Careers': null,
    'Blog': null,
    'Press Kit': null,
    'Changelog': null,
    'Privacy Policy': null,
    'Terms of Service': null,
    'Data & IP Policy': null,
    'Security': null,
    'Compliance': null,
  };

  const handleFooterLink = (label: string) => {
    if (label === 'About Us') {
      navigateToSection(4);
      return;
    }

    const href = footerLinkUrls[label];
    if (href) {
      navigate({ to: href });
      return;
    }

    setFooterNotice(`${label} is coming soon`);
  };

  const sectionIndex = useRef(-1)
  const transitioning = useRef(false)
  const wheelAccum = useRef(0)
  const pinchAccum = useRef(0)

  useEffect(() => {
    let resetTimer: ReturnType<typeof setTimeout>
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      if (transitioning.current) return

      // reset accumulators if the user pauses scrolling
      clearTimeout(resetTimer)
      resetTimer = setTimeout(() => {
        wheelAccum.current = 0
        pinchAccum.current = 0
      }, 200)

      let dir: 'down' | 'up'
      if (e.ctrlKey) {
        // trackpad pinch: spread fingers (negative deltaY) = zoom in = 'down'
        pinchAccum.current += e.deltaY
        if (Math.abs(pinchAccum.current) < 5) return
        dir = pinchAccum.current < 0 ? 'down' : 'up'
        pinchAccum.current = 0
      } else {
        wheelAccum.current += e.deltaY
        if (Math.abs(wheelAccum.current) < 30) return
        dir = wheelAccum.current > 0 ? 'down' : 'up'
        wheelAccum.current = 0
      }
      transitioning.current = true

      if (sectionIndex.current === -1 && dir === 'down') {
        // zoom into blackhole then show features
        setHeroVisible(false)
        setBhScale(8)
        setTimeout(() => {
          setBhOpacity(0)
          sectionIndex.current = 0
          setActiveSectionIdx(0)
          setTimeout(() => {
            transitioning.current = false
          }, 500)
        }, 600)

      } else if (sectionIndex.current >= 0 && dir === 'down'
                 && sectionIndex.current < 6) {
        sectionIndex.current += 1
        setActiveSectionIdx(sectionIndex.current)
        setTimeout(() => { transitioning.current = false }, 550)

      } else if (sectionIndex.current === 0 && dir === 'up') {
        // zoom back out to hero
        setActiveSectionIdx(-2) // hide all sections
        setBhOpacity(1)
        setTimeout(() => {
          setBhScale(1)
          setHeroVisible(true)
          setDustDone(false)
          setTimeout(() => setDustDone(true), 50)
          sectionIndex.current = -1
          setActiveSectionIdx(-1)
          setTimeout(() => { transitioning.current = false }, 650)
        }, 100)

      } else if (sectionIndex.current > 0 && dir === 'up') {
        sectionIndex.current -= 1
        setActiveSectionIdx(sectionIndex.current)
        setTimeout(() => { transitioning.current = false }, 550)

      } else {
        transitioning.current = false
      }
    }
    window.addEventListener('wheel', onWheel, { passive: false })
    return () => { window.removeEventListener('wheel', onWheel); clearTimeout(resetTimer) }
  }, [])

  useEffect(() => {
    let touchStartX = 0
    let touchStartY = 0
    // A swipe that begins inside a horizontal carousel (marked [data-hscroll]) is
    // handed to the browser to scroll natively — native touch momentum + CSS
    // scroll-snap give the smoothest possible feel (far better than JS-driving the
    // scrollLeft). We only step in to (a) drag-scroll a section taller than the
    // screen and (b) page between sections on a vertical flick.
    let scroller: HTMLElement | null = null
    let vscroller: HTMLElement | null = null   // the active fixed section (vertical scroll container)
    let verticalNative = false                 // true once we've drag-scrolled the section
    let lastY = 0
    let axis: 'h' | 'v' | null = null
    const onTouchStart = (e: TouchEvent) => {
      touchStartX = e.touches[0].clientX
      touchStartY = lastY = e.touches[0].clientY
      axis = null
      verticalNative = false
      const t = e.target as HTMLElement | null
      scroller = t?.closest?.('[data-hscroll]') as HTMLElement | null
      vscroller = (t?.closest?.('.lp-fixed-section') as HTMLElement | null)
        ?? (t?.closest?.('.lp-hero-fixed') as HTMLElement | null)
    }
    const onTouchMove = (e: TouchEvent) => {
      if (!axis) {
        const dx = Math.abs(e.touches[0].clientX - touchStartX)
        const dy = Math.abs(e.touches[0].clientY - touchStartY)
        if (dx < 6 && dy < 6) return // too small to decide direction yet
        axis = dx > dy ? 'h' : 'v'
      }
      if (scroller && axis === 'h') {
        // Let the browser scroll the carousel natively — do NOT preventDefault.
        // Native momentum + CSS scroll-snap handle the slide and the settle.
        return
      }
      // Vertical: if the section's content is taller than the screen, drag-scroll
      // it ourselves so nothing is cut off. We only fall through to section paging
      // once the user is at the top/bottom edge of the section.
      if (axis === 'v' && vscroller && vscroller.scrollHeight > vscroller.clientHeight + 2) {
        const y = e.touches[0].clientY
        const goingUp = y < lastY // finger up → reveal content lower down
        const atTop = vscroller.scrollTop <= 0
        const atBottom = vscroller.scrollTop + vscroller.clientHeight >= vscroller.scrollHeight - 1
        if ((goingUp && !atBottom) || (!goingUp && !atTop)) {
          vscroller.scrollTop -= y - lastY
          lastY = y
          verticalNative = true
          e.preventDefault()
          return
        }
        lastY = y
      }
      e.preventDefault()
    }
    const onTouchEnd = (e: TouchEvent) => {
      const wasHorizontal = scroller && axis === 'h'
      const didVScroll = verticalNative
      scroller = null
      vscroller = null
      axis = null
      verticalNative = false
      if (wasHorizontal || didVScroll) return // native carousel scroll / section drag handled it
      const diff = touchStartY - e.changedTouches[0].clientY
      if (Math.abs(diff) < 40) return
      window.dispatchEvent(new WheelEvent('wheel', { deltaY: diff, bubbles: true }))
    }
    window.addEventListener('touchstart', onTouchStart, { passive: false })
    window.addEventListener('touchmove',  onTouchMove,  { passive: false })
    window.addEventListener('touchend',   onTouchEnd)
    return () => {
      window.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchmove',  onTouchMove)
      window.removeEventListener('touchend',   onTouchEnd)
    }
  }, [])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
        setConfirmDelete(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Expose the active landing section on document.body so the chatbot
  // can include section context when asking questions anywhere on the site.
  useEffect(() => {
    const map = new Map<number, string>([
      [-2, 'transition'],
      [-1, 'home'],
      [0, 'features'],
      [1, 'founders'],
      [2, 'investors'],
      [3, 'testimonials'],
      [4, 'about'],
      [5, 'contact'],
    ]);
    const name = map.get(activeSectionIdx) ?? 'unknown';
    try {
      document.body.setAttribute('data-active-section', name);
      document.body.setAttribute('data-active-section-idx', String(activeSectionIdx));
    } catch (e) {
      // ignore server-side or restricted environments
    }
  }, [activeSectionIdx]);

  const handleLogout = async () => {
    setDropdownOpen(false);
    await logout();
    navigate({ to: '/' });
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      await deleteAccount();
      setDropdownOpen(false);
      setConfirmDelete(false);
      navigate({ to: '/' });
    } catch {
      setDeleting(false);
    }
  };

  useEffect(() => {
    if (window.location.hash) {
      window.history.replaceState(null, "", "/");
    }
  }, []);

  const navigateToSection = (targetIdx: number) => {
    if (transitioning.current) return
    if (sectionIndex.current === targetIdx) return
    transitioning.current = true

    const from = sectionIndex.current
    const goingToHero = targetIdx === -1
    const effectiveTarget = goingToHero ? 0 : targetIdx

    const zoomBackToHero = () => {
      setActiveSectionIdx(-2)
      setBhOpacity(1)
      setTimeout(() => {
        setBhScale(1)
        setHeroVisible(true)
        setDustDone(false)
        setTimeout(() => setDustDone(true), 50)
        sectionIndex.current = -1
        setActiveSectionIdx(-1)
        setTimeout(() => { transitioning.current = false }, 650)
      }, 100)
    }

    const steps: number[] = []
    if (from !== effectiveTarget) {
      const dir = effectiveTarget > from ? 1 : -1
      for (let i = from + dir; dir > 0 ? i <= effectiveTarget : i >= effectiveTarget; i += dir) {
        steps.push(i)
      }
    }

    const runSteps = (remaining: number[]) => {
      if (remaining.length === 0) { if (goingToHero) zoomBackToHero(); return }
      const [next, ...rest] = remaining
      setTimeout(() => {
        sectionIndex.current = next
        setActiveSectionIdx(next)
        if (rest.length === 0) {
          if (goingToHero) zoomBackToHero()
          else setTimeout(() => { transitioning.current = false }, 550)
        } else {
          runSteps(rest)
        }
      }, 120)
    }

    if (from === -1) {
      // from hero → zoom in then step forward to target
      setHeroVisible(false)
      setBhScale(8)
      setTimeout(() => {
        setBhOpacity(0)
        sectionIndex.current = steps[0]
        setActiveSectionIdx(steps[0])
        if (steps.length === 1) setTimeout(() => { transitioning.current = false }, 550)
        else runSteps(steps.slice(1))
      }, 600)
    } else if (steps.length === 0) {
      // already at effectiveTarget (from===0 going to hero)
      zoomBackToHero()
    } else {
      sectionIndex.current = steps[0]
      setActiveSectionIdx(steps[0])
      if (steps.length === 1) {
        if (goingToHero) zoomBackToHero()
        else setTimeout(() => { transitioning.current = false }, 550)
      } else {
        runSteps(steps.slice(1))
      }
    }
  }

  return (
    <main className="lp-main-wrapper" style={{ background: "#020208", color: "white", fontFamily: "Inter, system-ui, sans-serif", overflowX: "hidden", scrollBehavior: "smooth", overflowY: "hidden", height: "100dvh", touchAction: "none" }}>

      <style>{`
        html, body {
          overflow: hidden;
          height: 100dvh;
          width: 100vw;
          touch-action: none;
        }

        ::-webkit-scrollbar {
          display: none;
        }

        * {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }

        html { scroll-behavior: smooth; }
        * { -webkit-font-smoothing: antialiased; }

        @keyframes lp-float  { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
        @keyframes lp-pulse  { 0%,100%{opacity:.4} 50%{opacity:.9} }
        @keyframes lp-fadein { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }

        .lp-btn { transition: all .18s ease; cursor: pointer; }
        .lp-btn:hover { transform: translateY(-2px); filter: brightness(1.1); }
        .lp-card-hover { transition: transform .22s ease, box-shadow .22s ease; }
        .lp-card-hover:hover { transform: translateY(-5px); box-shadow: 0 24px 56px rgba(0,0,0,0.45); }

        .section-fade-bottom::after {
          content: '';
          position: absolute;
          bottom: 0; left: 0; right: 0;
          height: 160px;
          background: linear-gradient(to bottom, transparent, #020208);
          pointer-events: none;
          z-index: 2;
        }
        .section-fade-top::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 160px;
          background: linear-gradient(to top, transparent, #020208);
          pointer-events: none;
          z-index: 2;
        }

        .section-full {
          min-height: 100vh;
          display: flex;
          align-items: flex-start;
          padding: 46px 0 80px;
          position: relative;
          box-sizing: border-box;
        }
        .section-full > .section-inner {
          width: 100%;
          position: relative;
          z-index: 3;
        }

        .ambient-blob {
          position: absolute;
          border-radius: 50%;
          pointer-events: none;
          filter: blur(80px);
          opacity: 0.12;
        }

        .scene-blend {
          background: linear-gradient(
            to right,
            rgba(2,2,8,0.97) 0%,
            rgba(2,2,8,0.88) 30%,
            rgba(2,2,8,0.35) 55%,
            rgba(2,2,8,0.0) 75%
          );
        }
        .scene-blend-bottom {
          background: linear-gradient(to top, rgba(2,2,8,1) 0%, rgba(2,2,8,0.6) 40%, transparent 100%);
        }

        .snap-container { scroll-snap-type: none; }
        .snap-container::-webkit-scrollbar { display: none; }
        .snap-section {
          scroll-snap-align: start;
          scroll-snap-stop: normal;
        }

        /* On mobile the testimonial cards become a horizontal swipe carousel
           (one card per view) instead of a tall vertical stack. This keeps the
           section to a single viewport so a vertical swipe pages rigidly to the
           next section rather than loosely drag-scrolling the content. */
        @media (max-width: 767px) {
          .lp-mobile-carousel {
            display: flex !important;
            grid-template-columns: none !important;
            overflow-x: auto;
            scroll-snap-type: x mandatory;
            -webkit-overflow-scrolling: touch;
            scrollbar-width: none;
            scroll-padding-left: 16px;
            padding-bottom: 4px;
          }
          .lp-mobile-carousel::-webkit-scrollbar { display: none; }
          .lp-mobile-carousel > * {
            flex: 0 0 86% !important;
            scroll-snap-align: center;
          }
        }

        /* Align the home nav + section-overlay nav link clusters into one
           "linear" position so they don't jump when navigating between pages.
           Gated to real desktop widths so the centered cluster never overlaps
           the logo or the right-side actions on narrower screens. */
        @media (min-width: 1200px) {
          .lp-nav-centered {
            position: absolute;
            left: 50%;
            top: 24px;
            transform: translateX(-50%);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          * { animation: none !important; transition: none !important; }
        }
      `}</style>

      {/* ══ SECTION NAV OVERLAY — visible on all section pages ══ */}
      <div className="lp-section-nav" style={{
        position: 'fixed',
        top: 0, left: 0, right: 0,
        zIndex: 30,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '20px 40px',
        background: 'linear-gradient(to bottom, rgba(2,2,8,0.92) 0%, transparent 100%)',
        opacity: activeSectionIdx >= 0 ? 1 : 0,
        transition: 'opacity 300ms ease',
        pointerEvents: activeSectionIdx >= 0 ? 'auto' : 'none',
      }}>
        <button type="button" onClick={() => navigateToSection(-1)} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'white', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>
          <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#a78bfa', boxShadow: '0 0 12px 2px rgba(167,139,250,0.8)' }} />
          Sanyog
        </button>
        {/* Desktop nav links */}
        <div className="lp-section-nav-links lp-nav-centered" style={{ display: 'flex', alignItems: 'center', gap: 32, fontSize: 13, color: 'rgba(163,163,163,1)' }}>
          {([['Home', -1], ['Features', 0], ['Startups', 1], ['Departments', 2], ['Outcomes', 3], ['About', 4], ['Contact', 5]] as [string, number][]).map(([label, idx]) => (
            <button
              key={label}
              onClick={() => { navigateToSection(idx); setMobileNavOpen(false); }}
              style={{
                background: 'none', border: 'none', padding: 0,
                color: activeSectionIdx === idx ? 'white' : 'rgba(163,163,163,1)',
                fontSize: 'inherit', fontFamily: 'inherit', cursor: 'pointer',
                fontWeight: activeSectionIdx === idx ? 700 : 400,
                transition: 'color 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.color = 'white')}
              onMouseLeave={e => (e.currentTarget.style.color = activeSectionIdx === idx ? 'white' : 'rgba(163,163,163,1)')}
            >{label}</button>
          ))}
        </div>
        {/* Drusti pill — section nav, desktop only */}
        <a
          href="https://drusti.vercel.app/"
          target="_blank"
          rel="noopener noreferrer"
          className="lp-section-nav-links"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '4px 10px 4px 6px', borderRadius: 999,
            background: 'rgba(167,139,250,.08)', border: '1px solid rgba(167,139,250,.22)',
            textDecoration: 'none', fontSize: 12, fontWeight: 600, color: 'rgba(196,181,253,.75)',
            transition: 'all .18s',
          }}
          onMouseEnter={e => { const el = e.currentTarget as HTMLAnchorElement; el.style.background = 'rgba(167,139,250,.16)'; el.style.borderColor = 'rgba(167,139,250,.45)'; el.style.color = '#c4b5fd'; }}
          onMouseLeave={e => { const el = e.currentTarget as HTMLAnchorElement; el.style.background = 'rgba(167,139,250,.08)'; el.style.borderColor = 'rgba(167,139,250,.22)'; el.style.color = 'rgba(196,181,253,.75)'; }}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 15, height: 15, borderRadius: 4, background: 'rgba(167,139,250,.22)', flexShrink: 0 }}>
            <Sparkles style={{ width: 7, height: 7, color: '#a78bfa' }} />
          </span>
          Drusti
          <svg width="8" height="8" viewBox="0 0 9 9" fill="none" style={{ opacity: 0.4 }}><path d="M1 8L8 1M8 1H3M8 1V6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </a>
        {/* Mobile hamburger */}
        <button
          className="lp-mobile-menu-btn"
          onClick={() => setMobileNavOpen(o => !o)}
          style={{ display: 'none', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, borderRadius: 8, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', cursor: 'pointer' }}
        >
          {mobileNavOpen ? (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 2L14 14M14 2L2 14" stroke="rgba(255,255,255,0.8)" strokeWidth="2" strokeLinecap="round"/></svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <rect y="2" width="16" height="1.8" rx="1" fill="rgba(255,255,255,0.8)"/>
              <rect y="7.1" width="16" height="1.8" rx="1" fill="rgba(255,255,255,0.8)"/>
              <rect y="12.2" width="16" height="1.8" rx="1" fill="rgba(255,255,255,0.8)"/>
            </svg>
          )}
        </button>
        {/* Mobile dropdown */}
        {mobileNavOpen && (
          <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#04040c', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 26px 56px rgba(0,0,0,0.75)', padding: '8px 0', zIndex: 40, maxHeight: '82vh', overflowY: 'auto' }}>
            {([['Home', -1], ['Features', 0], ['Startups', 1], ['Departments', 2], ['Outcomes', 3], ['About', 4], ['Contact', 5]] as [string, number][]).map(([label, idx]) => (
              <button
                key={label}
                onClick={() => { navigateToSection(idx); setMobileNavOpen(false); }}
                style={{ display: 'block', width: '100%', textAlign: 'left', padding: '12px 24px', background: 'none', border: 'none', color: activeSectionIdx === idx ? '#a78bfa' : 'rgba(255,255,255,0.7)', fontSize: 14, fontWeight: activeSectionIdx === idx ? 700 : 400, fontFamily: 'inherit', cursor: 'pointer' }}
              >{label}</button>
            ))}
            {/* Drusti link in mobile nav */}
            <div style={{ margin: '6px 16px 4px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 8 }}>
              <a
                href="https://drusti.vercel.app/"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setMobileNavOpen(false)}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 8px', borderRadius: 10, background: 'rgba(167,139,250,.08)', border: '1px solid rgba(167,139,250,.2)', textDecoration: 'none' }}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 22, height: 22, borderRadius: 6, background: 'rgba(167,139,250,.2)', flexShrink: 0 }}>
                  <Sparkles style={{ width: 10, height: 10, color: '#a78bfa' }} />
                </span>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#c4b5fd', margin: 0, lineHeight: 1.2 }}>Drusti ↗</p>
                  <p style={{ fontSize: 10.5, color: 'rgba(255,255,255,.35)', margin: 0 }}>AI analytics platform by this team</p>
                </div>
              </a>
            </div>
          </div>
        )}
      </div>

      {/* ══ HERO ══ */}
      <div className="lp-hero-fixed" style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10,
        opacity: activeSectionIdx === -1 ? 1 : 0,
        transition: 'opacity 300ms ease',
        pointerEvents: activeSectionIdx === -1 ? 'auto' : 'none'
      }}>
      <div className="snap-section" style={{ position: "relative", height: "100dvh", overflow: "hidden" }}>
        <Card className="w-full h-full bg-black/[0.96] relative rounded-none border-0">
          <Spotlight className="-top-40 left-0 md:left-60 md:-top-20" fill="white" />
          {!dustDone && <DustCanvas heroRef={heroRef} onDone={() => setDustDone(true)} />}

          <nav className="lp-hero-nav relative z-20 flex items-center justify-between px-6 md:px-16 py-7" style={{ flexWrap: 'nowrap' }}>
            <button type="button" onClick={() => navigateToSection(-1)} className="lp-hero-logo flex items-center gap-2.5 text-sm font-semibold tracking-widest uppercase" style={{ background: 'none', border: 'none', padding: 0, color: 'inherit', cursor: 'pointer' }}>
              <span className="inline-block h-2 w-2 rounded-full bg-violet-400 shadow-[0_0_12px_2px_rgba(167,139,250,0.8)]" />
              Sanyog
            </button>
            <div className="flex items-center justify-center gap-8 text-neutral-400 lp-nav-centered" style={{ fontSize: 13 }}>
              {/* Desktop nav links */}
              <div className="hidden md:flex items-center gap-8">
                <button onClick={() => navigateToSection(-1)} className="hover:text-white transition-colors cursor-pointer" style={{ background: 'none', border: 'none', padding: 0, color: 'inherit', fontSize: 'inherit', fontFamily: 'inherit' }}>Home</button>
                {/* Section ids stay as-is (they anchor scroll targets); only the
                    visible labels change to the department/startup vocabulary. */}
                {([["features", "Features"], ["founders", "Startups"], ["investors", "Departments"], ["testimonials", "Outcomes"], ["about", "About"], ["contact", "Contact"]] as [string, string][]).map(([id, label], i) => (
                  <button key={id} onClick={() => navigateToSection(i)} className="hover:text-white transition-colors cursor-pointer" style={{ background: 'none', border: 'none', padding: 0, color: 'inherit', fontSize: 'inherit', fontFamily: 'inherit' }}>{label}</button>
                ))}
              </div>
              {/* Mobile-only Drusti pill — fills the otherwise-empty nav center on phones */}
              <a
                href="https://drusti.vercel.app/"
                target="_blank"
                rel="noopener noreferrer"
                className="lp-drusti-mobile inline-flex md:hidden"
                aria-label="Visit Drusti (opens in a new tab)"
                style={{
                  alignItems: 'center', gap: 5,
                  padding: '4px 9px 4px 5px', borderRadius: 999,
                  background: 'rgba(167,139,250,.1)', border: '1px solid rgba(167,139,250,.28)',
                  textDecoration: 'none', fontSize: 11.5, fontWeight: 600, color: '#c4b5fd',
                  whiteSpace: 'nowrap', flexShrink: 0,
                }}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 15, height: 15, borderRadius: 5, background: 'rgba(167,139,250,.25)', flexShrink: 0 }}>
                  <Sparkles style={{ width: 8, height: 8, color: '#a78bfa' }} />
                </span>
                Drusti
                <svg width="8" height="8" viewBox="0 0 9 9" fill="none" style={{ opacity: 0.5, flexShrink: 0 }}><path d="M1 8L8 1M8 1H3M8 1V6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </a>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {/* Drusti ecosystem pill — desktop only */}
              <a
                href="https://drusti.vercel.app/"
                target="_blank"
                rel="noopener noreferrer"
                className="hidden md:inline-flex"
                style={{
                  alignItems: 'center', gap: 5,
                  padding: '5px 11px 5px 7px', borderRadius: 999,
                  background: 'rgba(167,139,250,.08)', border: '1px solid rgba(167,139,250,.22)',
                  textDecoration: 'none', fontSize: 12, fontWeight: 600, color: 'rgba(196,181,253,.8)',
                  transition: 'all .18s',
                }}
                onMouseEnter={e => { const el = e.currentTarget as HTMLAnchorElement; el.style.background = 'rgba(167,139,250,.16)'; el.style.borderColor = 'rgba(167,139,250,.45)'; el.style.color = '#c4b5fd'; }}
                onMouseLeave={e => { const el = e.currentTarget as HTMLAnchorElement; el.style.background = 'rgba(167,139,250,.08)'; el.style.borderColor = 'rgba(167,139,250,.22)'; el.style.color = 'rgba(196,181,253,.8)'; }}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 16, height: 16, borderRadius: 5, background: 'rgba(167,139,250,.25)', flexShrink: 0 }}>
                  <Sparkles style={{ width: 8, height: 8, color: '#a78bfa' }} />
                </span>
                Drusti
                <svg width="9" height="9" viewBox="0 0 9 9" fill="none" style={{ opacity: 0.45 }}><path d="M1 8L8 1M8 1H3M8 1V6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </a>
              {isLoading ? null : user ? (
                <div ref={dropdownRef} style={{ position: 'relative' }}>
                  <button
                    onClick={() => { setDropdownOpen(o => !o); setConfirmDelete(false); }}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px 6px 6px', borderRadius: 999, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', transition: 'all 0.18s ease' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
                  >
                    {user.auth_method === 'google' && user.avatar_url ? (
                      <img src={user.avatar_url} alt="" style={{ width: 26, height: 26, borderRadius: '50%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'linear-gradient(135deg,#7c3aed,#0ea5e9)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: 'white' }}>
                        {user.name.charAt(0)}
                      </div>
                    )}
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.85)', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name}</span>
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ flexShrink: 0 }}><path d="M3 4.5L6 7.5L9 4.5" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </button>
                  {dropdownOpen && (
                    <div style={{ position: 'absolute', top: 'calc(100% + 8px)', right: 0, background: '#0d0d1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, minWidth: 220, padding: '4px', boxShadow: '0 16px 48px rgba(0,0,0,0.6)', animation: 'fadeIn 0.15s ease' }}>
                      <style>{`@keyframes fadeIn{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:translateY(0)}}`}</style>
                      <div style={{ padding: '12px 14px 10px', borderBottom: '1px solid rgba(255,255,255,0.07)', marginBottom: 4 }}>
                        <p style={{ fontSize: 13, fontWeight: 700, color: 'white', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name}</p>
                        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email}</p>
                      </div>
                      <button onClick={handleLogout} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '9px 14px', background: 'none', border: 'none', cursor: 'pointer', borderRadius: 10, color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: 500, textAlign: 'left', transition: 'background 0.15s' }} onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')} onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                        Log Out
                      </button>
                      {!confirmDelete ? (
                        <button onClick={() => setConfirmDelete(true)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '9px 14px', background: 'none', border: 'none', cursor: 'pointer', borderRadius: 10, color: '#f87171', fontSize: 13, fontWeight: 500, textAlign: 'left', transition: 'background 0.15s' }} onMouseEnter={e => (e.currentTarget.style.background = 'rgba(248,113,113,0.08)')} onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                          Delete Account
                        </button>
                      ) : (
                        <div style={{ padding: '10px 14px', borderTop: '1px solid rgba(248,113,113,0.2)', marginTop: 4 }}>
                          <p style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.5)', margin: '0 0 10px', lineHeight: 1.5 }}>Are you sure? This will permanently delete your account and all your data. This cannot be undone.</p>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button onClick={handleDeleteAccount} disabled={deleting} style={{ flex: 1, padding: '7px 0', borderRadius: 8, background: '#dc2626', border: 'none', color: 'white', fontSize: 12, fontWeight: 600, cursor: deleting ? 'not-allowed' : 'pointer', opacity: deleting ? 0.7 : 1 }}>{deleting ? 'Deleting…' : 'Yes, delete'}</button>
                            <button onClick={() => setConfirmDelete(false)} style={{ flex: 1, padding: '7px 0', borderRadius: 8, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <button onClick={() => navigate({ to: '/login' })} style={{ padding: '7px 16px', borderRadius: 8, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.18s ease' }} onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')} onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}>Log In</button>
                  <button onClick={() => navigate({ to: '/signup' })} style={{ padding: '7px 16px', borderRadius: 8, background: 'linear-gradient(90deg,#7c3aed,#0ea5e9)', border: 'none', color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer', boxShadow: '0 2px 12px rgba(124,58,237,0.3)', transition: 'all 0.18s ease' }} onMouseEnter={e => (e.currentTarget.style.opacity = '0.9')} onMouseLeave={e => (e.currentTarget.style.opacity = '1')}>Sign Up</button>
                </>
              )}
            </div>
          </nav>

          <div className="absolute inset-0 z-0">
            <ClientOnly fallback={<div className="w-full h-full" />}>
              <BusinessScene3D className="w-full h-full" active={activeSectionIdx === -1} />
            </ClientOnly>
            <div className="pointer-events-none absolute inset-0 scene-blend" />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-64 scene-blend-bottom" />
            <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/50 to-transparent" />
          </div>

          <div style={{
            opacity: heroVisible ? 1 : 0,
            transition: 'opacity 400ms ease'
          }}>
            <SpaceCanvas />
            <BottomPlanet />
          </div>
          <div style={{
            position: 'absolute',
            left: '49%',
            top: '50%',
            transform: `translate(-50%,-50%) scale(${bhScale})`,
            opacity: bhOpacity,
            transition: 'transform 600ms cubic-bezier(0.4,0,0.2,1), opacity 600ms ease',
            zIndex: 4,
            transformOrigin: 'center center'
          }}>
            <BlackHoleCanvas />
            <div style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
              pointerEvents: 'none',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 4,
              opacity: dustDone ? 1 : 0,
              transition: 'opacity 0.6s ease 0.6s',
            }}>
              <span style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                color: 'rgba(255,200,100,0.7)',
                textShadow: '0 0 12px rgba(255,150,30,0.8)',
                animation: 'lp-pulse 2.4s ease-in-out infinite',
              }}>scroll to zoom in</span>
            </div>
          </div>

          <div className="relative z-10 flex h-[calc(100vh-88px)] items-center pointer-events-none" style={{ opacity: dustDone ? 1 : 0, transition: "opacity 0.6s ease" }}>
            <div style={{
              opacity: heroVisible ? 1 : 0,
              transform: heroVisible ? 'translateY(0)' : 'translateY(-40px)',
              transition: 'opacity 400ms ease, transform 400ms ease',
              pointerEvents: heroVisible ? 'auto' : 'none'
            }}>
            <div ref={heroRef} className="px-6 sm:px-10 md:px-16 max-w-[580px] pointer-events-auto">
              <div data-dust="badge" className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-4 py-1.5 text-xs text-neutral-300 backdrop-blur mb-7" style={{ opacity: dustDone ? 1 : 0, transform: dustDone ? "translateY(0)" : "translateY(6px)", transition: "opacity 0.45s ease 0.05s,transform 0.45s ease 0.05s" }}>
                <Sparkles className="h-3 w-3 text-violet-300" />Built for departments &amp; startups
              </div>
              <h1 data-dust="h1" className="text-[26px] sm:text-[36px] md:text-[50px] font-bold leading-[1.06] tracking-tight mb-5" style={{ fontSize: 'clamp(1.7rem, 4.4vw, 50px)', opacity: dustDone ? 1 : 0, transform: dustDone ? "translateY(0)" : "translateY(10px)", transition: "opacity 0.5s ease 0.12s,transform 0.5s ease 0.12s" }}>
                <span className="bg-clip-text text-transparent bg-gradient-to-b from-white via-white to-neutral-400">From problem</span><br />
                <span className="bg-gradient-to-r from-violet-400 via-sky-300 to-emerald-300 bg-clip-text text-transparent">to pilot</span><br />
                <span className="bg-gradient-to-r from-sky-300 to-emerald-300 bg-clip-text text-transparent">to procurement.</span>
              </h1>
              <p data-dust="para" className="text-neutral-400 text-[13px] sm:text-sm leading-[1.7] max-w-md mb-8" style={{ fontSize: 'clamp(0.8rem, 1.6vw, 0.9rem)', opacity: dustDone ? 1 : 0, transform: dustDone ? "translateY(0)" : "translateY(8px)", transition: "opacity 0.45s ease 0.22s,transform 0.45s ease 0.22s" }}>
                Departments publish outcome-based challenges. Recognised startups apply without turnover or prior-experience barriers. Pilots run in a governed sandbox, pay out on verified milestones, and scale on evidence — not on a two-year tender.
              </p>
              <div className="lp-hero-btns flex items-center gap-4 flex-wrap" style={{ opacity: dustDone ? 1 : 0, transform: dustDone ? "translateY(0)" : "translateY(8px)", transition: "opacity 0.45s ease 0.30s,transform 0.45s ease 0.30s" }}>
                <Link data-dust="btn1" to="/hub" preload="intent" className="inline-flex items-center justify-center gap-2.5 rounded-full bg-white text-black px-7 py-3.5 text-sm font-semibold hover:bg-neutral-100 transition-all shadow-[0_0_32px_rgba(255,255,255,0.1)] hover:shadow-[0_0_44px_rgba(255,255,255,0.18)]" style={{ minWidth: 160 }}>
                  <Rocket className="h-4 w-4" />Startup Hub
                </Link>
                <a data-dust="btn2" href="/scout" className="inline-flex items-center justify-center gap-2.5 rounded-full border border-violet-500/50 bg-violet-500/10 text-violet-300 px-7 py-3.5 text-sm font-semibold backdrop-blur-sm hover:bg-violet-500/20 hover:border-violet-400/70 transition-all" style={{ minWidth: 160 }}>
                  <Telescope className="h-4 w-4" />Department Hub
                </a>
              </div>
              <div className="lp-stats-row mt-12 flex items-center gap-8 text-xs text-neutral-500" style={{ opacity: dustDone ? 1 : 0, transition: "opacity 0.45s ease 0.40s" }}>
                <div><div data-dust="stat-num" className="text-white text-base font-semibold leading-tight">1,200+</div><div data-dust="stat-label" className="mt-0.5">recognised startups</div></div>
                <div className="h-7 w-px bg-white/10" />
                <div><div data-dust="stat-num" className="text-white text-base font-semibold leading-tight">16 weeks</div><div data-dust="stat-label" className="mt-0.5">challenge to pilot</div></div>
                <div className="h-7 w-px bg-white/10" />
                <div><div data-dust="stat-num" className="text-white text-base font-semibold leading-tight">26</div><div data-dust="stat-label" className="mt-0.5">departments</div></div>
              </div>
            </div>
            </div>
          </div>

        </Card>
      </div>
      </div>

      {/* ══ FEATURES ══ */}
      <div className="lp-fixed-section" style={{
        position: 'fixed',
        inset: 0,
        zIndex: 20,
        overflowY: 'auto',
        opacity: activeSectionIdx === 0 ? 1 : 0,
        transform: activeSectionIdx === 0 ? 'translateY(0)' : activeSectionIdx < 0 ? 'translateY(60px)' : 'translateY(-60px)',
        transition: 'opacity 500ms ease, transform 500ms cubic-bezier(0.4,0,0.2,1)',
        pointerEvents: activeSectionIdx === 0 ? 'auto' : 'none',
        background: '#020208'
      }}>
      {Math.abs(activeSectionIdx - 0) <= 1 && <OrbitingSystemCanvas />}
      <section id="features" className="section-full" style={{ background: "linear-gradient(180deg, rgba(8,6,20,1) 0%, rgba(4,4,14,1) 60%, rgba(2,4,14,1) 100%)" }}>
        <div className="ambient-blob" style={{ width: 600, height: 600, background: "#8b5cf6", top: "-10%", left: "-5%", opacity: 0.07 }} />
        <div className="ambient-blob" style={{ width: 500, height: 500, background: "#06b6d4", bottom: "5%", right: "0%", opacity: 0.06 }} />

        <div className={`section-inner ${SC}`} style={{ ...SS }}>
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 18px", borderRadius: 999, background: "rgba(139,92,246,.1)", border: "1px solid rgba(139,92,246,.25)", marginBottom: 20 }}>
              <Layers style={{ width: 12, height: 12, color: "#a78bfa" }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: "#a78bfa", letterSpacing: ".1em", textTransform: "uppercase" }}>Platform Overview</span>
            </div>
            <h2 style={{ fontSize: isMobile ? 21 : 30, fontWeight: 800, letterSpacing: "-.02em", margin: "0 0 10px", background: "linear-gradient(180deg,white 40%,rgba(255,255,255,.38))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Eight stages,<br />one governed pathway
            </h2>
            <p style={{ fontSize: 14, color: "rgba(255,255,255,.4)", maxWidth: 500, margin: "0 auto", lineHeight: 1.5 }}>
              From an unsolved departmental problem to a validated solution bought at scale — every step templated, scored and auditable.
            </p>
          </div>

          <div className="lp-features-grid" data-hscroll style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3,1fr)", gap: 16 }}>
            {[
              { Icon: GitBranch, color: "#8b5cf6", title: "Challenge Banking", desc: "A department turns a vague operational pain point into an outcome-based statement — baseline, target metric, sandbox parameters and pilot budget — from one standard template." },
              { Icon: Target, color: "#06b6d4", title: "Eligibility Screening", desc: "Recognised startups are verified against the national registry. Prior-turnover and prior-experience conditions are waived; technical and quality criteria are not." },
              { Icon: BarChart3, color: "#10b981", title: "Transparent Evaluation", desc: "Dual scoring — technical viability and innovation quotient — against a published rubric, by an independent subject-matter panel. Every score is recorded and auditable." },
              { Icon: Shield, color: "#f59e0b", title: "Governed Sandbox", desc: "A bounded live environment agreed before day one: anonymised data, defined scope, security clearance, IP retained by the startup, and a fixed exit date." },
              { Icon: TrendingUp, color: "#f472b6", title: "Milestone Payments", desc: "Tranches released against verified performance, not paperwork cycles — so a government pilot never turns into a cash-flow crisis for a small team." },
              { Icon: Globe, color: "#34d399", title: "Validated Scale-Up", desc: "An independent audit measures the pilot against its baseline, opening a compliant route to deploy across districts without restarting a multi-year tender." },
            ].map(({ Icon, color, title, desc }) => (
              <div key={title} className="lp-card-hover" style={{ borderRadius: 18, border: `1px solid ${color}18`, background: `linear-gradient(145deg,${color}07 0%,rgba(5,5,12,0.9) 100%)`, padding: "16px 18px", cursor: "default", position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg,transparent,${color}60,transparent)` }} />
                <div style={{ width: 36, height: 36, borderRadius: 10, background: `${color}16`, border: `1px solid ${color}30`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 10 }}>
                  <Icon style={{ width: 16, height: 16, color }} />
                </div>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: "white", margin: "0 0 5px" }}>{title}</h3>
                <p style={{ fontSize: 12.5, color: "rgba(255,255,255,.4)", lineHeight: 1.5, margin: 0 }}>{desc}</p>
              </div>
            ))}
          </div>
          {/* Mobile-only swipe affordance (shown via .lp-swipe-hint media rule) */}
          <div className="lp-swipe-hint" style={{ display: "none", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 14, fontSize: 11, fontWeight: 600, letterSpacing: ".08em", textTransform: "uppercase", color: "rgba(255,255,255,.32)" }}>
            <ArrowRight style={{ width: 13, height: 13, transform: "rotate(180deg)" }} />
            <span>Swipe to explore</span>
            <ArrowRight style={{ width: 13, height: 13 }} />
          </div>
        </div>
      </section>
      </div>

      {/* ══ FOUNDER POV ══ */}
      <div className="lp-fixed-section" style={{
        position: 'fixed',
        inset: 0,
        zIndex: 20,
        overflowY: 'auto',
        opacity: activeSectionIdx === 1 ? 1 : 0,
        transform: activeSectionIdx === 1 ? 'translateY(0)' : activeSectionIdx < 1 ? 'translateY(60px)' : 'translateY(-60px)',
        transition: 'opacity 500ms ease, transform 500ms cubic-bezier(0.4,0,0.2,1)',
        pointerEvents: activeSectionIdx === 1 ? 'auto' : 'none',
        background: '#020208'
      }}>
      {Math.abs(activeSectionIdx - 1) <= 1 && <PulsarCanvas />}
      <section id="founders" className="snap-section section-full" style={{ background: "linear-gradient(180deg, rgba(2,4,14,1) 0%, rgba(6,3,18,1) 50%, rgba(3,3,14,1) 100%)" }}>
        <div className="ambient-blob" style={{ width: 700, height: 700, background: "#8b5cf6", top: "-15%", right: "-10%", opacity: 0.06 }} />
        <div className="ambient-blob" style={{ width: 400, height: 400, background: "#a78bfa", bottom: "0%", left: "5%", opacity: 0.05 }} />

        <div className={`section-inner ${SC}`} style={{ ...SS }}>
          <div className="lp-two-col lp-founders-grid" style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: isMobile ? 24 : 80, alignItems: "center" }}>
            <div className="lp-founders-intro" style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 28 }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 18px", borderRadius: 999, background: "rgba(139,92,246,.1)", border: "1px solid rgba(139,92,246,.25)" }}>
                <Rocket style={{ width: 12, height: 12, color: "#a78bfa" }} />
                <span style={{ fontSize: 11, fontWeight: 700, color: "#a78bfa", letterSpacing: ".1em", textTransform: "uppercase" }}>For Startups</span>
              </div>
              <h2 style={{ fontSize: isMobile ? 23 : 32, fontWeight: 800, letterSpacing: "-.02em", margin: 0, lineHeight: 1.1 }}>
                <span style={{ background: "linear-gradient(135deg,white 40%,rgba(255,255,255,.5))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Skip the tender maze.</span><br />
                <span style={{ background: "linear-gradient(135deg,#a78bfa,#67e8f9)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Win the pilot on merit.</span>
              </h2>
              <p className="lp-founders-desc" style={{ fontSize: 15, color: "rgba(255,255,255,.45)", lineHeight: 1.75, margin: 0 }}>
                Government demand, made visible. See live departmental challenges, apply against a published rubric instead of a relationship, and know exactly what you must prove — and when you get paid — before you commit a single engineer.
              </p>
              <div className="lp-founders-checklist" style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%" }}>
                {[
                  ["Recognition auto-verified — no turnover proof", "#10b981"],
                  ["Prior-experience criteria waived by policy", "#06b6d4"],
                  ["FitScore™ — scored against the live challenge", "#8b5cf6"],
                  ["You keep your IP; the department gets a licence", "#f59e0b"],
                  ["Milestone payments released on verified delivery", "#f472b6"],
                ].map(([text, color]) => (
                  <div key={text} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <CheckCircle style={{ width: 15, height: 15, color, flexShrink: 0 }} />
                    <span style={{ fontSize: 14, color: "rgba(255,255,255,.6)" }}>{text}</span>
                  </div>
                ))}
              </div>
              <Link to="/hub" preload="intent" className="lp-btn" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "12px 28px", borderRadius: 999, background: "linear-gradient(90deg,#7c3aed,#0ea5e9)", color: "white", textDecoration: "none", fontSize: 14, fontWeight: 700, boxShadow: "0 4px 24px rgba(124,58,237,.35)" }}>
                Open Startup Hub <ArrowRight style={{ width: 14, height: 14 }} />
              </Link>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div className="lp-founder-cards" data-hscroll style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <GlassCard accentColor="#8b5cf6">
                <div style={{ display: "flex", gap: isMobile ? 12 : 20, alignItems: "flex-start", marginBottom: isMobile ? 8 : 20 }}>
                  <PersonAvatar initials="AP" gradient="linear-gradient(135deg,#4c1d95,#7c3aed,#a78bfa)" ringColor="#8b5cf6" size={isMobile ? 48 : 80} />
                  <div>
                    <p style={{ fontSize: 18, fontWeight: 800, color: "white", margin: "0 0 3px" }}>Ashutosh Palai</p>
                    <p style={{ fontSize: 13, color: "#a78bfa", margin: "0 0 8px", fontWeight: 600 }}>Founder · JalRakshak Systems</p>
                    <div style={{ display: "flex", gap: 5 }}>
                      {["Water Tech", "IoT", "Pilot Complete"].map(t => (
                        <span key={t} style={{ fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 999, background: "rgba(139,92,246,.12)", color: "#a78bfa", border: "1px solid rgba(139,92,246,.25)" }}>{t}</span>
                      ))}
                    </div>
                  </div>
                </div>
                <blockquote style={{ margin: 0, padding: isMobile ? "10px 14px" : "14px 18px", borderRadius: 12, background: "rgba(139,92,246,.06)", border: "1px solid rgba(139,92,246,.18)", borderLeft: "2px solid rgba(139,92,246,.6)" }}>
                  <p style={{ fontSize: isMobile ? 11.5 : 13.5, color: "rgba(255,255,255,.65)", lineHeight: isMobile ? 1.45 : 1.7, margin: isMobile ? "0 0 6px" : "0 0 10px", fontStyle: "italic" }}>
                    "We had bid twice before and been knocked out on the turnover clause — nobody ever read the technology. Here the rubric was published before we applied, and we were scored on one thing: whether we actually found the leaks."
                  </p>
                  <div style={{ display: "flex", gap: 3 }}>
                    {[1, 2, 3, 4, 5].map(i => <Star key={i} style={{ width: 11, height: 11, color: "#f59e0b", fill: "#f59e0b" }} />)}
                  </div>
                </blockquote>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: isMobile ? 8 : 10, marginTop: isMobile ? 6 : 18 }}>
                  {[["₹15L", "Pilot Value"], ["−34%", "Water Loss"], ["87", "FitScore™"]].map(([val, label]) => (
                    <div key={label} style={{ textAlign: "center", padding: isMobile ? "7px 0" : "10px 0", borderRadius: 10, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.06)" }}>
                      <p style={{ fontSize: isMobile ? 15 : 17, fontWeight: 900, color: "white", margin: 0 }}>{val}</p>
                      <p style={{ fontSize: 9, color: "rgba(255,255,255,.3)", margin: "3px 0 0", textTransform: "uppercase", letterSpacing: ".06em" }}>{label}</p>
                    </div>
                  ))}
                </div>
              </GlassCard>
              <GlassCard accentColor="#06b6d4" style={{ padding: "18px 22px" }}>
                <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                  <PersonAvatar initials="KS" gradient="linear-gradient(135deg,#0e4f6b,#0e7490,#22d3ee)" ringColor="#06b6d4" size={56} />
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 14, fontWeight: 700, color: "white", margin: "0 0 2px" }}>Kabir Sen</p>
                    <p style={{ fontSize: 11, color: "#22d3ee", margin: "0 0 6px" }}>Founder · TransitIQ · Pilot in progress</p>
                    <p style={{ fontSize: 12.5, color: "rgba(255,255,255,.45)", lineHeight: 1.6, margin: 0, fontStyle: "italic" }}>
                      "Knowing the second tranche date before we signed is what let us staff the pilot properly. Cash flow stopped being the risk."
                    </p>
                  </div>
                </div>
              </GlassCard>
              </div>
              {/* Mobile-only swipe affordance for the founder cards */}
              <div className="lp-swipe-hint" style={{ display: "none", alignItems: "center", justifyContent: "center", gap: 8, fontSize: 11, fontWeight: 600, letterSpacing: ".08em", textTransform: "uppercase", color: "rgba(255,255,255,.32)" }}>
                <ArrowRight style={{ width: 13, height: 13, transform: "rotate(180deg)" }} />
                <span>Swipe for more</span>
                <ArrowRight style={{ width: 13, height: 13 }} />
              </div>
            </div>
          </div>
        </div>
      </section>
      </div>

      {/* ══ GOVERNMENT DEPARTMENT POV ══ */}
      {/* NOTE: the section id stays "investors" and the CSS classes stay
          .lp-investors-* — they are wired to scroll anchors and styles.css.
          Only the visible copy is department-facing. */}
      <div className="lp-fixed-section" style={{
        position: 'fixed',
        inset: 0,
        zIndex: 20,
        overflowY: 'auto',
        opacity: activeSectionIdx === 2 ? 1 : 0,
        transform: activeSectionIdx === 2 ? 'translateY(0)' : activeSectionIdx < 2 ? 'translateY(60px)' : 'translateY(-60px)',
        transition: 'opacity 500ms ease, transform 500ms cubic-bezier(0.4,0,0.2,1)',
        pointerEvents: activeSectionIdx === 2 ? 'auto' : 'none',
        background: '#020208'
      }}>
      {Math.abs(activeSectionIdx - 2) <= 1 && <WormholeCanvas />}
      <section id="investors" className="section-full" style={{ background: "linear-gradient(180deg, rgba(3,3,14,1) 0%, rgba(2,6,14,1) 50%, rgba(2,5,12,1) 100%)" }}>
        <div className="ambient-blob" style={{ width: 600, height: 600, background: "#06b6d4", top: "-10%", left: "-8%", opacity: 0.06 }} />
        <div className="ambient-blob" style={{ width: 450, height: 450, background: "#10b981", bottom: "0%", right: "5%", opacity: 0.05 }} />

        <div className={`section-inner ${SC}`} style={{ ...SS }}>
          <div className="lp-investors-cols" data-hscroll style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: isMobile ? 24 : 56, alignItems: "center" }}>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <GlassCard accentColor="#06b6d4">
                <div style={{ display: "flex", gap: 14, alignItems: "flex-start", marginBottom: 14 }}>
                  <PersonAvatar initials="AM" gradient="linear-gradient(135deg,#0c4a6e,#0369a1,#38bdf8)" ringColor="#06b6d4" size={64} />
                  <div>
                    <p style={{ fontSize: 17, fontWeight: 800, color: "white", margin: "0 0 3px" }}>Aryan Mehta</p>
                    <p style={{ fontSize: 12, color: "#22d3ee", margin: "0 0 7px", fontWeight: 600 }}>Nodal Officer · Urban Infrastructure</p>
                    <div style={{ display: "flex", gap: 5 }}>
                      {["₹2Cr Innovation Budget", "4 Challenges", "2 Scaled"].map(t => (
                        <span key={t} style={{ fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 999, background: "rgba(6,182,212,.1)", color: "#22d3ee", border: "1px solid rgba(6,182,212,.25)" }}>{t}</span>
                      ))}
                    </div>
                  </div>
                </div>
                <blockquote style={{ margin: 0, padding: "12px 16px", borderRadius: 10, background: "rgba(6,182,212,.06)", border: "1px solid rgba(6,182,212,.15)", borderLeft: "2px solid rgba(6,182,212,.6)" }}>
                  <p style={{ fontSize: 13, color: "rgba(255,255,255,.65)", lineHeight: 1.6, margin: "0 0 8px", fontStyle: "italic" }}>
                    "The audit trail is what made this possible internally. Every score, every approval and every payment is on record — so I can defend choosing a two-year-old company to anyone who asks."
                  </p>
                  <div style={{ display: "flex", gap: 3 }}>
                    {[1, 2, 3, 4, 5].map(i => <Star key={i} style={{ width: 10, height: 10, color: "#f59e0b", fill: "#f59e0b" }} />)}
                  </div>
                </blockquote>
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "1fr 1fr 1fr", gap: 8, marginTop: 12 }}>
                  {[["14", "Applicants"], ["6", "Piloted"], ["2", "Scaled"]].map(([val, label]) => (
                    <div key={label} style={{ textAlign: "center", padding: "8px 0", borderRadius: 8, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.06)" }}>
                      <p style={{ fontSize: 16, fontWeight: 900, color: "white", margin: 0 }}>{val}</p>
                      <p style={{ fontSize: 9, color: "rgba(255,255,255,.3)", margin: "2px 0 0", textTransform: "uppercase", letterSpacing: ".06em" }}>{label}</p>
                    </div>
                  ))}
                </div>
              </GlassCard>

              <GlassCard accentColor="#10b981" style={{ padding: "16px 20px" }}>
                <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                  <PersonAvatar initials="PS" gradient="linear-gradient(135deg,#052e16,#065f46,#34d399)" ringColor="#10b981" size={52} />
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 13.5, fontWeight: 700, color: "white", margin: "0 0 2px" }}>Priya Sharma</p>
                    <p style={{ fontSize: 11, color: "#34d399", margin: "0 0 5px" }}>Deputy Secretary · Innovation Cell</p>
                    <p style={{ fontSize: 12, color: "rgba(255,255,255,.45)", lineHeight: 1.55, margin: 0, fontStyle: "italic" }}>
                      "We stopped writing specifications for products we didn't understand, and started publishing the outcome we needed. The market answered."
                    </p>
                  </div>
                </div>
              </GlassCard>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 18px", borderRadius: 999, background: "rgba(6,182,212,.1)", border: "1px solid rgba(6,182,212,.25)" }}>
                <Telescope style={{ width: 12, height: 12, color: "#22d3ee" }} />
                <span style={{ fontSize: 11, fontWeight: 700, color: "#22d3ee", letterSpacing: ".1em", textTransform: "uppercase" }}>For Departments</span>
              </div>
              <h2 style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-.02em", margin: 0, lineHeight: 1.15 }}>
                <span style={{ background: "linear-gradient(135deg,white 40%,rgba(255,255,255,.5))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Solve it in a quarter.</span><br />
                <span style={{ background: "linear-gradient(135deg,#22d3ee,#34d399)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Not a tender cycle.</span>
              </h2>
              <p style={{ fontSize: 14, color: "rgba(255,255,255,.45)", lineHeight: 1.65, margin: 0 }}>
                Department Hub is the governed workspace for innovation procurement. Publish an outcome, screen verified startups against a rubric, run the pilot inside a sandbox, and carry the evidence straight into a compliant purchase — with every decision on record.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {[
                  { Icon: Target, color: "#8b5cf6", title: "Procurement Cockpit", desc: "Innovation budget, committed spend, live pilots and shortlisted solutions at a glance." },
                  { Icon: GitBranch, color: "#06b6d4", title: "Challenge Pipeline", desc: "Every applicant tracked from screening through evaluation to sandbox, with rubric scores." },
                  { Icon: Shield, color: "#10b981", title: "Evaluation Room", desc: "Access-controlled review of confidential submissions, with security clearance and audit log." },
                  { Icon: PieChart, color: "#f59e0b", title: "Outcome Insights", desc: "Sector momentum, pilot success rate, score distribution and scale-up readiness." },
                ].map(({ Icon, color, title, desc }) => (
                  <div key={title} style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "10px 12px", borderRadius: 10, background: `${color}07`, border: `1px solid ${color}15` }}>
                    <div style={{ width: 32, height: 32, borderRadius: 9, background: `${color}16`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Icon style={{ width: 14, height: 14, color }} />
                    </div>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 700, color: "white", margin: "0 0 2px" }}>{title}</p>
                      <p style={{ fontSize: 12, color: "rgba(255,255,255,.4)", margin: 0 }}>{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <a href="/scout" className="lp-btn" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "11px 24px", borderRadius: 999, background: "linear-gradient(90deg,#0e7490,#059669)", color: "white", textDecoration: "none", fontSize: 13.5, fontWeight: 700, boxShadow: "0 4px 20px rgba(6,182,212,.3)", width: "fit-content" }}>
                Open Department Hub <ArrowRight style={{ width: 13, height: 13 }} />
              </a>
            </div>

          </div>
          <div className="lp-swipe-hint" style={{ display: "none", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 14, fontSize: 11, fontWeight: 600, letterSpacing: ".08em", textTransform: "uppercase", color: "rgba(255,255,255,.32)" }}>
            <ArrowRight style={{ width: 13, height: 13, transform: "rotate(180deg)" }} />
            <span>Swipe to explore</span>
            <ArrowRight style={{ width: 13, height: 13 }} />
          </div>
        </div>
      </section>
      </div>

      {/* ══ TESTIMONIALS ══ */}
      <div className="lp-fixed-section" style={{
        position: 'fixed',
        inset: 0,
        zIndex: 20,
        overflowY: 'auto',
        opacity: activeSectionIdx === 3 ? 1 : 0,
        transform: activeSectionIdx === 3 ? 'translateY(0)' : activeSectionIdx < 3 ? 'translateY(60px)' : 'translateY(-60px)',
        transition: 'opacity 500ms ease, transform 500ms cubic-bezier(0.4,0,0.2,1)',
        pointerEvents: activeSectionIdx === 3 ? 'auto' : 'none',
        background: '#020208'
      }}>
      {Math.abs(activeSectionIdx - 3) <= 1 && <TestimonialsWebGLCanvas />}
      <section id="testimonials" className="snap-section section-full" style={{ background: "linear-gradient(180deg, rgba(2,5,12,1) 0%, rgba(5,4,16,1) 100%)", overflow: "hidden" }}>
        <div className="ambient-blob" style={{ width: 500, height: 500, background: "#f59e0b", top: "10%", right: "5%", opacity: 0.04 }} />
        <div className="ambient-blob" style={{ width: 600, height: 600, background: "#8b5cf6", bottom: "-10%", left: "-5%", opacity: 0.05 }} />

        <div className={`section-inner ${SC}`} style={{ ...SS }}>
          <div style={{ textAlign: "center", marginBottom: 52 }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 18px", borderRadius: 999, background: "rgba(245,158,11,.1)", border: "1px solid rgba(245,158,11,.25)", marginBottom: 16 }}>
              <MessageSquare style={{ width: 12, height: 12, color: "#fbbf24" }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: "#fbbf24", letterSpacing: ".1em", textTransform: "uppercase" }}>Outcomes</span>
            </div>
            <h2 style={{ fontSize: isMobile ? 23 : 34, fontWeight: 800, letterSpacing: "-.02em", margin: 0, background: "linear-gradient(180deg,white 40%,rgba(255,255,255,.38))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Trusted on both sides of the table
            </h2>
          </div>
          <div className="lp-features-grid lp-mobile-carousel" data-hscroll style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3,1fr)", gap: 16 }}>
            {[
              { name: "Meera Iyer", role: "Founder · AirSense", initials: "MI", gradient: "linear-gradient(135deg,#064e3b,#065f46,#34d399)", ring: "#10b981", text: "FitScore™ showed us exactly which part of the rubric we were weak on before we submitted. We closed the security-clearance gap and cleared evaluation on the next cycle.", rating: 5 },
              { name: "Pawan Kumar", role: "CTO · GridSense", initials: "PK", gradient: "linear-gradient(135deg,#0c4a6e,#0369a1,#38bdf8)", ring: "#06b6d4", text: "The sandbox agreement was already drafted — IP terms, data scope, liability cap. We signed in nine days instead of negotiating for four months.", rating: 5 },
              { name: "Anjali Gupta", role: "Joint Director · Transport", initials: "AG", gradient: "linear-gradient(135deg,#4a1942,#7b2d72,#d946ef)", ring: "#d946ef", text: "I can see every applicant's score, who awarded it and on what criterion. That record is what lets me sign off without fearing an audit query two years later.", rating: 5 },
              { name: "Ankit Raj Singh", role: "Co-Founder · CivicLens", initials: "AK", gradient: "linear-gradient(135deg,#1c1917,#44403c,#a8a29e)", ring: "#f59e0b", text: "Three government pilots before this, three payment nightmares. This is the first one where the tranche released the same week the milestone was verified.", rating: 5 },
              { name: "Dev Patel", role: "Founder · CivicStack", initials: "DP", gradient: "linear-gradient(135deg,#3b0764,#6d28d9,#a78bfa)", ring: "#8b5cf6", text: "The challenge statement gave us the baseline, the target metric and the budget on day one. We knew whether we could win before spending a rupee on the bid.", rating: 5 },
              { name: "Chetan Sharma", role: "Under Secretary · Rural Dev.", initials: "CS", gradient: "linear-gradient(135deg,#1a2e05,#365314,#84cc16)", ring: "#84cc16", text: "The independent validation report is what convinced our finance wing. It wasn't the vendor's claim — it was a third party measuring against our own baseline.", rating: 5 },
            ].map((t) => (
              <div key={t.name} className="lp-card-hover" style={{ borderRadius: 18, border: `1px solid ${t.ring}35`, background: `linear-gradient(145deg,${t.ring}12 0%,rgba(8,8,20,0.85) 100%)`, padding: "20px", position: "relative", overflow: "hidden", backdropFilter: "blur(12px)", boxShadow: `0 8px 32px ${t.ring}18, inset 0 1px 0 rgba(255,255,255,0.06)` }}>
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg,transparent,${t.ring}80,transparent)` }} />
                <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 14 }}>
                  <PersonAvatar initials={t.initials} gradient={t.gradient} ringColor={t.ring} size={48} />
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 13.5, fontWeight: 700, color: "white", margin: 0 }}>{t.name}</p>
                    <p style={{ fontSize: 11.5, color: "rgba(255,255,255,.35)", margin: "2px 0 0" }}>{t.role}</p>
                  </div>
                  <div style={{ display: "flex", gap: 2 }}>
                    {Array.from({ length: t.rating }).map((_, j) => <Star key={j} style={{ width: 10, height: 10, color: "#f59e0b", fill: "#f59e0b" }} />)}
                  </div>
                </div>
                <p style={{ fontSize: 13, color: "rgba(255,255,255,.55)", lineHeight: 1.65, margin: 0, fontStyle: "italic" }}>"{t.text}"</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      </div>

      {/* ══ ABOUT ══ */}
      <div className="lp-fixed-section" style={{
        position: 'fixed',
        inset: 0,
        zIndex: 20,
        overflowY: 'auto',
        opacity: activeSectionIdx === 4 ? 1 : 0,
        transform: activeSectionIdx === 4 ? 'translateY(0)' : activeSectionIdx < 4 ? 'translateY(60px)' : 'translateY(-60px)',
        transition: 'opacity 500ms ease, transform 500ms cubic-bezier(0.4,0,0.2,1)',
        pointerEvents: activeSectionIdx === 4 ? 'auto' : 'none',
        background: '#020208'
      }}>
      {Math.abs(activeSectionIdx - 4) <= 1 && <AboutWebGLCanvas />}
      <section id="about" className="snap-section section-full" style={{ background: "linear-gradient(180deg, rgba(5,4,16,1) 0%, rgba(4,4,14,1) 100%)" }}>

        <style>{`
          @keyframes ab-in { from { opacity:0; transform:translateY(18px); } to { opacity:1; transform:translateY(0); } }
          @keyframes ab-glow { 0%,100%{opacity:.5} 50%{opacity:1} }
          .ab-principle { transition: border-color .22s ease, background .22s ease, transform .2s ease; }
          .ab-principle:hover { transform: translateY(-2px); }
          .ab-stat { transition: transform .2s ease, box-shadow .2s ease; }
          .ab-stat:hover { transform: translateY(-3px); }
        `}</style>

        {/* Subtle ambient */}
        <div style={{ position: "absolute", top: "10%", left: "-8%", width: 560, height: 560, borderRadius: "50%", background: "radial-gradient(circle,rgba(139,92,246,0.06),transparent 70%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: "8%", right: "-4%", width: 420, height: 420, borderRadius: "50%", background: "radial-gradient(circle,rgba(16,185,129,0.05),transparent 70%)", pointerEvents: "none" }} />

        <div className={`section-inner ${SC}`} style={{ ...SS, display: "flex", flexDirection: "column", justifyContent: "center", gap: isMobile ? 12 : 48 }}>

          {/* ── Top: headline left / principles right ── */}
          <div className="ab-top-grid" style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: isMobile ? 16 : 64, alignItems: "start" }}>

            {/* LEFT */}
            <div style={{ animation: "ab-in .6s ease both" }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "5px 16px", borderRadius: 999, background: "rgba(139,92,246,.08)", border: "1px solid rgba(139,92,246,.2)", marginBottom: isMobile ? 12 : 22 }}>
                <Award style={{ width: 11, height: 11, color: "#a78bfa" }} />
                <span style={{ fontSize: 10, fontWeight: 700, color: "#a78bfa", letterSpacing: ".12em", textTransform: "uppercase" }}>About Sanyog</span>
              </div>

              <h2 style={{ fontSize: isMobile ? 21 : 32, fontWeight: 800, letterSpacing: "-.025em", margin: isMobile ? "0 0 12px" : "0 0 22px", lineHeight: 1.12, background: "linear-gradient(150deg,#fff 30%,rgba(255,255,255,.4))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                Built so good ideas can reach public problems.
              </h2>

              <p style={{ fontSize: isMobile ? 13 : 15, color: "rgba(255,255,255,.38)", lineHeight: isMobile ? 1.55 : 1.85, margin: isMobile ? "0 0 12px" : "0 0 28px", maxWidth: 440 }}>
                {isMobile
                  ? "Departments couldn't buy innovation; startups couldn't get in the door — so we built the pathway between them."
                  : "Departments had problems they couldn't write a specification for, and startups had answers they couldn't legally sell. Procurement rules built for standard goods sat in between — so we built the pathway that connects the two."}
              </p>

              {/* Divider rule */}
              <div style={{ width: 40, height: 1, background: "linear-gradient(90deg,rgba(139,92,246,.6),transparent)", marginBottom: isMobile ? 12 : 22 }} />

              {/* Origin detail */}
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#a78bfa", boxShadow: "0 0 10px rgba(167,139,250,.8)", animation: "ab-glow 2.5s ease-in-out infinite" }} />
                <span style={{ fontSize: 12, color: "rgba(255,255,255,.28)", letterSpacing: ".04em" }}>Founded at <span style={{ color: "rgba(255,255,255,.55)", fontWeight: 600 }}>IIT Kharagpur</span> · 2026</span>
              </div>
            </div>

            {/* RIGHT — principle grid (2×2 desktop, swipe carousel on mobile) */}
            <div style={{ animation: "ab-in .6s .12s ease both" }}>
              <div className="ab-principle-grid" data-hscroll style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {([
                  { Icon: Zap,        color: "#f59e0b", title: "Outcome‑first",      desc: "Buy the result, not the specification." },
                  { Icon: Shield,     color: "#10b981", title: "Auditable by default", desc: "Every score and approval on record." },
                  { Icon: Globe,      color: "#06b6d4", title: "Both sides served",  desc: "Departments and startups, one pathway." },
                  { Icon: TrendingUp, color: "#8b5cf6", title: "Evidence over opinion", desc: "Scale only what was independently measured." },
                ] as { Icon: any; color: string; title: string; desc: string }[]).map(({ Icon, color, title, desc }) => (
                  <div key={title} className="ab-principle" style={{ padding: "20px 18px", borderRadius: 16, background: `linear-gradient(145deg,${color}0c,rgba(4,4,14,0.9))`, border: `1px solid ${color}20`, backdropFilter: "blur(12px)", position: "relative", overflow: "hidden" }}>
                    <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg,transparent,${color}55,transparent)` }} />
                    <div style={{ width: 36, height: 36, borderRadius: 11, background: `${color}14`, border: `1px solid ${color}28`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
                      <Icon style={{ width: 16, height: 16, color }} />
                    </div>
                    <p style={{ fontSize: 13, fontWeight: 700, color: "white", margin: "0 0 6px", letterSpacing: "-.01em" }}>{title}</p>
                    <p style={{ fontSize: 11.5, color: "rgba(255,255,255,.3)", margin: 0, lineHeight: 1.65 }}>{desc}</p>
                  </div>
                ))}
              </div>
              {/* Mobile-only swipe affordance */}
              <div className="lp-swipe-hint" style={{ display: "none", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 14, fontSize: 11, fontWeight: 600, letterSpacing: ".08em", textTransform: "uppercase", color: "rgba(255,255,255,.32)" }}>
                <ArrowRight style={{ width: 13, height: 13, transform: "rotate(180deg)" }} />
                <span>Swipe to explore</span>
                <ArrowRight style={{ width: 13, height: 13 }} />
              </div>
            </div>
          </div>

          {/* ── Bottom: stat row (slidable carousel on mobile) ── */}
          <div>
            <div className="ab-stats-grid" data-hscroll style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3,1fr)", gap: 14 }}>
              {([
                { value: "2026",   label: "Founded",     sub: "IIT KGP · Kharagpur",   color: "#a78bfa", ringColor: "#7c3aed" },
                { value: "1,200+", label: "Startups",    sub: "recognised & verified", color: "#22d3ee", ringColor: "#0891b2" },
                { value: "26",     label: "Departments", sub: "publishing challenges", color: "#34d399", ringColor: "#059669" },
              ] as { value: string; label: string; sub: string; color: string; ringColor: string }[]).map(({ value, label, sub, color, ringColor }) => (
                <div key={label} className="ab-stat" style={{ padding: "22px 24px", borderRadius: 18, background: `linear-gradient(145deg,${color}0e,rgba(4,4,14,0.95))`, border: `1px solid ${color}28`, backdropFilter: "blur(16px)", boxShadow: `0 8px 36px ${color}12, inset 0 1px 0 ${color}22`, position: "relative", overflow: "hidden", boxSizing: "border-box" }}>
                  <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg,transparent,${color}80,transparent)` }} />
                  <div style={{ position: "absolute", bottom: 0, right: 0, width: 120, height: 120, background: `radial-gradient(circle at bottom right,${color}0e,transparent 70%)`, pointerEvents: "none" }} />
                  <MiniPlanetCanvas color={color} ringColor={ringColor} size={26} />
                  <p style={{ fontSize: 28, fontWeight: 800, margin: "14px 0 2px", lineHeight: 1, letterSpacing: "-.03em", background: `linear-gradient(135deg,#fff 30%,${color})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{value}</p>
                  <p style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,.75)", margin: "0 0 3px" }}>{label}</p>
                  <p style={{ fontSize: 11, color, margin: 0, fontWeight: 500, opacity: .8, letterSpacing: ".02em" }}>{sub}</p>
                </div>
              ))}
            </div>
            {/* Mobile-only swipe affordance */}
            <div className="lp-swipe-hint" style={{ display: "none", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 14, fontSize: 11, fontWeight: 600, letterSpacing: ".08em", textTransform: "uppercase", color: "rgba(255,255,255,.32)" }}>
              <ArrowRight style={{ width: 13, height: 13, transform: "rotate(180deg)" }} />
              <span>Swipe stats</span>
              <ArrowRight style={{ width: 13, height: 13 }} />
            </div>
          </div>

        </div>
      </section>
      </div>

      {/* ══ CONTACT ══ */}
      <div className="lp-fixed-section" style={{
        position: 'fixed',
        inset: 0,
        zIndex: 20,
        overflowY: 'auto',
        opacity: activeSectionIdx === 5 ? 1 : 0,
        transform: activeSectionIdx === 5 ? 'translateY(0)' : activeSectionIdx < 5 ? 'translateY(60px)' : 'translateY(-60px)',
        transition: 'opacity 500ms ease, transform 500ms cubic-bezier(0.4,0,0.2,1)',
        pointerEvents: activeSectionIdx === 5 ? 'auto' : 'none',
        background: '#020208'
      }}>
      {Math.abs(activeSectionIdx - 5) <= 1 && <ContactWebGLCanvas />}
      <section id="contact" className="section-full" style={{ background: "linear-gradient(180deg, rgba(4,4,14,1) 0%, rgba(2,2,10,1) 100%)" }}>
        <div className="ambient-blob" style={{ width: 500, height: 500, background: "#06b6d4", top: "-5%", right: "0%", opacity: 0.05 }} />
        <div className="ambient-blob" style={{ width: 400, height: 400, background: "#8b5cf6", bottom: "10%", left: "5%", opacity: 0.05 }} />

        <div className={`section-inner ${SC}`} style={{ ...SS }}>
          <div style={{ textAlign: "center", marginBottom: 18 }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 18px", borderRadius: 999, background: "rgba(6,182,212,.1)", border: "1px solid rgba(6,182,212,.25)", marginBottom: 10 }}>
              <Mail style={{ width: 12, height: 12, color: "#22d3ee" }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: "#22d3ee", letterSpacing: ".1em", textTransform: "uppercase" }}>Get in Touch</span>
            </div>
            <h2 style={{ fontSize: isMobile ? 21 : 27, fontWeight: 800, letterSpacing: "-.02em", margin: "0 0 8px", background: "linear-gradient(180deg,white 40%,rgba(255,255,255,.38))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Let's solve something real
            </h2>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,.38)", maxWidth: 460, margin: "0 auto" }}>
              Whether you're a department with a problem worth solving, a startup ready to pilot, or an institution that can independently validate results — reach out.
            </p>
          </div>

          <div className="lp-two-col lp-contact-cols" data-hscroll style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: isMobile ? 24 : 28 }}>
            <GlassCard accentColor="#06b6d4">
              <h3 style={{ fontSize: 18, fontWeight: 700, color: "white", margin: "0 0 14px" }}>Send us a message</h3>
              {contactSent ? (
                <div style={{ textAlign: "center", padding: "32px 0" }}>
                  <CheckCircle style={{ width: 44, height: 44, color: "#10b981", margin: "0 auto 14px" }} />
                  <p style={{ fontSize: 17, fontWeight: 700, color: "white", margin: "0 0 6px" }}>Message sent!</p>
                  <p style={{ fontSize: 13.5, color: "rgba(255,255,255,.35)", margin: 0 }}>We'll get back to you within 24 hours.</p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {[{ id: "name", label: "Your Name", placeholder: "Ashutosh Palai", type: "text" }, { id: "email", label: "Email Address", placeholder: "you@organisation.in", type: "email" }].map(f => (
                    <div key={f.id}>
                      <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,.3)", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 6 }}>{f.label}</label>
                      <input
                        type={f.type} placeholder={f.placeholder}
                        value={contactForm[f.id as keyof typeof contactForm]}
                        onChange={e => setContactForm(p => ({ ...p, [f.id]: e.target.value }))}
                        className="lp-contact-input" style={{ width: "100%", padding: "10px 13px", borderRadius: 10, background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.09)", color: "white", fontSize: 14, outline: "none", boxSizing: "border-box", transition: "border-color .18s" }}
                        onFocus={e => (e.target.style.borderColor = "rgba(6,182,212,.45)")}
                        onBlur={e => (e.target.style.borderColor = "rgba(255,255,255,.09)")}
                      />
                    </div>
                  ))}
                  <div>
                    <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,.3)", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 6 }}>Message</label>
                    <textarea
                      rows={2} placeholder="Tell us about the problem you need solved, or the solution you've built..."
                      value={contactForm.message}
                      onChange={e => setContactForm(p => ({ ...p, message: e.target.value }))}
                      style={{ width: "100%", padding: "10px 13px", borderRadius: 10, background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.09)", color: "white", fontSize: 14, outline: "none", resize: "vertical", fontFamily: "inherit", boxSizing: "border-box", transition: "border-color .18s" }}
                      onFocus={e => (e.target.style.borderColor = "rgba(6,182,212,.45)")}
                      onBlur={e => (e.target.style.borderColor = "rgba(255,255,255,.09)")}
                    />
                  </div>
                  {contactError && <p style={{ fontSize: 12, color: '#f87171', margin: '-4px 0 0', textAlign: 'center' }}>{contactError}</p>}
                  <button
                    disabled={contactLoading}
                    onClick={async () => {
                      if (!contactForm.name || !contactForm.email || !contactForm.message) {
                        setContactError("Please fill in all fields."); return;
                      }
                      setContactError(""); setContactLoading(true);
                      try {
                        const res = await fetch('/api/contact', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify(contactForm),
                        });
                        if (res.ok) { setContactSent(true); }
                        else { const d = await res.json() as { error?: string }; setContactError(d.error ?? "Failed to send. Please try again."); }
                      } catch { setContactError("Network error. Please try again."); }
                      finally { setContactLoading(false); }
                    }}
                    className="lp-btn" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "12px", borderRadius: 10, background: contactLoading ? "rgba(14,116,144,.5)" : "linear-gradient(90deg,#0e7490,#0ea5e9)", color: "white", border: "none", cursor: contactLoading ? "not-allowed" : "pointer", fontSize: 14, fontWeight: 700, boxShadow: "0 4px 18px rgba(6,182,212,.3)", opacity: contactLoading ? 0.7 : 1 }}>
                    <Send style={{ width: 13, height: 13 }} />{contactLoading ? "Sending…" : "Send Message"}
                  </button>
                </div>
              )}
            </GlassCard>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div>
                <h3 style={{ fontSize: 17, fontWeight: 800, color: "white", margin: "0 0 6px" }}>We're here for you</h3>
                <p style={{ fontSize: 12.5, color: "rgba(255,255,255,.4)", lineHeight: 1.6, margin: 0 }}>
                  Our team typically responds within a few hours. For urgent partnership or onboarding enquiries, email us directly.
                </p>
              </div>
              {[
                { Icon: Mail, color: "#06b6d4", label: "Email", value: "hello@sanyog.in" },
                { Icon: Phone, color: "#10b981", label: "Phone", value: "+91 93481 53073" },
                { Icon: MapPin, color: "#8b5cf6", label: "Location", value: "IIT KGP Innovation Cell · Kharagpur, West Bengal" },
                { Icon: Globe, color: "#f59e0b", label: "Website", value: "incutrack.ashutosh-palai2005.workers.dev" },
              ].map(({ Icon, color, label, value }) => (
                <div key={label} style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: `${color}13`, border: `1px solid ${color}25`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Icon style={{ width: 16, height: 16, color }} />
                  </div>
                  <div>
                    <p style={{ fontSize: 10, color: "rgba(255,255,255,.25)", margin: "0 0 2px", textTransform: "uppercase", letterSpacing: ".07em", fontWeight: 700 }}>{label}</p>
                    <p style={{ fontSize: 13.5, color: "rgba(255,255,255,.65)", margin: 0, fontWeight: 500 }}>{value}</p>
                  </div>
                </div>
              ))}
              <div style={{ marginTop: 0, padding: "14px 18px", borderRadius: 16, background: "linear-gradient(135deg,rgba(139,92,246,.12),rgba(6,182,212,.08))", border: "1px solid rgba(139,92,246,.22)", position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: "linear-gradient(90deg,#7c3aed,#06b6d4)" }} />
                <p style={{ fontSize: 13.5, fontWeight: 700, color: "white", margin: "0 0 4px" }}>Ready to get started?</p>
                <p style={{ fontSize: 11.5, color: "rgba(255,255,255,.4)", margin: "0 0 10px", lineHeight: 1.5 }}>Departments publish a challenge. Startups apply in minutes. Free to get started.</p>
                <div style={{ display: "flex", gap: 8 }}>
                  <Link to="/hub" preload="intent" className="lp-btn" style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 5, padding: "9px 0", borderRadius: 9, background: "linear-gradient(90deg,#7c3aed,#0ea5e9)", color: "white", textDecoration: "none", fontSize: 12.5, fontWeight: 700 }}>
                    <Rocket style={{ width: 11, height: 11 }} />Startup Hub
                  </Link>
                  <a href="/scout" className="lp-btn" style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 5, padding: "9px 0", borderRadius: 9, background: "rgba(6,182,212,.12)", border: "1px solid rgba(6,182,212,.3)", color: "#22d3ee", textDecoration: "none", fontSize: 12.5, fontWeight: 700 }}>
                    <Telescope style={{ width: 11, height: 11 }} />Department Hub
                  </a>
                </div>
              </div>
            </div>
          </div>
          {/* Mobile-only swipe affordance for the two contact boxes */}
          <div className="lp-swipe-hint" style={{ display: "none", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 14, fontSize: 11, fontWeight: 600, letterSpacing: ".08em", textTransform: "uppercase", color: "rgba(255,255,255,.32)" }}>
            <ArrowRight style={{ width: 13, height: 13, transform: "rotate(180deg)" }} />
            <span>Swipe to explore</span>
            <ArrowRight style={{ width: 13, height: 13 }} />
          </div>
        </div>
      </section>
      </div>

      {/* ══ FOOTER ══ */}
      <div className="lp-fixed-section" style={{
        position: 'fixed',
        inset: 0,
        zIndex: 20,
        overflowY: 'auto',
        opacity: activeSectionIdx === 6 ? 1 : 0,
        transform: activeSectionIdx === 6 ? 'translateY(0)' : activeSectionIdx < 6 ? 'translateY(60px)' : 'translateY(-60px)',
        transition: 'opacity 500ms ease, transform 500ms cubic-bezier(0.4,0,0.2,1)',
        pointerEvents: activeSectionIdx === 6 ? 'auto' : 'none',
        background: '#020208'
      }}>
      {Math.abs(activeSectionIdx - 6) <= 1 && <StarFieldCanvas />}
      <footer style={{ borderTop: "1px solid rgba(255,255,255,.05)", padding: "50px 0 36px", background: "rgba(2,2,8,1)" }}>
        <div style={{ ...SS }}>
          <div className="lp-footer-grid" style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "2fr 1fr 1fr 1fr", gap: isMobile ? 24 : 48, marginBottom: 48 }}>
            {/* brand */}
            <div>
              <p style={{ fontSize: 13.5, color: "rgba(255,255,255,.32)", lineHeight: 1.75, maxWidth: 260, margin: "0 0 18px" }}>
                A compliant pathway from public problem to procured solution. Built for departments that need outcomes and startups that can deliver them.
              </p>
              <div style={{ display: "flex", gap: 6 }}>
                {["GovTech", "Urban", "AgriTech"].map(t => (
                  <span key={t} style={{ fontSize: 10, fontWeight: 700, padding: "3px 9px", borderRadius: 999, background: "rgba(139,92,246,.1)", color: "#a78bfa", border: "1px solid rgba(139,92,246,.2)" }}>{t}</span>
                ))}
              </div>
            </div>
            {/* regular columns */}
            {footerLinks.map(col => (
              <div key={col.heading}>
                <p style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,.22)", textTransform: "uppercase", letterSpacing: ".1em", margin: "0 0 14px" }}>{col.heading}</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                  {col.links.map(l => (
                    <a
                      key={l}
                      href={footerLinkUrls[l] ?? '#'}
                      onClick={e => {
                        e.preventDefault();
                        handleFooterLink(l);
                      }}
                      style={{ fontSize: 13, color: "rgba(255,255,255,.4)", textDecoration: "none", transition: "color .15s" }}
                      onMouseEnter={e => (e.currentTarget.style.color = "white")}
                      onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,.4)")}
                    >
                      {l}
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* footer bottom bar */}
          <div style={{ borderTop: "1px solid rgba(255,255,255,.05)", paddingTop: 24, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <p style={{ fontSize: 12.5, color: "rgba(255,255,255,.2)", margin: 0 }}>© 2026 Sanyog. All rights reserved. Built with ♦ at IIT KGP Innovation Cell.</p>
            <div style={{ display: "flex", gap: 5 }}>
              {["#8b5cf6", "#06b6d4", "#10b981", "#f59e0b"].map((c, i) => (
                <div key={i} style={{ width: 5, height: 5, borderRadius: "50%", background: c, opacity: 0.6 }} />
              ))}
            </div>
          </div>
          {footerNotice && (
            <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 60, padding: '12px 18px', borderRadius: 14, background: 'rgba(15,15,25,0.95)', border: '1px solid rgba(124,58,237,0.35)', boxShadow: '0 24px 64px rgba(0,0,0,0.45)', color: 'white', fontSize: 13, pointerEvents: 'none', maxWidth: 'min(90vw, 340px)', textAlign: 'center' }}>
              {footerNotice}
            </div>
          )}
        </div>
      </footer>
      </div>

    </main>
  );
}