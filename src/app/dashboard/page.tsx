// page.tsx
// Renders the main user dashboard showing recent jobs, calendar connection status, and an interactive calendar view.

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Calendar,
  Plus,
  ExternalLink,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  BarChart2,
  ChevronLeft,
  Clock,
  Video,
} from 'lucide-react';

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

interface EventData {
  id: string;
  jobId: string;
  title: string;
  description: string | null;
  startTime: string; // ISO string
  endTime: string; // ISO string
  timezone: string;
  status: string;
  candidateEmail: string;
  interviewerEmail: string;
  ccEmails: string[];
  googleMeetLink: string | null;
  googleCalendarHtmlLink: string | null;
}

export default function Dashboard() {
  const [jobs, setJobs] = useState<JobData[]>([]);
  const [calendar, setCalendar] = useState<CalendarStatus | null>(null);
  const [events, setEvents] = useState<EventData[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Dashboard Tabs: 'jobs' | 'calendar'
  const [activeTab, setActiveTab] = useState<'jobs' | 'calendar'>('jobs');
  
  // Calendar Navigation State
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());

  useEffect(() => {
    async function fetchData() {
      try {
        const [jobsRes, calendarRes, eventsRes] = await Promise.all([
          fetch('/api/scheduling-jobs'),
          fetch('/api/google-calendar/status'),
          fetch('/api/events'),
        ]);

        if (jobsRes.ok) {
          const jobsData = await jobsRes.json();
          setJobs(jobsData);
        }

        if (calendarRes.ok) {
          const calendarData = await calendarRes.json();
          setCalendar(calendarData);
        }

        if (eventsRes.ok) {
          const eventsData = await eventsRes.json();
          setEvents(eventsData);
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

  // Time formatting helper
  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Full date formatter for selected day
  const formatSelectedDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Helper to check if two dates are on the same calendar day
  const isSameDay = (date1: Date, date2: Date) => {
    return (
      date1.getDate() === date2.getDate() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getFullYear() === date2.getFullYear()
    );
  };

  // Calendar logic helpers
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
  };

  const handleToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDate(today);
  };

  // Generate calendar grid days
  const getGridCells = () => {
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    const startDayOfWeek = firstDayOfMonth.getDay(); // 0: Sun, 1: Mon...
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

    const cells: { date: Date; isCurrentMonth: boolean }[] = [];

    // Previous month padding
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      cells.push({
        date: new Date(currentYear, currentMonth - 1, daysInPrevMonth - i),
        isCurrentMonth: false,
      });
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      cells.push({
        date: new Date(currentYear, currentMonth, i),
        isCurrentMonth: true,
      });
    }

    // Next month padding
    const totalCells = cells.length;
    const remainingCells = (7 - (totalCells % 7)) % 7;
    for (let i = 1; i <= remainingCells; i++) {
      cells.push({
        date: new Date(currentYear, currentMonth + 1, i),
        isCurrentMonth: false,
      });
    }

    // Fill to 42 cells (6 rows) to keep height consistent
    while (cells.length < 42) {
      const nextMonthDay = cells.length - totalCells + 1;
      cells.push({
        date: new Date(currentYear, currentMonth + 1, nextMonthDay),
        isCurrentMonth: false,
      });
    }

    return cells;
  };

  const gridCells = getGridCells();
  const monthName = currentDate.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  const selectedDayEvents = events.filter((e) => isSameDay(new Date(e.startTime), selectedDate));

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

      {/* Tab Selector */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--card-border)', marginBottom: '28px', gap: '8px' }}>
        <button
          onClick={() => setActiveTab('jobs')}
          style={{
            padding: '12px 20px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'jobs' ? '2px solid var(--primary)' : '2px solid transparent',
            color: activeTab === 'jobs' ? 'var(--foreground)' : 'var(--muted)',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'var(--transition)',
          }}
        >
          <BarChart2 size={18} />
          Recent Jobs
        </button>
        <button
          onClick={() => setActiveTab('calendar')}
          style={{
            padding: '12px 20px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'calendar' ? '2px solid var(--primary)' : '2px solid transparent',
            color: activeTab === 'calendar' ? 'var(--foreground)' : 'var(--muted)',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'var(--transition)',
          }}
        >
          <Calendar size={18} />
          Calendar Planner
        </button>
      </div>

      {/* Tab Contents */}
      {activeTab === 'jobs' ? (
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
      ) : (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
            <Calendar size={20} style={{ color: 'var(--primary)' }} />
            <h2 style={{ fontSize: '1.4rem', fontWeight: 700 }}>Calendar Planner</h2>
          </div>

          <div style={{ display: 'flex', gap: '28px', flexWrap: 'wrap' }}>
            {/* Calendar Grid card */}
            <div className="glass-card" style={{ flex: '1 1 500px', padding: '24px' }}>
              {/* Header with Navigation Controls */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--foreground)' }}>{monthName}</h3>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={handlePrevMonth} className="btn btn-secondary" style={{ padding: '6px 12px' }}>
                    <ChevronLeft size={16} />
                  </button>
                  <button onClick={handleToday} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.85rem' }}>
                    Today
                  </button>
                  <button onClick={handleNextMonth} className="btn btn-secondary" style={{ padding: '6px 12px' }}>
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>

              {/* Weekday headers */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px', textAlign: 'center', marginBottom: '12px' }}>
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                  <div key={day} style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {day}
                  </div>
                ))}
              </div>

              {/* Day cells grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px' }}>
                {gridCells.map((cell, idx) => {
                  const cellEvents = events.filter((e) => isSameDay(new Date(e.startTime), cell.date));
                  const isSelected = isSameDay(cell.date, selectedDate);
                  const isTodayCell = isSameDay(cell.date, new Date());

                  return (
                    <button
                      key={idx}
                      onClick={() => setSelectedDate(cell.date)}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        minHeight: '80px',
                        padding: '8px',
                        background: isSelected 
                          ? 'rgba(79, 70, 229, 0.08)' 
                          : cell.isCurrentMonth 
                            ? 'var(--card-bg)' 
                            : 'rgba(15, 23, 42, 0.01)',
                        border: isSelected 
                          ? '2px solid var(--primary)' 
                          : '1px solid var(--card-border)',
                        borderRadius: 'var(--radius-sm)',
                        cursor: 'pointer',
                        opacity: cell.isCurrentMonth ? 1 : 0.45,
                        outline: 'none',
                      }}
                      className="calendar-day-btn"
                    >
                      {/* Day number */}
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          fontSize: '0.9rem',
                          fontWeight: isTodayCell ? 700 : 500,
                          color: isTodayCell ? '#ffffff' : 'var(--foreground)',
                          background: isTodayCell ? 'var(--primary)' : 'transparent',
                        }}
                      >
                        {cell.date.getDate()}
                      </span>

                      {/* Event indicators dots */}
                      {cellEvents.length > 0 && (
                        <div style={{ display: 'flex', gap: '3px', marginTop: '6px', flexWrap: 'wrap', justifyContent: 'center' }}>
                          {cellEvents.slice(0, 4).map((ev) => {
                            let dotColor = 'var(--primary)';
                            if (ev.status === 'completed') dotColor = 'var(--success)';
                            else if (ev.status === 'failed') dotColor = 'var(--danger)';
                            else if (ev.status === 'running') dotColor = 'var(--info)';

                            return (
                              <span
                                key={ev.id}
                                style={{
                                  width: '6px',
                                  height: '6px',
                                  borderRadius: '50%',
                                  background: dotColor,
                                }}
                              />
                            );
                          })}
                          {cellEvents.length > 4 && (
                            <span style={{ fontSize: '0.65rem', color: 'var(--muted)', fontWeight: 600 }}>+</span>
                          )}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Selected day details panel */}
            <div className="glass-card" style={{ flex: '1 1 350px', padding: '24px', display: 'flex', flexDirection: 'column', height: 'fit-content', minHeight: '400px' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--foreground)', marginBottom: '4px' }}>
                Selected Day Sessions
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--muted)', marginBottom: '20px' }}>
                {formatSelectedDate(selectedDate)}
              </p>

              {/* Event lists */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flexGrow: 1, overflowY: 'auto' }}>
                {selectedDayEvents.length === 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexGrow: 1, color: 'var(--muted)', textAlign: 'center', padding: '40px 20px' }}>
                    <span style={{ fontSize: '2rem', marginBottom: '12px' }}>📅</span>
                    <p style={{ fontSize: '0.9rem' }}>No meetings scheduled for this day.</p>
                  </div>
                ) : (
                  selectedDayEvents.map((ev) => {
                    // Extract link if bypassed google meet with custom url in description
                    const descLink = ev.description?.match(/https?:\/\/[^\s]+/)?.[0];
                    const joinLink = ev.googleMeetLink || descLink;

                    return (
                      <div
                        key={ev.id}
                        style={{
                          padding: '16px',
                          background: 'var(--muted-dark)',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--card-border)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '12px',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                          <div>
                            <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--foreground)', marginBottom: '4px' }}>
                              {ev.title}
                            </h4>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--muted)' }}>
                              <Clock size={12} />
                              <span>
                                {formatTime(ev.startTime)} - {formatTime(ev.endTime)} ({ev.timezone})
                              </span>
                            </div>
                          </div>
                          <div>
                            {getStatusBadge(ev.status)}
                          </div>
                        </div>

                        {ev.description && (
                          <p style={{ fontSize: '0.8rem', color: 'var(--muted)', margin: 0, whiteSpace: 'pre-wrap', lineHeight: 1.4 }}>
                            {ev.description}
                          </p>
                        )}

                        <div style={{ borderTop: '1px dashed var(--card-border)', paddingTop: '10px', display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.8rem' }}>
                          <div>
                            <span style={{ color: 'var(--muted)' }}>Candidate: </span>
                            <span style={{ fontWeight: 500, color: 'var(--foreground)' }}>{ev.candidateEmail}</span>
                          </div>
                          <div>
                            <span style={{ color: 'var(--muted)' }}>Interviewer: </span>
                            <span style={{ fontWeight: 500, color: 'var(--foreground)' }}>{ev.interviewerEmail}</span>
                          </div>
                          {ev.ccEmails && ev.ccEmails.length > 0 && (
                            <div>
                              <span style={{ color: 'var(--muted)' }}>Attendees: </span>
                              <span style={{ fontWeight: 500, color: 'var(--foreground)' }}>{ev.ccEmails.join(', ')}</span>
                            </div>
                          )}
                        </div>

                        {/* Action buttons */}
                        <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                          {ev.googleMeetLink ? (
                            <a
                              href={ev.googleMeetLink}
                              target="_blank"
                              rel="noreferrer"
                              className="btn btn-primary"
                              style={{
                                flex: 1,
                                padding: '8px 12px',
                                fontSize: '0.8rem',
                                justifyContent: 'center',
                                gap: '6px',
                                textDecoration: 'none',
                              }}
                            >
                              <Video size={14} /> Join Google Meet
                            </a>
                          ) : joinLink ? (
                            <a
                              href={joinLink}
                              target="_blank"
                              rel="noreferrer"
                              className="btn btn-primary"
                              style={{
                                flex: 1,
                                padding: '8px 12px',
                                fontSize: '0.8rem',
                                justifyContent: 'center',
                                gap: '6px',
                                textDecoration: 'none',
                              }}
                            >
                              <ExternalLink size={14} /> Join Session
                            </a>
                          ) : null}

                          {ev.googleCalendarHtmlLink && (
                            <a
                              href={ev.googleCalendarHtmlLink}
                              target="_blank"
                              rel="noreferrer"
                              className="btn btn-secondary"
                              style={{
                                padding: '8px 12px',
                                fontSize: '0.8rem',
                                justifyContent: 'center',
                                textDecoration: 'none',
                              }}
                              title="View in Google Calendar"
                            >
                              <Calendar size={14} />
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
