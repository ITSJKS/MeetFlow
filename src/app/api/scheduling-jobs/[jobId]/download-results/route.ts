// route.ts
// Generates and downloads a CSV of the scheduling results for a job.

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * Escapes cell content according to CSV rules (handles quotes, commas, and newlines).
 */
function escapeCsvCell(val: any): string {
  if (val === null || val === undefined) {
    return '';
  }
  let str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    str = str.replace(/"/g, '""');
    return `"${str}"`;
  }
  return str;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<any> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { jobId } = await params;

  try {
    const job = await prisma.schedulingJob.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    if (job.userId !== session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rows = await prisma.schedulingJobRow.findMany({
      where: { jobId: job.id },
      orderBy: { rowNumber: 'asc' },
    });

    const csvHeaders = [
      'row_number',
      'candidate_email',
      'interviewer_email',
      'start_time',
      'end_time',
      'title',
      'status',
      'google_calendar_event_id',
      'google_meet_link',
      'error_message',
    ];

    let csvContent = csvHeaders.join(',') + '\n';

    for (const row of rows) {
      // For rows that failed validation, start/end times are placeholder epoch dates (0). Print as blank.
      const startTimeStr = row.startTime.getTime() === 0 ? '' : row.startTime.toISOString();
      const endTimeStr = row.endTime.getTime() === 0 ? '' : row.endTime.toISOString();
      const errorMsg = row.validationError || row.errorMessage || '';

      const csvRow = [
        row.rowNumber,
        row.candidateEmail,
        row.interviewerEmail,
        startTimeStr,
        endTimeStr,
        row.title,
        row.status,
        row.googleCalendarEventId || '',
        row.googleMeetLink || '',
        errorMsg,
      ];

      csvContent += csvRow.map(escapeCsvCell).join(',') + '\n';
    }

    // Format safe file download name
    const safeJobName = job.name.replace(/[^a-zA-Z0-9]/g, '_');
    const filename = `results-${safeJobName}-${jobId.substring(0, 8)}.csv`;

    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (err: any) {
    console.error('Download CSV API Error:', err);
    return NextResponse.json({ error: 'Failed to download CSV results' }, { status: 500 });
  }
}
