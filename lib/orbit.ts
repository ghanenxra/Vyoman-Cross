import * as satellite from 'satellite.js';
import SunCalc from 'suncalc';
import * as Astronomy from 'astronomy-engine';
import type { TleRecord, ObserverLocation } from './types';
import { MIN_ELEVATION_DEG, SUN_ALTITUDE_THRESHOLD_DEG } from './satellites';

// ============================================================
// Orbit propagation, look angles, and visibility checks
// ============================================================

export interface LookAngles {
  azimuthDeg: number;
  elevationDeg: number;
  rangeKm: number;
}

export interface EciPosition {
  x: number;
  y: number;
  z: number;
}

// Cache parsed satrec objects to avoid re-parsing TLE strings on every call.
// Key = "line1\nline2", value = parsed satrec.
// This is critical: the 7-day forecast scan calls computeLookAngles ~460K times.
const satrecCache = new Map<string, ReturnType<typeof satellite.twoline2satrec>>();

function getSatrec(tle: TleRecord): ReturnType<typeof satellite.twoline2satrec> {
  const key = `${tle.line1}\n${tle.line2}`;
  let satrec = satrecCache.get(key);
  if (!satrec) {
    satrec = satellite.twoline2satrec(tle.line1, tle.line2);
    satrecCache.set(key, satrec);
    // Evict old entries if cache grows too large
    if (satrecCache.size > 500) {
      const first = satrecCache.keys().next().value;
      if (first !== undefined) satrecCache.delete(first);
    }
  }
  return satrec;
}

/**
 * Extract satellite orbital inclination in degrees from TLE line 2 (columns 9–16).
 */
export function getTleInclinationDeg(line2: string): number {
  if (!line2 || line2.length < 16) return 90;
  const incStr = line2.substring(8, 16).trim();
  const inc = parseFloat(incStr);
  return isNaN(inc) ? 90 : inc;
}

/**
 * Fast geometric check: can a satellite with a given inclination ever rise
 * above minElevation for an observer at observerLatDeg?
 * For near-Earth LEO (alt ~300-550 km), the horizon circle has an angular radius of ~18 deg.
 */
export function canReachObserverLatitude(
  inclinationDeg: number,
  observerLatDeg: number,
  maxHorizonAngularRadiusDeg: number = 18,
): boolean {
  const maxLatReach =
    (inclinationDeg > 90 ? 180 - inclinationDeg : inclinationDeg) +
    maxHorizonAngularRadiusDeg;
  return Math.abs(observerLatDeg) <= maxLatReach;
}

/**
 * Propagate a satellite to a given time and compute look angles from observer.
 * Returns null if propagation fails (bad TLE / epoch too far).
 */
export function computeLookAngles(
  tle: TleRecord,
  observer: ObserverLocation,
  date: Date,
): (LookAngles & { satEci: EciPosition }) | null {
  try {
    const satrec = getSatrec(tle);
    const result = satellite.propagate(satrec, date);

    if (typeof result.position === 'boolean' || !result.position) return null;

    const positionEci = result.position as satellite.EciVec3<number>;
    const gmst = satellite.gstime(date);

    const observerGd: satellite.GeodeticLocation = {
      latitude: satellite.degreesToRadians(observer.latitude),
      longitude: satellite.degreesToRadians(observer.longitude),
      height: (observer.elevationMeters ?? 0) / 1000, // km
    };

    const positionEcf = satellite.eciToEcf(positionEci, gmst);
    const lookAngles = satellite.ecfToLookAngles(observerGd, positionEcf);

    const RAD2DEG = 180 / Math.PI;
    return {
      azimuthDeg: lookAngles.azimuth * RAD2DEG,
      elevationDeg: lookAngles.elevation * RAD2DEG,
      rangeKm: lookAngles.rangeSat,
      satEci: { x: positionEci.x, y: positionEci.y, z: positionEci.z },
    };
  } catch {
    return null;
  }
}

