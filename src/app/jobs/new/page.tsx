// page.tsx
// Renders the New Job creation page, supporting tabbed interfaces for Bulk CSV Upload and Manual Bulk Scheduler.

'use client';

import { useState, useRef, DragEvent, ChangeEvent, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, Download, CheckCircle, AlertTriangle, Play, Trash2, ArrowLeft, FileSpreadsheet, Plus, HelpCircle, X, Info } from 'lucide-react';
import Link from 'next/link';

interface UploadResponse {
  job_id: string;
  total_rows: number;
  valid_rows: number;
  failed_rows: number;
}

interface PreviewRow {
  id: string;
  rowNumber: number;
  candidateEmail: string;
  interviewerEmail: string;
  title: string;
  status: string;
  startTime: string;
  endTime: string;
  validationError: string | null;
}

interface ManualRow {
  id: string;
  title: string;
  candidate_emails: string;
  interviewer_emails: string;
  date: string;
  start_time: string;
  end_time: string;
  description: string;
  google_meet: boolean;
}

const COMMON_TIMEZONES = [
  { value: 'Asia/Kolkata', label: 'Asia/Kolkata (IST - UTC+05:30)' },
  { value: 'UTC', label: 'UTC (GMT - UTC+00:00)' },
  { value: 'America/New_York', label: 'America/New_York (EST/EDT - UTC-05:00)' },
  { value: 'America/Los_Angeles', label: 'America/Los_Angeles (PST/PDT - UTC-08:00)' },
  { value: 'Europe/London', label: 'Europe/London (GMT/BST - UTC+00:00)' },
  { value: 'Asia/Singapore', label: 'Asia/Singapore (SGT - UTC+08:00)' },
  { value: 'Asia/Tokyo', label: 'Asia/Tokyo (JST - UTC+09:00)' },
  { value: 'Australia/Sydney', label: 'Australia/Sydney (AEST/AEDT - UTC+10:00)' },
];

