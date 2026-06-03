// route.ts
// Handles retrieving the connected calendar status and disconnecting it.

import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * Returns current connected calendar details for the session user.
 */
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const account = await prisma.connectedGoogleAccount.findFirst({
      where: {
        userId: session.userId,
        isActive: true,
      },
      select: {
        googleEmail: true,
        calendarId: true,
        createdAt: true,
      },
    });

    if (!account) {
      return NextResponse.json({ connected: false });
    }

    return NextResponse.json({
      connected: true,
      google_email: account.googleEmail,
      calendar_id: account.calendarId,
      connected_at: account.createdAt,
    });
  } catch (err: any) {
    console.error('Fetch calendar status error:', err);
    return NextResponse.json({ error: 'Failed to fetch status' }, { status: 500 });
  }
}

/**
 * Disconnects the active calendar connection by marking it inactive in the database.
 */
export async function DELETE() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await prisma.connectedGoogleAccount.updateMany({
      where: {
        userId: session.userId,
        isActive: true,
      },
      data: {
        isActive: false,
      },
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Disconnect calendar error:', err);
    return NextResponse.json({ error: 'Failed to disconnect calendar' }, { status: 500 });
  }
}
