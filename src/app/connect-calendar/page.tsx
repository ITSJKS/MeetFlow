// page.tsx
// Renders the page where organizers connect or disconnect their Google Calendar.

'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Calendar, CheckCircle2, AlertTriangle, Key, Trash2, ArrowRight, ShieldAlert } from 'lucide-react';

interface CalendarStatus {
  connected: boolean;
  google_email?: string;
  calendar_id?: string;
  connected_at?: string;
}

function ConnectCalendarContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const success = searchParams.get('success');
  const error = searchParams.get('error');

  const [status, setStatus] = useState<CalendarStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState(false);

  async function fetchStatus() {
    try {
      const res = await fetch('/api/google-calendar/status');
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
      }
    } catch (err) {
      console.error('Failed to load calendar status:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect your Google Calendar? Background jobs will no longer be able to schedule events.')) {
      return;
    }
    
    setDisconnecting(true);
    try {
      const res = await fetch('/api/google-calendar/status', { method: 'DELETE' });
      if (res.ok) {
        await fetchStatus();
        router.replace('/connect-calendar');
      } else {
        alert('Failed to disconnect calendar connection.');
      }
    } catch (err) {
      console.error(err);
      alert('Error disconnecting calendar.');
    } finally {
      setDisconnecting(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', height: '80vh', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="container" style={{ paddingTop: '40px', paddingBottom: '80px', maxWidth: '680px' }}>
      <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '6px' }}>Calendar Settings</h1>
      <p style={{ marginBottom: '32px' }}>Configure your primary organizer Google Calendar account to schedule bulk meetings.</p>

      {success && (
        <div
          style={{
            background: 'var(--success-light)',
            border: '1px solid var(--success-border)',
            color: 'var(--success)',
            padding: '16px',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.9rem',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <CheckCircle2 size={18} />
          <strong>Google Calendar connected successfully!</strong>
        </div>
      )}

      {error && (
        <div
          style={{
            background: 'var(--danger-light)',
            border: '1px solid var(--danger-border)',
            color: 'var(--danger)',
            padding: '16px',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.9rem',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <ShieldAlert size={18} />
          <div>
            <strong>Connection failed:</strong> {error.replace(/_/g, ' ')}
          </div>
        </div>
      )}

      {status?.connected ? (
        <div className="glass-card" style={{ padding: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '20px', marginBottom: '28px' }}>
            <div
              style={{
                background: 'var(--success-light)',
                color: 'var(--success)',
                padding: '12px',
                borderRadius: '12px',
                border: '1px solid var(--success-border)',
              }}
            >
              <Calendar size={28} />
            </div>
            <div>
              <div className="badge badge-scheduled" style={{ marginBottom: '8px' }}>
                Connected
              </div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '4px' }}>
                {status.google_email}
              </h2>
              <p style={{ fontSize: '0.85rem' }}>
                Primary Calendar: <code style={{ color: 'var(--foreground)', background: 'var(--muted-dark)', padding: '2px 6px', borderRadius: '4px' }}>{status.calendar_id}</code>
              </p>
              {status.connected_at && (
                <p style={{ fontSize: '0.8rem', marginTop: '6px' }}>
                  Linked on {formatDate(status.connected_at)}
                </p>
              )}
            </div>
          </div>

          <div
            style={{
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid var(--card-border)',
              borderRadius: 'var(--radius-sm)',
              padding: '16px 20px',
              fontSize: '0.85rem',
              marginBottom: '32px',
              display: 'flex',
              gap: '12px',
            }}
          >
            <AlertTriangle size={18} style={{ color: 'var(--warning)', flexShrink: 0, marginTop: '2px' }} />
            <span style={{ color: 'var(--muted)' }}>
              <strong>Important</strong>: Any bulk scheduled sessions will be created directly on this Google Calendar. Attendees (candidates and interviewers) will receive calendar invite emails immediately when jobs run.
            </span>
          </div>

          <div style={{ display: 'flex', gap: '16px' }}>
            <a
              href="/api/google-calendar/connect"
              className="btn btn-secondary"
              style={{ flex: 1, textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              Switch Account
            </a>
            <button
              onClick={handleDisconnect}
              disabled={disconnecting}
              className="btn btn-danger"
              style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              {disconnecting ? (
                <div className="spinner" style={{ width: '16px', height: '16px' }}></div>
              ) : (
                <>
                  <Trash2 size={16} /> Disconnect
                </>
              )}
            </button>
          </div>
        </div>
      ) : (
        <div className="glass-card" style={{ padding: '32px', textAlign: 'center' }}>
          <div
            style={{
              display: 'inline-flex',
              background: 'var(--primary-light)',
              color: 'var(--primary)',
              padding: '16px',
              borderRadius: '16px',
              marginBottom: '20px',
              border: '1px solid rgba(99, 102, 241, 0.2)',
            }}
          >
            <Key size={32} />
          </div>

          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '12px' }}>
            Connect Google Calendar
          </h2>
          <p style={{ fontSize: '0.9rem', maxWidth: '480px', margin: '0 auto 28px' }}>
            To begin scheduling, MeetFlow requires access to your Google Calendar. This will allow the background worker to create event invites and generate Google Meet rooms.
          </p>

          <div
            style={{
              background: 'rgba(255, 255, 255, 0.01)',
              border: '1px solid var(--card-border)',
              borderRadius: 'var(--radius-sm)',
              padding: '20px',
              textAlign: 'left',
              fontSize: '0.85rem',
              marginBottom: '32px',
              maxWidth: '480px',
              margin: '0 auto 32px',
            }}
          >
            <div style={{ fontWeight: 600, color: 'var(--foreground)', marginBottom: '8px' }}>
              Permissions requested:
            </div>
            <ul style={{ listStyleType: 'disc', paddingLeft: '20px', color: 'var(--muted)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <li>View and edit events on your Google Calendars</li>
              <li>Generate video call details (Google Meet rooms) for events</li>
              <li>Send email notifications to event invitees</li>
              <li>Offline access to refresh tokens for background scheduling</li>
            </ul>
          </div>

          <a
            href="/api/google-calendar/connect"
            className="btn btn-primary"
            style={{
              padding: '12px 28px',
              fontSize: '1rem',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            Connect Google Account <ArrowRight size={16} />
          </a>
        </div>
      )}
    </div>
  );
}

export default function ConnectCalendarPage() {
  return (
    <Suspense fallback={
      <div style={{ display: 'flex', height: '80vh', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)' }}>
        <div className="spinner"></div>
      </div>
    }>
      <ConnectCalendarContent />
    </Suspense>
  );
}
