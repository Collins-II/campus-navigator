import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/database';
import Room from '@/lib/database/models/Room';

// GET: Fetch all rooms / locations with optional search and building filter
export async function GET(req: Request) {
  //const auth = await authorizeAdmin();
  //if (!auth.authorized) return auth.response;

  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const query = (searchParams.get('query') || '').slice(0, 80).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const category = searchParams.get('category') || 'all';

    const filter: Record<string, unknown> = {};

    if (query) {
      filter.$or = [
        { name: { $regex: query, $options: 'i' } },
        { building: { $regex: query, $options: 'i' } },
        { code: { $regex: query, $options: 'i' } },
      ];
    }

    if (category !== 'all') {
      filter.category = category;
    }

    const locations = await Room.find(filter).sort({ building: 1, name: 1 }).lean();

    return NextResponse.json(
      { success: true, data: locations },
      { headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=120' } }
    );
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to load locations" }, { status: 500 });
  }
}