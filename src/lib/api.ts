// Tiny fetch wrapper for the app's JSON API. Errors carry the server's message
// so toasts can show something useful.

export class ApiError extends Error {
  constructor(message: string, readonly status: number, readonly code?: string, readonly data?: Record<string, unknown>) {
    super(message);
  }
}

async function request<T>(method: string, url: string, body?: unknown, signal?: AbortSignal): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: body === undefined ? undefined : { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
    credentials: 'same-origin',
    signal,
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) throw new ApiError(data?.error ?? `Request failed (${res.status})`, res.status, data?.code, data ?? undefined);
  return data as T;
}

export const api = {
  /** Pass TanStack Query's `signal` so a superseded request (e.g. while typing) is cancelled. */
  get: <T>(url: string, opts?: { signal?: AbortSignal }) => request<T>('GET', url, undefined, opts?.signal),
  post: <T>(url: string, body?: unknown) => request<T>('POST', url, body ?? {}),
  patch: <T>(url: string, body: unknown) => request<T>('PATCH', url, body),
  put: <T>(url: string, body: unknown) => request<T>('PUT', url, body),
  delete: <T>(url: string) => request<T>('DELETE', url),
};
