import { TleRecord } from './types';
import { TRACKED_OBJECTS, STARLINK_RECENT_COUNT } from './satellites';
import seedSatellites from '@/data/satellites.json';

// ============================================================
// In-memory TLE cache backed by bundled persistent database
// ============================================================

const cache = new Map<number, TleRecord>();
let lastFullRefresh: Date | null = null;

// Initialize cache synchronously from bundled seed database
for (const sat of seedSatellites) {
  cache.set(sat.noradId, sat as TleRecord);
}
lastFullRefresh = new Date();

/** Get a cached TLE record for a NORAD ID */
export function getCachedTle(noradId: number): TleRecord | undefined {
  return cache.get(noradId);
}

/** Get all cached TLE records */
export function getAllCachedTles(): TleRecord[] {
  return Array.from(cache.values());
}

/** Check whether the cache is stale (> 24h since last refresh) */
export function isCacheStale(): boolean {
  if (!lastFullRefresh) return true;
  const hoursSince = (Date.now() - lastFullRefresh.getTime()) / (1000 * 60 * 60);
  return hoursSince > 24;
}

/** Fetch a single TLE from CelesTrak by NORAD catalog number */
async function fetchTleFromCelestrak(noradId: number): Promise<TleRecord | null> {
  try {
    const url = `https://celestrak.org/NORAD/elements/gp.php?CATNR=${noradId}&FORMAT=tle`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'VyomanCross/1.0 (NakedEyeTracker)' },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;

    const text = (await res.text()).trim();
    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);

    // CelesTrak TLE format: line 0 = name, line 1 = TLE line 1, line 2 = TLE line 2
    if (lines.length < 3) return null;

    return {
      noradId,
      name: lines[0],
      line1: lines[1],
      line2: lines[2],
      fetchedAt: new Date().toISOString(),
    };
  } catch {
    console.error(`[tle-cache] Failed to fetch TLE for NORAD ${noradId}`);
    return null;
  }
}

/** Fetch the most recently launched Starlink satellites */
async function fetchRecentStarlinks(count: number): Promise<TleRecord[]> {
  const urls = [
    'https://celestrak.org/NORAD/elements/supplemental/sup-gp.php?FILE=starlink&FORMAT=tle',
    'https://celestrak.org/NORAD/elements/gp.php?GROUP=starlink&FORMAT=tle',
  ];

  for (const url of urls) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'VyomanCross/1.0 (NakedEyeTracker)' },
        signal: AbortSignal.timeout(20000),
      });
      if (!res.ok) continue;

      const text = (await res.text()).trim();
      const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);

      if (lines.length < 3) continue;

      // Parse into TLE records (every 3 lines = one satellite)
      const records: TleRecord[] = [];
      for (let i = 0; i + 2 < lines.length; i += 3) {
        const name = lines[i];
        const line1 = lines[i + 1];
        const line2 = lines[i + 2];

        // Ensure valid TLE line headers
        if (!line1.startsWith('1 ') || !line2.startsWith('2 ')) continue;

        // Extract NORAD ID from TLE line 1 (columns 3–7)
        const idStr = line1.substring(2, 7).trim();
        const noradId = parseInt(idStr, 10);
        if (isNaN(noradId)) continue;

        records.push({
          noradId,
          name,
          category: 'starlink',
          line1,
          line2,
          fetchedAt: new Date().toISOString(),
        });
      }

      if (records.length > 0) {
        // Sort by NORAD ID descending (newest first), take top N
        records.sort((a, b) => b.noradId - a.noradId);
        return records.slice(0, count);
      }
    } catch {
      continue;
    }
  }

  console.warn('[tle-cache] Could not fetch fresh Starlinks from CelesTrak, using cached/seed records');
  return [];
}

/**
 * Refresh all TLEs in the cache.
 * Called by /api/tle/refresh (cron).
 */
export async function refreshAllTles(): Promise<{ updated: number; failed: number }> {
  let updated = 0;
  let failed = 0;

  // 1. Fetch whitelist objects in parallel
  const whitelistResults = await Promise.allSettled(
    TRACKED_OBJECTS.map((obj) => fetchTleFromCelestrak(obj.noradId)),
  );
  for (let i = 0; i < TRACKED_OBJECTS.length; i++) {
    const result = whitelistResults[i];
    if (result.status === 'fulfilled' && result.value) {
      const record = result.value;
      record.name = TRACKED_OBJECTS[i].name; // Use our canonical name
      record.category = TRACKED_OBJECTS[i].category;
      cache.set(TRACKED_OBJECTS[i].noradId, record);
      updated++;
    } else {
      failed++;
    }
  }

  // 2. Fetch recent Starlinks (single request for the full group)
  const starlinks = await fetchRecentStarlinks(STARLINK_RECENT_COUNT);
  for (const sl of starlinks) {
    cache.set(sl.noradId, sl);
    updated++;
  }

  lastFullRefresh = new Date();
  console.log(`[tle-cache] Refresh complete: ${updated} updated, ${failed} failed, ${cache.size} total cached`);
  return { updated, failed };
}

/**
 * Ensure the cache has data. Call this before computing passes.
 * If the cache is empty, triggers a seed or full refresh.
 */
export async function ensureCachePopulated(): Promise<void> {
  if (cache.size === 0) {
    for (const sat of seedSatellites) {
      cache.set(sat.noradId, sat as TleRecord);
    }
  }
}
