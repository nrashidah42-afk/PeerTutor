import { db } from '../db.js';
import { HttpError, requireUser, required, assert, now } from '../utils.js';
import { userView } from '../queries.js';

const tokenFor = (user) => `mock.${user.id}`;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default [
  ['POST', '/auth/login', ({ body }) => {
    required(body, ['email', 'password']);
    const email = String(body.email).trim().toLowerCase();
    const user = db.all('users').find((u) => u.email.toLowerCase() === email);
    if (!user || user.password !== body.password) throw new HttpError(401, 'Incorrect email or password.');
    assert(user.status === 'active', 403, 'This account has been suspended. Please contact the PeerTutor team.');
    return { token: tokenFor(user), user: userView(user) };
  }],

  ['POST', '/auth/register', ({ body }) => {
    required(body, ['full_name', 'email', 'password', 'university_id']);
    const email = String(body.email).trim().toLowerCase();
    assert(EMAIL_RE.test(email), 422, 'Enter a valid email address.');
    assert(String(body.password).length >= 8, 422, 'Password must be at least 8 characters.');
    assert(!db.all('users').some((u) => u.email === email), 409, 'An account with this email already exists.');

    const uni = db.find('universities', body.university_id);
    assert(uni && uni.is_active, 422, 'Choose a supported university.');
    assert(email.endsWith(uni.email_domain), 422, `Use your ${uni.short_name} email address (ending in ${uni.email_domain}).`);

    let programmeId = null;
    if (body.programme_id) {
      const prog = db.find('programmes', body.programme_id);
      assert(prog && prog.university_id === uni.id, 422, 'Choose a programme from your university.');
      programmeId = prog.id;
    }

    const user = db.insert('users', {
      university_id: uni.id,
      programme_id: programmeId,
      full_name: String(body.full_name).trim(),
      email,
      password: body.password,
      role: 'learner',
      status: 'active',
      year_of_study: Math.min(Math.max(Number(body.year_of_study) || 1, 1), 7),
      created_at: now(),
    });
    return { token: tokenFor(user), user: userView(user) };
  }],

  ['GET', '/auth/me', ({ user }) => userView(requireUser(user))],
];
