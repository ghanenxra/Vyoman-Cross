import { NextRequest, NextResponse } from 'next/server';
import { ensureCachePopulated } from '@/lib/tle-cache';
import { findCurrentPasses, findNextPass } from '@/lib/pass-finder';
import type { NowResponse, ObserverLocation } from '@/lib/types';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const latStr = searchParams.get('lat');
  const lngStr = searchParams.get('lng');

  // Validate inputs
  if (!latStr || !lngStr) {
    return NextResponse.json(
      { error: 'Missing required parameters: lat, lng' },
      { status: 400 },
    );
  }

  const lat = parseFloat(latStr);
  const lng = parseFloat(lngStr);

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

  const observer: ObserverLocation = { latitude: lat, longitude: lng };

  // Ensure TLE cache is populated
  await ensureCachePopulated();

  // Find currently visible passes
  const visibleNow = findCurrentPasses(observer);

  // Find next upcoming pass (if nothing visible now)
  const nextPass = visibleNow.length === 0 ? findNextPass(observer) : null;

  const response: NowResponse = { visibleNow, nextPass };

  return NextResponse.json(response, {
    headers: {
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30',
    },
  });
}
