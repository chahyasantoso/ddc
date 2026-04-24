/**
 * adminFetch.ts — Client-side fetch wrapper for admin API calls.
 *
 * Automatically reads the stored token from localStorage and appends
 * the `Authorization: Bearer <token>` header to every request.
 * Drop-in replacement for `fetch()` in all admin components.
 */

export function getAdminToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('ddc-admin-token');
}

/**
 * Wrapper around `fetch` that injects the admin Bearer token header.
 * Usage: replace `fetch(url, opts)` with `adminFetch(url, opts)` in admin components.
 */
export function adminFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = getAdminToken();
  return fetch(url, {
    ...options,
    headers: {
      ...(options.headers ?? {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
}
