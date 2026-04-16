import type { APIRoute } from 'astro';
import type { Photo } from '../../../lib/db';
import { env } from 'cloudflare:workers';
import { getStorageProvider } from '../../../lib/storage';
import { getDB } from '../../../lib/db-client';

export const DELETE: APIRoute = async ({ params }) => {
  try {
    const id = Number(params.id);
    if (isNaN(id)) {
      return new Response(JSON.stringify({ error: 'Invalid id' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const db = await getDB(env);
    const photo = await db
      .prepare(`SELECT * FROM photos WHERE id = ?`)
      .bind(id)
      .first<Photo>();

    if (!photo) {
      return new Response(JSON.stringify({ error: 'Photo not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!photo.photo_url.includes('/seed/')) {
      const storage = getStorageProvider(env);
      await storage.deletePhoto(photo.photo_url);
    }

    await db.prepare(`DELETE FROM photos WHERE id = ?`).bind(id).run();

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[DELETE /api/photos/:id]', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const PATCH: APIRoute = async ({ request, params }) => {
  try {
    const id = Number(params.id);
    if (isNaN(id)) {
      return new Response(JSON.stringify({ error: 'Invalid id' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const body = (await request.json()) as any;
    const { order, caption } = body;

    const db = await getDB(env);
    const photo = await db.prepare(`SELECT id FROM photos WHERE id = ?`).bind(id).first();
    if (!photo) {
      return new Response(JSON.stringify({ error: 'Photo not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (order != null) {
      await db.prepare(`UPDATE photos SET "order" = ? WHERE id = ?`).bind(order, id).run();
    }
    if (caption != null) {
      await db.prepare(`UPDATE photos SET caption = ? WHERE id = ?`).bind(caption, id).run();
    }

    const updated = await db.prepare(`SELECT * FROM photos WHERE id = ?`).bind(id).first<Photo>();

    return new Response(JSON.stringify(updated), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[PATCH /api/photos/:id]', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
