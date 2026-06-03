// calendar-scheduling-worker.ts
// Background worker listening to the BullMQ queue to process Google Calendar events.

import 'dotenv/config'; // Load env variables for standalone node runtime
import { Worker, Job } from 'bullmq';
import { prisma } from '../lib/prisma';
import { connectionOptions, QUEUE_NAME } from '../lib/queue';
import { createCalendarEvent } from '../lib/google-calendar';

console.log('Calendar Scheduling Background Worker starting...');

/**
 * Categorizes an error as transient (retryable) or permanent (non-retryable).
 */
function isTransientError(error: any): boolean {
  const msg = String(error.message || '').toLowerCase();
  const status = error.status || error.code;

  // Rate limits (429) or Server side errors (500, 503) are transient
  if (status === 429 || status === 500 || status === 503) {
    return true;
  }

  // Network connection drops
  if (
    msg.includes('timeout') ||
    msg.includes('econnrefused') ||
    msg.includes('enotfound') ||
    msg.includes('etimedout') ||
    msg.includes('network error')
  ) {
    return true;
  }

  return false;
}

/**
 * Checks row counts and updates the parent job status to completed once all rows are done.
 */
async function checkAndFinishParentJob(jobId: string): Promise<void> {
  // Read current metrics from database
  const scheduledCount = await prisma.schedulingJobRow.count({
    where: { jobId, status: 'scheduled' },
  });

  const failedCount = await prisma.schedulingJobRow.count({
    where: { jobId, status: { in: ['failed', 'validation_failed'] } },
  });

  const remainingCount = await prisma.schedulingJobRow.count({
    where: { jobId, status: { in: ['pending', 'queued', 'processing'] } },
  });

  // Keep parent job counts up-to-date
  await prisma.schedulingJob.update({
    where: { id: jobId },
    data: {
      scheduledRows: scheduledCount,
      failedRows: failedCount,
    },
  });

  if (remainingCount === 0) {
    const parentJob = await prisma.schedulingJob.findUnique({
      where: { id: jobId },
    });

    if (
      parentJob &&
      parentJob.status !== 'completed' &&
      parentJob.status !== 'completed_with_errors' &&
      parentJob.status !== 'failed'
    ) {
      const finalStatus = failedCount > 0 ? 'completed_with_errors' : 'completed';
      await prisma.schedulingJob.update({
        where: { id: jobId },
        data: {
          status: finalStatus,
          completedAt: new Date(),
        },
      });
      console.log(`[Job Complete] ID: ${jobId} -> Status: ${finalStatus}`);
    }
  }
}

// Instantiate the BullMQ Worker
const worker = new Worker(
  QUEUE_NAME,
  async (job: Job) => {
    const { rowId } = job.data;
    console.log(`[Processing Job Row] Queue ID: ${job.id}, Row ID: ${rowId}`);

    // 1. Fetch Row details
    const row = await prisma.schedulingJobRow.findUnique({
      where: { id: rowId },
      include: {
        job: {
          include: {
            googleAccount: true,
          },
        },
      },
    });

    if (!row) {
      console.warn(`[Row Warning] Row ID ${rowId} not found in database.`);
      return;
    }

    // 2. Skip if already scheduled
    if (row.status === 'scheduled') {
      console.log(`[Row Skip] Row ID ${rowId} is already scheduled.`);
      return;
    }

    const parentJob = row.job;

    // Transition job status to running if it's currently queued
    if (parentJob.status === 'queued') {
      await prisma.schedulingJob.update({
        where: { id: parentJob.id },
        data: { status: 'running' },
      });
    }

    // Mark row status as processing
    await prisma.schedulingJobRow.update({
      where: { id: rowId },
      data: { status: 'processing' },
    });

    try {
      // 3. Trigger Google Calendar insert
      console.log(`[API Call] Scheduling event "${row.title}" on calendar for ${row.candidateEmail}`);
      
      const useGoogleMeet = !row.externalId?.includes('meet:false');

      const result = await createCalendarEvent(
        parentJob.googleAccountId,
        parentJob.googleAccount.calendarId,
        {
          title: row.title,
          description: row.description,
          startTime: row.startTime,
          endTime: row.endTime,
          timezone: row.timezone,
          candidateEmail: row.candidateEmail,
          interviewerEmail: row.interviewerEmail,
          ccEmails: row.ccEmails,
          requestId: row.id, // Using row UUID as API request ID for calendar-level idempotency
          useGoogleMeet,
        }
      );

      // 4. Update row status to scheduled
      await prisma.schedulingJobRow.update({
        where: { id: rowId },
        data: {
          status: 'scheduled',
          googleCalendarEventId: result.eventId,
          googleCalendarHtmlLink: result.htmlLink,
          googleMeetLink: result.meetLink,
          errorMessage: null,
        },
      });

      console.log(`[Row Success] Row ID ${rowId} scheduled. Meet Link: ${result.meetLink}`);
    } catch (err: any) {
      console.error(`[Row Error] Scheduling failed for Row ID ${rowId}:`, err);

      const isTransient = isTransientError(err);
      const attemptCount = row.attemptCount + 1;

      // Update attempt counters
      await prisma.schedulingJobRow.update({
        where: { id: rowId },
        data: {
          attemptCount,
          lastAttemptAt: new Date(),
        },
      });

      if (isTransient && attemptCount < 3) {
        // Transient error and has retries left: reset state to queued and rethrow to trigger BullMQ retry
        await prisma.schedulingJobRow.update({
          where: { id: rowId },
          data: { status: 'queued', errorMessage: err.message },
        });
        throw err;
      } else {
        // Permanent failure or max retries exceeded: mark row status as failed
        await prisma.schedulingJobRow.update({
          where: { id: rowId },
          data: {
            status: 'failed',
            errorMessage: err.message || 'Unknown processing error',
          },
        });
      }
    } finally {
      // 5. Check if parent job is done
      await checkAndFinishParentJob(parentJob.id);
    }
  },
  {
    connection: connectionOptions,
    concurrency: 2, // Concurrency limit to prevent Google API rate limits (10 concurrent hits/sec)
  }
);

worker.on('active', (job) => {
  console.log(`[Worker Active] Job ${job.id} started.`);
});

worker.on('completed', (job) => {
  console.log(`[Worker Completed] Job ${job.id} processed successfully.`);
});

worker.on('failed', (job, err) => {
  console.error(`[Worker Failed] Job ${job?.id} failed with error:`, err.message);
});
