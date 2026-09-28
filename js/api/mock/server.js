/**
 * In-browser mock of the PeerTutor REST API.
 * Route files under ./routes are organised the way a Node/Express (or Laravel/Django) backend would be,
 * so each can be ported to the server one-to-one.
 */
import { db } from './db.js';
import { HttpError } from './utils.js';
import authRoutes from './routes/auth.js';
import catalogRoutes from './routes/catalog.js';
import tutorRoutes from './routes/tutors.js';
import sessionRoutes from './routes/sessions.js';
import reviewRoutes from './routes/reviews.js';
import materialRoutes from './routes/materials.js';
import applicationRoutes from './routes/applications.js';
import adminRoutes from './routes/admin.js';

const routes = [
  ...authRoutes,
  ...catalogRoutes,
  ...tutorRoutes,
  ...sessionRoutes,
  ...reviewRoutes,
  ...materialRoutes,
  ...applicationRoutes,
  ...adminRoutes,
].map(([method, path, handler]) => {
  const keys = [];
  const pattern = path.replace(/:(\w+)/g, (_, key) => {
    keys.push(key);
    return '([^/]+)';
  });
  return { method, regex: new RegExp(`^${pattern}$`), keys, handler };
});

/** Mock tokens are "mock.<userId>". A real backend would issue signed JWTs or session cookies. */
function userFromToken(token) {
  if (!token?.startsWith('mock.')) return null;
  const user = db.find('users', Number(token.slice(5)));
  return user && user.status === 'active' ? user : null;
}

export function handleMockRequest({ method, path, body, token }) {
  const url = new URL(path, 'http://mock.local');
  const query = Object.fromEntries(url.searchParams);

  for (const route of routes) {
    if (route.method !== method) continue;
    const match = url.pathname.match(route.regex);
    if (!match) continue;
    const params = Object.fromEntries(route.keys.map((key, i) => [key, decodeURIComponent(match[i + 1])]));
    try {
      const data = route.handler({ params, query, body: body ?? {}, user: userFromToken(token) });
      return { status: 200, data };
    } catch (err) {
      if (err instanceof HttpError) return { status: err.status, data: { message: err.message } };
      console.error('[mock api]', err);
      return { status: 500, data: { message: 'Unexpected server error.' } };
    }
  }
  return { status: 404, data: { message: `No route for ${method} ${url.pathname}` } };
}
