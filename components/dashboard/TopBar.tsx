'use client';

import { useState, useEffect } from 'react';
import type { ObserverLocation } from '@/lib/types';
import SunCalc from 'suncalc';
import {
  Satellite,
  Search,
  MapPin,
  Clock,
  Moon,
} from 'lucide-react';

interface TopBarProps {
  observerLocation: ObserverLocation;
  locationName?: string;
  onOpenSearch: () => void;
  onChangeLocation: () => void;
}

export default function TopBar({
  observerLocation,
  locationName = 'Kota, India',
  onOpenSearch,
  onChangeLocation,
}: TopBarProps) {
  const [utcTime, setUtcTime] = useState('');
  const [localTime, setLocalTime] = useState('');
  const [moonData, setMoonData] = useState<{ phaseName: string; illumination: number }>({
    phaseName: 'Waxing Gibbous',
    illumination: 75,
  });

  useEffect(() => {
    const updateClocks = () => {
      const now = new Date();
      // UTC Time
      const utcString = now.toUTCString().slice(17, 25) + ' UTC';
      setUtcTime(utcString);

      // Local Time
      const localString = now.toLocaleTimeString(undefined, {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      });
      setLocalTime(localString);

      // Moon Illumination
      const moon = SunCalc.getMoonIllumination(now);
      const frac = Math.round(moon.fraction * 100);
      let phase = 'New Moon';
      if (moon.phase < 0.125) phase = 'New Moon';
      else if (moon.phase < 0.25) phase = 'Waxing Crescent';
      else if (moon.phase < 0.375) phase = 'First Quarter';
      else if (moon.phase < 0.5) phase = 'Waxing Gibbous';
      else if (moon.phase < 0.625) phase = 'Full Moon';
      else if (moon.phase < 0.75) phase = 'Waning Gibbous';
      else if (moon.phase < 0.875) phase = 'Last Quarter';
      else phase = 'Waning Crescent';

      setMoonData({ phaseName: phase, illumination: frac });
    };

    updateClocks();
    const timer = setInterval(updateClocks, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="w-full bg-[#070b16]/90 backdrop-blur-md border-b border-white/10 px-4 py-2.5 flex items-center justify-between gap-3 sticky top-0 z-30">
      {/* Left: Brand / Logo */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-500 flex items-center justify-center text-white shadow-lg shadow-cyan-500/20">
            <Satellite className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold tracking-wider text-base text-white font-mono">
                VYOMAN <span className="text-cyan-400">CROSS</span>
              </span>
              <span className="inline-flex items-center gap-1 text-[9px] font-mono px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                LIVE
              </span>
            </div>
            <div className="text-[9px] font-mono text-gray-400 tracking-wider hidden sm:block">
              AEROSPACE ORBITAL INTELLIGENCE
            </div>
          </div>
        </div>
      </div>

      {/* Center: Search Trigger (Ctrl+K) */}
      <button
        onClick={onOpenSearch}
        className="flex-1 max-w-md mx-2 px-3.5 py-1.5 rounded-xl bg-[#0f172a]/90 hover:bg-[#1e293b] border border-white/10 hover:border-cyan-500/40 text-gray-400 hover:text-gray-200 transition-all flex items-center justify-between text-xs font-mono group shadow-inner"
      >
        <span className="flex items-center gap-2 truncate">
          <Search className="w-3.5 h-3.5 text-cyan-400 group-hover:text-cyan-300" />
          <span className="truncate">Search 200+ Satellites (ISS, Starlink, Hubble)...</span>
        </span>
        <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] bg-white/5 border border-white/15 rounded text-gray-400 group-hover:text-gray-200">
          Ctrl K
        </kbd>
      </button>

      {/* Right: Observer Pin + Clocks + Moon */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Observer Location */}
        <button
          onClick={onChangeLocation}
          title="Change Observer Location"
          className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-200 text-xs font-mono flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <MapPin className="w-3.5 h-3.5 text-emerald-400" />
          <span className="hidden md:inline font-medium">{locationName}</span>
          <span className="text-[10px] text-gray-400 font-mono">
            {observerLocation.latitude.toFixed(1)}°N
          </span>
        </button>

        {/* Live Clocks (UTC / Local) */}
        <div className="hidden lg:flex items-center gap-2 px-3 py-1 rounded-xl bg-[#0f172a] border border-white/10 font-mono text-xs">
          <Clock className="w-3 h-3 text-cyan-400" />
          <span className="text-gray-200 font-bold">{utcTime}</span>
          <span className="text-gray-400 text-[10px]">|</span>
          <span className="text-gray-400 text-[11px]">{localTime}</span>
        </div>

        {/* Moon Phase Indicator */}
        <div
          title={`${moonData.phaseName} (${moonData.illumination}% illuminated)`}
          className="hidden xl:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs font-mono text-gray-300"
        >
          <Moon className="w-3.5 h-3.5 text-amber-300" />
          <span className="text-[11px]">{moonData.illumination}%</span>
        </div>
      </div>
    </header>
  );
}
