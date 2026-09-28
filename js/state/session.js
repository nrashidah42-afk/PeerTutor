/**
 * Holds the signed-in user and auth token, persisted to localStorage.
 * Components subscribe to be re-rendered when the user logs in or out.
 */
const KEY = 'peertutor_session';
const listeners = new Set();
let state = load();

function load() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || { token: null, user: null };
  } catch {
    return { token: null, user: null };
  }
}

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* storage unavailable – session lasts for this page load only */
  }
}

function emit() {
  listeners.forEach((fn) => fn(state.user));
}

export const session = {
  getToken: () => state.token,
  getUser: () => state.user,
  start(token, user) {
    state = { token, user };
    persist();
    emit();
  },
  setUser(user) {
    state.user = user;
    persist();
    emit();
  },
  clear() {
    state = { token: null, user: null };
    persist();
    emit();
  },
  subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
  hasRole: (...roles) => !!state.user && roles.includes(state.user.role),
};

export function dashboardPathFor(user) {
  return { admin: '/admin', tutor: '/tutor', learner: '/learner' }[user?.role] || '/';
}
