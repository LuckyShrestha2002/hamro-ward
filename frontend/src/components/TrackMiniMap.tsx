import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import { TILE_URL, TILE_ATTRIBUTION, emojiPin } from '../lib/leafletSetup';
import { categoryMeta } from '../data/wards';

/**
 * Compact, non-interactive map showing a single complaint's location.
 * Lazy-loaded from TrackPage so leaflet stays out of the main bundle.
 */
export default function TrackMiniMap({
  lat,
  lng,
  category,
}: {
  lat: number;
  lng: number;
  category: string;
}) {
  return (
    <MapContainer
      center={[lat, lng]}
      zoom={15}
      style={{ height: 200, width: '100%' }}
      dragging={false}
      scrollWheelZoom={false}
      doubleClickZoom={false}
      touchZoom={false}
      keyboard={false}
    >
      <TileLayer attribution={TILE_ATTRIBUTION} url={TILE_URL} detectRetina />
      <Marker position={[lat, lng]} icon={emojiPin(categoryMeta(category).icon, '#1a365d', false)} />
    </MapContainer>
  );
}
