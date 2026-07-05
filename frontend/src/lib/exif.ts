/**
 * Minimal EXIF reader: extracts GPS coordinates from a JPEG, if present.
 * Just enough for the "use the photo's location" prompt in the report flow —
 * not a general-purpose EXIF library.
 */

export interface ExifGps {
  lat: number;
  lng: number;
}

/** Read GPS coordinates from a JPEG file. Returns null for any non-JPEG,
 * missing/odd EXIF, or coordinates that are clearly invalid. */
export async function extractExifGps(file: File): Promise<ExifGps | null> {
  if (!/image\/jpe?g/.test(file.type)) return null;
  try {
    // GPS data lives in the APP1 segment near the start of the file.
    const buf = await file.slice(0, 256 * 1024).arrayBuffer();
    return parseJpeg(new DataView(buf));
  } catch {
    return null;
  }
}

function parseJpeg(view: DataView): ExifGps | null {
  if (view.byteLength < 4 || view.getUint16(0) !== 0xffd8) return null; // not a JPEG

  let offset = 2;
  while (offset + 4 <= view.byteLength) {
    if (view.getUint8(offset) !== 0xff) return null;
    const marker = view.getUint8(offset + 1);
    if (marker === 0xda) return null; // start-of-scan: no EXIF ahead
    const size = view.getUint16(offset + 2);
    if (size < 2) return null;
    if (
      marker === 0xe1 &&
      offset + 10 <= view.byteLength &&
      view.getUint32(offset + 4) === 0x45786966 // "Exif"
    ) {
      return parseTiff(view, offset + 10);
    }
    offset += 2 + size;
  }
  return null;
}

function parseTiff(view: DataView, tiff: number): ExifGps | null {
  if (tiff + 8 > view.byteLength) return null;
  const byteOrder = view.getUint16(tiff);
  if (byteOrder !== 0x4949 && byteOrder !== 0x4d4d) return null;
  const le = byteOrder === 0x4949; // "II" = little-endian
  const u16 = (o: number) => view.getUint16(o, le);
  const u32 = (o: number) => view.getUint32(o, le);
  if (u16(tiff + 2) !== 42) return null;

  // IFD0 → GPS IFD pointer (tag 0x8825).
  const gpsOffset = findTagValue(view, tiff + u32(tiff + 4), 0x8825, le);
  if (gpsOffset == null) return null;
  const gps = tiff + gpsOffset;
  if (gps + 2 > view.byteLength) return null;

  let latRef = '';
  let lngRef = '';
  let latDms: number[] | null = null;
  let lngDms: number[] | null = null;

  const count = u16(gps);
  for (let i = 0; i < count; i++) {
    const entry = gps + 2 + i * 12;
    if (entry + 12 > view.byteLength) return null;
    const tag = u16(entry);
    if (tag === 1) latRef = String.fromCharCode(view.getUint8(entry + 8)); // GPSLatitudeRef
    else if (tag === 3) lngRef = String.fromCharCode(view.getUint8(entry + 8)); // GPSLongitudeRef
    else if (tag === 2) latDms = readRationals(view, tiff + u32(entry + 8), 3, le); // GPSLatitude
    else if (tag === 4) lngDms = readRationals(view, tiff + u32(entry + 8), 3, le); // GPSLongitude
  }
  if (!latDms || !lngDms) return null;

  const lat = (latDms[0] + latDms[1] / 60 + latDms[2] / 3600) * (latRef === 'S' ? -1 : 1);
  const lng = (lngDms[0] + lngDms[1] / 60 + lngDms[2] / 3600) * (lngRef === 'W' ? -1 : 1);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180 || (lat === 0 && lng === 0)) return null;
  return { lat, lng };
}

/** Scan one IFD for a tag and return its 32-bit value field. */
function findTagValue(view: DataView, ifd: number, wanted: number, le: boolean): number | null {
  if (ifd + 2 > view.byteLength) return null;
  const count = view.getUint16(ifd, le);
  for (let i = 0; i < count; i++) {
    const entry = ifd + 2 + i * 12;
    if (entry + 12 > view.byteLength) return null;
    if (view.getUint16(entry, le) === wanted) return view.getUint32(entry + 8, le);
  }
  return null;
}

/** Read `n` unsigned rationals (numerator/denominator u32 pairs). */
function readRationals(view: DataView, offset: number, n: number, le: boolean): number[] | null {
  if (offset + n * 8 > view.byteLength) return null;
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    const num = view.getUint32(offset + i * 8, le);
    const den = view.getUint32(offset + i * 8 + 4, le);
    out.push(den === 0 ? 0 : num / den);
  }
  return out;
}
