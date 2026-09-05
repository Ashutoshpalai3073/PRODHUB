// ─── PathwayCosmos ────────────────────────────────────────────────────────────
// The 3D backdrop for the Challenge Board / Challenge Desk: a slow, deep
// star-sea in the platform's astronomical language — a ringed wireframe
// planet, an orange accretion disk (echoing the landing page), and small
// stage-coloured orbs drifting on orbits. Runs behind the tab content,
// pointer-transparent, DPR-capped, paused when the tab is hidden, fully
// disposed on unmount. On mobile it thins the field rather than dying.

import { useEffect, useRef } from 'react';
import * as THREE from 'three';

const ORB_COLORS = [0x8b5cf6, 0x06b6d4, 0xf59e0b, 0x10b981, 0xf472b6];

export function PathwayCosmos({ accent = '#8b5cf6' }: { accent?: string }) {
  const hostRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const isMobile = window.matchMedia('(max-width: 768px)').matches;
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const accentColor = new THREE.Color(accent);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 200);
    camera.position.set(0, 0.6, 14);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: !isMobile, powerPreference: 'low-power' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1 : 1.5));
    renderer.setClearColor(0x000000, 0);
    Object.assign(renderer.domElement.style, {
      position: 'absolute', inset: '0', width: '100%', height: '100%',
      display: 'block', pointerEvents: 'none',
    } as CSSStyleDeclaration);
    host.appendChild(renderer.domElement);

    const disposables: Array<{ dispose(): void }> = [];
    const track = <T extends { dispose(): void }>(d: T): T => { disposables.push(d); return d; };

    // ── star sea: two shells, white dust + accent sparks ──
    const makeStars = (count: number, radius: number, size: number, color: THREE.Color, opacity: number) => {
      const positions = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) {
        // random point in a thick spherical shell so stars exist at every depth
        const r = radius * (0.35 + 0.65 * Math.random());
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
        positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta) * 0.6; // flatten a little
        positions[i * 3 + 2] = r * Math.cos(phi);
      }
      const geo = track(new THREE.BufferGeometry());
      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      const mat = track(new THREE.PointsMaterial({
        color, size, sizeAttenuation: true, transparent: true, opacity,
        blending: THREE.AdditiveBlending, depthWrite: false,
      }));
      const pts = new THREE.Points(geo, mat);
      scene.add(pts);
      return pts;
    };
    const dust = makeStars(isMobile ? 700 : 2200, 40, 0.08, new THREE.Color(0xbfc6e0), 0.9);
    const sparks = makeStars(isMobile ? 200 : 520, 34, 0.17, accentColor, 0.95);

    // ── big soft glows: these bleed through the glass cards like nebulae ──
    const glowCanvas = document.createElement('canvas');
    glowCanvas.width = glowCanvas.height = 128;
    const gctx = glowCanvas.getContext('2d');
    if (gctx) {
      const grad = gctx.createRadialGradient(64, 64, 0, 64, 64, 64);
      grad.addColorStop(0, 'rgba(255,255,255,1)');
      grad.addColorStop(0.25, 'rgba(255,255,255,0.4)');
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      gctx.fillStyle = grad; gctx.fillRect(0, 0, 128, 128);
    }
    const glowTex = track(new THREE.CanvasTexture(glowCanvas));
    const glowSpecs: Array<[THREE.Color, number, [number, number, number]]> = [
      [accentColor, 10, [-5.5, 2.6, -10]],
      [new THREE.Color(0x06b6d4), 7.5, [6.5, -2.8, -11]],
      [new THREE.Color(0xf59e0b), 5.5, [-8.5, -2.6, -9]],
    ];
    const glows: THREE.Sprite[] = glowSpecs.map(([color, scale, pos]) => {
      const spr = new THREE.Sprite(track(new THREE.SpriteMaterial({
        map: glowTex, color, transparent: true, opacity: 0.42,
        blending: THREE.AdditiveBlending, depthWrite: false,
      })));
      spr.scale.setScalar(scale);
      spr.position.set(...pos);
      scene.add(spr);
      return spr;
    });

    // ── hero planet: glass wireframe icosahedron + inner glow + tilted rings ──
    const planet = new THREE.Group();
    const icoGeo = track(new THREE.IcosahedronGeometry(3.1, 1));
    planet.add(new THREE.Mesh(icoGeo, track(new THREE.MeshBasicMaterial({
      color: accentColor, wireframe: true, transparent: true, opacity: 0.45,
    }))));
    planet.add(new THREE.Mesh(track(new THREE.SphereGeometry(2.55, 24, 24)), track(new THREE.MeshBasicMaterial({
      color: accentColor, transparent: true, opacity: 0.10, depthWrite: false,
    }))));
    const ringMat = track(new THREE.MeshBasicMaterial({
      color: accentColor, transparent: true, opacity: 0.30, side: THREE.DoubleSide, depthWrite: false,
    }));
    const ring = new THREE.Mesh(track(new THREE.RingGeometry(4.1, 5.4, 64)), ringMat);
    ring.rotation.x = Math.PI / 2.25;
    planet.add(ring);
    const ring2 = new THREE.Mesh(track(new THREE.RingGeometry(5.6, 5.72, 64)), ringMat);
    ring2.rotation.x = Math.PI / 2.25;
    planet.add(ring2);
    planet.position.set(7.9, 1.9, -5.6);
    planet.rotation.z = -0.18;
    scene.add(planet);

    // ── accretion body: small dark sphere wrapped in a hot orange disk ──
    const accretion = new THREE.Group();
    accretion.add(new THREE.Mesh(track(new THREE.SphereGeometry(0.85, 20, 20)), track(new THREE.MeshBasicMaterial({
      color: 0x05050c,
    }))));
    accretion.add(new THREE.Mesh(track(new THREE.RingGeometry(1.05, 2.1, 48)), track(new THREE.MeshBasicMaterial({
      color: 0xf59e0b, transparent: true, opacity: 0.5, side: THREE.DoubleSide, depthWrite: false,
    }))));
    const accGlow = new THREE.Mesh(track(new THREE.RingGeometry(0.95, 1.12, 48)), track(new THREE.MeshBasicMaterial({
      color: 0xfbbf24, transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false,
    })));
    accretion.add(accGlow);
    accretion.rotation.x = Math.PI / 2.4;
    accretion.position.set(-7.6, -2.2, -7);
    scene.add(accretion);

    // ── drifting orbs: solutions in orbit, one per stage colour ──
    const orbs: Array<{ mesh: THREE.Mesh; r: number; speed: number; phase: number; y: number }> = [];
    ORB_COLORS.forEach((c, i) => {
      const mesh = new THREE.Mesh(
        track(new THREE.SphereGeometry(0.16 + (i % 3) * 0.07, 16, 16)),
        track(new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.85 })),
      );
      scene.add(mesh);
      orbs.push({ mesh, r: 5.5 + i * 1.7, speed: 0.05 + 0.018 * i, phase: (i / ORB_COLORS.length) * Math.PI * 2, y: (i % 2 ? -1 : 1) * (0.8 + i * 0.3) });
    });
    // faint connective orbit lines
    const orbitMat = track(new THREE.LineBasicMaterial({ color: accentColor, transparent: true, opacity: 0.13 }));
    orbs.forEach(o => {
      const pts: THREE.Vector3[] = [];
      for (let a = 0; a <= 64; a++) {
        const t = (a / 64) * Math.PI * 2;
        pts.push(new THREE.Vector3(Math.cos(t) * o.r, o.y + Math.sin(t * 2) * 0.15, Math.sin(t) * o.r * 0.55 - 4));
      }
      const g = track(new THREE.BufferGeometry().setFromPoints(pts));
      scene.add(new THREE.Line(g, orbitMat));
    });

    // ── sizing / parallax / loop ──
    let raf = 0;
    let running = true;
    const target = { x: 0, y: 0 };

    const resize = () => {
      const w = host.clientWidth || 1, h = host.clientHeight || 1;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(host);

    const onPointer = (e: PointerEvent) => {
      const rect = host.getBoundingClientRect();
      target.x = ((e.clientX - rect.left) / rect.width - 0.5) * 0.8;
      target.y = ((e.clientY - rect.top) / rect.height - 0.5) * 0.5;
    };
    if (!isMobile && !prefersReduced) window.addEventListener('pointermove', onPointer, { passive: true });

    const clock = new THREE.Clock();
    const tick = () => {
      if (!running) return;
      const t = clock.getElapsedTime();
      const dt = prefersReduced ? 0 : 1;
      dust.rotation.y = t * 0.008 * dt;
      sparks.rotation.y = -t * 0.014 * dt;
      planet.rotation.y = t * 0.05 * dt;
      accretion.rotation.z = t * 0.12 * dt;
      glows.forEach((g, i) => { g.position.y = glowSpecs[i][2][1] + Math.sin(t * 0.15 + i * 2.1) * 0.6; });
      orbs.forEach(o => {
        const a = o.phase + t * o.speed * dt;
        o.mesh.position.set(Math.cos(a) * o.r, o.y + Math.sin(a * 2) * 0.15, Math.sin(a) * o.r * 0.55 - 4);
      });
      camera.position.x += (target.x * 1.6 - camera.position.x) * 0.03;
      camera.position.y += (0.6 - target.y * 1.2 - camera.position.y) * 0.03;
      camera.lookAt(0, 0, -2);
      renderer.render(scene, camera);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    const onVisibility = () => {
      if (document.hidden) { running = false; cancelAnimationFrame(raf); }
      else if (!running) { running = true; raf = requestAnimationFrame(tick); }
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pointermove', onPointer);
      ro.disconnect();
      disposables.forEach(d => d.dispose());
      renderer.dispose();
      host.removeChild(renderer.domElement);
    };
  }, [accent]);

  return (
    <div
      ref={hostRef}
      aria-hidden
      style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden' }}
    />
  );
}
