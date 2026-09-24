import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { formatCurrency as formatCurrencyCentral, DEFAULT_CURRENCY } from './currencies';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatGreeting(name?: string | null): string {
  const hour = new Date().getHours();
  let timeOfDay = 'day';
  if (hour < 12) {
    timeOfDay = 'morning';
  } else if (hour < 18) {
    timeOfDay = 'afternoon';
  } else {
    timeOfDay = 'evening';
  }

  const displayName = name ? name.split(' ')[0] : 'there';
  return `Good ${timeOfDay}, ${displayName}`;
}

export function formatCurrency(amount: number, currency = DEFAULT_CURRENCY): string {
  return formatCurrencyCentral(amount, currency);
}

