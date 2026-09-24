/**
 * EcomHub OS — Recurring Transactions Calculation & Execution Engine
 * Product: EcomHub OS | Tagline: Your Business, One Hub.
 *
 * Implements:
 * 1. Next Run Date Calculation (Daily, Weekly, Monthly, Quarterly, Yearly)
 * 2. End Date & Auto-Completion boundary checks
 * 3. Idempotency Key & Execution validation to strictly prevent duplicate runs
 * 4. Humanized upcoming countdown labels
 */

import { RecurringFrequency, RecurringStatus, RecurringTransaction, RecurringTransactionRun } from '../types/finance';

/**
 * Standardize frequency string to uppercase format
 */
export function normalizeFrequency(freq: string): RecurringFrequency {
  const lower = freq.toLowerCase().trim();
  switch (lower) {
    case 'daily':
      return 'Daily';
    case 'weekly':
      return 'Weekly';
    case 'bi-weekly':
    case 'biweekly':
      return 'Bi-weekly';
    case 'monthly':
      return 'Monthly';
    case 'quarterly':
      return 'Quarterly';
    case 'yearly':
      return 'Yearly';
    default:
      return 'Monthly';
  }
}

/**
 * User-friendly display format for frequency
 */
export function formatFrequency(freq: string): string {
  const norm = normalizeFrequency(freq);
  switch (norm) {
    case 'Daily':
      return 'Daily';
    case 'Weekly':
      return 'Weekly';
    case 'Bi-weekly':
      return 'Bi-weekly';
    case 'Monthly':
      return 'Monthly';
    case 'Quarterly':
      return 'Quarterly';
    case 'Yearly':
      return 'Yearly';
    default:
      return freq || 'Monthly';
  }
}

/**
 * Checks if a scheduled run date is due on or before today
 */
export function isRunDue(dateStr: string): boolean {
  if (!dateStr) return false;
  const todayStr = new Date().toISOString().split('T')[0];
  return dateStr <= todayStr;
}

/**
 * Calculates number of calendar days between today and target date
 */
export function getDaysUntilNextRun(dateStr: string): number {
  if (!dateStr) return 999;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const parts = dateStr.split('-').map(Number);
  const target = new Date(parts[0], parts[1] - 1, parts[2]);
  target.setHours(0, 0, 0, 0);

  const diffTime = target.getTime() - today.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Format a Date object to YYYY-MM-DD
 */
export function formatToDateString(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Compute the next scheduled execution date after a given date
 */
export function calculateNextRunDate(
  currentDateStr: string,
  frequency: RecurringFrequency,
  endDateStr?: string | null
): { nextRunDate: string; isCompleted: boolean } {
  // Parse base date (use local year, month, day to avoid timezone shifting)
  const parts = (currentDateStr || '').split('-').map(Number);
  const curDate =
    parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])
      ? new Date(parts[0], parts[1] - 1, parts[2])
      : new Date();

  const freq = normalizeFrequency(frequency);
  const nextDate = new Date(curDate.getTime());

  switch (freq) {
    case 'Daily':
      nextDate.setDate(curDate.getDate() + 1);
      break;

    case 'Weekly':
      nextDate.setDate(curDate.getDate() + 7);
      break;

    case 'Monthly': {
      const targetMonth = curDate.getMonth() + 1;
      const originalDay = curDate.getDate();
      nextDate.setMonth(targetMonth);
      // If day overflowed into the subsequent month (e.g. Jan 31 -> Feb 28), adjust to last day of target month
      if (nextDate.getDate() !== originalDay) {
        nextDate.setDate(0); // Last day of previous month
      }
      break;
    }

    case 'Quarterly': {
      const targetMonth = curDate.getMonth() + 3;
      const originalDay = curDate.getDate();
      nextDate.setMonth(targetMonth);
      if (nextDate.getDate() !== originalDay) {
        nextDate.setDate(0);
      }
      break;
    }

    case 'Yearly': {
      const targetYear = curDate.getFullYear() + 1;
      nextDate.setFullYear(targetYear);
      break;
    }
  }

  const nextRunDateStr = formatToDateString(nextDate);

  // Check end_date condition
  if (endDateStr && endDateStr.trim()) {
    if (nextRunDateStr > endDateStr.trim()) {
      return {
        nextRunDate: nextRunDateStr,
        isCompleted: true,
      };
    }
  }

  return {
    nextRunDate: nextRunDateStr,
    isCompleted: false,
  };
}

/**
 * Check whether a scheduled run has already been executed (Idempotency check)
 */
export function hasRunAlreadyExecuted(
  recurringId: string,
  scheduledDate: string,
  runs: RecurringTransactionRun[]
): boolean {
  const normDate = scheduledDate.split('T')[0];
  return runs.some(
    (r) =>
      r.recurring_transaction_id === recurringId &&
      r.scheduled_date === normDate &&
      r.status === 'success'
  );
}

/**
 * Human readable relative days until next run
 */
export function getRelativeRunDescription(dateStr: string): {
  text: string;
  daysDiff: number;
  urgency: 'overdue' | 'due_today' | 'upcoming' | 'future';
} {
  if (!dateStr) {
    return { text: 'Not scheduled', daysDiff: 999, urgency: 'future' };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const parts = dateStr.split('-').map(Number);
  const target = new Date(parts[0], parts[1] - 1, parts[2]);
  target.setHours(0, 0, 0, 0);

  const diffTime = target.getTime() - today.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    const abs = Math.abs(diffDays);
    return {
      text: abs === 1 ? 'Overdue by 1 day' : `Overdue by ${abs} days`,
      daysDiff: diffDays,
      urgency: 'overdue',
    };
  }

  if (diffDays === 0) {
    return { text: 'Due Today', daysDiff: 0, urgency: 'due_today' };
  }

  if (diffDays === 1) {
    return { text: 'Due Tomorrow', daysDiff: 1, urgency: 'upcoming' };
  }

  if (diffDays <= 7) {
    return { text: `Due in ${diffDays} days`, daysDiff: diffDays, urgency: 'upcoming' };
  }

  if (diffDays <= 30) {
    const weeks = Math.round(diffDays / 7);
    return { text: `Due in ${weeks} ${weeks === 1 ? 'week' : 'weeks'}`, daysDiff: diffDays, urgency: 'future' };
  }

  const months = Math.round(diffDays / 30);
  return { text: `Due in ${months} ${months === 1 ? 'month' : 'months'}`, daysDiff: diffDays, urgency: 'future' };
}

/**
 * Centralized list of supported currencies (PKR first)
 */
export const SUPPORTED_CURRENCIES = [
  { code: 'PKR', label: 'PKR — Pakistani Rupee', symbol: 'Rs', defaultRate: 1 },
  { code: 'USD', label: 'USD — US Dollar', symbol: '$', defaultRate: 278.5 },
  { code: 'EUR', label: 'EUR — Euro', symbol: '€', defaultRate: 302.1 },
  { code: 'GBP', label: 'GBP — British Pound', symbol: '£', defaultRate: 353.4 },
  { code: 'CAD', label: 'CAD — Canadian Dollar', symbol: 'CA$', defaultRate: 204.6 },
  { code: 'AUD', label: 'AUD — Australian Dollar', symbol: 'A$', defaultRate: 182.2 },
  { code: 'AED', label: 'AED — UAE Dirham', symbol: 'AED', defaultRate: 75.8 },
  { code: 'SAR', label: 'SAR — Saudi Riyal', symbol: 'SAR', defaultRate: 74.2 },
  { code: 'TRY', label: 'TRY — Turkish Lira', symbol: '₺', defaultRate: 8.4 },
];
