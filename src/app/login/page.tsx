// page.tsx
// Renders the Google Login landing page with premium aesthetics.

'use client';

import { useSearchParams } from 'next/navigation';
import { Calendar, CheckCircle2, Clock, Mail, Shield } from 'lucide-react';
import { Suspense } from 'react';

function LoginContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');

  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        position: 'relative',
        zIndex: 1,
      }}
    >
      {/* Background radial glow */}
      <div
        style={{
          position: 'absolute',
          width: '500px',
          height: '500px',
          background: 'rgba(99, 102, 241, 0.15)',
          filter: 'blur(100px)',
          borderRadius: '50%',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: -1,
          pointerEvents: 'none',
        }}
      ></div>

      <div
        className="glass-card"
        style={{
          width: '100%',
          maxWidth: '520px',
          padding: '48px 40px',
          textAlign: 'center',
          borderRadius: 'var(--radius-lg)',
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '64px',
            height: '64px',
            borderRadius: '16px',
            marginBottom: '24px',
            border: '1px solid rgba(99, 102, 241, 0.2)',
            boxShadow: '0 8px 24px rgba(99, 102, 241, 0.15)',
            overflow: 'hidden',
          }}
        >
          <img src="/logo.png" alt="MeetFlow Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>

        <h1
          style={{
            fontSize: '2.5rem',
            fontWeight: 800,
            marginBottom: '8px',
            letterSpacing: '-0.03em',
          }}
        >
          MeetFlow
        </h1>
        <p style={{ fontSize: '1.05rem', color: 'var(--muted)', marginBottom: '32px' }}>
          Bulk schedule calendar sessions with Google Meet links automatically.
        </p>

        {error && (
          <div
            style={{
              background: 'var(--danger-light)',
              border: '1px solid var(--danger-border)',
              color: 'var(--danger)',
              padding: '12px 16px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.85rem',
              marginBottom: '24px',
              textAlign: 'left',
            }}
          >
            <strong>Sign-in failed:</strong> {error.replace(/_/g, ' ')}
          </div>
        )}

        <a
          href="/api/auth/google/start"
          className="btn btn-primary"
          style={{
            width: '100%',
            padding: '14px 28px',
            fontSize: '1.05rem',
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            borderRadius: 'var(--radius-md)',
            marginBottom: '32px',
          }}
        >
          {/* Simple Google SVG Icon */}
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
          </svg>
          Sign in with Google
        </a>

        <div
          style={{
            borderTop: '1px solid var(--card-border)',
            paddingTop: '24px',
            textAlign: 'left',
          }}
        >
          <h3
            style={{
              fontSize: '0.9rem',
              fontWeight: 600,
              textTransform: 'uppercase',
              color: 'var(--foreground)',
              marginBottom: '16px',
              letterSpacing: '0.05em',
            }}
          >
            How it works
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <div style={{ color: 'var(--primary)', marginTop: '2px' }}>
                <Clock size={16} />
              </div>
              <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
                <strong>OAuth Access</strong>: Authenticate with Google and connect your calendar.
              </span>
            </div>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <div style={{ color: 'var(--primary)', marginTop: '2px' }}>
                <Mail size={16} />
              </div>
              <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
                <strong>Bulk Invite</strong>: Upload a CSV containing candidate and interviewer details.
              </span>
            </div>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <div style={{ color: 'var(--primary)', marginTop: '2px' }}>
                <Calendar size={16} />
              </div>
              <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
                <strong>Auto Scheduler</strong>: MeetFlow handles tokens and creates events with active Google Meet links.
              </span>
            </div>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <div style={{ color: 'var(--primary)', marginTop: '2px' }}>
                <Shield size={16} />
              </div>
              <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
                <strong>Idempotent & Secure</strong>: Prevents duplicate meetings automatically. Tokens are stored encrypted (AES-256-GCM).
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)' }}>
        <div className="spinner"></div>
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
