import { sessionService } from '../../services/sessionService.js';
import { dashboardShell } from '../../components/dashboardShell.js';
import { sessionList } from '../../components/sessionItem.js';
import { openReviewModal } from '../../components/feedbackModals.js';
import { confirmDialog } from '../../components/modal.js';
import { toast } from '../../components/toast.js';
import { loader, emptyState, tabs } from '../../components/ui.js';
import { icon } from '../../components/icons.js';

const TABS = [
  { id: 'upcoming', label: 'Upcoming', match: (s) => ['requested', 'accepted'].includes(s.status) },
  { id: 'completed', label: 'Completed', match: (s) => s.status === 'completed' },
  { id: 'closed', label: 'Declined & cancelled', match: (s) => ['declined', 'cancelled'].includes(s.status) },
  { id: 'all', label: 'All', match: () => true },
];

function actionsFor(s) {
  const buttons = [];
  if (['requested', 'accepted'].includes(s.status)) {
    buttons.push(`<button type="button" class="btn btn-ghost btn-sm" data-action="cancel" data-id="${s.id}">Cancel</button>`);
  }
  if (s.status === 'completed' && !s.reviewed) {
    buttons.push(`<button type="button" class="btn btn-soft btn-sm" data-action="review" data-id="${s.id}">${icon('star')} Leave review</button>`);
  }
  if (s.status === 'completed' && s.reviewed) buttons.push('<span class="small muted">Reviewed ✓</span>');
  return buttons.join('');
}

export async function render(el, { user, query }) {
  el.innerHTML = dashboardShell({
    role: user.role,
    active: '/learner/sessions',
    title: 'My sessions',
    subtitle: 'Sessions you have requested as a learner.',
    actions: `<a class="btn btn-primary" href="#/tutors">${icon('plus')} New session</a>`,
    content: loader(),
  });
  const content = el.querySelector('#dash-content');
  let active = TABS.some((t) => t.id === query.tab) ? query.tab : 'upcoming';
  let sessions = [];

  function draw() {
    const tab = TABS.find((t) => t.id === active);
    const list = sessions.filter(tab.match);
    if (active === 'upcoming') list.sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at));
    content.innerHTML = `
      ${tabs(TABS.map((t) => ({ ...t, count: sessions.filter(t.match).length })), active)}
      <div class="card">
        ${list.length
          ? sessionList(list, (s) => ({ as: 'learner', actions: actionsFor(s) }))
          : emptyState({ iconName: 'calendar', title: 'Nothing here yet', text: 'Sessions you request will appear here.', action: '<a class="btn btn-primary btn-sm" href="#/tutors">Find a tutor</a>' })}
      </div>`;
  }

  async function load() {
    sessions = await sessionService.mine({ as: 'learner' });
    draw();
  }

  content.addEventListener('click', async (e) => {
    const tabBtn = e.target.closest('[data-tab]');
    if (tabBtn) {
      active = tabBtn.dataset.tab;
      return draw();
    }
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const s = sessions.find((x) => String(x.id) === btn.dataset.id);

    if (btn.dataset.action === 'review') openReviewModal(s, load);
    if (btn.dataset.action === 'cancel') {
      const ok = await confirmDialog({
        title: 'Cancel this session?',
        message: `Your ${s.course_code} session with ${s.tutor_name} will be cancelled and the tutor will be notified.`,
        confirmLabel: 'Cancel session',
        danger: true,
      });
      if (!ok) return;
      try {
        await sessionService.setStatus(s.id, 'cancelled');
        toast('Session cancelled.');
        load();
      } catch (err) {
        toast(err.message, 'error');
      }
    }
  });

  await load();
}
