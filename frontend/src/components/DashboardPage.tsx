import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import {
  KATHMANDU,
  TILE_URL,
  TILE_ATTRIBUTION,
  emojiPin,
  clusterIcon,
} from '../lib/leafletSetup';
import { computeAnalytics } from '../lib/analytics';
import { MUNICIPALITIES } from '../data/wards';
import { timeAgo, formatDateTime } from '../lib/format';
import StatusBadge from './ui/StatusBadge';
import EmptyState from './ui/EmptyState';
import Skeleton from './ui/Skeleton';
import type { Report, ReportStatus } from '../types';
import type { UseReports } from '../hooks/useReports';

const NAVY = '#1a365d';

/** Color + emoji per category, for donut segments, legend, map pins and cards. */
const CAT_STYLE: Record<string, { color: string; emoji: string }> = {
  'Pothole / Road': { color: '#8b5cf6', emoji: '🛠️' },
  Streetlight: { color: '#f59e0b', emoji: '💡' },
  'Water Supply': { color: '#3b82f6', emoji: '🚰' },
  'Waste Management': { color: '#10b981', emoji: '🗑️' },
  Other: { color: '#64748b', emoji: '📌' },
};
const catStyle = (c: string) => CAT_STYLE[c] ?? CAT_STYLE.Other;

/** Priority (severity) colors, shared by pins, dots and the drawer. */
const PRIO: Record<string, string> = { High: '#ef4444', Medium: '#f59e0b', Low: '#10b981' };
const prioColor = (s: string | null) => (s && PRIO[s]) || '#64748b';

const STATUS_FILTERS: ReportStatus[] = ['Reported', 'Under Review', 'In Progress', 'Resolved'];

interface Filters {
  muni: string;
  ward: string;
  cat: string;
  status: string;
  range: string;
  q: string;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] as string);
}

/** Material Symbol glyph. */
function Icon({ name, className = '', filled = false }: { name: string; className?: string; filled?: boolean }) {
  return (
    <span aria-hidden className={`material-symbols-outlined ${filled ? 'filled' : ''} ${className}`}>
      {name}
    </span>
  );
}

/** Counts per calendar month (last N months) for reports matching `pred`. */
function monthlySeries(reports: Report[], pred: (r: Report) => boolean, months = 6): number[] {
  const now = new Date();
  const buckets = new Array(months).fill(0);
  const idx = new Map<string, number>();
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    idx.set(`${d.getFullYear()}-${d.getMonth()}`, months - 1 - i);
  }
  for (const r of reports) {
    if (!pred(r)) continue;
    const d = new Date(r.created_at);
    if (Number.isNaN(d.getTime())) continue;
    const i = idx.get(`${d.getFullYear()}-${d.getMonth()}`);
    if (i !== undefined) buckets[i]++;
  }
  return buckets;
}

function sparkPath(series: number[], w = 62, h = 24): string {
  if (!series.length) return '';
  const max = Math.max(1, ...series);
  const step = series.length > 1 ? w / (series.length - 1) : 0;
  return series
    .map((v, i) => `${i === 0 ? 'M' : 'L'}${(i * step).toFixed(1)} ${(h - (v / max) * (h - 3) - 1.5).toFixed(1)}`)
    .join(' ');
}

