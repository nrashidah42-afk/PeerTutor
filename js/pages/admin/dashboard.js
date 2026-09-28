import { adminService } from '../../services/adminService.js';
import { dashboardShell } from '../../components/dashboardShell.js';
import { esc, loader, statCard, avatar, timeAgo, labelize, badge } from '../../components/ui.js';
import { icon } from '../../components/icons.js';

const SESSION_TONES = { requested: 'warning', accepted: 'info', completed: 'success', declined: 'danger', cancelled: 'neutral' };

export async function render(el) {
  el.innerHTML = dashboardShell({
    role: 'admin',
    active: '/admin',
    title: 'Platform overview',
    subtitle: 'Health of the PeerTutor community at a glance.',
    content: loader(),
  });
  const content = el.querySelector('#dash-content');
  const stats = await adminService.stats();
  const statusRows = Object.entries(stats.sessions).filter(([k]) => k !== 'total');
  const maxCourse = Math.max(1, ...stats.top_courses.map((c) => c.sessions));

  content.innerHTML = `
    <div class="stat-grid">
      ${statCard('users', `Users (${stats.users.learners} learners)`, stats.users.total, { href: '/admin/users' })}
      ${statCard('cap', 'Verified tutors', stats.users.tutors, { tone: 'success', href: '/admin/users?role=tutor' })}
      ${statCard('shieldCheck', 'Pending applications', stats.pending_applications, { tone: 'warning', href: '/admin/applications' })}
      ${statCard('flag', 'Open reports', stats.open_reports, { tone: stats.open_reports ? 'danger' : 'neutral', href: '/admin/moderation' })}
    </div>

    ${stats.pending_applications ? `
      <div class="banner banner-info">${icon('shieldCheck')}
        <div><strong>${stats.pending_applications} tutor application${stats.pending_applications > 1 ? 's' : ''} waiting for verification.</strong></div>
        <a class="btn btn-primary btn-sm" href="#/admin/applications">Review now</a>
      </div>` : ''}

    <div class="dash-grid">
      <section class="card">
        <div class="card-head"><h2>Sessions by status</h2><span class="muted small">${stats.sessions.total} total</span></div>
        <ul class="bar-list">
          ${statusRows.map(([status, n]) => `
            <li>
              <span class="bar-label">${badge(labelize(status), SESSION_TONES[status])}</span>
              <span class="bar-track"><span class="bar-fill tone-${SESSION_TONES[status]}" style="width:${stats.sessions.total ? (n / stats.sessions.total) * 100 : 0}%"></span></span>
              <span class="bar-value">${n}</span>
            </li>`).join('')}
        </ul>
      </section>

      <section class="card">
        <div class="card-head"><h2>Most-requested courses</h2></div>
        <ul class="bar-list">
          ${stats.top_courses.map((c) => `
            <li>
              <span class="bar-label"><span class="course-code">${esc(c.code)}</span></span>
              <span class="bar-track" title="${esc(c.title)}"><span class="bar-fill" style="width:${(c.sessions / maxCourse) * 100}%"></span></span>
              <span class="bar-value">${c.sessions}</span>
            </li>`).join('')}
        </ul>
      </section>

      <section class="card">
        <div class="card-head"><h2>Community quality</h2></div>
        <dl class="detail-list">
          <div><dt>Average rating</dt><dd><strong>${stats.avg_rating || '–'}★</strong> from ${stats.reviews} visible reviews</dd></div>
          <div><dt>Learning materials</dt><dd>${stats.materials}</dd></div>
          <div><dt>Suspended accounts</dt><dd>${stats.users.suspended}</dd></div>
          <div><dt>Administrators</dt><dd>${stats.users.admins}</dd></div>
        </dl>
      </section>

      <section class="card">
        <div class="card-head"><h2>Newest members</h2><a class="small" href="#/admin/users">All users</a></div>
        <ul class="plain-list">
          ${stats.recent_users.map((u) => `
            <li class="list-row">
              ${avatar(u.full_name, 'sm')}
              <div class="min-w-0 grow">
                <strong>${esc(u.full_name)}</strong>
                <p class="small muted truncate">${esc(u.programme || u.university_name)}</p>
              </div>
              <span class="small muted nowrap">${timeAgo(u.created_at)}</span>
            </li>`).join('')}
        </ul>
      </section>
    </div>`;
}
