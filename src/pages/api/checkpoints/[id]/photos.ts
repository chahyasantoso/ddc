import type { APIRoute } from 'astro';
import type { Photo } from '../../../../lib/db';
import { env } from 'cloudflare:workers';
import { getStorageProvider } from '../../../../lib/storage';
export const POST: APIRoute = async ({ request, params, locals }) => {
  try {
    const checkpointId = Number(params.id);
    if (isNaN(checkpointId)) {
      return new Response(JSON.stringify({ error: 'Invalid checkpoint id' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const db = env.DB;
    
    // Fallback for local development if Cloudflare env variables aren't injected properly yet, though platformProxy handles this in dev.
    if (!db) {
      throw new Error("Database binding not found");
    }

    const checkpoint = await db
      .prepare(`SELECT id FROM checkpoints WHERE id = ?`)
      .bind(checkpointId)
      .first();

    if (!checkpoint) {
      return new Response(JSON.stringify({ error: 'Checkpoint not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const formData = await request.formData();
    const file = formData.get('photo') as File | null;
    const caption = formData.get('caption') as string ?? '';
    const orderRaw = formData.get('order');
    const order = orderRaw != null ? Number(orderRaw) : 0;

    if (!file) {
      return new Response(JSON.stringify({ error: 'photo file is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const storage = getStorageProvider(env);
    const photoUrl = await storage.uploadPhoto(file, checkpointId.toString());

    await db
      .prepare(
        `INSERT INTO photos (checkpoint_id, photo_url, caption, "order") VALUES (?, ?, ?, ?)`
      )
      .bind(checkpointId, photoUrl, caption, order)
      .run();

    const created = await db
      .prepare(`SELECT * FROM photos ORDER BY id DESC LIMIT 1`)
      .first<Photo>();

    return new Response(JSON.stringify(created), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[POST /api/checkpoints/:id/photos]', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
