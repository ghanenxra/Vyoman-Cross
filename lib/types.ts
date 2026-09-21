// ============================================================
// Vyoman Cross — Core TypeScript interfaces
// ============================================================

/** A tracked satellite's static identity */
export interface TrackedObject {
  noradId: number;
  name: string; // "ISS (ZARYA)", "TIANGONG", etc.
  category: 'station' | 'telescope' | 'starlink' | 'other';
}

/** Raw TLE, cached per object */
export interface TleRecord {
  noradId: number;
  name: string;
  category?: 'station' | 'telescope' | 'starlink' | 'other';
  line1: string;
  line2: string;
  fetchedAt: string; // ISO timestamp
}

/** A single computed visible pass for a given observer location */
export interface VisiblePass {
  noradId: number;
  objectName: string;
  category: 'station' | 'telescope' | 'starlink' | 'other';
  startTime: string; // ISO — crosses above elevation threshold
  peakTime: string; // ISO — max elevation moment
  endTime: string; // ISO — drops back below threshold
  startAzimuthDeg: number;
  peakAzimuthDeg: number;
  endAzimuthDeg: number;
  peakElevationDeg: number;
  compassDirection: string; // derived from peakAzimuthDeg, e.g. "NW"
  magnitude: number | null; // lower = brighter; null if unknown
  brightnessLabel: 'very bright' | 'bright' | 'moderate' | 'faint' | 'unknown';
  durationSeconds: number;
  isTrain?: boolean; // Starlink train formation
}

/** Observer location in decimal degrees */
export interface ObserverLocation {
  latitude: number; // -90..90
  longitude: number; // -180..180
  elevationMeters?: number; // default 0 if unknown
}

/** Response from /api/passes/now */
export interface NowResponse {
  visibleNow: VisiblePass[];
  nextPass: VisiblePass | null;
}

/** Response from /api/passes/forecast */
export interface ForecastResponse {
  passes: VisiblePass[];
}
