// google-calendar.ts
// Handles operations with the Google Calendar API, including automatic token refresh,
// event insertion, attendee invitations, and Google Meet generation.

import { google } from 'googleapis';
import { getGoogleOAuthClient } from './google-oauth';
import { decrypt, encrypt } from './encryption';
import { prisma } from './prisma';

/**
 * Uses the stored refresh token to get a new access token, updates the database, and returns the token.
 */
export async function refreshGoogleAccessToken(googleAccountId: string): Promise<string> {
  const account = await prisma.connectedGoogleAccount.findUnique({
    where: { id: googleAccountId },
  });

  if (!account) {
    throw new Error(`Google account connection not found for ID: ${googleAccountId}`);
  }

  const oauth2Client = getGoogleOAuthClient('calendar');
  const decryptedRefreshToken = decrypt(account.refreshTokenEncrypted);

  oauth2Client.setCredentials({
    refresh_token: decryptedRefreshToken,
  });

  const { credentials } = await oauth2Client.refreshAccessToken();
  const accessToken = credentials.access_token;
  const expiryDate = credentials.expiry_date;

  if (!accessToken || !expiryDate) {
    throw new Error('Failed to retrieve new access token from Google OAuth endpoint.');
  }

  // Save the new access token encrypted
  const encryptedAccessToken = encrypt(accessToken);
  await prisma.connectedGoogleAccount.update({
    where: { id: googleAccountId },
    data: {
      accessTokenEncrypted: encryptedAccessToken,
      tokenExpiry: new Date(expiryDate),
    },
  });

  return accessToken;
}

/**
 * Obtains an authorized Google Calendar client, refreshing the token if expired or close to expiry.
 */
export async function getAuthorizedCalendarClient(googleAccountId: string) {
  const account = await prisma.connectedGoogleAccount.findUnique({
    where: { id: googleAccountId },
  });

  if (!account) {
    throw new Error(`Google account connection not found for ID: ${googleAccountId}`);
  }

  const oauth2Client = getGoogleOAuthClient('calendar');
  let accessToken: string;
  const now = new Date();

  // If the token is expired or within 2 minutes of expiring, refresh it
  if (now.getTime() >= account.tokenExpiry.getTime() - 2 * 60 * 1000) {
    accessToken = await refreshGoogleAccessToken(googleAccountId);
  } else {
    accessToken = decrypt(account.accessTokenEncrypted);
  }

  oauth2Client.setCredentials({
    access_token: accessToken,
    refresh_token: decrypt(account.refreshTokenEncrypted),
  });

  return google.calendar({ version: 'v3', auth: oauth2Client });
}

interface CalendarEventParams {
  title: string;
  description: string | null;
  startTime: Date;
  endTime: Date;
  timezone: string;
  candidateEmail: string;
  interviewerEmail: string;
  ccEmails: string[];
  requestId: string; // Unique string for Google Meet request idempotency
  useGoogleMeet?: boolean; // Set to false to disable Google Meet room creation
}

/**
 * Extracts the first URL from a string description, if present.
 */
function extractUrl(text: string | null): string | null {
  if (!text) return null;
  const urlRegex = /(https?:\/\/[^\s\)\],;\"'\>\<\`]+)/gi;
  const matches = text.match(urlRegex);
  return matches ? matches[0] : null;
}

/**
 * Inserts a Google Calendar event, requests a Google Meet conference link, and registers attendees.
 */
export async function createCalendarEvent(
  googleAccountId: string,
  calendarId: string,
  params: CalendarEventParams
) {
  const calendar = await getAuthorizedCalendarClient(googleAccountId);
  const useMeet = params.useGoogleMeet !== false;

  // Map attendees: candidate, interviewer, and any cc emails
  const attendees = [
    { email: params.candidateEmail },
    { email: params.interviewerEmail },
    ...params.ccEmails.map((email) => ({ email })),
  ];

  const customLink = extractUrl(params.description);

  const eventPayload: any = {
    summary: params.title,
    description: params.description || undefined,
    start: {
      dateTime: params.startTime.toISOString(),
      timeZone: params.timezone,
    },
    end: {
      dateTime: params.endTime.toISOString(),
      timeZone: params.timezone,
    },
    attendees: attendees,
    reminders: {
      useDefault: true,
    },
  };

  // If Google Meet is enabled, request a video room
  if (useMeet) {
    eventPayload.conferenceData = {
      createRequest: {
        requestId: params.requestId,
        conferenceSolutionKey: {
          type: 'hangoutsMeet',
        },
      },
    };
  } else if (customLink) {
    // If Google Meet is disabled and a custom link is in description, set it as the location
    eventPayload.location = customLink;
  }

  const response = await calendar.events.insert({
    calendarId: calendarId || 'primary',
    requestBody: eventPayload,
    conferenceDataVersion: useMeet ? 1 : undefined,
    sendUpdates: 'all', // Send invite emails to all attendees
  });

  const eventId = response.data.id || null;
  const htmlLink = response.data.htmlLink || null;

  let meetLink: string | null = null;
  
  if (useMeet) {
    if (response.data.conferenceData?.entryPoints) {
      const videoEntryPoint = response.data.conferenceData.entryPoints.find(
        (entryPoint) => entryPoint.entryPointType === 'video'
      );
      if (videoEntryPoint) {
        meetLink = videoEntryPoint.uri || null;
      }
    }
  } else {
    // Return the extracted custom link so it appears in the UI and result downloads!
    meetLink = customLink;
  }

  return {
    eventId,
    htmlLink,
    meetLink,
  };
}
