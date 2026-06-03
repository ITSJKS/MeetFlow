// route.ts
// API route to manually create and schedule one or more meetings immediately, supporting bulk manual entries.

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { validateSchedulingRow, RawRowInput } from '@/lib/validation';
import { getSchedulingQueue } from '@/lib/queue';
import crypto from 'crypto';

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
      { error: 'Please connect a Google Calendar before scheduling.' },
      { status: 400 }
    );
  }

  try {
    const body = await request.json();
    let rawItems: any[] = [];
    let jobName = '';

    if (body.rows && Array.isArray(body.rows)) {
      rawItems = body.rows;
      jobName = body.name || `Manual Bulk Job - ${new Date().toLocaleDateString()}`;
    } else {
      rawItems = [body];
      jobName = body.name || `Manual: ${body.title || 'Session'}`;
    }

    // Filter out completely empty manual rows so blank inputs don't fail validation
    const nonMockItems = rawItems.filter((item) => {
      const hasTitle = !!(item.title || '').trim();
      const hasCandidates = !!(item.candidate_emails || '').trim();
      const hasInterviewers = !!(item.interviewer_emails || '').trim();
      return hasTitle || hasCandidates || hasInterviewers;
    });

    if (nonMockItems.length === 0) {
      return NextResponse.json({ error: 'Please fill in details for at least one meeting.' }, { status: 400 });
    }

    // Process and validate all rows
    const rowCreateData = [];
    const validRowsList = [];

    for (let i = 0; i < nonMockItems.length; i++) {
      const item = nonMockItems[i];
      const rowNumber = i + 1;

      const title = (item.title || '').trim();
      const description = (item.description || '').trim();
      const date = (item.date || '').trim();
      const start_time = (item.start_time || '').trim();
      const end_time = (item.end_time || '').trim();
      const timezone = (item.timezone || 'Asia/Kolkata').trim();

      const candidateList = (item.candidate_emails || '')
        .split(',')
        .map((e: string) => e.trim())
        .filter(Boolean);
      const interviewerList = (item.interviewer_emails || '')
        .split(',')
        .map((e: string) => e.trim())
        .filter(Boolean);
      const rawCcList = (item.cc_emails || '')
        .split(',')
        .map((e: string) => e.trim())
        .filter(Boolean);

      if (candidateList.length === 0) {
        return NextResponse.json({ error: `Row ${rowNumber}: Candidate email is required.` }, { status: 400 });
      }
      if (interviewerList.length === 0) {
        return NextResponse.json({ error: `Row ${rowNumber}: Interviewer email is required.` }, { status: 400 });
      }

      const candidateEmail = candidateList[0];
      const interviewerEmail = interviewerList[0];

      const additionalCc = [
        ...candidateList.slice(1),
        ...interviewerList.slice(1),
        ...rawCcList,
      ];

      const rawRowInput: RawRowInput = {
        candidate_email: candidateEmail,
        interviewer_email: interviewerEmail,
        cc_emails: additionalCc.join(','),
        title,
        description: description || undefined,
        date,
        start_time,
        end_time,
        timezone,
        external_id: item.external_id,
        google_meet: item.google_meet === false ? 'false' : 'true',
      };

      // Validate dates/emails
      let validated;
      try {
        validated = validateSchedulingRow(rawRowInput);
      } catch (valErr: any) {
        return NextResponse.json({ error: `Row ${rowNumber}: ${valErr.message}` }, { status: 400 });
      }

      // Compute unique idempotency key
      const idempotencyKey = createIdempotencyKey(
        session.userId,
        validated.candidateEmail,
        validated.interviewerEmail,
        validated.startTime,
        validated.endTime,
        validated.title
      );

      // Prevent duplicate scheduling
      const existingScheduledRow = await prisma.schedulingJobRow.findFirst({
        where: {
          idempotencyKey,
          status: { in: ['scheduled', 'queued', 'processing'] },
        },
      });

      if (existingScheduledRow) {
        return NextResponse.json(
          {
            error: `Row ${rowNumber} ("${title}"): A meeting with the exact same candidate, interviewer, title, and time is already scheduled.`,
          },
          { status: 400 }
        );
      }

      validRowsList.push({
        rowNumber,
        validated,
        idempotencyKey,
      });
    }

    // Create the parent job in database
    const job = await prisma.schedulingJob.create({
      data: {
        userId: session.userId,
        googleAccountId: connectedAccount.id,
        name: jobName.trim(),
        status: 'queued',
        totalRows: validRowsList.length,
        validRows: validRowsList.length,
        startedAt: new Date(),
      },
    });

    // Create all job rows
    const rowsToInsert = validRowsList.map((item) => ({
      jobId: job.id,
      rowNumber: item.rowNumber,
      candidateEmail: item.validated.candidateEmail,
      interviewerEmail: item.validated.interviewerEmail,
      ccEmails: item.validated.ccEmails,
      title: item.validated.title,
      description: item.validated.description,
      timezone: item.validated.timezone,
      startTime: item.validated.startTime,
      endTime: item.validated.endTime,
      status: 'queued',
      idempotencyKey: item.idempotencyKey,
      externalId: item.validated.externalId,
    }));

    await prisma.schedulingJobRow.createMany({
      data: rowsToInsert,
    });

    // Fetch the inserted rows to get their IDs
    const createdRows = await prisma.schedulingJobRow.findMany({
      where: { jobId: job.id },
      orderBy: { rowNumber: 'asc' },
    });

    // Enqueue all items in a single bulk operation in BullMQ
    const queue = getSchedulingQueue();
    const queueJobs = createdRows.map((row) => ({
      name: 'schedule-row',
      data: { rowId: row.id },
      opts: {
        jobId: row.id,
      },
    }));

    await queue.addBulk(queueJobs);

    return NextResponse.json({
      job_id: job.id,
      status: 'queued',
    });
  } catch (err: any) {
    console.error('Manual Scheduling API Error:', err);
    return NextResponse.json({ error: err.message || 'Failed to schedule meetings manually' }, { status: 500 });
  }
}
