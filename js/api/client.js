/**
 * Single entry point for all data access.
 * Services call api.get/post/put/patch/delete with REST paths (see docs/API.md).
 * In 'mock' mode the in-browser mock server answers; in 'http' mode requests go to the backend.
 */
import { config } from '../config.js';
import { session } from '../state/session.js';

export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

/** Builds a query string, skipping empty values. qs({a: 1, b: ''}) -> '?a=1' */
export function qs(params = {}) {
  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    sp.append(key, value);
  }
  const s = sp.toString();
  return s ? `?${s}` : '';
}

let mockServer; // loaded lazily so mock code is never fetched in http mode

async function mockRequest(method, path, body) {
  mockServer ??= await import('./mock/server.js');
  await new Promise((resolve) => setTimeout(resolve, config.MOCK_LATENCY_MS));
  const res = mockServer.handleMockRequest({ method, path, body, token: session.getToken() });
  // Deep copy so callers can never mutate the mock database directly.
  const data = res.data == null ? null : JSON.parse(JSON.stringify(res.data));
  return { ok: res.status < 400, status: res.status, data };
}

async function httpRequest(method, path, body) {
  const headers = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const token = session.getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(config.API_BASE_URL + path, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, 'Cannot reach the server. Check your connection and try again.');
  }
  const data = res.status === 204 ? null : await res.json().catch(() => null);
  return { ok: res.ok, status: res.status, data };
}

async function request(method, path, body) {
  const res =
    config.API_MODE === 'mock' ? await mockRequest(method, path, body) : await httpRequest(method, path, body);
  if (!res.ok) {
    if (res.status === 401 && session.getToken()) session.clear();
    throw new ApiError(res.status, res.data?.message || `Request failed (${res.status})`);
  }
  return res.data;
}

export const api = {
  get: (path) => request('GET', path),
  post: (path, body = {}) => request('POST', path, body),
  put: (path, body = {}) => request('PUT', path, body),
  patch: (path, body = {}) => request('PATCH', path, body),
  delete: (path) => request('DELETE', path),
};
