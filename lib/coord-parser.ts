/**
 * Vyoman Cross — Smart Coordinate Parser
 * Parses multiple coordinate formats from a single input field:
 *  - Decimal:    "28.6139, 77.2090"
 *  - DMS:        "39°03'38.35"N 125°45'27.34"E"
 *  - Google Maps: both formats above (copy-paste)
 */

import type { ObserverLocation } from './types';

function parseDMSComponent(dms: string): number | null {
  // Match: 39°03'38.35"N  or  125°45'27.34"E  or  -39°03'38.35"
  const regex = /(-?\d+)\s*[°]\s*(\d+)\s*[′']\s*([\d.]+)\s*[″"]\s*([NSEWnsew])?/;
  const match = dms.trim().match(regex);
  if (!match) return null;

  const degrees = parseFloat(match[1]);
  const minutes = parseFloat(match[2]);
  const seconds = parseFloat(match[3]);
  const direction = match[4]?.toUpperCase();

  let decimal = Math.abs(degrees) + minutes / 60 + seconds / 3600;

  if (direction === 'S' || direction === 'W' || degrees < 0) {
    decimal = -decimal;
  }

  return decimal;
}

export function parseCoordinates(input: string): ObserverLocation | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Strategy 1: Decimal pair — "28.6139, 77.2090" or "28.6139 77.2090"
  const decimalRegex = /^(-?\d+\.?\d*)\s*[,\s]\s*(-?\d+\.?\d*)$/;
  const decimalMatch = trimmed.match(decimalRegex);
  if (decimalMatch) {
    const lat = parseFloat(decimalMatch[1]);
    const lng = parseFloat(decimalMatch[2]);
    if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return { latitude: lat, longitude: lng };
    }
  }

  // Strategy 2: Full DMS pair — "39°03'38.35"N 125°45'27.34"E"
  // Split on whitespace between two DMS components
  const dmsFullRegex =
    /(-?\d+\s*°\s*\d+\s*[′']\s*[\d.]+\s*[″"]\s*[NSns]?)\s*[,\s]\s*(-?\d+\s*°\s*\d+\s*[′']\s*[\d.]+\s*[″"]\s*[EWew]?)/;
  const dmsMatch = trimmed.match(dmsFullRegex);
  if (dmsMatch) {
    const lat = parseDMSComponent(dmsMatch[1]);
    const lng = parseDMSComponent(dmsMatch[2]);
    if (
      lat !== null &&
      lng !== null &&
      lat >= -90 &&
      lat <= 90 &&
      lng >= -180 &&
      lng <= 180
    ) {
      return { latitude: lat, longitude: lng };
    }
  }

  // Strategy 3: Comma-separated DMS — "39°03'38.35"N, 125°45'27.34"E"
  const commaParts = trimmed.split(/,\s*/);
  if (commaParts.length === 2) {
    const lat = parseDMSComponent(commaParts[0]);
    const lng = parseDMSComponent(commaParts[1]);
    if (
      lat !== null &&
      lng !== null &&
      lat >= -90 &&
      lat <= 90 &&
      lng >= -180 &&
      lng <= 180
    ) {
      return { latitude: lat, longitude: lng };
    }
  }

  return null;
}
