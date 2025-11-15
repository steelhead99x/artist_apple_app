/**
 * Date and Time formatting utilities
 * Centralized formatting functions to maintain consistency across the app
 */

/**
 * Formats a date string to a localized date format
 * @param dateString - ISO date string or date string
 * @returns Formatted date string (e.g., "January 15, 2024")
 */
export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

/**
 * Formats a date string to a long localized date format
 * @param dateString - ISO date string or date string
 * @returns Formatted date string (e.g., "Monday, January 15, 2024")
 */
export const formatLongDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
};

/**
 * Formats a time string to a localized time format
 * @param timeString - Time string or ISO datetime string
 * @returns Formatted time string (e.g., "3:30 PM") or empty string if invalid
 */
export const formatTime = (timeString: string): string => {
  if (!timeString) return '';

  // Handle both full datetime strings and time-only strings
  if (timeString.includes('T') || timeString.includes(':')) {
    const date = new Date(timeString);
    if (!isNaN(date.getTime())) {
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
      });
    }
  }

  return timeString;
};

/**
 * Formats a timestamp to relative time (e.g., "2 hours ago", "yesterday")
 * @param timestamp - ISO datetime string
 * @returns Relative time string
 */
export const formatRelativeTime = (timestamp: string): string => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return 'Just now';
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes}m ago`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours}h ago`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays === 1) {
    return 'Yesterday';
  }

  if (diffInDays < 7) {
    return `${diffInDays}d ago`;
  }

  // For older dates, show the actual date
  return formatDate(timestamp);
};

/**
 * Formats a date range
 * @param startDate - Start date string
 * @param endDate - End date string
 * @returns Formatted date range (e.g., "Jan 15 - Jan 20, 2024")
 */
export const formatDateRange = (startDate: string, endDate: string): string => {
  const start = new Date(startDate);
  const end = new Date(endDate);

  const sameYear = start.getFullYear() === end.getFullYear();
  const sameMonth = sameYear && start.getMonth() === end.getMonth();

  if (sameMonth && start.getDate() === end.getDate()) {
    return formatDate(startDate);
  }

  const startFormatted = start.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    ...(sameYear ? {} : { year: 'numeric' }),
  });

  const endFormatted = end.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return `${startFormatted} - ${endFormatted}`;
};
