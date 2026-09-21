import { NextRequest, NextResponse } from 'next/server';
import { refreshAllTles } from '@/lib/tle-cache';

/**
 * POST /api/tle/refresh
 * Triggered by Vercel Cron every 4 hours.
 * Refreshes all cached TLEs from CelesTrak.
 */
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  // Optional: verify cron secret for security
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await refreshAllTles();
    return NextResponse.json({
      success: true,
      ...result,
      refreshedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[tle/refresh] Error:', error);
    return NextResponse.json(
      { error: 'Failed to refresh TLEs' },
      { status: 500 },
    );
  }
}

// Also support GET for Vercel Cron (which sends GET requests)
export async function GET(request: NextRequest) {
  return POST(request);
}
