import { api, qs } from '../api/client.js';

export const MATERIAL_TYPES = {
  notes: 'Notes',
  past_paper: 'Past paper',
  slides: 'Slides',
  video: 'Video',
  link: 'Link',
};

export const MATERIAL_ICONS = { notes: 'file', past_paper: 'paper', slides: 'slides', video: 'video', link: 'link' };

export const materialService = {
  list: (filters = {}) => api.get(`/materials${qs(filters)}`),
  mine: () => api.get('/me/materials'),
  create: (data) => api.post('/materials', data),
  remove: (id) => api.delete(`/materials/${id}`),
  open: (id) => api.post(`/materials/${id}/open`),

  adminList: (filters = {}) => api.get(`/admin/materials${qs(filters)}`),
  setStatus: (id, status) => api.patch(`/admin/materials/${id}`, { status }),
};
