import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';

export const Route = createFileRoute('/auth/callback')({
  component: AuthCallbackPage,
  head: () => ({ meta: [{ title: 'Signing in… — Sanyog' }] }),
});

function AuthCallbackPage() {
  const { refetch } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    refetch().then(() => {
      const redirect = sessionStorage.getItem('auth_redirect') || '/';
      sessionStorage.removeItem('auth_redirect');
      navigate({ to: redirect, replace: true });
    });
  }, [refetch, navigate]);

  return (
    <div style={{ minHeight: '100vh', background: '#020208', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 44, height: 44, border: '3px solid rgba(139,92,246,0.2)', borderTop: '3px solid #8b5cf6', borderRadius: '50%', margin: '0 auto 20px', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>Signing you in…</p>
      </div>
    </div>
  );
}
