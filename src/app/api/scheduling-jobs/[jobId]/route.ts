// route.ts
// Retrieves the summary details and status counters of a scheduling job.

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

  try {
    const job = await prisma.schedulingJob.findUnique({
      where: { id: jobId },
      include: {
        googleAccount: {
          select: {
            googleEmail: true,
          },
        },
      },
    });

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    if (job.userId !== session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(job);
  } catch (err: any) {
    console.error('Fetch job API error:', err);
    return NextResponse.json({ error: 'Failed to fetch job details' }, { status: 500 });
  }
}
