import * as THREE from 'three';
import * as satellite from 'satellite.js';
import type { TleRecord } from './types';
import worldBorders from '@/data/world-borders.json';

export const EARTH_RADIUS_KM = 6371;
export const GLOBE_RADIUS = 2.5;

/**
 * Convert geodetic coordinates (lat, lng, altitude in km) to Three.js Cartesian Vector3.
 * Matches Three.js standard SphereGeometry equirectangular UV mapping.
 */
export function latLngAltToVector3(
  lat: number,
  lng: number,
  altKm: number = 0,
  globeRadius: number = GLOBE_RADIUS,
): THREE.Vector3 {
  const phi = (lat * Math.PI) / 180;
  const theta = (lng * Math.PI) / 180;
  // Scaled radius: satellite height is scaled for visual clarity
  // Real altKm / EARTH_RADIUS_KM can be slightly exaggerated for Low Earth Orbit visibility
  const visualScale = 1.6; // Subtle altitude exaggeration so 400km orbits are visually distinct
  const r = globeRadius * (1 + (altKm / EARTH_RADIUS_KM) * visualScale);

  const x = -r * Math.cos(phi) * Math.cos(theta);
  const y = r * Math.sin(phi);
  const z = r * Math.cos(phi) * Math.sin(theta);

  return new THREE.Vector3(x, y, z);
}

/**
 * Compute 3D orbit trajectory vertices for one full revolution around Earth.
 */
export function computeOrbitPath3D(
  tle: TleRecord,
  steps: number = 360,
  baseTime: Date = new Date(),
): THREE.Vector3[] {
  try {
    const satrec = satellite.twoline2satrec(tle.line1, tle.line2);
    const periodMinutes = (2 * Math.PI) / satrec.no;
    const stepMs = (periodMinutes * 60 * 1000) / steps;
    const points: THREE.Vector3[] = [];

    for (let i = 0; i <= steps; i++) {
      const time = new Date(baseTime.getTime() + i * stepMs);
      const result = satellite.propagate(satrec, time);
      if (typeof result.position === 'boolean' || !result.position) continue;

      const gmst = satellite.gstime(time);
      const posGd = satellite.eciToGeodetic(
        result.position as satellite.EciVec3<number>,
        gmst,
      );

      const lat = (posGd.latitude * 180) / Math.PI;
      const lng = (posGd.longitude * 180) / Math.PI;
      const altKm = posGd.height;

      points.push(latLngAltToVector3(lat, lng, altKm));
    }

    return points;
  } catch {
    return [];
  }
}

/**
 * Compute ground track projection on the Earth's surface for one orbit.
 */
export function computeGroundTrack3D(
  tle: TleRecord,
  steps: number = 180,
  baseTime: Date = new Date(),
): THREE.Vector3[] {
  try {
    const satrec = satellite.twoline2satrec(tle.line1, tle.line2);
    const periodMinutes = (2 * Math.PI) / satrec.no;
    const stepMs = (periodMinutes * 60 * 1000) / steps;
    const points: THREE.Vector3[] = [];

    for (let i = 0; i <= steps; i++) {
      const time = new Date(baseTime.getTime() + i * stepMs);
      const result = satellite.propagate(satrec, time);
      if (typeof result.position === 'boolean' || !result.position) continue;

      const gmst = satellite.gstime(time);
      const posGd = satellite.eciToGeodetic(
        result.position as satellite.EciVec3<number>,
        gmst,
      );

      const lat = (posGd.latitude * 180) / Math.PI;
      const lng = (posGd.longitude * 180) / Math.PI;

      // Projected slightly above globe surface (0.015) to prevent z-fighting
      points.push(latLngAltToVector3(lat, lng, 0, GLOBE_RADIUS + 0.015));
    }

    return points;
  } catch {
    return [];
  }
}

/**
 * Get current real-time satellite telemetry and 3D vector.
 */
export function getLiveSatelliteState(
  tle: TleRecord,
  now: Date = new Date(),
): {
  position3D: THREE.Vector3;
  surface3D: THREE.Vector3;
  lat: number;
  lng: number;
  alt: number;
  velocityKmS: number;
  periodMinutes: number;
  inclinationDeg: number;
} | null {
  try {
    const satrec = satellite.twoline2satrec(tle.line1, tle.line2);
    const result = satellite.propagate(satrec, now);
    if (typeof result.position === 'boolean' || !result.position) return null;

    const gmst = satellite.gstime(now);
    const posGd = satellite.eciToGeodetic(
      result.position as satellite.EciVec3<number>,
      gmst,
    );

    const lat = (posGd.latitude * 180) / Math.PI;
    const lng = (posGd.longitude * 180) / Math.PI;
    const alt = posGd.height;

    let velocityKmS = 7.66;
    if (result.velocity && typeof result.velocity !== 'boolean') {
      const v = result.velocity as satellite.EciVec3<number>;
      velocityKmS = Math.hypot(v.x, v.y, v.z);
    }

    const periodMinutes = (2 * Math.PI) / satrec.no;
    const inclinationDeg = (satrec.inclo * 180) / Math.PI;

    const position3D = latLngAltToVector3(lat, lng, alt);
    const surface3D = latLngAltToVector3(lat, lng, 0, GLOBE_RADIUS + 0.015);

    return {
      position3D,
      surface3D,
      lat,
      lng,
      alt,
      velocityKmS,
      periodMinutes,
      inclinationDeg,
    };
  } catch {
    return null;
  }
}

