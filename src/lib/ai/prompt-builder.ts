import type { CaptionTone, CaptionRequest, AiSettings } from './types';

const TONE_INSTRUCTIONS: Record<CaptionTone, string> = {
  descriptive: 'Write a clear, factual, and informative caption.',
  poetic:      'Write a lyrical, evocative caption with vivid imagery.',
  casual:      'Write a friendly, conversational caption as if sharing with a friend.',
  storytelling:'Write a narrative caption in first-person, as if journaling a travel adventure.',
  minimal:     'Write a very short, punchy caption — at most 10 words.',
};

/**
 * Builds the text prompt for Gemini caption generation.
 * This is a pure function — no side effects, easy to unit-test.
 */
export function buildCaptionPrompt(
  request: CaptionRequest,
  settings: AiSettings,
): string {
  const tone = request.tone ?? settings.caption_tone;
  const context = request.context ?? settings.global_context;
  const isRefine = request.existingCaption.trim().length > 0;

  const parts: string[] = [];

  // System instruction
  parts.push(
    'You are a travel journal caption writer.',
    'You will receive a photo and must write a caption for it.',
    TONE_INSTRUCTIONS[tone],
  );

  // Global context
  if (context) {
    parts.push(`\nContext about this journal: ${context}`);
  }

  // Location context
  if (request.locationName) {
    parts.push(`\nThis photo was taken at: ${request.locationName}`);
  }

  // Mode-specific instruction
  if (isRefine) {
    parts.push(
      `\nThe user already wrote this draft caption: "${request.existingCaption}"`,
      'Refine and enhance this caption while preserving the original intent.',
      'Keep the same language as the draft.',
    );
  } else {
    parts.push(
      '\nNo caption exists yet. Generate a fresh caption based on the photo.',
      'Write the caption in Indonesian (Bahasa Indonesia).',
    );
  }

  // Output rules
  parts.push(
    '\nRules:',
    '- Output ONLY the caption text, no quotes, no labels, no explanation.',
    '- Keep it concise (1-2 sentences max unless the tone requires more).',
    '- Do not start with "Caption:" or similar prefixes.',
  );

  return parts.join('\n');
}
