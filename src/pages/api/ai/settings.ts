import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { getDB } from '../../../lib/db-client';
import { verifyRequest, unauthorizedResponse } from '../../../lib/auth';

function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * GET /api/ai/settings
 *
 * Returns the current AI settings. API key is masked for security.
 */
export const GET: APIRoute = async ({ request }) => {
  console.log('[GET /api/ai/settings] Request received');
  const adminPassword = (env as any).ADMIN_PASSWORD;
  
  if (!adminPassword) {
    console.error('[GET /api/ai/settings] ADMIN_PASSWORD is NOT defined in env!');
  }

  if (!await verifyRequest(request, adminPassword)) {
    console.warn('[GET /api/ai/settings] 401 Unauthorized');
    return unauthorizedResponse();
  }

  try {
    console.log('[GET /api/ai/settings] Accessing DB...');
    const db = await getDB(env);
    const settings = await db
      .prepare('SELECT * FROM ai_settings WHERE id = 1')
      .first() as Record<string, any> | null;

    if (!settings) {
      return jsonResponse({
        gemini_api_key: '',
        global_context: '',
        caption_tone: 'descriptive',
        has_api_key: false,
      });
    }

    // Mask the API key for security — only show prefix + suffix
    const masked = { ...settings } as Record<string, any>;
    if (masked.gemini_api_key) {
      const key = masked.gemini_api_key as string;
      masked.gemini_api_key = key.slice(0, 6) + '••••••' + key.slice(-4);
      masked.has_api_key = true;
    } else {
      masked.has_api_key = false;
    }

    return jsonResponse(masked);
  } catch (err) {
    console.error('[GET /api/ai/settings]', err);
    return jsonResponse({
      error: err instanceof Error ? err.message : 'Internal server error',
    }, 500);
  }
};

/**
 * PUT /api/ai/settings
 *
 * Updates AI settings. Supports partial updates (only provided fields).
 */
export const PUT: APIRoute = async ({ request }) => {
  const adminPassword = (env as any).ADMIN_PASSWORD;

  if (!await verifyRequest(request, adminPassword)) {
    return unauthorizedResponse();
  }

  try {
    const body = await request.json() as Record<string, any>;
    const db = await getDB(env);

    // Build dynamic UPDATE query based on provided fields
    const updates: string[] = [];
    const values: any[] = [];

    if (body.gemini_api_key !== undefined) {
      updates.push('gemini_api_key = ?');
      values.push(body.gemini_api_key);
    }
    if (body.global_context !== undefined) {
      updates.push('global_context = ?');
      values.push(body.global_context);
    }
    if (body.caption_tone !== undefined) {
      updates.push('caption_tone = ?');
      values.push(body.caption_tone);
    }

    if (updates.length === 0) {
      return jsonResponse({ error: 'No fields to update' }, 400);
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');

    await db
      .prepare(`UPDATE ai_settings SET ${updates.join(', ')} WHERE id = 1`)
      .bind(...values)
      .run();

    return jsonResponse({ success: true });
  } catch (err) {
    console.error('[PUT /api/ai/settings]', err);
    return jsonResponse({
      error: err instanceof Error ? err.message : 'Internal server error',
    }, 500);
  }
};
