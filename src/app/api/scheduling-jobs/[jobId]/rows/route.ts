// route.ts
// Retrieves the individual row-level results of a job, optionally filtered by processing status.

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { jobId } = await params;
  const { searchParams } = new URL(request.url);
  const filter = searchParams.get('filter') || 'all'; // Filters: "all", "scheduled", "failed", "pending"

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

    const whereClause: any = {
      jobId: job.id,
    };

    if (filter === 'scheduled') {
      whereClause.status = 'scheduled';
    } else if (filter === 'failed') {
      whereClause.status = { in: ['failed', 'validation_failed'] };
    } else if (filter === 'pending') {
      whereClause.status = { in: ['pending', 'queued', 'processing'] };
    }

    const rows = await prisma.schedulingJobRow.findMany({
      where: whereClause,
      orderBy: {
        rowNumber: 'asc',
      },
    });

    return NextResponse.json(rows);
  } catch (err: any) {
    console.error('Fetch job rows API error:', err);
    return NextResponse.json({ error: 'Failed to fetch job rows' }, { status: 500 });
  }
}
