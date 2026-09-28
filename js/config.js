/**
 * Application configuration.
 *
 * API_MODE
 *   'mock' – requests are served by the in-browser mock API (js/api/mock), data lives in localStorage.
 *   'http' – requests go to a real backend at API_BASE_URL (see docs/API.md for the contract).
 */
export const config = {
  APP_NAME: 'PeerTutor',
  API_MODE: 'mock',
  API_BASE_URL: 'http://localhost:4000/api',
  MOCK_LATENCY_MS: 150,
  CURRENCY: 'UGX',
  DEFAULT_UNIVERSITY_ID: 1,

  // Only shown on the login page while API_MODE === 'mock'.
  DEMO_PASSWORD: 'password123',
  DEMO_ACCOUNTS: [
    { role: 'Learner', email: 'learner@students.mak.ac.ug' },
    { role: 'Tutor', email: 'tutor@students.mak.ac.ug' },
    { role: 'Admin', email: 'admin@mak.ac.ug' },
  ],
};