const COMPASS_POINTS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

export function degToCompass(deg: number): string {
  const normalized = ((deg % 360) + 360) % 360;
  const index = Math.round(normalized / 45) % 8;
  return COMPASS_POINTS[index];
}

/**
 * Compute observer-relative telemetry (azimuth, elevation, range, illumination).
 */
export function computeObserverTelemetry(
  tle: TleRecord,
  observer: { latitude: number; longitude: number; elevationMeters?: number },
  now: Date = new Date(),
) {
  try {
    const satrec = satellite.twoline2satrec(tle.line1, tle.line2);
    const result = satellite.propagate(satrec, now);
    if (typeof result.position === 'boolean' || !result.position) return null;

    const gmst = satellite.gstime(now);
    const posEci = result.position as satellite.EciVec3<number>;
    const posEcf = satellite.eciToEcf(posEci, gmst);
    const posGd = satellite.eciToGeodetic(posEci, gmst);

    const obsGd = {
      latitude: (observer.latitude * Math.PI) / 180,
      longitude: (observer.longitude * Math.PI) / 180,
      height: (observer.elevationMeters || 0) / 1000,
    };

    const lookAngles = satellite.ecfToLookAngles(obsGd, posEcf);
    const azimuthDeg = ((lookAngles.azimuth * 180) / Math.PI + 360) % 360;
    const elevationDeg = (lookAngles.elevation * 180) / Math.PI;
    const rangeKm = lookAngles.rangeSat;

    // Illumination check
    const sunDir = getSunVector3(now);
    const satDir = new THREE.Vector3(posEci.x, posEci.y, posEci.z).normalize();
    const sunDot = satDir.dot(sunDir);
    const isEclipsed = sunDot < -0.1;

    return {
      azimuthDeg,
      elevationDeg,
      rangeKm,
      compassHeading: degToCompass(azimuthDeg),
      isSunlit: !isEclipsed,
      lat: (posGd.latitude * 180) / Math.PI,
      lng: (posGd.longitude * 180) / Math.PI,
      alt: posGd.height,
    };
  } catch {
    return null;
  }
}

/**
 * Compute the approximate subsolar point (where Sun is at zenith) for directional lighting.
 */
export function getSunVector3(date: Date = new Date()): THREE.Vector3 {
  const utcHours =
    date.getUTCHours() +
    date.getUTCMinutes() / 60 +
    date.getUTCSeconds() / 3600;

  // Sun longitude: 12:00 UTC is at 0 degrees lon (Greenwich)
  const sunLng = -(utcHours - 12) * 15;

  // Day of year for solar declination
  const start = new Date(Date.UTC(date.getUTCFullYear(), 0, 0));
  const diff = date.getTime() - start.getTime();
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));

  // Solar declination (-23.44° to +23.44°)
  const sunLat = 23.44 * Math.sin(((dayOfYear - 80) * 2 * Math.PI) / 365.25);

  const vec = latLngAltToVector3(sunLat, sunLng, 0, 10);
  return vec.normalize();
}

/**
 * Create 3D vector LineSegments for all real world country borders.
 * Because these are 3D vector lines, they remain razor-sharp and NEVER pixelate or tear when zooming in!
 */
