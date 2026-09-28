/** Learning materials shared by tutors. */
import { db } from '../db.js';
import { HttpError, requireRole, requireUser, required, assert, isUrl, now, byNewest } from '../utils.js';
import { materialView } from '../queries.js';

export const MATERIAL_TYPES = ['notes', 'past_paper', 'slides', 'video', 'link'];

function filterMaterials(list, query) {
  if (query.course_id) list = list.filter((m) => m.course_id === Number(query.course_id));
  if (query.uploader_id) list = list.filter((m) => m.uploader_id === Number(query.uploader_id));
  if (query.type) list = list.filter((m) => m.type === query.type);
  return list;
}

export default [
  ['GET', '/materials', ({ query, user }) => {
    let views = filterMaterials(db.where('materials', (m) => m.status === 'published'), query)
      .sort(query.sort === 'popular' ? (a, b) => b.downloads - a.downloads : byNewest)
      .map((m) => materialView(m, user));
    if (query.q) {
      const q = query.q.trim().toLowerCase();
      views = views.filter((m) => [m.title, m.description, m.course_code, m.course_title].join(' ').toLowerCase().includes(q));
    }
    return views;
  }],

  ['GET', '/me/materials', ({ user }) => {
    requireRole(user, 'tutor');
    return db.where('materials', (m) => m.uploader_id === user.id).sort(byNewest).map((m) => materialView(m, user));
  }],

  ['POST', '/materials', ({ body, user }) => {
    requireRole(user, 'tutor');
    required(body, ['course_id', 'title', 'type', 'url']);
    assert(MATERIAL_TYPES.includes(body.type), 422, 'Choose a valid material type.');
    assert(isUrl(body.url), 422, 'Enter a link starting with http:// or https://');
    const courseId = Number(body.course_id);
    assert(
      db.all('tutor_courses').some((tc) => tc.tutor_id === user.id && tc.course_id === courseId),
      422,
      'You can only share materials for courses you tutor.',
    );
    const m = db.insert('materials', {
      uploader_id: user.id,
      course_id: courseId,
      title: String(body.title).trim().slice(0, 150),
      type: body.type,
      url: String(body.url).trim(),
      description: String(body.description || '').trim().slice(0, 500),
      downloads: 0,
      status: 'published',
      created_at: now(),
    });
    return materialView(m, user);
  }],

  ['DELETE', '/materials/:id', ({ params, user }) => {
    requireUser(user);
    const m = db.find('materials', params.id);
    if (!m) throw new HttpError(404, 'Material not found.');
    assert(m.uploader_id === user.id || user.role === 'admin', 403, 'You can only delete your own materials.');
    db.remove('reports', (r) => r.target_type === 'material' && r.target_id === m.id);
    db.remove('materials', (x) => x.id === m.id);
    return { ok: true };
  }],

  // Records an access and returns the link. With real file storage this would return a signed download URL.
  ['POST', '/materials/:id/open', ({ params, user }) => {
    requireUser(user);
    const m = db.find('materials', params.id);
    assert(m && (m.status === 'published' || m.uploader_id === user.id || user.role === 'admin'), 404, 'Material not found.');
    m.downloads += 1;
    db.save();
    return { url: m.url };
  }],

  ['GET', '/admin/materials', ({ query, user }) => {
    requireRole(user, 'admin');
    return filterMaterials(db.all('materials'), query)
      .filter((m) => !query.status || m.status === query.status)
      .sort(byNewest)
      .map((m) => materialView(m, user));
  }],

  ['PATCH', '/admin/materials/:id', ({ params, body, user }) => {
    requireRole(user, 'admin');
    assert(['published', 'hidden'].includes(body.status), 422, 'Status must be published or hidden.');
    const m = db.update('materials', params.id, { status: body.status });
    assert(m, 404, 'Material not found.');
    return materialView(m, user);
  }],
];
