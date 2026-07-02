// Fix Leaflet's default marker icons under a bundler (Vite). Without this the
// marker images 404 because Leaflet builds their URLs from a guessed path.
import L from 'leaflet';
import 'leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

// Kathmandu, used as the default map center.
export const KATHMANDU: [number, number] = [27.7172, 85.324];

// CARTO "Positron" (light_all) basemap — a clean, neutral light-gray style
// with no warm/cream tint (unlike Voyager).
export const TILE_URL = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
export const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

const SEVERITY_COLOR: Record<string, string> = {
  Low: '#10b981',
  Medium: '#f59e0b',
  High: '#f43f5e',
};

/**
 * Design-accurate severity palette for the complaints map: a saturated pin
 * color plus a soft tint used behind the matching category icon in the list.
 */
export const MAP_SEVERITY: Record<'High' | 'Medium' | 'Low', { color: string; tint: string }> = {
  High: { color: '#e23744', tint: '#fdecec' },
  Medium: { color: '#e8902a', tint: '#fbf0df' },
  Low: { color: '#1f9d57', tint: '#e8f6ee' },
};

/** Neutral fallback for reports with no severity set. */
export const MAP_SEVERITY_FALLBACK = { color: '#64748b', tint: '#eef2f6' };

/** Resolve a (possibly null) severity string to its map color + tint. */
export function mapSeverity(severity: string | null): { color: string; tint: string } {
  return (severity && MAP_SEVERITY[severity as 'High' | 'Medium' | 'Low']) || MAP_SEVERITY_FALLBACK;
}

/** A modern teardrop pin (CSS in index.css) in a given color. */
export function makePin(color: string): L.DivIcon {
  return L.divIcon({
    className: 'hw-marker',
    html: `<span class="hw-pin" style="background:${color}"></span>`,
    iconSize: [26, 26],
    iconAnchor: [13, 26],
    popupAnchor: [0, -24],
  });
}

/** Pin colored by severity (used on the public complaints map). */
export function severityPin(severity: string | null): L.DivIcon {
  return makePin((severity && SEVERITY_COLOR[severity]) || '#2563eb');
}

function hexToRgba(hex: string, alpha: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}

/**
 * A numbered teardrop pin for the complaints map. The number mirrors the
 * matching sidebar card; the selected pin grows and gains a colored halo so it
 * reads as the active complaint.
 */
export function numberedPin(color: string, num: number, selected: boolean): L.DivIcon {
  const size = selected ? 42 : 32;
  const fontSize = selected ? 15 : 12;
  const shadow = selected
    ? `0 0 0 5px ${hexToRgba(color, 0.22)},0 6px 14px rgba(20,30,50,.35)`
    : '0 2px 6px rgba(20,30,50,.3)';
  const html =
    `<div style="width:${size}px;height:${size}px;border-radius:50% 50% 50% 0;` +
    `transform:rotate(-45deg);background:${color};border:2.5px solid #fff;box-shadow:${shadow};` +
    `display:flex;align-items:center;justify-content:center;">` +
    `<span style="transform:rotate(45deg);color:#fff;font-weight:700;font-size:${fontSize}px;` +
    `font-family:'Plus Jakarta Sans',sans-serif;">${num}</span></div>`;
  return L.divIcon({
    className: 'hw-num-pin',
    html,
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -size + 4],
  });
}

/**
 * A category-emoji pin in a white circle ringed by its priority color, used on
 * the dashboard intelligence map. The selected pin grows and gains a halo.
 */
export function emojiPin(emoji: string, color: string, selected: boolean): L.DivIcon {
  const size = selected ? 44 : 34;
  const halo = selected ? `,0 0 0 6px ${hexToRgba(color, 0.2)}` : '';
  const html =
    `<div style="width:${size}px;height:${size}px;border-radius:50%;background:#fff;` +
    `border:3px solid ${color};box-shadow:0 4px 10px -2px rgba(15,23,42,.4)${halo};` +
    `display:flex;align-items:center;justify-content:center;font-size:${selected ? 20 : 15}px;">${emoji}</div>`;
  return L.divIcon({ html, className: 'hw-num-pin', iconSize: [size, size], iconAnchor: [size / 2, size / 2] });
}

/** Navy bubble shown for a collapsed cluster of nearby complaints. */
export function clusterIcon(count: number): L.DivIcon {
  const html =
    `<div style="width:42px;height:42px;border-radius:50%;background:#16284a;border:3px solid #fff;` +
    `box-shadow:0 3px 8px rgba(20,30,50,.35);display:flex;align-items:center;justify-content:center;` +
    `color:#fff;font-weight:700;font-family:'Plus Jakarta Sans',sans-serif;font-size:15px;">${count}</div>`;
  return L.divIcon({ html, className: 'hw-cluster', iconSize: [42, 42] });
}

/** Blue pin for the location picker. */
export const BLUE_PIN = makePin('#2563eb');
