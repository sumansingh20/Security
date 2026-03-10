import { format as fnsFormat } from 'date-fns';

/**
 * Safely format a date value. Returns fallback string if the value is
 * null, undefined, or produces an invalid Date.
 */
export function safeFormat(
  value: string | number | Date | null | undefined,
  pattern: string,
  fallback: string = '—'
): string {
  if (value == null) return fallback;
  try {
    const date = value instanceof Date ? value : new Date(value);
    if (isNaN(date.getTime())) return fallback;
    return fnsFormat(date, pattern);
  } catch {
    return fallback;
  }
}

/**
 * Safely convert a date value to locale string.
 * Returns fallback if value is null/undefined/invalid.
 */
export function safeToLocaleString(
  value: string | number | Date | null | undefined,
  fallback: string = '—'
): string {
  if (value == null) return fallback;
  try {
    const date = value instanceof Date ? value : new Date(value);
    if (isNaN(date.getTime())) return fallback;
    return date.toLocaleString();
  } catch {
    return fallback;
  }
}

/**
 * Safely convert a date value to locale date string.
 */
export function safeToLocaleDateString(
  value: string | number | Date | null | undefined,
  fallback: string = '—'
): string {
  if (value == null) return fallback;
  try {
    const date = value instanceof Date ? value : new Date(value);
    if (isNaN(date.getTime())) return fallback;
    return date.toLocaleDateString();
  } catch {
    return fallback;
  }
}
