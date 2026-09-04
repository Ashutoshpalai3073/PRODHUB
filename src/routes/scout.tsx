// @ts-nocheck
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState, useMemo, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { AuthGate } from '../components/AuthGate';
import * as THREE from 'three';
import { initialStartups, upcomingEvents } from '../data';
import {
    LayoutDashboard, GitBranch, FolderKey, Users, CalendarDays, BarChart3,
    DollarSign, Plus, X, Search, ArrowRight, Bell, TrendingUp, Clock,
    Filter, Star, Building2, Activity, Wallet, CheckCircle,
    ChevronRight, Target, Telescope, Eye, Download, MessageSquare, FileText,
    Globe, Lock, UserPlus, Bookmark, Send, MoreHorizontal,
    Award, Zap, Shield, PieChart, Trash2, Check
} from 'lucide-react';
import { supabase } from '../lib/supabase';

export const Route = createFileRoute('/scout')({
    component: ScoutPage,
    head: () => ({ meta: [{ title: 'Sanyog — Department Hub' }] }),
});

// ─── Constants ────────────────────────────────────────────────────────────────
// Procurement stages — must stay identical to STAGE_ORDER in hub.tsx and to the
// persisted `startups.stage` column. See migration 018.
const STAGE_ORDER = ['Applied', 'Screened', 'In Pilot', 'Validated', 'Scaled'];
const STAGE_COLORS: Record<string, string> = {
    Applied: '#8b5cf6', Screened: '#06b6d4',
    'In Pilot': '#f59e0b', Validated: '#10b981', Scaled: '#34d399',
};

// The signed-in department. Field NAMES are unchanged so every downstream
// reference keeps working; only the meaning and values changed:
//   aum -> sanctioned innovation budget   dryPowder -> uncommitted
//   deployed -> committed to pilots       targetReturn -> target cost-benefit
//   checkMin/checkMax -> pilot budget band per challenge
const VC_PROFILE = {
    name: 'Aryan Mehta', firm: 'Urban Development Department', avatar: 'AM',
    aum: 20_000_000, dryPowder: 12_000_000, deployed: 8_000_000,
    targetReturn: '4.1×', sectors: ['Water', 'Mobility', 'Urban Infra'],
    stages: ['Pilot', 'Scale-up'], checkMin: 500_000, checkMax: 2_500_000,
};

// Same six solutions as the Startup Hub — the two portals must agree.
// `mrr` now carries pilot value released (₹), `users` citizens served, and
// `growth` measured impact against baseline (%).
const ALL_STARTUPS = [
    { id: 'st-1', name: 'JalRakshak Systems', tagline: 'Acoustic leak detection for water mains.', stage: 'Validated', industry: 'WaterTech', founder: 'Ashutosh Palai', fundingGoal: 2_500_000, raised: 1_750_000, score: 87, mrr: 1_750_000, users: 240_000, growth: 34 },
    { id: 'st-2', name: 'TransitIQ', tagline: 'Live occupancy for public bus fleets.', stage: 'In Pilot', industry: 'Mobility', founder: 'Kabir Sen', fundingGoal: 1_500_000, raised: 450_000, score: 78, mrr: 450_000, users: 86_000, growth: 19 },
    { id: 'st-3', name: 'AarogyaTrack', tagline: 'AI chest X-ray triage for TB screening.', stage: 'Scaled', industry: 'HealthTech', founder: 'Meera Iyer', fundingGoal: 2_500_000, raised: 2_500_000, score: 91, mrr: 2_500_000, users: 412_000, growth: 47 },
    { id: 'st-4', name: 'FasalSetu', tagline: 'Vernacular crop and mandi price advisory.', stage: 'Applied', industry: 'AgriTech', founder: 'Chetan Sharma', fundingGoal: 1_500_000, raised: 0, score: 69, mrr: 0, users: 0, growth: 0 },
    { id: 'st-5', name: 'CivicLens', tagline: 'Road defect detection from municipal dashcams.', stage: 'Screened', industry: 'Urban Infra', founder: 'Ankit Raj Singh', fundingGoal: 1_500_000, raised: 0, score: 74, mrr: 0, users: 0, growth: 0 },
    { id: 'st-6', name: 'GridSense', tagline: 'Distribution transformer health monitoring.', stage: 'In Pilot', industry: 'Energy', founder: 'Pawan Kumar', fundingGoal: 2_500_000, raised: 750_000, score: 83, mrr: 750_000, users: 128_000, growth: 22 },
];

// `corporate: true` (deck_type 'investor') = the restricted Corporate Pitch Deck uploaded from the
// Explore Hub Brand Vault. These are the decks founders intend for investors and that surface here.
// deck_type values 'investor' / 'brand' are PERSISTED in the documents table and
// must not be renamed — only what they mean to the user changed:
//   'investor' = confidential submission, released only to approved departments
//   'brand'    = public material, visible to anyone browsing
const DILIGENCE_DOCS = [
    { id: 'd1', startup: 'JalRakshak Systems', name: 'JalRakshak_Pilot_Proposal', type: 'Deck', date: 'Jun 12', access: true, viewed: true, viewedAt: 'Jun 14 09:42', size: '4.2 MB', corporate: true, deck_type: 'investor', file_url: '', status: 'Final' },
    { id: 'd2', startup: 'JalRakshak Systems', name: 'JalRakshak_Costing_Sheet', type: 'Sheet', date: 'Jun 10', access: true, viewed: false, viewedAt: null, size: '1.1 MB', corporate: false, deck_type: 'brand', file_url: '', status: 'Final' },
    { id: 'd3', startup: 'TransitIQ', name: 'TransitIQ_Pilot_Proposal', type: 'Deck', date: 'Jun 11', access: true, viewed: false, viewedAt: null, size: '5.6 MB', corporate: true, deck_type: 'investor', file_url: '', status: 'Final' },
    { id: 'd4', startup: 'TransitIQ', name: 'TransitIQ_Technical_Spec', type: 'Doc', date: 'Jun 10', access: true, viewed: true, viewedAt: 'Jun 13 14:18', size: '0.8 MB', corporate: false, deck_type: 'brand', file_url: '', status: 'Final' },
    { id: 'd5', startup: 'AarogyaTrack', name: 'AarogyaTrack_Validation_Report', type: 'Deck', date: 'May 30', access: true, viewed: true, viewedAt: 'Jun 12 11:05', size: '8.4 MB', corporate: true, deck_type: 'investor', file_url: '', status: 'Final' },
    { id: 'd6', startup: 'GridSense', name: 'GridSense_Security_Clearance', type: 'Deck', date: 'Jun 5', access: true, viewed: false, viewedAt: null, size: '3.7 MB', corporate: true, deck_type: 'investor', file_url: '', status: 'Review' },
    { id: 'd7', startup: 'CivicLens', name: 'CivicLens_Pilot_Proposal', type: 'Deck', date: 'Jun 2', access: true, viewed: false, viewedAt: null, size: '2.9 MB', corporate: true, deck_type: 'investor', file_url: '', status: 'Final' },
    { id: 'd8', startup: 'FasalSetu', name: 'FasalSetu_Pilot_Proposal', type: 'Deck', date: 'May 28', access: true, viewed: false, viewedAt: null, size: '3.1 MB', corporate: true, deck_type: 'investor', file_url: '', status: 'Draft' },
];

const NETWORK_CONTACTS = [
    { id: 'c1', name: 'Ashutosh Palai', role: 'Founder', company: 'JalRakshak Systems', avatar: 'AP', tag: 'Water', lastContact: '2d ago', meetings: 3, msgs: 12 },
    { id: 'c2', name: 'Ankit Raj Singh', role: 'Co-Founder', company: 'CivicLens', avatar: 'AK', tag: 'Urban Infra', lastContact: '5d ago', meetings: 5, msgs: 28 },
    { id: 'c3', name: 'Kabir Sen', role: 'Founder', company: 'TransitIQ', avatar: 'KS', tag: 'Mobility', lastContact: '1d ago', meetings: 7, msgs: 41 },
    { id: 'c4', name: 'Pawan Kumar', role: 'CTO', company: 'GridSense', avatar: 'PK', tag: 'Energy', lastContact: '8d ago', meetings: 4, msgs: 19 },
    { id: 'c5', name: 'Meera Iyer', role: 'Founder', company: 'AarogyaTrack', avatar: 'MI', tag: 'Health', lastContact: '12d ago', meetings: 2, msgs: 8 },
    { id: 'c6', name: 'Chetan Sharma', role: 'Founder', company: 'FasalSetu', avatar: 'CS', tag: 'Agriculture', lastContact: '3d ago', meetings: 1, msgs: 4 },
];

const ALL_EVENTS = [
    ...upcomingEvents,
    { id: 'ev-3', title: 'Sandbox Readiness Workshop', date: 'July 8, 2026', time: '11:00 AM IST', type: 'Workshop', location: 'Online · MS Teams', description: 'Data-sharing protocol, anonymisation and the security clearance checklist that gates pilot start.' },
    { id: 'ev-4', title: 'Maharashtra GovTech Hackathon 2026', date: 'July 20, 2026', time: '09:00 AM IST', type: 'Hackathon', location: 'Bombay Exhibition Centre · Mumbai', description: '48 hours on live departmental problem statements. Winners enter the pipeline at Screened.' },
    { id: 'ev-5', title: 'Nodal Officer Office Hours', date: 'August 3, 2026', time: '02:00 PM IST', type: 'Mentorship', location: 'Virtual', description: 'Open slots to interrogate the baseline, the KPI and who signs off — before committing engineering time.' },
];

// Pilots commissioned through the platform. `roi` is measured improvement
// against the pre-agreed baseline, not a financial return.
const DEPLOYMENTS = [
    { startup: 'AarogyaTrack', amount: 2_500_000, sector: 'Health', stage: 'Scaled', date: 'Mar 2026', roi: '+47%', color: '#8b5cf6' },
    { startup: 'JalRakshak Systems', amount: 1_750_000, sector: 'Water', stage: 'Validated', date: 'Jan 2026', roi: '−34%', color: '#06b6d4' },
    { startup: 'GridSense', amount: 750_000, sector: 'Energy', stage: 'In Pilot', date: 'Apr 2026', roi: '+22%', color: '#10b981' },
];

// Problem domains. `deals` = pilots commissioned; `deployed` = ₹ committed.
const SECTOR_DATA = [
    { sector: 'Water', pct: 31, deployed: 6_200_000, deals: 5, color: '#8b5cf6', growth: '+28%' },
    { sector: 'Mobility', pct: 24, deployed: 4_800_000, deals: 4, color: '#06b6d4', growth: '+19%' },
    { sector: 'Health', pct: 20, deployed: 4_000_000, deals: 3, color: '#10b981', growth: '+34%' },
    { sector: 'Agriculture', pct: 15, deployed: 3_000_000, deals: 2, color: '#f59e0b', growth: '+12%' },
    { sector: 'Other', pct: 10, deployed: 2_000_000, deals: 2, color: '#6b7280', growth: '+5%' },
];

// Seed directory of verified departments — shown to everyone; merged with live
// /api/vc/list data. Field names map to the vc_profiles table and must not change.
const VC_SEED = [
    { firm_name: 'Urban Development Department', partner_name: 'Aryan Mehta', sectors: 'Water, Mobility, Urban Infra', stage_pref: 'Pilot, Scale-up', check_min: 500_000, check_max: 2_500_000, investment_thesis: 'Outcome-based challenges on non-revenue water, road asset condition and civic service delivery across municipal corporations.', status: 'approved' },
    { firm_name: 'Water Supply & Sanitation', partner_name: 'Ishaan Kapoor', sectors: 'Water, Sanitation', stage_pref: 'Pilot', check_min: 500_000, check_max: 2_500_000, investment_thesis: 'Reducing distribution losses and improving continuity of supply in urban and peri-urban networks.', status: 'approved' },
    { firm_name: 'Public Health Department', partner_name: 'Vani Reddy', sectors: 'Health, Diagnostics', stage_pref: 'Pilot, Scale-up', check_min: 500_000, check_max: 2_500_000, investment_thesis: 'Earlier detection and higher screening throughput in high-burden blocks, measured against district baselines.', status: 'approved' },
    { firm_name: 'Transport Department (MSRTC)', partner_name: 'Rohan Das', sectors: 'Mobility, Logistics', stage_pref: 'Pilot', check_min: 500_000, check_max: 1_500_000, investment_thesis: 'Schedule adherence, fleet utilisation and passenger information across depot operations.', status: 'approved' },
    { firm_name: 'Agriculture Department', partner_name: 'Sana Qureshi', sectors: 'Agriculture, Rural', stage_pref: 'Pilot', check_min: 500_000, check_max: 1_500_000, investment_thesis: 'Advisory and market-linkage solutions that reach smallholders in low-connectivity districts.', status: 'approved' },
];

// ROI_DATA now tracks measured impact against baseline (%); PIPELINE_DATA the
// number of live pilots. Constant names kept — referenced across Insights.
const ROI_DATA = [{ m: 'Jan', v: 12 }, { m: 'Feb', v: 19 }, { m: 'Mar', v: 28 }, { m: 'Apr', v: 35 }, { m: 'May', v: 41 }, { m: 'Jun', v: 52 }];
const PIPELINE_DATA = [{ m: 'Jan', v: 3 }, { m: 'Feb', v: 5 }, { m: 'Mar', v: 7 }, { m: 'Apr', v: 9 }, { m: 'May', v: 11 }, { m: 'Jun', v: 14 }];

// ─── Helpers ──────────────────────────────────────────────────────────────────
// Map a Supabase `startups` row → the shape the Scout UI expects
const mapStartupRow = (s: any) => ({
    id: s.id, name: s.name, tagline: s.tagline, industry: s.industry,
    founder: s.founder, stage: s.stage,
    fundingGoal: s.funding_goal, raised: s.raised,
    score: s.pitch_score ?? 80,
    mrr: s.mrr ?? 0, users: s.users ?? 0, growth: s.growth ?? 0,
});

// Map a Supabase `documents` row (deck_type='investor') → a diligence-vault doc
const mapInvestorDoc = (row: any) => ({
    id: `db-${row.id}`,
    startup: row.startup_name,
    name: row.name,
    type: row.type || 'Deck',
    date: row.date || '—',
    access: true,            // verified investors in the portal get access to corporate decks
    viewed: false,
    viewedAt: null,
    size: row.size || '—',
    corporate: true,
    deck_type: 'investor',
    status: row.status || 'Final',
    file_url: row.file_url || '',
});

// Format an ISO timestamp → "Jun 14, 09:42" for the diligence audit log
const fmtAuditTime = (iso: string) => {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    return `${d.toLocaleString('en', { month: 'short' })} ${d.getDate()}, ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};
// Map a `diligence_audit` row → the shape the Audit Log timeline renders
const mapAuditRow = (r: any) => ({ id: r.id, action: r.action, doc: r.doc_name, at: fmtAuditTime(r.created_at), by: r.actor || '' });

const fmt = (n: number) =>
    n >= 1e9 ? `₹${(n / 1e9).toFixed(1)}B`
        : n >= 1e7 ? `₹${(n / 1e7).toFixed(1)}Cr`
            : n >= 1e6 ? `₹${(n / 1e6).toFixed(1)}M`
                : n >= 1e5 ? `₹${(n / 1e5).toFixed(1)}L`
                    : `₹${n.toLocaleString()}`;

const parseDate = (d: string) => {
    const dt = new Date(d);
    return { month: dt.toLocaleString('en', { month: 'short' }).toUpperCase(), day: dt.getDate(), year: dt.getFullYear() };
};

// ─── SVG Area Chart ───────────────────────────────────────────────────────────
function AreaChart({ data, color, h = 90 }: { data: { m: string; v: number }[]; color: string; h?: number }) {
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

// ─── WebGL: Telescope Crystal sidebar orb ────────────────────────────────────
function TelescopeCrystal() {
    const ref = useRef<HTMLCanvasElement>(null);
    useEffect(() => {
        const canvas = ref.current; if (!canvas) return;
        const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setSize(52, 52, false);
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 10);
        camera.position.z = 2.6;
        const dl = new THREE.DirectionalLight(0xffffff, 1.1); dl.position.set(2, 3, 2); scene.add(dl);
        const pl = new THREE.PointLight(0x8b5cf6, 3, 8); pl.position.set(-1, 1, 1); scene.add(pl);
        const pl2 = new THREE.PointLight(0x06b6d4, 2, 6); pl2.position.set(1, -1, 1); scene.add(pl2);
        scene.add(new THREE.AmbientLight(0xffffff, 0.25));
        const mesh = new THREE.Mesh(
            new THREE.OctahedronGeometry(0.75, 0),
            new THREE.MeshPhongMaterial({ color: 0xa78bfa, emissive: 0x4c1d95, specular: 0xffffff, shininess: 160, transparent: true, opacity: 0.93 })
        );
        scene.add(mesh);
        const ring = new THREE.Mesh(
            new THREE.TorusGeometry(1.05, 0.012, 8, 64),
            new THREE.MeshBasicMaterial({ color: 0x06b6d4, transparent: true, opacity: 0.55 })
        );
        ring.rotation.x = Math.PI / 2.6; scene.add(ring);
        const ring2 = new THREE.Mesh(
            new THREE.TorusGeometry(0.9, 0.008, 8, 48),
            new THREE.MeshBasicMaterial({ color: 0xa78bfa, transparent: true, opacity: 0.3 })
        );
        ring2.rotation.x = -Math.PI / 3; ring2.rotation.z = Math.PI / 4; scene.add(ring2);
        let raf: number, alive = true;
        const tick = () => {
            if (!alive) return;
            raf = requestAnimationFrame(tick);
            mesh.rotation.y += 0.014; mesh.rotation.x += 0.006;
            ring.rotation.z += 0.008; ring2.rotation.y += 0.011;
            renderer.render(scene, camera);
        };
        tick();
        return () => { alive = false; cancelAnimationFrame(raf); renderer.dispose(); };
    }, []);
    return <canvas ref={ref} width={52} height={52} style={{ width: 52, height: 52 }} />;
}

// ─── WebGL: Cockpit Nebula (full-panel starfield + asteroids + constellations) ─
function CockpitNebula({ opacity = 0.5 }: { opacity?: number }) {
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
        const N = 900;
        const pos = new Float32Array(N * 3), col = new Float32Array(N * 3);
        const palette = [
            new THREE.Color(0x8b5cf6), new THREE.Color(0x06b6d4), new THREE.Color(0x10b981),
            new THREE.Color(0xffffff), new THREE.Color(0xf59e0b), new THREE.Color(0xf472b6),
        ];
        for (let i = 0; i < N; i++) {
            pos[i * 3] = (Math.random() - 0.5) * 30; pos[i * 3 + 1] = (Math.random() - 0.5) * 20; pos[i * 3 + 2] = (Math.random() - 0.5) * 8;
            const c = palette[Math.floor(Math.random() * palette.length)];
            col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
        }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
        const stars = new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.045, vertexColors: true, transparent: true, opacity: 0.82 }));
        scene.add(stars);
        const nodes: THREE.Vector3[] = [];
        for (let i = 0; i < 28; i++) {
            const p = new THREE.Vector3((Math.random() - 0.5) * 22, (Math.random() - 0.5) * 14, (Math.random() - 0.5) * 2);
            nodes.push(p);
            const m = new THREE.Mesh(new THREE.SphereGeometry(0.044, 6, 6), new THREE.MeshBasicMaterial({ color: 0x8b5cf6, transparent: true, opacity: 0.44 }));
            m.position.copy(p); scene.add(m);
        }
        for (let i = 0; i < nodes.length; i++) for (let j = i + 1; j < nodes.length; j++) {
            if (nodes[i].distanceTo(nodes[j]) < 5.5)
                scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([nodes[i], nodes[j]]), new THREE.LineBasicMaterial({ color: 0x8b5cf6, transparent: true, opacity: 0.065 })));
        }
        const asteroids: THREE.Mesh[] = [];
        for (let i = 0; i < 14; i++) {
            const g = i % 3 === 0 ? new THREE.IcosahedronGeometry(0.06 + Math.random() * 0.1, 0)
                : i % 3 === 1 ? new THREE.OctahedronGeometry(0.05 + Math.random() * 0.08, 0)
                    : new THREE.TetrahedronGeometry(0.05 + Math.random() * 0.07, 0);
            const c = palette[Math.floor(Math.random() * palette.length)];
            const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: c, wireframe: true, transparent: true, opacity: 0.22 }));
            m.position.set((Math.random() - 0.5) * 20, (Math.random() - 0.5) * 13, (Math.random() - 0.5) * 3);
            scene.add(m); asteroids.push(m);
        }
        window.addEventListener('resize', resize);
        let raf: number, alive = true;
        const tick = () => {
            if (!alive) return;
            raf = requestAnimationFrame(tick);
            stars.rotation.y += 0.00025; stars.rotation.x += 0.00008;
            asteroids.forEach((a, i) => { a.rotation.y += 0.007 + i * 0.0012; a.rotation.x += 0.004 + i * 0.0009; });
            renderer.render(scene, camera);
        };
        tick();
        return () => { alive = false; cancelAnimationFrame(raf); window.removeEventListener('resize', resize); renderer.dispose(); };
    }, []);
    return <canvas ref={ref} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', opacity }} />;
}

// ─── WebGL: Portfolio Orb ─────────────────────────────────────────────────────
function PortfolioOrb({ progress = 0.58 }: { progress?: number }) {
    const ref = useRef<HTMLCanvasElement>(null);
    useEffect(() => {
        const canvas = ref.current; if (!canvas) return;
        const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setSize(140, 140, false);
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 10);
        camera.position.z = 3.2;
        const pl = new THREE.PointLight(0x7c3aed, 3.5, 8); pl.position.set(0, 0, 2); scene.add(pl);
        const pl2 = new THREE.PointLight(0x06b6d4, 2, 7); pl2.position.set(2, -1, 1); scene.add(pl2);
        const pl3 = new THREE.PointLight(0x10b981, 1.5, 6); pl3.position.set(-2, 1, 0); scene.add(pl3);
        scene.add(new THREE.AmbientLight(0xffffff, 0.2));
        const sphere = new THREE.Mesh(
            new THREE.SphereGeometry(0.7, 36, 36),
            new THREE.MeshPhongMaterial({ color: 0x2d1b69, emissive: 0x7c3aed, emissiveIntensity: 0.35, shininess: 80, transparent: true, opacity: 0.92 })
        );
        scene.add(sphere);
        const wire = new THREE.Mesh(
            new THREE.SphereGeometry(0.88, 16, 12),
            new THREE.MeshBasicMaterial({ color: 0x8b5cf6, wireframe: true, transparent: true, opacity: 0.18 })
        );
        scene.add(wire);
        [-0.55, 0, 0.55].forEach((y, i) => {
            const rr = Math.sqrt(Math.max(0, 0.82 ** 2 - y ** 2));
            if (rr < 0.05) return;
            const ring = new THREE.Mesh(new THREE.TorusGeometry(rr, 0.006, 8, 56), new THREE.MeshBasicMaterial({ color: i === 1 ? 0x06b6d4 : 0xa78bfa, transparent: true, opacity: i === 1 ? 0.5 : 0.3 }));
            ring.position.y = y; ring.rotation.x = Math.PI / 2; scene.add(ring);
        });
        const grandRing = new THREE.Mesh(
            new THREE.TorusGeometry(1.1, 0.008, 8, 72),
            new THREE.MeshBasicMaterial({ color: 0xa78bfa, transparent: true, opacity: 0.25 })
        );
        grandRing.rotation.x = Math.PI / 2.2; scene.add(grandRing);
        const satColors = [0xfbbf24, 0x34d399, 0xf472b6];
        const sats: THREE.Mesh[] = [];
        satColors.forEach(c => {
            const s = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 8), new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 2.8 }));
            scene.add(s); sats.push(s);
        });
        let raf: number, alive = true, t = 0;
        const tick = () => {
            if (!alive) return;
            raf = requestAnimationFrame(tick); t += 0.018;
            sphere.rotation.y += 0.006; wire.rotation.y += 0.009; wire.rotation.x += 0.002;
            sats[0].position.set(Math.cos(t) * 1.28, Math.sin(t * 0.8) * 0.3, Math.sin(t) * 1.28);
            sats[1].position.set(Math.cos(t + 2.1) * 1.08, Math.sin(t * 1.1 + 1) * 0.45, Math.sin(t + 2.1) * 1.08);
            sats[2].position.set(Math.cos(t + 4.2) * 0.95, Math.sin(t * 0.7 + 2) * 0.6, Math.sin(t + 4.2) * 0.95);
            pl.position.x = Math.sin(t * 0.6) * 1.8; pl.position.y = Math.cos(t * 0.7) * 1.8;
            renderer.render(scene, camera);
        };
        tick();
        return () => { alive = false; cancelAnimationFrame(raf); renderer.dispose(); };
    }, [progress]);
    return <canvas ref={ref} width={140} height={140} style={{ width: 140, height: 140 }} />;
}

// ─── WebGL: Radar Sphere ──────────────────────────────────────────────────────
function RadarSphere() {
    const ref = useRef<HTMLCanvasElement>(null);
    useEffect(() => {
        const canvas = ref.current; if (!canvas) return;
        const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setSize(180, 180, false);
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 20);
        camera.position.z = 4.5;
        scene.add(new THREE.AmbientLight(0xffffff, 0.15));
        const pl = new THREE.PointLight(0x06b6d4, 4, 10); pl.position.set(2, 2, 2); scene.add(pl);
        const pl2 = new THREE.PointLight(0x8b5cf6, 2.5, 8); pl2.position.set(-2, -1, 1); scene.add(pl2);
        const core = new THREE.Mesh(
            new THREE.SphereGeometry(0.45, 28, 28),
            new THREE.MeshPhongMaterial({ color: 0x0e7490, emissive: 0x06b6d4, emissiveIntensity: 0.6, shininess: 120, transparent: true, opacity: 0.88 })
        );
        scene.add(core);
        const shell = new THREE.Mesh(
            new THREE.SphereGeometry(1.4, 20, 16),
            new THREE.MeshBasicMaterial({ color: 0x06b6d4, wireframe: true, transparent: true, opacity: 0.12 })
        );
        scene.add(shell);
        const orbitRadii = [0.8, 1.15, 1.55];
        const orbitMeshes: THREE.Mesh[] = [];
        const dealDots: { mesh: THREE.Mesh; orbit: number; speed: number; phase: number }[] = [];
        orbitRadii.forEach((r, oi) => {
            const ring = new THREE.Mesh(
                new THREE.TorusGeometry(r, 0.006, 8, 72),
                new THREE.MeshBasicMaterial({ color: [0x8b5cf6, 0x06b6d4, 0x10b981][oi], transparent: true, opacity: 0.38 })
            );
            ring.rotation.x = Math.PI / 2; ring.rotation.z = oi * 0.4; scene.add(ring); orbitMeshes.push(ring);
            const dotCount = [3, 4, 5][oi];
            for (let d = 0; d < dotCount; d++) {
                const dot = new THREE.Mesh(
                    new THREE.SphereGeometry(0.045, 8, 8),
                    new THREE.MeshStandardMaterial({ color: [0xa78bfa, 0x22d3ee, 0x34d399][oi], emissive: [0xa78bfa, 0x22d3ee, 0x34d399][oi], emissiveIntensity: 2 })
                );
                scene.add(dot);
                dealDots.push({ mesh: dot, orbit: r, speed: 0.4 + oi * 0.15 + d * 0.08, phase: (d / dotCount) * Math.PI * 2 });
            }
        });
        const sweep = new THREE.Mesh(
            new THREE.PlaneGeometry(3.2, 3.2),
            new THREE.MeshBasicMaterial({ color: 0x06b6d4, transparent: true, opacity: 0.06, side: THREE.DoubleSide })
        );
        scene.add(sweep);
        let raf: number, alive = true, t = 0;
        const tick = () => {
            if (!alive) return;
            raf = requestAnimationFrame(tick); t += 0.012;
            core.rotation.y += 0.008; shell.rotation.y += 0.004; shell.rotation.x += 0.002;
            orbitMeshes.forEach((o, i) => { o.rotation.z += [0.003, -0.004, 0.005][i]; });
            dealDots.forEach(d => {
                const angle = d.phase + t * d.speed;
                d.mesh.position.set(Math.cos(angle) * d.orbit, Math.sin(angle * 0.3) * 0.25, Math.sin(angle) * d.orbit);
            });
            sweep.rotation.y = t * 0.8;
            renderer.render(scene, camera);
        };
        tick();
        return () => { alive = false; cancelAnimationFrame(raf); renderer.dispose(); };
    }, []);
    return <canvas ref={ref} width={180} height={180} style={{ width: 180, height: 180 }} />;
}

// ─── WebGL: Sector Planet ─────────────────────────────────────────────────────
function SectorPlanet({ color, size = 52 }: { color: string; size?: number }) {
    const ref = useRef<HTMLCanvasElement>(null);
    useEffect(() => {
        const canvas = ref.current; if (!canvas) return;
        const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setSize(size, size, false);
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 10);
        camera.position.z = 2.8;
        const col = new THREE.Color(color);
        const pl = new THREE.PointLight(col, 3.5, 8); pl.position.set(1.5, 1.5, 1.5); scene.add(pl);
        scene.add(new THREE.AmbientLight(0xffffff, 0.18));
        const sphere = new THREE.Mesh(
            new THREE.SphereGeometry(0.72, 22, 22),
            new THREE.MeshPhongMaterial({ color: col.clone().multiplyScalar(0.4), emissive: col, emissiveIntensity: 0.28, shininess: 70, transparent: true, opacity: 0.92 })
        );
        scene.add(sphere);
        const ring = new THREE.Mesh(
            new THREE.TorusGeometry(1.05, 0.08, 4, 36),
            new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.22, side: THREE.DoubleSide })
        );
        ring.rotation.x = Math.PI / 2.5; scene.add(ring);
        let raf: number, alive = true;
        const tick = () => {
            if (!alive) return;
            raf = requestAnimationFrame(tick);
            sphere.rotation.y += 0.01; ring.rotation.z += 0.005;
            renderer.render(scene, camera);
        };
        tick();
        return () => { alive = false; cancelAnimationFrame(raf); renderer.dispose(); };
    }, [color, size]);
    return <canvas ref={ref} width={size} height={size} style={{ width: size, height: size }} />;
}

// ─── WebGL: Deal Flow Galaxy ──────────────────────────────────────────────────
function DealFlowGalaxy() {
    const ref = useRef<HTMLCanvasElement>(null);
    useEffect(() => {
        const canvas = ref.current; if (!canvas) return;
        const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false });
        renderer.setPixelRatio(1);
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(70, 1, 0.1, 100);
        camera.position.z = 5;
        const resize = () => {
            const w = canvas.clientWidth || 900, h = canvas.clientHeight || 500;
            renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
        };
        resize();
        const N = 700;
        const pos = new Float32Array(N * 3), col = new Float32Array(N * 3);
        for (let i = 0; i < N; i++) {
            const arm = i % 3;
            const t = (i / N) * Math.PI * 8;
            const r = 0.5 + (i / N) * 7;
            const spread = (Math.random() - 0.5) * 1.5;
            pos[i * 3] = Math.cos(t + arm * 2.09) * r + spread;
            pos[i * 3 + 1] = (Math.random() - 0.5) * 3 + spread * 0.5;
            pos[i * 3 + 2] = Math.sin(t + arm * 2.09) * r + spread;
            const palette = [[0.55, 0.36, 0.98], [0.02, 0.71, 0.83], [0.06, 0.73, 0.51]];
            const c = palette[arm];
            col[i * 3] = c[0]; col[i * 3 + 1] = c[1]; col[i * 3 + 2] = c[2];
        }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
        const points = new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.042, vertexColors: true, transparent: true, opacity: 0.7 }));
        scene.add(points);
        window.addEventListener('resize', resize);
        let raf: number, alive = true;
        const tick = () => { if (!alive) return; raf = requestAnimationFrame(tick); points.rotation.y += 0.0004; renderer.render(scene, camera); };
        tick();
        return () => { alive = false; cancelAnimationFrame(raf); window.removeEventListener('resize', resize); renderer.dispose(); };
    }, []);
    return <canvas ref={ref} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', opacity: 0.4 }} />;
}

// ─── WebGL: Document Comet per-doc icon ──────────────────────────────────────
function DocComet({ typeColor, docType }: { typeColor: string; docType: string }) {
    const uid = `dc${typeColor.replace(/[^a-z0-9]/gi, '')}${docType}`;
    const shapeMap: Record<string, React.ReactNode> = {
        Deck: <polygon points="26,8 44,22 26,44 8,22" fill={typeColor} opacity="0.88" />,
        Sheet: <rect x="10" y="10" width="32" height="32" rx="5" fill={typeColor} opacity="0.88" />,
        Doc: <polygon points="26,6 44,38 8,38" fill={typeColor} opacity="0.88" />,
        Bundle: <polygon points="26,4 46,16 46,36 26,48 6,36 6,16" fill={typeColor} opacity="0.88" />,
    };
    const shape = shapeMap[docType] || <polygon points="26,6 44,38 8,38" fill={typeColor} opacity="0.88" />;
    return (
        <div style={{ width: 52, height: 52, flexShrink: 0 }}>
            <svg width={52} height={52} viewBox="0 0 52 52">
                <defs>
                    <radialGradient id={`${uid}g`} cx="35%" cy="30%" r="70%">
                        <stop offset="0%" stopColor="white" stopOpacity="0.5" />
                        <stop offset="100%" stopColor={typeColor} stopOpacity="0" />
                    </radialGradient>
                    <style>{`@keyframes ${uid}spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}@keyframes ${uid}orb{from{transform:rotate(0deg)}to{transform:rotate(-360deg)}}.${uid}sh{transform-box:fill-box;transform-origin:center;animation:${uid}spin 7s linear infinite}.${uid}rg{transform-box:fill-box;transform-origin:center;animation:${uid}orb 3.5s linear infinite}`}</style>
                </defs>
                <circle cx="26" cy="26" r="22" fill={typeColor} opacity="0.07" />
                <g className={`${uid}sh`}>{shape}</g>
                <circle cx="26" cy="26" r="22" fill={`url(#${uid}g)`} />
                <g className={`${uid}rg`}>
                    <ellipse cx="26" cy="26" rx="24" ry="9" fill="none" stroke={typeColor} strokeWidth="1" opacity="0.55" />
                    <circle cx="50" cy="26" r="2.2" fill={typeColor} opacity="0.92" />
                </g>
            </svg>
        </div>
    );
}

// ─── WebGL: Network Star Map background ──────────────────────────────────────
function NetworkStarMap() {
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
        const N = 750;
        const pos = new Float32Array(N * 3), col = new Float32Array(N * 3);
        const starPal = [new THREE.Color(0xffd4a0), new THREE.Color(0xa0c4ff), new THREE.Color(0xffffff), new THREE.Color(0xc8a0ff), new THREE.Color(0xa0ffd4)];
        for (let i = 0; i < N; i++) {
            const arm = Math.floor(Math.random() * 3);
            const r = 0.5 + Math.random() * 9;
            const angle = (arm * (Math.PI * 2 / 3)) + r * 0.35 + (Math.random() - 0.5) * 0.6;
            pos[i * 3] = Math.cos(angle) * r + (Math.random() - 0.5) * 1.2;
            pos[i * 3 + 1] = Math.sin(angle) * r + (Math.random() - 0.5) * 1.2;
            pos[i * 3 + 2] = (Math.random() - 0.5) * 1.8;
            const c = starPal[Math.floor(Math.random() * starPal.length)];
            col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
        }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
        const galaxy = new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.055, vertexColors: true, transparent: true, opacity: 0.8 }));
        scene.add(galaxy);
        scene.add(new THREE.Mesh(new THREE.SphereGeometry(0.25, 16, 16), new THREE.MeshBasicMaterial({ color: 0xffd4a0, transparent: true, opacity: 0.3 })));
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
        let raf: number, alive = true;
        const tick = () => { if (!alive) return; raf = requestAnimationFrame(tick); galaxy.rotation.z += 0.00016; renderer.render(scene, camera); };
        tick();
        return () => { alive = false; cancelAnimationFrame(raf); window.removeEventListener('resize', resize); renderer.dispose(); };
    }, []);
    return <canvas ref={ref} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', opacity: 0.45 }} />;
}

// ─── WebGL: Deployment Galaxy ─────────────────────────────────────────────────
function DeploymentGalaxy() {
    const ref = useRef<HTMLCanvasElement>(null);
    useEffect(() => {
        const canvas = ref.current; if (!canvas) return;
        const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false });
        renderer.setPixelRatio(1);
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(65, 1, 0.1, 100);
        camera.position.z = 5;
        const resize = () => {
            const w = canvas.clientWidth || 900, h = canvas.clientHeight || 500;
            renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
        };
        resize();
        const N = 520;
        const pos = new Float32Array(N * 3), col = new Float32Array(N * 3);
        const palette = [new THREE.Color(0x8b5cf6), new THREE.Color(0x10b981), new THREE.Color(0x06b6d4), new THREE.Color(0xfbbf24)];
        for (let i = 0; i < N; i++) {
            pos[i * 3] = (Math.random() - 0.5) * 26; pos[i * 3 + 1] = (Math.random() - 0.5) * 17; pos[i * 3 + 2] = (Math.random() - 0.5) * 6;
            const c = palette[i % palette.length];
            col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
        }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
        const pts = new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.04, vertexColors: true, transparent: true, opacity: 0.65 }));
        scene.add(pts);
        window.addEventListener('resize', resize);
        let raf: number, alive = true;
        const tick = () => { if (!alive) return; raf = requestAnimationFrame(tick); pts.rotation.y += 0.0003; renderer.render(scene, camera); };
        tick();
        return () => { alive = false; cancelAnimationFrame(raf); window.removeEventListener('resize', resize); renderer.dispose(); };
    }, []);
    return <canvas ref={ref} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', opacity: 0.38 }} />;
}

// ─── WebGL: Insights Nebula ───────────────────────────────────────────────────
function InsightsNebula() {
    const ref = useRef<HTMLCanvasElement>(null);
    useEffect(() => {
        const canvas = ref.current; if (!canvas) return;
        const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false });
        renderer.setPixelRatio(1);
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
        camera.position.z = 5;
        const resize = () => { const w = canvas.clientWidth || 900, h = canvas.clientHeight || 500; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); };
        resize();
        const N = 480;
        const pos = new Float32Array(N * 3), col = new Float32Array(N * 3);
        for (let i = 0; i < N; i++) {
            pos[i * 3] = (Math.random() - 0.5) * 22; pos[i * 3 + 1] = (Math.random() - 0.5) * 14; pos[i * 3 + 2] = (Math.random() - 0.5) * 4;
            const cols = [[0.55, 0.36, 0.98], [0.06, 0.71, 0.83], [0.98, 0.62, 0.04]];
            const c = cols[i % 3];
            col[i * 3] = c[0]; col[i * 3 + 1] = c[1]; col[i * 3 + 2] = c[2];
        }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
        const pts = new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.038, vertexColors: true, transparent: true, opacity: 0.6 }));
        scene.add(pts);
        window.addEventListener('resize', resize);
        let raf: number, alive = true;
        const tick = () => { if (!alive) return; raf = requestAnimationFrame(tick); pts.rotation.y += 0.00035; pts.rotation.x += 0.00012; renderer.render(scene, camera); };
        tick();
        return () => { alive = false; cancelAnimationFrame(raf); window.removeEventListener('resize', resize); renderer.dispose(); };
    }, []);
    return <canvas ref={ref} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', opacity: 0.42 }} />;
}

// ─── Glass card factory ───────────────────────────────────────────────────────
const G = (extra?: React.CSSProperties): React.CSSProperties => ({
    borderRadius: 18,
    border: '1px solid rgba(255,255,255,0.07)',
    background: 'rgba(255,255,255,0.026)',
    overflow: 'hidden',
    ...(extra || {}),
});

// ─── Main Scout Page ───────────────────────────────────────────────────────────
function ScoutPage() {
    const { user, isLoading: authLoading } = useAuth();
    const isAdmin = user?.role === 'admin';
    const navigate = useNavigate();
    const [tab, setTab] = useState('cockpit');
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    useEffect(() => {
        const check = () => setIsMobile(window.innerWidth < 768);
        check();
        window.addEventListener('resize', check);
        return () => window.removeEventListener('resize', check);
    }, []);
    const [scoutSearch, setScoutSearch] = useState('');
    const [searchOpen, setSearchOpen] = useState(false);
    // Result picked from global search → surface (and highlight) that item in its tab.
    // `pinned` controls ORDER (stays at top until the next search). `focus` controls the
    // one-time glow animation only and auto-clears — keeping the two separate is what makes
    // the surfaced item STAY at the top instead of dropping back after the glow ends.
    const [pinned, setPinned] = useState<{ kind: string; key: string } | null>(null);
    const [focus, setFocus] = useState<{ kind: string; key: string } | null>(null);
    const [dealSectors, setDealSectors] = useState<string[]>([]); // empty = all sectors
    const [dealSectorOpen, setDealSectorOpen] = useState(false);
    const dealSectorRef = useRef<HTMLDivElement>(null);
    const [eventType, setEventType] = useState('All');
    const [selectedStartupId, setSelectedStartupId] = useState('st-6');
    const [shortlisted, setShortlisted] = useState<string[]>(['st-2', 'st-3', 'st-6']);
    const [revokeTarget, setRevokeTarget] = useState<any | null>(null);
    const [revokeReason, setRevokeReason] = useState('');
    const [watchedEvents, setWatchedEvents] = useState<string[]>([]);
    const [registeredEvents, setRegisteredEvents] = useState<string[]>([]);
    const [regEvent, setRegEvent] = useState<typeof ALL_EVENTS[0] | null>(null);
    const [regName, setRegName] = useState('');
    const [events, setEvents] = useState(ALL_EVENTS);
    // ── Add Event (organiser submission → admin approval) ──
    const [addEventOpen, setAddEventOpen] = useState(false);
    const [addEventStep, setAddEventStep] = useState<1 | 2>(1);
    const [addEventSubmitting, setAddEventSubmitting] = useState(false);
    const [addEventDone, setAddEventDone] = useState(false);
    const [addEventErrors, setAddEventErrors] = useState<Record<string, string>>({});
    const [addEventForm, setAddEventForm] = useState({
        title: '', type: 'Demo Day', date: '', time: '', locationMode: 'physical',
        location: '', description: '', maxCapacity: '', prize: '', registrationDeadline: '',
        applicationRequired: false, organiserName: '', organiserEmail: '', organiserOrg: '',
    });
    const resetAddEvent = () => {
        setAddEventOpen(false); setAddEventStep(1); setAddEventDone(false); setAddEventErrors({});
        setAddEventForm({ title: '', type: 'Demo Day', date: '', time: '', locationMode: 'physical', location: '', description: '', maxCapacity: '', prize: '', registrationDeadline: '', applicationRequired: false, organiserName: '', organiserEmail: '', organiserOrg: '' });
    };
    const [msgOpen, setMsgOpen] = useState<typeof NETWORK_CONTACTS[0] | null>(null);
    const [msgText, setMsgText] = useState('');
    const [scheduleOpen, setScheduleOpen] = useState<typeof NETWORK_CONTACTS[0] | null>(null);
    const [scheduleForm, setScheduleForm] = useState({ date: '', time: '', topic: '' });
    const [registerOpen, setRegisterOpen] = useState(false);
    const [mandate, setMandate] = useState<Record<string, string>>({});
    const [mandateSubmitting, setMandateSubmitting] = useState(false);
    const [mandateErr, setMandateErr] = useState<Record<string, string>>({});
    const [vcList, setVcList] = useState<any[]>(VC_SEED);
    const [vcRemoveTarget, setVcRemoveTarget] = useState<any | null>(null);
    const [vcRemoveReason, setVcRemoveReason] = useState('');
    const [vcRemoveError, setVcRemoveError] = useState('');
    const [insightSectors, setInsightSectors] = useState<string[]>([]); // empty = all sectors
    const [insightSectorOpen, setInsightSectorOpen] = useState(false);
    const insightSectorRef = useRef<HTMLDivElement>(null);
    const [drSelectOpen, setDrSelectOpen] = useState(false); // Diligence Room "Viewing" custom dropdown (mobile)
    const drSelectRef = useRef<HTMLDivElement>(null);
    const [ddFilterOpen, setDdFilterOpen] = useState(false); // Demo Days event-type filter custom dropdown (mobile)
    const ddFilterRef = useRef<HTMLDivElement>(null);
    const [startups, setStartups] = useState(ALL_STARTUPS);
    const [accessRequests, setAccessRequests] = useState<string[]>([]);
    const [viewedDocs, setViewedDocs] = useState<string[]>([]);
    const [mandateGate, setMandateGate] = useState(false);
    // Diligence vault docs — seeded with demo corporate decks, then merged with live
    // `investor` (corporate pitch) documents uploaded from the Explore Hub Brand Vault.
    const [diligenceDocs, setDiligenceDocs] = useState<any[]>(DILIGENCE_DOCS);
    // Diligence audit log — populated by real investor actions (view / request / download),
    // persisted to Supabase and reloaded on mount. Not hardcoded.
    const [auditLog, setAuditLog] = useState<any[]>([]);
    const [docOpen, setDocOpen] = useState<any | null>(null);
    const [notifOpen, setNotifOpen] = useState(false);
    const [toast, setToast] = useState<{ msg: string; color: string } | null>(null);
    const showToast = (msg: string, color = '#06b6d4') => setToast({ msg, color });
    const notifRef = useRef<HTMLDivElement>(null);
    const searchRef = useRef<HTMLDivElement>(null);

    // Shortlisting → notify the admin (and on revoke, send the stated reason)
    const postShortlistEvent = async (action: 'shortlisted' | 'revoked', s: any, reason?: string) => {
        try {
            await fetch('/api/vc/shortlist', {
                method: 'POST', credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action, startup_id: s.id, startup_name: s.name, reason: reason ?? null, vc_firm: VC_PROFILE.firm }),
            });
        } catch { /* best-effort notification */ }
    };
    const shortlistStartup = (s: any) => {
        setShortlisted(prev => prev.includes(s.id) ? prev : [...prev, s.id]);
        postShortlistEvent('shortlisted', s);
        showToast(`Shortlisted ${s.name} — admin notified`, '#10b981');
    };
    const confirmRevoke = () => {
        const s = revokeTarget;
        const reason = revokeReason.trim();
        if (!s || !reason) return;
        setShortlisted(prev => prev.filter(x => x !== s.id));
        postShortlistEvent('revoked', s, reason);
        setRevokeTarget(null); setRevokeReason('');
        showToast(`Removed ${s.name} from shortlist — admin notified`, '#f59e0b');
    };

    // Record a live diligence action → optimistic prepend, then persist to Supabase
    const logAudit = async (action: 'Viewed' | 'Requested' | 'Downloaded', doc: any) => {
        if (!doc) return;
        const tmpId = `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        const optimistic = { id: tmpId, action, doc: doc.name, at: fmtAuditTime(new Date().toISOString()), by: VC_PROFILE.name };
        setAuditLog(prev => [optimistic, ...prev].slice(0, 50));
        try {
            const res = await fetch('/api/vc/audit', {
                method: 'POST', credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action, doc_id: doc.id, doc_name: doc.name, startup: doc.startup, actor: VC_PROFILE.name }),
            });
            const data = await res.json().catch(() => ({}));
            if (data?.event) {
                // swap the optimistic row for the persisted one (real id + server timestamp)
                setAuditLog(prev => [mapAuditRow(data.event), ...prev.filter(e => e.id !== tmpId)].slice(0, 50));
            }
        } catch { /* keep optimistic entry */ }
    };

    // Load the persisted audit trail for this fund on mount
    useEffect(() => {
        let alive = true;
        (async () => {
            try {
                const res = await fetch('/api/vc/audit', { credentials: 'include' });
                const data = await res.json().catch(() => ({}));
                if (alive && Array.isArray(data?.events) && data.events.length) {
                    setAuditLog(data.events.map(mapAuditRow));
                }
            } catch { /* no persisted events yet */ }
        })();
        return () => { alive = false; };
    }, []);

    // auto-dismiss toast
    useEffect(() => {
        if (!toast) return;
        const t = setTimeout(() => setToast(null), 2600);
        return () => clearTimeout(t);
    }, [toast]);

    // clear the search-focus highlight after it has played
    useEffect(() => {
        if (!focus) return;
        const t = setTimeout(() => setFocus(null), 4500);
        return () => clearTimeout(t);
    }, [focus]);

    // Load the public VC directory (merge live verified VCs over the seed)
    const loadVCs = async () => {
        try {
            const res = await fetch('/api/vc/list', { credentials: 'include' });
            const data = await res.json().catch(() => ({}));
            if (Array.isArray(data?.vcs) && data.vcs.length) {
                const seen = new Set<string>();
                const merged = [...data.vcs, ...VC_SEED].filter(v => {
                    const k = (v.firm_name || '').toLowerCase();
                    if (seen.has(k)) return false; seen.add(k); return true;
                });
                setVcList(merged);
            }
        } catch { /* keep seed */ }
    };
    useEffect(() => { loadVCs(); }, []);

    // Close any open investor-card menu when clicking elsewhere on the page.
    useEffect(() => {
        const closeMenus = (e: MouseEvent) => {
            if ((e.target as HTMLElement).closest('.iv-menu-trigger')) return;
            document.querySelectorAll('.iv-menu').forEach(m => { (m as HTMLElement).style.display = 'none'; });
        };
        document.addEventListener('click', closeMenus);
        return () => document.removeEventListener('click', closeMenus);
    }, []);

    // Removes a fund from the Department Network — self-removal by the owning investor,
    // or by an admin acting on anyone's listing. Both require a stated reason.
    const performRemoveVC = (vc: any, reason: string) => {
        setVcList(prev => prev.filter(v => (v.firm_name || '').toLowerCase() !== (vc.firm_name || '').toLowerCase()));
        fetch('/api/vc/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ email: vc.email, firm_name: vc.firm_name, reason }),
        }).then(async res => {
            if (!res.ok) { showToast('Could not remove that listing.', '#f87171'); loadVCs(); }
            else showToast(`Removed ${vc.firm_name} from the Department Network`, '#f59e0b');
        }).catch(() => { showToast('Could not remove that listing.', '#f87171'); loadVCs(); });
    };

    // Gate check — user must have a registered VC mandate to use elite investor actions
    const [hasMandate, setHasMandate] = useState(false);
    const [myProfile, setMyProfile] = useState<any>(null);
    // Loads the signed-in user's own registered mandate. The server wraps the
    // row in { profile }, so we must read d.profile (not d) to detect it.
    const loadMyMandate = async () => {
        if (!user?.email) { setHasMandate(false); setMyProfile(null); return; }
        try {
            const r = await fetch('/api/vc/mandate', { credentials: 'include' });
            if (!r.ok) return;
            const d = await r.json() as { profile?: any };
            if (d?.profile?.firm_name) { setHasMandate(true); setMyProfile(d.profile); }
            else { setHasMandate(false); setMyProfile(null); }
        } catch { /* keep prior state */ }
    };
    useEffect(() => { loadMyMandate(); }, [user?.email]);
    const requireMandate = (fn: () => void) => { if (hasMandate) { fn(); } else { setMandateGate(true); } };

    // Load startups uploaded in the Explore Hub so they appear in the Scout selector / diligence room
    useEffect(() => {
        let alive = true;
        (async () => {
            try {
                const { data, error } = await supabase
                    .from('startups')
                    .select('*')
                    .order('created_at', { ascending: false });
                if (!alive || error || !data?.length) return;
                const loaded = data.filter((s: any) => (s.status ?? 'approved') === 'approved').map(mapStartupRow);
                // Live startups first, then the demo seed (dedupe by name)
                setStartups(prev => {
                    const seen = new Set(loaded.map(s => s.name.toLowerCase()));
                    return [...loaded, ...prev.filter(s => !seen.has(s.name.toLowerCase()))];
                });
            } catch { /* keep seed */ }
        })();
        return () => { alive = false; };
    }, []);

    // Load live Corporate Pitch Decks (deck_type = 'investor') from the shared documents table.
    // Founders upload these via the Explore Hub Brand Vault → they surface in this diligence room.
    useEffect(() => {
        let alive = true;
        (async () => {
            try {
                const { data, error } = await supabase
                    .from('documents')
                    .select('*')
                    .eq('deck_type', 'investor')
                    .order('created_at', { ascending: false });
                if (!alive || error || !data?.length) return;
                const liveDocs = data
                    .filter((row: any) => row.startup_name) // must be linked to a startup to show under it
                    .map(mapInvestorDoc);
                if (!liveDocs.length) return;
                setDiligenceDocs(prev => {
                    const liveNames = new Set(liveDocs.map(d => d.name.toLowerCase()));
                    // live uploads first, drop any demo seed with the same name
                    return [...liveDocs, ...prev.filter(d => !liveNames.has(d.name.toLowerCase()))];
                });
            } catch { /* keep seed */ }
        })();
        return () => { alive = false; };
    }, []);

    // close popovers on outside click (reliable across transform/backdrop-filter ancestors)
    useEffect(() => {
        if (!notifOpen && !searchOpen && !dealSectorOpen && !insightSectorOpen && !drSelectOpen && !ddFilterOpen) return;
        const onDown = (e: MouseEvent) => {
            const t = e.target as Node;
            if (notifOpen && notifRef.current && !notifRef.current.contains(t)) setNotifOpen(false);
            if (searchOpen && searchRef.current && !searchRef.current.contains(t)) setSearchOpen(false);
            if (dealSectorOpen && dealSectorRef.current && !dealSectorRef.current.contains(t)) setDealSectorOpen(false);
            if (insightSectorOpen && insightSectorRef.current && !insightSectorRef.current.contains(t)) setInsightSectorOpen(false);
            if (drSelectOpen && drSelectRef.current && !drSelectRef.current.contains(t)) setDrSelectOpen(false);
            if (ddFilterOpen && ddFilterRef.current && !ddFilterRef.current.contains(t)) setDdFilterOpen(false);
        };
        document.addEventListener('mousedown', onDown);
        return () => document.removeEventListener('mousedown', onDown);
    }, [notifOpen, searchOpen, dealSectorOpen, insightSectorOpen, drSelectOpen, ddFilterOpen]);

    useEffect(() => {
        const channel = supabase
            .channel('scout-live')
            // Existing startup edits (stage/raise changes) update in place
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'startups' }, (payload) => {
                setStartups(prev => prev.map(s => s.id === payload.new.id ? { ...s, ...payload.new } : s));
            })
            // A new startup added in the Explore Hub shows up live in the selector
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'startups' }, (payload) => {
                const mapped = mapStartupRow(payload.new);
                setStartups(prev => {
                    const key = (mapped.name || '').toLowerCase();
                    if (prev.some(s => s.id === mapped.id || (s.name || '').toLowerCase() === key)) return prev;
                    return [mapped, ...prev];
                });
            })
            // A new Corporate Pitch Deck (deck_type='investor') uploaded from the Brand Vault
            // pops into the diligence room without a refresh
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'documents' }, (payload) => {
                const row: any = payload.new;
                if (row?.deck_type !== 'investor' || !row?.startup_name) return;
                const mapped = mapInvestorDoc(row);
                setDiligenceDocs(prev => {
                    const key = (mapped.name || '').toLowerCase();
                    const next = prev.filter(d => d.id !== mapped.id && (d.name || '').toLowerCase() !== key);
                    return [mapped, ...next];
                });
                showToast(`New corporate deck — ${row.name}`, '#06b6d4');
            })
            // Edited corporate decks (e.g. re-upload / status change) update in place
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'documents' }, (payload) => {
                const row: any = payload.new;
                if (row?.deck_type !== 'investor' || !row?.startup_name) return;
                const mapped = mapInvestorDoc(row);
                setDiligenceDocs(prev => prev.map(d => d.id === mapped.id ? { ...d, ...mapped } : d));
            })
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, []);

    // ── Global search across all 5 domains — each result routes to its own tab ──
    const searchGroups = useMemo(() => {
        const q = scoutSearch.trim().toLowerCase();
        if (!q) return [] as any[];
        const startupHits = startups.filter(s =>
            s.name.toLowerCase().includes(q) || (s.tagline || '').toLowerCase().includes(q) || s.industry.toLowerCase().includes(q)
        ).slice(0, 6);
        const founderHits = NETWORK_CONTACTS.filter(c =>
            c.name.toLowerCase().includes(q) || c.role.toLowerCase().includes(q) || c.company.toLowerCase().includes(q)
        ).slice(0, 6);
        const deckHits = diligenceDocs.filter(d =>
            (d.name || '').toLowerCase().includes(q) || (d.type || '').toLowerCase().includes(q) || (d.startup || '').toLowerCase().includes(q)
        ).slice(0, 6);
        const investorHits = vcList.filter(v =>
            (v.firm_name || '').toLowerCase().includes(q) || (v.partner_name || '').toLowerCase().includes(q) || (v.sectors || '').toLowerCase().includes(q)
        ).slice(0, 6);
        const eventHits = events.filter(e =>
            (e.title || '').toLowerCase().includes(q) || (e.type || '').toLowerCase().includes(q) || (e.location || '').toLowerCase().includes(q)
        ).slice(0, 6);
        return [
            { kind: 'startup', label: 'Startups', dest: 'Challenge Pipeline', color: '#8b5cf6', items: startupHits },
            { kind: 'deck', label: 'Documents', dest: 'Diligence Room', color: '#10b981', items: deckHits },
            { kind: 'founder', label: 'Founders', dest: 'Startup Network', color: '#06b6d4', items: founderHits },
            { kind: 'investor', label: 'Departments', dest: 'Department Network', color: '#f59e0b', items: investorHits },
            { kind: 'event', label: 'Demo Days', dest: 'Demo Days', color: '#f472b6', items: eventHits },
        ].filter(g => g.items.length);
    }, [scoutSearch, startups, diligenceDocs, vcList, events]);
    const searchTotal = useMemo(() => searchGroups.reduce((a, g) => a + g.items.length, 0), [searchGroups]);

    // Route a chosen result to its tab and flag it to be surfaced/highlighted there
    const handleSearchPick = (kind: string, item: any) => {
        setSearchOpen(false); setScoutSearch('');
        // The key identifies the item within its list. `pinned` keeps it at the top until the
        // NEXT pick replaces it; `focus` fires the glow once and then clears itself.
        const key = kind === 'investor' ? (item.firm_name || '').toLowerCase() : item.id;
        setPinned({ kind, key });
        setFocus({ kind, key });
        if (kind === 'startup') { setDealSectors([]); setTab('dealflow'); }
        else if (kind === 'founder') { setTab('network'); }
        else if (kind === 'deck') {
            const st = startups.find(s => s.name === item.startup);
            if (st) setSelectedStartupId(st.id);
            setTab('diligence');
        }
        else if (kind === 'investor') { setTab('vcnetwork'); }
        else if (kind === 'event') { setEventType('All'); setTab('demodays'); }
    };

    // Move a focused item to the front of its list so it shows first in the target tab
    const bringToFront = (arr: any[], matchFn: (x: any) => boolean) => {
        const i = arr.findIndex(matchFn);
        if (i <= 0) return arr;
        const copy = arr.slice();
        copy.unshift(copy.splice(i, 1)[0]);
        return copy;
    };

    // ── Derived (id-based, reads live `startups` state so realtime updates render) ──
    const selectedStartupObj = startups.find(s => s.id === selectedStartupId) ?? startups[0];
    const selectedStartupName = selectedStartupObj?.name ?? '';

    const filteredDeals = useMemo(() =>
        startups.filter(s =>
            (dealSectors.length === 0 || dealSectors.includes(s.industry)) &&
            (scoutSearch === '' || s.name.toLowerCase().includes(scoutSearch.toLowerCase()))
        ), [startups, dealSectors, scoutSearch]);

    const filteredEvents = useMemo(() =>
        events.filter(e => eventType === 'All' || e.type === eventType),
        [events, eventType]);

    const totalDeployed = DEPLOYMENTS.reduce((a, c) => a + c.amount, 0);
    const dryPowder = VC_PROFILE.dryPowder;
    const activePipeline = startups.filter(s => shortlisted.includes(s.id)).reduce((a, c) => a + c.fundingGoal, 0);
    const deployedPct = totalDeployed / (totalDeployed + dryPowder);

    const actionFeed = useMemo(() => [
        { id: 'f1', icon: '🔭', msg: 'JalRakshak cut non-revenue water 34% — validation passed', time: '4m ago', color: '#8b5cf6' },
        { id: 'f2', icon: '📡', msg: 'New applicant: FasalSetu · Agriculture · Applied stage', time: '22m ago', color: '#06b6d4' },
        { id: 'f3', icon: '⚡', msg: 'GridSense cleared CERT-In security audit', time: '1h ago', color: '#10b981' },
        { id: 'f4', icon: '🌌', msg: 'CivicLens requested access to ward GIS dataset', time: '3h ago', color: '#f59e0b' },
        { id: 'f5', icon: '💫', msg: 'Demo Day 2026 · 12 new RSVPs from departments', time: '5h ago', color: '#34d399' },
        { id: 'f6', icon: '🛸', msg: 'TransitIQ mid-term KPI demo cleared — tranche 2 released', time: '8h ago', color: '#8b5cf6' },
    ], []);

    const TABS = [
        // NOTE: tab ids are load-bearing (routing, deep links, chatbot context in
        // src/lib/knowledge.ts). Only the labels change.
        { id: 'cockpit', label: 'Procurement Cockpit', icon: LayoutDashboard },
        { id: 'dealflow', label: 'Challenge Pipeline', icon: GitBranch },
        { id: 'diligence', label: 'Evaluation Room', icon: FolderKey },
        { id: 'network', label: 'Startup Network', icon: Users },
        { id: 'vcnetwork', label: 'Department Network', icon: UserPlus },
        { id: 'demodays', label: 'Demo Days', icon: CalendarDays },
        { id: 'insights', label: 'Outcome Insights', icon: BarChart3 },
        { id: 'deployment', label: 'Deployment Tracker', icon: DollarSign },
    ];

    useEffect(() => {
        const activeLabel = TABS.find(t => t.id === tab)?.label || 'Overview';
        document.body.setAttribute('data-active-tab', tab);
        document.body.setAttribute('data-active-section', activeLabel);
        return () => {
            document.body.removeAttribute('data-active-tab');
            document.body.removeAttribute('data-active-section');
        };
    }, [tab]);

    if (!authLoading && !user) return <AuthGate />;

    return (
        <div style={{ display: 'flex', height: '100dvh', background: '#050509', color: 'white', fontFamily: 'Inter, system-ui, sans-serif', overflow: 'hidden' }}>

            {/* Mobile sidebar overlay */}
            <div
                className={`scout-sidebar-overlay${sidebarOpen ? ' open' : ''}`}
                onClick={() => setSidebarOpen(false)}
            />

            <style>{`
        .sc-scroll::-webkit-scrollbar{width:3px}
        .sc-scroll::-webkit-scrollbar-track{background:transparent}
        .sc-scroll::-webkit-scrollbar-thumb{background:rgba(139,92,246,.35);border-radius:99px}
        .sc-btn{transition:all .18s ease}
        .sc-btn:hover{transform:translateY(-1px)}
        .sc-card{transition:box-shadow .22s,border-color .22s,transform .18s}
        .sc-card:hover{transform:translateY(-2px)}
        @keyframes sc-search-focus{0%{box-shadow:0 0 0 0 rgba(6,182,212,.55),0 0 26px rgba(6,182,212,.45)}50%{box-shadow:0 0 0 2px rgba(6,182,212,.9),0 0 34px rgba(6,182,212,.6)}100%{box-shadow:0 0 0 0 rgba(6,182,212,0),0 0 0 rgba(6,182,212,0)}}
        .search-focus{animation:sc-search-focus 1.6s ease-in-out 2;position:relative;z-index:3}
        @keyframes sc-pulse2{0%,100%{opacity:.5;transform:scale(1)}50%{opacity:1;transform:scale(1.05)}}
        @keyframes sc-glow{0%,100%{box-shadow:0 0 8px rgba(139,92,246,.3)}50%{box-shadow:0 0 22px rgba(139,92,246,.7)}}
        @keyframes sc-drift{0%,100%{transform:translate(0,0) rotate(0deg)}33%{transform:translate(12px,-10px) rotate(2deg)}66%{transform:translate(-8px,8px) rotate(-1.5deg)}}
        @keyframes sc-float2{0%,100%{transform:translateY(0px)}50%{transform:translateY(-8px)}}
        @keyframes sc-spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        @keyframes sc-rspin{from{transform:rotate(0deg)}to{transform:rotate(-360deg)}}
        @keyframes sc-morph{0%,100%{border-radius:60% 40% 30% 70%/60% 30% 70% 40%}50%{border-radius:30% 60% 70% 40%/50% 60% 30% 60%}}
        @keyframes sc-flow{0%{background-position:-80% 0}100%{background-position:180% 0}}
        @keyframes sc-rise{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        @keyframes sc-scan{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}
        @keyframes sc-toast-in{from{opacity:0;transform:translateX(-50%) translateY(12px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}
        .notif-scroll{scrollbar-width:thin;scrollbar-color:#1e3a8a transparent}
        .notif-scroll::-webkit-scrollbar{width:5px}
        .notif-scroll::-webkit-scrollbar-track{background:transparent}
        .notif-scroll::-webkit-scrollbar-thumb{background:linear-gradient(180deg,#1e40af,#172554);border-radius:999px}
        .notif-scroll::-webkit-scrollbar-thumb:hover{background:linear-gradient(180deg,#2563eb,#1e3a8a)}
        .sc-badge{display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:999px;font-size:9px;font-weight:700;letter-spacing:.05em;text-transform:uppercase}
        .sc-active-tab{background:rgba(139,92,246,.22)!important;border-color:rgba(139,92,246,.45)!important;color:#a78bfa!important}
        .sc-stat-val{font-size:22px;font-weight:800;letter-spacing:-.02em;line-height:1}
      `}</style>

            {/* ══ SIDEBAR ══ */}
            <aside className={`scout-sidebar${sidebarOpen ? ' open' : ''}`} style={{
                width: 228, flexShrink: 0, display: 'flex', flexDirection: 'column',
                borderRight: '1px solid rgba(255,255,255,0.07)',
                background: 'rgba(3,3,12,0.88)', backdropFilter: 'blur(28px)',
                position: 'relative', overflow: 'hidden',
            }}>
                <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', top: -60, left: -40, width: 220, height: 220, borderRadius: '50%', background: 'radial-gradient(circle,rgba(139,92,246,.09),transparent 70%)', animation: 'sc-drift 12s ease-in-out infinite' }} />
                    <div style={{ position: 'absolute', bottom: 60, right: -30, width: 160, height: 160, borderRadius: '50%', background: 'radial-gradient(circle,rgba(6,182,212,.07),transparent 70%)', animation: 'sc-drift 15s ease-in-out infinite reverse' }} />
                </div>

                {/* Back to Sanyog */}
                <div style={{ position: 'relative', zIndex: 1, padding: '10px 12px 8px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <button
                        onClick={() => navigate({ to: '/' })}
                        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 10, cursor: 'pointer', background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)', color: 'rgba(255,255,255,.45)', textAlign: 'left', transition: 'all .18s' }}
                        onMouseEnter={e => { const b = e.currentTarget; b.style.background = 'rgba(139,92,246,.12)'; b.style.borderColor = 'rgba(139,92,246,.38)'; b.style.color = '#a78bfa'; }}
                        onMouseLeave={e => { const b = e.currentTarget; b.style.background = 'rgba(255,255,255,.04)'; b.style.borderColor = 'rgba(255,255,255,.08)'; b.style.color = 'rgba(255,255,255,.45)'; }}
                    >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, opacity: .7 }}>
                            <polyline points="15 18 9 12 15 6" />
                        </svg>
                        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.04em' }}>Sanyog</span>
                        <span style={{ marginLeft: 'auto', fontSize: 9, fontWeight: 600, color: 'rgba(255,255,255,.25)', letterSpacing: '.06em', textTransform: 'uppercase' }}>Home</span>
                    </button>
                </div>

                {/* Logo + live badge */}
                <div style={{ position: 'relative', zIndex: 1, padding: '16px 18px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                        <TelescopeCrystal />
                        <div>
                            <div style={{ fontSize: 14, fontWeight: 800, letterSpacing: '.06em', textTransform: 'uppercase', color: 'white', lineHeight: 1.2 }}>Scout Hub</div>
                            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: 'rgba(139,92,246,.85)' }}>Department Portal</div>
                        </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', borderRadius: 10, background: 'rgba(139,92,246,.1)', border: '1px solid rgba(139,92,246,.22)' }}>
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 6px #10b981', animation: 'sc-pulse2 2.2s ease-in-out infinite' }} />
                        <span style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,.6)', letterSpacing: '.06em' }}>LIVE DEAL TRACKING</span>
                    </div>
                </div>

                {/* Nav items */}
                <nav style={{ flex: 1, padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto', position: 'relative', zIndex: 1 }}>
                    {TABS.map(t => {
                        const Icon = t.icon; const active = tab === t.id;
                        return (
                            <button key={t.id} onClick={() => { setTab(t.id); setSidebarOpen(false); }} className="sc-btn" style={{
                                display: 'flex', alignItems: 'center', gap: 10, padding: '9px 11px', borderRadius: 12,
                                background: active ? 'rgba(139,92,246,.2)' : 'transparent',
                                border: `1px solid ${active ? 'rgba(139,92,246,.42)' : 'transparent'}`,
                                color: active ? '#a78bfa' : 'rgba(255,255,255,.38)', cursor: 'pointer', textAlign: 'left',
                                boxShadow: active ? '0 0 18px rgba(139,92,246,.22),inset 0 0 12px rgba(139,92,246,.06)' : 'none',
                                width: '100%', position: 'relative', overflow: 'hidden',
                            }}>
                                {active && <div style={{ position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)', width: 3, height: '60%', background: '#a78bfa', borderRadius: '0 3px 3px 0', boxShadow: '0 0 8px rgba(167,139,250,.8)' }} />}
                                <Icon style={{ width: 14, height: 14, flexShrink: 0 }} />
                                <span style={{ fontSize: 12, fontWeight: active ? 700 : 500 }}>{t.label}</span>
                                {active && <div style={{ marginLeft: 'auto', width: 5, height: 5, borderRadius: '50%', background: '#a78bfa', boxShadow: '0 0 6px #a78bfa' }} />}
                            </button>
                        );
                    })}
                </nav>

                {/* Bottom KPIs */}
                <div style={{ position: 'relative', zIndex: 1, padding: '14px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                    {[
                        ['Uncommitted', fmt(dryPowder), '#10b981'],
                        ['Deployed', fmt(totalDeployed), '#8b5cf6'],
                        ['Pipeline', fmt(activePipeline), '#f59e0b'],
                    ].map(([l, v, c]) => (
                        <div key={l} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                            <span style={{ fontSize: 11, color: 'rgba(255,255,255,.25)' }}>{l}</span>
                            <span style={{ fontSize: 12, fontWeight: 700, color: c, textShadow: `0 0 8px ${c}60` }}>{v}</span>
                        </div>
                    ))}

                    {/* Identity card — Hub Admin gets an admin card; investors see their registered mandate */}
                    {(() => {
                        // The Hub Admin is not a VC, so never show a mandate/Register prompt for them.
                        if (isAdmin) {
                            return (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12, padding: '10px 11px', borderRadius: 13, background: 'rgba(139,92,246,.08)', border: '1px solid rgba(139,92,246,.22)' }}>
                                    <div style={{ position: 'relative', flexShrink: 0 }}>
                                        <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg,#7c3aed,#0ea5e9)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', boxShadow: '0 4px 12px rgba(124,58,237,.4)' }}>
                                            <Shield style={{ width: 17, height: 17 }} />
                                        </div>
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <p style={{ fontSize: 12.5, fontWeight: 700, color: 'white', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', letterSpacing: '-.01em' }}>Hub Admin</p>
                                        <p style={{ fontSize: 10, color: 'rgba(255,255,255,.42)', margin: '1px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name || user?.email || 'Administrator'}</p>
                                    </div>
                                    <span style={{ background: 'rgba(139,92,246,.18)', border: '1px solid rgba(139,92,246,.3)', borderRadius: 7, padding: '4px 8px', color: '#a78bfa', fontSize: 10, fontWeight: 700, flexShrink: 0, letterSpacing: '.05em' }}>ADMIN</span>
                                </div>
                            );
                        }
                        // A plain visitor (signed in but not a registered VC) should NOT see this
                        // card — it's the fund identity, reserved for VCs who've registered a mandate.
                        if (!myProfile) return null;
                        const pname = myProfile.partner_name || VC_PROFILE.name;
                        const pfirm = myProfile.firm_name || VC_PROFILE.firm;
                        // Avatar carries the FIRM/brand initials (e.g. "Bade bhai" → BB)
                        const pavatar = (myProfile.firm_name || myProfile.partner_name || '?')
                            .split(' ').map((w: string) => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
                        const statusMeta: Record<string, { label: string; color: string }> = {
                            approved: { label: 'Verified', color: '#34d399' },
                            pending: { label: 'Pending', color: '#f59e0b' },
                            rejected: { label: 'Rejected', color: '#f87171' },
                        };
                        const sm = myProfile?.status ? statusMeta[myProfile.status as string] : null;
                        const openEdit = () => {
                            setMandate(myProfile ? {
                                firm_name: myProfile.firm_name ?? '',
                                partner_name: myProfile.partner_name ?? '',
                                investment_thesis: myProfile.investment_thesis ?? '',
                                sectors: myProfile.sectors ?? '',
                                stage_pref: myProfile.stage_pref ?? '',
                                check_min: myProfile.check_min != null ? String(myProfile.check_min) : '',
                                check_max: myProfile.check_max != null ? String(myProfile.check_max) : '',
                            } : {});
                            setMandateErr({});
                            setRegisterOpen(true);
                        };
                        return (
                            <div onClick={openEdit} style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12, padding: '10px 11px', borderRadius: 13, background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)', cursor: 'pointer' }}>
                                {/* Brand avatar with status badge anchored to its corner */}
                                <div style={{ position: 'relative', flexShrink: 0 }}>
                                    <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg,#7c3aed,#0ea5e9)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, letterSpacing: '.02em', color: 'white', boxShadow: '0 4px 12px rgba(124,58,237,.4)' }}>{pavatar}</div>
                                    {sm && (
                                        <span title={sm.label} style={{ position: 'absolute', right: -3, bottom: -3, width: 15, height: 15, borderRadius: '50%', background: sm.color, border: '2px solid #07070f', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 8px ${sm.color}90` }}>
                                            {myProfile?.status === 'approved'
                                                ? <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#07070f" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                                                : <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#07070f' }} />}
                                        </span>
                                    )}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    {/* Brand name = primary; partner = secondary */}
                                    <p style={{ fontSize: 12.5, fontWeight: 700, color: 'white', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', letterSpacing: '-.01em' }}>{pfirm}</p>
                                    <p style={{ fontSize: 10, color: 'rgba(255,255,255,.42)', margin: '1px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pname}</p>
                                </div>
                                <button onClick={e => { e.stopPropagation(); openEdit(); }} style={{ background: 'rgba(139,92,246,.18)', border: '1px solid rgba(139,92,246,.3)', borderRadius: 7, padding: '4px 8px', cursor: 'pointer', color: '#a78bfa', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>{myProfile ? 'Edit' : 'Register'}</button>
                            </div>
                        );
                    })()}
                </div>
            </aside>

            {/* ══ MAIN ══ */}
            <div className="hub-main-content" style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>

                {/* Top bar */}
                <header style={{ flexShrink: 0, height: 52, borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 12px', background: 'rgba(5,5,9,0.85)', backdropFilter: 'blur(20px)', zIndex: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {/* Hamburger — mobile only */}
                        <button
                            className="scout-hamburger"
                            onClick={() => setSidebarOpen(o => !o)}
                            aria-label="Toggle menu"
                            style={{ alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer', flexShrink: 0 }}
                        >
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                <rect y="2" width="16" height="1.8" rx="1" fill="rgba(255,255,255,0.7)" />
                                <rect y="7.1" width="16" height="1.8" rx="1" fill="rgba(255,255,255,0.7)" />
                                <rect y="12.2" width="16" height="1.8" rx="1" fill="rgba(255,255,255,0.7)" />
                            </svg>
                        </button>
                        {!isMobile && <><span style={{ fontSize: 11, color: 'rgba(255,255,255,.22)' }}>Scout Hub</span><ChevronRight style={{ width: 12, height: 12, color: 'rgba(255,255,255,.15)' }} /></>}
                        <span style={{ fontSize: isMobile ? 13 : 12, fontWeight: 700, color: 'rgba(255,255,255,.8)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: isMobile ? 150 : undefined }}>{TABS.find(t => t.id === tab)?.label}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div ref={searchRef} style={{ position: 'relative' }}>
                            <div className="scout-topbar-search" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 13px', borderRadius: 10, background: 'rgba(255,255,255,.04)', border: `1px solid ${searchOpen && scoutSearch.trim() ? 'rgba(6,182,212,.4)' : 'rgba(255,255,255,.07)'}` }}>
                                <Search style={{ width: 11, height: 11, color: 'rgba(255,255,255,.3)' }} />
                                <input
                                    value={scoutSearch}
                                    onChange={e => { setScoutSearch(e.target.value); setSearchOpen(true); }}
                                    onFocus={() => setSearchOpen(true)}
                                    aria-label="Search startups, decks, founders, investors, events"
                                    placeholder="Search anything…"
                                    style={{ background: 'transparent', border: 'none', outline: 'none', fontSize: 11, color: 'white', width: 160 }}
                                />
                                {scoutSearch && (
                                    <button onClick={() => { setScoutSearch(''); setSearchOpen(false); }} aria-label="Clear search" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,.4)', display: 'flex', padding: 0 }}>
                                        <X style={{ width: 11, height: 11 }} />
                                    </button>
                                )}
                            </div>
                            {/* Global results dropdown — spans all 5 domains, routes to the matching tab */}
                            {searchOpen && scoutSearch.trim() && (
                                    <div className="notif-scroll" style={{ position: 'absolute', top: 40, right: 0, width: 300, maxHeight: 400, overflowY: 'auto', zIndex: 41, background: 'rgba(8,8,16,.97)', border: '1px solid rgba(255,255,255,.1)', borderTop: '2px solid rgba(6,182,212,.55)', borderRadius: 14, boxShadow: '0 24px 70px rgba(0,0,0,.7)', backdropFilter: 'blur(14px)', padding: 8 }}>
                                        <div style={{ padding: '4px 8px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,.06)' }}>
                                            <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,.55)' }}>Results</span>
                                            <span style={{ fontSize: 9, fontWeight: 700, color: '#06b6d4', background: 'rgba(6,182,212,.15)', padding: '2px 7px', borderRadius: 999, border: '1px solid rgba(6,182,212,.3)' }}>{searchTotal}</span>
                                        </div>
                                        {searchTotal === 0 && (
                                            <div style={{ padding: '18px 10px', textAlign: 'center', fontSize: 11, color: 'rgba(255,255,255,.3)' }}>Nothing matches "{scoutSearch}"</div>
                                        )}
                                        {searchGroups.map(g => (
                                            <div key={g.kind} style={{ marginTop: 8 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '2px 4px 6px' }}>
                                                    <span style={{ fontSize: 9, fontWeight: 800, color: g.color, textTransform: 'uppercase', letterSpacing: '.07em' }}>{g.label}</span>
                                                    <span style={{ fontSize: 8, fontWeight: 700, color: g.color, background: `${g.color}18`, padding: '1px 6px', borderRadius: 999, border: `1px solid ${g.color}33` }}>{g.items.length}</span>
                                                    <span style={{ marginLeft: 'auto', fontSize: 8.5, color: 'rgba(255,255,255,.28)' }}>→ {g.dest}</span>
                                                </div>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                                                    {g.items.map((item: any, ii: number) => {
                                                        const sc = g.kind === 'startup' ? (STAGE_COLORS[item.stage] || g.color) : g.color;
                                                        let lead = '?', primary = '', secondary = '', trailing: any = null;
                                                        if (g.kind === 'startup') { lead = (item.name || '?')[0]; primary = item.name; secondary = `${item.stage} · ${item.industry} · ${item.founder}`; trailing = item.score; }
                                                        else if (g.kind === 'deck') { lead = (item.name || '?')[0]; primary = item.name; secondary = `${item.type || 'Deck'} · ${item.startup || '—'}`; trailing = item.corporate ? 'VC' : null; }
                                                        else if (g.kind === 'founder') { lead = item.avatar || (item.name || '?')[0]; primary = item.name; secondary = `${item.role} · ${item.company}`; }
                                                        else if (g.kind === 'investor') { lead = (item.firm_name || '?').split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase(); primary = item.firm_name; secondary = [item.partner_name, item.sectors].filter(Boolean).join(' · '); }
                                                        else if (g.kind === 'event') { lead = (item.title || '?')[0]; primary = item.title; secondary = `${item.type || 'Event'} · ${item.date || ''}`; }
                                                        return (
                                                            <button key={(item.id || item.firm_name || primary) + ii} onClick={() => handleSearchPick(g.kind, item)} className="dr-btn" style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left', padding: '8px 10px', borderRadius: 10, background: `${sc}0c`, border: `1px solid ${sc}22`, borderLeft: `2px solid ${sc}70`, cursor: 'pointer' }}>
                                                                <div style={{ width: 28, height: 28, borderRadius: 8, flexShrink: 0, background: `radial-gradient(circle at 32% 28%, ${sc}, ${sc}66 60%, ${sc}18)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: 'white', boxShadow: `0 2px 8px ${sc}40` }}>{lead}</div>
                                                                <div style={{ minWidth: 0, flex: 1 }}>
                                                                    <p style={{ fontSize: 12, fontWeight: 700, color: 'white', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{primary}</p>
                                                                    <p style={{ fontSize: 9.5, color: 'rgba(255,255,255,.4)', margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{secondary}</p>
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
                        <div ref={notifRef} style={{ position: 'relative' }}>
                            <button onClick={() => setNotifOpen(o => !o)} aria-label="Notifications" style={{ width: 32, height: 32, borderRadius: 10, background: notifOpen ? 'rgba(139,92,246,.18)' : 'rgba(255,255,255,.05)', border: `1px solid ${notifOpen ? 'rgba(139,92,246,.4)' : 'rgba(255,255,255,.08)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', position: 'relative' }}>
                                <Bell style={{ width: 13, height: 13, color: notifOpen ? '#a78bfa' : 'rgba(255,255,255,.5)' }} />
                                {!notifOpen && <div style={{ position: 'absolute', top: 6, right: 7, width: 6, height: 6, borderRadius: '50%', background: '#ef4444', boxShadow: '0 0 6px #ef4444', border: '1.5px solid #050509' }} />}
                            </button>
                            {notifOpen && (
                                    <div className="notif-scroll" style={{ position: 'absolute', top: 40, right: 0, width: 300, maxHeight: 360, overflowY: 'auto', zIndex: 41, background: 'rgba(8,8,16,.97)', border: '1px solid rgba(255,255,255,.1)', borderTop: '2px solid rgba(139,92,246,.55)', borderRadius: 14, boxShadow: '0 24px 70px rgba(0,0,0,.7)', backdropFilter: 'blur(14px)', padding: 8 }}>
                                        <div style={{ padding: '6px 10px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,.06)' }}>
                                            <span style={{ fontSize: 12, fontWeight: 700, color: 'white' }}>Notifications</span>
                                            <span style={{ fontSize: 9, fontWeight: 700, color: '#a78bfa', background: 'rgba(139,92,246,.15)', padding: '2px 7px', borderRadius: 999, border: '1px solid rgba(139,92,246,.3)' }}>{actionFeed.length}</span>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
                                            {actionFeed.map(f => (
                                                <div key={f.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 9, padding: '9px 10px', borderRadius: 10, background: `${f.color}0c`, border: `1px solid ${f.color}22`, borderLeft: `2px solid ${f.color}70` }}>
                                                    <span style={{ fontSize: 14, flexShrink: 0, lineHeight: 1.2 }}>{f.icon}</span>
                                                    <div style={{ minWidth: 0 }}>
                                                        <p style={{ fontSize: 11, color: 'rgba(255,255,255,.72)', margin: 0, lineHeight: 1.4 }}>{f.msg}</p>
                                                        <p style={{ fontSize: 9, color: 'rgba(255,255,255,.3)', margin: '3px 0 0' }}>{f.time}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                            )}
                        </div>
                        <button onClick={() => setRegisterOpen(true)} className="sc-btn" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: isMobile ? '6px 10px' : '7px 14px', borderRadius: 10, background: 'linear-gradient(90deg,rgba(124,58,237,.8),rgba(14,165,233,.7))', border: 'none', cursor: 'pointer', fontSize: isMobile ? 10 : 11, fontWeight: 700, color: 'white', boxShadow: '0 4px 16px rgba(124,58,237,.35)', whiteSpace: 'nowrap' }}>
                            <Plus style={{ width: 12, height: 12 }} />{isMobile ? 'Add' : 'Add Mandate'}
                        </button>
                    </div>
                </header>

                <main className="hub-main-content" style={{ flex: 1, minHeight: 0, overflow: 'hidden', position: 'relative' }}>

                    {/* ══ 1. INVESTMENT COCKPIT ══ */}
                    {tab === 'cockpit' && (() => {
                        const topDeals = startups.filter(s => shortlisted.includes(s.id)).sort((a, b) => b.score - a.score);
                        return (
                            <div className="hub-tab-content" style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: '18px 22px', boxSizing: 'border-box', overflow: 'hidden', gap: 12, position: 'relative' }}>

                                {/* ── CSS-only ambient (replaces heavy WebGL CockpitNebula) ── */}
                                <style>{`
              @keyframes ck-drift { 0%,100%{transform:translate(0,0)} 40%{transform:translate(14px,-12px)} 70%{transform:translate(-8px,10px)} }
              @keyframes ck-spin  { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
              @keyframes ck-rspin { from{transform:rotate(0deg)} to{transform:rotate(-360deg)} }
              @keyframes ck-float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
              @keyframes ck-morph { 0%,100%{border-radius:60% 40% 30% 70%/60% 30% 70% 40%} 50%{border-radius:30% 60% 70% 40%/50% 60% 30% 60%} }
              @keyframes ck-flow  { 0%{background-position:-80% 0} 100%{background-position:180% 0} }
              @keyframes ck-pulse { 0%,100%{opacity:.45;transform:scale(1)} 50%{opacity:1;transform:scale(1.08)} }
              @keyframes ck-ph-pulse { 0%{transform:scale(1);opacity:.7} 100%{transform:scale(1.5);opacity:0} }
              @keyframes ck-ph-flow  { 0%{background-position:-60% 0} 100%{background-position:160% 0} }
            `}</style>
                                <div aria-hidden style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
                                    {/* ambient blobs */}
                                    <div style={{ position: 'absolute', top: '5%', right: '5%', width: 260, height: 260, borderRadius: '50%', background: 'radial-gradient(circle,rgba(139,92,246,.08),transparent 70%)', animation: 'ck-drift 11s ease-in-out infinite' }} />
                                    <div style={{ position: 'absolute', bottom: '8%', left: '6%', width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle,rgba(6,182,212,.06),transparent 70%)', animation: 'ck-drift 14s ease-in-out infinite reverse' }} />
                                    <div style={{ position: 'absolute', top: '42%', left: '38%', width: 160, height: 160, borderRadius: '50%', background: 'radial-gradient(circle,rgba(16,185,129,.05),transparent 70%)', animation: 'ck-drift 9s ease-in-out infinite 2s' }} />
                                    {/* orrery top-right */}
                                    <div style={{ position: 'absolute', top: -38, right: -38, width: 200, height: 200 }}>
                                        <div style={{ position: 'absolute', top: '50%', left: '50%', width: 15, height: 15, marginLeft: -7, marginTop: -7, borderRadius: '50%', background: 'radial-gradient(circle at 35% 35%,#c4b5fd,#7c3aed)', boxShadow: '0 0 16px rgba(139,92,246,.9)', animation: 'ck-pulse 2.8s ease-in-out infinite' }} />
                                        {[{ w: 56, c: '#8b5cf6', sp: '3.2s' }, { w: 94, c: '#06b6d4', sp: '5.8s', rev: true }, { w: 144, c: '#10b981', sp: '9s' }, { w: 194, c: '#f59e0b', sp: '13s', rev: true }].map((o, i) => (
                                            <div key={i} style={{ position: 'absolute', top: '50%', left: '50%', width: o.w, height: o.w, marginLeft: -o.w / 2, marginTop: -o.w / 2, borderRadius: '50%', border: `1px solid ${o.c}${i < 2 ? '35' : '20'}` }}>
                                                <div style={{ position: 'absolute', top: i % 2 === 0 ? -4 : 'auto', bottom: i % 2 === 1 ? -4 : 'auto', left: '50%', width: 8, height: 8, marginLeft: -4, borderRadius: '50%', background: o.c, boxShadow: `0 0 8px ${o.c}`, animation: `ck-spin ${o.sp} linear infinite ${o.rev ? 'reverse' : ''}`, transformOrigin: `4px ${o.w / 2 + 4}px` }} />
                                            </div>
                                        ))}
                                    </div>
                                    {/* morphing blob */}
                                    <div style={{ position: 'absolute', bottom: 28, left: 14, width: 100, height: 100, background: 'linear-gradient(135deg,rgba(139,92,246,.12),rgba(6,182,212,.08))', animation: 'ck-morph 7s ease-in-out infinite', border: '1px solid rgba(139,92,246,.18)' }} />
                                    {/* spinning diamond */}
                                    <div style={{ position: 'absolute', bottom: '28%', left: '44%', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 48, height: 48 }}>
                                        <div style={{ position: 'absolute', width: 34, height: 34, border: '2px solid rgba(6,182,212,.32)', borderRadius: 4, animation: 'ck-spin 10s linear infinite', transform: 'rotate(45deg)' }} />
                                        <div style={{ position: 'absolute', width: 16, height: 16, background: 'rgba(6,182,212,.07)', borderRadius: 2, animation: 'ck-rspin 6s linear infinite', transform: 'rotate(45deg)' }} />
                                    </div>
                                    {/* floating particles */}
                                    {[{ x: '8%', y: '42%', s: 4, c: '#8b5cf6', d: '0s' }, { x: '35%', y: '82%', s: 3, c: '#06b6d4', d: '1s' }, { x: '62%', y: '12%', s: 5, c: '#10b981', d: '2.5s' }, { x: '85%', y: '55%', s: 3, c: '#f59e0b', d: '.5s' }, { x: '50%', y: '68%', s: 3, c: '#f472b6', d: '1.8s' }].map((p, i) => (
                                        <div key={i} style={{ position: 'absolute', left: p.x, top: p.y, width: p.s, height: p.s, borderRadius: '50%', background: p.c, boxShadow: `0 0 ${p.s * 2.5}px ${p.c}`, opacity: .42, animation: `ck-float ${3.5 + i * .5}s ease-in-out ${p.d} infinite` }} />
                                    ))}
                                    {/* flow lines */}
                                    {[{ t: '28%', c: '#8b5cf6', d: '0s' }, { t: '58%', c: '#06b6d4', d: '1.5s' }, { t: '82%', c: '#10b981', d: '3s' }].map((l, i) => (
                                        <div key={i} style={{ position: 'absolute', left: 0, right: 0, top: l.t, height: 1, background: `linear-gradient(90deg,transparent,${l.c}15,transparent)`, backgroundSize: '40% 100%', animation: `ck-flow 7s linear ${l.d} infinite` }} />
                                    ))}
                                </div>

                                {/* ── Row 1: KPI strip ── */}
                                <div className="hub-kpi-5col" style={{ flexShrink: 0, display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 12, position: 'relative', zIndex: 1 }}>
                                    {[
                                        { label: 'Innovation Budget', val: fmt(VC_PROFILE.aum), sub: 'Sanctioned for pilots', color: '#8b5cf6', Icon: Building2 },
                                        { label: 'Uncommitted', val: fmt(dryPowder), sub: 'Available to commit', color: '#10b981', Icon: Zap },
                                        { label: 'Committed', val: fmt(totalDeployed), sub: `${(deployedPct * 100).toFixed(0)}% of budget`, color: '#06b6d4', Icon: TrendingUp },
                                        { label: 'Shortlisted', val: shortlisted.length, sub: 'Active pipeline', color: '#f59e0b', Icon: Star },
                                        { label: 'Target Benefit', val: VC_PROFILE.targetReturn, sub: 'Min. cost-benefit', color: '#f472b6', Icon: Target },
                                    ].map(k => (
                                        <div key={k.label} className="sc-card" style={{ borderRadius: 16, border: `1px solid ${k.color}25`, background: `linear-gradient(135deg,${k.color}10 0%,rgba(5,5,9,.92) 70%)`, padding: '13px 16px', position: 'relative', overflow: 'hidden', cursor: 'default' }}>
                                            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg,transparent,${k.color}70,transparent)` }} />
                                            <div style={{ position: 'absolute', top: -20, right: -20, width: 80, height: 80, borderRadius: '50%', background: `radial-gradient(circle,${k.color}18,transparent 70%)` }} />
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                                                <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,.28)', textTransform: 'uppercase', letterSpacing: '.09em' }}>{k.label}</span>
                                                <div style={{ width: 28, height: 28, borderRadius: 8, background: `${k.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 12px ${k.color}40` }}>
                                                    <k.Icon style={{ width: 13, height: 13, color: k.color, filter: `drop-shadow(0 0 3px ${k.color})` }} />
                                                </div>
                                            </div>
                                            <div className="sc-stat-val" style={{ color: k.color, textShadow: `0 0 18px ${k.color}55` }}>{k.val}</div>
                                            <p style={{ fontSize: 10, color: 'rgba(255,255,255,.28)', margin: '4px 0 0' }}>{k.sub}</p>
                                        </div>
                                    ))}
                                </div>

                                {/* ── Row 2: 3-panel grid ── */}
                                <div className="scout-cockpit-main" style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: '220px 1fr 260px', gap: 12, position: 'relative', zIndex: 1 }}>

                                    {/* Panel L: Portfolio Orb */}
                                    <div style={{ ...G(), display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '16px', gap: 12, position: 'relative' }}>
                                        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg,transparent,rgba(139,92,246,.7),transparent)' }} />
                                        <p style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,.28)', textTransform: 'uppercase', letterSpacing: '.1em', margin: 0 }}>Capital Deployment</p>
                                        <div style={{ position: 'relative', animation: 'ck-float 5s ease-in-out infinite' }}>
                                            <PortfolioOrb progress={deployedPct} />
                                            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                                                <span style={{ fontSize: 18, fontWeight: 900, color: 'white', textShadow: '0 0 20px rgba(139,92,246,.9)' }}>{(deployedPct * 100).toFixed(0)}%</span>
                                                <span style={{ fontSize: 9, color: 'rgba(255,255,255,.35)', letterSpacing: '.06em' }}>DEPLOYED</span>
                                            </div>
                                        </div>
                                        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 6 }}>
                                            {[['Deployed', totalDeployed, '#8b5cf6'], ['Uncommitted', dryPowder, '#10b981']].map(([l, v, c]) => (
                                                <div key={String(l)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 10px', borderRadius: 10, background: `${c}0d`, border: `1px solid ${c}22` }}>
                                                    <span style={{ fontSize: 10, color: 'rgba(255,255,255,.4)' }}>{l}</span>
                                                    <span style={{ fontSize: 12, fontWeight: 800, color: String(c) }}>{fmt(Number(v))}</span>
                                                </div>
                                            ))}
                                            {/* sector allocation mini bars */}
                                            <div style={{ marginTop: 4, padding: '10px 11px', borderRadius: 11, background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.06)' }}>
                                                <p style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,.25)', textTransform: 'uppercase', letterSpacing: '.08em', margin: '0 0 8px' }}>By Sector</p>
                                                {[['SaaS', 38, '#8b5cf6'], ['FinTech', 27, '#06b6d4'], ['DeepTech', 22, '#10b981']].map(([l, p, c]) => (
                                                    <div key={String(l)} style={{ marginBottom: 5 }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                                                            <span style={{ fontSize: 9, color: 'rgba(255,255,255,.35)' }}>{l}</span>
                                                            <span style={{ fontSize: 9, fontWeight: 700, color: String(c) }}>{p}%</span>
                                                        </div>
                                                        <div style={{ height: 3, borderRadius: 2, background: 'rgba(255,255,255,.05)' }}>
                                                            <div style={{ height: '100%', borderRadius: 2, width: `${p}%`, background: `linear-gradient(90deg,${c},${c as string}60)`, boxShadow: `0 0 5px ${c as string}55` }} />
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Panel C: Radar + shortlisted */}
                                    <div style={{ ...G(), display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                                        <div style={{ padding: '11px 16px', borderBottom: '1px solid rgba(255,255,255,.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <Target style={{ width: 13, height: 13, color: '#06b6d4' }} />
                                                <span style={{ fontSize: 12, fontWeight: 700, color: 'white' }}>Deal Radar</span>
                                            </div>
                                            <span style={{ fontSize: 10, color: 'rgba(255,255,255,.28)' }}>{shortlisted.length} shortlisted · {startups.length} tracked</span>
                                        </div>
                                        <div className="sc-cockpit-center-row" style={{ flex: 1, minHeight: 0, display: 'flex', overflow: 'hidden' }}>
                                            {/* Radar orb — hidden on mobile via CSS */}
                                            <div className="sc-radar-orb-wrap" style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px', position: 'relative' }}>
                                                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'ck-float 6s ease-in-out infinite' }}>
                                                    <RadarSphere />
                                                </div>
                                                <div style={{ width: 180, height: 180 }} />
                                            </div>
                                            {/* Shortlist table */}
                                            <div className="sc-scroll" style={{ flex: 1, overflowY: 'auto', padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                                                <p style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,.28)', textTransform: 'uppercase', letterSpacing: '.1em', margin: '0 0 4px' }}>Shortlisted Deals</p>
                                                {topDeals.map(s => {
                                                    const sc = STAGE_COLORS[s.stage];
                                                    const scoreCol = s.score >= 90 ? '#10b981' : s.score >= 80 ? '#06b6d4' : '#f59e0b';
                                                    return (
                                                        <div key={s.id} className="sc-card" style={{ padding: '9px 11px', borderRadius: 12, background: `${sc}09`, border: `1px solid ${sc}22`, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 9 }}>
                                                            <div style={{ width: 30, height: 30, borderRadius: 9, background: `linear-gradient(135deg,${sc}40,${sc}18)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: sc, flexShrink: 0, border: `1px solid ${sc}35` }}>{s.name[0]}</div>
                                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 2 }}>
                                                                    <span style={{ fontSize: 12, fontWeight: 700, color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</span>
                                                                    <span className="sc-badge" style={{ background: `${sc}18`, color: sc, border: `1px solid ${sc}35` }}>{s.stage.split(' ')[0]}</span>
                                                                </div>
                                                                <div style={{ display: 'flex', gap: 8 }}>
                                                                    <span style={{ fontSize: 10, color: 'rgba(255,255,255,.35)' }}>MRR {s.mrr > 0 ? fmt(s.mrr) : '—'}</span>
                                                                    <span style={{ fontSize: 10, color: 'rgba(255,255,255,.35)' }}>Growth {s.growth > 0 ? `+${s.growth}%` : '—'}</span>
                                                                </div>
                                                            </div>
                                                            <div style={{ width: 34, height: 34, borderRadius: '50%', border: `2px solid ${scoreCol}55`, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${scoreCol}0d`, flexShrink: 0 }}>
                                                                <span style={{ fontSize: 10, fontWeight: 900, color: scoreCol }}>{s.score}</span>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                                {topDeals.length === 0 && <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,.2)', fontSize: 11, padding: '16px 0' }}>No shortlisted deals</div>}

                                                {/* ROI sparkline */}
                                                <div style={{ marginTop: 8, padding: '11px', borderRadius: 12, background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.06)', flexShrink: 0 }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                                        <span style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,.28)', textTransform: 'uppercase', letterSpacing: '.1em' }}>Pilot Success Rate</span>
                                                        <span style={{ fontSize: 11, fontWeight: 800, color: '#10b981' }}>+52%</span>
                                                    </div>
                                                    <AreaChart data={ROI_DATA} color="#10b981" h={55} />
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                                                        {ROI_DATA.map(d => (
                                                            <div key={d.m} style={{ textAlign: 'center' }}>
                                                                <p style={{ fontSize: 8, color: 'rgba(255,255,255,.22)', margin: 0 }}>{d.m}</p>
                                                                <p style={{ fontSize: 9, fontWeight: 700, color: '#10b981', margin: 0 }}>+{d.v}%</p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Panel R: Action feed + allocation */}
                                    <div style={{ ...G(), display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                                        <div style={{ padding: '11px 14px', borderBottom: '1px solid rgba(255,255,255,.06)', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                                            <Activity style={{ width: 13, height: 13, color: '#f59e0b' }} />
                                            <span style={{ fontSize: 12, fontWeight: 700, color: 'white' }}>Marketplace Activity</span>
                                            <span style={{ marginLeft: 'auto', width: 18, height: 18, borderRadius: '50%', background: 'rgba(239,68,68,.2)', border: '1px solid rgba(239,68,68,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 800, color: '#ef4444' }}>{actionFeed.length}</span>
                                        </div>
                                        <div className="sc-scroll" style={{ flex: 1, overflowY: 'auto', padding: '8px', display: 'flex', flexDirection: 'column', gap: 5, minHeight: 0 }}>
                                            {actionFeed.map(item => (
                                                <div key={item.id} style={{ padding: '8px 10px', borderRadius: 10, background: `${item.color}0b`, border: `1px solid ${item.color}1e`, borderLeft: `3px solid ${item.color}65`, display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                                                    <div style={{ width: 24, height: 24, borderRadius: 7, background: `${item.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: `0 0 8px ${item.color}35` }}>
                                                        <Activity style={{ width: 10, height: 10, color: item.color }} />
                                                    </div>
                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                        <p style={{ fontSize: 10, color: 'rgba(255,255,255,.75)', margin: 0, lineHeight: 1.45 }}>{item.msg}</p>
                                                        <p style={{ fontSize: 9, color: 'rgba(255,255,255,.22)', margin: '3px 0 0' }}>{item.time}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        {/* Allocation by Stage */}
                                        <div style={{ padding: '11px 14px', borderTop: '1px solid rgba(255,255,255,.06)', flexShrink: 0 }}>
                                            <p style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,.28)', textTransform: 'uppercase', letterSpacing: '.1em', margin: '0 0 8px' }}>Allocation by Stage</p>
                                            {STAGE_ORDER.slice(0, 4).map((stage, i) => {
                                                const pct = [33, 22, 27, 18][i]; const sc = STAGE_COLORS[stage];
                                                return (
                                                    <div key={stage} style={{ marginBottom: 6 }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                                                            <span style={{ fontSize: 10, color: 'rgba(255,255,255,.4)' }}>{stage}</span>
                                                            <span style={{ fontSize: 10, fontWeight: 700, color: sc }}>{pct}%</span>
                                                        </div>
                                                        <div style={{ height: 4, borderRadius: 3, background: 'rgba(255,255,255,.05)' }}>
                                                            <div style={{ height: '100%', borderRadius: 3, width: `${pct}%`, background: `linear-gradient(90deg,${sc},${sc}60)`, boxShadow: `0 0 6px ${sc}55` }} />
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>

                                {/* ── Row 3: Pipeline Health (fills blank bottom area) ── */}
                                <div style={{ flexShrink: 0, position: 'relative', zIndex: 1, borderRadius: 16, border: '1px solid rgba(255,255,255,.07)', background: 'rgba(255,255,255,.022)', padding: '14px 20px', overflow: 'hidden' }}>
                                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1.5, background: 'linear-gradient(90deg,rgba(139,92,246,.5) 0%,rgba(6,182,212,.5) 25%,rgba(245,158,11,.5) 55%,rgba(16,185,129,.5) 75%,rgba(52,211,153,.5) 100%)' }} />
                                    {/* sweep bg */}
                                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg,rgba(139,92,246,.04) 0%,rgba(6,182,212,.04) 25%,rgba(245,158,11,.04) 55%,rgba(16,185,129,.04) 75%,rgba(52,211,153,.04) 100%)', pointerEvents: 'none' }} />

                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, position: 'relative' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <GitBranch style={{ width: 13, height: 13, color: '#a78bfa' }} />
                                            <span style={{ fontSize: 12, fontWeight: 700, color: 'white' }}>Pipeline Health</span>
                                            <span style={{ fontSize: 9, padding: '2px 8px', borderRadius: 999, background: 'rgba(139,92,246,.15)', border: '1px solid rgba(139,92,246,.3)', color: '#a78bfa', fontWeight: 700, letterSpacing: '.06em' }}>LIVE</span>
                                        </div>
                                        <span style={{ fontSize: 10, color: 'rgba(255,255,255,.25)' }}>{startups.length} total companies</span>
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
                                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, flexShrink: 0 }}>
                                                        {/* orb */}
                                                        <div style={{ position: 'relative', width: 46, height: 46 }}>
                                                            {count > 0 && <>
                                                                <div style={{ position: 'absolute', inset: -4, borderRadius: '50%', border: `1px solid ${col}55`, animation: 'ck-ph-pulse 2.2s ease-out infinite' }} />
                                                                <div style={{ position: 'absolute', inset: -9, borderRadius: '50%', border: `1px solid ${col}22`, animation: 'ck-ph-pulse 2.2s ease-out infinite', animationDelay: '0.6s' }} />
                                                            </>}
                                                            <div style={{ width: 46, height: 46, borderRadius: '50%', background: `radial-gradient(circle at 38% 32%,${col}55 0%,${col}25 45%,${col}0a 100%)`, border: `1.5px solid ${col}80`, boxShadow: count > 0 ? `0 0 20px ${col}50,0 0 8px ${col}30,inset 0 0 12px ${col}20` : `0 0 6px ${col}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', zIndex: 1 }}>
                                                                <span style={{ fontSize: count >= 10 ? 14 : 17, fontWeight: 800, color: col, filter: count > 0 ? `drop-shadow(0 0 8px ${col})` : 'none' }}>{count}</span>
                                                            </div>
                                                        </div>
                                                        <span style={{ fontSize: 10, color: 'rgba(255,255,255,.4)', fontWeight: 500, whiteSpace: 'nowrap' }}>{stage}</span>
                                                        <div style={{ width: 46, height: 3, borderRadius: 2, background: 'rgba(255,255,255,.06)' }}>
                                                            <div style={{ height: '100%', borderRadius: 2, width: `${pct}%`, background: col, boxShadow: `0 0 6px ${col}90` }} />
                                                        </div>
                                                    </div>
                                                    {/* connector */}
                                                    {!isLast && (
                                                        <div style={{ flex: 1, height: 2, position: 'relative', margin: '0 6px', marginBottom: 24 }}>
                                                            <div style={{ position: 'absolute', inset: 0, borderRadius: 1, background: `linear-gradient(90deg,${col}50,${nextCol}50)` }} />
                                                            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 1, background: `linear-gradient(90deg,transparent 0%,${nextCol}ee 50%,transparent 100%)`, backgroundSize: '60% 100%', animation: 'ck-ph-flow 1.8s linear infinite', opacity: 0.7 }} />
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        );
                    })()}

                    {/* ══ 2. DEAL FLOW KANBAN ══ */}
                    {tab === 'dealflow' && (() => {
                        // ── Sector filter — only sectors that actually have registered startups;
                        //    grows automatically as startups of new sectors are enrolled ──
                        const dealSectorOptions = ['All', ...Array.from(new Set(startups.map(s => s.industry).filter(Boolean))).sort()];
                        return (
                        <div className="hub-tab-content" style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: '18px 22px', boxSizing: 'border-box', overflow: 'hidden', gap: 12, position: 'relative' }}>
                            <DealFlowGalaxy />

                            <style>{`
                              @keyframes df-drift{0%,100%{transform:translate(0,0)}40%{transform:translate(14px,-18px)}70%{transform:translate(-10px,10px)}}
                              @keyframes df-spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
                              @keyframes df-rspin{from{transform:rotate(0deg)}to{transform:rotate(-360deg)}}
                              @keyframes df-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
                              @keyframes df-morph{0%,100%{border-radius:60% 40% 30% 70%/60% 30% 70% 40%}50%{border-radius:30% 60% 70% 40%/50% 60% 30% 60%}}
                              @keyframes df-flow{0%{background-position:-60% 0}100%{background-position:160% 0}}
                              @keyframes df-rise{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
                              .df-card{transition:box-shadow .2s,border-color .2s;animation:df-rise .3s ease both}
                              .df-card:hover{box-shadow:0 16px 48px rgba(0,0,0,.6),0 0 0 1px rgba(255,255,255,.14)}
                            `}</style>

                            {/* Ambient bg decorations */}
                            <div aria-hidden style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
                                <div style={{ position: 'absolute', top: '4%', left: '16%', width: 320, height: 320, borderRadius: '50%', background: 'radial-gradient(circle,rgba(139,92,246,.07),transparent 70%)', animation: 'df-drift 11s ease-in-out infinite' }} />
                                <div style={{ position: 'absolute', bottom: '8%', right: '10%', width: 260, height: 260, borderRadius: '50%', background: 'radial-gradient(circle,rgba(6,182,212,.06),transparent 70%)', animation: 'df-drift 14s ease-in-out infinite reverse' }} />
                                {/* Orrery top-right */}
                                <div style={{ position: 'absolute', top: -35, right: 20, width: 210, height: 210 }}>
                                    <div style={{ position: 'absolute', top: '50%', left: '50%', width: 18, height: 18, marginLeft: -9, marginTop: -9, borderRadius: '50%', background: 'radial-gradient(circle at 35% 35%,#fbbf24,#b45309)', boxShadow: '0 0 20px rgba(245,158,11,.9)', animation: 'sc-pulse2 2.5s ease-in-out infinite' }} />
                                    {[{ w: 65, c: '#8b5cf6', sp: '3.5s' }, { w: 106, c: '#06b6d4', sp: '5.8s', rev: true }, { w: 158, c: '#10b981', sp: '9.5s' }, { w: 205, c: '#f59e0b', sp: '13s', rev: true }].map((o, i) => (
                                        <div key={i} style={{ position: 'absolute', top: '50%', left: '50%', width: o.w, height: o.w, marginLeft: -o.w / 2, marginTop: -o.w / 2, borderRadius: '50%', border: `1px solid ${o.c}${i < 2 ? '35' : '20'}` }}>
                                            <div style={{ position: 'absolute', top: i % 2 === 0 ? -4 : 'auto', bottom: i % 2 === 1 ? -4 : 'auto', left: '50%', width: 9, height: 9, marginLeft: -4, borderRadius: '50%', background: o.c, boxShadow: `0 0 9px ${o.c}`, animation: `df-spin ${o.sp} linear infinite ${o.rev ? 'reverse' : ''}`, transformOrigin: `4px ${o.w / 2 + 4}px` }} />
                                        </div>
                                    ))}
                                </div>
                                <div style={{ position: 'absolute', bottom: 24, left: 16, width: 110, height: 110, background: 'linear-gradient(135deg,rgba(139,92,246,.13),rgba(6,182,212,.08))', animation: 'df-morph 7s ease-in-out infinite', border: '1px solid rgba(139,92,246,.18)' }} />
                                {[{ x: '8%', y: '40%', s: 4, c: '#8b5cf6', d: '0s' }, { x: '35%', y: '88%', s: 3, c: '#06b6d4', d: '.9s' }, { x: '62%', y: '14%', s: 5, c: '#10b981', d: '2.7s' }, { x: '88%', y: '58%', s: 3, c: '#f59e0b', d: '.5s' }].map((p, i) => (
                                    <div key={i} style={{ position: 'absolute', left: p.x, top: p.y, width: p.s, height: p.s, borderRadius: '50%', background: p.c, boxShadow: `0 0 ${p.s * 2.5}px ${p.c}`, opacity: .45, animation: `df-float ${3.5 + i * .5}s ease-in-out ${p.d} infinite` }} />
                                ))}
                            </div>

                            {/* Header */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, position: 'relative', zIndex: 30 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,.4)', whiteSpace: 'nowrap' }}><strong style={{ color: 'white', fontWeight: 800 }}>{filteredDeals.length}</strong> deals · {shortlisted.length} shortlisted</span>
                                    {dealSectors.length > 0 && (
                                        <button onClick={() => setDealSectors([])} className="sc-btn" style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 9px', borderRadius: 999, fontSize: 10, fontWeight: 700, cursor: 'pointer', background: 'rgba(255,255,255,.05)', color: 'rgba(255,255,255,.45)', border: '1px solid rgba(255,255,255,.1)' }}>
                                            <X style={{ width: 9, height: 9 }} />Clear
                                        </button>
                                    )}
                                </div>

                                {/* ── Multi-select sector dropdown ── */}
                                <div ref={dealSectorRef} style={{ position: 'relative', flexShrink: 0 }}>
                                    <button onClick={() => setDealSectorOpen(o => !o)} className="sc-btn" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 14px', borderRadius: 10, background: dealSectors.length ? 'rgba(6,182,212,.18)' : 'rgba(255,255,255,.04)', border: `1px solid ${dealSectors.length ? 'rgba(6,182,212,.45)' : 'rgba(255,255,255,.1)'}`, color: dealSectors.length ? '#67e8f9' : 'rgba(255,255,255,.62)', fontSize: 11, fontWeight: 700, cursor: 'pointer', boxShadow: dealSectors.length ? '0 0 14px rgba(6,182,212,.28)' : 'none' }}>
                                        <Filter style={{ width: 12, height: 12 }} />
                                        <span style={{ whiteSpace: 'nowrap' }}>{dealSectors.length === 0 ? 'Select Sectors' : dealSectors.length === 1 ? dealSectors[0] : `${dealSectors.length} sectors`}</span>
                                        {dealSectors.length > 0 && <span style={{ fontSize: 9, fontWeight: 800, padding: '1px 6px', borderRadius: 999, background: 'rgba(6,182,212,.3)', color: '#67e8f9', minWidth: 16, textAlign: 'center' }}>{dealSectors.length}</span>}
                                        <ChevronRight style={{ width: 12, height: 12, transform: dealSectorOpen ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform .18s' }} />
                                    </button>
                                    {dealSectorOpen && (
                                        <div className="notif-scroll" style={{ position: 'absolute', top: 42, right: 0, width: 244, maxHeight: 320, overflowY: 'auto', zIndex: 41, background: 'rgba(8,8,16,.97)', border: '1px solid rgba(255,255,255,.1)', borderTop: '2px solid rgba(6,182,212,.55)', borderRadius: 14, boxShadow: '0 24px 70px rgba(0,0,0,.7)', backdropFilter: 'blur(14px)', padding: 8 }}>
                                            <div style={{ padding: '4px 8px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,.06)' }}>
                                                <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,.55)' }}>Filter by sector</span>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                    {(() => { const opts = dealSectorOptions.filter(s => s !== 'All'); return opts.length > 0 && dealSectors.length < opts.length && <button onClick={() => setDealSectors(opts)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#67e8f9', fontSize: 10, fontWeight: 700 }}>Select all</button>; })()}
                                                    {dealSectors.length > 0 && <button onClick={() => setDealSectors([])} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,.45)', fontSize: 10, fontWeight: 700 }}>Clear all</button>}
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginTop: 8 }}>
                                                {dealSectorOptions.filter(s => s !== 'All').map(s => {
                                                    const checked = dealSectors.includes(s);
                                                    const count = startups.filter(x => x.industry === s).length;
                                                    return (
                                                        <button key={s} onClick={() => setDealSectors(prev => checked ? prev.filter(x => x !== s) : [...prev, s])} className="dr-btn" style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left', padding: '8px 10px', borderRadius: 10, background: checked ? 'rgba(6,182,212,.12)' : 'transparent', border: `1px solid ${checked ? 'rgba(6,182,212,.32)' : 'rgba(255,255,255,.06)'}`, cursor: 'pointer' }}>
                                                            <div style={{ width: 16, height: 16, borderRadius: 5, flexShrink: 0, border: `1.5px solid ${checked ? '#06b6d4' : 'rgba(255,255,255,.25)'}`, background: checked ? '#06b6d4' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: checked ? '0 0 8px rgba(6,182,212,.5)' : 'none' }}>
                                                                {checked && <CheckCircle style={{ width: 11, height: 11, color: '#04121a' }} />}
                                                            </div>
                                                            <span style={{ flex: 1, fontSize: 12, fontWeight: 600, color: checked ? 'white' : 'rgba(255,255,255,.62)' }}>{s}</span>
                                                            <span style={{ fontSize: 9, fontWeight: 800, padding: '1px 7px', borderRadius: 999, background: checked ? 'rgba(6,182,212,.2)' : 'rgba(255,255,255,.06)', color: checked ? '#67e8f9' : 'rgba(255,255,255,.3)' }}>{count}</span>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                            <button onClick={() => setDealSectorOpen(false)} className="sc-btn" style={{ width: '100%', marginTop: 8, padding: '8px 0', borderRadius: 10, background: 'linear-gradient(90deg,#0e7490,#06b6d4)', color: 'white', border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700, boxShadow: '0 4px 14px rgba(6,182,212,.35)' }}>Done</button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Funnel bar */}
                            <div style={{ flexShrink: 0, position: 'relative', zIndex: 1, display: 'flex', height: 26, borderRadius: 13, overflow: 'hidden', border: '1px solid rgba(255,255,255,.07)', background: 'rgba(0,0,0,.3)' }}>
                                {STAGE_ORDER.map((stage, i) => {
                                    const cnt = filteredDeals.filter(s => s.stage === stage).length;
                                    const pct = Math.max((cnt / Math.max(filteredDeals.length, 1)) * 100, 4);
                                    const sc = STAGE_COLORS[stage];
                                    return (
                                        <div key={stage} style={{ height: '100%', flex: `0 0 ${pct}%`, background: `linear-gradient(90deg,${sc}55,${sc}28)`, borderRight: i < 4 ? '1px solid rgba(0,0,0,.4)' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3, overflow: 'hidden' }}>
                                            {pct > 9 && <><span style={{ fontSize: 8, fontWeight: 700, color: 'rgba(255,255,255,.6)', whiteSpace: 'nowrap' }}>{stage.split(' ')[0]}</span><span style={{ fontSize: 8, fontWeight: 900, color: sc }}>{cnt}</span></>}
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Kanban columns */}
                            <div className="scout-dealflow-board" style={{ flex: 1, minHeight: 0, display: 'flex', gap: 10, position: 'relative', zIndex: 1, overflow: 'hidden' }}>
                                {STAGE_ORDER.map(stage => {
                                    const sc = STAGE_COLORS[stage];
                                    const stageCards = filteredDeals.filter(s => s.stage === stage);
                                    const cards = pinned?.kind === 'startup' ? bringToFront(stageCards, s => s.id === pinned.key) : stageCards;
                                    return (
                                        <div key={stage} style={{ flex: 1, minWidth: 0, minHeight: 0, display: 'flex', flexDirection: 'column', borderRadius: 18, border: `1px solid ${sc}28`, background: `linear-gradient(170deg,${sc}0a,rgba(5,5,9,.95) 62%)`, overflow: 'hidden', position: 'relative' }}>
                                            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg,transparent,${sc}90,transparent)` }} />
                                            <div style={{ padding: '12px 12px 8px', flexShrink: 0, borderBottom: `1px solid ${sc}18`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                                                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: sc, boxShadow: `0 0 7px ${sc}`, display: 'inline-block' }} />
                                                    <span style={{ fontSize: 11, fontWeight: 700, color: 'white' }}>{stage}</span>
                                                </div>
                                                <span style={{ fontSize: 13, fontWeight: 900, color: sc, filter: `drop-shadow(0 0 5px ${sc})` }}>{cards.length}</span>
                                            </div>
                                            <div className="sc-scroll" style={{ flex: 1, overflowY: 'auto', padding: '8px', display: 'flex', flexDirection: 'column', gap: 6, minHeight: 0 }}>
                                                {cards.map((s, ci) => {
                                                    const sl = shortlisted.includes(s.id);
                                                    const scoreCol = s.score >= 90 ? '#10b981' : s.score >= 80 ? '#06b6d4' : '#f59e0b';
                                                    return (
                                                        <div key={s.id} className={`df-card${focus?.kind === 'startup' && focus.key === s.id ? ' search-focus' : ''}`} style={{ height: 196, flexShrink: 0, borderRadius: 14, border: `1px solid ${sc}22`, background: `linear-gradient(148deg,${sc}0d,rgba(0,0,0,.62))`, padding: '11px 12px', cursor: 'pointer', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden', animationDelay: `${ci * 0.05}s` }}>
                                                            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg,transparent,${sc}70,transparent)` }} />
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6, flexShrink: 0 }}>
                                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                                    <p style={{ fontSize: 13, fontWeight: 700, color: 'white', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</p>
                                                                    <span className="sc-badge" style={{ background: `${sc}1a`, color: sc, border: `1px solid ${sc}35`, marginTop: 3, display: 'inline-flex' }}>{s.industry}</span>
                                                                </div>
                                                                <div style={{ width: 36, height: 36, borderRadius: '50%', border: `2px solid ${scoreCol}65`, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${scoreCol}0e`, flexShrink: 0 }}>
                                                                    <span style={{ fontSize: 10, fontWeight: 900, color: scoreCol }}>{s.score}</span>
                                                                </div>
                                                            </div>
                                                            <p style={{ fontSize: 10, color: 'rgba(255,255,255,.35)', lineHeight: 1.5, margin: '0 0 8px', flex: 1, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{s.tagline}</p>
                                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 4, marginBottom: 8, flexShrink: 0 }}>
                                                                {[['Pilot Value', s.mrr > 0 ? fmt(s.mrr) : '—'], ['Citizens', s.users > 999 ? Math.round(s.users / 1000) + 'K' : s.users || '—'], ['Impact', s.growth > 0 ? `+${s.growth}%` : '—']].map(([l, v]) => (
                                                                    <div key={l} style={{ padding: '4px 0', borderRadius: 8, background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.07)', textAlign: 'center' }}>
                                                                        <p style={{ fontSize: 7, color: 'rgba(255,255,255,.25)', margin: 0, textTransform: 'uppercase', letterSpacing: '.05em' }}>{l}</p>
                                                                        <p style={{ fontSize: 10, fontWeight: 800, color: 'white', margin: 0 }}>{v}</p>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                            <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
                                                                <button onClick={() => requireMandate(() => { if (sl) { setRevokeReason(''); setRevokeTarget(s); } else { shortlistStartup(s); } })} className="sc-btn" style={{ flex: 1, padding: '5px 0', borderRadius: 999, fontSize: 10, fontWeight: 700, cursor: 'pointer', background: sl ? 'rgba(16,185,129,.15)' : 'rgba(139,92,246,.15)', color: sl ? '#10b981' : '#a78bfa', border: `1px solid ${sl ? 'rgba(16,185,129,.35)' : 'rgba(139,92,246,.35)'}` }}>
                                                                    {sl ? '✓ Listed' : 'Shortlist'}
                                                                </button>
                                                                <button onClick={() => requireMandate(() => { setSelectedStartupId(s.id); setTab('diligence'); })} className="sc-btn" style={{ flex: 1, padding: '5px 0', borderRadius: 999, fontSize: 10, fontWeight: 700, cursor: 'pointer', background: `${sc}18`, color: sc, border: `1px solid ${sc}42` }}>
                                                                    Diligence →
                                                                </button>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                                {cards.length === 0 && <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: .2, fontSize: 11, color: 'white' }}>No deals</div>}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                        );
                    })()}

                    {/* ══ 3. DILIGENCE ROOM ══ */}
                    {tab === 'diligence' && (() => {
                        const docTypeColor: Record<string, string> = {
                            Deck: '#8b5cf6', Sheet: '#10b981', Doc: '#06b6d4',
                            Bundle: '#f59e0b', Video: '#f472b6',
                        };
                        const selectedDocsRaw = diligenceDocs.filter(d => d.startup === selectedStartupName);
                        const selectedDocs = pinned?.kind === 'deck' ? bringToFront(selectedDocsRaw, d => d.id === pinned.key) : selectedDocsRaw;
                        const viewedCount = selectedDocs.filter(d => d.viewed || viewedDocs.includes(d.id)).length;
                        const grantedCount = selectedDocs.filter(d => d.access).length;
                        const pendingCount = selectedDocs.filter(d => !d.access).length;

                        return (
                            <div className="hub-tab-content" style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: '18px 22px', boxSizing: 'border-box', overflow: 'hidden', gap: 14, position: 'relative' }}>

                                {/* ── keyframes ── */}
                                <style>{`
              @keyframes dr-spin   { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
              @keyframes dr-rspin  { from{transform:rotate(0deg)} to{transform:rotate(-360deg)} }
              @keyframes dr-float  { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
              @keyframes dr-drift  { 0%,100%{transform:translate(0,0)} 40%{transform:translate(13px,-11px)} 70%{transform:translate(-9px,9px)} }
              @keyframes dr-morph  { 0%,100%{border-radius:60% 40% 30% 70%/60% 30% 70% 40%} 50%{border-radius:30% 60% 70% 40%/50% 60% 30% 60%} }
              @keyframes dr-flow   { 0%{background-position:-80% 0} 100%{background-position:180% 0} }
              @keyframes dr-pulse  { 0%,100%{opacity:.45;transform:scale(1)} 50%{opacity:1;transform:scale(1.08)} }
              @keyframes dr-glow   { 0%,100%{box-shadow:0 0 8px rgba(139,92,246,.3)} 50%{box-shadow:0 0 22px rgba(139,92,246,.8)} }
              @keyframes dr-scan   { 0%{transform:rotate(0deg)} 100%{transform:rotate(360deg)} }
              @keyframes dr-rise   { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
              @keyframes dr-timeline-pulse { 0%,100%{transform:scale(1);opacity:.7} 50%{transform:scale(1.18);opacity:1} }
              .dr-doc-card { transition: transform .2s ease, box-shadow .2s ease, border-color .2s ease; animation: dr-rise .3s ease both; }
              .dr-doc-card:hover { transform: translateY(-3px) translateX(2px); }
              .dr-kpi-card { transition: transform .18s ease, box-shadow .18s ease; }
              .dr-kpi-card:hover { transform: translateY(-2px); }
              .dr-btn { transition: all .18s ease; }
              .dr-btn:hover { transform: translateY(-1px); filter: brightness(1.15); }
            `}</style>

                                {/* ── CSS ambient BG layer ── */}
                                <div aria-hidden style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
                                    {/* blobs */}
                                    <div style={{ position: 'absolute', top: '4%', right: '8%', width: 260, height: 260, borderRadius: '50%', background: 'radial-gradient(circle,rgba(139,92,246,.08),transparent 70%)', animation: 'dr-drift 11s ease-in-out infinite' }} />
                                    <div style={{ position: 'absolute', bottom: '8%', left: '5%', width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle,rgba(6,182,212,.06),transparent 70%)', animation: 'dr-drift 14s ease-in-out infinite reverse' }} />
                                    <div style={{ position: 'absolute', top: '45%', right: '30%', width: 160, height: 160, borderRadius: '50%', background: 'radial-gradient(circle,rgba(16,185,129,.05),transparent 70%)', animation: 'dr-drift 9s ease-in-out infinite 2s' }} />

                                    {/* orrery top-right */}
                                    <div style={{ position: 'absolute', top: -40, right: -40, width: 220, height: 220 }}>
                                        <div style={{ position: 'absolute', top: '50%', left: '50%', width: 16, height: 16, marginLeft: -8, marginTop: -8, borderRadius: '50%', background: 'radial-gradient(circle at 35% 35%,#c4b5fd,#7c3aed)', boxShadow: '0 0 18px rgba(139,92,246,.9)', animation: 'dr-pulse 2.8s ease-in-out infinite' }} />
                                        {[{ w: 58, c: '#8b5cf6', sp: '3.2s' }, { w: 96, c: '#06b6d4', sp: '5.8s', rev: true }, { w: 148, c: '#10b981', sp: '9.2s' }, { w: 214, c: '#f59e0b', sp: '13s', rev: true }].map((o, i) => (
                                            <div key={i} style={{ position: 'absolute', top: '50%', left: '50%', width: o.w, height: o.w, marginLeft: -o.w / 2, marginTop: -o.w / 2, borderRadius: '50%', border: `1px solid ${o.c}${i < 2 ? '38' : '20'}` }}>
                                                <div style={{ position: 'absolute', top: i % 2 === 0 ? -4 : 'auto', bottom: i % 2 === 1 ? -4 : 'auto', left: '50%', width: 8, height: 8, marginLeft: -4, borderRadius: '50%', background: o.c, boxShadow: `0 0 8px ${o.c}`, animation: `dr-spin ${o.sp} linear infinite ${o.rev ? 'reverse' : ''}`, transformOrigin: `4px ${o.w / 2 + 4}px` }} />
                                            </div>
                                        ))}
                                    </div>

                                    {/* morphing blob bottom-left */}
                                    <div style={{ position: 'absolute', bottom: 24, left: 14, width: 105, height: 105, background: 'linear-gradient(135deg,rgba(139,92,246,.12),rgba(6,182,212,.08))', animation: 'dr-morph 7s ease-in-out infinite', border: '1px solid rgba(139,92,246,.18)' }} />

                                    {/* spinning diamond mid */}
                                    <div style={{ position: 'absolute', bottom: '26%', left: '44%', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 50, height: 50 }}>
                                        <div style={{ position: 'absolute', width: 36, height: 36, border: '2px solid rgba(6,182,212,.35)', borderRadius: 4, animation: 'dr-spin 10s linear infinite', transform: 'rotate(45deg)' }} />
                                        <div style={{ position: 'absolute', width: 18, height: 18, background: 'rgba(6,182,212,.07)', borderRadius: 2, animation: 'dr-rspin 6s linear infinite', transform: 'rotate(45deg)' }} />
                                    </div>

                                    {/* hexagon top-left */}
                                    <div style={{ position: 'absolute', top: '34%', left: '2%', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 56, height: 56 }}>
                                        <div style={{ width: 40, height: 40, border: '2px solid rgba(139,92,246,.28)', borderRadius: 8, animation: 'dr-spin 11s linear infinite', transform: 'rotate(45deg)' }} />
                                        <div style={{ position: 'absolute', width: 22, height: 22, border: '1px solid rgba(139,92,246,.48)', borderRadius: 4, animation: 'dr-rspin 7s linear infinite' }} />
                                    </div>

                                    {/* floating particles */}
                                    {[{ x: '10%', y: '38%', s: 4, c: '#8b5cf6', d: '0s' }, { x: '36%', y: '82%', s: 3, c: '#06b6d4', d: '1s' }, { x: '62%', y: '14%', s: 5, c: '#10b981', d: '2.5s' }, { x: '82%', y: '58%', s: 3, c: '#f59e0b', d: '.5s' }, { x: '50%', y: '70%', s: 3, c: '#f472b6', d: '1.8s' }].map((p, i) => (
                                        <div key={i} style={{ position: 'absolute', left: p.x, top: p.y, width: p.s, height: p.s, borderRadius: '50%', background: p.c, boxShadow: `0 0 ${p.s * 2.5}px ${p.c}`, opacity: .42, animation: `dr-float ${3.5 + i * .5}s ease-in-out ${p.d} infinite` }} />
                                    ))}

                                    {/* flow lines */}
                                    {[{ t: '30%', c: '#8b5cf6', d: '0s' }, { t: '62%', c: '#06b6d4', d: '1.5s' }, { t: '85%', c: '#10b981', d: '3s' }].map((l, i) => (
                                        <div key={i} style={{ position: 'absolute', left: 0, right: 0, top: l.t, height: 1, background: `linear-gradient(90deg,transparent,${l.c}15,transparent)`, backgroundSize: '40% 100%', animation: `dr-flow 7s linear ${l.d} infinite` }} />
                                    ))}
                                </div>

                                {/* ── KPI strip ── */}
                                <div className="sc-stat-grid" style={{ flexShrink: 0, display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, position: 'relative', zIndex: 1 }}>
                                    {[
                                        { label: 'Corporate Decks', val: diligenceDocs.filter(d => d.corporate).length, sub: 'Investor pitch decks', color: '#8b5cf6', Icon: FolderKey },
                                        { label: 'Viewed', val: diligenceDocs.filter(d => d.viewed || viewedDocs.includes(d.id)).length, sub: 'Documents opened', color: '#10b981', Icon: Eye },
                                        { label: 'Access Pending', val: diligenceDocs.filter(d => !d.access).length, sub: 'Awaiting approval', color: '#f59e0b', Icon: Lock },
                                        { label: 'Audit Events', val: auditLog.length, sub: 'Actions logged', color: '#06b6d4', Icon: Shield },
                                    ].map(k => (
                                        <div key={k.label} className="dr-kpi-card" style={{ borderRadius: 16, border: `1px solid ${k.color}25`, background: `linear-gradient(135deg,${k.color}10 0%,rgba(5,5,9,.9) 70%)`, padding: '13px 16px', position: 'relative', overflow: 'hidden', cursor: 'default' }}>
                                            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg,transparent,${k.color}80,transparent)` }} />
                                            <div style={{ position: 'absolute', top: -20, right: -20, width: 80, height: 80, borderRadius: '50%', background: `radial-gradient(circle,${k.color}18,transparent 70%)`, pointerEvents: 'none' }} />
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                                                <p style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,.28)', textTransform: 'uppercase', letterSpacing: '.09em', margin: 0 }}>{k.label}</p>
                                                <div style={{ width: 28, height: 28, borderRadius: 8, background: `${k.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 12px ${k.color}40`, flexShrink: 0 }}>
                                                    <k.Icon style={{ width: 13, height: 13, color: k.color, filter: `drop-shadow(0 0 3px ${k.color})` }} />
                                                </div>
                                            </div>
                                            <p style={{ fontSize: 28, fontWeight: 900, color: 'white', margin: 0, lineHeight: 1, letterSpacing: '-1px', textShadow: `0 0 18px ${k.color}55` }}>{k.val}</p>
                                            <p style={{ fontSize: 10, color: 'rgba(255,255,255,.3)', margin: '4px 0 0' }}>{k.sub}</p>
                                        </div>
                                    ))}
                                </div>

                                {/* ── Startup selector ── */}
                                <div className="sc-dr-selrow" style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10, position: 'relative', zIndex: drSelectOpen ? 30 : 1 }}>
                                    <div className="sc-dr-selector sc-dr-chips" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 6px', borderRadius: 12, background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)' }}>
                                        <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,.3)', textTransform: 'uppercase', letterSpacing: '.08em', padding: '0 6px' }}>Viewing</span>
                                        {startups.map(s => {
                                            const active = selectedStartupId === s.id;
                                            const sc = STAGE_COLORS[s.stage];
                                            const sl = shortlisted.includes(s.id);
                                            return (
                                                <button key={s.id} onClick={() => setSelectedStartupId(s.id)} className="dr-btn" style={{ padding: '6px 14px', borderRadius: 9, fontSize: 11, fontWeight: 700, cursor: 'pointer', background: active ? `${sc}22` : 'transparent', color: active ? sc : 'rgba(255,255,255,.38)', border: `1px solid ${active ? sc + '55' : 'transparent'}`, boxShadow: active ? `0 0 12px ${sc}28` : 'none', position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', gap: 5 }}>
                                                    {active && <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg,transparent,${sc}90,transparent)` }} />}
                                                    {sl && <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 5px #10b981', flexShrink: 0 }} />}
                                                    {s.name}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    {/* Mobile picker — custom themed dropdown (replaces the native <select> on small screens) */}
                                    <div className="sc-dr-select-wrap" style={{ display: 'none', alignItems: 'center', gap: 8, flex: '1 1 100%' }}>
                                        <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,.3)', textTransform: 'uppercase', letterSpacing: '.08em', flexShrink: 0 }}>Viewing</span>
                                        <div ref={drSelectRef} style={{ position: 'relative', flex: 1, minWidth: 0 }}>
                                            <button
                                                type="button"
                                                onClick={() => setDrSelectOpen(o => !o)}
                                                aria-haspopup="listbox"
                                                aria-expanded={drSelectOpen}
                                                className="sc-btn"
                                                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 10, background: 'rgba(255,255,255,.05)', border: `1px solid ${drSelectOpen ? 'rgba(139,92,246,.5)' : 'rgba(255,255,255,.14)'}`, color: 'white', fontSize: 13, fontWeight: 700, cursor: 'pointer', textAlign: 'left', boxShadow: drSelectOpen ? '0 0 14px rgba(139,92,246,.28)' : 'none' }}
                                            >
                                                <span style={{ width: 7, height: 7, borderRadius: '50%', background: STAGE_COLORS[selectedStartupObj.stage] || '#8b5cf6', boxShadow: `0 0 7px ${STAGE_COLORS[selectedStartupObj.stage] || '#8b5cf6'}`, flexShrink: 0 }} />
                                                <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedStartupObj.name}</span>
                                                {shortlisted.includes(selectedStartupObj.id) && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 9, fontWeight: 800, color: '#fbbf24', flexShrink: 0 }}><Star style={{ width: 10, height: 10, fill: '#fbbf24' }} />Shortlisted</span>}
                                                <ChevronRight style={{ width: 14, height: 14, color: 'rgba(255,255,255,.5)', transform: drSelectOpen ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform .18s', flexShrink: 0 }} />
                                            </button>
                                            {drSelectOpen && (
                                                <div className="notif-scroll" role="listbox" style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, maxHeight: 300, overflowY: 'auto', zIndex: 41, background: 'rgba(8,8,16,.97)', border: '1px solid rgba(255,255,255,.1)', borderTop: '2px solid rgba(139,92,246,.55)', borderRadius: 14, boxShadow: '0 24px 70px rgba(0,0,0,.7)', backdropFilter: 'blur(14px)', padding: 8 }}>
                                                    <div style={{ padding: '4px 8px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,.06)' }}>
                                                        <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,.55)' }}>Select a startup</span>
                                                        <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,.3)' }}>{startups.length}</span>
                                                    </div>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginTop: 8 }}>
                                                        {startups.map(s => {
                                                            const active = selectedStartupId === s.id;
                                                            const sc = STAGE_COLORS[s.stage] || '#8b5cf6';
                                                            const sl = shortlisted.includes(s.id);
                                                            return (
                                                                <button key={s.id} role="option" aria-selected={active} onClick={() => { setSelectedStartupId(s.id); setDrSelectOpen(false); }} className="dr-btn" style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left', padding: '9px 10px', borderRadius: 10, background: active ? 'rgba(139,92,246,.14)' : 'transparent', border: `1px solid ${active ? 'rgba(139,92,246,.34)' : 'rgba(255,255,255,.06)'}`, cursor: 'pointer' }}>
                                                                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: sc, boxShadow: `0 0 7px ${sc}`, flexShrink: 0 }} />
                                                                    <span style={{ flex: 1, minWidth: 0, fontSize: 12.5, fontWeight: 600, color: active ? 'white' : 'rgba(255,255,255,.66)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</span>
                                                                    {sl && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 8.5, fontWeight: 800, padding: '2px 6px', borderRadius: 999, background: 'rgba(251,191,36,.14)', color: '#fbbf24', flexShrink: 0 }}><Star style={{ width: 8, height: 8, fill: '#fbbf24' }} />Shortlisted</span>}
                                                                    {active && <Check style={{ width: 14, height: 14, color: '#a78bfa', flexShrink: 0 }} />}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
                                        {[
                                            { val: selectedDocs.length, label: 'docs', col: '#a78bfa' },
                                            { val: viewedCount, label: 'viewed', col: '#10b981' },
                                            { val: pendingCount, label: 'pending', col: '#f59e0b' },
                                        ].map(p => (
                                            <div key={p.label} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 8, background: `${p.col}0d`, border: `1px solid ${p.col}22` }}>
                                                <span style={{ fontSize: 13, fontWeight: 800, color: p.col }}>{p.val}</span>
                                                <span style={{ fontSize: 10, color: 'rgba(255,255,255,.3)' }}>{p.label}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* ── Main 2-col layout ── */}
                                <div className="sc-tab-main-grid" style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: '1fr 290px', gap: 14, position: 'relative', zIndex: 1 }}>

                                    {/* ── LEFT: Document Vault ── */}
                                    <div className="sc-tab-panel-left" style={{ borderRadius: 18, border: '1px solid rgba(255,255,255,.07)', background: 'rgba(255,255,255,.025)', display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
                                        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg,transparent,rgba(139,92,246,.7),transparent)' }} />

                                        {/* vault header */}
                                        <div style={{ padding: '13px 18px', borderBottom: '1px solid rgba(255,255,255,.06)', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                                            <div style={{ width: 32, height: 32, borderRadius: 10, background: 'rgba(139,92,246,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 14px rgba(139,92,246,.45)' }}>
                                                <FolderKey style={{ width: 14, height: 14, color: '#a78bfa', filter: 'drop-shadow(0 0 4px #a78bfa)' }} />
                                            </div>
                                            <div>
                                                <p style={{ fontSize: 13, fontWeight: 700, color: 'white', margin: 0 }}>Secure Document Vault</p>
                                                <p style={{ fontSize: 10, color: 'rgba(255,255,255,.3)', margin: 0 }}>{selectedStartupName} · {selectedDocs.filter(d => d.corporate).length} corporate {selectedDocs.filter(d => d.corporate).length === 1 ? 'deck' : 'decks'} · {selectedDocs.length} docs</p>
                                            </div>
                                            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 999, background: 'rgba(16,185,129,.1)', border: '1px solid rgba(16,185,129,.28)' }}>
                                                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 6px #10b981', animation: 'sc-pulse2 2.2s ease-in-out infinite' }} />
                                                <span style={{ fontSize: 9, fontWeight: 700, color: '#10b981', letterSpacing: '.08em' }}>END-TO-END ENCRYPTED</span>
                                            </div>
                                        </div>

                                        {/* doc list */}
                                        <div className="sc-scroll" style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                                            {selectedDocs.length === 0 && (
                                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, opacity: .3, minHeight: 160 }}>
                                                    <FolderKey style={{ width: 38, height: 38 }} />
                                                    <p style={{ fontSize: 13, color: 'white', margin: 0 }}>No documents for {selectedStartupName}</p>
                                                </div>
                                            )}
                                            {selectedDocs.map((doc, idx) => {
                                                const tc = docTypeColor[doc.type] || '#8b5cf6';
                                                const isViewed = doc.viewed || viewedDocs.includes(doc.id);
                                                const requested = accessRequests.includes(doc.id);
                                                return (
                                                    <div key={doc.id} className={`dr-doc-card${focus?.kind === 'deck' && focus.key === doc.id ? ' search-focus' : ''}`} style={{ borderRadius: 16, border: `1px solid ${tc}28`, background: `linear-gradient(145deg,${tc}0c 0%,rgba(5,5,9,.85) 100%)`, padding: '16px 18px', cursor: 'pointer', position: 'relative', overflow: 'hidden', animationDelay: `${idx * 0.06}s` }}>
                                                        {/* top accent line */}
                                                        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1.5, background: `linear-gradient(90deg,transparent,${tc}75,transparent)` }} />
                                                        {/* corner glow */}
                                                        <div style={{ position: 'absolute', top: -30, right: -30, width: 120, height: 120, borderRadius: '50%', background: `radial-gradient(circle,${tc}18,transparent 70%)`, pointerEvents: 'none' }} />

                                                        <div className="dr-doc-row" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                                                            {/* 3D doc icon */}
                                                            <DocComet typeColor={tc} docType={doc.type} />

                                                            {/* content */}
                                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                                <div className="dr-doc-head" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                                                                    <span style={{ fontSize: 13, fontWeight: 700, color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.name}</span>
                                                                    {doc.corporate && (
                                                                        <div title="Corporate pitch deck — verified investors only" style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 999, background: 'rgba(6,182,212,.12)', border: '1px solid rgba(6,182,212,.32)', flexShrink: 0 }}>
                                                                            <Shield style={{ width: 9, height: 9, color: '#06b6d4' }} />
                                                                            <span style={{ fontSize: 9, fontWeight: 800, color: '#06b6d4', letterSpacing: '.05em' }}>CONFIDENTIAL · DEPT ONLY</span>
                                                                        </div>
                                                                    )}
                                                                    {isViewed && (
                                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 999, background: 'rgba(16,185,129,.14)', border: '1px solid rgba(16,185,129,.32)', flexShrink: 0 }}>
                                                                            <Eye style={{ width: 9, height: 9, color: '#10b981' }} />
                                                                            <span style={{ fontSize: 9, fontWeight: 700, color: '#10b981' }}>Viewed</span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                                                                    <span style={{ fontSize: 9, fontWeight: 800, padding: '3px 9px', borderRadius: 999, color: tc, background: `${tc}18`, border: `1px solid ${tc}38`, textTransform: 'uppercase', letterSpacing: '.06em' }}>{doc.type}</span>
                                                                    <span style={{ fontSize: 10, color: 'rgba(255,255,255,.3)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                                                        <Clock style={{ width: 9, height: 9 }} />Added {doc.date}
                                                                    </span>
                                                                    <span style={{ fontSize: 10, color: 'rgba(255,255,255,.28)' }}>{doc.size}</span>
                                                                    {doc.viewed && doc.viewedAt && (
                                                                        <span style={{ fontSize: 10, color: 'rgba(16,185,129,.7)' }}>· {doc.viewedAt}</span>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            {/* action buttons */}
                                                            <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                                                                {doc.access ? (
                                                                    <>
                                                                        <button onClick={() => requireMandate(() => { const firstView = !viewedDocs.includes(doc.id); setViewedDocs(prev => prev.includes(doc.id) ? prev : [...prev, doc.id]); setDocOpen(doc); if (firstView) logAudit('Viewed', doc); })} className="dr-btn" aria-label={`View ${doc.name}`} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 10, background: `${tc}20`, border: `1px solid ${tc}45`, color: tc, fontSize: 11, fontWeight: 700, cursor: 'pointer', boxShadow: `0 0 10px ${tc}25` }}>
                                                                            <Eye style={{ width: 11, height: 11 }} />View
                                                                        </button>
                                                                        <button onClick={() => requireMandate(() => { if (doc.file_url) { window.open(doc.file_url, '_blank', 'noopener'); showToast(`Opening ${doc.name}…`, tc); } else { showToast(`Downloading ${doc.name}…`, tc); } logAudit('Downloaded', doc); })} className="dr-btn" aria-label={`Download ${doc.name}`} style={{ width: 34, height: 34, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.1)', color: 'rgba(255,255,255,.45)', cursor: 'pointer' }}>
                                                                            <Download style={{ width: 12, height: 12 }} />
                                                                        </button>
                                                                    </>
                                                                ) : (
                                                                    <button
                                                                        onClick={() => requireMandate(() => { if (!requested) { setAccessRequests(prev => [...prev, doc.id]); showToast(`Access requested — ${doc.name}`, '#f59e0b'); logAudit('Requested', doc); } })}
                                                                        disabled={requested}
                                                                        className="dr-btn"
                                                                        aria-label={requested ? `Access requested for ${doc.name}` : `Request access to ${doc.name}`}
                                                                        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 10, background: requested ? 'rgba(16,185,129,.12)' : 'rgba(245,158,11,.12)', border: `1px solid ${requested ? 'rgba(16,185,129,.3)' : 'rgba(245,158,11,.3)'}`, color: requested ? '#10b981' : '#f59e0b', fontSize: 11, fontWeight: 700, cursor: requested ? 'default' : 'pointer' }}>
                                                                        {requested ? <><Clock style={{ width: 11, height: 11 }} />Requested</> : <><Lock style={{ width: 11, height: 11 }} />Request Access</>}
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* access/view status bar */}
                                                        <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                                                            <div style={{ flex: 1, height: 3, borderRadius: 2, background: 'rgba(255,255,255,.05)', overflow: 'hidden' }}>
                                                                <div style={{ height: '100%', borderRadius: 2, width: doc.access ? '100%' : requested ? '65%' : '35%', background: doc.access ? `linear-gradient(90deg,${tc},${tc}70)` : requested ? 'linear-gradient(90deg,#10b981,#10b98160)' : 'linear-gradient(90deg,#f59e0b,#f59e0b60)', boxShadow: `0 0 6px ${doc.access ? tc : requested ? '#10b981' : '#f59e0b'}55`, transition: 'width .6s ease' }} />
                                                            </div>
                                                            <span style={{ fontSize: 9, fontWeight: 700, color: doc.access ? tc : requested ? '#10b981' : '#f59e0b', flexShrink: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>
                                                                {doc.access ? 'Access Granted' : requested ? 'Request Sent' : 'Pending Approval'}
                                                            </span>
                                                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: doc.access ? '#10b981' : requested ? '#10b981' : '#f59e0b', boxShadow: `0 0 6px ${doc.access ? '#10b981' : requested ? '#10b981' : '#f59e0b'}`, flexShrink: 0, animation: doc.access || requested ? 'none' : 'sc-pulse2 1.8s ease-in-out infinite' }} />
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* ── RIGHT column ── */}
                                    <div className="sc-tab-sidebar" style={{ display: 'flex', flexDirection: 'column', gap: 12, minHeight: 0, overflow: 'hidden' }}>

                                        {/* ── Audit Log as timeline ── */}
                                        <div style={{ flex: 1, minHeight: 0, borderRadius: 18, border: '1px solid rgba(255,255,255,.07)', background: 'rgba(255,255,255,.025)', display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
                                            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg,transparent,rgba(6,182,212,.7),transparent)' }} />
                                            <div style={{ padding: '13px 16px', borderBottom: '1px solid rgba(255,255,255,.06)', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                                                <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(6,182,212,.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 10px rgba(6,182,212,.4)' }}>
                                                    <Activity style={{ width: 12, height: 12, color: '#06b6d4', filter: 'drop-shadow(0 0 3px #06b6d4)' }} />
                                                </div>
                                                <div>
                                                    <p style={{ fontSize: 12, fontWeight: 700, color: 'white', margin: 0 }}>Audit Log</p>
                                                    <p style={{ fontSize: 9, color: 'rgba(255,255,255,.28)', margin: 0 }}>{auditLog.length} events recorded</p>
                                                </div>
                                                <div style={{ marginLeft: 'auto', width: 18, height: 18, borderRadius: '50%', background: 'rgba(16,185,129,.2)', border: '1px solid rgba(16,185,129,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 800, color: '#10b981' }}>{auditLog.length}</div>
                                            </div>

                                            {/* timeline */}
                                            <div className="sc-scroll" style={{ flex: 1, overflowY: 'auto', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 0, minHeight: 0, position: 'relative' }}>
                                                {/* vertical connecting line */}
                                                {auditLog.length > 0 && <div style={{ position: 'absolute', left: 28, top: 14, bottom: 14, width: 1, background: 'linear-gradient(180deg,rgba(139,92,246,.4) 0%,rgba(6,182,212,.2) 50%,rgba(255,255,255,.05) 100%)' }} />}

                                                {auditLog.length === 0 && (
                                                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, opacity: .4, minHeight: 140, textAlign: 'center' }}>
                                                        <Activity style={{ width: 30, height: 30 }} />
                                                        <p style={{ fontSize: 11, color: 'white', margin: 0, lineHeight: 1.5 }}>No activity yet.<br />Views, requests &amp; downloads are logged here in real time.</p>
                                                    </div>
                                                )}

                                                {auditLog.map((entry, idx) => {
                                                    const ec = entry.action === 'Viewed' ? '#10b981' : entry.action === 'Downloaded' ? '#06b6d4' : '#f59e0b';
                                                    const ActionIcon = entry.action === 'Viewed' ? Eye : entry.action === 'Downloaded' ? Download : Lock;
                                                    return (
                                                        <div key={entry.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, paddingBottom: idx < auditLog.length - 1 ? 14 : 0, position: 'relative' }}>
                                                            {/* timeline dot */}
                                                            <div style={{ width: 28, height: 28, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', zIndex: 1 }}>
                                                                <div style={{ width: 22, height: 22, borderRadius: '50%', background: `${ec}18`, border: `1.5px solid ${ec}60`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 10px ${ec}40`, animation: idx === 0 ? 'dr-timeline-pulse 2.5s ease-in-out infinite' : 'none' }}>
                                                                    <ActionIcon style={{ width: 9, height: 9, color: ec }} />
                                                                </div>
                                                            </div>

                                                            {/* content */}
                                                            <div style={{ flex: 1, minWidth: 0, padding: '6px 10px', borderRadius: 11, background: `${ec}06`, border: `1px solid ${ec}18`, borderLeft: `2px solid ${ec}55` }}>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                                                                    <span style={{ fontSize: 9, fontWeight: 800, padding: '2px 7px', borderRadius: 999, background: `${ec}18`, color: ec, border: `1px solid ${ec}35`, textTransform: 'uppercase', letterSpacing: '.05em' }}>{entry.action}</span>
                                                                    {idx === 0 && <span style={{ fontSize: 8, fontWeight: 700, color: '#10b981', background: 'rgba(16,185,129,.12)', padding: '1px 6px', borderRadius: 999, border: '1px solid rgba(16,185,129,.25)' }}>Latest</span>}
                                                                </div>
                                                                <p style={{ fontSize: 11, color: 'rgba(255,255,255,.75)', margin: 0, lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.doc}</p>
                                                                <p style={{ fontSize: 9, color: 'rgba(255,255,255,.28)', margin: '3px 0 0' }}>{entry.at}{entry.by ? ` · ${entry.by}` : ''}</p>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {/* ── Access Status with SVG rings ── */}
                                        <div style={{ flexShrink: 0, borderRadius: 18, border: '1px solid rgba(255,255,255,.07)', background: 'rgba(255,255,255,.025)', padding: '14px 16px', position: 'relative', overflow: 'hidden' }}>
                                            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg,transparent,rgba(139,92,246,.7),transparent)' }} />
                                            <div style={{ position: 'absolute', top: -30, right: -30, width: 120, height: 120, borderRadius: '50%', background: 'radial-gradient(circle,rgba(139,92,246,.1),transparent 70%)', pointerEvents: 'none' }} />

                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                                                <Shield style={{ width: 12, height: 12, color: '#a78bfa' }} />
                                                <p style={{ fontSize: 12, fontWeight: 700, color: 'white', margin: 0 }}>Access Status</p>
                                                <span style={{ marginLeft: 'auto', fontSize: 10, color: 'rgba(255,255,255,.28)' }}>{selectedStartupName}</span>
                                            </div>

                                            {/* 3 SVG ring gauges in a row */}
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
                                                {[
                                                    { label: 'Granted', count: grantedCount, total: selectedDocs.length, color: '#10b981', Icon: CheckCircle },
                                                    { label: 'Pending', count: pendingCount, total: selectedDocs.length, color: '#f59e0b', Icon: Clock },
                                                    { label: 'Viewed', count: viewedCount, total: selectedDocs.length, color: '#06b6d4', Icon: Eye },
                                                ].map(s => {
                                                    const pct = selectedDocs.length > 0 ? (s.count / selectedDocs.length) : 0;
                                                    const r = 22, circ = 2 * Math.PI * r;
                                                    const dash = pct * circ;
                                                    return (
                                                        <div key={s.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '10px 6px', borderRadius: 12, background: `${s.color}08`, border: `1px solid ${s.color}20` }}>
                                                            {/* SVG ring */}
                                                            <div style={{ position: 'relative', width: 54, height: 54 }}>
                                                                <svg width={54} height={54} viewBox="0 0 54 54">
                                                                    <circle cx="27" cy="27" r={r} fill="none" stroke={`${s.color}20`} strokeWidth="4" />
                                                                    <circle cx="27" cy="27" r={r} fill="none" stroke={s.color} strokeWidth="4"
                                                                        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
                                                                        transform="rotate(-90 27 27)"
                                                                        style={{ filter: `drop-shadow(0 0 4px ${s.color}80)` }}
                                                                    />
                                                                    {/* moving dot on ring */}
                                                                    <circle
                                                                        cx={27 + r * Math.cos((-Math.PI / 2) + pct * 2 * Math.PI)}
                                                                        cy={27 + r * Math.sin((-Math.PI / 2) + pct * 2 * Math.PI)}
                                                                        r="3" fill={s.color}
                                                                        style={{ filter: `drop-shadow(0 0 4px ${s.color})` }}
                                                                    />
                                                                </svg>
                                                                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                                                                    <span style={{ fontSize: 14, fontWeight: 900, color: s.color, lineHeight: 1, filter: `drop-shadow(0 0 5px ${s.color}80)` }}>{s.count}</span>
                                                                </div>
                                                            </div>
                                                            {/* label + icon */}
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                                                <s.Icon style={{ width: 10, height: 10, color: s.color }} />
                                                                <span style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,.5)' }}>{s.label}</span>
                                                            </div>
                                                            <span style={{ fontSize: 9, fontWeight: 700, color: s.color }}>{Math.round(pct * 100)}%</span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })()}

                    {/* ══ 4. STARTUP NETWORK ══ */}
                    {tab === 'network' && (() => {
                        const TAG_COL: Record<string, string> = { SaaS: '#8b5cf6', FinTech: '#06b6d4', DeepTech: '#10b981', HealthTech: '#f59e0b' };
                        const activityDays = (s: string) => parseInt(s) || 0;
                        const health = (c: typeof NETWORK_CONTACTS[0]) => {
                            const d = activityDays(c.lastContact);
                            if (d <= 2) return { label: 'Active', col: '#10b981' };
                            if (d <= 7) return { label: 'Warm', col: '#f59e0b' };
                            return { label: 'Cold', col: '#f87171' };
                        };
                        return (
                        <div className="hub-tab-content" style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: '20px 24px', boxSizing: 'border-box', overflow: 'hidden', gap: 14, position: 'relative' }}>
                            <NetworkStarMap />
                            <style>{`
                              @keyframes nw-drift{0%,100%{transform:translate(0,0)}40%{transform:translate(12px,-10px)}70%{transform:translate(-8px,8px)}}
                              @keyframes nw-glow{0%,100%{opacity:.45}50%{opacity:1}}
                              @keyframes nw-rise{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
                              @keyframes nw-spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
                              @keyframes nw-rspin{from{transform:rotate(0deg)}to{transform:rotate(-360deg)}}
                              @keyframes nw-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-9px)}}
                              @keyframes nw-morph{0%,100%{border-radius:60% 40% 30% 70%/60% 30% 70% 40%}50%{border-radius:30% 60% 70% 40%/50% 60% 30% 60%}}
                              @keyframes nw-flow{0%{background-position:-80% 0}100%{background-position:180% 0}}
                              @keyframes nw-pulse-ring{0%{transform:scale(1);opacity:.7}100%{transform:scale(2.4);opacity:0}}
                              @keyframes nw-shimmer{0%{transform:translateX(-120%) skewX(-12deg)}100%{transform:translateX(240%) skewX(-12deg)}}
                              @keyframes nw-holo{0%,100%{opacity:.4}50%{opacity:.8}}
                              .nw-card{
                                transition:transform .25s cubic-bezier(.4,0,.2,1),box-shadow .25s ease;
                                animation:nw-rise .35s ease both;
                              }
                              .nw-card:hover{
                                transform:translateY(-7px) scale(1.016);
                                box-shadow:0 30px 80px rgba(0,0,0,.75),0 0 0 1px rgba(255,255,255,.1),0 0 60px rgba(139,92,246,.12)!important;
                              }
                              .nw-card:hover .nw-shimmer{
                                animation:nw-shimmer .65s ease forwards;
                              }
                              .nw-action{transition:all .18s ease;}
                              .nw-action:hover{filter:brightness(1.3);transform:translateY(-2px);}
                              .nw-kpi{transition:transform .2s ease,box-shadow .2s ease;}
                              .nw-kpi:hover{transform:translateY(-4px) scale(1.02);box-shadow:0 16px 40px rgba(0,0,0,.55)!important;}
                              .nw-panel{transition:box-shadow .2s ease,border-color .2s ease;}
                              .nw-panel:hover{box-shadow:0 0 0 1px rgba(255,255,255,.1),0 20px 60px rgba(0,0,0,.45)!important;}
                            `}</style>

                            {/* ── ULTRA ambient BG ── */}
                            <div aria-hidden style={{ position:'absolute',inset:0,overflow:'hidden',pointerEvents:'none',zIndex:0 }}>
                                {/* gradient blob orbs */}
                                <div style={{ position:'absolute',top:'-8%',left:'2%',width:520,height:520,borderRadius:'50%',background:'radial-gradient(circle,rgba(139,92,246,.06),transparent 65%)',animation:'nw-drift 15s ease-in-out infinite',filter:'blur(2px)' }} />
                                <div style={{ position:'absolute',bottom:'-4%',right:'4%',width:420,height:420,borderRadius:'50%',background:'radial-gradient(circle,rgba(6,182,212,.05),transparent 65%)',animation:'nw-drift 19s ease-in-out infinite reverse',filter:'blur(2px)' }} />
                                <div style={{ position:'absolute',top:'45%',left:'38%',width:300,height:300,borderRadius:'50%',background:'radial-gradient(circle,rgba(16,185,129,.04),transparent 65%)',animation:'nw-drift 12s ease-in-out infinite 4s' }} />
                                {/* morphing blob decorators */}
                                <div style={{ position:'absolute',bottom:'6%',left:'5%',width:180,height:180,background:'linear-gradient(135deg,rgba(139,92,246,.1),rgba(6,182,212,.06))',animation:'nw-morph 9s ease-in-out infinite',border:'1px solid rgba(139,92,246,.14)',filter:'blur(1px)' }} />
                                <div style={{ position:'absolute',top:'12%',right:'10%',width:110,height:110,background:'linear-gradient(135deg,rgba(6,182,212,.08),rgba(16,185,129,.05))',animation:'nw-morph 13s ease-in-out infinite reverse',border:'1px solid rgba(6,182,212,.1)' }} />
                                {/* premium orrery — top right corner */}
                                <div style={{ position:'absolute',top:-70,right:-70,width:300,height:300 }}>
                                    <div style={{ position:'absolute',top:'50%',left:'50%',width:14,height:14,marginLeft:-7,marginTop:-7,borderRadius:'50%',background:'radial-gradient(circle at 35% 35%,#c4b5fd,#7c3aed)',boxShadow:'0 0 22px rgba(139,92,246,.9),0 0 44px rgba(139,92,246,.4)',animation:'nw-glow 2.5s ease-in-out infinite' }} />
                                    {[
                                        { w:72,  c:'#8b5cf6', sp:'4.2s' },
                                        { w:118, c:'#06b6d4', sp:'7.5s', rev:true },
                                        { w:178, c:'#10b981', sp:'12s' },
                                        { w:248, c:'#f59e0b', sp:'17s', rev:true },
                                    ].map((o,i)=>(
                                        <div key={i} style={{ position:'absolute',top:'50%',left:'50%',width:o.w,height:o.w,marginLeft:-o.w/2,marginTop:-o.w/2,borderRadius:'50%',border:`1px solid ${o.c}${i<2?'42':'22'}` }}>
                                            <div style={{ position:'absolute',top:i%2===0?-5:'auto',bottom:i%2===1?-5:'auto',left:'50%',width:10,height:10,marginLeft:-5,borderRadius:'50%',background:o.c,boxShadow:`0 0 12px ${o.c},0 0 24px ${o.c}60`,animation:`nw-spin ${o.sp} linear infinite ${'rev' in o && o.rev?'reverse':''}`,transformOrigin:`5px ${o.w/2+5}px` }} />
                                        </div>
                                    ))}
                                </div>
                                {/* spinning diamond left-center */}
                                <div style={{ position:'absolute',bottom:'28%',left:'34%',display:'flex',alignItems:'center',justifyContent:'center',width:64,height:64 }}>
                                    <div style={{ position:'absolute',width:48,height:48,border:'1.5px solid rgba(139,92,246,.28)',borderRadius:6,animation:'nw-spin 11s linear infinite',transform:'rotate(45deg)' }} />
                                    <div style={{ position:'absolute',width:24,height:24,background:'rgba(139,92,246,.05)',borderRadius:3,animation:'nw-rspin 7s linear infinite',transform:'rotate(45deg)' }} />
                                    <div style={{ width:6,height:6,borderRadius:'50%',background:'rgba(139,92,246,.55)',boxShadow:'0 0 12px rgba(139,92,246,.75)' }} />
                                </div>
                                {/* floating glow particles */}
                                {[
                                    {x:'7%',y:'62%',s:5,c:'#8b5cf6',d:'0s'},{x:'21%',y:'28%',s:3,c:'#06b6d4',d:'1.2s'},
                                    {x:'54%',y:'10%',s:4,c:'#10b981',d:'2.6s'},{x:'74%',y:'58%',s:3,c:'#f59e0b',d:'.7s'},
                                    {x:'17%',y:'82%',s:3,c:'#06b6d4',d:'2s'},{x:'43%',y:'73%',s:5,c:'#8b5cf6',d:'3.3s'},
                                    {x:'87%',y:'22%',s:3,c:'#10b981',d:'1.5s'},{x:'61%',y:'86%',s:4,c:'#f59e0b',d:'.3s'},
                                ].map((p,i)=>(
                                    <div key={i} style={{ position:'absolute',left:p.x,top:p.y,width:p.s,height:p.s,borderRadius:'50%',background:p.c,boxShadow:`0 0 ${p.s*3}px ${p.c}`,animation:`nw-float ${3+i*.4}s ease-in-out ${p.d} infinite`,opacity:.5 }} />
                                ))}
                                {/* animated horizontal flow lines */}
                                {[{d:'0s',dur:'9s',c:'#8b5cf6'},{d:'3s',dur:'12s',c:'#06b6d4'},{d:'6s',dur:'15s',c:'#10b981'}].map((l,i)=>(
                                    <div key={i} style={{ position:'absolute',left:0,right:0,top:`${22+i*28}%`,height:1,background:`linear-gradient(90deg,transparent,${l.c}16,transparent)`,backgroundSize:'38% 100%',animation:`nw-flow ${l.dur} linear ${l.d} infinite` }} />
                                ))}
                                {/* subtle perspective grid */}
                                <div style={{ position:'absolute',inset:0,backgroundImage:`linear-gradient(rgba(139,92,246,.022) 1px,transparent 1px),linear-gradient(90deg,rgba(139,92,246,.022) 1px,transparent 1px)`,backgroundSize:'64px 64px',opacity:.7 }} />
                            </div>

                            {/* ── ELITE Header ── */}
                            <div className="sc-network-header" style={{ flexShrink:0,display:'flex',alignItems:'center',justifyContent:'space-between',position:'relative',zIndex:1 }}>
                                <div style={{ display:'flex',flexDirection:'column',gap:5 }}>
                                    <div style={{ display:'flex',alignItems:'center',gap:12 }}>
                                        <div style={{ position:'relative',width:32,height:32,borderRadius:10,background:'linear-gradient(135deg,rgba(139,92,246,.35),rgba(6,182,212,.2))',border:'1px solid rgba(139,92,246,.45)',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 0 20px rgba(139,92,246,.3)' }}>
                                            <Users style={{ width:15,height:15,color:'#c4b5fd' }} />
                                            <div style={{ position:'absolute',top:-3,right:-3,width:9,height:9,borderRadius:'50%',background:'#10b981',boxShadow:'0 0 10px #10b981',border:'1.5px solid rgba(10,10,22,.9)' }} />
                                        </div>
                                        <h2 style={{ fontSize:21,fontWeight:900,margin:0,letterSpacing:'-.5px',background:'linear-gradient(135deg,#ffffff 30%,rgba(196,181,253,.85) 65%,rgba(34,211,238,.7))',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',backgroundClip:'text' }}>Founder Network</h2>
                                        <div style={{ padding:'3px 10px',borderRadius:999,background:'rgba(16,185,129,.1)',border:'1px solid rgba(16,185,129,.35)',fontSize:9,fontWeight:900,color:'#10b981',textTransform:'uppercase',letterSpacing:'.1em',boxShadow:'0 0 14px rgba(16,185,129,.18)' }}>LIVE</div>
                                    </div>
                                    <p style={{ fontSize:11,color:'rgba(255,255,255,.32)',margin:0,paddingLeft:44 }}>
                                        {NETWORK_CONTACTS.length} founders · {NETWORK_CONTACTS.reduce((a,c)=>a+c.meetings,0)} meetings · {NETWORK_CONTACTS.reduce((a,c)=>a+c.msgs,0)} messages
                                    </p>
                                </div>
                                <div style={{ display:'flex',alignItems:'center',gap:8,marginLeft:'auto' }}>
                                    {[{l:'Active',c:'#10b981'},{l:'Warm',c:'#f59e0b'},{l:'Cold',c:'#f87171'}].map(h=>(
                                        <div key={h.l} style={{ display:'flex',alignItems:'center',gap:6,padding:'5px 13px',borderRadius:999,background:`${h.c}0e`,border:`1px solid ${h.c}32`,backdropFilter:'blur(8px)' }}>
                                            <div style={{ position:'relative',width:7,height:7 }}>
                                                <div style={{ position:'absolute',inset:0,borderRadius:'50%',background:h.c,boxShadow:`0 0 7px ${h.c}` }} />
                                                <div style={{ position:'absolute',inset:-3,borderRadius:'50%',border:`1px solid ${h.c}50`,animation:'nw-pulse-ring 2.2s ease-out infinite' }} />
                                            </div>
                                            <span style={{ fontSize:10,fontWeight:700,color:h.c }}>{h.l}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* ── HOLOGRAPHIC KPI BAR ── */}
                            <div className="sc-stat-grid" style={{ flexShrink:0,display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,position:'relative',zIndex:1 }}>
                                {[
                                    { label:'Total Contacts', value:NETWORK_CONTACTS.length, color:'#8b5cf6', sub:'in network', icon:'⬡' },
                                    { label:'Total Meetings', value:NETWORK_CONTACTS.reduce((a,c)=>a+c.meetings,0), color:'#06b6d4', sub:'scheduled', icon:'◈' },
                                    { label:'Messages', value:NETWORK_CONTACTS.reduce((a,c)=>a+c.msgs,0), color:'#10b981', sub:'exchanged', icon:'◎' },
                                    { label:'Active Relations', value:NETWORK_CONTACTS.filter(c=>parseInt(c.lastContact)<=3).length, color:'#f59e0b', sub:'last 3 days', icon:'◆' },
                                ].map((k,i)=>(
                                    <div key={k.label} className="nw-kpi" style={{ padding:'14px 16px',borderRadius:14,background:'linear-gradient(145deg,rgba(12,12,26,.96),rgba(7,7,18,.99))',border:`1px solid ${k.color}22`,position:'relative',overflow:'hidden',boxShadow:`0 10px 30px rgba(0,0,0,.45),0 0 0 1px rgba(255,255,255,.035)`,backdropFilter:'blur(12px)',animation:`nw-rise .3s ease ${i*.065}s both` }}>
                                        {/* chromatic top bar */}
                                        <div style={{ position:'absolute',top:0,left:0,right:0,height:2,background:`linear-gradient(90deg,transparent,${k.color},transparent)`,opacity:.85 }} />
                                        {/* corner glow orb */}
                                        <div style={{ position:'absolute',top:-24,right:-24,width:90,height:90,borderRadius:'50%',background:`radial-gradient(circle,${k.color}22,transparent 70%)` }} />
                                        {/* CRT scanlines */}
                                        <div style={{ position:'absolute',inset:0,backgroundImage:`repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(255,255,255,.007) 3px,rgba(255,255,255,.007) 4px)`,pointerEvents:'none' }} />
                                        <div style={{ position:'relative' }}>
                                            <p style={{ fontSize:9,color:'rgba(255,255,255,.32)',margin:'0 0 7px',textTransform:'uppercase',letterSpacing:'.08em',fontWeight:700 }}>{k.label}</p>
                                            <p style={{ fontSize:30,fontWeight:900,color:k.color,margin:'0 0 3px',lineHeight:1,textShadow:`0 0 24px ${k.color}55,0 0 48px ${k.color}28` }}>{k.value}</p>
                                            <p style={{ fontSize:9,color:'rgba(255,255,255,.22)',margin:0 }}>{k.sub}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* ── Main body: cards + right sidebar ── */}
                            <div className="sc-network-body" style={{ flex:'1 1 0',minHeight:0,display:'flex',gap:14,position:'relative',zIndex:1 }}>

                                {/* LEFT: PREMIUM contact cards grid */}
                                <div className="sc-scroll sc-network-scroll" style={{ flex:'1 1 0',minWidth:0,overflowY:'auto' }}>
                                    <div className="sc-network-cards" style={{ display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:14 }}>
                                        {(pinned?.kind === 'founder' ? bringToFront(NETWORK_CONTACTS, c => c.id === pinned.key) : NETWORK_CONTACTS).map((c,idx)=>{
                                            const col = TAG_COL[c.tag] || '#a78bfa';
                                            const h = health(c);
                                            const startup = startups.find(s=>s.name===c.company);
                                            const engPct = Math.min(Math.round((c.meetings*8+c.msgs)/1.2),100);
                                            return (
                                                <div key={c.id} className={`nw-card${focus?.kind === 'founder' && focus.key === c.id ? ' search-focus' : ''}`} style={{ background:'linear-gradient(145deg,rgba(11,11,24,.97),rgba(6,6,17,.99))',border:`1px solid ${col}28`,borderRadius:18,padding:0,display:'flex',flexDirection:'column',cursor:'pointer',position:'relative',overflow:'hidden',boxShadow:`0 14px 44px rgba(0,0,0,.6),0 0 0 1px rgba(255,255,255,.03),0 0 40px ${col}08`,animationDelay:`${idx*.06}s` }}>
                                                    {/* holographic shimmer sweep */}
                                                    <div className="nw-shimmer" style={{ position:'absolute',top:0,left:0,bottom:0,width:'45%',background:'linear-gradient(105deg,transparent,rgba(255,255,255,.055),transparent)',pointerEvents:'none',zIndex:10,transform:'translateX(-120%) skewX(-12deg)' }} />
                                                    {/* chromatic top stripe */}
                                                    <div style={{ height:2,background:`linear-gradient(90deg,${col}00,${col}cc,${col}80,${col}00)`,flexShrink:0 }} />
                                                    {/* ambient corner glows */}
                                                    <div style={{ position:'absolute',top:-55,right:-55,width:170,height:170,borderRadius:'50%',background:`radial-gradient(circle,${col}14,transparent 68%)`,pointerEvents:'none' }} />
                                                    <div style={{ position:'absolute',bottom:-35,left:-35,width:130,height:130,borderRadius:'50%',background:`radial-gradient(circle,${col}07,transparent 68%)`,pointerEvents:'none' }} />
                                                    {/* CRT scanline texture */}
                                                    <div style={{ position:'absolute',inset:0,backgroundImage:`repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(255,255,255,.005) 2px,rgba(255,255,255,.005) 3px)`,pointerEvents:'none' }} />

                                                    <div style={{ padding:'16px 18px 0',display:'flex',flexDirection:'column',gap:12,position:'relative' }}>
                                                        {/* identity */}
                                                        <div style={{ display:'flex',alignItems:'center',gap:12 }}>
                                                            {/* rotating conic border avatar */}
                                                            <div style={{ position:'relative',width:52,height:52,flexShrink:0 }}>
                                                                <div style={{ position:'absolute',inset:-2,borderRadius:16,background:`conic-gradient(from 0deg,${col}90,${col}30,${col}90,${col}30,${col}90)`,animation:'nw-spin 5s linear infinite',opacity:.65 }} />
                                                                <div style={{ position:'absolute',inset:0,borderRadius:14,background:`linear-gradient(145deg,${col}65,${col}28)`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:15,fontWeight:900,color:'white',boxShadow:`0 4px 22px ${col}45,inset 0 1px 0 rgba(255,255,255,.16),inset 0 -1px 0 rgba(0,0,0,.3)` }}>
                                                                    {c.avatar}
                                                                </div>
                                                            </div>
                                                            <div style={{ flex:1,minWidth:0 }}>
                                                                <div style={{ display:'flex',alignItems:'center',gap:7,marginBottom:4 }}>
                                                                    <p style={{ fontSize:14,fontWeight:900,color:'white',margin:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',textShadow:'0 0 22px rgba(255,255,255,.12)' }}>{c.name}</p>
                                                                    <div style={{ display:'flex',alignItems:'center',gap:4,padding:'2px 8px',borderRadius:999,background:`${h.col}12`,border:`1px solid ${h.col}38`,flexShrink:0,boxShadow:`0 0 12px ${h.col}20` }}>
                                                                        <div style={{ position:'relative',width:6,height:6 }}>
                                                                            <div style={{ position:'absolute',inset:0,borderRadius:'50%',background:h.col,boxShadow:`0 0 7px ${h.col}` }} />
                                                                            <div style={{ position:'absolute',inset:-3,borderRadius:'50%',border:`1px solid ${h.col}40`,animation:'nw-pulse-ring 2.3s ease-out infinite' }} />
                                                                        </div>
                                                                        <span style={{ fontSize:9,fontWeight:800,color:h.col,textTransform:'uppercase',letterSpacing:'.06em' }}>{h.label}</span>
                                                                    </div>
                                                                </div>
                                                                <p style={{ fontSize:10,color:'rgba(255,255,255,.42)',margin:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{c.role} · <span style={{ color:col,fontWeight:700 }}>{c.company}</span></p>
                                                            </div>
                                                            <span style={{ background:`${col}15`,color:col,border:`1px solid ${col}38`,borderRadius:8,padding:'4px 10px',fontSize:9,fontWeight:800,flexShrink:0,backdropFilter:'blur(6px)',boxShadow:`inset 0 1px 0 rgba(255,255,255,.07),0 0 10px ${col}20` }}>{c.tag}</span>
                                                        </div>

                                                        {/* engagement bar */}
                                                        <div style={{ padding:'10px 12px',borderRadius:10,background:'rgba(255,255,255,.034)',border:'1px solid rgba(255,255,255,.06)',position:'relative',overflow:'hidden' }}>
                                                            <div style={{ position:'absolute',top:0,left:0,right:0,height:1,background:`linear-gradient(90deg,transparent,rgba(255,255,255,.06),transparent)` }} />
                                                            <div style={{ display:'flex',justifyContent:'space-between',marginBottom:7,alignItems:'center' }}>
                                                                <span style={{ fontSize:9,color:'rgba(255,255,255,.42)',fontWeight:700,textTransform:'uppercase',letterSpacing:'.07em' }}>Engagement Score</span>
                                                                <span style={{ fontSize:12,fontWeight:900,color:col,textShadow:`0 0 12px ${col}55` }}>{engPct}%</span>
                                                            </div>
                                                            <div style={{ height:5,borderRadius:999,background:'rgba(255,255,255,.07)',overflow:'hidden',position:'relative' }}>
                                                                <div style={{ height:'100%',width:`${engPct}%`,background:`linear-gradient(90deg,${col}80,${col},${col}d0)`,borderRadius:999,boxShadow:`0 0 12px ${col}55`,position:'relative' }}>
                                                                    <div style={{ position:'absolute',top:0,right:0,bottom:0,width:'30%',background:'linear-gradient(90deg,transparent,rgba(255,255,255,.28))',borderRadius:'0 999px 999px 0' }} />
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* stat chips */}
                                                        <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8 }}>
                                                            {[
                                                                { label:'Last Contact',value:c.lastContact,color:'rgba(255,255,255,.75)',Icon:Clock },
                                                                { label:'Meetings',value:c.meetings,color:col,Icon:CalendarDays },
                                                                { label:'Messages',value:c.msgs,color:'#a78bfa',Icon:MessageSquare },
                                                            ].map(st=>(
                                                                <div key={st.label} style={{ padding:'9px 6px',borderRadius:10,background:'rgba(255,255,255,.038)',border:'1px solid rgba(255,255,255,.065)',textAlign:'center',position:'relative',overflow:'hidden' }}>
                                                                    <div style={{ position:'absolute',top:0,left:0,right:0,height:1,background:`linear-gradient(90deg,transparent,${st.color}28,transparent)` }} />
                                                                    <st.Icon style={{ width:12,height:12,color:st.color,opacity:.8,marginBottom:3 }} />
                                                                    <p style={{ fontSize:8,color:'rgba(255,255,255,.32)',margin:'0 0 3px',textTransform:'uppercase',letterSpacing:'.05em',fontWeight:600 }}>{st.label}</p>
                                                                    <p style={{ fontSize:14,fontWeight:900,color:st.color,margin:0,textShadow:`0 0 12px ${st.color}50` }}>{st.value}</p>
                                                                </div>
                                                            ))}
                                                        </div>

                                                        {/* funding */}
                                                        {startup && (
                                                            <div style={{ padding:'10px 12px',borderRadius:10,background:`linear-gradient(135deg,${col}0c,${col}05)`,border:`1px solid ${col}25`,position:'relative',overflow:'hidden' }}>
                                                                <div style={{ position:'absolute',top:0,left:0,right:0,height:1,background:`linear-gradient(90deg,transparent,${col}45,transparent)` }} />
                                                                <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:7 }}>
                                                                    <span style={{ fontSize:9,color:'rgba(255,255,255,.42)',fontWeight:700,textTransform:'uppercase',letterSpacing:'.07em' }}>Funding Goal</span>
                                                                    <span style={{ fontSize:10,fontWeight:800,color:col }}>{fmt(startup.raised)} / {fmt(startup.fundingGoal)}</span>
                                                                </div>
                                                                <div style={{ height:5,borderRadius:999,background:'rgba(255,255,255,.07)',overflow:'hidden',position:'relative' }}>
                                                                    <div style={{ height:'100%',width:`${Math.min((startup.raised/startup.fundingGoal)*100,100)}%`,background:`linear-gradient(90deg,${col}75,${col},${col}cc)`,borderRadius:999,boxShadow:`0 0 12px ${col}50` }}>
                                                                        <div style={{ position:'absolute',top:0,right:0,bottom:0,width:'25%',background:'linear-gradient(90deg,transparent,rgba(255,255,255,.22))',borderRadius:'0 999px 999px 0' }} />
                                                                    </div>
                                                                </div>
                                                                <div style={{ display:'flex',justifyContent:'space-between',marginTop:5 }}>
                                                                    <p style={{ fontSize:9,color:'rgba(255,255,255,.32)',margin:0 }}>Stage: <span style={{ color:'rgba(255,255,255,.6)',fontWeight:700 }}>{startup.stage}</span></p>
                                                                    <p style={{ fontSize:9,color:col,fontWeight:800,margin:0 }}>{Math.round((startup.raised/startup.fundingGoal)*100)}% funded</p>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* action buttons */}
                                                    <div style={{ display:'flex',marginTop:14,borderTop:'1px solid rgba(255,255,255,.055)',position:'relative' }}>
                                                        <div style={{ position:'absolute',top:0,left:'20%',right:'20%',height:1,background:`linear-gradient(90deg,transparent,${col}35,transparent)` }} />
                                                        <button onClick={()=>requireMandate(()=>setMsgOpen(c))} className="nw-action sc-btn" style={{ flex:1,display:'flex',alignItems:'center',justifyContent:'center',gap:6,padding:'11px 0',fontSize:11,fontWeight:800,cursor:'pointer',background:`linear-gradient(135deg,${col}16,${col}09)`,color:col,border:'none',borderRight:'1px solid rgba(255,255,255,.05)',borderRadius:0,letterSpacing:'.02em' }}>
                                                            <MessageSquare style={{ width:11,height:11 }} />Message
                                                        </button>
                                                        <button onClick={()=>requireMandate(()=>{ setScheduleForm({ date:'', time:'', topic:'' }); setScheduleOpen(c); })} className="nw-action sc-btn" style={{ flex:1,display:'flex',alignItems:'center',justifyContent:'center',gap:6,padding:'11px 0',fontSize:11,fontWeight:800,cursor:'pointer',background:'rgba(255,255,255,.03)',color:'rgba(255,255,255,.42)',border:'none',borderRadius:0,letterSpacing:'.02em' }}>
                                                            <CalendarDays style={{ width:11,height:11 }} />Schedule
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

{/* RIGHT: PREMIUM scrollable panels — sidebar scrolls as one column, panels size to content */}
<div
    className="sc-scroll sc-network-side"
    style={{
        width: 242,
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        minHeight: 0,
        height: '100%',      // inherit the sidebar's available height
        maxHeight: '100%',
        overflowY: 'auto',   // the COLUMN scrolls, not each panel
        paddingRight: 4,
    }}
>

    {/* Panel 1: Network Pulse */}
    <div className="nw-panel" style={{ flexShrink:0,display:'flex',flexDirection:'column',background:'linear-gradient(160deg,rgba(9,9,22,.98),rgba(5,5,15,.99))',border:'1px solid rgba(139,92,246,.22)',borderRadius:16,overflow:'hidden',boxShadow:'0 10px 36px rgba(0,0,0,.5),0 0 0 1px rgba(255,255,255,.025)' }}>
        <div style={{ flexShrink:0,padding:'12px 14px 10px',borderBottom:'1px solid rgba(255,255,255,.045)',background:'linear-gradient(135deg,rgba(139,92,246,.12),rgba(139,92,246,.04))',position:'relative' }}>
            <div style={{ position:'absolute',top:0,left:0,right:0,height:1,background:'linear-gradient(90deg,transparent,rgba(139,92,246,.65),transparent)' }} />
            <div style={{ display:'flex',alignItems:'center',gap:8 }}>
                <div style={{ width:24,height:24,borderRadius:8,background:'rgba(139,92,246,.22)',border:'1px solid rgba(139,92,246,.38)',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 0 12px rgba(139,92,246,.2)' }}>
                    <Activity style={{ width:12,height:12,color:'#a78bfa' }} />
                </div>
                <span style={{ fontSize:12,fontWeight:800,color:'white',letterSpacing:'-.2px' }}>Network Pulse</span>
                <div style={{ marginLeft:'auto',width:7,height:7,borderRadius:'50%',background:'#10b981',boxShadow:'0 0 10px #10b981',animation:'nw-glow 2s ease-in-out infinite' }} />
            </div>
            <p style={{ fontSize:9,color:'rgba(255,255,255,.32)',margin:'4px 0 0',paddingLeft:32 }}>Live activity stream</p>
        </div>
        <div style={{ padding:'10px 12px',display:'flex',flexDirection:'column',gap:7 }}>
            {[
                { avatar:'KS',col:'#8b5cf6',name:'Kabir Sen',action:'replied to your message',time:'2m ago' },
                { avatar:'AP',col:'#06b6d4',name:'Ashutosh Palai',action:'confirmed a meeting',time:'18m ago' },
                { avatar:'AK',col:'#10b981',name:'Ankit Raj Singh',action:'shared a deck',time:'1h ago' },
                { avatar:'PK',col:'#f59e0b',name:'Pawan Kumar',action:'updated funding stage',time:'3h ago' },
                { avatar:'MI',col:'#8b5cf6',name:'Meera Iyer',action:'sent connection request',time:'5h ago' },
                { avatar:'CS',col:'#06b6d4',name:'Chetan Sharma',action:'posted a new update',time:'8h ago' },
            ].map((a,i)=>(
                <div key={i} style={{ display:'flex',gap:9,alignItems:'flex-start',padding:'9px 10px',borderRadius:10,background:'rgba(255,255,255,.028)',border:'1px solid rgba(255,255,255,.055)',position:'relative',overflow:'hidden' }}>
                    <div style={{ position:'absolute',left:0,top:0,bottom:0,width:2,background:`linear-gradient(180deg,${a.col}65,transparent)`,borderRadius:'10px 0 0 10px' }} />
                    <div style={{ width:28,height:28,borderRadius:8,background:`linear-gradient(135deg,${a.col}40,${a.col}18)`,border:`1px solid ${a.col}42`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,fontWeight:900,color:a.col,flexShrink:0,boxShadow:`0 2px 8px ${a.col}22` }}>{a.avatar}</div>
                    <div style={{ flex:1,minWidth:0 }}>
                        <p style={{ fontSize:10,fontWeight:800,color:'rgba(255,255,255,.9)',margin:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{a.name}</p>
                        <p style={{ fontSize:9,color:'rgba(255,255,255,.42)',margin:'2px 0 0',lineHeight:1.4 }}>{a.action}</p>
                        <p style={{ fontSize:8,color:'rgba(255,255,255,.22)',margin:'2px 0 0' }}>{a.time}</p>
                    </div>
                </div>
            ))}
            <div style={{ marginTop:4,padding:'10px 12px',borderRadius:10,background:'rgba(255,255,255,.022)',border:'1px solid rgba(255,255,255,.055)',position:'relative' }}>
                <div style={{ position:'absolute',top:0,left:18,right:18,height:1,background:'linear-gradient(90deg,transparent,rgba(139,92,246,.35),transparent)' }} />
                <p style={{ fontSize:9,color:'rgba(255,255,255,.38)',margin:'0 0 9px',textTransform:'uppercase',letterSpacing:'.07em',fontWeight:700 }}>Sector Activity</p>
                {[{l:'SaaS',v:75,c:'#8b5cf6'},{l:'FinTech',v:55,c:'#06b6d4'},{l:'DeepTech',v:40,c:'#10b981'}].map(b=>(
                    <div key={b.l} style={{ marginBottom:8 }}>
                        <div style={{ display:'flex',justifyContent:'space-between',marginBottom:4 }}>
                            <span style={{ fontSize:10,color:'rgba(255,255,255,.68)',fontWeight:700 }}>{b.l}</span>
                            <span style={{ fontSize:9,color:b.c,fontWeight:800,textShadow:`0 0 8px ${b.c}50` }}>{b.v}%</span>
                        </div>
                        <div style={{ height:4,borderRadius:999,background:'rgba(255,255,255,.06)',overflow:'hidden' }}>
                            <div style={{ height:'100%',width:`${b.v}%`,background:`linear-gradient(90deg,${b.c}75,${b.c})`,borderRadius:999,boxShadow:`0 0 6px ${b.c}45` }} />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    </div>

    {/* Panel 2: Sector Spread */}
    <div className="nw-panel" style={{ flexShrink:0,display:'flex',flexDirection:'column',background:'linear-gradient(160deg,rgba(9,9,22,.98),rgba(5,5,15,.99))',border:'1px solid rgba(6,182,212,.22)',borderRadius:16,overflow:'hidden',boxShadow:'0 10px 36px rgba(0,0,0,.5),0 0 0 1px rgba(255,255,255,.025)' }}>
        <div style={{ flexShrink:0,padding:'12px 14px 10px',borderBottom:'1px solid rgba(255,255,255,.045)',background:'linear-gradient(135deg,rgba(6,182,212,.12),rgba(6,182,212,.04))',position:'relative' }}>
            <div style={{ position:'absolute',top:0,left:0,right:0,height:1,background:'linear-gradient(90deg,transparent,rgba(6,182,212,.65),transparent)' }} />
            <div style={{ display:'flex',alignItems:'center',gap:8 }}>
                <div style={{ width:24,height:24,borderRadius:8,background:'rgba(6,182,212,.22)',border:'1px solid rgba(6,182,212,.38)',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 0 12px rgba(6,182,212,.2)' }}>
                    <TrendingUp style={{ width:12,height:12,color:'#22d3ee' }} />
                </div>
                <span style={{ fontSize:12,fontWeight:800,color:'white',letterSpacing:'-.2px' }}>Sector Spread</span>
            </div>
            <p style={{ fontSize:9,color:'rgba(255,255,255,.32)',margin:'4px 0 0',paddingLeft:32 }}>Portfolio distribution</p>
        </div>
        <div style={{ padding:'10px 12px',display:'flex',flexDirection:'column',gap:7 }}>
            {[
                { sector:'Water',pct:31,col:'#8b5cf6',deals:5,deployed:'₹62L',stage:'Validated' },
                { sector:'Mobility',pct:24,col:'#06b6d4',deals:4,deployed:'₹48L',stage:'In Pilot' },
                { sector:'Health',pct:20,col:'#10b981',deals:3,deployed:'₹40L',stage:'Scaled' },
                { sector:'Agriculture',pct:15,col:'#f59e0b',deals:2,deployed:'₹30L',stage:'Applied' },
                { sector:'Other',pct:10,col:'#6b7280',deals:2,deployed:'₹20L',stage:'Screened' },
            ].map((s,i)=>(
                <div key={i} style={{ padding:'10px 12px',borderRadius:10,background:`linear-gradient(135deg,${s.col}0c,${s.col}05)`,border:`1px solid ${s.col}22`,position:'relative',overflow:'hidden' }}>
                    <div style={{ position:'absolute',top:0,left:0,right:0,height:1,background:`linear-gradient(90deg,transparent,${s.col}40,transparent)` }} />
                    <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6 }}>
                        <span style={{ fontSize:11,fontWeight:800,color:'rgba(255,255,255,.88)' }}>{s.sector}</span>
                        <span style={{ fontSize:14,fontWeight:900,color:s.col,textShadow:`0 0 12px ${s.col}50` }}>{s.pct}%</span>
                    </div>
                    <div style={{ height:4,borderRadius:999,background:'rgba(255,255,255,.06)',overflow:'hidden',marginBottom:6 }}>
                        <div style={{ height:'100%',width:`${s.pct}%`,background:`linear-gradient(90deg,${s.col}70,${s.col})`,borderRadius:999,boxShadow:`0 0 7px ${s.col}45` }} />
                    </div>
                    <div style={{ display:'flex',justifyContent:'space-between' }}>
                        <span style={{ fontSize:9,color:'rgba(255,255,255,.38)' }}>{s.deals} deals · {s.deployed}</span>
                        <span style={{ fontSize:9,color:'rgba(255,255,255,.28)' }}>{s.stage}</span>
                    </div>
                </div>
            ))}
        </div>
    </div>

    {/* Panel 3: Top Connections */}
    <div className="nw-panel" style={{ flexShrink:0,display:'flex',flexDirection:'column',background:'linear-gradient(160deg,rgba(9,9,22,.98),rgba(5,5,15,.99))',border:'1px solid rgba(16,185,129,.22)',borderRadius:16,overflow:'hidden',boxShadow:'0 10px 36px rgba(0,0,0,.5),0 0 0 1px rgba(255,255,255,.025)' }}>
        <div style={{ flexShrink:0,padding:'12px 14px 10px',borderBottom:'1px solid rgba(255,255,255,.045)',background:'linear-gradient(135deg,rgba(16,185,129,.12),rgba(16,185,129,.04))',position:'relative' }}>
            <div style={{ position:'absolute',top:0,left:0,right:0,height:1,background:'linear-gradient(90deg,transparent,rgba(16,185,129,.65),transparent)' }} />
            <div style={{ display:'flex',alignItems:'center',gap:8 }}>
                <div style={{ width:24,height:24,borderRadius:8,background:'rgba(16,185,129,.22)',border:'1px solid rgba(16,185,129,.38)',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 0 12px rgba(16,185,129,.2)' }}>
                    <Star style={{ width:12,height:12,color:'#34d399' }} />
                </div>
                <span style={{ fontSize:12,fontWeight:800,color:'white',letterSpacing:'-.2px' }}>Top Connections</span>
            </div>
            <p style={{ fontSize:9,color:'rgba(255,255,255,.32)',margin:'4px 0 0',paddingLeft:32 }}>Ranked by engagement</p>
        </div>
        <div style={{ padding:'10px 12px',display:'flex',flexDirection:'column',gap:7 }}>
            {[...NETWORK_CONTACTS]
                .sort((a,b)=>(b.meetings*8+b.msgs)-(a.meetings*8+a.msgs))
                .map((c,i)=>{
                    const col = TAG_COL[c.tag] || '#a78bfa';
                    const score = Math.min(Math.round((c.meetings*8+c.msgs)/1.2),100);
                    const rankCol = i===0?'#f59e0b':i===1?'rgba(210,210,235,.8)':i===2?'#cd7f32':'rgba(255,255,255,.2)';
                    return (
                        <div key={c.id} style={{ display:'flex',alignItems:'center',gap:9,padding:'9px 10px',borderRadius:10,background:`linear-gradient(135deg,${col}0e,${col}06)`,border:`1px solid ${col}28`,position:'relative',overflow:'hidden' }}>
                            <div style={{ position:'absolute',left:0,top:0,bottom:0,width:2,background:`linear-gradient(180deg,${rankCol},transparent)`,opacity:.7,borderRadius:'10px 0 0 10px' }} />
                            <span style={{ fontSize:12,fontWeight:900,color:rankCol,width:18,textAlign:'center',flexShrink:0,textShadow:i<3?`0 0 8px ${rankCol}`:'none' }}>#{i+1}</span>
                            <div style={{ width:32,height:32,borderRadius:10,background:`linear-gradient(135deg,${col}55,${col}25)`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:900,color:'white',border:`1px solid ${col}48`,flexShrink:0,boxShadow:`0 2px 10px ${col}28` }}>{c.avatar}</div>
                            <div style={{ flex:1,minWidth:0 }}>
                                <p style={{ fontSize:11,fontWeight:800,color:'rgba(255,255,255,.95)',margin:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{c.name}</p>
                                <p style={{ fontSize:9,color:'rgba(255,255,255,.38)',margin:'1px 0 0',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{c.company}</p>
                            </div>
                            <div style={{ textAlign:'right',flexShrink:0 }}>
                                <p style={{ fontSize:14,fontWeight:900,color:col,margin:0,textShadow:`0 0 10px ${col}60` }}>{score}</p>
                                <p style={{ fontSize:8,color:'rgba(255,255,255,.28)',margin:0 }}>score</p>
                            </div>
                        </div>
                    );
                })}
            <div style={{ marginTop:4,padding:'10px 12px',borderRadius:10,background:'rgba(255,255,255,.022)',border:'1px solid rgba(255,255,255,.055)',position:'relative' }}>
                <div style={{ position:'absolute',top:0,left:18,right:18,height:1,background:'linear-gradient(90deg,transparent,rgba(16,185,129,.35),transparent)' }} />
                <p style={{ fontSize:9,color:'rgba(255,255,255,.38)',margin:'0 0 9px',textTransform:'uppercase',letterSpacing:'.07em',fontWeight:700 }}>Engagement Overview</p>
                {NETWORK_CONTACTS.map(c=>{
                    const col = TAG_COL[c.tag] || '#a78bfa';
                    const pct = Math.min(Math.round((c.meetings*8+c.msgs)/1.2),100);
                    return (
                        <div key={c.id} style={{ display:'flex',alignItems:'center',gap:7,marginBottom:6 }}>
                            <span style={{ fontSize:9,color:'rgba(255,255,255,.6)',width:58,flexShrink:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',fontWeight:600 }}>{c.name.split(' ')[0]}</span>
                            <div style={{ flex:1,height:4,borderRadius:999,background:'rgba(255,255,255,.06)',overflow:'hidden' }}>
                                <div style={{ height:'100%',width:`${pct}%`,background:`linear-gradient(90deg,${col}70,${col})`,borderRadius:999,boxShadow:`0 0 5px ${col}40` }} />
                            </div>
                            <span style={{ fontSize:9,fontWeight:800,color:col,width:24,textAlign:'right',flexShrink:0 }}>{pct}</span>
                        </div>
                    );
                })}
            </div>
        </div>
    </div>

</div>{/* end right sidebar */}
                            </div>{/* end main body */}
                        </div>
                        );
                    })()}

                    {/* ══ 5. DEMO DAYS ══ */}
                    {tab === 'demodays' && (() => {
                        const TYPE_META: Record<string, { color: string; Icon: React.ElementType; label: string }> = {
                            'Demo Day': { color: '#8b5cf6', Icon: Target, label: 'Pitching' },
                            Workshop: { color: '#06b6d4', Icon: Zap, label: 'Workshop' },
                            Hackathon: { color: '#f59e0b', Icon: GitBranch, label: 'Hackathon' },
                            Mentorship: { color: '#10b981', Icon: Users, label: 'Mentorship' },
                            Pitching: { color: '#8b5cf6', Icon: Target, label: 'Pitching' },
                        };
                        const TYPES = ['All', 'Demo Day', 'Workshop', 'Hackathon', 'Mentorship'];

                        return (
                            <div className="hub-tab-content" style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: '18px 22px', boxSizing: 'border-box', overflow: 'hidden', gap: 14, position: 'relative' }}>

                                {/* ── keyframes ── */}
                                <style>{`
              @keyframes dd-spin  { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
              @keyframes dd-rspin { from{transform:rotate(0deg)} to{transform:rotate(-360deg)} }
              @keyframes dd-float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
              @keyframes dd-drift { 0%,100%{transform:translate(0,0)} 40%{transform:translate(14px,-11px)} 70%{transform:translate(-9px,9px)} }
              @keyframes dd-morph { 0%,100%{border-radius:60% 40% 30% 70%/60% 30% 70% 40%} 50%{border-radius:30% 60% 70% 40%/50% 60% 30% 60%} }
              @keyframes dd-flow  { 0%{background-position:-80% 0} 100%{background-position:180% 0} }
              @keyframes dd-pulse { 0%,100%{opacity:.45;transform:scale(1)} 50%{opacity:1;transform:scale(1.08)} }
              @keyframes dd-rise  { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
              @keyframes dd-shimmer { 0%,100%{opacity:.3} 50%{opacity:.75} }
              .dd-card { transition:transform .22s ease,box-shadow .22s ease; animation:dd-rise .3s ease both; }
              .dd-card:hover { transform:translateY(-4px); box-shadow:0 22px 60px rgba(0,0,0,.55),0 0 0 1px rgba(255,255,255,.12); }
              .dd-btn  { transition:all .18s ease; }
              .dd-btn:hover { transform:translateY(-1px); filter:brightness(1.15); }
              .dd-filter { transition:all .18s ease; }
            `}</style>

                                {/* ── CSS ambient BG ── */}
                                <div aria-hidden style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
                                    <div style={{ position: 'absolute', top: '5%', left: '10%', width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle,rgba(139,92,246,.07),transparent 70%)', animation: 'dd-drift 11s ease-in-out infinite' }} />
                                    <div style={{ position: 'absolute', bottom: '12%', right: '8%', width: 240, height: 240, borderRadius: '50%', background: 'radial-gradient(circle,rgba(6,182,212,.06),transparent 70%)', animation: 'dd-drift 14s ease-in-out infinite reverse' }} />
                                    <div style={{ position: 'absolute', top: '42%', left: '38%', width: 180, height: 180, borderRadius: '50%', background: 'radial-gradient(circle,rgba(16,185,129,.05),transparent 70%)', animation: 'dd-drift 9s ease-in-out infinite 2s' }} />
                                    {/* orrery top-right */}
                                    <div style={{ position: 'absolute', top: -42, right: -42, width: 220, height: 220 }}>
                                        <div style={{ position: 'absolute', top: '50%', left: '50%', width: 16, height: 16, marginLeft: -8, marginTop: -8, borderRadius: '50%', background: 'radial-gradient(circle at 35% 35%,#c4b5fd,#7c3aed)', boxShadow: '0 0 18px rgba(139,92,246,.9)', animation: 'dd-pulse 2.8s ease-in-out infinite' }} />
                                        {[{ w: 62, c: '#8b5cf6', sp: '3.2s' }, { w: 104, c: '#06b6d4', sp: '5.8s', rev: true }, { w: 158, c: '#f59e0b', sp: '9.5s' }, { w: 216, c: '#10b981', sp: '14s', rev: true }].map((o, i) => (
                                            <div key={i} style={{ position: 'absolute', top: '50%', left: '50%', width: o.w, height: o.w, marginLeft: -o.w / 2, marginTop: -o.w / 2, borderRadius: '50%', border: `1px solid ${o.c}${i < 2 ? '38' : '20'}` }}>
                                                <div style={{ position: 'absolute', top: i % 2 === 0 ? -4 : 'auto', bottom: i % 2 === 1 ? -4 : 'auto', left: '50%', width: 8, height: 8, marginLeft: -4, borderRadius: '50%', background: o.c, boxShadow: `0 0 8px ${o.c}`, animation: `dd-spin ${o.sp} linear infinite ${o.rev ? 'reverse' : ''}`, transformOrigin: `4px ${o.w / 2 + 4}px` }} />
                                            </div>
                                        ))}
                                    </div>
                                    {/* morphing blob */}
                                    <div style={{ position: 'absolute', bottom: 20, left: 12, width: 108, height: 108, background: 'linear-gradient(135deg,rgba(139,92,246,.12),rgba(6,182,212,.07))', animation: 'dd-morph 7s ease-in-out infinite', border: '1px solid rgba(139,92,246,.18)' }} />
                                    {/* diamond */}
                                    <div style={{ position: 'absolute', bottom: '22%', left: '40%', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 50, height: 50 }}>
                                        <div style={{ position: 'absolute', width: 36, height: 36, border: '2px solid rgba(245,158,11,.36)', borderRadius: 4, animation: 'dd-spin 8s linear infinite', transform: 'rotate(45deg)' }} />
                                        <div style={{ position: 'absolute', width: 18, height: 18, background: 'rgba(245,158,11,.07)', borderRadius: 2, animation: 'dd-rspin 5s linear infinite', transform: 'rotate(45deg)' }} />
                                    </div>
                                    {/* particles */}
                                    {[{ x: '14%', y: '70%', s: 4, c: '#8b5cf6', d: '0s' }, { x: '44%', y: '18%', s: 3, c: '#06b6d4', d: '1.4s' }, { x: '68%', y: '55%', s: 5, c: '#10b981', d: '2.8s' }, { x: '80%', y: '30%', s: 3, c: '#f59e0b', d: '.6s' }, { x: '25%', y: '84%', s: 3, c: '#06b6d4', d: '2s' }].map((p, i) => (
                                        <div key={i} style={{ position: 'absolute', left: p.x, top: p.y, width: p.s, height: p.s, borderRadius: '50%', background: p.c, boxShadow: `0 0 ${p.s * 2.5}px ${p.c}`, opacity: .45, animation: `dd-float ${3.5 + i * .5}s ease-in-out ${p.d} infinite` }} />
                                    ))}
                                    {/* flow lines */}
                                    {[{ t: '30%', c: '#8b5cf6', d: '0s' }, { t: '62%', c: '#06b6d4', d: '1.5s' }, { t: '84%', c: '#10b981', d: '3s' }].map((l, i) => (
                                        <div key={i} style={{ position: 'absolute', left: 0, right: 0, top: l.t, height: 1, background: `linear-gradient(90deg,transparent,${l.c}16,transparent)`, backgroundSize: '40% 100%', animation: `dd-flow 7s linear ${l.d} infinite` }} />
                                    ))}
                                </div>

                                {/* ── Header: stats + filter row ── */}
                                <div className="sc-demodays-stats" style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 12, position: 'relative', zIndex: ddFilterOpen ? 30 : 1 }}>
                                    {/* KPI pills */}
                                    {[
                                        { val: events.length, label: 'Events', col: '#8b5cf6' },
                                        { val: watchedEvents.length, label: 'Bookmarked', col: '#10b981' },
                                        { val: '₹5L', label: 'Prize Pool', col: '#f59e0b' },
                                        { val: 47 + registeredEvents.length, label: 'RSVPs', col: '#06b6d4' },
                                    ].map(p => (
                                        <div key={p.label} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '6px 13px', borderRadius: 10, background: `${p.col}0d`, border: `1px solid ${p.col}22` }}>
                                            <span style={{ fontSize: 14, fontWeight: 900, color: p.col, textShadow: `0 0 8px ${p.col}60` }}>{p.val}</span>
                                            <span style={{ fontSize: 10, color: 'rgba(255,255,255,.35)' }}>{p.label}</span>
                                        </div>
                                    ))}

                                    <div className="dd-filter-divider" style={{ width: 1, height: 22, background: 'rgba(255,255,255,.08)', margin: '0 4px' }} />

                                    {/* filter pills */}
                                    <div className="dd-filter-pills" style={{
                                        display: 'flex', gap: 5
                                    }}>
                                        {
                                            TYPES.map(t => {
                                                const active = eventType === t;
                                                const mc = t === 'All' ? '#8b5cf6' : TYPE_META[t]?.color || '#8b5cf6';
                                                return (
                                                    <button key={t} onClick={() => setEventType(t)} className="dd-filter" style={{ padding: '6px 14px', borderRadius: 999, fontSize: 11, fontWeight: 700, cursor: 'pointer', background: active ? `${mc}22` : 'rgba(255,255,255,.04)', color: active ? mc : 'rgba(255,255,255,.35)', border: `1px solid ${active ? mc + '50' : 'rgba(255,255,255,.08)'}`, boxShadow: active ? `0 0 14px ${mc}30` : 'none' }}>
                                                        {t}
                                                    </button>
                                                );
                                            })
                                        }
                                    </div>

                                    {/* Mobile picker — custom themed dropdown (replaces the native <select> on small screens) */}
                                    <div className="dd-filter-select-wrap" style={{ display: 'none', alignItems: 'center', gap: 8, flex: '1 1 100%' }}>
                                        <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,.3)', textTransform: 'uppercase', letterSpacing: '.08em', flexShrink: 0 }}>Filter</span>
                                        <div ref={ddFilterRef} style={{ position: 'relative', flex: 1, minWidth: 0 }}>
                                            <button
                                                type="button"
                                                onClick={() => setDdFilterOpen(o => !o)}
                                                aria-haspopup="listbox"
                                                aria-expanded={ddFilterOpen}
                                                className="sc-btn"
                                                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 10, background: 'rgba(255,255,255,.05)', border: `1px solid ${ddFilterOpen ? 'rgba(139,92,246,.5)' : 'rgba(255,255,255,.14)'}`, color: 'white', fontSize: 13, fontWeight: 700, cursor: 'pointer', textAlign: 'left', boxShadow: ddFilterOpen ? '0 0 14px rgba(139,92,246,.28)' : 'none' }}
                                            >
                                                <span style={{ width: 7, height: 7, borderRadius: '50%', background: eventType === 'All' ? '#8b5cf6' : (TYPE_META[eventType]?.color || '#8b5cf6'), boxShadow: `0 0 7px ${eventType === 'All' ? '#8b5cf6' : (TYPE_META[eventType]?.color || '#8b5cf6')}`, flexShrink: 0 }} />
                                                <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{eventType === 'All' ? 'All event types' : eventType}</span>
                                                <ChevronRight style={{ width: 14, height: 14, color: 'rgba(255,255,255,.5)', transform: ddFilterOpen ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform .18s', flexShrink: 0 }} />
                                            </button>
                                            {ddFilterOpen && (
                                                <div className="notif-scroll" role="listbox" style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, maxHeight: 320, overflowY: 'auto', zIndex: 41, background: 'rgba(8,8,16,.97)', border: '1px solid rgba(255,255,255,.1)', borderTop: '2px solid rgba(139,92,246,.55)', borderRadius: 14, boxShadow: '0 24px 70px rgba(0,0,0,.7)', backdropFilter: 'blur(14px)', padding: 8 }}>
                                                    <div style={{ padding: '4px 8px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,.06)' }}>
                                                        <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,.55)' }}>Filter by type</span>
                                                    </div>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginTop: 8 }}>
                                                        {TYPES.map(t => {
                                                            const active = eventType === t;
                                                            const tc = t === 'All' ? '#8b5cf6' : (TYPE_META[t]?.color || '#8b5cf6');
                                                            const TIcon = t === 'All' ? null : TYPE_META[t]?.Icon;
                                                            return (
                                                                <button key={t} role="option" aria-selected={active} onClick={() => { setEventType(t); setDdFilterOpen(false); }} className="dr-btn" style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left', padding: '9px 10px', borderRadius: 10, background: active ? `${tc}1f` : 'transparent', border: `1px solid ${active ? tc + '4d' : 'rgba(255,255,255,.06)'}`, cursor: 'pointer' }}>
                                                                    <span style={{ width: 22, height: 22, borderRadius: 7, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${tc}1f`, border: `1px solid ${tc}3a` }}>
                                                                        {TIcon ? <TIcon style={{ width: 12, height: 12, color: tc }} /> : <span style={{ width: 7, height: 7, borderRadius: '50%', background: tc, boxShadow: `0 0 7px ${tc}` }} />}
                                                                    </span>
                                                                    <span style={{ flex: 1, minWidth: 0, fontSize: 12.5, fontWeight: 600, color: active ? 'white' : 'rgba(255,255,255,.66)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t === 'All' ? 'All event types' : t}</span>
                                                                    {active && <Check style={{ width: 14, height: 14, color: tc, flexShrink: 0 }} />}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* add event */}
                                    <button onClick={() => setAddEventOpen(true)} className="dd-btn dd-add-event" style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, padding: '7px 16px', borderRadius: 999, fontSize: 11, fontWeight: 700, background: 'linear-gradient(90deg,#7c3aed,#0ea5e9)', color: 'white', border: 'none', cursor: 'pointer', boxShadow: '0 4px 16px rgba(124,58,237,.4)' }}>
                                        <Plus style={{ width: 12, height: 12 }} />Add Event
                                    </button>
                                </div>

                                {/* ── Main 2-col layout: scrollable grid + sidebar ── */}
                                <div className="sc-tab-main-grid" style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: '1fr 292px', gap: 14, position: 'relative', zIndex: 1 }}>

                                    {/* ── LEFT: scrollable event grid ── */}
                                    <div className="sc-tab-panel-left" style={{ borderRadius: 18, border: '1px solid rgba(255,255,255,.07)', background: 'rgba(255,255,255,.024)', display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
                                        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg,transparent,rgba(139,92,246,.7),transparent)' }} />

                                        {/* vault header */}
                                        <div style={{ padding: '12px 18px', borderBottom: '1px solid rgba(255,255,255,.06)', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                                            <CalendarDays style={{ width: 13, height: 13, color: '#a78bfa' }} />
                                            <span style={{ fontSize: 12, fontWeight: 700, color: 'white' }}>Upcoming Events</span>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 8 }}>
                                                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 6px #10b981', animation: 'sc-pulse2 2.2s ease-in-out infinite' }} />
                                                <span style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,.3)', letterSpacing: '.06em' }}>LIVE</span>
                                            </div>
                                            <span style={{ marginLeft: 'auto', fontSize: 10, color: 'rgba(255,255,255,.25)' }}>{filteredEvents.length} scheduled</span>
                                        </div>

                                        {/* scrollable 2-col grid */}
                                        <div className="sc-scroll sc-demodays-events-scroll" style={{ flex: 1, overflowY: 'auto', padding: '12px 14px' }}>
                                            {filteredEvents.length === 0 && (
                                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 200, gap: 12, opacity: .25 }}>
                                                    <CalendarDays style={{ width: 36, height: 36 }} />
                                                    <p style={{ fontSize: 13, color: 'white', margin: 0 }}>No events for this filter</p>
                                                </div>
                                            )}
                                            <div className="sc-demodays-event-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                                {(pinned?.kind === 'event' ? bringToFront(filteredEvents, ev => ev.id === pinned.key) : filteredEvents).map((ev, idx) => {
                                                    const pd = parseDate(ev.date);
                                                    const watched = watchedEvents.includes(ev.id);
                                                    const registered = registeredEvents.includes(ev.id);
                                                    const pending = (ev as any).pending;
                                                    const meta = TYPE_META[ev.type] || { color: '#a78bfa', icon: '📅', label: ev.type };
                                                    const tc = meta.color;

                                                    return (
                                                        <div key={ev.id} className={`dd-card${focus?.kind === 'event' && focus.key === ev.id ? ' search-focus' : ''}`} style={{ borderRadius: 16, border: `1px solid ${tc}28`, background: `linear-gradient(145deg,${tc}0c 0%,rgba(5,5,9,.9) 100%)`, padding: '0', cursor: 'pointer', position: 'relative', overflow: 'hidden', animationDelay: `${idx * 0.055}s`, display: 'flex', flexDirection: 'column' }}>
                                                            {/* top accent */}
                                                            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg,transparent,${tc}85,transparent)` }} />
                                                            {/* corner radial */}
                                                            <div style={{ position: 'absolute', top: -30, right: -30, width: 130, height: 130, borderRadius: '50%', background: `radial-gradient(circle,${tc}14,transparent 70%)`, pointerEvents: 'none' }} />
                                                            {/* spinning ring decoration */}
                                                            <div style={{ position: 'absolute', bottom: -16, left: -16, width: 70, height: 70, opacity: .2 }}>
                                                                <div style={{ width: 60, height: 60, border: `1.5px solid ${tc}`, borderRadius: 8, animation: 'dd-spin 12s linear infinite', transform: 'rotate(45deg)' }} />
                                                            </div>

                                                            {/* card body */}
                                                            <div style={{ padding: '16px 16px 14px', display: 'flex', flexDirection: 'column', flex: 1, gap: 10 }}>

                                                                {/* date + bookmark row */}
                                                                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                                                                    {/* date badge */}
                                                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: 52, height: 58, borderRadius: 12, background: `${tc}14`, border: `1px solid ${tc}38`, boxShadow: `0 4px 14px ${tc}20`, flexShrink: 0 }}>
                                                                        <span style={{ fontSize: 9, fontWeight: 800, color: tc, textTransform: 'uppercase', letterSpacing: '.1em', lineHeight: 1 }}>{pd.month}</span>
                                                                        <span style={{ fontSize: 24, fontWeight: 900, color: 'white', lineHeight: 1.1, textShadow: `0 0 16px ${tc}70` }}>{pd.day}</span>
                                                                        <span style={{ fontSize: 9, color: 'rgba(255,255,255,.3)', lineHeight: 1 }}>{pd.year}</span>
                                                                    </div>

                                                                    {/* title + type */}
                                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                                        <p style={{ fontSize: 13, fontWeight: 700, color: 'white', margin: 0, lineHeight: 1.35, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{ev.title}</p>
                                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 5 }}>
                                                                            <span style={{ fontSize: 9, fontWeight: 800, padding: '3px 9px', borderRadius: 999, color: tc, background: `${tc}18`, border: `1px solid ${tc}40`, textTransform: 'uppercase', letterSpacing: '.06em', boxShadow: `0 0 8px ${tc}25` }}>{ev.type}</span>
                                                                        </div>
                                                                    </div>

                                                                    {/* bookmark */}
                                                                    <button onClick={e => { e.stopPropagation(); setWatchedEvents(prev => watched ? prev.filter(x => x !== ev.id) : [...prev, ev.id]); }} className="dd-btn" style={{ width: 30, height: 30, borderRadius: 9, background: watched ? `${tc}20` : 'rgba(255,255,255,.05)', border: `1px solid ${watched ? tc + '45' : 'rgba(255,255,255,.09)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: watched ? tc : 'rgba(255,255,255,.28)', flexShrink: 0, boxShadow: watched ? `0 0 10px ${tc}35` : 'none' }}>
                                                                        <Bookmark style={{ width: 12, height: 12 }} />
                                                                    </button>
                                                                </div>

                                                                {/* description */}
                                                                <p style={{ fontSize: 11, color: 'rgba(255,255,255,.38)', lineHeight: 1.6, margin: 0, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{ev.description}</p>

                                                                {/* meta chips */}
                                                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                                        <div style={{ width: 16, height: 16, borderRadius: 5, background: `${tc}14`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                                            <Clock style={{ width: 9, height: 9, color: tc }} />
                                                                        </div>
                                                                        <span style={{ fontSize: 10, color: 'rgba(255,255,255,.42)' }}>{ev.time}</span>
                                                                    </div>
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                                        <div style={{ width: 16, height: 16, borderRadius: 5, background: `${tc}14`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                                            <Globe style={{ width: 9, height: 9, color: tc }} />
                                                                        </div>
                                                                        <span style={{ fontSize: 10, color: 'rgba(255,255,255,.42)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.location}</span>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {/* footer with register button */}
                                                            <div style={{ padding: '10px 16px', borderTop: `1px solid ${tc}16`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, background: `${tc}05` }}>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                                                    <div style={{ width: 5, height: 5, borderRadius: '50%', background: pending ? '#f59e0b' : '#10b981', boxShadow: `0 0 5px ${pending ? '#f59e0b' : '#10b981'}` }} />
                                                                    <span style={{ fontSize: 9, color: pending ? '#f59e0b' : registered ? '#10b981' : 'rgba(255,255,255,.28)' }}>{pending ? 'Awaiting admin approval' : registered ? "Seat reserved" : 'Open for registration'}</span>
                                                                </div>
                                                                {pending ? (
                                                                    <span style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 14px', borderRadius: 8, background: 'rgba(245,158,11,.14)', border: '1px solid rgba(245,158,11,.4)', color: '#f59e0b', fontSize: 11, fontWeight: 700 }}>
                                                                        <Clock style={{ width: 11, height: 11 }} />Pending Review
                                                                    </span>
                                                                ) : registered ? (
                                                                    <span style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 14px', borderRadius: 8, background: 'rgba(16,185,129,.16)', border: '1px solid rgba(16,185,129,.4)', color: '#10b981', fontSize: 11, fontWeight: 700 }}>
                                                                        <CheckCircle style={{ width: 11, height: 11 }} />Registered
                                                                    </span>
                                                                ) : (
                                                                    <button onClick={e => { e.stopPropagation(); requireMandate(() => { setRegName(VC_PROFILE.name); setRegEvent(ev); }); }} className="dd-btn" style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 14px', borderRadius: 8, background: `${tc}20`, border: `1px solid ${tc}45`, color: tc, fontSize: 11, fontWeight: 700, cursor: 'pointer', boxShadow: `0 0 10px ${tc}25` }}>
                                                                        Register <ArrowRight style={{ width: 10, height: 10 }} />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>

                                    {/* ── RIGHT sidebar ── */}
                                    <div className="sc-tab-sidebar" style={{ display: 'flex', flexDirection: 'column', gap: 12, minHeight: 0, overflow: 'hidden' }}>

                                        {/* Next Up spotlight */}
                                        {(() => {
                                            const next = filteredEvents[0];
                                            if (!next) return null;
                                            const pd = parseDate(next.date);
                                            const meta = TYPE_META[next.type] || { color: '#a78bfa' };
                                            const tc = meta.color;
                                            return (
                                                <div style={{ flexShrink: 0, borderRadius: 18, border: `1px solid ${tc}35`, background: `linear-gradient(160deg,${tc}14 0%,rgba(5,5,9,.97) 70%)`, padding: '16px', position: 'relative', overflow: 'hidden' }}>
                                                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg,transparent,${tc}90,transparent)` }} />
                                                    <div style={{ position: 'absolute', top: -40, right: -40, width: 150, height: 150, borderRadius: '50%', background: `radial-gradient(circle,${tc}14,transparent 70%)`, pointerEvents: 'none' }} />
                                                    {/* mini spinning ring decoration */}
                                                    <div style={{ position: 'absolute', bottom: -20, left: -20, width: 80, height: 80, border: `1px solid ${tc}25`, borderRadius: '50%', animation: 'dd-spin 10s linear infinite', pointerEvents: 'none' }}>
                                                        <div style={{ position: 'absolute', top: -4, left: '50%', width: 8, height: 8, marginLeft: -4, borderRadius: '50%', background: tc, boxShadow: `0 0 8px ${tc}`, transformOrigin: `4px 44px` }} />
                                                    </div>

                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                                                        <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 6px #10b981', animation: 'sc-pulse2 2.2s ease-in-out infinite' }} />
                                                        <span style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,.35)', textTransform: 'uppercase', letterSpacing: '.1em' }}>Next Up</span>
                                                    </div>

                                                    <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 }}>
                                                        {/* date badge */}
                                                        <div style={{ width: 52, height: 58, borderRadius: 13, background: `${tc}18`, border: `1px solid ${tc}45`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: `0 4px 16px ${tc}22` }}>
                                                            <span style={{ fontSize: 9, fontWeight: 800, color: tc, textTransform: 'uppercase', letterSpacing: '.08em' }}>{pd.month}</span>
                                                            <span style={{ fontSize: 24, fontWeight: 900, color: 'white', lineHeight: 1 }}>{pd.day}</span>
                                                            <span style={{ fontSize: 9, color: 'rgba(255,255,255,.3)' }}>{pd.year}</span>
                                                        </div>
                                                        <div style={{ flex: 1, minWidth: 0 }}>
                                                            <p style={{ fontSize: 13, fontWeight: 700, color: 'white', margin: 0, lineHeight: 1.35 }}>{next.title}</p>
                                                            <p style={{ fontSize: 10, color: 'rgba(255,255,255,.35)', margin: '5px 0 0' }}>{next.time}</p>
                                                            <p style={{ fontSize: 10, color: 'rgba(255,255,255,.28)', margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{next.location}</p>
                                                        </div>
                                                    </div>

                                                    {registeredEvents.includes(next.id) ? (
                                                        <div style={{ width: '100%', padding: '9px 0', borderRadius: 11, fontSize: 12, fontWeight: 700, background: 'rgba(16,185,129,.14)', color: '#10b981', border: '1px solid rgba(16,185,129,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, letterSpacing: '.02em' }}>
                                                            <CheckCircle style={{ width: 13, height: 13 }} />Seat Reserved
                                                        </div>
                                                    ) : (
                                                        <button className="dd-btn" onClick={() => requireMandate(() => { setRegName(VC_PROFILE.name); setRegEvent(next); })} style={{ width: '100%', padding: '9px 0', borderRadius: 11, fontSize: 12, fontWeight: 700, background: `linear-gradient(90deg,${tc},${tc}80)`, color: 'white', border: 'none', cursor: 'pointer', boxShadow: `0 4px 18px ${tc}45`, letterSpacing: '.02em' }}>
                                                            Reserve My Spot →
                                                        </button>
                                                    )}
                                                </div>
                                            );
                                        })()}

                                        {/* Category split */}
                                        <div style={{ flexShrink: 0, borderRadius: 18, border: '1px solid rgba(255,255,255,.07)', background: 'rgba(255,255,255,.024)', padding: '14px 16px', position: 'relative', overflow: 'hidden' }}>
                                            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg,transparent,rgba(139,92,246,.65),transparent)' }} />
                                            {/* mini decorative spinning diamond */}
                                            <div style={{ position: 'absolute', top: -12, right: -12, width: 42, height: 42, border: '1px solid rgba(139,92,246,.2)', borderRadius: 4, animation: 'dd-spin 12s linear infinite', opacity: .55 }} />

                                            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 12 }}>
                                                <BarChart3 style={{ width: 12, height: 12, color: '#a78bfa' }} />
                                                <p style={{ fontSize: 12, fontWeight: 700, color: 'white', margin: 0 }}>Category Split</p>
                                            </div>

                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                                                {(['Demo Day', 'Workshop', 'Hackathon', 'Mentorship'] as const).map(t => {
                                                    const tc = TYPE_META[t]?.color || '#8b5cf6';
                                                    const count = events.filter(e => e.type === t).length;
                                                    const pct = Math.round((count / events.length) * 100);
                                                    return (
                                                        <div key={t}>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                                                                    <div style={{ width: 18, height: 18, borderRadius: 5, background: `${tc}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                                        {(() => { const Ic = TYPE_META[t]?.Icon; return Ic ? <Ic style={{ width: 10, height: 10, color: tc }} /> : null; })()}
                                                                    </div>
                                                                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,.45)' }}>{t}</span>
                                                                </div>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                                    <span style={{ fontSize: 11, fontWeight: 800, color: tc }}>{count}</span>
                                                                    <span style={{ fontSize: 9, color: 'rgba(255,255,255,.25)' }}>·{pct}%</span>
                                                                </div>
                                                            </div>
                                                            <div style={{ height: 5, borderRadius: 3, background: 'rgba(255,255,255,.05)', overflow: 'hidden' }}>
                                                                <div style={{ height: '100%', borderRadius: 3, width: `${pct}%`, background: `linear-gradient(90deg,${tc},${tc}65)`, boxShadow: `0 0 7px ${tc}60`, transition: 'width .5s ease' }} />
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>

                                            {/* combined segment bar */}
                                            <div style={{ marginTop: 12, display: 'flex', height: 6, borderRadius: 4, overflow: 'hidden', gap: 1 }}>
                                                {(['Demo Day', 'Workshop', 'Hackathon', 'Mentorship'] as const).map(t => {
                                                    const tc = TYPE_META[t]?.color || '#8b5cf6';
                                                    const count = events.filter(e => e.type === t).length;
                                                    const pct = (count / events.length) * 100;
                                                    return <div key={t} style={{ flex: `0 0 ${pct}%`, background: tc, boxShadow: `0 0 6px ${tc}60` }} />;
                                                })}
                                            </div>
                                        </div>

                                        {/* Your Registrations — seats the VC has reserved */}
                                        <div style={{ flex: 1, minHeight: 0, borderRadius: 18, border: '1px solid rgba(6,182,212,.18)', background: 'rgba(255,255,255,.024)', display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
                                            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg,transparent,rgba(6,182,212,.7),transparent)' }} />
                                            <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,.06)', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                                                <CalendarDays style={{ width: 12, height: 12, color: '#06b6d4' }} />
                                                <p style={{ fontSize: 12, fontWeight: 700, color: 'white', margin: 0 }}>Your Registrations</p>
                                                {registeredEvents.length > 0 && (
                                                    <div style={{ marginLeft: 'auto', width: 20, height: 20, borderRadius: '50%', background: 'rgba(6,182,212,.2)', border: '1px solid rgba(6,182,212,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: '#06b6d4' }}>{registeredEvents.length}</div>
                                                )}
                                            </div>
                                            <div className="sc-scroll" style={{ flex: 1, overflowY: 'auto', padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 8, minHeight: 0 }}>
                                                {registeredEvents.length === 0 ? (
                                                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, opacity: .25, minHeight: 80 }}>
                                                        <CalendarDays style={{ width: 26, height: 26, color: 'white' }} />
                                                        <p style={{ fontSize: 11, color: 'white', textAlign: 'center', margin: 0, lineHeight: 1.5 }}>No registrations yet —<br />reserve a seat at an event</p>
                                                    </div>
                                                ) : (
                                                    events.filter(e => registeredEvents.includes(e.id)).map(ev => {
                                                        const pd = parseDate(ev.date);
                                                        const tc = ({ 'Demo Day': '#8b5cf6', Pitching: '#a78bfa', Workshop: '#06b6d4', Hackathon: '#f59e0b', Mentorship: '#10b981' } as Record<string, string>)[ev.type] || '#06b6d4';
                                                        return (
                                                            <div key={ev.id} style={{ padding: '10px 12px', borderRadius: 12, background: `${tc}0a`, border: `1px solid ${tc}25`, borderLeft: `2.5px solid ${tc}75`, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                                                                <div style={{ width: 34, height: 38, borderRadius: 8, background: `${tc}14`, border: `1px solid ${tc}35`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                                    <span style={{ fontSize: 7, fontWeight: 800, color: tc, textTransform: 'uppercase', letterSpacing: '.06em', lineHeight: 1 }}>{pd.month}</span>
                                                                    <span style={{ fontSize: 14, fontWeight: 900, color: 'white', lineHeight: 1 }}>{pd.day}</span>
                                                                </div>
                                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                                    <p style={{ fontSize: 11, fontWeight: 600, color: 'white', margin: 0, lineHeight: 1.35, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.title}</p>
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 4 }}>
                                                                        <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 999, color: '#10b981', background: 'rgba(16,185,129,.14)', border: '1px solid rgba(16,185,129,.32)' }}>✓ Reserved</span>
                                                                        <span style={{ fontSize: 9, color: 'rgba(255,255,255,.28)' }}>{ev.time}</span>
                                                                    </div>
                                                                </div>
                                                                <button onClick={() => { setRegisteredEvents(prev => prev.filter(id => id !== ev.id)); showToast(`Registration cancelled — ${ev.title}`, '#ef4444'); }} aria-label={`Cancel registration for ${ev.title}`} title="Cancel registration" style={{ width: 20, height: 20, borderRadius: '50%', background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2, cursor: 'pointer', color: 'rgba(255,255,255,.4)' }}>
                                                                    <X style={{ width: 10, height: 10 }} />
                                                                </button>
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

                    {/* ══ 6. MARKET INSIGHTS ══ */}
                    {tab === 'insights' && (() => {
                        // ── Sector filter — only sectors with registered startups; multi-select ──
                        const sectorPalette = ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#f472b6', '#ef4444', '#a78bfa', '#22d3ee', '#34d399', '#fb923c'];
                        const sectorNames = Array.from(new Set(startups.map(s => s.industry).filter(Boolean))).sort();
                        const colorFor = (name: string) => sectorPalette[(Math.abs(sectorNames.indexOf(name)) % sectorPalette.length)];
                        // synthesize stats for a sector (prefer curated SECTOR_DATA, else compute from startups)
                        const statsFor = (name: string) => {
                            const curated = SECTOR_DATA.find(s => s.sector === name);
                            if (curated) return curated;
                            const inSec = startups.filter(s => s.industry === name);
                            const deployed = inSec.reduce((a, s) => a + (s.raised || 0), 0);
                            const avgG = inSec.length ? Math.round(inSec.reduce((a, s) => a + (s.growth || 0), 0) / inSec.length) : 0;
                            const pct = startups.length ? Math.round((inSec.length / startups.length) * 100) : 0;
                            return { sector: name, pct, deployed, deals: inSec.length, color: colorFor(name), growth: `+${avgG}%` };
                        };
                        const isAll = insightSectors.length === 0;
                        const selectedSectors = isAll ? sectorNames : insightSectors;
                        const selStats = selectedSectors.map(statsFor);
                        const insightStartups = isAll ? startups : startups.filter(s => insightSectors.includes(s.industry));
                        const scoreDenom = insightStartups.length || 1;
                        // breakdown panel: curated AUM allocation when "All", else the selected sectors
                        // (pct normalised across the selection so the donut never overflows)
                        const selDep = selStats.reduce((a, s) => a + s.deployed, 0) || 1;
                        const visibleSectors = isAll ? SECTOR_DATA : selStats.map(s => ({ ...s, pct: Math.round((s.deployed / selDep) * 100) }));
                        // headline figures (aggregated across the selected sectors)
                        const deployedVal = isAll ? totalDeployed : selStats.reduce((a, s) => a + s.deployed, 0);
                        const roiPct = isAll ? 52 : Math.round(selStats.reduce((a, s) => a + (parseInt(String(s.growth).replace(/[^\d-]/g, ''), 10) || 0), 0) / (selStats.length || 1));
                        const dealsVal = isAll ? 14 : selStats.reduce((a, s) => a + s.deals, 0);
                        const avgScore = insightStartups.length ? Math.round(insightStartups.reduce((a, s) => a + s.score, 0) / insightStartups.length) : 0;
                        const sectorLabel = isAll ? 'all sectors' : insightSectors.length === 1 ? insightSectors[0] : `${insightSectors.length} sectors`;
                        // chart series scaled so the final point matches the sector headline
                        const roiSeries = isAll ? ROI_DATA : ROI_DATA.map(d => ({ ...d, v: Math.max(0, Math.round(d.v * (roiPct / 52))) }));
                        const pipeSeries = isAll ? PIPELINE_DATA : PIPELINE_DATA.map(d => ({ ...d, v: Math.max(0, Math.round(d.v * (dealsVal / 14))) }));
                        return (
                        <div className="hub-tab-content" style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: '18px 22px', boxSizing: 'border-box', overflow: 'hidden', gap: 14, position: 'relative' }}>
                            <InsightsNebula />

                            {/* ── ambient CSS decorations ── */}
                            <style>{`
          @keyframes mi-spin   { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
          @keyframes mi-rspin  { from{transform:rotate(0deg)} to{transform:rotate(-360deg)} }
          @keyframes mi-float  { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
          @keyframes mi-card-bob { 0%,100%{transform:translateY(0px)} 50%{transform:translateY(-4px)} }
          @keyframes mi-drift  { 0%,100%{transform:translate(0,0)} 40%{transform:translate(14px,-12px)} 70%{transform:translate(-9px,10px)} }
          @keyframes mi-morph  { 0%,100%{border-radius:60% 40% 30% 70%/60% 30% 70% 40%} 50%{border-radius:30% 60% 70% 40%/50% 60% 30% 60%} }
          @keyframes mi-flow   { 0%{background-position:-80% 0} 100%{background-position:180% 0} }
          @keyframes mi-pulse  { 0%,100%{opacity:.45;transform:scale(1)} 50%{opacity:1;transform:scale(1.08)} }
          @keyframes mi-shimmer{ 0%,100%{opacity:.3} 50%{opacity:.7} }
        `}</style>
                            <div aria-hidden style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
                                {/* blobs */}
                                <div style={{ position: 'absolute', top: '5%', right: '6%', width: 280, height: 280, borderRadius: '50%', background: 'radial-gradient(circle,rgba(139,92,246,.08),transparent 70%)', animation: 'mi-drift 12s ease-in-out infinite' }} />
                                <div style={{ position: 'absolute', bottom: '10%', left: '6%', width: 220, height: 220, borderRadius: '50%', background: 'radial-gradient(circle,rgba(6,182,212,.06),transparent 70%)', animation: 'mi-drift 15s ease-in-out infinite reverse' }} />
                                {/* orrery top-right */}
                                <div style={{ position: 'absolute', top: -35, right: -35, width: 200, height: 200 }}>
                                    <div style={{ position: 'absolute', top: '50%', left: '50%', width: 16, height: 16, marginLeft: -8, marginTop: -8, borderRadius: '50%', background: 'radial-gradient(circle at 35% 35%,#c4b5fd,#7c3aed)', boxShadow: '0 0 20px rgba(139,92,246,.9)', animation: 'mi-pulse 2.8s ease-in-out infinite' }} />
                                    {[{ w: 60, c: '#8b5cf6', sp: '3.2s' }, { w: 100, c: '#06b6d4', sp: '5.8s', rev: true }, { w: 150, c: '#10b981', sp: '9.5s' }, { w: 196, c: '#f59e0b', sp: '14s', rev: true }].map((o, i) => (
                                        <div key={i} style={{ position: 'absolute', top: '50%', left: '50%', width: o.w, height: o.w, marginLeft: -o.w / 2, marginTop: -o.w / 2, borderRadius: '50%', border: `1px solid ${o.c}${i < 2 ? '38' : '20'}` }}>
                                            <div style={{ position: 'absolute', top: i % 2 === 0 ? -4 : 'auto', bottom: i % 2 === 1 ? -4 : 'auto', left: '50%', width: 8, height: 8, marginLeft: -4, borderRadius: '50%', background: o.c, boxShadow: `0 0 8px ${o.c}`, animation: `mi-spin ${o.sp} linear infinite ${o.rev ? 'reverse' : ''}`, transformOrigin: `4px ${o.w / 2 + 4}px` }} />
                                        </div>
                                    ))}
                                </div>
                                {/* morphing blob bottom-left */}
                                <div style={{ position: 'absolute', bottom: 28, left: 16, width: 110, height: 110, background: 'linear-gradient(135deg,rgba(139,92,246,.13),rgba(6,182,212,.08))', animation: 'mi-morph 7s ease-in-out infinite', border: '1px solid rgba(139,92,246,.18)' }} />
                                {/* spinning diamond mid */}
                                <div style={{ position: 'absolute', bottom: '22%', left: '42%', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 50, height: 50 }}>
                                    <div style={{ width: 36, height: 36, border: '2px solid rgba(245,158,11,.38)', borderRadius: 4, animation: 'mi-spin 9s linear infinite', transform: 'rotate(45deg)' }} />
                                    <div style={{ position: 'absolute', width: 18, height: 18, background: 'rgba(245,158,11,.07)', borderRadius: 2, animation: 'mi-rspin 5.5s linear infinite', transform: 'rotate(45deg)' }} />
                                </div>
                                {/* hexagon top-left area */}
                                <div style={{ position: 'absolute', top: '34%', left: '2%', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 60, height: 60 }}>
                                    <div style={{ width: 44, height: 44, border: '2px solid rgba(6,182,212,.3)', borderRadius: 8, animation: 'mi-spin 11s linear infinite', boxShadow: '0 0 14px rgba(6,182,212,.15)', transform: 'rotate(45deg)' }} />
                                    <div style={{ position: 'absolute', width: 24, height: 24, border: '1px solid rgba(6,182,212,.5)', borderRadius: 4, animation: 'mi-rspin 7s linear infinite' }} />
                                </div>
                                {/* cross/star */}
                                <div style={{ position: 'absolute', top: '22%', left: '28%', width: 40, height: 40, opacity: .32, animation: 'mi-spin 14s linear infinite' }}>
                                    {[0, 45, 90, 135].map(a => <div key={a} style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 1.5, background: `linear-gradient(90deg,transparent,${a < 90 ? '#8b5cf6' : '#06b6d4'},transparent)`, marginTop: -0.75, transform: `rotate(${a}deg)` }} />)}
                                </div>
                                {/* floating particles */}
                                {[{ x: '4%', y: '42%', s: 4, c: '#8b5cf6', d: '0s' }, { x: '52%', y: '88%', s: 3, c: '#06b6d4', d: '1s' }, { x: '76%', y: '16%', s: 5, c: '#10b981', d: '2.5s' }, { x: '88%', y: '62%', s: 3, c: '#f59e0b', d: '.5s' }, { x: '32%', y: '78%', s: 3, c: '#8b5cf6', d: '2s' }].map((p, i) => (
                                    <div key={i} style={{ position: 'absolute', left: p.x, top: p.y, width: p.s, height: p.s, borderRadius: '50%', background: p.c, boxShadow: `0 0 ${p.s * 2.5}px ${p.c}`, opacity: .45, animation: `mi-float ${3.5 + i * .5}s ease-in-out ${p.d} infinite` }} />
                                ))}
                                {/* flow lines */}
                                {[{ t: '28%', c: '#8b5cf6', d: '0s' }, { t: '58%', c: '#06b6d4', d: '1.5s' }, { t: '82%', c: '#10b981', d: '3s' }].map((l, i) => (
                                    <div key={i} style={{ position: 'absolute', left: 0, right: 0, top: l.t, height: 1, background: `linear-gradient(90deg,transparent,${l.c}16,transparent)`, backgroundSize: '40% 100%', animation: `mi-flow 7s linear ${l.d} infinite` }} />
                                ))}
                            </div>

                            {/* ── Header row ── */}
                            <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10, position: 'relative', zIndex: 30 }}>
                                <div style={{ width: 32, height: 32, borderRadius: 10, background: 'rgba(139,92,246,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 16px rgba(139,92,246,.5)' }}>
                                    <BarChart3 style={{ width: 15, height: 15, color: '#a78bfa', filter: 'drop-shadow(0 0 4px #a78bfa)' }} />
                                </div>
                                <div>
                                    <span style={{ fontSize: 14, fontWeight: 800, color: 'white', letterSpacing: '-.01em' }}>Market Intelligence</span>
                                    <span style={{ fontSize: 10, color: 'rgba(255,255,255,.28)', marginLeft: 10, fontWeight: 500 }}>Live · Updated now</span>
                                </div>
                                {/* ── Multi-select sector dropdown (only registered sectors) ── */}
                                <div ref={insightSectorRef} style={{ position: 'relative', marginLeft: 'auto', flexShrink: 0 }}>
                                    <button onClick={() => setInsightSectorOpen(o => !o)} className="sc-btn" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 14px', borderRadius: 10, background: insightSectors.length ? 'rgba(139,92,246,.2)' : 'rgba(255,255,255,.04)', border: `1px solid ${insightSectors.length ? 'rgba(139,92,246,.5)' : 'rgba(255,255,255,.1)'}`, color: insightSectors.length ? '#c4b5fd' : 'rgba(255,255,255,.62)', fontSize: 11, fontWeight: 700, cursor: 'pointer', boxShadow: insightSectors.length ? '0 0 14px rgba(139,92,246,.3)' : 'none' }}>
                                        <Filter style={{ width: 12, height: 12 }} />
                                        <span style={{ whiteSpace: 'nowrap' }}>{insightSectors.length === 0 ? 'Select Sectors' : insightSectors.length === 1 ? insightSectors[0] : `${insightSectors.length} sectors`}</span>
                                        {insightSectors.length > 0 && <span style={{ fontSize: 9, fontWeight: 800, padding: '1px 6px', borderRadius: 999, background: 'rgba(139,92,246,.32)', color: '#c4b5fd', minWidth: 16, textAlign: 'center' }}>{insightSectors.length}</span>}
                                        <ChevronRight style={{ width: 12, height: 12, transform: insightSectorOpen ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform .18s' }} />
                                    </button>
                                    {insightSectorOpen && (
                                        <div className="notif-scroll" style={{ position: 'absolute', top: 42, right: 0, width: 244, maxHeight: 320, overflowY: 'auto', zIndex: 41, background: 'rgba(8,8,16,.97)', border: '1px solid rgba(255,255,255,.1)', borderTop: '2px solid rgba(139,92,246,.55)', borderRadius: 14, boxShadow: '0 24px 70px rgba(0,0,0,.7)', backdropFilter: 'blur(14px)', padding: 8 }}>
                                            <div style={{ padding: '4px 8px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,.06)' }}>
                                                <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,.55)' }}>Filter by sector</span>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                    {sectorNames.length > 0 && insightSectors.length < sectorNames.length && <button onClick={() => setInsightSectors([...sectorNames])} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#c4b5fd', fontSize: 10, fontWeight: 700 }}>Select all</button>}
                                                    {insightSectors.length > 0 && <button onClick={() => setInsightSectors([])} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,.45)', fontSize: 10, fontWeight: 700 }}>Clear all</button>}
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginTop: 8 }}>
                                                {sectorNames.length === 0 && <div style={{ padding: '14px 10px', textAlign: 'center', fontSize: 11, color: 'rgba(255,255,255,.3)' }}>No startups enrolled yet</div>}
                                                {sectorNames.map(s => {
                                                    const checked = insightSectors.includes(s);
                                                    const count = startups.filter(x => x.industry === s).length;
                                                    return (
                                                        <button key={s} onClick={() => setInsightSectors(prev => checked ? prev.filter(x => x !== s) : [...prev, s])} className="dr-btn" style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left', padding: '8px 10px', borderRadius: 10, background: checked ? 'rgba(139,92,246,.12)' : 'transparent', border: `1px solid ${checked ? 'rgba(139,92,246,.32)' : 'rgba(255,255,255,.06)'}`, cursor: 'pointer' }}>
                                                            <div style={{ width: 16, height: 16, borderRadius: 5, flexShrink: 0, border: `1.5px solid ${checked ? '#8b5cf6' : 'rgba(255,255,255,.25)'}`, background: checked ? '#8b5cf6' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: checked ? '0 0 8px rgba(139,92,246,.5)' : 'none' }}>
                                                                {checked && <CheckCircle style={{ width: 11, height: 11, color: '#14081f' }} />}
                                                            </div>
                                                            <span style={{ flex: 1, fontSize: 12, fontWeight: 600, color: checked ? 'white' : 'rgba(255,255,255,.62)' }}>{s}</span>
                                                            <span style={{ fontSize: 9, fontWeight: 800, padding: '1px 7px', borderRadius: 999, background: checked ? 'rgba(139,92,246,.2)' : 'rgba(255,255,255,.06)', color: checked ? '#c4b5fd' : 'rgba(255,255,255,.3)' }}>{count}</span>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                            <button onClick={() => setInsightSectorOpen(false)} className="sc-btn" style={{ width: '100%', marginTop: 8, padding: '8px 0', borderRadius: 10, background: 'linear-gradient(90deg,#6d28d9,#8b5cf6)', color: 'white', border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700, boxShadow: '0 4px 14px rgba(139,92,246,.35)' }}>Done</button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* ── KPI strip ── */}
                            <div className="sc-stat-grid" style={{ flexShrink: 0, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, position: 'relative', zIndex: 1 }}>
                                {[
                                    { label: 'Value Committed', val: fmt(deployedVal), sub: isAll ? 'Closed via Sanyog' : sectorLabel, color: '#8b5cf6', Icon: TrendingUp },
                                    { label: 'Sourced Yield', val: `+${roiPct}%`, sub: isAll ? 'H1 2026 average' : `${sectorLabel} growth`, color: '#10b981', Icon: BarChart3 },
                                    { label: 'Active Pilots', val: `${dealsVal}`, sub: 'In pipeline', color: '#06b6d4', Icon: Target },
                                    { label: 'Avg Score', val: `${avgScore}`, sub: isAll ? 'Match quality' : `${insightStartups.length} ${insightStartups.length === 1 ? 'company' : 'companies'}`, color: '#f59e0b', Icon: Star },
                                ].map(k => (
                                    <div key={k.label} className="sc-card" style={{ borderRadius: 16, border: `1px solid ${k.color}25`, background: `linear-gradient(135deg,${k.color}10 0%,rgba(5,5,9,.9) 70%)`, padding: '14px 16px', position: 'relative', overflow: 'hidden', cursor: 'default' }}>
                                        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg,transparent,${k.color}80,transparent)` }} />
                                        <div style={{ position: 'absolute', top: -22, right: -22, width: 90, height: 90, borderRadius: '50%', background: `radial-gradient(circle,${k.color}18,transparent 70%)`, pointerEvents: 'none' }} />
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                                            <p style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,.28)', textTransform: 'uppercase', letterSpacing: '.09em', margin: 0 }}>{k.label}</p>
                                            <div style={{ width: 30, height: 30, borderRadius: 9, background: `${k.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 14px ${k.color}40` }}>
                                                <k.Icon style={{ width: 14, height: 14, color: k.color, filter: `drop-shadow(0 0 4px ${k.color})` }} />
                                            </div>
                                        </div>
                                        <p style={{ fontSize: 26, fontWeight: 900, color: 'white', margin: 0, lineHeight: 1, letterSpacing: '-1px', textShadow: `0 0 20px ${k.color}50` }}>{k.val}</p>
                                        <p style={{ fontSize: 10, color: 'rgba(255,255,255,.3)', margin: '5px 0 0' }}>{k.sub}</p>
                                    </div>
                                ))}
                            </div>

                            {/* ── Main grid ── */}
                            <div className="sc-insights-main-grid" style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gridTemplateRows: '1fr 1fr', gap: 14, position: 'relative', zIndex: 1 }}>

                                {/* ── SECTOR BREAKDOWN — left column full height ── */}
                                <div className="sc-insights-sector sc-tab-panel-left" style={{ gridRow: '1 / 3', borderRadius: 18, border: '1px solid rgba(255,255,255,.07)', background: 'rgba(255,255,255,.026)', display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
                                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg,transparent,rgba(139,92,246,.7),transparent)' }} />
                                    <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,.06)', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                                        <PieChart style={{ width: 13, height: 13, color: '#a78bfa' }} />
                                        <span style={{ fontSize: 12, fontWeight: 700, color: 'white' }}>Sector Momentum</span>
                                        <span style={{ marginLeft: 'auto', fontSize: 10, color: 'rgba(255,255,255,.28)' }}>{isAll ? `${visibleSectors.length} sectors` : sectorLabel}</span>
                                    </div>

                                    {/* SVG Donut + legend */}
                                    <div style={{ padding: '14px 16px', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 12, maxWidth: isMobile ? 220 : undefined, margin: isMobile ? '0 auto' : undefined }}>
                                        {(() => {
                                            const r = 44, cx = 52, cy = 52;
                                            const circ = 2 * Math.PI * r;
                                            let cum = 0;
                                            return (
                                                <svg width={104} height={104} viewBox="0 0 104 104" style={{ flexShrink: 0 }}>
                                                    <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,.04)" strokeWidth="12" />
                                                    {visibleSectors.map(s => {
                                                        const dash = (s.pct / 100) * circ;
                                                        const off = cum; cum += dash;
                                                        return (
                                                            <circle key={s.sector} cx={cx} cy={cy} r={r} fill="none" stroke={s.color} strokeWidth="12"
                                                                strokeDasharray={`${dash - 2} ${circ}`} strokeDashoffset={-off}
                                                                transform={`rotate(-90 ${cx} ${cy})`}
                                                                style={{ filter: `drop-shadow(0 0 6px ${s.color}80)` }} />
                                                        );
                                                    })}
                                                    <text x={cx} y={cy - 6} textAnchor="middle" fontSize="18" fontWeight="900" fill="white">{visibleSectors.length}</text>
                                                    <text x={cx} y={cx + 10} textAnchor="middle" fontSize="8" fill="rgba(255,255,255,.28)" letterSpacing="1">{isAll ? 'SECTORS' : 'SELECTED'}</text>
                                                </svg>
                                            );
                                        })()}
                                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 5 }}>
                                            {visibleSectors.map(s => (
                                                <div key={s.sector} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: s.color, flexShrink: 0, boxShadow: `0 0 6px ${s.color}` }} />
                                                    <span style={{ fontSize: 10, color: 'rgba(255,255,255,.5)', flex: 1 }}>{s.sector}</span>
                                                    <span style={{ fontSize: 11, fontWeight: 800, color: s.color }}>{s.pct}%</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Sector cards */}
                                    <div className="sc-scroll" style={{ flex: 1, overflowY: 'auto', padding: '0 12px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                                        {visibleSectors.map((s, i) => (
                                            <div key={s.sector} className="sc-card" style={{ borderRadius: 14, border: `1px solid ${s.color}22`, background: `linear-gradient(135deg,${s.color}0d 0%,rgba(0,0,0,.55) 100%)`, padding: '12px 13px', cursor: 'pointer', position: 'relative', overflow: 'hidden' }}>
                                                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg,transparent,${s.color}60,transparent)` }} />
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                                                    {!isMobile && <div style={{ animation: `mi-card-bob ${3.8 + i * 0.5}s ease-in-out infinite`, animationDelay: `${i * 0.7}s`, flexShrink: 0 }}><SectorPlanet color={s.color} size={38} /></div>}
                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                        <span style={{ fontSize: 12, fontWeight: 700, color: 'white' }}>{s.sector}</span>
                                                        <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
                                                            <span style={{ fontSize: 9, color: 'rgba(255,255,255,.3)' }}>{s.pct}% of capital</span>
                                                            <span style={{ fontSize: 9, color: 'rgba(255,255,255,.3)' }}>{s.deals} deals</span>
                                                        </div>
                                                    </div>
                                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2, flexShrink: 0 }}>
                                                        <span style={{ fontSize: 11, fontWeight: 800, color: '#10b981', filter: 'drop-shadow(0 0 4px rgba(16,185,129,.6))' }}>{s.growth}</span>
                                                        <span style={{ fontSize: 11, fontWeight: 800, color: s.color, textShadow: `0 0 8px ${s.color}55` }}>{fmt(s.deployed)}</span>
                                                    </div>
                                                </div>
                                                <div style={{ height: 4, borderRadius: 2, background: 'rgba(255,255,255,.05)', overflow: 'hidden' }}>
                                                    <div style={{ height: '100%', borderRadius: 2, width: `${s.pct}%`, background: `linear-gradient(90deg,${s.color},${s.color}65)`, boxShadow: `0 0 8px ${s.color}55`, transition: 'width .6s ease' }} />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* ── PORTFOLIO ROI ── */}
                                <div style={{ borderRadius: 18, border: '1px solid rgba(255,255,255,.07)', background: 'rgba(255,255,255,.026)', padding: '16px', display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
                                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg,transparent,rgba(16,185,129,.7),transparent)' }} />
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexShrink: 0 }}>
                                        <div>
                                            <p style={{ fontSize: 12, fontWeight: 700, color: 'white', margin: 0 }}>Pilot Success Rate</p>
                                            <p style={{ fontSize: 10, color: 'rgba(255,255,255,.28)', margin: '2px 0 0' }}>Jan – Jun 2026</p>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <p style={{ fontSize: 22, fontWeight: 900, color: '#10b981', margin: 0, textShadow: '0 0 14px rgba(16,185,129,.6)', lineHeight: 1 }}>+{roiPct}%</p>
                                            <p style={{ fontSize: 9, color: 'rgba(255,255,255,.28)', margin: '2px 0 0', textTransform: 'uppercase', letterSpacing: '.06em' }}>6-month gain</p>
                                        </div>
                                    </div>
                                    <AreaChart data={roiSeries} color="#10b981" h={isMobile ? 160 : 100} />
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 4, marginTop: 8, flexShrink: 0 }}>
                                        {roiSeries.map((d, i) => (
                                            <div key={d.m} style={{ textAlign: 'center', padding: '5px 0', borderRadius: 8, background: i === roiSeries.length - 1 ? 'rgba(16,185,129,.1)' : 'rgba(255,255,255,.03)', border: `1px solid ${i === roiSeries.length - 1 ? 'rgba(16,185,129,.3)' : 'rgba(255,255,255,.06)'}` }}>
                                                <p style={{ fontSize: 9, color: 'rgba(255,255,255,.25)', margin: 0 }}>{d.m}</p>
                                                <p style={{ fontSize: 11, fontWeight: 700, color: '#10b981', margin: 0 }}>+{d.v}%</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* ── DEAL PIPELINE ── */}
                                <div style={{ borderRadius: 18, border: '1px solid rgba(255,255,255,.07)', background: 'rgba(255,255,255,.026)', padding: '16px', display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
                                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg,transparent,rgba(139,92,246,.7),transparent)' }} />
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexShrink: 0 }}>
                                        <div>
                                            <p style={{ fontSize: 12, fontWeight: 700, color: 'white', margin: 0 }}>Deal Pipeline</p>
                                            <p style={{ fontSize: 10, color: 'rgba(255,255,255,.28)', margin: '2px 0 0' }}>Jan – Jun 2026</p>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <p style={{ fontSize: 22, fontWeight: 900, color: '#8b5cf6', margin: 0, textShadow: '0 0 14px rgba(139,92,246,.6)', lineHeight: 1 }}>{dealsVal}</p>
                                            <p style={{ fontSize: 9, color: 'rgba(255,255,255,.28)', margin: '2px 0 0', textTransform: 'uppercase', letterSpacing: '.06em' }}>active deals</p>
                                        </div>
                                    </div>
                                    <AreaChart data={pipeSeries} color="#8b5cf6" h={100} />
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 4, marginTop: 8, flexShrink: 0 }}>
                                        {pipeSeries.map((d, i) => (
                                            <div key={d.m} style={{ textAlign: 'center', padding: '5px 0', borderRadius: 8, background: i === pipeSeries.length - 1 ? 'rgba(139,92,246,.1)' : 'rgba(255,255,255,.03)', border: `1px solid ${i === pipeSeries.length - 1 ? 'rgba(139,92,246,.3)' : 'rgba(255,255,255,.06)'}` }}>
                                                <p style={{ fontSize: 9, color: 'rgba(255,255,255,.25)', margin: 0 }}>{d.m}</p>
                                                <p style={{ fontSize: 11, fontWeight: 700, color: '#8b5cf6', margin: 0 }}>{d.v}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* ── SCORE DISTRIBUTION ── */}
                                <div style={{ borderRadius: 18, border: '1px solid rgba(255,255,255,.07)', background: 'rgba(255,255,255,.026)', padding: '16px', display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
                                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg,transparent,rgba(6,182,212,.7),transparent)' }} />
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexShrink: 0 }}>
                                        <Shield style={{ width: 13, height: 13, color: '#06b6d4' }} />
                                        <p style={{ fontSize: 12, fontWeight: 700, color: 'white', margin: 0 }}>Score Distribution</p>
                                        <span style={{ marginLeft: 'auto', fontSize: 10, color: 'rgba(255,255,255,.28)' }}>{insightStartups.length} companies</span>
                                    </div>
                                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8, minHeight: 0 }}>
                                        {[
                                            { label: '≥ 90', badge: 'Elite', count: insightStartups.filter(s => s.score >= 90).length, color: '#10b981' },
                                            { label: '80–89', badge: 'Strong', count: insightStartups.filter(s => s.score >= 80 && s.score < 90).length, color: '#06b6d4' },
                                            { label: '70–79', badge: 'Good', count: insightStartups.filter(s => s.score >= 70 && s.score < 80).length, color: '#f59e0b' },
                                            { label: '< 70', badge: 'Watch', count: insightStartups.filter(s => s.score < 70).length, color: '#ef4444' },
                                        ].map(row => {
                                            const barW = (row.count / scoreDenom) * 100;
                                            return (
                                                <div key={row.label} style={{ padding: '10px 12px', borderRadius: 12, background: `${row.color}09`, border: `1px solid ${row.color}22`, position: 'relative', overflow: 'hidden' }}>
                                                    <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: `${barW}%`, background: `${row.color}12`, borderRadius: 12, transition: 'width .6s ease', pointerEvents: 'none' }} />
                                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                            <span style={{ fontSize: 13, fontWeight: 900, color: row.color, filter: `drop-shadow(0 0 6px ${row.color}80)`, minWidth: 36 }}>{row.label}</span>
                                                            <span style={{ fontSize: 9, fontWeight: 700, padding: '3px 8px', borderRadius: 999, background: `${row.color}18`, color: row.color, border: `1px solid ${row.color}38`, textTransform: 'uppercase', letterSpacing: '.05em' }}>{row.badge}</span>
                                                        </div>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                            <div style={{ display: 'flex', gap: 3 }}>
                                                                {Array.from({ length: row.count }).map((_, i) => (
                                                                    <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: row.color, boxShadow: `0 0 5px ${row.color}` }} />
                                                                ))}
                                                            </div>
                                                            <span style={{ fontSize: 20, fontWeight: 900, color: row.color, textShadow: `0 0 12px ${row.color}60`, lineHeight: 1 }}>{row.count}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* ── THESIS ALIGNMENT ── */}
                                <div style={{ borderRadius: 18, border: '1px solid rgba(255,255,255,.07)', background: 'rgba(255,255,255,.026)', padding: '16px', display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
                                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg,transparent,rgba(245,158,11,.7),transparent)' }} />
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexShrink: 0 }}>
                                        <Target style={{ width: 13, height: 13, color: '#f59e0b' }} />
                                        <p style={{ fontSize: 12, fontWeight: 700, color: 'white', margin: 0 }}>Thesis Match</p>
                                        <span style={{ marginLeft: 'auto', fontSize: 10, color: 'rgba(255,255,255,.28)' }}>4 criteria</span>
                                    </div>
                                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10, minHeight: 0, justifyContent: 'space-around' }}>
                                        {[
                                            { label: 'Sector Fit', val: 82, color: '#8b5cf6', Icon: Building2 },
                                            { label: 'Stage Match', val: 74, color: '#06b6d4', Icon: GitBranch },
                                            { label: 'Check Size', val: 91, color: '#10b981', Icon: Wallet },
                                            { label: 'Geography', val: 88, color: '#f59e0b', Icon: Globe },
                                        ].map(row => (
                                            <div key={row.label}>
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                                                        <div style={{ width: 22, height: 22, borderRadius: 7, background: `${row.color}18`, border: `1px solid ${row.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                            <row.Icon style={{ width: 11, height: 11, color: row.color }} />
                                                        </div>
                                                        <span style={{ fontSize: 11, color: 'rgba(255,255,255,.55)', fontWeight: 500 }}>{row.label}</span>
                                                    </div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                        <span style={{ fontSize: 13, fontWeight: 800, color: row.color, filter: `drop-shadow(0 0 6px ${row.color}80)` }}>{row.val}%</span>
                                                        <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 999, background: row.val >= 85 ? 'rgba(16,185,129,.15)' : row.val >= 75 ? 'rgba(245,158,11,.15)' : 'rgba(239,68,68,.15)', color: row.val >= 85 ? '#10b981' : row.val >= 75 ? '#f59e0b' : '#ef4444', border: `1px solid ${row.val >= 85 ? 'rgba(16,185,129,.35)' : row.val >= 75 ? 'rgba(245,158,11,.35)' : 'rgba(239,68,68,.35)'}` }}>
                                                            {row.val >= 85 ? 'Strong' : row.val >= 75 ? 'Good' : 'Weak'}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div style={{ height: 6, borderRadius: 4, background: 'rgba(255,255,255,.05)', overflow: 'hidden', position: 'relative' }}>
                                                    <div style={{ height: '100%', borderRadius: 4, width: `${row.val}%`, background: `linear-gradient(90deg,${row.color},${row.color}70)`, boxShadow: `0 0 10px ${row.color}60`, transition: 'width .8s cubic-bezier(.34,1.56,.64,1)' }} />
                                                    {/* tick at 75% threshold */}
                                                    <div style={{ position: 'absolute', top: 0, bottom: 0, left: '75%', width: 1, background: 'rgba(255,255,255,.2)' }} />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                        );
                    })()}

                    {/* ══ 7. DEPLOYMENT TRACKER ══ */}
{tab === 'deployment' && (() => {
    const totalD = DEPLOYMENTS.reduce((a, c) => a + c.amount, 0);
    const fundTotal = totalD + dryPowder;

    return (
        <div className="hub-tab-content" style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: '18px 22px', boxSizing: 'border-box', overflow: 'hidden', gap: 14, position: 'relative' }}>
            <DeploymentGalaxy />

            {/* ── keyframes ── */}
            <style>{`
              @keyframes dp-spin   { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
              @keyframes dp-rspin  { from{transform:rotate(0deg)} to{transform:rotate(-360deg)} }
              @keyframes dp-float  { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-9px)} }
              @keyframes dp-drift  { 0%,100%{transform:translate(0,0)} 45%{transform:translate(15px,-12px)} 70%{transform:translate(-10px,10px)} }
              @keyframes dp-morph  { 0%,100%{border-radius:60% 40% 30% 70%/60% 30% 70% 40%} 50%{border-radius:30% 60% 70% 40%/50% 60% 30% 60%} }
              @keyframes dp-flow   { 0%{background-position:-80% 0} 100%{background-position:180% 0} }
              @keyframes dp-pulse  { 0%,100%{opacity:.45;transform:scale(1)} 50%{opacity:1;transform:scale(1.08)} }
              @keyframes dp-bar    { from{width:0} to{width:var(--w)} }
              @keyframes dp-rise   { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
              @keyframes dp-glow   { 0%,100%{box-shadow:0 0 8px rgba(139,92,246,.3)} 50%{box-shadow:0 0 24px rgba(139,92,246,.75)} }
              .dp-card { transition:transform .2s ease,box-shadow .2s ease,border-color .2s ease; animation:dp-rise .32s ease both; }
              .dp-card:hover { transform:translateY(-3px) translateX(2px); }
              .dp-btn { transition:all .18s ease; }
              .dp-btn:hover { transform:translateY(-1px); filter:brightness(1.15); }
              .dp-sidebar-scroll { scrollbar-width:thin; scrollbar-color:rgba(255,255,255,.18) transparent; }
              .dp-sidebar-scroll::-webkit-scrollbar { width:6px; }
              .dp-sidebar-scroll::-webkit-scrollbar-thumb { background:rgba(255,255,255,.14); border-radius:3px; }
              .dp-sidebar-scroll::-webkit-scrollbar-track { background:transparent; }
            `}</style>

            {/* ── CSS ambient BG layer ── */}
            <div aria-hidden style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
                {/* blobs */}
                <div style={{ position: 'absolute', top: '5%', left: '12%', width: 320, height: 320, borderRadius: '50%', background: 'radial-gradient(circle,rgba(139,92,246,.07),transparent 70%)', animation: 'dp-drift 12s ease-in-out infinite' }} />
                <div style={{ position: 'absolute', bottom: '10%', right: '8%', width: 260, height: 260, borderRadius: '50%', background: 'radial-gradient(circle,rgba(16,185,129,.06),transparent 70%)', animation: 'dp-drift 15s ease-in-out infinite reverse' }} />
                <div style={{ position: 'absolute', top: '42%', right: '28%', width: 180, height: 180, borderRadius: '50%', background: 'radial-gradient(circle,rgba(6,182,212,.05),transparent 70%)', animation: 'dp-drift 9s ease-in-out infinite 2s' }} />

                {/* orrery top-right */}
                <div style={{ position: 'absolute', top: -40, right: -40, width: 220, height: 220 }}>
                    <div style={{ position: 'absolute', top: '50%', left: '50%', width: 17, height: 17, marginLeft: -8, marginTop: -8, borderRadius: '50%', background: 'radial-gradient(circle at 35% 35%,#a78bfa,#6d28d9)', boxShadow: '0 0 20px rgba(139,92,246,.9)', animation: 'dp-pulse 2.8s ease-in-out infinite' }} />
                    {[{ w: 62, c: '#8b5cf6', sp: '3.2s' }, { w: 104, c: '#10b981', sp: '5.5s', rev: true }, { w: 158, c: '#06b6d4', sp: '9s' }, { w: 214, c: '#f59e0b', sp: '13s', rev: true }].map((o, i) => (
                        <div key={i} style={{ position: 'absolute', top: '50%', left: '50%', width: o.w, height: o.w, marginLeft: -o.w / 2, marginTop: -o.w / 2, borderRadius: '50%', border: `1px solid ${o.c}${i < 2 ? '38' : '20'}` }}>
                            <div style={{ position: 'absolute', top: i % 2 === 0 ? -4 : 'auto', bottom: i % 2 === 1 ? -4 : 'auto', left: '50%', width: 9, height: 9, marginLeft: -4, borderRadius: '50%', background: o.c, boxShadow: `0 0 9px ${o.c}`, animation: `dp-spin ${o.sp} linear infinite ${o.rev ? 'reverse' : ''}`, transformOrigin: `4px ${o.w / 2 + 4}px` }} />
                        </div>
                    ))}
                </div>

                {/* morphing blob bottom-left */}
                <div style={{ position: 'absolute', bottom: 22, left: 12, width: 115, height: 115, background: 'linear-gradient(135deg,rgba(139,92,246,.12),rgba(6,182,212,.07))', animation: 'dp-morph 8s ease-in-out infinite', border: '1px solid rgba(139,92,246,.16)' }} />

                {/* spinning diamond */}
                <div style={{ position: 'absolute', bottom: '26%', left: '42%', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 52, height: 52 }}>
                    <div style={{ position: 'absolute', width: 40, height: 40, border: '2px solid rgba(16,185,129,.35)', borderRadius: 4, animation: 'dp-spin 10s linear infinite', transform: 'rotate(45deg)' }} />
                    <div style={{ position: 'absolute', width: 20, height: 20, background: 'rgba(16,185,129,.06)', borderRadius: 2, animation: 'dp-rspin 6.5s linear infinite', transform: 'rotate(45deg)' }} />
                </div>

                {/* hexagon */}
                <div style={{ position: 'absolute', top: '34%', left: '2%', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 56, height: 56 }}>
                    <div style={{ width: 42, height: 42, border: '2px solid rgba(6,182,212,.28)', borderRadius: 8, animation: 'dp-spin 11s linear infinite', transform: 'rotate(45deg)' }} />
                    <div style={{ position: 'absolute', width: 22, height: 22, border: '1px solid rgba(6,182,212,.48)', borderRadius: 4, animation: 'dp-rspin 7s linear infinite' }} />
                </div>

                {/* cross/star */}
                <div style={{ position: 'absolute', top: '20%', left: '30%', width: 40, height: 40, opacity: .28, animation: 'dp-spin 15s linear infinite' }}>
                    {[0, 45, 90, 135].map(a => <div key={a} style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 1.5, background: `linear-gradient(90deg,transparent,${a < 90 ? '#8b5cf6' : '#06b6d4'},transparent)`, marginTop: -0.75, transform: `rotate(${a}deg)` }} />)}
                </div>

                {/* SVG triangle */}
                <div style={{ position: 'absolute', bottom: '22%', right: '22%', opacity: .28, animation: 'dp-float 5.5s ease-in-out 1s infinite' }}>
                    <svg width="50" height="44"><polygon points="25,2 48,42 2,42" fill="none" stroke="rgba(16,185,129,.65)" strokeWidth="1.5" /><polygon points="25,14 40,40 10,40" fill="rgba(16,185,129,.05)" stroke="rgba(16,185,129,.28)" strokeWidth="1" /></svg>
                </div>

                {/* particles */}
                {[{ x: '7%', y: '38%', s: 4, c: '#8b5cf6', d: '0s' }, { x: '32%', y: '85%', s: 3, c: '#10b981', d: '.8s' }, { x: '58%', y: '12%', s: 5, c: '#06b6d4', d: '2.5s' }, { x: '85%', y: '55%', s: 3, c: '#f59e0b', d: '.4s' }, { x: '48%', y: '72%', s: 3, c: '#8b5cf6', d: '1.7s' }, { x: '70%', y: '88%', s: 4, c: '#10b981', d: '3s' }].map((p, i) => (
                    <div key={i} style={{ position: 'absolute', left: p.x, top: p.y, width: p.s, height: p.s, borderRadius: '50%', background: p.c, boxShadow: `0 0 ${p.s * 2.5}px ${p.c}`, opacity: .42, animation: `dp-float ${3.5 + i * .6}s ease-in-out ${p.d} infinite` }} />
                ))}

                {/* flow lines */}
                {[{ t: '32%', c: '#8b5cf6' }, { t: '64%', c: '#10b981' }, { t: '85%', c: '#06b6d4' }].map((l, i) => (
                    <div key={i} style={{ position: 'absolute', left: 0, right: 0, top: l.t, height: 1, background: `linear-gradient(90deg,transparent,${l.c}14,transparent)`, backgroundSize: '40% 100%', animation: `dp-flow 7s linear ${i * 2}s infinite` }} />
                ))}
            </div>

            {/* ── KPI strip ── */}
            <div className="sc-stat-grid" style={{ flexShrink: 0, display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, position: 'relative', zIndex: 1 }}>
                {[
                    { label: 'Innovation Budget', val: fmt(VC_PROFILE.aum), sub: 'Sanctioned for pilots', color: '#8b5cf6', Icon: Building2 },
                    { label: 'Deployed', val: fmt(totalD), sub: `${((totalD / fundTotal) * 100).toFixed(0)}% of mandate`, color: '#10b981', Icon: TrendingUp },
                    { label: 'Uncommitted', val: fmt(dryPowder), sub: `${(((dryPowder) / fundTotal) * 100).toFixed(0)}% available`, color: '#06b6d4', Icon: Wallet },
                    { label: 'Avg Sourced Yield', val: '+40%', sub: 'Across positions', color: '#f59e0b', Icon: BarChart3 },
                ].map(k => (
                    <div key={k.label} className="dp-card" style={{ borderRadius: 16, border: `1px solid ${k.color}25`, background: `linear-gradient(135deg,${k.color}10 0%,rgba(5,5,9,.92) 70%)`, padding: '14px 16px', position: 'relative', overflow: 'hidden', cursor: 'default' }}>
                        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg,transparent,${k.color}80,transparent)` }} />
                        <div style={{ position: 'absolute', top: -22, right: -22, width: 90, height: 90, borderRadius: '50%', background: `radial-gradient(circle,${k.color}18,transparent 70%)`, pointerEvents: 'none' }} />
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                            <p style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,.28)', textTransform: 'uppercase', letterSpacing: '.09em', margin: 0 }}>{k.label}</p>
                            <div style={{ width: 29, height: 29, borderRadius: 9, background: `${k.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 12px ${k.color}40`, flexShrink: 0 }}>
                                <k.Icon style={{ width: 13, height: 13, color: k.color, filter: `drop-shadow(0 0 3px ${k.color})` }} />
                            </div>
                        </div>
                        <p style={{ fontSize: 27, fontWeight: 900, color: 'white', margin: 0, lineHeight: 1, letterSpacing: '-1px', textShadow: `0 0 18px ${k.color}50` }}>{k.val}</p>
                        <p style={{ fontSize: 10, color: 'rgba(255,255,255,.3)', margin: '5px 0 0' }}>{k.sub}</p>
                    </div>
                ))}
            </div>

            {/* ── Main 2-col layout ── */}
            <div className="sc-tab-main-grid" style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: '1fr 296px', gap: 14, position: 'relative', zIndex: 1 }}>

                {/* ── LEFT: Deployment cards ── */}
                <div className="sc-tab-panel-left" style={{ minHeight: 0, borderRadius: 18, border: '1px solid rgba(255,255,255,.07)', background: 'rgba(255,255,255,.025)', display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg,transparent,rgba(16,185,129,.7),transparent)' }} />

                    {/* header */}
                    <div style={{ padding: '13px 18px', borderBottom: '1px solid rgba(255,255,255,.06)', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                        <div style={{ width: 32, height: 32, borderRadius: 10, background: 'rgba(16,185,129,.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 14px rgba(16,185,129,.45)' }}>
                            <Wallet style={{ width: 14, height: 14, color: '#10b981', filter: 'drop-shadow(0 0 4px #10b981)' }} />
                        </div>
                        <div>
                            <p style={{ fontSize: 13, fontWeight: 700, color: 'white', margin: 0 }}>Sourced Allocations</p>
                            <p style={{ fontSize: 10, color: 'rgba(255,255,255,.3)', margin: 0 }}>{DEPLOYMENTS.length} positions · {fmt(totalD)} deployed</p>
                        </div>
                        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8, padding: '5px 12px', borderRadius: 999, background: 'rgba(16,185,129,.1)', border: '1px solid rgba(16,185,129,.28)' }}>
                            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 6px #10b981', animation: 'sc-pulse2 2.2s ease-in-out infinite' }} />
                            <span style={{ fontSize: 9, fontWeight: 700, color: '#10b981', letterSpacing: '.08em' }}>{DEPLOYMENTS.length} POSITIONS</span>
                        </div>
                    </div>

                    {/* portfolio fund bar */}
                    <div style={{ padding: '12px 18px 0', flexShrink: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                            <span style={{ fontSize: 10, color: 'rgba(255,255,255,.3)' }}>Capital Deployed</span>
                            <span style={{ fontSize: 10, fontWeight: 700, color: 'white' }}>{((totalD / fundTotal) * 100).toFixed(0)}% of {fmt(fundTotal)} mandate</span>
                        </div>
                        <div style={{ height: 6, borderRadius: 4, background: 'rgba(255,255,255,.06)', overflow: 'hidden', position: 'relative' }}>
                            {DEPLOYMENTS.map((d, i) => {
                                const pct = (d.amount / fundTotal) * 100;
                                const left = (DEPLOYMENTS.slice(0, i).reduce((a, c) => a + c.amount, 0) / fundTotal) * 100;
                                return (
                                    <div key={d.startup} style={{ position: 'absolute', top: 0, left: `${left}%`, width: `${pct}%`, height: '100%', background: d.color, boxShadow: `0 0 8px ${d.color}70`, transition: 'width .8s ease' }} />
                                );
                            })}
                        </div>
                        <div className="dp-legend" style={{ display: 'flex', gap: 12, marginTop: 6 }}>
                            {DEPLOYMENTS.map(d => (
                                <div key={d.startup} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: d.color, boxShadow: `0 0 5px ${d.color}` }} />
                                    <span style={{ fontSize: 9, color: 'rgba(255,255,255,.35)' }}>{d.startup}</span>
                                </div>
                            ))}
                            <span style={{ marginLeft: 'auto', fontSize: 9, color: 'rgba(255,255,255,.25)' }}>Remaining: {fmt(dryPowder)}</span>
                        </div>
                    </div>

                    {/* deployment cards */}
                    <div className="sc-scroll dp-sidebar-scroll" style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {DEPLOYMENTS.map((d, idx) => {
                            const pct = (d.amount / totalD) * 100;
                            const r = 20, circ = 2 * Math.PI * r;
                            const dash = (pct / 100) * circ;
                            return (
                                <div key={idx} className="dp-card" style={{ flexShrink: 0, borderRadius: 16, border: `1px solid ${d.color}28`, background: `linear-gradient(145deg,${d.color}0c 0%,rgba(5,5,9,.88) 100%)`, padding: '18px 20px', cursor: 'pointer', position: 'relative', overflow: 'hidden', animationDelay: `${idx * 0.08}s` }}>
                                    {/* top accent */}
                                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1.5, background: `linear-gradient(90deg,transparent,${d.color}80,transparent)` }} />
                                    {/* corner radial */}
                                    <div style={{ position: 'absolute', top: -35, right: -35, width: 140, height: 140, borderRadius: '50%', background: `radial-gradient(circle,${d.color}18,transparent 70%)`, pointerEvents: 'none' }} />

                                    <div className="dp-card-row" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                                        {/* 3D planet */}
                                        <div style={{ flexShrink: 0, animation: 'dp-float 5s ease-in-out infinite', animationDelay: `${idx * 0.8}s` }}>
                                            <SectorPlanet color={d.color} size={58} />
                                        </div>

                                        {/* main info */}
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div className="dp-card-namerow" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 4 }}>
                                                <div>
                                                    <p style={{ fontSize: 16, fontWeight: 800, color: 'white', margin: 0, letterSpacing: '-.01em' }}>{d.startup}</p>
                                                    <p style={{ fontSize: 11, color: 'rgba(255,255,255,.4)', margin: '2px 0 0', whiteSpace: 'nowrap' }}>{d.sector} · {d.stage} · {d.date}</p>
                                                </div>
                                                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                                    <p style={{ fontSize: 22, fontWeight: 900, color: d.color, margin: 0, lineHeight: 1, textShadow: `0 0 16px ${d.color}60` }}>{fmt(d.amount)}</p>
                                                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 4, padding: '4px 10px', borderRadius: 999, background: 'rgba(16,185,129,.14)', border: '1px solid rgba(16,185,129,.35)' }}>
                                                        <TrendingUp style={{ width: 10, height: 10, color: '#10b981' }} />
                                                        <span style={{ fontSize: 11, fontWeight: 800, color: '#10b981' }}>ROI {d.roi}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* progress + pct */}
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10 }}>
                                                <div style={{ flex: 1, height: 6, borderRadius: 4, background: 'rgba(255,255,255,.05)', overflow: 'hidden' }}>
                                                    <div style={{ height: '100%', borderRadius: 4, width: `${pct}%`, background: `linear-gradient(90deg,${d.color},${d.color}70)`, boxShadow: `0 0 10px ${d.color}70`, transition: 'width 1s cubic-bezier(.34,1.56,.64,1)', animation: 'dp-bar .9s ease forwards', ['--w' as string]: `${pct}%` }} />
                                                </div>
                                                <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,.4)', flexShrink: 0 }}>{pct.toFixed(1)}% of deployed</span>
                                            </div>
                                        </div>

                                        {/* SVG ring gauge */}
                                        <div className="dp-card-ring" style={{ flexShrink: 0, position: 'relative', width: 52, height: 52 }}>
                                            <svg width={52} height={52} viewBox="0 0 52 52">
                                                <circle cx="26" cy="26" r={r} fill="none" stroke={`${d.color}20`} strokeWidth="4" />
                                                <circle cx="26" cy="26" r={r} fill="none" stroke={d.color} strokeWidth="4"
                                                    strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
                                                    transform="rotate(-90 26 26)"
                                                    style={{ filter: `drop-shadow(0 0 5px ${d.color}80)` }}
                                                />
                                                <circle
                                                    cx={26 + r * Math.cos((-Math.PI / 2) + (pct / 100) * 2 * Math.PI)}
                                                    cy={26 + r * Math.sin((-Math.PI / 2) + (pct / 100) * 2 * Math.PI)}
                                                    r="3" fill={d.color}
                                                    style={{ filter: `drop-shadow(0 0 4px ${d.color})` }}
                                                />
                                            </svg>
                                            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                                                <span style={{ fontSize: 11, fontWeight: 900, color: d.color, lineHeight: 1, filter: `drop-shadow(0 0 5px ${d.color}80)` }}>{pct.toFixed(0)}%</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* bottom detail strip */}
                                    <div className="dp-card-strip" style={{ marginTop: 12, paddingTop: 10, borderTop: `1px solid ${d.color}18`, display: 'flex', gap: 16, alignItems: 'center' }}>
                                        {[['Sector', d.sector], ['Stage', d.stage], ['Deployed', d.date], ['Position', `${pct.toFixed(1)}% of capital`]].map(([l, v]) => (
                                            <div key={l}>
                                                <p style={{ fontSize: 9, color: 'rgba(255,255,255,.25)', margin: 0, textTransform: 'uppercase', letterSpacing: '.06em', whiteSpace: 'nowrap' }}>{l}</p>
                                                <p style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,.6)', margin: '2px 0 0', whiteSpace: l === 'Deployed' ? 'nowrap' : 'normal' }}>{v}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* ── RIGHT column (now scrolls so nothing gets crushed) ── */}
                <div className="sc-tab-sidebar dp-sidebar-scroll" style={{ display: 'flex', flexDirection: 'column', gap: 12, minHeight: 0, overflowY: 'auto', overflowX: 'hidden', paddingRight: 4, paddingBottom: 2 }}>

                    {/* ── Portfolio Donut + fund split ── */}
                    <div style={{ flexShrink: 0, borderRadius: 18, border: '1px solid rgba(139,92,246,.28)', background: 'linear-gradient(160deg,rgba(139,92,246,.12) 0%,rgba(5,5,9,.97) 70%)', padding: '16px', position: 'relative', overflow: 'hidden' }}>
                        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg,transparent,rgba(139,92,246,.85),transparent)' }} />
                        <div style={{ position: 'absolute', top: -30, right: -30, width: 130, height: 130, borderRadius: '50%', background: 'radial-gradient(circle,rgba(139,92,246,.12),transparent 70%)', pointerEvents: 'none' }} />
                        <p style={{ fontSize: 12, fontWeight: 700, color: 'white', margin: '0 0 12px' }}>Marketplace Allocation</p>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                            {/* SVG donut */}
                            {(() => {
                                const r = 40, cx = 48, cy = 48, circ = 2 * Math.PI * r;
                                let cum = 0;
                                return (
                                    <svg width={96} height={96} viewBox="0 0 96 96" style={{ flexShrink: 0 }}>
                                        <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,.04)" strokeWidth="10" />
                                        {DEPLOYMENTS.map(d => {
                                            const pct = d.amount / totalD;
                                            const dashLen = pct * circ;
                                            const off = cum; cum += dashLen;
                                            return (
                                                <circle key={d.startup} cx={cx} cy={cy} r={r} fill="none"
                                                    stroke={d.color} strokeWidth="10"
                                                    strokeDasharray={`${dashLen - 3} ${circ}`}
                                                    strokeDashoffset={-off}
                                                    transform={`rotate(-90 ${cx} ${cy})`}
                                                    style={{ filter: `drop-shadow(0 0 6px ${d.color}80)` }}
                                                />
                                            );
                                        })}
                                        <text x={cx} y={cy - 5} textAnchor="middle" fontSize="16" fontWeight="900" fill="white">{DEPLOYMENTS.length}</text>
                                        <text x={cx} y={cy + 9} textAnchor="middle" fontSize="8" fill="rgba(255,255,255,.3)" letterSpacing="1">POS.</text>
                                    </svg>
                                );
                            })()}

                            {/* legend */}
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {DEPLOYMENTS.map(d => {
                                    const pct = ((d.amount / totalD) * 100).toFixed(0);
                                    return (
                                        <div key={d.startup}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: d.color, boxShadow: `0 0 5px ${d.color}`, flexShrink: 0 }} />
                                                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,.55)' }}>{d.startup}</span>
                                                </div>
                                                <span style={{ fontSize: 11, fontWeight: 800, color: d.color }}>{pct}%</span>
                                            </div>
                                            <div style={{ height: 3, borderRadius: 2, background: 'rgba(255,255,255,.05)' }}>
                                                <div style={{ height: '100%', borderRadius: 2, width: `${pct}%`, background: `linear-gradient(90deg,${d.color},${d.color}70)`, boxShadow: `0 0 6px ${d.color}55` }} />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* deployed vs dry powder bar */}
                        <div style={{ marginTop: 12 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                                <span style={{ fontSize: 9, color: 'rgba(255,255,255,.28)', textTransform: 'uppercase', letterSpacing: '.08em' }}>Mandate Utilisation</span>
                                <span style={{ fontSize: 10, fontWeight: 800, background: 'linear-gradient(90deg,#a78bfa,#34d399)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{((totalD / fundTotal) * 100).toFixed(0)}% deployed</span>
                            </div>
                            <div style={{ height: 7, borderRadius: 4, background: 'rgba(255,255,255,.05)', overflow: 'hidden' }}>
                                <div style={{ height: '100%', width: `${(totalD / fundTotal) * 100}%`, borderRadius: 4, background: 'linear-gradient(90deg,#7c3aed,#06b6d4,#10b981)', boxShadow: '0 0 14px rgba(139,92,246,.65)' }} />
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5 }}>
                                <span style={{ fontSize: 9, color: '#a78bfa' }}>Deployed: {fmt(totalD)}</span>
                                <span style={{ fontSize: 9, color: '#10b981' }}>Available: {fmt(dryPowder)}</span>
                            </div>
                        </div>
                    </div>

                    {/* ── Deployment Capacity ── */}
                    <div style={{ flexShrink: 0, minWidth: 0, width: '100%', boxSizing: 'border-box', borderRadius: 18, border: '1px solid rgba(245,158,11,.22)', background: 'linear-gradient(160deg,rgba(245,158,11,.08) 0%,rgba(5,5,9,.97) 70%)', padding: '14px 16px', position: 'relative', overflow: 'hidden' }}>
                        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg,transparent,rgba(245,158,11,.8),transparent)' }} />
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                            <div style={{ width: 26, height: 26, borderRadius: 8, background: 'rgba(245,158,11,.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 10px rgba(245,158,11,.4)', flexShrink: 0 }}>
                                <Zap style={{ width: 12, height: 12, color: '#f59e0b', filter: 'drop-shadow(0 0 3px #f59e0b)' }} />
                            </div>
                            <div style={{ minWidth: 0 }}>
                                <p style={{ fontSize: 12, fontWeight: 700, color: 'white', margin: 0 }}>Deployment Capacity</p>
                                <p style={{ fontSize: 9, color: 'rgba(255,255,255,.28)', margin: 0 }}>Ready to deploy: {fmt(dryPowder)}</p>
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {[
                                { label: '5 Seed deals · ₹5M each', cost: 25_000_000, budgets: 17, color: '#8b5cf6' },
                                { label: '3 Series A · ₹15M', cost: 45_000_000, budgets: 9, color: '#06b6d4' },
                                { label: '1 Lead Series B · ₹50M', cost: 50_000_000, budgets: 8, color: '#10b981' },
                            ].map((s, i) => {
                                const usePct = Math.min((s.cost / dryPowder) * 100, 100);
                                return (
                                    <div key={i} style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 12, background: `${s.color}08`, border: `1px solid ${s.color}22`, position: 'relative', overflow: 'hidden' }}>
                                        <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: `${usePct}%`, background: `${s.color}0a`, pointerEvents: 'none', transition: 'width .6s ease' }} />
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 5, position: 'relative', gap: 8 }}>
                                            <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,.65)', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.label}</span>
                                            <span style={{ fontSize: 11, fontWeight: 800, color: s.color, flexShrink: 0 }}>{s.budgets} left</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative' }}>
                                            <span style={{ fontSize: 10, color: 'rgba(255,255,255,.3)' }}>{fmt(s.cost)} used</span>
                                            <span style={{ fontSize: 9, color: s.color, fontWeight: 700 }}>{usePct.toFixed(0)}% of capacity</span>
                                        </div>
                                        <div style={{ height: 3, borderRadius: 2, background: 'rgba(255,255,255,.05)', marginTop: 6, overflow: 'hidden' }}>
                                            <div style={{ height: '100%', borderRadius: 2, width: `${usePct}%`, background: `linear-gradient(90deg,${s.color},${s.color}70)`, boxShadow: `0 0 6px ${s.color}55` }} />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* ── Return Targets with SVG arc gauges (sizes to content now) ── */}
                    <div style={{ flexShrink: 0, borderRadius: 18, border: '1px solid rgba(16,185,129,.22)', background: 'linear-gradient(160deg,rgba(16,185,129,.08) 0%,rgba(5,5,9,.97) 70%)', padding: '14px 16px', display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
                        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg,transparent,rgba(16,185,129,.8),transparent)' }} />
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexShrink: 0 }}>
                            <div style={{ width: 26, height: 26, borderRadius: 8, background: 'rgba(16,185,129,.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 10px rgba(16,185,129,.4)' }}>
                                <Target style={{ width: 12, height: 12, color: '#10b981', filter: 'drop-shadow(0 0 3px #10b981)' }} />
                            </div>
                            <div>
                                <p style={{ fontSize: 12, fontWeight: 700, color: 'white', margin: 0 }}>Return Targets</p>
                                <p style={{ fontSize: 9, color: 'rgba(255,255,255,.28)', margin: 0 }}>Performance vs targets</p>
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {[
                                { label: 'Target Benefit', val: '3.5×', current: 2.1, target: 3.5, color: '#8b5cf6', unit: '×' },
                                { label: 'Current Avg ROI', val: '+40%', current: 40, target: 60, color: '#10b981', unit: '%' },
                                { label: 'IRR Target', val: '28%', current: 28, target: 35, color: '#06b6d4', unit: '%' },
                                { label: 'Hold Period', val: '5–7 yrs', current: 2, target: 7, color: '#f59e0b', unit: 'yr' },
                            ].map(row => {
                                const pct = Math.min((row.current / row.target) * 100, 100);
                                const statusColor = pct >= 75 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#ef4444';
                                return (
                                    <div key={row.label} style={{ padding: '9px 12px', borderRadius: 11, background: `${row.color}08`, border: `1px solid ${row.color}20`, display: 'flex', alignItems: 'center', gap: 12 }}>
                                        {/* mini arc SVG */}
                                        {(() => {
                                            const R = 16, C = 2 * Math.PI * R;
                                            const half = C / 2;
                                            const fill = (pct / 100) * half;
                                            return (
                                                <svg width={40} height={24} viewBox="0 0 40 24" style={{ flexShrink: 0 }}>
                                                    <path d="M4 22 A16 16 0 0 1 36 22" fill="none" stroke={`${row.color}20`} strokeWidth="4" strokeLinecap="round" />
                                                    <path d="M4 22 A16 16 0 0 1 36 22" fill="none" stroke={row.color} strokeWidth="4" strokeLinecap="round"
                                                        strokeDasharray={`${fill} ${half}`}
                                                        style={{ filter: `drop-shadow(0 0 4px ${row.color}80)` }}
                                                    />
                                                    <text x="20" y="22" textAnchor="middle" fontSize="8" fontWeight="800" fill={row.color}>{pct.toFixed(0)}%</text>
                                                </svg>
                                            );
                                        })()}

                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                                                <span style={{ fontSize: 11, color: 'rgba(255,255,255,.5)', fontWeight: 500 }}>{row.label}</span>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                    <span style={{ fontSize: 15, fontWeight: 900, color: row.color, textShadow: `0 0 10px ${row.color}60`, lineHeight: 1 }}>{row.val}</span>
                                                    <span style={{ fontSize: 8, fontWeight: 700, padding: '2px 6px', borderRadius: 999, background: `${statusColor}18`, color: statusColor, border: `1px solid ${statusColor}35` }}>
                                                        {pct >= 75 ? 'On Track' : pct >= 50 ? 'Progressing' : 'Early'}
                                                    </span>
                                                </div>
                                            </div>
                                            <div style={{ height: 3, borderRadius: 2, background: 'rgba(255,255,255,.05)', overflow: 'hidden' }}>
                                                <div style={{ height: '100%', borderRadius: 2, width: `${pct}%`, background: `linear-gradient(90deg,${row.color},${row.color}70)`, boxShadow: `0 0 6px ${row.color}55` }} />
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
})()}

                    {/* ══ 8. INVESTOR NETWORK (public VC directory) ══ */}
                    {tab === 'vcnetwork' && (
                        <div className="hub-tab-content" style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: '18px 22px', boxSizing: 'border-box', overflow: 'hidden', position: 'relative', gap: 14 }}>

                            {/* ── keyframes ── */}
                            <style>{`
              @keyframes iv-spin   { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
              @keyframes iv-rspin  { from{transform:rotate(0deg)} to{transform:rotate(-360deg)} }
              @keyframes iv-float  { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
              @keyframes iv-drift  { 0%,100%{transform:translate(0,0)} 45%{transform:translate(15px,-12px)} 70%{transform:translate(-10px,10px)} }
              @keyframes iv-morph  { 0%,100%{border-radius:60% 40% 30% 70%/60% 30% 70% 40%} 50%{border-radius:30% 60% 70% 40%/50% 60% 30% 60%} }
              @keyframes iv-flow   { 0%{background-position:-80% 0} 100%{background-position:180% 0} }
              @keyframes iv-pulse  { 0%,100%{opacity:.45;transform:scale(1)} 50%{opacity:1;transform:scale(1.1)} }
              @keyframes iv-rise   { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
              @keyframes iv-twinkle{ 0%,100%{opacity:.2} 50%{opacity:.9} }
              @keyframes iv-shine  { 0%{background-position:-120% 0} 100%{background-position:220% 0} }
              .iv-card { animation:iv-rise .42s cubic-bezier(.2,.7,.3,1) both; transition:transform .22s ease, box-shadow .22s ease, border-color .22s ease; }
              .iv-card:hover { transform:translateY(-5px); box-shadow:0 22px 50px rgba(0,0,0,.55); }
              .iv-card:hover .iv-orb { transform:scale(1.06); }
              .iv-orb { transition:transform .25s ease; }
              .iv-card:hover .iv-accent { animation:iv-shine 1.3s ease forwards; }
              .iv-btn { transition:all .18s ease; }
              .iv-btn:hover { transform:translateY(-2px); filter:brightness(1.12); box-shadow:0 8px 26px rgba(124,58,237,.55); }
            `}</style>

                            {/* ── CSS ambient observatory backdrop ── */}
                            <div aria-hidden style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
                                {/* nebula blobs */}
                                <div style={{ position: 'absolute', top: '4%', left: '10%', width: 320, height: 320, borderRadius: '50%', background: 'radial-gradient(circle,rgba(139,92,246,.08),transparent 70%)', animation: 'iv-drift 13s ease-in-out infinite' }} />
                                <div style={{ position: 'absolute', bottom: '8%', right: '6%', width: 280, height: 280, borderRadius: '50%', background: 'radial-gradient(circle,rgba(6,182,212,.07),transparent 70%)', animation: 'iv-drift 16s ease-in-out infinite reverse' }} />
                                <div style={{ position: 'absolute', top: '40%', left: '46%', width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle,rgba(16,185,129,.05),transparent 70%)', animation: 'iv-drift 10s ease-in-out infinite 2s' }} />
                                {/* orrery top-right */}
                                <div style={{ position: 'absolute', top: -44, right: -44, width: 230, height: 230 }}>
                                    <div style={{ position: 'absolute', top: '50%', left: '50%', width: 17, height: 17, marginLeft: -8, marginTop: -8, borderRadius: '50%', background: 'radial-gradient(circle at 35% 35%,#c4b5fd,#6d28d9)', boxShadow: '0 0 20px rgba(139,92,246,.9)', animation: 'iv-pulse 2.8s ease-in-out infinite' }} />
                                    {[{ w: 62, c: '#8b5cf6', sp: '3.4s' }, { w: 106, c: '#06b6d4', sp: '6s', rev: true }, { w: 162, c: '#10b981', sp: '9.5s' }, { w: 220, c: '#f59e0b', sp: '14s', rev: true }].map((o, i) => (
                                        <div key={i} style={{ position: 'absolute', top: '50%', left: '50%', width: o.w, height: o.w, marginLeft: -o.w / 2, marginTop: -o.w / 2, borderRadius: '50%', border: `1px solid ${o.c}${i < 2 ? '38' : '20'}` }}>
                                            <div style={{ position: 'absolute', top: i % 2 === 0 ? -4 : 'auto', bottom: i % 2 === 1 ? -4 : 'auto', left: '50%', width: 9, height: 9, marginLeft: -4, borderRadius: '50%', background: o.c, boxShadow: `0 0 9px ${o.c}`, animation: `iv-spin ${o.sp} linear infinite ${o.rev ? 'reverse' : ''}`, transformOrigin: `4px ${o.w / 2 + 4}px` }} />
                                        </div>
                                    ))}
                                </div>
                                {/* morphing blob bottom-left */}
                                <div style={{ position: 'absolute', bottom: 26, left: 14, width: 110, height: 110, background: 'linear-gradient(135deg,rgba(139,92,246,.12),rgba(6,182,212,.07))', animation: 'iv-morph 8s ease-in-out infinite', border: '1px solid rgba(139,92,246,.16)' }} />
                                {/* constellation SVG */}
                                <div style={{ position: 'absolute', top: '24%', left: '4%', opacity: .4, animation: 'iv-float 7s ease-in-out infinite' }}>
                                    <svg width="150" height="110">
                                        <polyline points="8,80 42,30 80,52 118,16 140,60" fill="none" stroke="rgba(167,139,250,.4)" strokeWidth="1" />
                                        {[[8, 80], [42, 30], [80, 52], [118, 16], [140, 60]].map(([x, y], i) => (
                                            <circle key={i} cx={x} cy={y} r={i % 2 ? 1.8 : 2.6} fill="#c4b5fd" style={{ animation: `iv-twinkle ${2.2 + i * 0.4}s ease-in-out infinite` }} />
                                        ))}
                                    </svg>
                                </div>
                                {/* spinning diamond */}
                                <div style={{ position: 'absolute', bottom: '24%', left: '40%', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 52, height: 52 }}>
                                    <div style={{ position: 'absolute', width: 38, height: 38, border: '2px solid rgba(6,182,212,.3)', borderRadius: 4, animation: 'iv-spin 11s linear infinite', transform: 'rotate(45deg)' }} />
                                    <div style={{ position: 'absolute', width: 18, height: 18, background: 'rgba(6,182,212,.06)', borderRadius: 2, animation: 'iv-rspin 6.5s linear infinite', transform: 'rotate(45deg)' }} />
                                </div>
                                {/* floating star particles */}
                                {[{ x: '7%', y: '40%', s: 4, c: '#8b5cf6', d: '0s' }, { x: '34%', y: '84%', s: 3, c: '#06b6d4', d: '.8s' }, { x: '60%', y: '12%', s: 5, c: '#10b981', d: '2.5s' }, { x: '86%', y: '52%', s: 3, c: '#f59e0b', d: '.4s' }, { x: '50%', y: '70%', s: 3, c: '#f472b6', d: '1.7s' }, { x: '72%', y: '86%', s: 4, c: '#a78bfa', d: '3s' }].map((p, i) => (
                                    <div key={i} style={{ position: 'absolute', left: p.x, top: p.y, width: p.s, height: p.s, borderRadius: '50%', background: p.c, boxShadow: `0 0 ${p.s * 2.5}px ${p.c}`, opacity: .42, animation: `iv-float ${3.6 + i * .5}s ease-in-out ${p.d} infinite` }} />
                                ))}
                                {/* flow lines */}
                                {[{ t: '30%', c: '#8b5cf6' }, { t: '62%', c: '#06b6d4' }, { t: '84%', c: '#10b981' }].map((l, i) => (
                                    <div key={i} style={{ position: 'absolute', left: 0, right: 0, top: l.t, height: 1, background: `linear-gradient(90deg,transparent,${l.c}14,transparent)`, backgroundSize: '40% 100%', animation: `iv-flow 8s linear ${i * 2}s infinite` }} />
                                ))}
                            </div>

                            {/* ── Header ── */}
                            <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', position: 'relative', zIndex: 1 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
                                    <div style={{ width: 40, height: 40, borderRadius: 12, flexShrink: 0, background: 'linear-gradient(135deg,rgba(139,92,246,.22),rgba(6,182,212,.16))', border: '1px solid rgba(139,92,246,.32)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 18px rgba(139,92,246,.4)' }}>
                                        <Globe style={{ width: 18, height: 18, color: '#c4b5fd', filter: 'drop-shadow(0 0 5px #8b5cf6)' }} />
                                    </div>
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                                            <p style={{ fontSize: 17, fontWeight: 900, color: 'white', margin: 0, letterSpacing: '-.02em', textShadow: '0 0 18px rgba(139,92,246,.4)' }}>Department Network</p>
                                            <span style={{ fontSize: 10, fontWeight: 800, padding: '3px 10px', borderRadius: 999, color: '#a78bfa', background: 'rgba(139,92,246,.15)', border: '1px solid rgba(139,92,246,.3)' }}>{vcList.length} funds</span>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 10px', borderRadius: 999, background: 'rgba(16,185,129,.1)', border: '1px solid rgba(16,185,129,.28)' }}>
                                                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 6px #10b981', animation: 'iv-pulse 2.2s ease-in-out infinite' }} />
                                                <span style={{ fontSize: 9, fontWeight: 800, color: '#10b981', letterSpacing: '.08em' }}>VERIFIED</span>
                                            </div>
                                        </div>
                                        <p style={{ fontSize: 11, color: 'rgba(255,255,255,.4)', margin: '4px 0 0' }}>Every verified department on Sanyog — the public record of who is buying innovation, visible to startups, departments &amp; citizens alike.</p>
                                    </div>
                                </div>
                                <button onClick={() => setRegisterOpen(true)} className="iv-btn" style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 17px', borderRadius: 11, background: 'linear-gradient(90deg,#7c3aed,#0ea5e9)', color: 'white', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, boxShadow: '0 4px 16px rgba(124,58,237,.4)' }}>
                                    <UserPlus style={{ width: 13, height: 13 }} />Register Your Department
                                </button>
                            </div>

                            <div className="sc-scroll" style={{ flex: 1, minHeight: 0, overflowY: 'auto', position: 'relative', zIndex: 1 }}>
                                {vcList.length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '60px 0', color: 'rgba(255,255,255,.25)', fontSize: 13 }}>No departments listed yet — be the first to register.</div>
                                ) : (
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 16, paddingBottom: 4 }}>
                                        {(pinned?.kind === 'investor' ? bringToFront(vcList, v => (v.firm_name || '').toLowerCase() === pinned.key) : vcList).map((vc, i) => {
                                            const initials = (vc.firm_name || '?').split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase();
                                            const col = ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#f472b6'][i % 5];
                                            const sectors = (vc.sectors || '').split(',').map((s: string) => s.trim()).filter(Boolean);
                                            const vcFocused = focus?.kind === 'investor' && focus.key === (vc.firm_name || '').toLowerCase();
                                            // Prefer matching by email (works once the list API returns it); fall back to
                                            // firm name against the signed-in investor's own loaded profile so self-removal
                                            // still works even if `vc.email` isn't present on this card yet.
                                            const isOwnCard = (!!user?.email && !!vc.email && user.email.toLowerCase() === vc.email.toLowerCase())
                                                || (!!myProfile && !!vc.firm_name && (myProfile.firm_name || '').toLowerCase() === vc.firm_name.toLowerCase());
                                            const canRemoveVC = isAdmin || isOwnCard;
                                            return (
                                                <div key={(vc.firm_name || '') + i} className={`iv-card${vcFocused ? ' search-focus' : ''}`} style={{ borderRadius: 18, border: `1px solid ${col}2e`, background: `linear-gradient(150deg,${col}12 0%,rgba(7,7,13,.94) 62%)`, padding: '17px 17px 15px', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: 12, animationDelay: `${i * 0.07}s`, cursor: 'default', backdropFilter: 'blur(2px)' }}>
                                                    {/* animated top accent */}
                                                    <div className="iv-accent" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg,transparent,${col},transparent)`, backgroundSize: '60% 100%', backgroundRepeat: 'no-repeat', backgroundPosition: 'center' }} />
                                                    {/* corner radial glow */}
                                                    <div style={{ position: 'absolute', top: -34, right: -34, width: 130, height: 130, borderRadius: '50%', background: `radial-gradient(circle,${col}20,transparent 70%)`, pointerEvents: 'none' }} />
                                                    {/* faint constellation in card */}
                                                    <svg width="90" height="70" style={{ position: 'absolute', bottom: 6, right: 8, opacity: .18, pointerEvents: 'none' }}>
                                                        <polyline points="6,54 30,22 56,40 84,12" fill="none" stroke={col} strokeWidth="1" />
                                                        {[[6, 54], [30, 22], [56, 40], [84, 12]].map(([x, y], k) => <circle key={k} cx={x} cy={y} r="1.8" fill={col} />)}
                                                    </svg>

                                                    {/* Three-dot menu — investor can remove their own listing; admin can remove any */}
                                                    {canRemoveVC && (
                                                        <div className="iv-menu-trigger" style={{ position: 'absolute', top: 10, right: 10, zIndex: 2 }}>
                                                            <MoreHorizontal
                                                                style={{ width: 15, height: 15, color: 'rgba(255,255,255,.35)', cursor: 'pointer', transition: 'color 0.2s' }}
                                                                onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.85)')}
                                                                onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,.35)')}
                                                                onClick={e => {
                                                                    e.stopPropagation();
                                                                    document.querySelectorAll('.iv-menu').forEach(m => (m as HTMLElement).style.display = 'none');
                                                                    const menu = e.currentTarget.nextSibling as HTMLElement;
                                                                    if (menu) menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
                                                                }}
                                                            />
                                                            <div className="iv-menu" style={{ display: 'none', position: 'absolute', right: 0, top: 20, background: '#0d0d18', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, overflow: 'hidden', zIndex: 50, minWidth: 130, boxShadow: '0 8px 32px rgba(0,0,0,0.6)' }}>
                                                                <button
                                                                    onClick={e => {
                                                                        e.stopPropagation();
                                                                        setVcRemoveReason(''); setVcRemoveError('');
                                                                        // vc.email may be missing (e.g. list API not yet returning it) — for a
                                                                        // self-removal we can safely fall back to the signed-in user's own email.
                                                                        setVcRemoveTarget(vc.email ? vc : { ...vc, email: user?.email });
                                                                    }}
                                                                    style={{ width: '100%', padding: '9px 14px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#f87171', textAlign: 'left' }}
                                                                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(248,113,113,0.1)')}
                                                                    onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                                                                >
                                                                    <Trash2 style={{ width: 12, height: 12 }} /> Remove
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* header row: orb + identity */}
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 13, position: 'relative', zIndex: 1 }}>
                                                        <div className="iv-orb" style={{ position: 'relative', width: 52, height: 52, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                            {isMobile ? (
                                                                <div style={{ width: 46, height: 46, borderRadius: '50%', background: `radial-gradient(circle at 32% 28%, ${col}, ${col}66 60%, ${col}1e)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 800, color: 'white', boxShadow: `0 4px 16px ${col}55` }}>{initials}</div>
                                                            ) : (
                                                                <>
                                                                    <SectorPlanet color={col} size={52} />
                                                                    <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 900, color: 'white', textShadow: `0 1px 6px rgba(0,0,0,.9), 0 0 10px ${col}`, pointerEvents: 'none' }}>{initials}</span>
                                                                </>
                                                            )}
                                                        </div>
                                                        <div style={{ minWidth: 0, flex: 1 }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                                <p style={{ fontSize: 14, fontWeight: 800, color: 'white', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', letterSpacing: '-.01em' }}>{vc.firm_name}</p>
                                                                <CheckCircle style={{ width: 13, height: 13, color: '#10b981', flexShrink: 0, filter: 'drop-shadow(0 0 4px rgba(16,185,129,.7))' }} />
                                                            </div>
                                                            <p style={{ fontSize: 11, color: 'rgba(255,255,255,.42)', margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{vc.partner_name}</p>
                                                        </div>
                                                    </div>

                                                    {vc.investment_thesis && <p style={{ fontSize: 11.5, color: 'rgba(255,255,255,.55)', margin: 0, lineHeight: 1.55, fontStyle: 'italic', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', position: 'relative', zIndex: 1, minHeight: 36 }}>“{vc.investment_thesis}”</p>}

                                                    {sectors.length > 0 && <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, position: 'relative', zIndex: 1 }}>{sectors.slice(0, 4).map((s: string) => <span key={s} style={{ fontSize: 9, fontWeight: 700, padding: '3px 9px', borderRadius: 999, color: col, background: `${col}16`, border: `1px solid ${col}32`, letterSpacing: '.02em' }}>{s}</span>)}</div>}

                                                    <div style={{ display: 'flex', gap: 8, marginTop: 'auto', borderTop: '1px solid rgba(255,255,255,.07)', paddingTop: 11, position: 'relative', zIndex: 1 }}>
                                                        <div style={{ flex: 1, minWidth: 0 }}>
                                                            <p style={{ fontSize: 8, color: 'rgba(255,255,255,.32)', margin: 0, textTransform: 'uppercase', letterSpacing: '.07em', fontWeight: 700 }}>Stage</p>
                                                            <p style={{ fontSize: 11.5, fontWeight: 700, color: 'white', margin: '3px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{vc.stage_pref || '—'}</p>
                                                        </div>
                                                        <div style={{ width: 1, alignSelf: 'stretch', background: 'rgba(255,255,255,.07)' }} />
                                                        <div style={{ flex: 1, minWidth: 0 }}>
                                                            <p style={{ fontSize: 8, color: 'rgba(255,255,255,.32)', margin: 0, textTransform: 'uppercase', letterSpacing: '.07em', fontWeight: 700 }}>Cheque</p>
                                                            <p style={{ fontSize: 11.5, fontWeight: 800, color: col, margin: '3px 0 0', textShadow: `0 0 10px ${col}40` }}>{vc.check_min ? `${fmt(vc.check_min)}${vc.check_max ? ` – ${fmt(vc.check_max)}` : '+'}` : '—'}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </main>
            </div >

            {/* ══ MODAL: Mandate Gate ══ */}
            {mandateGate && (
                <div onClick={() => setMandateGate(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.85)', backdropFilter: 'blur(16px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60, padding: 20 }}>
                    <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 420, background: '#0d0d1a', border: '1px solid rgba(139,92,246,.3)', borderRadius: 20, padding: '32px 28px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, boxShadow: '0 0 80px rgba(139,92,246,.2), 0 32px 80px rgba(0,0,0,.8)' }}>
                        {/* Icon */}
                        <div style={{ width: 56, height: 56, borderRadius: 16, background: 'rgba(139,92,246,.15)', border: '1px solid rgba(139,92,246,.35)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Telescope style={{ width: 24, height: 24, color: '#a78bfa' }} />
                        </div>
                        {/* Heading */}
                        <div style={{ textAlign: 'center' }}>
                            <p style={{ margin: '0 0 6px', fontSize: 18, fontWeight: 800, color: '#fff', letterSpacing: '-.01em' }}>Department Access Required</p>
                            <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,.45)', lineHeight: 1.6 }}>This action is reserved for registered departments.<br />Register your department first to unlock the challenge<br />pipeline, evaluation room, network access &amp; demo days.</p>
                        </div>
                        {/* Divider */}
                        <div style={{ width: '100%', height: 1, background: 'rgba(255,255,255,.07)' }} />
                        {/* Feature list */}
                        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {[
                                { Icon: Star,         label: 'Shortlist deals & build pipeline',    color: '#a78bfa' },
                                { Icon: FolderKey,    label: 'Access & download diligence docs',     color: '#34d399' },
                                { Icon: MessageSquare,label: 'Message founders & schedule calls',    color: '#38bdf8' },
                                { Icon: CalendarDays, label: 'Reserve seats at Demo Days',           color: '#fb923c' },
                            ].map(f => (
                                <div key={f.label} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 13px', borderRadius: 10, background: `${f.color}0a`, border: `1px solid ${f.color}22` }}>
                                    <f.Icon style={{ width: 14, height: 14, color: f.color, flexShrink: 0 }} />
                                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,.65)', fontWeight: 500 }}>{f.label}</span>
                                </div>
                            ))}
                        </div>
                        {/* CTAs */}
                        <div style={{ width: '100%', display: 'flex', gap: 10, marginTop: 4 }}>
                            <button onClick={() => setMandateGate(false)} style={{ flex: 1, padding: '11px', borderRadius: 12, background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.1)', color: 'rgba(255,255,255,.45)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                                Maybe Later
                            </button>
                            <button onClick={() => { setMandateGate(false); setRegisterOpen(true); }} style={{ flex: 2, padding: '11px', borderRadius: 12, background: 'linear-gradient(90deg,#7c3aed,#0ea5e9)', border: 'none', color: 'white', fontSize: 13, fontWeight: 700, cursor: 'pointer', boxShadow: '0 6px 24px rgba(124,58,237,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                                <Telescope style={{ width: 14, height: 14 }} />Set Up My Mandate →
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ══ MODAL: Message ══ */}
            {
                msgOpen && (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.82)', backdropFilter: 'blur(14px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }}>
                        <div className="hub-modal-wrap" style={{ background: '#07070f', border: '1px solid rgba(255,255,255,.1)', borderTop: '2px solid rgba(6,182,212,.5)', borderRadius: 22, width: '100%', maxWidth: 420, boxShadow: '0 32px 90px rgba(0,0,0,.85)' }}>
                            <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,.07)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <div style={{ width: 36, height: 36, borderRadius: 11, background: 'linear-gradient(135deg,#0e7490,#06b6d4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, boxShadow: '0 4px 14px rgba(6,182,212,.35)' }}>{msgOpen.avatar}</div>
                                    <div>
                                        <p style={{ fontSize: 13, fontWeight: 700, color: 'white', margin: 0 }}>{msgOpen.name}</p>
                                        <p style={{ fontSize: 11, color: 'rgba(255,255,255,.35)', margin: 0 }}>{msgOpen.role} · {msgOpen.company}</p>
                                    </div>
                                </div>
                                <button onClick={() => setMsgOpen(null)} style={{ background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 8, cursor: 'pointer', color: 'rgba(255,255,255,.5)', padding: 6, display: 'flex' }}><X style={{ width: 14, height: 14 }} /></button>
                            </div>
                            <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                                <textarea value={msgText} onChange={e => setMsgText(e.target.value)} placeholder="Type your message…" style={{ width: '100%', minHeight: 110, background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 13, color: 'white', fontSize: 16, padding: '10px 13px', resize: 'vertical', outline: 'none', fontFamily: 'Inter,sans-serif', lineHeight: 1.55, boxSizing: 'border-box' }} />
                                <div style={{ display: 'flex', gap: 10 }}>
                                    <button onClick={() => { setMsgOpen(null); setMsgText(''); }} style={{ flex: 1, padding: '10px', borderRadius: 12, background: 'rgba(255,255,255,.05)', color: 'rgba(255,255,255,.45)', border: '1px solid rgba(255,255,255,.08)', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>Cancel</button>
                                    <button
                                        onClick={async () => {
                                            const to = msgOpen?.name; const company = msgOpen?.company; const text = msgText.trim();
                                            if (!text) return;
                                            setMsgOpen(null); setMsgText('');
                                            try {
                                                const res = await fetch('/api/vc/message', {
                                                    method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
                                                    body: JSON.stringify({ startup: company, recipient_name: to, message: text, vc_firm: myProfile?.firm_name ?? VC_PROFILE.firm, vc_name: myProfile?.partner_name ?? user?.name ?? 'A verified investor' }),
                                                });
                                                const d = await res.json().catch(() => ({} as any));
                                                if (res.ok && d.delivered) showToast(`Message emailed to ${to}`, '#06b6d4');
                                                else if (res.ok) showToast(`Sent — ${to} hasn't linked an email yet`, '#f59e0b');
                                                else showToast((d as any)?.error || 'Could not send message', '#f87171');
                                            } catch { showToast('Network error — message not sent', '#f87171'); }
                                        }}
                                        disabled={!msgText.trim()}
                                        className="sc-btn"
                                        style={{ flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '10px', borderRadius: 12, background: 'linear-gradient(90deg,#0e7490,#06b6d4)', color: 'white', border: 'none', cursor: msgText.trim() ? 'pointer' : 'not-allowed', opacity: msgText.trim() ? 1 : 0.5, fontSize: 13, fontWeight: 700, boxShadow: '0 4px 18px rgba(6,182,212,.4)' }}>
                                        <Send style={{ width: 13, height: 13 }} />Send Message
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* ══ MODAL: Schedule Meeting ══ */}
            {
                scheduleOpen && (
                    <div onClick={() => setScheduleOpen(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.82)', backdropFilter: 'blur(14px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }}>
                        <div onClick={e => e.stopPropagation()} className="hub-modal-wrap" style={{ background: '#07070f', border: '1px solid rgba(139,92,246,.22)', borderTop: '2px solid rgba(139,92,246,.6)', borderRadius: 22, width: '100%', maxWidth: 420, boxShadow: '0 32px 90px rgba(0,0,0,.85)' }}>
                            <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,.07)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <div style={{ width: 36, height: 36, borderRadius: 11, background: 'linear-gradient(135deg,#6d28d9,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 14px rgba(139,92,246,.35)' }}><CalendarDays style={{ width: 16, height: 16, color: 'white' }} /></div>
                                    <div>
                                        <p style={{ fontSize: 13, fontWeight: 700, color: 'white', margin: 0 }}>Schedule with {scheduleOpen.name}</p>
                                        <p style={{ fontSize: 11, color: 'rgba(255,255,255,.35)', margin: 0 }}>{scheduleOpen.role} · {scheduleOpen.company}</p>
                                    </div>
                                </div>
                                <button onClick={() => setScheduleOpen(null)} aria-label="Close" style={{ background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 8, cursor: 'pointer', color: 'rgba(255,255,255,.5)', padding: 6, display: 'flex' }}><X style={{ width: 14, height: 14 }} /></button>
                            </div>
                            <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                    <div>
                                        <label style={{ fontSize: 10, color: 'rgba(255,255,255,.32)', textTransform: 'uppercase', letterSpacing: '.09em', display: 'block', marginBottom: 6 }}>Date</label>
                                        <input type="date" value={scheduleForm.date} onChange={e => setScheduleForm(p => ({ ...p, date: e.target.value }))} style={{ width: '100%', padding: '10px 12px', borderRadius: 11, background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.1)', color: 'white', fontSize: 13, outline: 'none', boxSizing: 'border-box', colorScheme: 'dark' }} />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: 10, color: 'rgba(255,255,255,.32)', textTransform: 'uppercase', letterSpacing: '.09em', display: 'block', marginBottom: 6 }}>Time</label>
                                        <input type="time" value={scheduleForm.time} onChange={e => setScheduleForm(p => ({ ...p, time: e.target.value }))} style={{ width: '100%', padding: '10px 12px', borderRadius: 11, background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.1)', color: 'white', fontSize: 13, outline: 'none', boxSizing: 'border-box', colorScheme: 'dark' }} />
                                    </div>
                                </div>
                                <div>
                                    <label style={{ fontSize: 10, color: 'rgba(255,255,255,.32)', textTransform: 'uppercase', letterSpacing: '.09em', display: 'block', marginBottom: 6 }}>Agenda</label>
                                    <textarea value={scheduleForm.topic} onChange={e => setScheduleForm(p => ({ ...p, topic: e.target.value }))} placeholder="What's this meeting about?" style={{ width: '100%', minHeight: 80, background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 13, color: 'white', fontSize: 14, padding: '10px 13px', resize: 'vertical', outline: 'none', fontFamily: 'Inter,sans-serif', lineHeight: 1.55, boxSizing: 'border-box' }} />
                                </div>
                                <div style={{ display: 'flex', gap: 10 }}>
                                    <button onClick={() => setScheduleOpen(null)} style={{ flex: 1, padding: '10px', borderRadius: 12, background: 'rgba(255,255,255,.05)', color: 'rgba(255,255,255,.45)', border: '1px solid rgba(255,255,255,.08)', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>Cancel</button>
                                    <button
                                        onClick={() => {
                                            const to = scheduleOpen?.name;
                                            const when = new Date(`${scheduleForm.date}T${scheduleForm.time || '00:00'}`);
                                            const whenLabel = !isNaN(when.getTime())
                                                ? when.toLocaleString('en', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                                                : '';
                                            setScheduleOpen(null);
                                            showToast(`Meeting scheduled with ${to}${whenLabel ? ` · ${whenLabel}` : ''}`, '#8b5cf6');
                                        }}
                                        disabled={!scheduleForm.date || !scheduleForm.time}
                                        className="sc-btn"
                                        style={{ flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '10px', borderRadius: 12, background: 'linear-gradient(90deg,#6d28d9,#8b5cf6)', color: 'white', border: 'none', cursor: (scheduleForm.date && scheduleForm.time) ? 'pointer' : 'not-allowed', opacity: (scheduleForm.date && scheduleForm.time) ? 1 : 0.5, fontSize: 13, fontWeight: 700, boxShadow: '0 4px 18px rgba(139,92,246,.4)' }}>
                                        <CalendarDays style={{ width: 13, height: 13 }} />Confirm Meeting
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* ══ MODAL: Revoke Shortlist (reason required → admin notified) ══ */}
            {
                revokeTarget && (
                    <div onClick={() => { setRevokeTarget(null); setRevokeReason(''); }} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.82)', backdropFilter: 'blur(14px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }}>
                        <div onClick={e => e.stopPropagation()} className="hub-modal-wrap" style={{ background: '#07070f', border: '1px solid rgba(245,158,11,.25)', borderTop: '2px solid rgba(245,158,11,.6)', borderRadius: 22, width: '100%', maxWidth: 420, boxShadow: '0 32px 90px rgba(0,0,0,.85)' }}>
                            <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,.07)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <div style={{ width: 36, height: 36, borderRadius: 11, background: 'linear-gradient(135deg,#b45309,#f59e0b)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 14px rgba(245,158,11,.35)' }}><X style={{ width: 16, height: 16, color: 'white' }} /></div>
                                    <div>
                                        <p style={{ fontSize: 13, fontWeight: 700, color: 'white', margin: 0 }}>Remove from Shortlist</p>
                                        <p style={{ fontSize: 11, color: 'rgba(255,255,255,.35)', margin: 0 }}>{revokeTarget.name} · {revokeTarget.industry}</p>
                                    </div>
                                </div>
                                <button onClick={() => { setRevokeTarget(null); setRevokeReason(''); }} aria-label="Close" style={{ background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 8, cursor: 'pointer', color: 'rgba(255,255,255,.5)', padding: 6, display: 'flex' }}><X style={{ width: 14, height: 14 }} /></button>
                            </div>
                            <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                                <div>
                                    <label style={{ fontSize: 10, color: 'rgba(255,255,255,.32)', textTransform: 'uppercase', letterSpacing: '.09em', display: 'block', marginBottom: 6 }}>Reason for revoking *</label>
                                    <textarea autoFocus value={revokeReason} onChange={e => setRevokeReason(e.target.value)} placeholder="Why are you removing this startup from your shortlist?" style={{ width: '100%', minHeight: 96, background: 'rgba(255,255,255,.04)', border: `1px solid ${revokeReason.trim() ? 'rgba(255,255,255,.1)' : 'rgba(245,158,11,.3)'}`, borderRadius: 13, color: 'white', fontSize: 14, padding: '10px 13px', resize: 'vertical', outline: 'none', fontFamily: 'Inter,sans-serif', lineHeight: 1.55, boxSizing: 'border-box' }} />
                                </div>
                                <p style={{ fontSize: 10, color: 'rgba(255,255,255,.3)', margin: 0, lineHeight: 1.5 }}>This reason is sent to the <strong style={{ color: 'rgba(255,255,255,.55)' }}>Sanyog admin</strong> along with the removal.</p>
                                <div style={{ display: 'flex', gap: 10 }}>
                                    <button onClick={() => { setRevokeTarget(null); setRevokeReason(''); }} style={{ flex: 1, padding: '10px', borderRadius: 12, background: 'rgba(255,255,255,.05)', color: 'rgba(255,255,255,.45)', border: '1px solid rgba(255,255,255,.08)', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>Cancel</button>
                                    <button
                                        onClick={confirmRevoke}
                                        disabled={!revokeReason.trim()}
                                        className="sc-btn"
                                        style={{ flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '10px', borderRadius: 12, background: 'linear-gradient(90deg,#b45309,#f59e0b)', color: 'white', border: 'none', cursor: revokeReason.trim() ? 'pointer' : 'not-allowed', opacity: revokeReason.trim() ? 1 : 0.5, fontSize: 13, fontWeight: 700, boxShadow: '0 4px 18px rgba(245,158,11,.4)' }}>
                                        <X style={{ width: 13, height: 13 }} />Confirm Removal
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* ══ MODAL: Remove Investor — reason-gated confirmation ══ */}
            {
                vcRemoveTarget && (
                    <div onClick={() => setVcRemoveTarget(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.82)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 16 }}>
                        <div onClick={e => e.stopPropagation()} className="hub-modal-wrap" style={{ background: '#08080f', border: '1px solid rgba(248,113,113,0.3)', borderTop: '2px solid #f87171', borderRadius: 20, width: '100%', maxWidth: 440, padding: 28 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                                <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(248,113,113,0.15)', border: '1px solid rgba(248,113,113,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    <Trash2 style={{ width: 18, height: 18, color: '#f87171' }} />
                                </div>
                                <div style={{ minWidth: 0 }}>
                                    <p style={{ fontSize: 16, fontWeight: 700, color: 'white', margin: 0 }}>Remove “{vcRemoveTarget.firm_name}”?</p>
                                    <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', margin: '2px 0 0' }}>This removes the department from the Department Network.</p>
                                </div>
                            </div>
                            <p style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.5)', lineHeight: 1.6, margin: '0 0 14px' }}>
                                Please tell us why this listing is being removed. Re-registering later will need fresh admin approval.
                            </p>
                            <textarea
                                autoFocus
                                value={vcRemoveReason}
                                onChange={e => { setVcRemoveReason(e.target.value); if (vcRemoveError) setVcRemoveError(''); }}
                                placeholder="Reason for removal (required) — e.g. no longer investing, duplicate entry…"
                                rows={3}
                                style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical', background: 'rgba(255,255,255,0.04)', border: `1px solid ${vcRemoveError ? 'rgba(248,113,113,0.6)' : 'rgba(255,255,255,0.12)'}`, borderRadius: 12, padding: '10px 12px', color: 'white', fontSize: 13, outline: 'none', fontFamily: 'inherit', lineHeight: 1.5 }}
                            />
                            {vcRemoveError && <p style={{ fontSize: 11, color: '#f87171', margin: '8px 0 0' }}>{vcRemoveError}</p>}
                            <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
                                <button
                                    onClick={() => setVcRemoveTarget(null)}
                                    style={{ flex: 1, padding: '10px', borderRadius: 999, fontSize: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)', cursor: 'pointer' }}>
                                    Keep it
                                </button>
                                <button
                                    onClick={() => {
                                        const reason = vcRemoveReason.trim();
                                        if (reason.length < 4) { setVcRemoveError('Please add a short reason before removing.'); return; }
                                        performRemoveVC(vcRemoveTarget, reason);
                                        setVcRemoveTarget(null);
                                        setVcRemoveReason('');
                                    }}
                                    style={{ flex: 2, padding: '10px', borderRadius: 999, fontSize: 13, fontWeight: 700, background: 'linear-gradient(90deg,#dc2626,#f87171)', color: 'white', border: 'none', cursor: 'pointer', boxShadow: '0 4px 18px rgba(220,38,38,0.35)' }}>
                                    Remove Investor
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* ══ MODAL: VC Registration ══ */}
            {
                registerOpen && (
                    <div onMouseDown={e => { if (e.target === e.currentTarget) setRegisterOpen(false); }} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.82)', backdropFilter: 'blur(14px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }}>
                        <div onMouseDown={e => e.stopPropagation()} className="notif-scroll hub-modal-wrap" style={{ background: '#07070f', border: '1px solid rgba(139,92,246,.22)', borderTop: '2px solid rgba(139,92,246,.6)', borderRadius: 22, width: '100%', maxWidth: 480, maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 32px 90px rgba(0,0,0,.85)' }}>
                            <div style={{ padding: '18px 22px', borderBottom: '1px solid rgba(255,255,255,.07)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: '#07070f', zIndex: 2 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <div style={{ width: 30, height: 30, borderRadius: 9, background: 'rgba(139,92,246,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 14px rgba(139,92,246,.5)' }}>
                                        <Telescope style={{ width: 13, height: 13, color: '#a78bfa' }} />
                                    </div>
                                    <div>
                                        <p style={{ fontSize: 14, fontWeight: 700, color: 'white', margin: 0 }}>{myProfile ? 'Edit Your Department' : 'Register Your Department'}</p>
                                        <p style={{ fontSize: 10, color: 'rgba(255,255,255,.32)', margin: '1px 0 0' }}>{myProfile ? 'Update your investor profile & mandate' : 'Set up your investor profile & mandate password'}</p>
                                    </div>
                                </div>
                                <button onClick={() => setRegisterOpen(false)} aria-label="Close" style={{ background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 8, cursor: 'pointer', color: 'rgba(255,255,255,.5)', padding: 6, display: 'flex' }}><X style={{ width: 14, height: 14 }} /></button>
                            </div>
                            <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                                {user?.email && (
                                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,.4)', padding: '8px 12px', borderRadius: 10, background: 'rgba(139,92,246,.07)', border: '1px solid rgba(139,92,246,.18)' }}>
                                        Registering under <span style={{ color: '#c4b5fd', fontWeight: 700 }}>{user.email}</span>
                                    </div>
                                )}
                                {([
                                    ['firm_name', 'Firm Name *', 'e.g. Nexus Ventures', 'text'],
                                    ['partner_name', 'Partner / Your Name *', 'e.g. Aryan Mehta', 'text'],
                                    ['investment_thesis', 'Investment Thesis', 'One line on what you back & why', 'area'],
                                    ['sectors', 'Target Sectors', 'e.g. SaaS, FinTech, DeepTech', 'text'],
                                    ['stage_pref', 'Stage Preference', 'e.g. Seed, Series A', 'text'],
                                ] as [string, string, string, string][]).map(([key, label, ph, kind]) => (
                                    <div key={key}>
                                        <label style={{ fontSize: 10, color: 'rgba(255,255,255,.32)', textTransform: 'uppercase', letterSpacing: '.09em', display: 'block', marginBottom: 6 }}>{label}</label>
                                        {kind === 'area' ? (
                                            <textarea value={mandate[key] ?? ''} onChange={e => setMandate(p => ({ ...p, [key]: e.target.value }))} rows={2} placeholder={ph} style={{ width: '100%', padding: '10px 13px', borderRadius: 11, background: 'rgba(255,255,255,.04)', border: `1px solid ${mandateErr[key] ? '#f87171' : 'rgba(255,255,255,.1)'}`, color: 'white', fontSize: 12, outline: 'none', boxSizing: 'border-box', resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5 }} />
                                        ) : (
                                            <input value={mandate[key] ?? ''} onChange={e => setMandate(p => ({ ...p, [key]: e.target.value }))} placeholder={ph} style={{ width: '100%', padding: '10px 13px', borderRadius: 11, background: 'rgba(255,255,255,.04)', border: `1px solid ${mandateErr[key] ? '#f87171' : 'rgba(255,255,255,.1)'}`, color: 'white', fontSize: 12, outline: 'none', boxSizing: 'border-box' }} />
                                        )}
                                    </div>
                                ))}
                                {/* Check size range */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                    <div>
                                        <label style={{ fontSize: 10, color: 'rgba(255,255,255,.32)', textTransform: 'uppercase', letterSpacing: '.09em', display: 'block', marginBottom: 6 }}>Min Cheque (₹)</label>
                                        <input type="number" value={mandate.check_min ?? ''} onChange={e => setMandate(p => ({ ...p, check_min: e.target.value }))} placeholder="5000000" style={{ width: '100%', padding: '10px 13px', borderRadius: 11, background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.1)', color: 'white', fontSize: 12, outline: 'none', boxSizing: 'border-box' }} />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: 10, color: 'rgba(255,255,255,.32)', textTransform: 'uppercase', letterSpacing: '.09em', display: 'block', marginBottom: 6 }}>Max Cheque (₹)</label>
                                        <input type="number" value={mandate.check_max ?? ''} onChange={e => setMandate(p => ({ ...p, check_max: e.target.value }))} placeholder="50000000" style={{ width: '100%', padding: '10px 13px', borderRadius: 11, background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.1)', color: 'white', fontSize: 12, outline: 'none', boxSizing: 'border-box' }} />
                                    </div>
                                </div>
                                {/* Password */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                    <div>
                                        <label style={{ fontSize: 10, color: 'rgba(255,255,255,.32)', textTransform: 'uppercase', letterSpacing: '.09em', display: 'block', marginBottom: 6 }}>{myProfile ? 'Mandate Password' : 'Mandate Password *'}</label>
                                        <input type="password" value={mandate.password ?? ''} onChange={e => setMandate(p => ({ ...p, password: e.target.value }))} placeholder={myProfile ? 'Leave blank to keep current' : '6+ characters'} style={{ width: '100%', padding: '10px 13px', borderRadius: 11, background: 'rgba(255,255,255,.04)', border: `1px solid ${mandateErr.password ? '#f87171' : 'rgba(255,255,255,.1)'}`, color: 'white', fontSize: 12, outline: 'none', boxSizing: 'border-box' }} />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: 10, color: 'rgba(255,255,255,.32)', textTransform: 'uppercase', letterSpacing: '.09em', display: 'block', marginBottom: 6 }}>{myProfile ? 'Confirm Password' : 'Confirm Password *'}</label>
                                        <input type="password" value={mandate.password2 ?? ''} onChange={e => setMandate(p => ({ ...p, password2: e.target.value }))} placeholder="Repeat password" style={{ width: '100%', padding: '10px 13px', borderRadius: 11, background: 'rgba(255,255,255,.04)', border: `1px solid ${mandateErr.password2 ? '#f87171' : 'rgba(255,255,255,.1)'}`, color: 'white', fontSize: 12, outline: 'none', boxSizing: 'border-box' }} />
                                    </div>
                                </div>
                                {(mandateErr.firm_name || mandateErr.partner_name || mandateErr.password || mandateErr.password2 || mandateErr.submit) && (
                                    <div style={{ padding: '9px 12px', borderRadius: 10, background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.32)' }}>
                                        <span style={{ fontSize: 11, color: '#f87171', fontWeight: 600 }}>{mandateErr.firm_name || mandateErr.partner_name || mandateErr.password || mandateErr.password2 || mandateErr.submit}</span>
                                    </div>
                                )}
                                <p style={{ fontSize: 10, color: 'rgba(255,255,255,.28)', margin: 0, lineHeight: 1.5 }}>{myProfile?.status === 'approved'
                                    ? <>Your department is live in the public <strong style={{ color: 'rgba(255,255,255,.55)' }}>Department Network</strong>. Saving keeps it published with your latest details.</>
                                    : <>Your profile is submitted for verification. Once the Sanyog team approves it, your department goes live in the public <strong style={{ color: 'rgba(255,255,255,.55)' }}>Department Network</strong>.</>}</p>
                                <button
                                    disabled={mandateSubmitting}
                                    onClick={async () => {
                                        const errs: Record<string, string> = {};
                                        const editing = !!myProfile;
                                        const pw = mandate.password || '';
                                        if (!(mandate.firm_name || '').trim()) errs.firm_name = 'Firm name is required';
                                        else if (!(mandate.partner_name || '').trim()) errs.partner_name = 'Partner name is required';
                                        // Fresh registration needs a password. When editing, a blank password
                                        // means "keep current" — only validate a newly typed one.
                                        else if (!editing && pw.length < 6) errs.password = 'Password must be at least 6 characters';
                                        else if (editing && pw.length > 0 && pw.length < 6) errs.password = 'Password must be at least 6 characters';
                                        else if (pw.length > 0 && pw !== (mandate.password2 || '')) errs.password2 = 'Passwords do not match';
                                        setMandateErr(errs);
                                        if (Object.keys(errs).length > 0) return;
                                        setMandateSubmitting(true);
                                        try {
                                            const res = await fetch('/api/vc/mandate', {
                                                method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
                                                body: JSON.stringify({
                                                    firm_name: mandate.firm_name, partner_name: mandate.partner_name,
                                                    investment_thesis: mandate.investment_thesis || null,
                                                    sectors: mandate.sectors || null, stage_pref: mandate.stage_pref || null,
                                                    check_min: mandate.check_min ? Number(mandate.check_min) : null,
                                                    check_max: mandate.check_max ? Number(mandate.check_max) : null,
                                                    password: pw || undefined,
                                                }),
                                            });
                                            const data = await res.json().catch(() => ({} as any));
                                            if (!res.ok) { setMandateSubmitting(false); setMandateErr({ submit: (data as any)?.error || 'Could not save your mandate. Please try again.' }); return; }
                                        } catch { setMandateSubmitting(false); setMandateErr({ submit: 'Network error — please try again.' }); return; }
                                        setMandateSubmitting(false);
                                        const firm = mandate.firm_name;
                                        setRegisterOpen(false); setMandate({}); setMandateErr({});
                                        setHasMandate(true);
                                        showToast(editing ? `Mandate updated — ${firm} saved` : `Mandate submitted — ${firm} is pending verification`, '#a78bfa');
                                        loadMyMandate();
                                        loadVCs();
                                    }}
                                    className="sc-btn"
                                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '13px', borderRadius: 13, background: 'linear-gradient(90deg,#7c3aed,#0ea5e9)', color: 'white', border: 'none', cursor: mandateSubmitting ? 'wait' : 'pointer', fontSize: 13, fontWeight: 700, boxShadow: '0 6px 24px rgba(124,58,237,.45)', marginTop: 2 }}>
                                    <Telescope style={{ width: 14, height: 14 }} />{mandateSubmitting ? 'Submitting…' : (myProfile ? 'Save Changes →' : 'Register My Fund →')}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* ══ MODAL: Document Viewer ══ */}
            {
                docOpen && (() => {
                    const docTypeColor: Record<string, string> = { Deck: '#8b5cf6', Sheet: '#10b981', Doc: '#06b6d4', Bundle: '#f59e0b', Video: '#f472b6' };
                    const tc = docTypeColor[docOpen.type] || '#8b5cf6';
                    const url: string = docOpen.file_url || '';
                    const ext = url.split('?')[0].split('.').pop()?.toLowerCase() || '';
                    const isImage = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext);
                    const isVideo = ['mp4', 'webm', 'mov'].includes(ext) || docOpen.type === 'Video';
                    const isPdf = ext === 'pdf' || (!isImage && !isVideo);
                    const founder = startups.find(s => s.name === docOpen.startup)?.founder || '—';
                    // Demo slides for seed corporate decks that have no uploaded file yet
                    const demoSlides = [
                        { t: 'Problem', b: `The market lacks a reliable way to solve ${docOpen.startup}'s core customer pain at scale.` },
                        { t: 'Solution', b: `${docOpen.startup} delivers a focused, defensible product that wins on speed and trust.` },
                        { t: 'Traction', b: 'Strong early adoption with accelerating month-over-month growth and healthy retention.' },
                        { t: 'The Ask', b: 'Raising this round to expand GTM, deepen the moat, and capture the category.' },
                    ];
                    return (
                        <div onClick={() => setDocOpen(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.82)', backdropFilter: 'blur(14px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }}>
                            <div onClick={e => e.stopPropagation()} className="hub-modal-wrap" style={{ background: '#07070f', border: '1px solid rgba(255,255,255,.1)', borderTop: `2px solid ${tc}`, borderRadius: 22, width: '100%', maxWidth: 620, maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 32px 90px rgba(0,0,0,.85)' }}>
                                <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,.07)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, position: 'sticky', top: 0, background: '#07070f', zIndex: 2 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                                        <div style={{ width: 36, height: 36, borderRadius: 11, background: `${tc}22`, border: `1px solid ${tc}45`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                            <FileText style={{ width: 16, height: 16, color: tc }} />
                                        </div>
                                        <div style={{ minWidth: 0 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                                                <p style={{ fontSize: 13, fontWeight: 700, color: 'white', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{docOpen.name}</p>
                                                {docOpen.corporate && (
                                                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '2px 7px', borderRadius: 999, background: 'rgba(6,182,212,.12)', border: '1px solid rgba(6,182,212,.3)', flexShrink: 0 }}>
                                                        <Shield style={{ width: 8, height: 8, color: '#06b6d4' }} />
                                                        <span style={{ fontSize: 8, fontWeight: 800, color: '#06b6d4', letterSpacing: '.05em' }}>DEPT ONLY</span>
                                                    </span>
                                                )}
                                            </div>
                                            <p style={{ fontSize: 11, color: 'rgba(255,255,255,.35)', margin: 0 }}>{docOpen.type} · {docOpen.size} · {docOpen.startup}</p>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                                        {url && (
                                            <a href={url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 999, background: `${tc}18`, border: `1px solid ${tc}40`, color: tc, fontSize: 11, fontWeight: 700, textDecoration: 'none' }}>
                                                <Globe style={{ width: 12, height: 12 }} />Open
                                            </a>
                                        )}
                                        <button onClick={() => setDocOpen(null)} aria-label="Close" style={{ background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 8, cursor: 'pointer', color: 'rgba(255,255,255,.5)', padding: 6, display: 'flex' }}><X style={{ width: 14, height: 14 }} /></button>
                                    </div>
                                </div>
                                <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
                                    {/* ── document credentials ── */}
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8 }}>
                                        {[
                                            { label: 'Startup', val: docOpen.startup, col: '#8b5cf6' },
                                            { label: 'Founder', val: founder, col: '#06b6d4' },
                                            { label: 'Access', val: docOpen.corporate ? 'Verified investors' : 'Public', col: '#06b6d4' },
                                            { label: 'Status', val: docOpen.status || 'Final', col: '#10b981' },
                                        ].map(c => (
                                            <div key={c.label} style={{ padding: '8px 11px', borderRadius: 10, background: `${c.col}0d`, border: `1px solid ${c.col}22` }}>
                                                <p style={{ fontSize: 8, color: 'rgba(255,255,255,.32)', margin: 0, textTransform: 'uppercase', letterSpacing: '.07em', fontWeight: 700 }}>{c.label}</p>
                                                <p style={{ fontSize: 11.5, fontWeight: 700, color: 'white', margin: '3px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.val}</p>
                                            </div>
                                        ))}
                                    </div>

                                    {/* ── live file preview, or demo deck preview ── */}
                                    {url ? (
                                        <div style={{ height: 420, borderRadius: 14, border: `1px solid ${tc}28`, overflow: 'hidden', background: '#05050d' }}>
                                            {isImage ? (
                                                <img src={url} alt={docOpen.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                            ) : isVideo ? (
                                                <video src={url} controls style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#000' }} />
                                            ) : (
                                                <iframe title={docOpen.name} src={`${url}#toolbar=1&navpanes=0`} style={{ width: '100%', height: '100%', border: 'none', display: 'block' }} />
                                            )}
                                        </div>
                                    ) : (
                                        <div style={{ borderRadius: 14, border: `1px solid ${tc}28`, background: `linear-gradient(160deg,${tc}10,rgba(5,5,9,.92))`, padding: 18 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                                                <FileText style={{ width: 14, height: 14, color: tc }} />
                                                <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,.6)', margin: 0 }}>Deck preview · added {docOpen.date}</p>
                                            </div>
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10 }}>
                                                {demoSlides.map((s, i) => (
                                                    <div key={i} style={{ borderRadius: 12, border: `1px solid ${tc}22`, background: 'rgba(255,255,255,.025)', padding: 13, minHeight: 96, position: 'relative', overflow: 'hidden' }}>
                                                        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg,transparent,${tc}70,transparent)` }} />
                                                        <span style={{ fontSize: 8, fontWeight: 800, color: tc, background: `${tc}18`, border: `1px solid ${tc}33`, padding: '2px 7px', borderRadius: 999 }}>Slide {i + 1}</span>
                                                        <p style={{ fontSize: 12, fontWeight: 800, color: 'white', margin: '8px 0 4px' }}>{s.t}</p>
                                                        <p style={{ fontSize: 10, color: 'rgba(255,255,255,.5)', margin: 0, lineHeight: 1.45 }}>{s.b}</p>
                                                    </div>
                                                ))}
                                            </div>
                                            <p style={{ fontSize: 9.5, color: 'rgba(255,255,255,.3)', margin: '13px 0 0', textAlign: 'center' }}>Demo preview — the live deck renders here once the founder uploads it from the Brand Vault.</p>
                                        </div>
                                    )}

                                    <button onClick={() => requireMandate(() => { if (url) { window.open(url, '_blank', 'noopener'); } else { showToast(`Downloading ${docOpen.name}…`, tc); } logAudit('Downloaded', docOpen); })} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px 16px', borderRadius: 10, background: `${tc}20`, border: `1px solid ${tc}45`, color: tc, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                                        <Download style={{ width: 12, height: 12 }} />{url ? 'Download / Open' : 'Download'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })()
            }

            {/* ══ MODAL: Event Registration (VC reserves a seat) ══ */}
            {
                regEvent && (() => {
                    const typeColors: Record<string, string> = { 'Demo Day': '#8b5cf6', Pitching: '#a78bfa', Workshop: '#06b6d4', Hackathon: '#f59e0b', Mentorship: '#10b981' };
                    const tc = typeColors[regEvent.type] || '#06b6d4';
                    return (
                        <div onClick={() => setRegEvent(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.82)', backdropFilter: 'blur(14px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }}>
                            <div onClick={e => e.stopPropagation()} className="hub-modal-wrap" style={{ background: '#07070f', border: '1px solid rgba(255,255,255,.1)', borderTop: `2px solid ${tc}`, borderRadius: 22, width: '100%', maxWidth: 420, boxShadow: '0 32px 90px rgba(0,0,0,.85)' }}>
                                <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,.07)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                        <div style={{ width: 30, height: 30, borderRadius: 9, background: `${tc}22`, border: `1px solid ${tc}45`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <CalendarDays style={{ width: 14, height: 14, color: tc }} />
                                        </div>
                                        <p style={{ fontSize: 14, fontWeight: 700, color: 'white', margin: 0 }}>Reserve Your Seat</p>
                                    </div>
                                    <button onClick={() => setRegEvent(null)} aria-label="Close" style={{ background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 8, cursor: 'pointer', color: 'rgba(255,255,255,.5)', padding: 6, display: 'flex' }}><X style={{ width: 14, height: 14 }} /></button>
                                </div>
                                <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                                    {/* event details */}
                                    <div style={{ background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.07)', borderRadius: 13, padding: 14 }}>
                                        <p style={{ fontSize: 13, fontWeight: 700, color: 'white', margin: 0 }}>{regEvent.title}</p>
                                        <p style={{ fontSize: 11, color: 'rgba(255,255,255,.4)', margin: '5px 0 0' }}>{regEvent.date} · {regEvent.time}</p>
                                        <p style={{ fontSize: 11, color: 'rgba(255,255,255,.3)', margin: '2px 0 0' }}>{regEvent.location}</p>
                                    </div>
                                    {/* attending as */}
                                    <div style={{ background: `${tc}0d`, border: `1px solid ${tc}28`, borderRadius: 13, padding: 14, display: 'flex', flexDirection: 'column', gap: 9 }}>
                                        <p style={{ fontSize: 10, color: tc, textTransform: 'uppercase', letterSpacing: '.09em', fontWeight: 800, margin: 0 }}>Attending as</p>
                                        <input
                                            value={regName}
                                            onChange={e => setRegName(e.target.value)}
                                            placeholder={VC_PROFILE.name}
                                            style={{ width: '100%', background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 10, padding: '9px 12px', fontSize: 13, color: 'white', outline: 'none', boxSizing: 'border-box' }}
                                        />
                                        <p style={{ fontSize: 10, color: 'rgba(255,255,255,.3)', margin: 0 }}>Representing <span style={{ color: 'rgba(255,255,255,.6)', fontWeight: 700 }}>{VC_PROFILE.firm}</span> · acting on behalf of the department</p>
                                    </div>
                                    <p style={{ fontSize: 10, color: 'rgba(255,255,255,.25)', textAlign: 'center', margin: 0 }}>A calendar invite will be sent to the organiser team</p>
                                    <button
                                        onClick={() => { if (!regName.trim()) return; const id = regEvent.id, title = regEvent.title; setRegisteredEvents(prev => prev.includes(id) ? prev : [...prev, id]); setRegEvent(null); showToast(`Seat reserved — ${title}`, tc); }}
                                        disabled={!regName.trim()}
                                        className="sc-btn"
                                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '11px', borderRadius: 12, background: `linear-gradient(90deg,${tc},${tc}80)`, color: 'white', border: 'none', cursor: regName.trim() ? 'pointer' : 'not-allowed', opacity: regName.trim() ? 1 : 0.5, fontSize: 13, fontWeight: 700, boxShadow: `0 4px 18px ${tc}45` }}>
                                        <CheckCircle style={{ width: 14, height: 14 }} />Confirm Registration →
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })()
            }

            {/* ══ MODAL: Add Event (organiser submission → admin approval) ══ */}
            {
                addEventOpen && (
                    <div onClick={resetAddEvent} style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(0,0,0,.85)', backdropFilter: 'blur(16px)' }}>
                        <div onClick={e => e.stopPropagation()} className="notif-scroll" style={{ background: '#09090f', border: '1px solid rgba(139,92,246,.3)', borderTop: '2px solid #8b5cf6', borderRadius: 22, width: '100%', maxWidth: 560, maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 0 80px rgba(139,92,246,.18), 0 40px 80px rgba(0,0,0,.8)' }}>
                            {/* Header */}
                            <div style={{ padding: '22px 26px 16px', borderBottom: '1px solid rgba(255,255,255,.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, background: '#09090f', zIndex: 2 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <div style={{ width: 36, height: 36, borderRadius: 11, background: 'rgba(139,92,246,.15)', border: '1px solid rgba(139,92,246,.35)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <CalendarDays style={{ width: 16, height: 16, color: '#a78bfa' }} />
                                    </div>
                                    <div>
                                        <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#fff' }}>Submit an Event</p>
                                        <p style={{ margin: '1px 0 0', fontSize: 10, color: 'rgba(255,255,255,.3)' }}>{addEventDone ? 'Submitted for review' : `Step ${addEventStep} of 2 — ${addEventStep === 1 ? 'Event Details' : 'Organiser Details'}`}</p>
                                    </div>
                                </div>
                                <button onClick={resetAddEvent} aria-label="Close" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,.3)', padding: 4 }}><X style={{ width: 16, height: 16 }} /></button>
                            </div>

                            {addEventDone ? (
                                /* Success */
                                <div style={{ padding: '48px 26px', textAlign: 'center' }}>
                                    <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(16,185,129,.15)', border: '1px solid rgba(16,185,129,.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px' }}>
                                        <CheckCircle style={{ width: 28, height: 28, color: '#34d399' }} />
                                    </div>
                                    <p style={{ margin: '0 0 8px', fontSize: 17, fontWeight: 800, color: '#fff' }}>Event Submitted!</p>
                                    <p style={{ margin: '0 0 28px', fontSize: 12, color: 'rgba(255,255,255,.35)', lineHeight: 1.6 }}>
                                        <strong style={{ color: '#a78bfa' }}>{addEventForm.title}</strong> has been sent to the Sanyog admin team for review. Once approved, it goes live in Demo Days for all founders &amp; investors.
                                    </p>
                                    <button onClick={resetAddEvent} style={{ padding: '10px 32px', borderRadius: 999, fontSize: 12, fontWeight: 700, background: 'linear-gradient(90deg,#7c3aed,#0ea5e9)', color: 'white', border: 'none', cursor: 'pointer' }}>Done</button>
                                </div>
                            ) : addEventStep === 1 ? (
                                /* Step 1: Event details */
                                <div style={{ padding: '24px 26px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,.35)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 6 }}>Event Title *</label>
                                        <input value={addEventForm.title} onChange={e => setAddEventForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. AI Founders Roundtable 2026" style={{ width: '100%', background: 'rgba(255,255,255,.04)', border: `1px solid ${addEventErrors.title ? '#f87171' : 'rgba(255,255,255,.1)'}`, borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#fff', outline: 'none', boxSizing: 'border-box' }} />
                                        {addEventErrors.title && <p style={{ margin: '4px 0 0', fontSize: 10, color: '#f87171' }}>{addEventErrors.title}</p>}
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                        <div>
                                            <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,.35)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 6 }}>Event Type *</label>
                                            <select value={addEventForm.type} onChange={e => setAddEventForm(f => ({ ...f, type: e.target.value }))} style={{ width: '100%', background: '#12121f', border: '1px solid rgba(255,255,255,.1)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#fff', outline: 'none', cursor: 'pointer' }}>
                                                {['Demo Day', 'Pitching', 'Workshop', 'Mentorship', 'Hackathon', 'Networking', 'Panel Discussion', 'Other'].map(t => <option key={t} value={t}>{t}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,.35)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 6 }}>Event Date *</label>
                                            <input type="date" value={addEventForm.date} onChange={e => setAddEventForm(f => ({ ...f, date: e.target.value }))} style={{ width: '100%', background: '#12121f', border: `1px solid ${addEventErrors.date ? '#f87171' : 'rgba(255,255,255,.1)'}`, borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#fff', outline: 'none', colorScheme: 'dark', boxSizing: 'border-box' }} />
                                            {addEventErrors.date && <p style={{ margin: '4px 0 0', fontSize: 10, color: '#f87171' }}>{addEventErrors.date}</p>}
                                        </div>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                        <div>
                                            <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,.35)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 6 }}>Time (IST) *</label>
                                            <input type="time" value={addEventForm.time} onChange={e => setAddEventForm(f => ({ ...f, time: e.target.value }))} style={{ width: '100%', background: '#12121f', border: `1px solid ${addEventErrors.time ? '#f87171' : 'rgba(255,255,255,.1)'}`, borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#fff', outline: 'none', colorScheme: 'dark', boxSizing: 'border-box' }} />
                                            {addEventErrors.time && <p style={{ margin: '4px 0 0', fontSize: 10, color: '#f87171' }}>{addEventErrors.time}</p>}
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,.35)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 6 }}>Format</label>
                                            <select value={addEventForm.locationMode} onChange={e => setAddEventForm(f => ({ ...f, locationMode: e.target.value, location: '' }))} style={{ width: '100%', background: '#12121f', border: '1px solid rgba(255,255,255,.1)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#fff', outline: 'none', cursor: 'pointer' }}>
                                                <option value="physical">In-Person</option>
                                                <option value="online">Online · Zoom</option>
                                                <option value="virtual">Virtual</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,.35)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 6 }}>
                                            {addEventForm.locationMode === 'physical' ? 'Venue / Address *' : addEventForm.locationMode === 'online' ? 'Meeting Link' : 'Platform / Link'}
                                        </label>
                                        <input value={addEventForm.location} onChange={e => setAddEventForm(f => ({ ...f, location: e.target.value }))} placeholder={addEventForm.locationMode === 'physical' ? 'e.g. The Leela Ambience, New Delhi' : addEventForm.locationMode === 'online' ? 'https://zoom.us/j/...' : 'e.g. Hopin / Discord / Gather'} style={{ width: '100%', background: 'rgba(255,255,255,.04)', border: `1px solid ${addEventErrors.location ? '#f87171' : 'rgba(255,255,255,.1)'}`, borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#fff', outline: 'none', boxSizing: 'border-box' }} />
                                        {addEventErrors.location && <p style={{ margin: '4px 0 0', fontSize: 10, color: '#f87171' }}>{addEventErrors.location}</p>}
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,.35)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 6 }}>Event Description *</label>
                                        <textarea value={addEventForm.description} onChange={e => setAddEventForm(f => ({ ...f, description: e.target.value }))} rows={4} placeholder="What is this event about? Who should attend? What will they gain?" style={{ width: '100%', background: 'rgba(255,255,255,.04)', border: `1px solid ${addEventErrors.description ? '#f87171' : 'rgba(255,255,255,.1)'}`, borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#fff', outline: 'none', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit', lineHeight: 1.6 }} />
                                        {addEventErrors.description && <p style={{ margin: '4px 0 0', fontSize: 10, color: '#f87171' }}>{addEventErrors.description}</p>}
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                        <div>
                                            <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,.35)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 6 }}>Max Capacity</label>
                                            <input type="number" value={addEventForm.maxCapacity} onChange={e => setAddEventForm(f => ({ ...f, maxCapacity: e.target.value }))} placeholder="e.g. 100" style={{ width: '100%', background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#fff', outline: 'none', boxSizing: 'border-box' }} />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,.35)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 6 }}>Prize / Reward</label>
                                            <input value={addEventForm.prize} onChange={e => setAddEventForm(f => ({ ...f, prize: e.target.value }))} placeholder="e.g. ₹5L prize pool" style={{ width: '100%', background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#fff', outline: 'none', boxSizing: 'border-box' }} />
                                        </div>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                        <div>
                                            <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,.35)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 6 }}>Registration Deadline</label>
                                            <input type="date" value={addEventForm.registrationDeadline} onChange={e => setAddEventForm(f => ({ ...f, registrationDeadline: e.target.value }))} style={{ width: '100%', background: '#12121f', border: '1px solid rgba(255,255,255,.1)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#fff', outline: 'none', colorScheme: 'dark', boxSizing: 'border-box' }} />
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                                            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '10px 14px', background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 10 }}>
                                                <input type="checkbox" checked={addEventForm.applicationRequired} onChange={e => setAddEventForm(f => ({ ...f, applicationRequired: e.target.checked }))} style={{ width: 14, height: 14, accentColor: '#8b5cf6', cursor: 'pointer' }} />
                                                <span style={{ fontSize: 12, color: 'rgba(255,255,255,.5)', fontWeight: 600 }}>Application required</span>
                                            </label>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
                                        <button onClick={resetAddEvent} style={{ flex: 1, padding: '11px', borderRadius: 999, fontSize: 12, fontWeight: 600, background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.1)', color: 'rgba(255,255,255,.4)', cursor: 'pointer' }}>Cancel</button>
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
                                /* Step 2: Organiser details */
                                <div style={{ padding: '24px 26px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                                    <p style={{ margin: '0 0 4px', fontSize: 11, color: 'rgba(255,255,255,.3)', lineHeight: 1.6 }}>Tell us who is organising this event. Used for coordination only — not shown publicly.</p>
                                    <div>
                                        <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,.35)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 6 }}>Organiser / Point of Contact *</label>
                                        <input value={addEventForm.organiserName} onChange={e => setAddEventForm(f => ({ ...f, organiserName: e.target.value }))} placeholder="Full name" style={{ width: '100%', background: 'rgba(255,255,255,.04)', border: `1px solid ${addEventErrors.organiserName ? '#f87171' : 'rgba(255,255,255,.1)'}`, borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#fff', outline: 'none', boxSizing: 'border-box' }} />
                                        {addEventErrors.organiserName && <p style={{ margin: '4px 0 0', fontSize: 10, color: '#f87171' }}>{addEventErrors.organiserName}</p>}
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,.35)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 6 }}>Contact Email *</label>
                                        <input type="email" value={addEventForm.organiserEmail} onChange={e => setAddEventForm(f => ({ ...f, organiserEmail: e.target.value }))} placeholder="organiser@example.com" style={{ width: '100%', background: 'rgba(255,255,255,.04)', border: `1px solid ${addEventErrors.organiserEmail ? '#f87171' : 'rgba(255,255,255,.1)'}`, borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#fff', outline: 'none', boxSizing: 'border-box' }} />
                                        {addEventErrors.organiserEmail && <p style={{ margin: '4px 0 0', fontSize: 10, color: '#f87171' }}>{addEventErrors.organiserEmail}</p>}
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,.35)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 6 }}>Department / Organisation / Institution *</label>
                                        <input value={addEventForm.organiserOrg} onChange={e => setAddEventForm(f => ({ ...f, organiserOrg: e.target.value }))} placeholder="e.g. Nexus Ventures, IIT BBS E-Cell" style={{ width: '100%', background: 'rgba(255,255,255,.04)', border: `1px solid ${addEventErrors.organiserOrg ? '#f87171' : 'rgba(255,255,255,.1)'}`, borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#fff', outline: 'none', boxSizing: 'border-box' }} />
                                        {addEventErrors.organiserOrg && <p style={{ margin: '4px 0 0', fontSize: 10, color: '#f87171' }}>{addEventErrors.organiserOrg}</p>}
                                    </div>
                                    <div style={{ background: 'rgba(139,92,246,.06)', border: '1px solid rgba(139,92,246,.18)', borderRadius: 12, padding: '14px 16px' }}>
                                        <p style={{ margin: '0 0 10px', fontSize: 10, fontWeight: 700, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '.07em' }}>Event Summary</p>
                                        {([
                                            ['Title', addEventForm.title],
                                            ['Type', addEventForm.type],
                                            ['Date & Time', `${addEventForm.date} · ${addEventForm.time} IST`],
                                            ['Format', addEventForm.locationMode === 'physical' ? 'In-Person' : addEventForm.locationMode === 'online' ? 'Online · Zoom' : 'Virtual'],
                                            ['Venue / Link', addEventForm.location],
                                            ...(addEventForm.maxCapacity ? [['Capacity', `${addEventForm.maxCapacity} attendees`]] : []),
                                            ...(addEventForm.prize ? [['Prize', addEventForm.prize]] : []),
                                        ] as [string, string][]).map(([k, v]) => (
                                            <div key={k} style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
                                                <span style={{ fontSize: 11, color: 'rgba(255,255,255,.28)', minWidth: 90, flexShrink: 0 }}>{k}</span>
                                                <span style={{ fontSize: 11, color: 'rgba(255,255,255,.7)', fontWeight: 600 }}>{v}</span>
                                            </div>
                                        ))}
                                    </div>
                                    {addEventErrors.submit && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 13px', borderRadius: 10, background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.32)' }}>
                                            <span style={{ fontSize: 11, color: '#f87171', fontWeight: 600 }}>{addEventErrors.submit}</span>
                                        </div>
                                    )}
                                    <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
                                        <button onClick={() => { setAddEventStep(1); setAddEventErrors({}); }} style={{ flex: 1, padding: '11px', borderRadius: 999, fontSize: 12, fontWeight: 600, background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.1)', color: 'rgba(255,255,255,.4)', cursor: 'pointer' }}>← Back</button>
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
                                                    const res = await fetch('/api/events/create', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ ...addEventForm, submittedBy: user?.email ?? addEventForm.organiserEmail }) });
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
                                                // Reflect locally, tagged pending until admin approves
                                                setEvents(prev => [...prev, {
                                                    id: `ev-user-${Date.now()}`,
                                                    title: addEventForm.title,
                                                    date: addEventForm.date,
                                                    time: addEventForm.time,
                                                    type: addEventForm.type,
                                                    location: addEventForm.location || (addEventForm.locationMode === 'online' ? 'Online' : 'Virtual'),
                                                    description: addEventForm.description || '',
                                                    pending: true,
                                                } as any]);
                                            }}
                                            style={{ flex: 2, padding: '11px', borderRadius: 999, fontSize: 12, fontWeight: 700, background: addEventSubmitting ? 'rgba(139,92,246,.4)' : 'linear-gradient(90deg,#7c3aed,#0ea5e9)', color: 'white', border: 'none', cursor: addEventSubmitting ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                                            {addEventSubmitting ? 'Submitting…' : <><CheckCircle style={{ width: 13, height: 13 }} />Submit Event for Review</>}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )
            }

            {/* ══ TOAST ══ */}
            {
                toast && (
                    <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 60, display: 'flex', alignItems: 'center', gap: 10, padding: '11px 18px', borderRadius: 12, background: 'rgba(8,8,16,.95)', border: `1px solid ${toast.color}55`, borderLeft: `3px solid ${toast.color}`, boxShadow: `0 12px 40px rgba(0,0,0,.6), 0 0 18px ${toast.color}30`, backdropFilter: 'blur(12px)', animation: 'sc-toast-in .3s ease' }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: toast.color, boxShadow: `0 0 8px ${toast.color}`, flexShrink: 0 }} />
                        <span style={{ fontSize: 12, fontWeight: 600, color: 'white' }}>{toast.msg}</span>
                    </div>
                )
            }
        </div >
    );
}