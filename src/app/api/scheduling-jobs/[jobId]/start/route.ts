// route.ts
// Starts a scheduling job by updating statuses and enqueuing rows in BullMQ.

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getSchedulingQueue } from '@/lib/queue';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Await the route params for Next.js 15 compatibility
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

    if (job.status !== 'draft') {
      return NextResponse.json(
        { error: `Job has already been started. Current status: ${job.status}` },
        { status: 400 }
      );
    }

    // Load all pending valid rows
    const validRows = await prisma.schedulingJobRow.findMany({
      where: {
        jobId: job.id,
        status: 'pending',
      },
    });

    if (validRows.length === 0) {
      // If there are no rows to process, mark the job completed immediately
      await prisma.schedulingJob.update({
        where: { id: job.id },
        data: {
          status: 'completed',
          startedAt: new Date(),
          completedAt: new Date(),
        },
      });

      return NextResponse.json({
        job_id: job.id,
        status: 'completed',
        message: 'No valid rows to schedule. Job marked completed immediately.',
      });
    }

    // Set job state to queued
    await prisma.schedulingJob.update({
      where: { id: job.id },
      data: {
        status: 'queued',
        startedAt: new Date(),
      },
    });

    // Set valid rows state to queued in the database
    await prisma.schedulingJobRow.updateMany({
      where: {
        jobId: job.id,
        status: 'pending',
      },
      data: {
        status: 'queued',
      },
    });

    // Enqueue all items as a single bulk operation in BullMQ
    const queue = getSchedulingQueue();
    const queueJobs = validRows.map((row) => ({
      name: 'schedule-row',
      data: { rowId: row.id },
      opts: {
        jobId: row.id, // Enforces unique row-level queueing
      },
    }));

    await queue.addBulk(queueJobs);

    return NextResponse.json({
      job_id: job.id,
      status: 'queued',
    });
  } catch (err: any) {
    console.error('Job Start API Error:', err);
    return NextResponse.json({ error: err.message || 'Failed to start job' }, { status: 500 });
  }
}
