/**
 * Read-model builders: join rows into the response shapes documented in docs/API.md.
 * In a real backend these become SQL joins / views.
 */
import { db } from './db.js';

export const profileOf = (userId) => db.all('tutor_profiles').find((p) => p.user_id === userId);

export function shortName(fullName = '') {
  const [first, last] = fullName.split(' ');
  return last ? `${first} ${last[0]}.` : first;
}

export function userView(u) {
  if (!u) return null;
  const { password, ...rest } = u;
  const uni = db.find('universities', u.university_id);
  const prog = u.programme_id ? db.find('programmes', u.programme_id) : null;
  return { ...rest, university: uni?.short_name || '', university_name: uni?.name || '', programme: prog?.name || '' };
}

export function isActiveTutor(userId) {
  const u = db.find('users', userId);
  const p = profileOf(Number(userId));
  return !!u && u.role === 'tutor' && u.status === 'active' && !!p?.is_verified;
}

export function ratingFor(tutorId) {
  const rows = db.where('reviews', (r) => r.tutor_id === tutorId && r.status === 'visible');
  const avg = rows.length ? rows.reduce((sum, r) => sum + r.rating, 0) / rows.length : 0;
  return { rating: Math.round(avg * 10) / 10, review_count: rows.length };
}

export const topicsOf = (courseId) => db.where('topics', (t) => t.course_id === courseId);

export function courseView(c) {
  const uni = db.find('universities', c.university_id);
  const prog = c.programme_id ? db.find('programmes', c.programme_id) : null;
  const tutorIds = new Set(db.where('tutor_courses', (tc) => tc.course_id === c.id).map((tc) => tc.tutor_id));
  return {
    ...c,
    university: uni?.short_name || '',
    programme: prog?.name || 'Shared course',
    topics: topicsOf(c.id).map(({ id, name }) => ({ id, name })),
    tutor_count: [...tutorIds].filter(isActiveTutor).length,
    material_count: db.where('materials', (m) => m.course_id === c.id && m.status === 'published').length,
  };
}

export function tutorSummary(u) {
  const p = profileOf(u.id);
  const uv = userView(u);
  const courses = db
    .where('tutor_courses', (tc) => tc.tutor_id === u.id)
    .map((tc) => db.find('courses', tc.course_id))
    .filter(Boolean);
  const days = [...new Set(db.where('availability', (a) => a.tutor_id === u.id).map((a) => a.day_of_week))].sort((a, b) => a - b);
  return {
    id: u.id,
    full_name: u.full_name,
    university_id: u.university_id,
    university: uv.university,
    programme_id: u.programme_id,
    programme: uv.programme,
    year_of_study: u.year_of_study,
    headline: p.headline,
    fee: p.fee,
    mode: p.mode,
    location: p.location,
    is_verified: p.is_verified,
    ...ratingFor(u.id),
    sessions_completed: db.where('sessions', (s) => s.tutor_id === u.id && s.status === 'completed').length,
    courses: courses.map((c) => ({ id: c.id, code: c.code, title: c.title, programme_id: c.programme_id })),
    availability_days: days,
    created_at: u.created_at,
  };
}

export function sessionView(s) {
  const course = db.find('courses', s.course_id);
  return {
    ...s,
    learner_name: db.find('users', s.learner_id)?.full_name || 'Unknown',
    tutor_name: db.find('users', s.tutor_id)?.full_name || 'Unknown',
    course_code: course?.code || '',
    course_title: course?.title || '',
    reviewed: db.all('reviews').some((r) => r.session_id === s.id),
  };
}

export function materialView(m, viewer) {
  const course = db.find('courses', m.course_id);
  const view = {
    ...m,
    course_code: course?.code || '',
    course_title: course?.title || '',
    uploader_name: db.find('users', m.uploader_id)?.full_name || 'Unknown',
  };
  // Links are only shared with signed-in students.
  if (!viewer) delete view.url;
  return view;
}

export function applicationView(a) {
  const u = db.find('users', a.user_id);
  return {
    ...a,
    applicant: userView(u),
    courses: a.courses.map(({ course_id, grade }) => {
      const c = db.find('courses', course_id);
      return { id: course_id, code: c?.code || '', title: c?.title || 'Removed course', grade };
    }),
  };
}

export function reviewView(r, { admin = false } = {}) {
  const s = db.find('sessions', r.session_id);
  const course = s ? db.find('courses', s.course_id) : null;
  const learner = db.find('users', r.learner_id);
  const base = {
    id: r.id,
    tutor_id: r.tutor_id,
    rating: r.rating,
    comment: r.comment,
    created_at: r.created_at,
    course_code: course?.code || '',
    learner_name: shortName(learner?.full_name),
  };
  if (!admin) return base;
  return { ...base, status: r.status, learner_name: learner?.full_name || '', tutor_name: db.find('users', r.tutor_id)?.full_name || '' };
}

export function reportView(r) {
  const view = { ...r, reporter_name: db.find('users', r.reporter_id)?.full_name || 'Unknown' };
  if (r.target_type === 'review') {
    const rev = db.find('reviews', r.target_id);
    Object.assign(view, {
      target_label: rev ? `Review of ${db.find('users', rev.tutor_id)?.full_name} (${rev.rating}★)` : 'Deleted review',
      target_excerpt: rev?.comment || '',
      target_status: rev?.status || 'deleted',
    });
  } else if (r.target_type === 'material') {
    const m = db.find('materials', r.target_id);
    Object.assign(view, {
      target_label: m ? `Material: ${m.title}` : 'Deleted material',
      target_excerpt: m?.description || '',
      target_status: m?.status || 'deleted',
    });
  } else {
    const u = db.find('users', r.target_id);
    Object.assign(view, {
      target_label: u ? `User: ${u.full_name} (${u.role})` : 'Deleted user',
      target_excerpt: u?.email || '',
      target_status: u?.status || 'deleted',
    });
  }
  return view;
}

/** Local "HH:MM" of a Date. */
export const hm = (date) => date.toTimeString().slice(0, 5);
