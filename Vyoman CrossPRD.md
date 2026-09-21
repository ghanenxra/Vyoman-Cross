# PRD: SkyPass — Naked-Eye Satellite Tracker (Web)

**For:** Antigravity (qwen3:8b coding agent) — build this end to end from this document alone.
**Owner:** Ghanendra
**Status:** Ready for build — MVP scope locked
**Target platform:** Website only, responsive (desktop + mobile browsers) — no native app
**Hosting:** Vercel (frontend + API routes), free tier

---

## 1. One-line pitch
A website where a user gives their location (typed lat/long, or one-tap live GPS) and instantly sees: "what's flying over you right now that you can actually see," which direction to face, how high to look, and a 7-day forecast of upcoming visible passes.

## 2. Problem
Existing trackers (N2YO, Heavens-Above) are functional but visually dated and cluttered. There's no clean, fast, dark-mode-first site that reduces this to: direction + angle + countdown.

## 3. Goals (MVP)
1. Location input two ways: manual lat/long, or "Use my location" (browser Geolocation API).
2. Show what's currently overhead **and** currently naked-eye visible (sunlit satellite + dark-enough sky + above horizon).
3. Plain-language guidance per pass: compass direction, elevation angle, start/peak/end time, duration.
4. 7-day forecast of upcoming visible passes, sorted by time, with a brightness indicator.
5. Dark-mode-only UI, minimal chrome, not templated/generic-looking.

## 4. Non-goals (explicitly out of MVP scope)
- 3D Earth/globe visualization — Phase 2. Structure the data layer so it bolts on later without a rewrite.
- User accounts, saved locations, notifications (push/email/SMS).
- Radio-pass data (ham radio use case) — visual passes only.
- Native mobile app.
- Tracking the entire orbital catalog — curated whitelist only (Section 8.3), expandable later.

## 5. Target user & user flow
Anyone curious about the night sky, no astronomy background assumed.

1. Land on site → dark, minimal hero → two buttons: **"Use my location"** / **"Enter coordinates manually."**
2. Manual entry: two numeric fields (lat, long) + a "Locate" button. Live location: browser permission prompt → resolved automatically.
3. Location resolved → **"Right now" card** appears immediately: if something's visible in the next few minutes, show direction + angle + live countdown; if not, show "Nothing visible right now — next pass in Xh Ym" with a link that jumps to that entry in the forecast list.
4. Below that: **"Next 7 days" list**, each row = date/time, object name, direction, max elevation, duration, brightness tag (e.g. "Bright," "Faint").
5. Tapping a row expands it inline into the same direction/angle guidance format as the "Right now" card, timed for that future pass — reuse the same guidance component for both.

## 6. System architecture (high level)

```
Browser (Next.js client)
  │
  │  1. Gets location (geolocation API or manual form)
  │  2. Calls own backend, never external APIs directly
  ▼
Next.js API Routes (Vercel serverless functions)
  │
  ├── /api/passes/now      → "what's visible right now" for a lat/long
  ├── /api/passes/forecast → 7-day visible pass list for a lat/long
  └── /api/tle/refresh     → scheduled job, refreshes cached TLE data
  │
  ▼
Data layer
  ├── TLE cache (in-memory + file/KV, refreshed every 2–6h) ← CelesTrak (free, no key)
  └── (optional) N2YO API ← used only for brightness/magnitude if self-estimating proves impractical
```

Nothing external is called directly from the browser — all orbital data fetches happen server-side (API routes), both to hide any API keys and to let you cache aggressively (same location within the same few minutes ⇒ same answer, no recompute needed).

## 7. Data models (TypeScript — use these interfaces directly)

```ts
// A tracked object's static identity
interface TrackedObject {
  noradId: number;
  name: string;            // "ISS (ZARYA)", "TIANGONG", "HST", etc.
  category: 'station' | 'telescope' | 'starlink' | 'other';
}

// Raw TLE, cached per object
interface TleRecord {
  noradId: number;
  line1: string;
  line2: string;
  fetchedAt: string;       // ISO timestamp, used to know when to refresh
}

// A single pass, computed for a given observer location
interface VisiblePass {
  noradId: number;
  objectName: string;
  startTime: string;       // ISO — when it crosses above the elevation threshold
  peakTime: string;        // ISO — max elevation moment
  endTime: string;         // ISO — drops back below threshold
  startAzimuthDeg: number;
  peakAzimuthDeg: number;
  endAzimuthDeg: number;
  peakElevationDeg: number;
  compassDirection: string;   // derived from peakAzimuthDeg, e.g. "NW"
  magnitude: number | null;   // lower = brighter; null if unknown
  brightnessLabel: 'very bright' | 'bright' | 'moderate' | 'faint' | 'unknown';
  durationSeconds: number;
}

// Observer location, always in decimal degrees
interface ObserverLocation {
  latitude: number;    // -90..90
  longitude: number;   // -180..180
  elevationMeters?: number; // default 0 if unknown — small effect, fine to omit
}
```

