/**
 * Vyoman Cross — Smart Coordinate & Location Parser
 * Parses multiple coordinate formats from a single input field:
 *  - Decimal:    "28.6139, 77.2090" or "28.6139 77.2090"
 *  - DMS:        "39°03'38.35"N 125°45'27.34"E"
 *  - Google Maps coordinates (copy-paste)
 *  - Preset Cities (Kota, Delhi, Mumbai, London, New York, Tokyo, etc.)
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

  // Strategy 1: Decimal pair — "28.6139, 77.2090" or "28.6139 77.2090" or "28.6139,-77.2090"
  const decimalRegex = /^(-?\d+\.?\d*)\s*[,/\s]\s*(-?\d+\.?\d*)$/;
  const decimalMatch = trimmed.match(decimalRegex);
  if (decimalMatch) {
    const lat = parseFloat(decimalMatch[1]);
    const lng = parseFloat(decimalMatch[2]);
    if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return { latitude: lat, longitude: lng };
    }
  }

  // Strategy 2: Full DMS pair — "39°03'38.35"N 125°45'27.34"E"
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

export interface CityPreset {
  name: string;
  country: string;
  lat: number;
  lng: number;
}

export const PRESET_CITIES: CityPreset[] = [
  { name: 'Kota', country: 'India', lat: 25.18, lng: 75.83 },
  { name: 'New Delhi', country: 'India', lat: 28.6139, lng: 77.2090 },
  { name: 'Mumbai', country: 'India', lat: 19.0760, lng: 72.8777 },
  { name: 'Bengaluru', country: 'India', lat: 12.9716, lng: 77.5946 },
  { name: 'Hyderabad', country: 'India', lat: 17.3850, lng: 78.4867 },
  { name: 'Chennai', country: 'India', lat: 13.0827, lng: 80.2707 },
  { name: 'Kolkata', country: 'India', lat: 22.5726, lng: 88.3639 },
  { name: 'Jaipur', country: 'India', lat: 26.9124, lng: 75.7873 },
  { name: 'Ahmedabad', country: 'India', lat: 23.0225, lng: 72.5714 },
  { name: 'Pune', country: 'India', lat: 18.5204, lng: 73.8567 },
  { name: 'London', country: 'UK', lat: 51.5074, lng: -0.1278 },
  { name: 'New York', country: 'USA', lat: 40.7128, lng: -74.0060 },
  { name: 'Los Angeles', country: 'USA', lat: 34.0522, lng: -118.2437 },
  { name: 'San Francisco', country: 'USA', lat: 37.7749, lng: -122.4194 },
  { name: 'Tokyo', country: 'Japan', lat: 35.6762, lng: 139.6503 },
  { name: 'Paris', country: 'France', lat: 48.8566, lng: 2.3522 },
  { name: 'Berlin', country: 'Germany', lat: 52.5200, lng: 13.4050 },
  { name: 'Sydney', country: 'Australia', lat: -33.8688, lng: 151.2093 },
  { name: 'Dubai', country: 'UAE', lat: 25.2048, lng: 55.2708 },
  { name: 'Singapore', country: 'Singapore', lat: 1.3521, lng: 103.8198 },
  { name: 'Toronto', country: 'Canada', lat: 43.6532, lng: -79.3832 },
];

export function resolveLocationQuery(
  input: string,
): { location: ObserverLocation; name: string } | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // 1. Check coordinates first
  const coords = parseCoordinates(trimmed);
  if (coords) {
    const latStr = `${Math.abs(coords.latitude).toFixed(4)}°${coords.latitude >= 0 ? 'N' : 'S'}`;
    const lngStr = `${Math.abs(coords.longitude).toFixed(4)}°${coords.longitude >= 0 ? 'E' : 'W'}`;
    return {
      location: coords,
      name: `${latStr}, ${lngStr}`,
    };
  }

  // 2. Check preset cities
  const query = trimmed.toLowerCase();
  const matched = PRESET_CITIES.find(
    (c) =>
      c.name.toLowerCase() === query ||
      `${c.name}, ${c.country}`.toLowerCase() === query ||
      c.name.toLowerCase().startsWith(query),
  );
  if (matched) {
    return {
      location: { latitude: matched.lat, longitude: matched.lng },
      name: `${matched.name}, ${matched.country}`,
    };
  }

  return null;
}
