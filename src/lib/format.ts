/**
 * Display formatting for dates and labels. Dates are shown in UTC, the same
 * calendar the domain filters and buckets in, so a transaction never appears
 * under a different day than the one it is filtered by.
 */
import type { AccountKind, TransactionMethod } from "@/domain/types";

const dateFormat = new Intl.DateTimeFormat("en-US", { timeZone: "UTC", month: "short", day: "numeric", year: "numeric" });
const shortDateFormat = new Intl.DateTimeFormat("en-US", { timeZone: "UTC", month: "short", day: "numeric" });
const monthFormat = new Intl.DateTimeFormat("en-US", { timeZone: "UTC", month: "short", year: "numeric" });
const weekdayFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: "UTC",
  weekday: "long",
  month: "long",
  day: "numeric",
  year: "numeric",
});
const dateTimeFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: "UTC",
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

/** "Nov 6, 2026" */
export function formatDate(iso: string): string {
  return dateFormat.format(new Date(iso));
}

/** "Nov 6" */
export function formatShortDate(iso: string): string {
  return shortDateFormat.format(new Date(iso));
}

/** "Nov 2026" */
export function formatMonth(iso: string): string {
  return monthFormat.format(new Date(iso));
}

/** "Friday, November 6, 2026" */
export function formatLongDate(iso: string): string {
  return weekdayFormat.format(new Date(iso));
}

/** "Nov 6, 2026, 3:04 PM UTC" */
export function formatDateTime(iso: string): string {
  return `${dateTimeFormat.format(new Date(iso))} UTC`;
}

/** `YYYY-MM` → "Aug 2026" */
export function formatYearMonth(yearMonth: string): string {
  return formatMonth(`${yearMonth}-01T00:00:00.000Z`);
}

/** The account's product type, shown next to its name (which already says its purpose). */
export const ACCOUNT_TYPE_LABELS: Record<AccountKind, string> = {
  operating: "Business checking",
  payroll: "Payroll checking",
  reserve: "Reserve savings",
};

export const METHOD_LABELS: Record<TransactionMethod, string> = {
  card: "Card",
  ach: "ACH",
  wire: "Wire",
  check: "Check",
  transfer: "Internal transfer",
  deposit: "Deposit",
  fee: "Bank fee",
};
