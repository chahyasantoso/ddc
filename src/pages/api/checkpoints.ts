import type { APIRoute } from 'astro';
import type { Checkpoint, CheckpointWithPhotos, Photo } from '../../lib/db';
import { env } from 'cloudflare:workers';
import { getDB } from '../../lib/db-client';

export const GET: APIRoute = async () => {
  try {
    const db = await getDB(env);

    const { results: checkpoints } = await db
      .prepare(`SELECT * FROM checkpoints ORDER BY created_at ASC`)
      .all<Checkpoint>();

    const { results: photos } = await db
      .prepare(`SELECT * FROM photos ORDER BY checkpoint_id ASC, "order" ASC`)
      .all<Photo>();

    // Group photos by checkpoint
    const photoMap = new Map<number, Photo[]>();
    for (const photo of photos) {
      if (!photoMap.has(photo.checkpoint_id)) {
        photoMap.set(photo.checkpoint_id, []);
      }
      photoMap.get(photo.checkpoint_id)!.push(photo);
    }

    const result: CheckpointWithPhotos[] = checkpoints.map((cp) => ({
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
    const body = (await request.json()) as any;
    const { location_name, lat, lng, description } = body;

    if (!location_name || lat == null || lng == null) {
      return new Response(
        JSON.stringify({ error: 'location_name, lat, and lng are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const db = await getDB(env);
    await db
      .prepare(
        `INSERT INTO checkpoints (location_name, lat, lng, description) VALUES (?, ?, ?, ?)`
      )
      .bind(location_name, lat, lng, description ?? null)
      .run();

    const created = await db
      .prepare(`SELECT * FROM checkpoints ORDER BY id DESC LIMIT 1`)
      .first<Checkpoint>();

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