function exportCsv(reports: Report[]) {
  const head = ['tracking_id', 'category', 'severity', 'ward', 'status', 'created_at'];
  const rows = reports.map((r) =>
    [r.tracking_id, r.category, r.severity, r.ward, r.status, r.created_at]
      .map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`)
      .join(','),
  );
  const blob = new Blob([[head.join(','), ...rows].join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'hamro-ward-reports.csv';
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Renders the located complaints into a Leaflet markercluster group and drives
 * the map: fitting to visible pins, restyling the selected pin and revealing it.
 */
function ClusterLayer({
  reports,
  selected,
  onSelect,
  mapRef,
}: {
  reports: Report[];
  selected: string | null;
  onSelect: (id: string) => void;
  mapRef: React.MutableRefObject<L.Map | null>;
}) {
  const map = useMap();
  const clusterRef = useRef<L.MarkerClusterGroup | null>(null);
  const markersRef = useRef<Record<string, L.Marker>>({});
  const idsKey = reports.map((r) => r.id).join(',');

  useEffect(() => {
    mapRef.current = map;
    const cluster = L.markerClusterGroup({
      showCoverageOnHover: false,
      maxClusterRadius: 46,
      iconCreateFunction: (cl) => clusterIcon(cl.getChildCount()),
    });
    clusterRef.current = cluster;
    map.addLayer(cluster);
    const t = setTimeout(() => map.invalidateSize(), 220);
    return () => {
      clearTimeout(t);
      map.removeLayer(cluster);
      clusterRef.current = null;
    };
  }, [map, mapRef]);

  useEffect(() => {
    const cluster = clusterRef.current;
    if (!cluster) return;
    cluster.clearLayers();
    markersRef.current = {};
    reports.forEach((r) => {
      const marker = L.marker([r.latitude!, r.longitude!], {
        icon: emojiPin(catStyle(r.category).emoji, prioColor(r.severity), r.id === selected),
      });
      marker.on('click', () => onSelect(r.id));
      marker.bindTooltip(`<b>${escapeHtml(r.category)}</b><br>Ward ${escapeHtml(r.ward ?? '—')}`, {
        direction: 'top',
        offset: [0, -16],
      });
      markersRef.current[r.id] = marker;
      cluster.addLayer(marker);
    });
    if (!selected && reports.length) {
      if (reports.length === 1) map.setView([reports[0].latitude!, reports[0].longitude!], 15);
      else map.fitBounds(reports.map((r) => [r.latitude!, r.longitude!]) as [number, number][], { padding: [50, 50] });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey]);

  useEffect(() => {
    reports.forEach((r) => {
      const marker = markersRef.current[r.id];
      if (marker) marker.setIcon(emojiPin(catStyle(r.category).emoji, prioColor(r.severity), r.id === selected));
    });
    const cluster = clusterRef.current;
    const marker = selected ? markersRef.current[selected] : null;
    if (cluster && marker) cluster.zoomToShowLayer(marker, () => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  return null;
}

export default function DashboardPage({ reports }: { reports: UseReports }) {
  const [filters, setFilters] = useState<Filters>({
    muni: 'All',
    ward: 'all',
    cat: 'all',
    status: 'all',
    range: 'all',
    q: '',
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const mapRef = useRef<L.Map | null>(null);

  const set = (k: keyof Filters, v: string) => setFilters((f) => ({ ...f, [k]: v }));

  const filtered = useMemo(() => {
    const q = filters.q.trim().toLowerCase();
    const now = Date.now();
    const rangeDays: Record<string, number> = { '7d': 7, '30d': 30, '90d': 90 };
    return reports.reports.filter((r) => {
      if (filters.muni !== 'All' && r.municipality !== filters.muni) return false;
      if (filters.ward !== 'all' && r.ward !== filters.ward) return false;
      if (filters.cat !== 'all' && r.category !== filters.cat) return false;
      if (filters.status !== 'all' && r.status !== filters.status) return false;
      if (filters.range !== 'all') {
        const d = rangeDays[filters.range];
        if (d && now - new Date(r.created_at).getTime() > d * 86400000) return false;
      }
      if (q) {
        const hay = `${r.category} ${r.ward ?? ''} ${r.municipality ?? ''} ${r.location ?? ''} ${r.tracking_id ?? ''} ${r.reporter_name ?? ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [reports.reports, filters]);

  const a = useMemo(() => computeAnalytics(filtered), [filtered]);
  const highCount = useMemo(() => filtered.filter((r) => r.severity === 'High').length, [filtered]);
  const located = useMemo(
    () => filtered.filter((r) => r.latitude != null && r.longitude != null),
    [filtered],
  );

  // Ward activity ranking (from the current filtered view).
  const wardRank = useMemo(() => {
    const counts = new Map<string, number>();
    filtered.forEach((r) => {
      if (!r.ward) return;
      counts.set(r.ward, (counts.get(r.ward) ?? 0) + 1);
    });
    const arr = [...counts.entries()].map(([ward, count]) => ({ ward, count }));
    arr.sort((x, y) => y.count - x.count);
    const max = Math.max(1, ...arr.map((w) => w.count));
    return arr.slice(0, 6).map((w, i) => ({
      ...w,
      rank: i + 1,
      pct: Math.round((w.count / max) * 100),
      color: i === 0 ? '#ef4444' : i === 1 ? '#f59e0b' : NAVY,
      hot: i === 0,
    }));
  }, [filtered]);

  // Donut segments (categories present in the view).
  const donut = useMemo(() => {
    const total = a.total;
    const C = 2 * Math.PI * 54;
    let cum = 0;
    const segs = a.byCategory.map((c) => {
      const frac = total ? c.value / total : 0;
      const dash = frac * C;
      const seg = { color: catStyle(c.name).color, dash: `${dash} ${C - dash}`, offset: -cum * C };
      cum += frac;
      return seg;
    });
    const legend = a.byCategory.map((c) => ({
      name: c.name,
      value: c.value,
      pct: total ? Math.round((c.value / total) * 100) : 0,
      ...catStyle(c.name),
    }));
    return { segs, legend, total };
  }, [a]);

  // Derived "AI" summary — grounded entirely in the filtered reports.
  const insight = useMemo(() => {
    const top = [...a.byCategory].sort((x, y) => y.value - x.value)[0];
    const hot = wardRank[0];
    const pendingInHot = hot ? filtered.filter((r) => r.ward === hot.ward && r.status !== 'Resolved').length : 0;
    return {
      top,
      topPct: top && a.total ? Math.round((top.value / a.total) * 100) : 0,
      hot,
      pendingInHot,
    };
  }, [a, wardRank, filtered]);

  const recent = useMemo(
    () => [...filtered].sort((x, y) => +new Date(y.created_at) - +new Date(x.created_at)).slice(0, 8),
    [filtered],
  );

  const selected = useMemo(
    () => reports.reports.find((r) => r.id === selectedId) ?? null,
    [reports.reports, selectedId],
  );

  const openComplaint = (id: string) => {
    setSelectedId(id);
    setDrawerOpen(true);
    const r = reports.reports.find((x) => x.id === id);
    if (r?.latitude != null && r.longitude != null && mapRef.current) {
      mapRef.current.panTo([r.latitude, r.longitude], { animate: true, duration: 0.5 });
    }
  };

  const activeCount =
    (['ward', 'cat', 'status', 'range'] as const).filter((k) => filters[k] !== 'all').length + (filters.q ? 1 : 0);

  const kpis = [
    { label: 'Total Complaints', value: a.total, sub: 'across all wards', icon: 'chat_bubble', tint: '#dce9ff', color: NAVY, series: monthlySeries(filtered, () => true), stroke: NAVY },
    { label: 'Pending', value: a.pending, sub: 'awaiting resolution', icon: 'pending_actions', tint: '#fef3c7', color: '#b45309', series: monthlySeries(filtered, (r) => r.status !== 'Resolved'), stroke: '#f59e0b' },
    { label: 'Resolved', value: a.resolved, sub: `${a.resolutionRate}% resolution rate`, icon: 'check_circle', tint: '#d1fae5', color: '#047857', series: monthlySeries(filtered, (r) => r.status === 'Resolved'), stroke: '#10b981' },
    { label: 'High Priority', value: highCount, sub: 'needs urgent action', icon: 'warning', tint: '#fee2e2', color: '#b91c1c', series: monthlySeries(filtered, (r) => r.severity === 'High'), stroke: '#ef4444' },
  ];

  const selCat = selected ? catStyle(selected.category) : null;

  return (
    <div className="flex flex-col gap-4 px-4 py-4 sm:px-6 lg:h-[calc(100vh-4rem)] lg:px-8">
      {!reports.configured ? (
        <EmptyState
          tone="warning"
          icon="⚙️"
          title="Supabase not configured"
          description="Add your credentials to frontend/.env to see live analytics (see README)."
        />
      ) : reports.loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
      ) : (
        <>
          {/* KPI cards */}
          <div className="grid flex-shrink-0 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {kpis.map((k) => (
              <div key={k.label} className="card flex flex-col gap-3 p-4">
                <div className="flex items-start justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl" style={{ background: k.tint, color: k.color }}>
                    <Icon name={k.icon} filled className="text-xl" />
                  </div>
                  <svg width="62" height="24" viewBox="0 0 62 24" fill="none" className="mt-1">
                    <path d={sparkPath(k.series)} stroke={k.stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <div>
                  <p className="text-3xl font-extrabold tracking-tight" style={{ color: k.color }}>
                    {k.value}
                  </p>
                  <p className="mt-1 text-sm font-bold text-slate-700">{k.label}</p>
                  <p className="text-xs font-medium text-slate-400">{k.sub}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Main split: map + intelligence sidebar */}
          <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-[minmax(0,7fr)_minmax(330px,3fr)]">
            {/* Left: filters + map */}
            <div className="flex min-h-0 flex-col gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <label className="relative flex min-w-[160px] max-w-[260px] flex-1 items-center">
                  <Icon name="search" className="pointer-events-none absolute left-3 text-[18px] text-slate-400" />
                  <input
                    value={filters.q}
                    onChange={(e) => set('q', e.target.value)}
                    placeholder="Search location, ward or ID…"
                    className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm font-medium text-slate-700 shadow-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </label>
                <div className="relative">
                  <select
                    value={filters.muni}
                    onChange={(e) => set('muni', e.target.value)}
                    aria-label="Filter by municipality"
                    className="appearance-none rounded-xl border border-slate-200 bg-white py-2.5 pl-3.5 pr-8 text-sm font-semibold text-slate-700 shadow-sm outline-none focus:border-blue-500"
                  >
                    <option value="All">All municipalities</option>
                    {MUNICIPALITIES.map((m) => (
                      <option key={m.name} value={m.name}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                  <Icon name="expand_more" className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[18px] text-slate-400" />
                </div>
                <FilterSelect value={filters.cat} onChange={(v) => set('cat', v)} label="All issue types" options={a.byCategory.map((c) => c.name)} />
                <FilterSelect value={filters.status} onChange={(v) => set('status', v)} label="Any status" options={STATUS_FILTERS} />
                <FilterSelect value={filters.range} onChange={(v) => set('range', v)} label="All time" options={['7d', '30d', '90d']} labels={{ '7d': 'Last 7 days', '30d': 'Last 30 days', '90d': 'Last 90 days' }} />
                {activeCount > 0 && (
                  <button
                    onClick={() => setFilters((f) => ({ ...f, ward: 'all', cat: 'all', status: 'all', range: 'all', q: '' }))}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-bold text-slate-600 shadow-sm transition hover:bg-slate-50"
                  >
                    <Icon name="close" className="text-[16px]" />
                    Reset
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => exportCsv(filtered)}
                  disabled={a.total === 0}
                  className="ml-auto inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-[#1a365d] shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
                >
                  <Icon name="download" className="text-[18px] text-slate-400" />
                  Export
                </button>
                <span className="whitespace-nowrap text-xs font-semibold text-slate-500">
                  Showing <b style={{ color: NAVY }}>{filtered.length}</b> of {reports.reports.length}
                </span>
              </div>

              <div className="relative min-h-[360px] flex-1 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-sm">
                <MapContainer center={KATHMANDU} zoom={13} className="absolute inset-0 h-full w-full" scrollWheelZoom zoomControl={false}>
                  <TileLayer attribution={TILE_ATTRIBUTION} url={TILE_URL} detectRetina />
                  <ClusterLayer reports={located} selected={selectedId} onSelect={openComplaint} mapRef={mapRef} />
                </MapContainer>

                <div className="absolute left-3.5 top-3.5 z-[500] flex items-center gap-2 rounded-xl border border-slate-200 bg-white/90 px-3 py-2 text-xs shadow-md backdrop-blur">
                  <span className="h-2 w-2 rounded-full bg-blue-500" />
                  <span className="font-extrabold text-slate-900">Complaint Intelligence Map</span>
                  <span className="border-l border-slate-200 pl-2 font-semibold text-slate-400">{located.length} pinned</span>
                </div>

                {/* Priority legend */}
                <div className="absolute bottom-3.5 left-3.5 z-[500] flex items-center gap-3.5 rounded-xl border border-slate-200 bg-white/92 px-3.5 py-2 text-[11px] font-semibold text-slate-600 shadow-md backdrop-blur">
                  <span className="font-bold uppercase tracking-wide text-slate-400">Priority</span>
                  {(['High', 'Medium', 'Low'] as const).map((s) => (
                    <span key={s} className="flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: PRIO[s] }} />
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Right: intelligence sidebar */}
            <div className="flex min-h-0 flex-col gap-4 overflow-y-auto pr-0.5 lg:pb-1">
              {a.total === 0 ? (
                <div className="card p-5">
                  <EmptyState icon="📊" title="No complaints match" description="Adjust the filters, or submit a report to populate the dashboard." />
                </div>
              ) : (
                <>
                  {/* Issue distribution donut */}
                  <div className="card p-4">
                    <div className="mb-1 flex items-center justify-between">
                      <h2 className="text-sm font-extrabold" style={{ color: NAVY }}>
                        Issue Distribution
                      </h2>
                      <span className="text-[11px] font-semibold text-slate-400">Current view</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="relative h-32 w-32 flex-shrink-0">
                        <svg viewBox="0 0 128 128" className="h-32 w-32 -rotate-90">
                          <circle cx="64" cy="64" r="54" fill="none" stroke="#eef2f7" strokeWidth="17" />
                          {donut.segs.map((s, i) => (
                            <circle key={i} cx="64" cy="64" r="54" fill="none" stroke={s.color} strokeWidth="17" strokeDasharray={s.dash} strokeDashoffset={s.offset} />
                          ))}
                        </svg>
                        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                          <span className="text-2xl font-extrabold" style={{ color: NAVY }}>
                            {donut.total}
                          </span>
                          <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Complaints</span>
                        </div>
                      </div>
                      <ul className="flex-1 space-y-0.5">
                        {donut.legend.map((c) => (
                          <li key={c.name}>
                            <button
                              onClick={() => set('cat', filters.cat === c.name ? 'all' : c.name)}
                              className={`flex w-full items-center gap-2 rounded-lg px-2 py-1 text-left transition hover:bg-slate-50 ${filters.cat === c.name ? 'bg-blue-50' : ''}`}
                            >
                              <span className="h-2.5 w-2.5 flex-shrink-0 rounded" style={{ background: c.color }} />
                              <span className="flex-1 truncate text-xs font-semibold text-slate-600">{c.name}</span>
                              <span className="text-xs font-extrabold" style={{ color: NAVY }}>
                                {c.value}
                              </span>
                              <span className="w-8 text-right text-[10px] font-semibold text-slate-400">{c.pct}%</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* AI civic intelligence (derived) */}
                  <div
                    className="relative overflow-hidden rounded-2xl p-4 text-white"
                    style={{ background: 'linear-gradient(158deg,#1a365d,#22439c 55%,#3b82f6 150%)', boxShadow: '0 18px 40px -22px rgba(30,58,138,.7)' }}
                  >
                    <div className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full" style={{ background: 'radial-gradient(circle,rgba(96,165,250,.5),transparent 70%)' }} />
                    <div className="relative mb-3 flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15">
                        <Icon name="auto_awesome" filled className="text-[18px]" />
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-extrabold">Civic Intelligence</div>
                        <div className="text-[10.5px] font-semibold text-white/70">Derived from live data</div>
                      </div>
                      <span className="rounded-full bg-white px-2 py-0.5 text-[9.5px] font-extrabold tracking-wider text-[#1a365d]">LIVE</span>
                    </div>
                    <div className="relative flex flex-col gap-2">
                      <div className="flex items-center justify-between gap-2 rounded-xl border border-white/15 bg-white/10 px-3 py-2.5">
                        <div className="min-w-0">
                          <div className="text-[10px] font-bold uppercase tracking-wider text-white/60">Most Reported</div>
                          <div className="mt-0.5 flex items-center gap-1.5 text-sm font-extrabold">
                            {insight.top ? `${catStyle(insight.top.name).emoji} ${insight.top.name}` : '—'}
                          </div>
                        </div>
                        <div className="flex-shrink-0 text-lg font-extrabold">{insight.top?.value ?? 0}</div>
                      </div>
                      <div className="flex gap-2">
                        <div className="flex-1 rounded-xl border border-white/15 bg-white/10 px-3 py-2.5">
                          <div className="text-[10px] font-bold uppercase tracking-wider text-white/60">Hotspot Ward</div>
                          <div className="mt-0.5 text-sm font-extrabold">{insight.hot ? `Ward ${insight.hot.ward} 🔥` : '—'}</div>
                          <div className="text-[11px] font-semibold text-white/75">{insight.hot ? `${insight.hot.count} reports` : 'no data'}</div>
                        </div>
                        <div className="flex-1 rounded-xl border border-white/15 bg-white/10 px-3 py-2.5">
                          <div className="text-[10px] font-bold uppercase tracking-wider text-white/60">Resolution</div>
                          <div className="mt-0.5 text-sm font-extrabold">{a.resolutionRate}% closed</div>
                          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/20">
                            <div className="h-full rounded-full bg-emerald-400" style={{ width: `${a.resolutionRate}%` }} />
                          </div>
                        </div>
                      </div>
                      <div className="mt-0.5 rounded-xl bg-white/95 p-3">
                        <div className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-[#1a365d]">
                          <Icon name="lightbulb" filled className="text-[14px]" />
                          Recommended Action
                        </div>
                        <p className="mt-1.5 text-xs font-semibold leading-relaxed text-slate-600">
                          {insight.hot && insight.top
                            ? `Prioritize ${insight.top.name.toLowerCase()} response in Ward ${insight.hot.ward} — ${insight.pendingInHot} report${insight.pendingInHot === 1 ? '' : 's'} still pending. ${insight.top.name} makes up ${insight.topPct}% of complaints in this view.`
                            : 'Not enough data yet to generate a recommendation.'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Ward activity ranking */}
                  <div className="card p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <h2 className="text-sm font-extrabold" style={{ color: NAVY }}>
                        Ward Activity Ranking
                      </h2>
                      <span className="text-[11px] font-semibold text-slate-400">By volume</span>
                    </div>
                    <div className="flex flex-col gap-3">
                      {wardRank.map((w) => (
                        <button key={w.ward} onClick={() => set('ward', filters.ward === w.ward ? 'all' : w.ward)} className="flex flex-col gap-1.5 text-left">
                          <div className="flex items-center gap-2">
                            <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md bg-slate-100 text-[11px] font-extrabold text-slate-500">
                              {w.rank}
                            </span>
                            <span className="flex-1 truncate text-[13px] font-bold text-slate-800">Ward {w.ward}</span>
                            {w.hot && <span>🔥</span>}
                            <span className="text-[13px] font-extrabold" style={{ color: NAVY }}>
                              {w.count}
                            </span>
                          </div>
                          <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                            <div className="h-full rounded-full transition-all" style={{ width: `${w.pct}%`, background: w.color }} />
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Recent complaints */}
                  <div className="card p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <h2 className="text-sm font-extrabold" style={{ color: NAVY }}>
                        Recent Complaints
                      </h2>
                      <Link to="/admin/reports" className="flex items-center gap-1 text-xs font-bold hover:underline" style={{ color: NAVY }}>
                        View all
                        <Icon name="chevron_right" className="text-base" />
                      </Link>
                    </div>
                    <div className="flex flex-col">
                      {recent.map((r) => {
                        const cs = catStyle(r.category);
                        return (
                          <button
                            key={r.id}
                            onClick={() => openComplaint(r.id)}
                            className={`flex items-center gap-3 rounded-xl p-2 text-left transition hover:bg-slate-50 ${r.id === selectedId ? 'bg-blue-50' : ''}`}
                          >
                            <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-lg" style={{ background: `${cs.color}22` }}>
                              {cs.emoji}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-[13px] font-bold text-slate-800">{r.category}</span>
                              <span className="block text-[11.5px] font-medium text-slate-500">
                                Ward {r.ward ?? '—'} · {timeAgo(r.created_at)}
                              </span>
                            </span>
                            <StatusBadge status={r.status} />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </>
      )}

      {/* Detail drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-[1500] bg-slate-900/45 backdrop-blur-[2px]" onClick={() => setDrawerOpen(false)} />
      )}
      <aside
        className="fixed right-0 top-0 z-[1600] flex h-full w-[420px] max-w-[92vw] flex-col bg-white shadow-2xl transition-transform duration-300"
        style={{ transform: drawerOpen ? 'translateX(0)' : 'translateX(105%)' }}
      >
        {selected && selCat && (
          <>
            <div className="flex flex-shrink-0 items-center gap-3 border-b border-slate-100 px-5 py-4">
              <div>
                <div className="text-sm font-extrabold" style={{ color: NAVY }}>
                  Complaint Details
                </div>
                <div className="mt-0.5 font-mono text-[11px] font-semibold text-slate-400">{selected.tracking_id ?? selected.id.slice(0, 8)}</div>
              </div>
              <button onClick={() => setDrawerOpen(false)} className="ml-auto flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-50">
                <Icon name="close" className="text-[18px] text-slate-500" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {selected.image_url ? (
                <img src={selected.image_url} alt={selected.category} className="h-48 w-full object-cover" />
              ) : (
                <div className="flex h-40 items-center justify-center text-6xl" style={{ background: `linear-gradient(150deg,${selCat.color}2e,${selCat.color}14 60%,#f8fafc)` }}>
                  {selCat.emoji}
                </div>
              )}

              <div className="flex flex-col gap-4 p-5">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={selected.status} />
                    <span className="rounded-full px-2.5 py-1 text-[11px] font-bold" style={{ color: prioColor(selected.severity), background: `${prioColor(selected.severity)}1f` }}>
                      {selected.severity ?? 'Unknown'} priority
                    </span>
                    <span className="text-[11.5px] font-semibold text-slate-400">Reported {timeAgo(selected.created_at)}</span>
                  </div>
                  <div className="mt-2 text-xl font-extrabold tracking-tight" style={{ color: NAVY }}>
                    {selected.category}
                  </div>
                </div>

                {selected.description_en && (
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-3.5">
                    <div className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-blue-600">
                      <Icon name="auto_awesome" filled className="text-[13px]" />
                      AI Analysis
                    </div>
                    <p className="mt-1.5 text-[13px] font-medium leading-relaxed text-slate-600">{selected.description_en}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-x-3 gap-y-3.5">
                  <Field label="Municipality" value={selected.municipality ?? '—'} />
                  <Field label="Ward" value={selected.ward ? `Ward ${selected.ward}` : '—'} />
                  <Field label="Location" value={selected.location ?? '—'} full />
                  <Field label="Reporter" value={selected.reporter_name ?? 'Anonymous'} />
                  <Field label="Contact" value={selected.contact ?? '—'} mono />
                  <Field label="Submitted" value={formatDateTime(selected.created_at)} full />
                </div>
              </div>
            </div>

            <div className="flex flex-shrink-0 gap-2 border-t border-slate-100 px-5 py-4">
              <button
                onClick={() => reports.changeStatus(selected.id, 'In Progress')}
                disabled={selected.status === 'In Progress'}
                className="flex-1 rounded-xl bg-blue-500 py-2.5 text-[13px] font-extrabold text-white transition hover:brightness-110 disabled:opacity-40"
              >
                In Progress
              </button>
              <button
                onClick={() => reports.changeStatus(selected.id, 'Resolved')}
                disabled={selected.status === 'Resolved'}
                className="flex-1 rounded-xl bg-emerald-500 py-2.5 text-[13px] font-extrabold text-white transition hover:brightness-110 disabled:opacity-40"
              >
                Resolve
              </button>
              <Link
                to={`/track?id=${selected.tracking_id ?? ''}`}
                className="flex flex-1 items-center justify-center rounded-xl border border-slate-200 py-2.5 text-[13px] font-extrabold text-[#1a365d] transition hover:bg-slate-50"
              >
                Full report
              </Link>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}

function FilterSelect({
  value,
  onChange,
  label,
  options,
  labels,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
  options: string[];
  labels?: Record<string, string>;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none rounded-xl border border-slate-200 bg-white py-2.5 pl-3.5 pr-8 text-sm font-semibold text-slate-700 shadow-sm outline-none focus:border-blue-500"
      >
        <option value="all">{label}</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {labels?.[o] ?? o}
          </option>
        ))}
      </select>
      <Icon name="expand_more" className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[18px] text-slate-400" />
    </div>
  );
}

function Field({ label, value, full = false, mono = false }: { label: string; value: string; full?: boolean; mono?: boolean }) {
  return (
    <div className={full ? 'col-span-2' : ''}>
      <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">{label}</div>
      <div className={`mt-0.5 text-[13.5px] font-semibold text-slate-800 ${mono ? 'font-mono' : ''}`}>{value}</div>
    </div>
  );
}
