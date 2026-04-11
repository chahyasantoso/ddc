import type { APIRoute } from 'astro';
import { getDb } from '../../../lib/db';

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
    const { location_name, lat, lng, description } = body;

    const db = getDb();
    const existing = db.prepare(`SELECT id FROM checkpoints WHERE id = ?`).get(id);
    if (!existing) {
      return new Response(JSON.stringify({ error: 'Checkpoint not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    db.prepare(
      `UPDATE checkpoints SET location_name = ?, lat = ?, lng = ?, description = ? WHERE id = ?`
    ).run(location_name, lat, lng, description ?? null, id);

    const updated = db.prepare(`SELECT * FROM checkpoints WHERE id = ?`).get(id);
    return new Response(JSON.stringify(updated), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[PATCH /api/checkpoints/:id]', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

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
    const existing = db.prepare(`SELECT id FROM checkpoints WHERE id = ?`).get(id);
    if (!existing) {
      return new Response(JSON.stringify({ error: 'Checkpoint not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Photos cascade deleted via FK
    db.prepare(`DELETE FROM checkpoints WHERE id = ?`).run(id);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[DELETE /api/checkpoints/:id]', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
