import { applicationService } from '../../services/applicationService.js';
import { dashboardShell } from '../../components/dashboardShell.js';
import { openModal, confirmDialog } from '../../components/modal.js';
import { toast } from '../../components/toast.js';
import { esc, loader, emptyState, tabs, avatar, statusBadge, formatDate, formatFee, timeAgo, MODE_LABELS } from '../../components/ui.js';
import { icon } from '../../components/icons.js';

const STATUSES = [
  { id: 'pending', label: 'Pending' },
  { id: 'approved', label: 'Approved' },
  { id: 'rejected', label: 'Rejected' },
];

function applicationCard(a) {
  const u = a.applicant;
  return `
    <article class="card application-card">
      <header class="application-head">
        ${avatar(u.full_name, 'lg')}
        <div class="min-w-0 grow">
          <h3>${esc(u.full_name)}</h3>
          <p class="small muted">${esc(u.programme)} · Year ${esc(u.year_of_study)} · ${esc(u.university)} · ${esc(u.email)}</p>
        </div>
        ${statusBadge(a.status)}
      </header>
      <p class="application-headline">“${esc(a.headline)}”</p>
      <p class="prewrap small">${esc(a.motivation)}</p>
      <dl class="detail-list detail-list-inline">
        <div><dt>Courses &amp; grades</dt><dd>${a.courses.map((c) => `<span class="chip" title="${esc(c.title)}">${esc(c.code)} · <strong>${esc(c.grade)}</strong></span>`).join(' ')}</dd></div>
        <div><dt>Fee</dt><dd>${formatFee(a.fee)}</dd></div>
        <div><dt>Mode</dt><dd>${MODE_LABELS[a.mode]}</dd></div>
        <div><dt>Evidence</dt><dd><a href="${esc(a.evidence_url)}" target="_blank" rel="noopener">View results ${icon('external')}</a></dd></div>
        <div><dt>Submitted</dt><dd>${timeAgo(a.created_at)}</dd></div>
      </dl>
      ${a.status === 'pending' ? `
        <footer class="application-actions">
          <button type="button" class="btn btn-ghost" data-action="reject" data-id="${a.id}">${icon('x')} Reject</button>
          <button type="button" class="btn btn-primary" data-action="approve" data-id="${a.id}">${icon('check')} Approve &amp; verify</button>
        </footer>` : `
        <p class="small muted">Reviewed ${a.reviewed_at ? formatDate(a.reviewed_at) : ''}${a.admin_note ? ` · Note: ${esc(a.admin_note)}` : ''}</p>`}
    </article>`;
}

export async function render(el) {
  el.innerHTML = dashboardShell({
    role: 'admin',
    active: '/admin/applications',
    title: 'Tutor applications',
    subtitle: 'Check each applicant’s results before verifying them as a tutor.',
    content: loader(),
  });
  const content = el.querySelector('#dash-content');
  let status = 'pending';
  let apps = [];

  async function load() {
    apps = await applicationService.adminList();
    const list = apps.filter((a) => a.status === status);
    content.innerHTML = `
      ${tabs(STATUSES.map((s) => ({ ...s, count: apps.filter((a) => a.status === s.id).length })), status)}
      <div class="stack-lg">
        ${list.length ? list.map(applicationCard).join('') : emptyState({ iconName: 'shieldCheck', title: `No ${status} applications` })}
      </div>`;
  }

  content.addEventListener('click', async (e) => {
    const tab = e.target.closest('[data-tab]');
    if (tab) {
      status = tab.dataset.tab;
      return load();
    }
    const btn = e.target.closest('[data-action]');
    if (!btn) return undefined;
    const app = apps.find((a) => String(a.id) === btn.dataset.id);
    const name = app.applicant.full_name;

    if (btn.dataset.action === 'approve') {
      const ok = await confirmDialog({
        title: `Approve ${name}?`,
        message: `${name} will become a verified tutor for ${app.courses.map((c) => c.code).join(', ')} and appear in search results.`,
        confirmLabel: 'Approve',
      });
      if (!ok) return undefined;
      try {
        await applicationService.decide(app.id, 'approved');
        toast(`${name} is now a verified tutor.`);
        load();
      } catch (err) {
        toast(err.message, 'error');
      }
    }

    if (btn.dataset.action === 'reject') {
      openModal({
        title: `Reject ${name}’s application`,
        submitLabel: 'Reject application',
        danger: true,
        body: `
          <div class="field">
            <label for="reject-note">Reason (shown to the applicant)</label>
            <textarea id="reject-note" name="admin_note" rows="4" required minlength="10" placeholder="e.g. The results link does not show grades for CSC 1204. Please upload your official results slip."></textarea>
          </div>`,
        onSubmit: async (data) => {
          await applicationService.decide(app.id, 'rejected', data.admin_note);
          toast('Application rejected. The applicant can re-apply.');
          load();
        },
      });
    }
    return undefined;
  });

  await load();
}
