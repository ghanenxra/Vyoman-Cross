'use client';

import { useState, forwardRef, useMemo } from 'react';
import type { ForecastResponse, VisiblePass } from '@/lib/types';
import PassDetail from './PassDetail';

interface ForecastListProps {
  data: ForecastResponse;
}

const brightnessColors: Record<string, string> = {
  'very bright': 'bg-vc-warning/20 text-vc-warning',
  bright: 'bg-vc-warning/10 text-vc-warning',
  moderate: 'bg-vc-muted/10 text-vc-muted',
  faint: 'bg-vc-dim/10 text-vc-dim',
  unknown: 'bg-vc-dim/10 text-vc-dim',
};

const categoryBadges: Record<string, { label: string; icon: string; textClass: string }> = {
  station: { label: 'Station', icon: '🛸', textClass: 'text-emerald-400' },
  starlink: { label: 'Starlink', icon: '🛰️', textClass: 'text-sky-400' },
  telescope: { label: 'Telescope', icon: '🔭', textClass: 'text-purple-400' },
  other: { label: 'Satellite', icon: '🛰️', textClass: 'text-slate-400' },
};

function formatPassDate(isoStr: string): string {
  return new Date(isoStr).toLocaleDateString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function formatPassTime(isoStr: string): string {
  return new Date(isoStr).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

type CategoryFilter = 'all' | 'starlink' | 'station' | 'telescope';

const INITIAL_VISIBLE_COUNT = 30;

const ForecastList = forwardRef<HTMLDivElement, ForecastListProps>(
  function ForecastList({ data }, ref) {
    const [expandedKey, setExpandedKey] = useState<string | null>(null);
    const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>('all');
    const [onlyHighPasses, setOnlyHighPasses] = useState(false); // Elevation > 30 deg
    const [searchQuery, setSearchQuery] = useState('');
    const [displayLimit, setDisplayLimit] = useState(INITIAL_VISIBLE_COUNT);

    const counts = useMemo(() => {
      const c = { all: data.passes.length, starlink: 0, station: 0, telescope: 0 };
      for (const p of data.passes) {
        if (p.category === 'starlink') c.starlink++;
        else if (p.category === 'station') c.station++;
        else if (p.category === 'telescope') c.telescope++;
      }
      return c;
    }, [data.passes]);

    const filteredPasses = useMemo(() => {
      if (selectedCategory === 'all') return data.passes;
      return data.passes.filter((p) => p.category === selectedCategory);
    }, [data.passes, selectedCategory]);
      return data.passes.filter((p) => {
        // Category filter
        if (selectedCategory !== 'all' && p.category !== selectedCategory) return false;
        // High passes filter (> 30° elevation)
        if (onlyHighPasses && p.peakElevationDeg < 30) return false;
        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          return p.objectName.toLowerCase().includes(q) || p.compassDirection.toLowerCase().includes(q);
        }
        return true;
      });
    }, [data.passes, selectedCategory, onlyHighPasses, searchQuery]);

    // Limit displayed passes for DOM performance
    const displayedPasses = useMemo(() => {
      return filteredPasses.slice(0, displayLimit);
    }, [filteredPasses, displayLimit]);

    if (data.passes.length === 0) {
      return (
        <div ref={ref} className="rounded-xl bg-vc-card border border-vc-border p-8 text-center space-y-3">
          <h2 className="font-[family-name:var(--font-heading)] text-2xl font-bold text-vc-text">
            Next 7 days
          </h2>
          <div className="w-12 h-12 mx-auto rounded-full bg-vc-bg border border-vc-border flex items-center justify-center">
            <svg className="w-6 h-6 text-vc-dim" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.64 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.64 0-8.573-3.007-9.963-7.178Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
            </svg>
          </div>
          <p className="text-vc-muted">
            No visible satellite passes in the next 7 days for your location.
          </p>
          <p className="text-vc-dim text-sm">
            This can happen at certain latitudes or seasons. Check back later!
          </p>
        </div>
      );
    }

    // Group passes by date
    // Group displayed passes by date
    const grouped = new Map<string, VisiblePass[]>();
    for (const pass of filteredPasses) {
    for (const pass of displayedPasses) {
      const dateKey = formatPassDate(pass.startTime);
      if (!grouped.has(dateKey)) grouped.set(dateKey, []);
      grouped.get(dateKey)!.push(pass);
    }

    return (
      <div ref={ref} className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="font-[family-name:var(--font-heading)] text-2xl font-bold text-vc-text flex items-center gap-3">
            <span>Next 7 days</span>
            <span className="text-xs font-normal text-vc-dim font-[family-name:var(--font-mono)] border border-vc-border px-2 py-0.5 rounded-full">
              {filteredPasses.length} {filteredPasses.length === 1 ? 'pass' : 'passes'}
            </span>
          </h2>
        {/* Header & Controls */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h2 className="font-[family-name:var(--font-heading)] text-2xl font-bold text-vc-text flex items-center gap-3">
              <span>Next 7 days</span>
              <span className="text-xs font-normal text-vc-dim font-[family-name:var(--font-mono)] border border-vc-border px-2.5 py-0.5 rounded-full">
                {filteredPasses.length} {filteredPasses.length === 1 ? 'pass' : 'passes'}
              </span>
            </h2>

          {/* Category filter tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 text-xs font-[family-name:var(--font-mono)]">
            {/* High Elevation filter toggle */}
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1.5 rounded-lg border transition-colors cursor-pointer shrink-0 ${
                selectedCategory === 'all'
                  ? 'bg-vc-accent/20 border-vc-accent/50 text-vc-accent'
                  : 'bg-vc-card border-vc-border text-vc-muted hover:text-vc-text hover:bg-vc-hover'
              onClick={() => setOnlyHighPasses(!onlyHighPasses)}
              className={`text-xs font-[family-name:var(--font-mono)] px-3 py-1.5 rounded-lg border transition-colors cursor-pointer flex items-center gap-1.5 ${
                onlyHighPasses
                  ? 'bg-vc-warning/15 border-vc-warning/40 text-vc-warning'
                  : 'bg-vc-card border-vc-border text-vc-dim hover:text-vc-text'
              }`}
            >
              All ({counts.all})
              <span>{onlyHighPasses ? '★' : '☆'}</span>
              <span>High Elevation Only (&gt; 30°)</span>
            </button>
            {counts.starlink > 0 && (
              <button
                onClick={() => setSelectedCategory('starlink')}
                className={`px-3 py-1.5 rounded-lg border transition-colors cursor-pointer shrink-0 flex items-center gap-1.5 ${
                  selectedCategory === 'starlink'
                    ? 'bg-sky-500/20 border-sky-500/50 text-sky-400'
                    : 'bg-vc-card border-vc-border text-vc-muted hover:text-vc-text hover:bg-vc-hover'
                }`}
          </div>

          {/* Search & Category Filter Toolbar */}
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by satellite name (e.g. ISS, Tiangong, 38086)..."
                className="w-full px-3.5 py-2 pl-9 rounded-lg bg-vc-card border border-vc-border
                  text-xs font-[family-name:var(--font-mono)] text-vc-text placeholder:text-vc-dim
                  focus:outline-none focus:border-vc-accent/50 focus:ring-1 focus:ring-vc-accent/25 transition-colors"
              />
              <svg
                className="w-4 h-4 text-vc-dim absolute left-3 top-2.5"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <span>🛰️</span>
                <span>Starlink ({counts.starlink})</span>
              </button>
            )}
            {counts.station > 0 && (
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
              </svg>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-2 text-vc-dim hover:text-vc-text text-xs cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Category tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 text-xs font-[family-name:var(--font-mono)]">
              <button
                onClick={() => setSelectedCategory('station')}
                className={`px-3 py-1.5 rounded-lg border transition-colors cursor-pointer shrink-0 flex items-center gap-1.5 ${
                  selectedCategory === 'station'
                    ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
                onClick={() => setSelectedCategory('all')}
                className={`px-3 py-2 rounded-lg border transition-colors cursor-pointer shrink-0 ${
                  selectedCategory === 'all'
                    ? 'bg-vc-accent/20 border-vc-accent/50 text-vc-accent font-semibold'
                    : 'bg-vc-card border-vc-border text-vc-muted hover:text-vc-text hover:bg-vc-hover'
                }`}
              >
                <span>🛸</span>
                <span>Stations ({counts.station})</span>
                All ({counts.all})
              </button>
            )}
            {counts.telescope > 0 && (
              {counts.starlink > 0 && (
                <button
                  onClick={() => setSelectedCategory('starlink')}
                  className={`px-3 py-2 rounded-lg border transition-colors cursor-pointer shrink-0 flex items-center gap-1.5 ${
                    selectedCategory === 'starlink'
                      ? 'bg-sky-500/20 border-sky-500/50 text-sky-400 font-semibold'
                      : 'bg-vc-card border-vc-border text-vc-muted hover:text-vc-text hover:bg-vc-hover'
                  }`}
                >
                  <span>🛰️</span>
                  <span>Starlink ({counts.starlink})</span>
                </button>
              )}
              {counts.station > 0 && (
                <button
                  onClick={() => setSelectedCategory('station')}
                  className={`px-3 py-2 rounded-lg border transition-colors cursor-pointer shrink-0 flex items-center gap-1.5 ${
                    selectedCategory === 'station'
                      ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400 font-semibold'
                      : 'bg-vc-card border-vc-border text-vc-muted hover:text-vc-text hover:bg-vc-hover'
                  }`}
                >
                  <span>🛸</span>
                  <span>Stations ({counts.station})</span>
                </button>
              )}
              {counts.telescope > 0 && (
                <button
                  onClick={() => setSelectedCategory('telescope')}
                  className={`px-3 py-2 rounded-lg border transition-colors cursor-pointer shrink-0 flex items-center gap-1.5 ${
                    selectedCategory === 'telescope'
                      ? 'bg-purple-500/20 border-purple-500/50 text-purple-400 font-semibold'
                      : 'bg-vc-card border-vc-border text-vc-muted hover:text-vc-text hover:bg-vc-hover'
                  }`}
                >
                  <span>🔭</span>
                  <span>Telescopes ({counts.telescope})</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Results List */}
        {filteredPasses.length === 0 ? (
          <div className="rounded-xl bg-vc-card border border-vc-border p-8 text-center text-vc-muted text-sm space-y-2">
            <p>No visible passes matched your filters.</p>
            {onlyHighPasses && (
              <button
                onClick={() => setSelectedCategory('telescope')}
                className={`px-3 py-1.5 rounded-lg border transition-colors cursor-pointer shrink-0 flex items-center gap-1.5 ${
                  selectedCategory === 'telescope'
                    ? 'bg-purple-500/20 border-purple-500/50 text-purple-400'
                    : 'bg-vc-card border-vc-border text-vc-muted hover:text-vc-text hover:bg-vc-hover'
                }`}
                onClick={() => setOnlyHighPasses(false)}
                className="text-xs text-vc-accent underline hover:text-vc-text cursor-pointer"
              >
                <span>🔭</span>
                <span>Telescopes ({counts.telescope})</span>
                Disable high elevation filter to show all passes
              </button>
            )}
          </div>
        </div>

        {filteredPasses.length === 0 ? (
          <div className="rounded-xl bg-vc-card border border-vc-border p-8 text-center text-vc-muted">
            No visible passes found for the selected category.
          </div>
        ) : (
          Array.from(grouped.entries()).map(([dateStr, passes]) => (
            <div key={dateStr} className="space-y-2">
              {/* Date header */}
              <h3 className="text-sm font-[family-name:var(--font-mono)] text-vc-dim uppercase tracking-wider pl-1">
                {dateStr}
              </h3>
          <div className="space-y-6">
            {Array.from(grouped.entries()).map(([dateStr, passes]) => (
              <div key={dateStr} className="space-y-2">
                {/* Date header */}
                <h3 className="text-xs font-[family-name:var(--font-mono)] text-vc-dim uppercase tracking-wider pl-1 flex items-center gap-2">
                  <span>{dateStr}</span>
                  <span className="text-[10px] text-vc-dim/70">({passes.length} passes)</span>
                </h3>

              {/* Pass rows */}
              {passes.map((pass) => {
                const passKey = `${pass.noradId}-${pass.startTime}`;
                const isExpanded = expandedKey === passKey;
                const brightnessClass = brightnessColors[pass.brightnessLabel] || brightnessColors.unknown;
                const category = categoryBadges[pass.category] || categoryBadges.other;
                {/* Pass rows */}
                {passes.map((pass) => {
                  const passKey = `${pass.noradId}-${pass.startTime}`;
                  const isExpanded = expandedKey === passKey;
                  const brightnessClass = brightnessColors[pass.brightnessLabel] || brightnessColors.unknown;
                  const category = categoryBadges[pass.category] || categoryBadges.other;

                return (
                  <div key={passKey}>
                    {/* Compact row */}
                    <button
                      onClick={() => setExpandedKey(isExpanded ? null : passKey)}
                      className={`w-full text-left px-4 py-3 rounded-lg border transition-all duration-200 cursor-pointer
                        ${
                          isExpanded
                            ? 'bg-vc-hover border-vc-accent/30'
                            : 'bg-vc-card border-vc-border hover:bg-vc-hover hover:border-vc-border'
                        }`}
                    >
                      <div className="flex items-center gap-3 sm:gap-4">
                        {/* Time */}
                        <span className="font-[family-name:var(--font-mono)] text-sm text-vc-accent w-14 sm:w-16 shrink-0">
                          {formatPassTime(pass.startTime)}
                        </span>
                  return (
                    <div key={passKey}>
                      {/* Compact row */}
                      <button
                        onClick={() => setExpandedKey(isExpanded ? null : passKey)}
                        className={`w-full text-left px-4 py-3 rounded-lg border transition-all duration-200 cursor-pointer
                          ${
                            isExpanded
                              ? 'bg-vc-hover border-vc-accent/30 shadow-sm'
                              : 'bg-vc-card border-vc-border hover:bg-vc-hover hover:border-vc-border'
                          }`}
                      >
                        <div className="flex items-center gap-3 sm:gap-4">
                          {/* Time */}
                          <span className="font-[family-name:var(--font-mono)] text-sm text-vc-accent w-14 sm:w-16 shrink-0">
                            {formatPassTime(pass.startTime)}
                          </span>

                        {/* Category icon */}
                        <span title={category.label} className="text-sm shrink-0">
                          {category.icon}
                        </span>
                          {/* Category icon */}
                          <span title={category.label} className="text-sm shrink-0">
                            {category.icon}
                          </span>

                        {/* Object name */}
                        <span className="font-[family-name:var(--font-heading)] font-medium text-vc-text flex-1 truncate">
                          {pass.objectName}
                        </span>
                          {/* Object name + Train badge */}
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <span className="font-[family-name:var(--font-heading)] font-medium text-vc-text truncate">
                              {pass.objectName}
                            </span>
                            {pass.isTrain && (
                              <span className="text-[10px] font-[family-name:var(--font-mono)] bg-sky-500/15 text-sky-300 border border-sky-500/30 px-1.5 py-0.2 rounded shrink-0">
                                TRAIN
                              </span>
                            )}
                          </div>

                        {/* Direction */}
                        <span className="font-[family-name:var(--font-mono)] text-xs text-vc-muted w-8 text-center shrink-0">
                          {pass.compassDirection}
                        </span>
                          {/* Direction */}
                          <span className="font-[family-name:var(--font-mono)] text-xs text-vc-muted w-8 text-center shrink-0">
                            {pass.compassDirection}
                          </span>

                        {/* Elevation */}
                        <span className="font-[family-name:var(--font-mono)] text-xs text-vc-muted w-10 text-right shrink-0">
                          {pass.peakElevationDeg}°
                        </span>
                          {/* Elevation */}
                          <span
                            className={`font-[family-name:var(--font-mono)] text-xs w-10 text-right shrink-0 ${
                              pass.peakElevationDeg >= 40
                                ? 'text-vc-warning font-semibold'
                                : 'text-vc-muted'
                            }`}
                          >
                            {pass.peakElevationDeg}°
                          </span>

                        {/* Duration */}
                        <span className="font-[family-name:var(--font-mono)] text-xs text-vc-dim w-14 text-right hidden sm:inline shrink-0">
                          {formatDuration(pass.durationSeconds)}
                        </span>
                          {/* Duration */}
                          <span className="font-[family-name:var(--font-mono)] text-xs text-vc-dim w-14 text-right hidden sm:inline shrink-0">
                            {formatDuration(pass.durationSeconds)}
                          </span>

                        {/* Brightness tag */}
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-[family-name:var(--font-mono)] capitalize shrink-0 ${brightnessClass}`}
                        >
                          {pass.brightnessLabel}
                        </span>
                          {/* Brightness tag */}
                          <span
                            className={`text-[11px] px-2 py-0.5 rounded-full font-[family-name:var(--font-mono)] capitalize shrink-0 ${brightnessClass}`}
                          >
                            {pass.brightnessLabel}
                          </span>

                        {/* Expand arrow */}
                        <svg
                          className={`w-4 h-4 text-vc-dim transition-transform duration-200 shrink-0 ${
                            isExpanded ? 'rotate-180' : ''
                          }`}
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={2}
                          stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                        </svg>
                      </div>
                    </button>
                          {/* Expand arrow */}
                          <svg
                            className={`w-4 h-4 text-vc-dim transition-transform duration-200 shrink-0 ${
                              isExpanded ? 'rotate-180' : ''
                            }`}
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={2}
                            stroke="currentColor"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                          </svg>
                        </div>
                      </button>

                    {/* Expanded detail */}
                    {isExpanded && (
                      <div className="mt-2 ml-2 sm:ml-4">
                        <PassDetail pass={pass} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))
                      {/* Expanded detail */}
                      {isExpanded && (
                        <div className="mt-2 ml-2 sm:ml-4">
                          <PassDetail pass={pass} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}

            {/* Load More Button for UI stability */}
            {filteredPasses.length > displayLimit && (
              <div className="text-center pt-2">
                <button
                  onClick={() => setDisplayLimit((prev) => prev + 30)}
                  className="px-5 py-2.5 rounded-lg bg-vc-card border border-vc-border text-xs font-[family-name:var(--font-mono)] text-vc-accent hover:bg-vc-hover hover:border-vc-accent/30 transition-colors cursor-pointer"
                >
                  Show more passes ({filteredPasses.length - displayLimit} remaining)
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  },
);

export default ForecastList;
