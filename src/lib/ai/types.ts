/** Tone presets for caption generation */
export type CaptionTone =
  | 'descriptive'     // Factual, clear, informative
  | 'poetic'          // Lyrical, evocative
  | 'casual'          // Friendly, conversational
  | 'storytelling'    // Narrative, first-person journey style
  | 'minimal';        // Short, punchy, haiku-like

export interface AiSettings {
  gemini_api_key: string;
  global_context: string;
  caption_tone: CaptionTone;
}

export interface CaptionRequest {
  /** Public URL of the photo (from Cloudinary). Used for already-uploaded photos. */
  photoUrl?: string;
  /** Base64-encoded image data for pending (not-yet-uploaded) photos */
  photoBase64?: string;
  /** MIME type of the base64 photo (e.g. 'image/webp') */
  photoMimeType?: string;
  /** Existing caption text (empty = generate from scratch) */
  existingCaption: string;
  /** Per-request tone override (falls back to global setting) */
  tone?: CaptionTone;
  /** Per-request context override (falls back to global setting) */
  context?: string;
  /** Location name for geographic context */
  locationName?: string;
}

export interface CaptionResponse {
  caption: string;
  /** Was this a refinement or generation? */
  mode: 'generated' | 'refined';
}

export interface GeminiError {
  code: string;
  message: string;
  /** HTTP status from Gemini API */
  status?: number;
}
