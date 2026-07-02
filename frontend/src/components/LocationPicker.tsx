import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import { KATHMANDU, TILE_URL, TILE_ATTRIBUTION, BLUE_PIN } from '../lib/leafletSetup';

export interface LatLng {
  lat: number;
  lng: number;
}

function ClickHandler({ onPick }: { onPick: (p: LatLng) => void }) {
  useMapEvents({
    click(e) {
      onPick({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

/**
 * A small OpenStreetMap (Leaflet) map. Click anywhere to drop a pin and capture
 * its latitude/longitude.
 */
export default function LocationPicker({
  value,
  onChange,
}: {
  value: LatLng | null;
  onChange: (p: LatLng) => void;
}) {
  return (
    <div>
      <div className="overflow-hidden rounded-lg border border-slate-300">
        <MapContainer
          center={value ? [value.lat, value.lng] : KATHMANDU}
          zoom={value ? 16 : 13}
          style={{ height: 220, width: '100%' }}
          scrollWheelZoom={false}
        >
          <TileLayer attribution={TILE_ATTRIBUTION} url={TILE_URL} detectRetina />
          <ClickHandler onPick={onChange} />
          {value && <Marker position={[value.lat, value.lng]} icon={BLUE_PIN} />}
        </MapContainer>
      </div>
      <p className="mt-1 text-xs text-slate-500">
        {value
          ? `📍 Selected: ${value.lat.toFixed(5)}, ${value.lng.toFixed(5)}`
          : 'Tap the map to drop a pin on the exact spot.'}
      </p>
    </div>
  );
}
