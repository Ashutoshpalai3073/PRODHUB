// ─── StageVoyage ──────────────────────────────────────────────────────────────
// The stage cards, hidden IN the cosmos. At rest the space is blank — you only
// see the planetary system (that is why it was moved down into this area).
// Scrolling flies you forward: a glowing stage-coloured NODE approaches out of
// the starfield, and only when you get close to the node does its card
// materialise — crisp and full — then dissolve behind you as you fly on to the
// next. One card at a time, blank space between nodes, same 1→5 order the
// cards had vertically. The background camera (PathwayCosmos) shares the same
// flight, closing in on the planet as you travel.
//
// On touch devices it falls back to the plain vertical stack — the wheel is
// the whole interaction, so no wheel, no voyage.

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { voyage } from './voyageState';

const LEAD = 900;      // blank run-up before the first node — at rest, planet only
const SPACING = 1400;  // travel between nodes → real empty space between cards
const POP = 150;       // the card pops only in the final moments of arrival
const RANGE = 1600;    // how far out a node beacon is first visible

// far-field position of each node, as a fraction of the viewport — the
// "different parts of the space"; everything converges to centre on arrival
const SIDE_X = [0, 0.22, -0.22, 0.18, -0.16, 0.2, -0.2, 0.16];
const SIDE_Y = [0, -0.05, 0.06, -0.04, 0.05, -0.05, 0.04, -0.03];

