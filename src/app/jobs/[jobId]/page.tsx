// page.tsx
// Renders the detailed progress tracking dashboard for a specific bulk scheduling job.

'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Download,
  Calendar,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  Video,
  ListFilter,
  CheckCircle2,
} from 'lucide-react';

interface JobDetails {
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
  googleAccount: {
    googleEmail: string;
  };
}

interface RowDetails {
  id: string;
  rowNumber: number;
  candidateEmail: string;
  interviewerEmail: string;
  title: string;
  status: string;
  startTime: string;
  endTime: string;
  googleCalendarEventId: string | null;
  googleCalendarHtmlLink: string | null;
  googleMeetLink: string | null;
  validationError: string | null;
  errorMessage: string | null;
}

export default function JobProgressPage({
  params,
}: {
  params: React.Usable<{ jobId: string }>;
}) {
  // Await params using React.use for Next.js 15 App Router compatibility
  const { jobId } = React.use(params);

  // States
  const [job, setJob] = React.useState<JobDetails | null>(null);
  const [rows, setRows] = React.useState<RowDetails[]>([]);
  const [filter, setFilter] = React.useState('all'); // 'all', 'scheduled', 'failed', 'pending'
  const [loading, setLoading] = React.useState(true);
  const [pollingActive, setPollingActive] = React.useState(true);

  // Fetch job metadata
  const fetchJob = React.useCallback(async () => {
    try {
      const res = await fetch(`/api/scheduling-jobs/${jobId}`);
      if (res.ok) {
        const data = await res.json();
        setJob(data);

        // Turn off polling once the job reaches terminal states
        if (
          data.status === 'completed' ||
          data.status === 'completed_with_errors' ||
          data.status === 'failed'
        ) {
          setPollingActive(false);
        }
      }
    } catch (err) {
      console.error('Error fetching job summary:', err);
    }
  }, [jobId]);

  // Fetch job rows
  const fetchRows = React.useCallback(async () => {
    try {
      const res = await fetch(`/api/scheduling-jobs/${jobId}/rows?filter=${filter}`);
      if (res.ok) {
        const data = await res.json();
        setRows(data);
      }
    } catch (err) {
      console.error('Error fetching job rows list:', err);
    }
  }, [jobId, filter]);

  // Initial load
  React.useEffect(() => {
    async function initialLoad() {
      await Promise.all([fetchJob(), fetchRows()]);
      setLoading(false);
    }
    initialLoad();
  }, [fetchJob, fetchRows]);

  // Poll progress when job is active
  React.useEffect(() => {
    if (!pollingActive) return;

    const interval = setInterval(async () => {
      await Promise.all([fetchJob(), fetchRows()]);
    }, 3000); // Poll every 3 seconds

    return () => clearInterval(interval);
  }, [pollingActive, fetchJob, fetchRows]);

  // Trigger refetch on filter change
  React.useEffect(() => {
    fetchRows();
  }, [filter, fetchRows]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return <span className="badge badge-draft">Draft Preview</span>;
      case 'queued':
        return <span className="badge badge-queued">Queued in Redis</span>;
      case 'running':
        return (
          <span className="badge badge-running" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <span
              className="spinner"
              style={{ width: '10px', height: '10px', border: '1.5px solid rgba(255,255,255,0.1)', borderTopColor: 'currentColor' }}
            ></span>
            Running Worker
          </span>
        );
      case 'completed':
        return <span className="badge badge-scheduled">Completed</span>;
      case 'completed_with_errors':
        return (
          <span
            className="badge"
            style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.2)' }}
          >
            Completed with errors
          </span>
        );
      case 'failed':
        return <span className="badge badge-failed">Job Failed</span>;
      default:
        return <span className="badge badge-draft">{status}</span>;
    }
  };

  const getRowStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <span className="badge badge-draft">Pending</span>;
      case 'queued':
        return <span className="badge badge-queued">Queued</span>;
      case 'processing':
        return <span className="badge badge-running">Processing</span>;
      case 'scheduled':
        return <span className="badge badge-scheduled">Scheduled</span>;
      case 'failed':
      case 'validation_failed':
        return <span className="badge badge-failed">Failed</span>;
      default:
        return <span className="badge badge-draft">{status}</span>;
    }
  };

  if (loading || !job) {
    return (
      <div style={{ display: 'flex', height: '80vh', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  // Calculate percentages
  const processedRows = job.scheduledRows + job.failedRows;
  const progressPercent = job.totalRows > 0 ? Math.round((processedRows / job.totalRows) * 100) : 0;

  return (
    <div className="container" style={{ paddingTop: '40px', paddingBottom: '80px' }}>
      {/* Back navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <Link href="/dashboard" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem', color: 'var(--muted)' }}>
          <ArrowLeft size={16} /> Back to Dashboard
        </Link>
        {pollingActive && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: 'var(--muted)' }}>
            <RefreshCw size={14} className="spinner" /> Auto-refreshing...
          </span>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '24px', flexWrap: 'wrap', marginBottom: '32px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <h1 style={{ fontSize: '2rem', fontWeight: 800 }}>{job.name}</h1>
            {getStatusBadge(job.status)}
          </div>
          <p style={{ fontSize: '0.9rem' }}>
            Created on {new Date(job.createdAt).toLocaleString()} • Running on calendar: <strong>{job.googleAccount?.googleEmail}</strong>
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <a
            href={`/api/scheduling-jobs/${jobId}/download-results`}
            className="btn btn-secondary"
            style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
          >
            <Download size={16} /> Download CSV Results
          </a>
        </div>
      </div>

      {/* Progress Cards */}
      <div className="glass-card" style={{ padding: '32px', marginBottom: '40px' }}>
        <h2 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '20px' }}>Scheduling Progress</h2>
        
        {/* Progress bar */}
        <div style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, marginBottom: '8px' }}>
            <span>{progressPercent}% Complete</span>
            <span>
              {processedRows} / {job.totalRows} Rows Processed
            </span>
          </div>
          <div style={{ width: '100%', height: '12px', background: 'var(--muted-dark)', borderRadius: '9999px', overflow: 'hidden', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.5)' }}>
            <div
              style={{
                height: '100%',
                width: `${progressPercent}%`,
                background: job.status === 'completed' ? 'var(--success)' : 'var(--accent-gradient)',
                borderRadius: '9999px',
                transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: progressPercent > 0 ? '0 0 12px rgba(99, 102, 241, 0.5)' : 'none',
              }}
            />
          </div>
        </div>

        {/* Counter cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
          <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--card-border)' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Total meetings</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: '4px', color: 'var(--foreground)' }}>{job.totalRows}</div>
          </div>
          <div style={{ background: 'rgba(16, 185, 129, 0.03)', padding: '16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--success-border)', color: 'var(--success)' }}>
            <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>Scheduled (Invited)</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: '4px' }}>{job.scheduledRows}</div>
          </div>
          <div style={{ background: job.failedRows > 0 ? 'rgba(244,63,94,0.03)' : 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: 'var(--radius-sm)', border: job.failedRows > 0 ? '1px solid var(--danger-border)' : '1px solid var(--card-border)', color: job.failedRows > 0 ? 'var(--danger)' : 'inherit' }}>
            <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>Failed / Invalid</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: '4px' }}>{job.failedRows}</div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--card-border)', color: 'var(--muted)' }}>
            <div style={{ fontSize: '0.8rem' }}>Remaining</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: '4px', color: 'var(--foreground)' }}>
              {job.totalRows - processedRows}
            </div>
          </div>
        </div>
      </div>

      {/* Row results section */}
      <div className="glass-card" style={{ padding: '24px', overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ListFilter size={18} style={{ color: 'var(--primary)' }} />
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Meeting Row Items</h3>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            {['all', 'scheduled', 'failed', 'pending'].map((t) => (
              <button
                key={t}
                onClick={() => setFilter(t)}
                className={`btn ${filter === t ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '6px 14px', fontSize: '0.8rem', textTransform: 'capitalize' }}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="table-container">
          <table className="premium-table">
            <thead>
              <tr>
                <th style={{ width: '60px' }}>Row</th>
                <th>Candidate</th>
                <th>Interviewer</th>
                <th>Meeting Info</th>
                <th>Scheduled Time (UTC)</th>
                <th>Status</th>
                <th>Links & Errors</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: 'var(--muted)' }}>
                    No meeting rows found matching the selected filter.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id}>
                    <td>{row.rowNumber}</td>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--foreground)' }}>{row.candidateEmail}</div>
                    </td>
                    <td>{row.interviewerEmail}</td>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--foreground)' }}>{row.title}</div>
                      {row.googleCalendarEventId && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
                          ID: {row.googleCalendarEventId.substring(0, 16)}...
                        </div>
                      )}
                    </td>
                    <td>
                      {row.status === 'validation_failed' ? (
                        <span style={{ color: 'var(--danger)', fontSize: '0.8rem' }}>Invalid Datetime</span>
                      ) : (
                        new Date(row.startTime).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      )}
                    </td>
                    <td>{getRowStatusBadge(row.status)}</td>
                    <td>
                      {row.status === 'scheduled' && (
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          {row.googleMeetLink && (
                            <a
                              href={row.googleMeetLink}
                              target="_blank"
                              rel="noreferrer"
                              className="btn btn-primary"
                              style={{
                                padding: '4px 8px',
                                fontSize: '0.75rem',
                                borderRadius: '4px',
                                textDecoration: 'none',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                              }}
                            >
                              <Video size={12} /> Google Meet
                            </a>
                          )}
                          {row.googleCalendarHtmlLink && (
                            <a
                              href={row.googleCalendarHtmlLink}
                              target="_blank"
                              rel="noreferrer"
                              className="btn btn-secondary"
                              style={{
                                padding: '4px 8px',
                                fontSize: '0.75rem',
                                borderRadius: '4px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                              }}
                            >
                              Event <ExternalLink size={12} />
                            </a>
                          )}
                        </div>
                      )}

                      {(row.status === 'failed' || row.status === 'validation_failed') && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', color: 'var(--danger)', fontSize: '0.8rem', maxWidth: '280px', overflowWrap: 'break-word' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                            <AlertTriangle size={12} /> Error
                          </div>
                          <span>{row.validationError || row.errorMessage || 'Unknown error'}</span>
                        </div>
                      )}

                      {(row.status === 'queued' || row.status === 'processing') && (
                        <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
                          Processing background queue...
                        </span>
                      )}

                      {row.status === 'pending' && (
                        <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
                          Awaiting queue start...
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
