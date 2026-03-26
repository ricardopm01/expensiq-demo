const BASE = '/api/v1';

let _currentRole = 'admin';
let _currentEmployeeId: string | null = null;

export function setApiRole(role: string) {
  _currentRole = role;
}

export function setApiEmployeeId(id: string | null) {
  _currentEmployeeId = id;
}

function roleHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'X-User-Role': _currentRole };
  if (_currentEmployeeId) {
    headers['X-Employee-Id'] = _currentEmployeeId;
  }
  return headers;
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
