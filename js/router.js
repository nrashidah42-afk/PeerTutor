/**
 * Hash-based router (#/tutors/5?tab=reviews). Works on any static host without server rewrites.
 * To move to clean URLs later, swap hashchange for the History API and add a server fallback to index.html.
 */
import { routes } from './routes.js';
import { session, dashboardPathFor } from './state/session.js';
import { config } from './config.js';
import { loader, errorState, emptyState } from './components/ui.js';

let outlet;
let renderId = 0;

const compiled = routes.map((route) => {
  const keys = [];
  const pattern = route.path.replace(/:(\w+)/g, (_, key) => {
    keys.push(key);
    return '([^/]+)';
  });
  return { route, keys, regex: new RegExp(`^${pattern}/?$`) };
});

function parseHash() {
  const raw = location.hash.slice(1) || '/';
  const [pathname, search = ''] = raw.split('?');
  return { pathname: pathname || '/', query: Object.fromEntries(new URLSearchParams(search)) };
}

function match(pathname) {
  for (const { route, keys, regex } of compiled) {
    const m = pathname.match(regex);
    if (m) return { route, params: Object.fromEntries(keys.map((k, i) => [k, decodeURIComponent(m[i + 1])])) };
  }
  return null;
}

export function navigate(path) {
  if (location.hash === `#${path}`) handleRoute();
  else location.hash = path;
}

async function handleRoute() {
  const id = ++renderId;
  const { pathname, query } = parseHash();
  const found = match(pathname);
  const user = session.getUser();

  const finish = (title) => {
    document.title = `${title} · ${config.APP_NAME}`;
    window.scrollTo(0, 0);
    outlet.focus({ preventScroll: true });
    window.dispatchEvent(new CustomEvent('routechange', { detail: { pathname } }));
  };

  if (!found) {
    outlet.innerHTML = `<div class="container page">${emptyState({
      iconName: 'alert',
      title: 'Page not found',
      text: 'The page you are looking for does not exist or has moved.',
      action: '<a class="btn btn-primary" href="#/">Go home</a>',
    })}</div>`;
    return finish('Not found');
  }

  const { route, params } = found;
  if (route.roles && !user) return navigate(`/login?next=${encodeURIComponent(pathname)}`);
  if (route.guestOnly && user) return navigate(dashboardPathFor(user));
  if (route.roles && !route.roles.includes(user.role)) {
    outlet.innerHTML = `<div class="container page">${emptyState({
      iconName: 'shieldCheck',
      title: 'You don’t have access to this page',
      text: 'This area is for a different type of account.',
      action: `<a class="btn btn-primary" href="#${dashboardPathFor(user)}">Go to my dashboard</a>`,
    })}</div>`;
    return finish('No access');
  }

  outlet.innerHTML = `<div class="container page">${loader()}</div>`;
  try {
    const page = await route.load();
    if (id !== renderId) return; // user navigated away while loading
    await page.render(outlet, { params, query, user, isCurrent: () => id === renderId });
  } catch (err) {
    console.error(err);
    if (id === renderId) outlet.innerHTML = `<div class="container page">${errorState(err.message)}</div>`;
  }
  if (id === renderId) finish(route.title);
}

export function initRouter(el) {
  outlet = el;
  window.addEventListener('hashchange', handleRoute);
  handleRoute();
}
