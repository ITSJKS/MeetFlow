// route.ts
// Redirects the authenticated user to Google OAuth to request Calendar read/write access.

import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getGoogleOAuthClient } from '@/lib/google-oauth';

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const oauth2Client = getGoogleOAuthClient('calendar');

  const scopes = [
    'https://www.googleapis.com/auth/calendar',
  ];

  // Request offline access so Google returns a refresh token.
  // prompt: 'consent' forces Google to show the consent dialog and issue the refresh token.
  const authorizationUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    include_granted_scopes: true,
    prompt: 'consent',
    state: session.userId, // CSRF protection: binds the request to the logged-in session
  });

  return NextResponse.redirect(authorizationUrl);
}