export function StageVoyage({
  slides,
  labels = [],
  colors = [],
}: {
  slides: ReactNode[];
  labels?: string[];
  colors?: string[];
}) {
  const [coarse, setCoarse] = useState(false);
  const [idx, setIdx] = useState(0);       // nearest node (drives the rail)
  const [atCard, setAtCard] = useState(false); // a card is currently materialised
  const [flown, setFlown] = useState(false);   // user has scrolled at least once
  const viewportRef = useRef<HTMLDivElement>(null);
  const slideRefs = useRef<(HTMLDivElement | null)[]>([]);
  const nodeRefs = useRef<(HTMLDivElement | null)[]>([]);
  const fits = useRef<number[]>([]);  // per-card scale so the WHOLE card fits the view
  const cur = useRef(0);
  const tgt = useRef(0);
  const raf = useRef(0);
  const idxRef = useRef(0);
  const atRef = useRef(false);
  const flownRef = useRef(false);
  const kickRef = useRef<() => void>(() => {});

  useEffect(() => { setCoarse(window.matchMedia('(pointer: coarse)').matches); }, []);

  useEffect(() => {
    if (coarse) return;
    const vp = viewportRef.current;
    if (!vp) return;
    const n = slides.length;
    const max = LEAD + (n - 1) * SPACING;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Rigid cards, fully readable: measure each card's natural size and derive
    // the uniform scale that fits the ENTIRE card inside the viewport — the
    // primary purpose is reading what is written, so nothing may be clipped
    // and nothing may scroll inside a card.
    // Crispness rule: cards are never shrunk with transform:scale — that makes
    // the GPU downscale the rasterised texture and text goes soft. The fit is
    // applied with CSS zoom instead, which re-lays-out the card at the smaller
    // size so the text re-renders pixel-crisp, matching the rest of the page.
    const measure = () => {
      const vw = vp.clientWidth || 1, vh = vp.clientHeight || 1;
      for (let i = 0; i < n; i++) slideRefs.current[i]?.style.setProperty('zoom', '1');
      for (let i = 0; i < n; i++) {
        const el = slideRefs.current[i];
        if (!el) continue;
        fits.current[i] = Math.min(
          1,
          (vh * 0.94) / Math.max(1, el.offsetHeight),
          (vw * 0.985) / Math.max(1, el.offsetWidth),
        );
      }
      for (let i = 0; i < n; i++) slideRefs.current[i]?.style.setProperty('zoom', (fits.current[i] ?? 1).toFixed(3));
    };

    const apply = () => {
      // the cosmos camera closes in on the planet as this approaches 1
      voyage.progress = max > 0 ? Math.max(0, Math.min(1, cur.current / max)) : 0;
      const w = vp.clientWidth || 1, h = vp.clientHeight || 1;

      for (let i = 0; i < n; i++) {
        const depth = LEAD + i * SPACING - cur.current;   // 0 = arrived at node i
        const far = Math.max(0, Math.min(1, depth / RANGE));
        const x = SIDE_X[i % SIDE_X.length] * w * far;
        const y = SIDE_Y[i % SIDE_Y.length] * h * far;

        // ── the card: appears only when you are close to its node ──
        const el = slideRefs.current[i];
        if (el) {
          // Nothing shows on the approach — the beacon owns that phase. The
          // card POPS only once you have actually reached the node, then
          // dissolves after you fly past it.
          let op = 0;
          if (depth >= 0) op = depth > POP ? 0 : 1 - Math.pow(depth / POP, 1.3);
          else op = Math.max(0, 1 + depth / 300);         // passed → dissolves behind you
          el.style.transform = `translate(-50%, -50%) translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, ${(-depth).toFixed(1)}px)`;
          el.style.opacity = op.toFixed(3);
          el.style.visibility = op < 0.01 ? 'hidden' : 'visible';
          el.style.pointerEvents = Math.abs(depth) < 220 ? 'auto' : 'none';
          el.style.zIndex = String(1000 - Math.round(Math.abs(depth) / 10));
        }

        // ── the node beacon: the glowing point you fly toward; the card
        //    takes over from it on arrival ──
        const nd = nodeRefs.current[i];
        if (nd) {
          let nop = 0;
          if (depth > 110 && depth < RANGE + 150) {
            if (depth > 1000) nop = Math.max(0, (RANGE + 150 - depth) / (RANGE + 150 - 1000));
            else if (depth < 260) nop = Math.max(0, (depth - 110) / 150); // hands off to the card
            else nop = 1;
          }
          nd.style.transform = `translate(-50%, -50%) translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, ${(-depth).toFixed(1)}px)`;
          nd.style.opacity = nop.toFixed(3);
          nd.style.visibility = nop < 0.01 ? 'hidden' : 'visible';
        }
      }

      const nearest = Math.max(0, Math.min(n - 1, Math.round((cur.current - LEAD) / SPACING)));
      const at = Math.abs(LEAD + nearest * SPACING - cur.current) < 200;
      if (nearest !== idxRef.current) { idxRef.current = nearest; setIdx(nearest); }
      if (at !== atRef.current) { atRef.current = at; setAtCard(at); }
    };

    let running = false;
    const step = () => {
      const d = tgt.current - cur.current;
      cur.current = reduced ? tgt.current : cur.current + d * 0.09;
      if (Math.abs(tgt.current - cur.current) < 0.4) cur.current = tgt.current;
      apply();
      if (cur.current !== tgt.current) { raf.current = requestAnimationFrame(step); }
      else running = false;
    };
    const kick = () => { if (!running) { running = true; raf.current = requestAnimationFrame(step); } };
    kickRef.current = kick;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      tgt.current = Math.max(0, Math.min(max, tgt.current + e.deltaY * 1.15));
      if (!flownRef.current && tgt.current > 40) { flownRef.current = true; setFlown(true); }
      kick();
    };
    vp.addEventListener('wheel', onWheel, { passive: false });

    const remeasure = () => { measure(); apply(); };
    remeasure();
    // Re-fit when the viewport resizes; content changes (the pathway data
    // loads asynchronously) are caught by a mutation observer. Zoom writes are
    // attribute changes on the wrapper itself, which this observer ignores —
    // so measuring can never feed back into itself.
    const ro = new ResizeObserver(remeasure);
    ro.observe(vp);
    let moT: ReturnType<typeof setTimeout> | undefined;
    const mo = new MutationObserver(() => { clearTimeout(moT); moT = setTimeout(remeasure, 80); });
    slideRefs.current.forEach(el => { if (el) mo.observe(el, { childList: true, subtree: true, characterData: true }); });
    return () => {
      voyage.progress = 0;
      vp.removeEventListener('wheel', onWheel);
      cancelAnimationFrame(raf.current);
      ro.disconnect();
      mo.disconnect();
      clearTimeout(moT);
    };
  }, [coarse, slides.length]);

  const jump = (i: number) => {
    tgt.current = LEAD + i * SPACING;
    if (!flownRef.current) { flownRef.current = true; setFlown(true); }
    kickRef.current();
  };

  // Touch devices: the wheel IS the interaction — fall back to the plain stack.
  if (coarse) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {slides.map((s, i) => <div key={i}>{s}</div>)}
      </div>
    );
  }

  const accent = colors[idx] ?? '#a78bfa';

  return (
    <div ref={viewportRef} style={{ position: 'relative', flex: 1, minHeight: 260, overflow: 'hidden' }}>
      {/* the space the nodes and cards live in */}
      <div style={{ position: 'absolute', inset: 0, perspective: 1100 }}>
        {slides.map((_, i) => (
          <div
            key={`node-${i}`}
            ref={el => { nodeRefs.current[i] = el; }}
            aria-hidden
            style={{
              position: 'absolute', left: '50%', top: '48%', width: 16, height: 16, borderRadius: '50%',
              background: colors[i] ?? accent,
              boxShadow: `0 0 18px 5px ${colors[i] ?? accent}66, 0 0 46px 12px ${colors[i] ?? accent}2e`,
              transform: 'translate(-50%, -50%)', opacity: 0, visibility: 'hidden',
              willChange: 'transform, opacity', pointerEvents: 'none',
            }}
          />
        ))}
        {slides.map((s, i) => {
          const c = colors[i] ?? '#a78bfa';
          return (
            <div
              key={i}
              ref={el => { slideRefs.current[i] = el; }}
              style={{
                position: 'absolute', left: '50%', top: '48%',
                width: 'min(98%, 940px)',
                transform: 'translate(-50%, -50%)',
                willChange: 'transform, opacity',
                opacity: 0, visibility: 'hidden',
                /* clear-cut stage identity: solid ground, stage-coloured rim,
                   tint and aura — nothing faded */
                background: `radial-gradient(circle at 50% -25%, ${c}1f, transparent 55%), rgba(5,5,13,0.97)`,
                border: `1px solid ${c}4d`,
                borderRadius: 18,
                boxShadow: `0 30px 90px rgba(0,0,0,0.7), 0 0 70px ${c}2e`,
              }}
            >
              {s}
            </div>
          );
        })}
      </div>

      {/* stage rail — one light per node; click to fly straight there */}
      <div style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', display: 'flex', flexDirection: 'column', gap: 8, zIndex: 2000 }}>
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => jump(i)}
            title={labels[i] ?? `Stage ${i + 1}`}
            aria-label={labels[i] ?? `Stage ${i + 1}`}
            style={{
              width: 9, height: i === idx && atCard ? 26 : 9, borderRadius: 999, padding: 0, border: 'none', cursor: 'pointer',
              background: i === idx && atCard ? (colors[i] ?? accent) : 'rgba(255,255,255,0.18)',
              boxShadow: i === idx && atCard ? `0 0 10px ${colors[i] ?? accent}` : 'none',
              transition: 'height .25s ease, background .25s ease, box-shadow .25s ease',
            }}
          />
        ))}
      </div>

      {/* current stage name (only while its card is materialised) + wheel hint */}
      <div style={{ position: 'absolute', left: '50%', bottom: 8, transform: 'translateX(-50%)', zIndex: 2000, textAlign: 'center', pointerEvents: 'none' }}>
        {atCard && (
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: accent, textShadow: `0 0 12px ${accent}66` }}>
            {labels[idx] ?? ''}
          </span>
        )}
        {!flown && (
          <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', margin: '3px 0 0', animation: 'voyage-hint 2.2s ease-in-out infinite' }}>
            scroll to fly to the first node ✦
          </p>
        )}
      </div>
      <style>{'@keyframes voyage-hint{0%,100%{opacity:.35}50%{opacity:.9}}'}</style>
    </div>
  );
}
