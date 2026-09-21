'use client';

import { useState, useEffect } from 'react';
import type { TleRecord, ObserverLocation, VisiblePass } from '@/lib/types';
import {
  getLiveSatelliteState,
  computeObserverTelemetry,
} from '@/lib/globe-utils';
import {
  Activity,
  Radio,
  Sun,
  Moon,
  Navigation,
  Sparkles,
  Copy,
  Check,
  ChevronRight,
} from 'lucide-react';

interface TelemetryPanelProps {
  selectedSat: TleRecord | null;
  observerLocation: ObserverLocation;
  nextPass: VisiblePass | null;
  onCenterView?: () => void;
  onViewForecast?: () => void;
}

export default function TelemetryPanel({
  selectedSat,
  observerLocation,
  nextPass,
  onCenterView,
  onViewForecast,
}: TelemetryPanelProps) {
  const [copied, setCopied] = useState(false);
  const [countdown, setCountdown] = useState<string>('--:--:--');

  const [metrics, setMetrics] = useState<{
    lat: number;
    lng: number;
    alt: number;
    velKmS: number;
    periodMin: number;
    inclinationDeg: number;
    azimuthDeg: number;
    elevationDeg: number;
    rangeKm: number;
    compass: string;
    isSunlit: boolean;
  } | null>(null);

  // 1-second live telemetry refresh
  useEffect(() => {
    if (!selectedSat) return;

    const tick = () => {
      const now = new Date();
      const state = getLiveSatelliteState(selectedSat, now);
      const obs = computeObserverTelemetry(selectedSat, observerLocation, now);

      if (state && obs) {
        setMetrics({
          lat: state.lat,
          lng: state.lng,
          alt: state.alt,
          velKmS: state.velocityKmS,
          periodMin: state.periodMinutes,
          inclinationDeg: state.inclinationDeg,
          azimuthDeg: obs.azimuthDeg,
          elevationDeg: obs.elevationDeg,
          rangeKm: obs.rangeKm,
          compass: obs.compassHeading,
          isSunlit: obs.isSunlit,
        });
      }

      // Update countdown to next pass if available
      if (nextPass?.startTime) {
        const passStart = new Date(nextPass.startTime).getTime();
        const diffMs = passStart - now.getTime();
        if (diffMs > 0) {
          const totalSecs = Math.floor(diffMs / 1000);
          const h = Math.floor(totalSecs / 3600);
          const m = Math.floor((totalSecs % 3600) / 60);
          const s = totalSecs % 60;
          setCountdown(
            `T- ${h.toString().padStart(2, '0')}h : ${m
              .toString()
              .padStart(2, '0')}m : ${s.toString().padStart(2, '0')}s`,
          );
        } else if (diffMs > -nextPass.durationSeconds * 1000) {
          setCountdown('● PASS IN PROGRESS NOW');
        } else {
          setCountdown('PASS COMPLETE');
        }
      } else {
        setCountdown('NO PASSES NEXT 24H');
      }
    };

    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [selectedSat, observerLocation, nextPass]);

  const handleCopyTle = () => {
    if (!selectedSat) return;
    const tleText = `${selectedSat.name}\n${selectedSat.line1}\n${selectedSat.line2}`;
    navigator.clipboard.writeText(tleText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getCategoryBadge = (cat?: string) => {
    switch (cat) {
      case 'station':
        return { label: 'SPACE STATION', color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' };
      case 'telescope':
        return { label: 'TELESCOPE', color: 'bg-purple-500/15 text-purple-400 border-purple-500/30' };
      case 'starlink':
        return { label: 'STARLINK LEO', color: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30' };
      default:
        return { label: 'SATELLITE', color: 'bg-blue-500/15 text-blue-400 border-blue-500/30' };
    }
  };

  const badge = getCategoryBadge(selectedSat?.category);

  return (
    <div className="w-full h-full flex flex-col bg-[#0b1222]/90 backdrop-blur-xl rounded-2xl border border-white/10 p-5 shadow-2xl overflow-y-auto space-y-5">
      {/* Header */}
      <div className="border-b border-white/10 pb-4">
        <div className="flex items-center justify-between mb-1.5">
          <span
            className={`text-[10px] font-mono px-2 py-0.5 rounded-full border tracking-wider font-semibold ${badge.color}`}
          >
            {badge.label}
          </span>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono text-gray-400">
              NORAD #{selectedSat?.noradId || '-----'}
            </span>
            <button
              onClick={handleCopyTle}
              title="Copy Two-Line Element (TLE)"
              className="p-1 rounded hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
          {selectedSat?.name || 'No Satellite Selected'}
        </h2>

        {/* Sunlight Condition Badge */}
        <div className="mt-2.5 flex items-center justify-between">
          {metrics?.isSunlit ? (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-mono">
              <Sun className="w-3.5 h-3.5 animate-spin-slow text-amber-400" />
              <span>DIRECT SUNLIGHT</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800 border border-white/10 text-gray-400 text-xs font-mono">
              <Moon className="w-3.5 h-3.5 text-gray-400" />
              <span>EARTH SHADOW (ECLIPSED)</span>
            </div>
          )}

          {/* Observer Horizon Condition */}
          {metrics && (
            <div
              className={`text-xs font-mono px-2 py-0.5 rounded-md border ${
                metrics.elevationDeg > 10
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 animate-pulse font-semibold'
                  : metrics.elevationDeg > 0
                  ? 'bg-sky-500/15 text-sky-300 border-sky-500/30'
                  : 'bg-white/5 text-gray-400 border-white/10'
              }`}
            >
              {metrics.elevationDeg > 10
                ? 'OVERHEAD'
                : metrics.elevationDeg > 0
                ? 'LOW HORIZON'
                : 'BELOW HORIZON'}
            </div>
          )}
        </div>
      </div>

      {/* Primary Telemetry Grid */}
      <div className="space-y-2">
        <div className="text-[10px] font-mono tracking-wider text-gray-400 uppercase flex items-center gap-1.5">
          <Activity className="w-3 h-3 text-cyan-400" />
          <span>Real-Time Orbital Telemetry (SGP4)</span>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          {/* Latitude */}
          <div className="bg-[#0f172a]/70 border border-white/5 p-2.5 rounded-xl">
            <div className="text-[10px] font-mono text-gray-400">LATITUDE</div>
            <div className="text-base font-mono font-bold text-white mt-0.5">
              {metrics ? (
                <>
                  {Math.abs(metrics.lat).toFixed(2)}°
                  <span className="text-cyan-400 ml-1">{metrics.lat >= 0 ? 'N' : 'S'}</span>
                </>
              ) : (
                '--'
              )}
            </div>
          </div>

          {/* Longitude */}
          <div className="bg-[#0f172a]/70 border border-white/5 p-2.5 rounded-xl">
            <div className="text-[10px] font-mono text-gray-400">LONGITUDE</div>
            <div className="text-base font-mono font-bold text-white mt-0.5">
              {metrics ? (
                <>
                  {Math.abs(metrics.lng).toFixed(2)}°
                  <span className="text-cyan-400 ml-1">{metrics.lng >= 0 ? 'E' : 'W'}</span>
                </>
              ) : (
                '--'
              )}
            </div>
          </div>

          {/* Altitude */}
          <div className="bg-[#0f172a]/70 border border-white/5 p-2.5 rounded-xl">
            <div className="text-[10px] font-mono text-gray-400">ALTITUDE</div>
            <div className="text-base font-mono font-bold text-cyan-300 mt-0.5">
              {metrics ? `${Math.round(metrics.alt).toLocaleString()} km` : '--'}
            </div>
          </div>

          {/* Velocity */}
          <div className="bg-[#0f172a]/70 border border-white/5 p-2.5 rounded-xl">
            <div className="text-[10px] font-mono text-gray-400">VELOCITY</div>
            <div className="text-base font-mono font-bold text-emerald-400 mt-0.5">
              {metrics ? `${metrics.velKmS.toFixed(2)} km/s` : '--'}
            </div>
            <div className="text-[9px] font-mono text-gray-400">
              {metrics ? `~${Math.round(metrics.velKmS * 3600).toLocaleString()} km/h` : ''}
            </div>
          </div>

          {/* Period */}
          <div className="bg-[#0f172a]/70 border border-white/5 p-2.5 rounded-xl">
            <div className="text-[10px] font-mono text-gray-400">ORBIT PERIOD</div>
            <div className="text-sm font-mono font-bold text-gray-200 mt-0.5">
              {metrics ? `${metrics.periodMin.toFixed(1)} min` : '--'}
            </div>
          </div>

          {/* Inclination */}
          <div className="bg-[#0f172a]/70 border border-white/5 p-2.5 rounded-xl">
            <div className="text-[10px] font-mono text-gray-400">INCLINATION</div>
            <div className="text-sm font-mono font-bold text-gray-200 mt-0.5">
              {metrics ? `${metrics.inclinationDeg.toFixed(2)}°` : '--'}
            </div>
          </div>
        </div>
      </div>

      {/* Observer Relative Coordinates */}
      <div className="space-y-2">
        <div className="text-[10px] font-mono tracking-wider text-gray-400 uppercase flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Radio className="w-3 h-3 text-emerald-400" />
            <span>Observer Vector (From Observer)</span>
          </span>
          <span className="text-[9px] text-gray-400">
            {observerLocation.latitude.toFixed(1)}°N, {observerLocation.longitude.toFixed(1)}°E
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {/* Range */}
          <div className="bg-[#0f172a]/70 border border-white/5 p-2 rounded-xl text-center">
            <div className="text-[9px] font-mono text-gray-400">RANGE</div>
            <div className="text-sm font-mono font-bold text-white mt-0.5">
              {metrics ? `${Math.round(metrics.rangeKm).toLocaleString()}` : '--'}
            </div>
            <div className="text-[8px] font-mono text-gray-400">km</div>
          </div>

          {/* Elevation */}
          <div className="bg-[#0f172a]/70 border border-white/5 p-2 rounded-xl text-center">
            <div className="text-[9px] font-mono text-gray-400">ELEVATION</div>
            <div
              className={`text-sm font-mono font-bold mt-0.5 ${
                (metrics?.elevationDeg || 0) > 0 ? 'text-emerald-400' : 'text-gray-400'
              }`}
            >
              {metrics ? `${metrics.elevationDeg > 0 ? '+' : ''}${metrics.elevationDeg.toFixed(1)}°` : '--'}
            </div>
            <div className="text-[8px] font-mono text-gray-400">angle</div>
          </div>

          {/* Azimuth */}
          <div className="bg-[#0f172a]/70 border border-white/5 p-2 rounded-xl text-center">
            <div className="text-[9px] font-mono text-gray-400">HEADING</div>
            <div className="text-sm font-mono font-bold text-cyan-300 mt-0.5 flex items-center justify-center gap-1">
              <span>{metrics?.compass || '--'}</span>
              <span className="text-[10px] text-gray-400">
                ({metrics ? Math.round(metrics.azimuthDeg) : 0}°)
              </span>
            </div>
            <div className="text-[8px] font-mono text-gray-400">azimuth</div>
          </div>
        </div>
      </div>

      {/* Next Visible Pass Card */}
      <div className="bg-gradient-to-br from-[#0c1833] to-[#0a1224] rounded-xl border border-cyan-500/30 p-3.5 space-y-2.5 shadow-lg">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono tracking-wider text-cyan-400 font-semibold flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            NEXT VISIBLE PASS
          </span>
          {nextPass?.brightnessLabel && (
            <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 uppercase">
              {nextPass.brightnessLabel}
            </span>
          )}
        </div>

        {/* Big Countdown Timer */}
        <div className="text-center py-1">
          <div className="font-mono text-xl sm:text-2xl font-black tracking-wider text-white">
            {countdown}
          </div>
          <div className="text-[10px] font-mono text-gray-400 mt-0.5">
            {nextPass
              ? `Crosses sky at max elevation ${nextPass.peakElevationDeg}° (${nextPass.compassDirection})`
              : 'Waiting for pass computation...'}
          </div>
        </div>

        {nextPass && (
          <div className="grid grid-cols-3 gap-1 pt-1 border-t border-white/10 text-center font-mono text-xs">
            <div>
              <div className="text-[9px] text-gray-400">MAX EL</div>
              <div className="font-bold text-cyan-300">{nextPass.peakElevationDeg}°</div>
            </div>
            <div>
              <div className="text-[9px] text-gray-400">DURATION</div>
              <div className="font-bold text-gray-200">
                {Math.round(nextPass.durationSeconds / 60)} min
              </div>
            </div>
            <div>
              <div className="text-[9px] text-gray-400">MAGNITUDE</div>
              <div className="font-bold text-emerald-400">
                {nextPass.magnitude !== null ? nextPass.magnitude.toFixed(1) : 'Bright'}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="pt-1 flex gap-2">
        {onCenterView && (
          <button
            onClick={onCenterView}
            className="flex-1 py-2.5 px-3 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-mono font-semibold transition-colors flex items-center justify-center gap-1.5"
          >
            <Navigation className="w-3.5 h-3.5" />
            <span>Track in 3D</span>
          </button>
        )}
        {onViewForecast && (
          <button
            onClick={onViewForecast}
            className="flex-1 py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10 text-xs font-mono font-medium transition-colors flex items-center justify-center gap-1"
          >
            <span>7-Day Passes</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
