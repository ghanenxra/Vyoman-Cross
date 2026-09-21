import * as satellite from 'satellite.js';
import type { TleRecord } from './types';

export interface GeoPoint {
  lat: number;
  lng: number;
  alt: number; // km above Earth surface
}

const RAD2DEG = 180 / Math.PI;

/**
 * Compute the full orbit path for a satellite (one complete orbit).
 */
export function computeOrbitPath(tle: TleRecord, steps: number = 360): GeoPoint[] {
  try {
    const satrec = satellite.twoline2satrec(tle.line1, tle.line2);
    // Orbital period from mean motion (radians/min in satellite.js internals)
    const periodMinutes = (2 * Math.PI) / satrec.no;
    const points: GeoPoint[] = [];
    const now = new Date();
    const stepMs = (periodMinutes * 60 * 1000) / steps;

    for (let i = 0; i <= steps; i++) {
      const time = new Date(now.getTime() + i * stepMs);
      const result = satellite.propagate(satrec, time);
      if (typeof result.position === 'boolean' || !result.position) continue;

      const gmst = satellite.gstime(time);
      const posGd = satellite.eciToGeodetic(
        result.position as satellite.EciVec3<number>,
        gmst,
      );
      points.push({
        lat: posGd.latitude * RAD2DEG,
        lng: posGd.longitude * RAD2DEG,
        alt: posGd.height,
      });
    }
    return points;
  } catch {
    return [];
  }
}

/**
 * Compute the ground track (orbit projected onto surface) for N minutes.
 */
export function computeGroundTrack(
  tle: TleRecord,
  minutes: number = 90,
): GeoPoint[] {
  return computeOrbitPath(tle, Math.floor(minutes * 2)).map((p) => ({
    ...p,
    alt: 0,
  }));
}

/**
 * Get the current geodetic position of a satellite.
 */
export function getCurrentPosition(tle: TleRecord): GeoPoint | null {
  try {
    const satrec = satellite.twoline2satrec(tle.line1, tle.line2);
    const now = new Date();
    const result = satellite.propagate(satrec, now);
    if (typeof result.position === 'boolean' || !result.position) return null;

    const gmst = satellite.gstime(now);
    const posGd = satellite.eciToGeodetic(
      result.position as satellite.EciVec3<number>,
      gmst,
    );
    return {
      lat: posGd.latitude * RAD2DEG,
      lng: posGd.longitude * RAD2DEG,
      alt: posGd.height,
    };
  } catch {
    return null;
  }
}

/**
 * Get satellite velocity in km/s.
 */
export function getVelocity(tle: TleRecord): number {
  try {
    const satrec = satellite.twoline2satrec(tle.line1, tle.line2);
    const now = new Date();
    const result = satellite.propagate(satrec, now);
    if (typeof result.velocity === 'boolean' || !result.velocity) return 0;

    const vel = result.velocity as satellite.EciVec3<number>;
    return Math.hypot(vel.x, vel.y, vel.z);
  } catch {
    return 0;
  }
}