export default function NewJob() {
  const router = useRouter();

  // Navigation tabs
  const [activeTab, setActiveTab] = useState<'csv' | 'manual'>('csv');

  // Guide Modal state
  const [showGuide, setShowGuide] = useState(false);

  // Shared state
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  // ==================== CSV TAB STATE ====================
  const [jobName, setJobName] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadedJob, setUploadedJob] = useState<UploadResponse | null>(null);
  const [previewRows, setPreviewRows] = useState<PreviewRow[]>([]);
  const [showErrorsOnly, setShowErrorsOnly] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ==================== MANUAL TAB STATE ====================
  const createEmptyRow = (): ManualRow => ({
    id: Math.random().toString(36).substring(2, 9),
    title: '',
    candidate_emails: '',
    interviewer_emails: '',
    date: '',
    start_time: '',
    end_time: '',
    description: '',
    google_meet: true,
  });

  const [manualJobName, setManualJobName] = useState(`Manual Bulk Schedule - ${new Date().toLocaleDateString()}`);
  const [globalTimezone, setGlobalTimezone] = useState('Asia/Kolkata');
  const [manualRows, setManualRows] = useState<ManualRow[]>([
    createEmptyRow(),
    createEmptyRow(),
    createEmptyRow(),
    createEmptyRow(),
    createEmptyRow(),
  ]);

  const addManualRow = () => {
    setManualRows([...manualRows, createEmptyRow()]);
  };

  const removeManualRow = (id: string) => {
    if (manualRows.length <= 1) {
      setErrorMsg('You must keep at least one scheduling row.');
      return;
    }
    setManualRows(manualRows.filter((r) => r.id !== id));
  };

  const updateManualRow = (id: string, field: keyof ManualRow, value: string | boolean) => {
    setManualRows(
      manualRows.map((r) => (r.id === id ? { ...r, [field]: value } : r))
    );
  };

  const [copied, setCopied] = useState(false);
  const copyAiPrompt = () => {
    const promptText = `You are an expert data assistant. I have raw, unstructured scheduling data for placement interviews and sessions.
I need you to convert this data into a standardized CSV format with the exact following columns:
candidate_email,interviewer_email,date,start_time,end_time,title,description,timezone,google_meet

CRITICAL REQUIREMENT: You MUST generate this converted data strictly as a downloadable CSV file attachment named 'schedule.csv' (do not just show the text; create a downloadable file/artifact if your platform supports it). Your entire output response must contain only the valid CSV content. Do NOT include any introductions, conversation, summaries, notes, explanations, or formatting wrapper text before or after the CSV.

Rules:
1. candidate_email: A valid email address. If there are multiple candidates for a group session, list them separated by commas.
2. interviewer_email: A valid email address. If there are multiple interviewers for a panel session, list them separated by commas.
3. date: Format as YYYY-MM-DD.
4. start_time and end_time: Format in 24-hour time (HH:MM). Make sure end_time is chronologically after start_time.
5. title: Create a clear and concise title, e.g., "DSA Mock Interview - [Candidate Name]" or "Frontend Evaluation".
6. description: Write a helpful, context-rich meeting description including the agenda, instructions for the candidates, and guidelines. If you wish to use a custom meeting link instead of Google Meet, place the link (e.g. https://my.newtonschool.co/course/8knk0ynm1ain/details?tab=mentor-help) directly in the description.
7. timezone: Set to Asia/Kolkata or the candidate's local timezone.
8. google_meet: Set to "false" if using a custom platform/link in the description (like Newton School). Otherwise, set to "true" or leave blank to automatically create a Google Meet room.

Here is my raw unstructured scheduling data:
[PASTE YOUR RAW DATA HERE]

Generate the downloadable CSV file:`;

    navigator.clipboard.writeText(promptText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // CSV Template Downloader
  const downloadSampleCsv = () => {
    const csvContent =
      'candidate_email,interviewer_email,date,start_time,end_time,title,description,timezone,google_meet\n' +
      'student1@example.com,interviewer1@example.com,2026-06-10,10:00,10:45,Mock Interview,DSA mock interview,Asia/Kolkata,true\n' +
      'student2@example.com,interviewer2@example.com,2026-06-10,11:00,11:45,Newton School Session,Newton School Help Session - Link: https://my.newtonschool.co/course/8knk0ynm1ain/details?tab=mentor-help,Asia/Kolkata,false\n' +
      'student3@example.com,interviewer3@example.com,2026-06-10,12:00,12:30,System Session,System validation testing,Asia/Kolkata,true\n';

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'meetflow_sample_schedule.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // CSV Drag Handlers
  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(true);
  };

  const handleDragLeave = () => {
    setDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.name.endsWith('.csv')) {
        setFile(droppedFile);
        setErrorMsg(null);
      } else {
        setErrorMsg('Please upload a valid .csv file.');
      }
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setErrorMsg(null);
    }
  };

  // CSV Upload Trigger
  const handleUpload = async () => {
    if (!jobName.trim()) {
      setErrorMsg('Please specify a name for this scheduling job.');
      return;
    }
    if (!file) {
      setErrorMsg('Please select or drop a CSV file first.');
      return;
    }

    setUploading(true);
    setErrorMsg(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('name', jobName);

    try {
      const res = await fetch('/api/scheduling-jobs/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to upload job.');
      }

      setUploadedJob(data);

      const rowsRes = await fetch(`/api/scheduling-jobs/${data.job_id}/rows`);
      if (rowsRes.ok) {
        const rowsData = await rowsRes.json();
        setPreviewRows(rowsData);
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setUploading(false);
    }
  };

  // Start CSV Job Trigger
  const handleStartJob = async () => {
    if (!uploadedJob) return;

    setStarting(true);
    setErrorMsg(null);

    try {
      const res = await fetch(`/api/scheduling-jobs/${uploadedJob.job_id}/start`, {
        method: 'POST',
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to start scheduling.');
      }

      router.push(`/jobs/${uploadedJob.job_id}`);
    } catch (err: any) {
      setErrorMsg(err.message);
      setStarting(false);
    }
  };

  // Discard CSV draft
  const handleReset = () => {
    setFile(null);
    setUploadedJob(null);
    setPreviewRows([]);
    setErrorMsg(null);
  };

  // ==================== MANUAL BULK SCHEDULER SUBMIT ====================
  const handleManualBulkSchedule = async (e: FormEvent) => {
    e.preventDefault();

    if (!manualJobName.trim()) {
      setErrorMsg('Job name is required.');
      return;
    }

    // Filter out completely empty rows
    const activeRows = manualRows.filter((r) => {
      return (
        r.title.trim() ||
        r.candidate_emails.trim() ||
        r.interviewer_emails.trim()
      );
    });

    if (activeRows.length === 0) {
      setErrorMsg('Please enter details for at least one meeting.');
      return;
    }

    // Ensure all active rows have the mandatory fields
    for (let i = 0; i < activeRows.length; i++) {
      const row = activeRows[i];
      const index = manualRows.findIndex((r) => r.id === row.id) + 1;

      if (!row.title.trim()) {
        setErrorMsg(`Row ${index}: Title is required.`);
        return;
      }
      if (!row.candidate_emails.trim()) {
        setErrorMsg(`Row ${index}: Candidate email(s) are required.`);
        return;
      }
      if (!row.interviewer_emails.trim()) {
        setErrorMsg(`Row ${index}: Interviewer email(s) are required.`);
        return;
      }
      if (!row.date) {
        setErrorMsg(`Row ${index}: Date is required.`);
        return;
      }
      if (!row.start_time) {
        setErrorMsg(`Row ${index}: Start time is required.`);
        return;
      }
      if (!row.end_time) {
        setErrorMsg(`Row ${index}: End time is required.`);
        return;
      }
    }

    setStarting(true);
    setErrorMsg(null);

    // Apply the global timezone to all manual rows
    const rowsPayload = activeRows.map((r) => ({
      title: r.title.trim(),
      description: r.description.trim() || null,
      date: r.date,
      start_time: r.start_time,
      end_time: r.end_time,
      timezone: globalTimezone,
      candidate_emails: r.candidate_emails,
      interviewer_emails: r.interviewer_emails,
      google_meet: r.google_meet,
    }));

    try {
      const res = await fetch('/api/scheduling-jobs/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: manualJobName.trim(),
          rows: rowsPayload,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to schedule meetings.');
      }

      router.push(`/jobs/${data.job_id}`);
    } catch (err: any) {
      setErrorMsg(err.message);
      setStarting(false);
    }
  };

  const filteredRows = showErrorsOnly
    ? previewRows.filter((r) => r.status === 'validation_failed')
    : previewRows;

  return (
    <div className="container" style={{ paddingTop: '40px', paddingBottom: '80px' }}>
      <div style={{ marginBottom: '24px' }}>
        <Link href="/dashboard" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem', color: 'var(--muted)' }}>
          <ArrowLeft size={16} /> Back to Dashboard
        </Link>
      </div>

      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '6px' }}>Create Scheduling Job</h1>
        <p style={{ marginBottom: '32px' }}>Choose between bulk spreadsheet upload or quick manual scheduling to dispatch calendar events.</p>

        {/* Tab Navigation */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--card-border)', marginBottom: '32px', gap: '24px' }}>
          <button
            onClick={() => {
              if (!uploading && !starting) {
                setActiveTab('csv');
                setErrorMsg(null);
              }
            }}
            disabled={uploading || starting}
            style={{
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'csv' ? '2px solid var(--primary)' : '2px solid transparent',
              padding: '12px 8px',
              fontSize: '1rem',
              fontWeight: 600,
              color: activeTab === 'csv' ? 'var(--foreground)' : 'var(--muted)',
              cursor: 'pointer',
              transition: 'var(--transition)',
              opacity: uploading || starting ? 0.5 : 1,
            }}
          >
            📁 Bulk CSV Upload
          </button>
          <button
            onClick={() => {
              if (!uploading && !starting) {
                setActiveTab('manual');
                setErrorMsg(null);
              }
            }}
            disabled={uploading || starting}
            style={{
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'manual' ? '2px solid var(--primary)' : '2px solid transparent',
              padding: '12px 8px',
              fontSize: '1rem',
              fontWeight: 600,
              color: activeTab === 'manual' ? 'var(--foreground)' : 'var(--muted)',
              cursor: 'pointer',
              transition: 'var(--transition)',
              opacity: uploading || starting ? 0.5 : 1,
            }}
          >
            ✍️ Manual Bulk Scheduler
          </button>
        </div>

        {errorMsg && (
          <div
            style={{
              background: 'var(--danger-light)',
              border: '1px solid var(--danger-border)',
              color: 'var(--danger)',
              padding: '16px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.9rem',
              marginBottom: '24px',
            }}
          >
            <strong>Error:</strong> {errorMsg}
          </div>
        )}

        {/* ==================== TAB 1: CSV LOADER ==================== */}
        {activeTab === 'csv' && (
          <>
            {!uploadedJob ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div className="glass-card" style={{ padding: '32px' }}>
                  <div className="form-group">
                    <label className="form-label">Job Name</label>
                    <input
                      type="text"
                      placeholder="e.g. June Mock Interviews - Batch A"
                      className="form-input"
                      value={jobName}
                      onChange={(e) => setJobName(e.target.value)}
                      disabled={uploading}
                    />
                  </div>

                  <label className="form-label" style={{ marginBottom: '8px', display: 'block' }}>Upload CSV File</label>
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      border: dragging ? '2px dashed var(--primary)' : '2px dashed var(--card-border)',
                      borderRadius: 'var(--radius-md)',
                      padding: '48px 24px',
                      textAlign: 'center',
                      cursor: 'pointer',
                      background: dragging ? 'rgba(99, 102, 241, 0.05)' : 'rgba(255, 255, 255, 0.01)',
                      transition: 'var(--transition)',
                      marginBottom: '24px',
                    }}
                  >
                    <input
                      type="file"
                      ref={fileInputRef}
                      style={{ display: 'none' }}
                      accept=".csv"
                      onChange={handleFileChange}
                    />
                    <div style={{ color: file ? 'var(--success)' : 'var(--muted)', fontSize: '2.5rem', marginBottom: '16px' }}>
                      {file ? <FileSpreadsheet style={{ width: '48px', height: '48px' }} /> : <Upload style={{ width: '48px', height: '48px' }} />}
                    </div>
                    {file ? (
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--foreground)' }}>{file.name}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: '4px' }}>
                          {(file.size / 1024).toFixed(1)} KB • Click to change file
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--foreground)', marginBottom: '4px' }}>
                          Drag & drop your CSV file here, or click to browse
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
                          Maximum 500 rows. Files must end with .csv
                        </div>
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <button
                        type="button"
                        onClick={downloadSampleCsv}
                        className="btn btn-secondary"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                      >
                        <Download size={16} /> Download Template CSV
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowGuide(true)}
                        className="btn btn-secondary"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                      >
                        <HelpCircle size={16} /> CSV Format Guide
                      </button>
                    </div>

                    <button
                      onClick={handleUpload}
                      disabled={uploading || !file || !jobName.trim()}
                      className="btn btn-primary"
                      style={{ minWidth: '150px' }}
                    >
                      {uploading ? (
                        <div className="spinner" style={{ width: '16px', height: '16px' }}></div>
                      ) : (
                        'Validate & Upload'
                      )}
                    </button>
                  </div>
                </div>

                <div style={{ background: 'rgba(99, 102, 241, 0.05)', border: '1px solid rgba(99, 102, 241, 0.2)', padding: '20px', borderRadius: 'var(--radius-md)', textAlign: 'left' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '10px' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      🤖 AI CSV-Converter Helper Prompt
                    </span>
                    <button
                      type="button"
                      onClick={copyAiPrompt}
                      className="btn btn-secondary"
                      style={{ padding: '4px 10px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      {copied ? 'Copied!' : 'Copy AI Prompt'}
                    </button>
                  </div>
                  <p style={{ fontSize: '0.78rem', color: 'var(--muted)', margin: 0, lineHeight: 1.4 }}>
                    Have raw unstructured scheduling data or candidate lists? Copy this helper prompt, paste it into ChatGPT, Claude, or Gemini along with your raw text, and it will automatically generate a download-ready CSV file conforming to all MeetFlow validation rules.
                  </p>
                </div>
              </div>
            ) : (
              <div>
                <div className="glass-card" style={{ padding: '32px', marginBottom: '32px' }}>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '20px' }}>Review Parsed Schedule</h2>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                    <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--card-border)' }}>
                      <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Job Name</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 700, marginTop: '4px' }}>{jobName}</div>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--card-border)' }}>
                      <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Total Rows</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 700, marginTop: '4px' }}>{uploadedJob.total_rows}</div>
                    </div>
                    <div style={{ background: 'rgba(16, 185, 129, 0.05)', padding: '16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--success-border)', color: 'var(--success)' }}>
                      <div style={{ fontSize: '0.8rem', color: 'var(--success)', opacity: 0.8 }}>Ready to Schedule</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 700, marginTop: '4px' }}>{uploadedJob.valid_rows} rows</div>
                    </div>
                    <div style={{ background: uploadedJob.failed_rows > 0 ? 'rgba(244, 63, 94, 0.05)' : 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: 'var(--radius-sm)', border: uploadedJob.failed_rows > 0 ? '1px solid var(--danger-border)' : '1px solid var(--card-border)', color: uploadedJob.failed_rows > 0 ? 'var(--danger)' : 'inherit' }}>
                      <div style={{ fontSize: '0.8rem', color: uploadedJob.failed_rows > 0 ? 'var(--danger)' : 'var(--muted)', opacity: 0.8 }}>Validation Errors</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 700, marginTop: '4px' }}>{uploadedJob.failed_rows} rows</div>
                    </div>
                  </div>

                  {uploadedJob.failed_rows > 0 && (
                    <div
                      style={{
                        background: 'var(--warning-light)',
                        border: '1px solid var(--warning-border)',
                        color: 'var(--warning)',
                        padding: '16px',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.85rem',
                        marginBottom: '24px',
                        display: 'flex',
                        gap: '10px',
                      }}
                    >
                      <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
                      <div>
                        <strong>Warning:</strong> {uploadedJob.failed_rows} row(s) contain validation errors. If you proceed, <strong>only the {uploadedJob.valid_rows} valid rows will be queued and scheduled</strong>. The erroneous rows will be recorded as failures in the logs.
                      </div>
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '16px' }}>
                    <button
                      onClick={handleStartJob}
                      disabled={starting || uploadedJob.valid_rows === 0}
                      className="btn btn-primary"
                      style={{ flex: 2, padding: '12px', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                    >
                      {starting ? (
                        <div className="spinner" style={{ width: '16px', height: '16px' }}></div>
                      ) : (
                        <>
                          <Play size={16} /> Start Scheduling ({uploadedJob.valid_rows} rows)
                        </>
                      )}
                    </button>

                    <button
                      onClick={handleReset}
                      disabled={starting}
                      className="btn btn-secondary"
                      style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                    >
                      <Trash2 size={16} /> Discard & Re-upload
                    </button>
                  </div>
                </div>

                <div className="glass-card" style={{ padding: '24px', overflow: 'hidden' }}>
                  <div style={{ display: 'flex', justifyItems: 'center', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Spreadsheet Rows Preview</h3>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', cursor: 'pointer', color: 'var(--muted)' }}>
                      <input
                        type="checkbox"
                        checked={showErrorsOnly}
                        onChange={(e) => setShowErrorsOnly(e.target.checked)}
                        style={{ cursor: 'pointer' }}
                      />
                      Show validation errors only
                    </label>
                  </div>

                  <div className="table-container">
                    <table className="premium-table">
                      <thead>
                        <tr>
                          <th style={{ width: '60px' }}>Row</th>
                          <th>Candidate Email</th>
                          <th>Interviewer Email</th>
                          <th>Meeting Title</th>
                          <th>Date / Time (UTC)</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredRows.length === 0 ? (
                          <tr>
                            <td colSpan={6} style={{ textAlign: 'center', padding: '32px', color: 'var(--muted)' }}>
                              No matching preview rows found.
                            </td>
                          </tr>
                        ) : (
                          filteredRows.map((row) => (
                            <tr key={row.id}>
                              <td>{row.rowNumber}</td>
                              <td>{row.candidateEmail}</td>
                              <td>{row.interviewerEmail}</td>
                              <td>{row.title}</td>
                              <td>
                                {row.status === 'validation_failed' ? (
                                  <span style={{ color: 'var(--danger)', fontSize: '0.8rem' }}>Invalid DateTime</span>
                                ) : (
                                  new Date(row.startTime).toLocaleString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })
                                )}
                              </td>
                              <td>
                                {row.status === 'validation_failed' ? (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                    <span className="badge badge-failed" style={{ alignSelf: 'flex-start' }}>Error</span>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--danger)', maxWidth: '240px', overflowWrap: 'break-word' }}>
                                      {row.validationError}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="badge badge-draft">Valid</span>
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
            )}
          </>
        )}

        {/* ==================== TAB 2: MANUAL BULK SCHEDULER ==================== */}
        {activeTab === 'manual' && (
          <form onSubmit={handleManualBulkSchedule} className="glass-card" style={{ padding: '32px' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Plus size={20} style={{ color: 'var(--primary)' }} /> Bulk Manual Scheduler
            </h2>

            {/* Global Settings Block */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', padding: '20px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--card-border)', borderRadius: 'var(--radius-sm)', marginBottom: '32px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Job Container Name</label>
                <input
                  type="text"
                  placeholder="e.g. Manual Batch Scheduling - June 10"
                  className="form-input"
                  value={manualJobName}
                  onChange={(e) => setManualJobName(e.target.value)}
                  required
                  disabled={starting}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Timezone (Applied to all rows)</label>
                <select
                  className="form-input"
                  value={globalTimezone}
                  onChange={(e) => setGlobalTimezone(e.target.value)}
                  disabled={starting}
                  style={{ background: 'var(--muted-dark)', cursor: 'pointer' }}
                >
                  {COMMON_TIMEZONES.map((tz) => (
                    <option key={tz.value} value={tz.value}>
                      {tz.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Rows list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', marginBottom: '32px' }}>
              {manualRows.map((row, idx) => (
                <div
                  key={row.id}
                  style={{
                    position: 'relative',
                    padding: '24px 20px',
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid var(--card-border)',
                    borderRadius: 'var(--radius-md)',
                  }}
                >
                  {/* Row Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--primary)' }}>
                      Meeting Row #{idx + 1}
                    </span>
                    {manualRows.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeManualRow(row.id)}
                        disabled={starting}
                        className="btn btn-danger"
                        style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                      >
                        <Trash2 size={12} /> Remove
                      </button>
                    )}
                  </div>

                  {/* Row Inputs Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                    {/* Title */}
                    <div className="form-group" style={{ gridColumn: 'span 2' }}>
                      <input
                        type="text"
                        placeholder="Meeting Title (e.g. DSA Panel Interview)"
                        className="form-input"
                        value={row.title}
                        onChange={(e) => updateManualRow(row.id, 'title', e.target.value)}
                        disabled={starting}
                      />
                    </div>

                    {/* Date */}
                    <div className="form-group">
                      <input
                        type="date"
                        className="form-input"
                        value={row.date}
                        onChange={(e) => updateManualRow(row.id, 'date', e.target.value)}
                        disabled={starting}
                      />
                    </div>

                    {/* Start Time */}
                    <div className="form-group">
                      <input
                        type="time"
                        className="form-input"
                        value={row.start_time}
                        onChange={(e) => updateManualRow(row.id, 'start_time', e.target.value)}
                        disabled={starting}
                      />
                    </div>

                    {/* End Time */}
                    <div className="form-group">
                      <input
                        type="time"
                        className="form-input"
                        value={row.end_time}
                        onChange={(e) => updateManualRow(row.id, 'end_time', e.target.value)}
                        disabled={starting}
                      />
                    </div>

                    {/* Candidates */}
                    <div className="form-group" style={{ gridColumn: 'span 2' }}>
                      <input
                        type="text"
                        placeholder="Candidate Email(s) - e.g. stud1@example.com, stud2@example.com (separated by commas)"
                        className="form-input"
                        value={row.candidate_emails}
                        onChange={(e) => updateManualRow(row.id, 'candidate_emails', e.target.value)}
                        disabled={starting}
                      />
                    </div>

                    {/* Interviewers */}
                    <div className="form-group" style={{ gridColumn: 'span 2' }}>
                      <input
                        type="text"
                        placeholder="Interviewer Email(s) - e.g. host1@company.com, host2@company.com"
                        className="form-input"
                        value={row.interviewer_emails}
                        onChange={(e) => updateManualRow(row.id, 'interviewer_emails', e.target.value)}
                        disabled={starting}
                      />
                    </div>

                    {/* Description */}
                    <div className="form-group" style={{ gridColumn: 'span 2', marginBottom: 0 }}>
                      <input
                        type="text"
                        placeholder="Description / Agenda (Optional) - Include custom URL here if Google Meet is disabled"
                        className="form-input"
                        value={row.description}
                        onChange={(e) => updateManualRow(row.id, 'description', e.target.value)}
                        disabled={starting}
                      />
                    </div>

                    {/* Google Meet Toggle */}
                    <div className="form-group" style={{ gridColumn: 'span 1', display: 'flex', alignItems: 'center', marginBottom: 0 }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem', color: 'var(--muted)' }}>
                        <input
                          type="checkbox"
                          checked={row.google_meet}
                          onChange={(e) => updateManualRow(row.id, 'google_meet', e.target.checked)}
                          disabled={starting}
                          style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                        />
                        Generate Google Meet
                      </label>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button
                type="button"
                onClick={addManualRow}
                disabled={starting}
                className="btn btn-secondary"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <Plus size={16} /> Add Scheduling Row
              </button>

              <button
                type="submit"
                disabled={starting}
                className="btn btn-primary"
                style={{ minWidth: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                {starting ? (
                  <div className="spinner" style={{ width: '16px', height: '16px' }}></div>
                ) : (
                  <>
                    <Play size={16} /> Schedule Meetings ({manualRows.filter(r => r.title.trim() || r.candidate_emails.trim()).length})
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* ==================== FORMAT GUIDE MODAL ==================== */}
      {showGuide && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'rgba(5, 6, 10, 0.8)',
            backdropFilter: 'blur(8px)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
        >
          <div
            className="glass-card"
            style={{
              width: '100%',
              maxWidth: '780px',
              padding: '32px',
              position: 'relative',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
          >
            <button
              onClick={() => setShowGuide(false)}
              style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                background: 'none',
                border: 'none',
                color: 'var(--muted)',
                cursor: 'pointer',
              }}
            >
              <X size={24} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <Info size={24} style={{ color: 'var(--primary)' }} />
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>CSV Upload Format Guide</h2>
            </div>
            
            <p style={{ fontSize: '0.9rem', marginBottom: '24px' }}>
              To ensure successful bulk scheduling, construct your CSV roster precisely according to the rules below. Columns can be in any order, and headers are case-insensitive.
            </p>

            <div className="table-container" style={{ marginBottom: '24px' }}>
              <table className="premium-table" style={{ fontSize: '0.85rem' }}>
                <thead>
                  <tr>
                    <th>Column Header</th>
                    <th>Required</th>
                    <th>Format / Example</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>candidate_email</strong></td>
                    <td><span style={{ color: 'var(--danger)' }}>Yes</span></td>
                    <td><code>stud@example.com</code></td>
                    <td>Primary meeting attendee. Supports comma-separated emails for one-vs-many group invites.</td>
                  </tr>
                  <tr>
                    <td><strong>interviewer_email</strong></td>
                    <td><span style={{ color: 'var(--danger)' }}>Yes</span></td>
                    <td><code>host@company.com</code></td>
                    <td>Primary scheduler. Supports comma-separated panel emails.</td>
                  </tr>
                  <tr>
                    <td><strong>date</strong></td>
                    <td><span style={{ color: 'var(--danger)' }}>Yes</span></td>
                    <td><code>2026-06-10</code></td>
                    <td>ISO Date format: <strong>YYYY-MM-DD</strong>.</td>
                  </tr>
                  <tr>
                    <td><strong>start_time</strong></td>
                    <td><span style={{ color: 'var(--danger)' }}>Yes</span></td>
                    <td><code>14:30</code></td>
                    <td>24-hour time: <strong>HH:MM</strong>.</td>
                  </tr>
                  <tr>
                    <td><strong>end_time</strong></td>
                    <td><span style={{ color: 'var(--danger)' }}>Yes</span></td>
                    <td><code>15:15</code></td>
                    <td>24-hour time: <strong>HH:MM</strong> (must be after start_time).</td>
                  </tr>
                  <tr>
                    <td><strong>title</strong></td>
                    <td><span style={{ color: 'var(--danger)' }}>Yes</span></td>
                    <td><code>Technical Interview</code></td>
                    <td>Meeting summary title (max 200 characters).</td>
                  </tr>
                  <tr>
                    <td><strong>description</strong></td>
                    <td>No</td>
                    <td><code>DSA Mock Interview</code></td>
                    <td>Optional details/agenda. Added to calendar description. If <code>google_meet</code> is false, include custom platform links (e.g. Zoom, Newton School mentor link) here; the URL will be extracted and set as the event location.</td>
                  </tr>
                  <tr>
                    <td><strong>timezone</strong></td>
                    <td>No</td>
                    <td><code>Asia/Kolkata</code></td>
                    <td>Optional database timezone name. Defaults to <strong>Asia/Kolkata</strong>.</td>
                  </tr>
                  <tr>
                    <td><strong>cc_emails</strong></td>
                    <td>No</td>
                    <td><code>admin@example.com</code></td>
                    <td>Optional comma-separated list of additional observers/attendees.</td>
                  </tr>
                  <tr>
                    <td><strong>google_meet</strong></td>
                    <td>No</td>
                    <td><code>false</code></td>
                    <td>Optional flag. Set to <strong>false</strong> to skip Google Meet generation and use custom URLs from the description. Defaults to <strong>true</strong>.</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', justifyItems: 'center', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowGuide(false)} className="btn btn-primary" style={{ padding: '8px 24px' }}>
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
