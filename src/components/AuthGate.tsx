import { useNavigate } from '@tanstack/react-router';
import { useAuth } from '@/context/AuthContext';

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true" style={{ flexShrink: 0 }}>
    <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z"/>
    <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2.01c-.72.48-1.63.76-2.7.76-2.08 0-3.84-1.4-4.47-3.29H1.86v2.07A8 8 0 0 0 8.98 17z"/>
    <path fill="#FBBC05" d="M4.51 10.52A4.8 4.8 0 0 1 4.26 9c0-.52.09-1.02.25-1.52V5.41H1.86A8 8 0 0 0 .98 9c0 1.29.31 2.51.88 3.59l2.65-2.07z"/>
    <path fill="#EA4335" d="M8.98 3.58c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 0 0 8.98 1a8 8 0 0 0-7.12 4.41l2.65 2.07c.63-1.89 2.39-3.3 4.47-3.3z"/>
  </svg>
);

export function AuthGate() {
  const { loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(2,2,10,0.92)',
      backdropFilter: 'blur(18px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 9999, padding: 16,
    }}>
      <div className="auth-gate-card" style={{
        background: '#0a0a14',
        border: '1px solid rgba(139,92,246,0.3)',
        borderTop: '2px solid #8b5cf6',
        borderRadius: 20,
        width: '100%', maxWidth: 420,
        padding: '36px 32px',
        boxShadow: '0 32px 80px rgba(0,0,0,0.7), 0 0 60px rgba(139,92,246,0.08)',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: -60, right: -60, width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle,rgba(139,92,246,0.1),transparent 70%)', pointerEvents: 'none' }} />

        {/* Close button */}
        <button
          onClick={() => navigate({ to: '/' })}
          aria-label="Close"
          style={{ position: 'absolute', top: 16, right: 16, width: 32, height: 32, borderRadius: 8, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'background 0.15s', zIndex: 1 }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.12)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M1 1L13 13M13 1L1 13" stroke="rgba(255,255,255,0.5)" strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#a78bfa', boxShadow: '0 0 10px rgba(167,139,250,0.7)', display: 'inline-block' }} />
          <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)' }}>Sanyog</span>
        </div>

        <h2 style={{ fontSize: 22, fontWeight: 800, color: 'white', margin: '0 0 8px', lineHeight: 1.2 }}>
          Sign in to access this report
        </h2>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', margin: '0 0 28px', lineHeight: 1.6 }}>
          Create a free account or log in to continue.
        </p>

        <button
          onClick={() => loginWithGoogle('login')}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            padding: '11px 20px', borderRadius: 10, background: 'white', border: 'none', cursor: 'pointer',
            fontSize: 14, fontWeight: 600, color: '#1a1a2e',
            boxShadow: '0 2px 12px rgba(0,0,0,0.25)', transition: 'all 0.18s ease',
          }}
          onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.35)')}
          onMouseLeave={e => (e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.25)')}
        >
          <GoogleIcon />
          Continue with Google
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0' }}>
          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', whiteSpace: 'nowrap' }}>or</span>
          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
        </div>

        <button
          onClick={() => navigate({ to: '/login' })}
          style={{
            width: '100%', padding: '11px 20px', borderRadius: 10,
            background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.3)',
            color: '#a78bfa', fontSize: 14, fontWeight: 600, cursor: 'pointer',
            transition: 'all 0.18s ease',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(139,92,246,0.18)'; e.currentTarget.style.borderColor = 'rgba(139,92,246,0.5)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(139,92,246,0.1)'; e.currentTarget.style.borderColor = 'rgba(139,92,246,0.3)'; }}
        >
          Or log in with OTP
        </button>
      </div>
    </div>
  );
}
