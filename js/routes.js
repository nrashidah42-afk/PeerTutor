/**
 * Route table. Each page module exports `render(el, ctx)`.
 * roles:     only these roles may open the page (redirects to login when signed out)
 * guestOnly: signed-in users are sent to their dashboard
 */
const LEARNING = ['learner', 'tutor']; // tutors can book sessions as learners too

export const routes = [
  { path: '/', title: 'Student-to-student tutoring', load: () => import('./pages/home.js') },
  { path: '/login', title: 'Log in', guestOnly: true, load: () => import('./pages/auth/login.js') },
  { path: '/register', title: 'Create account', guestOnly: true, load: () => import('./pages/auth/register.js') },

  { path: '/tutors', title: 'Find a tutor', load: () => import('./pages/tutors/search.js') },
  { path: '/tutors/:id', title: 'Tutor profile', load: () => import('./pages/tutors/profile.js') },
  { path: '/courses', title: 'Courses', load: () => import('./pages/courses.js') },
  { path: '/materials', title: 'Learning materials', load: () => import('./pages/materials.js') },

  { path: '/learner', title: 'Learner dashboard', roles: LEARNING, load: () => import('./pages/learner/dashboard.js') },
  { path: '/learner/sessions', title: 'My sessions', roles: LEARNING, load: () => import('./pages/learner/sessions.js') },
  { path: '/become-tutor', title: 'Become a tutor', roles: LEARNING, load: () => import('./pages/learner/becomeTutor.js') },

  { path: '/tutor', title: 'Tutor dashboard', roles: ['tutor'], load: () => import('./pages/tutor/dashboard.js') },
  { path: '/tutor/profile', title: 'Tutor profile', roles: ['tutor'], load: () => import('./pages/tutor/profile.js') },
  { path: '/tutor/availability', title: 'Availability', roles: ['tutor'], load: () => import('./pages/tutor/availability.js') },
  { path: '/tutor/materials', title: 'My materials', roles: ['tutor'], load: () => import('./pages/tutor/materials.js') },

  { path: '/admin', title: 'Admin overview', roles: ['admin'], load: () => import('./pages/admin/dashboard.js') },
  { path: '/admin/applications', title: 'Tutor applications', roles: ['admin'], load: () => import('./pages/admin/applications.js') },
  { path: '/admin/users', title: 'Users', roles: ['admin'], load: () => import('./pages/admin/users.js') },
  { path: '/admin/catalog', title: 'Universities & courses', roles: ['admin'], load: () => import('./pages/admin/catalog.js') },
  { path: '/admin/moderation', title: 'Moderation', roles: ['admin'], load: () => import('./pages/admin/moderation.js') },
];
