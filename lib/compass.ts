/**
 * Convert azimuth in degrees (0-360, 0=N, 90=E) to a compass direction string.
 * @param deg - Azimuth in degrees
 * @param points - 16 for full resolution, 8 for compact display
 */
export function azimuthToCompass(deg: number, points: 8 | 16 = 16): string {
  if (points === 8) {
    const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    return dirs[Math.round(((deg % 360) + 360) % 360 / 45) % 8];
  }
  const dirs = [
    'N', 'NNE', 'NE', 'ENE',
    'E', 'ESE', 'SE', 'SSE',
    'S', 'SSW', 'SW', 'WSW',
    'W', 'WNW', 'NW', 'NNW',
  ];
  return dirs[Math.round(((deg % 360) + 360) % 360 / 22.5) % 16];
}
