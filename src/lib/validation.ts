// validation.ts
// Handles schema-less validation and timezone-aware date conversion for incoming scheduling rows.

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface RawRowInput {
  candidate_email?: string;
  interviewer_email?: string;
  cc_emails?: string; // Comma-separated list
  date?: string;
  start_time?: string;
  end_time?: string;
  title?: string;
  description?: string;
  timezone?: string;
  external_id?: string;
  google_meet?: string; // Optional: Set "false" to skip Google Meet generation and use custom links
}

export interface ValidatedRow {
  candidateEmail: string;
  interviewerEmail: string;
  ccEmails: string[];
  title: string;
  description: string | null;
  timezone: string;
  startTime: Date;
  endTime: Date;
  externalId: string | null;
}

export interface ValidationError {
  rowNumber: number;
  error: string;
}

/**
 * Validates a single timezone name by checking if Intl can instantiate it.
 */
export function isValidTimezone(tz: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/**
 * Parses date ("YYYY-MM-DD") and time ("HH:MM") in a specific timezone to a UTC Date object.
 */
export function parseDateTimeWithTimezone(dateStr: string, timeStr: string, tz: string): Date {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

  if (!dateRegex.test(dateStr)) {
    throw new Error(`Invalid date format "${dateStr}". Expected YYYY-MM-DD`);
  }
  if (!timeRegex.test(timeStr)) {
    throw new Error(`Invalid time format "${timeStr}". Expected HH:MM`);
  }

  const dateParts = dateStr.split('-');
  const timeParts = timeStr.split(':');
  const year = parseInt(dateParts[0], 10);
  const month = parseInt(dateParts[1], 10) - 1;
  const day = parseInt(dateParts[2], 10);
  const hour = parseInt(timeParts[0], 10);
  const minute = parseInt(timeParts[1], 10);

  if (!isValidTimezone(tz)) {
    throw new Error(`Invalid timezone database name: "${tz}"`);
  }

  // Treat inputs as UTC initially to calculate the offset relative to UTC
  const utcDate = new Date(Date.UTC(year, month, day, hour, minute));

  // Determine what the time would be formatted in the target timezone
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false,
  });

  const formattedParts = formatter.formatToParts(utcDate);
  const partMap: Record<string, string> = {};
  formattedParts.forEach((p) => {
    partMap[p.type] = p.value;
  });

  const tzYear = parseInt(partMap.year, 10);
  const tzMonth = parseInt(partMap.month, 10) - 1;
  const tzDay = parseInt(partMap.day, 10);
  const tzHour = parseInt(partMap.hour, 10);
  const tzMinute = parseInt(partMap.minute, 10);

  const tzDateAsUtc = new Date(Date.UTC(tzYear, tzMonth, tzDay, tzHour, tzMinute));
  const offsetMs = tzDateAsUtc.getTime() - utcDate.getTime();

  // Subtract the offset to adjust the mock UTC date into the true UTC date
  return new Date(utcDate.getTime() - offsetMs);
}

/**
 * Validates a raw scheduling row input.
 * Returns either a ValidatedRow or throws an Error with a description.
 */
export function validateSchedulingRow(raw: RawRowInput): ValidatedRow {
  // 1. Validate Emails
  const candidateEmail = (raw.candidate_email || '').trim().toLowerCase();
  if (!candidateEmail) {
    throw new Error('candidate_email is required');
  }
  if (!EMAIL_REGEX.test(candidateEmail)) {
    throw new Error(`Invalid candidate_email format: "${candidateEmail}"`);
  }

  const interviewerEmail = (raw.interviewer_email || '').trim().toLowerCase();
  if (!interviewerEmail) {
    throw new Error('interviewer_email is required');
  }
  if (!EMAIL_REGEX.test(interviewerEmail)) {
    throw new Error(`Invalid interviewer_email format: "${interviewerEmail}"`);
  }

  const ccEmails: string[] = [];
  if (raw.cc_emails) {
    const rawCc = raw.cc_emails.split(',');
    for (const email of rawCc) {
      const trimmed = email.trim().toLowerCase();
      if (trimmed) {
        if (!EMAIL_REGEX.test(trimmed)) {
          throw new Error(`Invalid cc_email format: "${trimmed}"`);
        }
        ccEmails.push(trimmed);
      }
    }
  }

  // 2. Validate Title
  const title = (raw.title || '').trim();
  if (!title) {
    throw new Error('title is required');
  }
  if (title.length > 200) {
    throw new Error('title must be 200 characters or less');
  }

  const description = raw.description ? raw.description.trim() : null;
  const timezone = (raw.timezone || 'Asia/Kolkata').trim();

  // 3. Time Validations
  const dateStr = (raw.date || '').trim();
  if (!dateStr) {
    throw new Error('date is required');
  }
  const startTimeStr = (raw.start_time || '').trim();
  if (!startTimeStr) {
    throw new Error('start_time is required');
  }
  const endTimeStr = (raw.end_time || '').trim();
  if (!endTimeStr) {
    throw new Error('end_time is required');
  }

  let startTime: Date;
  let endTime: Date;

  try {
    startTime = parseDateTimeWithTimezone(dateStr, startTimeStr, timezone);
  } catch (err: any) {
    throw new Error(`Start time validation failed: ${err.message}`);
  }

  try {
    endTime = parseDateTimeWithTimezone(dateStr, endTimeStr, timezone);
  } catch (err: any) {
    throw new Error(`End time validation failed: ${err.message}`);
  }

  if (endTime.getTime() <= startTime.getTime()) {
    throw new Error(`End time (${endTimeStr}) must be chronologically after start time (${startTimeStr})`);
  }

  const durationMinutes = (endTime.getTime() - startTime.getTime()) / (1000 * 60);
  if (durationMinutes === 0) {
    throw new Error('Meeting duration cannot be zero minutes');
  }

  // 4. Parse Google Meet flag
  const rawGoogleMeet = String(raw.google_meet || '').trim().toLowerCase();
  const useGoogleMeet = rawGoogleMeet === '' || ['true', 'yes', '1', 'y'].includes(rawGoogleMeet);

  let externalId = raw.external_id ? raw.external_id.trim() : null;
  if (!useGoogleMeet) {
    externalId = externalId ? `meet:false|ext:${externalId}` : 'meet:false';
  }

  return {
    candidateEmail,
    interviewerEmail,
    ccEmails,
    title,
    description,
    timezone,
    startTime,
    endTime,
    externalId,
  };
}