// Cache Sun ECI positions per minute bucket to avoid calling Astronomy.GeoVector tens of thousands of times
const sunEciCache = new Map<number, EciPosition>();

/**
 * Get the Sun's ECI position vector at a given time.
 * Uses astronomy-engine with minute-level caching.
 */
export function getSunEciKm(date: Date): EciPosition {
  const minuteBucket = Math.floor(date.getTime() / 60000);
  const existing = sunEciCache.get(minuteBucket);
  if (existing) return existing;

  const time = Astronomy.MakeTime(date);
  const sunGeo = Astronomy.GeoVector(Astronomy.Body.Sun, time, true);

  // astronomy-engine returns AU — convert to km
  const AU_TO_KM = 149597870.7;
  const position: EciPosition = {
    x: sunGeo.x * AU_TO_KM,
    y: sunGeo.y * AU_TO_KM,
    z: sunGeo.z * AU_TO_KM,
  };
  sunEciCache.set(minuteBucket, position);
  if (sunEciCache.size > 1500) {
    const first = sunEciCache.keys().next().value;
    if (first !== undefined) sunEciCache.delete(first);
  }
  return position;
}

/**
 * Check if a satellite is sunlit (not in Earth's shadow).
 * Uses cylindrical shadow model — standard approximation.
 */
export function isSunlit(satEciKm: EciPosition, sunEciKm: EciPosition): boolean {
  const EARTH_RADIUS_KM = 6378.137;

  const dot =
    satEciKm.x * sunEciKm.x +
    satEciKm.y * sunEciKm.y +
    satEciKm.z * sunEciKm.z;

  const satMag = Math.hypot(satEciKm.x, satEciKm.y, satEciKm.z);
  const sunMag = Math.hypot(sunEciKm.x, sunEciKm.y, sunEciKm.z);

  if (satMag === 0 || sunMag === 0) return false;

  const cosTheta = dot / (satMag * sunMag);
  // Clamp to [-1, 1] to avoid NaN from floating point
  const theta = Math.acos(Math.max(-1, Math.min(1, cosTheta)));

  // Satellite is on the sunlit side of Earth
  if (theta < Math.PI / 2) return true;

  // Check if satellite is outside Earth's shadow cylinder
  const distFromShadowAxis = satMag * Math.sin(theta);
  return distFromShadowAxis > EARTH_RADIUS_KM;
}

/**
 * Check if the observer's sky is dark enough for satellite viewing.
 * Uses SunCalc — sky is dark enough when sun is below -6° (civil twilight).
 */
export function isSkyDarkEnough(observer: ObserverLocation, date: Date): boolean {
  const sunPos = SunCalc.getPosition(date, observer.latitude, observer.longitude);
  const sunAltitudeDeg = sunPos.altitude * (180 / Math.PI);
  return sunAltitudeDeg < SUN_ALTITUDE_THRESHOLD_DEG;
}

/**
 * Full visibility check for a satellite at a specific time.
 * Returns look angles if visible, null if not.
 * @param skipSkyDarkCheck - If true, assumes caller already confirmed the sky is dark.
 */
export function checkVisibility(
  tle: TleRecord,
  observer: ObserverLocation,
  date: Date,
  skipSkyDarkCheck: boolean = false,
): LookAngles | null {
  // 1. Compute look angles
  const result = computeLookAngles(tle, observer, date);
  if (!result) return null;

  // 2. Check elevation threshold
  if (result.elevationDeg < MIN_ELEVATION_DEG) return null;

  // 3. Check sky darkness
  if (!isSkyDarkEnough(observer, date)) return null;
  if (!skipSkyDarkCheck && !isSkyDarkEnough(observer, date)) return null;

  // 4. Check satellite is sunlit
  const sunEci = getSunEciKm(date);
  if (!isSunlit(result.satEci, sunEci)) return null;

  return {
    azimuthDeg: result.azimuthDeg,
    elevationDeg: result.elevationDeg,
    rangeKm: result.rangeKm,
  };
}
