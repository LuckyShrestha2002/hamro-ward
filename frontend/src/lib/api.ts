// Small fetch helpers for the AI backend endpoints.
import type { Detection, Recommendation } from '../types';

export interface ImagePayload {
  base64: string;
  mediaType: string;
  dataUrl: string;
}

/**
 * Read a File as a data URL and split it into { base64, mediaType }.
 * The base64 has the `data:...;base64,` prefix stripped.
 */
export function fileToBase64(file: File): Promise<ImagePayload> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result); // e.g. "data:image/jpeg;base64,...."
      const [meta, base64] = dataUrl.split(',');
      const mediaType = meta.match(/data:(.*?);base64/)?.[1] || file.type || 'image/jpeg';
      resolve({ base64, mediaType, dataUrl });
    };
    reader.onerror = () => reject(new Error('Could not read the image file.'));
    reader.readAsDataURL(file);
  });
}

async function postJSON<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { error?: string })?.error || `Request failed (${res.status}).`);
  }
  return data as T;
}

export function categorizeImage(payload: { base64: string; mediaType: string }): Promise<Detection> {
  return postJSON<Detection>('/api/categorize', payload);
}

export type LetterLanguage = 'np' | 'en';

export interface NibedanDetails {
  category: string;
  location: string;
  ward: string;
  municipality: string;
  citizenName: string;
  contact: string;
  extra: string;
  language?: LetterLanguage;
}

export function generateNibedan(details: NibedanDetails): Promise<{ nibedan: string }> {
  return postJSON<{ nibedan: string }>('/api/nibedan', details);
}

export function getRecommendation(input: {
  category: string;
  severity: string;
  description: string;
}): Promise<Recommendation> {
  return postJSON<Recommendation>('/api/recommend', input);
}

export interface ReverseGeocodeResult {
  municipality: string | null;
  ward: string | null;
  display: string | null;
}

export async function reverseGeocode(lat: number, lng: number): Promise<ReverseGeocodeResult> {
  const res = await fetch(`/api/reverse-geocode?lat=${lat}&lon=${lng}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string })?.error || 'Reverse geocoding failed.');
  return data as ReverseGeocodeResult;
}
