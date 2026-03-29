const BASE = '/api/v1';

let _backendToken: string | null = null;

export function setBackendToken(token: string | null) {
  _backendToken = token;
}

// Legacy helpers — kept for compatibility during transition
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function setApiRole(_role: string) {}
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function setApiEmployeeId(_id: string | null) {}

function authHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};
  if (_backendToken) {
    headers['Authorization'] = `Bearer ${_backendToken}`;
  }
  return headers;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const headers = { ...authHeaders(), ...(options?.headers || {}) };
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
    fetch(`${BASE}${path}`, { method: 'DELETE', headers: authHeaders() }).then((r) => r.ok),

  upload: <T>(path: string, formData: FormData) =>
    request<T>(path, { method: 'POST', body: formData }),
};