## 8. Core computation — implement exactly this

### 8.1 Orbit propagation & look angles
Use **satellite.js** (npm, no key). For each tracked object, per request (or per cached time-slice):

```ts
import * as satellite from 'satellite.js';

const satrec = satellite.twoline2satrec(tle.line1, tle.line2);
const now = new Date();
const { position: positionEci } = satellite.propagate(satrec, now);
const gmst = satellite.gstime(now);

const observerGd = {
  latitude: satellite.degreesToRadians(observer.latitude),
  longitude: satellite.degreesToRadians(observer.longitude),
  height: (observer.elevationMeters ?? 0) / 1000, // km
};

const positionEcf = satellite.eciToEcf(positionEci, gmst);
const lookAngles = satellite.ecfToLookAngles(observerGd, positionEcf);
// lookAngles.azimuth, .elevation are in RADIANS — convert to degrees for display
// lookAngles.rangeSat is in km
```

A pass "counts" (object above horizon, worth showing) when `elevation > 10°` — below that, horizon obstructions (buildings, trees) make it unreliable to point people at.

### 8.2 Visibility check (sunlit satellite + dark sky)
Two conditions must both be true:

**a) Observer's sky is dark enough.** Use **SunCalc** (npm, no key):
```ts
import SunCalc from 'suncalc';
const sunPos = SunCalc.getPosition(now, observer.latitude, observer.longitude);
const sunAltitudeDeg = sunPos.altitude * (180 / Math.PI);
const skyIsDarkEnough = sunAltitudeDeg < -6; // civil twilight or darker
```

