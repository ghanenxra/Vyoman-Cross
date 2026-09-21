'use client';

import { useState, useCallback } from 'react';
import type { ObserverLocation } from '@/lib/types';
import { parseCoordinates } from '@/lib/coord-parser';

interface LocationInputProps {
  onLocationResolved: (location: ObserverLocation) => void;
  isLoading?: boolean;
}

export default function LocationInput({ onLocationResolved, isLoading }: LocationInputProps) {
  const [coordInput, setCoordInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');

  const handleCoordSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);

      const parsed = parseCoordinates(coordInput);
      if (!parsed) {
        setError('Could not parse coordinates. Try "28.6139, 77.2090" or DMS format.');
        return;
      }

      onLocationResolved(parsed);
    },
    [coordInput, onLocationResolved],
  );

  const handleManualSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);

      const latitude = parseFloat(lat);
      const longitude = parseFloat(lng);

      if (isNaN(latitude) || isNaN(longitude)) {
        setError('Please enter valid numbers for latitude and longitude.');
        return;
      }
      if (latitude < -90 || latitude > 90) {
        setError('Latitude must be between -90 and 90.');
        return;
      }
      if (longitude < -180 || longitude > 180) {
        setError('Longitude must be between -180 and 180.');
        return;
      }

      onLocationResolved({ latitude, longitude });
    },
    [lat, lng, onLocationResolved],
  );

  const handleUseMyLocation = useCallback(() => {
    setError(null);

    if (!navigator.geolocation) {
      setError(
        'Geolocation is not supported by your browser. Please enter coordinates manually.',
      );
      return;
    }

    setGeoLoading(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setCoordInput(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
        setGeoLoading(false);
        onLocationResolved({ latitude, longitude });
      },
      (err) => {
        setGeoLoading(false);
        switch (err.code) {
          case err.PERMISSION_DENIED:
            setError(
              'Location permission denied. Please enter your coordinates manually below.',
            );
            break;
          case err.POSITION_UNAVAILABLE:
            setError(
              'Unable to determine your location. Please enter coordinates manually.',
            );
            break;
          case err.TIMEOUT:
            setError(
              'Location request timed out. Please try again or enter coordinates manually.',
            );
            break;
          default:
            setError('An unknown error occurred. Please enter coordinates manually.');
        }
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
    );
  }, [onLocationResolved]);

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Use My Location button */}
      <button
        onClick={handleUseMyLocation}
        disabled={geoLoading || isLoading}
        className="w-full py-4 px-6 rounded-xl font-[family-name:var(--font-heading)] font-semibold text-lg
          bg-vc-accent/10 border border-vc-accent/30 text-vc-accent
          hover:bg-vc-accent/20 hover:border-vc-accent/50
          disabled:opacity-50 disabled:cursor-not-allowed
          transition-all duration-200 cursor-pointer
          flex items-center justify-center gap-3"
      >
        {geoLoading ? (
          <>
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Locating…
          </>
        ) : (
          <>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
            </svg>
            Use my location
          </>
        )}
      </button>

      {/* Divider */}
      <div className="flex items-center gap-4 my-6">
        <div className="flex-1 h-px bg-vc-border" />
        <span className="text-vc-dim text-sm font-[family-name:var(--font-mono)] uppercase tracking-wider">or</span>
        <div className="flex-1 h-px bg-vc-border" />
      </div>

      {/* Unified coordinate input — paste-friendly */}
      <form onSubmit={handleCoordSubmit} className="space-y-3">
        <div>
          <label className="block text-xs text-vc-muted mb-1.5 font-[family-name:var(--font-mono)] uppercase tracking-wider">
            Paste coordinates
          </label>
          <input
            type="text"
            value={coordInput}
            onChange={(e) => setCoordInput(e.target.value)}
            placeholder={'28.6139, 77.2090  or  39\u00B003\u203238\u2033N 125\u00B045\u203227\u2033E'}
            className="w-full px-4 py-3 rounded-lg bg-vc-card border border-vc-border
              font-[family-name:var(--font-mono)] text-vc-text text-sm placeholder:text-vc-dim
              focus:outline-none focus:border-vc-accent/50 focus:ring-1 focus:ring-vc-accent/25
              transition-colors"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading || !coordInput.trim()}
          className="w-full py-3 px-6 rounded-lg font-[family-name:var(--font-heading)] font-medium
            bg-vc-card border border-vc-border text-vc-text
            hover:bg-vc-hover hover:border-vc-muted/30
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-all duration-200 cursor-pointer"
        >
          {isLoading ? 'Computing passes…' : 'Locate'}
        </button>
      </form>

      {/* Expandable manual lat/lng fields */}
      <button
        onClick={() => setShowManual(!showManual)}
        className="mt-3 w-full text-center text-xs text-vc-dim hover:text-vc-muted transition-colors cursor-pointer"
      >
        {showManual ? '▾ Hide separate fields' : '▸ Enter latitude & longitude separately'}
      </button>

      {showManual && (
        <form onSubmit={handleManualSubmit} className="mt-3 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-vc-muted mb-1.5 font-[family-name:var(--font-mono)] uppercase tracking-wider">
                Latitude
              </label>
              <input
                type="number"
                step="any"
                value={lat}
                onChange={(e) => setLat(e.target.value)}
                placeholder="28.6139"
                className="w-full px-4 py-3 rounded-lg bg-vc-card border border-vc-border
                  font-[family-name:var(--font-mono)] text-vc-text placeholder:text-vc-dim
                  focus:outline-none focus:border-vc-accent/50 focus:ring-1 focus:ring-vc-accent/25
                  transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs text-vc-muted mb-1.5 font-[family-name:var(--font-mono)] uppercase tracking-wider">
                Longitude
              </label>
              <input
                type="number"
                step="any"
                value={lng}
                onChange={(e) => setLng(e.target.value)}
                placeholder="77.2090"
                className="w-full px-4 py-3 rounded-lg bg-vc-card border border-vc-border
                  font-[family-name:var(--font-mono)] text-vc-text placeholder:text-vc-dim
                  focus:outline-none focus:border-vc-accent/50 focus:ring-1 focus:ring-vc-accent/25
                  transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 px-6 rounded-lg font-[family-name:var(--font-heading)] font-medium
              bg-vc-card border border-vc-border text-vc-text
              hover:bg-vc-hover hover:border-vc-muted/30
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-all duration-200 cursor-pointer"
          >
            {isLoading ? 'Computing passes…' : 'Locate'}
          </button>
        </form>
      )}

      {/* Error message */}
      {error && (
        <div className="mt-4 p-3 rounded-lg bg-vc-error/10 border border-vc-error/20 text-vc-error text-sm">
          {error}
        </div>
      )}
    </div>
  );
}
