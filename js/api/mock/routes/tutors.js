/** Public tutor search/profiles and the signed-in tutor's own profile, courses and availability. */
import { db } from '../db.js';
import { HttpError, requireRole, required, assert, DAYS, MODES } from '../utils.js';
import { tutorSummary, isActiveTutor, profileOf, userView, topicsOf } from '../queries.js';

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const bySlot = (a, b) => a.day_of_week - b.day_of_week || a.start_time.localeCompare(b.start_time);

const SORTS = {
  rating: (a, b) => b.rating - a.rating || b.review_count - a.review_count,
  fee_low: (a, b) => a.fee - b.fee || b.rating - a.rating,
  fee_high: (a, b) => b.fee - a.fee || b.rating - a.rating,
  sessions: (a, b) => b.sessions_completed - a.sessions_completed,
  newest: (a, b) => b.created_at.localeCompare(a.created_at),
};

function searchableText(t) {
  const topics = t.courses.flatMap((c) => topicsOf(c.id).map((x) => x.name));
  return [t.full_name, t.headline, t.programme, ...t.courses.flatMap((c) => [c.code, c.title]), ...topics]
    .join(' ')
    .toLowerCase();
}

function tutorDetail(id) {
  const u = db.find('users', id);
  if (!u || !isActiveTutor(u.id)) throw new HttpError(404, 'Tutor not found.');
  const p = profileOf(u.id);
  const courses = db
    .where('tutor_courses', (tc) => tc.tutor_id === u.id)
    .map((tc) => {
      const c = db.find('courses', tc.course_id);
      return c && { id: c.id, code: c.code, title: c.title, grade: tc.grade, topics: topicsOf(c.id).map((t) => t.name) };
    })
    .filter(Boolean);
  const availability = db
    .where('availability', (a) => a.tutor_id === u.id)
    .sort(bySlot)
    .map(({ id: slotId, day_of_week, start_time, end_time }) => ({ id: slotId, day_of_week, start_time, end_time }));
  return { ...tutorSummary(u), university_name: userView(u).university_name, bio: p.bio, courses, availability };
}

export default [
  ['GET', '/tutors', ({ query }) => {
    const num = (key) => Number(query[key]);
    let list = db.where('users', (u) => isActiveTutor(u.id)).map(tutorSummary);

    if (query.university_id) list = list.filter((t) => t.university_id === num('university_id'));
    if (query.programme_id) {
      const pid = num('programme_id');
      list = list.filter((t) => t.programme_id === pid || t.courses.some((c) => c.programme_id === pid));
    }
    if (query.course_id) list = list.filter((t) => t.courses.some((c) => c.id === num('course_id')));
    if (query.day !== undefined && query.day !== '') list = list.filter((t) => t.availability_days.includes(num('day')));
    if (query.mode) list = list.filter((t) => t.mode === query.mode || t.mode === 'both');
    if (query.free_only) list = list.filter((t) => t.fee === 0);
    if (query.max_fee !== undefined && query.max_fee !== '') list = list.filter((t) => t.fee <= num('max_fee'));
    if (query.q) {
      const q = query.q.trim().toLowerCase();
      list = list.filter((t) => searchableText(t).includes(q));
    }

    list.sort(SORTS[query.sort] || SORTS.rating);
    if (query.limit) list = list.slice(0, num('limit'));
    return list;
  }],

  ['GET', '/tutors/:id', ({ params }) => tutorDetail(params.id)],

  // The signed-in tutor's editable profile
  ['GET', '/me/tutor-profile', ({ user }) => {
    requireRole(user, 'tutor');
    const p = profileOf(user.id);
    assert(p, 404, 'Tutor profile not found.');
    return {
      ...p,
      courses: db.where('tutor_courses', (tc) => tc.tutor_id === user.id).map(({ course_id, grade }) => ({ course_id, grade })),
      availability: db.where('availability', (a) => a.tutor_id === user.id).sort(bySlot),
    };
  }],

  ['PUT', '/me/tutor-profile', ({ body, user }) => {
    requireRole(user, 'tutor');
    required(body, ['headline', 'mode']);
    const fee = Number(body.fee || 0);
    assert(String(body.headline).length <= 120, 422, 'Headline must be 120 characters or fewer.');
    assert(String(body.bio || '').length <= 2000, 422, 'Bio must be 2000 characters or fewer.');
    assert(Number.isFinite(fee) && fee >= 0 && fee <= 500000, 422, 'Enter a fee between 0 and 500,000.');
    assert(MODES.includes(body.mode), 422, 'Choose a valid session mode.');
    const p = profileOf(user.id);
    return db.update('tutor_profiles', p.id, {
      headline: String(body.headline).trim(),
      bio: String(body.bio || '').trim(),
      fee: Math.round(fee),
      mode: body.mode,
      location: String(body.location || '').trim(),
    });
  }],

  ['PUT', '/me/tutor-courses', ({ body, user }) => {
    requireRole(user, 'tutor');
    const courses = Array.isArray(body.courses) ? body.courses : [];
    assert(courses.length > 0, 422, 'Select at least one course you can tutor.');
    for (const { course_id } of courses) {
      const c = db.find('courses', course_id);
      assert(c && c.university_id === user.university_id, 422, 'You can only tutor courses offered at your university.');
    }
    db.remove('tutor_courses', (tc) => tc.tutor_id === user.id);
    courses.forEach(({ course_id, grade }) =>
      db.insert('tutor_courses', { tutor_id: user.id, course_id: Number(course_id), grade: String(grade || '').slice(0, 3) }),
    );
    return db.where('tutor_courses', (tc) => tc.tutor_id === user.id);
  }],

  ['PUT', '/me/availability', ({ body, user }) => {
    requireRole(user, 'tutor');
    const slots = (Array.isArray(body.slots) ? body.slots : []).map((s) => ({
      day_of_week: Number(s.day_of_week),
      start_time: String(s.start_time),
      end_time: String(s.end_time),
    }));
    for (const s of slots) {
      assert(Number.isInteger(s.day_of_week) && s.day_of_week >= 0 && s.day_of_week <= 6, 422, 'Invalid day of week.');
      assert(TIME_RE.test(s.start_time) && TIME_RE.test(s.end_time), 422, 'Times must use the HH:MM format.');
      assert(s.start_time < s.end_time, 422, 'Each time slot must end after it starts.');
    }
    slots.sort(bySlot);
    for (let i = 1; i < slots.length; i++) {
      const prev = slots[i - 1];
      const cur = slots[i];
      assert(!(prev.day_of_week === cur.day_of_week && prev.end_time > cur.start_time), 422, `Your ${DAYS[cur.day_of_week]} slots overlap.`);
    }
    db.remove('availability', (a) => a.tutor_id === user.id);
    slots.forEach((s) => db.insert('availability', { tutor_id: user.id, ...s }));
    return db.where('availability', (a) => a.tutor_id === user.id).sort(bySlot);
  }],
];
