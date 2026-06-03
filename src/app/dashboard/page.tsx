// page.tsx
// Renders the main user dashboard showing recent jobs and calendar connection status.

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Calendar, Plus, ExternalLink, AlertCircle, CheckCircle2, ChevronRight, BarChart2 } from 'lucide-react';

interface JobData {
  id: string;
  name: string;
  status: string;
  totalRows: number;
  validRows: number;
  scheduledRows: number;
  failedRows: number;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

interface CalendarStatus {
  connected: boolean;
  google_email?: string;
  calendar_id?: string;
}

export default function Dashboard() {
  const [jobs, setJobs] = useState<JobData[]>([]);
  const [calendar, setCalendar] = useState<CalendarStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [jobsRes, calendarRes] = await Promise.all([
          fetch('/api/scheduling-jobs'),
          fetch('/api/google-calendar/status'),
        ]);

        if (jobsRes.ok) {
          const jobsData = await jobsRes.json();
          setJobs(jobsData);
        }

        if (calendarRes.ok) {
          const calendarData = await calendarRes.json();
          setCalendar(calendarData);
        }
      } catch (err) {
        console.error('Failed to fetch dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  // Format date helper
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return <span className="badge badge-draft">Draft</span>;
      case 'queued':
        return <span className="badge badge-queued">Queued</span>;
      case 'running':
        return <span className="badge badge-running">Running</span>;
      case 'completed':
        return <span className="badge badge-scheduled">Completed</span>;
      case 'completed_with_errors':
        return <span className="badge badge-queued" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.2)' }}>Completed w/ Errors</span>;
      case 'failed':
        return <span className="badge badge-failed">Failed</span>;
      default:
        return <span className="badge badge-draft">{status}</span>;
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', height: '80vh', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="container" style={{ paddingTop: '40px', paddingBottom: '80px' }}>
      {/* Welcome Title */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '6px' }}>Organizer Dashboard</h1>
          <p>Monitor your bulk scheduling jobs and manage active calendar connections.</p>
        </div>
      </div>

      {/* Overview Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', marginBottom: '40px' }}>
        {/* Calendar Connection Status Card */}
        <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{ color: calendar?.connected ? 'var(--success)' : 'var(--danger)' }}>
                <Calendar size={24} />
              </div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Google Calendar Connection</h2>
            </div>
            {calendar?.connected ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                <CheckCircle2 size={16} style={{ color: 'var(--success)' }} />
                <div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>Active Connection</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>{calendar.google_email}</div>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                <AlertCircle size={16} style={{ color: 'var(--danger)' }} />
                <div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>No Calendar Connected</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Connect an account to schedule meetings.</div>
                </div>
              </div>
            )}
          </div>
          <div>
            <Link href="/connect-calendar" className="btn btn-secondary" style={{ width: '100%', textDecoration: 'none' }}>
              {calendar?.connected ? 'Manage Connection' : 'Connect Calendar'}
            </Link>
          </div>
        </div>

        {/* Quick Action: Start New Job */}
        <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{ color: 'var(--primary)' }}>
                <Plus size={24} />
              </div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>New Scheduling Job</h2>
            </div>
            <p style={{ fontSize: '0.85rem', marginBottom: '20px' }}>
              Upload your scheduling spreadsheet (CSV format) to schedule interviews or workshops, send invites, and create Google Meet rooms in bulk.
            </p>
          </div>
          <div>
            {calendar?.connected ? (
              <Link href="/jobs/new" className="btn btn-primary" style={{ width: '100%', textDecoration: 'none' }}>
                <Plus size={16} /> Create New Job
              </Link>
            ) : (
              <button className="btn btn-primary btn-disabled" style={{ width: '100%' }}>
                Connect Calendar First
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Recent Jobs Section */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
          <BarChart2 size={20} style={{ color: 'var(--primary)' }} />
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700 }}>Recent Scheduling Jobs</h2>
        </div>

        {jobs.length === 0 ? (
          <div className="glass-card" style={{ padding: '60px 40px', textAlign: 'center', borderStyle: 'dashed' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '16px' }}>📂</div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 600, marginBottom: '8px' }}>No Jobs Found</h3>
            <p style={{ fontSize: '0.9rem', marginBottom: '24px', maxWidth: '420px', margin: '0 auto 24px' }}>
              You haven't uploaded any scheduling jobs yet. Get started by uploading your first meeting list!
            </p>
            {calendar?.connected && (
              <Link href="/jobs/new" className="btn btn-primary" style={{ textDecoration: 'none' }}>
                <Plus size={16} /> Create First Job
              </Link>
            )}
          </div>
        ) : (
          <div className="glass-card" style={{ overflow: 'hidden' }}>
            <div className="table-container">
              <table className="premium-table">
                <thead>
                  <tr>
                    <th>Job Name</th>
                    <th>Status</th>
                    <th>Uploaded At</th>
                    <th style={{ width: '220px' }}>Progress</th>
                    <th>Metrics</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map((job) => {
                    const totalScheduledOrFailed = job.scheduledRows + job.failedRows;
                    const percent = job.totalRows > 0 ? Math.round((totalScheduledOrFailed / job.totalRows) * 100) : 0;
                    
                    return (
                      <tr key={job.id}>
                        <td>
                          <div style={{ fontWeight: 600, color: 'var(--foreground)' }}>{job.name}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>{job.id}</div>
                        </td>
                        <td>{getStatusBadge(job.status)}</td>
                        <td>{formatDate(job.createdAt)}</td>
                        <td>
                          {job.status === 'draft' ? (
                            <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>Awaiting launch</span>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 600 }}>
                                <span>{percent}%</span>
                                <span style={{ color: 'var(--muted)' }}>{totalScheduledOrFailed}/{job.totalRows}</span>
                              </div>
                              <div style={{ width: '100%', height: '6px', background: 'var(--muted-dark)', borderRadius: '9999px', overflow: 'hidden' }}>
                                <div 
                                  style={{ 
                                    height: '100%', 
                                    width: `${percent}%`, 
                                    background: job.status === 'completed' ? 'var(--success)' : 'var(--primary)',
                                    borderRadius: '9999px',
                                    transition: 'width 0.4s ease'
                                  }}
                                />
                              </div>
                            </div>
                          )}
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '12px', fontSize: '0.8rem' }}>
                            <span style={{ color: 'var(--success)', fontWeight: 600 }}>✓ {job.scheduledRows}</span>
                            {job.failedRows > 0 && <span style={{ color: 'var(--danger)', fontWeight: 600 }}>✗ {job.failedRows}</span>}
                            {job.status === 'draft' && <span style={{ color: 'var(--muted)' }}>• {job.validRows} valid</span>}
                          </div>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <Link href={`/jobs/${job.id}`} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            View details <ChevronRight size={14} />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
