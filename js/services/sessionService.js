import { api, qs } from '../api/client.js';

export const sessionService = {
  request: (data) => api.post('/sessions', data),
  /** @param {{as?: 'learner'|'tutor', status?: string}} params */
  mine: (params = {}) => api.get(`/me/sessions${qs(params)}`),
  setStatus: (id, status, note = '') => api.patch(`/sessions/${id}`, { status, note }),
};
