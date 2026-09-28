/** Platform statistics, user management and content reports. */
import { db } from '../db.js';
import { HttpError, requireRole, requireUser, required, assert, now, byNewest } from '../utils.js';
import { userView, profileOf, reportView, ratingFor } from '../queries.js';

const REPORT_TARGETS = { review: 'reviews', material: 'materials', user: 'users' };

export default [
  ['GET', '/admin/stats', ({ user }) => {
    requireRole(user, 'admin');
    const users = db.all('users');
    const sessions = db.all('sessions');
    const countBy = (list, key) => list.reduce((acc, x) => ({ ...acc, [x[key]]: (acc[x[key]] || 0) + 1 }), {});
    const sessionCounts = countBy(sessions, 'status');
    const courseCounts = countBy(sessions, 'course_id');
    const visibleReviews = db.where('reviews', (r) => r.status === 'visible');

    return {
      users: {
        total: users.length,
        learners: users.filter((u) => u.role === 'learner').length,
        tutors: users.filter((u) => u.role === 'tutor').length,
        admins: users.filter((u) => u.role === 'admin').length,
        suspended: users.filter((u) => u.status === 'suspended').length,
      },
      sessions: {
        total: sessions.length,
        requested: sessionCounts.requested || 0,
        accepted: sessionCounts.accepted || 0,
        completed: sessionCounts.completed || 0,
        declined: sessionCounts.declined || 0,
        cancelled: sessionCounts.cancelled || 0,
      },
      pending_applications: db.where('applications', (a) => a.status === 'pending').length,
      open_reports: db.where('reports', (r) => r.status === 'open').length,
      materials: db.all('materials').length,
      reviews: visibleReviews.length,
      avg_rating: visibleReviews.length
        ? Math.round((visibleReviews.reduce((s, r) => s + r.rating, 0) / visibleReviews.length) * 10) / 10
        : 0,
      top_courses: Object.entries(courseCounts)
        .map(([courseId, count]) => {
          const c = db.find('courses', courseId);
          return { id: Number(courseId), code: c?.code || '', title: c?.title || '', sessions: count };
        })
        .sort((a, b) => b.sessions - a.sessions)
        .slice(0, 5),
      recent_users: [...users].sort(byNewest).slice(0, 5).map(userView),
    };
  }],

  ['GET', '/admin/users', ({ query, user }) => {
    requireRole(user, 'admin');
    let list = db.all('users');
    if (query.role) list = list.filter((u) => u.role === query.role);
    if (query.status) list = list.filter((u) => u.status === query.status);
    if (query.q) {
      const q = query.q.trim().toLowerCase();
      list = list.filter((u) => `${u.full_name} ${u.email}`.toLowerCase().includes(q));
    }
    return [...list].sort(byNewest).map((u) => ({
      ...userView(u),
      sessions_count: db.where('sessions', (s) => s.learner_id === u.id || s.tutor_id === u.id).length,
      ...(u.role === 'tutor' ? ratingFor(u.id) : {}),
    }));
  }],

  ['PATCH', '/admin/users/:id', ({ params, body, user }) => {
    requireRole(user, 'admin');
    const target = db.find('users', params.id);
    if (!target) throw new HttpError(404, 'User not found.');
    assert(target.id !== user.id, 422, 'You cannot change your own account here.');

    if (body.status !== undefined) {
      assert(['active', 'suspended'].includes(body.status), 422, 'Status must be active or suspended.');
      db.update('users', target.id, { status: body.status });
    }
    if (body.role !== undefined) {
      const profile = profileOf(target.id);
      if (body.role === 'learner' && target.role === 'tutor') {
        db.update('users', target.id, { role: 'learner' });
        if (profile) db.update('tutor_profiles', profile.id, { is_verified: false });
      } else if (body.role === 'tutor' && target.role === 'learner') {
        assert(profile, 422, 'This student has no tutor profile. Approve a tutor application instead.');
        db.update('users', target.id, { role: 'tutor' });
        db.update('tutor_profiles', profile.id, { is_verified: true, verified_at: now() });
      } else {
        throw new HttpError(422, 'That role change is not supported.');
      }
    }
    return userView(target);
  }],

  // Reports can be filed by any signed-in user
  ['POST', '/reports', ({ body, user }) => {
    requireUser(user);
    required(body, ['target_type', 'target_id', 'reason']);
    const table = REPORT_TARGETS[body.target_type];
    assert(table, 422, 'You can report reviews, materials or users.');
    const targetId = Number(body.target_id);
    assert(db.find(table, targetId), 404, 'The item you are reporting no longer exists.');
    assert(
      !db.all('reports').some((r) => r.reporter_id === user.id && r.target_type === body.target_type && r.target_id === targetId && r.status === 'open'),
      409,
      'You have already reported this. Our team will review it.',
    );
    return db.insert('reports', {
      reporter_id: user.id,
      target_type: body.target_type,
      target_id: targetId,
      reason: String(body.reason).trim().slice(0, 500),
      status: 'open',
      resolved_by: null,
      resolved_at: null,
      created_at: now(),
    });
  }],

  ['GET', '/admin/reports', ({ query, user }) => {
    requireRole(user, 'admin');
    return db
      .where('reports', (r) => !query.status || r.status === query.status)
      .sort(byNewest)
      .map(reportView);
  }],

  ['PATCH', '/admin/reports/:id', ({ params, body, user }) => {
    requireRole(user, 'admin');
    assert(['open', 'resolved', 'dismissed'].includes(body.status), 422, 'Invalid report status.');
    const r = db.update('reports', params.id, {
      status: body.status,
      resolved_by: body.status === 'open' ? null : user.id,
      resolved_at: body.status === 'open' ? null : now(),
    });
    assert(r, 404, 'Report not found.');
    return reportView(r);
  }],

  // Development helper – not part of the production API.
  ['POST', '/dev/reset', () => {
    db.reset();
    return { ok: true };
  }],
];
