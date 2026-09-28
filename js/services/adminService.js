import { api, qs } from '../api/client.js';

export const adminService = {
  stats: () => api.get('/admin/stats'),

  users: (filters = {}) => api.get(`/admin/users${qs(filters)}`),
  updateUser: (id, patch) => api.patch(`/admin/users/${id}`, patch),

  reports: (params = {}) => api.get(`/admin/reports${qs(params)}`),
  setReportStatus: (id, status) => api.patch(`/admin/reports/${id}`, { status }),

  /** Mock mode only: restores the demo data. */
  resetDemoData: () => api.post('/dev/reset'),
};

export const reportService = {
  create: (data) => api.post('/reports', data),
};
