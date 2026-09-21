'use client';

import { useState, useEffect } from 'react';
import type { NowResponse } from '@/lib/types';
import PassDetail from './PassDetail';

interface RightNowCardProps {
  data: NowResponse;
  onScrollToForecast?: () => void;
}

function formatCountdown(diffMs: number): string {
  const diff = Math.max(0, diffMs / 1000);
  if (diff <= 0) return 'any moment now';
  const h = Math.floor(diff / 3600);
  const m = Math.floor((diff % 3600) / 60);
  const s = Math.floor(diff % 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export default function RightNowCard({ data, onScrollToForecast }: RightNowCardProps) {
  const [now, setNow] = useState(Date.now());

  // Tick every second for live countdown
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Something is visible right now
  if (data.visibleNow.length > 0) {
    return (
      <div className="space-y-4">
        <h2 className="font-[family-name:var(--font-heading)] text-2xl font-bold text-vc-text">
          Right now
        </h2>
        {data.visibleNow.map((pass) => (
          <PassDetail key={`${pass.noradId}-${pass.startTime}`} pass={pass} isLive />
        ))}
      </div>
    );
  }

  // Nothing visible right now
  const nextPassMs = data.nextPass
    ? new Date(data.nextPass.startTime).getTime() - now
    : null;

  return (
    <div className="rounded-xl bg-vc-card border border-vc-border p-6 text-center space-y-3">
      <h2 className="font-[family-name:var(--font-heading)] text-2xl font-bold text-vc-text">
        Right now
      </h2>
      <div className="w-12 h-12 mx-auto rounded-full bg-vc-bg border border-vc-border flex items-center justify-center">
        <svg className="w-6 h-6 text-vc-dim" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z" />
        </svg>
      </div>
      <p className="text-vc-muted">
        Nothing visible overhead right now.
      </p>
      {data.nextPass && nextPassMs !== null ? (
        <p className="text-vc-text">
          Next pass:{' '}
          <span className="inline-flex items-center gap-1.5 text-vc-accent font-[family-name:var(--font-mono)] font-semibold">
            <span>
              {data.nextPass.category === 'starlink'
                ? '🛰️'
                : data.nextPass.category === 'station'
                ? '🛸'
                : '🔭'}
            </span>
            <span>{data.nextPass.objectName}</span>
          </span>
          {' '}in{' '}
          <span className="text-vc-accent font-[family-name:var(--font-mono)] font-semibold">
            {formatCountdown(nextPassMs)}
          </span>
          {onScrollToForecast && (
            <button
              onClick={onScrollToForecast}
              className="ml-2 text-vc-accent underline underline-offset-2 hover:text-vc-text transition-colors cursor-pointer"
            >
              View in forecast →
            </button>
          )}
        </p>
      ) : (
        <p className="text-vc-dim text-sm">
          No passes expected in the next 24 hours.
        </p>
      )}
    </div>
  );
}
