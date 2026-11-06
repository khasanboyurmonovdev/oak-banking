/**
 * UTC calendar helpers. All bucketing and date filtering in the domain is done
 * in UTC so results never depend on the server's or the visitor's time zone.
 */

export const DAY_MS = 24 * 60 * 60 * 1000;

export function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export function addUtcDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

/** Monday 00:00 UTC of the week containing `date`. */
export function startOfUtcWeek(date: Date): Date {
  const day = startOfUtcDay(date);
  const daysSinceMonday = (day.getUTCDay() + 6) % 7;
  return addUtcDays(day, -daysSinceMonday);
}

export function startOfUtcMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

export function addUtcMonths(date: Date, months: number): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, date.getUTCDate()));
}

export function isUtcWeekend(date: Date): boolean {
  const day = date.getUTCDay();
  return day === 0 || day === 6;
}

/** `YYYY-MM-DD` for the UTC calendar day of `date`. */
export function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** True for a real calendar date in `YYYY-MM-DD` form (rejects 2026-02-30). */
export function isIsoDate(value: string): boolean {
  const match = ISO_DATE.exec(value);
  if (!match) return false;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return toIsoDate(date) === value;
}

/** The `n`th (1-based) `weekday` (0 = Sunday) of a UTC month. */
function nthWeekdayOfMonth(year: number, month: number, weekday: number, n: number): Date {
  const first = new Date(Date.UTC(year, month, 1));
  const offset = (weekday - first.getUTCDay() + 7) % 7;
  return new Date(Date.UTC(year, month, 1 + offset + (n - 1) * 7));
}

function lastWeekdayOfMonth(year: number, month: number, weekday: number): Date {
  const last = new Date(Date.UTC(year, month + 1, 0));
  const offset = (last.getUTCDay() - weekday + 7) % 7;
  return new Date(Date.UTC(year, month, last.getUTCDate() - offset));
}

const holidayCache = new Map<number, ReadonlySet<string>>();

/**
 * Observed US federal bank holidays (Federal Reserve schedule) for a year, as
 * `YYYY-MM-DD`. A fixed-date holiday on a Sunday is observed on the Monday
 * after; one on a Saturday is not moved, because banks stay open the Friday
 * before.
 */
export function usBankHolidays(year: number): ReadonlySet<string> {
  const cached = holidayCache.get(year);
  if (cached) return cached;
  const fixed = (month: number, day: number) => {
    const date = new Date(Date.UTC(year, month, day));
    return date.getUTCDay() === 0 ? addUtcDays(date, 1) : date;
  };
  const MONDAY = 1;
  const THURSDAY = 4;
  const holidays = new Set(
    [
      fixed(0, 1), // New Year's Day
      nthWeekdayOfMonth(year, 0, MONDAY, 3), // Birthday of Martin Luther King, Jr.
      nthWeekdayOfMonth(year, 1, MONDAY, 3), // Washington's Birthday
      lastWeekdayOfMonth(year, 4, MONDAY), // Memorial Day
      fixed(5, 19), // Juneteenth
      fixed(6, 4), // Independence Day
      nthWeekdayOfMonth(year, 8, MONDAY, 1), // Labor Day
      nthWeekdayOfMonth(year, 9, MONDAY, 2), // Columbus Day
      fixed(10, 11), // Veterans Day
      nthWeekdayOfMonth(year, 10, THURSDAY, 4), // Thanksgiving Day
      fixed(11, 25), // Christmas Day
    ].map(toIsoDate),
  );
  holidayCache.set(year, holidays);
  return holidays;
}

export function isUsBankHoliday(date: Date): boolean {
  return usBankHolidays(date.getUTCFullYear()).has(toIsoDate(date));
}

/** A weekday that is not a US bank holiday: the only days ACH and wires settle. */
export function isUtcBusinessDay(date: Date): boolean {
  return !isUtcWeekend(date) && !isUsBankHoliday(date);
}
