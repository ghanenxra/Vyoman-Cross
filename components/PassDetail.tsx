'use client';

import { useEffect, useState } from 'react';
import type { VisiblePass } from '@/lib/types';

interface PassDetailProps {
  pass: VisiblePass;
  isLive?: boolean; // true when this is a currently visible pass
}

function formatTime(isoStr: string): string {
  return new Date(isoStr).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function formatDate(isoStr: string): string {
  return new Date(isoStr).toLocaleDateString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function formatCountdown(seconds: number): string {
  if (seconds <= 0) return '0s';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

const brightnessConfig: Record<string, { color: string; icon: string }> = {
  'very bright': { color: 'text-vc-warning', icon: '★★★' },
  bright: { color: 'text-vc-warning', icon: '★★' },
  moderate: { color: 'text-vc-muted', icon: '★' },
  faint: { color: 'text-vc-dim', icon: '☆' },
  unknown: { color: 'text-vc-dim', icon: '?' },
};

// 8-point compass for compact display in time grid
function azToCompass(deg: number): string {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return dirs[Math.round(((deg % 360) + 360) % 360 / 45) % 8];
}

const categoryConfig: Record<string, { label: string; icon: string; style: string }> = {
  station: { label: 'Space Station', icon: '🛸', style: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' },
  starlink: { label: 'Starlink', icon: '🛰️', style: 'bg-sky-500/10 text-sky-400 border-sky-500/30' },
  telescope: { label: 'Telescope', icon: '🔭', style: 'bg-purple-500/10 text-purple-400 border-purple-500/30' },
  other: { label: 'Satellite', icon: '🛰️', style: 'bg-slate-500/10 text-slate-400 border-slate-500/30' },
};

export default function PassDetail({ pass, isLive = false }: PassDetailProps) {
  const [now, setNow] = useState(Date.now());

  // Live countdown ticker
  useEffect(() => {
    if (!isLive) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [isLive]);

  const startMs = new Date(pass.startTime).getTime();
  const endMs = new Date(pass.endTime).getTime();
  const remainingSeconds = Math.max(0, (endMs - now) / 1000);
  const elapsed = now - startMs;
  const total = endMs - startMs;
  const progress = Math.min(100, Math.max(0, (elapsed / total) * 100));

  const brightness = brightnessConfig[pass.brightnessLabel] || brightnessConfig.unknown;
  const category = categoryConfig[pass.category] || categoryConfig.other;

  return (
    <div className="rounded-xl bg-vc-card border border-vc-border p-5 space-y-4">
      {/* Header: object name + category + brightness */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <h3 className="font-[family-name:var(--font-heading)] font-semibold text-lg text-vc-text">
            {pass.objectName}
          </h3>
          <span className={`text-[11px] px-2 py-0.5 rounded-full border font-[family-name:var(--font-mono)] flex items-center gap-1 ${category.style}`}>
            <span>{category.icon}</span>
            <span>{category.label}</span>
          </span>
          {pass.isTrain && (
            <span className="text-[10px] font-[family-name:var(--font-mono)] bg-sky-500/15 text-sky-300 border border-sky-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
              <span>🚀</span> Starlink Train
            </span>
          )}
        </div>
        <span className={`text-sm font-[family-name:var(--font-mono)] ${brightness.color}`}>
          {brightness.icon} {pass.brightnessLabel}
        </span>
      </div>

      {/* Direction + elevation — the main guidance */}
      <div className="flex items-center gap-6">
        {/* Compass direction indicator */}
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 rounded-full border-2 border-vc-accent/30 flex items-center justify-center relative">
            <span className="font-[family-name:var(--font-heading)] font-bold text-xl text-vc-accent">
              {pass.compassDirection}
            </span>
          </div>
          <span className="text-xs text-vc-dim mt-1 font-[family-name:var(--font-mono)]">
            {Math.round(pass.peakAzimuthDeg)}°
          </span>
        </div>

        {/* Elevation + direction text */}
        <div className="flex-1 space-y-1">
          <p className="text-vc-text">
            Look{' '}
            <span className="text-vc-accent font-semibold">{pass.compassDirection}</span>
            {' '}at{' '}
            <span className="font-[family-name:var(--font-mono)] text-vc-accent font-semibold">
              {pass.peakElevationDeg}°
            </span>
            {' '}elevation
          </p>
          <p className="text-sm text-vc-muted">
            Duration:{' '}
            <span className="font-[family-name:var(--font-mono)]">{formatDuration(pass.durationSeconds)}</span>
          </p>
        </div>
      </div>

      {/* Live countdown + progress bar */}
      {isLive && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-vc-success font-[family-name:var(--font-mono)] font-semibold animate-pulse">
              ● VISIBLE NOW
            </span>
            <span className="text-vc-muted font-[family-name:var(--font-mono)]">
              {formatCountdown(remainingSeconds)} remaining
            </span>
          </div>
          <div className="w-full h-1.5 bg-vc-bg rounded-full overflow-hidden">
            <div
              className="h-full bg-vc-accent rounded-full transition-all duration-1000"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Time details */}
      <div className="grid grid-cols-3 gap-3 text-center">
        <div className="space-y-1">
          <p className="text-xs text-vc-dim uppercase font-[family-name:var(--font-mono)] tracking-wider">Start</p>
          <p className="font-[family-name:var(--font-mono)] text-sm text-vc-text">{formatTime(pass.startTime)}</p>
          <p className="text-xs text-vc-dim font-[family-name:var(--font-mono)]">{Math.round(pass.startAzimuthDeg)}° {azToCompass(pass.startAzimuthDeg)}</p>
        </div>
        <div className="space-y-1">
          <p className="text-xs text-vc-dim uppercase font-[family-name:var(--font-mono)] tracking-wider">Peak</p>
          <p className="font-[family-name:var(--font-mono)] text-sm text-vc-accent">{formatTime(pass.peakTime)}</p>
          <p className="text-xs text-vc-dim font-[family-name:var(--font-mono)]">{pass.peakElevationDeg}° elev</p>
        </div>
        <div className="space-y-1">
          <p className="text-xs text-vc-dim uppercase font-[family-name:var(--font-mono)] tracking-wider">End</p>
          <p className="font-[family-name:var(--font-mono)] text-sm text-vc-text">{formatTime(pass.endTime)}</p>
          <p className="text-xs text-vc-dim font-[family-name:var(--font-mono)]">{Math.round(pass.endAzimuthDeg)}° {azToCompass(pass.endAzimuthDeg)}</p>
        </div>
      </div>

      {/* Date — shown in forecast mode, not live */}
      {!isLive && (
        <p className="text-xs text-vc-dim font-[family-name:var(--font-mono)]">
          {formatDate(pass.startTime)}
        </p>
      )}
    </div>
  );
}
