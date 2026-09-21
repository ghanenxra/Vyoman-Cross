# 🌌 Vyoman Cross (SkyPass)

**Real-Time Naked-Eye Satellite & Starlink Tracker**

Vyoman Cross answers a single question with zero friction: **"What is flying over me right now that I can actually see with my own eyes?"**

Direction. Elevation angle. Live countdown. No telescope required.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fghanenxra%2FVyoman-Cross)
[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/ghanenxra/Vyoman-Cross)

---

## ✨ Features

- **🛸 Space Stations & Telescopes**: Real-time pass predictions for the International Space Station (ISS), Tiangong Space Station, and Hubble Space Telescope.
- **🛰️ 200+ Near-Earth Starlinks**: Automatically tracks active, low-altitude Starlink satellites (< 450 km) that are actively raising orbit and forming bright visual trains.
- **🚀 Starlink Train Detection**: Automatically tags consecutive Starlink satellites flying overhead within minutes of each other.
- **🧭 Compass & Elevation Guidance**: 8-point compass bearing (e.g. `NW`, `SE`) and peak altitude angle (e.g. `42° elev`) so you know exactly where to point your eyes.
- **📍 Smart Geolocation**: One-click browser geolocation or paste any coordinate format (decimal, DMS, or Google Maps links).
- **⚡ Geolocation-Aware Reachability Filtering**: Dynamically filters orbital planes based on observer latitude to eliminate unreachable satellites and keep computation under 2 seconds.
- **🛡️ 100% Offline & Cold-Start Ready**: Bundled with pre-seeded orbital database (`data/satellites.json`) so serverless functions start in **0ms** without network delays or CelesTrak rate limits.
- **🎛️ Interactive Filters & Search**: Filter by Category (All, Starlink, Space Stations, Telescopes), toggle High Passes (> 30°), and instant text search.

---

## 🚀 Deployment

### Option 1: Deploy to Vercel (Recommended)

Vyoman Cross is configured out of the box for Vercel:

1. Click the **Deploy with Vercel** button above or import `https://github.com/ghanenxra/Vyoman-Cross` in [Vercel Dashboard](https://vercel.com).
2. Framework Preset: **Next.js** (auto-detected).
3. Root Directory: `./`.
4. (Optional) Set `CRON_SECRET` environment variable for secured TLE refresh cron.
5. Click **Deploy**.

Vercel Cron automatically calls `/api/tle/refresh` every 4 hours as specified in `vercel.json`.

---

### Option 2: Deploy to Render

Vyoman Cross includes a `render.yaml` blueprint:

1. Go to [Render Dashboard](https://dashboard.render.com).
2. Click **New +** → **Blueprint**.
3. Connect your repository `https://github.com/ghanenxra/Vyoman-Cross`.
4. Render will read `render.yaml` and configure:
   - **Environment**: Node
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm run start`
   - **Health Check**: `/api/health`
5. Click **Apply**.

---

## 💻 Local Development

```bash
# Clone the repository
git clone https://github.com/ghanenxra/Vyoman-Cross.git
cd Vyoman-Cross

# Install dependencies
npm install

# Start local development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Scripts

- `npm run dev`: Start local development server
- `npm run build`: Build production optimized Next.js bundle
- `npm run start`: Run production server locally
- `npm run lint`: Run ESLint checks

---

## 🛰️ Architecture & Orbital Engine

- **Framework**: Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS v4.
- **Propagation**: `satellite.js` (SGP4/SDP4 orbit model).
- **Sun Vector & Twilight**: `suncalc` for observer twilight angles (civil twilight threshold: sun < -6°); `astronomy-engine` for 3D geocentric solar vectors and Earth shadow umbra testing.
- **Data Source**: CelesTrak supplemental GP feeds and NORAD catalog elements, refreshed via background cron.

---

## 📄 License

MIT License. Designed and built with ❤️ by Ghanendra.

