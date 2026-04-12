import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';

export const GET: APIRoute = async ({ params }) => {
  const path = params.path;
  if (!path) {
    return new Response('Not Found', { status: 404 });
  }

  const PHOTOS = env.PHOTOS;
  if (!PHOTOS) {
    return new Response('R2 Storage is not configured', { status: 500 });
  }
  
  const object = await PHOTOS.get(path);

  if (!object) {
    return new Response('Not Found', { status: 404 });
  }

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('etag', object.httpEtag);
  headers.set('Cache-Control', 'public, max-age=31536000, immutable');

  return new Response(object.body, {
    headers,
  });
};
