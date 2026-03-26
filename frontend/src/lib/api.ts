const BASE = '/api/v1';

let _currentRole = 'admin';

export function setApiRole(role: string) {
  _currentRole = role;
}

function roleHeaders(): Record<string, string> {
  return { 'X-User-Role': _currentRole };
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const headers = { ...roleHeaders(), ...(options?.headers || {}) };
  const res = await fetch(`${BASE}${path}`, { ...options, headers });
  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

export const api = {
  get: <T>(path: string) => request<T>(path),

  post: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    }),

  patch: <T>(path: string, body: unknown) =>
    request<T>(path, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),

  del: (path: string) =>
    fetch(`${BASE}${path}`, { method: 'DELETE', headers: roleHeaders() }).then((r) => r.ok),

  upload: <T>(path: string, formData: FormData) =>
    request<T>(path, { method: 'POST', body: formData }),
};
