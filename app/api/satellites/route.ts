import { NextRequest, NextResponse } from 'next/server';
import { getAllCachedTles } from '@/lib/tle-cache';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = (searchParams.get('q') || '').trim().toLowerCase();
    const category = searchParams.get('category');

    let satellites = getAllCachedTles();

    if (category && category !== 'all') {
      satellites = satellites.filter((sat) => sat.category === category);
    }

    if (query) {
      satellites = satellites.filter((sat) => {
        const nameMatch = sat.name.toLowerCase().includes(query);
        const noradMatch = sat.noradId.toString().includes(query);
        return nameMatch || noradMatch;
      });
    }

    // Return sanitized satellite records
    const result = satellites.map((sat) => ({
      noradId: sat.noradId,
      name: sat.name,
      category: sat.category || 'other',
      line1: sat.line1,
      line2: sat.line2,
      fetchedAt: sat.fetchedAt,
    }));

    return NextResponse.json(
      {
        total: result.length,
        satellites: result,
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        },
      },
    );
  } catch (error) {
    console.error('[api/satellites] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch satellites list' },
      { status: 500 },
    );
  }
}

