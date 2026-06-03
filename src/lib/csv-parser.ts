// csv-parser.ts
// Uses the csv-parse library to parse uploaded CSV text streams into raw JSON records.

import { parse } from 'csv-parse/sync';
import { RawRowInput } from './validation';

/**
 * Parses raw CSV string data into an array of RawRowInput records.
 * Automatically normalizes column names by converting to lower_case and substituting spaces/hyphens with underscores.
 */
export function parseSchedulingCsv(csvContent: string): RawRowInput[] {
  const records = parse(csvContent, {
    columns: (headers: string[]) =>
      headers.map((header) =>
        header
          .trim()
          .toLowerCase()
          .replace(/[-\s]+/g, '_')
      ),
    skip_empty_lines: true,
    trim: true,
    bom: true, // Auto-strip Byte Order Mark if present
  });

  return records as RawRowInput[];
}
