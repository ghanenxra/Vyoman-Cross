# SkyPass — Naked-Eye Satellite Tracker (Vyoman Cross)

Build a dark-mode-first Next.js website where users input their location (GPS or manual lat/lng) and instantly see what satellites are visible overhead right now, with plain-language direction/angle guidance and a 7-day forecast of upcoming visible passes.

## User Review Required

> [!IMPORTANT]
> **Accent color & font pairing:** PRD leaves this open. I'll use **muted cyan (`#38bdf8`)** as the accent and **Exo 2** (Google Fonts, geometric space feel) for headings + **JetBrains Mono** for numbers/coordinates + **Inter** for body. All defined in a single theme config file so you can swap trivially.

> [!IMPORTANT]
> **Brightness approach:** Starting with the **simple range+elevation heuristic** (no N2YO dependency, zero env vars needed). We can swap in N2YO later without any architectural change.

> [!IMPORTANT]
> **Starlink handling:** The PRD says to pull the full Starlink TLE list and take the newest ~20 by NORAD ID. This list is large (~7000 satellites). We'll fetch only the group list, sort by ID descending, take 20 most recent, and discard the rest.

## Proposed Changes

### 1. Project Scaffolding

#### [NEW] `package.json`, `tsconfig.json`, `next.config.ts`, `tailwind.config.ts`, `postcss.config.mjs`
- Next.js 15 App Router project with TypeScript, Tailwind CSS
- Dependencies: `satellite.js`, `suncalc`, `astronomy-engine`
- Dev dependencies: standard Next.js toolchain

#### [NEW] `vercel.json`
- Cron config: `0 */4 * * *` → `/api/tle/refresh`

---

### 2. Theme & Styling

#### [NEW] `/lib/theme.ts`
- Central theme config: colors (background `#0a0e14`, text `#e2e8f0`, accent `#38bdf8`), fonts, spacing tokens
- Single file to swap accent color / font pairing per PRD Section 20

#### [NEW] `/app/layout.tsx`
- Root layout: dark theme, Google Fonts (Exo 2 + JetBrains Mono + Inter), global styles
- Metadata: title, description, viewport

#### [NEW] `/app/globals.css`
- Tailwind directives + CSS custom properties from theme config

---

### 3. Data Layer (`/lib`)

#### [NEW] `/lib/types.ts`
- All TypeScript interfaces from PRD Section 7: `TrackedObject`, `TleRecord`, `VisiblePass`, `ObserverLocation`
- API response types: `NowResponse`, `ForecastResponse`

#### [NEW] `/lib/satellites.ts`
- Hardcoded whitelist: ISS (25544), Tiangong (48274), Hubble (20580)
- Starlink handled separately via dynamic fetch

#### [NEW] `/lib/tle-cache.ts`
- In-memory cache (Map of NORAD ID → TleRecord)
- `fetchTle(noradId)` — fetches from CelesTrak, caches with timestamp
- `fetchStarlinkRecent(n=20)` — fetches full Starlink group, sorts by ID desc, takes newest N
- `refreshAll()` — called by cron endpoint
- Stale check: serve cached if < 24h old, warn if older, never fail request if cache exists

#### [NEW] `/lib/orbit.ts`
- `propagateAt(tle, date)` → ECI position using satellite.js
- `getLookAngles(tle, observer, date)` → azimuth/elevation/range
- `isSunlit(satEciKm, sunEciKm)` → cylindrical shadow test (PRD Section 8.2)
- `getSunEci(date)` → sun position via astronomy-engine
- `isPassVisible(observer, tle, date)` → combines: elevation > 10°, sun altitude < -6° (SunCalc), satellite sunlit

#### [NEW] `/lib/compass.ts`
- `azimuthToCompass(deg, points=16)` → 16-point or 8-point compass string

#### [NEW] `/lib/brightness.ts`
- `estimateBrightness(peakElevationDeg, rangeKm)` → `{ magnitude, brightnessLabel }`
- Heuristic: peak elev > 40° && range < 800km → "very bright" / "bright"; scale down from there

#### [NEW] `/lib/pass-finder.ts`
- `findCurrentPasses(observer, tles)` → scans current moment for visible objects
- `findNextPass(observer, tles)` → finds the soonest upcoming visible pass
- `findForecastPasses(observer, tles, days=7)` → steps through time in 30s increments, groups contiguous visible windows into `VisiblePass` objects, sorted by startTime

---

### 4. API Routes

#### [NEW] `/app/api/passes/now/route.ts`
- `GET /api/passes/now?lat=X&lng=Y`
- Validates lat/lng range, returns 400 if invalid
- Calls pass-finder for current visibility + next upcoming pass
- Returns `NowResponse`

#### [NEW] `/app/api/passes/forecast/route.ts`
- `GET /api/passes/forecast?lat=X&lng=Y&days=7`
- Validates inputs
- Checks cache (rounded lat/lng to 2 decimal places + day key)
- Computes 7-day forecast via pass-finder
- Returns `ForecastResponse`

#### [NEW] `/app/api/tle/refresh/route.ts`
- `POST /api/tle/refresh`
- Triggers full TLE refresh from CelesTrak for whitelist + Starlink recent
- Called by Vercel cron every 4 hours

---

### 5. UI Components

#### [NEW] `/components/LocationInput.tsx`
- Two modes: "Use my location" button (Geolocation API) + manual lat/lng number fields with "Locate" button
- Handles permission denied gracefully: falls back to manual with explanatory message
- Inline validation for out-of-range / non-numeric inputs

#### [NEW] `/components/PassDetail.tsx`
- **Shared component** used by both RightNowCard and ForecastList
- Shows: compass direction arrow/indicator, elevation angle, start/peak/end times, duration, brightness label
- Live countdown when pass is active
- Monospace font for all numeric values

#### [NEW] `/components/RightNowCard.tsx`
- If something visible: renders PassDetail with live countdown
- If nothing visible: "Nothing visible right now — next pass in Xh Ym" with link to forecast entry
- Subtle transition animation when pass state changes

#### [NEW] `/components/ForecastList.tsx`
- 7-day list, each row: date/time, object name, direction, max elevation, duration, brightness tag
- Tapping a row expands inline → renders PassDetail for that future pass
- Empty state: "Nothing visible this week" message

#### [NEW] `/app/page.tsx`
- Landing page: dark hero with app name/tagline
- LocationInput component
- Once location resolved: RightNowCard + ForecastList
- Loading states between location resolve and data fetch

---

### 6. Edge Cases & Error Handling

- Geolocation denied → graceful fallback with message
- Invalid lat/lng → inline validation, no submit
- No passes in 7 days → clear empty state
- TLE fetch failure → serve stale cache, show notice if > 24h old
- Extreme latitudes → no special-casing, ensure math doesn't crash on boundary values
- Azimuth wrap-around at 360°/0° → handled in compass conversion

## Verification Plan

### Automated Tests
```bash
npm run build    # Ensure the project compiles without errors
npm run lint     # Lint check
```

### Manual Verification
1. Run `npm run dev` and test both location input methods
2. Verify the "Right now" card shows correct ISS pass data by cross-referencing with [Heavens-Above](https://heavens-above.com) for same coordinates
3. Check 7-day forecast against N2YO/Heavens-Above for ISS — direction and rough timing should agree
4. Test mobile responsive layout in browser devtools
5. Check browser Network tab: no API keys or raw location data in client-side requests
6. Test edge cases: permission denied, invalid coordinates, polar latitudes
