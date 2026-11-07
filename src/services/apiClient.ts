import { auth } from './firebase.ts';

/**
 * fetch() wrapper that attaches the signed-in user's Firebase ID token.
 * The server derives identity and administrator status ONLY from this verified
 * token — never from request headers or body fields supplied by the page.
 */
export async function apiFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers || {});
  try {
    const token = await auth.currentUser?.getIdToken();
    if (token) headers.set('Authorization', `Bearer ${token}`);
  } catch {
    /* continue anonymously; the server will answer 401 where a login is required */
  }
  return fetch(input, { ...init, headers });
}

export async function apiJson<T = any>(input: string, init: RequestInit = {}): Promise<{ ok: boolean; status: number; data: T }> {
  const headers = new Headers(init.headers || {});
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  const res = await apiFetch(input, { ...init, headers });
  let data: any = null;
  try {
    data = await res.json();
  } catch {
    /* non-JSON response */
  }
  return { ok: res.ok, status: res.status, data };
}
