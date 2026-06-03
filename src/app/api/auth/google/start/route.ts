// route.ts
// Initiates the organizer's Google Sign-in flow.

import { NextResponse } from 'next/server';
import { getGoogleOAuthClient } from '@/lib/google-oauth';

export async function GET() {
  const oauth2Client = getGoogleOAuthClient('auth');

  const scopes = [
    'https://www.googleapis.com/auth/userinfo.profile',
    'https://www.googleapis.com/auth/userinfo.email',
    'openid',
  ];

  const authorizationUrl = oauth2Client.generateAuthUrl({
    access_type: 'online', // Login doesn't require background offline updates
    scope: scopes,
    prompt: 'select_account',
  });

  return NextResponse.redirect(authorizationUrl);
}