**b) The satellite itself is sunlit (not in Earth's shadow).** This needs a sun-position vector in the same ECI frame as the satellite position, then a standard cylindrical shadow test:
```ts
// Get sun ECI vector — use the `astronomy-engine` npm package (no key, well-maintained)
// astronomy-engine's Equator/GeoVector functions give a geocentric equatorial vector
// close enough to TEME for this shadow check at MVP precision.
function isSunlit(satEciKm: {x:number,y:number,z:number}, sunEciKm: {x:number,y:number,z:number}): boolean {
  const EARTH_RADIUS_KM = 6378.137;
  const dot = satEciKm.x*sunEciKm.x + satEciKm.y*sunEciKm.y + satEciKm.z*sunEciKm.z;
  const satMag = Math.hypot(satEciKm.x, satEciKm.y, satEciKm.z);
  const sunMag = Math.hypot(sunEciKm.x, sunEciKm.y, sunEciKm.z);
  const theta = Math.acos(dot / (satMag * sunMag));
  if (theta < Math.PI / 2) return true; // satellite on the sunlit side of Earth
  const distFromShadowAxis = satMag * Math.sin(theta);
  return distFromShadowAxis > EARTH_RADIUS_KM; // outside the shadow cylinder ⇒ still sunlit
}
```
This cylindrical-shadow model is the standard approximation used by most open-source pass predictors — it's not perfectly precise (real umbra is a cone, not a cylinder) but is more than good enough for "should I go outside and look" accuracy. Don't over-engineer this further for MVP.

**A pass is "visible"** only when: `elevation > 10°` AND `skyIsDarkEnough` AND `isSunlit(satellite position, sun position)` are all true at that moment.

### 8.3 Brightness / magnitude
Self-estimating visual magnitude accurately requires phase-angle + range + satellite-specific reflectivity data that isn't worth building for MVP. Two options, pick based on how the build is going:
- **Simple (default):** approximate brightness label from range alone — closer + higher elevation passes are brighter. Bucket into labels using pass range and peak elevation (e.g. peak elevation > 40° and range < 800km → "bright"; otherwise scale down). This is a rough heuristic, label it as such in the UI copy if needed (no need to expose "estimated" to the user, just don't over-promise precision).
- **Better (optional, use N2YO):** call N2YO's `get_visualpasses` endpoint for objects in the whitelist, which returns real predicted magnitude per pass. Cache aggressively (same location, refresh daily) to stay well under the 1,000 req/hr free-tier limit. Use this if the heuristic above feels unsatisfying once you see it rendered.

### 8.4 Compass direction from azimuth
```ts
function azimuthToCompass(deg: number): string {
  const dirs = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];
  return dirs[Math.round(deg / 22.5) % 16];
}
```
Use the 16-point version for the expanded pass detail view; it's fine to collapse to 8-point (N/NE/E/SE/S/SW/W/NW) in the compact "Right now" card if that reads cleaner.

## 9. Tracked object whitelist (MVP — hardcode these NORAD IDs, expand later)

| Object | NORAD ID | Category | Notes |
|---|---|---|---|
| ISS (ZARYA) | 25544 | station | Always the most-requested object, anchor of the app |
| Tiangong (CSS) | 48274 | station | Chinese space station |
| Hubble Space Telescope | 20580 | telescope | Dimmer than ISS but a fun one to include |
| Starlink (recent batch) | *(rotating — see below)* | starlink | Bright "trains" shortly after launch; fades over weeks as satellites raise/spread orbit |

For Starlink: don't hardcode specific IDs since they change constantly. Instead, periodically (e.g. daily, in the same TLE-refresh job) pull the full Starlink group TLE list from CelesTrak (URL in Section 10) and include only the N most-recently-launched objects (sort by NORAD ID descending, take the newest ~20) — those are the ones still bright enough to matter. Older Starlinks are not worth tracking.

## 10. External data sources (exact URLs)

**CelesTrak (primary, no key required):**
- Single object by catalog number: `https://celestrak.org/NORAD/elements/gp.php?CATNR={noradId}&FORMAT=tle`
- Full Starlink group: `https://celestrak.org/NORAD/elements/gp.php?GROUP=starlink&FORMAT=tle`
- Respect CelesTrak's fair-use expectation: don't hit it more than a few times an hour — the refresh job (Section 12) already handles this, don't add extra ad-hoc calls elsewhere in the code.

**N2YO (optional, requires free API key from n2yo.com/api):**
- Base: `https://api.n2yo.com/rest/v1/satellite/`
- Visual passes: `.../visualpasses/{noradId}/{lat}/{lng}/{alt}/{days}/{minVisibility}&apiKey={key}`
- Free tier: 1,000 requests/hour — plenty at this scale if you cache per-location responses for at least an hour.
- **Never expose the N2YO key to the client** — only call it from a server-side API route, key stored as an environment variable (see Section 13).

## 11. API routes to build (Next.js API routes / route handlers)

### `GET /api/passes/now?lat={lat}&lng={lng}`
Returns the current visibility state for the whitelist at that location.
```ts
// Response shape
interface NowResponse {
  visibleNow: VisiblePass[];       // usually 0 or 1 items, could be more if multiple overlap
  nextPass: VisiblePass | null;    // soonest upcoming pass if nothing's visible right now
}
```
- Validate lat/lng are in range; 400 if not.
- Compute against the current cached TLE set (Section 8.1–8.2) for every whitelisted object, filter to visible ones.

### `GET /api/passes/forecast?lat={lat}&lng={lng}&days=7`
```ts
interface ForecastResponse {
  passes: VisiblePass[]; // sorted by startTime ascending, next 7 days
}
```
- Compute by stepping forward in time (e.g. 30–60 second steps is plenty of resolution — don't need per-second for a 7-day scan) across the whitelist, collecting contiguous visible windows into passes.
- Cache the result per (rounded lat/lng, day) — e.g. round to 2 decimal places (~1km precision, plenty for pointing at the sky) so nearby users share a cache entry. Refresh once a day (TLEs go stale after a few days anyway, and this recomputation is the expensive one).

### `POST /api/tle/refresh` (internal/cron, not user-facing)
- Pulls fresh TLEs from CelesTrak for the whitelist (Section 9–10), updates the cache.
- Trigger via Vercel Cron (`vercel.json` cron config) every 4–6 hours — no need for anything fancier.

## 12. Caching strategy
Start simple, upgrade only if needed:
- **v0 (ship this first):** in-memory cache inside the serverless function (works fine short-term, resets on cold start — acceptable since TLE refresh is cheap and infrequent anyway).
- **v1 (if cold-start cache misses become annoying):** Upstash Redis (free tier, integrates natively with Vercel) — store TLE cache and forecast-response cache there instead of in-memory.
Don't build the Redis layer before you need it — get the app working with in-memory cache first.

## 13. Environment variables
```
N2YO_API_KEY=            # optional — only needed if using N2YO for brightness data
UPSTASH_REDIS_URL=       # optional — only needed if/when you move off in-memory cache
UPSTASH_REDIS_TOKEN=     # optional, same as above
```
None of these are required to get a working MVP — the app should run with zero env vars set (CelesTrak + self-computed visibility need no key at all) and only need `N2YO_API_KEY` if you opt into the brightness-data path.

## 14. Suggested project structure
```
/app
  /page.tsx                    → landing + location input + "Right now" card + forecast list
  /api/passes/now/route.ts
  /api/passes/forecast/route.ts
  /api/tle/refresh/route.ts
/lib
  /satellites.ts               → whitelist (Section 9), TrackedObject[] constant
  /tle-cache.ts                 → fetch + cache TLEs from CelesTrak
  /orbit.ts                     → propagation, look angles, sunlit check (Section 8.1–8.2)
  /compass.ts                   → azimuthToCompass (Section 8.4)
  /brightness.ts                → magnitude heuristic or N2YO lookup (Section 8.3)
/components
  /LocationInput.tsx             → manual lat/long fields + "Use my location" button
  /RightNowCard.tsx              → current visibility state
  /ForecastList.tsx              → 7-day pass list
  /PassDetail.tsx                → shared expanded guidance view (direction/angle/time), used by both RightNowCard and ForecastList rows
/vercel.json                    → cron config for /api/tle/refresh
```

## 15. UI/UX direction
- **Theme:** near-black background — very dark charcoal/navy (e.g. `#0a0e14` range), not pure `#000`. Off-white text (not pure `#fff`). One restrained accent color — a muted cyan or amber reads as "space/instrument panel" without looking like a generic SaaS template.
- **Typography:** one distinctive heading font with real character (pick something from Google Fonts that isn't a default Inter/Roboto look — a geometric or display sans works well for a space theme) + a clean readable body font. Consider a monospace for coordinates/angles/countdowns — reads as "instrument panel," reinforces the theme, and makes numbers easy to scan.
- **Layout:** generous whitespace, no dashboard clutter, no unnecessary gradients/glassmorphism/card-shadows that read as templated. Motion should be minimal and purposeful — e.g. a subtle transition when a pass flips from "upcoming" to "visible now," not decorative animation everywhere.
- Build `PassDetail` as one shared component reused by both the "Right now" card and expanded forecast rows — keeps the guidance format (direction/angle/time) visually and logically consistent everywhere it appears.

## 16. Edge cases & error handling (handle these explicitly, don't skip)
- Geolocation permission denied or unsupported browser → fall back to the manual entry form with a short explanatory message, don't dead-end the user.
- Manual lat/long out of range or non-numeric → inline validation message, don't submit.
- No visible passes in the next 7 days for a given location (can happen at some latitudes/seasons) → show a clear "nothing visible this week" state, not a blank list.
- TLE fetch from CelesTrak fails (network issue, object temporarily missing from feed) → serve the last successfully cached TLE rather than failing the whole request; only show a degraded-data notice if the cache itself is more than ~24h stale.
- Extreme latitudes (near poles) — passes can behave unusually (very long or very short); no special-casing needed, just make sure the math doesn't crash on edge values (elevation exactly at threshold, azimuth wrap-around at 360°/0°).

## 17. Build order (ship incrementally, in this order)
1. Location input UI (manual + geolocation), no backend yet — get the input flow feeling right first.
2. `/api/passes/now` for ISS only, using self-computed satellite.js + SunCalc math (Sections 8.1, 8.2 minus brightness) — get one object working end to end before adding more.
3. Add the rest of the whitelist (Tiangong, Hubble) to the "now" endpoint.
4. `/api/passes/forecast` (7-day scan) for the whitelist.
5. Brightness heuristic (Section 8.3, simple version) wired into both endpoints.
6. Dark theme + typography pass on the UI (Section 15) — don't polish visuals before the data is right.
7. TLE refresh cron + caching (Section 12) — once everything works, make it efficient.
8. (Optional, if time allows) swap the brightness heuristic for N2YO-sourced magnitude.

## 18. Success criteria for MVP
- User gets from landing to "look [direction] at [angle]° — visible for [X] more minutes" in under 10 seconds, for either input method.
- The 7-day forecast for ISS roughly matches what Heavens-Above/N2YO shows for the same coordinates (spot-check a few — exact-to-the-second match isn't required, direction/rough timing should agree).
- Works cleanly on a mobile browser, no layout breakage.
- No API keys or raw location data ever appear in client-side network requests (check browser devtools network tab to confirm).
- Runs and deploys on Vercel's free tier with zero required environment variables (N2YO key strictly optional).

## 19. Deployment (Vercel)
1. Push the Next.js project to a GitHub repo.
2. Import the repo in Vercel, framework preset auto-detects Next.js — no custom build config needed.
3. If using N2YO, add `N2YO_API_KEY` in Vercel's Environment Variables settings (not committed to the repo).
4. Add the `/api/tle/refresh` cron entry to `vercel.json`:
   ```json
   {
     "crons": [{ "path": "/api/tle/refresh", "schedule": "0 */4 * * *" }]
   }
   ```
5. Deploy — no other infra needed for MVP.

## 20. Open questions (flag back to Ghanendra, don't silently guess)
- Exact accent color / font pairing — pick a reasonable placeholder that's trivially swappable (a single theme config file), not hardcoded across components.
- Whether the brightness heuristic (Section 8.3) feels good enough once seen live, or whether it's worth wiring in N2YO from the start.
- How far to expand the whitelist beyond ISS/Tiangong/Hubble/Starlink before v1 feels "complete enough."
