import { api, qs } from '../api/client.js';

export const tutorService = {
  search: (filters = {}) => api.get(`/tutors${qs(filters)}`),
  get: (id) => api.get(`/tutors/${id}`),
  reviews: (id) => api.get(`/tutors/${id}/reviews`),

  // Signed-in tutor
  myProfile: () => api.get('/me/tutor-profile'),
  updateProfile: (data) => api.put('/me/tutor-profile', data),
  updateCourses: (courses) => api.put('/me/tutor-courses', { courses }),
  updateAvailability: (slots) => api.put('/me/availability', { slots }),
};
