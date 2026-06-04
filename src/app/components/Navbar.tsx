// Navbar.tsx
// A shared navigation header component that renders organizer session details and provides navigation links.

'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Calendar, LayoutDashboard, LogOut, User } from 'lucide-react';

interface UserData {
  name?: string;
  email: string;
  imageUrl?: string;
}

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<UserData | null>(null);

  useEffect(() => {
    // Do not fetch session metadata if we are on the login page
    if (pathname === '/login') return;

    fetch('/api/auth/me')
      .then((res) => {
        if (res.ok) {
          return res.json();
        }
        throw new Error('Unauthorized');
      })
      .then((data) => setUser(data))
      .catch(() => {
        router.push('/login');
      });
  }, [router, pathname]);

  const handleLogout = async () => {
    const res = await fetch('/api/auth/logout', { method: 'POST' });
    if (res.ok) {
      router.push('/login');
    }
  };

  if (pathname === '/login') {
    return null; // Don't show Navbar on Login screen
  }

  return (
    <header className="nav-header">
      <div className="container nav-container">
        <Link href="/dashboard" className="logo" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <img src="/logo.png" alt="MeetFlow Logo" style={{ height: '32px', width: '32px', borderRadius: '6px' }} />
          <span>MeetFlow</span>
        </Link>

        <nav style={{ display: 'flex', alignItems: 'center', gap: '28px' }}>
          <Link
            href="/dashboard"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '0.9rem',
              fontWeight: 500,
              color: pathname === '/dashboard' || pathname.startsWith('/jobs') ? 'var(--foreground)' : 'var(--muted)',
            }}
          >
            <LayoutDashboard size={16} /> Dashboard
          </Link>
          <Link
            href="/connect-calendar"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '0.9rem',
              fontWeight: 500,
              color: pathname === '/connect-calendar' ? 'var(--foreground)' : 'var(--muted)',
            }}
          >
            <Calendar size={16} /> Connect Calendar
          </Link>
        </nav>

        <div className="nav-user" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {user ? (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', lineHeight: 1.2 }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{user.name || 'Organizer'}</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{user.email}</span>
              </div>
              {user.imageUrl ? (
                <img src={user.imageUrl} alt="Profile" className="user-avatar" />
              ) : (
                <div
                  className="user-avatar"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'var(--muted-dark)',
                    color: 'var(--foreground)',
                  }}
                >
                  <User size={16} />
                </div>
              )}
              <button
                onClick={handleLogout}
                className="btn btn-secondary"
                style={{
                  padding: '6px 12px',
                  fontSize: '0.8rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <LogOut size={14} /> Logout
              </button>
            </>
          ) : (
            <div
              style={{
                width: '120px',
                height: '24px',
                background: 'var(--muted-dark)',
                borderRadius: '4px',
              }}
            ></div>
          )}
        </div>
      </div>
    </header>
  );
}
