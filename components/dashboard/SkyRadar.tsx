'use client';

import { useMemo } from 'react';
import type { VisiblePass, ObserverLocation, TleRecord } from '@/lib/types';
import { computeObserverTelemetry } from '@/lib/globe-utils';
import { Compass } from 'lucide-react';

interface SkyRadarProps {
  pass: VisiblePass | null;
  selectedSat: TleRecord | null;
  observerLocation: ObserverLocation;
}

export default function SkyRadar({
  pass,
  selectedSat,
  observerLocation,
}: SkyRadarProps) {
  // Center is (120, 120), max radius is 90
  const cx = 120;
  const cy = 120;
  const radius = 95;

  // Convert (azimuthDeg, elevationDeg) to radar (x, y)
  // Azimuth: 0° is North (top), 90° East (right), 180° South (bottom), 270° West (left)
  // Elevation: 0° is edge (radius), 90° is center (0)
  const polarToXY = (azimuthDeg: number, elevationDeg: number): [number, number] => {
    const clampedEl = Math.max(0, Math.min(90, elevationDeg));
    const r = radius * ((90 - clampedEl) / 90);
    const rad = ((azimuthDeg - 90) * Math.PI) / 180;
    return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
  };

  // Compute pass trajectory arc path
  const trajectoryPath = useMemo(() => {
    if (!pass) return '';
    const startPt = polarToXY(pass.startAzimuthDeg, 10);
    const peakPt = polarToXY(pass.peakAzimuthDeg, pass.peakElevationDeg);
    const endPt = polarToXY(pass.endAzimuthDeg, 10);

    // Quadratic curve passing through start, peak, and end
    return `M ${startPt[0]} ${startPt[1]} Q ${peakPt[0]} ${peakPt[1]} ${endPt[0]} ${endPt[1]}`;
  }, [pass]);

  // Current satellite live position on radar if available
  const liveTelemetry = useMemo(() => {
    if (!selectedSat) return null;
    return computeObserverTelemetry(selectedSat, observerLocation, new Date());
  }, [selectedSat, observerLocation]);

  const livePt = useMemo(() => {
    if (!liveTelemetry) return null;
    if (liveTelemetry.elevationDeg < 0) return null;
    return polarToXY(liveTelemetry.azimuthDeg, liveTelemetry.elevationDeg);
  }, [liveTelemetry]);

  return (
    <div className="w-full h-full bg-[#0b1222]/90 backdrop-blur-md rounded-2xl border border-white/10 p-4 flex flex-col shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Compass className="w-4 h-4 text-cyan-400" />
          <h3 className="text-sm font-bold font-mono text-white tracking-tight">
            SKY VIEW POLAR RADAR
          </h3>
        </div>
        <span className="text-[10px] font-mono text-cyan-400">
          {pass ? `${pass.objectName}` : 'Horizon Plot'}
        </span>
      </div>

      {/* SVG Polar Radar */}
      <div className="flex-1 flex items-center justify-center p-2">
        <svg
          viewBox="0 0 240 240"
          className="w-full max-w-[210px] aspect-square overflow-visible"
        >
          {/* Background circle */}
          <circle cx={cx} cy={cy} r={radius} fill="#070c18" stroke="rgba(56, 189, 248, 0.25)" strokeWidth="1.5" />

          {/* Elevation Rings: 30° and 60° */}
          <circle
            cx={cx}
            cy={cy}
            r={radius * (60 / 90)}
            fill="none"
            stroke="rgba(56, 189, 248, 0.12)"
            strokeDasharray="3 3"
          />
          <circle
            cx={cx}
            cy={cy}
            r={radius * (30 / 90)}
            fill="none"
            stroke="rgba(56, 189, 248, 0.12)"
            strokeDasharray="3 3"
          />

          {/* Crosshairs */}
          <line x1={cx - radius} y1={cy} x2={cx + radius} y2={cy} stroke="rgba(56, 189, 248, 0.18)" strokeWidth="1" />
          <line x1={cx} y1={cy - radius} x2={cx} y2={cy + radius} stroke="rgba(56, 189, 248, 0.18)" strokeWidth="1" />

          {/* Cardinal Directions */}
          <text x={cx} y={cy - radius - 6} textAnchor="middle" fill="#38bdf8" fontSize="10" fontFamily="monospace" fontWeight="bold">
            N
          </text>
          <text x={cx + radius + 8} y={cy + 3} textAnchor="middle" fill="#94a3b8" fontSize="9" fontFamily="monospace">
            E
          </text>
          <text x={cx} y={cy + radius + 12} textAnchor="middle" fill="#94a3b8" fontSize="9" fontFamily="monospace">
            S
          </text>
          <text x={cx - radius - 8} y={cy + 3} textAnchor="middle" fill="#94a3b8" fontSize="9" fontFamily="monospace">
            W
          </text>

          {/* Ring Labels */}
          <text x={cx + 3} y={cy - radius * (30 / 90) + 3} fill="rgba(148, 163, 184, 0.6)" fontSize="7" fontFamily="monospace">
            60°
          </text>
          <text x={cx + 3} y={cy - radius * (60 / 90) + 3} fill="rgba(148, 163, 184, 0.6)" fontSize="7" fontFamily="monospace">
            30°
          </text>
          <text x={cx + 3} y={cy - 4} fill="#38bdf8" fontSize="7" fontFamily="monospace">
            Zenith
          </text>

          {/* Pass Trajectory Arc */}
          {trajectoryPath && (
            <>
              <path
                d={trajectoryPath}
                fill="none"
                stroke="#00f0ff"
                strokeWidth="2.5"
                strokeLinecap="round"
                className="drop-shadow-[0_0_8px_rgba(0,240,255,0.7)]"
              />
              {/* Peak Elevation Marker */}
              {pass && (
                (() => {
                  const peak = polarToXY(pass.peakAzimuthDeg, pass.peakElevationDeg);
                  return (
                    <g>
                      <circle cx={peak[0]} cy={peak[1]} r="4" fill="#34d399" />
                      <circle cx={peak[0]} cy={peak[1]} r="7" fill="none" stroke="#34d399" strokeWidth="1" strokeDasharray="2 2" />
                    </g>
                  );
                })()
              )}
            </>
          )}

          {/* Live Position Marker (when satellite is in the sky above horizon) */}
          {livePt && (
            <g>
              <circle cx={livePt[0]} cy={livePt[1]} r="5" fill="#f43f5e" className="animate-ping" />
              <circle cx={livePt[0]} cy={livePt[1]} r="4" fill="#f43f5e" />
              <text x={livePt[0] + 8} y={livePt[1] + 3} fill="#f43f5e" fontSize="8" fontFamily="monospace" fontWeight="bold">
                LIVE
              </text>
            </g>
          )}
        </svg>
      </div>

      {/* Footer Info */}
      <div className="flex items-center justify-between text-[10px] font-mono text-gray-400 border-t border-white/10 pt-2">
        <span>Azimuth: 0° (N) to 360°</span>
        <span className="text-cyan-300">
          {liveTelemetry && liveTelemetry.elevationDeg > 0
            ? `Above Horizon: +${liveTelemetry.elevationDeg.toFixed(1)}°`
            : 'Below Horizon'}
        </span>
      </div>
    </div>
  );
}
