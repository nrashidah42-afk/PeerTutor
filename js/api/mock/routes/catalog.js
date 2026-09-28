/** Universities, programmes, courses and topics – the academic catalogue. */
import { db } from '../db.js';
import { HttpError, requireRole, required, assert } from '../utils.js';
import { courseView, isActiveTutor, ratingFor } from '../queries.js';

const toBool = (v) => v === true || v === 'true' || v === '1' || v === 1 || v === 'on';

function parseTopics(value) {
  const list = Array.isArray(value) ? value : String(value || '').split(/[,\n]/);
  return [...new Set(list.map((t) => String(t).trim()).filter(Boolean))];
}

function saveTopics(courseId, topics) {
  db.remove('topics', (t) => t.course_id === courseId);
  topics.forEach((name) => db.insert('topics', { course_id: courseId, name }));
}

function validateCourse(body, existingId) {
  required(body, ['university_id', 'code', 'title']);
  const uni = db.find('universities', body.university_id);
  assert(uni, 422, 'University not found.');
  const programmeId = body.programme_id ? Number(body.programme_id) : null;
  if (programmeId) {
    const prog = db.find('programmes', programmeId);
    assert(prog && prog.university_id === uni.id, 422, 'Programme does not belong to this university.');
  }
  const code = String(body.code).trim().toUpperCase();
  assert(
    !db.all('courses').some((c) => c.university_id === uni.id && c.code === code && c.id !== existingId),
    409,
    `${code} already exists at ${uni.short_name}.`,
  );
  return {
    university_id: uni.id,
    programme_id: programmeId,
    code,
    title: String(body.title).trim(),
    year: Math.min(Math.max(Number(body.year) || 1, 1), 7),
    semester: Number(body.semester) === 2 ? 2 : 1,
  };
}

export default [
  ['GET', '/stats', () => {
    const tutors = db.all('users').filter((u) => isActiveTutor(u.id));
    const rated = tutors.map((t) => ratingFor(t.id)).filter((r) => r.review_count);
    const avg = rated.length ? rated.reduce((s, r) => s + r.rating, 0) / rated.length : 0;
    return {
      tutors: tutors.length,
      courses: db.all('courses').length,
      sessions_completed: db.where('sessions', (s) => s.status === 'completed').length,
      avg_rating: Math.round(avg * 10) / 10,
      universities: db.where('universities', (u) => u.is_active).length,
    };
  }],

  // Universities
  ['GET', '/universities', ({ query, user }) => {
    const includeInactive = query.all && user?.role === 'admin';
    return db
      .where('universities', (u) => u.is_active || includeInactive)
      .map((u) => ({ ...u, programme_count: db.where('programmes', (p) => p.university_id === u.id).length }));
  }],

  ['POST', '/universities', ({ body, user }) => {
    requireRole(user, 'admin');
    required(body, ['name', 'short_name', 'email_domain']);
    return db.insert('universities', {
      name: String(body.name).trim(),
      short_name: String(body.short_name).trim(),
      email_domain: String(body.email_domain).trim().toLowerCase().replace(/^@/, ''),
      city: String(body.city || '').trim(),
      is_active: body.is_active === undefined ? true : toBool(body.is_active),
    });
  }],

  ['PUT', '/universities/:id', ({ params, body, user }) => {
    requireRole(user, 'admin');
    const uni = db.find('universities', params.id);
    assert(uni, 404, 'University not found.');
    required(body, ['name', 'short_name', 'email_domain']);
    return db.update('universities', uni.id, {
      name: String(body.name).trim(),
      short_name: String(body.short_name).trim(),
      email_domain: String(body.email_domain).trim().toLowerCase().replace(/^@/, ''),
      city: String(body.city || '').trim(),
      is_active: toBool(body.is_active),
    });
  }],

  // Programmes
  ['GET', '/programmes', ({ query }) =>
    db
      .where('programmes', (p) => !query.university_id || p.university_id === Number(query.university_id))
      .map((p) => ({ ...p, course_count: db.where('courses', (c) => c.programme_id === p.id).length })),
  ],

  ['POST', '/programmes', ({ body, user }) => {
    requireRole(user, 'admin');
    required(body, ['university_id', 'code', 'name']);
    assert(db.find('universities', body.university_id), 422, 'University not found.');
    return db.insert('programmes', {
      university_id: Number(body.university_id),
      code: String(body.code).trim().toUpperCase(),
      name: String(body.name).trim(),
    });
  }],

  ['DELETE', '/programmes/:id', ({ params, user }) => {
    requireRole(user, 'admin');
    const id = Number(params.id);
    assert(db.find('programmes', id), 404, 'Programme not found.');
    assert(!db.all('courses').some((c) => c.programme_id === id), 409, 'Move or delete this programme’s courses first.');
    assert(!db.all('users').some((u) => u.programme_id === id), 409, 'Students are enrolled in this programme.');
    db.remove('programmes', (p) => p.id === id);
    return { ok: true };
  }],

  // Courses
  ['GET', '/courses', ({ query }) => {
    let list = db.all('courses');
    if (query.university_id) list = list.filter((c) => c.university_id === Number(query.university_id));
    if (query.programme_id) {
      const pid = Number(query.programme_id);
      list = list.filter((c) => c.programme_id === pid || c.programme_id === null);
    }
    if (query.year) list = list.filter((c) => c.year === Number(query.year));
    let views = list.map(courseView);
    if (query.q) {
      const q = query.q.trim().toLowerCase();
      views = views.filter((c) =>
        [c.code, c.title, c.programme, ...c.topics.map((t) => t.name)].join(' ').toLowerCase().includes(q),
      );
    }
    views.sort(query.sort === 'popular'
      ? (a, b) => b.tutor_count - a.tutor_count || a.code.localeCompare(b.code)
      : (a, b) => a.code.localeCompare(b.code));
    if (query.limit) views = views.slice(0, Number(query.limit));
    return views;
  }],

  ['GET', '/courses/:id', ({ params }) => {
    const course = db.find('courses', params.id);
    if (!course) throw new HttpError(404, 'Course not found.');
    return courseView(course);
  }],

  ['POST', '/courses', ({ body, user }) => {
    requireRole(user, 'admin');
    const course = db.insert('courses', validateCourse(body));
    saveTopics(course.id, parseTopics(body.topics));
    return courseView(course);
  }],

  ['PUT', '/courses/:id', ({ params, body, user }) => {
    requireRole(user, 'admin');
    const course = db.find('courses', params.id);
    assert(course, 404, 'Course not found.');
    db.update('courses', course.id, validateCourse(body, course.id));
    saveTopics(course.id, parseTopics(body.topics));
    return courseView(course);
  }],

  ['DELETE', '/courses/:id', ({ params, user }) => {
    requireRole(user, 'admin');
    const id = Number(params.id);
    assert(db.find('courses', id), 404, 'Course not found.');
    assert(!db.all('sessions').some((s) => s.course_id === id), 409, 'This course has tutoring sessions and cannot be deleted.');
    assert(!db.all('materials').some((m) => m.course_id === id), 409, 'Remove this course’s materials first.');
    db.remove('topics', (t) => t.course_id === id);
    db.remove('tutor_courses', (tc) => tc.course_id === id);
    db.remove('courses', (c) => c.id === id);
    return { ok: true };
  }],
];
