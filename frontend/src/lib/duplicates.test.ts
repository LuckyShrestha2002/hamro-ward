import { describe, expect, test } from 'vitest';
import { distanceMeters, findSimilarReports } from './duplicates';
import type { Report } from '../types';

let idSeq = 0;

/** Build a Report with sensible defaults, overriding only what a test cares about. */
function report(p: Partial<Report> = {}): Report {
  return {
    id: `r-${++idSeq}`,
    tracking_id: null,
    category: 'Streetlight',
    severity: 'Low',
    description_en: null,
    description_np: null,
    ward: null,
    municipality: null,
    location: null,
    latitude: null,
    longitude: null,
    reporter_name: null,
    contact: null,
    nibedan: null,
    english_letter: null,
    recommendation: null,
    ai_confidence: null,
    image_url: null,
    status: 'Reported',
    created_at: new Date().toISOString(),
    ...p,
  };
}

describe('distanceMeters (haversine)', () => {
  test('is 0 for the same point', () => {
    expect(distanceMeters(27.7, 85.3, 27.7, 85.3)).toBe(0);
  });

  test('~1.1km for 0.01° of latitude', () => {
    const d = distanceMeters(27.7, 85.3, 27.71, 85.3);
    expect(d).toBeGreaterThan(1000);
    expect(d).toBeLessThan(1200);
  });

  test('is symmetric', () => {
    const a = distanceMeters(27.7, 85.3, 27.72, 85.34);
    const b = distanceMeters(27.72, 85.34, 27.7, 85.3);
    expect(Math.abs(a - b)).toBeLessThan(1e-6);
  });
});

describe('findSimilarReports', () => {
  const candidate = {
    category: 'Streetlight',
    ward: '5',
    latitude: 27.7,
    longitude: 85.3,
    description: 'broken street light near the park',
  };

  test('flags a same-category report within ~150m', () => {
    const existing = [report({ category: 'Streetlight', latitude: 27.7001, longitude: 85.3001 })];
    const matches = findSimilarReports(candidate, existing);
    expect(matches).toHaveLength(1);
    expect(matches[0].distance).toBeGreaterThanOrEqual(0);
  });

  test('ignores a different category nearby', () => {
    const existing = [report({ category: 'Water Supply', latitude: 27.7001, longitude: 85.3001 })];
    expect(findSimilarReports(candidate, existing)).toHaveLength(0);
  });

  test('ignores resolved reports (no longer active duplicates)', () => {
    const existing = [
      report({ category: 'Streetlight', latitude: 27.7001, longitude: 85.3001, status: 'Resolved' }),
    ];
    expect(findSimilarReports(candidate, existing)).toHaveLength(0);
  });

  test('ignores a far-away same-category report', () => {
    const existing = [report({ category: 'Streetlight', latitude: 27.9, longitude: 85.5 })];
    expect(findSimilarReports(candidate, existing)).toHaveLength(0);
  });

  test('flags same-ward report with a similar description (no coordinates)', () => {
    const existing = [
      report({ category: 'Streetlight', ward: '5', description_en: 'broken street light at the park corner' }),
    ];
    const matches = findSimilarReports(candidate, existing);
    expect(matches).toHaveLength(1);
    expect(matches[0].distance).toBeNull();
    expect(matches[0].reason).toContain('Ward 5');
  });

  test('does not flag same-ward report with an unrelated description', () => {
    const existing = [
      report({ category: 'Streetlight', ward: '5', description_en: 'overflowing garbage bins downtown' }),
    ];
    expect(findSimilarReports(candidate, existing)).toHaveLength(0);
  });
});
