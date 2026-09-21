'use client';

import { useState } from 'react';
import type { ObserverLocation } from '@/lib/types';
import { MapPin, Navigation, X, Check } from 'lucide-react';

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
  const [name, setName] = useState(currentName);
  const [lat, setLat] = useState(currentLocation.latitude.toString());
  const [lng, setLng] = useState(currentLocation.longitude.toString());
  const [error, setError] = useState<string | null>(null);
  const [detecting, setDetecting] = useState(false);

  if (!isOpen) return null;

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
        setLat(latitude.toString());
        setLng(longitude.toString());
        setName('My GPS Location');
        setDetecting(false);
      },
      (err) => {
        setError(err.message || 'Could not detect location.');
        setDetecting(false);
      },
      { timeout: 10000 },
    );
  };

  const handleSave = (e: React.FormEvent) => {
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

    onSaveLocation(
      { latitude: parsedLat, longitude: parsedLng },
      name.trim() || `${parsedLat.toFixed(2)}°, ${parsedLng.toFixed(2)}°`,
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-150">
      <div
        className="w-full max-w-md bg-[#0b1222] border border-white/15 rounded-2xl p-6 shadow-2xl space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-emerald-400" />
            <h3 className="text-base font-bold text-white font-mono">
              Observer Location
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* GPS Quick Button */}
        <button
          type="button"
          onClick={handleUseGPS}
          disabled={detecting}
          className="w-full py-2.5 px-4 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 font-mono text-xs flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
        >
          <Navigation className={`w-3.5 h-3.5 ${detecting ? 'animate-spin' : ''}`} />
          <span>{detecting ? 'Detecting Coordinates...' : 'Use Browser GPS Geolocation'}</span>
        </button>

        <div className="flex items-center gap-2 text-xs font-mono text-gray-400 my-1">
          <div className="h-px bg-white/10 flex-1" />
          <span>or enter manually</span>
          <div className="h-px bg-white/10 flex-1" />
        </div>

        <form onSubmit={handleSave} className="space-y-3 font-mono text-xs">
          <div>
            <label className="block text-gray-400 mb-1">City or Label</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Kota, India or London, UK"
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

          {error && <div className="text-rose-400 text-xs">{error}</div>}

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold transition-colors flex items-center justify-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Save Location</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
