'use client';

import { useState, useEffect, useMemo } from 'react';
import type { ObserverLocation } from '@/lib/types';
import {
  resolveLocationQuery,
  PRESET_CITIES,
} from '@/lib/coord-parser';
import { MapPin, Navigation, X, Check, Search, Globe, ChevronDown, ChevronUp } from 'lucide-react';

interface LocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLocation: ObserverLocation;
  currentName: string;
  onSaveLocation: (loc: ObserverLocation, name: string) => void;
}

export default function LocationModal({
  isOpen,
  onClose,
  currentLocation,
  currentName,
  onSaveLocation,
}: LocationModalProps) {
  const [searchInput, setSearchInput] = useState('');
  const [showManual, setShowManual] = useState(false);
  const [customName, setCustomName] = useState(currentName);
  const [lat, setLat] = useState(currentLocation.latitude.toString());
  const [lng, setLng] = useState(currentLocation.longitude.toString());
  const [error, setError] = useState<string | null>(null);
  const [detecting, setDetecting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSearchInput('');
      setError(null);
      setCustomName(currentName);
      setLat(currentLocation.latitude.toString());
      setLng(currentLocation.longitude.toString());
    }
  }, [isOpen, currentLocation, currentName]);

  // Real-time preview of parsed input
  const resolved = useMemo(() => {
    if (!searchInput.trim()) return null;
    return resolveLocationQuery(searchInput);
  }, [searchInput]);

  if (!isOpen) return null;

  const handleApplySearch = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!resolved) {
      setError(
        'Could not parse coordinates or city. Try formats like "28.6139, 77.2090" or "Kota" or DMS coordinates.',
      );
      return;
    }

    onSaveLocation(resolved.location, resolved.name);
    onClose();
  };

  const handlePresetSelect = (preset: (typeof PRESET_CITIES)[0]) => {
    onSaveLocation(
      { latitude: preset.lat, longitude: preset.lng },
      `${preset.name}, ${preset.country}`,
    );
    onClose();
  };

  const handleUseGPS = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      return;
    }
    setDetecting(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const latitude = parseFloat(pos.coords.latitude.toFixed(4));
        const longitude = parseFloat(pos.coords.longitude.toFixed(4));
        const name = `My GPS Location (${latitude}°N, ${longitude}°E)`;
        onSaveLocation({ latitude, longitude }, name);
        setDetecting(false);
        onClose();
      },
      (err) => {
        setError(err.message || 'Could not detect location. Please enter coordinates manually.');
        setDetecting(false);
      },
      { timeout: 10000 },
    );
  };

  const handleManualSave = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const parsedLat = parseFloat(lat);
    const parsedLng = parseFloat(lng);

    if (isNaN(parsedLat) || isNaN(parsedLng)) {
      setError('Please enter valid numeric latitude and longitude.');
      return;
    }
    if (parsedLat < -90 || parsedLat > 90) {
      setError('Latitude must be between -90 and 90.');
      return;
    }
    if (parsedLng < -180 || parsedLng > 180) {
      setError('Longitude must be between -180 and 180.');
      return;
    }

    const name =
      customName.trim() ||
      `${Math.abs(parsedLat).toFixed(2)}°${parsedLat >= 0 ? 'N' : 'S'}, ${Math.abs(parsedLng).toFixed(2)}°${parsedLng >= 0 ? 'E' : 'W'}`;

    onSaveLocation({ latitude: parsedLat, longitude: parsedLng }, name);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
      <div
        className="w-full max-w-lg bg-[#0b1222] border border-white/15 rounded-2xl p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white font-mono">
                Observer Location & Coordinates
              </h3>
              <div className="text-[11px] font-mono text-gray-400">
                Currently tracking from:{' '}
                <strong className="text-emerald-300">
                  {currentLocation.latitude.toFixed(2)}°N, {currentLocation.longitude.toFixed(2)}°E
                </strong>{' '}
                ({currentName})
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 1. Smart Search / Paste Coordinates Input */}
        <form onSubmit={handleApplySearch} className="space-y-2">
          <label className="block text-xs font-mono uppercase tracking-wider text-cyan-400 font-semibold">
            Search or Paste Coordinates
          </label>
          <div className="relative">
            <Search className="w-4 h-4 text-cyan-400 absolute left-3.5 top-3.5" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="e.g. 25.18, 75.83  or  28°38'N 77°13'E  or  Kota / Delhi / London..."
              className="w-full pl-10 pr-24 py-2.5 rounded-xl bg-[#0f172a] border border-white/15 text-white font-mono text-xs placeholder-gray-500 focus:outline-none focus:border-cyan-500"
            />
            <button
              type="submit"
              disabled={!resolved}
              className="absolute right-1.5 top-1.5 px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 disabled:hover:bg-cyan-500 text-black font-mono font-bold text-xs transition-colors flex items-center gap-1"
            >
              <span>Locate</span>
            </button>
          </div>

          {/* Live Coordinate Match Feedback */}
          {resolved && (
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-mono flex items-center justify-between animate-in fade-in">
              <span className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>
                  Detected: <strong>{resolved.name}</strong> ({resolved.location.latitude.toFixed(4)}°,{' '}
                  {resolved.location.longitude.toFixed(4)}°)
                </span>
              </span>
              <button
                type="submit"
                className="text-[11px] font-bold text-cyan-300 hover:underline"
              >
                Apply Now →
              </button>
            </div>
          )}
        </form>

        {/* 2. GPS Button */}
        <button
          type="button"
          onClick={handleUseGPS}
          disabled={detecting}
          className="w-full py-2.5 px-4 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 font-mono text-xs flex items-center justify-center gap-2 transition-colors disabled:opacity-50 cursor-pointer"
        >
          <Navigation className={`w-4 h-4 ${detecting ? 'animate-spin' : ''}`} />
          <span>{detecting ? 'Detecting Coordinates via GPS...' : 'Use Browser GPS Geolocation'}</span>
        </button>

        {/* 3. Quick City Presets */}
        <div className="space-y-1.5">
          <div className="text-[10px] font-mono uppercase tracking-wider text-gray-400 flex items-center gap-1">
            <Globe className="w-3 h-3 text-cyan-400" />
            <span>Quick Observatories & Cities</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 font-mono text-xs">
            {PRESET_CITIES.slice(0, 8).map((preset) => (
              <button
                key={preset.name}
                type="button"
                onClick={() => handlePresetSelect(preset)}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 hover:border-cyan-500/40 border border-white/5 text-left transition-colors group cursor-pointer"
              >
                <div className="font-bold text-white group-hover:text-cyan-300 truncate">
                  {preset.name}
                </div>
                <div className="text-[9px] text-gray-400">
                  {preset.lat.toFixed(1)}°N, {preset.lng.toFixed(1)}°E
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* 4. Expandable Separate Manual Lat/Lng Fields */}
        <div className="border-t border-white/10 pt-3">
          <button
            type="button"
            onClick={() => setShowManual(!showManual)}
            className="w-full flex items-center justify-between text-xs font-mono text-gray-400 hover:text-white transition-colors"
          >
            <span>Enter separate Latitude & Longitude values</span>
            {showManual ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showManual && (
            <form onSubmit={handleManualSave} className="mt-3 space-y-3 font-mono text-xs">
              <div>
                <label className="block text-gray-400 mb-1">Location Label</label>
                <input
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="e.g. My Backyard Observatory"
                  className="w-full px-3 py-2 rounded-xl bg-[#0f172a] border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-400 mb-1">Latitude (°)</label>
                  <input
                    type="number"
                    step="any"
                    value={lat}
                    onChange={(e) => setLat(e.target.value)}
                    placeholder="25.18"
                    className="w-full px-3 py-2 rounded-xl bg-[#0f172a] border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 mb-1">Longitude (°)</label>
                  <input
                    type="number"
                    step="any"
                    value={lng}
                    onChange={(e) => setLng(e.target.value)}
                    placeholder="75.83"
                    className="w-full px-3 py-2 rounded-xl bg-[#0f172a] border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2 rounded-xl bg-white/10 hover:bg-cyan-500 hover:text-black font-bold text-gray-200 transition-colors"
              >
                Save Custom Coordinates
              </button>
            </form>
          )}
        </div>

        {error && (
          <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-mono">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
