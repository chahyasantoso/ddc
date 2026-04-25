import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { getDB } from '../../../lib/db-client';
import { verifyRequest, unauthorizedResponse } from '../../../lib/auth';
import { GeminiService, GeminiServiceError } from '../../../lib/ai/gemini-service';
import type { AiSettings, CaptionRequest } from '../../../lib/ai/types';

function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * POST /api/ai/caption
 *
 * Generates or refines a photo caption using Gemini Vision.
 * Expects JSON body matching CaptionRequest.
 */
export const POST: APIRoute = async ({ request }) => {
  const adminPassword = (env as any).ADMIN_PASSWORD;

  // ── Auth guard ──────────────────────────────────────────────────────────────
  if (!await verifyRequest(request, adminPassword)) {
    return unauthorizedResponse();
  }

  try {
    const body = await request.json() as CaptionRequest;

    // Validate: must have either photoUrl or photoBase64
    if (!body.photoUrl && !body.photoBase64) {
      return jsonResponse({ error: 'photoUrl or photoBase64 is required', code: 'NO_IMAGE' }, 400);
    }

    // Load AI settings from DB
    const db = await getDB(env);
    const settings = await db
      .prepare('SELECT * FROM ai_settings WHERE id = 1')
      .first<AiSettings>();

    if (!settings?.gemini_api_key) {
      return jsonResponse({
        error: 'Gemini API key belum dikonfigurasi. Buka Settings → AI untuk menambahkan.',
        code: 'MISSING_API_KEY',
      }, 400);
    }

    const service = new GeminiService(settings.gemini_api_key);
    const result = await service.generateCaption(body, settings);

    return jsonResponse(result);
  } catch (err) {
    if (err instanceof GeminiServiceError) {
      console.error('[POST /api/ai/caption] GeminiServiceError:', err.code, err.message);
      return jsonResponse({ error: err.message, code: err.code }, err.status ?? 500);
    }
    console.error('[POST /api/ai/caption]', err);
    return jsonResponse({
      error: err instanceof Error ? err.message : 'Internal server error',
      code: 'INTERNAL_ERROR',
    }, 500);
  }
};
