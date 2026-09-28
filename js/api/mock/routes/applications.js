/** "Become a tutor" applications and admin verification. */
import { db } from '../db.js';
import { HttpError, requireRole, requireUser, required, assert, isUrl, now, byNewest, MODES } from '../utils.js';
import { applicationView, profileOf } from '../queries.js';

export default [
  ['GET', '/me/application', ({ user }) => {
    requireUser(user);
    const [latest] = db.where('applications', (a) => a.user_id === user.id).sort(byNewest);
    return latest ? applicationView(latest) : null;
  }],

  ['POST', '/applications', ({ body, user }) => {
    requireRole(user, 'learner');
    assert(
      !db.all('applications').some((a) => a.user_id === user.id && a.status === 'pending'),
      409,
      'You already have an application under review.',
    );
    required(body, ['headline', 'motivation', 'evidence_url', 'mode']);
    assert(String(body.motivation).trim().length >= 50, 422, 'Tell us a little more about why you want to tutor (at least 50 characters).');
    assert(isUrl(body.evidence_url), 422, 'Results link must start with http:// or https://');
    assert(MODES.includes(body.mode), 422, 'Choose a valid session mode.');
    const fee = Number(body.fee || 0);
    assert(Number.isFinite(fee) && fee >= 0 && fee <= 500000, 422, 'Enter a fee between 0 and 500,000.');

    const courses = Array.isArray(body.courses) ? body.courses : [];
    assert(courses.length > 0, 422, 'Select at least one course you want to tutor.');
    for (const { course_id } of courses) {
      const c = db.find('courses', course_id);
      assert(c && c.university_id === user.university_id, 422, 'You can only tutor courses offered at your university.');
    }

    const app = db.insert('applications', {
      user_id: user.id,
      headline: String(body.headline).trim().slice(0, 120),
      motivation: String(body.motivation).trim().slice(0, 2000),
      courses: courses.map(({ course_id, grade }) => ({ course_id: Number(course_id), grade: String(grade || '') })),
      evidence_url: String(body.evidence_url).trim(),
      fee: Math.round(fee),
      mode: body.mode,
      status: 'pending',
      admin_note: '',
      reviewed_by: null,
      reviewed_at: null,
      created_at: now(),
    });
    return applicationView(app);
  }],

  ['GET', '/admin/applications', ({ query, user }) => {
    requireRole(user, 'admin');
    return db
      .where('applications', (a) => !query.status || a.status === query.status)
      .sort(byNewest)
      .map(applicationView);
  }],

  ['PATCH', '/admin/applications/:id', ({ params, body, user }) => {
    requireRole(user, 'admin');
    const app = db.find('applications', params.id);
    if (!app) throw new HttpError(404, 'Application not found.');
    assert(app.status === 'pending', 409, 'This application has already been reviewed.');
    assert(['approved', 'rejected'].includes(body.status), 422, 'Decision must be approved or rejected.');
    if (body.status === 'rejected') required(body, ['admin_note']);

    if (body.status === 'approved') {
      const applicant = db.find('users', app.user_id);
      assert(applicant && applicant.status === 'active', 422, 'The applicant’s account is not active.');
      db.update('users', applicant.id, { role: 'tutor' });

      const fields = { headline: app.headline, fee: app.fee, mode: app.mode, is_verified: true, verified_at: now() };
      const existing = profileOf(applicant.id);
      if (existing) db.update('tutor_profiles', existing.id, fields);
      else db.insert('tutor_profiles', { user_id: applicant.id, bio: app.motivation, location: '', ...fields });

      db.remove('tutor_courses', (tc) => tc.tutor_id === applicant.id);
      app.courses.forEach(({ course_id, grade }) => db.insert('tutor_courses', { tutor_id: applicant.id, course_id, grade }));
    }

    db.update('applications', app.id, {
      status: body.status,
      admin_note: String(body.admin_note || '').trim(),
      reviewed_by: user.id,
      reviewed_at: now(),
    });
    return applicationView(app);
  }],
];
