import type { APIRoute } from 'astro';
import { getDb } from '../../../lib/db';
import { unlinkSync, existsSync } from 'fs';
import { join } from 'path';

export const DELETE: APIRoute = async ({ params }) => {
  try {
    const id = Number(params.id);
    if (isNaN(id)) {
      return new Response(JSON.stringify({ error: 'Invalid id' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const db = getDb();
    const photo = db
      .prepare(`SELECT * FROM photos WHERE id = ?`)
      .get(id) as { id: number; photo_url: string } | undefined;

    if (!photo) {
      return new Response(JSON.stringify({ error: 'Photo not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Delete file from disk (skip seed placeholders)
    if (!photo.photo_url.includes('/seed/')) {
      const filepath = join(process.cwd(), 'public', photo.photo_url);
      if (existsSync(filepath)) {
        unlinkSync(filepath);
      }
    }

    db.prepare(`DELETE FROM photos WHERE id = ?`).run(id);

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

    const body = await request.json();
    const { order, caption } = body;

    const db = getDb();
    const photo = db.prepare(`SELECT id FROM photos WHERE id = ?`).get(id);
    if (!photo) {
      return new Response(JSON.stringify({ error: 'Photo not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (order != null) {
      db.prepare(`UPDATE photos SET "order" = ? WHERE id = ?`).run(order, id);
    }
    if (caption != null) {
      db.prepare(`UPDATE photos SET caption = ? WHERE id = ?`).run(caption, id);
    }

    const updated = db.prepare(`SELECT * FROM photos WHERE id = ?`).get(id);

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
