import { TrackedObject } from './types';

/**
 * Whitelist of primary tracked objects.
 * Additional active Starlink satellites are seeded via data/satellites.json.
 */
export const TRACKED_OBJECTS: TrackedObject[] = [
  { noradId: 25544, name: 'ISS (ZARYA)', category: 'station' },
  { noradId: 48274, name: 'TIANGONG', category: 'station' },
  { noradId: 20580, name: 'HST (Hubble)', category: 'telescope' },
];

/** Number of most-recent Starlink satellites to track */
export const STARLINK_RECENT_COUNT = 200;

/** Minimum elevation in degrees for a pass to "count" */
export const MIN_ELEVATION_DEG = 10;

/** Sun altitude threshold for dark-enough sky (civil twilight) */
export const SUN_ALTITUDE_THRESHOLD_DEG = -6;
