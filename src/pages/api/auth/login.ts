import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { deriveAdminToken } from '../../../lib/auth';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json() as any;
    const { password } = body;

    const adminPassword = (env as any).ADMIN_PASSWORD as string | undefined;

    if (!adminPassword) {
      console.error('[POST /api/auth/login] ADMIN_PASSWORD env var is not set');
      return new Response(JSON.stringify({ error: 'Server misconfiguration' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (typeof password !== 'string' || password.length === 0) {
      return new Response(JSON.stringify({ error: 'Password wajib diisi' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (password !== adminPassword) {
      // Small delay on failure to slow down brute-force attempts
      await new Promise((r) => setTimeout(r, 500));
      return new Response(JSON.stringify({ error: 'Password salah' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Derive a stateless HMAC token from the password.
    // Token automatically invalidates if ADMIN_PASSWORD env var changes.
    const token = await deriveAdminToken(adminPassword);

    return new Response(JSON.stringify({ success: true, token }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[POST /api/auth/login]', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
