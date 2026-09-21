'use client';

import { useState } from 'react';
import type { VisiblePass } from '@/lib/types';
import { Satellite, ArrowUpRight } from 'lucide-react';

interface PassesTableProps {
  passes: VisiblePass[];
  selectedNoradId?: number;
  onSelectPass: (pass: VisiblePass) => void;
}

export default function PassesTable({
  passes,
  selectedNoradId,
  onSelectPass,
}: PassesTableProps) {
  const [filter, setFilter] = useState<'all' | 'station' | 'starlink' | 'bright'>('all');

  const filteredPasses = passes.filter((p) => {
    if (filter === 'station') return p.category === 'station';
    if (filter === 'starlink') return p.category === 'starlink';
    if (filter === 'bright') return (p.magnitude !== null && p.magnitude <= 2.5) || p.peakElevationDeg >= 40;
    return true;
  });

  const formatTime = (isoString: string) => {
    const d = new Date(isoString);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  const formatDate = (isoString: string) => {
    const d = new Date(isoString);
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <div className="w-full h-full bg-[#0b1222]/90 backdrop-blur-md rounded-2xl border border-white/10 p-4 flex flex-col shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-white/10 gap-2">
        <div className="flex items-center gap-2">
          <Satellite className="w-4 h-4 text-cyan-400" />
          <h3 className="text-sm font-bold font-mono text-white tracking-tight">
            VISIBLE PASSES (24H)
          </h3>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
            {filteredPasses.length} passes
          </span>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1 text-[11px] font-mono">
          {(['all', 'station', 'starlink', 'bright'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-2 py-0.5 rounded-lg transition-colors capitalize ${
                filter === tab
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-semibold'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              {tab === 'all' ? 'All' : tab === 'station' ? 'Stations' : tab === 'bright' ? '★ Bright' : 'Starlink'}
            </button>
          ))}
        </div>
      </div>

      {/* Passes List Table */}
      <div className="flex-1 overflow-y-auto divide-y divide-white/5 pr-1 mt-1 max-h-[220px]">
        {filteredPasses.length === 0 ? (
          <div className="p-6 text-center text-gray-400 font-mono text-xs">
            No visible passes in this category for the next 24 hours.
          </div>
        ) : (
          filteredPasses.map((pass, index) => {
            const isSelected = pass.noradId === selectedNoradId;
            return (
              <div
                key={`${pass.noradId}-${pass.startTime}-${index}`}
                onClick={() => onSelectPass(pass)}
                className={`py-2 px-2.5 rounded-xl flex items-center justify-between cursor-pointer transition-colors group ${
                  isSelected
                    ? 'bg-cyan-500/15 border border-cyan-500/30'
                    : 'hover:bg-white/5 border border-transparent'
                }`}
              >
                {/* Satellite Name & Category */}
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      pass.category === 'station'
                        ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50'
                        : pass.category === 'telescope'
                        ? 'bg-purple-400'
                        : 'bg-cyan-400'
                    }`}
                  />
                  <div>
                    <div className="text-xs font-bold text-white font-mono flex items-center gap-1.5 group-hover:text-cyan-300 transition-colors">
                      <span>{pass.objectName}</span>
                      {pass.isTrain && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30">
                          TRAIN
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] font-mono text-gray-400 flex items-center gap-2">
                      <span>
                        {formatDate(pass.startTime)} at {formatTime(pass.startTime)}
                      </span>
                      <span>•</span>
                      <span>Heading: {pass.compassDirection}</span>
                    </div>
                  </div>
                </div>

                {/* Elevation & Action */}
                <div className="flex items-center gap-3 text-right">
                  <div>
                    <div className="text-xs font-mono font-bold text-cyan-300">
                      {pass.peakElevationDeg}° max
                    </div>
                    <div className="text-[10px] font-mono text-emerald-400">
                      {pass.magnitude !== null ? `${pass.magnitude.toFixed(1)} mag` : 'Bright'}
                    </div>
                  </div>
                  <ArrowUpRight className="w-3.5 h-3.5 text-gray-500 group-hover:text-cyan-400 transition-colors" />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
