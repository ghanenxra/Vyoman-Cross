'use client';

import type { VisiblePass } from '@/lib/types';
import { Calendar } from 'lucide-react';

interface PassTimelineProps {
  passes: VisiblePass[];
  selectedNoradId?: number;
  onSelectPass: (pass: VisiblePass) => void;
}

export default function PassTimeline({
  passes,
  selectedNoradId,
  onSelectPass,
}: PassTimelineProps) {
  // Sort and pick the first 6 passes
  const upcomingPasses = [...passes]
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
    .slice(0, 6);

  const formatHour = (iso: string) => {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  const getElevationColor = (el: number) => {
    if (el >= 60) return 'from-emerald-500 to-teal-400';
    if (el >= 35) return 'from-cyan-500 to-blue-500';
    return 'from-blue-600 to-slate-500';
  };

  return (
    <div className="w-full h-full bg-[#0b1222]/90 backdrop-blur-md rounded-2xl border border-white/10 p-4 flex flex-col shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-emerald-400" />
          <h3 className="text-sm font-bold font-mono text-white tracking-tight">
            PASS TIMELINE & ELEVATION
          </h3>
        </div>
        <span className="text-[10px] font-mono text-gray-400">Peak Angle (0°-90°)</span>
      </div>

      {/* Timeline Bars */}
      <div className="flex-1 overflow-y-auto space-y-2.5 mt-2 max-h-[220px] pr-1">
        {upcomingPasses.length === 0 ? (
          <div className="p-6 text-center text-gray-400 font-mono text-xs">
            No upcoming passes detected.
          </div>
        ) : (
          upcomingPasses.map((pass, idx) => {
            const isSelected = pass.noradId === selectedNoradId;
            const percentage = Math.min(100, Math.max(12, (pass.peakElevationDeg / 90) * 100));

            return (
              <div
                key={`timeline-${pass.noradId}-${idx}`}
                onClick={() => onSelectPass(pass)}
                className={`p-2 rounded-xl transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-cyan-500/15 border border-cyan-500/30'
                    : 'hover:bg-white/5 border border-transparent'
                }`}
              >
                {/* Info row */}
                <div className="flex items-center justify-between text-xs font-mono mb-1">
                  <span className="font-bold text-white truncate max-w-[130px]">
                    {pass.objectName}
                  </span>
                  <div className="flex items-center gap-2 text-[11px]">
                    <span className="text-gray-400">{formatHour(pass.startTime)}</span>
                    <span className="font-bold text-cyan-300">{pass.peakElevationDeg}°</span>
                  </div>
                </div>

                {/* Progress bar representing elevation */}
                <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden flex">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${getElevationColor(
                      pass.peakElevationDeg,
                    )} transition-all duration-500`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>

                {/* Direction and duration */}
                <div className="flex items-center justify-between text-[10px] font-mono text-gray-400 mt-1">
                  <span>Dir: {pass.compassDirection}</span>
                  <span>{Math.round(pass.durationSeconds / 60)} min duration</span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
