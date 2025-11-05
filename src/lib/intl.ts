import i18n from '@/i18n';

/**
 * Format a number according to the current language
 */
export function formatNumber(value: number, options?: Intl.NumberFormatOptions): string {
  const locale = getLocale();
  return new Intl.NumberFormat(locale, options).format(value);
}

/**
 * Format currency according to the current language
 */
export function formatCurrency(value: number, currency: string = 'USD'): string {
  const locale = getLocale();
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * Format a date according to the current language
 */
export function formatDate(date: Date | string, options?: Intl.DateTimeFormatOptions): string {
  const locale = getLocale();
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    ...options,
  };
  
  return new Intl.DateTimeFormat(locale, defaultOptions).format(dateObj);
}

/**
 * Format a date with time according to the current language
 */
export function formatDateTime(date: Date | string, options?: Intl.DateTimeFormatOptions): string {
  const locale = getLocale();
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    ...options,
  };
  
  return new Intl.DateTimeFormat(locale, defaultOptions).format(dateObj);
}

/**
 * Format time only according to the current language
 */
export function formatTime(date: Date | string, options?: Intl.DateTimeFormatOptions): string {
  const locale = getLocale();
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  const defaultOptions: Intl.DateTimeFormatOptions = {
    hour: '2-digit',
    minute: '2-digit',
    ...options,
  };
  
  return new Intl.DateTimeFormat(locale, defaultOptions).format(dateObj);
}

/**
 * Format a relative time (e.g., "3 hours ago", "in 2 days")
 */
export function formatRelativeTime(date: Date | string): string {
  const locale = getLocale();
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = dateObj.getTime() - now.getTime();
  const diffSecs = Math.round(diffMs / 1000);
  const diffMins = Math.round(diffSecs / 60);
  const diffHours = Math.round(diffMins / 60);
  const diffDays = Math.round(diffHours / 24);

  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });

  if (Math.abs(diffDays) > 0) {
    return rtf.format(diffDays, 'day');
  } else if (Math.abs(diffHours) > 0) {
    return rtf.format(diffHours, 'hour');
  } else if (Math.abs(diffMins) > 0) {
    return rtf.format(diffMins, 'minute');
  } else {
    return rtf.format(diffSecs, 'second');
  }
}

/**
 * Get the current locale from i18n
 */
function getLocale(): string {
  const lang = i18n.language;
  
  // Map our language codes to proper locales
  const localeMap: Record<string, string> = {
    'ar': 'ar-SA',
    'en': 'en-US',
    'es': 'es-ES',
  };
  
  return localeMap[lang] || 'ar-SA';
}

/**
 * Format percentage
 */
export function formatPercent(value: number, decimals: number = 1): string {
  const locale = getLocale();
  return new Intl.NumberFormat(locale, {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value / 100);
}

/**
 * Format compact numbers (e.g., 1.2K, 3.5M)
 */
export function formatCompactNumber(value: number): string {
  const locale = getLocale();
  return new Intl.NumberFormat(locale, {
    notation: 'compact',
    compactDisplay: 'short',
  }).format(value);
}
