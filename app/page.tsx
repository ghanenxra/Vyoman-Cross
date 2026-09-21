'use client';

import { useState, useCallback, useRef } from 'react';
import type { ObserverLocation, NowResponse, ForecastResponse } from '@/lib/types';
import LocationInput from '@/components/LocationInput';
import RightNowCard from '@/components/RightNowCard';
import ForecastList from '@/components/ForecastList';

export default function Home() {
  const [location, setLocation] = useState<ObserverLocation | null>(null);
  const [nowData, setNowData] = useState<NowResponse | null>(null);
  const [forecastData, setForecastData] = useState<ForecastResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const forecastRef = useRef<HTMLDivElement>(null);

  const fetchPasses = useCallback(async (loc: ObserverLocation) => {
    setLocation(loc);
    setLoading(true);
    setError(null);
    setNowData(null);
    setForecastData(null);

    try {
      // Fetch both endpoints in parallel
      const [nowRes, forecastRes] = await Promise.all([
        fetch(`/api/passes/now?lat=${loc.latitude}&lng=${loc.longitude}`),
        fetch(`/api/passes/forecast?lat=${loc.latitude}&lng=${loc.longitude}&days=7`),
      ]);

      if (!nowRes.ok || !forecastRes.ok) {
        throw new Error('Failed to fetch satellite pass data. Please try again.');
      }

      const [nowJson, forecastJson] = await Promise.all([
        nowRes.json() as Promise<NowResponse>,
        forecastRes.json() as Promise<ForecastResponse>,
      ]);

      setNowData(nowJson);
      setForecastData(forecastJson);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  }, []);

  const scrollToForecast = useCallback(() => {
    forecastRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  return (
    <main className="min-h-screen">
      {/* Hero section */}
      <div className="relative overflow-hidden">
        {/* Subtle star-field background effect */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-[10%] left-[15%] w-1 h-1 bg-white rounded-full animate-pulse" />
          <div className="absolute top-[25%] right-[20%] w-0.5 h-0.5 bg-white rounded-full animate-pulse" style={{ animationDelay: '1s' }} />
          <div className="absolute top-[40%] left-[60%] w-1 h-1 bg-white rounded-full animate-pulse" style={{ animationDelay: '2s' }} />
          <div className="absolute top-[15%] left-[80%] w-0.5 h-0.5 bg-white rounded-full animate-pulse" style={{ animationDelay: '0.5s' }} />
          <div className="absolute top-[55%] left-[30%] w-0.5 h-0.5 bg-white rounded-full animate-pulse" style={{ animationDelay: '1.5s' }} />
          <div className="absolute top-[8%] left-[45%] w-1 h-1 bg-white rounded-full animate-pulse" style={{ animationDelay: '3s' }} />
        </div>

        <div className="relative px-4 pt-16 pb-12 sm:pt-24 sm:pb-16">
          {/* Title */}
          <div className="text-center mb-12">
            <h1 className="font-[family-name:var(--font-heading)] text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight mb-4">
              <span className="text-vc-text">Vyoman</span>{' '}
              <span className="text-vc-accent">Cross</span>
            </h1>
            <p className="text-vc-muted text-lg sm:text-xl max-w-lg mx-auto leading-relaxed">
              See what&apos;s flying over you right now.
              <br className="hidden sm:block" />
              Direction. Angle. Countdown.
            </p>

            {/* Constellation tags */}
            <div className="flex items-center justify-center flex-wrap gap-2 mt-6 text-xs font-[family-name:var(--font-mono)]">
              <span className="px-2.5 py-1 rounded-full bg-vc-card border border-vc-border text-emerald-400 flex items-center gap-1.5">
                <span>🛸</span> ISS & Tiangong
              </span>
              <span className="px-2.5 py-1 rounded-full bg-vc-card border border-vc-border text-purple-400 flex items-center gap-1.5">
                <span>🔭</span> Hubble Space Telescope
              </span>
              <span className="px-2.5 py-1 rounded-full bg-sky-500/10 border border-sky-500/30 text-sky-400 flex items-center gap-1.5">
                <span>🛰️</span> 60+ Starlink Satellites
                <span>🛰️</span> 200+ Near-Earth Starlinks
              </span>
            </div>
          </div>

          {/* Location Input */}
          {!location && !loading && (
            <LocationInput onLocationResolved={fetchPasses} isLoading={loading} />
          )}

          {/* Loading state */}
          {loading && (
            <div className="max-w-md mx-auto text-center space-y-4">
              <div className="flex items-center justify-center gap-3">
                <svg className="animate-spin h-6 w-6 text-vc-accent" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span className="text-vc-muted font-[family-name:var(--font-mono)]">
                  Computing visible passes…
                </span>
              </div>
              <p className="text-vc-dim text-sm">
                Propagating orbits for your location. This may take a moment.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="max-w-2xl mx-auto px-4 mb-8">
          <div className="p-4 rounded-xl bg-vc-error/10 border border-vc-error/20 text-vc-error text-center">
            <p>{error}</p>
            <button
              onClick={() => {
                setError(null);
                setLocation(null);
              }}
              className="mt-3 text-sm underline underline-offset-2 hover:text-vc-text transition-colors cursor-pointer"
            >
              Try again
            </button>
          </div>
        </div>
      )}

      {/* Results */}
      {nowData && forecastData && (
        <div className="max-w-2xl mx-auto px-4 pb-16 space-y-8">
          {/* Location badge + change button */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-vc-dim">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
              </svg>
              <span className="font-[family-name:var(--font-mono)]">
                {location?.latitude.toFixed(4)}, {location?.longitude.toFixed(4)}
              </span>
            </div>
            <button
              onClick={() => {
                setLocation(null);
                setNowData(null);
                setForecastData(null);
              }}
              className="text-sm text-vc-accent hover:text-vc-text transition-colors cursor-pointer"
            >
              Change location
            </button>
          </div>

          {/* Right Now card */}
          <RightNowCard data={nowData} onScrollToForecast={scrollToForecast} />

          {/* Divider */}
          <div className="h-px bg-vc-border" />

          {/* Forecast */}
          <ForecastList ref={forecastRef} data={forecastData} />
        </div>
      )}

      {/* Footer */}
      <footer className="text-center py-8 text-xs text-vc-dim border-t border-vc-border">
        <p>
          Vyoman Cross — Orbital data from{' '}
          <a href="https://celestrak.org" target="_blank" rel="noopener noreferrer" className="text-vc-accent hover:underline">
            CelesTrak
          </a>
          . Predictions are approximate.
        </p>
      </footer>
    </main>
  );
}

