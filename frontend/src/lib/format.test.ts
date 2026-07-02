import { describe, expect, test } from 'vitest';
import { formatDate, formatDateTime, timeAgo } from './format';

const AGO = (ms: number) => new Date(Date.now() - ms).toISOString();
const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

describe('timeAgo', () => {
  test('"just now" for under a minute', () => {
    expect(timeAgo(AGO(10_000))).toBe('just now');
  });
  test('minutes', () => {
    expect(timeAgo(AGO(5 * MIN))).toBe('5m ago');
  });
  test('hours', () => {
    expect(timeAgo(AGO(2 * HOUR))).toBe('2h ago');
  });
  test('days', () => {
    expect(timeAgo(AGO(3 * DAY))).toBe('3d ago');
  });
  test('returns em-dash for an invalid date', () => {
    expect(timeAgo('not-a-date')).toBe('—');
  });
});

describe('formatDate / formatDateTime', () => {
  test('formatDate renders a valid ISO date', () => {
    expect(formatDate('2026-06-23T10:00:00.000Z')).toMatch(/2026/);
    expect(formatDate('2026-06-23T10:00:00.000Z')).toMatch(/Jun/);
  });
  test('both return em-dash for invalid input', () => {
    expect(formatDate('nope')).toBe('—');
    expect(formatDateTime('nope')).toBe('—');
  });
});
