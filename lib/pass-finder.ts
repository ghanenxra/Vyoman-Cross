import type { TleRecord, ObserverLocation, VisiblePass } from './types';
import { TRACKED_OBJECTS } from './satellites';
import {
  checkVisibility,
  computeLookAngles,
  isSkyDarkEnough,
  getTleInclinationDeg,
  canReachObserverLatitude,
} from './orbit';
import { azimuthToCompass } from './compass';
import { estimateBrightness } from './brightness';
import { getAllCachedTles, getCachedTle } from './tle-cache';

// ============================================================
// Pass finder — scans time windows for visible satellite passes
// ============================================================

/** Time step for scanning (30 seconds) */
const SCAN_STEP_MS = 30 * 1000;

/** Refine step for finding precise start/end (5 seconds) */
const REFINE_STEP_MS = 5 * 1000;

/** Minimum pass duration to report (seconds) */
const MIN_PASS_DURATION_S = 15;

function getCategoryForNoradId(noradId: number): 'station' | 'telescope' | 'starlink' | 'other' {
  const cached = getCachedTle(noradId);
  if (cached?.category) return cached.category;
  const tracked = TRACKED_OBJECTS.find((o) => o.noradId === noradId);
  if (tracked) return tracked.category;
  return 'starlink';
}

function getNameForTle(tle: TleRecord): string {
  const tracked = TRACKED_OBJECTS.find((o) => o.noradId === tle.noradId);
  return tracked ? tracked.name : tle.name;
}

/**
 * Build a VisiblePass object from a contiguous visible window.
 */
function buildPass(
  tle: TleRecord,
  observer: ObserverLocation,
  startTime: Date,
  endTime: Date,
): VisiblePass | null {
  const durationSeconds = (endTime.getTime() - startTime.getTime()) / 1000;
  if (durationSeconds < MIN_PASS_DURATION_S) return null;

  // Find peak elevation by scanning within the pass window
  let peakElev = 0;
  let peakTime = startTime;
  let peakAz = 0;
  let peakRange = 1000;

  const startLook = computeLookAngles(tle, observer, startTime);
  const endLook = computeLookAngles(tle, observer, endTime);

  for (
    let t = startTime.getTime();
    t <= endTime.getTime();
    t += REFINE_STEP_MS
  ) {
    const look = computeLookAngles(tle, observer, new Date(t));
    if (look && look.elevationDeg > peakElev) {
      peakElev = look.elevationDeg;
      peakTime = new Date(t);
      peakAz = look.azimuthDeg;
      peakRange = look.rangeKm;
    }
  }

  const category = getCategoryForNoradId(tle.noradId);

  // Naked-eye threshold: Starlinks must reach at least 15° peak elevation
  // to be visually distinguishable from light pollution & horizon obstacles
  if (category === 'starlink' && peakElev < 15) {
    return null;
  }

  const brightness = estimateBrightness(peakElev, peakRange, category);

  return {
    noradId: tle.noradId,
    objectName: getNameForTle(tle),
    category,
    startTime: startTime.toISOString(),
    peakTime: peakTime.toISOString(),
    endTime: endTime.toISOString(),
    startAzimuthDeg: startLook ? startLook.azimuthDeg : peakAz,
    peakAzimuthDeg: peakAz,
    endAzimuthDeg: endLook ? endLook.azimuthDeg : peakAz,
    peakElevationDeg: Math.round(peakElev * 10) / 10,
    compassDirection: azimuthToCompass(peakAz),
    magnitude: brightness.magnitude,
    brightnessLabel: brightness.brightnessLabel,
    durationSeconds: Math.round(durationSeconds),
  };
}

/**
 * Pre-compute dark-sky windows for an observer over a time range.
 * Uses coarse 5-minute steps to find periods where the sun is below -6°.
 * Returns an array of [start, end] time ranges in ms.
 */
function findDarkWindows(
  observer: ObserverLocation,
  fromMs: number,
  toMs: number,
): Array<[number, number]> {
  const DARK_CHECK_STEP_MS = 5 * 60 * 1000; // 5 minutes
  const windows: Array<[number, number]> = [];
  let windowStart: number | null = null;

  for (let t = fromMs; t <= toMs; t += DARK_CHECK_STEP_MS) {
    const dark = isSkyDarkEnough(observer, new Date(t));
    if (dark) {
      if (windowStart === null) windowStart = t;
    } else if (windowStart !== null) {
      // Add margin to catch transitions
      windows.push([
        Math.max(fromMs, windowStart - DARK_CHECK_STEP_MS),
        Math.min(toMs, t + DARK_CHECK_STEP_MS),
      ]);
      windowStart = null;
    }
  }
  if (windowStart !== null) {
    windows.push([
      Math.max(fromMs, windowStart - DARK_CHECK_STEP_MS),
      toMs,
    ]);
  }
  return windows;
}

/**
 * Find all visible passes for a single TLE across a time window.
 * Optimized: only scans within pre-computed dark-sky windows.
 */
