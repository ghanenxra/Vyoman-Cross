# 🌌 VYOMAN CROSS (व्योमन् Cross)
### Real-Time 3D Interactive Satellite Tracking Cockpit & Naked-Eye Pass Predictor

[![Next.js](https://img.shields.io/badge/Next.js-15.1-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.0-20232A?style=for-the-badge&logo=react)](https://react.dev/)
[![Three.js](https://img.shields.io/badge/Three.js-WebGL-000000?style=for-the-badge&logo=three.js)](https://threejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)
[![SGP4 Propagator](https://img.shields.io/badge/Orbital_Engine-SGP4%20%2F%20SDP4-cyan?style=for-the-badge)](https://celestrak.org/)
[![Deploy with Vercel](https://img.shields.io/badge/Vercel-Deploy_Ready-black?style=for-the-badge&logo=vercel)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fghanenxra%2FVyoman-Cross)
[![Deploy to Render](https://img.shields.io/badge/Render-Host_Ready-46E3B7?style=for-the-badge&logo=render)](https://render.com/deploy?repo=https://github.com/ghanenxra/Vyoman-Cross)

---

**Vyoman Cross** is a high-tech aerospace dashboard and orbital tracking engine. It answers a single question with zero friction: **"What is flying over me right now that I can actually see with my own eyes?"**

Featuring a **photorealistic 3D interactive WebGL Earth**, real-time **SGP4 orbital trajectory rendering**, **ground track projection**, live **telemetry HUD (altitude, velocity, azimuth/elevation)**, and a **360° polar sky radar**, Vyoman Cross brings NASA/ISRO-level mission control into your browser.

---

## 🌟 Key Features

### 🌍 1. 3D Interactive WebGL Earth Globe (Three.js)
- **High-Performance Procedural Globe**: Zero-external-dependency Earth sphere with high-contrast continental coastlines, ocean gradients, and major city lights.
- **Dynamic Solar Day/Night Lighting**: Calculates the exact real-time subsolar point ($UTC \rightarrow$ solar coordinates) to render authentic solar illumination and night shadow terminators.
- **3D Orbital Trajectories**: Accurately computes and renders full 3D orbital rings/splines around Earth for any selected satellite.
- **Surface Ground Track**: Real-time projection of the satellite's ground track onto Earth's surface.
- **Observer Geolocation Pin**: Visual 3D marker at your coordinates (e.g. `Kota, India` or your browser GPS) with a pulsing surface beacon.
- **Line-of-Sight (LOS) Beam**: Real-time vector connecting observer to satellite whenever it crosses above the horizon.
- **Full Camera Freedom**: OrbitControls with smooth inertia damping, zoom, pan, camera reset, and "Follow Satellite" mode.

### 🛰️ 2. Live Orbital Telemetry Cockpit (1 Hz / 60 FPS)
- **Real-Time Geodetic Coordinates**: Live Latitude ($^\circ N/S$), Longitude ($^\circ E/W$), and Altitude ($\text{km}$).
- **Orbital Mechanics**: Live orbital velocity ($\text{km/s}$ and $\text{km/h}$), orbital period ($\text{min}$), and inclination angle.
- **Observer Look Angles**: Range distance ($\text{km}$), Elevation angle ($-90^\circ$ to $+90^\circ$), Azimuth ($0^\circ - 360^\circ$), and 8-point compass bearing (`NW`, `SE`, `NE`).
- **Solar Umbra / Eclipse Detection**: Live condition indicator showing whether the spacecraft is `● IN DIRECT SUNLIGHT` or `● IN EARTH SHADOW (ECLIPSED)`.
- **Next Visible Pass Countdown**: High-precision `T- HH:MM:SS` countdown clock with peak elevation angle and brightness estimation.

### 🚀 3. 200+ Active Low Earth Orbit Satellites
- **Space Stations**: International Space Station (ISS, ZARYA), Tiangong Space Station.
- **Space Telescopes**: Hubble Space Telescope (HST).
- **200+ Near-Earth Starlinks**: Fresh Starlink satellites actively raising orbit (< 460 km) that produce naked-eye visual brightness and "train" formations.
- **Starlink Train Detection**: Automatically groups and flags consecutive Starlinks flying overhead in tight formation.
- **Fast `Ctrl+K` Command Palette**: Instant fuzzy search across all 203 satellites by name or NORAD catalog ID.

### 📊 4. Pass Analytics & Sky View Suite
- **Column 1 — Next 24h Visible Passes**: Interactive table sorted chronologically with category filters (All, Space Stations, Starlinks, Brightest $\le 2.5$ mag).
- **Column 2 — Pass Elevation Timeline**: Horizontal progress bars illustrating peak elevation angles ($0^\circ - 90^\circ$) and pass durations.
- **Column 3 — Polar Sky Radar (Horizon Plot)**: High-tech 360° circular dome radar ($0^\circ$ horizon, $30^\circ$, $60^\circ$, $90^\circ$ Zenith) plotting the satellite's exact sky trajectory arc and live overhead position.

---

## 🛠️ Architecture & Tech Stack

```
┌─────────────────────────────────────────────────────────────┐
│                    VYOMAN CROSS COCKPIT                     │
├──────────────────────────────┬──────────────────────────────┤
│       Three.js 3D Engine     │      React 19 / Next.js 15   │
│  • Earth Sphere & Atmosphere │  • Real-time Telemetry HUD   │
│  • 3D Orbit Spline Ring      │  • Visible Passes Table      │
│  • Surface Ground Track      │  • Elevation Timeline Bars   │
│  • Observer 3D Pin & Beacon  │  • 360° Polar Sky Radar      │
│  • Day/Night Solar Lighting  │  • Ctrl+K Command Palette    │
├──────────────────────────────┴──────────────────────────────┤
│                   SGP4 / SDP4 Orbital Core                  │
│  • satellite.js: ECI to Geodetic, ECF Look Angles           │
│  • astronomy-engine: High-precision Solar Coordinates       │
│  • suncalc: Observer Twilight & Moon Phase Calculation      │
│  • Pre-seeded Database: data/satellites.json (0ms cold start)│
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 Deployment Guide

### Repository Address
```text
https://github.com/ghanenxra/Vyoman-Cross
```

---

### Hosting on Vercel (Recommended)

1. Go to your [Vercel Dashboard](https://vercel.com/new).
2. Click **Add New...** → **Project**.
3. Import your GitHub repository: `https://github.com/ghanenxra/Vyoman-Cross`.
4. Configure Project Settings:
   - **Framework Preset**: `Next.js` *(auto-detected)*
   - **Root Directory**: `./` *(leave empty/default)*
   - **Build Command**: `npm run build` *(or leave default `next build`)*
   - **Output Directory**: `.next` *(auto-detected)*
   - **Install Command**: `npm install` *(auto-detected)*
5. **Environment Variables**: None required! The app is completely self-contained with zero external database dependencies.
   - *(Optional)* `CRON_SECRET`: Set any random string if you wish to secure `/api/tle/refresh` cron calls.
6. Click **Deploy**. Vercel will build and deploy your app in under 60 seconds with full global edge caching.

---

### Hosting on Render

You can deploy on Render using either the **Blueprint** feature or as a standard **Web Service**:

#### Method A: Render Blueprint (1-Click)
1. In the [Render Dashboard](https://dashboard.render.com), click **New +** → **Blueprint**.
2. Connect `https://github.com/ghanenxra/Vyoman-Cross`.
3. Render will automatically detect the included [`render.yaml`](./render.yaml) file and configure the service.
4. Click **Apply**.

#### Method B: Manual Web Service
1. In Render, click **New +** → **Web Service**.
2. Select repository: `https://github.com/ghanenxra/Vyoman-Cross`.
3. Fill in the settings:
   - **Name**: `vyoman-cross`
   - **Region**: Closest to your users (e.g. `Singapore` or `Frankfurt`)
   - **Branch**: `main`
   - **Root Directory**: *(leave blank)*
   - **Runtime**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm run start`
   - **Health Check Path**: `/api/health`
4. Click **Create Web Service**.

---

## 💻 Local Development

```bash
# 1. Clone the repository
git clone https://github.com/ghanenxra/Vyoman-Cross.git
cd Vyoman-Cross

# 2. Install dependencies
npm install

# 3. Start local development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Available Scripts

| Command | Action |
| :--- | :--- |
| `npm run dev` | Start Next.js development server on `localhost:3000` |
| `npm run build` | Compile optimized production bundle |
| `npm run start` | Run production server locally |
| `npm run lint` | Run ESLint check (zero errors/warnings) |

---

## 📡 API Reference

All endpoints return JSON and include HTTP caching headers:

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/api/satellites` | `GET` | Catalog of all cached satellites (`?q=iss`, `?category=station`) |
| `/api/passes/forecast` | `GET` | Compute visible passes for observer (`?lat=25.18&lng=75.83&days=3`) |
| `/api/passes/now` | `GET` | Get currently visible overhead satellites and immediate next pass |
| `/api/tle/refresh` | `POST` | Refresh latest orbital elements from CelesTrak |
| `/api/health` | `GET` | Production health check endpoint for Render & monitoring |

---

## 📐 Orbital Mechanics & Mathematics

### 1. SGP4 / SDP4 Orbital Propagation
Vyoman Cross utilizes the **Simplified General Perturbations (SGP4)** mathematical model to compute the state vector $(\vec{r}, \vec{v})$ of satellites from Two-Line Element (TLE) sets, accounting for:
- Earth's oblateness ($J_2, J_3, J_4$ zonal harmonics)
- Atmospheric drag (decay effects)
- Solar and lunar gravitational perturbations (SDP4 deep-space resonance)

### 2. Geodetic to 3D Cartesian Mapping
Transforms geodetic coordinates $(\text{latitude } \phi, \text{longitude } \lambda, \text{altitude } h)$ into Three.js 3D space:
$$r = R_{\text{globe}} \cdot \left(1 + \frac{h}{R_{\text{earth}}} \cdot \text{scale}\right)$$
$$x = -r \cdot \cos(\phi) \cdot \cos(\lambda), \quad y = r \cdot \sin(\phi), \quad z = r \cdot \cos(\phi) \cdot \sin(\lambda)$$

### 3. Visual Naked-Eye Criteria
A satellite pass is qualified as **"Visible to Naked Eye"** only when all 3 physical criteria are simultaneously met:
1. **Observer Elevation**: Satellite is at least $10^\circ$ above the observer's local horizon ($\text{elevation} \ge 10^\circ$).
2. **Solar Illumination**: Satellite is illuminated by direct sunlight ($d_{\text{shadow}} > R_{\text{earth}}$ or $\vec{r}_{\text{sat}} \cdot \vec{r}_{\text{sun}} > 0$).
3. **Local Sky Darkness**: The sun is at least $6^\circ$ below the observer's local horizon ($\text{sun altitude} \le -6^\circ$, civil twilight threshold).

---

## 📜 Credits & Acknowledgments

- **Orbital Data**: [CelesTrak](https://celestrak.org) & Dr. T.S. Kelso for public Two-Line Element sets.
- **Orbital Library**: [`satellite.js`](https://github.com/shashwatak/satellite-js) by Shashwat Kandadai.
- **3D Engine**: [`Three.js`](https://threejs.org) by Ricardo Cabello (mrdoob).
- **Astronomy Calculations**: [`astronomy-engine`](https://github.com/cosinekitty/astronomy) by Don Cross and [`suncalc`](https://github.com/mourner/suncalc) by Vladimir Agafonkin.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE) — free to use, modify, and distribute.

Crafted with ❤️ for stargazers and space enthusiasts by **Ghanendra**.
