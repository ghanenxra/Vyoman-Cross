import type { VisiblePass } from './types';

type BrightnessLabel = VisiblePass['brightnessLabel'];

interface BrightnessEstimate {
  magnitude: number | null;
  brightnessLabel: BrightnessLabel;
}

/**
 * Estimate brightness from peak elevation and slant range.
 * This is a rough heuristic — not a real photometric model.
 *
 * General idea:
 *  - Higher elevation + closer range ⇒ brighter
 *  - ISS at zenith is roughly mag -3 to -4
 *  - Typical Starlink train shortly after launch: mag 1–3
 *  - Hubble at best: mag 1–2
 */
export function estimateBrightness(
  peakElevationDeg: number,
  rangeKm: number,
  category: 'station' | 'telescope' | 'starlink' | 'other' = 'other',
): BrightnessEstimate {
  // Base magnitude estimate from range (closer = brighter)
  let mag: number;

  if (category === 'station') {
    // ISS / Tiangong — large, very reflective
    if (rangeKm < 600 && peakElevationDeg > 50) mag = -3.5;
    else if (rangeKm < 800 && peakElevationDeg > 30) mag = -2.5;
    else if (rangeKm < 1200 && peakElevationDeg > 15) mag = -1.0;
    else mag = 0.5;
  } else if (category === 'starlink') {
    // Recently launched Starlink — moderately bright
    if (rangeKm < 600 && peakElevationDeg > 40) mag = 1.0;
    else if (rangeKm < 1000) mag = 2.5;
    else mag = 4.0;
  } else {
    // Hubble, other — smaller objects
    if (rangeKm < 700 && peakElevationDeg > 40) mag = 1.5;
    else if (rangeKm < 1000) mag = 3.0;
    else mag = 4.5;
  }

  const label = magToLabel(mag);
  return { magnitude: Math.round(mag * 10) / 10, brightnessLabel: label };
}

function magToLabel(mag: number): BrightnessLabel {
  if (mag <= -2) return 'very bright';
  if (mag <= 0) return 'bright';
  if (mag <= 3) return 'moderate';
  if (mag <= 5) return 'faint';
  return 'unknown';
}
