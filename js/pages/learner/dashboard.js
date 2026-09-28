import { sessionService } from '../../services/sessionService.js';
import { tutorService } from '../../services/tutorService.js';
import { applicationService } from '../../services/applicationService.js';
import { authService } from '../../services/authService.js';
import { dashboardShell } from '../../components/dashboardShell.js';
import { sessionList } from '../../components/sessionItem.js';
import { tutorCard } from '../../components/tutorCard.js';
import { openReviewModal } from '../../components/feedbackModals.js';
import { toast } from '../../components/toast.js';
import { esc, loader, emptyState, statCard, firstName, formatDate } from '../../components/ui.js';
import { icon } from '../../components/icons.js';

function applicationBanner(app, role) {
  if (role !== 'learner') return '';
  if (!app) {
    return `<div class="banner banner-accent">
      ${icon('cap')}
      <div><strong>Good at a course?</strong> Apply to become a verified tutor and help other students.</div>
      <a class="btn btn-accent btn-sm" href="#/become-tutor">Apply now</a>
    </div>`;
  }
  if (app.status === 'pending') {
    return `<div class="banner banner-info">
      ${icon('clock')}
      <div><strong>Your tutor application is under review.</strong> Submitted ${formatDate(app.created_at)}. An administrator will verify your results soon.</div>
    </div>`;
  }
  if (app.status === 'rejected') {
    return `<div class="banner banner-danger">
      ${icon('alert')}
      <div><strong>Your tutor application was not approved.</strong> ${esc(app.admin_note)}</div>
      <a class="btn btn-soft btn-sm" href="#/become-tutor">Apply again</a>
    </div>`;
  }
  return '';
}

export async function render(el, { user }) {
  el.innerHTML = dashboardShell({
    role: user.role,
    active: '/learner',
    title: `Welcome back, ${firstName(user.full_name)}`,
    subtitle: 'Your tutoring at a glance.',
    actions: `<a class="btn btn-primary" href="#/tutors">${icon('search')} Find a tutor</a>`,
    content: loader(),
  });
  const content = el.querySelector('#dash-content');

  // Pick up an approval that happened since login
  const fresh = await authService.refresh().catch(() => user);
  if (fresh.role === 'tutor' && user.role === 'learner') {
    toast('Congratulations, your tutor application was approved!');
    location.hash = '/tutor';
    return;
  }

  async function load() {
    const [sessions, application, recommended] = await Promise.all([
      sessionService.mine({ as: 'learner' }),
      user.role === 'learner' ? applicationService.mine() : null,
      tutorService.search({ programme_id: user.programme_id, sort: 'rating', limit: 4 }),
    ]);
    const now = new Date();
    const upcoming = sessions
      .filter((s) => ['requested', 'accepted'].includes(s.status) && new Date(s.scheduled_at) > now)
      .sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at));
    const completed = sessions.filter((s) => s.status === 'completed');
    const toReview = completed.filter((s) => !s.reviewed);
    const tutors = recommended.filter((t) => t.id !== user.id).slice(0, 3);

    content.innerHTML = `
      <div class="stat-grid">
        ${statCard('calendar', 'Upcoming sessions', upcoming.filter((s) => s.status === 'accepted').length, { href: '/learner/sessions' })}
        ${statCard('clock', 'Awaiting tutor reply', upcoming.filter((s) => s.status === 'requested').length, { tone: 'warning', href: '/learner/sessions' })}
        ${statCard('check', 'Completed sessions', completed.length, { tone: 'success' })}
        ${statCard('star', 'Reviews to write', toReview.length, { tone: 'accent' })}
      </div>

      ${applicationBanner(application, user.role)}

      <div class="dash-grid">
        <section class="card">
          <div class="card-head"><h2>Coming up</h2><a href="#/learner/sessions" class="small">View all</a></div>
          ${upcoming.length
            ? sessionList(upcoming.slice(0, 4), { as: 'learner' })
            : emptyState({ iconName: 'calendar', title: 'No upcoming sessions', text: 'Find a tutor and request your first session.', action: '<a class="btn btn-primary btn-sm" href="#/tutors">Find a tutor</a>' })}
        </section>
        <section class="card">
          <div class="card-head"><h2>Rate recent sessions</h2></div>
          ${toReview.length
            ? `<ul class="plain-list">${toReview.map((s) => `
                <li class="list-row">
                  <div class="min-w-0">
                    <strong>${esc(s.tutor_name)}</strong>
                    <p class="small muted truncate">${esc(s.course_code)} · ${esc(s.topic)} · ${formatDate(s.scheduled_at)}</p>
                  </div>
                  <button type="button" class="btn btn-soft btn-sm" data-review="${s.id}">${icon('star')} Review</button>
                </li>`).join('')}</ul>`
            : '<p class="muted small">You’re all caught up. Reviews help other students choose tutors.</p>'}
        </section>
      </div>

      <section class="dash-section">
        <div class="card-head"><h2>Recommended for your programme</h2><a href="#/tutors?programme_id=${user.programme_id || ''}" class="small">Browse all</a></div>
        <div class="grid grid-3">${tutors.map(tutorCard).join('') || '<p class="muted">No tutors for your programme yet.</p>'}</div>
      </section>`;

    content.querySelectorAll('[data-review]').forEach((btn) => {
      const s = toReview.find((x) => String(x.id) === btn.dataset.review);
      btn.addEventListener('click', () => openReviewModal(s, load));
    });
  }

  await load();
}
