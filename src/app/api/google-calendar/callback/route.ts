// route.ts
// Handles the redirect from Google Calendar consent, exchanges authorization code,
// and saves the encrypted token credentials.

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getGoogleOAuthClient } from '@/lib/google-oauth';
import { encrypt } from '@/lib/encryption';
import { prisma } from '@/lib/prisma';
import { google } from 'googleapis';

export async function GET(request: NextRequest) {
  const session = await getSession();
  const baseUrl = process.env.APP_BASE_URL || request.url;

  if (!session) {
    return NextResponse.redirect(new URL('/login?error=Unauthorized', baseUrl));
  }

  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  if (error) {
    return NextResponse.redirect(
      new URL(`/connect-calendar?error=${encodeURIComponent(error)}`, baseUrl)
    );
  }

  // Verify the CSRF state parameter matches the current user's session
  if (state !== session.userId) {
    return NextResponse.redirect(
      new URL('/connect-calendar?error=CSRF_state_mismatch', baseUrl)
    );
  }

  if (!code) {
    return NextResponse.redirect(
      new URL('/connect-calendar?error=Missing_auth_code', baseUrl)
    );
  }

  try {
    const oauth2Client = getGoogleOAuthClient('calendar');
    const { tokens } = await oauth2Client.getToken(code);

    const accessToken = tokens.access_token;
    const refreshToken = tokens.refresh_token;
    const expiryDate = tokens.expiry_date;

    // Check if offline access refresh token is present
    if (!refreshToken) {
      return NextResponse.redirect(
        new URL(
          '/connect-calendar?error=No_refresh_token_returned_Please_disconnect_and_retry',
          baseUrl
        )
      );
    }

    if (!accessToken || !expiryDate) {
      return NextResponse.redirect(
        new URL('/connect-calendar?error=Invalid_tokens', baseUrl)
      );
    }

    // Retrieve the calendar email identity by querying Google Calendar metadata
    oauth2Client.setCredentials(tokens);
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    const calendarMetadata = await calendar.calendars.get({ calendarId: 'primary' });
    const googleEmail = calendarMetadata.data.id || session.email;

    // Encrypt sensitive tokens using AES-256-GCM
    const accessTokenEncrypted = encrypt(accessToken);
    const refreshTokenEncrypted = encrypt(refreshToken);

    // Deactivate previous connected calendar accounts for this user
    await prisma.connectedGoogleAccount.updateMany({
      where: { userId: session.userId, isActive: true },
      data: { isActive: false },
    });

    // Create the new active calendar database connection record
    await prisma.connectedGoogleAccount.create({
      data: {
        userId: session.userId,
        googleEmail,
        calendarId: 'primary',
        accessTokenEncrypted,
        refreshTokenEncrypted,
        tokenExpiry: new Date(expiryDate),
        scopes: tokens.scope ? tokens.scope.split(' ') : ['https://www.googleapis.com/auth/calendar'],
        isActive: true,
      },
    });

    return NextResponse.redirect(new URL('/connect-calendar?success=true', baseUrl));
  } catch (err: any) {
    console.error('Calendar Callback Connect Error:', err);
    return NextResponse.redirect(
      new URL(`/connect-calendar?error=${encodeURIComponent(err.message || 'auth_failed')}`, baseUrl)
    );
  }
}
