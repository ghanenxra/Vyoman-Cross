'use client';

import { useState, useEffect, useRef } from 'react';
import type { TleRecord, ObserverLocation } from '@/lib/types';

export interface LivePositionData {
  lat: number;
  lng: number;
  alt: number;
  velocity: number;
  azimuthDeg: number;
  elevationDeg: number;
  rangeKm: number;
}

/**
 * Hook that computes satellite position in real-time (every second).
 * Runs satellite.js propagation on the client side for minimal latency.
 */
export function useLivePosition(
  tle: TleRecord | null,
  observer: ObserverLocation | null,
): LivePositionData | null {
  const [position, setPosition] = useState<LivePositionData | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const satRef = useRef<any>(null);

  useEffect(() => {
    import('satellite.js').then((mod) => {
      satRef.current = mod;
    });
  }, []);

  useEffect(() => {
    if (!tle || !observer) return;

    const compute = () => {
      const sat = satRef.current;
      if (!sat) return;

      try {
        const satrec = sat.twoline2satrec(tle.line1, tle.line2);
        const now = new Date();
        const result = sat.propagate(satrec, now);
        if (typeof result.position === 'boolean' || !result.position) return;

        const posEci = result.position;
        const velEci = result.velocity;
        const gmst = sat.gstime(now);
        const posGd = sat.eciToGeodetic(posEci, gmst);
        const RAD2DEG = 180 / Math.PI;

        const observerGd = {
          latitude: sat.degreesToRadians(observer.latitude),
          longitude: sat.degreesToRadians(observer.longitude),
          height: (observer.elevationMeters ?? 0) / 1000,
        };
        const posEcf = sat.eciToEcf(posEci, gmst);
        const lookAngles = sat.ecfToLookAngles(observerGd, posEcf);

        setPosition({
          lat: posGd.latitude * RAD2DEG,
          lng: posGd.longitude * RAD2DEG,
          alt: posGd.height,
          velocity:
            velEci && typeof velEci !== 'boolean'
              ? Math.hypot(velEci.x, velEci.y, velEci.z)
              : 0,
          azimuthDeg: lookAngles.azimuth * RAD2DEG,
          elevationDeg: lookAngles.elevation * RAD2DEG,
          rangeKm: lookAngles.rangeSat,
        });
      } catch {
        // Propagation error — ignore
      }
    };

    compute();
    const interval = setInterval(compute, 1000);
    return () => clearInterval(interval);
  }, [tle, observer]);

  return position;
}
