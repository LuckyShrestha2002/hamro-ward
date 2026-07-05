import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import type L from 'leaflet';
import { KATHMANDU, TILE_URL, TILE_ATTRIBUTION, BLUE_PIN } from '../lib/leafletSetup';
import { reverseGeocode, searchPlaces, type PlaceResult } from '../lib/api';

const NAVY = '#1a365d';

export interface LatLng {
  lat: number;
  lng: number;
}

/** Everything the complaint form needs to know about the chosen spot. */
export interface PickedLocation {
  latitude: number;
  longitude: number;
  address: string;
  municipality: string | null;
  ward: string | null;
  /** GPS accuracy in meters — only set when the point came from the browser's geolocation. */
  accuracy: number | null;
}

function Icon({ name, className = '', filled = false }: { name: string; className?: string; filled?: boolean }) {
  return (
    <span aria-hidden className={`material-symbols-outlined ${filled ? 'filled' : ''} ${className}`}>
      {name}
    </span>
  );
}

function ClickHandler({ onPick }: { onPick: (p: LatLng) => void }) {
  useMapEvents({
    click(e) {
      onPick({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

/** Trim Nominatim's very long display_name to the first few meaningful parts. */
function shortAddress(display: string | null): string {
  if (!display) return '';
  return display.split(',').slice(0, 3).map((s) => s.trim()).join(', ');
}

/**
 * Full location-selection experience for the complaint form:
 * one-tap GPS ("Use My Current Location"), place search with autocomplete,
 * a draggable pin on the map with a locate-me control, and a live summary
 * card (address / ward / municipality / coordinates / GPS accuracy) that
 * updates whenever the pin moves. Falls back gracefully when GPS is
 * unavailable — search or tapping the map always works.
 */
export default function LocationPicker({
  value,
  onChange,
  landmark,
  onLandmarkChange,
  photoCoords,
}: {
  value: PickedLocation | null;
  onChange: (loc: PickedLocation | null) => void;
  landmark: string;
  onLandmarkChange: (v: string) => void;
  /** GPS coordinates found in the uploaded photo's EXIF data, if any. */
  photoCoords?: LatLng | null;
}) {
  const mapRef = useRef<L.Map | null>(null);
  const seqRef = useRef(0);

  const [locating, setLocating] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [gpsError, setGpsError] = useState('');
  const [photoDismissed, setPhotoDismissed] = useState(false);

  // Search state
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PlaceResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState(false);

  /** Drop the pin, glide the map there, then resolve the address live. */
  async function placeMarker(lat: number, lng: number, accuracy: number | null = null) {
    const seq = ++seqRef.current;
    setGpsError('');
    onChange({ latitude: lat, longitude: lng, address: '', municipality: null, ward: null, accuracy });
    const map = mapRef.current;
    if (map) map.flyTo([lat, lng], Math.max(map.getZoom(), 17), { duration: 0.8 });
    setResolving(true);
    try {
      const g = await reverseGeocode(lat, lng);
      if (seq !== seqRef.current) return;
      onChange({
        latitude: lat,
        longitude: lng,
        address: shortAddress(g.display),
        municipality: g.municipality,
        ward: g.ward,
        accuracy,
      });
    } catch {
      /* keep the coordinates — the address just stays blank */
    } finally {
      if (seq === seqRef.current) setResolving(false);
    }
  }

  function useMyLocation() {
    if (!navigator.geolocation) {
      setGpsError('Location is not supported by this browser — search below or tap the map instead.');
      return;
    }
    setLocating(true);
    setGpsError('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        void placeMarker(pos.coords.latitude, pos.coords.longitude, Math.round(pos.coords.accuracy));
      },
      (err) => {
        setLocating(false);
        setGpsError(
          err.code === err.PERMISSION_DENIED
            ? 'Location permission was denied — search below or tap the map instead.'
            : 'Could not get your location — search below or tap the map instead.'
        );
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 }
    );
  }

  // Debounced autocomplete.
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }
    const ctrl = new AbortController();
    setSearching(true);
    const t = setTimeout(() => {
      searchPlaces(q, ctrl.signal)
        .then((r) => {
          setResults(r);
          setOpen(true);
        })
        .catch(() => {})
        .finally(() => setSearching(false));
    }, 350);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [query]);

  function pickResult(p: PlaceResult) {
    setQuery(p.name);
    setOpen(false);
    void placeMarker(p.lat, p.lon);
  }

  const poorAccuracy = value?.accuracy != null && value.accuracy > 50;

  return (
    <div className="flex flex-col gap-3.5">
      {/* Photo EXIF suggestion */}
      {photoCoords && !value && !photoDismissed && (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3">
          <Icon name="photo_camera" className="text-xl text-blue-600" />
          <p className="min-w-0 flex-1 text-sm font-semibold text-blue-900">
            We detected a location from your photo. Would you like to use it?
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setPhotoDismissed(true);
                void placeMarker(photoCoords.lat, photoCoords.lng);
              }}
              className="rounded-full bg-blue-600 px-4 py-1.5 text-sm font-bold text-white transition hover:brightness-110"
            >
              Use it
            </button>
            <button
              type="button"
              onClick={() => setPhotoDismissed(true)}
              className="rounded-full border border-blue-200 bg-white px-4 py-1.5 text-sm font-bold text-blue-700 transition hover:bg-blue-100"
            >
              No thanks
            </button>
          </div>
        </div>
      )}

      {/* Primary: use current location */}
      <button
        type="button"
        onClick={useMyLocation}
        disabled={locating}
        className="flex w-full items-center justify-center gap-2.5 rounded-full px-6 py-3.5 text-base font-bold text-white transition hover:brightness-110 disabled:opacity-70"
        style={{ background: NAVY, boxShadow: '0 10px 22px -10px rgba(11,27,63,.6)' }}
      >
        {locating ? (
          <>
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            Getting your location…
          </>
        ) : (
          <>
            <Icon name="my_location" className="text-xl" />
            Use My Current Location
          </>
        )}
      </button>
      {gpsError && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-[13px] font-semibold text-amber-800">
          {gpsError}
        </p>
      )}

      {/* Search with autocomplete */}
      <div className="relative">
        <label className="relative flex items-center">
          <Icon name="search" className="pointer-events-none absolute left-3.5 text-[19px] text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => results.length > 0 && setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            placeholder="Search by place, road, school, hospital, or landmark…"
            aria-label="Search for a place"
            className="w-full rounded-full border border-slate-200 bg-white py-3 pl-10 pr-10 text-sm font-medium text-slate-700 shadow-sm outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
          {searching && (
            <span className="absolute right-4 inline-block h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-transparent" />
          )}
        </label>
        {open && results.length > 0 && (
          <ul className="absolute inset-x-0 top-full z-[600] mt-2 max-h-64 overflow-auto rounded-2xl border border-slate-200 bg-white py-1.5 shadow-lg">
            {results.map((p, i) => (
              <li key={`${p.lat},${p.lon},${i}`}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pickResult(p)}
                  className="flex w-full items-start gap-3 px-4 py-2.5 text-left transition hover:bg-slate-50"
                >
                  <Icon name="location_on" className="mt-0.5 text-[18px] text-slate-400" />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-bold text-slate-800">{p.name}</span>
                    <span className="block truncate text-xs font-medium text-slate-400">{p.display}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Map */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200 shadow-sm">
        <MapContainer
          ref={mapRef}
          center={value ? [value.latitude, value.longitude] : KATHMANDU}
          zoom={value ? 16 : 13}
          style={{ height: 300, width: '100%' }}
          scrollWheelZoom={false}
        >
          <TileLayer attribution={TILE_ATTRIBUTION} url={TILE_URL} detectRetina />
          <ClickHandler onPick={(p) => void placeMarker(p.lat, p.lng)} />
          {value && (
            <Marker
              position={[value.latitude, value.longitude]}
              icon={BLUE_PIN}
              draggable
              eventHandlers={{
                dragend: (e) => {
                  const p = (e.target as L.Marker).getLatLng();
                  void placeMarker(p.lat, p.lng);
                },
              }}
            />
          )}
        </MapContainer>

        {/* Locate-me control */}
        <button
          type="button"
          onClick={useMyLocation}
          title="Use my current location"
          aria-label="Use my current location"
          className="absolute bottom-3 right-3 z-[500] flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-md transition hover:bg-slate-50"
        >
          <Icon name="my_location" className="text-[20px]" />
        </button>

        {/* Hint chip */}
        <div className="pointer-events-none absolute inset-x-0 top-3 z-[500] flex justify-center">
          <span className="rounded-full border border-slate-200 bg-white/95 px-3.5 py-1.5 text-xs font-semibold text-slate-600 shadow-sm backdrop-blur">
            {value ? 'Drag the pin to fine-tune the exact spot' : 'Tap the map to drop a pin'}
          </span>
        </div>
      </div>

      {/* Location summary card */}
      {value ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <Icon name="location_on" filled className="text-xl text-blue-600" />
            <h3 className="text-sm font-extrabold uppercase tracking-wide text-slate-500">
              Selected Address
            </h3>
            {resolving && (
              <span className="ml-auto flex items-center gap-1.5 text-xs font-semibold text-slate-400">
                <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-slate-300 border-t-transparent" />
                Updating…
              </span>
            )}
          </div>
          <p className="mt-1.5 text-[15px] font-bold text-slate-800">
            {value.address || (resolving ? 'Finding address…' : 'Address unavailable — coordinates captured')}
          </p>

          <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-slate-100 pt-4 sm:grid-cols-4">
            <div>
              <dt className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Ward</dt>
              <dd className="mt-0.5 text-sm font-bold text-slate-800">
                {value.ward ? `Ward ${value.ward}` : '—'}
              </dd>
            </div>
            <div>
              <dt className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Municipality</dt>
              <dd className="mt-0.5 truncate text-sm font-bold text-slate-800" title={value.municipality ?? undefined}>
                {value.municipality ?? '—'}
              </dd>
            </div>
            <div>
              <dt className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Latitude</dt>
              <dd className="mt-0.5 font-mono text-sm font-semibold text-slate-800">
                {value.latitude.toFixed(5)}
              </dd>
            </div>
            <div>
              <dt className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Longitude</dt>
              <dd className="mt-0.5 font-mono text-sm font-semibold text-slate-800">
                {value.longitude.toFixed(5)}
              </dd>
            </div>
          </dl>

          {value.accuracy != null && (
            <p
              className={`mt-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
                poorAccuracy ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'
              }`}
            >
              <Icon name="gps_fixed" className="text-[14px]" />
              GPS accuracy: ±{value.accuracy} m
            </p>
          )}
          {poorAccuracy && (
            <p className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-[13px] font-semibold text-amber-800">
              GPS accuracy is low here — please drag the pin to the exact spot before submitting.
            </p>
          )}

          <label className="mt-4 block">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
              Nearby Landmark <span className="font-semibold normal-case text-slate-300">(optional)</span>
            </span>
            <input
              type="text"
              value={landmark}
              onChange={(e) => onLandmarkChange(e.target.value)}
              placeholder="e.g. Near Ward Office"
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-700 shadow-sm outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </label>
        </div>
      ) : (
        <p className="text-center text-[13px] font-medium text-slate-400">
          Use your current location, search for a place, or tap the map — we'll fill in the ward and
          municipality for you.
        </p>
      )}
    </div>
  );
}
