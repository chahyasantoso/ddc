import type { APIRoute } from 'astro';
import { getDb, type CheckpointWithPhotos } from '../../lib/db';

export const GET: APIRoute = async () => {
  try {
    const db = getDb();

    const checkpoints = db
      .prepare(`SELECT * FROM checkpoints ORDER BY created_at ASC`)
      .all() as CheckpointWithPhotos[];

    const photos = db
      .prepare(`SELECT * FROM photos ORDER BY checkpoint_id ASC, "order" ASC`)
      .all() as { id: number; checkpoint_id: number; photo_url: string; caption: string; order: number; created_at: string }[];

    // Group photos by checkpoint
    const photoMap = new Map<number, typeof photos>();
    for (const photo of photos) {
      if (!photoMap.has(photo.checkpoint_id)) {
        photoMap.set(photo.checkpoint_id, []);
      }
      photoMap.get(photo.checkpoint_id)!.push(photo);
    }

    const result = checkpoints.map((cp) => ({
      ...cp,
      photos: photoMap.get(cp.id) ?? [],
    }));

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[GET /api/checkpoints]', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { location_name, lat, lng, description } = body;

    if (!location_name || lat == null || lng == null) {
      return new Response(
        JSON.stringify({ error: 'location_name, lat, and lng are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const db = getDb();
    const result = db
      .prepare(
        `INSERT INTO checkpoints (location_name, lat, lng, description) VALUES (?, ?, ?, ?)`
      )
      .run(location_name, lat, lng, description ?? null);

    const created = db
      .prepare(`SELECT * FROM checkpoints WHERE id = ?`)
      .get(result.lastInsertRowid);

    return new Response(JSON.stringify(created), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[POST /api/checkpoints]', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
