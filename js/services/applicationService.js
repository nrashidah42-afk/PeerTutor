import { api, qs } from '../api/client.js';

export const applicationService = {
  mine: () => api.get('/me/application'),
  submit: (data) => api.post('/applications', data),
  adminList: (params = {}) => api.get(`/admin/applications${qs(params)}`),
  decide: (id, status, admin_note = '') => api.patch(`/admin/applications/${id}`, { status, admin_note }),
};
