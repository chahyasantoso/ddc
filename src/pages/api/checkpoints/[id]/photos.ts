import type { APIRoute } from 'astro';
import { getDb } from '../../../../lib/db';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, extname } from 'path';

export const POST: APIRoute = async ({ request, params }) => {
  try {
    const checkpointId = Number(params.id);
    if (isNaN(checkpointId)) {
      return new Response(JSON.stringify({ error: 'Invalid checkpoint id' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const db = getDb();
    const checkpoint = db
      .prepare(`SELECT id FROM checkpoints WHERE id = ?`)
      .get(checkpointId);

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

    // Save file to /public/uploads/
    const uploadsDir = join(process.cwd(), 'public', 'uploads');
    if (!existsSync(uploadsDir)) {
      mkdirSync(uploadsDir, { recursive: true });
    }

    const ext = extname(file.name) || '.jpg';
    const filename = `photo_${checkpointId}_${Date.now()}${ext}`;
    const filepath = join(uploadsDir, filename);
    const buffer = Buffer.from(await file.arrayBuffer());
    writeFileSync(filepath, buffer);

    const photoUrl = `/uploads/${filename}`;

    const result = db
      .prepare(
        `INSERT INTO photos (checkpoint_id, photo_url, caption, "order") VALUES (?, ?, ?, ?)`
      )
      .run(checkpointId, photoUrl, caption, order);

    const created = db
      .prepare(`SELECT * FROM photos WHERE id = ?`)
      .get(result.lastInsertRowid);

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
