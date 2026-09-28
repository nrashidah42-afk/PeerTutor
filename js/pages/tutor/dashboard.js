import { sessionService } from '../../services/sessionService.js';
import { tutorService } from '../../services/tutorService.js';
import { dashboardShell } from '../../components/dashboardShell.js';
import { sessionList } from '../../components/sessionItem.js';
import { openModal, confirmDialog } from '../../components/modal.js';
import { toast } from '../../components/toast.js';
import { esc, loader, emptyState, statCard, stars, formatMoney, formatDate, firstName, tabs } from '../../components/ui.js';
import { icon } from '../../components/icons.js';

function actionsFor(s) {
  const started = new Date(s.scheduled_at) <= new Date();
  if (s.status === 'requested') {
    return `
      <button type="button" class="btn btn-primary btn-sm" data-action="accept" data-id="${s.id}">${icon('check')} Accept</button>
      <button type="button" class="btn btn-ghost btn-sm" data-action="decline" data-id="${s.id}">Decline</button>`;
  }
  if (s.status === 'accepted') {
    return `
      ${started ? `<button type="button" class="btn btn-soft btn-sm" data-action="complete" data-id="${s.id}">${icon('check')} Mark completed</button>` : ''}
      <button type="button" class="btn btn-ghost btn-sm" data-action="cancel" data-id="${s.id}">Cancel</button>`;
  }
  return '';
}

const VIEWS = [
  { id: 'requests', label: 'New requests', match: (s) => s.status === 'requested' },
  { id: 'upcoming', label: 'Accepted', match: (s) => s.status === 'accepted' },
  { id: 'history', label: 'History', match: (s) => ['completed', 'declined', 'cancelled'].includes(s.status) },
];

export async function render(el, { user }) {
  el.innerHTML = dashboardShell({
    role: 'tutor',
    active: '/tutor',
    title: `Hello, ${firstName(user.full_name)}`,
    subtitle: 'Manage your session requests and track your tutoring.',
    actions: `<a class="btn btn-ghost" href="#/tutors/${user.id}">${icon('user')} View public profile</a>`,
    content: loader(),
  });
  const content = el.querySelector('#dash-content');
  let sessions = [];
  let profile = null;
  let reviews = [];
  let view = 'requests';

  function draw() {
    const completed = sessions.filter((s) => s.status === 'completed');
    const earned = completed.reduce((sum, s) => sum + s.fee, 0);
    const current = VIEWS.find((v) => v.id === view);
    const list = sessions.filter(current.match);
    if (view !== 'history') list.sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at));

    content.innerHTML = `
      <div class="stat-grid">
        ${statCard('message', 'New requests', sessions.filter((s) => s.status === 'requested').length, { tone: 'warning' })}
        ${statCard('calendar', 'Accepted sessions', sessions.filter((s) => s.status === 'accepted').length)}
        ${statCard('star', `Rating (${profile.review_count} reviews)`, profile.review_count ? profile.rating.toFixed(1) : '–', { tone: 'accent' })}
        ${statCard('wallet', 'Fees from completed sessions', formatMoney(earned), { tone: 'success' })}
      </div>

      ${profile.availability.length ? '' : `
        <div class="banner banner-accent">${icon('clock')}<div><strong>Add your weekly availability</strong> so learners can book you.</div>
        <a class="btn btn-accent btn-sm" href="#/tutor/availability">Set availability</a></div>`}

      <div class="dash-grid dash-grid-wide">
        <section class="card">
          ${tabs(VIEWS.map((v) => ({ ...v, count: sessions.filter(v.match).length })), view)}
          ${list.length
            ? sessionList(list, (s) => ({ as: 'tutor', actions: actionsFor(s) }))
            : emptyState({ iconName: 'calendar', title: view === 'requests' ? 'No new requests' : 'Nothing here yet', text: view === 'requests' ? 'New session requests from learners will show up here.' : '' })}
        </section>
        <section class="card">
          <div class="card-head"><h2>Latest reviews</h2><a class="small" href="#/tutors/${user.id}">See all</a></div>
          ${reviews.length
            ? `<ul class="review-list compact">${reviews.slice(0, 3).map((r) => `
                <li class="review">
                  <div class="review-head"><strong>${esc(r.learner_name)}</strong><span class="push-right">${stars(r.rating)}</span></div>
                  <p class="small">${esc(r.comment)}</p>
                  <p class="small muted">${esc(r.course_code)} · ${formatDate(r.created_at)}</p>
                </li>`).join('')}</ul>`
            : '<p class="muted small">No reviews yet. Learners can review you after a completed session.</p>'}
        </section>
      </div>`;
  }

  async function load() {
    [sessions, profile, reviews] = await Promise.all([
      sessionService.mine({ as: 'tutor' }),
      tutorService.get(user.id).catch(() => ({ rating: 0, review_count: 0, availability: [] })),
      tutorService.reviews(user.id),
    ]);
    draw();
  }

  async function update(id, status, note, message) {
    try {
      await sessionService.setStatus(id, status, note);
      toast(message);
      await load();
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  content.addEventListener('click', async (e) => {
    const tabBtn = e.target.closest('[data-tab]');
    if (tabBtn) {
      view = tabBtn.dataset.tab;
      return draw();
    }
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const s = sessions.find((x) => String(x.id) === btn.dataset.id);
    const who = firstName(s.learner_name);

    switch (btn.dataset.action) {
      case 'accept':
        return update(s.id, 'accepted', '', `Session with ${who} accepted.`);
      case 'complete':
        return update(s.id, 'completed', '', 'Session marked as completed. The learner can now leave a review.');
      case 'decline':
        return openModal({
          title: `Decline ${who}'s request?`,
          submitLabel: 'Decline request',
          danger: true,
          body: `
            <div class="field">
              <label for="decline-note">Note to learner <span class="muted">(optional)</span></label>
              <textarea id="decline-note" name="note" rows="3" maxlength="500" placeholder="e.g. I have an exam that day. Could you try Thursday instead?"></textarea>
            </div>`,
          onSubmit: (data) => update(s.id, 'declined', data.note, 'Request declined.'),
        });
      case 'cancel': {
        const ok = await confirmDialog({
          title: 'Cancel this session?',
          message: `${who} will be notified that the session is cancelled.`,
          confirmLabel: 'Cancel session',
          danger: true,
        });
        if (ok) update(s.id, 'cancelled', '', 'Session cancelled.');
        return undefined;
      }
      default:
        return undefined;
    }
  });

  await load();
}