export function createWorldBorders3D(
  globeRadius: number = GLOBE_RADIUS,
): THREE.LineSegments {
  const vertices: number[] = [];
  const rings = worldBorders as [number, number][][];

  for (const ring of rings) {
    for (let i = 0; i < ring.length - 1; i++) {
      const lng1 = ring[i][0];
      const lat1 = ring[i][1];
      const lng2 = ring[i + 1][0];
      const lat2 = ring[i + 1][1];

      // Avoid long lines wrapping across the antimeridian (-180 to 180)
      if (Math.abs(lng2 - lng1) > 180) continue;

      const v1 = latLngAltToVector3(lat1, lng1, 0, globeRadius + 0.003);
      const v2 = latLngAltToVector3(lat2, lng2, 0, globeRadius + 0.003);

      vertices.push(v1.x, v1.y, v1.z, v2.x, v2.y, v2.z);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(vertices, 3),
  );

  const material = new THREE.LineBasicMaterial({
    color: 0x00f0ff,
    transparent: true,
    opacity: 0.65,
  });

  return new THREE.LineSegments(geometry, material);
}

/**
 * Procedural Earth texture generator for instant, offline-ready, high-tech globe rendering.
 * Renders real continent polygons from Natural Earth, graticules, equator, and glowing coastlines onto an HTML canvas.
 */
export function createProceduralEarthCanvas(): HTMLCanvasElement {
  const width = 4096;
  const height = 2048;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  // 1. Deep Aerospace Navy Ocean Base Gradient
  const oceanGrad = ctx.createLinearGradient(0, 0, 0, height);
  oceanGrad.addColorStop(0, '#030712');
  oceanGrad.addColorStop(0.5, '#060f26');
  oceanGrad.addColorStop(1, '#030712');
  ctx.fillStyle = oceanGrad;
  ctx.fillRect(0, 0, width, height);

  // 2. Lat/Long Graticule Grid (Subtle cartographic coordinates)
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.07)';
  ctx.lineWidth = 1;

  // Longitude lines (every 15°)
  for (let lng = -180; lng <= 180; lng += 15) {
    const x = ((lng + 180) / 360) * width;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }

  // Latitude lines (every 15°)
  for (let lat = -90; lat <= 90; lat += 15) {
    const y = ((90 - lat) / 180) * height;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  // Highlight Equator, Tropics, and Prime Meridian
  ctx.strokeStyle = 'rgba(0, 240, 255, 0.25)';
  ctx.lineWidth = 1.8;
  // Equator
  ctx.beginPath();
  ctx.moveTo(0, height / 2);
  ctx.lineTo(width, height / 2);
  ctx.stroke();
  // Prime Meridian
  ctx.beginPath();
  ctx.moveTo(width / 2, 0);
  ctx.lineTo(width / 2, height);
  ctx.stroke();

  // Helper to convert lat/lng to canvas x/y
  const toXY = (lng: number, lat: number): [number, number] => [
    ((lng + 180) / 360) * width,
    ((90 - lat) / 180) * height,
  ];

  // 3. Draw All Real World Country Polygons (Natural Earth 110m dataset)
  const rings = worldBorders as [number, number][][];
  ctx.fillStyle = '#0d162a'; // Deep slate-navy landmass
  ctx.strokeStyle = 'rgba(0, 240, 255, 0.45)'; // Glowing cyan coastline
  ctx.lineWidth = 1.4;

  for (const ring of rings) {
    if (ring.length < 3) continue;
    ctx.beginPath();
    const [startX, startY] = toXY(ring[0][0], ring[0][1]);
    ctx.moveTo(startX, startY);
    for (let i = 1; i < ring.length; i++) {
      const [x, y] = toXY(ring[i][0], ring[i][1]);
      ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  // 4. Glowing City Night Lights (Real coordinates of major global metropolitan hubs)
  const cityDots: [number, number, string][] = [
    // India
    [75.83, 25.18, 'Kota'],
    [77.21, 28.61, 'Delhi'],
    [72.88, 19.08, 'Mumbai'],
    [77.59, 12.97, 'Bengaluru'],
    [80.27, 13.08, 'Chennai'],
    [88.36, 22.57, 'Kolkata'],
    [78.49, 17.39, 'Hyderabad'],
    [75.79, 26.91, 'Jaipur'],
    [72.57, 23.02, 'Ahmedabad'],
    // East Asia
    [116.4, 39.9, 'Beijing'],
    [121.5, 31.2, 'Shanghai'],
    [113.3, 23.1, 'Guangzhou'],
    [139.7, 35.7, 'Tokyo'],
    [126.9, 37.6, 'Seoul'],
    [103.8, 1.35, 'Singapore'],
    [100.5, 13.75, 'Bangkok'],
    // Europe
    [0.1, 51.5, 'London'],
    [2.3, 48.9, 'Paris'],
    [13.4, 52.5, 'Berlin'],
    [12.5, 41.9, 'Rome'],
    [-3.7, 40.4, 'Madrid'],
    [37.6, 55.7, 'Moscow'],
    [4.9, 52.4, 'Amsterdam'],
    // North America
    [-74.0, 40.7, 'New York'],
    [-71.1, 42.4, 'Boston'],
    [-87.6, 41.9, 'Chicago'],
    [-118.2, 34.0, 'Los Angeles'],
    [-122.4, 37.8, 'San Francisco'],
    [-95.4, 29.8, 'Houston'],
    [-79.4, 43.65, 'Toronto'],
    // Middle East
    [55.3, 25.3, 'Dubai'],
    [46.7, 24.7, 'Riyadh'],
    [31.2, 30.0, 'Cairo'],
    // South America
    [-46.6, -23.5, 'São Paulo'],
    [-43.2, -22.9, 'Rio'],
    [-58.4, -34.6, 'Buenos Aires'],
    // Australia & Pacific
    [151.2, -33.9, 'Sydney'],
    [145.0, -37.8, 'Melbourne'],
  ];

  ctx.fillStyle = '#fde047'; // Warm golden city lights
  ctx.shadowColor = '#facc15';
  ctx.shadowBlur = 8;
  for (const [lng, lat] of cityDots) {
    const [x, y] = toXY(lng, lat);
    ctx.beginPath();
    ctx.arc(x, y, 3.5, 0, Math.PI * 2);
    ctx.fill();

    // Secondary scatter lights around main hubs
    for (let s = 0; s < 5; s++) {
      const offsetX = (Math.random() - 0.5) * 20;
      const offsetY = (Math.random() - 0.5) * 12;
      ctx.fillRect(x + offsetX, y + offsetY, 1.6, 1.6);
    }
  }
  ctx.shadowBlur = 0;

  return canvas;
}
