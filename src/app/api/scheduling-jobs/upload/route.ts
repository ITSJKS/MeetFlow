// route.ts
// Accepts CSV files via multipart form upload, parses and validates rows,
// and saves a draft job with rows to the database.

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { parseSchedulingCsv } from '@/lib/csv-parser';
import { validateSchedulingRow, RawRowInput } from '@/lib/validation';
import crypto from 'crypto';

const MAX_ROWS = 500;

/**
 * Generates a unique SHA-256 idempotency key to prevent scheduling duplicates.
 */
function createIdempotencyKey(
  userId: string,
  candidateEmail: string,
  interviewerEmail: string,
  startTime: Date,
  endTime: Date,
  title: string
): string {
  const payload = `${userId}:${candidateEmail}:${interviewerEmail}:${startTime.getTime()}:${endTime.getTime()}:${title}`;
  return crypto.createHash('sha256').update(payload).digest('hex');
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Ensure user has connected a calendar
  const connectedAccount = await prisma.connectedGoogleAccount.findFirst({
    where: { userId: session.userId, isActive: true },
  });
  if (!connectedAccount) {
    return NextResponse.json(
      { error: 'Please connect a Google Calendar before uploading jobs.' },
      { status: 400 }
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const name = formData.get('name') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded.' }, { status: 400 });
    }

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Job name is required.' }, { status: 400 });
    }

    const csvContent = await file.text();
    let rawRows: RawRowInput[];
    try {
      rawRows = parseSchedulingCsv(csvContent);
    } catch (parseErr: any) {
      return NextResponse.json(
        { error: `CSV Parsing failed: ${parseErr.message}` },
        { status: 400 }
      );
    }

    if (rawRows.length === 0) {
      return NextResponse.json({ error: 'The uploaded CSV file is empty.' }, { status: 400 });
    }

    if (rawRows.length > MAX_ROWS) {
      return NextResponse.json(
        { error: `The uploaded CSV file exceeds the limit of ${MAX_ROWS} rows.` },
        { status: 400 }
      );
    }

    const totalRowsCount = rawRows.length;
    let validRowsCount = 0;
    let failedRowsCount = 0;

    // Create the parent job in status "draft"
    const job = await prisma.schedulingJob.create({
      data: {
        userId: session.userId,
        googleAccountId: connectedAccount.id,
        name: name.trim(),
        status: 'draft',
        totalRows: totalRowsCount,
      },
    });

    const rowCreateData = [];

    for (let i = 0; i < rawRows.length; i++) {
      const rawRow = rawRows[i];
      const rowNumber = i + 1;

      try {
        const validated = validateSchedulingRow(rawRow);

        const idempotencyKey = createIdempotencyKey(
          session.userId,
          validated.candidateEmail,
          validated.interviewerEmail,
          validated.startTime,
          validated.endTime,
          validated.title
        );

        rowCreateData.push({
          jobId: job.id,
          rowNumber,
          candidateEmail: validated.candidateEmail,
          interviewerEmail: validated.interviewerEmail,
          ccEmails: validated.ccEmails,
          title: validated.title,
          description: validated.description,
          timezone: validated.timezone,
          startTime: validated.startTime,
          endTime: validated.endTime,
          status: 'pending',
          idempotencyKey,
          externalId: validated.externalId,
        });

        validRowsCount++;
      } catch (err: any) {
        // Save failed rows with defaults so they show up on the review page
        rowCreateData.push({
          jobId: job.id,
          rowNumber,
          candidateEmail: (rawRow.candidate_email || 'missing_email').substring(0, 100),
          interviewerEmail: (rawRow.interviewer_email || 'missing_email').substring(0, 100),
          ccEmails: rawRow.cc_emails ? rawRow.cc_emails.split(',').map((e) => e.trim().substring(0, 100)) : [],
          title: (rawRow.title || 'Missing Title').substring(0, 100),
          description: rawRow.description || null,
          timezone: rawRow.timezone || 'Asia/Kolkata',
          startTime: new Date(0), // Unix epoch placeholder
          endTime: new Date(0),
          status: 'validation_failed',
          validationError: err.message || 'Row validation failed',
          idempotencyKey: `error-${job.id}-${rowNumber}-${crypto.randomBytes(4).toString('hex')}`,
          externalId: rawRow.external_id || null,
        });

        failedRowsCount++;
      }
    }

    // Save job rows in a batch
    await prisma.schedulingJobRow.createMany({
      data: rowCreateData,
    });

    // Update the parent job with count stats
    const updatedJob = await prisma.schedulingJob.update({
      where: { id: job.id },
      data: {
        validRows: validRowsCount,
        failedRows: failedRowsCount,
      },
    });

    return NextResponse.json({
      job_id: updatedJob.id,
      total_rows: updatedJob.totalRows,
      valid_rows: updatedJob.validRows,
      failed_rows: updatedJob.failedRows,
    });
  } catch (err: any) {
    console.error('CSV Job Upload API Error:', err);
    return NextResponse.json({ error: err.message || 'Failed to parse and upload CSV' }, { status: 500 });
  }
}
