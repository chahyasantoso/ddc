import type { APIRoute } from 'astro';
import type { Checkpoint } from '../../../lib/db';
import { env } from 'cloudflare:workers';

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
    const { location_name, lat, lng, description } = body;

    const db = env.DB;
    const existing = await db.prepare(`SELECT id FROM checkpoints WHERE id = ?`).bind(id).first();
    if (!existing) {
      return new Response(JSON.stringify({ error: 'Checkpoint not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    await db.prepare(
      `UPDATE checkpoints SET location_name = ?, lat = ?, lng = ?, description = ? WHERE id = ?`
    ).bind(location_name, lat, lng, description ?? null, id).run();

    const updated = await db.prepare(`SELECT * FROM checkpoints WHERE id = ?`).bind(id).first<Checkpoint>();
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

    const db = env.DB;
    const existing = await db.prepare(`SELECT id FROM checkpoints WHERE id = ?`).bind(id).first();
    if (!existing) {
      return new Response(JSON.stringify({ error: 'Checkpoint not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Photos cascade deleted via FK
    await db.prepare(`DELETE FROM checkpoints WHERE id = ?`).bind(id).run();

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
