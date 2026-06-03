// auth.ts
// Handles user session serialization, encryption, and storage in cookies using our existing GCM encryption.

import { cookies } from 'next/headers';
import { encrypt, decrypt } from './encryption';

const SESSION_COOKIE_NAME = 'meetflow_session';

export interface UserSession {
  userId: string;
  email: string;
}

/**
 * Parses and decrypts the session cookie, returning the user session if valid.
 */
export async function getSession(): Promise<UserSession | null> {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(SESSION_COOKIE_NAME);
  if (!cookie || !cookie.value) {
    return null;
  }

  try {
    const decrypted = decrypt(cookie.value);
    return JSON.parse(decrypted) as UserSession;
  } catch {
    return null;
  }
}

/**
 * Encrypts and sets the user session in a secure, HttpOnly cookie valid for 7 days.
 */
export async function setSession(session: UserSession): Promise<void> {
  const cookieStore = await cookies();
  const serialized = JSON.stringify(session);
  const encrypted = encrypt(serialized);

  cookieStore.set(SESSION_COOKIE_NAME, encrypted, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  });
}

/**
 * Removes the session cookie to log the user out.
 */
export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}
