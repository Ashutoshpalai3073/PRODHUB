import { createFileRoute, useNavigate, useSearch } from '@tanstack/react-router';

export const Route = createFileRoute('/auth-error')({
  validateSearch: (s: Record<string, unknown>) => ({ reason: (s.reason as string) || '' }),
  component: AuthErrorPage,
  head: () => ({ meta: [{ title: 'Auth Error — Sanyog' }] }),
});

const MESSAGES: Record<string, string> = {
  otp_conflict:     'This email is already registered with OTP login. Please use OTP to log in.',
  google_conflict:  'This email is already registered with Google login. Please use Google to log in.',
  invalid_state:    'Invalid or expired authentication state. Please try again.',
  token_failed:     'Failed to exchange authentication code. Please try again.',
  userinfo_failed:  'Failed to retrieve your Google profile. Please try again.',
  cancelled:        'Authentication was cancelled. Please try again.',
  db_error:         'A server error occurred while creating your account. Please try again.',
  no_account:       'No Sanyog account is linked to this Google email. If you deleted your account, you’ll need to sign up again to create a fresh one.',
};

function AuthErrorPage() {
  const { reason } = useSearch({ from: '/auth-error' });
  const navigate = useNavigate();
  const message = MESSAGES[reason] || 'An authentication error occurred. Please try again.';

  return (
    <div style={{ minHeight: '100vh', background: '#020208', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div style={{ width: '100%', maxWidth: 400, textAlign: 'center' }}>
        <a href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none', marginBottom: 32, justifyContent: 'center' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#a78bfa', boxShadow: '0 0 10px rgba(167,139,250,0.7)', display: 'inline-block' }} />
          <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'white' }}>Sanyog</span>
        </a>

        <div style={{ background: '#0a0a14', border: '1px solid rgba(239,68,68,0.3)', borderTop: '2px solid #ef4444', borderRadius: 20, padding: '36px 28px', boxShadow: '0 24px 64px rgba(0,0,0,0.6)' }}>
          <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
          </div>

          <h1 style={{ fontSize: 20, fontWeight: 800, color: 'white', margin: '0 0 12px' }}>Authentication Error</h1>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', margin: '0 0 28px', lineHeight: 1.6 }}>{message}</p>

          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={() => navigate({ to: reason === 'no_account' ? '/signup' : '/login' })}
              style={{ flex: 1, padding: '11px 0', borderRadius: 10, background: 'linear-gradient(90deg,#7c3aed,#0ea5e9)', border: 'none', color: 'white', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
            >
              {reason === 'no_account' ? 'Sign Up' : 'Log In'}
            </button>
            <button
              onClick={() => navigate({ to: '/' })}
              style={{ flex: 1, padding: '11px 0', borderRadius: 10, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
            >
              Go back
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
