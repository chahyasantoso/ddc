import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { password } = body;

    const adminPassword = import.meta.env.ADMIN_PASSWORD || process.env.ADMIN_PASSWORD || 'ddc2024';

    if (password === adminPassword) {
      return new Response(JSON.stringify({ success: true, token: 'ddc-admin-local' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Password salah' }), {
      status: 401,
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
