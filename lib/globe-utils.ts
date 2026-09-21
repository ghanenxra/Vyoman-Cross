import * as THREE from 'three';
import * as satellite from 'satellite.js';
import type { TleRecord } from './types';

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
 * Procedural Earth texture generator for instant, offline-ready, high-tech globe rendering.
 * Renders continent polygons, graticules, equator, and glowing coastlines onto an HTML canvas.
 */
export function createProceduralEarthCanvas(): HTMLCanvasElement {
  const width = 2048;
  const height = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  // 1. Deep Space/Ocean Base Gradient
  const oceanGrad = ctx.createLinearGradient(0, 0, 0, height);
  oceanGrad.addColorStop(0, '#030712');
  oceanGrad.addColorStop(0.5, '#060f26');
  oceanGrad.addColorStop(1, '#030712');
  ctx.fillStyle = oceanGrad;
  ctx.fillRect(0, 0, width, height);

  // 2. Lat/Long Graticule Grid
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.08)';
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

  // Highlight Equator and Prime Meridian
  ctx.strokeStyle = 'rgba(0, 240, 255, 0.25)';
  ctx.lineWidth = 1.5;
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

  // 3. Draw Continents (Equirectangular Projections of Major Landmasses)
  // Helper to convert lat/lng to canvas x/y
  const toXY = (lng: number, lat: number): [number, number] => [
    ((lng + 180) / 360) * width,
    ((90 - lat) / 180) * height,
  ];

  const drawPolygon = (coords: [number, number][], fill: string, stroke: string) => {
    if (coords.length < 3) return;
    ctx.beginPath();
    const [startX, startY] = toXY(coords[0][0], coords[0][1]);
    ctx.moveTo(startX, startY);
    for (let i = 1; i < coords.length; i++) {
      const [x, y] = toXY(coords[i][0], coords[i][1]);
      ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1.8;
    ctx.stroke();
  };

  const landFill = '#0f172a'; // Slate-900 land
  const landStroke = 'rgba(0, 240, 255, 0.65)'; // Cyan neon coastline

  // Continents approximate polygonal outlines:
  // Africa
  drawPolygon(
    [
      [-17, 30], [-5, 36], [10, 37], [25, 32], [32, 31], [35, 25],
      [43, 12], [51, 12], [45, 5], [40, -4], [35, -12], [33, -25],
      [28, -33], [19, -35], [15, -29], [12, -15], [9, 4], [3, 6],
      [-5, 5], [-15, 11], [-17, 16], [-17, 30],
    ],
    landFill,
    landStroke,
  );

  // Madagascar
  drawPolygon(
    [[44, -12], [50, -13], [50, -25], [44, -25]],
    landFill,
    landStroke,
  );

  // Eurasia (Europe + Asia + India + SE Asia)
  drawPolygon(
    [
      [-10, 36], [0, 43], [10, 45], [15, 55], [25, 60], [30, 70],
      [60, 76], [100, 77], [140, 72], [170, 68], [170, 60], [140, 50],
      [130, 43], [122, 30], [110, 20], [105, 10], [98, 8], [90, 22],
      [80, 13], [73, 19], [68, 25], [60, 25], [50, 30], [42, 40],
      [35, 36], [28, 41], [22, 37], [13, 38], [5, 36], [-5, 36],
      [-9, 43], [-5, 48], [5, 54], [10, 58], [25, 65], [15, 68],
      [5, 62], [0, 50], [-10, 43], [-10, 36],
    ],
    landFill,
    landStroke,
  );

  // Indian Subcontinent Detail
  drawPolygon(
    [
      [68, 24], [72, 21], [74, 15], [77, 8], [80, 10], [80, 16],
      [87, 21], [90, 24], [88, 27], [80, 30], [74, 32], [70, 30],
      [68, 24],
    ],
    '#131c33',
    'rgba(0, 240, 255, 0.85)',
  );

  // North America
  drawPolygon(
    [
      [-168, 66], [-160, 55], [-140, 60], [-130, 50], [-124, 38],
      [-117, 32], [-105, 23], [-97, 18], [-85, 21], [-80, 25],
      [-81, 30], [-75, 35], [-70, 43], [-64, 46], [-53, 47],
      [-56, 53], [-64, 60], [-80, 65], [-95, 70], [-120, 72],
      [-140, 70], [-160, 71], [-168, 66],
    ],
    landFill,
    landStroke,
  );

  // South America
  drawPolygon(
    [
      [-77, 8], [-72, 11], [-60, 9], [-50, 0], [-35, -5],
      [-37, -12], [-40, -22], [-50, -30], [-55, -40], [-65, -54],
      [-73, -52], [-74, -45], [-70, -30], [-76, -15], [-80, -2],
      [-77, 8],
    ],
    landFill,
    landStroke,
  );

  // Australia
  drawPolygon(
    [
      [114, -22], [122, -18], [130, -12], [137, -12], [142, -11],
      [145, -15], [150, -22], [153, -28], [148, -37], [140, -37],
      [135, -34], [128, -32], [118, -35], [115, -30], [114, -22],
    ],
    landFill,
    landStroke,
  );

  // Japan & East Asia islands
  drawPolygon(
    [[130, 32], [135, 35], [142, 44], [140, 45], [132, 38]],
    landFill,
    landStroke,
  );

  // UK & Ireland
  drawPolygon(
    [[-10, 52], [-6, 58], [-1, 58], [1, 51], [-5, 50]],
    landFill,
    landStroke,
  );

  // 4. Glowing City Night Lights (Clusters in major metropolitan belts)
  const cityDots: [number, number][] = [
    // India
    [75.8, 25.2], [77.2, 28.6], [72.8, 19.1], [80.3, 13.1], [88.4, 22.6], [77.6, 12.9],
    // East Asia
    [116.4, 39.9], [121.5, 31.2], [113.3, 23.1], [139.7, 35.7], [126.9, 37.6],
    // Europe
    [0.1, 51.5], [2.3, 48.9], [13.4, 52.5], [12.5, 41.9], [-3.7, 40.4], [37.6, 55.7],
    // North America
    [-74.0, 40.7], [-71.1, 42.4], [-87.6, 41.9], [-118.2, 34.0], [-122.4, 37.8], [-95.4, 29.8],
    // Middle East
    [55.3, 25.3], [46.7, 24.7], [31.2, 30.0],
    // South America
    [-46.6, -23.5], [-43.2, -22.9], [-58.4, -34.6],
    // Australia
    [151.2, -33.9], [145.0, -37.8],
  ];

  ctx.fillStyle = '#fde047'; // Warm golden city lights
  ctx.shadowColor = '#facc15';
  ctx.shadowBlur = 6;
  for (const [lng, lat] of cityDots) {
    const [x, y] = toXY(lng, lat);
    ctx.beginPath();
    ctx.arc(x, y, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Secondary scatter lights around main hubs
    for (let s = 0; s < 4; s++) {
      const offsetX = (Math.random() - 0.5) * 14;
      const offsetY = (Math.random() - 0.5) * 8;
      ctx.fillRect(x + offsetX, y + offsetY, 1.2, 1.2);
    }
  }
  ctx.shadowBlur = 0;

  return canvas;
}
