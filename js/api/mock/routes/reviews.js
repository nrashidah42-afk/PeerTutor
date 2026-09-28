import { db } from '../db.js';
import { requireRole, requireUser, required, assert, now, byNewest } from '../utils.js';
import { reviewView } from '../queries.js';

export default [
  ['GET', '/tutors/:id/reviews', ({ params }) =>
    db
      .where('reviews', (r) => r.tutor_id === Number(params.id) && r.status === 'visible')
      .sort(byNewest)
      .map((r) => reviewView(r)),
  ],

  ['POST', '/reviews', ({ body, user }) => {
    requireUser(user);
    required(body, ['session_id', 'rating']);
    const s = db.find('sessions', body.session_id);
    assert(s && s.learner_id === user.id, 404, 'Session not found.');
    assert(s.status === 'completed', 422, 'You can review a session once it is completed.');
    assert(!db.all('reviews').some((r) => r.session_id === s.id), 409, 'You have already reviewed this session.');
    const rating = Number(body.rating);
    assert(Number.isInteger(rating) && rating >= 1 && rating <= 5, 422, 'Rating must be between 1 and 5 stars.');
    const review = db.insert('reviews', {
      session_id: s.id,
      learner_id: user.id,
      tutor_id: s.tutor_id,
      rating,
      comment: String(body.comment || '').trim().slice(0, 1000),
      status: 'visible',
      created_at: now(),
    });
    return reviewView(review);
  }],

  ['GET', '/admin/reviews', ({ query, user }) => {
    requireRole(user, 'admin');
    return db
      .where('reviews', (r) => !query.status || r.status === query.status)
      .sort(byNewest)
      .map((r) => reviewView(r, { admin: true }));
  }],

  ['PATCH', '/admin/reviews/:id', ({ params, body, user }) => {
    requireRole(user, 'admin');
    assert(['visible', 'hidden'].includes(body.status), 422, 'Status must be visible or hidden.');
    const r = db.update('reviews', params.id, { status: body.status });
    assert(r, 404, 'Review not found.');
    return reviewView(r, { admin: true });
  }],
];
