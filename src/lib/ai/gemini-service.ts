import { buildCaptionPrompt } from './prompt-builder';
import type { AiSettings, CaptionRequest, CaptionResponse, GeminiError } from './types';

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';
const MODEL = 'gemini-2.5-flash';

/**
 * GeminiService — Core AI integration for caption generation.
 *
 * Instantiated per-request with the BYOK API key from the database.
 * No singletons, no globals — makes testing trivial.
 */
export class GeminiService {
  private apiKey: string;

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new GeminiServiceError('MISSING_API_KEY', 'Gemini API key is not configured.');
    }
    this.apiKey = apiKey;
  }

  /**
   * Generate or refine a photo caption using Gemini Vision.
   *
   * @param request - Contains photo data (URL or base64) and existing caption
   * @param settings - Global AI settings (tone, context)
   */
  async generateCaption(
    request: CaptionRequest,
    settings: AiSettings,
  ): Promise<CaptionResponse> {
    const prompt = buildCaptionPrompt(request, settings);
    const isRefine = request.existingCaption.trim().length > 0;

    // Resolve image data — either from provided base64 or by fetching the URL
    let imageBase64: string;
    let imageMimeType: string;

    if (request.photoBase64 && request.photoMimeType) {
      imageBase64 = request.photoBase64;
      imageMimeType = request.photoMimeType;
    } else if (request.photoUrl) {
      const fetched = await this.fetchImageAsBase64(request.photoUrl);
      imageBase64 = fetched.base64;
      imageMimeType = fetched.mimeType;
    } else {
      throw new GeminiServiceError(
        'NO_IMAGE',
        'Either photoUrl or photoBase64+photoMimeType must be provided.',
      );
    }

    const body = {
      contents: [
        {
          parts: [
            {
              inlineData: {
                mimeType: imageMimeType,
                data: imageBase64,
              },
            },
            { text: prompt },
          ],
        },
      ],
      generationConfig: {
        temperature: isRefine ? 0.5 : 0.8,
        maxOutputTokens: 1024,
        topP: 0.95,
      },
    };

    const url = `${GEMINI_API_BASE}/models/${MODEL}:generateContent?key=${this.apiKey}`;

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errorBody = await res.json().catch(() => ({})) as any;
      const errorMsg = errorBody?.error?.message || `Gemini API error: ${res.status}`;
      throw new GeminiServiceError('API_ERROR', errorMsg, res.status);
    }

    const data = await res.json() as any;
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      throw new GeminiServiceError(
        'EMPTY_RESPONSE',
        'Gemini returned an empty response. The photo may not be processable.',
      );
    }

    return {
      caption: text.trim(),
      mode: isRefine ? 'refined' : 'generated',
    };
  }

  /**
   * Fetches an image URL and returns base64 + MIME type for Gemini Vision.
   */
  private async fetchImageAsBase64(
    url: string,
  ): Promise<{ base64: string; mimeType: string }> {
    try {
      const res = await fetch(url);
      if (!res.ok) {
        throw new GeminiServiceError(
          'IMAGE_FETCH_FAILED',
          `Failed to fetch photo: ${res.status} ${res.statusText}`,
        );
      }

      const buffer = await res.arrayBuffer();
      const base64 = btoa(
        new Uint8Array(buffer).reduce(
          (data, byte) => data + String.fromCharCode(byte),
          '',
        ),
      );

      const mimeType = res.headers.get('content-type') || 'image/jpeg';
      return { base64, mimeType };
    } catch (err) {
      if (err instanceof GeminiServiceError) throw err;
      throw new GeminiServiceError(
        'IMAGE_FETCH_FAILED',
        `Could not fetch photo from URL: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}

/**
 * Typed error class for clean error propagation to the API layer.
 * Contains a machine-readable `code` and human-readable `message`.
 */
export class GeminiServiceError extends Error {
  code: string;
  status?: number;

  constructor(code: string, message: string, status?: number) {
    super(message);
    this.name = 'GeminiServiceError';
    this.code = code;
    this.status = status;
  }

  toJSON(): GeminiError {
    return { code: this.code, message: this.message, status: this.status };
  }
}
