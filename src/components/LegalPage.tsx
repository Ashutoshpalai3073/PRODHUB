import type { ReactNode } from 'react';

/* Shared shell for the legal pages (/privacy, /terms).
   Matches the site's dark aesthetic; kept dependency-free and SSR-safe. */

export function LegalSection({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <section style={{ marginBottom: 28 }}>
      <h2 style={{ fontSize: 16, fontWeight: 700, color: 'white', margin: '0 0 10px', letterSpacing: '-0.01em' }}>{heading}</h2>
      <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.62)', lineHeight: 1.75 }}>{children}</div>
    </section>
  );
}

export function LegalPage({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', background: '#04040c', fontFamily: 'Inter, system-ui, sans-serif', padding: '0 20px' }}>
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '40px 0 80px' }}>
        {/* Wordmark → home */}
        <a href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, textDecoration: 'none', marginBottom: 44 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#a78bfa', boxShadow: '0 0 10px rgba(167,139,250,0.7)', display: 'inline-block' }} />
          <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'white' }}>Sanyog</span>
        </a>

        <h1 style={{ fontSize: 30, fontWeight: 800, color: 'white', margin: '0 0 8px', letterSpacing: '-0.02em' }}>{title}</h1>
        <p style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.35)', margin: '0 0 36px' }}>Last updated: {updated}</p>

        {children}

        <div style={{ marginTop: 44, paddingTop: 20, borderTop: '1px solid rgba(255,255,255,0.08)', fontSize: 13, color: 'rgba(255,255,255,0.4)', lineHeight: 1.7 }}>
          Questions? Contact us at <a href="mailto:hello@sanyog.in" style={{ color: '#a78bfa', textDecoration: 'none' }}>hello@sanyog.in</a> ·
          IIT KGP Innovation Cell, Kharagpur, West Bengal.
        </div>
      </div>
    </div>
  );
}
