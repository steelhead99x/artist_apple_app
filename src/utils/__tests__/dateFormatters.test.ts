/**
 * Unit tests for date formatting utilities
 */

import {
  formatDate,
  formatLongDate,
  formatTime,
  formatRelativeTime,
  formatDateRange,
} from '../dateFormatters';

describe('dateFormatters', () => {
  // Mock current date for consistent testing
  const MOCK_NOW = new Date('2024-01-15T12:00:00Z');

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(MOCK_NOW);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('formatDate', () => {
    it('should format date string correctly', () => {
      const result = formatDate('2024-01-15T10:30:00Z');
      expect(result).toMatch(/Jan 15, 2024/);
    });

    it('should handle different date formats', () => {
      const result = formatDate('2024-12-25');
      expect(result).toMatch(/Dec 25, 2024/);
    });

    it('should format past dates', () => {
      const result = formatDate('2023-06-10T00:00:00Z');
      expect(result).toMatch(/Jun 10, 2023/);
    });

    it('should format future dates', () => {
      const result = formatDate('2025-03-20T00:00:00Z');
      expect(result).toMatch(/Mar 20, 2025/);
    });
  });

  describe('formatLongDate', () => {
    it('should include weekday in formatted date', () => {
      const result = formatLongDate('2024-01-15T10:30:00Z');
      expect(result).toMatch(/Monday/);
      expect(result).toMatch(/January/);
      expect(result).toMatch(/15/);
      expect(result).toMatch(/2024/);
    });

    it('should handle different dates correctly', () => {
      const result = formatLongDate('2024-07-04T00:00:00Z');
      expect(result).toMatch(/Thursday/);
      expect(result).toMatch(/July/);
    });
  });

  describe('formatTime', () => {
    it('should format ISO datetime to time', () => {
      const result = formatTime('2024-01-15T14:30:00Z');
      expect(result).toMatch(/PM/);
      expect(result).toMatch(/30/);
    });

    it('should return empty string for empty input', () => {
      const result = formatTime('');
      expect(result).toBe('');
    });

    it('should handle time strings without date', () => {
      const result = formatTime('14:30:00');
      // Should attempt to parse and format
      expect(result).toBeTruthy();
    });

    it('should return original string for invalid time', () => {
      const result = formatTime('invalid-time');
      expect(result).toBe('invalid-time');
    });

    it('should handle different time formats', () => {
      const result = formatTime('2024-01-15T09:15:00Z');
      expect(result).toMatch(/AM|PM/);
      expect(result).toMatch(/15/);
    });
  });

  describe('formatRelativeTime', () => {
    it('should return "Just now" for very recent times', () => {
      const thirtySecondsAgo = new Date(MOCK_NOW.getTime() - 30 * 1000).toISOString();
      const result = formatRelativeTime(thirtySecondsAgo);
      expect(result).toBe('Just now');
    });

    it('should return minutes ago for times within an hour', () => {
      const thirtyMinutesAgo = new Date(MOCK_NOW.getTime() - 30 * 60 * 1000).toISOString();
      const result = formatRelativeTime(thirtyMinutesAgo);
      expect(result).toBe('30m ago');
    });

    it('should return hours ago for times within a day', () => {
      const fiveHoursAgo = new Date(MOCK_NOW.getTime() - 5 * 60 * 60 * 1000).toISOString();
      const result = formatRelativeTime(fiveHoursAgo);
      expect(result).toBe('5h ago');
    });

    it('should return "Yesterday" for yesterday', () => {
      const yesterday = new Date(MOCK_NOW.getTime() - 24 * 60 * 60 * 1000).toISOString();
      const result = formatRelativeTime(yesterday);
      expect(result).toBe('Yesterday');
    });

    it('should return days ago for times within a week', () => {
      const threeDaysAgo = new Date(MOCK_NOW.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString();
      const result = formatRelativeTime(threeDaysAgo);
      expect(result).toBe('3d ago');
    });

    it('should return formatted date for older times', () => {
      const twoWeeksAgo = new Date(MOCK_NOW.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString();
      const result = formatRelativeTime(twoWeeksAgo);
      expect(result).toMatch(/Jan|Dec/); // Should be a formatted date
    });
  });

  describe('formatDateRange', () => {
    it('should format same-day range as single date', () => {
      const start = '2024-01-15T10:00:00Z';
      const end = '2024-01-15T18:00:00Z';
      const result = formatDateRange(start, end);
      expect(result).toMatch(/Jan 15, 2024/);
    });

    it('should format range within same month', () => {
      const start = '2024-01-15T10:00:00Z';
      const end = '2024-01-20T18:00:00Z';
      const result = formatDateRange(start, end);
      expect(result).toMatch(/Jan 15.*Jan 20, 2024/);
    });

    it('should format range across different months in same year', () => {
      const start = '2024-01-15T10:00:00Z';
      const end = '2024-03-20T18:00:00Z';
      const result = formatDateRange(start, end);
      expect(result).toMatch(/Jan 15.*Mar 20, 2024/);
    });

    it('should format range across different years', () => {
      const start = '2023-12-28T10:00:00Z';
      const end = '2024-01-05T18:00:00Z';
      const result = formatDateRange(start, end);
      expect(result).toMatch(/Dec 28, 2023.*Jan 5, 2024/);
    });

    it('should handle multi-day events in same month', () => {
      const start = '2024-06-10T09:00:00Z';
      const end = '2024-06-15T17:00:00Z';
      const result = formatDateRange(start, end);
      expect(result).toMatch(/Jun 10.*Jun 15, 2024/);
    });
  });

  describe('edge cases', () => {
    it('formatDate should handle ISO strings', () => {
      const result = formatDate('2024-01-15T10:30:45.123Z');
      expect(result).toMatch(/Jan 15, 2024/);
    });

    it('formatTime should handle milliseconds', () => {
      const result = formatTime('2024-01-15T14:30:45.123Z');
      expect(result).toMatch(/PM/);
    });

    it('formatRelativeTime should handle edge of hour boundary', () => {
      const fiftyNineMinutesAgo = new Date(MOCK_NOW.getTime() - 59 * 60 * 1000).toISOString();
      const result = formatRelativeTime(fiftyNineMinutesAgo);
      expect(result).toBe('59m ago');
    });

    it('formatRelativeTime should handle edge of day boundary', () => {
      const twentyThreeHoursAgo = new Date(MOCK_NOW.getTime() - 23 * 60 * 60 * 1000).toISOString();
      const result = formatRelativeTime(twentyThreeHoursAgo);
      expect(result).toBe('23h ago');
    });
  });
});
