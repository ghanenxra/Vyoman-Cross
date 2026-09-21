'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import type { TleRecord, ObserverLocation } from '@/lib/types';
import { resolveLocationQuery } from '@/lib/coord-parser';
import { Search, X, Satellite, MapPin } from 'lucide-react';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSatellite: (sat: TleRecord) => void;
  onSetLocation?: (loc: ObserverLocation, name: string) => void;
  satellites: TleRecord[];
}

export default function SearchModal({
  isOpen,
  onClose,
  onSelectSatellite,
  onSetLocation,
  satellites,
}: SearchModalProps) {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input on modal open
  useEffect(() => {
    if (isOpen) {
      setSearch('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Global Ctrl+K hotkey
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Check if search query is a coordinate or city
  const locationMatch = useMemo(() => {
    return resolveLocationQuery(search);
  }, [search]);

  if (!isOpen) return null;

  // Filter satellites
  const query = search.trim().toLowerCase();
  const filtered = satellites
    .filter((sat) => {
      if (selectedCategory !== 'all' && sat.category !== selectedCategory) {
        return false;
      }
      if (!query) return true;
      return (
        sat.name.toLowerCase().includes(query) ||
        sat.noradId.toString().includes(query)
      );
    })
    .slice(0, 50);

  const handleSelect = (sat: TleRecord) => {
    onSelectSatellite(sat);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filtered.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev - 1 < 0 ? Math.max(0, filtered.length - 1) : prev - 1,
      );
    } else if (e.key === 'Enter' && filtered[selectedIndex]) {
      e.preventDefault();
      handleSelect(filtered[selectedIndex]);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-150">
      <div
        className="w-full max-w-2xl bg-[#0b1222] border border-white/15 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[75vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="p-4 border-b border-white/10 flex items-center gap-3 bg-[#070b16]">
          <Search className="w-5 h-5 text-cyan-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Search satellites, or enter coordinates (e.g. 28.6139, 77.2090 or Kota)..."
            className="w-full bg-transparent text-white font-mono text-sm placeholder-gray-500 focus:outline-none"
          />
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Quick Coordinate Match Banner */}
        {locationMatch && (
          <div
            onClick={() => {
              onSetLocation?.(locationMatch.location, locationMatch.name);
              onClose();
            }}
            className="m-2 p-3 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 cursor-pointer flex items-center justify-between transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400">
                <MapPin className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-white font-mono flex items-center gap-2">
                  <span>Set Observer: {locationMatch.name}</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono font-semibold uppercase">
                    COORDINATE MATCH
                  </span>
                </div>
                <div className="text-[10px] font-mono text-gray-300">
                  {locationMatch.location.latitude.toFixed(4)}°,{' '}
                  {locationMatch.location.longitude.toFixed(4)}° • Click to set as active location
                </div>
              </div>
            </div>
            <span className="text-xs font-mono font-bold text-emerald-400 group-hover:underline pr-2">
              Apply Location →
            </span>
          </div>
        )}

        {/* Category Filter Tabs */}
        <div className="flex items-center gap-2 px-4 py-2 border-b border-white/5 bg-[#0f172a]/50 text-xs font-mono overflow-x-auto">
          {[
            { id: 'all', label: 'All Constellations' },
            { id: 'station', label: 'Space Stations' },
            { id: 'telescope', label: 'Telescopes' },
            { id: 'starlink', label: 'Starlink LEO' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setSelectedCategory(tab.id);
                setSelectedIndex(0);
              }}
              className={`px-2.5 py-1 rounded-lg transition-colors whitespace-nowrap ${
                selectedCategory === tab.id
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-semibold'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
              }`}
            >
              {tab.label}
            </button>
          ))}
          <span className="text-[11px] text-gray-400 ml-auto hidden sm:inline">
            {filtered.length} matches
          </span>
        </div>

        {/* Satellites List */}
        <div className="overflow-y-auto p-2 divide-y divide-white/5">
          {filtered.length === 0 && !locationMatch ? (
            <div className="p-8 text-center text-gray-400 font-mono text-sm">
              No satellites found matching &ldquo;{search}&rdquo;.
            </div>
          ) : (
            filtered.map((sat, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={sat.noradId}
                  onClick={() => handleSelect(sat)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`p-3 rounded-xl flex items-center justify-between cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-cyan-500/15 border border-cyan-500/30'
                      : 'hover:bg-white/5 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2 rounded-lg ${
                        sat.category === 'station'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : sat.category === 'telescope'
                          ? 'bg-purple-500/20 text-purple-400'
                          : 'bg-cyan-500/20 text-cyan-400'
                      }`}
                    >
                      <Satellite className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-white font-mono flex items-center gap-2">
                        <span>{sat.name}</span>
                        {sat.category === 'station' && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-semibold uppercase">
                            STATION
                          </span>
                        )}
                        {sat.category === 'telescope' && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400 font-semibold uppercase">
                            TELESCOPE
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] font-mono text-gray-400">
                        NORAD ID: {sat.noradId} • Updated:{' '}
                        {new Date(sat.fetchedAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelect(sat);
                      }}
                      className="px-3 py-1 rounded-lg bg-white/10 hover:bg-cyan-500 hover:text-black text-xs font-mono text-gray-200 transition-colors"
                    >
                      Track in 3D →
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer info */}
        <div className="p-3 bg-[#070b16] border-t border-white/10 flex items-center justify-between text-[11px] font-mono text-gray-400">
          <span>Navigate with ↑ ↓ and Enter to select</span>
          <span>Esc to close</span>
        </div>
      </div>
    </div>
  );
}
