/**
 * auth.ts — Server-side authentication helpers
 *
 * Strategy: stateless HMAC-SHA256 token.
 * Token = HMAC-SHA256(key=ADMIN_PASSWORD, message="ddc-admin-session")
 *
 * Benefits:
 * - No session storage / DB needed
 * - Token automatically invalidates when password changes
 * - Server verifies by re-deriving the expected token and comparing
 */

/**
 * Derives the admin session token from the admin password.
 * The result is a hex-encoded HMAC-SHA256 string.
 */
export async function deriveAdminToken(adminPassword: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(adminPassword),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode('ddc-admin-session'),
  );
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Reads the Bearer token from the Authorization header and verifies it.
 * Returns true only if the token matches the derived token for this password.
 */
export async function verifyRequest(
  request: Request,
  adminPassword: string,
): Promise<boolean> {
  const auth = request.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) return false;
  const provided = auth.slice(7).trim();
  if (!provided) return false;
  const expected = await deriveAdminToken(adminPassword);
  // Use constant-time comparison to prevent timing attacks
  return timingSafeEqual(provided, expected);
}

/** Constant-time string comparison to prevent timing side-channel attacks. */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/** Standard 401 Unauthorized response. */
export function unauthorizedResponse(): Response {
  return new Response(JSON.stringify({ error: 'Unauthorized' }), {
    status: 401,
    headers: { 'Content-Type': 'application/json' },
  });
}
