import { createFileRoute, useNavigate, Link } from '@tanstack/react-router';
import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';

export const Route = createFileRoute('/signup')({
  component: SignUpPage,
  head: () => ({ meta: [{ title: 'Sign Up — Sanyog' }] }),
});

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true" style={{ flexShrink: 0 }}>
    <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z"/>
    <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2.01c-.72.48-1.63.76-2.7.76-2.08 0-3.84-1.4-4.47-3.29H1.86v2.07A8 8 0 0 0 8.98 17z"/>
    <path fill="#FBBC05" d="M4.51 10.52A4.8 4.8 0 0 1 4.26 9c0-.52.09-1.02.25-1.52V5.41H1.86A8 8 0 0 0 .98 9c0 1.29.31 2.51.88 3.59l2.65-2.07z"/>
    <path fill="#EA4335" d="M8.98 3.58c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 0 0 8.98 1a8 8 0 0 0-7.12 4.41l2.65 2.07c.63-1.89 2.39-3.3 4.47-3.3z"/>
  </svg>
);

function SignUpPage() {
  const { loginWithGoogle, refetch } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail]     = useState('');
  const [name, setName]       = useState('');
  const [otp, setOtp]         = useState('');
  const [step, setStep]       = useState<'form' | 'otp'>('form');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [errCase, setErrCase] = useState('');

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setErrCase('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), name: name.trim() }),
        credentials: 'include',
      });
      const data = await res.json() as { message?: string; case?: string };
      if (!res.ok) {
        setErrCase(data.case || '');
        setError(data.message || 'Something went wrong.');
        return;
      }
      setStep('otp');
    } catch {
      setError('Could not reach the server. Please run npm run dev and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleOTPSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setErrCase('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), code: otp.trim(), type: 'signup', name: name.trim() }),
        credentials: 'include',
      });
      const data = await res.json() as { message?: string };
      if (!res.ok) {
        setError(data.message || 'Invalid OTP. Please try again.');
        return;
      }
      await refetch();
      navigate({ to: '/' });
    } catch {
      setError('Could not reach the server. Please run npm run dev and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#020208', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        <a href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none', marginBottom: 32, justifyContent: 'center' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#a78bfa', boxShadow: '0 0 10px rgba(167,139,250,0.7)', display: 'inline-block' }} />
          <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'white' }}>Sanyog</span>
        </a>

        <div style={{ background: '#0a0a14', border: '1px solid rgba(139,92,246,0.25)', borderTop: '2px solid #8b5cf6', borderRadius: 20, padding: '32px 28px', boxShadow: '0 24px 64px rgba(0,0,0,0.6)', position: 'relative' }}>

          {/* Close button */}
          <button
            onClick={() => window.history.length > 1 ? window.history.back() : navigate({ to: '/' })}
            aria-label="Close"
            style={{ position: 'absolute', top: 16, right: 16, width: 32, height: 32, borderRadius: 8, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'background 0.15s' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.12)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M1 1L13 13M13 1L1 13" stroke="rgba(255,255,255,0.5)" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
          </button>

          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'white', margin: '0 0 6px' }}>Sign Up</h1>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', margin: '0 0 28px' }}>
            {step === 'form' ? 'Create your Sanyog account.' : `Enter the 6-digit code sent to ${email}`}
          </p>

          {error && (
            <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#fca5a5', fontSize: 13, marginBottom: 16, lineHeight: 1.5 }}>
              {error}
              {errCase === 'already_registered' && (
                <> <a href="/login" style={{ color: '#a78bfa', fontWeight: 600 }}>Log In</a></>
              )}
            </div>
          )}

          {step === 'form' ? (
            <form onSubmit={handleFormSubmit}>
              {/* Name field */}
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Full Name</label>
              <input
                type="text" required value={name} onChange={e => setName(e.target.value)}
                placeholder="Ashutosh Palai"
                style={{ width: '100%', padding: '11px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: 16, outline: 'none', boxSizing: 'border-box', marginBottom: 16 }}
                onFocus={e => (e.target.style.borderColor = 'rgba(139,92,246,0.6)')}
                onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
              />

              {/* Email field */}
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Email Address</label>
              <input
                type="email" required value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                style={{ width: '100%', padding: '11px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: 16, outline: 'none', boxSizing: 'border-box', marginBottom: 20 }}
                onFocus={e => (e.target.style.borderColor = 'rgba(139,92,246,0.6)')}
                onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
              />

              <button type="submit" disabled={loading} style={{ width: '100%', padding: '12px', borderRadius: 10, background: 'linear-gradient(90deg,#7c3aed,#0ea5e9)', border: 'none', color: 'white', fontSize: 14, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, marginBottom: 20 }}>
                {loading ? 'Sending…' : 'Sign Up'}
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>or</span>
                <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
              </div>

              <button type="button" onClick={() => loginWithGoogle('signup')} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '11px 20px', borderRadius: 10, background: 'white', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 600, color: '#1a1a2e' }}>
                <GoogleIcon />
                Continue with Google
              </button>
            </form>
          ) : (
            <form onSubmit={handleOTPSubmit}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>One-Time Code</label>
              <input
                type="text" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required
                value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                placeholder="123456"
                style={{ width: '100%', padding: '11px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: 16, fontWeight: 700, letterSpacing: 8, outline: 'none', boxSizing: 'border-box', marginBottom: 20, textAlign: 'center' }}
                onFocus={e => (e.target.style.borderColor = 'rgba(139,92,246,0.6)')}
                onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
              />
              <button type="submit" disabled={loading || otp.length !== 6} style={{ width: '100%', padding: '12px', borderRadius: 10, background: 'linear-gradient(90deg,#7c3aed,#0ea5e9)', border: 'none', color: 'white', fontSize: 14, fontWeight: 700, cursor: (loading || otp.length !== 6) ? 'not-allowed' : 'pointer', opacity: (loading || otp.length !== 6) ? 0.6 : 1, marginBottom: 12 }}>
                {loading ? 'Verifying…' : 'Verify & Create Account'}
              </button>
              <button type="button" onClick={() => { setStep('form'); setOtp(''); setError(''); }} style={{ width: '100%', padding: '10px', background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: 13, cursor: 'pointer' }}>
                ← Back
              </button>
            </form>
          )}

          <p style={{ textAlign: 'center', fontSize: 13, color: 'rgba(255,255,255,0.3)', margin: '20px 0 0' }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: '#a78bfa', fontWeight: 600, textDecoration: 'none' }}>Log In</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
