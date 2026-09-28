/** Helpers shared by mock route handlers. Mirror these checks in the real backend. */

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const MODES = ['online', 'in_person', 'both'];

export const now = () => new Date().toISOString();

export function requireUser(user) {
  if (!user) throw new HttpError(401, 'Please log in to continue.');
  return user;
}

export function requireRole(user, ...roles) {
  requireUser(user);
  if (!roles.includes(user.role)) throw new HttpError(403, 'You do not have permission to do that.');
  return user;
}

const LABELS = {
  full_name: 'Full name',
  university_id: 'University',
  course_id: 'Course',
  tutor_id: 'Tutor',
  scheduled_at: 'Date and time',
  duration_minutes: 'Duration',
  evidence_url: 'Results link',
  short_name: 'Short name',
  email_domain: 'Email domain',
  target_type: 'Report type',
  target_id: 'Report target',
};

export function required(body, fields) {
  for (const field of fields) {
    const value = body?.[field];
    if (value === undefined || value === null || String(value).trim() === '') {
      const label = LABELS[field] || field.charAt(0).toUpperCase() + field.slice(1).replace(/_/g, ' ');
      throw new HttpError(422, `${label} is required.`);
    }
  }
}

export function assert(condition, status, message) {
  if (!condition) throw new HttpError(status, message);
}

export const isUrl = (value) => /^https?:\/\/\S+$/i.test(String(value || ''));

export const byNewest = (a, b) => String(b.created_at).localeCompare(String(a.created_at));
