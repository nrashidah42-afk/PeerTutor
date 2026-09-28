import { api } from '../api/client.js';
import { session } from '../state/session.js';

export const authService = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  register: (data) => api.post('/auth/register', data),
  me: () => api.get('/auth/me'),

  /** Re-fetches the signed-in user (e.g. after an admin approves a tutor application). */
  async refresh() {
    const user = await api.get('/auth/me');
    session.setUser(user);
    return user;
  },

  logout() {
    // With a real backend, also call POST /auth/logout so the token is revoked server-side.
    session.clear();
  },
};