function findPassesForTle(
  tle: TleRecord,
  observer: ObserverLocation,
  fromDate: Date,
  toDate: Date,
  darkWindows: Array<[number, number]>,
): VisiblePass[] {
  const passes: VisiblePass[] = [];

  for (const [darkStart, darkEnd] of darkWindows) {
    let passStart: Date | null = null;
    let lastVisibleTime: Date | null = null;

    for (let t = darkStart; t <= darkEnd; t += SCAN_STEP_MS) {
      const date = new Date(t);
      // skipSkyDarkCheck = true since t is guaranteed to be within darkWindows
      const visible = checkVisibility(tle, observer, date, true);

      if (visible) {
        if (!passStart) {
          // Start of a new pass — refine the start time
          passStart = date;
          for (let rt = t - SCAN_STEP_MS; rt < t; rt += REFINE_STEP_MS) {
            const rDate = new Date(rt);
            if (checkVisibility(tle, observer, rDate, true)) {
              passStart = rDate;
              break;
            }
          }
        }
        lastVisibleTime = date;
      } else if (passStart && lastVisibleTime) {
        // End of a pass — refine the end time
        let passEnd = lastVisibleTime;
        for (
          let rt = lastVisibleTime.getTime();
          rt < t;
          rt += REFINE_STEP_MS
        ) {
          const rDate = new Date(rt);
          if (checkVisibility(tle, observer, rDate, true)) {
            passEnd = rDate;
          } else {
            break;
          }
        }

        const pass = buildPass(tle, observer, passStart, passEnd);
        if (pass) passes.push(pass);

        passStart = null;
        lastVisibleTime = null;
      }
    }

    // Handle pass that extends to the end of the dark window
    if (passStart && lastVisibleTime) {
      const pass = buildPass(tle, observer, passStart, lastVisibleTime);
      if (pass) passes.push(pass);
    }
  }

  return passes;
}

/**
 * Find satellites currently visible right now.
 */
export function findCurrentPasses(
  observer: ObserverLocation,
): VisiblePass[] {
  const now = new Date();
  // Fast return if observer sky is not dark right now
  if (!isSkyDarkEnough(observer, now)) {
    return [];
  }

  const allTles = getAllCachedTles();
  // Filter only satellites whose inclination can physically reach observer's latitude
  const tles = allTles.filter((tle) => {
    const inc = getTleInclinationDeg(tle.line2);
    return canReachObserverLatitude(inc, observer.latitude);
  });

  const results: VisiblePass[] = [];

  for (const tle of tles) {
    const visible = checkVisibility(tle, observer, now, true);
    if (!visible) continue;

    // Found a visible satellite — scan around now to find pass bounds
    let startTime = now;
    for (let t = now.getTime() - 10 * 60 * 1000; t < now.getTime(); t += REFINE_STEP_MS) {
      if (checkVisibility(tle, observer, new Date(t), true)) {
        startTime = new Date(t);
        break;
      }
    }

    let endTime = now;
    for (let t = now.getTime(); t < now.getTime() + 10 * 60 * 1000; t += REFINE_STEP_MS) {
      if (checkVisibility(tle, observer, new Date(t), true)) {
        endTime = new Date(t);
      } else {
        break;
      }
    }

    const pass = buildPass(tle, observer, startTime, endTime);
    if (pass) results.push(pass);
  }

  return results;
}

/**
 * Find the next upcoming visible pass (within the next 24 hours).
 */
export function findNextPass(
  observer: ObserverLocation,
): VisiblePass | null {
  const allTles = getAllCachedTles();
  const tles = allTles.filter((tle) => {
    const inc = getTleInclinationDeg(tle.line2);
    return canReachObserverLatitude(inc, observer.latitude);
  });

  const now = new Date();
  const endMs = now.getTime() + 24 * 60 * 60 * 1000;
  const end = new Date(endMs);

  // Pre-compute dark-sky windows once for all satellites
  const darkWindows = findDarkWindows(observer, now.getTime(), endMs);
  if (darkWindows.length === 0) return null;

  let earliest: VisiblePass | null = null;

  for (const tle of tles) {
    const passes = findPassesForTle(tle, observer, now, end, darkWindows);
    for (const pass of passes) {
      if (!earliest || pass.startTime < earliest.startTime) {
        earliest = pass;
      }
    }
  }

  return earliest;
}

/**
 * Find all visible passes in the next N days.
 * Includes Starlink train detection and latitude reachability filtering.
 */
export function findForecastPasses(
  observer: ObserverLocation,
  days: number = 7,
): VisiblePass[] {
  const allTles = getAllCachedTles();
  // Geolocation pre-filter: only scan satellites that can physically reach observer latitude
  const tles = allTles.filter((tle) => {
    const inc = getTleInclinationDeg(tle.line2);
    return canReachObserverLatitude(inc, observer.latitude);
  });

  const now = new Date();
  const endMs = now.getTime() + days * 24 * 60 * 60 * 1000;
  const end = new Date(endMs);

  // Pre-compute dark-sky windows once — shared across all satellites
  const darkWindows = findDarkWindows(observer, now.getTime(), endMs);
  if (darkWindows.length === 0) return [];

  const allPasses: VisiblePass[] = [];

  for (const tle of tles) {
    const passes = findPassesForTle(tle, observer, now, end, darkWindows);
    allPasses.push(...passes);
  }

  // Sort by start time
  allPasses.sort((a, b) => a.startTime.localeCompare(b.startTime));

  // Detect Starlink trains: consecutive Starlink passes within 15 minutes of each other
  for (let i = 0; i < allPasses.length; i++) {
    const current = allPasses[i];
    if (current.category !== 'starlink') continue;

    const currentStart = new Date(current.startTime).getTime();
    const hasNeighbor =
      (i > 0 &&
        allPasses[i - 1].category === 'starlink' &&
        Math.abs(currentStart - new Date(allPasses[i - 1].startTime).getTime()) <= 15 * 60 * 1000) ||
      (i < allPasses.length - 1 &&
        allPasses[i + 1].category === 'starlink' &&
        Math.abs(new Date(allPasses[i + 1].startTime).getTime() - currentStart) <= 15 * 60 * 1000);

    if (hasNeighbor) {
      current.isTrain = true;
    }
  }

  return allPasses;
}
