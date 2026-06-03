// route.ts
// Retrieves all scheduling jobs created by the authenticated user.

import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const jobs = await prisma.schedulingJob.findMany({
      where: {
        userId: session.userId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(jobs);
  } catch (err: any) {
    console.error('Fetch jobs list API error:', err);
    return NextResponse.json({ error: 'Failed to fetch jobs list' }, { status: 500 });
  }
}
