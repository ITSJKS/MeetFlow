// route.ts
// API endpoint to retrieve all meeting rows associated with the user's jobs, used to display items on the visual calendar.

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Fetch all rows where the job belongs to the current user
    const rows = await prisma.schedulingJobRow.findMany({
      where: {
        job: {
          userId: session.userId,
        },
      },
      select: {
        id: true,
        jobId: true,
        title: true,
        description: true,
        startTime: true,
        endTime: true,
        timezone: true,
        status: true,
        candidateEmail: true,
        interviewerEmail: true,
        ccEmails: true,
        googleMeetLink: true,
        googleCalendarHtmlLink: true,
      },
      orderBy: {
        startTime: 'asc',
      },
    });

    return NextResponse.json(rows);
  } catch (err: any) {
    console.error('Fetch events API error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to fetch calendar events' },
      { status: 500 }
    );
  }
}
