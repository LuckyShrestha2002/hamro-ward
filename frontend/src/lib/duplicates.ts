import type { Report } from '../types';

/** Great-circle distance between two lat/lng points, in metres. */
export function distanceMeters(
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number
): number {
  const R = 6371000; // Earth radius in metres
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const lat1 = toRad(aLat);
  const lat2 = toRad(bLat);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Rough text-similarity score (0–1) based on shared words. */
function textSimilarity(a: string, b: string): number {
  const norm = (s: string) =>
    new Set(
      s
        .toLowerCase()
        .replace(/[^a-z0-9ऀ-ॿ\s]/g, ' ')
        .split(/\s+/)
        .filter((w) => w.length > 2)
    );
  const wa = norm(a);
  const wb = norm(b);
  if (wa.size === 0 || wb.size === 0) return 0;
  let shared = 0;
  for (const w of wa) if (wb.has(w)) shared++;
  return shared / Math.min(wa.size, wb.size);
}

export interface DuplicateCandidate {
  category: string;
  ward: string | null;
  latitude: number | null;
  longitude: number | null;
  description: string;
}

export interface SimilarMatch {
  report: Report;
  /** Distance in metres, when both have coordinates. */
  distance: number | null;
  reason: string;
}

const NEARBY_METERS = 150;
const TEXT_THRESHOLD = 0.4;

/**
 * Find existing reports that look like duplicates of the candidate:
 * same category AND (within ~150m by coordinates, OR same ward with a
 * similar description).
 */
export function findSimilarReports(
  candidate: DuplicateCandidate,
  existing: Report[]
): SimilarMatch[] {
  const matches: SimilarMatch[] = [];

  for (const r of existing) {
    if (r.category !== candidate.category) continue;
    if (r.status === 'Resolved') continue; // resolved issues aren't active duplicates

    // 1) Proximity match when both have coordinates.
    if (
      candidate.latitude != null &&
      candidate.longitude != null &&
      r.latitude != null &&
      r.longitude != null
    ) {
      const d = distanceMeters(candidate.latitude, candidate.longitude, r.latitude, r.longitude);
      if (d <= NEARBY_METERS) {
        matches.push({ report: r, distance: Math.round(d), reason: `~${Math.round(d)}m away` });
        continue;
      }
    }

    // 2) Same-ward + similar-description fallback.
    if (candidate.ward && r.ward === candidate.ward) {
      const sim = textSimilarity(candidate.description, r.description_en || '');
      if (sim >= TEXT_THRESHOLD) {
        matches.push({ report: r, distance: null, reason: `similar issue in Ward ${r.ward}` });
      }
    }
  }

  return matches;
}
