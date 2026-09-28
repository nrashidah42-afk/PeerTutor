/** Tutoring session requests and their lifecycle. */
import { db } from '../db.js';
import { HttpError, requireUser, requireRole, required, assert, now, DAYS } from '../utils.js';
import { sessionView, isActiveTutor, profileOf, hm } from '../queries.js';

const DURATIONS = [30, 60, 90, 120];

// Who may move a session from one status to another.
const TRANSITIONS = {
  tutor: { requested: ['accepted', 'declined'], accepted: ['completed', 'cancelled'] },
  learner: { requested: ['cancelled'], accepted: ['cancelled'] },
};

const overlaps = (aStart, aMins, bStart, bMins) =>
  aStart < bStart + bMins * 60000 && bStart < aStart + aMins * 60000;

export default [
  ['POST', '/sessions', ({ body, user }) => {
    requireRole(user, 'learner', 'tutor');
    required(body, ['tutor_id', 'course_id', 'scheduled_at', 'duration_minutes']);

    const tutorId = Number(body.tutor_id);
    assert(isActiveTutor(tutorId), 404, 'This tutor is not currently available.');
    assert(tutorId !== user.id, 422, 'You cannot book a session with yourself.');

    const courseId = Number(body.course_id);
    assert(db.all('tutor_courses').some((tc) => tc.tutor_id === tutorId && tc.course_id === courseId), 422, 'This tutor does not teach that course.');

    const start = new Date(body.scheduled_at);
    assert(!Number.isNaN(start.getTime()), 422, 'Choose a valid date and time.');
    assert(start > new Date(), 422, 'Choose a time in the future.');

    const duration = Number(body.duration_minutes);
    assert(DURATIONS.includes(duration), 422, 'Choose a valid session length.');
    const end = new Date(start.getTime() + duration * 60000);

    // Must fit inside one of the tutor's weekly availability slots (tutor's local time).
    const day = start.getDay();
    const fits = end.getDay() === day && db.all('availability').some(
      (a) => a.tutor_id === tutorId && a.day_of_week === day && a.start_time <= hm(start) && hm(end) <= a.end_time,
    );
    assert(fits, 422, `The tutor is not available then. Check their ${DAYS[day]} availability.`);

    const clash = db.all('sessions').some(
      (s) => s.tutor_id === tutorId && ['requested', 'accepted'].includes(s.status) &&
        overlaps(new Date(s.scheduled_at).getTime(), s.duration_minutes, start.getTime(), duration),
    );
    assert(!clash, 409, 'The tutor already has a session at that time. Please pick another slot.');

    const profile = profileOf(tutorId);
    const mode = body.mode || (profile.mode === 'in_person' ? 'in_person' : 'online');
    assert(profile.mode === 'both' || profile.mode === mode, 422, 'This tutor does not offer that session mode.');

    const session = db.insert('sessions', {
      learner_id: user.id,
      tutor_id: tutorId,
      course_id: courseId,
      topic: String(body.topic || '').trim().slice(0, 120),
      scheduled_at: start.toISOString(),
      duration_minutes: duration,
      mode,
      message: String(body.message || '').trim().slice(0, 500),
      fee: Math.round((profile.fee * duration) / 60),
      status: 'requested',
      tutor_note: '',
      created_at: now(),
      updated_at: now(),
    });
    return sessionView(session);
  }],

  ['GET', '/me/sessions', ({ query, user }) => {
    requireUser(user);
    const asTutor = query.as === 'tutor';
    if (asTutor) requireRole(user, 'tutor');
    const statuses = query.status ? query.status.split(',') : null;
    return db
      .where('sessions', (s) => (asTutor ? s.tutor_id : s.learner_id) === user.id)
      .filter((s) => !statuses || statuses.includes(s.status))
      .sort((a, b) => b.scheduled_at.localeCompare(a.scheduled_at))
      .map(sessionView);
  }],

  ['PATCH', '/sessions/:id', ({ params, body, user }) => {
    requireUser(user);
    const s = db.find('sessions', params.id);
    if (!s) throw new HttpError(404, 'Session not found.');
    const who = s.tutor_id === user.id ? 'tutor' : s.learner_id === user.id ? 'learner' : null;
    assert(who, 403, 'This is not your session.');

    const next = body.status;
    assert(TRANSITIONS[who][s.status]?.includes(next), 422, `You cannot change a ${s.status} session to ${next}.`);
    if (next === 'completed') {
      assert(new Date(s.scheduled_at) <= new Date(), 422, 'A session can only be marked completed after it has started.');
    }
    const note = String(body.note || '').trim().slice(0, 500);
    db.update('sessions', s.id, {
      status: next,
      tutor_note: who === 'tutor' && note ? note : s.tutor_note,
      updated_at: now(),
    });
    return sessionView(s);
  }],
];
