import { api, qs } from '../api/client.js';

export const reviewService = {
  create: (data) => api.post('/reviews', data),
  adminList: (params = {}) => api.get(`/admin/reviews${qs(params)}`),
  setStatus: (id, status) => api.patch(`/admin/reviews/${id}`, { status }),
};
