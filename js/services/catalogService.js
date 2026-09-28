import { api, qs } from '../api/client.js';

export const catalogService = {
  publicStats: () => api.get('/stats'),

  universities: (params = {}) => api.get(`/universities${qs(params)}`),
  createUniversity: (data) => api.post('/universities', data),
  updateUniversity: (id, data) => api.put(`/universities/${id}`, data),

  programmes: (universityId) => api.get(`/programmes${qs({ university_id: universityId })}`),
  createProgramme: (data) => api.post('/programmes', data),
  deleteProgramme: (id) => api.delete(`/programmes/${id}`),

  courses: (filters = {}) => api.get(`/courses${qs(filters)}`),
  course: (id) => api.get(`/courses/${id}`),
  createCourse: (data) => api.post('/courses', data),
  updateCourse: (id, data) => api.put(`/courses/${id}`, data),
  deleteCourse: (id) => api.delete(`/courses/${id}`),
};
