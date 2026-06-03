// google-oauth.ts
// Configures Google OAuth2 client instances for both authentication and calendar connection.

import { OAuth2Client } from 'google-auth-library';

/**
 * Returns a Google OAuth2Client configured with the correct redirect URI.
 * @param type 'auth' for organizer user login, 'calendar' for calendar permissions.
 */
export function getGoogleOAuthClient(type: 'auth' | 'calendar'): OAuth2Client {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri =
    type === 'auth'
      ? process.env.GOOGLE_REDIRECT_URI
      : process.env.GOOGLE_CALENDAR_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error(
      `Google OAuth configuration missing: clientId=${!!clientId}, clientSecret=${!!clientSecret}, redirectUri=${type}`
    );
  }

  return new OAuth2Client(clientId, clientSecret, redirectUri);
}
