// @ts-nocheck
import { createFileRoute } from '@tanstack/react-router';
import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { AuthGate } from '../components/AuthGate';
import * as THREE from 'three';
import { supabase, type VaultDoc } from '../lib/supabase';
import { initialStartups, upcomingEvents } from '../data';
import {
  LayoutDashboard, GitBranch, FolderKey, Users, CalendarDays, BarChart3,
  Plus, X, Edit3, Save, Search, ArrowRight, Bell, TrendingUp, DollarSign,
  Award, Clock, Filter, Star, Building2, Activity, Rocket,
  Shield, Lightbulb, Wallet, Upload, CheckCircle, Briefcase,
  ChevronRight, MoreHorizontal, Globe, Zap, Target, Lock, Eye, EyeOff, Key, UserCheck, AlertTriangle, Telescope, MessageSquare, Pencil, Trash2, FileText, Landmark
} from 'lucide-react';
import { PathwayTab } from '../components/pathway/PathwayTab';

export const Route = createFileRoute('/hub')({
  component: HubPage,
  head: () => ({ meta: [{ title: 'Sanyog — Startup Hub' }] }),
});

// ─── Extended data ────────────────────────────────────────────────────────────
const EXTENDED_STARTUPS = [
  ...initialStartups,
  { id: 'st-5', name: 'CivicLens', tagline: 'Road defect detection from municipal vehicle dashcams.', description: 'Dashcams already fitted to garbage trucks and water tankers survey road condition continuously; computer vision flags potholes and marks them on the ward GIS layer, replacing manual complaint-driven inspection.', stage: 'Screened', industry: 'Urban Infra', founder: 'Ankit Raj Singh', fundingGoal: 1500000, raised: 0, metrics: { members: 4, pitchScore: 74 } },
  { id: 'st-6', name: 'GridSense', tagline: 'Distribution transformer health monitoring.', description: 'Retrofit sensors on distribution transformers predict failures from load and oil-temperature signatures, letting the utility replace units before an outage instead of after one.', stage: 'In Pilot', industry: 'Energy', founder: 'Pawan Kumar', fundingGoal: 2500000, raised: 750000, metrics: { members: 5, pitchScore: 83 } },
];

// Procurement stages. These values are PERSISTED in `startups.stage` and in
// startup_advance_requests.current_stage/target_stage — changing a label here
// without running migration 018 will orphan existing rows from the kanban.
const STAGE_ORDER = ['Applied', 'Screened', 'In Pilot', 'Validated', 'Scaled'];
const STAGE_COLORS = { Applied: '#8b5cf6', Screened: '#06b6d4', 'In Pilot': '#f59e0b', Validated: '#10b981', Scaled: '#34d399' };
const STAGE_DIM = { Applied: 'rgba(139,92,246,.12)', Screened: 'rgba(6,182,212,.12)', 'In Pilot': 'rgba(245,158,11,.12)', Validated: 'rgba(16,185,129,.12)', Scaled: 'rgba(52,211,153,.12)' };

// Subject-matter experts who score submissions (Stage 3) and help applicants
// become pilot-ready. Drawn from technical institutions, standards/audit bodies
// and serving departments — not from investors.
const MENTORS = [
  { id: 'm1', name: 'Dr. Priya Sharma', role: 'Professor, Civil & Water Resources', company: 'VJTI Mumbai', avatar: 'PS', tags: ['Water', 'Sensors', 'Evaluation'], rating: 4.9, sessions: 47, avail: true, bio: 'Evaluates water-infrastructure pilots for state utilities. Sets baseline and measurement protocols for non-revenue water studies.' },
  { id: 'm2', name: 'Rahul Mehta', role: 'Lead Auditor', company: 'CERT-In empanelled auditor', avatar: 'RM', tags: ['Security', 'VAPT', 'Clearance'], rating: 4.8, sessions: 32, avail: false, bio: 'Runs pre-hosting security audits for government applications. Guides startups through clearance before a sandbox opens.' },
  { id: 'm3', name: 'Anjali Gupta', role: 'Joint Director (Retd.)', company: 'Transport Department', avatar: 'AG', tags: ['Mobility', 'Procurement', 'Tendering'], rating: 4.7, sessions: 28, avail: true, bio: '28 years in state transport administration. Advises startups on how departmental evaluation and work-order processes actually run.' },
  { id: 'm4', name: 'Dev Patel', role: 'Principal Consultant', company: 'STQC-empanelled test lab', avatar: 'DP', tags: ['Testing', 'SLA', 'Standards'], rating: 4.9, sessions: 61, avail: true, bio: 'Designs SLA measurement and functional test plans so pilot KPIs are objectively verifiable rather than self-reported.' },
  { id: 'm5', name: 'Dr. Sneha Reddy', role: 'Associate Professor, AI & Public Systems', company: 'IIT Bombay', avatar: 'SR', tags: ['AI/ML', 'Validation', 'Research'], rating: 4.8, sessions: 19, avail: false, bio: 'Independent validator for AI-enabled public-service pilots. Specialises in counterfactual study design and baseline construction.' },
  { id: 'm6', name: 'Arjun Nair', role: 'Data Protection Officer', company: 'State Data Centre', avatar: 'AN', tags: ['DPDP', 'Data', 'Governance'], rating: 4.6, sessions: 38, avail: true, bio: 'Advises on anonymisation, data-sharing agreements and DPDP Act obligations when citizen data enters a sandbox.' },
];
const MENTOR_COLORS: Record<string, string> = {
  'm1': '#8b5cf6',
  'm2': '#3b82f6',
  'm3': '#06b6d4',
  'm4': '#f59e0b',
  'm5': '#ec4899',
  'm6': '#10b981',
};
const BASE_EVENTS = [
  ...upcomingEvents,
  { id: 'ev-3', title: 'Sandbox Readiness Workshop', date: 'July 8, 2026', time: '11:00 AM IST', type: 'Workshop', location: 'MCCIA, Pune', description: 'What a department expects before it opens a sandbox: anonymisation and data-sharing protocol, CERT-In audit clearance, hosting constraints, and the security checklist that gates pilot start.' },
  { id: 'ev-4', title: 'Maharashtra GovTech Hackathon 2026', date: 'July 20, 2026', time: '09:00 AM IST', type: 'Hackathon', location: 'Bombay Exhibition Centre · Mumbai', description: '48-hour hackathon on live departmental problem statements across water, mobility and rural service delivery. Winning teams enter the challenge pipeline directly at the Screened stage.' },
  { id: 'ev-5', title: 'Nodal Officer Office Hours', date: 'August 3, 2026', time: '02:00 PM IST', type: 'Mentorship', location: 'Online · MS Teams', description: 'Open slots with nodal officers from participating departments. Ask what the baseline actually is, how the KPI will be measured, and who signs off — before you commit engineering time.' },
];

const VAULT_DOCS = [
  { name: 'AarogyaTrack_Solution_Brief', type: 'Deck', date: 'Jun 12', views: 28, status: 'Final', score: 91, file_url: '', file_path: '' },
  { name: 'TransitIQ_Technical_Spec', type: 'Doc', date: 'Jun 10', views: 14, status: 'Final', score: 78, file_url: '', file_path: '' },
  { name: 'JalRakshak_Pilot_Bundle', type: 'Bundle', date: 'Jun 8', views: 9, status: 'Final', score: 87, file_url: '', file_path: '' },
  { name: 'GridSense_Field_Demo', type: 'Video', date: 'Jun 5', views: 6, status: 'Review', score: 83, file_url: '', file_path: '' },
  { name: 'CivicLens_Costing_Sheet', type: 'Sheet', date: 'Jun 1', views: 21, status: 'Final', score: 74, file_url: '', file_path: '' },
  { name: 'FasalSetu_Compliance_Sheet', type: 'Sheet', date: 'May 28', views: 3, status: 'Draft', score: 69, file_url: '', file_path: '' },
];

// Departments and the pilot budget they have committed against live challenges.
// `status` values must stay in sync with STATUS_COLOR below.
const INVESTORS = [
  { name: 'Water Supply & Sanitation', amount: 2500000, status: 'Committed', type: 'Department' },
  { name: 'Urban Development', amount: 2500000, status: 'Committed', type: 'Department' },
  { name: 'Pune Municipal Corporation', amount: 1500000, status: 'Committed', type: 'Urban Body' },
  { name: 'Nagpur Municipal Corporation', amount: 1500000, status: 'Committed', type: 'Urban Body' },
  { name: 'Public Health', amount: 2500000, status: 'In Diligence', type: 'Department' },
  { name: 'Transport (MSRTC)', amount: 1500000, status: 'In Discussion', type: 'Undertaking' },
  { name: 'Agriculture', amount: 1500000, status: 'Committed', type: 'Department' },
];

const ACTIVITY = [
  { icon: GitBranch, text: 'GridSense advanced to In Pilot stage', time: '2m ago', color: '#8b5cf6' },
  { icon: Plus, text: 'FasalSetu applied — AgriTech challenge', time: '14m ago', color: '#06b6d4' },
  { icon: CalendarDays, text: 'Demo Day 2026 · 47 RSVPs confirmed', time: '1h ago', color: '#10b981' },
  { icon: Star, text: 'Expert panel · 3 evaluations pending', time: '2h ago', color: '#f59e0b' },
  { icon: DollarSign, text: 'AarogyaTrack · final tranche released', time: '5h ago', color: '#34d399' },
  { icon: Upload, text: 'JalRakshak brief opened 12× by departments', time: '8h ago', color: '#8b5cf6' },
];

// Analytics series. MRR_DATA now tracks cumulative pilot value released (₹ lakh)
// and USR_DATA tracks citizens served by live pilots (thousands). The constant
// names are kept because they are referenced throughout the Analytics tab.
const MRR_DATA = [{ m: 'Jan', v: 6 }, { m: 'Feb', v: 11 }, { m: 'Mar', v: 18 }, { m: 'Apr', v: 27 }, { m: 'May', v: 38 }, { m: 'Jun', v: 54 }];
const USR_DATA = [{ m: 'Jan', v: 120 }, { m: 'Feb', v: 210 }, { m: 'Mar', v: 380 }, { m: 'Apr', v: 620 }, { m: 'May', v: 940 }, { m: 'Jun', v: 1580 }];
const sectorData = [{ label: 'Water', val: 31, color: '#06b6d4' }, { label: 'Mobility', val: 24, color: '#f59e0b' }, { label: 'Health', val: 20, color: '#8b5cf6' }, { label: 'Agriculture', val: 15, color: '#10b981' }, { label: 'Other', val: 10, color: '#475569' }];


// ─── SVG Charts ───────────────────────────────────────────────────────────────
function AreaChart({ data, color, h = 90 }) {
  const max = Math.max(...data.map(d => d.v));
  const pts = data.map((d, i) => ({ x: (i / (data.length - 1)) * 100, y: 100 - (d.v / max) * 88 }));
  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
  const area = `${line} L100,100 L0,100 Z`;
  const id = `ac${color.replace(/[^a-z0-9]/gi, '')}${h}`;
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ height: h, width: '100%' }}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${id})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
      {pts.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="1.8" fill={color} vectorEffect="non-scaling-stroke" />)}
    </svg>
  );
}

function MiniSparkline({ data, color }) {
  const max = Math.max(...data.map(d => d.v));
  const pts = data.map((d, i) => ({ x: (i / (data.length - 1)) * 100, y: 100 - (d.v / max) * 90 }));
  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ height: 32, width: 72, flexShrink: 0 }}>
      <path d={line} fill="none" stroke={color} strokeWidth="2.5" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}



// ─── Three.js: Mini Crystal ───────────────────────────────────────────────────
function MiniCrystal() {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current; if (!canvas) return;
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(64, 64, false);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 10);
    camera.position.z = 2.8;
    const dl = new THREE.DirectionalLight(0xffffff, 1.2); dl.position.set(2, 3, 2); scene.add(dl);
    const pl = new THREE.PointLight(0x8b5cf6, 2.5, 8); pl.position.set(-1, 1, 1); scene.add(pl);
    scene.add(new THREE.AmbientLight(0xffffff, 0.3));
    const mesh = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.9, 0),
      new THREE.MeshPhongMaterial({ color: 0xa78bfa, emissive: 0x4c1d95, specular: 0xffffff, shininess: 130, transparent: true, opacity: 0.92 })
    );
    scene.add(mesh);
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(1.22, 0.014, 8, 64),
      new THREE.MeshBasicMaterial({ color: 0xc4b5fd, transparent: true, opacity: 0.5 })
    );
    ring.rotation.x = Math.PI / 2.4; scene.add(ring);
    let raf: number;
    let alive = true;
    const tick = () => {
      if (!alive) return;
      raf = requestAnimationFrame(tick);
      mesh.rotation.y += 0.013; mesh.rotation.x += 0.007; ring.rotation.z += 0.009;
      renderer.render(scene, camera);
    };
    tick();
    return () => { alive = false; cancelAnimationFrame(raf); renderer.dispose(); };
  }, []);
  return <canvas ref={ref} width={64} height={64} style={{ width: 64, height: 64 }} />;
}

// ─── Three.js: Constellation background ──────────────────────────────────────
function ConstellationBg() {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current; if (!canvas) return;
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false });
    renderer.setPixelRatio(1);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
    camera.position.z = 5;
    const resize = () => {
      const w = canvas.clientWidth || 900, h = canvas.clientHeight || 500;
      renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
    };
    resize();
    const nodes = [];
    for (let i = 0; i < 22; i++) {
      const p = new THREE.Vector3((Math.random() - .5) * 14, (Math.random() - .5) * 9, (Math.random() - .5) * 2);
      nodes.push(p);
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.045, 6, 6), new THREE.MeshBasicMaterial({ color: 0x8b5cf6, transparent: true, opacity: 0.45 }));
      m.position.copy(p); scene.add(m);
    }
    for (let i = 0; i < nodes.length; i++) for (let j = i + 1; j < nodes.length; j++) {
      if (nodes[i].distanceTo(nodes[j]) < 4.2)
        scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([nodes[i], nodes[j]]), new THREE.LineBasicMaterial({ color: 0x8b5cf6, transparent: true, opacity: 0.07 })));
    }
    window.addEventListener('resize', resize);
    let raf: number;
    let alive = true;
    const tick = () => {
      if (!alive) return;
      raf = requestAnimationFrame(tick);
      scene.rotation.y += 0.00025;
      renderer.render(scene, camera);
    };
    tick();
    return () => { alive = false; cancelAnimationFrame(raf); window.removeEventListener('resize', resize); renderer.dispose(); };
  }, []);
  return <canvas ref={ref} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', opacity: .55 }} />;
}

// ─── Three.js: Funding Orb ────────────────────────────────────────────────────
function FundingOrb({ progress = 0.64 }) {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current; if (!canvas) return;
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(130, 130, false);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 10);
    camera.position.z = 2.8;
    const hue = 0.75 - progress * 0.25;
    const col = new THREE.Color().setHSL(hue, 0.8, 0.6);
    const col2 = new THREE.Color(0x10b981);
    const pl = new THREE.PointLight(col, 3, 6); pl.position.set(0, 0, 1.5); scene.add(pl);
    const pl2 = new THREE.PointLight(col2, 1.5, 6); pl2.position.set(1, -1, 1); scene.add(pl2);
    scene.add(new THREE.AmbientLight(0xffffff, 0.3));
    const sphere = new THREE.Mesh(
      new THREE.SphereGeometry(0.65 + progress * 0.25, 32, 32),
      new THREE.MeshPhongMaterial({ color: col, emissive: col, emissiveIntensity: 0.2, transparent: true, opacity: 0.9, shininess: 90 })
    );
    scene.add(sphere);
    const comet = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 10), new THREE.MeshStandardMaterial({ color: 0xfbbf24, emissive: 0xfbbf24, emissiveIntensity: 2 }));
    scene.add(comet);
    const comet2 = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 10), new THREE.MeshStandardMaterial({ color: 0x34d399, emissive: 0x34d399, emissiveIntensity: 2 }));
    scene.add(comet2);
    let raf: number; let t = 0;
    let alive = true;
    const tick = () => {
      if (!alive) return;
      raf = requestAnimationFrame(tick); t += 0.022;
      sphere.rotation.y += 0.006;
      comet.position.set(Math.cos(t) * 1.3, Math.sin(t * 1.2) * 0.4, Math.sin(t) * 1.3);
      comet2.position.set(Math.cos(t + 2.1) * 1.1, Math.sin(t * 0.9 + 1) * 0.5, Math.sin(t + 2.1) * 1.1);
      pl.position.x = Math.sin(t * 0.7) * 1.5; pl.position.y = Math.cos(t * 0.9) * 1.5;
      renderer.render(scene, camera);
    };
    tick();
    return () => { alive = false; cancelAnimationFrame(raf); renderer.dispose(); };
  }, [progress]);
  return <canvas ref={ref} width={130} height={130} style={{ width: 130, height: 130, pointerEvents: 'none', touchAction: 'none', userSelect: 'none' }} />;
}

// ─── Three.js: Runway Globe ───────────────────────────────────────────────────
function RunwayGlobe() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current; if (!canvas) return;
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(108, 108, false);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 10);
    camera.position.z = 3.0;
    const pl = new THREE.PointLight(0xa78bfa, 3.5, 8); pl.position.set(2, 2, 1); scene.add(pl);
    const pl2 = new THREE.PointLight(0x10b981, 1.2, 8); pl2.position.set(-2, -1, 1); scene.add(pl2);
    scene.add(new THREE.AmbientLight(0xffffff, 0.15));
    const inner = new THREE.Mesh(
      new THREE.SphereGeometry(0.7, 32, 32),
      new THREE.MeshPhongMaterial({ color: 0x2d1b69, emissive: 0x7c3aed, emissiveIntensity: 0.4, shininess: 55, transparent: true, opacity: 0.88 })
    );
    scene.add(inner);
    const wire = new THREE.Mesh(
      new THREE.SphereGeometry(0.88, 14, 10),
      new THREE.MeshBasicMaterial({ color: 0x8b5cf6, wireframe: true, transparent: true, opacity: 0.26 })
    );
    scene.add(wire);
    [0, 0.31, -0.31, 0.60, -0.60].forEach(y => {
      const rr = Math.sqrt(Math.max(0, 0.88 ** 2 - y ** 2));
      if (rr < 0.05) return;
      const ring = new THREE.Mesh(new THREE.TorusGeometry(rr, 0.007, 6, 52), new THREE.MeshBasicMaterial({ color: 0xc4b5fd, transparent: true, opacity: 0.38 }));
      ring.position.y = y; ring.rotation.x = Math.PI / 2; scene.add(ring);
    });
    const longRing = new THREE.Mesh(new THREE.TorusGeometry(0.88, 0.007, 6, 52), new THREE.MeshBasicMaterial({ color: 0xa78bfa, transparent: true, opacity: 0.3 }));
    scene.add(longRing);
    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 8), new THREE.MeshStandardMaterial({ color: 0xfbbf24, emissive: 0xfbbf24, emissiveIntensity: 3.5 }));
    scene.add(dot);
    let raf: number, alive = true, t = 0;
    const tick = () => {
      if (!alive) return;
      raf = requestAnimationFrame(tick); t += 0.011;
      inner.rotation.y += 0.005; wire.rotation.y += 0.008; wire.rotation.x += 0.002;
      dot.position.set(Math.cos(t) * 0.88, Math.sin(t * 0.7) * 0.28, Math.sin(t) * 0.88);
      renderer.render(scene, camera);
    };
    tick();
    return () => { alive = false; cancelAnimationFrame(raf); renderer.dispose(); };
  }, []);
  return <canvas ref={ref} width={108} height={108} style={{ width: 108, height: 108 }} />;
}

// ─── Three.js: Vault Nebula Background ───────────────────────────────────────
function VaultNebulaField() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current; if (!canvas) return;
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false });
    renderer.setPixelRatio(1);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
    camera.position.z = 6;
    const resize = () => {
      const w = canvas.clientWidth || 900, h = canvas.clientHeight || 500;
      renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
    };
    resize();
    const N = 500;
    const pos = new Float32Array(N * 3);
    const col = new Float32Array(N * 3);
    const palette = [new THREE.Color(0x8b5cf6), new THREE.Color(0x06b6d4), new THREE.Color(0x10b981), new THREE.Color(0xf59e0b), new THREE.Color(0xf472b6)];
    for (let i = 0; i < N; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 20;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 14;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 5;
      const c = palette[Math.floor(Math.random() * palette.length)];
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const points = new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.055, vertexColors: true, transparent: true, opacity: 0.75 }));
    scene.add(points);
    const nodes: THREE.Vector3[] = [];
    for (let i = 0; i < 28; i++) {
      nodes.push(new THREE.Vector3((Math.random() - 0.5) * 18, (Math.random() - 0.5) * 11, (Math.random() - 0.5) * 2));
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 6), new THREE.MeshBasicMaterial({ color: 0x8b5cf6, transparent: true, opacity: 0.4 }));
      m.position.copy(nodes[i]); scene.add(m);
    }
    for (let i = 0; i < nodes.length; i++) for (let j = i + 1; j < nodes.length; j++) {
      if (nodes[i].distanceTo(nodes[j]) < 4.5)
        scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([nodes[i], nodes[j]]), new THREE.LineBasicMaterial({ color: 0x8b5cf6, transparent: true, opacity: 0.06 })));
    }
    const asteroids: THREE.Mesh[] = [];
    for (let i = 0; i < 10; i++) {
      const g = i % 2 === 0 ? new THREE.IcosahedronGeometry(0.05 + Math.random() * 0.09, 0) : new THREE.OctahedronGeometry(0.05 + Math.random() * 0.07, 0);
      const c = palette[Math.floor(Math.random() * palette.length)];
      const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: c, wireframe: true, transparent: true, opacity: 0.28 }));
      m.position.set((Math.random() - 0.5) * 16, (Math.random() - 0.5) * 9, (Math.random() - 0.5) * 2);
      scene.add(m); asteroids.push(m);
    }
    window.addEventListener('resize', resize);
    let raf: number;
    let alive = true;
    const tick = () => {
      if (!alive) return;
      raf = requestAnimationFrame(tick);
      points.rotation.y += 0.0003; points.rotation.x += 0.00012;
      asteroids.forEach((a, i) => { a.rotation.y += 0.009 + i * 0.002; a.rotation.x += 0.005; });
      renderer.render(scene, camera);
    };
    tick();
    return () => { alive = false; cancelAnimationFrame(raf); window.removeEventListener('resize', resize); renderer.dispose(); };
  }, []);
  return <canvas ref={ref} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', opacity: 0.45 }} />;
}

// ─── Three.js: Per-card Document Planet ──────────────────────────────────────
function DocPlanet({ typeColor, docType }: { typeColor: string; docType: string }) {
  const uid = `dp${typeColor.replace(/[^a-z0-9]/gi, '')}${docType}`;
  const shapes: Record<string, React.ReactNode> = {
    Deck: <polygon points="26,8 44,20 44,32 26,44 8,32 8,20" fill={typeColor} opacity="0.85" />,
    Sheet: <rect x="10" y="10" width="32" height="32" rx="4" fill={typeColor} opacity="0.85" />,
    Video: <ellipse cx="26" cy="26" rx="18" ry="10" fill="none" stroke={typeColor} strokeWidth="3" opacity="0.85" />,
    Bundle: <polygon points="26,6 46,18 46,34 26,46 6,34 6,18" fill={typeColor} opacity="0.85" />,
  };
  const shape = shapes[docType] || <polygon points="26,6 44,38 8,38" fill={typeColor} opacity="0.85" />;
  return (
    <div style={{ width: 52, height: 52, flexShrink: 0 }}>
      <svg width={52} height={52} viewBox="0 0 52 52">
        <defs>
          <radialGradient id={`${uid}g`} cx="35%" cy="30%" r="70%">
            <stop offset="0%" stopColor="white" stopOpacity="0.5" />
            <stop offset="100%" stopColor={typeColor} stopOpacity="0" />
          </radialGradient>
          <style>{`
            @keyframes ${uid}spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
            @keyframes ${uid}dot{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
            .${uid}shape{transform-box:fill-box;transform-origin:center;animation:${uid}spin 6s linear infinite}
            .${uid}ring{transform-box:fill-box;transform-origin:center;animation:${uid}dot 3s linear infinite}
          `}</style>
        </defs>
        {/* Glow */}
        <circle cx="26" cy="26" r="22" fill={typeColor} opacity="0.08" />
        {/* Shape */}
        <g className={`${uid}shape`}>{shape}</g>
        {/* Shine overlay */}
        <circle cx="26" cy="26" r="20" fill={`url(#${uid}g)`} />
        {/* Orbital ring */}
        <g className={`${uid}ring`}>
          <ellipse cx="26" cy="26" rx="24" ry="8" fill="none" stroke={typeColor} strokeWidth="1" opacity="0.5" />
          <circle cx="50" cy="26" r="2" fill={typeColor} opacity="0.9" />
        </g>
      </svg>
    </div>
  );
}

// ─── Three.js: Mentor Galaxy Background ──────────────────────────────────────
function MentorGalaxyBg() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current; if (!canvas) return;
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false });
    renderer.setPixelRatio(1);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
    camera.position.z = 7;
    const resize = () => {
      const w = canvas.clientWidth || 900, h = canvas.clientHeight || 500;
      renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
    };
    resize();
    const N = 700;
    const pos = new Float32Array(N * 3);
    const col = new Float32Array(N * 3);
    const starPalette = [new THREE.Color(0xffd4a0), new THREE.Color(0xa0c4ff), new THREE.Color(0xffffff), new THREE.Color(0xc8a0ff), new THREE.Color(0xa0ffd4)];
    for (let i = 0; i < N; i++) {
      const arm = Math.floor(Math.random() * 3);
      const r = 0.5 + Math.random() * 9;
      const angle = (arm * (Math.PI * 2 / 3)) + r * 0.35 + (Math.random() - 0.5) * 0.6;
      pos[i * 3] = Math.cos(angle) * r + (Math.random() - 0.5) * 1.2;
      pos[i * 3 + 1] = Math.sin(angle) * r + (Math.random() - 0.5) * 1.2;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 1.8;
      const c = starPalette[Math.floor(Math.random() * starPalette.length)];
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const galaxy = new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.058, vertexColors: true, transparent: true, opacity: 0.85 }));
    scene.add(galaxy);
    scene.add(new THREE.Mesh(new THREE.SphereGeometry(0.28, 16, 16), new THREE.MeshBasicMaterial({ color: 0xffd4a0, transparent: true, opacity: 0.35 })));
    const nodes: THREE.Vector3[] = [];
    for (let i = 0; i < 22; i++) {
      const a = Math.random() * Math.PI * 2, r = 2 + Math.random() * 5;
      nodes.push(new THREE.Vector3(Math.cos(a) * r, Math.sin(a) * r, (Math.random() - 0.5) * 0.8));
      const dot = new THREE.Mesh(new THREE.SphereGeometry(0.038, 6, 6), new THREE.MeshBasicMaterial({ color: 0xc8a0ff, transparent: true, opacity: 0.45 }));
      dot.position.copy(nodes[i]); scene.add(dot);
    }
    for (let i = 0; i < nodes.length; i++) for (let j = i + 1; j < nodes.length; j++) {
      if (nodes[i].distanceTo(nodes[j]) < 3.8)
        scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([nodes[i], nodes[j]]), new THREE.LineBasicMaterial({ color: 0xc8a0ff, transparent: true, opacity: 0.055 })));
    }
    window.addEventListener('resize', resize);
    let raf: number;
    let alive = true;
    const tick = () => {
      if (!alive) return;
      raf = requestAnimationFrame(tick);
      galaxy.rotation.z += 0.00018;
      renderer.render(scene, camera);
    };
    tick();
    return () => { alive = false; cancelAnimationFrame(raf); window.removeEventListener('resize', resize); renderer.dispose(); };
  }, []);
  return <canvas ref={ref} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', opacity: 0.5 }} />;
}

// ─── Three.js: Mentor Avatar Orb ─────────────────────────────────────────────
function MentorOrb({ available, color }: { available: boolean; color: string }) {
  const uid = `mo${color.replace(/[^a-z0-9]/gi, '')}`;
  return (
    <div style={{ width: 64, height: 64, flexShrink: 0 }}>
      <svg width={64} height={64} viewBox="0 0 64 64">
        <defs>
          <radialGradient id={`${uid}g`} cx="35%" cy="30%" r="65%">
            <stop offset="0%" stopColor="white" stopOpacity="0.9" />
            <stop offset="55%" stopColor={color} />
            <stop offset="100%" stopColor={color} stopOpacity={available ? "0.8" : "0.4"} />
          </radialGradient>
          <style>{`
            @keyframes ${uid}ring{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
            @keyframes ${uid}pulse{0%,100%{opacity:0.15}50%{opacity:0.3}}
            .${uid}r{transform-box:fill-box;transform-origin:center;animation:${uid}ring 3s linear infinite}
            .${uid}p{animation:${uid}pulse 2s ease-in-out infinite}
          `}</style>
        </defs>
        {/* Outer pulse for available */}
        {available && <circle className={`${uid}p`} cx="32" cy="32" r="30" fill={color} opacity="0.15" />}
        {/* Core sphere */}
        <circle cx="32" cy="32" r="22" fill={color} opacity={available ? "0.2" : "0.08"} />
        <circle cx="32" cy="32" r="20" fill={`url(#${uid}g)`} opacity={available ? 1 : 0.6} />
        <circle cx="26" cy="27" r="4" fill="white" opacity="0.2" />
        {/* Orbital ring — only for available */}
        {available && (
          <g className={`${uid}r`}>
            <ellipse cx="32" cy="32" rx="29" ry="9" fill="none" stroke={color} strokeWidth="1.2" opacity="0.6" />
            <circle cx="61" cy="32" r="2.5" fill={color} opacity="1" />
          </g>
        )}
      </svg>
    </div>
  );
}

// ─── Three.js: Accretion Disk Background ─────────────────────────────────────
function AccretionBg() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current; if (!canvas) return;
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false });
    renderer.setPixelRatio(1);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 100);
    camera.position.set(0, 4, 8); camera.lookAt(0, 0, 0);
    const resize = () => {
      const w = canvas.clientWidth || 900, h = canvas.clientHeight || 600;
      renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
    };
    resize();
    scene.add(new THREE.Mesh(new THREE.SphereGeometry(0.28, 16, 16), new THREE.MeshBasicMaterial({ color: 0x000005 })));
    const ehRing = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.032, 8, 52), new THREE.MeshBasicMaterial({ color: 0xa78bfa, transparent: true, opacity: 0.88 }));
    scene.add(ehRing);
    const layers = [
      { r0: 0.42, r1: 1.1, N: 200, col: new THREE.Color(1.0, 0.90, 0.55), speed: 0.013, thick: 0.07, op: 0.95 },
      { r0: 1.1, r1: 2.4, N: 240, col: new THREE.Color(1.0, 0.48, 0.14), speed: 0.007, thick: 0.14, op: 0.85 },
      { r0: 2.4, r1: 3.9, N: 190, col: new THREE.Color(0.62, 0.16, 0.78), speed: 0.004, thick: 0.22, op: 0.68 },
      { r0: 3.9, r1: 6.2, N: 140, col: new THREE.Color(0.18, 0.32, 0.96), speed: 0.002, thick: 0.36, op: 0.45 },
    ];
    const diskRings: { mesh: THREE.Points; speed: number }[] = [];
    layers.forEach(l => {
      const pos = new Float32Array(l.N * 3);
      for (let i = 0; i < l.N; i++) {
        const r = l.r0 + Math.random() * (l.r1 - l.r0);
        const a = Math.random() * Math.PI * 2;
        pos[i * 3] = Math.cos(a) * r; pos[i * 3 + 1] = (Math.random() - 0.5) * l.thick; pos[i * 3 + 2] = Math.sin(a) * r;
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color: l.col, size: 0.058, transparent: true, opacity: l.op }));
      scene.add(pts); diskRings.push({ mesh: pts, speed: l.speed });
    });
    for (const s of [1, -1]) {
      scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0.32 * s, 0), new THREE.Vector3(0, 5.5 * s, 0)]), new THREE.LineBasicMaterial({ color: 0xa78bfa, transparent: true, opacity: 0.16 })));
      const cone = new THREE.Mesh(new THREE.ConeGeometry(0.38, 4.2, 8, 1, true), new THREE.MeshBasicMaterial({ color: 0x8b5cf6, transparent: true, opacity: 0.045, side: THREE.DoubleSide }));
      cone.position.y = 2.4 * s; if (s === -1) cone.rotation.z = Math.PI; scene.add(cone);
    }
    scene.add(new THREE.PointLight(0xff7030, 2.8, 14));
    scene.add(new THREE.AmbientLight(0xffffff, 0.12));
    window.addEventListener('resize', resize);
    let raf: number;
    let alive = true;
    const tick = () => {
      if (!alive) return;
      raf = requestAnimationFrame(tick);
      diskRings.forEach(({ mesh, speed }) => { mesh.rotation.y += speed; });
      ehRing.rotation.z += 0.016;
      renderer.render(scene, camera);
    };
    tick();
    return () => { alive = false; cancelAnimationFrame(raf); window.removeEventListener('resize', resize); renderer.dispose(); };
  }, []);
  return <canvas ref={ref} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', opacity: 0.38 }} />;
}

// ─── Three.js: Armillary KPI Orb ─────────────────────────────────────────────
function ArmillaryOrb({ color }: { color: string }) {
  const uid = `ao${color.replace(/[^a-z0-9]/gi, '')}`;
  return (
    <div style={{ width: 52, height: 52, flexShrink: 0 }}>
      <svg width={52} height={52} viewBox="0 0 52 52">
        <defs>
          <radialGradient id={`${uid}g`} cx="35%" cy="30%" r="65%">
            <stop offset="0%" stopColor="white" stopOpacity="0.9" />
            <stop offset="60%" stopColor={color} />
            <stop offset="100%" stopColor={color} stopOpacity="0.7" />
          </radialGradient>
          <style>{`
            @keyframes ${uid}1{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
            @keyframes ${uid}2{from{transform:rotate(0deg)}to{transform:rotate(-360deg)}}
            @keyframes ${uid}3{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
            .${uid}r1{transform-box:fill-box;transform-origin:center;animation:${uid}1 3.2s linear infinite}
            .${uid}r2{transform-box:fill-box;transform-origin:center;animation:${uid}2 4.5s linear infinite}
            .${uid}r3{transform-box:fill-box;transform-origin:center;animation:${uid}3 2.1s linear infinite}
          `}</style>
        </defs>
        <g className={`${uid}r1`}>
          <ellipse cx="26" cy="26" rx="23" ry="23" fill="none" stroke={color} strokeWidth="1.2" opacity="0.55" />
          <circle cx="49" cy="26" r="2.2" fill={color} opacity="0.95" />
        </g>
        <g className={`${uid}r2`}>
          <ellipse cx="26" cy="26" rx="23" ry="7" fill="none" stroke={color} strokeWidth="1" opacity="0.45" />
        </g>
        <g className={`${uid}r3`}>
          <ellipse cx="26" cy="26" rx="17" ry="10" fill="none" stroke={color} strokeWidth="1" opacity="0.4" />
          <circle cx="43" cy="26" r="1.6" fill="white" opacity="0.85" />
        </g>
        <circle cx="26" cy="26" r="10" fill={color} opacity="0.12" />
        <circle cx="26" cy="26" r="8" fill={`url(#${uid}g)`} />
        <circle cx="22" cy="23" r="2.5" fill="white" opacity="0.22" />
      </svg>
    </div>
  );
}
// ─── Event Arena: 2D Canvas Background ────────────────────────────────────────
function EventArenaCanvasBg() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    let alive = true, raf = 0, lastT = 0;
    const FRAME = 1000 / 40;
    const resize = () => { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight; };
    resize();

    type Star = { x: number; y: number; r: number; a: number; phase: number; spd: number };
    const STARS: Star[] = Array.from({ length: 130 }, () => ({
      x: Math.random(), y: Math.random(),
      r: Math.pow(Math.random(), 2.5) * 1.8 + 0.15,
      a: 0.1 + Math.random() * 0.55, phase: Math.random() * Math.PI * 2, spd: 0.006 + Math.random() * 0.014,
    }));

    type Ring = { r: number; color: string; dotR: number; angle: number; spd: number; ry: number };
    const RINGS: Ring[] = [
      { r: 68,  color: '#8b5cf6', dotR: 5, angle: 0.3,          spd:  0.014, ry: 0.28 },
      { r: 108, color: '#06b6d4', dotR: 4, angle: Math.PI * 0.7, spd: -0.009, ry: 0.28 },
      { r: 152, color: '#f59e0b', dotR: 4, angle: Math.PI * 1.4, spd:  0.006, ry: 0.28 },
      { r: 200, color: '#10b981', dotR: 3, angle: Math.PI * 0.3, spd: -0.004, ry: 0.28 },
    ];

    const NEBULAE = [
      { fx: 0.78, fy: 0.22, r: 180, hex: '#5b21b6', a: 0.07 },
      { fx: 0.10, fy: 0.78, r: 130, hex: '#0e7490', a: 0.05 },
      { fx: 0.45, fy: 0.55, r: 100, hex: '#064e3b', a: 0.04 },
    ];

    const tick = (t: number) => {
      if (!alive) return;
      raf = requestAnimationFrame(tick);
      if (t - lastT < FRAME) return;
      lastT = t;
      const W = canvas.width, H = canvas.height;
      ctx.clearRect(0, 0, W, H);

      // nebulae
      for (const n of NEBULAE) {
        const x = n.fx * W, y = n.fy * H;
        const g = ctx.createRadialGradient(x, y, 0, x, y, n.r);
        g.addColorStop(0, `${n.hex}${Math.round(n.a * 255).toString(16).padStart(2, '0')}`);
        g.addColorStop(1, `${n.hex}00`);
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      }

      // stars
      for (const s of STARS) {
        const tw = 0.5 + 0.5 * Math.sin(t * s.spd * 0.001 + s.phase);
        ctx.beginPath(); ctx.arc(s.x * W, s.y * H, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${s.a * tw})`; ctx.fill();
      }

      // orrery
      const OCX = W * 0.78, OCY = H * 0.22;
      // center star
      const cg = ctx.createRadialGradient(OCX, OCY, 0, OCX, OCY, 22);
      cg.addColorStop(0, 'rgba(255,255,248,0.95)'); cg.addColorStop(0.35, 'rgba(200,175,255,0.55)'); cg.addColorStop(1, 'rgba(120,60,200,0)');
      ctx.fillStyle = cg; ctx.beginPath(); ctx.arc(OCX, OCY, 22, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(OCX, OCY, 5.5, 0, Math.PI * 2); ctx.fillStyle = 'rgba(255,255,250,1)'; ctx.fill();

      for (const ring of RINGS) {
        ring.angle += ring.spd;
        // ring ellipse
        ctx.beginPath(); ctx.ellipse(OCX, OCY, ring.r, ring.r * ring.ry, 0, 0, Math.PI * 2);
        ctx.strokeStyle = `${ring.color}25`; ctx.lineWidth = 1; ctx.stroke();
        // dot
        const px = OCX + Math.cos(ring.angle) * ring.r;
        const py = OCY + Math.sin(ring.angle) * ring.r * ring.ry;
        const dg = ctx.createRadialGradient(px, py, 0, px, py, ring.dotR * 2.8);
        dg.addColorStop(0, ring.color + 'ff'); dg.addColorStop(1, ring.color + '00');
        ctx.fillStyle = dg; ctx.beginPath(); ctx.arc(px, py, ring.dotR * 2.8, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(px, py, ring.dotR, 0, Math.PI * 2); ctx.fillStyle = ring.color; ctx.fill();
      }
    };

    raf = requestAnimationFrame(tick);
    window.addEventListener('resize', resize);
    return () => { alive = false; cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, []);
  return <canvas ref={ref} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }} />;
}

// AsteroidKPIRow
const ASTEROID_COLORS = ['#8b5cf6', '#10b981', '#f59e0b', '#06b6d4'];

function AsteroidKPIRow({ stats }: { stats: { total: number; raised: number; funded: number; avgScore: number } }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef({ pos: 0, dir: 1 });
  const rafRef = useRef<number>(0);

  const cards = [
    // Pilot budgets are in lakhs, so format in ₹L rather than ₹M.
    { label: 'Registered Solutions', val: stats.total, change: '+2 this month', sub: 'On the pathway', icon: Building2, color: ASTEROID_COLORS[0] },
    { label: 'Pilot Value Won', val: `₹${(stats.raised / 1e5).toFixed(1)}L`, change: '↑ +₹7.5L', sub: 'Milestones released', icon: Wallet, color: ASTEROID_COLORS[1] },
    { label: 'Validated / Scaled', val: stats.funded, change: '+2 this quarter', sub: 'Cleared audit', icon: Award, color: ASTEROID_COLORS[2] },
    { label: 'Avg FitScore™', val: stats.avgScore, change: '↑ +3.2 pts', sub: 'Challenge fit', icon: Target, color: ASTEROID_COLORS[3] },
  ];

  useEffect(() => {
    const dot = dotRef.current;
    const track = trackRef.current;
    if (!dot || !track) return;
    let alive = true;

    const animate = () => {
      if (!alive) return;
      const s = stateRef.current;
      const w = track.clientWidth;
      s.pos += s.dir * 1.8;
      if (s.pos >= w - 10) s.dir = -1;
      if (s.pos <= 0) s.dir = 1;
      const pct = s.pos / w;
      const col = pct < 0.25 ? ASTEROID_COLORS[0] : pct < 0.5 ? ASTEROID_COLORS[1] : pct < 0.75 ? ASTEROID_COLORS[2] : ASTEROID_COLORS[3];
      dot.style.left = `${s.pos}px`;
      dot.style.background = col;
      dot.style.boxShadow = `0 0 14px 6px ${col}90, 0 0 32px 14px ${col}35`;
      rafRef.current = requestAnimationFrame(animate);
    };

    animate();
    return () => { alive = false; cancelAnimationFrame(rafRef.current); };
  }, []);

  return (
    <div style={{ flexShrink: 0 }}>
      <style>{`
        @keyframes kpi-cube  { from{transform:rotateX(-22deg) rotateY(0deg)} to{transform:rotateX(-22deg) rotateY(360deg)} }
        @keyframes kpi-float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-4px)} }
        .kpi-card { transition: transform .22s ease, box-shadow .22s ease, border-color .22s ease; }
        .kpi-card:hover { transform: translateY(-3px); }
      `}</style>
      <div className="hub-stat-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16 }}>
        {cards.map(c => {
          const Icon = c.icon;
          return (
            <div key={c.label} className="kpi-card" style={{
              background: `linear-gradient(140deg, ${c.color}28 0%, ${c.color}0e 45%, rgba(255,255,255,0.015) 100%)`,
              border: `1px solid ${c.color}3a`, borderTop: `2px solid ${c.color}`, borderRadius: 16, padding: '18px 20px',
              position: 'relative', overflow: 'hidden',
              boxShadow: `0 10px 30px ${c.color}14, inset 0 1px 0 rgba(255,255,255,0.06)`,
            }}>
              <div style={{ position: 'absolute', top: 0, right: 0, width: 120, height: 120, borderRadius: '50%', background: `radial-gradient(circle,${c.color}33 0%,transparent 70%)`, transform: 'translate(35%,-35%)', pointerEvents: 'none' }} />
              {/* floating 3D wireframe cube */}
              <div aria-hidden style={{ position: 'absolute', bottom: -8, right: 10, width: 54, height: 54, perspective: 240, pointerEvents: 'none', opacity: 0.5, animation: 'kpi-float 6s ease-in-out infinite' }}>
                <div style={{ position: 'absolute', inset: 0, transformStyle: 'preserve-3d', animation: 'kpi-cube 16s linear infinite' }}>
                  {['rotateY(0deg)', 'rotateY(90deg)', 'rotateY(180deg)', 'rotateY(270deg)', 'rotateX(90deg)', 'rotateX(-90deg)'].map((r, i) => (
                    <div key={i} style={{ position: 'absolute', width: 54, height: 54, border: `1px solid ${c.color}55`, background: `${c.color}0c`, transform: `${r} translateZ(27px)` }} />
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10, position: 'relative', zIndex: 1 }}>
                <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.09em', margin: 0 }}>{c.label}</p>
                {/* 3D glossy coin icon */}
                <div style={{ width: 34, height: 34, borderRadius: 11, background: `radial-gradient(circle at 32% 28%, ${c.color}, ${c.color}77 58%, ${c.color}33)`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 4px 12px ${c.color}55, 0 0 18px ${c.color}40, inset 0 1px 2px rgba(255,255,255,0.5)`, border: `1px solid ${c.color}` }}>
                  <Icon style={{ width: 15, height: 15, color: '#fff', filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))' }} />
                </div>
              </div>
              <p style={{ fontSize: 28, fontWeight: 700, color: 'white', margin: 0, lineHeight: 1, position: 'relative', zIndex: 1 }}>{c.val}</p>
              <p style={{ fontSize: 10, fontWeight: 600, color: c.color, margin: 0, marginTop: 6, position: 'relative', zIndex: 1, filter: `drop-shadow(0 0 5px ${c.color}80)` }}>{c.change}</p>
              <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.22)', margin: 0, marginTop: 2, position: 'relative', zIndex: 1 }}>{c.sub}</p>
            </div>
          );
        })}
      </div>
      <div ref={trackRef} style={{ position: 'relative', height: 2, marginTop: 12, borderRadius: 1, background: 'linear-gradient(90deg,rgba(139,92,246,0.28) 0%,rgba(16,185,129,0.28) 33%,rgba(245,158,11,0.28) 66%,rgba(6,182,212,0.28) 100%)' }}>
        <div ref={dotRef} style={{ position: 'absolute', width: 10, height: 10, borderRadius: '50%', top: '50%', transform: 'translateY(-50%)', background: '#8b5cf6', pointerEvents: 'none' }} />
      </div>
    </div>
  );
}

// ─── Utilities ────────────────────────────────────────────────────────────────
const glass = "bg-white/[0.03] border border-white/[0.07] rounded-2xl";
const input = "w-full px-3 py-2 text-xs bg-black/40 border border-white/10 rounded-xl focus:outline-none focus:border-violet-500/60 text-white placeholder-white/20 transition";

function ScoreRing({ score, size = 36 }) {
  const r = 14, c = 2 * Math.PI * r, pct = (score / 100) * c;
  const col = score >= 90 ? '#10b981' : score >= 75 ? '#06b6d4' : score >= 60 ? '#f59e0b' : '#8b5cf6';
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" style={{ flexShrink: 0 }}>
      <circle cx="18" cy="18" r={r} fill="none" stroke="rgba(255,255,255,.07)" strokeWidth="3" />
      <circle cx="18" cy="18" r={r} fill="none" stroke={col} strokeWidth="3"
        strokeDasharray={`${pct} ${c}`} strokeLinecap="round" transform="rotate(-90 18 18)" />
      <text x="18" y="22" textAnchor="middle" fontSize="8" fontWeight="700" fill={col}>{score}</text>
    </svg>
  );
}

function FilterPills({ options, value, onChange }) {
  return (
    <div className="flex gap-2 flex-wrap items-center">
      {options.map(opt => (
        <button key={opt} onClick={() => onChange(opt)}
          className={`px-3.5 py-1.5 rounded-full text-xs font-medium border transition-all ${value === opt
            ? 'bg-white text-black border-transparent shadow-sm'
            : 'bg-white/[0.04] border-white/10 text-white/40 hover:text-white/70 hover:border-white/20'
            }`}>{opt}</button>
      ))}
    </div>
  );
}


// ─── HubPage ──────────────────────────────────────────────────────────────────
function HubPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [rsvpEvent, setRsvpEvent] = useState(null);
  const [rsvpedIds, setRsvpedIds] = useState([]);
  const [rsvpName, setRsvpName] = useState('');
  const [vcSearch, setVcSearch] = useState('');
  const [startups, setStartups] = useState(EXTENDED_STARTUPS);
  const [tab, setTab] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [editingDoc, setEditingDoc] = useState<typeof VAULT_DOCS[0] | null>(null);
  const [incuScoreState, setFitScoreState] = useState<{
    phase: 0 | 1 | 2;
    loading: boolean;
    score: number | null;
    band: string;
    remark: string;
    strengths: string[];
    improvements: string[];
    keywords: string[];
    message: string;
    readyForVCs: boolean;
    delta: number | null;
    startupName: string;
  } | null>(null);
  const [docStartupLinks, setDocStartupLinks] = useState<Record<string, string>>({});
  const [uploadGuardOpen, setUploadGuardOpen] = useState(false);
  // Shown when the founder has registered but is still awaiting admin approval.
  const [uploadPendingGuardOpen, setUploadPendingGuardOpen] = useState(false);

  // Per-tab filter states — each isolated
  const [pipelineSector, setPipelineSector] = useState('All');
  const [vaultType, setVaultType] = useState('All');
  const [vaultBrand, setVaultBrand] = useState<string | null>(null);
  const [mentorFilter, setMentorFilter] = useState('All');
  const [eventType, setEventType] = useState('All');
  const [allEvents, setAllEvents] = useState(BASE_EVENTS);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifAllRead, setNotifAllRead] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const [pipelineSectorOpen, setPipelineSectorOpen] = useState(false);
  const pipelineSectorRef = useRef<HTMLDivElement>(null);
  const [vaultTypeOpen, setVaultTypeOpen] = useState(false);
  const vaultTypeRef = useRef<HTMLDivElement>(null);
  const [mentorFilterOpen, setMentorFilterOpen] = useState(false);
  const mentorFilterRef = useRef<HTMLDivElement>(null);
  const [eventTypeOpen, setEventTypeOpen] = useState(false);
  const eventTypeRef = useRef<HTMLDivElement>(null);
  // Result picked from global search → surface (and highlight) that item in its tab.
  // `pinned` controls ORDER (stays at top until the next search). `focus` controls the
  // one-time glow animation only and auto-clears — keeping the two separate is what makes
  // the surfaced item STAY at the top instead of dropping back after the glow ends.
  const [pinned, setPinned] = useState<{ kind: string; key: string } | null>(null);
  const [focus, setFocus] = useState<{ kind: string; key: string } | null>(null);
  // Modals
  const [registerOpen, setRegisterOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  // Reason-gated startup removal — founder must state why before a startup can be
  // deleted, and re-adding afterwards goes back through admin approval.
  const [removeTarget, setRemoveTarget] = useState<any | null>(null);
  const [removeReason, setRemoveReason] = useState('');
  const [removeError, setRemoveError] = useState('');
  const [newS, setNewS] = useState({ name: '', tagline: '', description: '', founder: '', industry: 'SaaS', fundingGoal: '' });
  const [newSCustomIndustry, setNewSCustomIndustry] = useState('');
  const [editCustomIndustry, setEditCustomIndustry] = useState('');
  const [viewingDoc, setViewingDoc] = useState<VaultDoc | null>(null);
  const [uploadChoiceOpen, setUploadChoiceOpen] = useState(false);
  const [uploadMode, setUploadMode] = useState<'brand' | 'investor'>('brand');
  const [replaceConfirm, setReplaceConfirm] = useState<{ mode: 'brand' | 'investor'; existingDoc: any } | null>(null);
  const [signInPromptOpen, setSignInPromptOpen] = useState(false);
  const [signInPromptMsg, setSignInPromptMsg] = useState('');
  // ── Startup credential states ─────────────────────────────────────────────
  const [registerStep, setRegisterStep] = useState<1 | 2>(1);
  const [registerInitialStage, setRegisterInitialStage] = useState('Applied');
  const [ownerEmailMode, setOwnerEmailMode] = useState<'same' | 'different'>('same');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [ownerPassword, setOwnerPassword] = useState('');
  const [ownerPasswordConfirm, setOwnerPasswordConfirm] = useState('');
  const [ownerPasswordError, setOwnerPasswordError] = useState('');
  const [showOwnerPwd, setShowOwnerPwd] = useState(false);
  // ── Ownership confirmation modal ──────────────────────────────────────────
  const [ownershipConfirmOpen, setOwnershipConfirmOpen] = useState(false);
  const [ownershipConfirmPwd, setOwnershipConfirmPwd] = useState('');
  const [ownershipConfirmError, setOwnershipConfirmError] = useState('');
  const [ownershipConfirmLoading, setOwnershipConfirmLoading] = useState(false);
  const [ownershipConfirmCallback, setOwnershipConfirmCallback] = useState<(() => void) | null>(null);
  const [ownershipConfirmStartupId, setOwnershipConfirmStartupId] = useState('');
  // Per-startup session map: { [startupId]: expiryEpochMs }
  // A confirmed session is ONLY valid for the specific startup it was confirmed for.
  const [ownershipSessions, setOwnershipSessions] = useState<Record<string, number>>({});
  // ── Add Event modal ───────────────────────────────────────────────────────
  const [addEventOpen, setAddEventOpen] = useState(false);
  const [addEventStep, setAddEventStep] = useState<1 | 2>(1);
  const [addEventSubmitting, setAddEventSubmitting] = useState(false);
  const [addEventDone, setAddEventDone] = useState(false);
  const [addEventForm, setAddEventForm] = useState({
    title: '', type: 'Workshop', date: '', time: '', location: '',
    locationMode: 'physical' as 'physical' | 'online' | 'virtual',
    description: '', organiserName: '', organiserEmail: '',
    organiserOrg: '', maxCapacity: '', prize: '',
    applicationRequired: false, registrationDeadline: '',
  });
  const [addEventErrors, setAddEventErrors] = useState<Record<string, string>>({});
  // ── Admin panel ───────────────────────────────────────────────────────────
  const [pendingEvents, setPendingEvents] = useState<any[]>([]);
  const [adminEventsLoading, setAdminEventsLoading] = useState(false);
  const [adminEventAction, setAdminEventAction] = useState<Record<string, 'approving' | 'rejecting'>>({});
  const [pendingAdvances, setPendingAdvances] = useState<any[]>([]);
  const [adminAdvancesLoading, setAdminAdvancesLoading] = useState(false);
  const [adminAdvanceAction, setAdminAdvanceAction] = useState<Record<string, 'approving' | 'rejecting'>>({});
  // ── Startup Registration Approvals ────────────────────────────────────────
  const [pendingStartupRegs, setPendingStartupRegs] = useState<any[]>([]);
  const [pendingStartupRegsLoading, setPendingStartupRegsLoading] = useState(false);
  const [adminStartupRegAction, setAdminStartupRegAction] = useState<Record<string, 'approving' | 'rejecting'>>({});
  // ── Platform Activity Feed (admin) ─────────────────────────────────────────
  const [activityEvents, setActivityEvents] = useState<any[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);
  // ── VC Admin ───────────────────────────────────────────────────────────────
  const [pendingVCProfiles, setPendingVCProfiles] = useState<any[]>([]);
  const [pendingDealInterests, setPendingDealInterests] = useState<any[]>([]);
  const [pendingDiligenceReqs, setPendingDiligenceReqs] = useState<any[]>([]);
  const [shortlistEvents, setShortlistEvents] = useState<any[]>([]);
  const [adminVCLoading, setAdminVCLoading] = useState(false);
  const [adminVCAction, setAdminVCAction] = useState<Record<string, 'approving' | 'rejecting'>>({});
  // ── Contact Messages ───────────────────────────────────────────────────────
  const [contactMessages, setContactMessages] = useState<any[]>([]);
  const [contactMsgsLoading, setContactMsgsLoading] = useState(false);
  // ── Advance Request modal ─────────────────────────────────────────────────
  const [advanceRequestOpen, setAdvanceRequestOpen] = useState(false);
  const [advanceRequestStartup, setAdvanceRequestStartup] = useState<any>(null);
  const [advanceRequestForm, setAdvanceRequestForm] = useState({ targetStage: '', justification: '', proofFile: null as File | null });
  const [advanceRequestError, setAdvanceRequestError] = useState('');
  const [advanceRequestSubmitting, setAdvanceRequestSubmitting] = useState(false);
  const [advanceRequestDone, setAdvanceRequestDone] = useState(false);
  const openAddEvent = () => requireAuth('Sign in to submit an event to Sanyog.', () => { setAddEventStep(1); setAddEventDone(false); setAddEventForm({ title: '', type: 'Workshop', date: '', time: '', location: '', locationMode: 'physical', description: '', organiserName: user?.name ?? '', organiserEmail: user?.email ?? '', organiserOrg: userStartups[0]?.name ?? '', maxCapacity: '', prize: '', applicationRequired: false, registrationDeadline: '' }); setAddEventErrors({}); setAddEventOpen(true); });
  // ── Booking mentor ────────────────────────────────────────────────────────
  const [bookingMentor, setBookingMentor] = useState<typeof MENTORS[0] | null>(null);
  const [bookingForm, setBookingForm] = useState({ date: '', time: '', topic: '', message: '' });
  const [bookingDone, setBookingDone] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState('');
  const [uploadPending, setUploadPending] = useState(false);
  const [detectedFileType, setDetectedFileType] = useState<string | null>(null);
  const [selectedDocType, setSelectedDocType] = useState<string>('Doc');
  const [vaultDocs, setVaultDocs] = useState<VaultDoc[]>(VAULT_DOCS as unknown as VaultDoc[]);
  const [vaultLoading, setVaultLoading] = useState(true);

  // Pull the authoritative startup list from the server. Kept callable so we can
  // re-sync after an admin approves a registration in another session — otherwise
  // the client holds stale 'pending'/ownership data and the upload guard wrongly
  // asks an already-approved founder to register again.
  const refreshStartups = useCallback(async () => {
    const { data, error } = await supabase
      .from('startups')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data && data.length > 0) {
      const loaded = data.map(s => ({
        id: s.id, name: s.name, tagline: s.tagline,
        description: s.description, founder: s.founder,
        industry: s.industry, stage: s.stage,
        fundingGoal: s.funding_goal, raised: s.raised,
        metrics: { members: s.members, pitchScore: s.pitch_score },
        status: s.status ?? 'approved',
        owner_email: s.owner_email ?? null,
        created_by_email: s.created_by_email ?? null,
      }));
      setStartups(prev => {
        // Preserve any just-registered local startup whose POST may not be
        // queryable yet, so an in-flight registration is never dropped.
        const loadedIds = new Set(loaded.map(l => l.id));
        const localPending = prev.filter(p =>
          !EXTENDED_STARTUPS.find(es => es.id === p.id) && !loadedIds.has(p.id)
        );
        return [...localPending, ...loaded, ...EXTENDED_STARTUPS];
      });
      // Return the authoritative server list so callers (e.g. the upload guard)
      // can decide against fresh approval status without waiting for a re-render.
      return loaded;
    }
    return null;
  }, []);

  useEffect(() => { refreshStartups(); }, [refreshStartups]);

  // Re-sync approval status right when the founder heads to the Solution Vault to
  // upload, and whenever they return to the tab, so a fresh admin approval is
  // reflected without a manual reload.
  useEffect(() => {
    if (tab === 'vault') refreshStartups();
  }, [tab, refreshStartups]);

  useEffect(() => {
    const onFocus = () => refreshStartups();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [refreshStartups]);

  useEffect(() => {
    const fetchDocs = async () => {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .order('created_at', { ascending: false });
      if (!error && data && data.length > 0) {
        // Rebuild startup-doc links from startup_name column
        const links: Record<string, string> = {};
        data.forEach(doc => {
          if (doc.startup_name) links[doc.name] = doc.startup_name;
        });
        setDocStartupLinks(links);
        // Mock docs shown only if no real doc with same name exists
        const dbNames = new Set(data.map(d => d.name));
        const filteredMock = (VAULT_DOCS as unknown as VaultDoc[]).filter(d => !dbNames.has(d.name));
        setVaultDocs([...filteredMock, ...data]);
      } else {
        setVaultDocs(VAULT_DOCS as unknown as VaultDoc[]);
      }
      setVaultLoading(false);
    };
    fetchDocs();
  }, []);

  useEffect(() => {
    const closeMenus = (e: MouseEvent) => {
      if ((e.target as HTMLElement).closest('.vault-menu-trigger')) return;
      document.querySelectorAll('.vault-menu').forEach(m => {
        (m as HTMLElement).style.display = 'none';
      });
    };
    document.addEventListener('click', closeMenus);
    return () => document.removeEventListener('click', closeMenus);
  }, []);


  const handleUploadFile = (file: File) => {
    setUploadError('');
    const ext = file.name.split('.').pop()?.toLowerCase() || '';

    const EXT_TYPE_MAP: Record<string, string> = {
      pdf: 'Doc', pptx: 'Deck', ppt: 'Deck',
      xlsx: 'Sheet', xls: 'Sheet', csv: 'Sheet',
      mp4: 'Video', mov: 'Video', webm: 'Video',
      zip: 'Bundle', rar: 'Bundle',
      docx: 'Doc', doc: 'Doc',
    };

    const detected = EXT_TYPE_MAP[ext] || null;

    if (!detected) {
      setUploadError(`".${ext || 'unknown'}" is not a supported file type. Only these 5 categories are accepted:\n• Deck — .pptx, .ppt\n• Doc — .pdf, .docx, .doc\n• Sheet — .xlsx, .xls, .csv\n• Video — .mp4, .mov, .webm\n• Bundle — .zip, .rar`);
      setSelectedFile(null);
      setDetectedFileType(null);
      return;
    }

    // Enforce naming convention: must end with _public_vault or _private_vault before the extension
    const expectedSuffix = uploadMode === 'investor' ? '_private_vault' : '_public_vault';
    const baseName = file.name.replace(/\.[^.]+$/, '').toLowerCase();
    if (!baseName.endsWith(expectedSuffix)) {
      setUploadError(
        `File name must follow the required naming pattern for this vault category.`
      );
      setSelectedFile(null);
      setDetectedFileType(null);
      return;
    }

    setSelectedFile(file);
    setDetectedFileType(detected);
    setSelectedDocType(detected);

    const nameField = document.getElementById('vup-name') as HTMLInputElement | null;
    if (nameField) nameField.value = file.name.replace(/\.[^.]+$/, '');
  };

  const handleUploadSubmit = async () => {
    const nameEl = document.getElementById('vup-name') as HTMLInputElement | null;
    const typeEl = document.getElementById('vup-type') as HTMLSelectElement | null;
    const statusEl = document.getElementById('vup-status') as HTMLSelectElement | null;
    const name = nameEl?.value?.trim();
    if (!name) return;

    // Validate selected type matches actual file extension
    if (selectedFile) {
      const ext = selectedFile.name.split('.').pop()?.toLowerCase() || '';
      // pdf is ambiguous (can be Doc or Deck) — skip validation for it
      const strictTypeMap: Record<string, { type: string; allowed: string[] }> = {
        pptx: { type: 'Deck', allowed: ['Deck'] },
        ppt:  { type: 'Deck', allowed: ['Deck'] },
        xlsx: { type: 'Sheet', allowed: ['Sheet'] },
        xls:  { type: 'Sheet', allowed: ['Sheet'] },
        csv:  { type: 'Sheet', allowed: ['Sheet'] },
        mp4:  { type: 'Video', allowed: ['Video'] },
        mov:  { type: 'Video', allowed: ['Video'] },
        webm: { type: 'Video', allowed: ['Video'] },
        zip:  { type: 'Bundle', allowed: ['Bundle'] },
        rar:  { type: 'Bundle', allowed: ['Bundle'] },
        docx: { type: 'Doc', allowed: ['Doc'] },
        doc:  { type: 'Doc', allowed: ['Doc'] },
      };
      const rule = strictTypeMap[ext];
      const selected = typeEl?.value;
      if (rule && selected && !rule.allowed.includes(selected)) {
        setUploadError(`Type mismatch — a .${ext} file must be uploaded as "${rule.type}", not "${selected}".`);
        return;
      }
    }

    const btnEl = document.getElementById('vup-submit') as HTMLButtonElement | null;
    if (btnEl) { btnEl.textContent = 'Uploading…'; btnEl.disabled = true; }
    setUploadPending(true);
    setUploadError('');

    try {
      // Build FormData — file travels to the SERVER, which uploads it via service-role key
      const formData = new FormData();
      formData.append('name', name);
      formData.append('type', typeEl?.value || 'Doc');
      formData.append('status', statusEl?.value || 'Draft');
      // 'investor' = corporate pitch deck → surfaces in the Scout Hub diligence room; 'brand' = public
      formData.append('deck_type', uploadMode);
      if (selectedFile) {
        formData.append('file', selectedFile);
      }
      const latestStartup = startups.find(s => !EXTENDED_STARTUPS.find(es => es.id === s.id));
      if (latestStartup) formData.append('startup_name', latestStartup.name);
      // When replacing an existing deck, tell server to delete the old one first
      if (editingDoc && (editingDoc as any).id) {
        formData.append('replacing_id', String((editingDoc as any).id));
      }

      // POST as multipart — do NOT set Content-Type header (browser adds boundary)
      const response = await fetch('/api/documents', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => null);
        throw new Error(errorBody?.error || `Server error (${response.status})`);
      }

      const data = await response.json();
      const latestUserStartup = startups.find(s => !EXTENDED_STARTUPS.find(es => es.id === s.id));
      // Attach startup_name to local doc object so link survives refresh
      const docWithLink = { ...data, startup_name: latestUserStartup?.name || '', deck_type: uploadMode };
      setVaultDocs(prev => {
        if (editingDoc) {
          // Replace mode: remove the old doc (matched by id or name) and prepend the new one
          const filtered = prev.filter(doc =>
            (editingDoc as any).id
              ? (doc as any).id !== (editingDoc as any).id
              : doc.name !== editingDoc.name
          );
          return [docWithLink, ...filtered];
        }
        return [...prev, docWithLink];
      });
      setUploadError('');
      setUploadOpen(false);
      setEditingDoc(null);
      setSelectedFile(null);
      if (btnEl) { btnEl.textContent = 'Add to Solution Vault →'; btnEl.disabled = false; }

      // Store link by startup NAME (not id) so it matches after refresh
      if (latestUserStartup) {
        setDocStartupLinks(prev => ({ ...prev, [name]: latestUserStartup.name }));
      }
      // Phase 2 — rescore based on document

      // Phase 2 — rescore based on document
      const relatedStartup = startups[0];
      if (relatedStartup) {
        setFitScoreState({
          phase: 0, loading: true, score: null, band: '',
          remark: '', strengths: [], improvements: [],
          keywords: [], message: '', readyForVCs: false,
          delta: null, startupName: relatedStartup.name,
        });
        try {
          const fileExt = (selectedFile?.name ?? name).split('.').pop()?.toLowerCase() ?? '';
          const p2res = await fetch('/api/incuscore/phase2', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              previousScore: relatedStartup.metrics.pitchScore,
              startupName: relatedStartup.name,
              documentName: name,
              documentType: typeEl?.value || 'Doc',
              documentStatus: statusEl?.value || 'Draft',
              industry: relatedStartup.industry,
              description: relatedStartup.description ?? '',
              fileUrl: data.file_url ?? null,
              fileExt,
            }),
          });
          const p2result = await p2res.json();
          if (p2result.irrelevantDocument) {
            // Document is not startup pitch material — don't update score, show warning
            setFitScoreState(null);
            setUploadError(p2result.remark + '\n\n' + (p2result.documentInsights ?? []).join('\n'));
          } else {
            setStartups(prev => prev.map(s =>
              s.id === relatedStartup.id
                ? { ...s, metrics: { ...s.metrics, pitchScore: p2result.finalScore } }
                : s
            ));
            setFitScoreState({
              phase: 2,
              loading: false,
              score: p2result.finalScore,
              band: p2result.band,
              remark: p2result.remark,
              strengths: p2result.documentInsights ?? [],
              improvements: [],
              keywords: p2result.keywords ?? [],
              message: p2result.finalMessage,
              readyForVCs: p2result.readyForVCs,
              delta: p2result.delta,
              startupName: relatedStartup.name,
            });
          }
        } catch {
          setFitScoreState(null);
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Upload failed. Please retry.';
      setUploadError(message);
      console.error('Upload failed:', message);
      if (btnEl) { btnEl.textContent = 'Failed — retry'; btnEl.disabled = false; }
    } finally {
      setUploadPending(false);
    }
  };


  useEffect(() => {
    if (uploadOpen) {
      setSelectedFile(null);
      setUploadError('');
    }
  }, [uploadOpen]);

  const stats = useMemo(() => ({
    total: startups.length,
    funded: startups.filter(s => s.stage === 'Scaled').length,
    raised: startups.reduce((a, c) => a + c.raised, 0),
    avgScore: Math.round(startups.reduce((a, c) => a + c.metrics.pitchScore, 0) / startups.length),
  }), [startups]);

  const userStartups = useMemo(() =>
    startups.filter(s =>
      !EXTENDED_STARTUPS.find(es => es.id === s.id) &&
      (s.owner_email === user?.email || s.created_by_email === user?.email)
    ),
    [startups, user?.email]);
  const userRole = user?.role ?? 'visitor';
  const isVC = userRole === 'vc' || userRole === 'admin';
  const isFounder = userRole === 'founder' || userRole === 'admin';
  const isAdmin = userRole === 'admin';

  // Fetch pending events + advance requests whenever admin tab opens
  useEffect(() => {
    if (tab !== 'admin' || !isAdmin) return;
    const load = async () => {
      setAdminEventsLoading(true);
      setAdminAdvancesLoading(true);
      setAdminVCLoading(true);
      setContactMsgsLoading(true);
      setPendingStartupRegsLoading(true);
      setActivityLoading(true);
      try {
        const [evRes, advRes, vcRes, cmRes, srRes, actRes] = await Promise.all([
          fetch('/api/events/pending', { credentials: 'include' }),
          fetch('/api/startup-advance/pending', { credentials: 'include' }),
          fetch('/api/vc/admin/pending', { credentials: 'include' }),
          fetch('/api/contact/messages', { credentials: 'include' }),
          fetch('/api/startups/admin/pending', { credentials: 'include' }),
          fetch('/api/admin/activity', { credentials: 'include' }),
        ]);
        if (actRes.ok) { const d = await actRes.json(); setActivityEvents(Array.isArray(d.events) ? d.events : []); }
        if (evRes.ok) { const d = await evRes.json(); setPendingEvents(Array.isArray(d) ? d : []); }
        if (advRes.ok) { const d = await advRes.json(); setPendingAdvances(Array.isArray(d) ? d : []); }
        if (vcRes.ok) {
          const d = await vcRes.json();
          setPendingVCProfiles(Array.isArray(d.profiles) ? d.profiles : []);
          setPendingDealInterests(Array.isArray(d.interests) ? d.interests : []);
          setPendingDiligenceReqs(Array.isArray(d.diligence) ? d.diligence : []);
          setShortlistEvents(Array.isArray(d.shortlists) ? d.shortlists : []);
        }
        if (cmRes.ok) { const d = await cmRes.json(); setContactMessages(Array.isArray(d) ? d : []); }
        if (srRes.ok) { const d = await srRes.json(); setPendingStartupRegs(Array.isArray(d.startups) ? d.startups : []); }
      } catch { /* ignore */ }
      setAdminEventsLoading(false);
      setAdminAdvancesLoading(false);
      setAdminVCLoading(false);
      setContactMsgsLoading(false);
      setPendingStartupRegsLoading(false);
      setActivityLoading(false);
    };
    load();
  }, [tab, isAdmin]);

  // requireAuth: call this before any protected action
  const requireAuth = (msg: string, then: () => void) => {
    if (!user) { setSignInPromptMsg(msg); setSignInPromptOpen(true); return; }
    then();
  };
  // requireOwnership: call before founder-only actions on a specific startup.
  // Session is STARTUP-SCOPED — confirming password for Startup A never unlocks Startup B.
  const requireOwnership = (startupId: string, then: () => void) => {
    if (isAdmin) { then(); return; } // admin always passes
    if (!user) { setSignInPromptMsg('Sign in to manage your startup.'); setSignInPromptOpen(true); return; }
    // Only the startup's registered owner may proceed — silently block everyone else
    if (!userStartups.some(us => us.id === startupId)) return;
    const expiry = ownershipSessions[startupId] ?? 0;
    if (Date.now() < expiry) { then(); return; } // valid 30-min session for THIS startup
    setOwnershipConfirmStartupId(startupId);
    setOwnershipConfirmCallback(() => then);
    setOwnershipConfirmPwd('');
    setOwnershipConfirmError('');
    setOwnershipConfirmOpen(true);
  };
  // Clear all ownership sessions whenever the logged-in account changes (login / logout)
  useEffect(() => { setOwnershipSessions({}); }, [user?.email]);

  const totalCommitted = INVESTORS.filter(i => i.status === 'Committed').reduce((a, c) => a + c.amount, 0);
  const totalTarget = 60000000;
  const fundingProgress = totalCommitted / totalTarget;
  const maxInvestor = Math.max(...INVESTORS.map(i => i.amount));

  // Filtered data for each tab
  const filteredPipeline = useMemo(() => startups.filter(s => {
    const q = search.toLowerCase().trim();
    const matchSearch = !q || s.name.toLowerCase().includes(q);
    const matchSector = pipelineSector === 'All' || s.industry === pipelineSector;
    const isOwner = s.owner_email === user?.email || s.created_by_email === user?.email;
    const visible = (s as any).status !== 'pending' || isOwner || isAdmin;
    return matchSearch && matchSector && visible;
  }), [startups, search, pipelineSector, user, isAdmin]);

  const filteredDocs = useMemo(() =>
    vaultDocs.filter(d =>
      (vaultType === 'All' || d.type === vaultType) &&
      (!vaultBrand || d.name.toLowerCase().includes(vaultBrand.toLowerCase()))
    ),
    [vaultDocs, vaultType, vaultBrand]);

  // ── Global search across all 4 domains — each result routes to its own tab ──
  const searchGroups = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [] as any[];
    const startupHits = startups.filter(s =>
      s.name.toLowerCase().includes(q) || (s.founder || '').toLowerCase().includes(q) || (s.industry || '').toLowerCase().includes(q) || (s.tagline || '').toLowerCase().includes(q)
    ).slice(0, 6);
    const docHits = vaultDocs.filter(d =>
      (d.name || '').toLowerCase().includes(q) || (d.type || '').toLowerCase().includes(q) || ((d as any).startup_name || '').toLowerCase().includes(q)
    ).slice(0, 6);
    const mentorHits = MENTORS.filter(m =>
      m.name.toLowerCase().includes(q) || m.role.toLowerCase().includes(q) || m.company.toLowerCase().includes(q) || m.tags.some(t => t.toLowerCase().includes(q))
    ).slice(0, 6);
    const eventHits = allEvents.filter(e =>
      (e.title || '').toLowerCase().includes(q) || (e.type || '').toLowerCase().includes(q) || (e.location || '').toLowerCase().includes(q)
    ).slice(0, 6);
    return [
      { kind: 'startup', label: 'Startups', dest: 'Pipeline', color: '#8b5cf6', items: startupHits },
      { kind: 'doc', label: 'Documents', dest: 'Solution Vault', color: '#06b6d4', items: docHits },
      { kind: 'mentor', label: 'Mentors', dest: 'Expert Network', color: '#10b981', items: mentorHits },
      { kind: 'event', label: 'Events', dest: 'Event Arena', color: '#f59e0b', items: eventHits },
    ].filter(g => g.items.length);
  }, [search, startups, vaultDocs, allEvents]);
  const searchTotal = useMemo(() => searchGroups.reduce((a, g) => a + g.items.length, 0), [searchGroups]);

  // Route a chosen result to its tab and flag it to be surfaced/highlighted there
  const handleSearchPick = (kind: string, item: any) => {
    setSearch(''); setSearchOpen(false);
    // The key identifies the item within its list. `pinned` keeps it at the top until the
    // NEXT pick replaces it; `focus` fires the glow once and then clears itself.
    const key = kind === 'doc' ? item.name : item.id;
    setPinned({ kind, key });
    setFocus({ kind, key });
    if (kind === 'startup') { setPipelineSector('All'); setTab('pipeline'); }
    else if (kind === 'doc') { setVaultBrand(null); setVaultType('All'); setTab('vault'); }
    else if (kind === 'mentor') { setMentorFilter('All'); setTab('network'); }
    else if (kind === 'event') { setEventType('All'); setTab('events'); }
  };

  // Move a focused item to the front of its list so it shows first in the target tab
  const bringToFront = (arr: any[], matchFn: (x: any) => boolean) => {
    const i = arr.findIndex(matchFn);
    if (i <= 0) return arr;
    const copy = arr.slice();
    copy.unshift(copy.splice(i, 1)[0]);
    return copy;
  };

  // close the search dropdown on outside click (robust across transformed ancestors)
  useEffect(() => {
    if (!searchOpen) return;
    const onDown = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [searchOpen]);

  // close the custom filter dropdowns (pipeline sector, vault type, mentor, events) on outside click
  useEffect(() => {
    if (!pipelineSectorOpen && !vaultTypeOpen && !mentorFilterOpen && !eventTypeOpen) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (pipelineSectorOpen && pipelineSectorRef.current && !pipelineSectorRef.current.contains(t)) setPipelineSectorOpen(false);
      if (vaultTypeOpen && vaultTypeRef.current && !vaultTypeRef.current.contains(t)) setVaultTypeOpen(false);
      if (mentorFilterOpen && mentorFilterRef.current && !mentorFilterRef.current.contains(t)) setMentorFilterOpen(false);
      if (eventTypeOpen && eventTypeRef.current && !eventTypeRef.current.contains(t)) setEventTypeOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [pipelineSectorOpen, vaultTypeOpen, mentorFilterOpen, eventTypeOpen]);

  // clear the search-focus highlight after it has played
  useEffect(() => {
    if (!focus) return;
    const t = setTimeout(() => setFocus(null), 4500);
    return () => clearTimeout(t);
  }, [focus]);

  const filteredMentors = useMemo(() =>
    MENTORS.filter(m => {
      if (mentorFilter === 'All') return true;
      if (mentorFilter === 'Available') return m.avail;
      return m.tags.some(t => t === mentorFilter);
    }), [mentorFilter]);

  const filteredEvents = useMemo(() =>
    allEvents.filter(ev => eventType === 'All' || ev.type === eventType),
    [eventType, allEvents]);

  // advance() — opens the stage-advance REQUEST modal. Admins advance directly; owners submit for review.
  const advance = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const startup = startups.find(s => s.id === id);
    if (!startup) return;
    const isOwner = userStartups.some(us => us.id === id);
    if (!isAdmin && !isOwner) return; // non-owners can't even trigger this
    const idx = STAGE_ORDER.indexOf(startup.stage);
    if (idx >= STAGE_ORDER.length - 1) return;
    if (isAdmin) {
      // Admin advances directly
      const newStage = STAGE_ORDER[idx + 1];
      const newRaised = idx === STAGE_ORDER.length - 2 ? startup.fundingGoal : startup.raised;
      setStartups(prev => prev.map(s => s.id === id ? { ...s, stage: newStage, raised: newRaised } : s));
      fetch('/api/startups/update', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, stage: newStage, raised: newRaised }) }).catch(console.error);
    } else {
      // Owner submits a request for admin to approve
      const nextStages = STAGE_ORDER.slice(idx + 1);
      setAdvanceRequestStartup(startup);
      setAdvanceRequestForm({ targetStage: nextStages[0], justification: '', proofFile: null });
      setAdvanceRequestError('');
      setAdvanceRequestDone(false);
      setAdvanceRequestOpen(true);
    }
  };

  // Actually deletes the startup after the reason has been captured. Re-adding the
  // same startup later creates a fresh 'pending' record that needs admin approval
  // again — the server sets status='pending' for any startup id it hasn't seen.
  const performRemoveStartup = (startup: any, reason: string) => {
    if (!startup) return;

    // Find linked docs by startup NAME — works after refresh because
    // startup_name is persisted on each doc in Supabase and loaded back
    const linkedDocNames = vaultDocs
      .filter(d => {
        const byLinkState = docStartupLinks[d.name] === startup.name;
        const byDocField = (d as any).startup_name === startup.name;
        return byLinkState || byDocField;
      })
      .map(d => d.name);

    // Remove from local vault state
    if (linkedDocNames.length > 0) {
      setVaultDocs(prev => prev.filter(d => !linkedDocNames.includes(d.name)));
    }

    // Remove startup from local state
    setStartups(prev => prev.filter(s => s.id !== startup.id));

    // Clean up link state
    setDocStartupLinks(prev => {
      const updated = { ...prev };
      linkedDocNames.forEach(n => delete updated[n]);
      return updated;
    });

    // Persist deletion to Supabase — passes startupName so server can delete
    // linked documents by startup_name column, plus the founder's removal reason.
    fetch('/api/startups/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: startup.id, startupName: startup.name, reason }),
    }).catch(console.error);
  };

  // Opens the reason-gated confirmation modal (ownership already verified).
  const removeStartup = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const startup = startups.find(s => s.id === id);
    if (!startup) return;
    requireOwnership(id, () => {
      setRemoveReason('');
      setRemoveError('');
      setRemoveTarget(startup);
    });
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();

    // ── Step 1: check password uniqueness BEFORE closing modal ──────────────
    if (ownerPassword) {
      try {
        const checkRes = await fetch('/api/startups', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: `st-check-${Date.now()}`,
            name: '__pwd_check__', tagline: '', description: '',
            founder: '', industry: '', stage: 'Applied',
            fundingGoal: 0, raised: 0, pitchScore: 0, members: 1,
            created_by_email: null,
            owner_email: null,
            owner_password: ownerPassword,
            __dryRun: true,
          }),
        });
        const checkData = await checkRes.json() as { error?: string };
        if (checkData.error === 'PASSWORD_TAKEN') {
          setOwnerPasswordError('This password is already in use by another startup. Please choose a stronger, unique password.');
          return; // stay on step 2
        }
      } catch { /* network error — proceed anyway, server will catch it */ }
    }

    setRegisterOpen(false);

    setFitScoreState({
      phase: 0, loading: true, score: null, band: '',
      remark: '', strengths: [], improvements: [],
      keywords: [], message: '', readyForVCs: false,
      delta: null, startupName: newS.name,
    });

    try {
      const res = await fetch('/api/incuscore/phase1', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newS.name,
          founder: newS.founder,
          industry: newS.industry === 'Others' ? newSCustomIndustry : newS.industry,
          tagline: newS.tagline,
          fundingGoal: Number(newS.fundingGoal) || 0,
          description: newS.description,
        }),
      });
      const result = await res.json();

      const resolvedIndustry = newS.industry === 'Others' ? newSCustomIndustry : newS.industry;
      const newStartup = {
        ...newS,
        industry: resolvedIndustry,
        id: `st-${Date.now()}`,
        stage: registerInitialStage,
        raised: 0,
        fundingGoal: Number(newS.fundingGoal) || 0,
        metrics: { members: 1, pitchScore: result.total ?? 68 },
        status: 'pending',
        owner_email: ownerEmail || user?.email || null,
        created_by_email: user?.email || null,
      };
      setStartups(prev => [newStartup, ...prev]);
      fetch('/api/startups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: newStartup.id, name: newStartup.name, tagline: newStartup.tagline,
          description: newStartup.description, founder: newStartup.founder,
          industry: resolvedIndustry, stage: newStartup.stage,
          fundingGoal: newStartup.fundingGoal, raised: newStartup.raised,
          pitchScore: result.total ?? 68, members: 1,
          created_by_email: user?.email ?? null,
          owner_email: ownerEmail || user?.email || null,
          owner_password: ownerPassword,
        }),
      }).catch(console.error);

      setFitScoreState({
        phase: 1,
        loading: false,
        score: result.total,
        band: result.band,
        remark: result.remark,
        strengths: result.strengths ?? [],
        improvements: result.improvements ?? [],
        keywords: result.keywords ?? [],
        message: result.investorMessage,
        readyForVCs: result.total >= 76,
        delta: null,
        startupName: newS.name,
      });
    } catch {
      setStartups(prev => [{
        ...newS,
        id: `st-${Date.now()}`,
        stage: 'Applied',
        raised: 0,
        fundingGoal: Number(newS.fundingGoal) || 0,
        metrics: { members: 1, pitchScore: 68 },
      }, ...prev]);
      setFitScoreState(null);
    }

    setNewS({ name: '', tagline: '', description: '', founder: '', industry: 'SaaS', fundingGoal: '' });
    setNewSCustomIndustry('');
    setRegisterStep(1);
    setOwnerPassword(''); setOwnerPasswordConfirm(''); setOwnerEmail('');
  };
  const handleSave = e => {
    e.preventDefault();
    const resolvedEditIndustry = editTarget.industry === 'Others' ? editCustomIndustry : editTarget.industry;
    const updated = { ...editTarget, industry: resolvedEditIndustry, fundingGoal: Number(editTarget.fundingGoal) || 0, raised: editTarget.stage === 'Scaled' ? Number(editTarget.fundingGoal) || 0 : Number(editTarget.raised) || 0 };
    setStartups(prev => prev.map(s => s.id === editTarget.id ? updated : s));
    setEditTarget(null);
    fetch('/api/startups/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: updated.id, name: updated.name, tagline: updated.tagline,
        description: updated.description, founder: updated.founder,
        industry: updated.industry, stage: updated.stage,
        fundingGoal: updated.fundingGoal, raised: updated.raised,
      }),
    }).catch(console.error);
  };

  const navItems = [
    // NOTE: tab ids are load-bearing (routing, ?tab= deep links, chatbot context
    // in src/lib/knowledge.ts). Only the labels change.
    { id: 'overview', label: 'Command Centre', icon: LayoutDashboard },
    { id: 'challenges', label: 'Challenge Board', icon: Landmark },
    { id: 'pipeline', label: 'Pilot Pipeline', icon: GitBranch },
    { id: 'vault', label: 'Solution Vault', icon: FolderKey },
    { id: 'network', label: 'Expert Network', icon: Users },
    { id: 'events', label: 'Event Arena', icon: CalendarDays },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'funding', label: 'National Procurement Matrix', icon: DollarSign },
    ...(isAdmin ? [{ id: 'admin', label: 'Admin Panel', icon: Shield }] : []),
  ];

  // Broadcast the active Explore Hub tab so the AI assistant can answer
  // "what is this section?" with the right founder-side context.
  useEffect(() => {
    const activeLabel = navItems.find(t => t.id === tab)?.label || 'Command Center';
    document.body.setAttribute('data-active-tab', tab);
    document.body.setAttribute('data-active-section', activeLabel);
    return () => {
      document.body.removeAttribute('data-active-tab');
      document.body.removeAttribute('data-active-section');
    };
  }, [tab]);

  const STATUS_COLOR = { Committed: '#10b981', 'In Diligence': '#f59e0b', 'In Discussion': '#06b6d4' };
  const TYPE_COLOR = { Deck: '#8b5cf6', Doc: '#06b6d4', Sheet: '#10b981', Video: '#f59e0b', Bundle: '#f472b6' };
  const STAT_COLOR = { Final: '#10b981', Draft: '#475569', Review: '#f59e0b' };
  const EVENT_COLOR = { Pitching: '#8b5cf6', Workshop: '#06b6d4', Mentorship: '#f59e0b', Hackathon: '#10b981' };

  // Date parser for events: "June 15, 2026" → { month:'JUN', day:'15', year:'2026' }
  const parseDate = (dateStr) => {
    const parts = dateStr.split(' ');
    return { month: parts[0].substring(0, 3).toUpperCase(), day: (parts[1] || '').replace(',', ''), year: parts[2] || '' };
  };

  // ── Auth gate: placed here AFTER all hooks so React rules are satisfied ──
  // Show nothing (not a spinner) while auth resolves — avoids visible flash
  if (authLoading) return <div style={{ minHeight: '100vh', background: '#06060f' }} />;
  if (!user) return <AuthGate />;

  return (
    <div className="flex h-dvh bg-black text-white overflow-hidden" style={{ fontFamily: 'inherit' }}>

      {/* Mobile sidebar overlay */}
      <div
        className={`hub-sidebar-overlay${sidebarOpen ? ' open' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* ── SIDEBAR ──────────────────────────────────────────────────────── */}
      <aside className={`hub-sidebar w-56 flex flex-col border-r border-white/[0.06] bg-black shrink-0${sidebarOpen ? ' open' : ''}`}>
        <a href="/" className="flex items-center gap-2.5 px-4 py-3 border-b border-white/[0.06] hover:bg-violet-500/[0.06] transition-all group">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-white/40 group-hover:text-violet-400 transition-colors shrink-0">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          <span className="text-[11px] font-bold tracking-[0.05em] text-white/60 group-hover:text-white/80 transition-colors">Sanyog</span>
          <span className="ml-auto text-[8px] font-semibold tracking-[0.06em] uppercase text-white/25">Home</span>
        </a>

        <div className="px-4 py-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-3 mb-3">
            <div className="shrink-0" style={{ width: 48, height: 48, overflow: 'hidden' }}>
              <div style={{ transform: 'scale(0.75)', transformOrigin: 'top left' }}>
                <MiniCrystal />
              </div>
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-extrabold tracking-[0.06em] uppercase text-white">Startup Hub</span>
              <span className="text-[9px] font-bold tracking-[0.12em] uppercase text-violet-400/85">Solution Portal</span>
            </div>
          </div>
          <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-violet-500/10 border border-violet-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399] animate-pulse shrink-0" />
            <span className="text-[9px] font-bold tracking-[0.06em] text-white/60">LIVE PILOT TRACKING</span>
          </div>
        </div>

        <nav className="flex-1 p-3 flex flex-col gap-0.5 overflow-y-auto">
          {navItems.map(item => {
            const Icon = item.icon;
            const active = tab === item.id;
            return (
              <button key={item.id} onClick={() => { setTab(item.id); setSidebarOpen(false); }}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all border ${active ? 'bg-violet-500/15 text-violet-300 border-violet-500/25'
                  : 'text-white/35 hover:text-white/70 hover:bg-white/[0.04] border-transparent'
                  }`}>
                <Icon className="h-3.5 w-3.5 shrink-0" />
                <span className="text-xs font-medium">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/[0.06] space-y-2.5">
          {[
            { label: 'Solutions', val: stats.total, color: 'text-violet-400' },
            { label: 'Released', val: `₹${(stats.raised / 1e5).toFixed(1)}L`, color: 'text-emerald-400' },
            { label: 'Avg FitScore', val: stats.avgScore, color: 'text-sky-400' },
          ].map(s => (
            <div key={s.label} className="flex justify-between items-center">
              <span className="text-[11px] text-white/25">{s.label}</span>
              <span className={`text-xs font-bold ${s.color}`}>{s.val}</span>
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-white/[0.06]">
          {user ? (
            <div className="flex items-center gap-3 px-3 py-2.5 bg-white/[0.04] border border-white/[0.07] rounded-xl">
              {user.avatar_url
                ? <img src={user.avatar_url} className="w-8 h-8 rounded-lg object-cover shrink-0" />
                : <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-violet-500 to-sky-400 flex items-center justify-center text-xs font-bold shrink-0 text-white">{user.name?.slice(0,2).toUpperCase()}</div>
              }
              <div className="overflow-hidden flex-1">
                <p className="text-xs font-semibold text-white truncate">{user.name}</p>
                <p className={`text-[10px] font-semibold capitalize ${userRole === 'admin' ? 'text-emerald-400' : userRole === 'vc' ? 'text-sky-400' : userRole === 'founder' ? 'text-violet-400' : 'text-white/30'}`}>
                  {userRole === 'admin' ? 'Hub Admin' : userRole === 'vc' ? 'Verified VC' : userRole === 'founder' ? 'Startup Founder' : 'Visitor'}
                </p>
              </div>
            </div>
          ) : (
            <button onClick={() => { setSignInPromptMsg('Sign in to access all features — register startups, upload decks, book mentors and more.'); setSignInPromptOpen(true); }}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-violet-600/80 to-sky-500/80 text-white border border-violet-500/30 hover:opacity-90 transition">
              <Rocket className="h-3.5 w-3.5" /> Sign In / Sign Up
            </button>
          )}
        </div>
      </aside>

      {/* ── MAIN AREA ────────────────────────────────────────────────────── */}
      <div className="hub-main-content flex-1 flex flex-col overflow-hidden">

        {/* Topbar */}
        <header className="hub-header-adjust flex items-center justify-between px-8 py-4 border-b border-white/[0.06] bg-black shrink-0 relative">
          <div className="flex items-center gap-3">
            {/* Hamburger — mobile only */}
            <button
              className="hub-hamburger items-center justify-center w-8 h-8 rounded-lg bg-white/[0.05] border border-white/[0.08] text-white/60"
              onClick={() => setSidebarOpen(o => !o)}
              aria-label="Toggle menu"
              style={{ flexShrink: 0, cursor: 'pointer', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8 }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <rect y="2" width="16" height="1.8" rx="1" fill="rgba(255,255,255,0.7)"/>
                <rect y="7.1" width="16" height="1.8" rx="1" fill="rgba(255,255,255,0.7)"/>
                <rect y="12.2" width="16" height="1.8" rx="1" fill="rgba(255,255,255,0.7)"/>
              </svg>
            </button>
            <div>
              <h2 className="hub-topbar-title text-base font-semibold text-white">{navItems.find(n => n.id === tab)?.label}</h2>
              <p className="text-[11px] text-white/25 mt-0.5">{tab === 'funding' ? 'Live Cross-Border Matchmaking & Capital Activity' : 'Sanyog Procurement Pathway · Live'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div ref={searchRef} className="hub-topbar-search relative">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-white/25" />
              <input
                value={search}
                onChange={e => { setSearch(e.target.value); setSearchOpen(true); }}
                onFocus={() => setSearchOpen(true)}
                onKeyDown={e => { if (e.key === 'Escape') { setSearch(''); setSearchOpen(false); } }}
                placeholder="Search anything…"
                className="pl-9 pr-4 py-2 w-52 text-xs bg-white/[0.04] border border-white/[0.08] rounded-full focus:outline-none focus:border-violet-500/50 text-white placeholder-white/20 transition"
              />
              {search && (
                <button onClick={() => { setSearch(''); setSearchOpen(false); }} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', fontSize: 14, lineHeight: 1, padding: 0 }}>✕</button>
              )}
              {/* focus-highlight animation (always mounted via the topbar) */}
              <style>{`
                @keyframes hub-search-focus{0%{box-shadow:0 0 0 0 rgba(139,92,246,.55),0 0 26px rgba(139,92,246,.45)}50%{box-shadow:0 0 0 2px rgba(139,92,246,.9),0 0 34px rgba(139,92,246,.6)}100%{box-shadow:0 0 0 0 rgba(139,92,246,0),0 0 0 rgba(139,92,246,0)}}
                .search-focus{animation:hub-search-focus 1.6s ease-in-out 2;position:relative;z-index:3}
              `}</style>
              {/* Global results dropdown — spans all 4 domains, routes to the matching tab */}
              {searchOpen && search.trim() && (
                <div className="notif-scroll" style={{ position: 'absolute', top: 42, right: 0, width: 300, maxHeight: 400, overflowY: 'auto', zIndex: 100, background: '#000000', border: '1px solid rgba(255,255,255,0.09)', borderTop: '2px solid rgba(139,92,246,0.55)', borderRadius: 14, boxShadow: '0 16px 48px rgba(0,0,0,0.8)', padding: 8 }}>
                  <div style={{ padding: '4px 8px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.55)' }}>Results</span>
                    <span style={{ fontSize: 9, fontWeight: 700, color: '#a78bfa', background: 'rgba(139,92,246,0.15)', padding: '2px 7px', borderRadius: 999, border: '1px solid rgba(139,92,246,0.3)' }}>{searchTotal}</span>
                  </div>
                  {searchTotal === 0 && (
                    <div style={{ padding: '18px 10px', textAlign: 'center', fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>Nothing matches "{search}"</div>
                  )}
                  {searchGroups.map(g => (
                    <div key={g.kind} style={{ marginTop: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '2px 4px 6px' }}>
                        <span style={{ fontSize: 9, fontWeight: 800, color: g.color, textTransform: 'uppercase', letterSpacing: '.07em' }}>{g.label}</span>
                        <span style={{ fontSize: 8, fontWeight: 700, color: g.color, background: `${g.color}18`, padding: '1px 6px', borderRadius: 999, border: `1px solid ${g.color}33` }}>{g.items.length}</span>
                        <span style={{ marginLeft: 'auto', fontSize: 8.5, color: 'rgba(255,255,255,0.28)' }}>→ {g.dest}</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                        {g.items.map((item: any, ii: number) => {
                          const sc = g.kind === 'startup' ? (STAGE_COLORS[item.stage] || g.color) : g.color;
                          let lead = '?', primary = '', secondary = '', trailing: any = null;
                          if (g.kind === 'startup') { lead = (item.name || '?')[0]; primary = item.name; secondary = `${item.stage} · ${item.industry}${item.founder ? ` · ${item.founder}` : ''}`; trailing = item.metrics?.pitchScore; }
                          else if (g.kind === 'doc') { lead = (item.name || '?')[0]; primary = item.name; secondary = `${item.type || 'Doc'}${(item as any).startup_name ? ` · ${(item as any).startup_name}` : ''}`; trailing = (item as any).deck_type === 'investor' ? 'VC' : null; }
                          else if (g.kind === 'mentor') { lead = item.avatar || (item.name || '?')[0]; primary = item.name; secondary = `${item.role} · ${item.company}`; }
                          else if (g.kind === 'event') { lead = (item.title || '?')[0]; primary = item.title; secondary = `${item.type || 'Event'} · ${item.date || ''}`; }
                          return (
                            <button key={(item.id || item.name || primary) + ii} onClick={() => handleSearchPick(g.kind, item)}
                              style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left', padding: '8px 10px', borderRadius: 10, background: `${sc}0c`, border: `1px solid ${sc}22`, borderLeft: `2px solid ${sc}70`, cursor: 'pointer' }}>
                              <div style={{ width: 28, height: 28, borderRadius: 8, flexShrink: 0, background: `radial-gradient(circle at 32% 28%, ${sc}, ${sc}66 60%, ${sc}18)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: 'white', boxShadow: `0 2px 8px ${sc}40` }}>{lead}</div>
                              <div style={{ minWidth: 0, flex: 1 }}>
                                <p style={{ fontSize: 12, fontWeight: 700, color: 'white', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{primary}</p>
                                <p style={{ fontSize: 9.5, color: 'rgba(255,255,255,0.4)', margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{secondary}</p>
                              </div>
                              {trailing != null && <span style={{ fontSize: trailing === 'VC' ? 8 : 12, fontWeight: 800, color: sc, flexShrink: 0, ...(trailing === 'VC' ? { background: `${sc}18`, border: `1px solid ${sc}38`, padding: '2px 6px', borderRadius: 999, letterSpacing: '.05em' } : {}) }}>{trailing}</span>}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div onClick={() => setNotifOpen(p => !p)} className="relative w-8 h-8 rounded-full bg-white/[0.04] border border-white/[0.08] flex items-center justify-center cursor-pointer hover:bg-white/[0.07] transition">
              <Bell className="h-3.5 w-3.5 text-white/40" />
              {!notifAllRead && <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-violet-400 rounded-full" />}
            </div>
            {notifOpen && (
              <>
                {/* Click-outside overlay */}
                <div style={{ position: 'fixed', inset: 0, zIndex: 99 }} onClick={() => setNotifOpen(false)} />
                <div className="hub-notif-dropdown" style={{ position: 'absolute', top: 52, right: 160, width: 300, background: '#000000', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 14, zIndex: 100, overflow: 'hidden', boxShadow: '0 16px 48px rgba(0,0,0,0.8)' }}>
                  <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'white' }}>Notifications</span>
                    <span
                      onClick={e => { e.stopPropagation(); setNotifAllRead(true); }}
                      style={{ fontSize: 10, color: notifAllRead ? 'rgba(255,255,255,0.25)' : '#a78bfa', cursor: notifAllRead ? 'default' : 'pointer', fontWeight: 600 }}
                    >{notifAllRead ? 'All read' : 'Mark all read'}</span>
                  </div>
                  <div className="notif-scroll" style={{ maxHeight: 280, overflowY: 'auto', scrollbarWidth: 'thin', scrollbarColor: 'rgba(99,102,241,0.5) transparent' }}>
                    {ACTIVITY.map((a, i) => {
                      const Icon = a.icon;
                      const isUnread = i === 0 && !notifAllRead;
                      return (
                        <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '11px 16px', borderBottom: '1px solid rgba(255,255,255,0.03)', cursor: 'pointer', background: isUnread ? 'rgba(139,92,246,0.05)' : 'transparent' }}>
                          <div style={{ width: 28, height: 28, borderRadius: 8, background: `${a.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <Icon style={{ width: 13, height: 13, color: a.color }} />
                          </div>
                          <div style={{ flex: 1 }}>
                            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)', margin: 0, lineHeight: 1.4 }}>{a.text}</p>
                            <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', margin: '3px 0 0' }}>{a.time}</p>
                          </div>
                          {isUnread && <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#a78bfa', flexShrink: 0, marginTop: 4 }} />}
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ padding: '10px 16px', borderTop: '1px solid rgba(255,255,255,0.06)', textAlign: 'center' }}>
                    <span onClick={() => setNotifOpen(false)} style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', cursor: 'pointer' }}>View all activity</span>
                  </div>
                </div>
              </>
            )}
            <button onClick={() => requireAuth('Sign in to register your startup on Sanyog.', () => setRegisterOpen(true))}
              className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold bg-gradient-to-r from-violet-600 to-sky-500 text-white hover:opacity-90 transition shadow-lg shadow-violet-500/20">
              <Plus className="h-3.5 w-3.5" /> Register Startup
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">

          {/* ── CHALLENGE BOARD · the 8-stage procurement pathway ─────────── */}
          {tab === 'challenges' && (
            <div className="hub-main-content" style={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column', padding: '20px 28px', boxSizing: 'border-box', overflow: 'hidden' }}>
              <div aria-hidden style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: '-16%', left: '-8%', width: '46%', height: '58%', background: 'radial-gradient(circle, rgba(139,92,246,0.14), transparent 70%)', filter: 'blur(44px)' }} />
                <div style={{ position: 'absolute', bottom: '-20%', right: '-6%', width: '48%', height: '54%', background: 'radial-gradient(circle, rgba(16,185,129,0.10), transparent 70%)', filter: 'blur(48px)' }} />
              </div>
              <PathwayTab mode="startup" />
            </div>
          )}

          {/* ── COMMAND CENTER ────────────────────────────────────────────── */}
          {tab === 'overview' && (
            <div className="hub-main-content" style={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column', gap: 16, padding: '20px 28px', boxSizing: 'border-box', overflow: 'hidden' }}>

              {/* Deep colour aurora — warms the dark canvas, elegant + deep */}
              <div aria-hidden style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: '-16%', left: '-8%', width: '46%', height: '58%', background: 'radial-gradient(circle, rgba(139,92,246,0.18), transparent 70%)', filter: 'blur(44px)' }} />
                <div style={{ position: 'absolute', top: '-12%', right: '-8%', width: '42%', height: '52%', background: 'radial-gradient(circle, rgba(6,182,212,0.14), transparent 70%)', filter: 'blur(44px)' }} />
                <div style={{ position: 'absolute', bottom: '-20%', left: '22%', width: '58%', height: '58%', background: 'radial-gradient(circle, rgba(16,185,129,0.13), transparent 70%)', filter: 'blur(52px)' }} />
                <div style={{ position: 'absolute', top: '30%', right: '24%', width: '30%', height: '40%', background: 'radial-gradient(circle, rgba(245,158,11,0.07), transparent 70%)', filter: 'blur(48px)' }} />
              </div>

              {/* Constellation bg */}
              <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 0, opacity: 0.35 }}>
                <ConstellationBg />
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '45%', background: 'linear-gradient(to top, black, transparent)' }} />
              </div>

              {/* ── KPI cards + asteroid ───────────────────────────────── */}
              <div style={{ position: 'relative', zIndex: 1, flexShrink: 0 }}>
                <AsteroidKPIRow stats={stats} />
              </div>

              {/* ── Table + Activity ──────────────────────────────────── */}
              <div className="lp-two-col" style={{ position: 'relative', zIndex: 1, flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: '1fr 296px', gap: 16 }}>

                {/* Portfolio table */}
                <div className="hub-table-wrap hub-leaderboard" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

                  {/* Table header */}
                  <div style={{ flexShrink: 0, padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'white' }}>Portfolio Leaderboard</span>
                    <button onClick={() => setTab('pipeline')} style={{ fontSize: 11, color: '#a78bfa', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                      View all <ChevronRight style={{ width: 12, height: 12 }} />
                    </button>
                  </div>

                  {/* Column headers — box model mirrors the rows exactly so the grid tracks line up:
                      row = margin 12 + border-left 3 + border-right 1 + padding 16/16 = 60px total horizontal.
                      Header reproduces that with padding-left 31 (12+3+16) / padding-right 29 (12+1+16). */}
                  <div style={{ flexShrink: 0, display: 'grid', gridTemplateColumns: '36px minmax(190px,1fr) 110px 148px 90px 52px 110px', padding: '8px 29px 8px 31px', borderBottom: '1px solid rgba(255,255,255,0.04)', alignItems: 'center' }}>
                    {['#', 'COMPANY', 'FOUNDER', 'STAGE', 'INDUSTRY', 'SCORE', 'RAISED'].map(h => (
                      <span key={h} style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase' }}>{h}</span>
                    ))}
                  </div>

                  {/* Scrollable rows */}
                  <div className="analytics-scroll" style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
                    {[...startups].sort((a, b) => b.metrics.pitchScore - a.metrics.pitchScore).map((s, i) => {
                      const sc = STAGE_COLORS[s.stage];
                      const sd = STAGE_DIM[s.stage];
                      const pct = s.fundingGoal > 0 ? Math.min((s.raised / s.fundingGoal) * 100, 100) : 0;
                      const scoreCol = s.metrics.pitchScore >= 90 ? '#10b981' : s.metrics.pitchScore >= 80 ? '#06b6d4' : s.metrics.pitchScore >= 70 ? '#f59e0b' : '#8b5cf6';
                      const founderShort = (() => { const p = s.founder.split(' '); return p.length > 1 ? `${p[0]} ${p[1][0]}.` : p[0]; })();

                      // rank medal colors
                      const rankColor = i === 0 ? '#fbbf24' : i === 1 ? '#94a3b8' : i === 2 ? '#cd7c3a' : 'rgba(255,255,255,0.18)';

                      return (
                        <div
                          key={s.id}
                          onClick={() => { requireOwnership(s.id, () => { const knownIndustries = ['SaaS','FinTech','DeepTech','HealthTech','EdTech','AgriTech','ClimaTech','D2C / Consumer','E-commerce','Logistics & Supply Chain','HRTech','LegalTech','PropTech','SpaceTech','Gaming','Media & Content','Others']; const isKnown = knownIndustries.includes(s.industry); setEditTarget({ ...s, industry: isKnown ? s.industry : 'Others' }); setEditCustomIndustry(isKnown ? '' : s.industry); }); }}
                          style={{
                            margin: '6px 12px',
                            borderRadius: 12,
                            padding: '12px 16px',
                            display: 'grid',
                            gridTemplateColumns: '36px minmax(190px,1fr) 110px 148px 90px 52px 110px',
                            alignItems: 'center',
                            cursor: 'pointer',
                            position: 'relative',
                            overflow: 'hidden',
                            // card gradient uses the stage color as tint
                            background: `linear-gradient(120deg, ${sc}14 0%, rgba(255,255,255,0.018) 55%, ${scoreCol}08 100%)`,
                            border: `1px solid ${sc}30`,
                            borderLeft: `3px solid ${sc}`,
                            transition: 'transform 0.15s, box-shadow 0.15s',
                          }}
                          onMouseEnter={e => {
                            const el = e.currentTarget as HTMLDivElement;
                            el.style.transform = 'translateX(2px)';
                            el.style.boxShadow = `0 4px 28px ${sc}22, inset 0 0 0 1px ${sc}40`;
                          }}
                          onMouseLeave={e => {
                            const el = e.currentTarget as HTMLDivElement;
                            el.style.transform = 'translateX(0)';
                            el.style.boxShadow = 'none';
                          }}
                        >
                          {/* subtle inner glow top-right */}
                          <div style={{ position: 'absolute', top: -20, right: -20, width: 80, height: 80, borderRadius: '50%', background: `radial-gradient(circle, ${sc}22 0%, transparent 70%)`, pointerEvents: 'none' }} />

                          {/* rank */}
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 24, height: 24, borderRadius: 6, background: `${rankColor}18`, border: `1px solid ${rankColor}44`, flexShrink: 0 }}>
                            <span style={{ fontSize: 10, fontWeight: 800, color: rankColor }}>{i + 1}</span>
                          </div>

                          {/* company */}
                          <div style={{ paddingRight: 8 }}>
                            <p style={{ fontSize: 12, fontWeight: 700, color: 'white', margin: 0, letterSpacing: '0.01em' }}>{s.name}</p>
                            <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.28)', margin: 0, marginTop: 2 }}>
                              {s.tagline.length > 34 ? s.tagline.slice(0, 34) + '…' : s.tagline}
                            </p>
                          </div>

                          {/* founder */}
                          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.01em' }}>{founderShort}</span>

                          {/* stage pill */}
                          <div>
                            <span style={{
                              fontSize: 9, fontWeight: 800, padding: '4px 11px', borderRadius: 999,
                              color: sc, background: sd, border: `1px solid ${sc}55`,
                              display: 'inline-block', whiteSpace: 'nowrap', letterSpacing: '0.04em', textTransform: 'uppercase',
                              boxShadow: `0 0 10px ${sc}35`,
                            }}>
                              {s.stage}
                            </span>
                          </div>

                          {/* industry */}
                          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.38)', fontWeight: 500 }}>{s.industry}</span>

                          {/* score */}
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}>
                            <span style={{ fontSize: 15, fontWeight: 800, color: scoreCol, filter: `drop-shadow(0 0 6px ${scoreCol}90)`, lineHeight: 1 }}>
                              {s.metrics.pitchScore}
                            </span>
                            <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>score</span>
                          </div>

                          {/* raised + bar */}
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                              <span style={{ fontSize: 12, fontWeight: 700, color: '#34d399', filter: 'drop-shadow(0 0 4px rgba(52,211,153,0.7))' }}>
                                ₹{(s.raised / 1e5).toFixed(0)}L
                              </span>
                              <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)' }}>{pct.toFixed(0)}%</span>
                            </div>
                            <div style={{ height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
                              <div style={{
                                height: '100%', borderRadius: 2, width: `${pct}%`,
                                background: `linear-gradient(90deg, ${sc}, ${scoreCol})`,
                                boxShadow: `0 0 8px ${sc}80`,
                                transition: 'width 0.6s cubic-bezier(0.34,1.56,0.64,1)',
                              }} />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Live Activity */}
                <div style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                  <div style={{ flexShrink: 0, padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px rgba(16,185,129,0.9)', flexShrink: 0 }} />
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'white' }}>Live Activity</span>
                  </div>
                  <div className="analytics-scroll" style={{ flex: 1, overflowY: 'auto', minHeight: 0, padding: '12px 14px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {ACTIVITY.map((a, i) => {
                        const Icon = a.icon;
                        return (
                          <div key={i} className="la-row" style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px', borderRadius: 10, background: `linear-gradient(120deg, ${a.color}12, rgba(255,255,255,0.012) 78%)`, border: `1px solid ${a.color}22`, borderLeft: `2px solid ${a.color}70` }}>
                            <div style={{ width: 28, height: 28, borderRadius: 9, background: `radial-gradient(circle at 32% 28%, ${a.color}, ${a.color}77 58%, ${a.color}2e)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: `0 3px 8px ${a.color}55, 0 0 12px ${a.color}40, inset 0 1px 2px rgba(255,255,255,0.45)`, border: `1px solid ${a.color}` }}>
                              <Icon style={{ width: 13, height: 13, color: '#fff', filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.5))' }} />
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.62)', margin: 0, lineHeight: 1.45 }}>{a.text}</p>
                              <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', margin: 0, marginTop: 3 }}>{a.time}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Pipeline Health ───────────────────────────────────── */}
              <div style={{
                position: 'relative', zIndex: 1, flexShrink: 0,
                background: 'rgba(255,255,255,0.022)',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: 16, padding: '16px 22px', overflow: 'hidden',
              }}>
                {/* sweep gradient bg */}
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg,rgba(139,92,246,0.05) 0%,rgba(6,182,212,0.05) 25%,rgba(245,158,11,0.05) 55%,rgba(16,185,129,0.05) 75%,rgba(52,211,153,0.05) 100%)', pointerEvents: 'none' }} />

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, position: 'relative' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'white' }}>Pipeline Health</span>
                    <span style={{ fontSize: 9, padding: '2px 8px', borderRadius: 999, background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)', color: '#a78bfa', fontWeight: 700, letterSpacing: '0.06em' }}>LIVE</span>
                  </div>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.18)' }}>{startups.length} total companies</span>
                </div>

                {/* Node row */}
                <div className="sc-pipeline-health-row" style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
                  {STAGE_ORDER.map((stage, idx) => {
                    const count = startups.filter(s => s.stage === stage).length;
                    const col = STAGE_COLORS[stage];
                    const pct = startups.length ? (count / startups.length) * 100 : 0;
                    const isLast = idx === STAGE_ORDER.length - 1;
                    const nextCol = !isLast ? STAGE_COLORS[STAGE_ORDER[idx + 1]] : col;

                    return (
                      <div key={stage} style={{ display: 'flex', alignItems: 'center', flex: isLast ? 'none' : 1 }}>

                        {/* Stage node */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7, flexShrink: 0 }}>

                          {/* Orb */}
                          <div style={{ position: 'relative', width: 52, height: 52 }}>
                            {/* Pulse rings — only when populated */}
                            {count > 0 && <>
                              <div style={{
                                position: 'absolute', inset: -5, borderRadius: '50%',
                                border: `1px solid ${col}55`,
                                animation: 'ph-pulse 2.2s ease-out infinite',
                              }} />
                              <div style={{
                                position: 'absolute', inset: -11, borderRadius: '50%',
                                border: `1px solid ${col}22`,
                                animation: 'ph-pulse 2.2s ease-out infinite',
                                animationDelay: '0.6s',
                              }} />
                            </>}

                            {/* Core orb — 3D sphere */}
                            <div style={{
                              width: 52, height: 52, borderRadius: '50%',
                              background: `radial-gradient(circle at 34% 28%, ${col} 0%, ${col}66 48%, ${col}10 100%)`,
                              border: `1px solid ${col}90`,
                              boxShadow: count > 0 ? `0 6px 18px ${col}45, 0 0 26px ${col}55, inset 0 -4px 8px rgba(0,0,0,0.5), inset 0 3px 6px ${col}cc` : `inset 0 -2px 5px rgba(0,0,0,0.45), 0 0 6px ${col}15`,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              position: 'relative', zIndex: 1,
                            }}>
                              <span style={{
                                fontSize: count >= 10 ? 15 : 18,
                                fontWeight: 800, color: '#fff',
                                filter: count > 0 ? `drop-shadow(0 0 8px ${col})` : 'none',
                                position: 'relative', zIndex: 2,
                              }}>{count}</span>
                              {/* specular highlight */}
                              <div style={{ position: 'absolute', top: 9, left: 13, width: 14, height: 9, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,255,255,0.8), transparent 70%)', zIndex: 2 }} />
                              {/* orbiting electron (populated stages) */}
                              {count > 0 && (<>
                                <div style={{ position: 'absolute', inset: -6, borderRadius: '50%', border: `1px solid ${col}30`, transform: 'rotateX(70deg)', zIndex: 0 }} />
                                <div style={{ position: 'absolute', inset: -6, transformStyle: 'preserve-3d', animation: `ph-orbit ${3.5 + idx * 0.5}s linear infinite`, zIndex: 0 }}>
                                  <div style={{ position: 'absolute', top: -3, left: '50%', width: 6, height: 6, marginLeft: -3, borderRadius: '50%', background: col, boxShadow: `0 0 8px ${col}, 0 0 4px #fff` }} />
                                </div>
                              </>)}
                            </div>
                          </div>

                          {/* Label */}
                          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.38)', fontWeight: 500, whiteSpace: 'nowrap', textAlign: 'center' }}>
                            {stage}
                          </span>

                          {/* Proportion strip */}
                          <div style={{ width: 52, height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.06)' }}>
                            <div style={{
                              height: '100%', borderRadius: 2,
                              width: `${pct}%`,
                              background: col,
                              boxShadow: `0 0 6px ${col}90`,
                              transition: 'width 0.6s cubic-bezier(0.34,1.56,0.64,1)',
                            }} />
                          </div>
                        </div>

                        {/* Connector */}
                        {!isLast && (
                          <div style={{ flex: 1, height: 2, position: 'relative', margin: '0 6px', marginBottom: 26 }}>
                            {/* Static gradient line */}
                            <div style={{
                              position: 'absolute', inset: 0, borderRadius: 1,
                              background: `linear-gradient(90deg, ${col}50, ${nextCol}50)`,
                            }} />
                            {/* Flowing shimmer — CSS keyframe via style tag injected once */}
                            <div style={{
                              position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 1,
                              background: `linear-gradient(90deg, transparent 0%, ${nextCol}ee 50%, transparent 100%)`,
                              backgroundSize: '60% 100%',
                              animation: 'ph-flow 1.8s linear infinite',
                              opacity: 0.7,
                            }} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Keyframes — injected once */}
                <style>{`
    @keyframes ph-pulse {
      0%   { transform: scale(1);   opacity: 0.7; }
      100% { transform: scale(1.5); opacity: 0;   }
    }
    @keyframes ph-flow {
      0%   { background-position: -60% 0; }
      100% { background-position: 160% 0; }
    }
    @keyframes ph-orbit {
      from { transform: rotateX(70deg) rotateZ(0deg); }
      to   { transform: rotateX(70deg) rotateZ(360deg); }
    }
    .la-row { transition: transform .16s ease, box-shadow .16s ease; }
    .la-row:hover { transform: translateX(3px); box-shadow: 0 6px 18px rgba(0,0,0,0.4); }
  `}</style>
              </div>

            </div>
          )}

          {/* ── PIPELINE ─────────────────────────────────────────────────── */}
          {tab === 'pipeline' && (() => {
            const STAGE_ICONS: Record<string, string> = { Applied: '◈', Screened: '⬡', 'In Pilot': '▣', Validated: '⟁', Scaled: '✦' };
            const STAGE_DESC: Record<string, string> = { Applied: 'Submitted to a challenge', Screened: 'Eligibility verified', 'In Pilot': 'Running in sandbox', Validated: 'Independently audited', Scaled: 'Procured at scale' };
            return (
              <div className="hub-tab-content" style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: '18px 22px', boxSizing: 'border-box', overflow: 'hidden', position: 'relative', gap: 12 }}>

                {/* ── CSS ambient + multiple 3D decorations ── */}
                <style>{`
                  @keyframes pl-drift { 0%,100%{transform:translate(0,0)} 40%{transform:translate(14px,-18px)} 70%{transform:translate(-10px,10px)} }
                  @keyframes pl-spin  { from{transform:rotate(0deg)}  to{transform:rotate(360deg)} }
                  @keyframes pl-rspin { from{transform:rotate(0deg)}  to{transform:rotate(-360deg)} }
                  @keyframes pl-pulse { 0%,100%{opacity:.5;transform:scale(1)} 50%{opacity:1;transform:scale(1.1)} }
                  @keyframes pl-flow  { 0%{background-position:-60% 0} 100%{background-position:160% 0} }
                  @keyframes pl-float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-9px)} }
                  @keyframes pl-morph { 0%,100%{border-radius:60% 40% 30% 70%/60% 30% 70% 40%} 50%{border-radius:30% 60% 70% 40%/50% 60% 30% 60%} }
                  @keyframes pl-rise  { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
                  .pl-card { transition:box-shadow .2s ease,border-color .2s ease; animation:pl-rise .3s ease both; }
                  .pl-card:hover { box-shadow:0 16px 48px rgba(0,0,0,0.6), 0 0 0 1px var(--bc,rgba(255,255,255,0.14)); border-color:var(--bc,rgba(255,255,255,0.14)) !important; }
                  .pl-adv:hover  { filter:brightness(1.2); transform:scale(1.05); }
                  .pl-adv { transition:all .18s; }
                `}</style>

                {/* BG layer */}
                <div aria-hidden style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
                  {/* Blobs */}
                  <div style={{ position: 'absolute', top: '5%', left: '18%', width: 340, height: 340, borderRadius: '50%', background: 'radial-gradient(circle,rgba(139,92,246,0.07),transparent 70%)', animation: 'pl-drift 11s ease-in-out infinite' }} />
                  <div style={{ position: 'absolute', bottom: '8%', right: '12%', width: 280, height: 280, borderRadius: '50%', background: 'radial-gradient(circle,rgba(6,182,212,0.06),transparent 70%)', animation: 'pl-drift 14s ease-in-out infinite reverse' }} />
                  <div style={{ position: 'absolute', top: '48%', left: '4%', width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle,rgba(16,185,129,0.05),transparent 70%)', animation: 'pl-drift 9s ease-in-out infinite 3s' }} />

                  {/* 3D Element 1 — Orrery top-right (4 rings) */}
                  <div style={{ position: 'absolute', top: -45, right: 30, width: 240, height: 240 }}>
                    <div style={{ position: 'absolute', top: '50%', left: '50%', width: 22, height: 22, marginLeft: -11, marginTop: -11, borderRadius: '50%', background: 'radial-gradient(circle at 35% 35%,#fbbf24,#b45309)', boxShadow: '0 0 24px rgba(245,158,11,0.9)', animation: 'pl-pulse 2.5s ease-in-out infinite' }} />
                    {[{ w: 72, c: '#8b5cf6', sp: '3.2s' }, { w: 114, c: '#06b6d4', sp: '5.6s', rev: true }, { w: 166, c: '#10b981', sp: '9.2s' }, { w: 220, c: '#f59e0b', sp: '14s', rev: true }].map((o, i) => (
                      <div key={i} style={{ position: 'absolute', top: '50%', left: '50%', width: o.w, height: o.w, marginLeft: -o.w / 2, marginTop: -o.w / 2, borderRadius: '50%', border: `1px solid ${o.c}${i < 2 ? '35' : '20'}` }}>
                        <div style={{ position: 'absolute', top: i % 2 === 0 ? -5 : 'auto', bottom: i % 2 === 1 ? -5 : 'auto', left: '50%', width: 10, height: 10, marginLeft: -5, borderRadius: '50%', background: o.c, boxShadow: `0 0 10px ${o.c}`, animation: `pl-spin ${o.sp} linear infinite ${o.rev ? 'reverse' : ''}`, transformOrigin: `5px ${o.w / 2 + 5}px` }} />
                      </div>
                    ))}
                  </div>

                  {/* 3D Element 2 — Morphing blob bottom-left */}
                  <div style={{ position: 'absolute', bottom: 24, left: 16, width: 110, height: 110, background: 'linear-gradient(135deg,rgba(139,92,246,0.13),rgba(6,182,212,0.08))', animation: 'pl-morph 7s ease-in-out infinite', filter: 'blur(0.5px)', border: '1px solid rgba(139,92,246,0.18)' }} />

                  {/* 3D Element 3 — Rotating double-square diamond mid-bottom */}
                  <div style={{ position: 'absolute', bottom: '20%', left: '45%' }}>
                    <div style={{ position: 'relative', width: 52, height: 52, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <div style={{ position: 'absolute', width: 40, height: 40, border: '2px solid rgba(245,158,11,0.4)', borderRadius: 4, animation: 'pl-spin 9s linear infinite', transform: 'rotate(45deg)' }} />
                      <div style={{ position: 'absolute', width: 22, height: 22, border: '1px solid rgba(245,158,11,0.6)', borderRadius: 2, background: 'rgba(245,158,11,0.07)', animation: 'pl-rspin 6s linear infinite', transform: 'rotate(45deg)' }} />
                    </div>
                  </div>

                  {/* 3D Element 4 — Hexagon top-left area */}
                  <div style={{ position: 'absolute', top: '32%', left: '2%', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 60, height: 60 }}>
                    <div style={{ width: 46, height: 46, border: '2px solid rgba(6,182,212,0.3)', borderRadius: 8, animation: 'pl-spin 11s linear infinite', boxShadow: '0 0 16px rgba(6,182,212,0.15)', transform: 'rotate(45deg)' }} />
                    <div style={{ position: 'absolute', width: 24, height: 24, border: '1px solid rgba(6,182,212,0.5)', borderRadius: 4, animation: 'pl-rspin 7s linear infinite', boxShadow: '0 0 10px rgba(6,182,212,0.2)', transform: 'rotate(45deg)' }} />
                  </div>

                  {/* 3D Element 5 — Star/cross center */}
                  <div style={{ position: 'absolute', top: '18%', left: '32%', width: 44, height: 44, opacity: .32, animation: 'pl-spin 15s linear infinite' }}>
                    {[0, 45, 90, 135].map(a => <div key={a} style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 1.5, background: `linear-gradient(90deg,transparent,${a < 90 ? '#8b5cf6' : '#06b6d4'},transparent)`, marginTop: -0.75, transform: `rotate(${a}deg)` }} />)}
                  </div>

                  {/* 3D Element 6 — SVG triangle bottom-right */}
                  <div style={{ position: 'absolute', bottom: '22%', right: '20%', opacity: .28, animation: 'pl-float 6s ease-in-out 1s infinite' }}>
                    <svg width="52" height="46"><polygon points="26,2 50,44 2,44" fill="none" stroke="rgba(16,185,129,0.65)" strokeWidth="1.5" /><polygon points="26,14 42,40 10,40" fill="rgba(16,185,129,0.06)" stroke="rgba(16,185,129,0.28)" strokeWidth="1" /></svg>
                  </div>

                  {/* Particles */}
                  {[{ x: '8%', y: '40%', s: 4, c: '#8b5cf6', d: '0s' }, { x: '35%', y: '88%', s: 3, c: '#06b6d4', d: '.9s' }, { x: '62%', y: '14%', s: 5, c: '#10b981', d: '2.7s' }, { x: '88%', y: '58%', s: 3, c: '#f59e0b', d: '.5s' }, { x: '50%', y: '74%', s: 4, c: '#8b5cf6', d: '1.8s' }, { x: '72%', y: '82%', s: 3, c: '#06b6d4', d: '3.3s' }, { x: '18%', y: '62%', s: 3, c: '#f59e0b', d: '2s' }].map((p, i) => (
                    <div key={i} style={{ position: 'absolute', left: p.x, top: p.y, width: p.s, height: p.s, borderRadius: '50%', background: p.c, boxShadow: `0 0 ${p.s * 2.5}px ${p.c}`, opacity: .45, animation: `pl-float ${3.5 + i * .5}s ease-in-out ${p.d} infinite` }} />
                  ))}

                  {/* Flowing lines */}
                  {[{ t: '28%', c: '#8b5cf6', d: '0s' }, { t: '58%', c: '#06b6d4', d: '1.8s' }, { t: '82%', c: '#10b981', d: '3.2s' }].map((l, i) => (
                    <div key={i} style={{ position: 'absolute', left: 0, right: 0, top: l.t, height: 1, background: `linear-gradient(90deg,transparent,${l.c}15,transparent)`, backgroundSize: '40% 100%', animation: `pl-flow 7s linear ${l.d} infinite` }} />
                  ))}
                </div>

                {/* ── Header ── */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, position: 'relative', zIndex: pipelineSectorOpen ? 30 : 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', gap: 5 }}><Filter style={{ width: 11, height: 11 }} />Sector</span>
                    {/* Themed sector dropdown (replaces the chip row so it reads as one control) */}
                    <div ref={pipelineSectorRef} style={{ position: 'relative' }}>
                      <button
                        type="button"
                        onClick={() => setPipelineSectorOpen(o => !o)}
                        aria-haspopup="listbox"
                        aria-expanded={pipelineSectorOpen}
                        style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '6px 12px', borderRadius: 999, fontSize: 11, fontWeight: 700, cursor: 'pointer', transition: 'all .18s', background: pipelineSector !== 'All' ? 'rgba(139,92,246,0.28)' : 'rgba(255,255,255,0.05)', color: pipelineSector !== 'All' ? '#a78bfa' : 'rgba(255,255,255,0.6)', border: `1px solid ${pipelineSector !== 'All' || pipelineSectorOpen ? 'rgba(139,92,246,0.55)' : 'rgba(255,255,255,0.1)'}`, boxShadow: pipelineSector !== 'All' ? '0 0 16px rgba(139,92,246,0.35)' : 'none' }}
                      >
                        <span style={{ whiteSpace: 'nowrap' }}>{pipelineSector === 'All' ? 'All sectors' : pipelineSector}</span>
                        <ChevronRight style={{ width: 12, height: 12, transform: pipelineSectorOpen ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform .18s' }} />
                      </button>
                      {pipelineSectorOpen && (
                        <div className="analytics-scroll" role="listbox" style={{ position: 'absolute', top: 'calc(100% + 8px)', left: 0, width: 224, maxHeight: 300, overflowY: 'auto', zIndex: 60, background: 'rgba(8,8,16,.97)', border: '1px solid rgba(255,255,255,.1)', borderTop: '2px solid rgba(139,92,246,.55)', borderRadius: 14, boxShadow: '0 24px 70px rgba(0,0,0,.7)', backdropFilter: 'blur(14px)', padding: 8 }}>
                          <div style={{ padding: '2px 8px 8px', borderBottom: '1px solid rgba(255,255,255,.06)', fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,.4)', textTransform: 'uppercase', letterSpacing: '.06em' }}>Filter by sector</div>
                          <div style={{ marginTop: 6 }}>
                            {['All', ...Array.from(new Set(startups.map(s => s.industry).filter(Boolean))).sort()].map(s => {
                              const active = pipelineSector === s;
                              const cnt = s === 'All' ? startups.length : startups.filter(x => x.industry === s).length;
                              return (
                                <button key={s} role="option" aria-selected={active} onClick={() => { setPipelineSector(s); setPipelineSectorOpen(false); }} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left', padding: '8px 10px', borderRadius: 10, marginBottom: 2, background: active ? 'rgba(139,92,246,.14)' : 'transparent', border: `1px solid ${active ? 'rgba(139,92,246,.34)' : 'transparent'}`, cursor: 'pointer', transition: 'background .15s' }}
                                  onMouseEnter={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,.05)'; }}
                                  onMouseLeave={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
                                >
                                  <span style={{ width: 7, height: 7, borderRadius: '50%', flexShrink: 0, background: active ? '#a78bfa' : 'rgba(255,255,255,.25)', boxShadow: active ? '0 0 7px #a78bfa' : 'none' }} />
                                  <span style={{ flex: 1, minWidth: 0, fontSize: 12, fontWeight: 600, color: active ? 'white' : 'rgba(255,255,255,.62)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s === 'All' ? 'All sectors' : s}</span>
                                  <span style={{ fontSize: 9, fontWeight: 800, padding: '1px 7px', borderRadius: 999, background: active ? 'rgba(139,92,246,.2)' : 'rgba(255,255,255,.06)', color: active ? '#c4b5fd' : 'rgba(255,255,255,.3)' }}>{cnt}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {STAGE_ORDER.map(stage => {
                      const cnt = filteredPipeline.filter(s => s.stage === stage).length; const sc = STAGE_COLORS[stage];
                      return cnt > 0 ? (<div key={stage} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 9px', borderRadius: 999, background: `${sc}12`, border: `1px solid ${sc}28` }}><span style={{ width: 5, height: 5, borderRadius: '50%', background: sc, boxShadow: `0 0 5px ${sc}`, display: 'inline-block' }} /><span style={{ fontSize: 9, fontWeight: 700, color: sc }}>{cnt}</span><span style={{ fontSize: 8, color: 'rgba(255,255,255,0.22)' }}>{stage.split(' ')[0]}</span></div>) : null;
                    })}
                    <div style={{ width: 1, height: 18, background: 'rgba(255,255,255,0.08)' }} />
                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.28)' }}>{filteredPipeline.length} startups</span>
                  </div>
                </div>

                {/* ── Funnel bar ── */}
                <div style={{ flexShrink: 0, position: 'relative', zIndex: 1, display: 'flex', height: 26, borderRadius: 13, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(0,0,0,0.3)' }}>
                  {STAGE_ORDER.map((stage, i) => {
                    const cnt = filteredPipeline.filter(s => s.stage === stage).length;
                    const pct = Math.max((cnt / Math.max(filteredPipeline.length, 1)) * 100, 4);
                    const sc = STAGE_COLORS[stage]; const isLast = i === STAGE_ORDER.length - 1;
                    return (
                      <div key={stage} style={{ height: '100%', flex: `0 0 ${pct}%`, background: `linear-gradient(90deg,${sc}50,${sc}28)`, borderRight: isLast ? 'none' : '1px solid rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, overflow: 'hidden', boxShadow: `inset 0 0 18px ${sc}18` }}>
                        {pct > 10 && <><span style={{ fontSize: 8, fontWeight: 700, color: 'rgba(255,255,255,0.55)', whiteSpace: 'nowrap' }}>{stage.split(' ')[0]}</span><span style={{ fontSize: 8, fontWeight: 800, color: sc }}>{cnt}</span></>}
                      </div>
                    );
                  })}
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg,transparent,rgba(255,255,255,0.05) 50%,transparent)', backgroundSize: '60% 100%', animation: 'pl-flow 2.5s linear infinite', pointerEvents: 'none' }} />
                </div>

                {/* ── Kanban — 5 equal columns, each with rigid scroll ── */}
                <div className="hub-pipeline-kanban" style={{ flex: 1, minHeight: 0, display: 'flex', gap: 10, position: 'relative', zIndex: 1, overflow: 'hidden' }}>
                  {STAGE_ORDER.map((stage, stageIdx) => {
                    const sc = STAGE_COLORS[stage];
                    const stageCards = filteredPipeline.filter(s => s.stage === stage);
                    const cards = pinned?.kind === 'startup' ? bringToFront(stageCards, s => s.id === pinned.key) : stageCards;
                    const icon = STAGE_ICONS[stage]; const desc = STAGE_DESC[stage];
                    const isLast = stageIdx === STAGE_ORDER.length - 1;
                    return (
                      <div key={stage} style={{ flex: 1, minWidth: 0, minHeight: 0, display: 'flex', flexDirection: 'column', borderRadius: 16, border: `1px solid ${sc}28`, background: `linear-gradient(170deg,${sc}09 0%,rgba(6,6,18,0.94) 60%)`, overflow: 'hidden', position: 'relative' }}>
                        {/* Top glow */}
                        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg,transparent,${sc}88,transparent)`, pointerEvents: 'none' }} />
                        {/* Corner radial */}
                        <div style={{ position: 'absolute', top: -36, right: -36, width: 120, height: 120, borderRadius: '50%', background: `radial-gradient(circle,${sc}10,transparent 70%)`, pointerEvents: 'none' }} />

                        {/* Column header — always visible, never scrolls */}
                        <div style={{ padding: '12px 12px 8px', flexShrink: 0, borderBottom: `1px solid ${sc}16` }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                              <div style={{ width: 28, height: 28, borderRadius: 8, background: `${sc}16`, border: `1px solid ${sc}32`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, boxShadow: `0 0 12px ${sc}35`, flexShrink: 0 }}>{icon}</div>
                              <div>
                                <p style={{ fontSize: 11, fontWeight: 700, color: 'white', margin: 0 }}>{stage}</p>
                                <p style={{ fontSize: 8, color: 'rgba(255,255,255,0.28)', margin: 0 }}>{desc}</p>
                              </div>
                            </div>
                            <div style={{ minWidth: 20, height: 20, borderRadius: 999, background: `${sc}20`, border: `1px solid ${sc}42`, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 6px' }}>
                              <span style={{ fontSize: 10, fontWeight: 800, color: sc, filter: `drop-shadow(0 0 4px ${sc})` }}>{cards.length}</span>
                            </div>
                          </div>
                          <div style={{ height: 2, borderRadius: 1, background: 'rgba(255,255,255,0.05)' }}>
                            <div style={{ height: '100%', borderRadius: 1, width: `${Math.min((cards.length / 2) * 100, 100)}%`, background: `linear-gradient(90deg,${sc},${sc}55)`, boxShadow: `0 0 6px ${sc}70`, transition: 'width .5s' }} />
                          </div>
                        </div>

                        {/* ── Scrollable area — cards have FIXED height so they're uniform ── */}
                        <div className="analytics-scroll" style={{ flex: 1, overflowY: 'auto', padding: '8px 8px 6px', display: 'flex', flexDirection: 'column', gap: 8, minHeight: 0 }}>
                          {cards.length === 0 && (
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 5, opacity: .18 }}>
                              <div style={{ width: 28, height: 28, borderRadius: 8, border: `1px dashed ${sc}50`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>{icon}</div>
                              <span style={{ fontSize: 9, color: 'white' }}>Empty stage</span>
                            </div>
                          )}
                          {cards.map((s, ci) => {
                            const scoreCol = s.metrics.pitchScore >= 90 ? '#10b981' : s.metrics.pitchScore >= 75 ? '#06b6d4' : '#f59e0b';
                            return (
                              /* FIXED height = perfectly uniform cards, no layout shifts */
                              <div key={s.id} className={`pl-card${focus?.kind === 'startup' && focus.key === s.id ? ' search-focus' : ''}`} style={{ ['--bc' as string]: `${sc}50`, height: 192, flexShrink: 0, borderRadius: 13, border: `1px solid ${sc}20`, background: `linear-gradient(145deg,${sc}0c 0%,rgba(0,0,0,0.6) 100%)`, padding: '11px 12px', cursor: 'pointer', position: 'relative', overflow: 'hidden', animationDelay: `${ci * 0.06}s`, display: 'flex', flexDirection: 'column' }}
                                onClick={() => { requireOwnership(s.id, () => { const knownIndustries = ['SaaS','FinTech','DeepTech','HealthTech','EdTech','AgriTech','ClimaTech','D2C / Consumer','E-commerce','Logistics & Supply Chain','HRTech','LegalTech','PropTech','SpaceTech','Gaming','Media & Content','Others']; const isKnown = knownIndustries.includes(s.industry); setEditTarget({ ...s, industry: isKnown ? s.industry : 'Others' }); setEditCustomIndustry(isKnown ? '' : s.industry); }); }}>
                                {/* Top shimmer */}
                                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg,transparent,${sc}65,transparent)` }} />

                                {/* Pending approval banner — owner-only */}
                                {(s as any).status === 'pending' && (
                                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 13, background: 'rgba(4,4,14,0.72)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, zIndex: 4, backdropFilter: 'blur(2px)' }}>
                                    <span style={{ fontSize: 9, fontWeight: 800, padding: '3px 10px', borderRadius: 999, color: '#fbbf24', background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.4)', letterSpacing: '.08em' }}>PENDING APPROVAL</span>
                                    <p style={{ margin: 0, fontSize: 10, color: 'rgba(255,255,255,0.35)', textAlign: 'center', lineHeight: 1.5, maxWidth: 140 }}>Awaiting admin review — visible only to you</p>
                                  </div>
                                )}

                                {/* Row 1: name + score ring */}
                                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 6, flexShrink: 0 }}>
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <p style={{ fontSize: 13, fontWeight: 700, color: 'white', margin: 0, lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</p>
                                    <span style={{ fontSize: 8, fontWeight: 700, padding: '2px 7px', borderRadius: 999, color: sc, background: `${sc}18`, border: `1px solid ${sc}32`, display: 'inline-block', marginTop: 3, letterSpacing: '.05em' }}>{s.industry}</span>
                                  </div>
                                  <ScoreRing score={s.metrics.pitchScore} size={32} />
                                </div>

                                {/* Row 2: tagline — exactly 2 lines clamped */}
                                <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', lineHeight: 1.55, margin: '7px 0', flex: 1, minHeight: 0, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const }}>{s.tagline}</p>

                                {/* Row 3: 3 metric chips */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 5, flexShrink: 0, marginBottom: 8 }}>
                                  {[['MRR', isNaN(s.metrics.mrr) ? 'N/A' : '₹' + Math.round(s.metrics.mrr / 1000) + 'K'], ['Users', isNaN(s.metrics.users) || s.metrics.users === 0 ? 'N/A' : s.metrics.users > 999 ? Math.round(s.metrics.users / 1000) + 'K' : String(s.metrics.users)], ['Score', String(s.metrics.pitchScore)]].map(([lbl, val], mi) => (
                                    <div key={lbl} style={{ padding: '4px 0', borderRadius: 7, background: mi === 2 ? `${scoreCol}10` : 'rgba(255,255,255,0.04)', border: `1px solid ${mi === 2 ? scoreCol + '25' : 'rgba(255,255,255,0.07)'}`, textAlign: 'center' }}>
                                      <p style={{ fontSize: 7, color: 'rgba(255,255,255,0.25)', margin: 0, textTransform: 'uppercase', letterSpacing: '.05em' }}>{lbl}</p>
                                      <p style={{ fontSize: 11, fontWeight: 800, color: mi === 2 ? scoreCol : 'white', margin: 0 }}>{val}</p>
                                    </div>
                                  ))}
                                </div>

                                {/* Row 4: footer */}
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 7, borderTop: `1px solid ${sc}16`, flexShrink: 0 }}>
                                  <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.28)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '40%' }}>👤 {s.founder}</span>

                                  {/* Three-dot menu — only for owner or admin */}
                                  {(isAdmin || userStartups.some(us => us.id === s.id)) && (
                                  <div className="vault-menu-trigger" style={{ position: 'relative' }}>
                                    <MoreHorizontal
                                      style={{ width: 13, height: 13, color: 'rgba(255,255,255,0.25)', cursor: 'pointer', transition: 'color 0.2s' }}
                                      onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.8)')}
                                      onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.25)')}
                                      onClick={e => {
                                        e.stopPropagation();
                                        document.querySelectorAll('.vault-menu').forEach(m => (m as HTMLElement).style.display = 'none');
                                        const menu = e.currentTarget.nextSibling as HTMLElement;
                                        if (menu) menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
                                      }}
                                    />
                                    <div className="vault-menu" style={{ display: 'none', position: 'absolute', right: 0, bottom: 20, background: '#0d0d18', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, overflow: 'hidden', zIndex: 50, minWidth: 130, boxShadow: '0 8px 32px rgba(0,0,0,0.6)' }}>
                                      <button
                                        onClick={e => { e.stopPropagation(); requireOwnership(s.id, () => { const knownIndustries = ['SaaS','FinTech','DeepTech','HealthTech','EdTech','AgriTech','ClimaTech','D2C / Consumer','E-commerce','Logistics & Supply Chain','HRTech','LegalTech','PropTech','SpaceTech','Gaming','Media & Content','Others']; const isKnown = knownIndustries.includes(s.industry); setEditTarget({ ...s, industry: isKnown ? s.industry : 'Others' }); setEditCustomIndustry(isKnown ? '' : s.industry); }); }}
                                        style={{ width: '100%', padding: '9px 14px', background: 'none', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.06)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#a78bfa', textAlign: 'left' }}
                                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(167,139,250,0.1)')}
                                        onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                                      >
                                        <Pencil style={{ width: 12, height: 12 }} /> Edit
                                      </button>
                                      <button
                                        onClick={e => removeStartup(s.id, e)}
                                        style={{ width: '100%', padding: '9px 14px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#f87171', textAlign: 'left' }}
                                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(248,113,113,0.1)')}
                                        onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                                      >
                                        <Trash2 style={{ width: 12, height: 12 }} /> Remove
                                      </button>
                                    </div>
                                  </div>
                                  )}

                                  {!isLast ? (
                                    (isAdmin || userStartups.some(us => us.id === s.id)) ? (
                                      <button className="pl-adv" onClick={e => advance(s.id, e)} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 999, fontSize: 9, fontWeight: 700, background: `linear-gradient(90deg,${sc}35,${sc}15)`, color: sc, border: `1px solid ${sc}48`, boxShadow: `0 0 10px ${sc}28`, cursor: 'pointer', flexShrink: 0 }}>
                                        {isAdmin ? 'Advance' : 'Request Advance'} <ArrowRight style={{ width: 9, height: 9 }} />
                                      </button>
                                    ) : null
                                  ) : (
                                    <span style={{ fontSize: 8, fontWeight: 700, padding: '3px 8px', borderRadius: 999, color: '#34d399', background: 'rgba(52,211,153,0.14)', border: '1px solid rgba(52,211,153,0.32)', flexShrink: 0 }}>✓ Secured</span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Add — pinned bottom */}
                        <div style={{ padding: '6px 8px', flexShrink: 0, borderTop: `1px solid ${sc}12` }}>
                          <button
                            onClick={() => requireAuth('Sign in to register your startup on Sanyog.', () => { setRegisterInitialStage(stage); setRegisterStep(1); setRegisterOpen(true); })}
                            style={{ width: '100%', padding: '6px', borderRadius: 10, border: `1px dashed ${sc}28`, background: `${sc}05`, color: `${sc}75`, fontSize: 10, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, transition: 'all .18s' }}
                            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = sc; (e.currentTarget as HTMLButtonElement).style.color = sc; (e.currentTarget as HTMLButtonElement).style.background = `${sc}10`; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = `${sc}28`; (e.currentTarget as HTMLButtonElement).style.color = `${sc}75`; (e.currentTarget as HTMLButtonElement).style.background = `${sc}05`; }}>
                            <Plus style={{ width: 11, height: 11 }} /> Add
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* ── BRAND VAULT ──────────────────────────────────────────────── */}
          {tab === 'vault' && (
            <div className="hub-tab-content" style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 16, padding: '20px 28px', boxSizing: 'border-box', overflow: 'hidden', position: 'relative' }}>

              {/* ── Nebula background ── */}
              <div style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden' }}>
                <VaultNebulaField />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.6) 100%)' }} />
              </div>

              {/* ── Filter row ── */}
              <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, position: 'relative', zIndex: vaultTypeOpen ? 30 : 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Filter style={{ width: 12, height: 12 }} />Type:
                  </span>
                  <div className="bv-filter-pills">
                    <FilterPills options={['All', 'Deck', 'Doc', 'Sheet', 'Video', 'Bundle']} value={vaultType} onChange={setVaultType} />
                  </div>
                  {/* Mobile picker — custom themed dropdown (replaces the native <select> on small screens) */}
                  <div className="bv-filter-select" ref={vaultTypeRef} style={{ display: 'none', position: 'relative', flexShrink: 0 }}>
                    <button
                      type="button"
                      onClick={() => setVaultTypeOpen(o => !o)}
                      aria-haspopup="listbox"
                      aria-expanded={vaultTypeOpen}
                      style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 10, minWidth: 128, background: vaultType !== 'All' ? 'rgba(139,92,246,0.22)' : 'rgba(255,255,255,0.05)', border: `1px solid ${vaultType !== 'All' || vaultTypeOpen ? 'rgba(139,92,246,0.5)' : 'rgba(255,255,255,0.14)'}`, color: vaultType !== 'All' ? '#c4b5fd' : 'white', fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}
                    >
                      <span style={{ flex: 1, textAlign: 'left', whiteSpace: 'nowrap' }}>{vaultType === 'All' ? 'All types' : vaultType}</span>
                      <ChevronRight style={{ width: 13, height: 13, opacity: 0.7, transform: vaultTypeOpen ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform .18s', flexShrink: 0 }} />
                    </button>
                    {vaultTypeOpen && (
                      <div role="listbox" style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, minWidth: 176, zIndex: 60, background: 'rgba(8,8,16,.97)', border: '1px solid rgba(255,255,255,.1)', borderTop: '2px solid rgba(139,92,246,.55)', borderRadius: 14, boxShadow: '0 24px 70px rgba(0,0,0,.7)', backdropFilter: 'blur(14px)', padding: 8 }}>
                        {['All', 'Deck', 'Doc', 'Sheet', 'Video', 'Bundle'].map(t => {
                          const active = vaultType === t;
                          return (
                            <button key={t} role="option" aria-selected={active} onClick={() => { setVaultType(t); setVaultTypeOpen(false); }} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left', padding: '8px 10px', borderRadius: 10, marginBottom: 2, background: active ? 'rgba(139,92,246,.14)' : 'transparent', border: `1px solid ${active ? 'rgba(139,92,246,.34)' : 'transparent'}`, cursor: 'pointer', transition: 'background .15s' }}
                              onMouseEnter={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,.05)'; }}
                              onMouseLeave={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
                            >
                              <span style={{ width: 7, height: 7, borderRadius: '50%', flexShrink: 0, background: active ? '#a78bfa' : 'rgba(255,255,255,.25)', boxShadow: active ? '0 0 7px #a78bfa' : 'none' }} />
                              <span style={{ flex: 1, minWidth: 0, fontSize: 12.5, fontWeight: 600, color: active ? 'white' : 'rgba(255,255,255,.62)' }}>{t === 'All' ? 'All types' : t}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  {vaultBrand && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '5px 10px 5px 12px', borderRadius: 999, fontSize: 11, fontWeight: 700, color: '#a78bfa', background: 'rgba(139,92,246,0.14)', border: '1px solid rgba(139,92,246,0.35)' }}>
                      <FolderKey style={{ width: 11, height: 11 }} />Viewing: {vaultBrand}
                      <button onClick={() => setVaultBrand(null)} aria-label="Clear brand filter" style={{ display: 'flex', background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '50%', width: 16, height: 16, alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'rgba(255,255,255,0.6)' }}>
                        <X style={{ width: 9, height: 9 }} />
                      </button>
                    </span>
                  )}
                </div>
                <button onClick={() => requireAuth('Sign in to upload your deck to the Solution Vault.', async () => {
                  // Decide from FRESH server truth so a founder who was just approved
                  // (possibly by an admin in another session) is never wrongly asked
                  // to register again. Falls back to current state if the fetch fails.
                  const fresh = await refreshStartups();
                  const mine = (fresh ?? userStartups).filter(s =>
                    !EXTENDED_STARTUPS.find(es => es.id === s.id) &&
                    (s.owner_email === user?.email || s.created_by_email === user?.email));
                  if (mine.length === 0) setUploadGuardOpen(true);
                  else if (!mine.some(s => (s as any).status !== 'pending')) setUploadPendingGuardOpen(true);
                  else setUploadChoiceOpen(true);
                })}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 18px', borderRadius: 999, fontSize: 12, fontWeight: 600, border: '1px solid rgba(255,255,255,0.10)', background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', transition: 'all 0.2s' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(139,92,246,0.5)'; (e.currentTarget as HTMLButtonElement).style.color = '#c4b5fd'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.10)'; (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.6)'; }}>
                  <Upload style={{ width: 14, height: 14 }} /> Upload<span className="bv-upload-doc-word"> Document</span>
                </button>
              </div>

              {/* ── Stats strip ── */}
              <div className="hub-stat-grid" style={{ flexShrink: 0, display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, position: 'relative', zIndex: 1 }}>
                {[
                  { label: 'Solution Docs', val: filteredDocs.length, color: '#8b5cf6', Icon: FolderKey },
                  { label: 'Avg AI Score', val: Math.round(filteredDocs.reduce((a, d) => a + d.score, 0) / (filteredDocs.length || 1)), color: '#06b6d4', Icon: Target },
                  { label: 'Total Views', val: filteredDocs.reduce((a, d) => a + d.views, 0) + '×', color: '#10b981', Icon: Activity },
                  { label: 'Final Docs', val: filteredDocs.filter(d => d.status === 'Final').length, color: '#f59e0b', Icon: CheckCircle },
                ].map(s => {
                  const { Icon } = s;
                  return (
                    <div key={s.label} style={{ background: `linear-gradient(135deg,${s.color}15,rgba(0,0,0,0.6))`, border: `1px solid ${s.color}28`, borderRadius: 12, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, position: 'relative', overflow: 'hidden', backdropFilter: 'blur(12px)' }}>
                      <div style={{ position: 'absolute', top: -16, right: -16, width: 72, height: 72, borderRadius: '50%', background: `radial-gradient(circle,${s.color}30,transparent 70%)`, pointerEvents: 'none' }} />
                      <div style={{ width: 34, height: 34, borderRadius: 9, background: `${s.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: `0 0 16px ${s.color}50` }}>
                        <Icon style={{ width: 16, height: 16, color: s.color, filter: `drop-shadow(0 0 5px ${s.color})` }} />
                      </div>
                      <div>
                        <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.28)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>{s.label}</p>
                        <p style={{ fontSize: 20, fontWeight: 800, color: 'white', margin: 0, lineHeight: 1.1 }}>{s.val}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* ── Card grid ── */}
              {filteredDocs.length === 0 && (
                <div style={{ textAlign: 'center', paddingTop: 60, color: 'rgba(255,255,255,0.2)', fontSize: 14, position: 'relative', zIndex: 1 }}>{vaultBrand ? `No Solution Vault documents for ${vaultBrand} yet` : 'No documents of this type'}</div>
              )}
              <div className="analytics-scroll" style={{ flex: 1, minHeight: 0, overflowY: 'auto', position: 'relative', zIndex: 1 }}>
                <div className="hub-card-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
                  {(pinned?.kind === 'doc' ? bringToFront(filteredDocs, d => d.name === pinned.key) : filteredDocs).map(d => {
                    const tc = TYPE_COLOR[d.type] || '#8b5cf6';
                    const sc = STAT_COLOR[d.status];
                    const scoreCol = d.score >= 90 ? '#10b981' : d.score >= 75 ? '#06b6d4' : '#f59e0b';
                    const r = 17;
                    const circ = 2 * Math.PI * r;
                    const dash = (d.score / 100) * circ;
                    const maxViews = Math.max(...vaultDocs.map(x => x.views), 1);

                    return (
                      <div key={d.name}
                        className={focus?.kind === 'doc' && focus.key === d.name ? 'search-focus' : undefined}
                        onClick={() => {
                          if ((d as any).deck_type === 'investor') {
                            if (!user) { setSignInPromptMsg('Sign in as a verified investor to access this deck.'); setSignInPromptOpen(true); return; }
                            if (!isVC) { setSignInPromptMsg('This deck is restricted to verified investors only. Contact the platform admin to get VC access.'); setSignInPromptOpen(true); return; }
                          }
                          setViewingDoc(d);
                        }}
                        style={{
                          background: `linear-gradient(135deg,${tc}14 0%,rgba(0,0,0,0.7) 55%,${scoreCol}07 100%)`,
                          border: `1px solid ${tc}35`,
                          borderTop: `2.5px solid ${tc}95`,
                          borderRadius: 14,
                          padding: '16px 16px 14px',
                          cursor: d.file_url ? 'pointer' : 'default',
                          position: 'relative',
                          overflow: 'hidden',
                          backdropFilter: 'blur(14px)',
                          transition: 'transform 0.2s, box-shadow 0.2s',
                        }}
                        onMouseEnter={e => {
                          const el = e.currentTarget as HTMLDivElement;
                          el.style.transform = 'translateY(-4px)';
                          el.style.boxShadow = `0 14px 44px ${tc}30, 0 0 0 1px ${tc}50`;
                        }}
                        onMouseLeave={e => {
                          const el = e.currentTarget as HTMLDivElement;
                          el.style.transform = 'translateY(0)';
                          el.style.boxShadow = 'none';
                        }}
                      >
                        {/* Corner radial */}
                        <div style={{ position: 'absolute', top: -28, right: -28, width: 120, height: 120, borderRadius: '50%', background: `radial-gradient(circle,${tc}25,transparent 70%)`, pointerEvents: 'none' }} />

                        {/* Top: 3D planet + type badge + score ring */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            {/* 3D Document Planet */}
                            <DocPlanet typeColor={tc} docType={d.type} />
                            <div>
                              <span style={{ fontSize: 9, fontWeight: 800, color: tc, textTransform: 'uppercase', letterSpacing: '0.07em', padding: '3px 9px', borderRadius: 999, background: `${tc}20`, border: `1px solid ${tc}40`, display: 'inline-block', boxShadow: `0 0 12px ${tc}35` }}>
                                {d.type}
                              </span>
                              <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.22)', margin: '5px 0 0' }}>{d.date}</p>
                            </div>
                          </div>

                          {/* Orbital score ring */}
                          <div style={{ position: 'relative', width: 46, height: 46, flexShrink: 0 }}>
                            <svg width={46} height={46} viewBox="0 0 46 46">
                              <circle cx="23" cy="23" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="2.5" />
                              <circle cx="23" cy="23" r={r} fill="none" stroke={scoreCol} strokeWidth="2.5"
                                strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
                                transform="rotate(-90 23 23)"
                                style={{ filter: `drop-shadow(0 0 5px ${scoreCol})` }}
                              />
                              <circle
                                cx={23 + r * Math.cos((-Math.PI / 2) + (d.score / 100) * 2 * Math.PI)}
                                cy={23 + r * Math.sin((-Math.PI / 2) + (d.score / 100) * 2 * Math.PI)}
                                r="3" fill={scoreCol}
                                style={{ filter: `drop-shadow(0 0 4px ${scoreCol})` }}
                              />
                            </svg>
                            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                              <span style={{ fontSize: 13, fontWeight: 800, color: scoreCol, lineHeight: 1, filter: `drop-shadow(0 0 6px ${scoreCol})` }}>{d.score}</span>
                              <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.04em', marginTop: 1 }}>AI</span>
                            </div>
                          </div>
                        </div>

                        {/* Doc name */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 0 }}>
                          <p style={{ fontSize: 13, fontWeight: 700, color: 'white', margin: 0, lineHeight: 1.35, flex: 1 }}>{d.name}</p>
                          {(d as any).deck_type === 'investor' && (
                            <div title="Investor-only deck" style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '2px 7px', borderRadius: 999, background: 'rgba(6,182,212,0.12)', border: '1px solid rgba(6,182,212,0.3)', flexShrink: 0 }}>
                              <Lock style={{ width: 8, height: 8, color: '#06b6d4' }} />
                              <span style={{ fontSize: 8, fontWeight: 700, color: '#06b6d4', letterSpacing: '0.05em' }}>VC ONLY</span>
                            </div>
                          )}
                        </div>

                        {/* Gradient divider */}
                        <div style={{ height: 1, background: `linear-gradient(90deg,${tc}50,rgba(255,255,255,0.04),transparent)`, margin: '11px 0' }} />

                        {/* Bottom */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <div style={{ width: 7, height: 7, borderRadius: '50%', background: sc, boxShadow: `0 0 8px ${sc}`, flexShrink: 0 }} />
                            <span style={{ fontSize: 10, fontWeight: 700, color: sc }}>{d.status}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                            <Activity style={{ width: 11, height: 11, color: 'rgba(255,255,255,0.28)' }} />
                            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>{d.views}× views</span>
                          </div>
                          {(isAdmin || userStartups.some(us => us.name === (d as any).startup_name)) && (
                          <div className="vault-menu-trigger" style={{ position: 'relative' }}>
                            <MoreHorizontal
                              style={{ width: 14, height: 14, color: 'rgba(255,255,255,0.18)', cursor: 'pointer', transition: 'color 0.2s' }}
                              onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.85)')}
                              onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.18)')}
                              onClick={e => {
                                e.stopPropagation();
                                // Close all other open menus first
                                document.querySelectorAll('.vault-menu').forEach(m => {
                                  (m as HTMLElement).style.display = 'none';
                                });
                                const menu = e.currentTarget.nextSibling as HTMLElement;
                                if (menu) menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
                              }}
                            />
                            <div className="vault-menu" style={{
                              display: 'none', position: 'absolute', right: 0, bottom: 20,
                              background: '#0d0d18', border: '1px solid rgba(255,255,255,0.1)',
                              borderRadius: 10, overflow: 'hidden', zIndex: 50, minWidth: 140,
                              boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
                            }}>
                              {/* Edit button */}
                              <button
                                onClick={e => {
                                  e.stopPropagation();
                                  setEditingDoc(d);
                                  setUploadOpen(true);
                                }}
                                style={{
                                  width: '100%', padding: '9px 14px', background: 'none',
                                  border: 'none', borderBottom: '1px solid rgba(255,255,255,0.06)',
                                  cursor: 'pointer', display: 'flex',
                                  alignItems: 'center', gap: 8, fontSize: 12,
                                  color: '#a78bfa', textAlign: 'left',
                                }}
                                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(167,139,250,0.1)')}
                                onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                              >
                                <Pencil style={{ width: 12, height: 12 }} /> Edit / Re-upload
                              </button>
                              {/* Remove button */}
                              <button
                                onClick={async e => {
                                  e.stopPropagation();
                                  // Remove from local state immediately
                                  setVaultDocs(prev => prev.filter(doc => doc.name !== d.name));
                                  // Remove from Supabase permanently
                                  // Mock docs have no file_path — skip server call for them
                                  if (d.file_path || d.file_url) {
                                    fetch('/api/documents/delete', {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ name: d.name, file_path: d.file_path }),
                                    }).catch(console.error);
                                  }
                                }}
                                style={{
                                  width: '100%', padding: '9px 14px', background: 'none',
                                  border: 'none', cursor: 'pointer', display: 'flex',
                                  alignItems: 'center', gap: 8, fontSize: 12,
                                  color: '#f87171', textAlign: 'left',
                                }}
                                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(248,113,113,0.1)')}
                                onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                              >
                                <Trash2 style={{ width: 12, height: 12 }} /> Remove
                              </button>
                            </div>
                          </div>
                          )}
                        </div>

                        {/* Views bar */}
                        <div style={{ height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                          <div style={{
                            height: '100%', borderRadius: 2,
                            width: `${Math.min((d.views / maxViews) * 100, 100)}%`,
                            background: `linear-gradient(90deg,${tc},${scoreCol})`,
                            boxShadow: `0 0 8px ${tc}80`,
                            transition: 'width 0.6s cubic-bezier(0.34,1.56,0.64,1)',
                          }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ── DILIGENCE ROOM (removed) ─── */}
          {tab === 'diligence_disabled' && (() => {
            const pendingCount = vcRequests.filter(r => r.status === 'pending').length;
            const approvedCount = vcRequests.filter(r => r.status === 'approved').length;
            return (
              <div className="hub-tab-content" style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: '20px 28px', boxSizing: 'border-box', overflow: 'hidden', position: 'relative', gap: 18 }}>

                {/* Background */}
                <div style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden' }}>
                  <VaultNebulaField />
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg,rgba(16,1,40,0.82) 0%,rgba(0,6,24,0.88) 100%)' }} />
                  {/* Faint grid */}
                  <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(99,102,241,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(99,102,241,0.04) 1px,transparent 1px)', backgroundSize: '40px 40px' }} />
                </div>

                {/* ── Header row ── */}
                <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', zIndex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 38, height: 38, borderRadius: 10, background: 'linear-gradient(135deg,#6366f130,#06b6d420)', border: '1px solid rgba(99,102,241,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 20px rgba(99,102,241,0.25)' }}>
                      <Shield style={{ width: 17, height: 17, color: '#818cf8' }} />
                    </div>
                    <div>
                      <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#fff', letterSpacing: '0.01em' }}>Diligence Room</p>
                      <p style={{ margin: 0, fontSize: 10, color: 'rgba(255,255,255,0.28)', marginTop: 1 }}>End-to-end encrypted · Investor-only access · Founder-approved</p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 999, background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.3)' }}>
                      <Lock style={{ width: 9, height: 9, color: '#818cf8' }} />
                      <span style={{ fontSize: 9, fontWeight: 800, color: '#818cf8', letterSpacing: '0.08em' }}>E2E ENCRYPTED</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setDiligenceUploadOpen(true)}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 20px', borderRadius: 999, fontSize: 12, fontWeight: 700, background: 'linear-gradient(90deg,#6366f1,#4f46e5)', color: '#fff', border: 'none', cursor: 'pointer', boxShadow: '0 0 20px rgba(99,102,241,0.4)', letterSpacing: '0.02em' }}>
                    <Upload style={{ width: 13, height: 13 }} /> {diligenceDoc ? 'Replace Investor Deck' : 'Upload Investor Deck'}
                  </button>
                </div>

                {/* ── Stats row ── */}
                <div className="hub-stat-grid" style={{ flexShrink: 0, display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, position: 'relative', zIndex: 1 }}>
                  {[
                    { label: 'Deck Status', val: diligenceDoc ? 'Uploaded' : 'Not Uploaded', color: diligenceDoc ? '#10b981' : '#64748b', Icon: diligenceDoc ? CheckCircle : AlertTriangle },
                    { label: 'Access Requests', val: pendingCount, color: '#f59e0b', Icon: Key },
                    { label: 'Approved Depts', val: approvedCount, color: '#6366f1', Icon: UserCheck },
                    { label: 'Security Level', val: 'AES-256', color: '#06b6d4', Icon: Shield },
                  ].map(s => {
                    const { Icon } = s;
                    return (
                      <div key={s.label} style={{ background: `linear-gradient(135deg,${s.color}15,rgba(0,0,0,0.6))`, border: `1px solid ${s.color}28`, borderRadius: 12, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, position: 'relative', overflow: 'hidden', backdropFilter: 'blur(12px)' }}>
                        <div style={{ position: 'absolute', top: -16, right: -16, width: 72, height: 72, borderRadius: '50%', background: `radial-gradient(circle,${s.color}30,transparent 70%)`, pointerEvents: 'none' }} />
                        <div style={{ width: 34, height: 34, borderRadius: 9, background: `${s.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: `0 0 16px ${s.color}50` }}>
                          <Icon style={{ width: 16, height: 16, color: s.color, filter: `drop-shadow(0 0 5px ${s.color})` }} />
                        </div>
                        <div>
                          <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.28)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>{s.label}</p>
                          <p style={{ fontSize: 18, fontWeight: 800, color: 'white', margin: 0, lineHeight: 1.1 }}>{s.val}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* ── Main content: two columns ── */}
                <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, minHeight: 0, position: 'relative', zIndex: 1, overflow: 'hidden' }}>

                  {/* LEFT: Deck status card */}
                  <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 16, padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 14, backdropFilter: 'blur(12px)', overflow: 'hidden', position: 'relative' }}>
                    <div style={{ position: 'absolute', top: -40, right: -40, width: 160, height: 160, borderRadius: '50%', background: 'radial-gradient(circle,rgba(99,102,241,0.15),transparent 70%)', pointerEvents: 'none' }} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                      <Lock style={{ width: 13, height: 13, color: '#818cf8' }} />
                      <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#c7d2fe' }}>Investor Deck (Confidential)</p>
                    </div>
                    <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.32)', lineHeight: 1.75, background: 'rgba(99,102,241,0.07)', border: '1px solid rgba(99,102,241,0.15)', borderRadius: 10, padding: '12px 14px' }}>
                      <p style={{ margin: '0 0 6px', fontWeight: 600, color: 'rgba(255,255,255,0.5)' }}>What belongs here:</p>
                      {['Granular financial models & projections', 'Precise product roadmap & tech architecture', 'Full cap table & equity structure', 'Unit economics & cohort data', 'Competitive moat & IP details'].map(item => (
                        <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
                          <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#6366f1', flexShrink: 0 }} />
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>

                    {diligenceDoc ? (
                      <div style={{ background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 12, padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <CheckCircle style={{ width: 14, height: 14, color: '#10b981' }} />
                            <span style={{ fontSize: 12, fontWeight: 700, color: '#10b981' }}>Deck Uploaded</span>
                          </div>
                          <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)' }}>{diligenceDoc.uploadedAt}</span>
                        </div>
                        <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>{diligenceDoc.name}</p>
                        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                          <button
                            onClick={() => { if (diligenceDoc.file_url) setViewingDoc({ ...diligenceDoc, type: 'Deck', date: diligenceDoc.uploadedAt, views: 0, status: 'Final', score: 0 } as any); }}
                            style={{ flex: 1, padding: '7px 0', borderRadius: 999, fontSize: 11, fontWeight: 700, background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.35)', color: '#818cf8', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                            <Eye style={{ width: 12, height: 12 }} /> Preview
                          </button>
                          <button
                            onClick={() => setDiligenceUploadOpen(true)}
                            style={{ flex: 1, padding: '7px 0', borderRadius: 999, fontSize: 11, fontWeight: 700, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)', cursor: 'pointer' }}>
                            Replace
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div
                        onClick={() => setDiligenceUploadOpen(true)}
                        style={{ border: '2px dashed rgba(99,102,241,0.3)', borderRadius: 12, padding: '28px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, cursor: 'pointer', transition: 'all 0.2s' }}
                        onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(99,102,241,0.6)')}
                        onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(99,102,241,0.3)')}>
                        <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Upload style={{ width: 18, height: 18, color: '#818cf8' }} />
                        </div>
                        <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#818cf8' }}>Upload Investor Deck</p>
                        <p style={{ margin: 0, fontSize: 10, color: 'rgba(255,255,255,0.25)', textAlign: 'center' }}>PDF, PPTX — encrypted at rest & in transit</p>
                      </div>
                    )}
                  </div>

                  {/* RIGHT: VC Access Requests */}
                  <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 14, backdropFilter: 'blur(12px)', overflow: 'auto' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Key style={{ width: 13, height: 13, color: '#f59e0b' }} />
                        <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#fde68a' }}>VC Access Requests</p>
                      </div>
                      {pendingCount > 0 && (
                        <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: '#000', boxShadow: '0 0 10px rgba(245,158,11,0.6)' }}>
                          {pendingCount}
                        </div>
                      )}
                    </div>
                    <p style={{ margin: 0, fontSize: 10, color: 'rgba(255,255,255,0.28)', lineHeight: 1.6, background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.15)', borderRadius: 8, padding: '8px 12px', flexShrink: 0 }}>
                      VCs must explicitly request access. You approve or deny each one individually. Approved Depts can view this deck; denied VCs see nothing.
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, overflow: 'auto' }}>
                      {vcRequests.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '32px 0', color: 'rgba(255,255,255,0.25)', fontSize: 11 }}>No access requests yet. Share your Solution Vault deck to generate interest.</div>
                      ) : vcRequests.map(req => (
                        <div key={req.id} style={{ background: req.status === 'approved' ? 'rgba(16,185,129,0.07)' : req.status === 'denied' ? 'rgba(248,113,113,0.05)' : 'rgba(255,255,255,0.04)', border: `1px solid ${req.status === 'approved' ? 'rgba(16,185,129,0.25)' : req.status === 'denied' ? 'rgba(248,113,113,0.15)' : 'rgba(255,255,255,0.09)'}`, borderRadius: 12, padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'linear-gradient(135deg,#6366f130,#4f46e520)', border: '1px solid rgba(99,102,241,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: '#818cf8', flexShrink: 0 }}>
                              {req.name.split(' ').map(n => n[0]).join('')}
                            </div>
                            <div>
                              <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#fff' }}>{req.name}</p>
                              <p style={{ margin: 0, fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>{req.firm} · {req.requestedAt}</p>
                            </div>
                          </div>
                          <div style={{ flexShrink: 0 }}>
                            {req.status === 'pending' ? (
                              <div style={{ display: 'flex', gap: 6 }}>
                                <button
                                  onClick={() => setVcRequests(prev => prev.map(r => r.id === req.id ? { ...r, status: 'approved' } : r))}
                                  style={{ padding: '5px 12px', borderRadius: 999, fontSize: 10, fontWeight: 700, background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.4)', color: '#10b981', cursor: 'pointer' }}>
                                  ✓ Approve
                                </button>
                                <button
                                  onClick={() => setVcRequests(prev => prev.map(r => r.id === req.id ? { ...r, status: 'denied' } : r))}
                                  style={{ padding: '5px 12px', borderRadius: 999, fontSize: 10, fontWeight: 700, background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', color: '#f87171', cursor: 'pointer' }}>
                                  ✕ Deny
                                </button>
                              </div>
                            ) : (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <div style={{ width: 6, height: 6, borderRadius: '50%', background: req.status === 'approved' ? '#10b981' : '#f87171', boxShadow: `0 0 6px ${req.status === 'approved' ? '#10b981' : '#f87171'}` }} />
                                <span style={{ fontSize: 10, fontWeight: 700, color: req.status === 'approved' ? '#10b981' : '#f87171', textTransform: 'capitalize' }}>{req.status}</span>
                                <button
                                  onClick={() => setVcRequests(prev => prev.map(r => r.id === req.id ? { ...r, status: 'pending' } : r))}
                                  style={{ marginLeft: 4, padding: '3px 8px', borderRadius: 999, fontSize: 9, fontWeight: 600, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.35)', cursor: 'pointer' }}>
                                  revoke
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    {/* Info footer */}
                    <div style={{ flexShrink: 0, marginTop: 'auto', display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)', borderRadius: 10 }}>
                      <EyeOff style={{ width: 12, height: 12, color: '#818cf8', flexShrink: 0 }} />
                      <p style={{ margin: 0, fontSize: 10, color: 'rgba(255,255,255,0.3)', lineHeight: 1.6 }}>Denied VCs cannot see this deck or know it exists. Only approved VCs get a time-limited, watermarked view link.</p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* ── MENTOR NETWORK ───────────────────────────────────────────── */}
          {tab === 'network' && (
            <div className="hub-tab-content" style={{ height: '100%', display: 'flex', flexDirection: 'column', boxSizing: 'border-box', overflow: 'hidden', position: 'relative' }}>

              {/* ── Galaxy background ── */}
              <div style={{ position: 'absolute', inset: 0, zIndex: 0, overflow: 'hidden', pointerEvents: 'none' }}>
                <MentorGalaxyBg />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.52) 0%, rgba(0,0,0,0.68) 100%)' }} />
              </div>

              {/* ── Filter bar ── */}
              <div className="hub-mentor-filterbar" style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 28px 16px', position: 'relative', zIndex: mentorFilterOpen ? 30 : 1 }}>
                <div className="hub-mentor-filterbar-left" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                    <Filter style={{ width: 12, height: 12 }} />Filter:
                  </span>
                  <div className="bv-filter-pills">
                    <FilterPills options={['All', 'Available', 'SaaS', 'FinTech', 'DeepTech']} value={mentorFilter} onChange={setMentorFilter} />
                  </div>
                  {/* Mobile picker — custom themed dropdown (replaces the native <select> on small screens) */}
                  <div className="bv-filter-select" ref={mentorFilterRef} style={{ display: 'none', position: 'relative', flexShrink: 0 }}>
                    <button
                      type="button"
                      onClick={() => setMentorFilterOpen(o => !o)}
                      aria-haspopup="listbox"
                      aria-expanded={mentorFilterOpen}
                      style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 10, minWidth: 140, background: mentorFilter !== 'All' ? 'rgba(139,92,246,0.22)' : 'rgba(255,255,255,0.05)', border: `1px solid ${mentorFilter !== 'All' || mentorFilterOpen ? 'rgba(139,92,246,0.5)' : 'rgba(255,255,255,0.14)'}`, color: mentorFilter !== 'All' ? '#c4b5fd' : 'white', fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}
                    >
                      <span style={{ flex: 1, textAlign: 'left', whiteSpace: 'nowrap' }}>{mentorFilter === 'All' ? 'All mentors' : mentorFilter}</span>
                      <ChevronRight style={{ width: 13, height: 13, opacity: 0.7, transform: mentorFilterOpen ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform .18s', flexShrink: 0 }} />
                    </button>
                    {mentorFilterOpen && (
                      <div role="listbox" style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, minWidth: 184, zIndex: 60, background: 'rgba(8,8,16,.97)', border: '1px solid rgba(255,255,255,.1)', borderTop: '2px solid rgba(139,92,246,.55)', borderRadius: 14, boxShadow: '0 24px 70px rgba(0,0,0,.7)', backdropFilter: 'blur(14px)', padding: 8 }}>
                        {['All', 'Available', 'SaaS', 'FinTech', 'DeepTech'].map(t => {
                          const active = mentorFilter === t;
                          const dot = t === 'Available' ? '#10b981' : '#a78bfa';
                          return (
                            <button key={t} role="option" aria-selected={active} onClick={() => { setMentorFilter(t); setMentorFilterOpen(false); }} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left', padding: '8px 10px', borderRadius: 10, marginBottom: 2, background: active ? 'rgba(139,92,246,.14)' : 'transparent', border: `1px solid ${active ? 'rgba(139,92,246,.34)' : 'transparent'}`, cursor: 'pointer', transition: 'background .15s' }}
                              onMouseEnter={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,.05)'; }}
                              onMouseLeave={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
                            >
                              <span style={{ width: 7, height: 7, borderRadius: '50%', flexShrink: 0, background: active || t === 'Available' ? dot : 'rgba(255,255,255,.25)', boxShadow: active || t === 'Available' ? `0 0 7px ${dot}` : 'none' }} />
                              <span style={{ flex: 1, minWidth: 0, fontSize: 12.5, fontWeight: 600, color: active ? 'white' : 'rgba(255,255,255,.62)' }}>{t === 'All' ? 'All mentors' : t}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px rgba(16,185,129,0.9)' }} />
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>
                    <span style={{ color: '#10b981', fontWeight: 700 }}>{filteredMentors.filter(m => m.avail).length}</span> available now
                  </span>
                </div>
              </div>

              {/* ── Cards ── */}
              {filteredMentors.length === 0 && (
                <div style={{ textAlign: 'center', paddingTop: 80, color: 'rgba(255,255,255,0.2)', fontSize: 14, position: 'relative', zIndex: 1 }}>
                  No mentors match this filter
                </div>
              )}
              <div className="analytics-scroll" style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '0 28px 24px', position: 'relative', zIndex: 1 }}>
                <div className="hub-card-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }}>
                  {(pinned?.kind === 'mentor' ? bringToFront(filteredMentors, m => m.id === pinned.key) : filteredMentors).map(m => {
                    const mc = MENTOR_COLORS[m.id] || '#8b5cf6';
                    return (
                      <div key={m.id}
                        className={focus?.kind === 'mentor' && focus.key === m.id ? 'search-focus' : undefined}
                        style={{
                          background: m.avail
                            ? `linear-gradient(135deg,${mc}16 0%,rgba(0,0,0,0.75) 60%,rgba(16,185,129,0.04) 100%)`
                            : 'linear-gradient(135deg,rgba(255,255,255,0.022) 0%,rgba(0,0,0,0.72) 100%)',
                          border: `1px solid ${m.avail ? mc + '42' : 'rgba(255,255,255,0.07)'}`,
                          borderTop: `2.5px solid ${m.avail ? mc + '95' : 'rgba(255,255,255,0.12)'}`,
                          borderRadius: 16, padding: '20px',
                          cursor: 'pointer', position: 'relative', overflow: 'hidden',
                          backdropFilter: 'blur(18px)',
                          transition: 'transform 0.2s, box-shadow 0.2s',
                        }}
                        onMouseEnter={e => { const el = e.currentTarget as HTMLDivElement; el.style.transform = 'translateY(-4px)'; el.style.boxShadow = `0 18px 52px ${mc}28, 0 0 0 1px ${mc}45`; }}
                        onMouseLeave={e => { const el = e.currentTarget as HTMLDivElement; el.style.transform = 'translateY(0)'; el.style.boxShadow = 'none'; }}
                      >
                        {/* Corner radial glow */}
                        {m.avail && <div style={{ position: 'absolute', top: -32, right: -32, width: 140, height: 140, borderRadius: '50%', background: `radial-gradient(circle,${mc}28,transparent 70%)`, pointerEvents: 'none' }} />}
                        {/* Top aurora line */}
                        {m.avail && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg,transparent,${mc}80,transparent)`, pointerEvents: 'none' }} />}

                        {/* ── Header: orb + info + availability ── */}
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 14 }}>
                          {/* 3D orb with initials */}
                          <div style={{ position: 'relative', flexShrink: 0 }}>
                            <MentorOrb available={m.avail} color={mc} />
                            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                              <span style={{ fontSize: 13, fontWeight: 800, color: 'white', textShadow: `0 0 14px ${mc}, 0 0 28px ${mc}`, letterSpacing: '0.02em' }}>{m.avatar}</span>
                            </div>
                          </div>

                          {/* Name / role / company */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 4 }}>
                              <p style={{ fontSize: 14, fontWeight: 700, color: 'white', margin: 0, lineHeight: 1.2 }}>{m.name}</p>
                              <div style={{
                                width: 9, height: 9, borderRadius: '50%', flexShrink: 0, marginTop: 3,
                                background: m.avail ? '#10b981' : 'rgba(255,255,255,0.18)',
                                boxShadow: m.avail ? '0 0 10px rgba(16,185,129,0.9), 0 0 22px rgba(16,185,129,0.4)' : 'none',
                              }} />
                            </div>
                            <p style={{ fontSize: 11, fontWeight: 600, color: mc, margin: 0, marginBottom: 3, filter: `drop-shadow(0 0 6px ${mc}60)` }}>{m.role}</p>
                            <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.28)', margin: 0 }}>{m.company}</p>
                          </div>
                        </div>

                        {/* Bio */}
                        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.42)', lineHeight: 1.65, margin: '0 0 14px', minHeight: 38 }}>
                          {m.bio.length > 92 ? m.bio.slice(0, 92) + '…' : m.bio}
                        </p>

                        {/* Tags */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
                          {m.tags.map(t => (
                            <span key={t} style={{ fontSize: 9, fontWeight: 700, padding: '3px 10px', borderRadius: 999, color: mc, background: `${mc}15`, border: `1px solid ${mc}38`, letterSpacing: '0.05em', boxShadow: `0 0 8px ${mc}22` }}>
                              {t}
                            </span>
                          ))}
                        </div>

                        {/* Gradient divider */}
                        <div style={{ height: 1, background: `linear-gradient(90deg,${mc}45,rgba(255,255,255,0.04),transparent)`, marginBottom: 14 }} />

                        {/* Footer: rating + sessions + CTA */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Star style={{ width: 12, height: 12, color: '#fbbf24', fill: '#fbbf24' }} />
                            <span style={{ fontSize: 12, fontWeight: 700, color: '#fbbf24' }}>{m.rating}</span>
                            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)' }}>·</span>
                            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.28)' }}>{m.sessions} sessions</span>
                          </div>

                          <button
                            onClick={() => { if (m.avail) requireAuth('Sign in to book a mentor session.', () => { setBookingMentor(m); setBookingForm({ date: '', time: '', topic: '', message: '' }); setBookingDone(false); }); }}
                            style={{
                            fontSize: 10, fontWeight: 700, padding: '7px 14px', borderRadius: 999,
                            cursor: m.avail ? 'pointer' : 'not-allowed',
                            background: m.avail ? `linear-gradient(90deg,${mc}35,${mc}18)` : 'rgba(255,255,255,0.04)',
                            color: m.avail ? mc : 'rgba(255,255,255,0.2)',
                            border: `1px solid ${m.avail ? mc + '55' : 'rgba(255,255,255,0.08)'}`,
                            boxShadow: m.avail ? `0 0 18px ${mc}32` : 'none',
                            letterSpacing: '0.03em', transition: 'all 0.2s',
                          }}>
                            {m.avail ? 'Book Session →' : 'Unavailable'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ── EVENT ARENA ──────────────────────────────────────────────── */}
          {tab === 'events' && (() => {
            const TYPE_META: Record<string, { color: string; icon: string }> = {
              Pitching:   { color: '#8b5cf6', icon: '🎯' },
              Workshop:   { color: '#06b6d4', icon: '⚡' },
              Mentorship: { color: '#f59e0b', icon: '🌟' },
              Hackathon:  { color: '#10b981', icon: '🚀' },
            };
            const TYPES = ['All', ...Array.from(new Set(allEvents.map(e => e.type).filter(Boolean))).sort()];
            return (
              <div className="hub-tab-content" style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: '18px 22px', boxSizing: 'border-box', overflow: 'hidden', position: 'relative', gap: 14 }}>

                <style>{`
                  @keyframes ea2-livepulse { 0%,100%{transform:scale(1);opacity:.5} 50%{transform:scale(1.6);opacity:0} }
                  @keyframes ea2-orbit     { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
                  @keyframes ea2-rorbit    { from{transform:rotate(0deg)} to{transform:rotate(-360deg)} }
                  @keyframes ea2-float     { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-5px)} }
                  @keyframes ea2-scan      { 0%{transform:translateY(-5%);opacity:0} 3%{opacity:1} 97%{opacity:1} 100%{transform:translateY(105%);opacity:0} }
                  .ea2-card { transition: transform .2s ease, box-shadow .2s ease, border-color .22s ease; }
                  .ea2-card:hover { transform: translateY(-3px); box-shadow: 0 20px 56px rgba(0,0,0,0.65) !important; }
                  .ea2-card:hover .ea2-topbar  { opacity: 1 !important; }
                  .ea2-card:hover .ea2-bg-glow { opacity: 1 !important; }
                  .ea2-card:hover .ea2-leftbar { opacity: 1 !important; }
                  .ea2-rsvp { transition: all .15s ease; }
                  .ea2-rsvp:hover { filter: brightness(1.18); transform: scale(1.04); }
                  .ea2-pill-btn { transition: all .18s ease; border: none; cursor: pointer; }
                  .ea2-pill-btn:hover { filter: brightness(1.1); }
                `}</style>

                {/* ── Canvas + scan-line background ── */}
                <div aria-hidden style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
                  <EventArenaCanvasBg />
                  <div style={{ position: 'absolute', left: 0, right: 0, height: 1, background: 'linear-gradient(90deg,transparent 5%,rgba(139,92,246,0.35) 40%,rgba(6,182,212,0.25) 60%,transparent 95%)', animation: 'ea2-scan 11s linear 1.5s infinite' }} />
                  <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 78% 22%, transparent 25%, rgba(0,0,8,0.55) 70%, rgba(0,0,8,0.88) 100%)' }} />
                </div>

                {/* ── Header ── */}
                <div className="ea-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, position: 'relative', zIndex: eventTypeOpen ? 30 : 2 }}>

                  {/* Filter pill group */}
                  <div className="bv-filter-pills" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Filter style={{ width: 12, height: 12, color: 'rgba(255,255,255,0.2)', flexShrink: 0 }} />
                    <div style={{ display: 'flex', padding: '3px', borderRadius: 999, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', gap: 3 }}>
                      {TYPES.map(t => {
                        const active = eventType === t;
                        const mc = t === 'All' ? '#8b5cf6' : (TYPE_META[t]?.color || '#8b5cf6');
                        return (
                          <button key={t} onClick={() => setEventType(t)} className="ea2-pill-btn"
                            style={{ padding: '5px 15px', borderRadius: 999, fontSize: 11, fontWeight: 700, background: active ? `${mc}22` : 'transparent', color: active ? mc : 'rgba(255,255,255,0.3)', boxShadow: active ? `0 0 14px ${mc}28, inset 0 0 6px ${mc}10` : 'none', letterSpacing: '.03em' }}
                          >{t}</button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Mobile picker — custom themed dropdown (replaces the native <select> on small screens) */}
                  <div className="bv-filter-select" ref={eventTypeRef} style={{ display: 'none', position: 'relative', flexShrink: 0 }}>
                    <button
                      type="button"
                      onClick={() => setEventTypeOpen(o => !o)}
                      aria-haspopup="listbox"
                      aria-expanded={eventTypeOpen}
                      style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 10, minWidth: 150, background: eventType !== 'All' ? 'rgba(139,92,246,0.22)' : 'rgba(255,255,255,0.05)', border: `1px solid ${eventType !== 'All' || eventTypeOpen ? 'rgba(139,92,246,0.5)' : 'rgba(255,255,255,0.14)'}`, color: eventType !== 'All' ? '#c4b5fd' : 'white', fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}
                    >
                      <span style={{ width: 7, height: 7, borderRadius: '50%', flexShrink: 0, background: eventType === 'All' ? '#8b5cf6' : (TYPE_META[eventType]?.color || '#8b5cf6'), boxShadow: `0 0 7px ${eventType === 'All' ? '#8b5cf6' : (TYPE_META[eventType]?.color || '#8b5cf6')}` }} />
                      <span style={{ flex: 1, textAlign: 'left', whiteSpace: 'nowrap' }}>{eventType === 'All' ? 'All event types' : eventType}</span>
                      <ChevronRight style={{ width: 13, height: 13, opacity: 0.7, transform: eventTypeOpen ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform .18s', flexShrink: 0 }} />
                    </button>
                    {eventTypeOpen && (
                      <div role="listbox" style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, minWidth: 190, zIndex: 60, background: 'rgba(8,8,16,.97)', border: '1px solid rgba(255,255,255,.1)', borderTop: '2px solid rgba(139,92,246,.55)', borderRadius: 14, boxShadow: '0 24px 70px rgba(0,0,0,.7)', backdropFilter: 'blur(14px)', padding: 8 }}>
                        {TYPES.map(t => {
                          const active = eventType === t;
                          const tc = t === 'All' ? '#8b5cf6' : (TYPE_META[t]?.color || '#8b5cf6');
                          return (
                            <button key={t} role="option" aria-selected={active} onClick={() => { setEventType(t); setEventTypeOpen(false); }} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left', padding: '8px 10px', borderRadius: 10, marginBottom: 2, background: active ? `${tc}1f` : 'transparent', border: `1px solid ${active ? tc + '4d' : 'transparent'}`, cursor: 'pointer', transition: 'background .15s' }}
                              onMouseEnter={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,.05)'; }}
                              onMouseLeave={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
                            >
                              <span style={{ width: 7, height: 7, borderRadius: '50%', flexShrink: 0, background: active ? tc : 'rgba(255,255,255,.25)', boxShadow: active ? `0 0 7px ${tc}` : 'none' }} />
                              <span style={{ flex: 1, minWidth: 0, fontSize: 12.5, fontWeight: 600, color: active ? 'white' : 'rgba(255,255,255,.62)' }}>{t === 'All' ? 'All event types' : t}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Stats + CTA */}
                  <div className="ea-stats-cta" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {([[String(allEvents.length), 'Events', '#8b5cf6'], [String(rsvpedIds.length), 'RSVPd', '#10b981'], ['₹5L', 'Prize', '#f59e0b']] as [string,string,string][]).map(([val, lbl, col]) => (
                      <div key={lbl} style={{ padding: '5px 13px', borderRadius: 10, background: `${col}0d`, border: `1px solid ${col}22`, textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
                        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg,transparent,${col}80,transparent)` }} />
                        <p style={{ fontSize: 14, fontWeight: 800, color: col, margin: 0, lineHeight: 1 }}>{val}</p>
                        <p style={{ fontSize: 8, color: 'rgba(255,255,255,0.22)', margin: '2px 0 0', textTransform: 'uppercase', letterSpacing: '.08em' }}>{lbl}</p>
                      </div>
                    ))}
                    <button onClick={openAddEvent}
                      className="ea-add-event"
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px 18px', borderRadius: 999, fontSize: 11, fontWeight: 700, background: 'linear-gradient(90deg,#7c3aed,#0ea5e9)', color: 'white', border: 'none', cursor: 'pointer', boxShadow: '0 4px 22px rgba(124,58,237,0.45)', letterSpacing: '.03em', transition: 'all .18s' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 6px 30px rgba(124,58,237,0.65)'; (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 22px rgba(124,58,237,0.45)'; (e.currentTarget as HTMLButtonElement).style.transform = ''; }}
                    ><Plus style={{ width: 13, height: 13 }} />Add Event</button>
                  </div>
                </div>

                {/* ── Main 2-col ── */}
                <div className="hub-events-main" style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: '1fr 288px', gap: 14, position: 'relative', zIndex: 2 }}>

                  {/* ── LEFT: Event list ── */}
                  <div style={{ borderRadius: 20, border: '1px solid rgba(255,255,255,0.09)', background: 'rgba(5,5,14,0.78)', backdropFilter: 'blur(24px)', display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0, position: 'relative', boxShadow: '0 8px 48px rgba(0,0,0,0.4)' }}>
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg,transparent,rgba(139,92,246,0.6),rgba(6,182,212,0.4),transparent)', pointerEvents: 'none' }} />

                    {/* List header */}
                    <div style={{ padding: '13px 20px 11px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                      <div style={{ position: 'relative', width: 10, height: 10 }}>
                        <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px rgba(16,185,129,0.9)' }} />
                        <div style={{ position: 'absolute', inset: -4, borderRadius: '50%', background: 'rgba(16,185,129,0.2)', animation: 'ea2-livepulse 1.8s ease-out infinite' }} />
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'white', letterSpacing: '-0.01em' }}>Upcoming Events</span>
                      <span style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.04)', padding: '2px 10px', borderRadius: 999, border: '1px solid rgba(255,255,255,0.07)' }}>{filteredEvents.length} scheduled</span>
                    </div>

                    <div className="analytics-scroll" style={{ flex: 1, overflowY: 'auto', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10, minHeight: 0 }}>
                      {filteredEvents.length === 0 && (
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, opacity: .2 }}>
                          <CalendarDays style={{ width: 32, height: 32, color: 'white' }} />
                          <span style={{ fontSize: 13, color: 'white' }}>No events match this filter</span>
                        </div>
                      )}
                      {(pinned?.kind === 'event' ? bringToFront(filteredEvents, ev => ev.id === pinned.key) : filteredEvents).map(ev => {
                        const ec = TYPE_META[ev.type]?.color || '#8b5cf6';
                        const dp = parseDate(ev.date);
                        const isRsvpd = rsvpedIds.includes(ev.id);
                        return (
                          <div key={ev.id} className={`ea2-card${focus?.kind === 'event' && focus.key === ev.id ? ' search-focus' : ''}`}
                            // flexShrink:0 is load-bearing. The parent is a flex column with
                            // overflow-y:auto, so without it the cards shrink to fit instead of
                            // scrolling — and because the card is overflow:hidden, the time/
                            // location row gets clipped off. Only visible once the description
                            // wraps to two lines (i.e. at 100% zoom but not at 90%).
                            style={{ borderRadius: 16, border: `1px solid ${ec}1a`, background: `linear-gradient(135deg,${ec}0b 0%,rgba(4,4,12,0.92) 100%)`, overflow: 'hidden', position: 'relative', boxShadow: `0 4px 28px rgba(0,0,0,0.38)`, flexShrink: 0 }}
                          >
                            {/* Left accent bar */}
                            <div className="ea2-leftbar" style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: 3, background: `linear-gradient(180deg,${ec},${ec}50,transparent)`, opacity: 0.6, transition: 'opacity .22s', borderRadius: '16px 0 0 16px' }} />
                            {/* Top shimmer */}
                            <div className="ea2-topbar" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg,${ec}80,${ec}30,transparent)`, opacity: 0.4, transition: 'opacity .22s' }} />
                            {/* Corner bg glow */}
                            <div className="ea2-bg-glow" style={{ position: 'absolute', top: -30, left: 10, width: 130, height: 130, borderRadius: '50%', background: `radial-gradient(circle,${ec}0f,transparent 70%)`, opacity: 0, transition: 'opacity .3s', pointerEvents: 'none' }} />

                            <div style={{ display: 'grid', gridTemplateColumns: '68px 1fr auto', alignItems: 'center', padding: '13px 16px 13px 20px' }}>

                              {/* Date block */}
                              <div style={{ width: 54, height: 62, borderRadius: 14, background: `linear-gradient(155deg,${ec}20,${ec}08)`, border: `1px solid ${ec}32`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginRight: 16, boxShadow: `0 4px 18px ${ec}18, inset 0 1px 0 ${ec}30` }}>
                                <p style={{ fontSize: 8.5, fontWeight: 800, color: ec, margin: 0, textTransform: 'uppercase', letterSpacing: '.1em', lineHeight: 1 }}>{dp.month}</p>
                                <p style={{ fontSize: 30, fontWeight: 900, color: 'white', margin: '0', lineHeight: 1, letterSpacing: '-2px', textShadow: `0 0 22px ${ec}55` }}>{dp.day}</p>
                                <p style={{ fontSize: 8, color: 'rgba(255,255,255,0.18)', margin: '1px 0 0', lineHeight: 1 }}>{dp.year}</p>
                              </div>

                              {/* Content */}
                              <div style={{ minWidth: 0, paddingRight: 14 }}>
                                <h3 className="hub-event-title" style={{ fontSize: 13.5, fontWeight: 700, color: 'white', margin: '0 0 5px', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.title}</h3>
                                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', lineHeight: 1.6, margin: '0 0 9px', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const }}>{ev.description}</p>
                                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 14 }}>
                                  <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: 'rgba(255,255,255,0.32)' }}>
                                    <Clock style={{ width: 10, height: 10, color: ec, flexShrink: 0 }} />{ev.time}
                                  </span>
                                  <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: 'rgba(255,255,255,0.32)' }}>
                                    <Globe style={{ width: 10, height: 10, color: ec, flexShrink: 0 }} />{ev.location}
                                  </span>
                                </div>
                              </div>

                              {/* Right: badge + RSVP */}
                              <div style={{ width: 94, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'space-between', gap: 10, flexShrink: 0 }}>
                                <span style={{ fontSize: 9, fontWeight: 800, padding: '4px 10px', borderRadius: 999, color: ec, background: `${ec}1a`, border: `1px solid ${ec}40`, letterSpacing: '.06em', whiteSpace: 'nowrap' }}>{ev.type}</span>
                                <button className="ea2-rsvp"
                                  onClick={e => { e.stopPropagation(); if (!isRsvpd) { setRsvpName(userStartups[0]?.founder ?? user?.name ?? ''); setRsvpEvent(ev); } }}
                                  style={{ width: '100%', padding: '7px 0', borderRadius: 999, fontSize: 11, fontWeight: 700, cursor: isRsvpd ? 'default' : 'pointer', background: isRsvpd ? 'rgba(16,185,129,0.12)' : `linear-gradient(90deg,${ec}45,${ec}22)`, color: isRsvpd ? '#10b981' : ec, border: `1px solid ${isRsvpd ? 'rgba(16,185,129,0.35)' : ec + '45'}`, boxShadow: isRsvpd ? 'none' : `0 2px 14px ${ec}20`, textAlign: 'center' }}
                                >{isRsvpd ? '✓ Going' : 'RSVP →'}</button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* ── RIGHT: Sidebar ── */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 11, minHeight: 0, overflow: 'hidden' }}>

                    {/* Next Up spotlight */}
                    {(() => {
                      const next = filteredEvents[0]; if (!next) return null;
                      const ec = TYPE_META[next.type]?.color || '#8b5cf6';
                      const dp = parseDate(next.date);
                      return (
                        <div style={{ borderRadius: 18, border: `1px solid ${ec}38`, background: `linear-gradient(160deg,${ec}1c 0%,rgba(4,4,14,0.97) 65%)`, padding: '16px', position: 'relative', overflow: 'hidden', flexShrink: 0, boxShadow: `0 8px 44px ${ec}16` }}>
                          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg,transparent,${ec}cc,transparent)` }} />
                          <div style={{ position: 'absolute', top: -50, right: -50, width: 140, height: 140, borderRadius: '50%', background: `radial-gradient(circle,${ec}1a,transparent 70%)`, pointerEvents: 'none' }} />
                          {/* Corner orbit */}
                          <div style={{ position: 'absolute', bottom: -30, left: -30, width: 90, height: 90, pointerEvents: 'none' }}>
                            <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: `1px solid ${ec}20`, animation: 'ea2-orbit 9s linear infinite' }}>
                              <div style={{ position: 'absolute', top: -3.5, left: '50%', width: 7, height: 7, marginLeft: -3.5, borderRadius: '50%', background: ec, boxShadow: `0 0 8px ${ec}` }} />
                            </div>
                            <div style={{ position: 'absolute', inset: 16, borderRadius: '50%', border: `1px solid ${ec}14`, animation: 'ea2-rorbit 6s linear infinite' }}>
                              <div style={{ position: 'absolute', bottom: -3, left: '50%', width: 5, height: 5, marginLeft: -2.5, borderRadius: '50%', background: ec + '80' }} />
                            </div>
                          </div>

                          <p style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.28)', textTransform: 'uppercase', letterSpacing: '.14em', margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Zap style={{ width: 10, height: 10, color: ec }} />Next Up
                          </p>
                          <div style={{ display: 'flex', gap: 11, alignItems: 'flex-start', marginBottom: 14 }}>
                            <div style={{ width: 48, height: 54, borderRadius: 13, background: `linear-gradient(155deg,${ec}2a,${ec}0f)`, border: `1px solid ${ec}42`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: `0 4px 16px ${ec}22, inset 0 1px 0 ${ec}38` }}>
                              <span style={{ fontSize: 8, fontWeight: 800, color: ec, textTransform: 'uppercase', letterSpacing: '.1em', lineHeight: 1 }}>{dp.month}</span>
                              <span style={{ fontSize: 23, fontWeight: 900, color: 'white', lineHeight: 1, letterSpacing: '-1px', textShadow: `0 0 18px ${ec}80` }}>{dp.day}</span>
                            </div>
                            <div style={{ minWidth: 0, flex: 1 }}>
                              <p style={{ fontSize: 12.5, fontWeight: 700, color: 'white', margin: 0, lineHeight: 1.35 }}>{next.title}</p>
                              <p style={{ fontSize: 9.5, color: 'rgba(255,255,255,0.28)', margin: '5px 0 2px', display: 'flex', alignItems: 'center', gap: 4 }}>
                                <Clock style={{ width: 9, height: 9 }} />{next.time}
                              </p>
                              <p style={{ fontSize: 9.5, color: 'rgba(255,255,255,0.22)', margin: 0, display: 'flex', alignItems: 'center', gap: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                <Globe style={{ width: 9, height: 9 }} />{next.location}
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => { setRsvpName(userStartups[0]?.founder ?? user?.name ?? ''); setRsvpEvent(next); }}
                            style={{ width: '100%', padding: '9px', borderRadius: 12, fontSize: 11.5, fontWeight: 700, background: `linear-gradient(90deg,${ec},${ec}80)`, color: 'white', border: 'none', cursor: 'pointer', boxShadow: `0 4px 22px ${ec}48`, letterSpacing: '.04em', transition: 'all .18s' }}
                            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.filter = 'brightness(1.12)'; (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)'; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.filter = ''; (e.currentTarget as HTMLButtonElement).style.transform = ''; }}
                          >Reserve My Spot →</button>
                        </div>
                      );
                    })()}

                    {/* Category Split — SVG donut */}
                    {(() => {
                      const cats = Array.from(new Set(allEvents.map(e => e.type).filter(Boolean))).sort();
                      const counts = cats.map(t => allEvents.filter(e => e.type === t).length);
                      const total = counts.reduce((a, b) => a + b, 0);
                      const R = 26, sw = 6, circ = 2 * Math.PI * R;
                      let cum = 0;
                      return (
                        <div style={{ borderRadius: 16, border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(5,5,14,0.78)', backdropFilter: 'blur(16px)', padding: '14px 16px', flexShrink: 0, position: 'relative', overflow: 'hidden' }}>
                          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg,transparent,rgba(139,92,246,0.5),transparent)' }} />
                          <p style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.22)', textTransform: 'uppercase', letterSpacing: '.1em', margin: '0 0 12px' }}>Category Split</p>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <svg width={66} height={66} viewBox="0 0 66 66" style={{ flexShrink: 0 }}>
                              <circle cx={33} cy={33} r={R} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={sw} />
                              {cats.map((t, i) => {
                                const ec = TYPE_META[t]?.color || '#8b5cf6';
                                const dash = (counts[i] / total) * circ;
                                const offset = circ * 0.25 - cum;
                                cum += (counts[i] / total) * circ;
                                return (
                                  <circle key={t} cx={33} cy={33} r={R} fill="none" stroke={ec} strokeWidth={sw}
                                    strokeDasharray={`${dash - 1.5} ${circ - dash + 1.5}`}
                                    strokeDashoffset={offset}
                                    strokeLinecap="round"
                                    style={{ filter: `drop-shadow(0 0 3px ${ec}88)` }}
                                  />
                                );
                              })}
                              <text x={33} y={30} textAnchor="middle" fill="white" fontSize={11} fontWeight={800} fontFamily="Inter,sans-serif">{total}</text>
                              <text x={33} y={40} textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize={6.5} fontFamily="Inter,sans-serif">events</text>
                            </svg>
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                              {cats.map((t, i) => {
                                const ec = TYPE_META[t]?.color || '#8b5cf6';
                                return (
                                  <div key={t} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: 'rgba(255,255,255,0.38)' }}>
                                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: ec, boxShadow: `0 0 5px ${ec}`, display: 'inline-block', flexShrink: 0 }} />{t}
                                    </span>
                                    <span style={{ fontSize: 11, fontWeight: 700, color: ec }}>{counts[i]}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Your RSVPs */}
                    <div style={{ flex: 1, minHeight: 0, borderRadius: 16, border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(5,5,14,0.78)', backdropFilter: 'blur(16px)', padding: '14px 16px', display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
                      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg,transparent,rgba(16,185,129,0.4),transparent)' }} />
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexShrink: 0 }}>
                        <p style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.22)', textTransform: 'uppercase', letterSpacing: '.1em', margin: 0 }}>Your RSVPs</p>
                        {rsvpedIds.length > 0 && (
                          <span style={{ fontSize: 10, fontWeight: 800, color: '#10b981', background: 'rgba(16,185,129,0.1)', padding: '2px 8px', borderRadius: 999, border: '1px solid rgba(16,185,129,0.25)' }}>{rsvpedIds.length} going</span>
                        )}
                      </div>
                      <div className="analytics-scroll" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, minHeight: 0 }}>
                        {rsvpedIds.length === 0 ? (
                          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                            <div style={{ width: 44, height: 44, borderRadius: 14, background: 'rgba(139,92,246,0.07)', border: '1px solid rgba(139,92,246,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'ea2-float 3s ease-in-out infinite' }}>
                              <CalendarDays style={{ width: 20, height: 20, color: 'rgba(139,92,246,0.35)' }} />
                            </div>
                            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.18)', textAlign: 'center', lineHeight: 1.6, margin: 0 }}>No RSVPs yet —<br/>register for events</p>
                          </div>
                        ) : (
                          allEvents.filter(e => rsvpedIds.includes(e.id)).map(ev => {
                            const ec = EVENT_COLOR[ev.type] || '#8b5cf6';
                            const dp = parseDate(ev.date);
                            return (
                              <div key={ev.id} style={{ padding: '9px 12px', borderRadius: 12, background: `${ec}0a`, border: `1px solid ${ec}1e`, borderLeft: `3px solid ${ec}70`, position: 'relative', overflow: 'hidden' }}>
                                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg,${ec}45,transparent)` }} />
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 6 }}>
                                  <p style={{ fontSize: 11, fontWeight: 600, color: 'white', margin: 0, lineHeight: 1.3, flex: 1 }}>{ev.title}</p>
                                  <span style={{ fontSize: 8, fontWeight: 800, padding: '2px 7px', borderRadius: 999, color: '#10b981', background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.28)', flexShrink: 0 }}>✓</span>
                                </div>
                                <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.24)', margin: '4px 0 0' }}>{dp.month} {dp.day} · {ev.time}</p>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* ── ANALYTICS ────────────────────────────────────────────────── */}
          {tab === 'analytics' && (() => {
            // ── Derive all analytics metrics from live startups state ──
            const totalMRR = startups.reduce((a, s) => a + (s.metrics.mrr || 0), 0);
            const totalUsers = startups.reduce((a, s) => a + (s.metrics.users || 0), 0);
            const totalRaised = startups.reduce((a, s) => a + s.raised, 0);

            // Sector breakdown — group by industry, compute percentages
            const sectorMap: Record<string, number> = {};
            startups.forEach(s => { const k = s.industry || 'Other'; sectorMap[k] = (sectorMap[k] || 0) + 1; });
            const SECTOR_COLORS = ['#06b6d4','#f59e0b','#8b5cf6','#10b981','#f472b6','#34d399','#a78bfa','#fb923c'];
            const sectorEntries = Object.entries(sectorMap).sort((a, b) => b[1] - a[1]);
            const topSectors = sectorEntries.slice(0, 4);
            const otherCount = sectorEntries.slice(4).reduce((a, [, v]) => a + v, 0);
            const sectorData = [
              ...topSectors.map(([label, count], i) => ({ label, val: Math.round((count / startups.length) * 100), color: SECTOR_COLORS[i] })),
              ...(otherCount > 0 ? [{ label: 'Other', val: Math.round((otherCount / startups.length) * 100), color: '#475569' }] : []),
            ];

            // MRR growth curve — accumulate raised across startups as monthly proxy
            const mrrBase = Math.max(totalRaised / 1e5, 8);
            const MRR_DYN = ['Jan','Feb','Mar','Apr','May','Jun'].map((m, i) => ({
              m, v: Math.round(mrrBase * (0.1 + i * 0.18)),
            }));
            const mrrLatest = MRR_DYN[MRR_DYN.length - 1].v;
            const mrrPrev = MRR_DYN[MRR_DYN.length - 2].v;
            const mrrPct = mrrPrev > 0 ? Math.round(((mrrLatest - mrrPrev) / mrrPrev) * 100) : 0;

            // Users growth curve
            const usrBase = Math.max(totalUsers, 120);
            const USR_DYN = ['Jan','Feb','Mar','Apr','May','Jun'].map((m, i) => ({
              m, v: Math.round(usrBase * (0.076 + i * 0.165)),
            }));
            const usrLatest = USR_DYN[USR_DYN.length - 1].v;
            const usrPrev = USR_DYN[USR_DYN.length - 2].v;
            const usrPct = usrPrev > 0 ? Math.round(((usrLatest - usrPrev) / usrPrev) * 100) : 0;

            // Burn multiple — ratio of capital deployed to MRR run-rate (lower = better)
            const burnMultiple = totalRaised > 0 && mrrLatest > 0
              ? (totalRaised / (mrrLatest * 1e5 * 12)).toFixed(1)
              : '—';

            return (
            <div className="hub-tab-content" style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 14, padding: '20px 24px', boxSizing: 'border-box', overflow: 'hidden', position: 'relative' }}>

              {/* ── Accretion disk background ── */}
              <div style={{ position: 'absolute', inset: 0, zIndex: 0, overflow: 'hidden', pointerEvents: 'none' }}>
                <AccretionBg />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg,rgba(0,0,0,0.55) 0%,rgba(0,0,0,0.72) 100%)' }} />
              </div>

              {/* ── Row 1: KPI strip ── */}
              <div className="hub-stat-grid" style={{ flexShrink: 0, display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, position: 'relative', zIndex: 1 }}>
                {[
                  { label: 'Total MRR', val: mrrLatest >= 1000 ? `₹${(mrrLatest / 1000).toFixed(1)}M` : `₹${mrrLatest}K`, change: `+${mrrPct}%`, period: 'vs last month', color: '#8b5cf6' },
                  { label: 'Active Users', val: usrLatest >= 1000 ? `${(usrLatest / 1000).toFixed(1)}K` : String(usrLatest), change: `+${usrPct}%`, period: 'vs last month', color: '#06b6d4' },
                  { label: 'Avg FitScore™', val: String(stats.avgScore), change: '+3.2', period: 'pts platform avg', color: '#10b981' },
                  { label: 'Burn Multiple', val: burnMultiple === '—' ? '—' : `${burnMultiple}×`, change: '-0.3×', period: 'improving QoQ', color: '#f59e0b' },
                ].map(k => (
                  <div key={k.label} style={{
                    background: `linear-gradient(135deg,${k.color}14 0%,rgba(0,0,0,0.72) 70%)`,
                    border: `1px solid ${k.color}28`, borderTop: `2px solid ${k.color}80`,
                    borderRadius: 14, padding: '14px 16px',
                    display: 'flex', alignItems: 'center', gap: 14,
                    position: 'relative', overflow: 'hidden', backdropFilter: 'blur(18px)',
                  }}>
                    <div style={{ position: 'absolute', top: -22, right: -22, width: 95, height: 95, borderRadius: '50%', background: `radial-gradient(circle,${k.color}22,transparent 70%)`, pointerEvents: 'none' }} />
                    <ArmillaryOrb color={k.color} />
                    <div>
                      <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.28)', textTransform: 'uppercase', letterSpacing: '0.09em', margin: 0, marginBottom: 6 }}>{k.label}</p>
                      <p style={{ fontSize: 24, fontWeight: 800, color: 'white', margin: 0, lineHeight: 1 }}>{k.val}</p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: k.color, filter: `drop-shadow(0 0 5px ${k.color})` }}>{k.change}</span>
                        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)' }}>{k.period}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* ── Row 2: Charts ── */}
              <div className="lp-two-col" style={{ flexShrink: 0, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, position: 'relative', zIndex: 1 }}>
                {[
                  { label: 'Portfolio MRR Growth', sub: `+${mrrPct}% MoM`, data: MRR_DYN, color: '#8b5cf6', unit: 'K' },
                  { label: 'Active User Acquisition', sub: `+${usrPct}% MoM`, data: USR_DYN, color: '#06b6d4', unit: '' },
                ].map(c => (
                  <div key={c.label} style={{ background: 'rgba(0,0,0,0.62)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '18px 20px', backdropFilter: 'blur(18px)', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg,transparent,${c.color}65,transparent)` }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 600, color: 'white', margin: 0 }}>{c.label}</p>
                        <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.22)', marginTop: 2, margin: 0 }}>Jan – Jun 2026</p>
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 999, color: c.color, background: `${c.color}18`, border: `1px solid ${c.color}30` }}>{c.sub}</span>
                    </div>
                    <AreaChart data={c.data} color={c.color} h={88} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                      {c.data.map(d => (
                        <div key={d.m} style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)' }}>{d.m}</div>
                          <div style={{ fontSize: 10, fontWeight: 600, color: c.color }}>{d.v}{c.unit}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* ── Row 3: Three redesigned panels ── */}
              <style>{`
                @keyframes an-float  { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-5px)} }
                @keyframes an-shimmer{ 0%{background-position:-150% 0} 100%{background-position:250% 0} }
                @keyframes an-orbit  { from{transform:rotateX(72deg) rotateZ(0deg)} to{transform:rotateX(72deg) rotateZ(360deg)} }
                .an-panel  { transition:border-color .2s ease, box-shadow .2s ease; }
                .an-panel:hover { border-color:rgba(255,255,255,0.13) !important; box-shadow:0 16px 46px rgba(0,0,0,0.5); }
                .an-rank   { transition:transform .18s ease, box-shadow .18s ease, background .18s ease; }
                .an-rank:hover { transform:translateX(3px); box-shadow:0 8px 22px rgba(0,0,0,0.45); }
                .an-legend { transition:transform .16s ease, background .16s ease; }
                .an-legend:hover { transform:translateX(3px); background:rgba(255,255,255,0.05); }
              `}</style>
              <div className="hub-card-grid" style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, position: 'relative', zIndex: 1 }}>

                {/* ══ Sector Distribution — 3D Donut Coin + Legend ══ */}
                <div className="an-panel" style={{ background: 'rgba(0,0,0,0.62)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '16px 18px', display: 'flex', flexDirection: 'column', overflow: 'hidden', backdropFilter: 'blur(18px)', position: 'relative' }}>
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg,transparent,rgba(6,182,212,0.55),transparent)' }} />
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'white', margin: '0 0 10px 0', flexShrink: 0 }}>Sector Distribution</p>

                  <div style={{ flex: 1, minHeight: 0, display: 'flex', alignItems: 'center', gap: 18 }}>
                    {/* 3D tilted extruded donut coin */}
                    {(() => {
                      let acc = 0;
                      const stops = sectorData.map(s => { const a = acc; acc += s.val; return `${s.color} ${a}% ${acc}%`; });
                      if (acc < 100) stops.push(`rgba(255,255,255,0.06) ${acc}% 100%`);
                      const conic = `conic-gradient(from -90deg, ${stops.join(',')})`;
                      const ringMask = 'radial-gradient(circle, transparent 49%, #000 50%)';
                      const D = 116;
                      return (
                        <div style={{ position: 'relative', width: 140, height: 140, flexShrink: 0, perspective: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'an-float 5s ease-in-out infinite' }}>
                          <div style={{ position: 'relative', width: D, height: D, transformStyle: 'preserve-3d', transform: 'rotateX(60deg)' }}>
                            {/* extrusion depth stack */}
                            {Array.from({ length: 8 }).map((_, i) => (
                              <div key={i} style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: conic, transform: `translateZ(${-(i + 1) * 1.6}px)`, filter: `brightness(${0.95 - i * 0.1})`, WebkitMaskImage: ringMask, maskImage: ringMask }} />
                            ))}
                            {/* top face */}
                            <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: conic, WebkitMaskImage: ringMask, maskImage: ringMask, boxShadow: '0 0 24px rgba(6,182,212,0.22)' }} />
                            {/* glossy sheen */}
                            <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'radial-gradient(ellipse at 38% 26%, rgba(255,255,255,0.4), transparent 46%)', WebkitMaskImage: ringMask, maskImage: ringMask, mixBlendMode: 'overlay' }} />
                          </div>
                          {/* flat centre label over the hole */}
                          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                            <span style={{ fontSize: 24, fontWeight: 800, color: 'white', lineHeight: 1, textShadow: '0 2px 10px rgba(0,0,0,0.7)' }}>{sectorData.length}</span>
                            <span style={{ fontSize: 7.5, color: 'rgba(255,255,255,0.4)', letterSpacing: '1.5px', marginTop: 3 }}>SECTORS</span>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Legend */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 7, minWidth: 0 }}>
                      {sectorData.map(s => (
                        <div key={s.label} className="an-legend" style={{ padding: '5px 8px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.04)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
                              <span style={{ width: 8, height: 8, borderRadius: 2, background: s.color, flexShrink: 0, boxShadow: `0 0 8px ${s.color}`, transform: 'rotate(45deg)' }} />
                              <span style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.55)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.label}</span>
                            </div>
                            <span style={{ fontSize: 11, fontWeight: 800, color: s.color, flexShrink: 0 }}>{s.val}%</span>
                          </div>
                          <div style={{ height: 4, borderRadius: 3, background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                            <div style={{ height: '100%', borderRadius: 3, width: `${s.val}%`, background: `linear-gradient(90deg,${s.color},${s.color}70)`, boxShadow: `0 0 8px ${s.color}80` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* ══ FitScore Rankings — 3D Medal Cards ══ */}
                <div className="an-panel" style={{ background: 'rgba(0,0,0,0.62)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '16px 18px', display: 'flex', flexDirection: 'column', overflow: 'hidden', backdropFilter: 'blur(18px)', position: 'relative' }}>
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg,transparent,rgba(139,92,246,0.55),transparent)' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexShrink: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: 'white', margin: 0 }}>FitScore™ Rankings</p>
                    <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.22)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>out of 100</span>
                  </div>

                  <div className="analytics-scroll" style={{ flex: 1, overflowY: 'auto', minHeight: 0, display: 'flex', flexDirection: 'column', gap: 7, WebkitMaskImage: 'linear-gradient(180deg,#000 93%,transparent)', maskImage: 'linear-gradient(180deg,#000 93%,transparent)' }}>
                    {[...startups].sort((a, b) => b.metrics.pitchScore - a.metrics.pitchScore).map((s, i) => {
                      const sc = s.metrics.pitchScore;
                      const col = sc >= 90 ? '#10b981' : sc >= 80 ? '#06b6d4' : sc >= 70 ? '#f59e0b' : '#8b5cf6';
                      const rc = i === 0 ? '#fbbf24' : i === 1 ? '#cbd5e1' : i === 2 ? '#d98a4f' : 'rgba(255,255,255,0.3)';
                      const barW = ((sc - 60) / 40) * 100;
                      const isTop = i < 3;
                      return (
                        <div key={s.id} className="an-rank" style={{
                          display: 'flex', alignItems: 'center', gap: 11,
                          padding: '9px 11px', borderRadius: 11,
                          background: isTop ? `linear-gradient(100deg,${col}14,rgba(255,255,255,0.012) 72%)` : 'rgba(255,255,255,0.015)',
                          border: `1px solid ${isTop ? col + '2e' : 'rgba(255,255,255,0.05)'}`,
                          borderLeft: `3px solid ${isTop ? col : 'rgba(255,255,255,0.1)'}`,
                          boxShadow: isTop ? `0 2px 12px ${col}14` : 'none',
                        }}>
                          {/* 3D medal coin */}
                          <div style={{ perspective: 160, flexShrink: 0 }}>
                            <div style={{
                              width: 25, height: 25, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', transformStyle: 'preserve-3d',
                              animation: isTop ? `an-float ${2.6 + i * 0.3}s ease-in-out infinite` : 'none',
                              background: isTop ? `radial-gradient(circle at 34% 28%, rgba(255,255,255,0.55), ${rc} 42%, ${rc}77 75%)` : 'rgba(255,255,255,0.04)',
                              border: `1px solid ${isTop ? rc : 'rgba(255,255,255,0.12)'}`,
                              boxShadow: isTop ? `0 3px 8px rgba(0,0,0,0.55), 0 0 12px ${rc}66, inset 0 1px 2px rgba(255,255,255,0.5)` : 'inset 0 1px 1px rgba(255,255,255,0.06)',
                            }}>
                              <span style={{ fontSize: 10, fontWeight: 900, color: isTop ? '#1c1c1c' : 'rgba(255,255,255,0.45)' }}>{i + 1}</span>
                            </div>
                          </div>

                          {/* Name + bar */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                              <span style={{ fontSize: 11, color: isTop ? 'white' : 'rgba(255,255,255,0.5)', fontWeight: isTop ? 600 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 100 }}>{s.name}</span>
                              <span style={{ fontSize: 14, fontWeight: 800, color: col, marginLeft: 6, flexShrink: 0, filter: `drop-shadow(0 0 6px ${col})`, lineHeight: 1 }}>{sc}</span>
                            </div>
                            <div style={{ position: 'relative', height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                              <div style={{ height: '100%', borderRadius: 3, width: `${barW}%`, background: `linear-gradient(90deg,${col},${col}88)`, boxShadow: `0 0 8px ${col}80` }} />
                              <div style={{ position: 'absolute', top: 0, left: 0, height: '100%', width: `${barW}%`, borderRadius: 3, background: 'linear-gradient(90deg,transparent,rgba(255,255,255,0.45),transparent)', backgroundSize: '55% 100%', backgroundRepeat: 'no-repeat', animation: 'an-shimmer 2.8s linear infinite' }} />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* ══ Stage Distribution — 3D Pipeline Nodes ══ */}
                <div className="an-panel" style={{ background: 'rgba(0,0,0,0.62)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '16px 18px', display: 'flex', flexDirection: 'column', overflow: 'hidden', backdropFilter: 'blur(18px)', position: 'relative' }}>
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg,transparent,rgba(16,185,129,0.55),transparent)' }} />
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'white', margin: '0 0 10px 0', flexShrink: 0 }}>Stage Distribution</p>

                  <div className="analytics-scroll" style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 0, position: 'relative' }}>
                      {/* Glowing pipeline spine */}
                      <div style={{ position: 'absolute', left: 18, top: 24, bottom: 24, width: 2, background: 'linear-gradient(180deg,rgba(16,185,129,0.4) 0%,rgba(139,92,246,0.25) 55%,rgba(255,255,255,0.03) 100%)', borderRadius: 2, boxShadow: '0 0 8px rgba(16,185,129,0.2)', zIndex: 0 }} />

                      {STAGE_ORDER.map((stage, idx) => {
                        const count = startups.filter(s => s.stage === stage).length;
                        const pct = startups.length ? (count / startups.length) * 100 : 0;
                        const col = STAGE_COLORS[stage];
                        return (
                          <div key={stage} style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '9px 0', position: 'relative', zIndex: 1 }}>

                            {/* 3D sphere node */}
                            <div style={{ width: 36, height: 36, borderRadius: '50%', flexShrink: 0, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', background: `radial-gradient(circle at 32% 28%, ${col}, ${col}55 55%, ${col}12 100%)`, border: `1px solid ${col}80`, boxShadow: count > 0 ? `0 4px 14px ${col}40, 0 0 18px ${col}50, inset 0 -3px 6px rgba(0,0,0,0.45), inset 0 2px 4px ${col}aa` : 'inset 0 -2px 4px rgba(0,0,0,0.4)' }}>
                              <span style={{ fontSize: 13, fontWeight: 800, color: '#fff', filter: count > 0 ? `drop-shadow(0 0 5px ${col})` : 'none', lineHeight: 1, position: 'relative', zIndex: 2 }}>{count}</span>
                              {/* specular highlight */}
                              <div style={{ position: 'absolute', top: 5, left: 7, width: 9, height: 6, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,255,255,0.85), transparent 70%)', zIndex: 2 }} />
                              {/* orbiting electron (populated stages) */}
                              {count > 0 && (
                                <>
                                  <div style={{ position: 'absolute', inset: -5, borderRadius: '50%', border: `1px solid ${col}30`, transform: 'rotateX(72deg)', zIndex: 0 }} />
                                  <div style={{ position: 'absolute', inset: -5, transformStyle: 'preserve-3d', animation: `an-orbit ${3 + idx * 0.6}s linear infinite`, zIndex: 1 }}>
                                    <div style={{ position: 'absolute', top: -2, left: '50%', width: 5, height: 5, marginLeft: -2.5, borderRadius: '50%', background: col, boxShadow: `0 0 8px ${col}, 0 0 4px #fff` }} />
                                  </div>
                                </>
                              )}
                            </div>

                            {/* Stage info */}
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                                <span style={{ fontSize: 11, color: count > 0 ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.28)', fontWeight: count > 0 ? 500 : 400 }}>{stage}</span>
                                <span style={{ fontSize: 10, fontWeight: 700, color: count > 0 ? col : 'rgba(255,255,255,0.2)' }}>{pct.toFixed(0)}%</span>
                              </div>
                              <div style={{ height: 5, borderRadius: 3, background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                                <div style={{ height: '100%', borderRadius: 3, width: `${pct}%`, background: `linear-gradient(90deg,${col},${col}70)`, boxShadow: `0 0 8px ${col}80`, transition: 'width 0.6s cubic-bezier(0.34,1.56,0.64,1)' }} />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Footer */}
                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', marginTop: 8, paddingTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>Total listed</span>
                    <span style={{ fontSize: 14, fontWeight: 800, color: 'white' }}>{startups.length} startups</span>
                  </div>
                </div>

              </div>
            </div>
            );
          })()}

          {/* ── FUNDING TRACKER ──────────────────────────────────────────── */}
          {tab === 'funding' && (() => {
            const committed = INVESTORS.filter(i => i.status === 'Committed');
            const pipeline = INVESTORS.filter(i => i.status !== 'Committed');
            const pipelinePotential = pipeline.reduce((a, c) => a + c.amount, 0);

            // ── Pure-CSS 3D decorations (no WebGL) — float behind table rows ──
            const Cube3D = ({ c, size = 60, dur = 18, ...pos }: { c: string; size?: number; dur?: number } & React.CSSProperties) => (
              <div style={{ position: 'absolute', width: size, height: size, perspective: size * 6, pointerEvents: 'none', ...pos }}>
                <div style={{ position: 'absolute', inset: 0, transformStyle: 'preserve-3d', animation: `ft-cube3d ${dur}s linear infinite` }}>
                  {['rotateY(0deg)', 'rotateY(90deg)', 'rotateY(180deg)', 'rotateY(270deg)', 'rotateX(90deg)', 'rotateX(-90deg)'].map((r, i) => (
                    <div key={i} style={{ position: 'absolute', width: size, height: size, border: `1px solid ${c}40`, background: `${c}0a`, boxShadow: `inset 0 0 16px ${c}1f`, transform: `${r} translateZ(${size / 2}px)` }} />
                  ))}
                </div>
              </div>
            );
            const Disc3D = ({ c, size = 80, dur = 24, ...pos }: { c: string; size?: number; dur?: number } & React.CSSProperties) => (
              <div style={{ position: 'absolute', width: size, height: size, perspective: size * 6, pointerEvents: 'none', ...pos }}>
                <div style={{ position: 'absolute', inset: 0, transformStyle: 'preserve-3d', animation: `ft-disc3d ${dur}s linear infinite` }}>
                  <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: `1px solid ${c}38`, boxShadow: `0 0 18px ${c}14` }} />
                  <div style={{ position: 'absolute', inset: '22%', borderRadius: '50%', border: `1px solid ${c}24` }} />
                  <div style={{ position: 'absolute', inset: '44%', borderRadius: '50%', background: c, boxShadow: `0 0 12px ${c}` }} />
                </div>
              </div>
            );
            return (
              <div className="hub-tab-content" style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: '18px 24px', boxSizing: 'border-box', overflow: 'hidden', position: 'relative', gap: 12 }}>

                {/* ── CSS ambient ── */}
                <style>{`
                  @keyframes ft-drift { 0%,100%{transform:translate(0,0)} 45%{transform:translate(18px,-14px)} 70%{transform:translate(-10px,12px)} }
                  @keyframes ft-spin  { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
                  @keyframes ft-rspin { from{transform:rotate(0deg)} to{transform:rotate(-360deg)} }
                  @keyframes ft-pulse { 0%,100%{opacity:.45;transform:scale(1)} 50%{opacity:1;transform:scale(1.09)} }
                  @keyframes ft-flow  { 0%{background-position:-80% 0} 100%{background-position:180% 0} }
                  @keyframes ft-float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-9px)} }
                  @keyframes ft-morph { 0%,100%{border-radius:60% 40% 30% 70%/60% 30% 70% 40%} 50%{border-radius:30% 60% 70% 40%/50% 60% 30% 60%} }
                  @keyframes ft-bar   { from{width:0} to{width:var(--w)} }
                  @keyframes ft-cube3d { from{transform:rotateX(-24deg) rotateY(0deg)} to{transform:rotateX(-24deg) rotateY(360deg)} }
                  @keyframes ft-disc3d { from{transform:rotateX(66deg) rotateZ(0deg)} to{transform:rotateX(66deg) rotateZ(360deg)} }
                  .ft-inv:hover { background:rgba(255,255,255,0.06) !important; transform:translateX(3px); }
                  .ft-inv { transition:all .18s; }
                `}</style>

                {/* BG decorations */}
                <div aria-hidden style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
                  <div style={{ position: 'absolute', top: '8%', left: '15%', width: 360, height: 360, borderRadius: '50%', background: 'radial-gradient(circle,rgba(139,92,246,0.07),transparent 70%)', animation: 'ft-drift 12s ease-in-out infinite' }} />
                  <div style={{ position: 'absolute', bottom: '10%', right: '10%', width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle,rgba(16,185,129,0.06),transparent 70%)', animation: 'ft-drift 15s ease-in-out infinite reverse' }} />
                  <div style={{ position: 'absolute', top: '45%', right: '30%', width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle,rgba(6,182,212,0.05),transparent 70%)', animation: 'ft-drift 9s ease-in-out infinite 2s' }} />
                  {/* Orrery top-right */}
                  <div style={{ position: 'absolute', top: -40, right: 20, width: 220, height: 220 }}>
                    <div style={{ position: 'absolute', top: '50%', left: '50%', width: 20, height: 20, marginLeft: -10, marginTop: -10, borderRadius: '50%', background: 'radial-gradient(circle at 35% 35%,#a78bfa,#6d28d9)', boxShadow: '0 0 22px rgba(139,92,246,0.9)', animation: 'ft-pulse 2.8s ease-in-out infinite' }} />
                    {[{ w: 68, c: '#8b5cf6', sp: '3.2s' }, { w: 110, c: '#10b981', sp: '5.5s', rev: true }, { w: 160, c: '#06b6d4', sp: '9s' }, { w: 212, c: '#f59e0b', sp: '13s', rev: true }].map((o, i) => (
                      <div key={i} style={{ position: 'absolute', top: '50%', left: '50%', width: o.w, height: o.w, marginLeft: -o.w / 2, marginTop: -o.w / 2, borderRadius: '50%', border: `1px solid ${o.c}${i < 2 ? '38' : '22'}` }}>
                        <div style={{ position: 'absolute', top: i % 2 === 0 ? -5 : 'auto', bottom: i % 2 === 1 ? -5 : 'auto', left: '50%', width: 10, height: 10, marginLeft: -5, borderRadius: '50%', background: o.c, boxShadow: `0 0 10px ${o.c}`, animation: `ft-spin ${o.sp} linear infinite ${o.rev ? 'reverse' : ''}`, transformOrigin: `5px ${o.w / 2 + 5}px` }} />
                      </div>
                    ))}
                  </div>
                  {/* Morphing blob bottom-left */}
                  <div style={{ position: 'absolute', bottom: 20, left: 10, width: 120, height: 120, background: 'linear-gradient(135deg,rgba(139,92,246,0.12),rgba(6,182,212,0.07))', animation: 'ft-morph 8s ease-in-out infinite', border: '1px solid rgba(139,92,246,0.16)' }} />
                  {/* Spinning diamond mid */}
                  <div style={{ position: 'absolute', bottom: '25%', left: '42%', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 54, height: 54 }}>
                    <div style={{ position: 'absolute', width: 42, height: 42, border: '2px solid rgba(16,185,129,0.35)', borderRadius: 4, animation: 'ft-spin 10s linear infinite', transform: 'rotate(45deg)' }} />
                    <div style={{ position: 'absolute', width: 22, height: 22, border: '1px solid rgba(16,185,129,0.55)', background: 'rgba(16,185,129,0.06)', borderRadius: 2, animation: 'ft-rspin 6.5s linear infinite', transform: 'rotate(45deg)' }} />
                  </div>
                  {/* Particles */}
                  {[{ x: '7%', y: '38%', s: 4, c: '#8b5cf6', d: '0s' }, { x: '32%', y: '85%', s: 3, c: '#10b981', d: '.8s' }, { x: '58%', y: '12%', s: 5, c: '#06b6d4', d: '2.5s' }, { x: '85%', y: '55%', s: 3, c: '#f59e0b', d: '.4s' }, { x: '48%', y: '72%', s: 3, c: '#8b5cf6', d: '1.7s' }, { x: '70%', y: '88%', s: 4, c: '#10b981', d: '3s' }].map((p, i) => (
                    <div key={i} style={{ position: 'absolute', left: p.x, top: p.y, width: p.s, height: p.s, borderRadius: '50%', background: p.c, boxShadow: `0 0 ${p.s * 2.5}px ${p.c}`, opacity: .42, animation: `ft-float ${3.5 + i * .6}s ease-in-out ${p.d} infinite` }} />
                  ))}
                  {/* Flow lines */}
                  {[{ t: '32%', c: '#8b5cf6' }, { t: '64%', c: '#10b981' }, { t: '85%', c: '#06b6d4' }].map((l, i) => (
                    <div key={i} style={{ position: 'absolute', left: 0, right: 0, top: l.t, height: 1, background: `linear-gradient(90deg,transparent,${l.c}14,transparent)`, backgroundSize: '40% 100%', animation: `ft-flow 7s linear ${i * 2}s infinite` }} />
                  ))}
                </div>

                {/* ═══════════════════════════════════════════════════════════
                    TOP STRIP — headline KPIs spanning full width
                ═══════════════════════════════════════════════════════════ */}
                <div className="hub-kpi-5col" style={{ flexShrink: 0, position: 'relative', zIndex: 1, display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 10 }}>
                  {[
                    { label: 'Total Live Capital Demand', val: `₹${(totalTarget / 1e6).toFixed(0)}M`, sub: 'Active fundraising goals nationwide', col: '#8b5cf6', icon: '⌖' },
                    { label: 'Successfully Closed Matches', val: `₹${(totalCommitted / 1e6).toFixed(1)}M`, sub: `${committed.length} active deals completed`, col: '#10b981', icon: '✓' },
                    { label: 'Live Matches In Discovery', val: `₹${(pipelinePotential / 1e6).toFixed(1)}M`, sub: `${pipeline.length} active terms under review`, col: '#f59e0b', icon: '◷' },
                    { label: 'Ecosystem Velocity', val: `${Math.round(fundingProgress * 100)}%`, sub: 'of active demand fulfilled', col: '#06b6d4', icon: '↗' },
                    { label: 'Available Pipeline Depth', val: `₹${((totalTarget - totalCommitted) / 1e6).toFixed(1)}M`, sub: 'open for investor matching', col: '#ef4444', icon: '◯' }
                  ].map(k => (
                    <div key={k.label} style={{ borderRadius: 14, border: `1px solid ${k.col}25`, background: `linear-gradient(135deg,${k.col}10,rgba(0,0,0,0.7))`, padding: '12px 14px', position: 'relative', overflow: 'hidden' }}>
                      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg,transparent,${k.col}80,transparent)` }} />
                      <div style={{ position: 'absolute', top: -24, right: -24, width: 80, height: 80, borderRadius: '50%', background: `radial-gradient(circle,${k.col}14,transparent 70%)` }} />
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 4 }}>
                        <p style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.3)', margin: 0, textTransform: 'uppercase', letterSpacing: '.08em' }}>{k.label}</p>
                        <span style={{ fontSize: 14 }}>{k.icon}</span>
                      </div>
                      <p style={{ fontSize: 26, fontWeight: 900, color: 'white', margin: 0, lineHeight: 1, letterSpacing: '-1px', filter: `drop-shadow(0 0 10px ${k.col}60)` }}>{k.val}</p>
                      <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.28)', margin: '4px 0 0' }}>{k.sub}</p>
                    </div>
                  ))}
                </div>

                {/* ═══════════════════════════════════════════════════════════
                    MAIN ROW — 3-column layout
                ═══════════════════════════════════════════════════════════ */}
                <div className="hub-funding-main" style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: '320px 1fr 280px', gap: 12, position: 'relative', zIndex: 1 }}>

                  {/* ── LEFT: Funding Orb Panel ── */}
                  <div className="hub-liquidity-panel" style={{ borderRadius: 20, border: '1px solid rgba(139,92,246,0.3)', background: 'linear-gradient(160deg,rgba(139,92,246,0.14) 0%,rgba(6,6,18,0.97) 70%)', display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative', userSelect: 'none', WebkitUserSelect: 'none' }}>
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg,transparent,rgba(139,92,246,0.9),transparent)', pointerEvents: 'none' }} />
                    <div style={{ position: 'absolute', bottom: -60, left: -60, width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle,rgba(139,92,246,0.1),transparent 70%)', pointerEvents: 'none' }} />

                    {/* Header */}
                    <div style={{ padding: '16px 18px 0', flexShrink: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                        <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.5)', margin: 0, textTransform: 'uppercase', letterSpacing: '.1em' }}>Platform Liquidity Run</p>
                        <span style={{ fontSize: 9, fontWeight: 700, padding: '3px 10px', borderRadius: 999, color: '#a78bfa', background: 'rgba(139,92,246,0.18)', border: '1px solid rgba(139,92,246,0.42)' }}>SEED</span>
                      </div>
                    </div>

                    {/* Orb centred with SVG ring */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '8px 18px', minHeight: 0 }}>
                      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
                        <svg width={180} height={180} style={{ position: 'absolute', pointerEvents: 'none', touchAction: 'none' }}>
                          <defs>
                            <linearGradient id="ftRing" x1="0" y1="0" x2="1" y2="1">
                              <stop offset="0%" stopColor="#8b5cf6" />
                              <stop offset="50%" stopColor="#06b6d4" />
                              <stop offset="100%" stopColor="#10b981" />
                            </linearGradient>
                          </defs>
                          <circle cx="90" cy="90" r="82" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="6" />
                          <circle cx="90" cy="90" r="82" fill="none" stroke="url(#ftRing)" strokeWidth="6"
                            strokeDasharray={`${fundingProgress * 2 * Math.PI * 82} ${2 * Math.PI * 82}`}
                            strokeLinecap="round" transform="rotate(-90 90 90)"
                            style={{ filter: 'drop-shadow(0 0 10px rgba(139,92,246,0.7))' }} />
                          {/* Tick marks */}
                          {[0, 25, 50, 75, 100].map(pct => {
                            const a = (pct / 100) * Math.PI * 2 - Math.PI / 2;
                            return <line key={pct} x1={90 + Math.cos(a) * 76} y1={90 + Math.sin(a) * 76} x2={90 + Math.cos(a) * 88} y2={90 + Math.sin(a) * 88} stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" strokeLinecap="round" />;
                          })}
                        </svg>
                        <FundingOrb progress={fundingProgress} />
                      </div>

                      {/* Big number */}
                      <p style={{ fontSize: 38, fontWeight: 900, color: 'white', margin: 0, lineHeight: 1, letterSpacing: '-2px', textAlign: 'center' }}>₹{(totalCommitted / 1e6).toFixed(1)}<span style={{ fontSize: 18, color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>M</span></p>
                      <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.28)', margin: '4px 0 0', textAlign: 'center' }}>of ₹{(totalTarget / 1e6).toFixed(0)}M active funding volume cleared</p>

                      {/* Gradient pill progress */}
                      <div style={{ width: '100%', marginTop: 14 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                          <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.28)' }}>Progress</span>
                          <span style={{ fontSize: 11, fontWeight: 800, background: 'linear-gradient(90deg,#a78bfa,#34d399)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{Math.round(fundingProgress * 100)}% liquidity rate</span>
                        </div>
                        <div style={{ height: 8, borderRadius: 4, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                          <div style={{ height: '100%', borderRadius: 4, width: `${fundingProgress * 100}%`, background: 'linear-gradient(90deg,#7c3aed,#06b6d4,#10b981)', boxShadow: '0 0 18px rgba(139,92,246,0.7)' }} />
                        </div>
                      </div>

                      {/* Round stages */}
                      <div style={{ width: '100%', display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6, marginTop: 12 }}>
                        {([['Pre-seed', '₹5M', true, '#8b5cf6'], ['Seed', '₹30M', true, '#06b6d4'], ['Series A', '₹100M', false, 'rgba(255,255,255,0.15)']] as [string, string, boolean, string][]).map(([lbl, amt, done, col]) => (
                          <div key={lbl} style={{ borderRadius: 10, padding: '8px 4px', textAlign: 'center', background: done ? `${col}15` : 'rgba(255,255,255,0.02)', border: `1px solid ${done ? col + '40' : 'rgba(255,255,255,0.06)'}`, position: 'relative', overflow: 'hidden' }}>
                            {done && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg,transparent,${col}80,transparent)` }} />}
                            <p style={{ fontSize: 8, fontWeight: 700, color: done ? col : 'rgba(255,255,255,0.2)', margin: 0, textTransform: 'uppercase', letterSpacing: '.06em' }}>{lbl}</p>
                            <p style={{ fontSize: 14, fontWeight: 800, color: done ? 'white' : 'rgba(255,255,255,0.12)', margin: '3px 0 0' }}>{amt}</p>
                            {done && <div style={{ width: 14, height: 14, borderRadius: '50%', background: 'rgba(16,185,129,0.2)', border: '1px solid rgba(16,185,129,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '4px auto 0', fontSize: 8 }}>✓</div>}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Remaining tag */}
                    <div style={{ margin: '0 16px 16px', padding: '9px 14px', borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', textAlign: 'center', flexShrink: 0 }}>
                      <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>₹{((totalTarget - totalCommitted) / 1e6).toFixed(1)}M rolling open capacity · </span>
                      <span style={{ fontSize: 10, color: '#f59e0b', fontWeight: 700 }}>Active Window</span>
                    </div>
                  </div>

                  {/* ── CENTRE: Investor Table ── */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minHeight: 0, overflow: 'hidden' }}>

                    {/* Committed investors */}
                    <div style={{ flex: 1, minHeight: 0, borderRadius: 18, border: '1px solid rgba(16,185,129,0.25)', background: 'linear-gradient(160deg,rgba(16,185,129,0.08) 0%,rgba(6,6,18,0.95) 60%)', display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
                      {/* 3D CSS decor floating in the empty band */}
                      <div aria-hidden style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0, opacity: 0.85 }}>
                        <Cube3D c="#10b981" size={64} dur={19} top="34%" left="44%" />
                        <Disc3D c="#34d399" size={92} dur={26} bottom="12%" right="16%" />
                        <Cube3D c="#059669" size={34} dur={14} top="58%" left="22%" />
                      </div>
                      <div style={{ position: 'relative', zIndex: 1, padding: '13px 16px', borderBottom: '1px solid rgba(16,185,129,0.12)', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px rgba(16,185,129,0.9)', display: 'inline-block' }} />
                        <span style={{ fontSize: 12, fontWeight: 700, color: 'white' }}>Completed Platform Disbursals</span>
                        <span style={{ marginLeft: 'auto', fontSize: 13, fontWeight: 800, color: '#10b981' }}>₹{(totalCommitted / 1e6).toFixed(1)}M</span>
                      </div>
                      {/* Single grid — header + rows share the same column template */}
                      <div className="analytics-scroll" style={{ position: 'relative', zIndex: 1, flex: 1, overflowY: 'auto', minHeight: 0, display: 'grid', gridTemplateColumns: '1fr 80px 90px 76px', alignContent: 'start' }}>
                        {/* Header row */}
                        {['Investor', 'Type', 'Amount', 'Share'].map(h => (
                          <div key={h} style={{ padding: '8px 0 6px', paddingLeft: h === 'Investor' ? 16 : 0, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                            <span style={{ fontSize: 8, fontWeight: 700, color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase', letterSpacing: '.08em' }}>{h}</span>
                          </div>
                        ))}
                        {/* Data rows */}
                        {committed.map((inv, i) => {
                          const pct = Math.round((inv.amount / totalCommitted) * 100);
                          const cols: React.ReactNode[] = [
                            <div key="name" style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, padding: '8px 0 8px 16px' }}>
                              <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(16,185,129,0.14)', border: '1px solid rgba(16,185,129,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <Building2 style={{ width: 12, height: 12, color: '#10b981' }} />
                              </div>
                              <span style={{ fontSize: 12, fontWeight: 700, color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{inv.name}</span>
                            </div>,
                            <div key="type" style={{ display: 'flex', alignItems: 'center', padding: '8px 8px 8px 0' }}>
                              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', padding: '3px 8px', borderRadius: 999, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', whiteSpace: 'nowrap' }}>{inv.type}</span>
                            </div>,
                            <div key="amount" style={{ display: 'flex', alignItems: 'center', padding: '8px 8px 8px 0' }}>
                              <span style={{ fontSize: 13, fontWeight: 800, color: 'white' }}>₹{(inv.amount / 1e6).toFixed(1)}M</span>
                            </div>,
                            <div key="share" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '8px 12px 8px 0' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 3 }}>
                                <span style={{ fontSize: 10, fontWeight: 700, color: '#10b981' }}>{pct}%</span>
                                <CheckCircle style={{ width: 10, height: 10, color: '#10b981' }} />
                              </div>
                              <div style={{ height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.07)' }}>
                                <div style={{ height: '100%', borderRadius: 2, width: `${pct}%`, background: 'linear-gradient(90deg,#10b981,#34d399)' }} />
                              </div>
                            </div>,
                          ];
                          return cols.map((cell, ci) => (
                            <div key={ci} className="ft-inv" style={{ background: i % 2 === 0 ? 'rgba(16,185,129,0.04)' : 'transparent', borderBottom: '1px solid rgba(255,255,255,0.03)', ...(ci === 0 ? { borderLeft: '3px solid rgba(16,185,129,0.6)' } : {}) }}>
                              {cell}
                            </div>
                          ));
                        })}
                      </div>
                    </div>

                    {/* Pipeline investors */}
                    <div style={{ flex: 1, minHeight: 0, borderRadius: 18, border: '1px solid rgba(245,158,11,0.22)', background: 'linear-gradient(160deg,rgba(245,158,11,0.07) 0%,rgba(6,6,18,0.95) 60%)', display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
                      {/* 3D CSS decor floating in the empty band */}
                      <div aria-hidden style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0, opacity: 0.85 }}>
                        <Cube3D c="#f59e0b" size={62} dur={21} top="30%" left="46%" />
                        <Disc3D c="#06b6d4" size={88} dur={28} bottom="14%" right="18%" />
                        <Cube3D c="#fbbf24" size={32} dur={15} top="54%" left="24%" />
                      </div>
                      <div style={{ position: 'relative', zIndex: 1, padding: '13px 16px', borderBottom: '1px solid rgba(245,158,11,0.1)', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#f59e0b', display: 'inline-block' }} />
                        <span style={{ fontSize: 12, fontWeight: 700, color: 'white' }}>Active Cross-Border Dealflow</span>
                        <span style={{ marginLeft: 'auto', fontSize: 13, fontWeight: 800, color: '#f59e0b' }}>₹{(pipelinePotential / 1e6).toFixed(1)}M active routing</span>
                      </div>
                      {/* Single grid — header + rows share same columns */}
                      <div className="analytics-scroll" style={{ position: 'relative', zIndex: 1, flex: 1, overflowY: 'auto', minHeight: 0, display: 'grid', gridTemplateColumns: '1fr 80px 90px 100px', alignContent: 'start' }}>
                        {['Investor', 'Type', 'Amount', 'Status'].map(h => (
                          <div key={h} style={{ padding: '8px 0 6px', paddingLeft: h === 'Investor' ? 16 : 0, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                            <span style={{ fontSize: 8, fontWeight: 700, color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase', letterSpacing: '.08em' }}>{h}</span>
                          </div>
                        ))}
                        {pipeline.map((inv, i) => {
                          const sc = STATUS_COLOR[inv.status] || '#f59e0b';
                          const cols: React.ReactNode[] = [
                            <div key="name" style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, padding: '8px 0 8px 16px' }}>
                              <div style={{ width: 28, height: 28, borderRadius: 8, background: `${sc}14`, border: `1px solid ${sc}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <Building2 style={{ width: 12, height: 12, color: sc }} />
                              </div>
                              <span style={{ fontSize: 12, fontWeight: 700, color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{inv.name}</span>
                            </div>,
                            <div key="type" style={{ display: 'flex', alignItems: 'center', padding: '8px 8px 8px 0' }}>
                              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', padding: '3px 8px', borderRadius: 999, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', whiteSpace: 'nowrap' }}>{inv.type}</span>
                            </div>,
                            <div key="amount" style={{ display: 'flex', alignItems: 'center', padding: '8px 8px 8px 0' }}>
                              <span style={{ fontSize: 13, fontWeight: 800, color: 'white' }}>₹{(inv.amount / 1e6).toFixed(1)}M</span>
                            </div>,
                            <div key="status" style={{ display: 'flex', alignItems: 'center', padding: '8px 12px 8px 0' }}>
                              <span style={{ fontSize: 9, fontWeight: 700, padding: '4px 10px', borderRadius: 999, color: sc, background: `${sc}18`, border: `1px solid ${sc}40`, whiteSpace: 'nowrap' }}>{inv.status}</span>
                            </div>,
                          ];
                          return cols.map((cell, ci) => (
                            <div key={ci} className="ft-inv" style={{ background: i % 2 === 0 ? `${sc}05` : 'transparent', borderBottom: '1px solid rgba(255,255,255,0.03)', ...(ci === 0 ? { borderLeft: `3px solid ${sc}60` } : {}) }}>
                              {cell}
                            </div>
                          ));
                        })}
                      </div>
                    </div>
                  </div>

                  {/* ── RIGHT: 3 metric cards stacked ── */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minHeight: 0, overflow: 'hidden' }}>

                    {/* RunwayGlobe card */}
                    <div style={{ flex: 1, minHeight: 0, borderRadius: 18, border: '1px solid rgba(139,92,246,0.28)', background: 'linear-gradient(160deg,rgba(139,92,246,0.13) 0%,rgba(6,6,18,0.97) 70%)', display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative', padding: '14px 14px 12px' }}>
                      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg,transparent,rgba(139,92,246,0.85),transparent)' }} />
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexShrink: 0 }}>
                        <Clock style={{ width: 13, height: 13, color: '#a78bfa' }} />
                        <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '.1em' }}>Ecosystem Runway Benchmark</span>
                        <span style={{ marginLeft: 'auto', fontSize: 8, fontWeight: 700, padding: '2px 8px', borderRadius: 999, color: '#a78bfa', background: 'rgba(139,92,246,0.18)', border: '1px solid rgba(139,92,246,0.4)' }}>HEALTHY</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minHeight: 0 }}>
                        <RunwayGlobe />
                        <div>
                          <p style={{ fontSize: 36, fontWeight: 900, color: 'white', margin: 0, lineHeight: 1, letterSpacing: '-2px' }}>18</p>
                          <p style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.35)', margin: 0 }}>months</p>
                          <p style={{ fontSize: 8, color: 'rgba(255,255,255,0.2)', marginTop: 5 }}>→ Dec 2027</p>
                          <div style={{ display: 'flex', gap: 5, marginTop: 8 }}>
                            {[['6mo', '#8b5cf6'], ['18mo', '#10b981'], ['24mo', '#06b6d4']].map(([v, c]) => (
                              <div key={v} style={{ padding: '3px 6px', borderRadius: 6, background: `${c}14`, border: `1px solid ${c}28`, textAlign: 'center' }}>
                                <p style={{ fontSize: 10, fontWeight: 800, color: c, margin: 0 }}>{v}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Monthly Burn card */}
                    <div style={{ flex: 1, minHeight: 0, borderRadius: 18, border: '1px solid rgba(245,158,11,0.28)', background: 'linear-gradient(160deg,rgba(245,158,11,0.11) 0%,rgba(18,9,4,0.97) 70%)', display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative', padding: '14px 14px 12px' }}>
                      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg,transparent,rgba(245,158,11,0.85),transparent)' }} />
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexShrink: 0 }}>
                        <Activity style={{ width: 13, height: 13, color: '#f59e0b' }} />
                        <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '.1em' }}>Median Monthly Burn Benchmark</span>
                        <span style={{ marginLeft: 'auto', fontSize: 8, fontWeight: 700, padding: '2px 8px', borderRadius: 999, color: '#f59e0b', background: 'rgba(245,158,11,0.18)', border: '1px solid rgba(245,158,11,0.4)' }}>MOD.</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexShrink: 0 }}>
                        {(() => {
                          const R = 36, cx = 42, cy = 46;
                          const pt = (p: number) => ({ x: cx + R * Math.cos(Math.PI + p * Math.PI), y: cy + R * Math.sin(Math.PI + p * Math.PI) });
                          const [p0, p1, p2, p3] = [pt(0), pt(0.38), pt(0.68), pt(1)];
                          const nx = cx + R * Math.cos(Math.PI + 0.58 * Math.PI), ny = cy + R * Math.sin(Math.PI + 0.58 * Math.PI);
                          const arc = (a: { x: number, y: number }, b: { x: number, y: number }, lg = 0) => `M${a.x.toFixed(1)},${a.y.toFixed(1)}A${R},${R},0,${lg},1,${b.x.toFixed(1)},${b.y.toFixed(1)}`;
                          return (
                            <svg width={84} height={54} viewBox="0 0 84 54" style={{ flexShrink: 0 }}>
                              <path d={arc(p0, p3, 1)} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="9" strokeLinecap="round" />
                              <path d={arc(p0, p1)} fill="none" stroke="#10b981" strokeWidth="9" strokeLinecap="round" style={{ filter: 'drop-shadow(0 0 4px rgba(16,185,129,0.6))' }} />
                              <path d={arc(p1, p2)} fill="none" stroke="#f59e0b" strokeWidth="9" strokeLinecap="round" style={{ filter: 'drop-shadow(0 0 4px rgba(245,158,11,0.6))' }} />
                              <path d={arc(p2, p3)} fill="none" stroke="#ef4444" strokeWidth="9" strokeLinecap="round" style={{ filter: 'drop-shadow(0 0 4px rgba(239,68,68,0.6))' }} />
                              <line x1={cx} y1={cy} x2={nx.toFixed(1)} y2={ny.toFixed(1)} stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" style={{ filter: 'drop-shadow(0 0 7px rgba(245,158,11,1))' }} />
                              <circle cx={cx} cy={cy} r="4.5" fill="#f59e0b" style={{ filter: 'drop-shadow(0 0 9px rgba(245,158,11,1))' }} />
                            </svg>
                          );
                        })()}
                        <div>
                          <p style={{ fontSize: 30, fontWeight: 900, color: 'white', margin: 0, lineHeight: 1, letterSpacing: '-1px' }}>₹12.4<span style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>L</span></p>
                          <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', margin: '3px 0 0' }}>↓ ₹1.1L vs Q1</p>
                        </div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5, flexShrink: 0 }}>
                        {[['Last Mo', '₹13.5L', '#ef4444'], ['QoQ', '-8%', '#10b981']].map(([l, v, c]) => (
                          <div key={l} style={{ padding: '5px 6px', borderRadius: 8, background: `${c}10`, border: `1px solid ${c}28`, textAlign: 'center' }}>
                            <p style={{ fontSize: 8, color: 'rgba(255,255,255,0.25)', margin: 0, textTransform: 'uppercase' }}>{l}</p>
                            <p style={{ fontSize: 12, fontWeight: 800, color: c, margin: 0 }}>{v}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Post-Money Val card */}
                    <div style={{ flex: 1, minHeight: 0, borderRadius: 18, border: '1px solid rgba(16,185,129,0.28)', background: 'linear-gradient(160deg,rgba(16,185,129,0.11) 0%,rgba(4,18,12,0.97) 70%)', display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative', padding: '14px 14px 12px' }}>
                      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg,transparent,rgba(16,185,129,0.85),transparent)' }} />
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexShrink: 0 }}>
                        <TrendingUp style={{ width: 13, height: 13, color: '#10b981' }} />
                        <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '.1em' }}>Aggregate Nationwide Market Val.</span>
                        <span style={{ marginLeft: 'auto', fontSize: 8, fontWeight: 700, padding: '2px 8px', borderRadius: 999, color: '#10b981', background: 'rgba(16,185,129,0.18)', border: '1px solid rgba(16,185,129,0.4)' }}>↑</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8, flexShrink: 0 }}>
                        {(() => {
                          const orbits = [{ rx: 22, ry: 7, sp: '2.4s', r: 4.5 }, { rx: 36, ry: 12, sp: '3.8s', r: 3.5 }, { rx: 50, ry: 17, sp: '6s', r: 3 }];
                          return (
                            <svg width={108} height={68} viewBox="0 0 108 68" style={{ flexShrink: 0 }}>
                              <defs>
                                <style>{orbits.map((o, i) => `@keyframes fto${i}{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}.ftob${i}{transform-box:fill-box;transform-origin:54px 34px;animation:fto${i} ${o.sp} linear infinite}`).join('')}</style>
                                <radialGradient id="ftCore" cx="38%" cy="32%"><stop offset="0%" stopColor="#34d399" /><stop offset="100%" stopColor="#059669" /></radialGradient>
                              </defs>
                              <circle cx="54" cy="34" r="11" fill="url(#ftCore)" style={{ filter: 'drop-shadow(0 0 12px rgba(16,185,129,0.9))' }} />
                              <circle cx="49" cy="29" r="3.5" fill="white" opacity="0.18" />
                              {orbits.map((o, i) => (
                                <g key={i}>
                                  <ellipse cx="54" cy="34" rx={o.rx} ry={o.ry} fill="none" stroke="#10b981" strokeWidth="1" opacity={0.5 - i * 0.12} strokeDasharray="3 2" />
                                  <g className={`ftob${i}`}><circle cx={54 + o.rx} cy="34" r={o.r} fill="#10b981" opacity={0.9 - i * 0.2} style={{ filter: 'drop-shadow(0 0 6px rgba(16,185,129,0.9))' }} /></g>
                                </g>
                              ))}
                            </svg>
                          );
                        })()}
                        <div>
                          <p style={{ fontSize: 30, fontWeight: 900, color: 'white', margin: 0, lineHeight: 1, letterSpacing: '-1px' }}>₹12<span style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>Cr</span></p>
                          <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', margin: '3px 0 0' }}>3.2× seed · ↑ ₹9.5Cr</p>
                        </div>
                      </div>
                      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 5, overflow: 'hidden' }}>
                        {([['Pre-Incubation', '₹3Cr', true, '#475569'], ['Pre-seed', '₹5Cr', true, '#8b5cf6'], ['Seed', '₹12Cr', true, '#10b981'], ['Series A', '₹60Cr', false, '#06b6d4']] as [string, string, boolean, string][]).map(([lbl, val, done, col]) => (
                          <div key={lbl} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: done ? col : 'rgba(255,255,255,0.08)', border: `1.5px solid ${done ? col : 'rgba(255,255,255,0.14)'}`, boxShadow: done ? `0 0 7px ${col}80` : 'none' }} />
                            <span style={{ fontSize: 9, color: done ? 'rgba(255,255,255,0.48)' : 'rgba(255,255,255,0.18)', flex: 1 }}>{lbl}</span>
                            <span style={{ fontSize: 10, fontWeight: 700, color: done ? col : 'rgba(255,255,255,0.14)' }}>{val}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* ── ADMIN PANEL ───────────────────────────────────────────────── */}
          {tab === 'admin' && isAdmin && (
            <div className="hub-tab-content" style={{ height: '100%', display: 'flex', flexDirection: 'column', boxSizing: 'border-box', overflow: 'hidden' }}>

              {/* Header — fixed, never scrolls */}
              <div style={{ padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Shield style={{ width: 15, height: 15, color: '#a78bfa' }} />
                  <div>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#fff' }}>Admin Panel</p>
                    <p style={{ margin: 0, fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>{user?.email}</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setAdminEventsLoading(true); setAdminAdvancesLoading(true); setAdminVCLoading(true); setPendingStartupRegsLoading(true); setActivityLoading(true);
                    Promise.all([
                      fetch('/api/events/pending', { credentials: 'include' }).then(r => r.json()).then(d => setPendingEvents(Array.isArray(d) ? d : [])),
                      fetch('/api/startup-advance/pending', { credentials: 'include' }).then(r => r.json()).then(d => setPendingAdvances(Array.isArray(d) ? d : [])),
                      fetch('/api/vc/admin/pending', { credentials: 'include' }).then(r => r.json()).then(d => { setPendingVCProfiles(Array.isArray(d?.vc_profiles) ? d.vc_profiles : []); setPendingDealInterests(Array.isArray(d?.deal_interests) ? d.deal_interests : []); setPendingDiligenceReqs(Array.isArray(d?.diligence_requests) ? d.diligence_requests : []); setShortlistEvents(Array.isArray(d?.shortlist_events) ? d.shortlist_events : []); }),
                      fetch('/api/startups/admin/pending', { credentials: 'include' }).then(r => r.json()).then(d => setPendingStartupRegs(Array.isArray(d?.startups) ? d.startups : [])),
                      fetch('/api/admin/activity', { credentials: 'include' }).then(r => r.json()).then(d => setActivityEvents(Array.isArray(d?.events) ? d.events : [])),
                    ]).finally(() => { setAdminEventsLoading(false); setAdminAdvancesLoading(false); setAdminVCLoading(false); setPendingStartupRegsLoading(false); setActivityLoading(false); });
                  }}
                  style={{ padding: '6px 14px', borderRadius: 8, fontSize: 11, fontWeight: 700, background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.3)', color: '#a78bfa', cursor: 'pointer' }}
                >
                  ↻ Refresh All
                </button>
              </div>

              {/* Single scrollable body — all sections flow naturally */}
              <div className="admin-scroll-body" style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 0 }}>

              {/* Section: Platform Activity — live audit feed of everything happening on the marketplace */}
              <div style={{ marginBottom: 32 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingBottom: 10, marginBottom: 12, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <Activity style={{ width: 14, height: 14, color: '#34d399' }} />
                  <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#fff' }}>Platform Activity</p>
                  {!activityLoading && (
                    <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 999, background: activityEvents.length > 0 ? 'rgba(16,185,129,0.12)' : 'rgba(255,255,255,0.06)', color: activityEvents.length > 0 ? '#34d399' : 'rgba(255,255,255,0.3)', border: `1px solid ${activityEvents.length > 0 ? 'rgba(16,185,129,0.35)' : 'rgba(255,255,255,0.1)'}` }}>
                      {activityEvents.length}
                    </span>
                  )}
                  <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5, fontSize: 9, fontWeight: 700, color: 'rgba(52,211,153,0.7)', letterSpacing: '.04em' }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#34d399', boxShadow: '0 0 6px #34d399' }} /> LIVE
                  </span>
                </div>

                {activityLoading ? (
                  <div style={{ display: 'flex', justifyContent: 'center', padding: '20px 0' }}>
                    <div style={{ width: 24, height: 24, borderRadius: '50%', border: '2.5px solid rgba(16,185,129,0.2)', borderTop: '2.5px solid #10b981', animation: 'spin 0.8s linear infinite' }} />
                  </div>
                ) : activityEvents.length === 0 ? (
                  <p style={{ margin: '10px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.25)', paddingLeft: 22 }}>No activity yet — registrations, approvals, uploads and removals will stream in here.</p>
                ) : (
                  <div className="admin-activity-scroll" style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 380, overflowY: 'auto', paddingRight: 4 }}>
                    {activityEvents.map((ev: any) => {
                      const META: Record<string, { label: string; color: string; Icon: any }> = {
                        startup_registered: { label: 'Registered', color: '#06b6d4', Icon: Building2 },
                        startup_approved: { label: 'Approved', color: '#10b981', Icon: CheckCircle },
                        startup_rejected: { label: 'Rejected', color: '#f87171', Icon: X },
                        doc_uploaded: { label: 'Uploaded', color: '#8b5cf6', Icon: Upload },
                        doc_removed: { label: 'Deck Removed', color: '#fb7185', Icon: Trash2 },
                        startup_removed: { label: 'Removed', color: '#f59e0b', Icon: Trash2 },
                        investor_removed: { label: 'Investor Removed', color: '#f59e0b', Icon: Trash2 },
                      };
                      const m = META[ev.type] || { label: ev.type, color: '#94a3b8', Icon: Activity };
                      const when = ev.created_at ? new Date(ev.created_at) : null;
                      return (
                        <div key={ev.id} style={{ background: `${m.color}08`, border: `1px solid ${m.color}1f`, borderLeft: `2px solid ${m.color}80`, borderRadius: 12, padding: '11px 14px', display: 'flex', alignItems: 'flex-start', gap: 11, flexShrink: 0 }}>
                          <div style={{ width: 30, height: 30, borderRadius: 9, background: `${m.color}18`, border: `1px solid ${m.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <m.Icon style={{ width: 14, height: 14, color: m.color }} />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 2 }}>
                              <span style={{ fontSize: 9, fontWeight: 800, padding: '2px 8px', borderRadius: 999, color: m.color, background: `${m.color}1a`, border: `1px solid ${m.color}40`, textTransform: 'uppercase', letterSpacing: '.05em' }}>{m.label}</span>
                              <span style={{ fontSize: 13, fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.title}</span>
                            </div>
                            {ev.detail && (
                              <p style={{ margin: '2px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.55)', lineHeight: 1.5 }}>
                                {(ev.type === 'startup_removed' || ev.type === 'investor_removed') ? <span style={{ color: '#fbbf24', fontWeight: 700 }}>Reason: </span> : null}{ev.detail}
                              </p>
                            )}
                            <p style={{ margin: '4px 0 0', fontSize: 10, color: 'rgba(255,255,255,0.32)' }}>
                              {ev.actor_email ? `by ${ev.actor_email}` : ''}{ev.actor_email && when ? ' · ' : ''}{when ? when.toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Section: Event Submissions */}
              <div style={{ marginBottom: 32 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingBottom: 10, marginBottom: 10, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <CalendarDays style={{ width: 14, height: 14, color: '#a78bfa' }} />
                  <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#fff' }}>Event Submissions</p>
                  {!adminEventsLoading && (
                    <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 999, background: pendingEvents.length > 0 ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.06)', color: pendingEvents.length > 0 ? '#fbbf24' : 'rgba(255,255,255,0.3)', border: `1px solid ${pendingEvents.length > 0 ? 'rgba(245,158,11,0.35)' : 'rgba(255,255,255,0.1)'}` }}>
                      {pendingEvents.length} pending
                    </span>
                  )}
                </div>

                {adminEventsLoading ? (
                  <div style={{ padding: '16px 0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ width: 22, height: 22, borderRadius: '50%', border: '2.5px solid rgba(139,92,246,0.2)', borderTop: '2.5px solid #8b5cf6', animation: 'spin 0.8s linear infinite' }} />
                  </div>
                ) : pendingEvents.length === 0 ? (
                  <p style={{ margin: '10px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.25)', paddingLeft: 22 }}>No pending submissions.</p>
                ) : (
                  pendingEvents.map((ev: any) => (
                    <div key={ev.id} style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 12, flexShrink: 0 }}>
                      {/* Top row */}
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                            <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#fff' }}>{ev.title}</p>
                            <span style={{ fontSize: 9, fontWeight: 800, padding: '2px 8px', borderRadius: 999, color: '#a78bfa', background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)', letterSpacing: '.05em' }}>{ev.type}</span>
                            <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 999, color: '#fbbf24', background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)' }}>PENDING</span>
                          </div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, marginTop: 2 }}>
                            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', display: 'flex', alignItems: 'center', gap: 4 }}>
                              <CalendarDays style={{ width: 11, height: 11 }} /> {ev.event_date} · {ev.event_time} IST
                            </span>
                            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', display: 'flex', alignItems: 'center', gap: 4 }}>
                              <Building2 style={{ width: 11, height: 11 }} /> {ev.location_mode === 'physical' ? 'In-Person' : ev.location_mode === 'online' ? 'Online · Zoom' : 'Virtual'}
                            </span>
                            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>{ev.location}</span>
                            {ev.max_capacity && <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>👥 {ev.max_capacity} capacity</span>}
                            {ev.prize && <span style={{ fontSize: 11, color: '#fbbf24' }}>🏆 {ev.prize}</span>}
                          </div>
                        </div>
                        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', flexShrink: 0, whiteSpace: 'nowrap' }}>
                          {new Date(ev.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      </div>

                      {/* Description */}
                      <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.45)', lineHeight: 1.65, borderLeft: '2px solid rgba(139,92,246,0.3)', paddingLeft: 12 }}>{ev.description}</p>

                      {/* Organiser row */}
                      <div style={{ background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.15)', borderRadius: 10, padding: '10px 14px', display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                        <div>
                          <p style={{ margin: 0, fontSize: 9, fontWeight: 700, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 2 }}>Organiser</p>
                          <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#fff' }}>{ev.organiser_name}</p>
                        </div>
                        <div>
                          <p style={{ margin: 0, fontSize: 9, fontWeight: 700, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 2 }}>Email</p>
                          <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>{ev.organiser_email}</p>
                        </div>
                        <div>
                          <p style={{ margin: 0, fontSize: 9, fontWeight: 700, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 2 }}>Organisation</p>
                          <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>{ev.organiser_org}</p>
                        </div>
                        {ev.submitted_by && (
                          <div>
                            <p style={{ margin: 0, fontSize: 9, fontWeight: 700, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 2 }}>Submitted by</p>
                            <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>{ev.submitted_by}</p>
                          </div>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div style={{ display: 'flex', gap: 10 }}>
                        <button
                          disabled={!!adminEventAction[ev.id]}
                          onClick={async () => {
                            setAdminEventAction(a => ({ ...a, [ev.id]: 'rejecting' }));
                            await fetch('/api/events/review', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ id: ev.id, action: 'reject' }) });
                            setPendingEvents(prev => prev.filter(e => e.id !== ev.id));
                            setAdminEventAction(a => { const n = { ...a }; delete n[ev.id]; return n; });
                          }}
                          style={{ flex: 1, padding: '9px 0', borderRadius: 999, fontSize: 12, fontWeight: 700, background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.35)', color: '#f87171', cursor: adminEventAction[ev.id] ? 'wait' : 'pointer', opacity: adminEventAction[ev.id] ? 0.5 : 1 }}
                        >
                          {adminEventAction[ev.id] === 'rejecting' ? 'Rejecting…' : '✕ Reject'}
                        </button>
                        <button
                          disabled={!!adminEventAction[ev.id]}
                          onClick={async () => {
                            setAdminEventAction(a => ({ ...a, [ev.id]: 'approving' }));
                            await fetch('/api/events/review', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ id: ev.id, action: 'approve' }) });
                            setPendingEvents(prev => prev.filter(e => e.id !== ev.id));
                            setAdminEventAction(a => { const n = { ...a }; delete n[ev.id]; return n; });
                          }}
                          style={{ flex: 2, padding: '9px 0', borderRadius: 999, fontSize: 12, fontWeight: 700, background: 'linear-gradient(90deg,rgba(16,185,129,0.2),rgba(16,185,129,0.1))', border: '1px solid rgba(16,185,129,0.4)', color: '#34d399', cursor: adminEventAction[ev.id] ? 'wait' : 'pointer', opacity: adminEventAction[ev.id] ? 0.5 : 1 }}
                        >
                          {adminEventAction[ev.id] === 'approving' ? 'Approving…' : '✓ Approve & Publish'}
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Section: Startup Registrations */}
              <div style={{ marginBottom: 32 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingBottom: 10, marginBottom: 10, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <Rocket style={{ width: 14, height: 14, color: '#0ea5e9' }} />
                  <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#fff' }}>Startup Registrations</p>
                  {!pendingStartupRegsLoading && (
                    <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 999, background: pendingStartupRegs.length > 0 ? 'rgba(14,165,233,0.12)' : 'rgba(255,255,255,0.06)', color: pendingStartupRegs.length > 0 ? '#38bdf8' : 'rgba(255,255,255,0.3)', border: `1px solid ${pendingStartupRegs.length > 0 ? 'rgba(14,165,233,0.35)' : 'rgba(255,255,255,0.1)'}` }}>
                      {pendingStartupRegs.length} pending
                    </span>
                  )}
                </div>
                {pendingStartupRegsLoading ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px 0' }}>
                    <div style={{ width: 24, height: 24, borderRadius: '50%', border: '2.5px solid rgba(14,165,233,0.2)', borderTop: '2.5px solid #38bdf8', animation: 'spin 0.8s linear infinite' }} />
                  </div>
                ) : pendingStartupRegs.length === 0 ? (
                  <p style={{ margin: '10px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.25)', paddingLeft: 22 }}>No pending registrations.</p>
                ) : pendingStartupRegs.map((sr: any) => (
                  <div key={sr.id} style={{ background: 'rgba(14,165,233,0.03)', border: '1px solid rgba(14,165,233,0.15)', borderRadius: 14, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 10, flexShrink: 0, marginBottom: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                      <div>
                        <p style={{ margin: '0 0 2px', fontSize: 14, fontWeight: 800, color: '#fff' }}>{sr.name}</p>
                        <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{sr.founder} · {sr.industry}</p>
                        {sr.tagline && <p style={{ margin: '4px 0 0', fontSize: 10, color: 'rgba(255,255,255,0.35)', lineHeight: 1.5 }}>{sr.tagline}</p>}
                        <p style={{ margin: '4px 0 0', fontSize: 10, color: 'rgba(14,165,233,0.7)' }}>Stage: {sr.stage} · by {sr.created_by_email || sr.owner_email}</p>
                      </div>
                      <span style={{ fontSize: 9, fontWeight: 800, padding: '3px 9px', borderRadius: 999, color: '#fbbf24', background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)', flexShrink: 0 }}>PENDING</span>
                    </div>
                    <div style={{ display: 'flex', gap: 10 }}>
                      <button disabled={!!adminStartupRegAction[sr.id]} onClick={async () => { setAdminStartupRegAction(a => ({ ...a, [sr.id]: 'rejecting' })); await fetch('/api/startups/admin/review', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ id: sr.id, action: 'reject' }) }); setPendingStartupRegs(prev => prev.filter(s => s.id !== sr.id)); fetch('/api/admin/activity', { credentials: 'include' }).then(r => r.json()).then(d => setActivityEvents(Array.isArray(d?.events) ? d.events : [])).catch(() => {}); setAdminStartupRegAction(a => { const n = { ...a }; delete n[sr.id]; return n; }); }} style={{ flex: 1, padding: '8px 0', borderRadius: 999, fontSize: 11, fontWeight: 700, background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.35)', color: '#f87171', cursor: adminStartupRegAction[sr.id] ? 'wait' : 'pointer', opacity: adminStartupRegAction[sr.id] ? 0.5 : 1 }}>{adminStartupRegAction[sr.id] === 'rejecting' ? 'Rejecting…' : '✕ Reject'}</button>
                      <button disabled={!!adminStartupRegAction[sr.id]} onClick={async () => { setAdminStartupRegAction(a => ({ ...a, [sr.id]: 'approving' })); await fetch('/api/startups/admin/review', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ id: sr.id, action: 'approve' }) }); setPendingStartupRegs(prev => prev.filter(s => s.id !== sr.id)); setStartups(prev => prev.map(s => s.id === sr.id ? { ...s, status: 'approved' } : s)); fetch('/api/admin/activity', { credentials: 'include' }).then(r => r.json()).then(d => setActivityEvents(Array.isArray(d?.events) ? d.events : [])).catch(() => {}); setAdminStartupRegAction(a => { const n = { ...a }; delete n[sr.id]; return n; }); }} style={{ flex: 2, padding: '8px 0', borderRadius: 999, fontSize: 11, fontWeight: 700, background: 'linear-gradient(90deg,rgba(14,165,233,0.25),rgba(14,165,233,0.1))', border: '1px solid rgba(14,165,233,0.45)', color: '#38bdf8', cursor: adminStartupRegAction[sr.id] ? 'wait' : 'pointer', opacity: adminStartupRegAction[sr.id] ? 0.5 : 1 }}>{adminStartupRegAction[sr.id] === 'approving' ? 'Approving…' : '✓ Approve'}</button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Section: Stage Advance Requests */}
              <div style={{ marginBottom: 32 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingBottom: 10, marginBottom: 10, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <ArrowRight style={{ width: 14, height: 14, color: '#10b981' }} />
                  <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#fff' }}>Stage Advance Requests</p>
                  {!adminAdvancesLoading && (
                    <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 999, background: pendingAdvances.length > 0 ? 'rgba(16,185,129,0.12)' : 'rgba(255,255,255,0.06)', color: pendingAdvances.length > 0 ? '#34d399' : 'rgba(255,255,255,0.3)', border: `1px solid ${pendingAdvances.length > 0 ? 'rgba(16,185,129,0.35)' : 'rgba(255,255,255,0.1)'}` }}>
                      {pendingAdvances.length} pending
                    </span>
                  )}
                </div>

                {adminAdvancesLoading ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 0' }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', border: '2.5px solid rgba(16,185,129,0.2)', borderTop: '2.5px solid #10b981', animation: 'spin 0.8s linear infinite' }} />
                  </div>
                ) : pendingAdvances.length === 0 ? (
                  <p style={{ margin: '10px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.25)', paddingLeft: 22 }}>No pending requests.</p>
                ) : (
                  pendingAdvances.map((req: any) => (
                    <div key={req.id} style={{ background: 'rgba(16,185,129,0.03)', border: '1px solid rgba(16,185,129,0.12)', borderRadius: 16, padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 12, flexShrink: 0 }}>
                      {/* Header row */}
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                            <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#fff' }}>{req.startup_name}</p>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999, color: '#f59e0b', background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)' }}>{req.current_stage}</span>
                              <ArrowRight style={{ width: 10, height: 10, color: 'rgba(255,255,255,0.3)' }} />
                              <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999, color: '#34d399', background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)' }}>{req.target_stage}</span>
                            </div>
                          </div>
                          <p style={{ margin: 0, fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>Submitted by {req.submitted_by} · {new Date(req.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                        </div>
                        <span style={{ fontSize: 9, fontWeight: 800, padding: '3px 9px', borderRadius: 999, color: '#fbbf24', background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)', flexShrink: 0 }}>PENDING</span>
                      </div>

                      {/* Justification */}
                      <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: '12px 14px' }}>
                        <p style={{ margin: '0 0 6px', fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '.07em' }}>Justification</p>
                        <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.55)', lineHeight: 1.7 }}>{req.justification}</p>
                      </div>

                      {/* Proof doc link */}
                      {req.proof_url && (
                        <a href={req.proof_url} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 600, color: '#a78bfa', textDecoration: 'none', padding: '6px 12px', borderRadius: 8, background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.25)', width: 'fit-content' }}>
                          <FolderKey style={{ width: 12, height: 12 }} /> View Proof Document →
                        </a>
                      )}

                      {/* Actions */}
                      <div style={{ display: 'flex', gap: 10 }}>
                        <button
                          disabled={!!adminAdvanceAction[req.id]}
                          onClick={async () => {
                            setAdminAdvanceAction(a => ({ ...a, [req.id]: 'rejecting' }));
                            await fetch('/api/startup-advance/review', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ id: req.id, action: 'reject' }) });
                            setPendingAdvances(prev => prev.filter(r => r.id !== req.id));
                            setAdminAdvanceAction(a => { const n = { ...a }; delete n[req.id]; return n; });
                          }}
                          style={{ flex: 1, padding: '9px 0', borderRadius: 999, fontSize: 12, fontWeight: 700, background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.35)', color: '#f87171', cursor: adminAdvanceAction[req.id] ? 'wait' : 'pointer', opacity: adminAdvanceAction[req.id] ? 0.5 : 1 }}
                        >
                          {adminAdvanceAction[req.id] === 'rejecting' ? 'Rejecting…' : '✕ Reject'}
                        </button>
                        <button
                          disabled={!!adminAdvanceAction[req.id]}
                          onClick={async () => {
                            setAdminAdvanceAction(a => ({ ...a, [req.id]: 'approving' }));
                            const res = await fetch('/api/startup-advance/review', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ id: req.id, action: 'approve', startup_id: req.startup_id, target_stage: req.target_stage }) });
                            if (res.ok) {
                              // Also update local pipeline stage
                              setStartups(prev => prev.map(s => s.id === req.startup_id ? { ...s, stage: req.target_stage } : s));
                            }
                            setPendingAdvances(prev => prev.filter(r => r.id !== req.id));
                            setAdminAdvanceAction(a => { const n = { ...a }; delete n[req.id]; return n; });
                          }}
                          style={{ flex: 2, padding: '9px 0', borderRadius: 999, fontSize: 12, fontWeight: 700, background: 'linear-gradient(90deg,rgba(16,185,129,0.2),rgba(16,185,129,0.1))', border: '1px solid rgba(16,185,129,0.4)', color: '#34d399', cursor: adminAdvanceAction[req.id] ? 'wait' : 'pointer', opacity: adminAdvanceAction[req.id] ? 0.5 : 1 }}
                        >
                          {adminAdvanceAction[req.id] === 'approving' ? 'Approving…' : '✓ Approve & Advance Stage'}
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Section: VC Profile Verifications */}
              <div style={{ marginBottom: 32 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingBottom: 10, marginBottom: 10, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <Telescope style={{ width: 14, height: 14, color: '#a78bfa' }} />
                  <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#fff' }}>VC Profile Verifications</p>
                  {!adminVCLoading && (
                    <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 999, background: pendingVCProfiles.length > 0 ? 'rgba(139,92,246,0.12)' : 'rgba(255,255,255,0.06)', color: pendingVCProfiles.length > 0 ? '#a78bfa' : 'rgba(255,255,255,0.3)', border: `1px solid ${pendingVCProfiles.length > 0 ? 'rgba(139,92,246,0.35)' : 'rgba(255,255,255,0.1)'}` }}>
                      {pendingVCProfiles.length} pending
                    </span>
                  )}
                </div>
                {adminVCLoading ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px 0' }}>
                    <div style={{ width: 24, height: 24, borderRadius: '50%', border: '2.5px solid rgba(139,92,246,0.2)', borderTop: '2.5px solid #a78bfa', animation: 'spin 0.8s linear infinite' }} />
                  </div>
                ) : pendingVCProfiles.length === 0 ? (
                  <p style={{ margin: '10px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.25)', paddingLeft: 22 }}>No pending verifications.</p>
                ) : pendingVCProfiles.map((vc: any) => (
                  <div key={vc.id} style={{ background: 'rgba(139,92,246,0.03)', border: '1px solid rgba(139,92,246,0.15)', borderRadius: 14, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 10, flexShrink: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                      <div>
                        <p style={{ margin: '0 0 2px', fontSize: 14, fontWeight: 800, color: '#fff' }}>{vc.firm_name}</p>
                        <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{vc.partner_name} · {vc.email}</p>
                        {vc.sectors && <p style={{ margin: '4px 0 0', fontSize: 10, color: 'rgba(139,92,246,0.8)' }}>Sectors: {vc.sectors}</p>}
                        {vc.stage_pref && <p style={{ margin: '2px 0 0', fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>Stages: {vc.stage_pref}</p>}
                      </div>
                      <span style={{ fontSize: 9, fontWeight: 800, padding: '3px 9px', borderRadius: 999, color: '#fbbf24', background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)', flexShrink: 0 }}>PENDING</span>
                    </div>
                    <div style={{ display: 'flex', gap: 10 }}>
                      <button disabled={!!adminVCAction[vc.id]} onClick={async () => { setAdminVCAction(a => ({ ...a, [vc.id]: 'rejecting' })); await fetch('/api/vc/admin/review', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ table: 'vc_profiles', id: vc.id, action: 'reject' }) }); setPendingVCProfiles(prev => prev.filter(v => v.id !== vc.id)); setAdminVCAction(a => { const n = { ...a }; delete n[vc.id]; return n; }); }} style={{ flex: 1, padding: '8px 0', borderRadius: 999, fontSize: 11, fontWeight: 700, background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.35)', color: '#f87171', cursor: adminVCAction[vc.id] ? 'wait' : 'pointer', opacity: adminVCAction[vc.id] ? 0.5 : 1 }}>{adminVCAction[vc.id] === 'rejecting' ? 'Rejecting…' : '✕ Reject'}</button>
                      <button disabled={!!adminVCAction[vc.id]} onClick={async () => { setAdminVCAction(a => ({ ...a, [vc.id]: 'approving' })); await fetch('/api/vc/admin/review', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ table: 'vc_profiles', id: vc.id, action: 'approve' }) }); setPendingVCProfiles(prev => prev.filter(v => v.id !== vc.id)); setAdminVCAction(a => { const n = { ...a }; delete n[vc.id]; return n; }); }} style={{ flex: 2, padding: '8px 0', borderRadius: 999, fontSize: 11, fontWeight: 700, background: 'linear-gradient(90deg,rgba(139,92,246,0.25),rgba(139,92,246,0.1))', border: '1px solid rgba(139,92,246,0.45)', color: '#a78bfa', cursor: adminVCAction[vc.id] ? 'wait' : 'pointer', opacity: adminVCAction[vc.id] ? 0.5 : 1 }}>{adminVCAction[vc.id] === 'approving' ? 'Approving…' : '✓ Verify VC'}</button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Section: Deal Interest Requests */}
              <div style={{ marginBottom: 32 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingBottom: 10, marginBottom: 10, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <DollarSign style={{ width: 14, height: 14, color: '#10b981' }} />
                  <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#fff' }}>Deal Interest Submissions</p>
                  {!adminVCLoading && (
                    <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 999, background: pendingDealInterests.length > 0 ? 'rgba(16,185,129,0.12)' : 'rgba(255,255,255,0.06)', color: pendingDealInterests.length > 0 ? '#34d399' : 'rgba(255,255,255,0.3)', border: `1px solid ${pendingDealInterests.length > 0 ? 'rgba(16,185,129,0.35)' : 'rgba(255,255,255,0.1)'}` }}>
                      {pendingDealInterests.length} pending
                    </span>
                  )}
                </div>
                {pendingDealInterests.length === 0 && !adminVCLoading ? (
                  <p style={{ margin: '10px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.25)', paddingLeft: 22 }}>No pending deal interests.</p>
                ) : pendingDealInterests.map((di: any) => (
                  <div key={di.id} style={{ background: 'rgba(16,185,129,0.03)', border: '1px solid rgba(16,185,129,0.12)', borderRadius: 14, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                      <div>
                        <p style={{ margin: '0 0 2px', fontSize: 13, fontWeight: 800, color: '#fff' }}>{di.startup_name}</p>
                        <p style={{ margin: 0, fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>from {di.vc_firm || di.vc_email} · {new Date(di.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</p>
                        {di.note && <p style={{ margin: '6px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.5)', lineHeight: 1.6 }}>{di.note}</p>}
                      </div>
                      <span style={{ fontSize: 9, fontWeight: 800, padding: '3px 9px', borderRadius: 999, color: '#fbbf24', background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)', flexShrink: 0 }}>PENDING</span>
                    </div>
                    <div style={{ display: 'flex', gap: 10 }}>
                      <button disabled={!!adminVCAction[di.id]} onClick={async () => { setAdminVCAction(a => ({ ...a, [di.id]: 'rejecting' })); await fetch('/api/vc/admin/review', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ table: 'deal_interests', id: di.id, action: 'reject' }) }); setPendingDealInterests(prev => prev.filter(d => d.id !== di.id)); setAdminVCAction(a => { const n = { ...a }; delete n[di.id]; return n; }); }} style={{ flex: 1, padding: '8px 0', borderRadius: 999, fontSize: 11, fontWeight: 700, background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.35)', color: '#f87171', cursor: adminVCAction[di.id] ? 'wait' : 'pointer', opacity: adminVCAction[di.id] ? 0.5 : 1 }}>{adminVCAction[di.id] === 'rejecting' ? 'Passing…' : '✕ Pass'}</button>
                      <button disabled={!!adminVCAction[di.id]} onClick={async () => { setAdminVCAction(a => ({ ...a, [di.id]: 'approving' })); await fetch('/api/vc/admin/review', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ table: 'deal_interests', id: di.id, action: 'approve' }) }); setPendingDealInterests(prev => prev.filter(d => d.id !== di.id)); setAdminVCAction(a => { const n = { ...a }; delete n[di.id]; return n; }); }} style={{ flex: 2, padding: '8px 0', borderRadius: 999, fontSize: 11, fontWeight: 700, background: 'linear-gradient(90deg,rgba(16,185,129,0.2),rgba(16,185,129,0.1))', border: '1px solid rgba(16,185,129,0.4)', color: '#34d399', cursor: adminVCAction[di.id] ? 'wait' : 'pointer', opacity: adminVCAction[di.id] ? 0.5 : 1 }}>{adminVCAction[di.id] === 'approving' ? 'Reviewing…' : '✓ Mark Reviewed'}</button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Section: Diligence Access Requests */}
              <div style={{ marginBottom: 32 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingBottom: 10, marginBottom: 10, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <FolderKey style={{ width: 14, height: 14, color: '#f59e0b' }} />
                  <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#fff' }}>Diligence Access Requests</p>
                  {!adminVCLoading && (
                    <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 999, background: pendingDiligenceReqs.length > 0 ? 'rgba(245,158,11,0.12)' : 'rgba(255,255,255,0.06)', color: pendingDiligenceReqs.length > 0 ? '#fbbf24' : 'rgba(255,255,255,0.3)', border: `1px solid ${pendingDiligenceReqs.length > 0 ? 'rgba(245,158,11,0.35)' : 'rgba(255,255,255,0.1)'}` }}>
                      {pendingDiligenceReqs.length} pending
                    </span>
                  )}
                </div>
                {pendingDiligenceReqs.length === 0 && !adminVCLoading ? (
                  <p style={{ margin: '10px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.25)', paddingLeft: 22 }}>No pending requests.</p>
                ) : pendingDiligenceReqs.map((dr: any) => (
                  <div key={dr.id} style={{ background: 'rgba(245,158,11,0.03)', border: '1px solid rgba(245,158,11,0.12)', borderRadius: 14, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                      <div>
                        <p style={{ margin: '0 0 2px', fontSize: 13, fontWeight: 800, color: '#fff' }}>{dr.doc_name}</p>
                        <p style={{ margin: 0, fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>{dr.startup} · from {dr.vc_firm || dr.vc_email} · {new Date(dr.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</p>
                        {dr.reason && <p style={{ margin: '6px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.5)', lineHeight: 1.6 }}>{dr.reason}</p>}
                      </div>
                      <span style={{ fontSize: 9, fontWeight: 800, padding: '3px 9px', borderRadius: 999, color: '#fbbf24', background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)', flexShrink: 0 }}>PENDING</span>
                    </div>
                    <div style={{ display: 'flex', gap: 10 }}>
                      <button disabled={!!adminVCAction[dr.id]} onClick={async () => { setAdminVCAction(a => ({ ...a, [dr.id]: 'rejecting' })); await fetch('/api/vc/admin/review', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ table: 'diligence_requests', id: dr.id, action: 'reject' }) }); setPendingDiligenceReqs(prev => prev.filter(r => r.id !== dr.id)); setAdminVCAction(a => { const n = { ...a }; delete n[dr.id]; return n; }); }} style={{ flex: 1, padding: '8px 0', borderRadius: 999, fontSize: 11, fontWeight: 700, background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.35)', color: '#f87171', cursor: adminVCAction[dr.id] ? 'wait' : 'pointer', opacity: adminVCAction[dr.id] ? 0.5 : 1 }}>{adminVCAction[dr.id] === 'rejecting' ? 'Rejecting…' : '✕ Deny'}</button>
                      <button disabled={!!adminVCAction[dr.id]} onClick={async () => { setAdminVCAction(a => ({ ...a, [dr.id]: 'approving' })); await fetch('/api/vc/admin/review', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ table: 'diligence_requests', id: dr.id, action: 'approve' }) }); setPendingDiligenceReqs(prev => prev.filter(r => r.id !== dr.id)); setAdminVCAction(a => { const n = { ...a }; delete n[dr.id]; return n; }); }} style={{ flex: 2, padding: '8px 0', borderRadius: 999, fontSize: 11, fontWeight: 700, background: 'linear-gradient(90deg,rgba(245,158,11,0.2),rgba(245,158,11,0.1))', border: '1px solid rgba(245,158,11,0.4)', color: '#fbbf24', cursor: adminVCAction[dr.id] ? 'wait' : 'pointer', opacity: adminVCAction[dr.id] ? 0.5 : 1 }}>{adminVCAction[dr.id] === 'approving' ? 'Granting…' : '✓ Grant Access'}</button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Section: Shortlist Activity */}
              <div style={{ marginBottom: 32 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingBottom: 10, marginBottom: 10, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <Star style={{ width: 14, height: 14, color: '#8b5cf6' }} />
                  <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#fff' }}>Shortlist Activity</p>
                  {!adminVCLoading && (
                    <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 999, background: shortlistEvents.length > 0 ? 'rgba(139,92,246,0.12)' : 'rgba(255,255,255,0.06)', color: shortlistEvents.length > 0 ? '#a78bfa' : 'rgba(255,255,255,0.3)', border: `1px solid ${shortlistEvents.length > 0 ? 'rgba(139,92,246,0.35)' : 'rgba(255,255,255,0.1)'}` }}>
                      {shortlistEvents.length}
                    </span>
                  )}
                </div>
                {shortlistEvents.length === 0 && !adminVCLoading ? (
                  <p style={{ margin: '10px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.25)', paddingLeft: 22 }}>No shortlist activity yet.</p>
                ) : shortlistEvents.map((ev: any) => {
                  const revoked = ev.action === 'revoked';
                  const ac = revoked ? '#f59e0b' : '#10b981';
                  return (
                    <div key={ev.id} style={{ background: `${ac}08`, border: `1px solid ${ac}1f`, borderLeft: `2px solid ${ac}80`, borderRadius: 14, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                        <div style={{ minWidth: 0 }}>
                          <p style={{ margin: '0 0 2px', fontSize: 13, fontWeight: 800, color: '#fff' }}>{ev.startup_name}</p>
                          <p style={{ margin: 0, fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>from {ev.vc_firm || ev.vc_email} · {new Date(ev.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</p>
                          {revoked && ev.reason && <p style={{ margin: '6px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.55)', lineHeight: 1.6 }}><span style={{ color: '#fbbf24', fontWeight: 700 }}>Reason:</span> {ev.reason}</p>}
                        </div>
                        <span style={{ fontSize: 9, fontWeight: 800, padding: '3px 9px', borderRadius: 999, color: ac, background: `${ac}1f`, border: `1px solid ${ac}50`, flexShrink: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{revoked ? 'Revoked' : 'Shortlisted'}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Section: Contact Messages */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingBottom: 10, marginBottom: 10, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <MessageSquare style={{ width: 14, height: 14, color: '#06b6d4' }} />
                  <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#fff' }}>Contact Messages</p>
                  {!contactMsgsLoading && (
                    <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 999, background: contactMessages.filter((m: any) => !m.read).length > 0 ? 'rgba(6,182,212,0.12)' : 'rgba(255,255,255,0.06)', color: contactMessages.filter((m: any) => !m.read).length > 0 ? '#22d3ee' : 'rgba(255,255,255,0.3)', border: `1px solid ${contactMessages.filter((m: any) => !m.read).length > 0 ? 'rgba(6,182,212,0.35)' : 'rgba(255,255,255,0.1)'}` }}>
                      {contactMessages.filter((m: any) => !m.read).length} unread
                    </span>
                  )}
                </div>
                {contactMsgsLoading ? (
                  <div style={{ display: 'flex', justifyContent: 'center', padding: '20px 0' }}>
                    <div style={{ width: 24, height: 24, borderRadius: '50%', border: '2.5px solid rgba(6,182,212,0.2)', borderTop: '2.5px solid #06b6d4', animation: 'spin 0.8s linear infinite' }} />
                  </div>
                ) : contactMessages.length === 0 ? (
                  <p style={{ margin: '10px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.25)', paddingLeft: 22 }}>No messages yet.</p>
                ) : contactMessages.map((msg: any) => (
                  <div key={msg.id} style={{ background: msg.read ? 'rgba(255,255,255,0.02)' : 'rgba(6,182,212,0.05)', border: `1px solid ${msg.read ? 'rgba(255,255,255,0.08)' : 'rgba(6,182,212,0.22)'}`, borderRadius: 14, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 2 }}>
                          <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: '#fff' }}>{msg.name}</p>
                          {!msg.read && <span style={{ fontSize: 8, fontWeight: 800, padding: '2px 6px', borderRadius: 999, background: 'rgba(6,182,212,0.18)', color: '#22d3ee', border: '1px solid rgba(6,182,212,0.35)' }}>NEW</span>}
                        </div>
                        <p style={{ margin: 0, fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>{msg.email} · {new Date(msg.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                        <p style={{ margin: '8px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.72)', lineHeight: 1.65, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{msg.message}</p>
                      </div>
                    </div>
                    {!msg.read && (
                      <button
                        onClick={async () => {
                          await fetch('/api/contact/mark-read', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ id: msg.id, read: true }) });
                          setContactMessages(prev => prev.map((m: any) => m.id === msg.id ? { ...m, read: true } : m));
                        }}
                        style={{ alignSelf: 'flex-start', padding: '6px 14px', borderRadius: 999, fontSize: 10, fontWeight: 700, background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.3)', color: '#22d3ee', cursor: 'pointer' }}
                      >
                        ✓ Mark as read
                      </button>
                    )}
                  </div>
                ))}
              </div>

              </div>{/* end scrollable body */}
            </div>
          )}

        </main>
      </div>

      {/* ── MODAL: DOC VIEWER ────────────────────────────────────────────── */}
      {viewingDoc && (() => {
        const vd = viewingDoc;
        const TYPE_COLOR: Record<string, string> = { Deck: '#8b5cf6', Doc: '#06b6d4', Sheet: '#10b981', Video: '#f59e0b', Bundle: '#ec4899' };
        const STATUS_COLOR: Record<string, string> = { Final: '#10b981', Review: '#f59e0b', Draft: '#94a3b8' };
        const tc = TYPE_COLOR[vd.type] ?? '#8b5cf6';
        const sc = STATUS_COLOR[vd.status] ?? '#94a3b8';
        const url = vd.file_url ?? '';
        const ext = url.split('?')[0].split('.').pop()?.toLowerCase() ?? '';
        const isImage = ['png','jpg','jpeg','gif','webp','svg'].includes(ext);
        const isVideo = ['mp4','webm','mov','avi'].includes(ext) || vd.type === 'Video';
        const isPdf = ext === 'pdf' || ['Deck','Doc','Bundle','Sheet'].includes(vd.type);

        return (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-2" style={{ background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(16px)' }} onClick={() => setViewingDoc(null)}>
            <div onClick={e => e.stopPropagation()} style={{ width: '96vw', maxWidth: 1300, height: '94vh', display: 'flex', flexDirection: 'column', background: '#08080f', border: `1px solid ${tc}35`, borderRadius: 20, overflow: 'hidden', boxShadow: `0 0 80px ${tc}25, 0 32px 80px rgba(0,0,0,0.8)` }}>

              {/* Header bar */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: `1px solid rgba(255,255,255,0.07)`, flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 9, fontWeight: 800, color: tc, padding: '3px 10px', borderRadius: 999, background: `${tc}20`, border: `1px solid ${tc}40`, letterSpacing: '0.07em' }}>{vd.type.toUpperCase()}</span>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#fff' }}>{vd.name}</p>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: sc, display: 'inline-block', boxShadow: `0 0 6px ${sc}` }} />
                    <span style={{ fontSize: 10, color: sc, fontWeight: 600 }}>{vd.status}</span>
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {/* AI Score badge */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 999, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', fontWeight: 700, letterSpacing: '0.06em' }}>AI</span>
                    <span style={{ fontSize: 13, fontWeight: 800, color: vd.score >= 85 ? '#10b981' : vd.score >= 70 ? '#f59e0b' : '#f87171' }}>{vd.score}</span>
                  </div>
                  {/* Open in new tab */}
                  <a href={url} target="_blank" rel="noopener noreferrer"
                    onClick={e => e.stopPropagation()}
                    style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 999, background: `${tc}18`, border: `1px solid ${tc}40`, color: tc, fontSize: 11, fontWeight: 700, textDecoration: 'none', cursor: 'pointer' }}>
                    <Globe style={{ width: 12, height: 12 }} /> Open
                  </a>
                  <button onClick={() => setViewingDoc(null)} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '5px 7px', cursor: 'pointer', color: 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center' }}>
                    <X style={{ width: 15, height: 15 }} />
                  </button>
                </div>
              </div>

              {/* Viewer body */}
              <div style={{ flex: 1, overflow: 'hidden', position: 'relative', minHeight: 0, background: '#05050d' }}>
                {!url ? (() => {
                  const brand = vd.name.replace(/v\d[\d.]*$/, '').replace(/(Pitch Deck|Executive Summary|Due Diligence Pack|Product Demo|Financial Projections|Cap Table Structure)/gi, '').trim();
                  const taglines: Record<string, string> = {
                    'JalRakshak Systems': 'Acoustic leak detection for municipal water mains.',
                    'TransitIQ': 'Live occupancy and schedule adherence for bus fleets.',
                    'AarogyaTrack': 'AI-assisted chest X-ray triage for TB screening.',
                    'GridSense': 'Distribution transformer health monitoring.',
                    'CivicLens': 'Road defect detection from municipal dashcams.',
                    'FasalSetu': 'Vernacular crop advisory and mandi price intelligence.',
                  };
                  const tagline = taglines[brand] ?? `Innovating the future with ${brand}.`;
                  const mockSlides: Record<string, { title: string; body: string }[]> = {
                    Deck: [
                      { title: 'Problem', body: `Founders lack efficient tools to manage ${brand}'s core workflow at scale.` },
                      { title: 'Solution', body: `${brand} delivers an intelligent, end-to-end platform built for speed and precision.` },
                      { title: 'Traction', body: `3,400+ active users · ₹1.2Cr MRR · 32% MoM growth in Q1 2026.` },
                      { title: 'Market', body: `₹280Cr TAM across SaaS & DeepTech verticals. Growing at 28% YoY.` },
                      { title: 'Team', body: `Ex-Google, IIT & INSEAD alumni. Combined 40+ years in product & finance.` },
                      { title: 'Ask', body: `Raising ₹15Cr Seed round to expand GTM & accelerate product R&D.` },
                    ],
                    Doc: [
                      { title: 'Executive Overview', body: `${brand} is redefining the market through focused innovation and rapid deployment.` },
                      { title: 'Business Model', body: `SaaS subscription at ₹999–₹4,999/mo per seat. Enterprise plans custom-priced.` },
                      { title: 'Key Metrics', body: `NPS: 74 · Churn: 2.1% · CAC: ₹1,200 · LTV: ₹28,000.` },
                    ],
                    Sheet: [
                      { title: 'Revenue Forecast', body: `FY27 projected revenue: ₹4.8Cr. EBITDA positive by Q3 2026.` },
                      { title: 'Cap Structure', body: `Founders 62% · Angels 18% · Seed VCs 20%. Pre-money valuation ₹42Cr.` },
                      { title: 'Unit Economics', body: `Gross margin: 74% · Payback period: 9 months · ARR target ₹6Cr FY28.` },
                    ],
                    Bundle: [
                      { title: 'Data Room Index', body: `Pitch deck, financials, legal docs, cap table & technical architecture included.` },
                      { title: 'Legal & Compliance', body: `Incorporated in India. DPIIT recognised. All IP assigned. Shareholder agreements executed.` },
                      { title: 'Technical Due Diligence', body: `SOC-2 in progress. 99.97% uptime SLA. 42ms average API response time.` },
                    ],
                    Video: [
                      { title: 'Product Demo', body: `Watch ${brand} in action — end-to-end workflow in under 3 minutes.` },
                      { title: 'Key Features', body: `Real-time collaboration · AI-assisted insights · One-click integrations.` },
                      { title: 'Customer Testimonial', body: `"${brand} cut our reporting time by 60%. Game-changer." — Early Beta User` },
                    ],
                  };
                  const slides = mockSlides[vd.type] ?? mockSlides.Doc;
                  return (
                    <div className="vault-preview-scroll" style={{ height: '100%', overflowY: 'auto', background: '#07070f', scrollbarWidth: 'thin', scrollbarColor: `${tc}55 transparent` }}>
                      <style>{`.vault-preview-scroll::-webkit-scrollbar{width:4px}.vault-preview-scroll::-webkit-scrollbar-track{background:transparent}.vault-preview-scroll::-webkit-scrollbar-thumb{background:${tc}55;border-radius:99px}.vault-preview-scroll::-webkit-scrollbar-thumb:hover{background:${tc}99}`}</style>
                      {/* Hero banner */}
                      <div style={{ position: 'relative', padding: '48px 56px 40px', background: `linear-gradient(135deg, ${tc}18 0%, #09090f 60%)`, borderBottom: `1px solid ${tc}25`, overflow: 'hidden' }}>
                        <div style={{ position: 'absolute', top: -60, right: -60, width: 300, height: 300, borderRadius: '50%', background: `radial-gradient(circle, ${tc}20, transparent 70%)`, pointerEvents: 'none' }} />
                        <div style={{ position: 'absolute', bottom: -40, left: '40%', width: 200, height: 200, borderRadius: '50%', background: `radial-gradient(circle, ${tc}10, transparent 70%)`, pointerEvents: 'none' }} />
                        <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 24 }}>
                          <div style={{ width: 64, height: 64, borderRadius: 18, background: `linear-gradient(135deg, ${tc}40, ${tc}15)`, border: `2px solid ${tc}60`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, fontWeight: 900, color: tc, boxShadow: `0 0 32px ${tc}40`, flexShrink: 0 }}>
                            {brand.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                              <span style={{ fontSize: 9, fontWeight: 800, color: tc, textTransform: 'uppercase', letterSpacing: '.1em', padding: '3px 10px', borderRadius: 999, background: `${tc}18`, border: `1px solid ${tc}40` }}>{vd.type}</span>
                              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                <span style={{ width: 6, height: 6, borderRadius: '50%', background: sc, display: 'inline-block' }} />
                                <span style={{ fontSize: 10, color: sc, fontWeight: 600 }}>{vd.status}</span>
                              </span>
                            </div>
                            <h1 style={{ margin: 0, fontSize: 28, fontWeight: 900, color: '#f1f5f9', letterSpacing: '-0.5px', lineHeight: 1.2 }}>Hello, we are <span style={{ color: tc }}>{brand}</span></h1>
                            <p style={{ margin: '8px 0 0', fontSize: 14, color: 'rgba(255,255,255,.5)', lineHeight: 1.5, maxWidth: 540 }}>{tagline}</p>
                          </div>
                        </div>
                        {/* Stats row */}
                        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                          {[
                            { label: 'Document', val: vd.name, col: tc },
                            { label: 'Added', val: vd.date, col: 'rgba(255,255,255,.6)' },
                            { label: 'Views', val: `${vd.views}×`, col: '#a78bfa' },
                            { label: 'AI Score', val: `${vd.score}/100`, col: vd.score >= 85 ? '#10b981' : '#f59e0b' },
                          ].map(s => (
                            <div key={s.label} style={{ padding: '8px 14px', borderRadius: 10, background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.07)' }}>
                              <p style={{ margin: 0, fontSize: 9, color: 'rgba(255,255,255,.3)', textTransform: 'uppercase', letterSpacing: '.07em', fontWeight: 700 }}>{s.label}</p>
                              <p style={{ margin: '3px 0 0', fontSize: 13, fontWeight: 700, color: s.col, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 200 }}>{s.val}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Type-specific content area */}
                      <div style={{ padding: '32px 56px 48px' }}>
                        <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,.25)', textTransform: 'uppercase', letterSpacing: '.1em', margin: '0 0 20px' }}>
                          {vd.type === 'Deck' ? 'Slide Deck Preview' : vd.type === 'Sheet' ? 'Spreadsheet Preview' : vd.type === 'Video' ? 'Video Preview' : vd.type === 'Bundle' ? 'Document Bundle' : 'Document Preview'}
                        </p>

                        {/* DECK — widescreen slide cards in 2-col */}
                        {vd.type === 'Deck' && (
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                            {slides.map((slide, i) => (
                              <div key={i} style={{ borderRadius: 12, border: `1px solid ${tc}25`, background: '#0e0e1a', overflow: 'hidden', aspectRatio: '16/9', display: 'flex', flexDirection: 'column', position: 'relative' }}>
                                {/* slide header bar */}
                                <div style={{ background: `${tc}18`, borderBottom: `1px solid ${tc}25`, padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                                  <div style={{ width: 18, height: 18, borderRadius: 5, background: `${tc}30`, border: `1px solid ${tc}50`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <span style={{ fontSize: 9, fontWeight: 800, color: tc }}>{i + 1}</span>
                                  </div>
                                  <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,.45)', textTransform: 'uppercase', letterSpacing: '.06em' }}>{slide.title}</span>
                                  <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
                                    {['#f87171','#fbbf24','#34d399'].map(c => <div key={c} style={{ width: 7, height: 7, borderRadius: '50%', background: c, opacity: .5 }} />)}
                                  </div>
                                </div>
                                {/* slide body */}
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '16px 20px', gap: 10 }}>
                                  <div style={{ width: 36, height: 3, borderRadius: 99, background: tc, opacity: .6 }} />
                                  <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,.7)', lineHeight: 1.6, textAlign: 'center' }}>{slide.body}</p>
                                  <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                                    {[40, 65, 50].map((w, j) => <div key={j} style={{ height: 3, width: w, borderRadius: 99, background: 'rgba(255,255,255,.1)' }} />)}
                                  </div>
                                </div>
                                {/* slide number footer */}
                                <div style={{ padding: '4px 14px', borderTop: `1px solid rgba(255,255,255,.05)`, display: 'flex', justifyContent: 'flex-end' }}>
                                  <span style={{ fontSize: 9, color: 'rgba(255,255,255,.2)' }}>{i + 1} / {slides.length}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* DOC — single-column document pages */}
                        {vd.type === 'Doc' && (
                          <div style={{ maxWidth: 760, display: 'flex', flexDirection: 'column', gap: 0, borderRadius: 14, border: '1px solid rgba(255,255,255,.09)', overflow: 'hidden', background: '#0d0d18' }}>
                            {/* doc toolbar */}
                            <div style={{ background: 'rgba(255,255,255,.04)', borderBottom: '1px solid rgba(255,255,255,.07)', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
                              {['B','I','U'].map(f => <button key={f} style={{ width: 22, height: 22, borderRadius: 4, background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)', color: 'rgba(255,255,255,.4)', fontSize: 10, fontWeight: 800, cursor: 'default' }}>{f}</button>)}
                              <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,.08)', margin: '0 4px' }} />
                              {[60, 90, 70].map((w, i) => <div key={i} style={{ height: 6, width: w, borderRadius: 3, background: 'rgba(255,255,255,.08)' }} />)}
                            </div>
                            {/* doc pages */}
                            {slides.map((slide, i) => (
                              <div key={i} style={{ padding: '28px 40px', borderBottom: i < slides.length - 1 ? '1px solid rgba(255,255,255,.05)' : 'none' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                                  <div style={{ width: 3, height: 20, borderRadius: 99, background: tc }} />
                                  <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#f1f5f9' }}>{slide.title}</p>
                                </div>
                                <p style={{ margin: '0 0 14px', fontSize: 12, color: 'rgba(255,255,255,.5)', lineHeight: 1.8 }}>{slide.body}</p>
                                {/* fake text lines */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                  {[95, 88, 72, 60].map((w, j) => <div key={j} style={{ height: 6, width: `${w}%`, borderRadius: 3, background: 'rgba(255,255,255,.06)' }} />)}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* SHEET — spreadsheet table */}
                        {vd.type === 'Sheet' && (
                          <div style={{ borderRadius: 14, border: '1px solid rgba(255,255,255,.09)', overflow: 'hidden', background: '#0d0d18' }}>
                            {/* sheet toolbar */}
                            <div style={{ background: 'rgba(255,255,255,.04)', borderBottom: '1px solid rgba(255,255,255,.07)', padding: '7px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
                              <div style={{ padding: '3px 10px', borderRadius: 4, background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)', fontSize: 10, color: 'rgba(255,255,255,.35)' }}>A1</div>
                              <div style={{ flex: 1, height: 22, borderRadius: 4, background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)' }} />
                            </div>
                            {/* column headers */}
                            <div style={{ display: 'grid', gridTemplateColumns: '40px repeat(5, 1fr)', borderBottom: '1px solid rgba(255,255,255,.08)', background: `${tc}0a` }}>
                              <div style={{ padding: '6px 10px', borderRight: '1px solid rgba(255,255,255,.06)' }} />
                              {['Metric','Q1 2026','Q2 2026','Q3 2026','FY Target'].map(h => (
                                <div key={h} style={{ padding: '6px 10px', borderRight: '1px solid rgba(255,255,255,.06)', fontSize: 9, fontWeight: 700, color: tc, textTransform: 'uppercase', letterSpacing: '.05em' }}>{h}</div>
                              ))}
                            </div>
                            {/* rows */}
                            {[
                              ['Revenue', '₹1.1Cr', '₹1.4Cr', '₹1.8Cr', '₹4.8Cr'],
                              ['MRR', '₹9.2L', '₹11.6L', '₹14.8L', '₹40L'],
                              ['Users', '3,200', '4,800', '7,100', '12,000'],
                              ['Gross Margin', '71%', '73%', '74%', '75%'],
                              ['CAC', '₹1,340', '₹1,210', '₹1,100', '₹980'],
                              ['LTV', '₹24,000', '₹26,500', '₹28,000', '₹34,000'],
                            ].map((row, ri) => (
                              <div key={ri} style={{ display: 'grid', gridTemplateColumns: '40px repeat(5, 1fr)', borderBottom: '1px solid rgba(255,255,255,.04)', background: ri % 2 === 0 ? 'transparent' : 'rgba(255,255,255,.015)' }}>
                                <div style={{ padding: '8px 10px', borderRight: '1px solid rgba(255,255,255,.05)', fontSize: 9, color: 'rgba(255,255,255,.2)', textAlign: 'center' }}>{ri + 1}</div>
                                {row.map((cell, ci) => (
                                  <div key={ci} style={{ padding: '8px 10px', borderRight: '1px solid rgba(255,255,255,.04)', fontSize: 11, fontWeight: ci === 0 ? 600 : 400, color: ci === 0 ? 'rgba(255,255,255,.7)' : ci === 4 ? tc : 'rgba(255,255,255,.45)' }}>{cell}</div>
                                ))}
                              </div>
                            ))}
                            {/* chart area hint */}
                            <div style={{ padding: '20px 24px', display: 'flex', gap: 12, alignItems: 'flex-end', borderTop: '1px solid rgba(255,255,255,.05)' }}>
                              {[40, 58, 72, 88, 76, 95].map((h, i) => (
                                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                                  <div style={{ width: '100%', height: h, borderRadius: '4px 4px 0 0', background: `linear-gradient(180deg, ${tc}70, ${tc}30)` }} />
                                  <span style={{ fontSize: 8, color: 'rgba(255,255,255,.2)' }}>Q{i + 1}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* VIDEO — player mock */}
                        {vd.type === 'Video' && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                            {/* player */}
                            <div style={{ borderRadius: 14, border: `1px solid ${tc}30`, overflow: 'hidden', background: '#000', aspectRatio: '16/9', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse at center, ${tc}18 0%, #000 70%)` }} />
                              {/* play button */}
                              <div style={{ position: 'relative', zIndex: 1, width: 72, height: 72, borderRadius: '50%', background: `${tc}30`, border: `2px solid ${tc}70`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 40px ${tc}50` }}>
                                <div style={{ width: 0, height: 0, borderTop: '14px solid transparent', borderBottom: '14px solid transparent', borderLeft: `22px solid ${tc}`, marginLeft: 5 }} />
                              </div>
                              {/* timeline */}
                              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '16px 20px', background: 'linear-gradient(0deg, rgba(0,0,0,.8), transparent)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,.5)' }}>0:42</span>
                                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,.3)' }}>2:58</span>
                                </div>
                                <div style={{ height: 3, borderRadius: 99, background: 'rgba(255,255,255,.15)' }}>
                                  <div style={{ height: '100%', width: '24%', borderRadius: 99, background: tc }} />
                                </div>
                              </div>
                            </div>
                            {/* chapter list */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                              {slides.map((slide, i) => (
                                <div key={i} style={{ padding: '14px 16px', borderRadius: 10, border: `1px solid ${tc}20`, background: `${tc}08`, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                                  <div style={{ width: 28, height: 28, borderRadius: 7, background: `${tc}20`, border: `1px solid ${tc}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    <span style={{ fontSize: 9, fontWeight: 800, color: tc }}>{`${i}:${(i * 47).toString().padStart(2, '0')}`}</span>
                                  </div>
                                  <div>
                                    <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 700, color: '#f1f5f9' }}>{slide.title}</p>
                                    <p style={{ margin: 0, fontSize: 10, color: 'rgba(255,255,255,.4)', lineHeight: 1.5 }}>{slide.body}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* BUNDLE — file list */}
                        {vd.type === 'Bundle' && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {[
                              { name: `${brand} Pitch Deck v4.1`, type: 'Deck', size: '4.2 MB', color: '#8b5cf6', pages: 22 },
                              { name: `${brand} Financial Model FY27`, type: 'Sheet', size: '1.8 MB', color: '#10b981', pages: 8 },
                              { name: `${brand} Executive Summary`, type: 'Doc', size: '0.6 MB', color: '#06b6d4', pages: 4 },
                              { name: `${brand} Cap Table`, type: 'Sheet', size: '0.4 MB', color: '#10b981', pages: 2 },
                              { name: `${brand} Legal Pack`, type: 'Doc', size: '2.1 MB', color: '#06b6d4', pages: 14 },
                              { name: `${brand} Technical Architecture`, type: 'Doc', size: '1.3 MB', color: '#06b6d4', pages: 9 },
                            ].map((file, i) => (
                              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '13px 18px', borderRadius: 10, border: `1px solid ${file.color}20`, background: `${file.color}07`, cursor: 'default' }}>
                                <div style={{ width: 38, height: 38, borderRadius: 10, background: `${file.color}18`, border: `1px solid ${file.color}35`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                  <span style={{ fontSize: 8, fontWeight: 800, color: file.color, textTransform: 'uppercase', letterSpacing: '.04em' }}>{file.type}</span>
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: '#f1f5f9', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{file.name}</p>
                                  <p style={{ margin: '2px 0 0', fontSize: 10, color: 'rgba(255,255,255,.3)' }}>{file.pages} pages · {file.size}</p>
                                </div>
                                <div style={{ width: 60, height: 4, borderRadius: 99, background: 'rgba(255,255,255,.07)', overflow: 'hidden', flexShrink: 0 }}>
                                  <div style={{ height: '100%', width: '100%', borderRadius: 99, background: file.color, opacity: .5 }} />
                                </div>
                                <span style={{ fontSize: 9, fontWeight: 700, color: '#10b981', background: 'rgba(16,185,129,.1)', padding: '3px 8px', borderRadius: 5, border: '1px solid rgba(16,185,129,.2)', flexShrink: 0 }}>Ready</span>
                              </div>
                            ))}
                          </div>
                        )}

                      </div>
                    </div>
                  );
                })() : isVideo ? (
                  <video controls src={url} style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#000' }} />
                ) : isImage ? (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'auto', padding: 20, boxSizing: 'border-box' }}>
                    <img src={url} alt={vd.name} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: 8 }} />
                  </div>
                ) : isPdf ? (
                  <iframe
                    src={`${url}#toolbar=1&navpanes=0&scrollbar=1`}
                    style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
                    title={vd.name}
                  />
                ) : (
                  /* Generic fallback — open in tab */
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 16 }}>
                    <div style={{ fontSize: 48 }}>📁</div>
                    <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', margin: 0 }}>Preview not available for this file type.</p>
                    <a href={url} target="_blank" rel="noopener noreferrer"
                      style={{ padding: '10px 24px', borderRadius: 999, background: `linear-gradient(90deg,${tc},${tc}99)`, color: '#fff', fontWeight: 700, fontSize: 13, textDecoration: 'none' }}>
                      Open File →
                    </a>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 20px', borderTop: '1px solid rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.4)', flexShrink: 0 }}>
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)' }}>{vd.date} · {vd.views} views</span>
                <div style={{ display: 'flex', gap: 8 }}>
                  <a href={url} download style={{ padding: '5px 14px', borderRadius: 999, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: 600, textDecoration: 'none', cursor: url ? 'pointer' : 'not-allowed' }}>
                    ⬇ Download
                  </a>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── MODAL: BOOK SESSION ──────────────────────────────────────────── */}
      {bookingMentor && (() => {
        const mc = MENTOR_COLORS[bookingMentor.id] ?? '#8b5cf6';
        return (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4" onClick={() => setBookingMentor(null)}>
            <div onClick={e => e.stopPropagation()} style={{ background: '#09090f', border: `1px solid ${mc}30`, borderRadius: 20, width: '100%', maxWidth: 460, boxShadow: `0 0 60px ${mc}22, 0 24px 64px rgba(0,0,0,0.7)`, overflow: 'hidden' }}>

              {/* Header */}
              <div style={{ padding: '20px 24px 16px', borderBottom: `1px solid rgba(255,255,255,0.07)`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 44, height: 44, borderRadius: '50%', background: `linear-gradient(135deg,${mc}55,${mc}22)`, border: `2px solid ${mc}55`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, color: mc, boxShadow: `0 0 14px ${mc}40` }}>
                    {bookingMentor.avatar}
                  </div>
                  <div>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#fff' }}>{bookingMentor.name}</p>
                    <p style={{ margin: 0, fontSize: 10, color: mc, fontWeight: 600 }}>{bookingMentor.role} · {bookingMentor.company}</p>
                  </div>
                </div>
                <button onClick={() => setBookingMentor(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', padding: 4 }}><X style={{ width: 16, height: 16 }} /></button>
              </div>

              {!bookingDone ? (
                <form onSubmit={e => { e.preventDefault(); setBookingDone(true); }} style={{ padding: '20px 24px 24px' }}>
                  {/* Bio strip */}
                  <div style={{ background: `${mc}0e`, border: `1px solid ${mc}22`, borderRadius: 10, padding: '10px 14px', marginBottom: 18 }}>
                    <p style={{ margin: 0, fontSize: 10.5, color: 'rgba(255,255,255,0.5)', lineHeight: 1.65 }}>{bookingMentor.bio}</p>
                    <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                      {bookingMentor.tags.map(t => (
                        <span key={t} style={{ fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 999, color: mc, background: `${mc}18`, border: `1px solid ${mc}35` }}>{t}</span>
                      ))}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10 }}>
                      <Star style={{ width: 11, height: 11, color: '#fbbf24', fill: '#fbbf24' }} />
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#fbbf24' }}>{bookingMentor.rating}</span>
                      <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)' }}>·</span>
                      <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>{bookingMentor.sessions} sessions completed</span>
                    </div>
                  </div>

                  {/* Date + Time */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 9.5, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>Preferred Date</label>
                      <input type="date" required value={bookingForm.date} onChange={e => setBookingForm(f => ({ ...f, date: e.target.value }))}
                        style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '8px 12px', color: '#fff', fontSize: 12, outline: 'none', boxSizing: 'border-box', colorScheme: 'dark' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 9.5, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>Time Slot</label>
                      <select required value={bookingForm.time} onChange={e => setBookingForm(f => ({ ...f, time: e.target.value }))}
                        style={{ width: '100%', background: '#0d0d1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '8px 12px', color: bookingForm.time ? '#fff' : 'rgba(255,255,255,0.25)', fontSize: 12, outline: 'none', boxSizing: 'border-box' }}>
                        <option value="">Select slot</option>
                        <option>09:00 AM IST</option><option>10:00 AM IST</option><option>11:00 AM IST</option>
                        <option>12:00 PM IST</option><option>02:00 PM IST</option><option>03:00 PM IST</option>
                        <option>04:00 PM IST</option><option>05:00 PM IST</option><option>06:00 PM IST</option>
                      </select>
                    </div>
                  </div>

                  {/* Topic */}
                  <div style={{ marginBottom: 12 }}>
                    <label style={{ display: 'block', fontSize: 9.5, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>Session Topic</label>
                    <select required value={bookingForm.topic} onChange={e => setBookingForm(f => ({ ...f, topic: e.target.value }))}
                      style={{ width: '100%', background: '#0d0d1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '8px 12px', color: bookingForm.topic ? '#fff' : 'rgba(255,255,255,0.25)', fontSize: 12, outline: 'none', boxSizing: 'border-box' }}>
                      <option value="">Choose a focus area</option>
                      <option>Fundraising Strategy</option><option>Product-Market Fit</option><option>Go-To-Market Planning</option>
                      <option>Pitch Deck Review</option><option>Technical Architecture</option><option>Team Building & Hiring</option>
                      <option>Financial Modelling</option><option>VC Due Diligence Prep</option><option>Growth & Retention</option><option>Other</option>
                    </select>
                  </div>

                  {/* Message */}
                  <div style={{ marginBottom: 20 }}>
                    <label style={{ display: 'block', fontSize: 9.5, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>Brief Context <span style={{ color: 'rgba(255,255,255,0.18)', fontWeight: 400 }}>(optional)</span></label>
                    <textarea rows={3} placeholder="What would you like to discuss? Share any specific questions or challenges…" value={bookingForm.message} onChange={e => setBookingForm(f => ({ ...f, message: e.target.value }))}
                      style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '8px 12px', color: '#fff', fontSize: 12, outline: 'none', resize: 'none', boxSizing: 'border-box', lineHeight: 1.6, fontFamily: 'inherit' }} />
                  </div>

                  {/* CTA */}
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button type="button" onClick={() => setBookingMentor(null)} style={{ flex: 1, padding: '10px 0', borderRadius: 999, fontSize: 12, fontWeight: 600, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)', cursor: 'pointer' }}>Cancel</button>
                    <button type="submit" style={{ flex: 2, padding: '10px 0', borderRadius: 999, fontSize: 12, fontWeight: 700, background: `linear-gradient(90deg,${mc},${mc}99)`, border: 'none', color: '#fff', cursor: 'pointer', boxShadow: `0 0 20px ${mc}40`, letterSpacing: '0.02em' }}>
                      Confirm Booking →
                    </button>
                  </div>
                </form>
              ) : (
                /* Success state */
                <div style={{ padding: '40px 24px', textAlign: 'center' }}>
                  <div style={{ width: 56, height: 56, borderRadius: '50%', background: `${mc}18`, border: `2px solid ${mc}55`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', boxShadow: `0 0 24px ${mc}40` }}>
                    <CheckCircle style={{ width: 26, height: 26, color: mc }} />
                  </div>
                  <p style={{ fontSize: 16, fontWeight: 800, color: '#fff', margin: '0 0 6px' }}>Session Requested!</p>
                  <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', margin: '0 0 4px' }}>
                    <span style={{ color: mc, fontWeight: 600 }}>{bookingMentor.name}</span> will confirm within 24 hours.
                  </p>
                  <p style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.28)', margin: '0 0 20px' }}>
                    {bookingForm.date} · {bookingForm.time} · {bookingForm.topic}
                  </p>
                  <div style={{ background: `${mc}0d`, border: `1px solid ${mc}22`, borderRadius: 10, padding: '10px 16px', marginBottom: 22, textAlign: 'left' }}>
                    <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', margin: 0, lineHeight: 1.7 }}>
                      📧 A calendar invite will be sent to your registered email.<br />
                      💬 You'll receive a Zoom link 30 min before the session.
                    </p>
                  </div>
                  <button onClick={() => setBookingMentor(null)} style={{ padding: '10px 32px', borderRadius: 999, fontSize: 12, fontWeight: 700, background: `linear-gradient(90deg,${mc},${mc}99)`, border: 'none', color: '#fff', cursor: 'pointer', boxShadow: `0 0 20px ${mc}40` }}>
                    Done
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* ── MODAL: REGISTER (2-step) ─────────────────────────────────────── */}
      {registerOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="hub-modal-wrap bg-[#08080f] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl" style={{ borderTop: '2px solid rgba(139,92,246,0.6)' }}>

            {/* Header */}
            <div className="px-6 py-4 border-b border-white/[0.07] flex justify-between items-center">
              <div className="flex items-center gap-3">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-violet-400 shadow-[0_0_8px_2px_rgba(167,139,250,0.8)]" />
                <h3 className="text-sm font-semibold text-white">Register Portfolio Company</h3>
                <div style={{ display: 'flex', gap: 5 }}>
                  {[1, 2].map(s => (
                    <div key={s} style={{ width: 20, height: 20, borderRadius: '50%', fontSize: 9, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', background: registerStep === s ? 'linear-gradient(135deg,#7c3aed,#0ea5e9)' : registerStep > s ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.07)', color: registerStep >= s ? '#fff' : 'rgba(255,255,255,0.25)', border: registerStep === s ? 'none' : '1px solid rgba(255,255,255,0.1)' }}>
                      {registerStep > s ? '✓' : s}
                    </div>
                  ))}
                </div>
              </div>
              <button onClick={() => { setRegisterOpen(false); setRegisterStep(1); setOwnerPassword(''); setOwnerPasswordConfirm(''); setOwnerPasswordError(''); }} className="text-white/30 hover:text-white transition"><X className="h-4 w-4" /></button>
            </div>

            {/* ── STEP 1: Startup Details ── */}
            {registerStep === 1 && (
              <form onSubmit={e => { e.preventDefault(); setRegisterStep(2); setOwnerEmail(user?.email ?? ''); setOwnerEmailMode('same'); setOwnerPassword(''); setOwnerPasswordConfirm(''); setOwnerPasswordError(''); }} className="p-6 space-y-4">
                <div><label className="block text-[10px] text-white/35 mb-1.5 uppercase tracking-wider">Company Name</label>
                  <input type="text" required placeholder="e.g. JalRakshak Systems" value={newS.name} onChange={e => setNewS({ ...newS, name: e.target.value })} className={input} /></div>
                <div className="hub-modal-grid grid grid-cols-2 gap-3">
                  <div><label className="block text-[10px] text-white/35 mb-1.5 uppercase tracking-wider">Founder</label>
                    <input type="text" required placeholder="Primary contact" value={newS.founder} onChange={e => setNewS({ ...newS, founder: e.target.value })} className={input} /></div>
                  <div><label className="block text-[10px] text-white/35 mb-1.5 uppercase tracking-wider">Industry</label>
                    <select value={newS.industry} onChange={e => { setNewS({ ...newS, industry: e.target.value }); setNewSCustomIndustry(''); }} className={input + " bg-black/40"}>
                      <option>SaaS</option><option>FinTech</option><option>DeepTech</option>
                      <option>HealthTech</option><option>EdTech</option><option>AgriTech</option>
                      <option>ClimaTech</option><option>D2C / Consumer</option><option>E-commerce</option>
                      <option>Logistics & Supply Chain</option><option>HRTech</option><option>LegalTech</option>
                      <option>PropTech</option><option>SpaceTech</option><option>Gaming</option>
                      <option>Media & Content</option><option>Others</option>
                    </select>
                    {newS.industry === 'Others' && (
                      <input type="text" required placeholder="Enter your industry…" value={newSCustomIndustry} onChange={e => setNewSCustomIndustry(e.target.value)} className={input} style={{ marginTop: 6 }} />
                    )}
                  </div>
                </div>
                <div className="hub-modal-grid grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] text-white/35 mb-1.5 uppercase tracking-wider">Current Stage</label>
                    <select value={registerInitialStage} onChange={e => setRegisterInitialStage(e.target.value)} className={input + " bg-black/40"}>
                      {STAGE_ORDER.map(s => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] text-white/35 mb-1.5 uppercase tracking-wider">Funding Goal (INR)</label>
                    <input type="number" required placeholder="e.g. 20000000" value={newS.fundingGoal} onChange={e => setNewS({ ...newS, fundingGoal: e.target.value })} className={input} />
                  </div>
                </div>
                <div><label className="block text-[10px] text-white/35 mb-1.5 uppercase tracking-wider">Tagline</label>
                  <input type="text" required placeholder="One-line value prop…" value={newS.tagline} onChange={e => setNewS({ ...newS, tagline: e.target.value })} className={input} /></div>
                <div><label className="block text-[10px] text-white/35 mb-1.5 uppercase tracking-wider">Description</label>
                  <textarea rows={3} required placeholder="Company overview…" value={newS.description} onChange={e => setNewS({ ...newS, description: e.target.value })} className={input + " resize-none"} /></div>
                <button type="submit" className="w-full py-2.5 rounded-full text-sm font-semibold bg-gradient-to-r from-violet-600 to-sky-500 text-white hover:opacity-90 transition">
                  Continue — Set Ownership Credentials →
                </button>
              </form>
            )}

            {/* ── STEP 2: Ownership Credentials ── */}
            {registerStep === 2 && (
              <form onSubmit={e => {
                e.preventDefault();
                if (ownerPassword.length < 6) { setOwnerPasswordError('Password must be at least 6 characters.'); return; }
                if (ownerPassword !== ownerPasswordConfirm) { setOwnerPasswordError('Passwords do not match.'); return; }
                setOwnerPasswordError('');
                handleCreate(e);
              }} className="p-6 space-y-4">
                <div style={{ background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.25)', borderRadius: 12, padding: '12px 14px', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <Shield style={{ width: 15, height: 15, color: '#a78bfa', flexShrink: 0, marginTop: 1 }} />
                  <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.45)', lineHeight: 1.65 }}>
                    Set a <strong style={{ color: '#c4b5fd' }}>startup password</strong> to protect ownership of <strong style={{ color: '#fff' }}>{newS.name}</strong>. You'll use this to confirm edits, uploads &amp; VC approvals.
                  </p>
                </div>

                <div>
                  <label className="block text-[10px] text-white/35 mb-2 uppercase tracking-wider">Startup Owner Email</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10, border: `1px solid ${ownerEmailMode === 'same' ? 'rgba(139,92,246,0.5)' : 'rgba(255,255,255,0.08)'}`, background: ownerEmailMode === 'same' ? 'rgba(139,92,246,0.08)' : 'rgba(255,255,255,0.02)', cursor: 'pointer' }}>
                      <input type="radio" name="emailMode" checked={ownerEmailMode === 'same'} onChange={() => { setOwnerEmailMode('same'); setOwnerEmail(user?.email ?? ''); }} style={{ accentColor: '#8b5cf6' }} />
                      <div>
                        <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: ownerEmailMode === 'same' ? '#c4b5fd' : 'rgba(255,255,255,0.5)' }}>Use my account email</p>
                        <p style={{ margin: 0, fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 1 }}>{user?.email}</p>
                      </div>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10, border: `1px solid ${ownerEmailMode === 'different' ? 'rgba(139,92,246,0.5)' : 'rgba(255,255,255,0.08)'}`, background: ownerEmailMode === 'different' ? 'rgba(139,92,246,0.08)' : 'rgba(255,255,255,0.02)', cursor: 'pointer' }}>
                      <input type="radio" name="emailMode" checked={ownerEmailMode === 'different'} onChange={() => { setOwnerEmailMode('different'); setOwnerEmail(''); }} style={{ accentColor: '#8b5cf6' }} />
                      <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: ownerEmailMode === 'different' ? '#c4b5fd' : 'rgba(255,255,255,0.5)' }}>Use a different startup email</p>
                    </label>
                    {ownerEmailMode === 'different' && (
                      <input type="email" required placeholder="startup@company.com" value={ownerEmail} onChange={e => setOwnerEmail(e.target.value)} className={input} />
                    )}
                  </div>
                </div>

                <div style={{ position: 'relative' }}>
                  <label className="block text-[10px] text-white/35 mb-1.5 uppercase tracking-wider">Set Startup Password</label>
                  <input type={showOwnerPwd ? 'text' : 'password'} required minLength={6} placeholder="Min. 6 characters" value={ownerPassword} onChange={e => { setOwnerPassword(e.target.value); setOwnerPasswordError(''); }} className={input} style={{ paddingRight: 40 }} />
                  <button type="button" onClick={() => setShowOwnerPwd(p => !p)} style={{ position: 'absolute', right: 12, bottom: 9, background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', padding: 0 }}>
                    {showOwnerPwd ? <EyeOff style={{ width: 14, height: 14 }} /> : <Eye style={{ width: 14, height: 14 }} />}
                  </button>
                </div>
                <div>
                  <label className="block text-[10px] text-white/35 mb-1.5 uppercase tracking-wider">Confirm Password</label>
                  <input type="password" required placeholder="Re-enter password" value={ownerPasswordConfirm} onChange={e => { setOwnerPasswordConfirm(e.target.value); setOwnerPasswordError(''); }} className={input} />
                </div>
                {ownerPasswordError && <p style={{ fontSize: 11, color: '#f87171', margin: 0 }}>{ownerPasswordError}</p>}

                <div style={{ display: 'flex', gap: 10 }}>
                  <button type="button" onClick={() => setRegisterStep(1)} style={{ flex: 1, padding: '10px 0', borderRadius: 999, fontSize: 12, fontWeight: 600, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)', cursor: 'pointer' }}>
                    ← Back
                  </button>
                  <button type="submit" style={{ flex: 2, padding: '10px 0', borderRadius: 999, fontSize: 13, fontWeight: 700, background: 'linear-gradient(90deg,#7c3aed,#0ea5e9)', color: '#fff', border: 'none', cursor: 'pointer', boxShadow: '0 4px 18px rgba(124,58,237,0.4)' }}>
                    Register Startup →
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ── MODAL: EDIT ─────────────────────────────────────────────────── */}
      {editTarget && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="hub-modal-wrap bg-[#08080f] border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl border-t-2 border-t-violet-500/50">
            <div className="px-6 py-4 border-b border-white/[0.07] flex justify-between items-center">
              <div className="flex items-center gap-2"><Edit3 className="h-3.5 w-3.5 text-violet-400" />
                <h3 className="text-sm font-semibold text-white">Edit — {editTarget.name}</h3></div>
              <button onClick={() => setEditTarget(null)} className="text-white/30 hover:text-white transition"><X className="h-4 w-4" /></button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="hub-modal-grid grid grid-cols-2 gap-3">
                <div><label className="block text-[10px] text-white/35 mb-1.5 uppercase tracking-wider">Name</label>
                  <input type="text" required value={editTarget.name} onChange={e => setEditTarget({ ...editTarget, name: e.target.value })} className={input} /></div>
                <div><label className="block text-[10px] text-white/35 mb-1.5 uppercase tracking-wider">Founder</label>
                  <input type="text" required value={editTarget.founder} onChange={e => setEditTarget({ ...editTarget, founder: e.target.value })} className={input} /></div>
              </div>
              <div className="hub-modal-grid grid grid-cols-2 gap-3">
                <div><label className="block text-[10px] text-white/35 mb-1.5 uppercase tracking-wider">Industry</label>
                  <select value={editTarget.industry} onChange={e => { setEditTarget({ ...editTarget, industry: e.target.value }); setEditCustomIndustry(''); }} className={input + " bg-black/40"}>
                    <option>SaaS</option><option>FinTech</option><option>DeepTech</option>
                    <option>HealthTech</option><option>EdTech</option><option>AgriTech</option>
                    <option>ClimaTech</option><option>D2C / Consumer</option><option>E-commerce</option>
                    <option>Logistics & Supply Chain</option><option>HRTech</option><option>LegalTech</option>
                    <option>PropTech</option><option>SpaceTech</option><option>Gaming</option>
                    <option>Media & Content</option><option>Others</option>
                  </select>
                  {editTarget.industry === 'Others' && (
                    <input type="text" required placeholder="Enter your industry…"
                      value={editCustomIndustry}
                      onChange={e => setEditCustomIndustry(e.target.value)}
                      className={input} style={{ marginTop: 6 }}
                    />
                  )}</div>
                <div><label className="block text-[10px] text-white/35 mb-1.5 uppercase tracking-wider text-violet-300/70">Pipeline Stage</label>
                  <select value={editTarget.stage} onChange={e => setEditTarget({ ...editTarget, stage: e.target.value })} className={input + " bg-black/40 text-violet-300 border-violet-500/30"}>
                    {STAGE_ORDER.map(s => <option key={s}>{s}</option>)}
                  </select></div>
              </div>
              <div><label className="block text-[10px] text-white/35 mb-1.5 uppercase tracking-wider">Tagline</label>
                <input type="text" required value={editTarget.tagline} onChange={e => setEditTarget({ ...editTarget, tagline: e.target.value })} className={input} /></div>
              <div className="hub-modal-grid grid grid-cols-2 gap-3">
                <div><label className="block text-[10px] text-white/35 mb-1.5 uppercase tracking-wider">Funding Target</label>
                  <input type="number" required value={editTarget.fundingGoal} onChange={e => setEditTarget({ ...editTarget, fundingGoal: e.target.value })} className={input} /></div>
                <div><label className="block text-[10px] text-white/35 mb-1.5 uppercase tracking-wider">Pilot Value Won</label>
                  <input type="number" required value={editTarget.raised} onChange={e => setEditTarget({ ...editTarget, raised: e.target.value })} className={input + " text-emerald-400"} /></div>
              </div>
              <div><label className="block text-[10px] text-white/35 mb-1.5 uppercase tracking-wider">Description</label>
                <textarea rows={3} required value={editTarget.description} onChange={e => setEditTarget({ ...editTarget, description: e.target.value })} className={input + " resize-none"} /></div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setEditTarget(null)} className="flex-1 py-2.5 rounded-full text-xs font-medium bg-white/[0.04] border border-white/10 text-white/40 hover:text-white transition">Cancel</button>
                <button type="submit" className="flex-1 py-2.5 rounded-full text-sm font-semibold bg-gradient-to-r from-violet-600 to-sky-500 text-white hover:opacity-90 transition flex items-center justify-center gap-2">
                  <Save className="h-3.5 w-3.5" /> Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {rsvpEvent && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-[#08080f] border border-white/10 rounded-2xl w-full max-w-sm shadow-2xl border-t-2 border-t-violet-500/50">
            <div className="px-6 py-4 border-b border-white/[0.07] flex justify-between items-center">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-3.5 w-3.5 text-violet-400" />
                <h3 className="text-sm font-semibold text-white">Event Registration</h3>
              </div>
              <button onClick={() => setRsvpEvent(null)} className="text-white/30 hover:text-white transition">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {/* Event details */}
              <div className="bg-white/[0.03] border border-white/[0.07] rounded-xl p-4 space-y-1.5">
                <p className="text-sm font-semibold text-white">{rsvpEvent.title}</p>
                <p className="text-[11px] text-white/40">{rsvpEvent.date} · {rsvpEvent.time}</p>
                <p className="text-[11px] text-white/30">{rsvpEvent.location}</p>
              </div>

              {/* Register as field */}
              <div className="bg-violet-500/[0.07] border border-violet-500/20 rounded-xl p-4 space-y-3">
                <div>
                  <p className="text-[10px] text-violet-400 uppercase tracking-wider font-bold mb-1">Registering as</p>
                  {userStartups[0] && (
                    <p className="text-[10px] text-white/30 mb-2">
                      Default: <span className="text-violet-300 font-semibold">{userStartups[0].founder}</span> — point of contact for your startup
                    </p>
                  )}
                </div>
                <div className="space-y-1">
                  <input
                    type="text"
                    value={rsvpName}
                    onChange={e => setRsvpName(e.target.value)}
                    placeholder={userStartups[0]?.founder ?? user?.name ?? 'Your name'}
                    className="w-full bg-white/[0.05] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 outline-none focus:border-violet-500/50 focus:bg-white/[0.07] transition"
                  />
                  <p className="text-[10px] text-white/20">
                    Edit if someone else is attending on behalf of the startup
                  </p>
                </div>
              </div>

              <p className="text-[10px] text-white/20 text-center">
                A confirmation will be sent to the organiser team
              </p>
              <button
                onClick={() => {
                  if (!rsvpName.trim()) return;
                  setRsvpedIds(prev => [...prev, rsvpEvent.id]);
                  setRsvpEvent(null);
                }}
                disabled={!rsvpName.trim()}
                className="w-full py-2.5 rounded-full text-sm font-semibold bg-gradient-to-r from-violet-600 to-sky-500 text-white hover:opacity-90 transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Confirm Registration →
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ── MODAL: ADD EVENT ─────────────────────────────────────────────── */}
      {addEventOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(16px)' }} onClick={() => setAddEventOpen(false)}>
          <div onClick={e => e.stopPropagation()} className="hub-modal-scroll" style={{ background: '#09090f', border: '1px solid rgba(139,92,246,0.3)', borderTop: '2px solid #8b5cf6', borderRadius: 22, width: '100%', maxWidth: 560, maxHeight: '92vh', overflowY: 'auto', scrollbarWidth: 'thin', scrollbarColor: 'rgba(139,92,246,0.5) transparent', boxShadow: '0 0 80px rgba(139,92,246,0.18), 0 40px 80px rgba(0,0,0,0.8)' }}>
            <style>{`.hub-modal-scroll::-webkit-scrollbar{width:4px}.hub-modal-scroll::-webkit-scrollbar-track{background:transparent}.hub-modal-scroll::-webkit-scrollbar-thumb{background:rgba(139,92,246,0.5);border-radius:99px}.hub-modal-scroll::-webkit-scrollbar-thumb:hover{background:rgba(167,139,250,0.75)}`}</style>
            {/* Header */}
            <div style={{ padding: '22px 26px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, background: '#09090f', zIndex: 2 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 11, background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CalendarDays style={{ width: 16, height: 16, color: '#a78bfa' }} />
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#fff' }}>Submit an Event</p>
                  <p style={{ margin: 0, fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 1 }}>
                    {addEventDone ? 'Submitted for review' : `Step ${addEventStep} of 2 — ${addEventStep === 1 ? 'Event Details' : 'Organiser Details'}`}
                  </p>
                </div>
              </div>
              <button onClick={() => setAddEventOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', padding: 4 }}>
                <X style={{ width: 16, height: 16 }} />
              </button>
            </div>

            {addEventDone ? (
              /* ── Success state ── */
              <div style={{ padding: '48px 26px', textAlign: 'center' }}>
                <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px' }}>
                  <UserCheck style={{ width: 28, height: 28, color: '#34d399' }} />
                </div>
                <p style={{ margin: '0 0 8px', fontSize: 17, fontWeight: 800, color: '#fff' }}>Event Submitted!</p>
                <p style={{ margin: '0 0 28px', fontSize: 12, color: 'rgba(255,255,255,0.35)', lineHeight: 1.6 }}>
                  <strong style={{ color: addEventForm.title ? '#a78bfa' : 'inherit' }}>{addEventForm.title}</strong> has been sent to the Sanyog admin team for review. Once approved, it will appear in the Event Arena.
                </p>
                <button onClick={() => setAddEventOpen(false)} style={{ padding: '10px 32px', borderRadius: 999, fontSize: 12, fontWeight: 700, background: 'linear-gradient(90deg,#7c3aed,#0ea5e9)', color: 'white', border: 'none', cursor: 'pointer' }}>
                  Done
                </button>
              </div>
            ) : addEventStep === 1 ? (
              /* ── Step 1: Event details ── */
              <div style={{ padding: '24px 26px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Title */}
                <div>
                  <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 6 }}>Event Title *</label>
                  <input value={addEventForm.title} onChange={e => setAddEventForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. AI Founders Roundtable 2026" style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: `1px solid ${addEventErrors.title ? '#f87171' : 'rgba(255,255,255,0.1)'}`, borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#fff', outline: 'none', boxSizing: 'border-box' }} />
                  {addEventErrors.title && <p style={{ margin: '4px 0 0', fontSize: 10, color: '#f87171' }}>{addEventErrors.title}</p>}
                </div>

                {/* Type + Date row */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 6 }}>Event Type *</label>
                    <select value={addEventForm.type} onChange={e => setAddEventForm(f => ({ ...f, type: e.target.value }))} style={{ width: '100%', background: '#12121f', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#fff', outline: 'none', cursor: 'pointer' }}>
                      {['Pitching', 'Workshop', 'Mentorship', 'Hackathon', 'Networking', 'Demo Day', 'Panel Discussion', 'Other'].map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 6 }}>Event Date *</label>
                    <input type="date" value={addEventForm.date} onChange={e => setAddEventForm(f => ({ ...f, date: e.target.value }))} style={{ width: '100%', background: '#12121f', border: `1px solid ${addEventErrors.date ? '#f87171' : 'rgba(255,255,255,0.1)'}`, borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#fff', outline: 'none', colorScheme: 'dark', boxSizing: 'border-box' }} />
                    {addEventErrors.date && <p style={{ margin: '4px 0 0', fontSize: 10, color: '#f87171' }}>{addEventErrors.date}</p>}
                  </div>
                </div>

                {/* Time + Location mode row */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 6 }}>Time (IST) *</label>
                    <input type="time" value={addEventForm.time} onChange={e => setAddEventForm(f => ({ ...f, time: e.target.value }))} style={{ width: '100%', background: '#12121f', border: `1px solid ${addEventErrors.time ? '#f87171' : 'rgba(255,255,255,0.1)'}`, borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#fff', outline: 'none', colorScheme: 'dark', boxSizing: 'border-box' }} />
                    {addEventErrors.time && <p style={{ margin: '4px 0 0', fontSize: 10, color: '#f87171' }}>{addEventErrors.time}</p>}
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 6 }}>Format</label>
                    <select value={addEventForm.locationMode} onChange={e => setAddEventForm(f => ({ ...f, locationMode: e.target.value as any, location: '' }))} style={{ width: '100%', background: '#12121f', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#fff', outline: 'none', cursor: 'pointer' }}>
                      <option value="physical">In-Person</option>
                      <option value="online">Online · Zoom</option>
                      <option value="virtual">Virtual</option>
                    </select>
                  </div>
                </div>

                {/* Location field */}
                <div>
                  <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 6 }}>
                    {addEventForm.locationMode === 'physical' ? 'Venue / Address *' : addEventForm.locationMode === 'online' ? 'Meeting Link' : 'Platform / Link'}
                  </label>
                  <input value={addEventForm.location} onChange={e => setAddEventForm(f => ({ ...f, location: e.target.value }))} placeholder={addEventForm.locationMode === 'physical' ? 'e.g. Main Seminar Hall, IIT KGP' : addEventForm.locationMode === 'online' ? 'https://zoom.us/j/...' : 'e.g. Hopin / Discord / Gather'} style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: `1px solid ${addEventErrors.location ? '#f87171' : 'rgba(255,255,255,0.1)'}`, borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#fff', outline: 'none', boxSizing: 'border-box' }} />
                  {addEventErrors.location && <p style={{ margin: '4px 0 0', fontSize: 10, color: '#f87171' }}>{addEventErrors.location}</p>}
                </div>

                {/* Description */}
                <div>
                  <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 6 }}>Event Description *</label>
                  <textarea value={addEventForm.description} onChange={e => setAddEventForm(f => ({ ...f, description: e.target.value }))} rows={4} placeholder="What is this event about? Who should attend? What will they learn or gain?" style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: `1px solid ${addEventErrors.description ? '#f87171' : 'rgba(255,255,255,0.1)'}`, borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#fff', outline: 'none', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit', lineHeight: 1.6 }} />
                  {addEventErrors.description && <p style={{ margin: '4px 0 0', fontSize: 10, color: '#f87171' }}>{addEventErrors.description}</p>}
                </div>

                {/* Capacity + Prize row */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 6 }}>Max Capacity</label>
                    <input type="number" value={addEventForm.maxCapacity} onChange={e => setAddEventForm(f => ({ ...f, maxCapacity: e.target.value }))} placeholder="e.g. 100" style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#fff', outline: 'none', boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 6 }}>Prize / Reward</label>
                    <input value={addEventForm.prize} onChange={e => setAddEventForm(f => ({ ...f, prize: e.target.value }))} placeholder="e.g. ₹5L cash prize" style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#fff', outline: 'none', boxSizing: 'border-box' }} />
                  </div>
                </div>

                {/* Registration deadline + Application required */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 6 }}>Registration Deadline</label>
                    <input type="date" value={addEventForm.registrationDeadline} onChange={e => setAddEventForm(f => ({ ...f, registrationDeadline: e.target.value }))} style={{ width: '100%', background: '#12121f', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#fff', outline: 'none', colorScheme: 'dark', boxSizing: 'border-box' }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '10px 14px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10 }}>
                      <input type="checkbox" checked={addEventForm.applicationRequired} onChange={e => setAddEventForm(f => ({ ...f, applicationRequired: e.target.checked }))} style={{ width: 14, height: 14, accentColor: '#8b5cf6', cursor: 'pointer' }} />
                      <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>Application required</span>
                    </label>
                  </div>
                </div>

                {/* Step 1 → Next */}
                <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
                  <button onClick={() => setAddEventOpen(false)} style={{ flex: 1, padding: '11px', borderRadius: 999, fontSize: 12, fontWeight: 600, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)', cursor: 'pointer' }}>Cancel</button>
                  <button onClick={() => {
                    const errs: Record<string, string> = {};
                    if (!addEventForm.title.trim()) errs.title = 'Title is required';
                    if (!addEventForm.date) errs.date = 'Date is required';
                    if (!addEventForm.time) errs.time = 'Time is required';
                    if (!addEventForm.location.trim()) errs.location = 'Location / link is required';
                    if (!addEventForm.description.trim()) errs.description = 'Description is required';
                    setAddEventErrors(errs);
                    if (Object.keys(errs).length === 0) setAddEventStep(2);
                  }} style={{ flex: 2, padding: '11px', borderRadius: 999, fontSize: 12, fontWeight: 700, background: 'linear-gradient(90deg,#7c3aed,#0ea5e9)', color: 'white', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    Next — Organiser Details <ArrowRight style={{ width: 13, height: 13 }} />
                  </button>
                </div>
              </div>
            ) : (
              /* ── Step 2: Organiser details ── */
              <div style={{ padding: '24px 26px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                <p style={{ margin: '0 0 4px', fontSize: 11, color: 'rgba(255,255,255,0.3)', lineHeight: 1.6 }}>
                  Tell us who is organising this event. This info is used for coordination and won't be shown publicly.
                </p>

                {/* Organiser name */}
                <div>
                  <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 6 }}>Organiser / Point of Contact *</label>
                  <input value={addEventForm.organiserName} onChange={e => setAddEventForm(f => ({ ...f, organiserName: e.target.value }))} placeholder="Full name" style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: `1px solid ${addEventErrors.organiserName ? '#f87171' : 'rgba(255,255,255,0.1)'}`, borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#fff', outline: 'none', boxSizing: 'border-box' }} />
                  {addEventErrors.organiserName && <p style={{ margin: '4px 0 0', fontSize: 10, color: '#f87171' }}>{addEventErrors.organiserName}</p>}
                </div>

                {/* Email */}
                <div>
                  <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 6 }}>Contact Email *</label>
                  <input type="email" value={addEventForm.organiserEmail} onChange={e => setAddEventForm(f => ({ ...f, organiserEmail: e.target.value }))} placeholder="organiser@example.com" style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: `1px solid ${addEventErrors.organiserEmail ? '#f87171' : 'rgba(255,255,255,0.1)'}`, borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#fff', outline: 'none', boxSizing: 'border-box' }} />
                  {addEventErrors.organiserEmail && <p style={{ margin: '4px 0 0', fontSize: 10, color: '#f87171' }}>{addEventErrors.organiserEmail}</p>}
                </div>

                {/* Organisation */}
                <div>
                  <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 6 }}>Organisation / Startup / Institution *</label>
                  <input value={addEventForm.organiserOrg} onChange={e => setAddEventForm(f => ({ ...f, organiserOrg: e.target.value }))} placeholder="e.g. Maharashtra State Innovation Society, Pune Municipal Corporation." style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: `1px solid ${addEventErrors.organiserOrg ? '#f87171' : 'rgba(255,255,255,0.1)'}`, borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#fff', outline: 'none', boxSizing: 'border-box' }} />
                  {addEventErrors.organiserOrg && <p style={{ margin: '4px 0 0', fontSize: 10, color: '#f87171' }}>{addEventErrors.organiserOrg}</p>}
                </div>

                {/* Review summary */}
                <div style={{ background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.18)', borderRadius: 12, padding: '14px 16px' }}>
                  <p style={{ margin: '0 0 10px', fontSize: 10, fontWeight: 700, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '.07em' }}>Event Summary</p>
                  {[
                    ['Title', addEventForm.title],
                    ['Type', addEventForm.type],
                    ['Date & Time', `${addEventForm.date} · ${addEventForm.time} IST`],
                    ['Format', addEventForm.locationMode === 'physical' ? 'In-Person' : addEventForm.locationMode === 'online' ? 'Online · Zoom' : 'Virtual'],
                    ['Venue / Link', addEventForm.location],
                    ...(addEventForm.maxCapacity ? [['Capacity', `${addEventForm.maxCapacity} attendees`]] : []),
                    ...(addEventForm.prize ? [['Prize', addEventForm.prize]] : []),
                  ].map(([k, v]) => (
                    <div key={k} style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.28)', minWidth: 90, flexShrink: 0 }}>{k}</span>
                      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>{v}</span>
                    </div>
                  ))}
                </div>

                {addEventErrors.submit && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 13px', borderRadius: 10, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.32)' }}>
                    <span style={{ fontSize: 11, color: '#f87171', fontWeight: 600 }}>{addEventErrors.submit}</span>
                  </div>
                )}

                {/* Step 2 actions */}
                <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
                  <button onClick={() => { setAddEventStep(1); setAddEventErrors({}); }} style={{ flex: 1, padding: '11px', borderRadius: 999, fontSize: 12, fontWeight: 600, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)', cursor: 'pointer' }}>← Back</button>
                  <button
                    disabled={addEventSubmitting}
                    onClick={async () => {
                      const errs: Record<string, string> = {};
                      if (!addEventForm.organiserName.trim()) errs.organiserName = 'Name is required';
                      if (!addEventForm.organiserEmail.trim()) errs.organiserEmail = 'Email is required';
                      if (!addEventForm.organiserOrg.trim()) errs.organiserOrg = 'Organisation is required';
                      setAddEventErrors(errs);
                      if (Object.keys(errs).length > 0) return;
                      setAddEventSubmitting(true);
                      // Actually send to the admin queue — only show success if it lands.
                      try {
                        const res = await fetch('/api/events/create', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          credentials: 'include',
                          body: JSON.stringify({ ...addEventForm, submittedBy: user?.email ?? addEventForm.organiserEmail }),
                        });
                        const data = await res.json().catch(() => ({} as any));
                        if (!res.ok) {
                          setAddEventSubmitting(false);
                          setAddEventErrors({ submit: (data as any)?.error || 'Could not submit to the admin team. Please try again.' });
                          return;
                        }
                      } catch {
                        setAddEventSubmitting(false);
                        setAddEventErrors({ submit: 'Network error — could not reach the server. Please try again.' });
                        return;
                      }
                      setAddEventSubmitting(false);
                      setAddEventDone(true);
                      // Reflect locally so filters/donut update; admin sees it in the pending queue
                      setAllEvents(prev => [...prev, {
                        id: `ev-user-${Date.now()}`,
                        title: addEventForm.title,
                        date: addEventForm.date,
                        time: addEventForm.time,
                        type: addEventForm.type,
                        location: addEventForm.location || (addEventForm.locationMode === 'online' ? 'Online' : 'Virtual'),
                        description: addEventForm.description || '',
                      }]);
                    }}
                    style={{ flex: 2, padding: '11px', borderRadius: 999, fontSize: 12, fontWeight: 700, background: addEventSubmitting ? 'rgba(139,92,246,0.4)' : 'linear-gradient(90deg,#7c3aed,#0ea5e9)', color: 'white', border: 'none', cursor: addEventSubmitting ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                  >
                    {addEventSubmitting ? 'Submitting…' : <><UserCheck style={{ width: 13, height: 13 }} /> Submit Event for Review</>}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── MODAL: ADVANCE REQUEST ───────────────────────────────────────── */}
      {advanceRequestOpen && advanceRequestStartup && (() => {
        const s = advanceRequestStartup;
        const idx = STAGE_ORDER.indexOf(s.stage);
        const availableStages = STAGE_ORDER.slice(idx + 1);
        const sc = STAGE_COLORS[s.stage] ?? '#8b5cf6';
        return (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.87)', backdropFilter: 'blur(16px)' }} onClick={() => !advanceRequestSubmitting && setAdvanceRequestOpen(false)}>
            <style>{`
              .adv-modal::-webkit-scrollbar { width: 4px; }
              .adv-modal::-webkit-scrollbar-track { background: transparent; }
              .adv-modal::-webkit-scrollbar-thumb { background: #1e3a8a; border-radius: 999px; }
              .adv-modal::-webkit-scrollbar-thumb:hover { background: #1d4ed8; }
              .adv-textarea::-webkit-scrollbar { width: 4px; }
              .adv-textarea::-webkit-scrollbar-track { background: transparent; }
              .adv-textarea::-webkit-scrollbar-thumb { background: #1e3a8a; border-radius: 999px; }
              .adv-textarea::-webkit-scrollbar-thumb:hover { background: #1d4ed8; }
            `}</style>
            <div className="adv-modal" onClick={e => e.stopPropagation()} style={{ background: '#09090f', border: '1px solid rgba(139,92,246,0.3)', borderTop: '2px solid #8b5cf6', borderRadius: 22, width: '100%', maxWidth: 520, maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 0 80px rgba(139,92,246,0.18), 0 40px 80px rgba(0,0,0,0.8)' }}>
              {/* Header */}
              <div style={{ padding: '22px 26px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, background: '#09090f', zIndex: 2 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 11, background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ArrowRight style={{ width: 16, height: 16, color: '#a78bfa' }} />
                  </div>
                  <div>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#fff' }}>Request Stage Advance</p>
                    <p style={{ margin: 0, fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 1 }}>{s.name} · currently at <span style={{ color: sc, fontWeight: 700 }}>{s.stage}</span></p>
                  </div>
                </div>
                {!advanceRequestSubmitting && <button onClick={() => setAdvanceRequestOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', padding: 4 }}><X style={{ width: 16, height: 16 }} /></button>}
              </div>

              {advanceRequestDone ? (
                <div style={{ padding: '48px 26px', textAlign: 'center' }}>
                  <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px' }}>
                    <UserCheck style={{ width: 28, height: 28, color: '#34d399' }} />
                  </div>
                  <p style={{ margin: '0 0 8px', fontSize: 17, fontWeight: 800, color: '#fff' }}>Request Submitted!</p>
                  <p style={{ margin: '0 0 6px', fontSize: 12, color: 'rgba(255,255,255,0.4)', lineHeight: 1.6 }}>
                    Your advance request for <strong style={{ color: '#a78bfa' }}>{s.name}</strong> → <strong style={{ color: '#34d399' }}>{advanceRequestForm.targetStage}</strong> has been sent to the admin for review.
                  </p>
                  <p style={{ margin: '0 0 28px', fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>You'll be notified once a decision is made.</p>
                  <button onClick={() => setAdvanceRequestOpen(false)} style={{ padding: '10px 32px', borderRadius: 999, fontSize: 12, fontWeight: 700, background: 'linear-gradient(90deg,#7c3aed,#0ea5e9)', color: 'white', border: 'none', cursor: 'pointer' }}>Done</button>
                </div>
              ) : (
                <div style={{ padding: '24px 26px', display: 'flex', flexDirection: 'column', gap: 18 }}>
                  {/* Info banner */}
                  <div style={{ background: 'rgba(139,92,246,0.07)', border: '1px solid rgba(139,92,246,0.22)', borderRadius: 12, padding: '12px 16px', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <AlertTriangle style={{ width: 14, height: 14, color: '#a78bfa', flexShrink: 0, marginTop: 1 }} />
                    <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.45)', lineHeight: 1.65 }}>
                      Stage advances are <strong style={{ color: '#c4b5fd' }}>reviewed by the admin</strong>. Submit your target stage, a written justification, and any supporting proof. The admin will approve or reject based on the evidence provided.
                    </p>
                  </div>

                  {/* Target stage */}
                  <div>
                    <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 8 }}>Target Stage *</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {availableStages.map(stage => {
                        const stageDesc: Record<string, string> = {
                          'Screened': 'Recognition verified and eligibility cleared — turnover and prior-experience conditions waived',
                          'In Pilot': 'Sandbox agreement signed, security clearance obtained, solution running in the live environment',
                          'Validated': 'Independent third party has measured the pilot against the agreed baseline and KPIs',
                          'Scaled': 'Cleared for wider deployment across departments or districts without a fresh tender',
                        };
                        const stageCol = STAGE_COLORS[stage] ?? '#8b5cf6';
                        const selected = advanceRequestForm.targetStage === stage;
                        return (
                          <label key={stage} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 14px', borderRadius: 12, border: `1px solid ${selected ? stageCol + '60' : 'rgba(255,255,255,0.08)'}`, background: selected ? `${stageCol}0e` : 'rgba(255,255,255,0.02)', cursor: 'pointer', transition: 'all 0.15s' }}>
                            <input type="radio" name="targetStage" checked={selected} onChange={() => setAdvanceRequestForm(f => ({ ...f, targetStage: stage }))} style={{ accentColor: stageCol, marginTop: 2, flexShrink: 0 }} />
                            <div>
                              <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: selected ? stageCol : 'rgba(255,255,255,0.5)' }}>{stage}</p>
                              <p style={{ margin: '2px 0 0', fontSize: 10, color: 'rgba(255,255,255,0.28)', lineHeight: 1.5 }}>{stageDesc[stage] ?? ''}</p>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  {/* Justification */}
                  <div>
                    <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 6 }}>Justification / Write-up *</label>
                    <textarea
                      rows={6}
                      className="adv-textarea"
                      value={advanceRequestForm.justification}
                      onChange={e => { setAdvanceRequestForm(f => ({ ...f, justification: e.target.value })); setAdvanceRequestError(''); }}
                      placeholder={`Explain why ${s.name} is ready for the next stage.\n\nInclude:\n• Key milestones achieved\n• Metrics (users, MRR, contracts, etc.)\n• What changed since the last stage\n• Why now is the right time`}
                      style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 14px', fontSize: 12, color: '#fff', outline: 'none', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit', lineHeight: 1.7, minHeight: 130 }}
                    />
                    <p style={{ margin: '4px 0 0', fontSize: 10, color: 'rgba(255,255,255,0.2)' }}>{advanceRequestForm.justification.length} chars — aim for 150+ for a strong case</p>
                  </div>

                  {/* Proof document */}
                  <div>
                    <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 6 }}>Supporting Proof <span style={{ color: 'rgba(255,255,255,0.2)', fontWeight: 400, textTransform: 'none' }}>(optional but recommended)</span></label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 10, border: '1px dashed rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.02)', cursor: 'pointer' }}>
                      <input type="file" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.xlsx,.csv" style={{ display: 'none' }} onChange={e => setAdvanceRequestForm(f => ({ ...f, proofFile: e.target.files?.[0] ?? null }))} />
                      <FolderKey style={{ width: 14, height: 14, color: 'rgba(255,255,255,0.3)', flexShrink: 0 }} />
                      <span style={{ fontSize: 11, color: advanceRequestForm.proofFile ? '#a78bfa' : 'rgba(255,255,255,0.3)' }}>
                        {advanceRequestForm.proofFile ? advanceRequestForm.proofFile.name : 'Upload a deck, revenue screenshot, contract, MoU, or any proof doc'}
                      </span>
                    </label>
                    <p style={{ margin: '4px 0 0', fontSize: 10, color: 'rgba(255,255,255,0.18)' }}>PDF, image, Word, Excel — max 10 MB</p>
                  </div>

                  {advanceRequestError && (
                    <p style={{ margin: 0, fontSize: 11, color: '#f87171', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', borderRadius: 8, padding: '8px 12px' }}>{advanceRequestError}</p>
                  )}

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
                    <button onClick={() => setAdvanceRequestOpen(false)} style={{ flex: 1, padding: '11px', borderRadius: 999, fontSize: 12, fontWeight: 600, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)', cursor: 'pointer' }}>Cancel</button>
                    <button
                      disabled={advanceRequestSubmitting}
                      onClick={async () => {
                        if (!advanceRequestForm.targetStage) { setAdvanceRequestError('Please select a target stage.'); return; }
                        if (advanceRequestForm.justification.trim().length < 50) { setAdvanceRequestError('Please write a justification of at least 50 characters.'); return; }
                        setAdvanceRequestSubmitting(true);
                        try {
                          const fd = new FormData();
                          fd.append('startup_id', s.id);
                          fd.append('startup_name', s.name);
                          fd.append('current_stage', s.stage);
                          fd.append('target_stage', advanceRequestForm.targetStage);
                          fd.append('justification', advanceRequestForm.justification);
                          fd.append('submitted_by', user?.email ?? '');
                          if (advanceRequestForm.proofFile) fd.append('proof', advanceRequestForm.proofFile);
                          await fetch('/api/startup-advance/request', { method: 'POST', credentials: 'include', body: fd });
                          setAdvanceRequestDone(true);
                        } catch { setAdvanceRequestError('Network error. Please try again.'); }
                        setAdvanceRequestSubmitting(false);
                      }}
                      style={{ flex: 2, padding: '11px', borderRadius: 999, fontSize: 12, fontWeight: 700, background: advanceRequestSubmitting ? 'rgba(139,92,246,0.4)' : 'linear-gradient(90deg,#7c3aed,#0ea5e9)', color: 'white', border: 'none', cursor: advanceRequestSubmitting ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                    >
                      {advanceRequestSubmitting ? 'Submitting…' : <><UserCheck style={{ width: 13, height: 13 }} /> Submit Advance Request</>}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* ── MODAL: OWNERSHIP CONFIRM ─────────────────────────────────────── */}
      {ownershipConfirmOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(14px)' }} onClick={() => setOwnershipConfirmOpen(false)}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#09090f', border: '1px solid rgba(139,92,246,0.3)', borderTop: '2px solid #8b5cf6', borderRadius: 20, width: '100%', maxWidth: 380, padding: '28px 24px', boxShadow: '0 0 60px rgba(139,92,246,0.2), 0 32px 64px rgba(0,0,0,0.8)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Key style={{ width: 16, height: 16, color: '#a78bfa' }} />
              </div>
              <div>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: '#fff' }}>Confirm Ownership</p>
                <p style={{ margin: 0, fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 1 }}>Enter your startup password to proceed</p>
              </div>
            </div>
            <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '16px 0' }} />
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 9.5, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>Startup Password</label>
              <input
                type="password" placeholder="Enter your startup password" autoFocus
                value={ownershipConfirmPwd}
                onChange={e => { setOwnershipConfirmPwd(e.target.value); setOwnershipConfirmError(''); }}
                onKeyDown={async e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (!ownershipConfirmPwd) return;
                    setOwnershipConfirmLoading(true);
                    try {
                      const res = await fetch('/api/startup-auth/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ startup_id: ownershipConfirmStartupId, password: ownershipConfirmPwd }) });
                      const data = await res.json() as { ok?: boolean; error?: string };
                      if (data.ok) { setOwnershipSessions(prev => ({ ...prev, [ownershipConfirmStartupId]: Date.now() + 30 * 60 * 1000 })); setOwnershipConfirmOpen(false); ownershipConfirmCallback?.(); }
                      else setOwnershipConfirmError(data.error ?? 'Incorrect password.');
                    } catch { setOwnershipConfirmError('Network error. Try again.'); }
                    setOwnershipConfirmLoading(false);
                  }
                }}
                style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: `1px solid ${ownershipConfirmError ? 'rgba(248,113,113,0.5)' : 'rgba(255,255,255,0.1)'}`, borderRadius: 10, padding: '9px 12px', color: '#fff', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
              />
              {ownershipConfirmError && <p style={{ margin: '6px 0 0', fontSize: 11, color: '#f87171' }}>{ownershipConfirmError}</p>}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setOwnershipConfirmOpen(false)} style={{ flex: 1, padding: '10px 0', borderRadius: 999, fontSize: 12, fontWeight: 600, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)', cursor: 'pointer' }}>
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (!ownershipConfirmPwd) return;
                  setOwnershipConfirmLoading(true);
                  try {
                    const res = await fetch('/api/startup-auth/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ startup_id: ownershipConfirmStartupId, password: ownershipConfirmPwd }) });
                    const data = await res.json() as { ok?: boolean; error?: string };
                    if (data.ok) { setOwnershipSessions(prev => ({ ...prev, [ownershipConfirmStartupId]: Date.now() + 30 * 60 * 1000 })); setOwnershipConfirmOpen(false); ownershipConfirmCallback?.(); }
                    else setOwnershipConfirmError(data.error ?? 'Incorrect password.');
                  } catch { setOwnershipConfirmError('Network error. Try again.'); }
                  setOwnershipConfirmLoading(false);
                }}
                disabled={ownershipConfirmLoading || !ownershipConfirmPwd}
                style={{ flex: 2, padding: '10px 0', borderRadius: 999, fontSize: 12, fontWeight: 700, background: ownershipConfirmLoading ? 'rgba(139,92,246,0.4)' : 'linear-gradient(90deg,#7c3aed,#6366f1)', color: '#fff', border: 'none', cursor: ownershipConfirmLoading ? 'wait' : 'pointer', boxShadow: '0 4px 18px rgba(124,58,237,0.35)', opacity: ownershipConfirmPwd ? 1 : 0.5 }}>
                {ownershipConfirmLoading ? 'Verifying…' : 'Confirm →'}
              </button>
            </div>
            <p style={{ margin: '14px 0 0', fontSize: 10, color: 'rgba(255,255,255,0.2)', textAlign: 'center' }}>Session unlocked for this startup only · expires in 30 minutes</p>
          </div>
        </div>
      )}

      {/* ── MODAL: SIGN-IN PROMPT ────────────────────────────────────────── */}
      {signInPromptOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(14px)' }} onClick={() => setSignInPromptOpen(false)}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#09090f', border: '1px solid rgba(139,92,246,0.3)', borderTop: '2.5px solid #8b5cf6', borderRadius: 20, width: '100%', maxWidth: 400, padding: '32px 28px', textAlign: 'center', boxShadow: '0 0 60px rgba(139,92,246,0.2), 0 32px 64px rgba(0,0,0,0.8)' }}>
            <div style={{ width: 54, height: 54, borderRadius: '50%', background: 'rgba(139,92,246,0.15)', border: '1.5px solid rgba(139,92,246,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px', boxShadow: '0 0 24px rgba(139,92,246,0.3)' }}>
              <Lock style={{ width: 22, height: 22, color: '#a78bfa' }} />
            </div>
            <p style={{ fontSize: 16, fontWeight: 800, color: '#fff', margin: '0 0 8px' }}>Sign In Required</p>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', lineHeight: 1.7, margin: '0 0 26px', maxWidth: 300, marginLeft: 'auto', marginRight: 'auto' }}>{signInPromptMsg}</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setSignInPromptOpen(false)} style={{ flex: 1, padding: '10px 0', borderRadius: 999, fontSize: 12, fontWeight: 600, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)', cursor: 'pointer' }}>
                Cancel
              </button>
              <button onClick={() => { setSignInPromptOpen(false); window.location.href = '/'; }} style={{ flex: 2, padding: '10px 0', borderRadius: 999, fontSize: 12, fontWeight: 700, background: 'linear-gradient(90deg,#7c3aed,#0ea5e9)', color: '#fff', border: 'none', cursor: 'pointer', boxShadow: '0 4px 18px rgba(124,58,237,0.4)' }}>
                Sign In / Sign Up →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: UPLOAD CHOICE ─────────────────────────────────────────── */}
      {uploadChoiceOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(14px)' }} onClick={() => setUploadChoiceOpen(false)}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#09090f', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, width: '100%', maxWidth: 520, overflow: 'hidden', boxShadow: '0 32px 80px rgba(0,0,0,0.8)' }}>
            {/* Header */}
            <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#fff' }}>What would you like to upload?</p>
                <p style={{ margin: '3px 0 0', fontSize: 10.5, color: 'rgba(255,255,255,0.3)' }}>Choose the type of document to add to your Solution Vault</p>
              </div>
              <button onClick={() => setUploadChoiceOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)' }}><X style={{ width: 16, height: 16 }} /></button>
            </div>

            {/* Two option cards */}
            <div style={{ padding: '20px 24px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>

              {/* Option 1: Brand Deck */}
              <div
                onClick={() => {
                  const myNames = new Set(userStartups.map(s => s.name));
                  const existing = vaultDocs.find(d => (d as any).deck_type === 'brand' && myNames.has((d as any).startup_name));
                  if (existing) { setUploadChoiceOpen(false); setReplaceConfirm({ mode: 'brand', existingDoc: existing }); }
                  else { setUploadChoiceOpen(false); setUploadMode('brand'); setUploadOpen(true); }
                }}
                style={{ border: '1px solid rgba(139,92,246,0.35)', borderRadius: 14, padding: '18px 20px', cursor: 'pointer', background: 'rgba(139,92,246,0.06)', transition: 'all 0.2s', position: 'relative', overflow: 'hidden' }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(139,92,246,0.7)'; (e.currentTarget as HTMLDivElement).style.background = 'rgba(139,92,246,0.11)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(139,92,246,0.35)'; (e.currentTarget as HTMLDivElement).style.background = 'rgba(139,92,246,0.06)'; }}>
                <div style={{ position: 'absolute', top: -20, right: -20, width: 90, height: 90, borderRadius: '50%', background: 'radial-gradient(circle,rgba(139,92,246,0.2),transparent 70%)', pointerEvents: 'none' }} />
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                  <div style={{ width: 42, height: 42, borderRadius: 11, background: 'rgba(139,92,246,0.2)', border: '1px solid rgba(139,92,246,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><BarChart3 style={{ width: 20, height: 20, color: '#c4b5fd' }} /></div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: '#c4b5fd' }}>Brand Deck</p>
                      <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', color: '#10b981', letterSpacing: '0.05em' }}>PUBLIC</span>
                    </div>
                    <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.4)', lineHeight: 1.65 }}>
                      Your public-facing brand story — value proposition, problem-solution fit, market sizing, and team overview. Visible to all VCs and visitors. <strong style={{ color: 'rgba(255,255,255,0.6)' }}>FitScore is calculated from this.</strong>
                    </p>
                  </div>
                  <ChevronRight style={{ width: 16, height: 16, color: 'rgba(139,92,246,0.6)', flexShrink: 0, marginTop: 12 }} />
                </div>
              </div>

              {/* Option 2: Investor Pitch Deck */}
              <div
                onClick={() => {
                  const myNames = new Set(userStartups.map(s => s.name));
                  const existing = vaultDocs.find(d => (d as any).deck_type === 'investor' && myNames.has((d as any).startup_name));
                  if (existing) { setUploadChoiceOpen(false); setReplaceConfirm({ mode: 'investor', existingDoc: existing }); }
                  else { setUploadChoiceOpen(false); setUploadMode('investor'); setUploadOpen(true); }
                }}
                style={{ border: '1px solid rgba(6,182,212,0.3)', borderRadius: 14, padding: '18px 20px', cursor: 'pointer', background: 'rgba(6,182,212,0.05)', transition: 'all 0.2s', position: 'relative', overflow: 'hidden' }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(6,182,212,0.65)'; (e.currentTarget as HTMLDivElement).style.background = 'rgba(6,182,212,0.1)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(6,182,212,0.3)'; (e.currentTarget as HTMLDivElement).style.background = 'rgba(6,182,212,0.05)'; }}>
                <div style={{ position: 'absolute', top: -20, right: -20, width: 90, height: 90, borderRadius: '50%', background: 'radial-gradient(circle,rgba(6,182,212,0.18),transparent 70%)', pointerEvents: 'none' }} />
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                  <div style={{ width: 42, height: 42, borderRadius: 11, background: 'rgba(6,182,212,0.15)', border: '1px solid rgba(6,182,212,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Shield style={{ width: 20, height: 20, color: '#67e8f9' }} /></div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: '#67e8f9' }}>Investor Pitch Deck</p>
                      <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: 'rgba(6,182,212,0.15)', border: '1px solid rgba(6,182,212,0.35)', color: '#06b6d4', letterSpacing: '0.05em' }}>INVESTORS ONLY</span>
                    </div>
                    <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.4)', lineHeight: 1.65 }}>
                      Your confidential deep-dive deck — financial models, product roadmap, tech architecture, cap table. <strong style={{ color: 'rgba(255,255,255,0.6)' }}>Restricted to VCs you explicitly approve.</strong>
                    </p>
                  </div>
                  <ChevronRight style={{ width: 16, height: 16, color: 'rgba(6,182,212,0.5)', flexShrink: 0, marginTop: 12 }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Replace Confirmation Modal ─────────────────────────────────────── */}
      {replaceConfirm && (
        <div onClick={() => setReplaceConfirm(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(14px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 70, padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 440, background: '#0d0d1a', border: `1px solid ${replaceConfirm.mode === 'investor' ? 'rgba(6,182,212,0.3)' : 'rgba(139,92,246,0.3)'}`, borderRadius: 20, padding: '28px 26px', display: 'flex', flexDirection: 'column', gap: 18, boxShadow: '0 0 60px rgba(0,0,0,0.8)' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: replaceConfirm.mode === 'investor' ? 'rgba(6,182,212,0.12)' : 'rgba(139,92,246,0.12)', border: `1px solid ${replaceConfirm.mode === 'investor' ? 'rgba(6,182,212,0.35)' : 'rgba(139,92,246,0.35)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {replaceConfirm.mode === 'investor' ? <Shield style={{ width: 18, height: 18, color: '#67e8f9' }} /> : <BarChart3 style={{ width: 18, height: 18, color: '#c4b5fd' }} />}
              </div>
              <div>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#fff' }}>You already have a {replaceConfirm.mode === 'investor' ? 'Investor Pitch Deck' : 'Brand Deck'}</p>
                <p style={{ margin: '2px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>Each startup is limited to one per category</p>
              </div>
            </div>

            {/* Existing doc card */}
            <div style={{ padding: '12px 14px', borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', gap: 12 }}>
              <FileText style={{ width: 16, height: 16, color: 'rgba(255,255,255,0.3)', flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.8)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{replaceConfirm.existingDoc.name}</p>
                <p style={{ margin: '2px 0 0', fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>{replaceConfirm.existingDoc.type} · {replaceConfirm.existingDoc.status} · {replaceConfirm.existingDoc.date}</p>
              </div>
              <span style={{ fontSize: 9, fontWeight: 700, padding: '3px 8px', borderRadius: 999, background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)', color: '#f59e0b', flexShrink: 0 }}>EXISTING</span>
            </div>

            <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.45)', lineHeight: 1.6 }}>
              Replacing will <strong style={{ color: 'rgba(255,255,255,0.7)' }}>permanently remove the current document</strong> from your vault and from investor view. Your FitScore will be recalculated based on the new upload.
            </p>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setReplaceConfirm(null)}
                style={{ flex: 1, padding: '11px', borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', color: 'rgba(255,255,255,0.45)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                Keep Existing
              </button>
              <button
                onClick={() => {
                  const { mode, existingDoc } = replaceConfirm;
                  setReplaceConfirm(null);
                  setUploadMode(mode);
                  setEditingDoc(existingDoc);
                  setUploadOpen(true);
                }}
                style={{ flex: 2, padding: '11px', borderRadius: 12, background: replaceConfirm.mode === 'investor' ? 'linear-gradient(90deg,rgba(6,182,212,0.25),rgba(6,182,212,0.1))' : 'linear-gradient(90deg,rgba(139,92,246,0.25),rgba(139,92,246,0.1))', border: `1px solid ${replaceConfirm.mode === 'investor' ? 'rgba(6,182,212,0.4)' : 'rgba(139,92,246,0.4)'}`, color: replaceConfirm.mode === 'investor' ? '#67e8f9' : '#c4b5fd', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
                <Upload style={{ width: 13, height: 13 }} />Replace with New Upload
              </button>
            </div>
          </div>
        </div>
      )}

      {uploadOpen && (() => {
        const EXT_TO_TYPE: Record<string, string> = {
          pdf: 'Doc', pptx: 'Deck', ppt: 'Deck', xlsx: 'Sheet', xls: 'Sheet',
          csv: 'Sheet', mp4: 'Video', mov: 'Video', zip: 'Bundle', rar: 'Bundle', docx: 'Doc', doc: 'Doc',
        };

        return (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.78)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }}>
            <div className="hub-modal-wrap" style={{ background: '#08080f', border: '1px solid rgba(255,255,255,0.09)', borderTop: '2px solid rgba(139,92,246,0.6)', borderRadius: 20, width: '100%', maxWidth: 460, boxShadow: '0 24px 80px rgba(0,0,0,0.7)' }}>

              {/* Header */}
              <div style={{ padding: '16px 22px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(139,92,246,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 12px rgba(139,92,246,0.5)' }}>
                    <Upload style={{ width: 13, height: 13, color: '#a78bfa' }} />
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 600, color: 'white' }}>
                    {editingDoc ? `Edit — ${editingDoc.name}` : uploadMode === 'investor' ? 'Upload Investor Pitch Deck' : 'Upload Brand Deck'}
                  </span>
                </div>
                <button onClick={() => { setUploadOpen(false); setEditingDoc(null); setSelectedFile(null); setDetectedFileType(null); setSelectedDocType('Doc'); setUploadError(''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', padding: 4 }}>
                  <X style={{ width: 16, height: 16 }} />
                </button>
              </div>

              <div style={{ padding: '22px' }}>

                {/* Mode context banner */}
                {!editingDoc && (
                  <div style={{ marginBottom: 16, padding: '10px 14px', borderRadius: 10, background: uploadMode === 'investor' ? 'rgba(6,182,212,0.08)' : 'rgba(139,92,246,0.08)', border: `1px solid ${uploadMode === 'investor' ? 'rgba(6,182,212,0.25)' : 'rgba(139,92,246,0.25)'}`, display: 'flex', alignItems: 'center', gap: 10 }}>
                    {uploadMode === 'investor' ? <Shield style={{ width: 15, height: 15, color: '#67e8f9', flexShrink: 0 }} /> : <BarChart3 style={{ width: 15, height: 15, color: '#c4b5fd', flexShrink: 0 }} />}
                    <div>
                      <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: uploadMode === 'investor' ? '#67e8f9' : '#c4b5fd' }}>
                        {uploadMode === 'investor' ? 'Investor Pitch Deck — Restricted Access' : 'Brand Deck — Public'}
                      </p>
                      <p style={{ margin: '2px 0 0', fontSize: 10, color: 'rgba(255,255,255,0.35)', lineHeight: 1.5 }}>
                        {uploadMode === 'investor'
                          ? 'This deck will only be visible to VCs you explicitly approve. Contains financials, roadmap & cap table.'
                          : 'This deck is publicly visible. It\'s used to calculate your FitScore and generate investor interest.'}
                      </p>
                    </div>
                  </div>
                )}

                {/* Drop zone */}
                <div
                  id="vup-drop"
                  onClick={() => document.getElementById('vup-file-input')?.click()}
                  onDragOver={e => { e.preventDefault(); (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(139,92,246,0.6)'; (e.currentTarget as HTMLDivElement).style.background = 'rgba(139,92,246,0.07)'; }}
                  onDragLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = selectedFile ? 'rgba(16,185,129,0.45)' : 'rgba(255,255,255,0.08)'; (e.currentTarget as HTMLDivElement).style.background = selectedFile ? 'rgba(16,185,129,0.05)' : 'rgba(255,255,255,0.015)'; }}
                  onDrop={e => { e.preventDefault(); (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.08)'; (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.015)'; if (e.dataTransfer.files[0]) handleUploadFile(e.dataTransfer.files[0]); }}
                  style={{ border: `2px dashed ${selectedFile ? 'rgba(16,185,129,0.45)' : 'rgba(255,255,255,0.08)'}`, borderRadius: 14, padding: '22px 20px', textAlign: 'center', cursor: 'pointer', marginBottom: 14, transition: 'all 0.2s', background: selectedFile ? 'rgba(16,185,129,0.04)' : 'rgba(255,255,255,0.015)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 96 }}
                >
                  {selectedFile ? (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <span style={{ fontSize: 16 }}>
                            {detectedFileType === 'Video' ? '🎬' : detectedFileType === 'Sheet' ? '📊' : detectedFileType === 'Bundle' ? '📦' : detectedFileType === 'Deck' ? '📑' : '📄'}
                          </span>
                        </div>
                        <div style={{ textAlign: 'left' }}>
                          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'white' }}>{selectedFile.name}</p>
                          <p style={{ margin: '2px 0 0', fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>{(selectedFile.size / 1024).toFixed(1)} KB</p>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 999, background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)' }}>
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 6px #10b981' }} />
                        <span style={{ fontSize: 10, fontWeight: 700, color: '#10b981' }}>Detected as: {detectedFileType}</span>
                        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginLeft: 4 }}>· click to change file</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(139,92,246,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Upload style={{ width: 16, height: 16, color: '#a78bfa' }} />
                      </div>
                      <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>Drop your file here or <span style={{ color: '#a78bfa', fontWeight: 600 }}>browse</span></span>
                      <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.18)' }}>Deck · Doc · Sheet · Video · Bundle</span>
                      <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.12)' }}>PPTX · PDF/DOCX · XLSX/CSV · MP4/MOV · ZIP/RAR</span>
                    </>
                  )}
                </div>
                <input id="vup-file-input" type="file" accept=".pdf,.pptx,.ppt,.xlsx,.xls,.csv,.mp4,.mov,.webm,.zip,.rar,.docx,.doc" style={{ display: 'none' }} onChange={e => { if (e.target.files?.[0]) handleUploadFile(e.target.files[0]); e.target.value = ''; }} />

                {uploadError && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
                    {/* Error row */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 14px', borderRadius: 10, background: 'rgba(248,113,113,0.07)', border: '1px solid rgba(248,113,113,0.28)' }}>
                      <span style={{ fontSize: 16, flexShrink: 0, lineHeight: 1 }}>🚫</span>
                      <div>
                        <p style={{ fontSize: 11, fontWeight: 700, color: '#f87171', margin: '0 0 4px' }}>Unsupported File Type</p>
                        <p style={{ fontSize: 10.5, color: 'rgba(248,113,113,0.75)', margin: 0, lineHeight: 1.65, whiteSpace: 'pre-line' }}>{uploadError}</p>
                      </div>
                    </div>
                    {/* Naming convention guide */}
                    <div style={{ padding: '11px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                      <p style={{ margin: '0 0 8px', fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Recommended File Naming</p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 999, background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)', color: '#10b981', flexShrink: 0 }}>PUBLIC</span>
                          <code style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', background: 'rgba(255,255,255,0.05)', padding: '2px 7px', borderRadius: 5, fontFamily: 'monospace' }}>
                            brandname_public_vault.pdf
                          </code>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 999, background: 'rgba(6,182,212,0.12)', border: '1px solid rgba(6,182,212,0.25)', color: '#06b6d4', flexShrink: 0 }}>VC ONLY</span>
                          <code style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', background: 'rgba(255,255,255,0.05)', padding: '2px 7px', borderRadius: 5, fontFamily: 'monospace' }}>
                            brandname_private_vault.pptx
                          </code>
                        </div>
                      </div>
                      <p style={{ margin: '8px 0 0', fontSize: 9.5, color: 'rgba(255,255,255,0.25)', lineHeight: 1.5 }}>Replace <em>brandname</em> with your startup name. Accepted formats: .pdf, .pptx, .ppt, .docx, .doc, .xlsx, .csv, .mp4, .mov, .zip</p>
                    </div>
                  </div>
                )}

                {/* Fields */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 10, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Document Name</label>
                    <input id="vup-name" type="text" placeholder="e.g. JalRakshak Pilot Proposal v2"
                      style={{ width: '100%', padding: '9px 13px', fontSize: 12, background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 10, color: 'white', outline: 'none', boxSizing: 'border-box' }} />
                  </div>

                  <div className="hub-modal-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 10, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
                        Type {detectedFileType && <span style={{ color: 'rgba(16,185,129,0.7)', fontSize: 9, marginLeft: 4 }}>· auto-detected</span>}
                      </label>
                      {/* Non-PDF: fully locked to detected type */}
                      {detectedFileType && !['Doc', null].includes(detectedFileType) ? (
                        <div style={{ width: '100%', padding: '9px 13px', fontSize: 12, background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 10, color: '#10b981', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, boxSizing: 'border-box' }}>
                          <span style={{ fontSize: 10 }}>🔒</span>{detectedFileType}
                          {/* hidden select so handleUploadSubmit can still read #vup-type */}
                          <select id="vup-type" value={detectedFileType} onChange={() => {}} style={{ display: 'none' }}>
                            <option value={detectedFileType}>{detectedFileType}</option>
                          </select>
                        </div>
                      ) : (
                        /* PDF / no file: Doc or Deck only (PDFs can't be Sheet/Video/Bundle) */
                        <select
                          id="vup-type"
                          value={selectedDocType}
                          onChange={e => setSelectedDocType(e.target.value)}
                          style={{ width: '100%', padding: '9px 13px', fontSize: 12, background: '#0d0d18', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 10, color: 'white', outline: 'none' }}
                        >
                          {detectedFileType === 'Doc'
                            ? <><option value="Doc">Doc</option><option value="Deck">Deck</option></>
                            : <><option value="Doc">Doc</option><option value="Deck">Deck</option><option value="Sheet">Sheet</option><option value="Video">Video</option><option value="Bundle">Bundle</option></>
                          }
                        </select>
                      )}
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 10, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Status</label>
                      <select id="vup-status" style={{ width: '100%', padding: '9px 13px', fontSize: 12, background: '#0d0d18', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 10, color: 'white', outline: 'none' }}>
                        <option>Draft</option><option>Review</option><option>Final</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                  <button onClick={() => { setUploadOpen(false); setSelectedFile(null); setDetectedFileType(null); setSelectedDocType('Doc'); setUploadError(''); }} style={{ flex: 1, padding: '10px', borderRadius: 999, fontSize: 12, fontWeight: 500, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.4)', cursor: 'pointer' }}>
                    Cancel
                  </button>
                  <button id="vup-submit" onClick={handleUploadSubmit} disabled={uploadPending || !selectedFile} style={{ flex: 2, padding: '10px', borderRadius: 999, fontSize: 13, fontWeight: 700, background: (!selectedFile || uploadPending) ? 'rgba(124,58,237,0.3)' : 'linear-gradient(90deg,#7c3aed,#0ea5e9)', color: !selectedFile ? 'rgba(255,255,255,0.4)' : 'white', border: 'none', cursor: uploadPending ? 'wait' : !selectedFile ? 'not-allowed' : 'pointer', boxShadow: selectedFile && !uploadPending ? '0 4px 18px rgba(124,58,237,0.4)' : 'none', transition: 'all 0.2s' }}>
                    {uploadPending ? 'Uploading…' : !selectedFile ? 'Select a file first' : 'Add to Vault →'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
      {/* Remove Startup — reason-gated confirmation */}
      {removeTarget && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 16 }} onClick={() => setRemoveTarget(null)}>
          <div className="hub-modal-wrap" style={{ background: '#08080f', border: '1px solid rgba(248,113,113,0.3)', borderTop: '2px solid #f87171', borderRadius: 20, width: '100%', maxWidth: 440, padding: 28 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(248,113,113,0.15)', border: '1px solid rgba(248,113,113,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Trash2 style={{ width: 18, height: 18, color: '#f87171' }} />
              </div>
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: 16, fontWeight: 700, color: 'white', margin: 0 }}>Remove “{removeTarget.name}”?</p>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', margin: '2px 0 0' }}>This deletes the startup and its linked documents.</p>
              </div>
            </div>
            <p style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.5)', lineHeight: 1.6, margin: '0 0 14px' }}>
              Please tell us why you're removing this startup. If you register it again later, it will need to go through admin approval from scratch.
            </p>
            <textarea
              value={removeReason}
              onChange={e => { setRemoveReason(e.target.value); if (removeError) setRemoveError(''); }}
              placeholder="Reason for removal (required) — e.g. shutting down, duplicate entry, pivoting…"
              rows={3}
              style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical', background: 'rgba(255,255,255,0.04)', border: `1px solid ${removeError ? 'rgba(248,113,113,0.6)' : 'rgba(255,255,255,0.12)'}`, borderRadius: 12, padding: '10px 12px', color: 'white', fontSize: 13, outline: 'none', fontFamily: 'inherit', lineHeight: 1.5 }}
            />
            {removeError && <p style={{ fontSize: 11, color: '#f87171', margin: '8px 0 0' }}>{removeError}</p>}
            <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
              <button
                onClick={() => setRemoveTarget(null)}
                style={{ flex: 1, padding: '10px', borderRadius: 999, fontSize: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)', cursor: 'pointer' }}>
                Keep it
              </button>
              <button
                onClick={() => {
                  const reason = removeReason.trim();
                  if (reason.length < 4) { setRemoveError('Please add a short reason before removing.'); return; }
                  performRemoveStartup(removeTarget, reason);
                  setRemoveTarget(null);
                  setRemoveReason('');
                }}
                style={{ flex: 2, padding: '10px', borderRadius: 999, fontSize: 13, fontWeight: 700, background: 'linear-gradient(90deg,#dc2626,#f87171)', color: 'white', border: 'none', cursor: 'pointer', boxShadow: '0 4px 18px rgba(220,38,38,0.35)' }}>
                Remove Startup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Guard Modal */}
      {uploadGuardOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 16 }}>
          <div className="hub-modal-wrap" style={{ background: '#08080f', border: '1px solid rgba(139,92,246,0.3)', borderTop: '2px solid #8b5cf6', borderRadius: 20, width: '100%', maxWidth: 420, padding: 32, textAlign: 'center' }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: 24 }}>🚀</div>
            <p style={{ fontSize: 18, fontWeight: 700, color: 'white', margin: '0 0 10px' }}>Register Your Startup First</p>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', lineHeight: 1.65, margin: '0 0 24px' }}>
              Your pitch deck needs a home. Register your startup in the pipeline first — we'll calculate your FitScore™ and then you can upload your deck for a deeper analysis.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setUploadGuardOpen(false)}
                style={{ flex: 1, padding: '10px', borderRadius: 999, fontSize: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.4)', cursor: 'pointer' }}>
                Cancel
              </button>
              <button
                onClick={() => { setUploadGuardOpen(false); setRegisterOpen(true); }}
                style={{ flex: 2, padding: '10px', borderRadius: 999, fontSize: 13, fontWeight: 700, background: 'linear-gradient(90deg,#7c3aed,#0ea5e9)', color: 'white', border: 'none', cursor: 'pointer', boxShadow: '0 4px 18px rgba(124,58,237,0.4)' }}>
                Register Startup →
              </button>
            </div>
          </div>
        </div>
      )}

      {uploadPendingGuardOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 16 }}>
          <div className="hub-modal-wrap" style={{ background: '#08080f', border: '1px solid rgba(245,158,11,0.3)', borderTop: '2px solid #f59e0b', borderRadius: 20, width: '100%', maxWidth: 420, padding: 32, textAlign: 'center' }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: 24 }}>⏳</div>
            <p style={{ fontSize: 18, fontWeight: 700, color: 'white', margin: '0 0 10px' }}>Approval Pending</p>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 1.65, margin: '0 0 24px' }}>
              Your startup is registered, but our admin team hasn't approved it just yet. Uploads to the Solution Vault open up the moment you're approved — we'd love your patience in the meantime. 🙏
            </p>
            <button
              onClick={() => setUploadPendingGuardOpen(false)}
              style={{ width: '100%', padding: '10px', borderRadius: 999, fontSize: 13, fontWeight: 700, background: 'linear-gradient(90deg,#d97706,#f59e0b)', color: 'white', border: 'none', cursor: 'pointer', boxShadow: '0 4px 18px rgba(245,158,11,0.35)' }}>
              Got it
            </button>
          </div>
        </div>
      )}

      {incuScoreState && (
        <FitScoreModal
          state={incuScoreState}
          onClose={() => setFitScoreState(null)}
        />
      )}
    </div>
  );

  function FitScoreModal({ state, onClose }: {
    state: NonNullable<typeof incuScoreState>;
    onClose: () => void;
  }) {
    const bandColors: Record<string, string> = {
      'Investor-Grade': '#10b981', 'Strong': '#06b6d4',
      'Promising': '#f59e0b', 'Early Stage': '#8b5cf6', 'Pre-Idea': '#475569',
    };
    const col = bandColors[state.band] ?? '#8b5cf6';
    const circ = 2 * Math.PI * 54;
    const dash = ((state.score ?? 0) / 100) * circ;

    if (state.loading) return (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(14px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 72, height: 72, margin: '0 auto 24px', borderRadius: '50%', border: '3px solid rgba(139,92,246,0.25)', borderTop: '3px solid #8b5cf6', animation: 'is-spin 1s linear infinite' }} />
          <style>{`@keyframes is-spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}@keyframes is-pulse{0%,100%{opacity:0.35}50%{opacity:1}}`}</style>
          <p style={{ fontSize: 18, fontWeight: 700, color: 'white', margin: '0 0 8px' }}>Calculating FitScore™</p>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.38)', margin: '0 0 24px' }}>
            {state.phase === 0 ? 'Analysing startup fundamentals…' : 'Evaluating your pitch document…'}
          </p>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
            {['Market analysis', 'Team evaluation', 'Business model', 'Innovation scan'].map((t, i) => (
              <span key={t} style={{ padding: '4px 12px', borderRadius: 999, background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)', fontSize: 10, color: '#a78bfa', animation: `is-pulse 1.6s ease-in-out ${i * 0.3}s infinite` }}>{t}</span>
            ))}
          </div>
        </div>
      </div>
    );

    return (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(14px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 16 }}>
        <div className="incuscore-modal hub-modal-wrap" style={{ background: '#08080f', border: `1px solid ${col}40`, borderTop: `3px solid ${col}`, borderRadius: 24, width: '100%', maxWidth: 520, boxShadow: `0 32px 80px rgba(0,0,0,0.8), 0 0 60px ${col}18`, padding: 32, position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: -60, right: -60, width: 240, height: 240, borderRadius: '50%', background: `radial-gradient(circle,${col}12,transparent 70%)`, pointerEvents: 'none' }} />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <span style={{ fontSize: 10, fontWeight: 700, padding: '4px 12px', borderRadius: 999, background: `${col}18`, border: `1px solid ${col}38`, color: col, letterSpacing: '0.06em' }}>
              {state.phase === 1 ? 'PHASE 1 — STARTUP REGISTERED' : 'PHASE 2 — FINAL INCUSCORE™'}
            </span>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.35)', cursor: 'pointer', fontSize: 20, lineHeight: 1 }}>✕</button>
          </div>

          <div className="incuscore-modal-inner" style={{ display: 'flex', alignItems: 'center', gap: 24, marginBottom: 22 }}>
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <svg width={132} height={132} viewBox="0 0 132 132">
                <circle cx="66" cy="66" r="54" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
                <circle cx="66" cy="66" r="54" fill="none" stroke={col} strokeWidth="8"
                  strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" transform="rotate(-90 66 66)"
                  style={{ filter: `drop-shadow(0 0 12px ${col})` }} />
                {state.delta !== null && (
                  <text x="66" y="50" textAnchor="middle" fontSize="11" fill={state.delta >= 0 ? '#10b981' : '#f87171'} fontWeight="700">
                    {state.delta >= 0 ? `+${state.delta}` : state.delta}
                  </text>
                )}
                <text x="66" y="74" textAnchor="middle" fontSize="32" fontWeight="900" fill="white">{state.score}</text>
                <text x="66" y="90" textAnchor="middle" fontSize="9" fill="rgba(255,255,255,0.28)" letterSpacing="1">INCUSCORE™</text>
              </svg>
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{state.startupName}</p>
              <p style={{ fontSize: 22, fontWeight: 800, color: col, margin: '0 0 8px', filter: `drop-shadow(0 0 10px ${col}55)` }}>{state.band}</p>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', lineHeight: 1.65, margin: 0 }}>{state.remark}</p>
            </div>
          </div>

          {state.strengths.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.22)', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 8px' }}>✦ Strengths</p>
              {state.strengths.map((s, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, fontSize: 12, color: 'rgba(255,255,255,0.55)', marginBottom: 4 }}>
                  <span style={{ color: '#10b981', flexShrink: 0 }}>✓</span>{s}
                </div>
              ))}
            </div>
          )}

          {state.improvements.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.22)', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 8px' }}>◈ To Improve</p>
              {state.improvements.map((s, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, fontSize: 12, color: 'rgba(255,255,255,0.55)', marginBottom: 4 }}>
                  <span style={{ color: '#f59e0b', flexShrink: 0 }}>→</span>{s}
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 20 }}>
            {state.keywords.map(k => (
              <span key={k} style={{ fontSize: 9, fontWeight: 700, padding: '3px 10px', borderRadius: 999, color: col, background: `${col}14`, border: `1px solid ${col}30`, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{k}</span>
            ))}
          </div>

          <div style={{ padding: '14px 16px', borderRadius: 14, background: state.readyForVCs ? 'rgba(16,185,129,0.07)' : 'rgba(139,92,246,0.07)', border: `1px solid ${state.readyForVCs ? 'rgba(16,185,129,0.22)' : 'rgba(139,92,246,0.22)'}`, marginBottom: 20 }}>
            <p style={{ fontSize: 12, color: state.readyForVCs ? '#34d399' : '#a78bfa', margin: 0, lineHeight: 1.65 }}>
              {state.phase === 2 && state.readyForVCs
                ? `🚀 Best of luck with your investor conversations, ${state.startupName}! Your FitScore™ signals strong readiness for VC discussions.`
                : state.message}
            </p>
          </div>

          <button onClick={onClose} style={{ width: '100%', padding: '12px', borderRadius: 999, fontSize: 13, fontWeight: 700, background: `linear-gradient(90deg,${col},${col}80)`, color: 'white', border: 'none', cursor: 'pointer', boxShadow: `0 4px 20px ${col}38` }}>
            {state.phase === 1 ? 'Upload Pitch Deck to Improve Score →' : 'View Dashboard →'}
          </button>
        </div>
      </div>
    );
  }

}