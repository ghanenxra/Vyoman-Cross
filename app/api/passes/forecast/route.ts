import { NextRequest, NextResponse } from 'next/server';
import { ensureCachePopulated } from '@/lib/tle-cache';
import { findForecastPasses } from '@/lib/pass-finder';
import type { ForecastResponse, ObserverLocation } from '@/lib/types';

// Simple in-memory cache for forecast responses
const forecastCache = new Map<string, { data: ForecastResponse; cachedAt: number }>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

function makeCacheKey(lat: number, lng: number, days: number): string {
  // Round to 2 decimal places (~1km precision) so nearby users share cache
  const rlat = Math.round(lat * 100) / 100;
  const rlng = Math.round(lng * 100) / 100;
  const day = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  return `${rlat},${rlng},${days},${day}`;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const latStr = searchParams.get('lat');
  const lngStr = searchParams.get('lng');
  const daysStr = searchParams.get('days') || '7';

  // Validate inputs
  if (!latStr || !lngStr) {
    return NextResponse.json(
      { error: 'Missing required parameters: lat, lng' },
      { status: 400 },
    );
  }

  const lat = parseFloat(latStr);
  const lng = parseFloat(lngStr);
  const days = parseInt(daysStr, 10);

  if (isNaN(lat) || isNaN(lng)) {
    return NextResponse.json(
      { error: 'lat and lng must be valid numbers' },
      { status: 400 },
    );
  }

  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return NextResponse.json(
      { error: 'lat must be -90..90, lng must be -180..180' },
      { status: 400 },
    );
  }

  if (isNaN(days) || days < 1 || days > 14) {
    return NextResponse.json(
      { error: 'days must be 1..14' },
      { status: 400 },
    );
  }

  // Check cache
  const cacheKey = makeCacheKey(lat, lng, days);
  const cached = forecastCache.get(cacheKey);
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
    return NextResponse.json(cached.data, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=1800',
        'X-Cache': 'HIT',
      },
    });
  }

  const observer: ObserverLocation = { latitude: lat, longitude: lng };

  // Ensure TLE cache is populated
  await ensureCachePopulated();

  // Compute forecast
  const passes = findForecastPasses(observer, days);
  const response: ForecastResponse = { passes };

  // Store in cache
  forecastCache.set(cacheKey, { data: response, cachedAt: Date.now() });

  return NextResponse.json(response, {
    headers: {
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=1800',
      'X-Cache': 'MISS',
    },
  });
}
