// route.ts
// Handles the Google OAuth redirect callback, verifies the token, upserts the user, and sets the session cookie.

import { NextRequest, NextResponse } from 'next/server';
import { getGoogleOAuthClient } from '@/lib/google-oauth';
import { prisma } from '@/lib/prisma';
import { setSession } from '@/lib/auth';
import { google } from 'googleapis';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  const baseUrl = process.env.APP_BASE_URL || request.url;

  if (error) {
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error)}`, baseUrl));
  }

  if (!code) {
    return NextResponse.redirect(new URL('/login?error=Missing_code', baseUrl));
  }

  try {
    const oauth2Client = getGoogleOAuthClient('auth');
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // Fetch user details from Google userinfo API
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const userInfo = await oauth2.userinfo.get();

    const email = userInfo.data.email;
    const name = userInfo.data.name || null;
    const picture = userInfo.data.picture || null;

    if (!email) {
      return NextResponse.redirect(new URL('/login?error=No_email_received', baseUrl));
    }

    // Register or update user in database
    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          name,
          imageUrl: picture,
        },
      });
    } else {
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          name: name || user.name,
          imageUrl: picture || user.imageUrl,
        },
      });
    }

    // Set secure session cookie
    await setSession({
      userId: user.id,
      email: user.email,
    });

    return NextResponse.redirect(new URL('/dashboard', baseUrl));
  } catch (err: any) {
    console.error('Google Auth Error:', err);
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(err.message || 'auth_failed')}`, baseUrl)
    );
  }
}
